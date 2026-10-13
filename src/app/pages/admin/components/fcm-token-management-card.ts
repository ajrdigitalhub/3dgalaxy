import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { NotificationService } from "../../../services/notification.service";
import { ToastService } from "../../../shared/components/toast/toast.service";

@Component({
  selector: "app-admin-fcm-token-card",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5 animate-fadeIn font-sans">
      
      <!-- CARD HEADER -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <mat-icon class="text-xl">notifications_active</mat-icon>
          </div>
          <div>
            <h3 class="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              Device Push Notifications
              <span [class]="isRegistered() ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'" class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border">
                {{ isRegistered() ? 'Token Active' : 'Unregistered' }}
              </span>
              @if (envStatus()) {
                <span class="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border flex items-center gap-1">
                  <mat-icon class="text-[11px] h-[11px] w-[11px]">shield</mat-icon>
                  {{ envStatus()?.environment }} Isolated
                </span>
              }
            </h3>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
              Receive real-time push alerts for orders, service enquiries, and system updates on this device.
            </p>
          </div>
        </div>

        <button
          (click)="refreshDeviceInfo()"
          class="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border-none bg-transparent cursor-pointer"
          title="Refresh Telemetry"
        >
          <mat-icon class="text-sm">refresh</mat-icon>
        </button>
      </div>

      <!-- ENVIRONMENT ISOLATION TELEMETRY -->
      @if (envStatus()) {
        <div class="p-3.5 bg-zinc-50/80 dark:bg-zinc-950/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <mat-icon class="text-xs h-3.5 w-3.5 text-indigo-500">domain_verification</mat-icon>
              Server Environment & Domain Isolation
            </span>
            <span class="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Enforced Server-Side
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div class="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
              <span class="block text-[8px] uppercase font-bold text-zinc-400">Environment</span>
              <span class="font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide truncate block">
                {{ envStatus()?.environment }}
              </span>
            </div>

            <div class="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
              <span class="block text-[8px] uppercase font-bold text-zinc-400">Configured Origin</span>
              <span class="font-bold text-zinc-700 dark:text-zinc-300 truncate block" [title]="envStatus()?.configuredOrigin">
                {{ envStatus()?.configuredOrigin || 'Same Origin' }}
              </span>
            </div>

            <div class="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
              <span class="block text-[8px] uppercase font-bold text-zinc-400">Env Active Devices</span>
              <span class="font-black text-zinc-900 dark:text-zinc-100 truncate block">
                {{ envStatus()?.activeDevicesCount || 0 }} / {{ envStatus()?.registeredDevicesCount || 0 }}
              </span>
            </div>

            <div class="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
              <span class="block text-[8px] uppercase font-bold text-zinc-400">Firebase Project</span>
              <span class="font-bold text-zinc-600 dark:text-zinc-400 truncate block" [title]="envStatus()?.firebaseProjectId">
                {{ envStatus()?.firebaseProjectId || 'Default' }}
              </span>
            </div>
          </div>
        </div>
      }

      <!-- DEVICE TELEMETRY GRID -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        
        <div class="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-1">
          <span class="block text-[8px] uppercase font-bold text-zinc-400">Browser Permission</span>
          <span [class]="permissionState() === 'granted' ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-amber-500 font-bold'" class="uppercase tracking-wider">
            {{ permissionState() }}
          </span>
        </div>

        <div class="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-1">
          <span class="block text-[8px] uppercase font-bold text-zinc-400">Current Device</span>
          <span class="font-extrabold text-zinc-900 dark:text-zinc-100 truncate block" [title]="deviceInfo().name">
            {{ deviceInfo().name }}
          </span>
        </div>

        <div class="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-1">
          <span class="block text-[8px] uppercase font-bold text-zinc-400">Browser & OS</span>
          <span class="font-extrabold text-zinc-900 dark:text-zinc-100 truncate block">
            {{ deviceInfo().browser }} ({{ deviceInfo().os }})
          </span>
        </div>

        <div class="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-1">
          <span class="block text-[8px] uppercase font-bold text-zinc-400">FCM Token Hash</span>
          <span class="font-bold text-blue-600 dark:text-blue-400 truncate block" [title]="fcmToken()">
            {{ fcmToken() ? (fcmToken().slice(0, 8) + '...' + fcmToken().slice(-6)) : 'No Token' }}
          </span>
        </div>

      </div>

      <!-- ACTION BUTTONS BAR -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div class="flex flex-wrap items-center gap-2">
          <button
            (click)="registerCurrentDevice()"
            [disabled]="loading()"
            class="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all border-none cursor-pointer flex items-center gap-1.5"
          >
            <mat-icon class="text-sm">phonelink_setup</mat-icon>
            <span>{{ isRegistered() ? 'Update FCM Token' : 'Register Device' }}</span>
          </button>

          <button
            (click)="sendTestPushNotification()"
            [disabled]="!isRegistered() || loading()"
            class="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all border-none cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <mat-icon class="text-sm">send</mat-icon>
            <span>Test Push Alert</span>
          </button>
        </div>

        @if (isRegistered()) {
          <button
            (click)="removeCurrentDevice()"
            class="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-2 rounded-xl text-xs font-bold uppercase transition border-none cursor-pointer flex items-center gap-1"
          >
            <mat-icon class="text-sm">delete_outline</mat-icon>
            <span>Unregister Device</span>
          </button>
        }
      </div>

    </div>
  `,
})
export class AdminFcmTokenCard implements OnInit {
  private ns = inject(NotificationService);
  private toastService = inject(ToastService);

  permissionState = signal<string>("default");
  fcmToken = signal<string>("");
  isRegistered = signal<boolean>(false);
  loading = signal<boolean>(false);
  envStatus = signal<any>(null);

  deviceInfo = signal<{ name: string; browser: string; os: string }>({
    name: "Desktop Device",
    browser: "Chrome",
    os: "Windows",
  });

  ngOnInit() {
    this.refreshDeviceInfo();
  }

  loadEnvironmentStatus() {
    this.ns.getEnvironmentStatus().subscribe({
      next: (res) => {
        if (res?.success && res.data) {
          this.envStatus.set(res.data);
        }
      },
      error: (err) => {
        console.warn("Failed to load FCM environment status:", err);
      },
    });
  }

  refreshDeviceInfo() {
    this.loadEnvironmentStatus();
    if (typeof window !== "undefined") {
      this.permissionState.set(Notification.permission);

      const ua = navigator.userAgent;
      let browser = "Chrome";
      if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
      else if (ua.includes("Edg")) browser = "Edge";

      let os = "Windows";
      if (ua.includes("Mac")) os = "macOS";
      else if (ua.includes("Linux")) os = "Linux";
      else if (ua.includes("Android")) os = "Android";
      else if (ua.includes("iPhone")) os = "iOS";

      this.deviceInfo.set({
        name: `${os} (${browser})`,
        browser,
        os,
      });

      const cachedToken = localStorage.getItem("admin_fcm_token") || this.ns.fcmToken();
      if (cachedToken) {
        this.fcmToken.set(cachedToken);
        this.isRegistered.set(true);
      }
    }
  }

  async registerCurrentDevice() {
    this.loading.set(true);
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        const perm = await Notification.requestPermission();
        this.permissionState.set(perm);

        if (perm === "granted") {
          await this.ns.requestPermission();
          let token = this.ns.fcmToken();
          
          if (!token) {
            token = (await this.ns.getFcmToken()) || "";
          }

          if (!token) {
            this.toastService.error("Could not obtain valid FCM push token from browser. Please check notification settings.");
            return;
          }

          this.fcmToken.set(token);
          localStorage.setItem("admin_fcm_token", token);
          this.isRegistered.set(true);

          // Sync registration payload to backend
          const payload = {
            adminId: "admin-main",
            deviceName: this.deviceInfo().name,
            browser: this.deviceInfo().browser,
            operatingSystem: this.deviceInfo().os,
            platform: "Desktop",
            fcmToken: token,
            notificationPermission: "granted",
          };

          this.ns.registerAdminDevice(payload).subscribe({
            next: () => {
              this.toastService.success("Admin device registered & FCM token synced with backend!");
              this.loadEnvironmentStatus();
            },
            error: (err) => {
              console.error("Failed to register admin FCM device:", err);
              this.toastService.error("Failed to sync FCM token with backend server.");
            },
          });
        } else {
          this.toastService.error("Notification permission denied in browser settings.");
        }
      }
    } catch (err: any) {
      console.error("registerCurrentDevice error:", err);
      this.toastService.error("Failed to register device push token.");
    } finally {
      this.loading.set(false);
    }
  }

  sendTestPushNotification() {
    this.loading.set(true);
    const token = this.fcmToken();

    this.ns.sendTestNotification(token).subscribe({
      next: (res) => {
        this.loading.set(false);
        const title = res?.data?.title || "🚀 3DGalaxy Admin Push Test";
        const body = res?.data?.body || "Push notifications are active on your device.";

        // Instantly trigger browser native push alert
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            const notif = new Notification(title, {
              body,
              icon: "/favicon.ico",
              tag: "admin-push-test",
            });
            notif.onclick = () => {
              window.focus();
              notif.close();
            };
          } catch (e) {
            console.warn("Native Notification trigger error:", e);
          }
        }

        this.toastService.success("Test push notification sent to current device!");
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error("Failed to send test notification.");
      },
    });
  }

  removeCurrentDevice() {
    if (confirm("Are you sure you want to unregister this device from push notifications?")) {
      this.isRegistered.set(false);
      this.fcmToken.set("");
      localStorage.removeItem("admin_fcm_token");
      this.toastService.success("Device unregistered.");
    }
  }
}
