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
import { BehaviorSubject, Observable, firstValueFrom } from "rxjs";
import { SettingsService } from "../core/services/settings.service";

export interface InboxNotification {
  id: string;
  userId?: string | null;
  guestId?: string | null;
  title: string;
  body: string;
  message?: string;
  image?: string | null;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
  category?: 'offer' | 'order' | 'system' | 'announcement';
  icon?: string;
  badge?: string;
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
  popupConfig = signal<any>(null);
  publicFcmConfig = signal<any>(null);

  private showPromptSubject = new BehaviorSubject<boolean>(false);
  private registrationKey = "";
  private serviceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration> | null = null;
  showPrompt$ = this.showPromptSubject.asObservable();

  get isPromptVisible(): boolean {
    return this.showPromptSubject.value;
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Sync permission state from browser API
      if ("Notification" in window) {
        this.permission.set(Notification.permission);
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

      // Load inbox immediately on browser load
      this.fetchInbox();

      // Defer non-critical notification background work to idle time away from initial paint
      const initNotifications = () => {
        this.fetchPopupConfig();
        this.fetchFcmConfig();
        this.setupForegroundListener();
      };

      let notifTriggered = false;
      const triggerNotifications = () => {
        if (notifTriggered) return;
        notifTriggered = true;
        window.removeEventListener('scroll', triggerNotifications);
        window.removeEventListener('touchstart', triggerNotifications);
        window.removeEventListener('click', triggerNotifications);
        window.removeEventListener('mousemove', triggerNotifications);
        initNotifications();
      };

      window.addEventListener('scroll', triggerNotifications, { passive: true, once: true });
      window.addEventListener('touchstart', triggerNotifications, { passive: true, once: true });
      window.addEventListener('click', triggerNotifications, { passive: true, once: true });
      window.addEventListener('mousemove', triggerNotifications, { passive: true, once: true });
      setTimeout(triggerNotifications, 14000);
    }
  }

  private fcmConfigPromise: Promise<any> | null = null;
  private popupConfigLoaded = false;

  fetchPopupConfig() {
    if (this.popupConfigLoaded) return;
    this.popupConfigLoaded = true;
    this.api.get<any>('/notifications/popup-config').subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.popupConfig.set(res.data);
          this.initPopupTriggers();
        }
      },
      error: (err) => {
        this.popupConfigLoaded = false;
        console.error("Failed to load popup config:", err);
      }
    });
  }

  async fetchFcmConfig(): Promise<any> {
    if (this.publicFcmConfig()) {
      return this.publicFcmConfig();
    }
    if (this.fcmConfigPromise) {
      return this.fcmConfigPromise;
    }
    this.fcmConfigPromise = firstValueFrom(this.api.get<any>('/notifications/fcm-config/public'))
      .then((res) => {
        if (res && res.success && res.data) {
          this.publicFcmConfig.set(res.data);
          return res.data;
        }
        return null;
      })
      .catch((err) => {
        console.error("Failed to load public FCM config:", err);
        return null;
      })
      .finally(() => {
        this.fcmConfigPromise = null;
      });
    return this.fcmConfigPromise;
  }

  private initPopupTriggers() {
    if (!isPlatformBrowser(this.platformId)) return;
    const config = this.popupConfig();
    if (!config || !config.enabled) return;

    // Check if browser permission already granted/denied
    if (Notification.permission === 'granted' && config.hideExisting) {
      return;
    }

    // Check admin, checkout & payment page rules
    const pathname = window.location.pathname;
    if (pathname.includes('/admin')) return;
    if (config.hideCheckout && (pathname.includes('/checkout') || pathname.includes('/cart'))) return;
    if (config.hidePayment && (pathname.includes('/payment') || pathname.includes('/pay') || pathname.includes('/returns'))) return;

    // Check dismissed cooldown
    const dismissedTimeStr = localStorage.getItem("fcm_prompt_dismissed_time");
    if (dismissedTimeStr) {
      const dismissedTime = Number(dismissedTimeStr);
      if (config.showOnce) {
        return;
      }
      if (config.reshowDays) {
        const diffMs = Date.now() - dismissedTime;
        const reshowMs = config.reshowDays * 24 * 60 * 60 * 1000;
        if (diffMs < reshowMs) {
          return;
        }
      }
    }

    let triggered = false;
    const triggerShow = () => {
      if (triggered) return;
      triggered = true;
      this.showPromptSubject.next(true);
      window.removeEventListener('scroll', scrollHandler);
    };

    const scrollHandler = () => {
      if (!config.scrollShow) return;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const percent = (window.scrollY / docHeight) * 100;
      if (percent >= config.scrollShow) {
        triggerShow();
      }
    };

    // 1. Timeout Delay Trigger
    if (config.delayShow) {
      setTimeout(() => {
        triggerShow();
      }, config.delayShow * 1000);
    }

    // 2. Scroll Trigger
    if (config.scrollShow) {
      window.addEventListener('scroll', scrollHandler);
    }

    // Fallback trigger if 0 or none configured
    if (!config.delayShow && !config.scrollShow) {
      triggerShow();
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
        localStorage.setItem("fcm_prompt_dismissed_time", Date.now().toString());
      }
    } catch (err) {
      console.error("Error requesting notification permission:", err);
    }
    return false;
  }

  // Hide Prompt modal
  dismissPrompt() {
    localStorage.setItem("fcm_prompt_dismissed_time", Date.now().toString());
    this.showPromptSubject.next(false);
  }

  // Force show popup for live preview or testing
  testTriggerPopup() {
    this.showPromptSubject.next(true);
  }

  // Retrieve FCM Token from SDK
  async getFcmToken(): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) return null;

    try {
      await initFirebase();
      const { getMessaging, getToken } = await import("firebase/messaging");
      const messaging = getMessaging(app);

      const reg = await this.getOrCreateServiceWorkerRegistration();
      const config = this.publicFcmConfig() || {};
      const vapidKey = config.vapidPublicKey || "BEl62wpCL7jH7QNSTWmK8t0dIL60VwU5B564U829s29528s0921509215";

      const tokenOptions: any = {
        serviceWorkerRegistration: reg,
      };

      if (vapidKey && this.isValidVapidKey(vapidKey)) {
        tokenOptions.vapidKey = vapidKey;
      }

      const token = await getToken(messaging, tokenOptions);

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

    let config = this.publicFcmConfig();
    if (!config) {
      config = await this.fetchFcmConfig();
    }

    const cfg = config || {};
    const queryParams = new URLSearchParams({
      apiKey: cfg.apiKey || '',
      projectId: cfg.projectId || '',
      senderId: cfg.messagingSenderId || '',
      appId: cfg.appId || '',
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

    const user: any = this.ds.currentUser();
    const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
    if (user?.role === "Admin" || user?.role === "Super Admin" || isAdminRoute) {
      const adminName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || "Administrator" : "Super Admin";
      const adminEmail = user?.email || "admin@3dgalaxy.com";
      const adminRole = user?.role || "Super Admin";

      const adminPayload = {
        adminId: user?.uid || user?.id || "admin-main",
        adminName,
        adminEmail,
        adminRole,
        deviceName: `${browser} ${userAgent.indexOf("Mobi") > -1 ? "Mobile" : "Desktop"}`,
        browser,
        operatingSystem: os,
        platform: os,
        deviceType: userAgent.indexOf("Mobi") > -1 ? "Mobile" : "Desktop",
        fcmToken: token,
        notificationPermission: typeof Notification !== "undefined" ? Notification.permission : "granted",
      };
      this.registerAdminDevice(adminPayload).subscribe({
        next: () => console.log("Admin FCM device token registered with backend"),
        error: (err) => console.error("Failed to register admin FCM token:", err),
      });
    }
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

  private getStoredReadIds(): Set<string> {
    if (!isPlatformBrowser(this.platformId)) return new Set();
    try {
      const raw = localStorage.getItem("3dgalaxy_read_notif_ids");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  private saveStoredReadIds(ids: Set<string>): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem("3dgalaxy_read_notif_ids", JSON.stringify(Array.from(ids)));
    } catch {}
  }

  private getStoredDeletedIds(): Set<string> {
    if (!isPlatformBrowser(this.platformId)) return new Set();
    try {
      const raw = localStorage.getItem("3dgalaxy_deleted_notif_ids");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  private saveStoredDeletedIds(ids: Set<string>): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem("3dgalaxy_deleted_notif_ids", JSON.stringify(Array.from(ids)));
    } catch {}
  }

  getDefaultStoreNotifications(): InboxNotification[] {
    const readIds = this.getStoredReadIds();
    const deletedIds = this.getStoredDeletedIds();
    const list: InboxNotification[] = [];

    // 1. Pull from active store announcements configured in settings
    const announcements = this.settingsService.headerAnnouncements() || [];
    announcements.filter((a: any) => a.isActive !== false).forEach((ann: any) => {
      const id = `ann_${ann.id || ann.title}`;
      if (!deletedIds.has(id)) {
        list.push({
          id,
          title: ann.title || "Store Announcement",
          body: ann.shortMessage || ann.description || "Special offer from 3D Galaxy store.",
          actionUrl: ann.ctaUrl || "/products",
          isRead: readIds.has(id),
          createdAt: ann.updatedAt || ann.createdAt || new Date().toISOString(),
          category: ann.title?.toLowerCase().includes("sale") || ann.title?.toLowerCase().includes("offer") ? "offer" : "announcement",
          icon: ann.icon || "campaign",
          badge: ann.ctaText || "Store Offer",
        });
      }
    });

    // 2. High-value default notifications ensuring real content is always present
    const baseItems: Array<Partial<InboxNotification>> = [
      {
        id: "notif_welcome",
        title: "Welcome to 3D Galaxy! ✨",
        body: "Discover high-precision 3D printers, premium filaments (PLA, PETG, ABS, TPU) & genuine spare parts.",
        actionUrl: "/products",
        category: "offer",
        icon: "celebration",
        badge: "Welcome",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "notif_free_shipping",
        title: "Free Shipping on Orders Above ₹3,500 🚚",
        body: "Enjoy free standard delivery across India on all eligible cart orders over ₹3,500.",
        actionUrl: "/products",
        category: "offer",
        icon: "local_shipping",
        badge: "Delivery",
        createdAt: new Date(Date.now() - 14400000).toISOString(),
      },
      {
        id: "notif_stl_slicer",
        title: "Instant 3D Printing Price Quotes 🖨️",
        body: "Have an STL file ready? Upload your 3D models for automated slicing, material choice & instant quotes.",
        actionUrl: "/slicer",
        category: "system",
        icon: "print",
        badge: "Service",
        createdAt: new Date(Date.now() - 43200000).toISOString(),
      },
      {
        id: "notif_cod_available",
        title: "Cash On Delivery Available 📦",
        body: "COD is available on orders up to ₹2,500 for eligible locations with express courier dispatch.",
        actionUrl: "/products",
        category: "announcement",
        icon: "payments",
        badge: "Payment",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    baseItems.forEach((item) => {
      if (!deletedIds.has(item.id!)) {
        list.push({
          id: item.id!,
          title: item.title!,
          body: item.body!,
          actionUrl: item.actionUrl || "/products",
          isRead: readIds.has(item.id!),
          createdAt: item.createdAt!,
          category: item.category as any,
          icon: item.icon,
          badge: item.badge,
        });
      }
    });

    return list;
  }

  // Retrieve user inbox notifications list
  fetchInbox() {
    if (!isPlatformBrowser(this.platformId)) return;

    const readIds = this.getStoredReadIds();
    const storeDefaults = this.getDefaultStoreNotifications();

    // Initialize immediately with store defaults if inbox is currently empty
    if (this.inbox().length === 0) {
      this.inbox.set(storeDefaults);
    }

    const user: any = this.ds.currentUser();
    const guestId = this.ds.guestSessionId();
    const isAdmin = user?.role === "Admin" || user?.role === "Super Admin";

    const params: any = {};
    if (user?.uid) {
      params.userId = user.uid;
    } else if (guestId) {
      params.guestId = guestId;
    }

    // 1. Fetch user notifications from /notifications
    if (params.userId || params.guestId) {
      this.api
        .get<{
          success: boolean;
          data: InboxNotification[];
        }>("/notifications", params)
        .subscribe({
          next: (res) => {
            const isSuccess = res && (res.success || (res as any).status === "success");
            const backendNotifs = isSuccess && Array.isArray(res.data) ? res.data : [];
            this.mergeNotifications(backendNotifs, storeDefaults);
          },
          error: () => {
            this.mergeNotifications([], storeDefaults);
          },
        });
    }

    // 2. If logged in as Admin, also fetch admin notifications from /admin/notifications
    if (isAdmin) {
      this.api.get<any>("/admin/notifications").subscribe({
        next: (res) => {
          if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            const adminNotifs: InboxNotification[] = res.data.map((item: any) => ({
              id: `admin_${item.id}`,
              title: item.title || "Admin Alert",
              body: item.body || item.message || "New admin notification",
              actionUrl: item.actionUrl || "/admin?tab=notification-center",
              isRead: item.isRead || readIds.has(`admin_${item.id}`),
              createdAt: item.createdAt || new Date().toISOString(),
              category: "order",
              icon: item.type === "WHATSAPP_MESSAGE_RECEIVED" ? "chat" : "admin_panel_settings",
              badge: "Admin",
            }));
            this.mergeNotifications(adminNotifs, this.inbox());
          }
        },
        error: () => {},
      });
    }
  }

  private mergeNotifications(incoming: InboxNotification[], base: InboxNotification[]) {
    const deletedIds = this.getStoredDeletedIds();
    const readIds = this.getStoredReadIds();
    const map = new Map<string, InboxNotification>();

    // Process incoming
    incoming.forEach((n) => {
      if (!deletedIds.has(n.id)) {
        map.set(n.id, {
          ...n,
          isRead: n.isRead || readIds.has(n.id),
        });
      }
    });

    // Process base items
    base.forEach((n) => {
      if (!deletedIds.has(n.id) && !map.has(n.id)) {
        map.set(n.id, {
          ...n,
          isRead: n.isRead || readIds.has(n.id),
        });
      }
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    this.inbox.set(merged);
  }

  // Mark single/multiple notification(s) as read
  markAsRead(notificationId?: string) {
    const readIds = this.getStoredReadIds();
    if (notificationId) {
      readIds.add(notificationId);
      this.saveStoredReadIds(readIds);
      this.inbox.update((list) =>
        list.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      this.api.put<any>("/notifications/read", { id: notificationId }).subscribe({
        error: () => {},
      });
    } else {
      this.inbox().forEach((n) => readIds.add(n.id));
      this.saveStoredReadIds(readIds);
      this.inbox.update((list) => list.map((n) => ({ ...n, isRead: true })));
      this.api.put<any>("/notifications/read", {
        ids: this.inbox().map((n) => n.id),
      }).subscribe({
        error: () => {},
      });
    }
  }

  // Delete notification
  deleteNotification(id: string) {
    const deletedIds = this.getStoredDeletedIds();
    deletedIds.add(id);
    this.saveStoredDeletedIds(deletedIds);
    this.inbox.update((list) => list.filter((n) => n.id !== id));
    this.api.delete<any>(`/notifications/${id}`).subscribe({
      error: () => {},
    });
  }

  // Clear all notifications
  clearAllNotifications() {
    const deletedIds = this.getStoredDeletedIds();
    this.inbox().forEach((n) => deletedIds.add(n.id));
    this.saveStoredDeletedIds(deletedIds);
    this.inbox.set([]);
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

  registerAdminDevice(payload: any): Observable<any> {
    return this.api.post("/admin/fcm/register", payload);
  }

  updateAdminDevice(payload: any): Observable<any> {
    return this.api.put("/admin/fcm/update", payload);
  }

  deleteAdminDevice(id: string): Observable<any> {
    return this.api.delete(`/admin/fcm/${id}`);
  }

  getDeviceDetails(id: string): Observable<any> {
    return this.api.get(`/admin/fcm/device-details/${id}`);
  }

  toggleNotificationStatus(payload: { id?: string; fcmToken?: string; notificationEnabled: boolean }): Observable<any> {
    return this.api.put("/admin/fcm/toggle-notifications", payload);
  }

  forceRefreshToken(payload: { id?: string; fcmToken?: string }): Observable<any> {
    return this.api.post("/admin/fcm/refresh-token", payload);
  }

  sendTestNotification(fcmToken: string): Observable<any> {
    return this.api.post("/admin/fcm/test", {
      fcmToken,
      deviceName: "Chrome Admin Desktop",
    });
  }

  sendAdminPushNotification(payload: {
    title: string;
    body: string;
    type: string;
    deepLink?: string;
    data?: any;
  }): Observable<any> {
    return this.api.post("/admin/notifications/broadcast", payload);
  }

  broadcastAdminNotification(payload: {
    title: string;
    body: string;
    type?: string;
    deepLink?: string;
    data?: any;
  }): Observable<any> {
    return this.api.post("/admin/notifications/broadcast", payload);
  }

  getAdminRegisteredDevices(params?: any): Observable<any> {
    return this.api.get("/admin/fcm/devices", params || {});
  }

  getAdminDevicesList(params?: any): Observable<any> {
    return this.api.get("/admin/fcm/devices", params || {});
  }

  getAdminDevices(): Observable<any> {
    return this.api.get("/admin/fcm/active");
  }

  getDeliveryHistoryLogs(params?: any): Observable<any> {
    return this.api.get("/admin/fcm/delivery-history", params || {});
  }

  getAdminNotificationLogs(): Observable<any> {
    return this.api.get("/admin/fcm/delivery-history");
  }

  exportDevicesCsv(): void {
    if (typeof window !== "undefined") {
      window.open("/api/admin/fcm/export-csv", "_blank");
    }
  }

  cleanupStaleDevices(): Observable<any> {
    return this.api.post("/admin/fcm/cleanup", {});
  }
}

