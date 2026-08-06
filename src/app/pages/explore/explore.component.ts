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
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { DatastoreService } from '../../services/datastore';
import { ToastService } from '../../shared/components/toast/toast.service';

export interface ExploreProduct {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  image: string;
  hoverImage?: string | null;
  basePrice: number;
  salePrice?: number | null;
  rating: number | null;
  totalReviews?: number;
  stock: number;
  inStock: boolean;
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  hasVariants?: boolean;
}

export interface CategorySectionPayload {
  category: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    image?: string | null;
    banner?: string | null;
    productCount: number;
  };
  products: ExploreProduct[];
}

export interface ExplorePagePayload {
  config: {
    general: {
      enableExplore: boolean;
      theme: string;
      spacing: string;
      animation: string;
    };
    heroBanners: Array<{
      id: string;
      title: string;
      subtitle: string;
      image: string;
      videoUrl?: string;
      buttonText: string;
      buttonLink: string;
      priority: number;
    }>;
    featuredCategoriesConfig: Array<{
      name: string;
      slug: string;
      icon: string;
      description: string;
      image: string;
    }>;
    categorySectionsConfig: {
      productsPerCategory: number;
      layout: string;
    };
    featuredCollections: Array<{
      id: string;
      name: string;
      slug: string;
      description: string;
      image: string;
      count: number;
    }>;
    trendingConfig: {
      mode: string;
      count: number;
    };
    buyingGuides: Array<{
      id: string;
      title: string;
      subtitle: string;
      image: string;
      link: string;
      readTime: string;
    }>;
    bottomCta: {
      title: string;
      subtitle: string;
      primaryButtonText: string;
      primaryButtonLink: string;
      secondaryButtonText: string;
      secondaryButtonLink: string;
    };
    sectionOrder: string[];
  };
  categorySections: CategorySectionPayload[];
  trendingProducts: ExploreProduct[];
  bestSellers: ExploreProduct[];
  newArrivals: ExploreProduct[];
  brands: Array<{
    name: string;
    slug: string;
    productCount: number;
    logo: string;
  }>;
}

@Component({
  selector: 'app-explore-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-[#FDFDFD] dark:bg-[#090C12] text-slate-900 dark:text-slate-100 font-sans selection:bg-orange-500 selection:text-white pb-24">
      
      <!-- SKELETON LOADING STATE -->
      @if (loading()) {
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 animate-pulse">
          <div class="h-[450px] bg-slate-200 dark:bg-slate-800/60 rounded-3xl"></div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            @for (i of [1,2,3,4]; track i) {
              <div class="h-48 bg-slate-200 dark:bg-slate-800/60 rounded-3xl"></div>
            }
          </div>
          <div class="space-y-4">
            <div class="h-10 bg-slate-200 dark:bg-slate-800/60 rounded-xl w-1/4"></div>
            <div class="grid grid-cols-2 md:grid-cols-6 gap-4">
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="h-72 bg-slate-200 dark:bg-slate-800/60 rounded-2xl"></div>
              }
            </div>
          </div>
        </div>
      } @else {

        <!-- 1. HERO BANNER SECTION (AUTO SLIDER WITH GRADIENT OVERLAY & AMBIENT NEON GLOWS) -->
        @if (isSectionEnabled('hero') && heroSlides().length > 0) {
          <section class="relative overflow-hidden bg-slate-950 text-white min-h-[460px] sm:min-h-[540px] flex items-center justify-center border-b border-slate-800/80 shadow-2xl">
            <!-- Background Image Slide -->
            @for (slide of heroSlides(); track slide.id; let idx = $index) {
              @if (currentHeroIndex() === idx) {
                <div class="absolute inset-0 transition-all duration-1000 ease-in-out opacity-100 scale-100">
                  <img [src]="slide.image" [alt]="slide.title" class="w-full h-full object-cover scale-105 animate-kenburns opacity-70" />
                  <div class="absolute inset-0 bg-linear-to-t from-[#090C12] via-slate-950/70 to-transparent"></div>
                  <div class="absolute inset-0 bg-linear-to-r from-[#090C12] via-[#090C12]/70 to-transparent"></div>
                </div>

                <!-- Floating Ambient Glow Elements -->
                <div class="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/25 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
                <div class="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>

                <!-- Slide Content Overlay -->
                <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-16 sm:py-24 space-y-6">
                  <div class="space-y-4 max-w-3xl">
                    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 text-white shadow-xl">
                      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span class="text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-amber-300 font-extrabold">DISCOVERY SPOTLIGHT</span>
                    </div>

                    <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-none text-white font-display drop-shadow-md">
                      {{ slide.title }}
                    </h1>

                    <p class="text-sm sm:text-lg text-slate-300 font-medium leading-relaxed max-w-2xl drop-shadow-xs">
                      {{ slide.subtitle }}
                    </p>
                  </div>

                  <div class="pt-2 flex flex-wrap items-center gap-4">
                    <a
                      [routerLink]="[slide.buttonLink]"
                      class="px-8 py-4 bg-linear-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all no-underline inline-flex items-center gap-2 border border-orange-400/30"
                    >
                      <span>{{ slide.buttonText || 'Explore Now' }}</span>
                      <mat-icon class="text-base">arrow_forward</mat-icon>
                    </a>
                  </div>
                </div>
              }
            }

            <!-- Slide Indicators -->
            @if (heroSlides().length > 1) {
              <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/70 backdrop-blur-xl px-4 py-2 rounded-full border border-white/15 shadow-2xl">
                @for (slide of heroSlides(); track slide.id; let idx = $index) {
                  <button
                    (click)="currentHeroIndex.set(idx)"
                    [class]="currentHeroIndex() === idx ? 'w-8 bg-linear-to-r from-orange-500 to-amber-400 shadow-md shadow-orange-500/50' : 'w-2.5 bg-white/30 hover:bg-white/70'"
                    class="h-2.5 rounded-full transition-all duration-500 cursor-pointer border-none"
                    aria-label="Go to slide"
                  ></button>
                }
              </div>
            }
          </section>
        }

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 mt-12">
          
          <!-- 2. FEATURED CATEGORIES CARDS (GLASSMORPHISM, GLOWING ICON, PRODUCT COUNT, HOVER ZOOM) -->
          @if (isSectionEnabled('featured-categories') && featuredCategories().length > 0) {
            <section class="space-y-6">
              <div class="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
                <div>
                  <h2 class="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-2">
                    <mat-icon class="text-orange-500">grid_view</mat-icon>
                    <span>Featured Categories</span>
                  </h2>
                  <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Browse our top rated 3D printing equipment & materials</p>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                @for (fCat of featuredCategories(); track fCat.name) {
                  <a
                    [routerLink]="['/category', fCat.slug]"
                    class="group/fcat relative rounded-3xl overflow-hidden h-56 sm:h-64 bg-slate-900 text-white p-5 flex flex-col justify-end no-underline shadow-lg hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 hover:-translate-y-2 border border-slate-200/60 dark:border-slate-800/80 cursor-pointer"
                  >
                    <!-- Category Card Image -->
                    <img [src]="fCat.image" [alt]="fCat.name" class="absolute inset-0 w-full h-full object-cover opacity-70 group-hover/fcat:scale-110 transition-transform duration-500" />
                    
                    <!-- Gradient Overlay -->
                    <div class="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/50 to-transparent"></div>
                    <div class="absolute inset-0 bg-orange-500/15 opacity-0 group-hover/fcat:opacity-100 transition-opacity"></div>

                    <!-- Card Info -->
                    <div class="relative z-10 space-y-1.5">
                      <div class="w-9 h-9 rounded-2xl bg-orange-500/20 text-orange-400 backdrop-blur-md border border-orange-500/40 flex items-center justify-center mb-2 group-hover/fcat:scale-110 group-hover/fcat:bg-orange-500 group-hover/fcat:text-white transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                        <mat-icon class="text-base">{{ fCat.icon || 'category' }}</mat-icon>
                      </div>
                      <h3 class="text-xs sm:text-sm font-black uppercase text-white leading-tight group-hover/fcat:text-orange-400 transition-colors">
                        {{ fCat.name }}
                      </h3>
                      <p class="text-[10px] text-slate-300 font-medium line-clamp-1 opacity-90">
                        {{ fCat.description }}
                      </p>
                    </div>
                  </a>
                }
              </div>
            </section>
          }

          <!-- 3. CATEGORY-WISE PRODUCT SECTIONS (FILTER OUT EMPTY CATEGORIES AUTOMATICALLY) -->
          @if (isSectionEnabled('category-sections') && categorySections().length > 0) {
            <div class="space-y-20">
              @for (cSection of categorySections(); track cSection.category.id) {
                @if (cSection.products && cSection.products.length > 0) {
                  <section class="space-y-6">
                    
                    <!-- Category Section Header -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800/80">
                      <div>
                        <div class="flex items-center gap-3">
                          <h2 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-serif">
                            {{ cSection.category.name }}
                          </h2>
                          <span class="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                            {{ cSection.category.productCount }} Items
                          </span>
                        </div>
                        @if (cSection.category.description) {
                          <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                            {{ cSection.category.description }}
                          </p>
                        }
                      </div>

                      <a
                        [routerLink]="['/category', cSection.category.slug]"
                        class="hidden sm:inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 no-underline group/link transition-all"
                      >
                        <span>Explore All</span>
                        <mat-icon class="text-sm group-hover/link:translate-x-1 transition-transform">arrow_forward</mat-icon>
                      </a>
                    </div>

                    <!-- 6-COLUMN PRODUCT GRID WITH GLASSMORPHISM & RATING BADGES -->
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      @for (prod of cSection.products; track prod.id) {
                        <div class="group/card flex flex-col justify-between bg-white dark:bg-[#12161F] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden text-center">
                          
                          <!-- Product Image & Badges -->
                          <div class="relative aspect-square w-full rounded-xl bg-slate-50 dark:bg-[#0D1017] p-2 overflow-hidden mb-3">
                            
                            <!-- Badges (Sold Out / Sale / Discount % OFF) -->
                            <div class="absolute top-2 left-2 z-10 flex flex-col gap-1">
                              @if (!prod.inStock) {
                                <span class="px-2 py-0.5 bg-slate-900/90 text-white text-[9px] font-black uppercase tracking-wider rounded-md backdrop-blur-md">
                                  Sold out
                                </span>
                              }
                              @if (prod.salePrice && prod.salePrice < prod.basePrice) {
                                <span class="px-2 py-0.5 bg-linear-to-r from-rose-500 to-red-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md shadow-xs">
                                  -{{ Math.round(((prod.basePrice - prod.salePrice) / prod.basePrice) * 100) }}% OFF
                                </span>
                              }
                            </div>

                            <!-- Rating Badge Top Right -->
                            @if (prod.rating) {
                              <div class="absolute top-2 right-2 z-10 px-1.5 py-0.5 bg-slate-900/80 text-amber-400 text-[9px] font-bold rounded-md backdrop-blur-md flex items-center gap-0.5 border border-white/10">
                                <mat-icon class="text-[11px] h-3 w-3 leading-none text-amber-400">star</mat-icon>
                                <span>{{ prod.rating }}</span>
                              </div>
                            }

                            <!-- Primary Image & Secondary Hover Image -->
                            <a [routerLink]="['/product', prod.slug]" class="block w-full h-full relative">
                              <img
                                [src]="prod.image"
                                [alt]="prod.name"
                                class="w-full h-full object-contain transition-all duration-300 group-hover/card:scale-108"
                                [ngClass]="{'group-hover/card:opacity-0': prod.hoverImage && prod.hoverImage !== prod.image}"
                              />
                              @if (prod.hoverImage && prod.hoverImage !== prod.image) {
                                <img
                                  [src]="prod.hoverImage"
                                  [alt]="prod.name"
                                  class="absolute inset-0 w-full h-full object-contain opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 group-hover/card:scale-108"
                                />
                              }
                            </a>
                          </div>

                          <!-- Product Details -->
                          <div class="space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                              <a
                                [routerLink]="['/product', prod.slug]"
                                class="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 hover:text-orange-500 transition-colors no-underline leading-snug"
                              >
                                {{ prod.name }}
                              </a>
                            </div>

                            <!-- Price Display -->
                            <div class="pt-1 space-y-0.5">
                              @if (prod.salePrice && prod.salePrice < prod.basePrice) {
                                <div class="text-xs font-black text-orange-600 dark:text-orange-400 font-mono">
                                  Rs. {{ prod.salePrice | number:'1.2-2' }}
                                </div>
                                <div class="text-[10px] text-slate-400 line-through font-mono">
                                  Rs. {{ prod.basePrice | number:'1.2-2' }}
                                </div>
                              } @else {
                                <div class="text-xs font-black text-slate-900 dark:text-white font-mono">
                                  Rs. {{ prod.basePrice | number:'1.2-2' }}
                                </div>
                              }
                            </div>
                          </div>

                        </div>
                      }
                    </div>

                    <!-- Enhanced Centered "View all" Button -->
                    <div class="pt-4 text-center">
                      <a
                        [routerLink]="['/category', cSection.category.slug]"
                        class="inline-flex items-center gap-2 px-8 py-3 bg-linear-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all no-underline cursor-pointer border-none"
                      >
                        <span>View all {{ cSection.category.name }}</span>
                        <mat-icon class="text-sm">arrow_forward</mat-icon>
                      </a>
                    </div>

                  </section>
                }
              }
            </div>
          }

          <!-- 4. FEATURED COLLECTIONS SECTION -->
          @if (isSectionEnabled('collections') && collections().length > 0) {
            <section class="space-y-6">
              <div class="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
                <div>
                  <h2 class="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-2">
                    <mat-icon class="text-amber-500">collections_bookmark</mat-icon>
                    <span>Featured Collections</span>
                  </h2>
                  <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Curated bundles and specialized additive manufacturing collections</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                @for (col of collections(); track col.id) {
                  <a
                    [routerLink]="['/category', col.slug]"
                    class="group/col relative rounded-3xl overflow-hidden h-64 bg-slate-900 text-white p-6 flex flex-col justify-end no-underline shadow-md hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 hover:-translate-y-1.5 border border-slate-200/60 dark:border-slate-800"
                  >
                    <img [src]="col.image" [alt]="col.name" class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/col:scale-110 transition-transform duration-500" />
                    <div class="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

                    <div class="relative z-10 space-y-1.5">
                      <span class="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black bg-orange-500 text-white inline-block shadow-md">
                        {{ col.count }} Items
                      </span>
                      <h3 class="text-base font-black uppercase text-white leading-snug group-hover/col:text-orange-400 transition-colors">
                        {{ col.name }}
                      </h3>
                      <p class="text-xs text-slate-300 font-medium line-clamp-2">
                        {{ col.description }}
                      </p>
                    </div>
                  </a>
                }
              </div>
            </section>
          }

          <!-- 5. TRENDING PRODUCTS CAROUSEL -->
          @if (isSectionEnabled('trending') && payload()?.trendingProducts?.length) {
            <section class="space-y-6">
              <div class="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
                <div>
                  <h2 class="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2 font-display">
                    <mat-icon class="text-rose-500">whatshot</mat-icon>
                    <span>Trending Products</span>
                  </h2>
                  <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Most viewed & high-demand items in the store</p>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                @for (prod of payload()?.trendingProducts?.slice(0, 4); track prod.id) {
                  <div class="group/tcard bg-white dark:bg-[#12161F] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-orange-500/40 hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
                    <div class="relative aspect-square w-full rounded-xl bg-slate-50 dark:bg-[#0D1017] p-2 overflow-hidden mb-3">
                      <span class="absolute top-2 left-2 z-10 px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider rounded-md shadow-xs">
                        🔥 Trending
                      </span>
                      <a [routerLink]="['/product', prod.slug]">
                        <img [src]="prod.image" [alt]="prod.name" class="w-full h-full object-contain group-hover/tcard:scale-105 transition-transform" />
                      </a>
                    </div>

                    <div class="space-y-1">
                      <a [routerLink]="['/product', prod.slug]" class="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 hover:text-orange-500 transition-colors no-underline">
                        {{ prod.name }}
                      </a>
                      <div class="text-xs font-black text-orange-600 dark:text-orange-400 font-mono">
                        Rs. {{ prod.salePrice || prod.basePrice | number:'1.2-2' }}
                      </div>
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          <!-- 6. BRANDS SHOWCASE -->
          @if (isSectionEnabled('brands') && payload()?.brands?.length) {
            <section class="space-y-6">
              <div class="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
                <div>
                  <h2 class="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-2">
                    <mat-icon class="text-orange-500">verified</mat-icon>
                    <span>Partner Brands</span>
                  </h2>
                  <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Official authorized manufacturers & ecosystem brands</p>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                @for (b of payload()?.brands; track b.slug) {
                  <a
                    [routerLink]="['/brand', b.slug]"
                    class="p-4 bg-white dark:bg-[#12161F] hover:bg-orange-500/5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-orange-500/40 text-center space-y-2 transition-all group/brand no-underline cursor-pointer shadow-xs hover:shadow-lg"
                  >
                    <img [src]="b.logo" [alt]="b.name" class="w-12 h-12 rounded-xl object-contain mx-auto group-hover/brand:scale-110 transition-transform" />
                    <div>
                      <h4 class="text-xs font-black uppercase text-slate-900 dark:text-white group-hover/brand:text-orange-500 transition-colors">{{ b.name }}</h4>
                      <span class="text-[9px] text-slate-400 font-mono">{{ b.productCount }} Products</span>
                    </div>
                  </a>
                }
              </div>
            </section>
          }

          <!-- 7. BUYING GUIDES SECTION -->
          @if (isSectionEnabled('buying-guides') && buyingGuides().length > 0) {
            <section class="space-y-6">
              <div class="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
                <div>
                  <h2 class="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-2">
                    <mat-icon class="text-blue-500">auto_stories</mat-icon>
                    <span>3D Printing Buying Guides</span>
                  </h2>
                  <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Expert tutorials, material guides & maintenance documentation</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                @for (g of buyingGuides(); track g.id) {
                  <a
                    [routerLink]="[g.link]"
                    class="group/g p-4 bg-white dark:bg-[#12161F] hover:bg-white dark:hover:bg-[#181C23] rounded-3xl border border-slate-200/80 dark:border-slate-800 hover:border-orange-500/40 transition-all space-y-3 no-underline shadow-xs hover:shadow-xl flex flex-col justify-between"
                  >
                    <div class="space-y-3">
                      <div class="relative h-40 rounded-2xl overflow-hidden bg-slate-900">
                        <img [src]="g.image" [alt]="g.title" class="w-full h-full object-cover group-hover/g:scale-105 transition-transform duration-300" />
                        <span class="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-950/80 text-white text-[9px] font-mono font-bold rounded-md backdrop-blur-md">
                          {{ g.readTime }}
                        </span>
                      </div>

                      <div class="space-y-1">
                        <h3 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase leading-snug group-hover/g:text-orange-500 transition-colors">
                          {{ g.title }}
                        </h3>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {{ g.subtitle }}
                        </p>
                      </div>
                    </div>

                    <div class="pt-2 flex items-center gap-1 text-xs font-black uppercase text-orange-500">
                      <span>Read Guide</span>
                      <mat-icon class="text-sm">arrow_forward</mat-icon>
                    </div>
                  </a>
                }
              </div>
            </section>
          }

          <!-- 8. BOTTOM CTA BANNER -->
          @if (isSectionEnabled('bottom-cta') && payload()?.config?.bottomCta; as cta) {
            <section class="relative rounded-3xl overflow-hidden bg-linear-to-r from-orange-600 via-amber-600 to-yellow-500 text-white p-8 sm:p-12 shadow-xl border border-orange-400/30">
              <div class="relative z-10 max-w-3xl space-y-4">
                <span class="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-md">
                  EXPERT ADVISORY SERVICE
                </span>

                <h2 class="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white leading-tight font-display">
                  {{ cta.title }}
                </h2>

                <p class="text-xs sm:text-sm text-amber-100 font-medium max-w-xl">
                  {{ cta.subtitle }}
                </p>

                <div class="pt-2 flex flex-wrap items-center gap-4">
                  <a
                    [href]="cta.primaryButtonLink"
                    target="_blank"
                    class="px-6 py-3.5 bg-white hover:bg-slate-100 text-orange-600 font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:scale-105 transition-all no-underline inline-flex items-center gap-2"
                  >
                    <mat-icon class="text-base text-emerald-500">chat</mat-icon>
                    <span>{{ cta.primaryButtonText }}</span>
                  </a>

                  <a
                    [routerLink]="[cta.secondaryButtonLink]"
                    class="px-6 py-3.5 bg-slate-950/40 hover:bg-slate-950/60 text-white font-black text-xs uppercase tracking-wider rounded-xl backdrop-blur-md border border-white/20 hover:scale-105 transition-all no-underline inline-flex items-center gap-2"
                  >
                    <mat-icon class="text-base">build_circle</mat-icon>
                    <span>{{ cta.secondaryButtonText }}</span>
                  </a>
                </div>
              </div>
            </section>
          }

        </div>
      }

    </div>
  `,
})
export class ExplorePageComponent implements OnInit, OnDestroy {
  Math = Math;
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  loading = signal<boolean>(true);
  payload = signal<ExplorePagePayload | null>(null);
  currentHeroIndex = signal<number>(0);
  private heroInterval: any = null;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchExploreData();
      this.startHeroAutoSlider();
    }
  }

  ngOnDestroy() {
    if (this.heroInterval) clearInterval(this.heroInterval);
  }

  fetchExploreData() {
    this.api.get<any>('/explore-navigation').subscribe({
      next: (res) => {
        if (res && res.data) {
          this.payload.set(res.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[ExplorePageComponent] Failed to load payload:', err);
        this.loading.set(false);
      },
    });
  }

  startHeroAutoSlider() {
    this.heroInterval = setInterval(() => {
      const slides = this.heroSlides();
      if (slides.length > 1) {
        this.currentHeroIndex.update((curr) => (curr + 1) % slides.length);
      }
    }, 5000);
  }

  // Computed Helpers
  heroSlides = computed(() => {
    return this.payload()?.config?.heroBanners || [];
  });

  featuredCategories = computed(() => {
    return this.payload()?.config?.featuredCategoriesConfig || [];
  });

  categorySections = computed(() => {
    return this.payload()?.categorySections || [];
  });

  collections = computed(() => {
    return this.payload()?.config?.featuredCollections || [];
  });

  buyingGuides = computed(() => {
    return this.payload()?.config?.buyingGuides || [];
  });

  isSectionEnabled(sectionName: string): boolean {
    const order = this.payload()?.config?.sectionOrder;
    if (!order) return true;
    return order.includes(sectionName);
  }
}
