import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DatastoreService } from '../../../services/datastore';
import { interval, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface RecentPurchaseItem {
  id: string;
  customerName: string;
  city: string;
  state: string;
  country: string;
  productName: string;
  productImage: string;
  productSlug: string;
  minutesAgo: number;
}

const SESSION_KEY = '3dg_popup_dismissed';
const CACHE_KEY = '3dg_recent_purchases_cache';
const CACHE_TIME_KEY = '3dg_recent_purchases_cache_time';
const CACHE_DURATION_MS = 60 * 1000; // 1-minute client cache

@Component({
  selector: 'app-recent-purchase-popup',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recent-purchase-popup.html',
  styleUrl: './recent-purchase-popup.scss',
})
export class RecentPurchasePopupComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private http = inject(HttpClient);
  private ds = inject(DatastoreService);

  // State
  items = signal<RecentPurchaseItem[]>([]);
  currentIndex = signal(0);
  isVisible = signal(false);
  isDismissed = signal(false);
  isAnimatingOut = signal(false);
  showConfetti = signal(false);

  currentItem = computed(() => {
    const list = this.items();
    if (!list.length) return null;
    return list[this.currentIndex() % list.length];
  });

  popupConfig = computed(() => {
    const s = this.ds.settings();
    return s?.recentPurchasePopup ?? {
      enabled: true,
      interval: 8000,
      displayDuration: 5000,
      maxItems: 20,
      showLocation: true,
      showTime: true,
    };
  });

  isDark = computed(() => this.ds.theme() === 'dark');

  private rotationSub?: Subscription;
  private routerSub?: Subscription;
  private displayTimer?: ReturnType<typeof setTimeout>;
  private initTimer?: ReturnType<typeof setTimeout>;
  private confettiTimer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Listen to route changes to auto-hide popup on admin views
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isAdminRoute()) {
          this.isVisible.set(false);
        }
      });

    // Start after 2.5s delay so page has time to settle
    this.initTimer = setTimeout(() => this.init(), 2500);
  }

  private isAdminRoute(): boolean {
    return this.router.url.startsWith('/admin') || this.router.url.includes('/admin');
  }

  private init() {
    const config = this.popupConfig();
    if (!config.enabled || this.isAdminRoute()) return;

    // 1. Try to serve from Client Cache (sessionStorage)
    try {
      const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      
      if (cachedTime && cachedData && (Date.now() - Number(cachedTime) < CACHE_DURATION_MS)) {
        const parsed = JSON.parse(cachedData) as RecentPurchaseItem[];
        if (parsed.length) {
          this.items.set(parsed);
          this.showNext();
          this.startRotation();
          return;
        }
      }
    } catch (_) {}

    // 2. Fetch fresh data from API
    this.http
      .get<{ success: boolean; data: RecentPurchaseItem[] }>(
        `${environment.apiUrl}/admin/recent-purchases`
      )
      .subscribe({
        next: (res) => {
          if (res?.success && res.data?.length) {
            const max = config.maxItems ?? 20;
            const finalData = res.data.slice(0, max);
            this.items.set(finalData);

            // Store in client cache
            try {
              sessionStorage.setItem(CACHE_KEY, JSON.stringify(finalData));
              sessionStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
            } catch (_) {}

            this.showNext();
            this.startRotation();
          } else {
            this.items.set(FALLBACK_ITEMS);
            this.showNext();
            this.startRotation();
          }
        },
        error: () => {
          this.items.set(FALLBACK_ITEMS);
          this.showNext();
          this.startRotation();
        },
      });
  }

  private showNext() {
    if (this.isDismissed() || this.isAdminRoute()) return;
    const config = this.popupConfig();
    const displayDuration = config.displayDuration ?? 5000;

    // Show popup
    this.isAnimatingOut.set(false);
    this.isVisible.set(true);

    // Trigger Celebrate Confetti Paper burst
    this.showConfetti.set(true);
    clearTimeout(this.confettiTimer);
    this.confettiTimer = setTimeout(() => {
      this.showConfetti.set(false);
    }, 2000);

    // Hide after displayDuration
    clearTimeout(this.displayTimer);
    this.displayTimer = setTimeout(() => {
      this.hidePopup();
    }, displayDuration);
  }

  private hidePopup(permanent = false) {
    this.isAnimatingOut.set(true);
    setTimeout(() => {
      this.isVisible.set(false);
      this.isAnimatingOut.set(false);
      if (permanent) {
        this.isDismissed.set(true);
      }
    }, 350);
  }

  private startRotation() {
    const config = this.popupConfig();
    const intervalMs = config.interval ?? 8000;

    this.rotationSub = interval(intervalMs).subscribe(() => {
      if (this.isDismissed() || this.isAdminRoute()) return;
      this.currentIndex.update(i => (i + 1) % this.items().length);
      this.showNext();
    });
  }

  dismiss() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (_) {}
    clearTimeout(this.displayTimer);
    this.rotationSub?.unsubscribe();
    this.hidePopup(true);
  }

  navigate() {
    const item = this.currentItem();
    if (item?.productSlug) {
      this.router.navigate(['/product', item.productSlug]);
    }
  }

  formatTime(minutesAgo: number): string {
    if (minutesAgo < 60) return `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`;
    const h = Math.floor(minutesAgo / 60);
    return `${h} hour${h !== 1 ? 's' : ''} ago`;
  }

  formatLocation(item: RecentPurchaseItem): string {
    const parts = [item.city, item.state, item.country].filter(Boolean);
    return parts.join(', ');
  }

  ngOnDestroy() {
    this.rotationSub?.unsubscribe();
    this.routerSub?.unsubscribe();
    clearTimeout(this.displayTimer);
    clearTimeout(this.initTimer);
    clearTimeout(this.confettiTimer);
  }
}

// Fallback inline demo data (used if API fails and no network)
const FALLBACK_ITEMS: RecentPurchaseItem[] = [
  { id: 'f1', customerName: 'T*** S', city: 'Gaya', state: 'Bihar', country: 'India', productName: 'PLA Pro Filament 1.75mm', productImage: 'https://picsum.photos/seed/pla/80/80', productSlug: 'pla-pro-filament-175mm', minutesAgo: 2 },
  { id: 'f2', customerName: 'R*** K', city: 'Mumbai', state: 'Maharashtra', country: 'India', productName: 'Bambu Lab A1 Mini', productImage: 'https://picsum.photos/seed/bambu/80/80', productSlug: 'bambu-lab-a1-mini', minutesAgo: 5 },
  { id: 'f3', customerName: 'A*** M', city: 'Chennai', state: 'Tamil Nadu', country: 'India', productName: 'Elegoo Mars 4 Ultra', productImage: 'https://picsum.photos/seed/elegoo/80/80', productSlug: 'elegoo-mars-4-ultra', minutesAgo: 8 },
];
