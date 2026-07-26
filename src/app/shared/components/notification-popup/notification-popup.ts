import { Component, inject, computed } from '@angular/core';
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
        <div [style.backgroundColor]="config()?.backgroundColor || '#1e293b'"
             [style.color]="config()?.textColor || '#ffffff'"
             [style.borderRadius.px]="config()?.borderRadius || 24"
             class="w-full max-w-md border border-neutral-200 dark:border-neutral-800 p-8 shadow-2xl text-center relative overflow-hidden transition-all duration-300"
             [ngClass]="getAnimationClass()">
          
          <!-- Banner Image if set -->
          @if (config()?.bannerUrl) {
            <div class="-mt-8 -mx-8 mb-6 h-36 overflow-hidden relative">
              <img [src]="config()?.bannerUrl" class="w-full h-full object-cover" alt="Banner" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>
          }

          <!-- Premium Icon or Brand Logo -->
          <div class="flex justify-center mb-4">
            @if (config()?.logoUrl) {
              <img [src]="config()?.logoUrl" class="w-16 h-16 object-contain rounded-xl shadow-md" alt="Logo" />
            } @else {
              <div class="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center">
                <mat-icon class="scale-125">notifications_active</mat-icon>
              </div>
            }
          </div>

          <h3 class="text-xl font-bold tracking-tight mb-3">
            {{ config()?.title || 'Never Miss Amazing Deals!' }}
          </h3>
          
          <p class="opacity-80 text-sm leading-relaxed mb-6 whitespace-pre-line">
            {{ config()?.description || 'Enable notifications for deals, offers and status tracking.' }}
          </p>

          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <button (click)="allow()" 
                    [style.backgroundColor]="config()?.buttonColor || '#f97316'"
                    class="h-12 px-6 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex-1 shadow-lg shadow-orange-500/20">
              {{ config()?.allowText || 'Allow Notifications' }}
            </button>
            <button (click)="dismiss()" 
                    class="h-12 px-6 bg-white/10 hover:bg-white/20 text-current rounded-xl font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer border border-white/20">
              {{ config()?.cancelText || 'Maybe Later' }}
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
    .animate-slide-in-bottom {
      animation: slideInBottom 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .animate-scale-in {
      animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .animate-fade {
      animation: fadeIn 0.4s ease forwards;
    }
    .animate-bounce-in {
      animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideInBottom {
      from { transform: translateY(40px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes scaleIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes bounceIn {
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.05); opacity: 0.8; }
      70% { transform: scale(0.9); opacity: 0.9; }
      100% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class NotificationPopupComponent {
  private ns = inject(NotificationService);
  showPrompt$ = this.ns.showPrompt$;
  config = this.ns.popupConfig;

  getAnimationClass(): string {
    const anim = this.config()?.animation || 'scale-in';
    return `animate-${anim}`;
  }

  allow() {
    this.ns.requestPermission();
  }

  dismiss() {
    this.ns.dismissPrompt();
  }
}
