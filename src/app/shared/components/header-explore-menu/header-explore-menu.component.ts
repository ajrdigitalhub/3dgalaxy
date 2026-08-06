import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  PLATFORM_ID,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { DatastoreService } from '../../../services/datastore';

export interface ExploreCategoryNode {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  icon?: string;
  iconType?: 'svg' | 'png' | 'material' | 'lucide' | 'hero';
  customIconUrl?: string | null;
  description?: string | null;
  productCount: number;
  isFeatured?: boolean;
  children: ExploreCategoryNode[];
}

export interface ExploreProductPreview {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  hoverImage?: string | null;
  basePrice: number;
  salePrice?: number | null;
  rating: number | null;
  totalReviews?: number;
  stock: number;
  inStock: boolean;
  categoryId?: string;
  hasVariants?: boolean;
}

export interface ExploreBanner {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  ctaText: string;
  link: string;
  animation?: string;
  priority?: number;
}

export interface ExploreQuickLink {
  label: string;
  link: string;
  icon: string;
  badge?: string;
}

export interface ExploreCollection {
  name: string;
  slug: string;
  image: string;
  count: number;
}

export interface ExplorePayload {
  config: {
    general: {
      enableExplore: boolean;
      popupWidth: string;
      theme: string;
      animation: string;
    };
    categoriesConfig?: Record<string, any>;
    featuredSections: {
      enableCollections: boolean;
      enableBrands: boolean;
      enableQuickLinks: boolean;
      enableTrending: boolean;
      productsCount: number;
    };
    bottomProducts: {
      enable: boolean;
      count: number;
      mode: string;
    };
    promotionalBanners: ExploreBanner[];
    quickLinks: ExploreQuickLink[];
    featuredCollections: ExploreCollection[];
    sectionOrder: string[];
  };
  categories: ExploreCategoryNode[];
  categoryTopProducts: Record<string, ExploreProductPreview[]>;
  overallTopProducts: ExploreProductPreview[];
}

@Component({
  selector: 'app-header-explore-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative group h-full flex items-center select-none font-sans">
      
      <!-- NAVBAR EXPLORE TRIGGER BUTTON -->
      <button 
        type="button"
        (mouseenter)="onMouseEnter()"
        (mouseleave)="onMouseLeave()"
        (click)="toggleMenu()"
        class="hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-500/10 dark:hover:bg-orange-500/20 rounded-xl px-3.5 py-2 transition-all duration-300 flex items-center gap-2 font-black text-[11px] uppercase tracking-wider cursor-pointer border-none bg-transparent text-slate-800 dark:text-slate-200 hover:scale-105 active:scale-95 group/btn relative"
        aria-label="Toggle Explore Discovery Hub"
      >
        <div class="w-6 h-6 rounded-lg bg-linear-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 group-hover/btn:rotate-12 transition-transform duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.61 8.41m5.98 5.96a14.96 14.96 0 00-6.18 12.13A14.96 14.96 0 008.41 9.61m6.18 4.76l-1.06 1.06m-6.18-5.82L6.29 10.67m-2.25 7.42l-.75-.75 2.25-2.25v-.75H4.79l-2.25 2.25-.75-.75L3.79 13.5H3v-1.5h1.5v-1.5H3v-1.5h.79l2.25-2.25.75.75-2.25 2.25h.75v.79l2.25-2.25.75.75-2.25 2.25v.75H8.41" />
          </svg>
        </div>
        <span class="font-black tracking-wider text-transparent bg-clip-text bg-linear-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-300">Explore</span>
        <mat-icon [ngClass]="{'rotate-180': isOpen()}" class="text-xs transition-transform duration-200 text-slate-400">expand_more</mat-icon>
      </button>

      <!-- ENTERPRISE EXPLORE MEGA POPUP DISCOVERY HUB OVERLAY -->
      @if (isOpen()) {
        <div 
          (mouseenter)="onMouseEnter()"
          (mouseleave)="onMouseLeave()"
          class="fixed left-1/2 -translate-x-1/2 top-16 sm:top-20 w-[96vw] max-w-7xl bg-white/95 dark:bg-[#12161F]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl dark:shadow-[0_25px_70px_rgba(0,0,0,0.7)] rounded-3xl transition-all duration-300 z-[100] p-6 space-y-6 animate-fadeIn max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100 before:content-[''] before:absolute before:-top-6 before:left-0 before:right-0 before:h-6 font-sans scrollbar-thin"
        >
          
          <!-- TOP HEADER BAR: TITLE, QUICK LINKS CHIPS & INSTANT SEARCH -->
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div class="flex items-center gap-3">
              <div class="h-9 w-9 rounded-xl bg-linear-to-tr from-orange-500 via-amber-500 to-yellow-400 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                <mat-icon class="text-lg">explore</mat-icon>
              </div>
              <div>
                <h2 class="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">
                  Discovery Hub
                </h2>
                <span class="text-[9px] font-mono font-bold text-orange-500 uppercase tracking-widest">3D GALAXY EXPLORE</span>
              </div>
            </div>

            <!-- Quick Link Chips -->
            <div class="hidden xl:flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              @for (ql of quickLinks(); track ql.label) {
                <a
                  [routerLink]="[ql.link]"
                  (click)="closeMenu()"
                  class="h-8 px-3 rounded-xl bg-slate-100 dark:bg-[#1A202C] hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 text-slate-700 dark:text-slate-300 font-extrabold text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer shrink-0 flex items-center gap-1.5 no-underline shadow-2xs"
                >
                  <mat-icon class="scale-75 text-[14px]">{{ ql.icon }}</mat-icon>
                  <span>{{ ql.label }}</span>
                  @if (ql.badge) {
                    <span class="px-1.5 py-0.2 bg-orange-500/20 text-orange-600 dark:text-orange-300 text-[8px] font-black rounded-md">{{ ql.badge }}</span>
                  }
                </a>
              }
            </div>

            <!-- Instant Filter Input -->
            <div class="relative w-full lg:w-72">
              <mat-icon class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">search</mat-icon>
              <input 
                type="text" 
                [ngModel]="searchQuery()" 
                (ngModelChange)="searchQuery.set($event)"
                placeholder="Search categories, products, or deals..."
                class="w-full h-9 pl-9 pr-4 bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-orange-500 transition-colors"
              />
              @if (searchQuery()) {
                <button (click)="searchQuery.set('')" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer">
                  <mat-icon class="text-xs">close</mat-icon>
                </button>
              }
            </div>
          </div>

          <!-- LOADING SKELETON STATE -->
          @if (loading()) {
            <div class="grid grid-cols-12 gap-6 min-h-[26rem] animate-pulse">
              <div class="col-span-12 lg:col-span-3 space-y-3 border-r border-slate-100 dark:border-slate-800 pr-3">
                @for (i of [1,2,3,4,5]; track i) {
                  <div class="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-2xl"></div>
                }
              </div>
              <div class="col-span-12 lg:col-span-6 space-y-3 border-r border-slate-100 dark:border-slate-800 pr-3">
                <div class="h-8 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-1/3"></div>
                <div class="grid grid-cols-3 gap-3">
                  @for (i of [1,2,3]; track i) {
                    <div class="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-2xl"></div>
                  }
                </div>
              </div>
              <div class="col-span-12 lg:col-span-3 space-y-3">
                <div class="h-44 bg-slate-100 dark:bg-slate-800/60 rounded-3xl"></div>
              </div>
            </div>
          } @else {
            <!-- 3-PANEL MEGA POPUP CONTENT -->
            <div class="grid grid-cols-12 gap-6 min-h-[26rem]">
              
              <!-- LEFT PANEL (25% -> col-span-12 lg:col-span-3): CATEGORIES LIST -->
              <div class="col-span-12 lg:col-span-3 space-y-2.5 max-h-[28rem] overflow-y-auto pr-2 scrollbar-thin border-r border-slate-100 dark:border-slate-800/80">
                <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <mat-icon class="text-sm text-orange-500">grid_view</mat-icon>
                    <span>Categories</span>
                  </span>
                  <span class="text-[10px] font-mono font-bold text-slate-400">{{ filteredCategories().length }} Main</span>
                </div>

                @if (filteredCategories().length === 0) {
                  <div class="p-6 text-xs text-slate-400 text-center">No categories match your search.</div>
                }

                @for (cat of filteredCategories(); track cat.id) {
                  <div 
                    (mouseenter)="onCategoryHover(cat)"
                    (click)="selectCategory(cat)"
                    [ngClass]="{
                      'bg-linear-to-r from-orange-500/15 via-amber-500/10 to-transparent border-orange-500/40 text-orange-600 dark:text-orange-400 font-black shadow-md ring-1 ring-orange-500/30 scale-[1.02]': activeCategory()?.id === cat.id,
                      'border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-[#1A202C] text-slate-800 dark:text-slate-200': activeCategory()?.id !== cat.id
                    }"
                    class="group/cat flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 hover:scale-[1.01] relative overflow-hidden"
                  >
                    <!-- Hover Glow Backdrop -->
                    <div class="absolute inset-0 bg-linear-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover/cat:opacity-100 transition-opacity"></div>

                    <div class="flex items-center gap-3.5 min-w-0 relative z-10">
                      <!-- Category Icon / Image -->
                      <div class="w-11 h-11 p-1 shrink-0 flex items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 group-hover/cat:scale-110 transition-transform duration-200 border border-orange-500/20 shadow-2xs">
                        @if (cat.customIconUrl || cat.image) {
                          <img [src]="cat.customIconUrl || cat.image" [alt]="cat.name" class="w-full h-full object-contain rounded-xl" />
                        } @else {
                          <mat-icon class="text-xl">{{ getCategoryIcon(cat.name, cat.icon) }}</mat-icon>
                        }
                      </div>

                      <!-- Category Name & Description -->
                      <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs font-black uppercase tracking-tight truncate group-hover/cat:text-orange-500 transition-colors">
                            {{ cat.name }}
                          </span>
                        </div>
                        <p class="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-medium">
                          {{ cat.description || ('Explore ' + cat.name + ' catalog') }}
                        </p>
                      </div>
                    </div>

                    <!-- Product Count Badge -->
                    <div class="flex items-center gap-1.5 shrink-0 ml-2 relative z-10">
                      <span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-slate-100 dark:bg-[#0D1017] text-slate-600 dark:text-slate-400 group-hover/cat:bg-orange-500 group-hover/cat:text-white transition-colors">
                        {{ cat.productCount }}
                      </span>
                      <mat-icon class="text-base text-slate-400 group-hover/cat:translate-x-1 group-hover/cat:text-orange-500 transition-all">chevron_right</mat-icon>
                    </div>
                  </div>
                }
              </div>

              <!-- CENTER PANEL (50% -> col-span-12 lg:col-span-6): SUBCATEGORIES & FEATURED COLLECTIONS -->
              <div class="col-span-12 lg:col-span-6 space-y-5 max-h-[28rem] overflow-y-auto pr-2 scrollbar-thin border-r border-slate-100 dark:border-slate-800/80">
                @if (activeCategory(); as root) {
                  <!-- Active Category Spotlight Header -->
                  <div class="p-4 bg-linear-to-r from-orange-500/10 via-amber-500/5 to-transparent rounded-2xl border border-orange-500/20 flex items-center justify-between">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 bg-orange-500 text-white text-[9px] font-black uppercase rounded-md">Category Spotlight</span>
                        <h3 class="text-sm font-black uppercase text-slate-900 dark:text-white">{{ root.name }}</h3>
                      </div>
                      <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ root.description }}</p>
                    </div>

                    <a 
                      [routerLink]="['/category', root.slug]" 
                      (click)="closeMenu()"
                      class="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border-none cursor-pointer no-underline shrink-0 shadow-sm"
                    >
                      <span>Explore All</span>
                      <mat-icon class="text-sm">arrow_forward</mat-icon>
                    </a>
                  </div>

                  <!-- Subcategories Grid Cards -->
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <mat-icon class="text-sm text-blue-500">account_tree</mat-icon>
                        <span>Subcategories & Types</span>
                      </span>
                      <span class="text-[10px] font-bold text-slate-400">{{ root.children.length || 0 }} Sections</span>
                    </div>

                    @if (root.children && root.children.length > 0) {
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        @for (sub of root.children; track sub.id) {
                          <div 
                            [routerLink]="['/category', sub.slug]" 
                            (click)="closeMenu()"
                            class="group/sub p-3.5 bg-slate-50 dark:bg-[#181C23] hover:bg-white dark:hover:bg-[#202632] rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-orange-500/40 shadow-2xs transition-all cursor-pointer flex items-center justify-between"
                          >
                            <div class="flex items-center gap-3 min-w-0">
                              <div class="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 p-1 shrink-0 flex items-center justify-center group-hover/sub:scale-110 transition-transform">
                                @if (sub.image) {
                                  <img [src]="sub.image" [alt]="sub.name" class="w-full h-full object-contain rounded-lg" />
                                } @else {
                                  <mat-icon class="scale-75 text-[16px]">{{ getCategoryIcon(sub.name, sub.icon) }}</mat-icon>
                                }
                              </div>
                              <div class="min-w-0">
                                <span class="text-xs font-bold uppercase text-slate-900 dark:text-white group-hover/sub:text-orange-500 transition-colors block truncate">
                                  {{ sub.name }}
                                </span>
                                <span class="text-[9px] font-semibold text-slate-400 block mt-0.5 font-mono">{{ sub.productCount }} Products</span>
                              </div>
                            </div>
                            <mat-icon class="text-sm text-slate-400 group-hover/sub:translate-x-1 group-hover/sub:text-orange-500 transition-all">chevron_right</mat-icon>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="p-5 text-center space-y-2 bg-slate-50 dark:bg-[#181C23] rounded-2xl border border-slate-200/60 dark:border-slate-800">
                        <p class="text-xs font-bold text-slate-500 dark:text-slate-400">Direct Category Catalog</p>
                        <p class="text-[11px] text-slate-400">Browse all {{ root.productCount }} products in {{ root.name }} directly.</p>
                      </div>
                    }
                  </div>

                  <!-- Featured Collections Cards Grid -->
                  @if (featuredCollections().length > 0) {
                    <div class="space-y-3 pt-2">
                      <span class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <mat-icon class="text-sm text-amber-500">layers</mat-icon>
                        <span>Featured Collections</span>
                      </span>

                      <div class="grid grid-cols-2 gap-3">
                        @for (col of featuredCollections(); track col.name) {
                          <a
                            [routerLink]="['/category', col.slug]"
                            (click)="closeMenu()"
                            class="group/col relative rounded-2xl overflow-hidden h-20 bg-slate-900 text-white p-3 flex flex-col justify-end no-underline shadow-xs"
                          >
                            <img [src]="col.image" [alt]="col.name" class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/col:scale-110 transition-transform duration-300" />
                            <div class="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                            <div class="relative z-10">
                              <h4 class="text-xs font-black uppercase text-white truncate leading-tight group-hover/col:text-orange-400 transition-colors">{{ col.name }}</h4>
                              <span class="text-[9px] text-slate-300 font-mono">{{ col.count }} Items</span>
                            </div>
                          </a>
                        }
                      </div>
                    </div>
                  }
                }
              </div>

              <!-- RIGHT PANEL (25% -> col-span-12 lg:col-span-3): PROMOTIONS & TRENDING PRODUCTS -->
              <div class="col-span-12 lg:col-span-3 space-y-4 max-h-[28rem] overflow-y-auto pr-2 scrollbar-thin">
                
                <!-- Promotional Banner Carousel / Card -->
                @if (activeBanner(); as banner) {
                  <div class="relative rounded-3xl overflow-hidden bg-slate-950 text-white p-5 space-y-3 shadow-md group/banner min-h-[14rem] flex flex-col justify-between border border-orange-500/20">
                    <img [src]="banner.image" [alt]="banner.title" class="absolute inset-0 w-full h-full object-cover opacity-45 group-hover/banner:scale-105 transition-transform duration-500" />
                    <div class="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

                    <div class="relative z-10 space-y-1.5">
                      <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-orange-500 text-white inline-block shadow-xs">
                        FEATURED DEALS
                      </span>
                      <h3 class="text-sm font-black uppercase tracking-tight leading-snug text-white">
                        {{ banner.title }}
                      </h3>
                      <p class="text-[11px] text-slate-300 font-medium line-clamp-2">
                        {{ banner.subtitle }}
                      </p>
                    </div>

                    <div class="relative z-10 pt-2">
                      <a 
                        [routerLink]="[banner.link]" 
                        (click)="closeMenu()" 
                        class="w-full inline-flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-white bg-orange-500 hover:bg-orange-600 py-2.5 rounded-xl shadow-md transition-all no-underline"
                      >
                        <span>{{ banner.ctaText || 'Shop Now' }}</span>
                        <mat-icon class="text-sm">arrow_forward</mat-icon>
                      </a>
                    </div>
                  </div>
                }

                <!-- Trending / Top Pick Mini Cards -->
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      <mat-icon class="text-sm text-rose-500">whatshot</mat-icon>
                      <span>Trending Products</span>
                    </span>
                  </div>

                  @if (overallTrendingProducts().length > 0) {
                    <div class="space-y-2">
                      @for (tp of overallTrendingProducts().slice(0, 3); track tp.id) {
                        <a
                          [routerLink]="['/product', tp.slug]"
                          (click)="closeMenu()"
                          class="group/tp p-2.5 bg-slate-50 dark:bg-[#181C23] hover:bg-white dark:hover:bg-[#202632] rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-orange-500/40 cursor-pointer transition-all duration-150 flex items-center gap-3 no-underline text-slate-900 dark:text-white shadow-2xs"
                        >
                          <img [src]="tp.image" [alt]="tp.name" class="w-12 h-12 rounded-xl object-contain bg-white dark:bg-[#0D1017] p-1 border border-slate-200/50 dark:border-slate-800 shrink-0 group-hover/tp:scale-105 transition-transform" />
                          <div class="min-w-0 flex-1">
                            <h4 class="text-xs font-bold truncate group-hover/tp:text-orange-500 transition-colors">{{ tp.name }}</h4>
                            <div class="flex items-baseline gap-2 mt-0.5">
                              <span class="text-xs font-black text-orange-600 dark:text-orange-400 font-mono">₹{{ tp.salePrice || tp.basePrice }}</span>
                              @if (tp.salePrice && tp.salePrice < tp.basePrice) {
                                <span class="text-[9px] text-slate-400 line-through font-mono">₹{{ tp.basePrice }}</span>
                              }
                            </div>
                          </div>
                        </a>
                      }
                    </div>
                  }
                </div>

              </div>

            </div>

            <!-- BOTTOM PRODUCT STRIP (EXACTLY 4 TOP PRODUCTS FROM ACTIVE CATEGORY) -->
            @if (activeCategoryTopProducts().length > 0) {
              <div class="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[9px] font-black uppercase rounded-md">Top Picks Strip</span>
                    <h3 class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Featured Products in {{ activeCategory()?.name }}
                    </h3>
                  </div>
                  <a 
                    [routerLink]="['/category', activeCategory()?.slug]" 
                    (click)="closeMenu()" 
                    class="text-[10px] font-black uppercase text-orange-500 hover:underline no-underline"
                  >
                    View All {{ activeCategory()?.productCount }} Products →
                  </a>
                </div>

                <!-- 4 COMPACT PRODUCT CARDS GRID -->
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  @for (prod of activeCategoryTopProducts().slice(0, 4); track prod.id) {
                    <div 
                      [routerLink]="['/product', prod.slug]"
                      (click)="closeMenu()"
                      class="group/pcard p-3 bg-slate-50 dark:bg-[#181C23] hover:bg-white dark:hover:bg-[#202632] rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-orange-500/40 cursor-pointer transition-all duration-200 flex items-center gap-3 shadow-2xs relative overflow-hidden"
                    >
                      <!-- Product Thumbnail with Hover Image Swap -->
                      <div class="w-16 h-16 rounded-xl bg-white dark:bg-[#0D1017] p-1.5 shrink-0 border border-slate-200/50 dark:border-slate-800 relative overflow-hidden group-hover/pcard:scale-105 transition-transform">
                        <img [src]="prod.image" [alt]="prod.name" class="w-full h-full object-contain transition-opacity duration-300" [ngClass]="{'group-hover/pcard:opacity-0': prod.hoverImage && prod.hoverImage !== prod.image}" />
                        @if (prod.hoverImage && prod.hoverImage !== prod.image) {
                          <img [src]="prod.hoverImage" [alt]="prod.name" class="absolute inset-0 w-full h-full object-contain p-1.5 opacity-0 group-hover/pcard:opacity-100 transition-opacity duration-300" />
                        }
                      </div>

                      <!-- Details -->
                      <div class="min-w-0 flex-1 space-y-1">
                        <h4 class="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover/pcard:text-orange-500 transition-colors">
                          {{ prod.name }}
                        </h4>

                        <!-- Star Rating -->
                        <div class="flex items-center gap-1 text-[10px] text-amber-500 font-bold">
                          <span>★</span>
                          <span>{{ prod.rating ? prod.rating.toFixed(1) : '5.0' }}</span>
                          <span class="text-[9px] text-slate-400 font-normal">({{ prod.totalReviews || 12 }})</span>
                        </div>

                        <!-- Price Row + Discount Badge -->
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-black text-orange-600 dark:text-orange-400 font-mono">
                            ₹{{ prod.salePrice || prod.basePrice }}
                          </span>
                          @if (prod.salePrice && prod.salePrice < prod.basePrice) {
                            <span class="text-[9px] text-slate-400 line-through font-mono">₹{{ prod.basePrice }}</span>
                            <span class="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black rounded-md">
                              {{ Math.round(((prod.basePrice - prod.salePrice) / prod.basePrice) * 100) }}% OFF
                            </span>
                          }
                        </div>

                        <!-- Stock Status -->
                        <div class="pt-0.5">
                          @if (prod.inStock) {
                            <span class="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400">In Stock</span>
                          } @else {
                            <span class="text-[8px] font-black uppercase text-rose-500">Out of Stock</span>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }

        </div>
      }

    </div>
  `,
})
export class HeaderExploreMenuComponent implements OnInit {
  Math = Math;
  private api = inject(ApiService);
  private router = inject(Router);
  private ds = inject(DatastoreService);
  private platformId = inject(PLATFORM_ID);
  private elementRef = inject(ElementRef);

  isOpen = signal<boolean>(false);
  loading = signal<boolean>(true);
  payload = signal<ExplorePayload | null>(null);
  activeCategory = signal<ExploreCategoryNode | null>(null);
  searchQuery = signal<string>('');

  private hoverTimeout: any = null;
  private closeTimeout: any = null;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchExploreData();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    if (this.isOpen()) {
      this.closeMenu();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenu();
    }
  }

  fetchExploreData() {
    this.api.get<any>('/explore-navigation').subscribe({
      next: (res) => {
        if (res && res.data) {
          this.payload.set(res.data);
          if (res.data.categories && res.data.categories.length > 0) {
            this.activeCategory.set(res.data.categories[0]);
          }
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[HeaderExploreMenu] Failed to load explore navigation:', err);
        this.loading.set(false);
      },
    });
  }

  // Category Icon Fallback Mapping
  getCategoryIcon(name: string, overrideIcon?: string): string {
    if (overrideIcon && overrideIcon !== 'category') return overrideIcon;
    const n = (name || '').toLowerCase();
    if (n.includes('printer') || n.includes('3d printer')) return 'precision_manufacturing';
    if (n.includes('filament') || n.includes('material') || n.includes('pla') || n.includes('abs') || n.includes('petg')) return 'texture';
    if (n.includes('electronic') || n.includes('board') || n.includes('pcb') || n.includes('sensor')) return 'memory';
    if (n.includes('nozzle') || n.includes('hotend') || n.includes('extruder')) return 'tune';
    if (n.includes('motor') || n.includes('stepper') || n.includes('drive')) return 'settings_input_component';
    if (n.includes('hardware') || n.includes('accessory') || n.includes('part')) return 'build';
    if (n.includes('tool') || n.includes('maintenance')) return 'handyman';
    if (n.includes('diy') || n.includes('kit')) return 'view_in_ar';
    if (n.includes('laser') || n.includes('cnc')) return 'auto_awesome';
    return 'category';
  }

  // Reactive Computed Filters
  filteredCategories = computed(() => {
    const data = this.payload();
    if (!data || !data.categories) return [];
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return data.categories;
    return data.categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.children && c.children.some((ch) => ch.name.toLowerCase().includes(q)))
    );
  });

  activeCategoryTopProducts = computed(() => {
    const data = this.payload();
    const active = this.activeCategory();
    if (!data || !active) return [];
    const prods = data.categoryTopProducts?.[active.id];
    if (Array.isArray(prods) && prods.length > 0) return prods;
    return data.overallTopProducts || [];
  });

  overallTrendingProducts = computed(() => {
    const data = this.payload();
    if (!data || !data.overallTopProducts) return [];
    return data.overallTopProducts;
  });

  quickLinks = computed(() => {
    const data = this.payload();
    if (data?.config?.quickLinks && data.config.quickLinks.length > 0) {
      return data.config.quickLinks;
    }
    return [
      { label: 'Shop All Catalog', link: '/products', icon: 'storefront', badge: 'ALL' },
      { label: "Today's Hot Deals", link: '/products?onSale=true', icon: 'local_offer', badge: 'SALE' },
      { label: 'New Arrivals', link: '/products?filter=new', icon: 'fiber_new', badge: 'NEW' },
      { label: 'Best Sellers', link: '/products?filter=bestsellers', icon: 'star', badge: 'HOT' },
    ];
  });

  featuredCollections = computed(() => {
    const data = this.payload();
    if (data?.config?.featuredCollections && data.config.featuredCollections.length > 0) {
      return data.config.featuredCollections;
    }
    return [];
  });

  activeBanner = computed(() => {
    const data = this.payload();
    if (data?.config?.promotionalBanners && data.config.promotionalBanners.length > 0) {
      return data.config.promotionalBanners[0];
    }
    return null;
  });

  // Category Selection
  onCategoryHover(category: ExploreCategoryNode) {
    if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
    this.hoverTimeout = setTimeout(() => {
      this.activeCategory.set(category);
    }, 60);
  }

  selectCategory(category: ExploreCategoryNode) {
    this.activeCategory.set(category);
  }

  // Hover Overlay Handlers
  onMouseEnter() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.isOpen.set(true);
  }

  onMouseLeave() {
    if (this.closeTimeout) clearTimeout(this.closeTimeout);
    this.closeTimeout = setTimeout(() => {
      this.isOpen.set(false);
    }, 280);
  }

  toggleMenu() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.isOpen.set(!this.isOpen());
  }

  closeMenu() {
    if (this.closeTimeout) clearTimeout(this.closeTimeout);
    this.isOpen.set(false);
  }
}
