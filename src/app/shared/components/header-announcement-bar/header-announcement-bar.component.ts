import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService } from '../../../services/datastore';
import { DEFAULT_HEADER_ANNOUNCEMENTS } from '../../../core/services/settings.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

export interface AnnouncementItem {
  id: string;
  title: string;
  shortMessage: string;
  description?: string;
  icon?: string;
  iconType?: 'material' | 'emoji' | 'svg';
  svgPath?: string;
  bgColor?: string;
  textColor?: string;
  ctaText?: string;
  ctaUrl?: string;
  openInNewTab?: boolean;
  animationType?: 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom' | 'bounce' | 'pulse' | 'typewriter' | 'glow' | 'flip' | 'marquee';
  displayMode?: 'static' | 'marquee' | 'rotating';
  scrollDirection?: 'left' | 'right';
  scrollSpeed?: number; // seconds or interval
  priority?: number;
  visiblePages?: string[];
  targetAudience?: string;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  isDismissible?: boolean;
  sortOrder?: number;
}

@Component({
  selector: 'app-header-announcement-bar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (activeAnnouncements().length > 0) {
      <div 
        class="header-announcement-wrapper relative z-50 text-xs select-none font-sans overflow-hidden py-0.5"
        [style.background]="currentAnnouncement()?.bgColor || 'linear-gradient(-45deg, #d65108, #ea580c, #7c3aed, #059669, #2563eb, #d65108)'"
        [style.color]="currentAnnouncement()?.textColor || '#ffffff'"
        (mouseenter)="isPaused.set(true)"
        (mouseleave)="isPaused.set(false)"
        role="region"
        aria-label="Top Header Announcement Bar"
      >
        <div class="max-w-7xl mx-auto px-2 sm:px-4 h-8 sm:h-9 flex items-center justify-between gap-2">
          
          <!-- PREV BUTTON (If in rotating mode with > 1 items) -->
          @if (currentMode() === 'rotating' && activeAnnouncements().length > 1) {
            <button 
              type="button"
              (click)="prevAnnouncement()"
              class="hidden sm:flex h-5 w-5 items-center justify-center rounded-full bg-black/15 hover:bg-black/30 text-white transition-all cursor-pointer border-none shrink-0"
              title="Previous Announcement"
              aria-label="Previous Announcement"
            >
              <mat-icon class="scale-60 text-[12px]">chevron_left</mat-icon>
            </button>
          }

          <!-- CENTER SCROLLABLE TICKER CONTENT WITH GRADIENT MASK -->
          <div 
            class="flex-1 min-w-0 flex items-center overflow-hidden h-full py-0.5"
            style="mask-image: linear-gradient(to right, transparent, black 3%, black 97%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 3%, black 97%, transparent);"
          >
            <!-- MARQUEE CONTINUOUS INFINITE TICKER MODE -->
            @if (currentMode() === 'marquee') {
              <div 
                class="marquee-track flex items-center gap-12 sm:gap-16 whitespace-nowrap"
                [class.marquee-paused]="isPaused()"
                [style.animationDuration]="marqueeDuration() + 's'"
                [style.animationDirection]="currentAnnouncement()?.scrollDirection === 'right' ? 'reverse' : 'normal'"
              >
                @for (item of marqueeItems(); track $index) {
                  <div 
                    class="flex items-center gap-2 cursor-pointer inline-flex hover:opacity-90 transition-opacity" 
                    (click)="clickAnnouncement(item)"
                  >
                    @if (item.icon) {
                      @if (item.iconType === 'emoji') {
                        <span class="text-xs sm:text-sm shrink-0">{{ item.icon }}</span>
                      } @else {
                        <mat-icon class="scale-75 text-[15px] shrink-0 leading-none">{{ item.icon }}</mat-icon>
                      }
                    }
                    <span class="font-extrabold tracking-tight text-[11px] sm:text-xs">{{ item.shortMessage }}</span>
                    @if (item.ctaText) {
                      <span class="px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/35 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all ml-1 border border-white/20 shadow-2xs">
                        {{ item.ctaText }} →
                      </span>
                    }
                  </div>
                }
              </div>
            }

            <!-- ROTATING / STATIC SINGLE ANNOUNCEMENT MODE -->
            @else {
              @if (currentAnnouncement(); as ann) {
                <div 
                  class="announcement-content flex items-center justify-center gap-2 sm:gap-3 py-0.5 cursor-pointer w-full"
                  [ngClass]="getAnimationClass(ann.animationType)"
                  (click)="clickAnnouncement(ann)"
                >
                  @if (ann.icon) {
                    @if (ann.iconType === 'emoji') {
                      <span class="text-xs sm:text-sm shrink-0 animate-bounce-subtle">{{ ann.icon }}</span>
                    } @else {
                      <mat-icon class="scale-75 sm:scale-90 text-[16px] sm:text-[18px] shrink-0 leading-none flex items-center justify-center">{{ ann.icon }}</mat-icon>
                    }
                  }

                  <span class="font-extrabold tracking-tight text-[10px] sm:text-xs truncate max-w-[240px] sm:max-w-xl md:max-w-2xl">
                    {{ ann.shortMessage }}
                  </span>

                  @if (ann.ctaText) {
                    <button
                      type="button"
                      (click)="clickAnnouncement(ann, $event)"
                      class="px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/35 active:scale-95 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-200 border border-white/20 cursor-pointer text-current shrink-0 flex items-center gap-1 shadow-2xs"
                    >
                      <span>{{ ann.ctaText }}</span>
                      <span class="text-[10px] font-mono">→</span>
                    </button>
                  }
                </div>
              }
            }
          </div>

          <!-- RIGHT ACTIONS: NEXT & DISMISS -->
          <div class="flex items-center gap-1.5 shrink-0">
            @if (currentMode() === 'rotating' && activeAnnouncements().length > 1) {
              <button 
                type="button"
                (click)="nextAnnouncement()"
                class="hidden sm:flex h-5 w-5 items-center justify-center rounded-full bg-black/15 hover:bg-black/30 text-white transition-all cursor-pointer border-none shrink-0"
                title="Next Announcement"
                aria-label="Next Announcement"
              >
                <mat-icon class="scale-60 text-[12px]">chevron_right</mat-icon>
              </button>
            }

            @if (currentAnnouncement()?.isDismissible !== false) {
              <button
                type="button"
                (click)="dismissCurrent($event)"
                class="h-5 w-5 rounded-full bg-black/15 hover:bg-black/30 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer border-none shrink-0"
                title="Dismiss Announcement"
                aria-label="Dismiss Announcement"
              >
                <mat-icon class="scale-60 text-[12px]">close</mat-icon>
              </button>
            }
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .header-announcement-wrapper {
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
      animation: animatedGradient 16s ease infinite;
      background-size: 300% 300% !important;
    }

    @keyframes animatedGradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    /* Marquee Infinite Ticker Animation */
    .marquee-track {
      display: flex;
      width: max-content;
      animation: marqueeScroll 35s linear infinite;
    }
    .marquee-paused {
      animation-play-state: paused !important;
    }
    @keyframes marqueeScroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .marquee-paused {
      animation-play-state: paused !important;
    }
    @keyframes marqueeInfinite {
      0% { transform: translateX(50%); }
      100% { transform: translateX(-100%); }
    }

    /* CSS Animations for Announcement Transitions */
    .ann-fade {
      animation: annFadeIn 0.5s ease-out forwards;
    }
    .ann-slide-left {
      animation: annSlideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ann-slide-right {
      animation: annSlideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ann-slide-up {
      animation: annSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ann-slide-down {
      animation: annSlideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ann-zoom {
      animation: annZoomIn 0.4s ease-out forwards;
    }
    .ann-bounce {
      animation: annBounceIn 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
    }
    .ann-pulse {
      animation: annPulse 2s infinite ease-in-out;
    }
    .ann-glow {
      animation: annGlow 2.5s infinite alternate ease-in-out;
    }

    @keyframes annFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes annSlideLeft {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes annSlideRight {
      from { opacity: 0; transform: translateX(-30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes annSlideUp {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes annSlideDown {
      from { opacity: 0; transform: translateY(-15px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes annZoomIn {
      from { opacity: 0; transform: scale(0.85); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes annBounceIn {
      0% { opacity: 0; transform: scale(0.3); }
      50% { opacity: 1; transform: scale(1.05); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes annPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    @keyframes annGlow {
      from { filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3)); }
      to { filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)); }
    }

    /* Accessibility: Respect Reduced Motion Preferences */
    @media (prefers-reduced-motion: reduce) {
      .marquee-track,
      .ann-fade, .ann-slide-left, .ann-slide-right,
      .ann-slide-up, .ann-slide-down, .ann-zoom,
      .ann-bounce, .ann-pulse, .ann-glow {
        animation: none !important;
        transition: none !important;
      }
    }
  `]
})
export class HeaderAnnouncementBarComponent implements OnInit, OnDestroy {
  public ds = inject(DatastoreService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  // State Signals
  dismissedIds = signal<Set<string>>(new Set());
  currentUrl = signal<string>('/');
  isPaused = signal<boolean>(false);
  currentIndex = signal<number>(0);

  private timerInterval: any = null;
  private routerSub?: Subscription;

  // Filtered Active Announcements Computed
  activeAnnouncements = computed<AnnouncementItem[]>(() => {
    const rawList = this.ds.settingsService.headerAnnouncements();
    const list: AnnouncementItem[] = (Array.isArray(rawList) && rawList.length > 0)
      ? rawList
      : DEFAULT_HEADER_ANNOUNCEMENTS;

    const dismissed = this.dismissedIds();
    const currentPath = this.currentUrl();
    const now = new Date();

    const filtered = list.filter((item: AnnouncementItem) => {
      // 1. Active Check
      if (item.isActive === false) return false;

      // 2. Dismissed Check
      if (dismissed.has(item.id)) return false;

      // 3. Date Schedule Check
      if (item.startDate) {
        const start = new Date(item.startDate);
        if (start > now) return false;
      }
      if (item.endDate) {
        const end = new Date(item.endDate);
        if (end < now) return false;
      }

      // 4. Visible Pages Check
      if (Array.isArray(item.visiblePages) && item.visiblePages.length > 0) {
        const hasAll = item.visiblePages.includes('all');
        const matchesCurrent = item.visiblePages.some(p => {
          if (p === 'homepage' && (currentPath === '/' || currentPath === '')) return true;
          return currentPath.startsWith(p);
        });
        if (!hasAll && !matchesCurrent) return false;
      }

      return true;
    });

    // Sort by Priority (ascending)
    return filtered.sort((a, b) => (a.priority ?? a.sortOrder ?? 10) - (b.priority ?? b.sortOrder ?? 10));
  });

  marqueeItems = computed<AnnouncementItem[]>(() => {
    const list = this.activeAnnouncements();
    if (list.length === 0) return [];
    return [...list, ...list, ...list, ...list];
  });

  currentAnnouncement = computed<AnnouncementItem | null>(() => {
    const list = this.activeAnnouncements();
    if (list.length === 0) return null;
    const idx = this.currentIndex() % list.length;
    return list[idx] || list[0];
  });

  currentMode = computed<'static' | 'marquee' | 'rotating'>(() => {
    const ann = this.currentAnnouncement();
    if (!ann) return 'marquee';
    return ann.displayMode || 'marquee';
  });

  marqueeDuration = computed<number>(() => {
    const ann = this.currentAnnouncement();
    const speed = ann?.scrollSpeed || 4;
    const count = this.activeAnnouncements().length;
    return Math.max(15, count * 8);
  });

  ngOnInit() {
    this.loadDismissedFromStorage();
    this.initRouterListener();
    this.startAutoRotation();
  }

  ngOnDestroy() {
    this.stopAutoRotation();
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  private loadDismissedFromStorage() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const cached = localStorage.getItem('3d_galaxy_dismissed_announcements');
        if (cached) {
          const arr = JSON.parse(cached);
          if (Array.isArray(arr)) {
            this.dismissedIds.set(new Set(arr));
          }
        }
      } catch (e) {
        console.warn('Failed to parse dismissed announcements from storage:', e);
      }
    }
  }

  private initRouterListener() {
    this.currentUrl.set(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentUrl.set(e.urlAfterRedirects || e.url);
      });
  }

  private startAutoRotation() {
    if (isPlatformBrowser(this.platformId)) {
      this.stopAutoRotation();
      this.timerInterval = setInterval(() => {
        if (!this.isPaused() && this.currentMode() === 'rotating') {
          const list = this.activeAnnouncements();
          if (list.length > 1) {
            this.currentIndex.update(cur => (cur + 1) % list.length);
          }
        }
      }, 4500);
    }
  }

  private stopAutoRotation() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  nextAnnouncement() {
    const list = this.activeAnnouncements();
    if (list.length > 0) {
      this.currentIndex.update(cur => (cur + 1) % list.length);
    }
  }

  prevAnnouncement() {
    const list = this.activeAnnouncements();
    if (list.length > 0) {
      this.currentIndex.update(cur => (cur - 1 + list.length) % list.length);
    }
  }

  selectIndex(idx: number) {
    this.currentIndex.set(idx);
  }

  clickAnnouncement(item: AnnouncementItem, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    const url = item.ctaUrl;
    if (!url) return;

    if (item.openInNewTab || url.startsWith('http://') || url.startsWith('https://')) {
      if (isPlatformBrowser(this.platformId)) {
        window.open(url, '_blank');
      }
    } else {
      this.router.navigateByUrl(url);
    }
  }

  dismissCurrent(event: MouseEvent) {
    event.stopPropagation();
    const current = this.currentAnnouncement();
    if (!current) return;

    const newSet = new Set(this.dismissedIds());
    newSet.add(current.id);
    this.dismissedIds.set(newSet);

    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem('3d_galaxy_dismissed_announcements', JSON.stringify(Array.from(newSet)));
      } catch (e) {
        console.warn('Failed to save dismissed announcement to storage:', e);
      }
    }
  }

  getAnimationClass(type?: string): string {
    switch (type) {
      case 'fade': return 'ann-fade';
      case 'slide-left': return 'ann-slide-left';
      case 'slide-right': return 'ann-slide-right';
      case 'slide-up': return 'ann-slide-up';
      case 'slide-down': return 'ann-slide-down';
      case 'zoom': return 'ann-zoom';
      case 'bounce': return 'ann-bounce';
      case 'pulse': return 'ann-pulse';
      case 'glow': return 'ann-glow';
      default: return 'ann-fade';
    }
  }
}
