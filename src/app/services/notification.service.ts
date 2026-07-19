import {
  Injectable,
  inject,
  signal,
  computed,
  effect,
  PLATFORM_ID,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { ApiService } from "./api.service";
import { DatastoreService } from "./datastore";
import { initFirebase, app } from "../firebase";
import { BehaviorSubject, Observable } from "rxjs";
import { SettingsService } from "../core/services/settings.service";

export interface InboxNotification {
  id: string;
  userId?: string | null;
  guestId?: string | null;
  title: string;
  body: string;
  image?: string | null;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: "root",
})
export class NotificationService {
  private api = inject(ApiService);
  private ds = inject(DatastoreService);
  private platformId = inject(PLATFORM_ID);
  private settingsService = inject(SettingsService);

  // Notifications Inbox list signal
  inbox = signal<InboxNotification[]>([]);
  unreadCount = computed(() => this.inbox().filter((n) => !n.isRead).length);

  // Permission status signal: 'default' | 'granted' | 'denied'
  permission = signal<NotificationPermission>("default");
  fcmToken = signal<string>("");

  private showPromptSubject = new BehaviorSubject<boolean>(false);
  private registrationKey = "";
  private serviceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration> | null =
    null;
  showPrompt$ = this.showPromptSubject.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Sync permission state from browser API
      if ("Notification" in window) {
        this.permission.set(Notification.permission);
      }

      // Check storage if they dismissed prompt
      const dismissed = localStorage.getItem("fcm_prompt_dismissed");
      if (this.permission() === "default" && !dismissed) {
        // Trigger stay-updated modal popup prompt after 4 seconds
        setTimeout(() => {
          this.showPromptSubject.next(true);
        }, 4000);
      }

      // Automatically fetch FCM token when permission is granted and settings are loaded
      effect(() => {
        const perm = this.permission();
        const settingsLoaded = this.settingsService.isLoaded();
        if (perm === "granted" && settingsLoaded && !this.fcmToken()) {
          this.getFcmToken();
        }
      });

      // Automatically register device once FCM token is available
      effect(() => {
        const token = this.fcmToken();
        const user = this.ds.currentUser();
        const guestId = this.ds.guestSessionId();
        if (token) {
          const key = `${token}|${user?.uid || "guest"}|${guestId || ""}`;
          if (this.registrationKey !== key) {
            this.registrationKey = key;
            this.registerDeviceInBackend(token, user?.uid || null, guestId);
          }
        }
      });

      // Fetch inbox notifications on initialization
      this.fetchInbox();

      // Setup dynamic foreground message listener once Firebase is initialized
      this.setupForegroundListener();
    }
  }

  // Request Permission flow
  async requestPermission(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    if (!("Notification" in window)) return false;

    this.showPromptSubject.next(false);

    try {
      const permission = await Notification.requestPermission();
      this.permission.set(permission);

      if (permission === "granted") {
        const token = await this.getFcmToken();
        if (token) {
          this.fcmToken.set(token);
          return true;
        }
      } else {
        localStorage.setItem("fcm_prompt_dismissed", "true");
      }
    } catch (err) {
      console.error("Error requesting notification permission:", err);
    }
    return false;
  }

  // Hide Prompt modal
  dismissPrompt() {
    localStorage.setItem("fcm_prompt_dismissed", "true");
    this.showPromptSubject.next(false);
  }

  // Retrieve FCM Token from SDK
  async getFcmToken(): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) return null;

    try {
      await initFirebase();
      const { getMessaging, getToken } = await import("firebase/messaging");
      const messaging = getMessaging(app);

      const reg = await this.getOrCreateServiceWorkerRegistration();
      const vapidKey =
        this.ds.settings().pushNotifications?.vapidKey ||
        this.ds.settings().pushNotificationSettings?.vapidKey ||
        "BEl62wpCL7jH7QNSTWmK8t0dIL60VwU5B564U829s29528s0921509215";

      if (!this.isValidVapidKey(vapidKey)) {
        console.warn(
          `Skipping FCM token retrieval: VAPID key is invalid or placeholder ("${vapidKey}"). ` +
          "Please configure a valid 65-byte base64url-encoded Web Push VAPID key in settings."
        );
        return null;
      }

      const token = await getToken(messaging, {
        serviceWorkerRegistration: reg,
        vapidKey: vapidKey,
      });

      if (token) {
        this.fcmToken.set(token);
        return token;
      }
    } catch (err) {
      console.error("Failed to get FCM token:", err);
    }
    return null;
  }

  private isValidVapidKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    const cleanKey = key.trim();
    if (cleanKey.length !== 87 && cleanKey.length !== 88) {
      return false;
    }
    const base64UrlRegex = /^[A-Za-z0-9\-_=]+$/;
    if (!base64UrlRegex.test(cleanKey)) {
      return false;
    }
    try {
      const base64 = cleanKey.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      atob(padded);
      return true;
    } catch {
      return false;
    }
  }

  private async getOrCreateServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
    if (this.serviceWorkerRegistrationPromise) {
      return this.serviceWorkerRegistrationPromise;
    }

    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers not supported in this browser.");
    }

    const config =
      this.ds.settings()?.pushNotifications ||
      this.ds.settings()?.pushNotificationSettings ||
      {};
    const queryParams = new URLSearchParams({
      apiKey: config.apiKey || '',
      projectId: config.projectId || '',
      senderId: config.senderId || '',
      appId: config.appId || '',
    }).toString();

    this.serviceWorkerRegistrationPromise = navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${queryParams}`,
    );
    return this.serviceWorkerRegistrationPromise;
  }

  // Register device details to backend database
  private registerDeviceInBackend(
    token: string,
    userId: string | null,
    guestId: string,
  ) {
    if (!isPlatformBrowser(this.platformId)) return;

    // Detect browser/OS metadata
    const userAgent = navigator.userAgent;
    let browser = "Other";
    if (userAgent.indexOf("Chrome") > -1) browser = "Chrome";
    else if (userAgent.indexOf("Safari") > -1) browser = "Safari";
    else if (userAgent.indexOf("Firefox") > -1) browser = "Firefox";
    else if (userAgent.indexOf("Edge") > -1) browser = "Edge";

    let os = "Unknown OS";
    if (userAgent.indexOf("Win") > -1) os = "Windows";
    else if (userAgent.indexOf("Mac") > -1) os = "MacOS";
    else if (userAgent.indexOf("Linux") > -1) os = "Linux";
    else if (userAgent.indexOf("Android") > -1) os = "Android";
    else if (userAgent.indexOf("iPhone") > -1) os = "iOS";

    const payload = {
      userId,
      guestId,
      sessionId: guestId,
      fcmToken: token,
      browser,
      device: userAgent.indexOf("Mobi") > -1 ? "Mobile" : "Desktop",
      os,
      appVersion: "1.0.0",
      language: navigator.language || "en",
      country: "IN", // Default
      notificationEnabled: true,
    };

    this.api.post<any>("/notifications/register-device", payload).subscribe({
      next: (res) =>
        console.log("FCM token registered with backend:", res.message),
      error: (err) =>
        console.error("Failed to register FCM token with backend:", err),
    });
  }

  // Subscribe to Firebase topic
  subscribeToTopic(topic: string) {
    const token = this.fcmToken();
    if (!token) return;

    this.api
      .post<any>("/notifications/subscribe", { fcmToken: token, topic })
      .subscribe({
        next: () => console.log(`Subscribed to topic: ${topic}`),
        error: (err) =>
          console.error(`Failed to subscribe to topic ${topic}:`, err),
      });
  }

  // Unsubscribe from Firebase topic
  unsubscribeFromTopic(topic: string) {
    const token = this.fcmToken();
    if (!token) return;

    this.api
      .post<any>("/notifications/unsubscribe", { fcmToken: token, topic })
      .subscribe({
        next: () => console.log(`Unsubscribed from topic: ${topic}`),
        error: (err) =>
          console.error(`Failed to unsubscribe from topic ${topic}:`, err),
      });
  }

  // Retrieve user inbox notifications list
  fetchInbox() {
    if (!isPlatformBrowser(this.platformId)) return;

    const user = this.ds.currentUser();
    const guestId = this.ds.guestSessionId();

    const params: any = {};
    if (user?.uid) {
      params.userId = user.uid;
    } else if (guestId) {
      params.guestId = guestId;
    } else {
      return;
    }

    this.api
      .get<{
        success: boolean;
        data: InboxNotification[];
      }>("/notifications", params)
      .subscribe({
        next: (res) => {
          const isSuccess =
            res && (res.success || (res as any).status === "success");
          if (isSuccess && res.data) {
            this.inbox.set(res.data);
          }
        },
        error: (err) =>
          console.error("Failed to fetch notification inbox:", err),
      });
  }

  // Mark single/multiple notification(s) as read
  markAsRead(notificationId?: string) {
    const payload = notificationId
      ? { id: notificationId }
      : {
          ids: this.inbox()
            .filter((n) => !n.isRead)
            .map((n) => n.id),
        };

    this.api.put<any>("/notifications/read", payload).subscribe({
      next: () => {
        this.inbox.update((list) =>
          list.map((n) => {
            if (!notificationId || n.id === notificationId) {
              return { ...n, isRead: true };
            }
            return n;
          }),
        );
      },
      error: (err) =>
        console.error("Failed to mark notification as read:", err),
    });
  }

  // Delete notification
  deleteNotification(id: string) {
    this.api.delete<any>(`/notifications/${id}`).subscribe({
      next: () => {
        this.inbox.update((list) => list.filter((n) => n.id !== id));
      },
      error: (err) => console.error("Failed to delete notification:", err),
    });
  }

  // Setup foreground listener for real-time notifications
  private async setupForegroundListener() {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      await initFirebase();
      const { getMessaging, onMessage } = await import("firebase/messaging");
      const messaging = getMessaging(app);

      onMessage(messaging, (payload) => {
        console.log("Foreground message received: ", payload);

        // Push notification immediately to inbox list in UI
        const newNotif: InboxNotification = {
          id: Math.random().toString(16).substring(2, 10), // temporary ID
          title:
            payload.notification?.title ||
            payload.data?.["title"] ||
            "New Update",
          body: payload.notification?.body || payload.data?.["body"] || "",
          image: payload.notification?.image || payload.data?.["image"] || null,
          actionUrl: payload.data?.["click_action"] || null,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        this.inbox.update((list) => [newNotif, ...list]);

        // Trigger real-time browser desktop notification or alert if allowed
        if (Notification.permission === "granted") {
          new Notification(newNotif.title, {
            body: newNotif.body,
            icon: newNotif.image || "/favicon.ico",
          });
        }
      });
    } catch (err) {
      console.warn("Foreground notification listener setup skipped:", err);
    }
  }
}
