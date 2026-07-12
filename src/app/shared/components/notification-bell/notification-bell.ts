import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="relative">
      <!-- Bell Icon Button -->
      <button (click)="toggleDropdown()" 
              class="relative p-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full transition-colors cursor-pointer focus:outline-none">
        <mat-icon class="scale-105">notifications</mat-icon>
        
        <!-- Unread badge -->
        @if (unreadCount() > 0) {
          <span class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#f54f00] text-[10px] font-black text-white ring-2 ring-white dark:ring-neutral-900 animate-pulse">
            {{ unreadCount() }}
          </span>
        }
      </button>

      <!-- Dropdown Panel -->
      @if (isOpen()) {
        <div class="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-xl z-50 overflow-hidden animate-slide-up">
          
          <!-- Header -->
          <div class="p-4 border-b border-neutral-150 dark:border-neutral-800 flex items-center justify-between">
            <span class="text-sm font-black text-neutral-950 dark:text-white">Notifications</span>
            @if (unreadCount() > 0) {
              <button (click)="markAllRead()" 
                      class="text-xs font-black text-[#f54f00] hover:text-orange-700 uppercase tracking-wider cursor-pointer">
                Mark all read
              </button>
            }
          </div>

          <!-- Notification List -->
          <div class="max-h-80 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
            @if (notifications().length === 0) {
              <div class="p-8 text-center text-neutral-450 dark:text-neutral-500 text-sm">
                <mat-icon class="scale-125 mb-2 text-neutral-300">notifications_off</mat-icon>
                <p>No new notifications</p>
              </div>
            } @else {
              @for (item of notifications().slice(0, 5); track item.id) {
                <div class="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors flex gap-3 relative"
                     [style.background-color]="!item.isRead ? 'rgba(245,79,0,0.03)' : 'transparent'">
                  
                  <!-- Left accent status dot -->
                  @if (!item.isRead) {
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#f54f00] rounded-full"></span>
                  }

                  <!-- Image / Icon -->
                  <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 overflow-hidden">
                    @if (item.image) {
                      <img [src]="item.image" alt="notification banner" class="w-full h-full object-cover">
                    } @else {
                      <mat-icon class="scale-90">info</mat-icon>
                    }
                  </div>

                  <!-- Details -->
                  <div class="flex-1 min-w-0">
                    <a [routerLink]="item.actionUrl || null" (click)="onItemClick(item)" class="block">
                      <p class="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-1">
                        {{ item.title }}
                      </p>
                      <p class="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal line-clamp-2 mt-0.5">
                        {{ item.body }}
                      </p>
                    </a>
                    <span class="text-[9px] text-neutral-400 font-medium block mt-1.5">
                      {{ item.createdAt | date:'shortTime' }}
                    </span>
                  </div>

                  <!-- Delete button -->
                  <button (click)="deleteNotif(item.id)" 
                          class="text-neutral-400 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer self-start">
                    <mat-icon class="scale-75">close</mat-icon>
                  </button>

                </div>
              }
            }
          </div>

          <!-- View all footer -->
          <div class="p-3 bg-neutral-50 dark:bg-neutral-800/20 text-center border-t border-neutral-150 dark:border-neutral-800">
            <a routerLink="/account/notifications" (click)="isOpen.set(false)" 
               class="text-xs font-black text-neutral-600 hover:text-[#f54f00] dark:text-neutral-400 dark:hover:text-white uppercase tracking-widest block">
              View All Notifications
            </a>
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    .animate-slide-up {
      animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes slideUp {
      from { transform: translateY(8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class NotificationBellComponent {
  private ns = inject(NotificationService);

  isOpen = signal<boolean>(false);
  unreadCount = this.ns.unreadCount;
  notifications = this.ns.inbox;

  toggleDropdown() {
    this.isOpen.update(val => !val);
    if (this.isOpen()) {
      this.ns.fetchInbox();
    }
  }

  markAllRead() {
    this.ns.markAsRead();
  }

  onItemClick(item: any) {
    this.isOpen.set(false);
    if (!item.isRead) {
      this.ns.markAsRead(item.id);
    }
  }

  deleteNotif(id: string) {
    this.ns.deleteNotification(id);
  }
}
