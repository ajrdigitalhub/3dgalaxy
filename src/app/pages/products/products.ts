import {Component, ChangeDetectionStrategy, inject, signal, computed} from '@angular/core';
import {CommonModule, DOCUMENT} from '@angular/common';
import {RouterModule, ActivatedRoute} from '@angular/router';
import {Title, Meta} from '@angular/platform-browser';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService, Product, Category} from '../../services/datastore';
import {LoadingService} from '../../core/services/loading.service';
import {SkeletonProductCardComponent} from '../../shared/components/skeleton/skeleton-product-card/skeleton-product-card.component';
import {SkeletonLoaderComponent} from '../../shared/components/skeleton/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-products',
  imports: [CommonModule, RouterModule, MatIconModule, SkeletonProductCardComponent, SkeletonLoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.html',
  styleUrl: './products.scss'
})
export class Products {
  ds = inject(DatastoreService);
  route = inject(ActivatedRoute);
  loadingService = inject(LoadingService);

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

  getCategoryName(id: string): string {
    const cat = this.ds.categories().find(c => c.id === id);
    return cat ? cat.name : '';
  }

  titleService = inject(Title);
  metaService = inject(Meta);
  document = inject(DOCUMENT);

  constructor() {
    this.route.params.subscribe(params => {
       if (params['categorySlug']) {
          // Find category id from slug
          const cat = this.ds.categories().find(c => c.slug === params['categorySlug']);
          if (cat) {
             this.filterCategory.set(cat.id);
             this.expandedCategoryIds.update(set => new Set(set).add(cat.id));
             
             // Update SEO
             this.titleService.setTitle(`${cat.name} | 3D Galaxy`);
             this.metaService.updateTag({ name: 'description', content: `Browse our collection of ${cat.name}. High quality 3D printing supplies.` });
             this.metaService.updateTag({ property: 'og:title', content: `${cat.name} | 3D Galaxy` });
             
             let link: HTMLLinkElement | null = this.document.querySelector("link[rel='canonical']");
             if (!link) {
                 link = this.document.createElement('link');
                 link.setAttribute('rel', 'canonical');
                 this.document.head.appendChild(link);
             }
             link.setAttribute('href', `https://3dgalaxy.com/category/${cat.slug}`);
          }
       } else if (params['brandSlug']) {
          const b = this.ds.brands().find(br => br.slug === params['brandSlug']);
          if (b) {
             this.filterBrand.set(b.name);
             
             // Update SEO
             this.titleService.setTitle(`Buy ${b.name} | 3D Galaxy`);
             this.metaService.updateTag({ name: 'description', content: `Shop original ${b.name} printers and filaments.` });
             this.metaService.updateTag({ property: 'og:title', content: `Buy ${b.name} | 3D Galaxy` });
             
             let link: HTMLLinkElement | null = this.document.querySelector("link[rel='canonical']");
             if (!link) {
                 link = this.document.createElement('link');
                 link.setAttribute('rel', 'canonical');
                 this.document.head.appendChild(link);
             }
             link.setAttribute('href', `https://3dgalaxy.com/brand/${b.slug}`);
          }
       } else {
             // Reset SEO
             this.titleService.setTitle(`All Products | 3D Galaxy`);
             this.metaService.updateTag({ name: 'description', content: `Browse all high quality 3D printing supplies.` });
             let link: HTMLLinkElement | null = this.document.querySelector("link[rel='canonical']");
             if (!link) {
                 link = this.document.createElement('link');
                 link.setAttribute('rel', 'canonical');
                 this.document.head.appendChild(link);
             }
             link.setAttribute('href', `https://3dgalaxy.com/products`);
       }
    });

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
