import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { RouterModule, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { FormsModule } from "@angular/forms";
import { catchError } from "rxjs/operators";
import { of } from "rxjs";

export interface AdminNotification {
  id: string;
  eventKey: string;
  category: string;
  title: string;
  body: string;
  deepLink?: string;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
}

export interface ChannelSetting {
  id?: string;
  eventKey: string;
  eventLabel: string;
  category: string;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
}

@Component({
  selector: "app-admin-notification-center-tab",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 text-left">
      <!-- HEADER & MAIN MODE TOGGLE -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div>
          <div class="flex items-center gap-2">
            <mat-icon class="text-blue-500">notifications_active</mat-icon>
            <h2 class="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
              Admin Notification Center & Channel Matrix
            </h2>
          </div>
          <p class="text-xs text-neutral-500 mt-1">
            Real-time event routing engine, FCM Push notifications, and WhatsApp channel management.
          </p>
        </div>

        <div class="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl border border-neutral-250 dark:border-neutral-700">
          <button
            (click)="activeTab.set('center')"
            [class.bg-white]="activeTab() === 'center'"
            [class.dark:bg-neutral-900]="activeTab() === 'center'"
            [class.shadow-sm]="activeTab() === 'center'"
            [class.text-blue-600]="activeTab() === 'center'"
            class="px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 text-neutral-600 dark:text-neutral-300"
          >
            <mat-icon class="text-sm scale-90">inbox</mat-icon>
            Notification Inbox
            <span *ngIf="unreadCount() > 0" class="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-mono font-black rounded-full">
              {{ unreadCount() }}
            </span>
          </button>

          <button
            (click)="activeTab.set('settings')"
            [class.bg-white]="activeTab() === 'settings'"
            [class.dark:bg-neutral-900]="activeTab() === 'settings'"
            [class.shadow-sm]="activeTab() === 'settings'"
            [class.text-blue-600]="activeTab() === 'settings'"
            class="px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 text-neutral-600 dark:text-neutral-300"
          >
            <mat-icon class="text-sm scale-90">tune</mat-icon>
            Channel Routing Matrix
          </button>
        </div>
      </div>

      <!-- VIEW 1: NOTIFICATION INBOX CENTER -->
      <div *ngIf="activeTab() === 'center'" class="space-y-6">
        <!-- CATEGORY FILTERS & SEARCH BAR -->
        <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <!-- Category Pills -->
          <div class="flex flex-wrap items-center gap-2">
            <button
              *ngFor="let cat of categories"
              (click)="selectedCategory.set(cat.key)"
              [class.bg-neutral-900]="selectedCategory() === cat.key"
              [class.text-white]="selectedCategory() === cat.key"
              [class.dark:bg-white]="selectedCategory() === cat.key"
              [class.dark:text-neutral-900]="selectedCategory() === cat.key"
              [class.bg-white]="selectedCategory() !== cat.key"
              [class.text-neutral-700]="selectedCategory() !== cat.key"
              [class.dark:bg-neutral-900]="selectedCategory() !== cat.key"
              [class.dark:text-neutral-300]="selectedCategory() !== cat.key"
              class="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-neutral-200 dark:border-neutral-800 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <mat-icon class="text-xs scale-75">{{ cat.icon }}</mat-icon>
              {{ cat.label }}
            </button>
          </div>

          <!-- Actions & Search -->
          <div class="flex items-center gap-2">
            <div class="relative flex-1 sm:w-64">
              <mat-icon class="absolute left-3 top-2.5 text-neutral-400 text-sm">search</mat-icon>
              <input
                type="text"
                [ngModel]="searchTerm()"
                (ngModelChange)="searchTerm.set($event)"
                placeholder="Search alerts..."
                class="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs outline-none focus:border-blue-500 dark:text-white"
              />
            </div>

            <button
              (click)="markAllAsRead()"
              class="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-800 dark:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm whitespace-nowrap"
            >
              <mat-icon class="text-sm scale-85">done_all</mat-icon> Mark Read
            </button>

            <button
              (click)="clearAllNotifications()"
              class="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1 border border-rose-500/20 shadow-sm whitespace-nowrap"
            >
              <mat-icon class="text-sm scale-85">delete_sweep</mat-icon> Clear All
            </button>
          </div>
        </div>

        <!-- NOTIFICATION CARDS LIST -->
        <div *ngIf="loading()" class="p-12 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div class="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-xs font-mono text-neutral-500 uppercase tracking-wider">Syncing notification events...</p>
        </div>

        <div *ngIf="!loading() && filteredNotifications().length === 0" class="p-16 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 shadow-sm space-y-3">
          <mat-icon class="text-4xl text-neutral-400">notifications_off</mat-icon>
          <h3 class="text-sm font-bold text-neutral-800 dark:text-white">No Notification Alerts Found</h3>
          <p class="text-xs text-neutral-500 max-w-sm mx-auto">
            You're all caught up! High-priority business events will stream here instantly as they occur.
          </p>
        </div>

        <div *ngIf="!loading() && filteredNotifications().length > 0" class="space-y-3">
          <div
            *ngFor="let notif of filteredNotifications()"
            [ngClass]="{ 'bg-blue-500/5 border-blue-500/30': !notif.isRead, 'bg-white': notif.isRead }"
            class="p-5 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-start justify-between gap-4 transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
          >
            <div class="flex items-start gap-4">
              <div [class]="getCategoryIconBg(notif.category)" class="p-3 rounded-2xl shrink-0 flex items-center justify-center">
                <mat-icon class="scale-110">{{ getCategoryIcon(notif.category) }}</mat-icon>
              </div>

              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span [class]="getCategoryBadgeClass(notif.category)" class="px-2.5 py-0.5 text-[10px] font-mono font-black uppercase rounded">
                    {{ notif.category }}
                  </span>
                  <span class="text-[11px] font-mono text-neutral-400">
                    {{ notif.createdAt | date:'LLL dd, yyyy • hh:mm a' }}
                  </span>
                  <span *ngIf="!notif.isRead" class="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></span>
                </div>

                <h4 class="text-sm font-bold text-neutral-900 dark:text-white">
                  {{ notif.title }}
                </h4>
                <p class="text-xs text-neutral-600 dark:text-neutral-300">
                  {{ notif.body }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                *ngIf="notif.deepLink"
                (click)="navigateTo(notif.deepLink)"
                class="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-800 dark:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 shadow-sm"
              >
                <mat-icon class="text-xs scale-85">open_in_new</mat-icon> View
              </button>

              <button
                *ngIf="!notif.isRead"
                (click)="markAsRead(notif.id)"
                title="Mark as Read"
                class="p-2 text-neutral-400 hover:text-blue-500 transition-colors"
              >
                <mat-icon class="text-sm">done</mat-icon>
              </button>

              <button
                (click)="deleteNotification(notif.id)"
                title="Delete Alert"
                class="p-2 text-neutral-400 hover:text-rose-500 transition-colors"
              >
                <mat-icon class="text-sm">delete</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 2: CHANNEL ROUTING MATRIX SETTINGS -->
      <div *ngIf="activeTab() === 'settings'" class="space-y-6">
        <!-- TOP BANNER & TEST BUTTON -->
        <div class="p-6 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/30 border border-blue-500/20 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div class="space-y-1">
            <h3 class="text-sm font-bold text-blue-400 font-mono uppercase tracking-wider">
              ENTERPRISE NOTIFICATION ROUTING POLICY
            </h3>
            <p class="text-xs text-neutral-300 max-w-xl">
              FCM Push Notifications deliver instantly across all admin devices.
              <strong>WhatsApp Notifications are strictly restricted to New Order events only</strong> to protect your business API quota.
            </p>
          </div>

          <button
            (click)="sendTestPush()"
            class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md whitespace-nowrap"
          >
            <mat-icon class="text-sm scale-95">send</mat-icon> Test FCM Push
          </button>
        </div>

        <!-- SETTINGS MATRIX TABLE -->
        <div class="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <h3 class="text-sm font-bold text-neutral-900 dark:text-white">
              Event Channel Matrix Rules
            </h3>
            <button
              (click)="saveSettings()"
              [disabled]="savingSettings()"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <mat-icon class="text-sm scale-95">save</mat-icon> Save Channel Configuration
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-neutral-50 dark:bg-neutral-950/70 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-mono text-[11px] uppercase">
                  <th class="p-4">Event Name & Description</th>
                  <th class="p-4">Category</th>
                  <th class="p-4 text-center">Push (FCM)</th>
                  <th class="p-4 text-center">WhatsApp</th>
                  <th class="p-4 text-center">Email</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                <tr *ngFor="let item of channelSettings()" class="hover:bg-neutral-50/50 dark:hover:bg-neutral-850/50 transition-colors">
                  <td class="p-4">
                    <div class="font-bold text-neutral-900 dark:text-white">{{ item.eventLabel }}</div>
                    <div class="text-[10px] font-mono text-neutral-400">{{ item.eventKey }}</div>
                  </td>

                  <td class="p-4">
                    <span [class]="getCategoryBadgeClass(item.category)" class="px-2.5 py-0.5 text-[10px] font-mono font-black uppercase rounded">
                      {{ item.category }}
                    </span>
                  </td>

                  <!-- Push Toggle -->
                  <td class="p-4 text-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="item.pushEnabled"
                      class="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  <!-- WhatsApp Toggle (Disabled with explanation for non-NEW_ORDER) -->
                  <td class="p-4 text-center">
                    <div class="flex items-center justify-center gap-1">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.whatsappEnabled"
                        [disabled]="item.eventKey !== 'NEW_ORDER'"
                        class="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                      <mat-icon *ngIf="item.eventKey !== 'NEW_ORDER'" class="text-xs text-neutral-400 scale-75" title="WhatsApp is reserved exclusively for New Order notifications">lock</mat-icon>
                    </div>
                  </td>

                  <!-- Email Toggle -->
                  <td class="p-4 text-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="item.emailEnabled"
                      class="h-4 w-4 rounded border-neutral-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminNotificationCenterTabComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  activeTab = signal<"center" | "settings">("center");

  notifications = signal<AdminNotification[]>([]);
  channelSettings = signal<ChannelSetting[]>([]);

  loading = signal(true);
  savingSettings = signal(false);

  selectedCategory = signal<string>("all");
  searchTerm = signal<string>("");

  categories = [
    { key: "all", label: "All Alerts", icon: "select_all" },
    { key: "orders", label: "Orders", icon: "shopping_bag" },
    { key: "service", label: "3D Services", icon: "precision_manufacturing" },
    { key: "inventory", label: "Inventory", icon: "inventory_2" },
    { key: "customers", label: "Customers", icon: "groups" },
    { key: "reviews", label: "Reviews", icon: "star" },
    { key: "marketing", label: "Marketing", icon: "campaign" },
    { key: "payments", label: "Payments", icon: "payments" },
    { key: "system", label: "System", icon: "dns" },
  ];

  unreadCount = computed(() => this.notifications().filter((n) => !n.isRead).length);

  filteredNotifications = computed(() => {
    let list = this.notifications();
    const cat = this.selectedCategory();
    const term = this.searchTerm().trim().toLowerCase();

    if (cat !== "all") {
      list = list.filter((n) => n.category.toLowerCase() === cat);
    }

    if (term) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(term) ||
          n.body.toLowerCase().includes(term) ||
          n.eventKey.toLowerCase().includes(term)
      );
    }

    return list;
  });

  ngOnInit() {
    this.fetchNotifications();
    this.fetchChannelSettings();
  }

  private getHeaders() {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token") || "";
      if (token) return { headers: { Authorization: `Bearer ${token}` } };
    }
    return {};
  }

  fetchNotifications() {
    this.loading.set(true);
    this.http
      .get<any>("/api/admin/notifications", this.getHeaders())
      .pipe(catchError(() => of({ data: [] })))
      .subscribe((res) => {
        if (res && res.data) {
          this.notifications.set(res.data);
        }
        this.loading.set(false);
      });
  }

  fetchChannelSettings() {
    this.http
      .get<any>("/api/admin/notification-settings", this.getHeaders())
      .pipe(catchError(() => of({ data: [] })))
      .subscribe((res) => {
        if (res && res.data) {
          this.channelSettings.set(res.data);
        }
      });
  }

  saveSettings() {
    this.savingSettings.set(true);
    this.http
      .put<any>(
        "/api/admin/notification-settings",
        { settings: this.channelSettings() },
        this.getHeaders()
      )
      .subscribe({
        next: (res) => {
          alert("Notification channel matrix settings updated successfully!");
          this.savingSettings.set(false);
          this.fetchChannelSettings();
        },
        error: (err) => {
          alert(err.error?.error || "Failed to update channel matrix settings");
          this.savingSettings.set(false);
        },
      });
  }

  sendTestPush() {
    this.http
      .post<any>("/api/admin/fcm/test", {}, this.getHeaders())
      .subscribe({
        next: (res) => {
          alert("🚀 Test Admin FCM Push Notification dispatched!");
          this.fetchNotifications();
        },
        error: (err) => {
          alert(err.error?.error || "Failed to send test push notification");
        },
      });
  }

  markAsRead(id: string) {
    this.http
      .patch<any>(`/api/admin/notifications/${id}/read`, {}, this.getHeaders())
      .subscribe(() => {
        this.fetchNotifications();
      });
  }

  markAllAsRead() {
    this.http
      .post<any>("/api/admin/notifications/mark-all-read", {}, this.getHeaders())
      .subscribe(() => {
        this.fetchNotifications();
      });
  }

  deleteNotification(id: string) {
    this.http
      .delete<any>(`/api/admin/notifications/${id}`, this.getHeaders())
      .subscribe(() => {
        this.fetchNotifications();
      });
  }

  clearAllNotifications() {
    if (!confirm("Are you sure you want to clear all admin notification logs?")) return;
    this.http
      .delete<any>("/api/admin/notifications/clear-all", this.getHeaders())
      .subscribe(() => {
        this.fetchNotifications();
      });
  }

  navigateTo(path: string) {
    if (path) {
      this.router.navigateByUrl(path);
    }
  }

  getCategoryIcon(category: string): string {
    switch ((category || "").toLowerCase()) {
      case "orders": return "shopping_bag";
      case "service": return "precision_manufacturing";
      case "inventory": return "inventory_2";
      case "customers": return "groups";
      case "reviews": return "star";
      case "marketing": return "campaign";
      case "payments": return "payments";
      case "system": return "dns";
      default: return "notifications";
    }
  }

  getCategoryIconBg(category: string): string {
    switch ((category || "").toLowerCase()) {
      case "orders": return "bg-blue-500/10 text-blue-500";
      case "service": return "bg-purple-500/10 text-purple-500";
      case "inventory": return "bg-amber-500/10 text-amber-500";
      case "customers": return "bg-emerald-500/10 text-emerald-500";
      case "reviews": return "bg-yellow-500/10 text-yellow-500";
      case "marketing": return "bg-pink-500/10 text-pink-500";
      case "payments": return "bg-emerald-500/10 text-emerald-500";
      case "system": return "bg-rose-500/10 text-rose-500";
      default: return "bg-neutral-500/10 text-neutral-500";
    }
  }

  getCategoryBadgeClass(category: string): string {
    switch ((category || "").toLowerCase()) {
      case "orders": return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
      case "service": return "bg-purple-500/10 text-purple-500 border border-purple-500/20";
      case "inventory": return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      case "customers": return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case "reviews": return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
      case "marketing": return "bg-pink-500/10 text-pink-500 border border-pink-500/20";
      case "payments": return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case "system": return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
      default: return "bg-neutral-500/10 text-neutral-500 border border-neutral-500/20";
    }
  }
}
