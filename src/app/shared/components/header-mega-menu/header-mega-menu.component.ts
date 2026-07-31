import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { DatastoreService } from '../../../services/datastore';

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
  rating: number | null;
  totalReviews?: number;
  inStock: boolean;
  categoryId?: string;
  hasVariants?: boolean;
  variants?: any[];
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
    <div 
      class="relative group h-full flex items-center select-none font-sans"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
    >
      
      <!-- Trigger Button in Navbar -->
      <button 
        type="button"
        (mouseenter)="onMouseEnter()"
        (mouseleave)="onMouseLeave()"
        (click)="toggleMenu()"
        class="hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/10 dark:hover:bg-orange-500/20 rounded-xl px-3.5 py-2 transition-all duration-200 flex items-center gap-2 font-black text-[11px] uppercase tracking-wider cursor-pointer border-none bg-transparent text-slate-800 dark:text-slate-200 hover:scale-105 active:scale-95"
      >
        <div class="w-5 h-5 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
          <mat-icon class="scale-75 text-[16px] w-4 h-4 flex items-center justify-center">widgets</mat-icon>
        </div>
        <span>Categories & Brands</span>
        <mat-icon [ngClass]="{'rotate-180': isOpen()}" class="text-xs transition-transform duration-200">expand_more</mat-icon>
      </button>

      <!-- Enterprise Mega Menu Dropdown Overlay -->
      <div 
        *ngIf="isOpen()"
        (mouseenter)="onMouseEnter()"
        (mouseleave)="onMouseLeave()"
        class="fixed left-1/2 -translate-x-1/2 top-16 sm:top-20 w-[96vw] max-w-7xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-3xl transition-all duration-300 z-[100] p-6 space-y-5 animate-fadeIn max-h-[88vh] overflow-y-auto text-slate-900 dark:text-slate-100 before:content-[''] before:absolute before:-top-6 before:left-0 before:right-0 before:h-6"
      >
        
        <!-- Header Bar: Tabs + Quick Shortcuts + Search -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          
          <!-- Category / Brand Tabs -->
          <div class="flex items-center gap-2 bg-slate-100 dark:bg-[#0F1115] p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <button 
              type="button"
              (click)="activeTab.set('categories')"
              [ngClass]="{'bg-white dark:bg-[#181C23] text-orange-500 shadow-xs font-black': activeTab() === 'categories', 'text-slate-600 dark:text-slate-400 font-bold': activeTab() !== 'categories'}"
              class="px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-2"
            >
              <mat-icon class="text-sm">grid_view</mat-icon>
              <span>Categories</span>
              <span *ngIf="menuData()?.categories?.length" class="px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-500/10 text-orange-500">
                {{ menuData()?.categories?.length }}
              </span>
            </button>

            <button 
              type="button"
              (click)="activeTab.set('brands')"
              [ngClass]="{'bg-white dark:bg-[#181C23] text-orange-500 shadow-xs font-black': activeTab() === 'brands', 'text-slate-600 dark:text-slate-400 font-bold': activeTab() !== 'brands'}"
              class="px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-2"
            >
              <mat-icon class="text-sm">verified</mat-icon>
              <span>Brands</span>
              <span *ngIf="menuData()?.brands?.length" class="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/10 text-blue-500">
                {{ menuData()?.brands?.length }}
              </span>
            </button>
          </div>

          <!-- Quick Category Tag Chips -->
          <div class="hidden xl:flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              *ngFor="let quickCat of (menuData()?.categories || []).slice(0, 4)"
              type="button"
              (click)="selectCategory(quickCat)"
              [class]="selectedRootCategory()?.id === quickCat.id ? 'bg-orange-500 text-white font-black' : 'bg-slate-100 dark:bg-[#0F1115] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1C222D] font-extrabold'"
              class="h-8 px-3 rounded-xl text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer shrink-0 flex items-center gap-1"
            >
              <mat-icon class="scale-75 text-[14px]">{{ getCategoryIcon(quickCat.name) }}</mat-icon>
              <span>{{ quickCat.name }}</span>
            </button>
          </div>

          <!-- Instant Search Bar inside Mega Menu -->
          <div class="relative w-full lg:w-72">
            <mat-icon class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">search</mat-icon>
            <input 
              type="text" 
              [ngModel]="searchQuery()" 
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Search categories, subcategories, or brands..."
              class="w-full h-9 pl-9 pr-4 bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-orange-500 transition-colors"
            >
          </div>

        </div>

        <!-- LOADING SKELETON STATE -->
        <div *ngIf="loading()" class="grid grid-cols-12 gap-6 min-h-[24rem] animate-pulse">
          <div class="col-span-12 lg:col-span-4 space-y-3 border-r border-slate-100 dark:border-slate-800 pr-3">
            <div *ngFor="let i of [1,2,3,4,5]" class="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-2xl"></div>
          </div>
          <div class="col-span-12 lg:col-span-3 space-y-3 border-r border-slate-100 dark:border-slate-800 pr-3">
            <div class="h-6 bg-slate-100 dark:bg-slate-800/60 rounded-lg w-1/2"></div>
            <div class="space-y-2">
              <div *ngFor="let i of [1,2,3]" class="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
            </div>
          </div>
          <div class="col-span-12 lg:col-span-5 space-y-3">
            <div class="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-2xl"></div>
          </div>
        </div>

        <!-- TAB 1: CATEGORIES VIEW (4-COLUMN RESPONSIVE LAYOUT) -->
        <div *ngIf="!loading() && activeTab() === 'categories'" class="grid grid-cols-12 gap-5 min-h-[26rem]">
          
          <!-- COLUMN 1: MAIN CATEGORIES LIST (28% -> col-span-12 lg:col-span-3) -->
          <div class="col-span-12 lg:col-span-3 space-y-2 max-h-[30rem] overflow-y-auto pr-2 scrollbar-thin border-r border-slate-100 dark:border-slate-800/80">
            <div *ngIf="filteredCategories().length === 0" class="p-6 text-xs text-slate-400 text-center">
              No categories match your search.
            </div>
            
            <div 
              *ngFor="let cat of filteredCategories()"
              (mouseenter)="onCategoryHover(cat)"
              (click)="navigateToCategory(cat.slug); closeMenu()"
              [ngClass]="{
                'bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/30 text-orange-600 dark:text-orange-400 font-black shadow-xs ring-1 ring-orange-500/20': selectedRootCategory()?.id === cat.id,
                'border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-[#1C222D] text-slate-800 dark:text-slate-200': selectedRootCategory()?.id !== cat.id
              }"
              class="group/item flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all duration-150 hover:scale-[1.01]"
            >
              <div class="flex items-center gap-3 min-w-0">
                <!-- Icon / Image Container -->
                <div class="w-11 h-11 p-1 shrink-0 flex items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 group-hover/item:scale-110 transition-transform duration-200">
                  <img *ngIf="cat.image" [src]="cat.image" [alt]="cat.name" class="w-full h-full object-contain">
                  <mat-icon *ngIf="!cat.image" class="text-xl">{{ getCategoryIcon(cat.name) }}</mat-icon>
                </div>

                <!-- Text Details -->
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-black uppercase tracking-tight truncate group-hover/item:text-orange-500 transition-colors">
                      {{ cat.name }}
                    </span>
                  </div>
                  <p class="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {{ getCategoryDescription(cat) }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-1 shrink-0 ml-2">
                <span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-slate-100 dark:bg-[#0F1115] text-slate-600 dark:text-slate-400">
                  {{ cat.productCount }}
                </span>
                <mat-icon class="text-base text-slate-400 group-hover/item:translate-x-1 group-hover/item:text-orange-500 transition-all">chevron_right</mat-icon>
              </div>
            </div>
          </div>

          <!-- COLUMN 2: SUB-CATEGORIES (24% -> col-span-12 lg:col-span-3) -->
          <div class="col-span-12 lg:col-span-3 space-y-4 max-h-[30rem] overflow-y-auto pr-2 scrollbar-thin border-r border-slate-100 dark:border-slate-800/80">
            <div *ngIf="selectedRootCategory() as root" class="space-y-4">
              
              <!-- Subcategory Header -->
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <a [routerLink]="['/category', root.slug]" (click)="closeMenu()" class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white hover:text-orange-500 transition-colors flex items-center gap-1.5">
                  <span>Explore {{ root.name }}</span>
                  <mat-icon class="text-sm">arrow_forward</mat-icon>
                </a>
                <span class="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                  {{ root.productCount }} Items
                </span>
              </div>

              <!-- Subcategory Grid Cards -->
              <div *ngIf="root.children?.length; else noSubcats" class="space-y-2">
                <div 
                  *ngFor="let sub of root.children" 
                  [routerLink]="['/category', sub.slug]" 
                  (click)="closeMenu()"
                  class="group/sub p-3 bg-slate-50 dark:bg-[#181C23] hover:bg-white dark:hover:bg-[#202632] rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-orange-500/40 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 p-1 shrink-0 flex items-center justify-center">
                      <img *ngIf="sub.image" [src]="sub.image" [alt]="sub.name" class="w-full h-full object-contain">
                      <mat-icon *ngIf="!sub.image" class="scale-75 text-[16px]">{{ getCategoryIcon(sub.name) }}</mat-icon>
                    </div>
                    <div class="min-w-0">
                      <span class="text-xs font-bold uppercase text-slate-900 dark:text-white group-hover/sub:text-orange-500 transition-colors block truncate">
                        {{ sub.name }}
                      </span>
                      <span class="text-[9px] font-semibold text-slate-400 block mt-0.5">{{ sub.productCount }} Products</span>
                    </div>
                  </div>

                  <mat-icon class="text-sm text-slate-400 group-hover/sub:translate-x-1 group-hover/sub:text-orange-500 transition-all">chevron_right</mat-icon>
                </div>
              </div>

              <!-- Fallback Content when Subcategories are empty -->
              <ng-template #noSubcats>
                <div class="p-5 text-center space-y-3 bg-slate-50 dark:bg-[#181C23] rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <div class="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 mx-auto flex items-center justify-center">
                    <mat-icon class="scale-90">view_in_ar</mat-icon>
                  </div>
                  <div>
                    <h4 class="text-xs font-black text-slate-900 dark:text-white uppercase">{{ root.name }} Collection</h4>
                    <p class="text-[11px] text-slate-400 mt-1">Browse all {{ root.productCount }} products directly in our verified catalog.</p>
                  </div>
                  <a
                    [routerLink]="['/category', root.slug]"
                    (click)="closeMenu()"
                    class="inline-block px-4 py-2 bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-orange-600 no-underline"
                  >
                    View All {{ root.name }} →
                  </a>
                </div>
              </ng-template>

            </div>
          </div>

          <!-- COLUMN 3: FEATURED PRODUCTS / TOP PICKS (28% -> col-span-12 lg:col-span-4) -->
          <div class="col-span-12 lg:col-span-4 space-y-3 max-h-[30rem] overflow-y-auto pr-2 scrollbar-thin border-r border-slate-100 dark:border-slate-800/80">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <mat-icon class="text-sm text-amber-500">star</mat-icon>
                <span>Category Top Picks</span>
              </span>
              <span class="text-[10px] font-bold text-slate-400">Handpicked</span>
            </div>

            <!-- Featured Product Cards List -->
            @if (categoryBestSellers().length > 0) {
              <div class="space-y-2.5">
                @for (prod of categoryBestSellers().slice(0, 3); track prod.id) {
                  <div
                    [routerLink]="['/product', prod.slug]"
                    (click)="closeMenu()"
                    class="group/prod p-2.5 bg-slate-50 dark:bg-[#181C23] hover:bg-white dark:hover:bg-[#202632] rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-orange-500/40 cursor-pointer transition-all duration-150 flex items-center gap-3 shadow-xs"
                  >
                    <!-- Product Image -->
                    <div class="w-16 h-16 rounded-xl bg-white dark:bg-[#0F1115] p-1.5 shrink-0 border border-slate-200/50 dark:border-slate-800 group-hover/prod:scale-105 transition-transform">
                      <img [src]="getProductImage(prod)" [alt]="prod.name" class="w-full h-full object-contain">
                    </div>

                    <!-- Details -->
                    <div class="min-w-0 flex-1 space-y-1">
                      <h4 class="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover/prod:text-orange-500 transition-colors">
                        {{ prod.name }}
                      </h4>

                      <!-- Rating Stars -->
                      <div class="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                        @if (prod.rating && prod.totalReviews) {
                          @for (star of [1,2,3,4,5]; track star) {
                            <span>{{ star <= Math.round(prod.rating) ? '★' : '☆' }}</span>
                          }
                          <span class="text-slate-700 dark:text-slate-300 font-extrabold ml-1">{{ prod.rating.toFixed(1) }}</span>
                          <span class="text-[9px] text-slate-400 font-normal ml-0.5">({{ prod.totalReviews }})</span>
                        } @else {
                          <span class="text-[10px] font-normal text-slate-400">No reviews yet</span>
                        }
                      </div>

                      <!-- Price Row -->
                      <div class="flex items-baseline gap-2">
                        <span class="text-xs font-black text-orange-600 dark:text-orange-400 font-mono">
                          ₹{{ getSalePrice(prod) }}
                        </span>
                        @if (hasDiscount(prod)) {
                          <span class="text-[10px] font-medium text-slate-400 line-through font-mono">
                            ₹{{ prod.basePrice }}
                          </span>
                        }
                      </div>
                    </div>

                    <!-- Quick Add / View Button -->
                    @if (prod.hasVariants || (prod.variants && prod.variants.length > 0)) {
                      <a
                        [routerLink]="['/product', prod.slug]"
                        class="h-8 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#d65108] text-slate-700 dark:text-slate-200 hover:text-white flex items-center justify-center shrink-0 border-none cursor-pointer transition-all text-[10px] font-bold no-underline gap-1"
                      >
                        <mat-icon class="scale-75 text-[14px]">visibility</mat-icon>
                        <span>View</span>
                      </a>
                    } @else {
                      <button
                        type="button"
                        (click)="quickAddToCart($event, prod)"
                        aria-label="Add to cart"
                        class="h-8 w-8 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white flex items-center justify-center shrink-0 border-none cursor-pointer transition-all"
                      >
                        <mat-icon class="scale-75 text-[16px]">shopping_cart</mat-icon>
                      </button>
                    }
                  </div>
                }
              </div>
            } @else {
              <div class="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-[#181C23] rounded-2xl">
                Explore our catalog to view top rated products.
              </div>
            }
          </div>

          <!-- COLUMN 4: PROMOTIONAL SALE BANNER (20% -> col-span-12 lg:col-span-2) -->
          <div class="col-span-12 lg:col-span-2 space-y-4">
            
            <div *ngIf="menuData()?.config?.promotionalBanner as banner" class="relative rounded-3xl overflow-hidden bg-slate-950 text-white p-5 space-y-3 shadow-md group/banner min-h-[22rem] flex flex-col justify-between">
              <!-- Background Banner Image -->
              <img [src]="banner.image" [alt]="banner.title" class="absolute inset-0 w-full h-full object-cover opacity-50 group-hover/banner:scale-105 transition-transform duration-500">
              
              <!-- Gradient Overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

              <!-- Banner Header Content -->
              <div class="relative z-10 space-y-2">
                <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-orange-500 text-white inline-block shadow-sm">
                  HOT OFFER
                </span>
                <h3 class="text-base font-black uppercase tracking-tight leading-snug text-white">
                  {{ banner.title }}
                </h3>
                <p class="text-[11px] text-slate-300 font-medium line-clamp-3">
                  {{ banner.subtitle }}
                </p>
              </div>

              <!-- Banner CTA Footer Button -->
              <div class="relative z-10 pt-2">
                <a 
                  [routerLink]="[banner.link]" 
                  (click)="closeMenu()" 
                  class="w-full inline-flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-white bg-orange-500 hover:bg-orange-600 py-3 rounded-xl shadow-md transition-all no-underline"
                >
                  <span>{{ banner.ctaText || 'Shop Now' }}</span>
                  <mat-icon class="text-sm">arrow_forward</mat-icon>
                </a>
              </div>
            </div>

          </div>

        </div>

        <!-- TAB 2: BRANDS VIEW (GRID WITH ALPHABETICAL FILTER) -->
        <div *ngIf="!loading() && activeTab() === 'brands'" class="space-y-4 min-h-[26rem]">
          
          <!-- Alphabetical Letter Filter Bar -->
          <div class="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2 border-b border-slate-100 dark:border-slate-800">
            <button
              *ngFor="let letter of brandLetters"
              type="button"
              (click)="selectedBrandLetter.set(letter)"
              [class]="selectedBrandLetter() === letter ? 'bg-orange-500 text-white font-black' : 'bg-slate-100 dark:bg-[#0F1115] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1C222D] font-bold'"
              class="h-8 px-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all border-none cursor-pointer shrink-0"
            >
              {{ letter }}
            </button>
          </div>

          <!-- Brands Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 max-h-[26rem] overflow-y-auto pr-2 scrollbar-thin">
            <div 
              *ngFor="let b of filteredBrands()"
              [routerLink]="['/products']"
              [queryParams]="{ brand: b.name }"
              (click)="closeMenu()"
              class="group/brand p-4 bg-slate-50 dark:bg-[#181C23] hover:bg-white dark:hover:bg-[#202632] rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-orange-500/40 shadow-xs transition-all cursor-pointer text-center space-y-2.5 flex flex-col items-center justify-center"
            >
              <!-- Brand Logo Container -->
              <div class="w-16 h-16 rounded-2xl bg-white dark:bg-[#0F1115] p-2.5 shadow-xs flex items-center justify-center border border-slate-100 dark:border-slate-800 group-hover/brand:scale-110 transition-transform">
                <img *ngIf="b.logo" [src]="b.logo" [alt]="b.name" class="max-w-full max-h-full object-contain">
                <mat-icon *ngIf="!b.logo" class="text-2xl text-slate-400">verified</mat-icon>
              </div>
              
              <div>
                <span class="text-xs font-black uppercase text-slate-900 dark:text-white block truncate group-hover/brand:text-orange-500 transition-colors">
                  {{ b.name }}
                </span>
                <span class="text-[9px] font-extrabold text-slate-400 block mt-0.5">
                  {{ b.productCount }} Products
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  `
})
export class HeaderMegaMenuComponent implements OnInit {
  Math = Math;
  private api = inject(ApiService);
  private router = inject(Router);
  private ds = inject(DatastoreService);
  private platformId = inject(PLATFORM_ID);

  isOpen = signal<boolean>(false);
  loading = signal<boolean>(true);
  menuData = signal<HeaderMenuPayload | null>(null);
  activeTab = signal<'categories' | 'brands'>('categories');
  selectedRootCategory = signal<CategoryNode | null>(null);
  searchQuery = signal<string>('');
  selectedBrandLetter = signal<string>('ALL');

  brandLetters = ['ALL', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

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

  // Category Specific Icon Mapping
  getCategoryIcon(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('printer') || n.includes('3d printer')) return 'precision_manufacturing';
    if (n.includes('filament') || n.includes('material') || n.includes('pla') || n.includes('abs') || n.includes('petg')) return 'texture';
    if (n.includes('electronic') || n.includes('board') || n.includes('pcb') || n.includes('sensor')) return 'memory';
    if (n.includes('nozzle') || n.includes('hotend') || n.includes('extruder')) return 'tune';
    if (n.includes('motor') || n.includes('stepper') || n.includes('drive')) return 'settings_input_component';
    if (n.includes('hardware') || n.includes('accessory') || n.includes('accessories') || n.includes('part')) return 'build';
    if (n.includes('tool') || n.includes('maintenance') || n.includes('repair')) return 'handyman';
    if (n.includes('diy') || n.includes('kit')) return 'view_in_ar';
    if (n.includes('laser') || n.includes('cnc')) return 'auto_awesome';
    if (n.includes('home') || n.includes('garden')) return 'home';
    if (n.includes('health') || n.includes('beauty')) return 'favorite';
    if (n.includes('art') || n.includes('craft')) return 'palette';
    return 'category';
  }

  // Tagline description helper
  getCategoryDescription(cat: CategoryNode): string {
    if (cat.description && cat.description.trim().length > 0) {
      return cat.description;
    }
    const n = (cat.name || '').toLowerCase();
    if (n.includes('printer')) return 'FDM, SLA & Industrial 3D Printers';
    if (n.includes('filament')) return 'PLA, ABS, PETG & Specialty Spools';
    if (n.includes('electronic')) return 'Mainboards, Drivers & Display Screens';
    if (n.includes('nozzle')) return 'Hardened Steel & Brass Nozzles';
    if (n.includes('hardware')) return 'Belts, Pulleys, Screws & Upgrades';
    if (n.includes('tool')) return 'Spatulas, Wrenches & Cleaning Kits';
    return `Explore premium ${cat.name} catalog`;
  }

  getProductImage(prod: ProductPreview): string {
    if (prod.image) return prod.image;
    return 'https://via.placeholder.com/200x200?text=3D+Galaxy';
  }

  getSalePrice(prod: ProductPreview): number {
    return prod.salePrice ?? prod.basePrice ?? 0;
  }

  hasDiscount(prod: ProductPreview): boolean {
    return !!(prod.salePrice && prod.salePrice < prod.basePrice);
  }

  quickAddToCart(event: Event, prod: ProductPreview) {
    event.stopPropagation();
    event.preventDefault();
    this.ds.addToCart({
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      mrp: prod.basePrice,
      sale_price: prod.salePrice || prod.basePrice,
      basePrice: prod.basePrice,
      salePrice: prod.salePrice ?? undefined,
      stock: 50,
      brand: '3D GALAXY',
      sku: 'SKU-' + prod.id,
      barcode: 'BC-' + prod.id,
      category_id: prod.categoryId || 'cat',
      description: prod.name,
      dealer_price: prod.basePrice,
      reserved: 0,
      images: prod.image ? [prod.image] : [],
      specs: [],
      reviews: [],
      qnas: [],
      featured: false,
      is360Supported: false,
      tags: []
    });
  }

  selectCategory(cat: CategoryNode) {
    this.selectedRootCategory.set(cat);
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
    let list = data.brands;
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(b => b.name.toLowerCase().includes(q));
    }
    const letter = this.selectedBrandLetter();
    if (letter !== 'ALL') {
      list = list.filter(b => b.name.toUpperCase().startsWith(letter));
    }
    return list;
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

  private closeTimeout: any = null;

  onMouseEnter() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.isOpen.set(true);
  }

  onMouseLeave() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }
    this.closeTimeout = setTimeout(() => {
      this.isOpen.set(false);
    }, 250);
  }

  openMenu() {
    this.onMouseEnter();
  }

  closeMenu() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.isOpen.set(false);
  }

  toggleMenu() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.isOpen.set(!this.isOpen());
  }

  navigateToCategory(slug: string) {
    this.router.navigate(['/category', slug]);
  }
}
