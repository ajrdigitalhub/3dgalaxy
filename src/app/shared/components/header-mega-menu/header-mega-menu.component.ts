import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, PLATFORM_ID, DestroyRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  icon?: string;
  description?: string | null;
  productCount: number;
  children: CategoryNode[];
}

export interface BrandNode {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  isFeatured?: boolean;
  productCount: number;
}

export interface ProductPreview {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  basePrice: number;
  salePrice?: number | null;
  rating: number;
  inStock: boolean;
  categoryId?: string;
}

export interface HeaderMenuPayload {
  categories: CategoryNode[];
  brands: BrandNode[];
  featuredCategories: CategoryNode[];
  bestSellers: ProductPreview[];
  config: {
    showProductCount: boolean;
    showBrandCount: boolean;
    showBestSellers: boolean;
    showNewArrivals: boolean;
    hideEmptyCategories: boolean;
    promotionalBanner: {
      title: string;
      subtitle: string;
      ctaText: string;
      link: string;
      image: string;
    };
  };
}

@Component({
  selector: 'app-header-mega-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative group h-full flex items-center select-none font-sans" (mouseleave)="closeMenu()">
      
      <!-- Trigger Button in Navbar -->
      <button 
        type="button"
        (mouseenter)="openMenu()"
        (click)="toggleMenu()"
        class="hover:text-[#d65108] dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl px-3 py-2 transition-all duration-200 flex items-center gap-2 font-extrabold text-[11px] uppercase tracking-wider cursor-pointer border-none bg-transparent text-neutral-800 dark:text-neutral-200 hover:scale-105 active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-[#d65108]">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
        <span>Categories & Brands</span>
        <mat-icon [ngClass]="{'rotate-180': isOpen()}" class="text-xs transition-transform duration-200">expand_more</mat-icon>
      </button>

      <!-- Mega Menu Dropdown Container -->
      <div 
        *ngIf="isOpen()"
        (mouseenter)="openMenu()"
        class="fixed left-1/2 -translate-x-1/2 top-16 sm:top-20 w-[94vw] max-w-6xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-[2rem] transition-all duration-300 z-[100] p-5 sm:p-7 space-y-5 animate-fadeIn max-h-[85vh] overflow-y-auto"
      >
        
        <!-- Header Bar: Tabs + Search Inside Mega Menu -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-900">
          
          <!-- Category / Brand Tabs -->
          <div class="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-2xl">
            <button 
              (click)="activeTab.set('categories')"
              [ngClass]="{'bg-white dark:bg-neutral-800 text-[#d65108] shadow-xs': activeTab() === 'categories'}"
              class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer text-neutral-600 dark:text-neutral-400 flex items-center gap-2"
            >
              <mat-icon class="text-sm">grid_view</mat-icon>
              <span>Categories</span>
              <span *ngIf="menuData()?.categories?.length" class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#d65108]/10 text-[#d65108]">
                {{ menuData()?.categories?.length }}
              </span>
            </button>

            <button 
              (click)="activeTab.set('brands')"
              [ngClass]="{'bg-white dark:bg-neutral-800 text-[#d65108] shadow-xs': activeTab() === 'brands'}"
              class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer text-neutral-600 dark:text-neutral-400 flex items-center gap-2"
            >
              <mat-icon class="text-sm">verified</mat-icon>
              <span>Brands</span>
              <span *ngIf="menuData()?.brands?.length" class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500/10 text-blue-500">
                {{ menuData()?.brands?.length }}
              </span>
            </button>
          </div>

          <!-- Instant Search Bar inside Mega Menu -->
          <div class="relative flex-1 max-w-xs">
            <mat-icon class="absolute left-3.5 top-2.5 text-sm text-neutral-400">search</mat-icon>
            <input 
              type="text" 
              [ngModel]="searchQuery()" 
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Search categories or brands..."
              class="w-full h-9 pl-9 pr-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-[#d65108] transition-colors"
            >
          </div>

        </div>

        <!-- LOADING SKELETON STATE -->
        <div *ngIf="loading()" class="grid grid-cols-12 gap-6 min-h-[22rem] animate-pulse">
          <div class="col-span-4 space-y-3 border-r border-neutral-100 dark:border-neutral-900 pr-3">
            <div *ngFor="let i of [1,2,3,4,5,6]" class="h-10 bg-neutral-100 dark:bg-neutral-900 rounded-xl"></div>
          </div>
          <div class="col-span-5 space-y-3">
            <div class="h-6 bg-neutral-100 dark:bg-neutral-900 rounded-lg w-1/2"></div>
            <div class="grid grid-cols-2 gap-3">
              <div *ngFor="let i of [1,2,3,4]" class="h-20 bg-neutral-100 dark:bg-neutral-900 rounded-xl"></div>
            </div>
          </div>
          <div class="col-span-3 space-y-3">
            <div class="h-32 bg-neutral-100 dark:bg-neutral-900 rounded-2xl"></div>
          </div>
        </div>

        <!-- TAB 1: CATEGORIES VIEW -->
        <div *ngIf="!loading() && activeTab() === 'categories'" class="grid grid-cols-12 gap-5 min-h-[24rem]">
          
          <!-- Left Column: Root Categories List (4 Cols) -->
          <div class="col-span-12 md:col-span-4 space-y-2 max-h-[28rem] overflow-y-auto pr-2 scrollbar-thin border-r border-neutral-100 dark:border-neutral-900">
            <div *ngIf="filteredCategories().length === 0" class="p-6 text-xs text-neutral-400 text-center">
              No categories found.
            </div>
            <div 
              *ngFor="let cat of filteredCategories()"
              (mouseenter)="onCategoryHover(cat)"
              (click)="navigateToCategory(cat.slug); closeMenu()"
              [ngClass]="{'bg-orange-500/10 text-[#d65108] border-orange-500/20 shadow-xs': selectedRootCategory()?.id === cat.id, 'border-transparent': selectedRootCategory()?.id !== cat.id}"
              class="group/item flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all hover:bg-neutral-100 dark:hover:bg-neutral-900/60"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 p-1 shrink-0 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-900 group-hover/item:scale-105 transition-transform duration-200">
                  <img *ngIf="cat.image" [src]="cat.image" [alt]="cat.name" class="w-full h-full object-contain">
                  <mat-icon *ngIf="!cat.image" class="text-xl text-neutral-500 group-hover/item:text-[#d65108] transition-colors">{{ cat.icon || 'category' }}</mat-icon>
                </div>

                <div class="min-w-0">
                  <span class="text-xs sm:text-sm font-black uppercase tracking-tight block truncate group-hover/item:text-[#d65108] transition-colors">
                    {{ cat.name }}
                  </span>
                  <span class="text-[10px] font-bold text-neutral-400 block mt-0.5">
                    {{ cat.productCount }} Products
                  </span>
                </div>
              </div>

              <mat-icon class="text-lg text-neutral-400 group-hover/item:translate-x-1 transition-transform">chevron_right</mat-icon>
            </div>
          </div>

          <!-- Middle Column: Subcategories & Child Grid (5 Cols) -->
          <div class="col-span-12 md:col-span-5 space-y-4 max-h-[28rem] overflow-y-auto pr-2 scrollbar-thin">
            <div *ngIf="selectedRootCategory() as root" class="space-y-4">
              
              <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-900">
                <a [routerLink]="['/category', root.slug]" (click)="closeMenu()" class="text-xs sm:text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-white hover:text-[#d65108] transition-colors flex items-center gap-2">
                  <span>Explore All {{ root.name }}</span>
                  <mat-icon class="text-base">arrow_forward</mat-icon>
                </a>
                <span class="text-[10px] font-extrabold text-[#d65108] bg-[#d65108]/10 px-2.5 py-0.5 rounded-full">
                  {{ root.productCount }} Products
                </span>
              </div>

              <div *ngIf="root.children?.length; else noSubcats" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div *ngFor="let sub of root.children" class="p-3 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-neutral-200/50 dark:border-neutral-850 space-y-2 hover:border-[#d65108]/30 transition-colors">
                  <div class="flex items-center gap-2.5">
                    <div *ngIf="sub.image" class="w-8 h-8 rounded-lg bg-white dark:bg-neutral-900 p-0.5 shrink-0 border border-neutral-200/50 dark:border-neutral-800">
                      <img [src]="sub.image" [alt]="sub.name" class="w-full h-full object-contain">
                    </div>
                    <div class="min-w-0 flex-1">
                      <a [routerLink]="['/category', sub.slug]" (click)="closeMenu()" class="text-xs font-black uppercase text-neutral-900 dark:text-white hover:text-[#d65108] transition-colors block truncate">
                        {{ sub.name }}
                      </a>
                      <span class="text-[9px] font-bold text-neutral-400 block mt-0.5">{{ sub.productCount }} Products</span>
                    </div>
                  </div>

                  <!-- Child Categories List -->
                  <div *ngIf="sub.children?.length" class="space-y-1 pt-1.5 border-t border-neutral-200/30 dark:border-neutral-800/50">
                    <a *ngFor="let child of sub.children.slice(0, 4)" [routerLink]="['/category', child.slug]" (click)="closeMenu()" class="block text-[11px] font-bold text-neutral-500 hover:text-[#d65108] transition-colors truncate">
                      • {{ child.name }} ({{ child.productCount }})
                    </a>
                  </div>
                </div>
              </div>

              <ng-template #noSubcats>
                <div class="p-6 text-center text-xs font-semibold text-neutral-400 bg-neutral-50 dark:bg-neutral-900/30 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                  Browse products directly in {{ root.name }} catalog.
                </div>
              </ng-template>

            </div>
          </div>

          <!-- Right Column: Featured Category Banner & Best Sellers (3 Cols) -->
          <div class="col-span-12 md:col-span-3 space-y-4">
            
            <!-- Promotional Card -->
            <div *ngIf="menuData()?.config?.promotionalBanner as banner" class="relative rounded-2xl overflow-hidden bg-neutral-900 text-white p-4 space-y-2 shadow-sm group/banner">
              <img [src]="banner.image" [alt]="banner.title" class="absolute inset-0 w-full h-full object-cover opacity-40 group-hover/banner:scale-105 transition-transform duration-500">
              <div class="relative z-10 space-y-1.5">
                <span class="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-orange-500 text-white inline-block">HOT OFFER</span>
                <h4 class="text-xs font-black uppercase tracking-tight leading-snug">{{ banner.title }}</h4>
                <p class="text-[9px] text-neutral-200 font-medium line-clamp-2">{{ banner.subtitle }}</p>
                <a [routerLink]="[banner.link]" (click)="closeMenu()" class="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-orange-400 hover:text-white transition-colors pt-1">
                  <span>{{ banner.ctaText }}</span>
                  <mat-icon class="text-xs">arrow_forward</mat-icon>
                </a>
              </div>
            </div>

            <!-- Mini Best Sellers Preview -->
            <div *ngIf="categoryBestSellers().length" class="space-y-2">
              <span class="text-[9px] font-black uppercase tracking-wider text-neutral-400 block">Category Top Picks</span>
              <div *ngFor="let p of categoryBestSellers().slice(0, 2)" [routerLink]="['/product', p.slug]" (click)="closeMenu()" class="flex items-center gap-2.5 p-2 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-850 cursor-pointer transition-colors border border-neutral-200/40 dark:border-neutral-800">
                <img *ngIf="p.image" [src]="p.image" [alt]="p.name" class="w-9 h-9 object-cover rounded-lg shrink-0">
                <div class="min-w-0 flex-1">
                  <span class="text-[10px] font-bold text-neutral-900 dark:text-white block truncate">{{ p.name }}</span>
                  <span class="text-[9px] font-black text-[#d65108]">₹{{ p.salePrice || p.basePrice }}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        <!-- TAB 2: BRANDS VIEW -->
        <div *ngIf="!loading() && activeTab() === 'brands'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 min-h-[22rem] max-h-96 overflow-y-auto pr-2 scrollbar-none">
          <div 
            *ngFor="let b of filteredBrands()"
            [routerLink]="['/products']"
            [queryParams]="{ brand: b.name }"
            (click)="closeMenu()"
            class="group/brand p-3.5 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-white dark:hover:bg-neutral-850 rounded-2xl border border-neutral-200/50 dark:border-neutral-800 hover:border-[#d65108]/40 shadow-xs transition-all cursor-pointer text-center space-y-2 flex flex-col items-center justify-center"
          >
            <div class="w-14 h-14 rounded-xl bg-white dark:bg-neutral-950 p-2 shadow-xs flex items-center justify-center border border-neutral-100 dark:border-neutral-800 group-hover/brand:scale-110 transition-transform">
              <img *ngIf="b.logo" [src]="b.logo" [alt]="b.name" class="max-w-full max-h-full object-contain">
              <mat-icon *ngIf="!b.logo" class="text-xl text-neutral-400">label</mat-icon>
            </div>
            
            <div>
              <span class="text-xs font-black uppercase text-neutral-900 dark:text-white block truncate group-hover/brand:text-[#d65108] transition-colors">
                {{ b.name }}
              </span>
              <span class="text-[9px] font-bold text-neutral-400 block mt-0.5">
                {{ b.productCount }} Products
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  `
})
export class HeaderMegaMenuComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  isOpen = signal<boolean>(false);
  loading = signal<boolean>(true);
  menuData = signal<HeaderMenuPayload | null>(null);
  activeTab = signal<'categories' | 'brands'>('categories');
  selectedRootCategory = signal<CategoryNode | null>(null);
  searchQuery = signal<string>('');

  private hoverTimeout: any = null;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchHeaderMenu();
    }
  }

  fetchHeaderMenu() {
    this.api.get<any>('/header-menu').subscribe({
      next: (res) => {
        if (res && res.data) {
          this.menuData.set(res.data);
          if (res.data.categories && res.data.categories.length > 0) {
            this.selectedRootCategory.set(res.data.categories[0]);
          }
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  // Reactive Computed Filters
  filteredCategories = computed(() => {
    const data = this.menuData();
    if (!data || !data.categories) return [];
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return data.categories;
    return data.categories.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.children.some(sub => sub.name.toLowerCase().includes(q))
    );
  });

  filteredBrands = computed(() => {
    const data = this.menuData();
    if (!data || !data.brands) return [];
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return data.brands;
    return data.brands.filter(b => b.name.toLowerCase().includes(q));
  });

  categoryBestSellers = computed(() => {
    const data = this.menuData();
    const root = this.selectedRootCategory();
    if (!data || !data.bestSellers) return [];
    if (!root) return data.bestSellers.slice(0, 3);
    const filtered = data.bestSellers.filter(p => p.categoryId === root.id);
    return filtered.length > 0 ? filtered.slice(0, 3) : data.bestSellers.slice(0, 3);
  });

  // Hover & Navigation Handlers
  onCategoryHover(category: CategoryNode) {
    if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
    this.hoverTimeout = setTimeout(() => {
      this.selectedRootCategory.set(category);
    }, 50);
  }

  openMenu() {
    this.isOpen.set(true);
  }

  closeMenu() {
    this.isOpen.set(false);
  }

  toggleMenu() {
    this.isOpen.set(!this.isOpen());
  }

  navigateToCategory(slug: string) {
    this.router.navigate(['/category', slug]);
  }
}
