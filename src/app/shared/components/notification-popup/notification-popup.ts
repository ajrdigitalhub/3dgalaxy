import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-notification-popup',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (showPrompt$ | async) {
      <div class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-8 shadow-2xl animate-scale-in text-center relative overflow-hidden">
          
          <!-- Background accent gradient blob -->
          <div class="absolute -top-12 -left-12 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div class="absolute -bottom-12 -right-12 w-32 h-32 bg-orange-600/10 rounded-full blur-2xl pointer-events-none"></div>

          <!-- Premium Icon -->
          <div class="mx-auto w-16 h-16 bg-[#f54f00]/10 text-[#f54f00] rounded-2xl flex items-center justify-center mb-6">
            <mat-icon class="scale-125">notifications_active</mat-icon>
          </div>

          <h3 class="text-2xl font-black text-neutral-900 dark:text-white tracking-tight mb-3">
            Stay Updated!
          </h3>
          
          <p class="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed mb-6">
            Enable push notifications to receive real-time updates on:
          </p>

          <ul class="text-left max-w-xs mx-auto space-y-3 mb-8 text-sm text-neutral-600 dark:text-neutral-300 font-medium">
            <li class="flex items-center gap-3">
              <mat-icon class="text-emerald-500 scale-75">check_circle</mat-icon>
              <span>Order Updates & Delivery Status</span>
            </li>
            <li class="flex items-center gap-3">
              <mat-icon class="text-emerald-500 scale-75">check_circle</mat-icon>
              <span>Exclusive Offers & Discounts</span>
            </li>
            <li class="flex items-center gap-3">
              <mat-icon class="text-emerald-500 scale-75">check_circle</mat-icon>
              <span>New Product Launches</span>
            </li>
            <li class="flex items-center gap-3">
              <mat-icon class="text-emerald-500 scale-75">check_circle</mat-icon>
              <span>3D Printing Service Updates</span>
            </li>
          </ul>

          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <button (click)="allow()" 
                    class="h-12 px-6 bg-[#f54f00] hover:bg-orange-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-transform hover:scale-[1.02] cursor-pointer flex-1">
              Allow Notifications
            </button>
            <button (click)="dismiss()" 
                    class="h-12 px-6 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer">
              Maybe Later
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out forwards;
    }
    .animate-scale-in {
      animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class NotificationPopupComponent {
  private ns = inject(NotificationService);
  showPrompt$ = this.ns.showPrompt$;

  allow() {
    this.ns.requestPermission();
  }

  dismiss() {
    this.ns.dismissPrompt();
  }
}
