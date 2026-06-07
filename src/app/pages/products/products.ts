import {Component, ChangeDetectionStrategy, inject, signal, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule, ActivatedRoute} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService, Product, Category} from '../../services/datastore';

@Component({
  selector: 'app-products',
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.html',
  styleUrl: './products.scss'
})
export class Products {
  ds = inject(DatastoreService);
  route = inject(ActivatedRoute);

  searchQuery = signal<string>('');
  filterCategory = signal<string>('');
  filterSubcategory = signal<string>('');
  filterBrand = signal<string>('');
  showMobileFilters = signal<boolean>(false);
  sortBy = signal<'popular' | 'latest' | 'price-low' | 'price-high'>('popular');

  rootCategories = computed(() => this.ds.categories().filter(c => c.parent_id === null));

  filteredProducts = computed(() => {
    const term = this.searchQuery().toLowerCase().trim();
    const catId = this.filterCategory();
    const subcatId = this.filterSubcategory();
    const brandName = this.filterBrand().toLowerCase().trim();
    
    let prods = [...this.ds.products()];

    if (catId) {
      const childIds = this.ds.categories().filter(c => c.parent_id === catId).map(c => c.id);
      prods = prods.filter(p => p.category_id === catId || (p.subcategory_id && childIds.includes(p.subcategory_id)));
    }

    if (subcatId) {
      prods = prods.filter(p => p.subcategory_id === subcatId);
    }

    if (brandName) {
      prods = prods.filter(p => p.brand.toLowerCase() === brandName);
    }

    if (term) {
      prods = prods.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.tags.some(t => t.toLowerCase().includes(term))
      );
    }

    // Sorting
    switch (this.sortBy()) {
      case 'latest':
        prods.reverse();
        break;
      case 'price-low':
        prods.sort((a, b) => this.activePrice(a) - this.activePrice(b));
        break;
      case 'price-high':
        prods.sort((a, b) => this.activePrice(b) - this.activePrice(a));
        break;
    }

    return prods;
  });

  isDealerPriceActive = computed(() => {
    const r = this.ds.userRole();
    return r === 'admin' || r === 'super-admin' || (this.ds.activeUser()?.rewardPoints || 0) > 300;
  });

  activePrice(p: Product): number {
    return this.isDealerPriceActive() ? p.dealer_price : p.sale_price;
  }

  mrpDiscountPercent(p: Product): number {
    const sale = this.activePrice(p);
    return Math.round(((p.mrp - sale) / p.mrp) * 100);
  }

  // Tree Structure Helpers
  isSubBy = (parentId: string | null) => (c: Category) => {
    if (parentId === '') return c.parent_id === null;
    return c.parent_id === parentId;
  };

  expandedCategoryIds = signal<Set<string>>(new Set());
  categorySearchTerm = signal<string>('');

  filteredCategories = computed(() => {
    const term = this.categorySearchTerm().toLowerCase().trim();
    if (!term) return this.ds.categories();

    return this.ds.categories().filter(c => 
      c.name.toLowerCase().includes(term) ||
      this.ds.categories().some(sub => sub.parent_id === c.id && sub.name.toLowerCase().includes(term))
    );
  });

  toggleCategoryExpand(id: string, event: Event) {
    event.stopPropagation();
    this.expandedCategoryIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  isCategoryExpanded(id: string): boolean {
    return this.expandedCategoryIds().has(id);
  }

  getIcon(catId: string): string {
    const icons: Record<string, string> = {
      '3d-printers': 'precision_manufacturing',
      'fdm-printers': 'layers',
      'resin-printers': 'opacity',
      'filaments': 'grain',
      'pla-filaments': 'eco',
      'abs-filaments': 'science',
      'resins': 'water_drop',
      'scanners': 'scanner',
      '3d-scanners': 'document_scanner',
      'spare-parts': 'settings',
      'cat-1': 'precision_manufacturing',
      'cat-2': 'grain',
      'cat-3': 'science',
      'cat-4': 'settings'
    };
    return icons[catId] || 'category';
  }

  constructor() {
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        const catId = params['category'];
        this.filterCategory.set(catId);
        this.expandedCategoryIds.update(set => new Set(set).add(catId));
      }
      if (params['subcategory']) {
        const subcatId = params['subcategory'];
        this.filterSubcategory.set(subcatId);
        const sub = this.ds.categories().find(c => c.id === subcatId);
        if (sub?.parent_id) {
          this.expandedCategoryIds.update(set => new Set(set).add(sub.parent_id!));
        }
      }
      if (params['brand']) this.filterBrand.set(params['brand']);
    });
  }

  getProductRating(p: Product): number {
    if (!p.reviews || p.reviews.length === 0) return 4.9;
    const sum = p.reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / p.reviews.length) * 10) / 10;
  }

  addToCart(p: Product) {
    this.ds.addToCart(p, 1);
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  setCategory(catSlug: string) {
    this.filterCategory.set(this.filterCategory() === catSlug ? '' : catSlug);
  }

  setSort(sort: 'popular' | 'latest' | 'price-low' | 'price-high') {
    this.sortBy.set(sort);
  }
}
