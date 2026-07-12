import {Component, ChangeDetectionStrategy, inject, signal, computed, effect, OnInit} from '@angular/core';
import {CommonModule, DOCUMENT} from '@angular/common';
import {RouterModule, ActivatedRoute, Router} from '@angular/router';
import {Title, Meta} from '@angular/platform-browser';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService, Product, Category} from '../../services/datastore';
import {ApiService} from '../../services/api.service';
import {LoadingService} from '../../core/services/loading.service';
import {SkeletonProductCardComponent} from '../../shared/components/skeleton/skeleton-product-card/skeleton-product-card.component';
import {SkeletonLoaderComponent} from '../../shared/components/skeleton/skeleton-loader/skeleton-loader.component';
import {Subject} from 'rxjs';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';

@Component({
  selector: 'app-products',
  imports: [CommonModule, RouterModule, MatIconModule, SkeletonProductCardComponent, SkeletonLoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.html',
  styleUrl: './products.scss'
})
export class Products implements OnInit {
  ds = inject(DatastoreService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  api = inject(ApiService);
  loadingService = inject(LoadingService);
  titleService = inject(Title);
  metaService = inject(Meta);
  document = inject(DOCUMENT);

  // API State Signals
  productsList = signal<any[]>([]);
  totalProducts = signal<number>(0);
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  itemsPerPage = signal<number>(24);
  isLoading = signal<boolean>(true);

  // Available filters from API response
  availableFilters = signal<any>({
    categories: [],
    brands: [],
    colors: [],
    materials: [],
    ratings: [],
    stock: [],
    featured: [],
    technologies: [],
    printerTypes: [],
    compatibilities: []
  });

  // Local UI State
  expandedGroups = signal<Set<string>>(new Set(['category', 'brand', 'price', 'rating', 'availability']));
  showMobileFilters = signal<boolean>(false);
  isListView = signal<boolean>(false);

  // Search filter inputs inside the sidebar (for local filtering of long lists)
  brandSearchTerm = signal<string>('');
  categorySearchTerm = signal<string>('');
  materialSearchTerm = signal<string>('');
  compatSearchTerm = signal<string>('');

  // Active query parameters (mirrored for convenience)
  activeSearch = signal<string>('');
  activeCategory = signal<string>('');
  activeSubcategory = signal<string>('');
  activeBrand = signal<string>('');
  activePriceMin = signal<string>('');
  activePriceMax = signal<string>('');
  activeRating = signal<string>('');
  activeStock = signal<string>('');
  activeFeatured = signal<string>('');
  activeColor = signal<string>('');
  activeMaterial = signal<string>('');
  activeTechnology = signal<string>('');
  activePrinterType = signal<string>('');
  activeCompatibility = signal<string>('');
  activeSort = signal<string>('popularity');

  // Debounced search subject
  private searchSubject = new Subject<string>();

  ngOnInit() {
    // Listen to query parameters to trigger API fetch
    this.route.queryParams.subscribe(params => {
      this.syncParamsToSignals(params);
      this.fetchFilteredProducts();
    });

    // Handle path parameters for categorySlug and brandSlug
    this.route.params.subscribe(params => {
      if (params['categorySlug']) {
        const cat = this.ds.categories().find(c => c.slug === params['categorySlug']);
        if (cat) {
          this.updateUrlQueryParam('category', cat.id);
          this.setSeoTags(cat.name, `Shop premium ${cat.name} at India's lowest prices. Explore authorized FDM printers, high-grade filaments, and spare parts. Fast shipping & expert support!`, `category/${cat.slug}`);
        }
      } else if (params['brandSlug']) {
        const b = this.ds.brands().find(br => br.slug === params['brandSlug']);
        if (b) {
          this.updateUrlQueryParam('brand', b.name);
          this.setSeoTags(`Buy Original ${b.name} Products Online | 3D Galaxy India`, `Get authorized ${b.name} 3D printers, parts & accessories at the best rates in India. 100% genuine products with manufacturer warranty & fast delivery.`, `brand/${b.slug}`);
        }
      } else {
        this.setSeoTags('Buy 3D Printers, Filaments & Spare Parts Online | 3D Galaxy', 'Browse India\'s largest catalog of industrial 3D printers, SLA/FDM materials, filaments, and precision spare parts. OEM warranty & bulk dealer discounts available.', 'products');
      }
    });

    // Set up debounced search inside page input
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.updateUrlQueryParam('search', term);
    });
  }

  setSeoTags(title: string, desc: string, path: string) {
    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: desc });
    this.metaService.updateTag({ property: 'og:title', content: title });
    
    let link: HTMLLinkElement | null = this.document.querySelector("link[rel='canonical']");
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', `https://3dgalaxy.com/${path}`);
  }

  syncParamsToSignals(params: any) {
    this.currentPage.set(params['page'] ? parseInt(params['page'], 10) : 1);
    this.itemsPerPage.set(params['limit'] ? parseInt(params['limit'], 10) : 24);

    this.activeSearch.set(params['search'] || '');
    this.activeCategory.set(params['category'] || '');
    this.activeSubcategory.set(params['subcategory'] || '');
    this.activeBrand.set(params['brand'] || '');
    this.activeRating.set(params['rating'] || '');
    this.activeStock.set(params['stock'] || '');
    this.activeFeatured.set(params['featured'] || '');
    this.activeColor.set(params['color'] || '');
    this.activeMaterial.set(params['material'] || '');
    this.activeTechnology.set(params['technology'] || '');
    this.activePrinterType.set(params['printerType'] || '');
    this.activeCompatibility.set(params['compatibility'] || '');
    this.activeSort.set(params['sort'] || 'popularity');

    // Parse price range from 'price=min-max'
    if (params['price']) {
      const parts = params['price'].split('-');
      this.activePriceMin.set(parts[0] || '');
      this.activePriceMax.set(parts[1] || '');
    } else {
      this.activePriceMin.set('');
      this.activePriceMax.set('');
    }
  }

  fetchFilteredProducts() {
    this.isLoading.set(true);

    const queryParams: any = {
      page: this.currentPage().toString(),
      limit: this.itemsPerPage().toString(),
      sort: this.activeSort()
    };

    if (this.activeSearch()) queryParams.search = this.activeSearch();
    if (this.activeCategory()) queryParams.category = this.activeCategory();
    if (this.activeSubcategory()) queryParams.subcategory = this.activeSubcategory();
    if (this.activeBrand()) queryParams.brand = this.activeBrand();
    if (this.activePriceMin()) queryParams.priceMin = this.activePriceMin();
    if (this.activePriceMax()) queryParams.priceMax = this.activePriceMax();
    if (this.activeRating()) queryParams.rating = this.activeRating();
    if (this.activeStock()) queryParams.stock = this.activeStock();
    if (this.activeFeatured()) queryParams.featured = this.activeFeatured();
    if (this.activeColor()) queryParams.color = this.activeColor();
    if (this.activeMaterial()) queryParams.material = this.activeMaterial();
    if (this.activeTechnology()) queryParams.technology = this.activeTechnology();
    if (this.activePrinterType()) queryParams.printerType = this.activePrinterType();
    if (this.activeCompatibility()) queryParams.compatibility = this.activeCompatibility();

    this.api.get<any>('/products', queryParams).subscribe({
      next: (res: any) => {
        const products = res?.products || [];
        this.productsList.set(products);
        this.totalProducts.set(res?.total || 0);
        this.totalPages.set(res?.totalPages || 1);
        if (res?.availableFilters) {
          this.availableFilters.set(res.availableFilters);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load products:', err);
        this.productsList.set([]);
        this.totalProducts.set(0);
        this.totalPages.set(1);
        this.isLoading.set(false);
      }
    });
  }

  // URL Manipulation Helpers
  updateUrlQueryParam(key: string, value: string | null) {
    const currentParams = { ...this.route.snapshot.queryParams };
    if (value) {
      currentParams[key] = value;
    } else {
      delete currentParams[key];
    }
    if (key !== 'page') {
      currentParams['page'] = '1';
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: currentParams,
      queryParamsHandling: 'merge'
    });
  }

  toggleFilter(key: string, value: string) {
    const currentParams = { ...this.route.snapshot.queryParams };
    let values = currentParams[key] ? currentParams[key].split(',') : [];

    if (values.includes(value)) {
      values = values.filter((v: string) => v !== value);
    } else {
      values.push(value);
    }

    if (values.length > 0) {
      currentParams[key] = values.join(',');
    } else {
      delete currentParams[key];
    }
    
    currentParams['page'] = '1';

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: currentParams,
      queryParamsHandling: 'merge'
    });
  }

  isFilterActive(key: string, value: string): boolean {
    const param = this.route.snapshot.queryParams[key];
    if (!param) return false;
    return param.split(',').includes(value);
  }

  setPriceRange(min: string, max: string) {
    const currentParams = { ...this.route.snapshot.queryParams };
    if (min || max) {
      currentParams['price'] = `${min}-${max}`;
    } else {
      delete currentParams['price'];
    }
    currentParams['page'] = '1';

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: currentParams,
      queryParamsHandling: 'merge'
    });
  }

  clearPriceRange() {
    this.updateUrlQueryParam('price', null);
  }

  clearAllFilters() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  removeSingleFilter(key: string, value: string) {
    if (key === 'price') {
      this.clearPriceRange();
      return;
    }
    if (key === 'search' || key === 'rating' || key === 'category' || key === 'subcategory') {
      this.updateUrlQueryParam(key, null);
      return;
    }
    this.toggleFilter(key, value);
  }

  // Collapsible Accordion Groups
  toggleGroup(groupId: string) {
    this.expandedGroups.update(set => {
      const newSet = new Set(set);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }

  isGroupExpanded(groupId: string): boolean {
    return this.expandedGroups().has(groupId);
  }

  // Local list search helper
  filterListOptions(list: any[], searchTerm: string, labelKey = 'name'): any[] {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase().trim();
    return list.filter(item => {
      const label = (item[labelKey] || item || '').toString().toLowerCase();
      return label.includes(term);
    });
  }

  // Local Search Input events (Debounced)
  onSearchInput(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.searchSubject.next(term);
  }

  // Helper methods for templates (avoiding arrow functions in bindings)
  getParentCategories(): any[] {
    return this.availableFilters().categories.filter((c: any) => !c.parentId);
  }

  getChildCategories(parentId: string): any[] {
    return this.availableFilters().categories.filter((c: any) => c.parentId === parentId);
  }

  getRatingOptions(): any[] {
    return this.availableFilters().ratings.filter((r: any) => r.rating < 5).reverse();
  }

  floorValue(val: number): number {
    return Math.floor(val);
  }

  getStarsArray(count: number): number[] {
    return Array(count).fill(0);
  }

  // Helper for dealer price calculations
  isDealerPriceActive = computed(() => {
    const r = this.ds.userRole();
    return r === 'admin' || r === 'super-admin' || (this.ds.activeUser()?.rewardPoints || 0) > 300;
  });

  activePrice(p: any): number {
    return this.isDealerPriceActive() ? (p.dealerPrice || p.activePrice) : (p.salePrice || p.activePrice);
  }

  getMrp(p: any): number {
    return p.basePrice;
  }

  mrpDiscountPercent(p: any): number {
    const sale = this.activePrice(p);
    const mrp = this.getMrp(p) || 1;
    return Math.round(((mrp - sale) / mrp) * 100);
  }

  addToCart(p: any) {
    this.ds.addToCart(p, 1);
  }

  getCategoryIcon(catId: string): string {
    const icons: Record<string, string> = {
      '3d-printers': 'precision_manufacturing',
      'materials': 'grain',
      '3d-pens': 'gesture',
      'scanners': 'document_scanner',
      'laser-engravers': 'grain',
      'stem-kits': 'school',
      'spare-parts': 'build',
      'brahma-farm': 'hub',
      'fdm': 'layers',
      'fdm-multicolor': 'palette',
      'resin': 'opacity',
      'diy': 'hardware',
      'semi-assembled': 'construction',
      'assembled': 'check_circle'
    };
    return icons[catId] || 'category';
  }

  // Active filter display labels mapping
  getActiveFilterChips(): { key: string; value: string; display: string }[] {
    const chips: { key: string; value: string; display: string }[] = [];
    const params = this.route.snapshot.queryParams;

    if (params['search']) {
      chips.push({ key: 'search', value: params['search'], display: `Search: "${params['search']}"` });
    }
    if (params['category']) {
      params['category'].split(',').forEach((val: string) => {
        const cat = this.ds.categories().find(c => c.id === val || c.slug === val);
        chips.push({ key: 'category', value: val, display: `Category: ${cat ? cat.name : val}` });
      });
    }
    if (params['subcategory']) {
      params['subcategory'].split(',').forEach((val: string) => {
        const sub = this.ds.categories().find(c => c.id === val || c.slug === val);
        chips.push({ key: 'subcategory', value: val, display: `Subcategory: ${sub ? sub.name : val}` });
      });
    }
    if (params['brand']) {
      params['brand'].split(',').forEach((val: string) => {
        chips.push({ key: 'brand', value: val, display: `Brand: ${val}` });
      });
    }
    if (params['price']) {
      chips.push({ key: 'price', value: params['price'], display: `Price: ₹${params['price'].replace('-', ' - ₹')}` });
    }
    if (params['rating']) {
      chips.push({ key: 'rating', value: params['rating'], display: `${params['rating']}★ & Up` });
    }
    if (params['stock']) {
      params['stock'].split(',').forEach((val: string) => {
        const displayMap: Record<string, string> = {
          'IN_STOCK': 'In Stock',
          'OUT_OF_STOCK': 'Out of Stock',
          'PRE_ORDER': 'Pre Order',
          'COMING_SOON': 'Coming Soon'
        };
        chips.push({ key: 'stock', value: val, display: displayMap[val] || val });
      });
    }
    if (params['featured']) {
      params['featured'].split(',').forEach((val: string) => {
        chips.push({ key: 'featured', value: val, display: val.replace('_', ' ') });
      });
    }
    if (params['color']) {
      params['color'].split(',').forEach((val: string) => {
        chips.push({ key: 'color', value: val, display: `Color: ${val}` });
      });
    }
    if (params['material']) {
      params['material'].split(',').forEach((val: string) => {
        chips.push({ key: 'material', value: val, display: `Material: ${val}` });
      });
    }
    if (params['technology']) {
      params['technology'].split(',').forEach((val: string) => {
        chips.push({ key: 'technology', value: val, display: `Tech: ${val}` });
      });
    }
    if (params['printerType']) {
      params['printerType'].split(',').forEach((val: string) => {
        chips.push({ key: 'printerType', value: val, display: `Type: ${val}` });
      });
    }
    if (params['compatibility']) {
      params['compatibility'].split(',').forEach((val: string) => {
        chips.push({ key: 'compatibility', value: val, display: `Fits: ${val}` });
      });
    }

    return chips;
  }
}
