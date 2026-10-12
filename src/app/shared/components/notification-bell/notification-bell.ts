import {
  Component,
  inject,
  signal,
  computed,
  HostListener,
  ElementRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { NotificationService, InboxNotification } from "../../../services/notification.service";
import { DatastoreService } from "../../../services/datastore";

@Component({
  selector: "app-notification-bell",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="relative inline-block">
      <!-- Bell Icon Button (Matches header icon styling) -->
      <button
        (click)="toggleDropdown($event)"
        class="h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl transition-all cursor-pointer relative active:scale-95 focus:outline-none"
        aria-label="Notifications"
        type="button"
      >
        <mat-icon class="scale-100 sm:scale-105">notifications</mat-icon>

        <!-- Unread Badge -->
        @if (unreadCount() > 0) {
          <span
            class="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-[#f54f00] text-[9px] sm:text-[10px] font-black text-white ring-2 ring-white dark:ring-neutral-950 shadow-md animate-pulse"
          >
            {{ unreadCount() > 9 ? "9+" : unreadCount() }}
          </span>
        }
      </button>

      <!-- Backdrop Overlay for Outside Click on Mobile & Desktop -->
      @if (isOpen()) {
        <div
          class="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs sm:bg-transparent sm:backdrop-blur-none"
          (click)="closeDropdown()"
        ></div>

        <!-- Dropdown Panel (Full Responsive: Centered Sheet on Mobile, Anchored Dropdown on Desktop) -->
        <div
          class="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:mt-3 sm:w-96 max-h-[85vh] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col animate-slide-up"
          (click)="$event.stopPropagation()"
        >
          <!-- Header Bar -->
          <div
            class="p-3.5 sm:p-4 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-900/80 backdrop-blur-md"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm font-black tracking-tight text-neutral-950 dark:text-white">
                Notifications
              </span>
              @if (unreadCount() > 0) {
                <span
                  class="px-2 py-0.5 rounded-full bg-orange-500/10 text-[#f54f00] text-[10px] font-black uppercase tracking-wider"
                >
                  {{ unreadCount() }} new
                </span>
              }
            </div>

            <div class="flex items-center gap-2">
              @if (unreadCount() > 0) {
                <button
                  (click)="markAllRead()"
                  class="text-[11px] font-bold text-[#f54f00] hover:text-orange-600 transition-colors cursor-pointer flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-orange-500/10"
                  title="Mark all as read"
                >
                  <mat-icon class="scale-75">done_all</mat-icon>
                  <span class="hidden sm:inline">Mark read</span>
                </button>
              }
              <button
                (click)="closeDropdown()"
                class="sm:hidden text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close notifications"
              >
                <mat-icon class="scale-90">close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Category Filter Tabs -->
          <div
            class="px-3 pt-2.5 pb-1 border-b border-neutral-100 dark:border-neutral-800/60 flex items-center gap-1.5 bg-neutral-50/30 dark:bg-neutral-900/40"
          >
            <button
              (click)="selectedFilter.set('all')"
              [class]="
                selectedFilter() === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
              "
              class="px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer border-none flex items-center gap-1"
            >
              All
              <span class="opacity-70 text-[10px]">({{ notifications().length }})</span>
            </button>

            <button
              (click)="selectedFilter.set('offers')"
              [class]="
                selectedFilter() === 'offers'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
              "
              class="px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer border-none flex items-center gap-1"
            >
              <mat-icon class="scale-75 text-amber-400">local_offer</mat-icon>
              Offers
            </button>

            <button
              (click)="selectedFilter.set('updates')"
              [class]="
                selectedFilter() === 'updates'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
              "
              class="px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer border-none flex items-center gap-1"
            >
              <mat-icon class="scale-75 text-indigo-300">notifications</mat-icon>
              Updates
            </button>
          </div>

          <!-- Notification Items List -->
          <div
            class="overflow-y-auto max-h-[50vh] sm:max-h-80 divide-y divide-neutral-100 dark:divide-neutral-800/60"
          >
            @if (filteredNotifications().length === 0) {
              <!-- Empty State -->
              <div class="py-12 px-6 text-center text-neutral-400 dark:text-neutral-500">
                <div
                  class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-400"
                >
                  <mat-icon class="scale-110">done_all</mat-icon>
                </div>
                <h4 class="text-xs font-black uppercase text-neutral-800 dark:text-neutral-200">
                  All Caught Up!
                </h4>
                <p class="text-[11px] mt-1 text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                  No notifications in this view. Check back soon for new offers, deals and tracking updates.
                </p>
              </div>
            } @else {
              @for (item of filteredNotifications(); track item.id) {
                <div
                  class="p-3.5 sm:p-4 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors flex gap-3 relative group"
                  [style.background-color]="
                    !item.isRead ? 'rgba(245,79,0,0.035)' : 'transparent'
                  "
                >
                  <!-- Left Unread Status Dot -->
                  @if (!item.isRead) {
                    <span
                      class="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#f54f00] rounded-full shadow-[0_0_8px_#f54f00]"
                    ></span>
                  }

                  <!-- Icon Avatar Container -->
                  <div
                    [ngClass]="getCategoryTheme(item.category, item.icon).bg"
                    class="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105"
                  >
                    @if (item.image) {
                      <img
                        [src]="item.image"
                        alt="Notification banner"
                        class="w-full h-full object-cover"
                      />
                    } @else {
                      <mat-icon class="scale-90" [ngClass]="getCategoryTheme(item.category, item.icon).text">
                        {{ item.icon || getCategoryTheme(item.category, item.icon).icon }}
                      </mat-icon>
                    }
                  </div>

                  <!-- Notification Details -->
                  <div
                    class="flex-1 min-w-0 cursor-pointer"
                    (click)="onItemClick(item)"
                  >
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <p
                        class="text-xs font-black text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-1"
                        [class.text-[#f54f00]]="!item.isRead"
                      >
                        {{ item.title }}
                      </p>
                      @if (item.badge) {
                        <span
                          class="px-1.5 py-0.2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[9px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider"
                        >
                          {{ item.badge }}
                        </span>
                      }
                    </div>

                    <p
                      class="text-[11px] text-neutral-600 dark:text-neutral-400 leading-normal line-clamp-2 mt-1"
                    >
                      {{ item.body || item.message }}
                    </p>

                    <div class="flex items-center justify-between mt-2">
                      <span class="text-[9px] font-bold tracking-wider text-neutral-400 uppercase">
                        {{ getRelativeTime(item.createdAt) }}
                      </span>

                      @if (item.actionUrl) {
                        <span
                          class="text-[10px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
                        >
                          <span>Explore</span>
                          <mat-icon class="scale-65">chevron_right</mat-icon>
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Dismiss Button -->
                  <button
                    (click)="deleteNotif($event, item.id)"
                    class="opacity-60 group-hover:opacity-100 text-neutral-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer self-start -mr-1"
                    title="Dismiss"
                    aria-label="Dismiss notification"
                  >
                    <mat-icon class="scale-75">close</mat-icon>
                  </button>
                </div>
              }
            }
          </div>

          <!-- Footer Actions Bar -->
          <div
            class="p-2.5 sm:p-3 bg-neutral-50 dark:bg-neutral-900/90 text-center border-t border-neutral-150 dark:border-neutral-800/80 flex items-center justify-between gap-2"
          >
            @if (isAdmin()) {
              <a
                routerLink="/admin"
                [queryParams]="{ tab: 'notification-center' }"
                (click)="closeDropdown()"
                class="text-[10px] sm:text-xs font-black text-indigo-500 hover:text-indigo-400 uppercase tracking-wider flex items-center gap-1"
              >
                <mat-icon class="scale-75">admin_panel_settings</mat-icon>
                <span>Admin Notification Center</span>
              </a>
            } @else {
              <a
                routerLink="/products"
                (click)="closeDropdown()"
                class="text-[10px] sm:text-xs font-black text-neutral-600 hover:text-[#f54f00] dark:text-neutral-400 dark:hover:text-white uppercase tracking-wider flex items-center gap-1"
              >
                <mat-icon class="scale-75">storefront</mat-icon>
                <span>Explore Store Deals</span>
              </a>
            }

            @if (notifications().length > 0) {
              <button
                (click)="clearAll()"
                class="text-[10px] font-bold text-neutral-400 hover:text-red-500 uppercase tracking-wider cursor-pointer p-1 rounded transition-colors"
              >
                Clear all
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .animate-slide-up {
        animation: slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes slideUp {
        from {
          transform: translateY(8px) scale(0.98);
          opacity: 0;
        }
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }
    `,
  ],
})
export class NotificationBellComponent {
  private ns = inject(NotificationService);
  private ds = inject(DatastoreService);
  private router = inject(Router);
  private el = inject(ElementRef);

  isOpen = signal<boolean>(false);
  selectedFilter = signal<"all" | "offers" | "updates">("all");

  unreadCount = this.ns.unreadCount;
  notifications = this.ns.inbox;

  isAdmin = computed(() => {
    const user: any = this.ds.currentUser();
    return user?.role === "Admin" || user?.role === "Super Admin";
  });

  filteredNotifications = computed(() => {
    const list = this.notifications();
    const filter = this.selectedFilter();
    if (filter === "offers") {
      return list.filter((n) => n.category === "offer");
    }
    if (filter === "updates") {
      return list.filter((n) => n.category !== "offer");
    }
    return list;
  });

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isOpen.update((val) => !val);
    if (this.isOpen()) {
      this.ns.fetchInbox();
    }
  }

  closeDropdown() {
    this.isOpen.set(false);
  }

  @HostListener("document:keydown.escape")
  onEscape() {
    this.closeDropdown();
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    if (this.isOpen() && !this.el.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  markAllRead() {
    this.ns.markAsRead();
  }

  clearAll() {
    this.ns.clearAllNotifications();
  }

  onItemClick(item: InboxNotification) {
    this.closeDropdown();
    if (!item.isRead) {
      this.ns.markAsRead(item.id);
    }
    if (item.actionUrl) {
      if (item.actionUrl.startsWith("http")) {
        window.open(item.actionUrl, "_blank");
      } else {
        this.router.navigateByUrl(item.actionUrl);
      }
    }
  }

  deleteNotif(event: Event, id: string) {
    event.stopPropagation();
    this.ns.deleteNotification(id);
  }

  getRelativeTime(dateStr?: string): string {
    if (!dateStr) return "Just now";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) return "Just now";
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  }

  getCategoryTheme(
    category?: string,
    icon?: string
  ): { bg: string; text: string; icon: string } {
    if (icon === "local_shipping") {
      return {
        bg: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-500",
        text: "text-blue-500",
        icon: "local_shipping",
      };
    }
    if (icon === "print") {
      return {
        bg: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-500",
        text: "text-purple-500",
        icon: "print",
      };
    }
    if (icon === "payments") {
      return {
        bg: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500",
        text: "text-emerald-500",
        icon: "payments",
      };
    }
    if (icon === "celebration" || category === "offer") {
      return {
        bg: "bg-orange-500/10 dark:bg-orange-500/20 text-[#f54f00]",
        text: "text-[#f54f00]",
        icon: icon || "local_offer",
      };
    }
    if (icon === "chat") {
      return {
        bg: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500",
        text: "text-emerald-500",
        icon: "chat",
      };
    }
    if (category === "order" || icon === "shopping_bag") {
      return {
        bg: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-500",
        text: "text-amber-500",
        icon: icon || "shopping_bag",
      };
    }
    return {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500",
      text: "text-indigo-500",
      icon: icon || "notifications",
    };
  }
}
