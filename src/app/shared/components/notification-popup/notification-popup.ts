import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../../services/notification.service';
import { DatastoreService } from '../../../services/datastore';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-notification-popup',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (showPrompt$ | async) {
      <div class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto"
           (click)="onBackdropClick($event)">
        
        <div [style.backgroundColor]="computedBgColor()"
             [style.color]="computedTextColor()"
             [style.borderRadius.px]="computedBorderRadius()"
             [style.borderColor]="computedBorderColor()"
             class="w-full max-w-[440px] max-h-[92vh] overflow-y-auto no-scrollbar p-6 sm:p-8 shadow-2xl text-center relative border transition-all duration-300 my-auto"
             [ngClass]="[getAnimationClass(), isDark() ? 'shadow-black/60' : 'shadow-zinc-900/20']"
             (click)="$event.stopPropagation()">
          
          <!-- Subtle Top Ambient Glow -->
          <div class="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-36 rounded-full blur-3xl opacity-25 bg-gradient-to-b from-orange-500 to-transparent"></div>

          <!-- Close 'X' Button -->
          <button (click)="dismiss()" 
                  type="button" 
                  class="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border-none"
                  [ngClass]="isDark() ? 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10' : 'text-zinc-500 hover:text-zinc-900 bg-black/5 hover:bg-black/10'"
                  aria-label="Close notification prompt">
            <mat-icon class="!text-lg !w-5 !h-5 leading-none">close</mat-icon>
          </button>

          <!-- Banner Image if set -->
          @if (config()?.bannerUrl) {
            <div class="-mt-6 -mx-6 sm:-mt-8 sm:-mx-8 mb-5 sm:mb-6 h-32 sm:h-38 overflow-hidden relative">
              <img [src]="config()?.bannerUrl" class="w-full h-full object-cover" alt="Banner" />
              <div class="absolute inset-0"
                   [style.background]="bannerGradient()"></div>
            </div>
          }

          <!-- Premium Icon or Brand Logo -->
          <div class="flex justify-center mb-3 sm:mb-4">
            @if (!logoFailed()) {
              <div class="relative p-2.5 rounded-2xl transition-transform duration-300 hover:scale-105"
                   [ngClass]="isDark() ? 'bg-zinc-800/80 border border-zinc-700/60 shadow-lg shadow-black/40' : 'bg-white/95 border border-zinc-200/90 shadow-md shadow-zinc-300/40'">
                <img [src]="resolvedLogoUrl()" 
                     (error)="onLogoError($event)" 
                     class="w-12 h-12 sm:w-14 sm:h-14 object-contain" 
                     alt="3D Galaxy Logo" />
              </div>
            } @else {
              <div class="w-14 h-14 bg-gradient-to-tr from-orange-500/20 to-amber-500/20 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-500/30 shadow-lg shadow-orange-500/10">
                <mat-icon class="scale-125">notifications_active</mat-icon>
              </div>
            }
          </div>

          <!-- Title -->
          <h3 class="text-lg sm:text-xl font-extrabold tracking-tight mb-2 sm:mb-2.5 leading-snug px-1">
            {{ config()?.title || '🚀 Welcome to 3D Galaxy!' }}
          </h3>
          
          <!-- Description -->
          <p class="text-xs sm:text-sm leading-relaxed mb-6 sm:mb-7 whitespace-pre-line px-1 font-normal"
             [style.color]="computedSubtextColor()">
            {{ config()?.description || 'Stay ahead with exclusive deals, custom print launches, premium merchandise, flash sales and limited-time offers.' }}
          </p>

          <!-- Action Buttons (Responsive Layout) -->
          <div class="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 justify-center items-stretch sm:items-center">
            <button (click)="dismiss()" 
                    type="button"
                    class="h-11 sm:h-12 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer border flex-1 text-center"
                    [ngClass]="isDark() 
                      ? 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border-zinc-700/70 hover:border-zinc-600 active:scale-[0.98]' 
                      : 'bg-zinc-100 hover:bg-zinc-200/90 text-zinc-700 border-zinc-200/90 hover:border-zinc-300 active:scale-[0.98]'">
              {{ config()?.cancelText || 'Maybe Later' }}
            </button>
            <button (click)="allow()" 
                    type="button"
                    [style.backgroundColor]="computedButtonColor()"
                    class="h-11 sm:h-12 px-5 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex-1 text-center shadow-lg shadow-orange-500/25 flex items-center justify-center gap-1.5 border-none">
              <span>{{ config()?.allowText || 'Keep Me Updated 🔔' }}</span>
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.25s ease-out forwards;
    }
    .animate-slide-in-bottom {
      animation: slideInBottom 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .animate-scale-in {
      animation: scaleIn 0.3s cubic-bezier(0.34, 1.35, 0.64, 1) forwards;
    }
    .animate-fade {
      animation: fadeIn 0.3s ease forwards;
    }
    .animate-bounce-in {
      animation: bounceIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }

    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideInBottom {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes scaleIn {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes bounceIn {
      0% { transform: scale(0.4); opacity: 0; }
      60% { transform: scale(1.04); opacity: 0.9; }
      80% { transform: scale(0.97); opacity: 0.95; }
      100% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class NotificationPopupComponent {
  private ns = inject(NotificationService);
  private ds = inject(DatastoreService);
  private settingsService = inject(SettingsService);

  showPrompt$ = this.ns.showPrompt$;
  config = this.ns.popupConfig;

  isDark = computed(() => this.ds.theme() === 'dark');
  logoFailed = signal<boolean>(false);
  private fallbackStep = 0;

  isSyncWithTheme = computed(() => {
    const cfg = this.config();
    if (!cfg) return true;
    if (cfg.syncWithTheme === true) return true;
    if (!cfg.backgroundColor || cfg.backgroundColor === 'theme' || cfg.backgroundColor === 'transparent') return true;
    return false;
  });

  computedBgColor = computed(() => {
    const cfg = this.config();
    if (!this.isSyncWithTheme() && cfg?.backgroundColor && cfg.backgroundColor !== 'theme') {
      return cfg.backgroundColor;
    }
    // High-fidelity background adhering to active theme mode
    return this.isDark() ? '#18181b' : '#ffffff';
  });

  computedTextColor = computed(() => {
    const cfg = this.config();
    if (!this.isSyncWithTheme() && cfg?.textColor && cfg.textColor !== 'theme') {
      return cfg.textColor;
    }
    return this.isDark() ? '#f8fafc' : '#09090b';
  });

  computedSubtextColor = computed(() => {
    return this.isDark() ? 'rgba(244, 244, 245, 0.75)' : 'rgba(24, 24, 27, 0.7)';
  });

  computedBorderColor = computed(() => {
    return this.isDark() ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  });

  computedBorderRadius = computed(() => {
    const r = this.config()?.borderRadius;
    if (typeof r === 'number' && !isNaN(r) && r > 0) return r;
    return 24;
  });

  computedButtonColor = computed(() => {
    const bColor = this.config()?.buttonColor;
    if (bColor && bColor !== 'theme' && bColor.trim() !== '') {
      return bColor;
    }
    return 'var(--primary-color, #f97316)';
  });

  bannerGradient = computed(() => {
    const bg = this.computedBgColor();
    return `linear-gradient(to top, ${bg} 0%, rgba(0,0,0,0.3) 60%, transparent 100%)`;
  });

  resolvedLogoUrl = computed(() => {
    const cfg = this.config();
    const rawLogo = cfg?.logoUrl;
    if (rawLogo && typeof rawLogo === 'string' && rawLogo.trim() !== '') {
      return rawLogo.trim();
    }
    const siteLogo = this.settingsService.logoUrl();
    if (siteLogo && siteLogo.trim() !== '') {
      return siteLogo.trim();
    }
    return '/3d-logo.png';
  });

  getAnimationClass(): string {
    const anim = this.config()?.animation || 'scale-in';
    return `animate-${anim}`;
  }

  onLogoError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (this.fallbackStep === 0) {
      this.fallbackStep = 1;
      if (img) img.src = '/3d-logo.png';
    } else if (this.fallbackStep === 1) {
      this.fallbackStep = 2;
      if (img) img.src = '/logo.svg';
    } else {
      this.logoFailed.set(true);
    }
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.dismiss();
    }
  }

  allow() {
    this.ns.requestPermission();
  }

  dismiss() {
    this.ns.dismissPrompt();
  }
}
