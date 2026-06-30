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
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DatastoreService } from '../../../services/datastore';
import { interval, Subscription } from 'rxjs';
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

  currentItem = computed(() => {
    const list = this.items();
    if (!list.length) return null;
    return list[this.currentIndex() % list.length];
  });

  popupConfig = computed(() => {
    const s = this.ds.settings();
    return s?.recentPurchasePopup ?? {
      enabled: true,
      interval: 5000,
      displayDuration: 4000,
      maxItems: 20,
      showLocation: true,
      showTime: true,
    };
  });

  isDark = computed(() => this.ds.theme() === 'dark');

  private rotationSub?: Subscription;
  private displayTimer?: ReturnType<typeof setTimeout>;
  private initTimer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Check session dismissal
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') {
        this.isDismissed.set(true);
        return;
      }
    } catch (_) {}

    // Start after 2.5s delay so page has time to settle
    this.initTimer = setTimeout(() => this.init(), 2500);
  }

  private init() {
    const config = this.popupConfig();
    if (!config.enabled) return;

    this.http
      .get<{ success: boolean; data: RecentPurchaseItem[] }>(
        `${environment.apiUrl}/admin/recent-purchases`
      )
      .subscribe({
        next: (res) => {
          if (res?.success && res.data?.length) {
            const max = config.maxItems ?? 20;
            this.items.set(res.data.slice(0, max));
            this.showNext();
            this.startRotation();
          }
        },
        error: () => {
          // Use fallback demo data on network error
          this.items.set(FALLBACK_ITEMS);
          this.showNext();
          this.startRotation();
        },
      });
  }

  private showNext() {
    if (this.isDismissed()) return;
    const config = this.popupConfig();
    const displayDuration = config.displayDuration ?? 4000;

    // Show popup
    this.isAnimatingOut.set(false);
    this.isVisible.set(true);

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
    const intervalMs = config.interval ?? 5000;

    this.rotationSub = interval(intervalMs).subscribe(() => {
      if (this.isDismissed()) return;
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
    clearTimeout(this.displayTimer);
    clearTimeout(this.initTimer);
  }
}

// Fallback inline demo data (used if API fails and no network)
const FALLBACK_ITEMS: RecentPurchaseItem[] = [
  { id: 'f1', customerName: 'T*** S', city: 'Gaya', state: 'Bihar', country: 'India', productName: 'PLA Pro Filament 1.75mm', productImage: 'https://picsum.photos/seed/pla/80/80', productSlug: 'pla-pro-filament-175mm', minutesAgo: 24 },
  { id: 'f2', customerName: 'R*** K', city: 'Mumbai', state: 'Maharashtra', country: 'India', productName: 'Bambu Lab A1 Mini', productImage: 'https://picsum.photos/seed/bambu/80/80', productSlug: 'bambu-lab-a1-mini', minutesAgo: 8 },
  { id: 'f3', customerName: 'A*** M', city: 'Chennai', state: 'Tamil Nadu', country: 'India', productName: 'Elegoo Mars 4 Ultra', productImage: 'https://picsum.photos/seed/elegoo/80/80', productSlug: 'elegoo-mars-4-ultra', minutesAgo: 41 },
];
