import {ChangeDetectionStrategy, Component, inject, computed, signal} from '@angular/core';
import {RouterOutlet, RouterModule, Router} from '@angular/router';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService, Advertisement} from '../services/datastore';
import {LoadingService} from '../core/services/loading.service';
import {SkeletonMenuComponent} from '../shared/components/skeleton/skeleton-menu/skeleton-menu.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, CommonModule, MatIconModule, SkeletonMenuComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  public ds = inject(DatastoreService);
  public router = inject(Router);
  public loadingService = inject(LoadingService);

  loading = computed(() => {
    if (this.loadingService.isLoading()) return true;
    if (this.ds.categoriesLoading()) return true;
    return false;
  });

  isHome = signal(true);

  constructor() {
    // Keep isHome updated with active path
    this.router.events.subscribe(() => {
      const urlPath = this.router.url.split('?')[0];
      this.isHome.set(urlPath === '/' || urlPath === '/home');
    });
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

  searchQuery = signal('');
  isSearchFocused = signal(false);

  // Mobile UI triggers
  isMobileMenuOpen = signal(false);
  isMobileSearchOpen = signal(false);
  isRoleDropdownOpen = signal<boolean>(false);
  isBellOpen = signal<boolean>(false);

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

  getSubcategories(parentId: string) {
    return this.ds.categories().filter(c => c.parent_id === parentId || c.parentId === parentId);
  }

  getMenuItemChildren(parentId: string) {
    return this.ds.menuItems().filter(m => m.parentId === parentId);
  }

  onSearch(q: string) {
    this.searchQuery.set(q);
    // Real implementation would route to products with search param
  }

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
      alert('ADMIN ACCESS LOGGED: Standard dealer discount structures + FDM slicing queue unlocked.');
    } else if (role === 'customer') {
      alert('CUSTOMER ACCESS LOGGED: Sumit Sharma profile loaded with active loyalty points balance.');
    } else {
      alert('GUEST MODE LOCKED: Placed orders will run through direct phone notifications tracking.');
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
    alert('Notice: Top campaign alert hidden. You can find promo coupons inside checkout cart logs!');
  }
}
