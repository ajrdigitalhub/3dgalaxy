import { HttpClient } from '@angular/common/http';
import {ChangeDetectionStrategy, Component, inject, computed, signal, ElementRef, PLATFORM_ID, DestroyRef, NgZone} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {RouterOutlet, RouterModule, Router, NavigationEnd} from '@angular/router';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import { DatastoreService, Advertisement } from '../services/datastore';
import { LoadingService } from '../core/services/loading.service';
import { SkeletonMenuComponent } from '../shared/components/skeleton/skeleton-menu/skeleton-menu.component';
import { ToastContainerComponent } from '../shared/components/toast/toast.component';
import { ToastService } from '../shared/components/toast/toast.service';
import { SessionService } from '../core/services/session.service';
import { ScrollRestorationService } from '../core/services/scroll-restoration.service';
import { ThemeService } from '../core/services/theme.service';
import { RecentPurchasePopupComponent } from '../shared/components/recent-purchase-popup/recent-purchase-popup';
import { NotificationBellComponent } from '../shared/components/notification-bell/notification-bell';
import { NotificationPopupComponent } from '../shared/components/notification-popup/notification-popup';
import { fromEvent } from 'rxjs';
import { throttleTime, filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    RouterOutlet, 
    RouterModule, 
    CommonModule, 
    MatIconModule, 
    SkeletonMenuComponent, 
    ToastContainerComponent, 
    RecentPurchasePopupComponent,
    NotificationBellComponent,
    NotificationPopupComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  toastService = inject(ToastService);
  public ds = inject(DatastoreService);
  public sessionService = inject(SessionService);
  public themeService = inject(ThemeService);
  public router = inject(Router);
  public currentUrl = signal(this.router.url);
  public loadingService = inject(LoadingService);
  private scrollRestoration = inject(ScrollRestorationService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  private ngZone = inject(NgZone);

  isScrolled = signal(false);

  loading = computed(() => {
    if (this.loadingService.isLoading()) return true;
    if (this.ds.categoriesLoading()) return true;
    return false;
  });

  isHome = signal(true);

  constructor() {
    this.scrollRestoration.init();

    // Keep isHome updated with active path
    this.router.events.subscribe((val) => {
      if (val instanceof NavigationEnd) {
        this.currentUrl.set(val.url);
        // Auto close dropdowns on navigation
        this.isRoleDropdownOpen.set(false);
        this.isBellOpen.set(false);
        this.isSearchFocused.set(false);
        this.isMobileSearchOpen.set(false);
        this.isMobileMenuOpen.set(false);
      }
      const urlPath = this.router.url.split('?')[0];
      this.isHome.set(urlPath === '/' || urlPath === '/home');
    });

    // Throttled scroll listener - only fires at most every 100ms instead of on every scroll event
    if (isPlatformBrowser(this.platformId)) {
      this.ngZone.runOutsideAngular(() => {
        fromEvent(window, 'scroll', { passive: true }).pipe(
          throttleTime(100, undefined, { leading: true, trailing: true }),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
          const scrolled = window.scrollY > 40;
          if (this.isScrolled() !== scrolled) {
            this.isScrolled.set(scrolled);
          }
        });

        // Optimized document click - only processes when a dropdown is actually open
        fromEvent<Event>(document, 'click').pipe(
          filter(() => this.isRoleDropdownOpen() || this.isBellOpen() || this.isSearchFocused() || this.isMobileMenuOpen()),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe((event) => {
          const target = event.target as HTMLElement;
          if (this.isRoleDropdownOpen() && !target.closest('.role-dropdown-container')) {
            this.isRoleDropdownOpen.set(false);
          }
          if (this.isBellOpen() && !target.closest('.bell-dropdown-container')) {
            this.isBellOpen.set(false);
          }
          if (this.isSearchFocused() && !target.closest('.search-container')) {
            this.isSearchFocused.set(false);
          }
          if (this.isMobileMenuOpen() && !target.closest('.mobile-menu-drawer') && !target.closest('.mobile-menu-trigger')) {
            this.isMobileMenuOpen.set(false);
          }
        });

        // Escape key handler
        fromEvent<KeyboardEvent>(document, 'keydown').pipe(
          filter(e => e.key === 'Escape'),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
          this.isRoleDropdownOpen.set(false);
          this.isBellOpen.set(false);
          this.isSearchFocused.set(false);
          this.isMobileSearchOpen.set(false);
          this.isMobileMenuOpen.set(false);
        });
      });
    }
  }

  // Categories Hierarchy for Nav
  rootCategories = computed(() => this.ds.categories().filter(c => !c.parent_id));
  
  categoryIconMap: Record<string, string> = {
    'cat-1': 'precision_manufacturing', // 3D Printers
    'cat-2': 'vibration', // Filaments/Materials
    'cat-3': 'format_color_fill', // Resins
    'cat-4': 'extension', // Spare Parts
    '3d-pens': 'edit',
    '3d-scanners': 'document_scanner',
    'laser-engravers': 'flare',
    'stem-kits': 'school'
  };

  private http = inject(HttpClient);

  searchQuery = signal('');
  isSearchFocused = signal(false);
  suggestions = signal<any>({ products: [], categories: [], brands: [], services: [] });
  isSearching = signal(false);
  recentSearches = signal<string[]>([]);
  popularSearches = signal<string[]>(['Bambu Lab A1', 'PETG Filament', 'Resin 3D Printer', 'Nozzle 0.4mm']);
  
  selectedIndex = signal(-1);

  private searchTimeout: any;

  onSearchFocus() {
    this.isSearchFocused.set(true);
    this.selectedIndex.set(-1);
    if (!this.recentSearches().length) {
       this.fetchRecentSearches();
    }
  }

  handleSearchKeydown(event: KeyboardEvent) {
      if (!this.isSearchFocused()) return;
      const suggs = this.suggestions();
      const itemsLength = suggs.products.length + suggs.categories.length + suggs.brands.length + suggs.services.length;

      if (event.key === 'ArrowDown') {
          event.preventDefault();
          this.selectedIndex.update(i => (i + 1 >= itemsLength ? 0 : i + 1));
      } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          this.selectedIndex.update(i => (i <= 0 ? itemsLength - 1 : i - 1));
      } else if (event.key === 'Enter') {
          event.preventDefault();
          if (this.selectedIndex() >= 0 && itemsLength > 0) {
              const allItems = [...suggs.products, ...suggs.categories, ...suggs.brands, ...suggs.services];
              const selectedItem = allItems[this.selectedIndex()];
              if (selectedItem) {
                  this.router.navigateByUrl(selectedItem.url);
                  this.isSearchFocused.set(false);
                  this.isMobileSearchOpen.set(false);
                  return;
              }
          }
          this.submitSearch(); // Fallback if nothing selected or empty index
      } else if (event.key === 'Escape') {
          this.isSearchFocused.set(false);
          this.isMobileSearchOpen.set(false);
      }
  }

  fetchRecentSearches() {
    this.http.get<any>('/api/search/recent').subscribe(res => {
        if (res.success) this.recentSearches.set(res.data);
    });
  }

  onSearch(q: string) {
    this.searchQuery.set(q);
    if (q.length < 2) {
       this.suggestions.set({ products: [], categories: [], brands: [], services: [] });
       return;
    }
    
    this.isSearching.set(true);
    clearTimeout(this.searchTimeout);
    
    this.searchTimeout = setTimeout(() => {
       this.http.get<any>(`/api/search/suggestions?q=${encodeURIComponent(q)}`).subscribe({
         next: res => {
             if (res.success) {
                if (res.data.products) res.data.products.forEach((p: any) => p.url = `/product/${p.slug}`);
                if (res.data.categories) res.data.categories.forEach((c: any) => c.url = `/category/${c.slug}`);
                if (res.data.brands) res.data.brands.forEach((b: any) => b.url = `/brand/${b.slug}`);
                this.suggestions.set(res.data);
             }
             this.isSearching.set(false);
         },
         error: () => this.isSearching.set(false)
       });
    }, 300);
  }
  
  submitSearch(q?: string) {
    const query = q || this.searchQuery();
    if (query) {
      this.isSearchFocused.set(false);
      this.isMobileSearchOpen.set(false);
      this.router.navigate(['/search'], { queryParams: { q: query }});
    }
  }
  isAuthRoute = computed(() => {
    return ['/login', '/register', '/forgot-password', '/reset-password'].some(r => this.currentUrl().includes(r));
  });

  isAdminRoute = computed(() => {
    return this.currentUrl().split('?')[0].startsWith('/admin');
  });

  isMobileMenuOpen = signal(false);
  isMobileSearchOpen = signal(false);
  isRoleDropdownOpen = signal<boolean>(false);
  isBellOpen = signal<boolean>(false);

  private eRef = inject(ElementRef);

  // Compute Active Advertisements
  topAd = computed(() => {
    return this.ds.advertisements().find(a => a.position === 'top-banner');
  });

  footerAd = computed(() => {
    return this.ds.advertisements().find(a => a.position === 'footer');
  });

  cartCount = computed(() => {
    return this.ds.cart().reduce((sum, item) => sum + item.quantity, 0);
  });

  getIcon(catId: string): string {
    const icons: Record<string, string> = {
      'cat-1': 'precision_manufacturing',
      'cat-2': 'grain',
      'cat-3': 'science',
      'cat-4': 'settings'
    };
    return icons[catId] || 'category';
  }

  // Pre-computed maps aliased from DatastoreService
  subcategoriesMap = this.ds.subcategoriesMap;
  productCountMap = this.ds.productCountMap;

  // Pre-computed branding animation class (only recomputes when footer data changes)
  brandingAnimationClass = computed(() => {
    const footerData = this.ds.footerData();
    const type = footerData?.copyright?.animationType;
    const glow = footerData?.copyright?.glowEffect;
    let classes = '';
    const animType = type || 'Glow';
    if (animType === 'Glow') {
      classes += 'animate-pulse drop-shadow-[0_0_10px_rgba(168,85,247,0.6)] ';
    } else if (animType === 'Pulse') {
      classes += 'animate-pulse ';
    } else if (animType === 'Shimmer') {
      classes += 'animate-bounce ';
    } else if (animType === 'Gradient Wave') {
      classes += 'bg-linear-to-r from-emerald-500 via-sky-500 to-indigo-500 animate-[textGradientFlow_3s_linear_infinite] ';
    } else {
      classes += 'animate-[textGradientFlow_4s_linear_infinite] ';
    }
    if (glow && animType !== 'Glow') {
      classes += 'drop-shadow-[0_0_6px_rgba(59,130,246,0.5)] ';
    }
    return classes;
  });

  // Pre-computed mobile footer links (only recomputes when footer data changes)
  mobileFooterLinks = computed(() => {
    const links = this.ds.footerData()?.mobile?.mobileFooterLinks;
    if (!links) return [];
    return links.split(',').filter((s: string) => s && s.includes('|'));
  });

  toggleTheme() {
    this.ds.theme.update(t => t === 'dark' ? 'light' : 'dark');
  }

  toggleRoleDropdown() {
    if (!this.ds.currentUser()) {
      this.router.navigate(['/login']);
      return;
    }
    this.isRoleDropdownOpen.update(v => !v);
    this.isBellOpen.set(false);
  }

  toggleBell() {
    this.isBellOpen.update(v => !v);
    this.isRoleDropdownOpen.set(false);
  }

  selectRole(role: 'admin' | 'customer' | 'guest') {
    this.ds.userRole.set(role);
    this.isRoleDropdownOpen.set(false);
    
    // Notify corresponding mock alerts
    if (role === 'admin') {
      this.toastService.info('ADMIN ACCESS LOGGED: Standard dealer discount structures + FDM slicing queue unlocked.');
    } else if (role === 'customer') {
      this.toastService.info('CUSTOMER ACCESS LOGGED: Sumit Sharma profile loaded with active loyalty points balance.');
    } else {
      this.toastService.info('GUEST MODE LOCKED: Placed orders will run through direct phone notifications tracking.');
    }
  }

  clickAd(ad: Advertisement) {
    this.ds.recordAdClick(ad.id);
    if (typeof window !== 'undefined' && ad.targetUrl) {
      window.open(ad.targetUrl, '_blank');
    }
  }

  dismissBannerAd() {
    // Fictional dismiss to keep page pristine
    this.toastService.warning('Notice: Top campaign alert hidden. You can find promo coupons inside checkout cart logs!');
  }



  subscribeNewsletter(email: string) {
    if (!email || !email.includes('@')) {
      this.toastService.error('Please enter a valid email address.');
      return;
    }
    this.http.post('/api/auth/newsletter/subscribe', { email }).subscribe({
      next: () => {
        this.toastService.success('Thank you for subscribing to our newsletter!');
      },
      error: () => {
        // Fallback to local success if already subscribed or similar
        this.toastService.success('Thank you for subscribing!');
      }
    });
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img.getAttribute('data-error-handled')) return;
    img.setAttribute('data-error-handled', 'true');
    const isDark = document.documentElement.classList.contains('dark');
    const placeholder = this.ds.settings()?.defaultPlaceholderUrl || 'https://picsum.photos/seed/placeholder/400/400';
    
    const isLogo = img.classList.contains('logo-img') || img.alt.toLowerCase().includes('logo') || img.src.toLowerCase().includes('logo') || img.src.toLowerCase().includes('brand');
    if (isLogo) {
      if (isDark) {
        img.src = this.ds.settings()?.darkModeLogoUrl || this.ds.settings()?.logoUrl || placeholder;
      } else {
        img.src = this.ds.settings()?.logoUrl || this.ds.settings()?.headerLogoUrl || placeholder;
      }
    } else {
      img.src = placeholder;
    }
  }
}
