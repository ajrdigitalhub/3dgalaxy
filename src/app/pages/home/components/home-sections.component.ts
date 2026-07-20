import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  Input,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { DomSanitizer } from "@angular/platform-browser";
import { RouterModule, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import {
  DatastoreService,
  Product,
  Category,
} from "../../../services/datastore";
import { ApiService } from "../../../services/api.service";
import { SettingsService } from "../../../core/services/settings.service";
import { CustomerService } from "../../../admin/shared/services/customer.service";
import { ScrollRevealDirective } from "../../../shared/directives/scroll-reveal.directive";
import { TiltDirective } from "../../../shared/directives/tilt.directive";

// Helper function for converting value to number
function asNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

@Component({
  selector: "app-home-showcase-two",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, ScrollRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [id]="section.id"
      class="max-w-7xl mx-auto px-6"
      appScrollReveal="fade"
    >
      <div
        class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-8 md:p-12 lg:py-16"
      >
        <div
          class="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center"
        >
          <div
            class="col-span-1 md:col-span-7 space-y-6 text-left order-2 md:order-1"
            appScrollReveal="slide-up"
          >
            <div class="space-y-1">
              <span
                class="text-[10px] font-extrabold uppercase tracking-[0.25em] text-neutral-400 select-text"
                >{{ section.config["brand"] || "CREALITY" }}</span
              >
              <h2
                class="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tighter leading-none font-display select-text"
              >
                {{ section.config["name"] || "Creality Sparx i7 Combo" }}
              </h2>
            </div>
            <p
              class="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed font-normal max-w-xl"
              [innerHTML]="
                safeHtml(
                  section.config['description'] ||
                    'Professional grade dual extrusion setup engineered for high efficiency, high speed fabrication runs.'
                )
              "
            ></p>
            <div class="flex flex-wrap items-center gap-4">
              <span
                class="text-2xl font-black text-neutral-900 dark:text-white"
                >{{ salePrice() | currency: "INR" : "symbol" : "1.0-0" }}</span
              >
              <span class="text-sm text-neutral-400 line-through font-medium">{{
                mrp() | currency: "INR" : "symbol" : "1.0-0"
              }}</span>
            </div>
            <div class="pt-2">
              <button
                (click)="addToCartById('prod-6')"
                class="h-12 px-8 bg-[#f54f00] hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.03] transition-all shadow-md shadow-orange-500/10 flex items-center gap-2 cursor-pointer"
              >
                <span>BUY NOW</span>
                <mat-icon class="scale-95">shopping_cart</mat-icon>
              </button>
            </div>
          </div>
          <div
            class="col-span-1 md:col-span-5 flex justify-center order-1 md:order-2"
            appScrollReveal="scale-in"
          >
            <img
              [src]="
                section.config['image'] ||
                'https://store.bambulab.com/cdn/shop/files/X1C_Combo_800x800.png'
              "
              alt="Creality Sparx i7 Combo"
              class="max-h-[340px] md:max-h-[380px] object-contain hover:scale-105 transition-transform duration-500"
              referrerpolicy="no-referrer"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HomeShowcaseTwoComponent {
  ds = inject(DatastoreService);
  private sanitizer = inject(DomSanitizer);

  private _section = signal<any>(null);
  @Input() set section(val: any) {
    this._section.set(val);
  }
  get section() {
    return this._section();
  }

  salePrice = computed(() =>
    asNumber(this._section()?.config?.["salePrice"] || 75000),
  );
  mrp = computed(() => asNumber(this._section()?.config?.["mrp"] || 90000));

  safeHtml(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html || "");
  }

  addToCartById(id: string) {
    this.ds.addToCartById(id);
  }
}

@Component({
  selector: "app-home-category-view-filament",
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isVisible()) {
      <section
        [id]="section.id"
        class="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center space-y-12 select-none"
        appScrollReveal="fade"
      >
        <div class="text-center space-y-2">
          <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-650 font-display">
            {{ section.config["subtitle"] || "Premium Collection" }}
          </h2>
          <h3 class="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tighter font-display uppercase font-serif">
            {{ category()?.name || section.config["title"] || "Filament" }}
          </h3>
        </div>

        <!-- Products Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8 w-full">
          @for (p of products(); track p.id) {
            <a
              [routerLink]="['/product', p.slug]"
              class="group flex flex-col items-center justify-between text-center select-none cursor-pointer h-full"
            >
              <!-- Image container -->
              <div class="relative w-full aspect-square bg-transparent rounded-2xl overflow-hidden flex items-center justify-center p-3 mb-3 group-hover:scale-105 transition-transform duration-300 product-card-image-container">
                <img
                  [src]="p.primaryImage || (p.images && p.images[0]) || 'https://via.placeholder.com/400'"
                  [alt]="p.name"
                  class="max-w-full max-h-full object-contain primary-image absolute inset-0 m-auto"
                />
                @if (p.secondaryImage && p.secondaryImage !== (p.primaryImage || (p.images && p.images[0]))) {
                  <img
                    [src]="p.secondaryImage"
                    [alt]="p.name + ' Alternate'"
                    class="max-w-full max-h-full object-contain secondary-image absolute inset-0 m-auto"
                  />
                }
                @if (p.stock <= 0) {
                  <span class="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-black text-white text-[8px] font-black uppercase tracking-wider rounded-md shadow-md z-10">
                    Sold out
                  </span>
                }
              </div>

              <!-- Title & Price -->
              <div class="flex-1 flex flex-col justify-between w-full px-1">
                <h4 class="text-xs font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-snug group-hover:text-orange-500 transition-colors">
                  {{ p.name }}
                </h4>
                <p class="text-xs font-black text-[#d65108] dark:text-orange-400 mt-2 font-mono">
                  {{ formatPrice(p) }}
                </p>
              </div>
            </a>
          }
        </div>

        <div class="pt-4">
          <button
            (click)="selectFilterCategory(category()?.slug || 'materials')"
            class="h-11 px-8 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-md cursor-pointer border-none rounded-none font-sans min-w-[150px]"
          >
            {{ section.config["buttonText"] || "View all" }}
          </button>
        </div>
      </section>
    }
  `,
})
export class HomeCategoryViewFilamentComponent {
  ds = inject(DatastoreService);
  router = inject(Router);
  @Input() section!: any;

  category = computed(() => {
    return this.ds.categories().find(c => c.slug === 'materials' || c.id === 'materials');
  });

  isVisible = computed(() => {
    return this.category()?.isActive !== false && this.category()?.isFeatured !== false;
  });

  isDealerPriceActive = computed(() => {
    const r = this.ds.userRole();
    return (
      r === "admin" ||
      r === "super-admin" ||
      (this.ds.activeUser()?.rewardPoints || 0) > 300
    );
  });

  products = computed(() => {
    const cat = this.category();
    if (!cat) return [];
    
    const categories = this.ds.categories();
    const childIds = categories
      .filter((c) => c.parentId === cat.id || c.parent_id === cat.id)
      .map((c) => c.id);
    const targetIds = [cat.id, ...childIds];
    
    return this.ds.products()
      .filter((p) => targetIds.includes(p.categoryId || p.category_id || p.category?.id || ''))
      .slice(0, 6);
  });

  formatPrice(p: any): string {
    const isDealer = this.isDealerPriceActive();
    const price = isDealer
      ? p.dealer_price || p.sale_price || p.mrp
      : p.sale_price || p.mrp;
      
    const hasVariants = p.variants && p.variants.length > 0;
    const formatted = Number(price).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    const prefix = hasVariants ? 'From ' : '';
    return `${prefix}Rs. ${formatted}`;
  }

  selectFilterCategory(cat: string) {
    this.router.navigate(["/products"], { queryParams: { category: cat } });
  }
}

@Component({
  selector: "app-home-category-view-spare-parts",
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isVisible()) {
      <section
        [id]="section.id"
        class="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center space-y-12 select-none"
        appScrollReveal="fade"
      >
        <div class="text-center space-y-2">
          <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-650 font-display">
            {{ section.config["subtitle"] || "Premium Components" }}
          </h2>
          <h3 class="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tighter font-display uppercase font-serif">
            {{ category()?.name || section.config["title"] || "Spare Parts" }}
          </h3>
        </div>

        <!-- Products Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8 w-full">
          @for (p of products(); track p.id) {
            <a
              [routerLink]="['/product', p.slug]"
              class="group flex flex-col items-center justify-between text-center select-none cursor-pointer h-full"
            >
              <!-- Image container -->
              <div class="relative w-full aspect-square bg-transparent rounded-2xl overflow-hidden flex items-center justify-center p-3 mb-3 group-hover:scale-105 transition-transform duration-300 product-card-image-container">
                <img
                  [src]="p.primaryImage || (p.images && p.images[0]) || 'https://via.placeholder.com/400'"
                  [alt]="p.name"
                  class="max-w-full max-h-full object-contain primary-image absolute inset-0 m-auto"
                />
                @if (p.secondaryImage && p.secondaryImage !== (p.primaryImage || (p.images && p.images[0]))) {
                  <img
                    [src]="p.secondaryImage"
                    [alt]="p.name + ' Alternate'"
                    class="max-w-full max-h-full object-contain secondary-image absolute inset-0 m-auto"
                  />
                }
                @if (p.stock <= 0) {
                  <span class="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-black text-white text-[8px] font-black uppercase tracking-wider rounded-md shadow-md z-10">
                    Sold out
                  </span>
                }
              </div>

              <!-- Title & Price -->
              <div class="flex-1 flex flex-col justify-between w-full px-1">
                <h4 class="text-xs font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-snug group-hover:text-orange-500 transition-colors">
                  {{ p.name }}
                </h4>
                <p class="text-xs font-black text-[#d65108] dark:text-orange-400 mt-2 font-mono">
                  {{ formatPrice(p) }}
                </p>
              </div>
            </a>
          }
        </div>

        <div class="pt-4">
          <button
            (click)="selectFilterCategory(category()?.slug || 'spare-parts')"
            class="h-11 px-8 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-md cursor-pointer border-none rounded-none font-sans min-w-[150px]"
          >
            {{ section.config["buttonText"] || "View all" }}
          </button>
        </div>
      </section>
    }
  `,
})
export class HomeCategoryViewSparePartsComponent {
  ds = inject(DatastoreService);
  router = inject(Router);
  @Input() section!: any;

  category = computed(() => {
    return this.ds.categories().find(c => c.slug === 'spare-parts' || c.id === 'spare-parts');
  });

  isVisible = computed(() => {
    return this.category()?.isActive !== false && this.category()?.isFeatured !== false;
  });

  isDealerPriceActive = computed(() => {
    const r = this.ds.userRole();
    return (
      r === "admin" ||
      r === "super-admin" ||
      (this.ds.activeUser()?.rewardPoints || 0) > 300
    );
  });

  products = computed(() => {
    const cat = this.category();
    if (!cat) return [];
    
    const categories = this.ds.categories();
    const childIds = categories
      .filter((c) => c.parentId === cat.id || c.parent_id === cat.id)
      .map((c) => c.id);
    const targetIds = [cat.id, ...childIds];
    
    return this.ds.products()
      .filter((p) => targetIds.includes(p.categoryId || p.category_id || p.category?.id || ''))
      .slice(0, 6);
  });

  formatPrice(p: any): string {
    const isDealer = this.isDealerPriceActive();
    const price = isDealer
      ? p.dealer_price || p.sale_price || p.mrp
      : p.sale_price || p.mrp;
      
    const hasVariants = p.variants && p.variants.length > 0;
    const formatted = Number(price).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    const prefix = hasVariants ? 'From ' : '';
    return `${prefix}Rs. ${formatted}`;
  }

  selectFilterCategory(cat: string) {
    this.router.navigate(["/products"], { queryParams: { category: cat } });
  }
}

@Component({
  selector: "app-home-category-view-3d-printer",
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isVisible()) {
      <section
        [id]="section.id"
        class="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center space-y-12 select-none"
        appScrollReveal="fade"
      >
        <div class="text-center space-y-2">
          <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-650 font-display">
            {{ section.config["subtitle"] || "Flagship Systems" }}
          </h2>
          <h3 class="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tighter font-display uppercase font-serif">
            {{ category()?.name || section.config["title"] || "3D Printers" }}
          </h3>
        </div>

        <!-- Products Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8 w-full">
          @for (p of products(); track p.id) {
            <a
              [routerLink]="['/product', p.slug]"
              class="group flex flex-col items-center justify-between text-center select-none cursor-pointer h-full"
            >
              <!-- Image container -->
              <div class="relative w-full aspect-square bg-transparent rounded-2xl overflow-hidden flex items-center justify-center p-3 mb-3 group-hover:scale-105 transition-transform duration-300 product-card-image-container">
                <img
                  [src]="p.primaryImage || (p.images && p.images[0]) || 'https://via.placeholder.com/400'"
                  [alt]="p.name"
                  class="max-w-full max-h-full object-contain primary-image absolute inset-0 m-auto"
                />
                @if (p.secondaryImage && p.secondaryImage !== (p.primaryImage || (p.images && p.images[0]))) {
                  <img
                    [src]="p.secondaryImage"
                    [alt]="p.name + ' Alternate'"
                    class="max-w-full max-h-full object-contain secondary-image absolute inset-0 m-auto"
                  />
                }
                @if (p.stock <= 0) {
                  <span class="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-black text-white text-[8px] font-black uppercase tracking-wider rounded-md shadow-md z-10">
                    Sold out
                  </span>
                }
              </div>

              <!-- Title & Price -->
              <div class="flex-1 flex flex-col justify-between w-full px-1">
                <h4 class="text-xs font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-snug group-hover:text-orange-500 transition-colors">
                  {{ p.name }}
                </h4>
                <p class="text-xs font-black text-[#d65108] dark:text-orange-400 mt-2 font-mono">
                  {{ formatPrice(p) }}
                </p>
              </div>
            </a>
          }
        </div>

        <div class="pt-4">
          <button
            (click)="selectFilterCategory(category()?.slug || '3d-printers')"
            class="h-11 px-8 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-md cursor-pointer border-none rounded-none font-sans min-w-[150px]"
          >
            {{ section.config["buttonText"] || "View all" }}
          </button>
        </div>
      </section>
    }
  `,
})
export class HomeCategoryView3DPrinterComponent {
  ds = inject(DatastoreService);
  router = inject(Router);
  @Input() section!: any;

  category = computed(() => {
    return this.ds.categories().find(c => c.slug === '3d-printers' || c.id === '3d-printers');
  });

  isVisible = computed(() => {
    return this.category()?.isActive !== false && this.category()?.isFeatured !== false;
  });

  isDealerPriceActive = computed(() => {
    const r = this.ds.userRole();
    return (
      r === "admin" ||
      r === "super-admin" ||
      (this.ds.activeUser()?.rewardPoints || 0) > 300
    );
  });

  products = computed(() => {
    const cat = this.category();
    if (!cat) return [];
    
    const categories = this.ds.categories();
    const childIds = categories
      .filter((c) => c.parentId === cat.id || c.parent_id === cat.id)
      .map((c) => c.id);
    const targetIds = [cat.id, ...childIds];
    
    return this.ds.products()
      .filter((p) => targetIds.includes(p.categoryId || p.category_id || p.category?.id || ''))
      .slice(0, 6);
  });

  formatPrice(p: any): string {
    const isDealer = this.isDealerPriceActive();
    const price = isDealer
      ? p.dealer_price || p.sale_price || p.mrp
      : p.sale_price || p.mrp;
      
    const hasVariants = p.variants && p.variants.length > 0;
    const formatted = Number(price).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    const prefix = hasVariants ? 'From ' : '';
    return `${prefix}Rs. ${formatted}`;
  }

  selectFilterCategory(cat: string) {
    this.router.navigate(["/products"], { queryParams: { category: cat } });
  }
}

@Component({
  selector: "app-home-newsletter",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-4xl mx-auto px-6 py-12">
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 to-orange-950 p-8 md:p-12 shadow-2xl border border-zinc-800/50 text-center">
        <!-- Decorative Glow Blur -->
        <div class="absolute -right-20 -top-20 w-60 h-60 bg-orange-600/20 rounded-full blur-3xl"></div>
        <div class="absolute -left-20 -bottom-20 w-60 h-60 bg-orange-600/10 rounded-full blur-3xl"></div>

        <div class="relative z-10 space-y-6 max-w-2xl mx-auto">
          <div class="inline-flex items-center justify-center p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20 text-orange-500 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
            </svg>
          </div>
          
          <div class="space-y-2">
            <h2 class="text-3xl md:text-4xl font-black text-white tracking-tight font-display">
              {{ section.config['title'] || 'Stay Updated with 3DGalaxy' }}
            </h2>
            <p class="text-zinc-300 text-sm md:text-base font-medium max-w-lg mx-auto">
              {{ section.config['description'] || 'Get exclusive offers, new product launches, printing tips, and member-only discounts.' }}
            </p>
          </div>

          <!-- Subscription Form -->
          <div class="subscription-form max-w-md mx-auto" *ngIf="!isSubscribed()">
            <div class="flex flex-col sm:flex-row gap-3">
              <input 
                #emailInput 
                type="email" 
                placeholder="Enter your email address" 
                class="flex-1 px-5 py-3.5 bg-zinc-800/80 border border-zinc-700/50 rounded-2xl text-white font-medium placeholder-zinc-500 outline-none focus:border-orange-500 focus:ring-3 focus:ring-orange-500/15 transition-all text-sm"
              />
              <button 
                (click)="subscribe(emailInput)"
                [disabled]="isLoading()"
                class="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all text-sm shrink-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span class="spinner-mini" *ngIf="isLoading()"></span>
                {{ isLoading() ? 'Subscribing...' : 'Subscribe' }}
              </button>
            </div>
            <p class="text-left text-[11px] text-zinc-500 mt-3 font-semibold flex items-start gap-1.5 leading-relaxed">
              <input type="checkbox" checked disabled class="mt-0.5 accent-orange-500" />
              <span>By subscribing, you agree to receive promotional updates and accept our Terms of Service & Privacy Policy.</span>
            </p>
          </div>

          <!-- Success State -->
          <div class="success-card space-y-3 py-4 animate-bounce" *ngIf="isSubscribed()">
            <div class="inline-flex items-center justify-center w-12 h-12 bg-green-500/10 text-green-500 rounded-full border border-green-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-white">Thank You for Subscribing!</h3>
            <p class="text-zinc-300 text-sm">You have been successfully added to our mailing list.</p>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HomeNewsletterComponent {
  private customerService = inject(CustomerService);
  @Input() section!: any;

  isLoading = signal(false);
  isSubscribed = signal(false);

  subscribe(input: HTMLInputElement) {
    const email = input.value?.trim();
    if (!email) return;

    this.isLoading.set(true);
    this.customerService.subscribeNewsletter({ email }).subscribe({
      next: (res) => {
        if (res.success) {
          this.isSubscribed.set(true);
          input.value = "";
          setTimeout(() => {
            this.isSubscribed.set(false);
          }, 6000);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
}

@Component({
  selector: "app-home-shop-by-category",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    ScrollRevealDirective,
    TiltDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [id]="section.id"
      class="max-w-7xl mx-auto px-6 space-y-12"
      appScrollReveal="fade"
    >
      <div class="text-center space-y-2">
        <h2
          class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600 font-display"
        >
          {{ section.config["subtitle"] || "Browse Collections" }}
        </h2>
        <h3
          class="text-3xl font-black text-neutral-900 dark:text-white tracking-tighter font-display"
        >
          {{ section.config["title"] || "Shop By Category" }}
        </h3>
      </div>

      <div class="space-y-16">
        @for (
          group of shopByCategoryGroups();
          track group.category.id;
          let idx = $index
        ) {
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            <!-- Large Featured Category Hero Card -->
            <div
              class="lg:col-span-5 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 rounded-[3rem] overflow-hidden relative group p-8 md:p-12 flex flex-col justify-end min-h-[520px] lg:min-h-[580px] border border-neutral-800/80 shadow-2xl"
              [class.lg:order-2]="idx % 2 !== 0"
              appScrollReveal="scale-in"
            >
              <!-- Featured Category Background Image -->
              <div class="absolute inset-0 w-full h-full overflow-hidden">
                <img
                  [src]="
                    group.category.image ||
                    group.category.banner ||
                    'https://images.unsplash.com/photo-1631035626723-cd8e9ef9e728?auto=format&fit=crop&q=80&w=1200'
                  "
                  [alt]="group.category.name"
                  class="w-full h-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-105"
                  referrerpolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/75 to-neutral-950/20 pointer-events-none"
                ></div>
              </div>

              <div class="relative z-10 space-y-4 text-left">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/20 border border-orange-500/40 text-orange-400 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                  <mat-icon class="text-xs">star</mat-icon>
                  FEATURED CATEGORY
                </span>

                <h4
                  class="text-4xl md:text-5xl font-black text-white tracking-tight uppercase font-display drop-shadow-md"
                >
                  {{ group.category.name }}
                </h4>
                <p
                  class="text-neutral-300 text-sm md:text-base leading-relaxed max-w-md line-clamp-3 font-medium"
                >
                  {{
                    group.category.description ||
                      "Explore our full range of genuine, high-performance " +
                        group.category.name +
                        " curated for industrial and creative projects."
                  }}
                </p>
                <a
                  [routerLink]="['/category', group.category.slug || group.category.id]"
                  class="inline-flex h-13 px-8 bg-[#f54f00] hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest items-center gap-3 transition-all duration-300 shadow-xl shadow-orange-500/20 hover:scale-[1.03]"
                >
                  <span>EXPLORE COLLECTION</span>
                  <mat-icon class="scale-90">arrow_forward</mat-icon>
                </a>
              </div>
            </div>

            <!-- Medium Products Cards Grid -->
            <div
              class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6"
              [class.lg:order-1]="idx % 2 !== 0"
              appScrollReveal="fade"
            >
              @for (p of group.products; track p.id; let subIdx = $index) {
                <a
                  [routerLink]="['/product', p.slug]"
                  appScrollReveal="slide-up"
                  [delay]="subIdx * 100"
                  appTilt
                  [tiltMax]="5"
                  class="bg-white dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800/60 rounded-3xl p-5 flex items-center gap-5 hover:shadow-[0_12px_40px_rgba(214,81,8,0.08)] hover:border-orange-500/30 hover:-translate-y-1 transition-all duration-300 group/item"
                >
                  <div
                    class="w-32 h-32 md:w-36 md:h-36 bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl flex items-center justify-center p-2 shrink-0 overflow-hidden border border-neutral-100 dark:border-neutral-800/30 product-card-image-container relative"
                  >
                    <img
                      [src]="p.primaryImage"
                      [alt]="p.name"
                      class="max-w-full max-h-full object-contain primary-image absolute inset-0 m-auto transform group-hover/item:scale-110 transition-transform duration-700 ease-out"
                      referrerpolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                    @if (p.secondaryImage) {
                      <img
                        [src]="p.secondaryImage"
                        [alt]="p.name"
                        class="max-w-full max-h-full object-contain secondary-image absolute inset-0 m-auto transform group-hover/item:scale-105 transition-transform duration-700 ease-out"
                        referrerpolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                      />
                    }
                  </div>
                  <div
                    class="flex-1 min-w-0 flex flex-col justify-center space-y-1.5 text-left"
                  >
                    <span
                      class="text-[9px] font-extrabold uppercase tracking-widest text-[#d65108] truncate"
                      >{{ p.brandName || p.brand || '3D GALAXY' }}</span
                    >
                    <h5
                      class="text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug group-hover/item:text-[#d65108] transition-colors"
                    >
                      {{ p.name }}
                    </h5>
                    <div class="pt-2 flex items-center justify-between">
                      <span class="text-sm font-black dark:text-white">{{
                        p.activePrice | currency: "INR" : "symbol" : "1.0-0"
                      }}</span>
                      <div
                        class="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-neutral-400 group-hover/item:bg-[#d65108] group-hover/item:text-white transition-colors duration-300"
                      >
                        <mat-icon class="scale-75">arrow_forward</mat-icon>
                      </div>
                    </div>
                  </div>
                </a>
              }
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class HomeShopByCategoryComponent {
  ds = inject(DatastoreService);
  settingsService = inject(SettingsService);
  @Input() section!: any;

  isDealerPriceActive = computed(() => {
    const r = this.ds.userRole();
    return (
      r === "admin" ||
      r === "super-admin" ||
      (this.ds.activeUser()?.rewardPoints || 0) > 300
    );
  });

  selectedCategorySlugs = computed(() => {
    const homeSections = this.settingsService.homepageSections();
    if (homeSections == null || typeof homeSections !== "object") return [];
    const featuredCategories = (homeSections as any).featuredCategories;
    if (!Array.isArray(featuredCategories)) return [];
    return featuredCategories
      .map((category: any) =>
        String(category || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);
  });

  featuredCategoryObjects = computed(() => {
    const categories = this.ds.categories();
    const selectedSlugs = this.selectedCategorySlugs();

    let featured: Category[] = [];

    // 1. Check settingsService homepageSections.featuredCategories
    if (selectedSlugs.length > 0) {
      featured = selectedSlugs
        .map((slug) =>
          categories.find(
            (c) =>
              String(c.slug).toLowerCase() === slug ||
              String(c.id).toLowerCase() === slug ||
              String(c.name).toLowerCase() === slug
          )
        )
        .filter(Boolean) as Category[];
    }

    // 2. Check categories where isFeatured === true in database
    if (featured.length === 0) {
      featured = categories.filter(
        (c) =>
          c.isFeatured === true ||
          (c as any).is_featured === true ||
          (c as any).is_featured === "true" ||
          (c as any).isFeatured === "true"
      );
    }

    // 3. Fallback to all root categories (no parentId)
    if (featured.length === 0) {
      featured = categories.filter((c) => {
        const pId = c.parentId || c.parent_id;
        return !pId || pId === "null" || pId === "undefined";
      });
    }

    // 4. Final fallback if still empty: return all categories
    if (featured.length === 0) {
      featured = categories;
    }

    return featured;
  });

  shopByCategoryGroups = computed(() => {
    const products = this.ds.products();
    const categories = this.ds.categories();
    const featuredCats = this.featuredCategoryObjects();
    const isDealer = this.isDealerPriceActive();

    const groups = [];

    for (const category of featuredCats) {
      const getDescendantIds = (parentId: string): string[] => {
        const children = categories.filter(
          (c) => (c.parentId || c.parent_id) === parentId
        );
        let ids: string[] = [parentId];
        for (const child of children) {
          ids = ids.concat(getDescendantIds(child.id));
        }
        return ids;
      };

      const targetIds = getDescendantIds(category.id);

      let catProducts = products
        .filter((p) => {
          const pCatId = p.categoryId || p.category_id || p.category?.id || "";
          const pCatSlug = p.category?.slug || "";
          return (
            targetIds.includes(pCatId) ||
            targetIds.includes(pCatSlug) ||
            pCatSlug === category.slug ||
            pCatId === category.id
          );
        })
        .sort((a, b) => {
          const aScore =
            ((a as any).salesCount || 0) +
            (a.reviews?.length || 0) +
            (a.avgRating || 0);
          const bScore =
            ((b as any).salesCount || 0) +
            (b.reviews?.length || 0) +
            (b.avgRating || 0);
          return (
            bScore - aScore ||
            String(a.name || "").localeCompare(String(b.name || ""))
          );
        });

      if (catProducts.length === 0 && products.length > 0) {
        catProducts = products.slice(0, 4);
      } else {
        catProducts = catProducts.slice(0, 4);
      }

      const formattedProducts = catProducts.map((p) => {
        const prim =
          p.primaryImage ||
          (Array.isArray(p.images) && (p.images[0]?.url || p.images[0])) ||
          "https://via.placeholder.com/400x400?text=3D+Galaxy";

        let sec = p.secondaryImage;
        if (!sec || sec === prim) {
          if (Array.isArray(p.images) && p.images.length > 1) {
            sec = typeof p.images[1] === "string" ? p.images[1] : p.images[1]?.url;
          }
        }

        return {
          ...p,
          primaryImage: prim,
          secondaryImage: sec && sec !== prim ? sec : null,
          brandName: typeof p.brand === "object" ? (p.brand as any)?.name : p.brand,
          activePrice: isDealer
            ? p.dealerPrice || p.dealer_price || p.salePrice || p.sale_price || p.basePrice || (p as any).price || p.mrp || 0
            : p.salePrice || p.sale_price || p.basePrice || (p as any).price || p.mrp || 0,
        };
      });

      groups.push({ category, products: formattedProducts });
    }

    return groups;
  });
}

@Component({
  selector: "app-home-technology-hubs",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    ScrollRevealDirective,
    TiltDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [id]="section.id"
      class="max-w-7xl mx-auto px-6 space-y-12"
      appScrollReveal="fade"
    >
      <div class="text-center space-y-2 max-w-2xl mx-auto">
        <h2
          class="text-[10px] font-black uppercase tracking-[0.4em] text-[#d65108] font-display"
        >
          {{ section.config["subtitle"] || "The Laboratory" }}
        </h2>
        <h3
          class="text-3xl font-black text-neutral-900 dark:text-white tracking-tighter leading-tight font-display"
        >
          {{ section.config["title"] || "Shop by Technology" }}
        </h3>
        <p class="text-neutral-500 dark:text-neutral-400 text-sm">
          Expertly matched systems for diverse rapid physical manufacturing
          criteria.
        </p>
      </div>

      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        @for (tech of technologies; track tech.id; let idx = $index) {
          <div
            appScrollReveal="slide-up"
            [delay]="idx * 100"
            appTilt
            [tiltMax]="5"
            class="relative group h-[420px] rounded-[2rem] overflow-hidden border border-neutral-200 dark:border-neutral-800/40 bg-neutral-100 dark:bg-neutral-900"
          >
            <img
              [src]="tech.image"
              [alt]="tech.name"
              class="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              referrerpolicy="no-referrer"
              loading="lazy"
              decoding="async"
            />
            <div
              class="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-900/40 to-transparent"
            ></div>

            <div
              class="absolute inset-0 p-8 flex flex-col justify-between z-10 text-left"
            >
              <div
                class="h-12 w-12 bg-white/25 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-white"
              >
                <mat-icon class="scale-110">{{ tech.icon }}</mat-icon>
              </div>
              <div class="space-y-3">
                <h4 class="text-2xl font-black text-white tracking-tight">
                  {{ tech.name }}
                </h4>
                <p class="text-neutral-300 text-xs font-normal leading-relaxed">
                  {{ tech.desc }}
                </p>
                <a
                  [routerLink]="[
                    '/category',
                    tech.id === 'industrial' ? '3d-printers' : tech.id,
                  ]"
                  class="flex items-center justify-center h-11 w-full bg-white text-neutral-900 hover:bg-orange-600 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 select-text cursor-pointer"
                >
                  EXPLORE STACK
                </a>
              </div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class HomeTechnologyHubsComponent {
  ds = inject(DatastoreService);
  @Input() section!: any;

  technologies = [
    {
      id: "fdm",
      icon: "animation",
      name: "FDM Printing",
      desc: "Desktop & industrial fused deposition modeling for rapid prototyping.",
      image:
        "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "resin",
      icon: "opacity",
      name: "Resin Printing",
      desc: "High-precision SLA/DLP/LCD for jewelry, dental, and miniatures.",
      image:
        "https://images.unsplash.com/photo-1551021210-994c6498a44b?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "industrial",
      icon: "precision_manufacturing",
      name: "Industrial",
      desc: "Large scale manufacturing for automotive and aerospace sectors.",
      image:
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "edu",
      icon: "school",
      name: "Educational",
      desc: "STEM approved units for schools, universities, and makerspaces.",
      image:
        "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800",
    },
  ];
}

@Component({
  selector: "app-home-enterprise-solutions",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    ScrollRevealDirective,
    TiltDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [id]="section.id"
      appScrollReveal="fade"
      class="relative py-24 bg-neutral-900 rounded-[3rem] border border-neutral-800/40 overflow-hidden mx-6 text-left"
    >
      <div
        class="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-500/5 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2"
      ></div>
      <div
        class="relative z-10 max-w-7xl mx-auto px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
      >
        <div
          class="lg:col-span-4 space-y-8 col-span-1"
          appScrollReveal="slide-up"
        >
          <div class="space-y-3">
            <h2
              class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500 font-display"
            >
              {{ section.config["subtitle"] || "Enterprise Protocol" }}
            </h2>
            <h3
              class="text-5xl font-black text-white tracking-tighter leading-tight font-display"
            >
              {{ section.config["title"] || "Industrial Solutions" }}
            </h3>
            <p class="text-neutral-400 text-sm leading-relaxed">
              Unified 3D setups, industrial consulting, dental molds, and
              robotic kits formulated for scaling companies.
            </p>
          </div>
          <a
            [routerLink]="['/printing-service']"
            class="inline-flex h-12 px-8 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-widest items-center gap-3 hover:scale-105 transition-all"
          >
            BOOK CONSULTATION
            <mat-icon class="scale-90">support_agent</mat-icon>
          </a>
        </div>
        <div
          class="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6"
          appScrollReveal="fade"
        >
          @for (s of solutions; track s.name; let idx = $index) {
            <div
              appScrollReveal="slide-up"
              [delay]="idx * 100"
              appTilt
              [tiltMax]="5"
              class="p-6 bg-neutral-950/70 border border-white/5 rounded-2xl hover:border-orange-500/30 transition-all group text-left"
            >
              <div
                class="h-12 w-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 mb-6 transition-transform group-hover:scale-110"
              >
                <mat-icon class="scale-110">{{ s.icon }}</mat-icon>
              </div>
              <h4 class="text-xl font-bold text-white mb-2">{{ s.name }}</h4>
              <p
                class="text-neutral-500 text-xs font-normal leading-relaxed mb-4"
              >
                {{ s.desc }}
              </p>
              <a
                routerLink="/printing-service"
                class="text-[10px] font-black uppercase tracking-widest text-[#d65108] hover:text-orange-400 flex items-center gap-2"
              >
                LEARN MORE
                <mat-icon class="text-sm scale-75">arrow_forward</mat-icon>
              </a>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class HomeEnterpriseSolutionsComponent {
  ds = inject(DatastoreService);
  @Input() section!: any;

  solutions = [
    {
      name: "Education",
      icon: "school",
      desc: "Transform learning with immersive 3D technology.",
    },
    {
      name: "Manufacturing",
      icon: "factory",
      desc: "Scale production with rapid batch capabilities.",
    },
    {
      name: "Medical",
      icon: "medical_services",
      desc: "Bespoke surgical guides and patient-specific models.",
    },
    {
      name: "Architecture",
      icon: "architecture",
      desc: "Translate complex blueprints into tactile models.",
    },
  ];
}

// @Component({
//   selector: 'app-home-launch-spotlight',
//   standalone: true,
//   imports: [CommonModule, MatIconModule, ScrollRevealDirective, TiltDirective],
//   changeDetection: ChangeDetectionStrategy.OnPush,
//   template: `
//     <section [id]="section.id" class="w-full overflow-hidden bg-neutral-950 text-white py-24 border-y border-neutral-900 relative">
//       <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
//       <div class="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none z-0"></div>

//       <div class="max-w-7xl mx-auto px-6 relative z-10">
//         <div class="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
//           <div class="lg:col-span-6 space-y-8 text-left" appScrollReveal="slide-up">
//             <div class="space-y-4">
//               <span class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500">Flagship Showcase</span>
//               <h2 class="text-5xl lg:text-7xl font-black tracking-tighter leading-[1.05] font-display">
//                 Bambu Lab<br><span class="text-theme-gradient">X1-Carbon</span>
//               </h2>
//               <p class="text-neutral-400 text-base leading-relaxed max-w-lg font-medium">
//                 Designed for ultimate speed, precision, and multi-material engineering. Experience automated printing with active vibration compensation, AI extrusion monitoring, and 16-color compatibility.
//               </p>
//             </div>

//             <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <div appTilt [tiltMax]="5" class="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-4 hover:border-orange-500/30 transition-all duration-300">
//                 <div class="h-10 w-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-400 shrink-0">
//                   <mat-icon class="scale-90">auto_awesome</mat-icon>
//                 </div>
//                 <div class="space-y-1">
//                   <h4 class="text-sm font-black text-white leading-none">AI LIDAR Sensor</h4>
//                   <p class="text-[11px] text-neutral-500">First-layer inspection & flow calibration automated.</p>
//                 </div>
//               </div>

//               <div appTilt [tiltMax]="5" class="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-4 hover:border-orange-500/30 transition-all duration-300">
//                 <div class="h-10 w-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 shrink-0">
//                   <mat-icon class="scale-90">speed</mat-icon>
//                 </div>
//                 <div class="space-y-1">
//                   <h4 class="text-sm font-black text-white leading-none">20,000 mm/s²</h4>
//                   <p class="text-[11px] text-neutral-500">Industrial speed, active input shaping verification.</p>
//                 </div>
//               </div>

//               <div appTilt [tiltMax]="5" class="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-4 hover:border-orange-500/30 transition-all duration-300">
//                 <div class="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
//                   <mat-icon class="scale-90">palette</mat-icon>
//                 </div>
//                 <div class="space-y-1">
//                   <h4 class="text-sm font-black text-white leading-none">16-Color Print</h4>
//                   <p class="text-[11px] text-neutral-500">Automatic Material System handles filament swaps.</p>
//                 </div>
//               </div>

//               <div appTilt [tiltMax]="5" class="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-4 hover:border-orange-500/30 transition-all duration-300">
//                 <div class="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
//                   <mat-icon class="scale-90">camera_enhance</mat-icon>
//                 </div>
//                 <div class="space-y-1">
//                   <h4 class="text-sm font-black text-white leading-none">Spaghetti Detection</h4>
//                   <p class="text-[11px] text-neutral-500">AI chamber camera halts print on failures.</p>
//                 </div>
//               </div>
//             </div>

//             <div class="pt-4">
//               <button (click)="addToCartById('prod-3')"
//                 class="h-14 px-10 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-98 transition-all shadow-lg shadow-orange-500/20 cursor-pointer">
//                 EXPLORE LAUNCH OFFER
//               </button>
//             </div>
//           </div>

//           <div class="lg:col-span-6 flex justify-center relative" appScrollReveal="scale-in">
//             <div class="relative w-[340px] md:w-[440px] aspect-square rounded-[3rem] overflow-hidden bg-neutral-900 border border-white/10 flex items-center justify-center p-8 group">
//               <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-1"></div>
//               <div class="absolute top-0 left-0 w-full h-[2px] bg-purple-500 shadow-[0_0_15px_#7c3aed] animate-scan z-10"></div>
//               <img src="https://store.bambulab.com/cdn/shop/files/X1C_Combo_800x800.png" alt="Bambu Lab X1-C"
//                 class="h-[80%] max-h-[360px] object-contain transition-transform duration-700 group-hover:scale-105 relative z-2"
//                 (error)="onImageError($event)" referrerpolicy="no-referrer" loading="lazy" decoding="async">
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   `
// })
// export class HomeLaunchSpotlightComponent {
//   ds = inject(DatastoreService);
//   @Input() section!: any;

//   addToCartById(id: string) {
//     this.ds.addToCartById(id);
//   }

//   onImageError(event: Event) {
//     const img = event.target as HTMLImageElement;
//     img.src = this.ds.settings()?.defaultPlaceholderUrl || 'https://picsum.photos/seed/placeholder/400/400';
//   }
// }

@Component({
  selector: "app-home-services",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    TiltDirective,
    ScrollRevealDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [id]="section.id"
      class="max-w-7xl mx-auto px-6 space-y-12 py-12"
      appScrollReveal="fade"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Service 1 -->
        <div
          appTilt
          [tiltMax]="6"
          class="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-850/40 p-8 rounded-[2rem] flex flex-col justify-between h-[320px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:border-orange-500/30 transition-all duration-300 group"
        >
          <div
            class="h-12 w-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-[#d65108] group-hover:scale-110 transition-transform"
          >
            <mat-icon class="scale-110">layers</mat-icon>
          </div>
          <div class="space-y-2 text-left">
            <h4
              class="text-lg font-black text-neutral-900 dark:text-white leading-tight"
            >
              Instant 3D Print Quoting
            </h4>
            <p class="text-xs text-neutral-500 leading-relaxed">
              Upload any STL or STEP file and receive dynamic, tailored slicing
              quotes with infill controls in seconds.
            </p>
          </div>
          <a
            routerLink="/printing-service"
            class="text-[10px] font-black uppercase tracking-widest text-[#d65108] hover:text-orange-400 flex items-center gap-2 mt-4 text-left"
          >
            UPLOAD CAD FILE
            <mat-icon class="text-sm scale-75">arrow_forward</mat-icon>
          </a>
        </div>

        <!-- Service 2 -->
        <div
          appTilt
          [tiltMax]="6"
          class="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-850/40 p-8 rounded-[2rem] flex flex-col justify-between h-[320px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:border-orange-500/30 transition-all duration-300 group"
        >
          <div
            class="h-12 w-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform"
          >
            <mat-icon class="scale-110">school</mat-icon>
          </div>
          <div class="space-y-2 text-left">
            <h4
              class="text-lg font-black text-neutral-900 dark:text-white leading-tight"
            >
              Academy & Maintenance
            </h4>
            <p class="text-xs text-neutral-500 leading-relaxed">
              Certified training modules for industrial print mechanics,
              parameter profiles, and slicing calibrations.
            </p>
          </div>
          <a
            routerLink="/printing-service"
            class="text-[10px] font-black uppercase tracking-widest text-[#d65108] hover:text-orange-400 flex items-center gap-2 mt-4 text-left"
          >
            START LEARNING
            <mat-icon class="text-sm scale-75">arrow_forward</mat-icon>
          </a>
        </div>

        <!-- Service 3 -->
        <div
          appTilt
          [tiltMax]="6"
          class="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-850/40 p-8 rounded-[2rem] flex flex-col justify-between h-[320px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:border-orange-500/30 transition-all duration-300 group"
        >
          <div
            class="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"
          >
            <mat-icon class="scale-110">build_circle</mat-icon>
          </div>
          <div class="space-y-2 text-left">
            <h4
              class="text-lg font-black text-neutral-900 dark:text-white leading-tight"
            >
              Annual Maintenance (AMC)
            </h4>
            <p class="text-xs text-neutral-500 leading-relaxed">
              Preventive care contracts including physical parts replacements,
              firmware audits, and calibration sweeps.
            </p>
          </div>
          <a
            routerLink="/printing-service"
            class="text-[10px] font-black uppercase tracking-widest text-[#d65108] hover:text-orange-400 flex items-center gap-2 mt-4 text-left"
          >
            REQUEST AMC QUOTE
            <mat-icon class="text-sm scale-75">arrow_forward</mat-icon>
          </a>
        </div>

        <!-- Service 4 -->
        <div
          appTilt
          [tiltMax]="6"
          class="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-850/40 p-8 rounded-[2rem] flex flex-col justify-between h-[320px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:border-orange-500/30 transition-all duration-300 group"
        >
          <div
            class="h-12 w-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"
          >
            <mat-icon class="scale-110">hub</mat-icon>
          </div>
          <div class="space-y-2 text-left">
            <h4
              class="text-lg font-black text-neutral-900 dark:text-white leading-tight"
            >
              Farm System Integration
            </h4>
            <p class="text-xs text-neutral-500 leading-relaxed">
              Establish automated production pipelines using centralized
              dashboard panels and robotic filament loading structures.
            </p>
          </div>
          <a
            routerLink="/printing-service"
            class="text-[10px] font-black uppercase tracking-widest text-[#d65108] hover:text-orange-400 flex items-center gap-2 mt-4 text-left"
          >
            TALK TO ENGINEER
            <mat-icon class="text-sm scale-75">arrow_forward</mat-icon>
          </a>
        </div>
      </div>
    </section>
  `,
})
export class HomeServicesComponent {
  ds = inject(DatastoreService);
  @Input() section!: any;
}

@Component({
  selector: "app-home-why-choose-us",
  standalone: true,
  imports: [CommonModule, MatIconModule, ScrollRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section [id]="section.id" class="max-w-5xl mx-auto px-6 py-20">
      <div class="text-center space-y-2 mb-12" appScrollReveal="fade">
        <h2
          class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600 font-display"
        >
          THE GALAXY PROTOCOL
        </h2>
        <h3
          class="text-4xl font-black text-neutral-900 dark:text-white tracking-tighter font-display"
        >
          Why Choose 3D Galaxy
        </h3>
      </div>

      <div class="sticky-stack-container">
        <!-- Card 1 -->
        <div
          class="sticky-stack-card bg-neutral-900 text-white rounded-[2.5rem] p-10 md:p-14 border border-neutral-800 flex flex-col md:flex-row justify-between gap-8 min-h-[300px]"
        >
          <div class="space-y-4 max-w-xl text-left">
            <span
              class="text-[10px] font-black tracking-widest text-orange-500 uppercase"
              >AUTHENTICATED SYSTEMS</span
            >
            <h4 class="text-3xl font-black tracking-tight leading-none">
              Authorized National Distributor
            </h4>
            <p class="text-sm text-neutral-400 leading-relaxed">
              We work directly with tier-1 manufacturers to source authentic
              systems. Enjoy factory-certified product warranties, direct
              firmware overrides, and guaranteed spares support.
            </p>
          </div>
          <div
            class="h-20 w-20 bg-orange-500/10 border border-orange-500/25 rounded-2xl flex items-center justify-center text-orange-400 shrink-0 self-center"
          >
            <mat-icon class="scale-150">verified</mat-icon>
          </div>
        </div>

        <!-- Card 3 -->
        <div
          class="sticky-stack-card bg-neutral-900 text-white rounded-[2.5rem] p-10 md:p-14 border border-neutral-800 flex flex-col md:flex-row justify-between gap-8 min-h-[300px]"
        >
          <div class="space-y-4 max-w-xl text-left">
            <span
              class="text-[10px] font-black tracking-widest text-blue-400 uppercase"
              >CAD REVOLUTION</span
            >
            <h4 class="text-3xl font-black tracking-tight leading-none">
              Next-Gen Slicing Engine
            </h4>
            <p class="text-sm text-neutral-400 leading-relaxed">
              Our cloud quoting pipeline estimates parameters using direct mesh
              parsing. Upload your files to automatically receive custom infill,
              density, and filament parameters with instant pricing.
            </p>
          </div>
          <div
            class="h-20 w-20 bg-blue-500/10 border border-blue-500/25 rounded-2xl flex items-center justify-center text-blue-400 shrink-0 self-center"
          >
            <mat-icon class="scale-150">cloud_done</mat-icon>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HomeWhyChooseUsComponent {
  ds = inject(DatastoreService);
  @Input() section!: any;
}

@Component({
  selector: "app-home-statistics",
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [id]="section.id"
      class="w-full bg-neutral-100 dark:bg-neutral-950 py-20 border-y border-neutral-200 dark:border-neutral-900 text-neutral-900 dark:text-white"
      appScrollReveal="fade"
    >
      <div class="max-w-7xl mx-auto px-6"></div>
    </section>
  `,
})
export class HomeStatisticsComponent {
  ds = inject(DatastoreService);
  @Input() section!: any;

  galaxyStats = [
    { label: "Units Deployed", value: "12K+" },
    { label: "Partner Brands", value: "45+" },
    { label: "Active Students", value: "8.5K" },
    { label: "Hub Locations", value: "120+" },
  ];
}

@Component({
  selector: "app-home-testimonials",
  standalone: true,
  imports: [CommonModule, MatIconModule, ScrollRevealDirective, TiltDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [id]="section.id"
      class="max-w-7xl mx-auto px-6 py-12"
      appScrollReveal="fade"
    >
      <div class="text-center space-y-2 max-w-2xl mx-auto mb-12">
        <h2
          class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600 font-display"
        >
          Client Testimonials
        </h2>
        <h3
          class="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white tracking-tighter leading-tight font-display"
        >
          Ecosystem Reviews
        </h3>
        <p class="text-neutral-500 dark:text-neutral-400 text-sm">
          See how aerospace labs, auto designers, and creators leverage our
          high-fidelity print ecosystem.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Card 1 -->
        <div
          appTilt
          [tiltMax]="5"
          class="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-850/40 p-8 rounded-[2.5rem] flex flex-col justify-between min-h-[250px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.03)] hover:border-orange-500/30 transition-all duration-300 text-left"
        >
          <div class="flex items-center gap-1 text-amber-500 mb-4">
            <mat-icon class="scale-75">star</mat-icon
            ><mat-icon class="scale-75">star</mat-icon
            ><mat-icon class="scale-75">star</mat-icon
            ><mat-icon class="scale-75">star</mat-icon
            ><mat-icon class="scale-75">star</mat-icon>
          </div>
          <p
            class="text-sm text-neutral-500 dark:text-neutral-300 leading-relaxed italic"
          >
            "3D Galaxy revolutionized our design verification cycle. Their Bambu
            AMC contracts keep our 40-printer manufacturing farm running 24/7
            with zero bottlenecks."
          </p>
          <div class="flex items-center gap-4 mt-6">
            <div
              class="h-10 w-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center font-bold text-xs"
            >
              AS
            </div>
            <div class="space-y-0.5">
              <h4 class="text-xs font-black text-neutral-900 dark:text-white">
                Dr. A. Sen
              </h4>
              <p class="text-[10px] text-neutral-400">
                R&D Director, Aero-Space India
              </p>
            </div>
          </div>
        </div>

        <!-- Card 2 -->
        <div
          appTilt
          [tiltMax]="5"
          class="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-850/40 p-8 rounded-[2.5rem] flex flex-col justify-between min-h-[250px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.03)] hover:border-orange-500/30 transition-all duration-300 text-left"
        >
          <div class="flex items-center gap-1 text-amber-500 mb-4">
            <mat-icon class="scale-75">star</mat-icon
            ><mat-icon class="scale-75">star</mat-icon
            ><mat-icon class="scale-75">star</mat-icon
            ><mat-icon class="scale-75">star</mat-icon
            ><mat-icon class="scale-75">star</mat-icon>
          </div>
          <p
            class="text-sm text-neutral-500 dark:text-neutral-300 leading-relaxed italic"
          >
            "Their custom quotation portal is incredibly fast. We uploaded the
            suspension mounts, selected PETG-CF, and got our structural batches
            in perfect spec."
          </p>
          <div class="flex items-center gap-4 mt-6">
            <div
              class="h-10 w-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center font-bold text-xs"
            >
              MJ
            </div>
            <div class="space-y-0.5">
              <h4 class="text-xs font-black text-neutral-900 dark:text-white">
                Meera J.
              </h4>
              <p class="text-[10px] text-neutral-400">
                Lead Product Designer, Nexa Motors
              </p>
            </div>
          </div>
        </div>

        <!-- Card 3 -->
        <div
          appTilt
          [tiltMax]="5"
          class="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-850/40 p-8 rounded-[2.5rem] flex flex-col justify-between min-h-[250px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.03)] hover:border-orange-500/30 transition-all duration-300 text-left"
        >
          <div class="flex items-center gap-1 text-amber-500 mb-4">
            <mat-icon class="scale-75">star</mat-icon
            ><mat-icon class="scale-75">star</mat-icon
            ><mat-icon class="scale-75">star</mat-icon
            ><mat-icon class="scale-75">star</mat-icon
            ><mat-icon class="scale-75">star</mat-icon>
          </div>
          <p
            class="text-sm text-neutral-500 dark:text-neutral-300 leading-relaxed italic"
          >
            "Outstanding post-sales training and customer service. Our
            university makerspace runs completely on 3D Galaxy filaments, which
            yield highly consistent prints."
          </p>
          <div class="flex items-center gap-4 mt-6">
            <div
              class="h-10 w-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center font-bold text-xs"
            >
              RK
            </div>
            <div class="space-y-0.5">
              <h4 class="text-xs font-black text-neutral-900 dark:text-white">
                Prof. Rajesh K.
              </h4>
              <p class="text-[10px] text-neutral-400">
                Makerspace Admin, IIT Delhi
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HomeTestimonialsComponent {
  ds = inject(DatastoreService);
  @Input() section!: any;
}

@Component({
  selector: "app-home-instagram-feed",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-7xl mx-auto px-6 py-16">
      <div class="grid gap-6 md:grid-cols-[1.2fr_1fr] items-center">
        <div class="space-y-3">
          <span
            class="text-[10px] font-black uppercase tracking-[0.35em] text-orange-600"
          >
            Instagram Feed
          </span>
          <h2
            class="text-3xl md:text-4xl font-black text-neutral-950 dark:text-white tracking-tight"
          >
            {{ feedData()?.profile?.name || "Instagram" }} Highlights
          </h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">
            {{
              feedData()?.profile?.bio ||
                "Scroll through the latest social proof from our Instagram community."
            }}
          </p>
          <div class="flex flex-wrap gap-3 items-center pt-4">
            <a
              [href]="
                feedData()?.profile?.profileUrl || 'https://instagram.com/'
              "
              target="_blank"
              class="inline-flex items-center gap-2 px-5 py-3 bg-neutral-900 text-white rounded-full text-xs font-black uppercase tracking-[0.25em] transition hover:bg-orange-600"
              >Follow</a
            >
            <div class="flex items-center gap-3">
              <div
                class="rounded-full overflow-hidden w-14 h-14 bg-neutral-100 dark:bg-neutral-800"
              >
                <img
                  [src]="
                    feedData()?.profile?.profileImageUrl ||
                    'https://via.placeholder.com/80'
                  "
                  alt="Profile"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div>
                <p class="text-xs uppercase tracking-[0.35em] text-neutral-400">
                  Latest posts
                </p>
                <p class="text-2xl font-black text-neutral-950 dark:text-white">
                  {{ feedData()?.posts?.length || 0 }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="overflow-hidden rounded-[2rem] border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950"
        >
          <div
            class="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700"
          >
            @for (post of feedData()?.posts || []; track post.id) {
              <a
                href="{{ post.permalink }}"
                target="_blank"
                rel="noopener noreferrer"
                class="min-w-[270px] h-[340px] shrink-0 rounded-[1.75rem] overflow-hidden bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 snap-center transition hover:-translate-y-1"
                (click)="trackPostClick(post.id)"
              >
                <img
                  [src]="
                    post.mediaUrl ||
                    post.thumbnailUrl ||
                    'https://via.placeholder.com/320'
                  "
                  alt="Instagram post"
                  class="h-[220px] w-full object-cover"
                  loading="lazy"
                />
                <div class="p-4 space-y-3">
                  <p
                    class="text-[11px] uppercase tracking-[0.35em] text-neutral-400"
                  >
                    {{ post.mediaType || "Image" }}
                  </p>
                  <p
                    class="text-sm text-neutral-900 dark:text-neutral-100 line-clamp-3"
                  >
                    {{ post.caption || "No caption available." }}
                  </p>
                  <div
                    class="flex items-center justify-between text-[11px] text-neutral-500"
                  >
                    <span>{{
                      post.timestamp
                        ? (post.timestamp | date: "mediumDate")
                        : "Live"
                    }}</span>
                    <span class="font-black uppercase">VIEW</span>
                  </div>
                </div>
              </a>
            }
          </div>
          <div
            *ngIf="loading()"
            class="p-6 text-center text-sm text-neutral-500"
          >
            Loading Instagram content...
          </div>
          <div
            *ngIf="
              !loading() &&
              (!feedData()?.posts || feedData()?.posts.length === 0)
            "
            class="p-6 text-center text-sm text-neutral-500"
          >
            Instagram content not available yet. Enable the feed in admin
            settings.
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HomeInstagramFeedComponent {
  api = inject(ApiService);
  private http = inject(HttpClient);
  private _feedData = signal<any>({ enabled: false, profile: {}, posts: [] });
  loading = signal(true);

  feedData = computed(() => this._feedData());

  constructor() {
    this.loadFeed();
  }

  private loadFeed() {
    this.loading.set(true);
    this.api.get<any>("/public/instagram-feed").subscribe({
      next: (response) => {
        this._feedData.set(
          response?.data || { enabled: false, profile: {}, posts: [] },
        );
        this.loading.set(false);
        if (this._feedData().enabled && this._feedData().posts?.length) {
          this.trackInteraction(
            "impression",
            this._feedData().posts[0]?.id || "feed",
          );
        }
      },
      error: () => {
        this._feedData.set({ enabled: false, profile: {}, posts: [] });
        this.loading.set(false);
      },
    });
  }

  trackPostClick(postId: string) {
    this.trackInteraction("click", postId);
  }

  private trackInteraction(eventType: "impression" | "click", postId: string) {
    this.http
      .post<any>("/api/public/instagram-feed/interaction", {
        eventType,
        postId,
      })
      .subscribe({
        next: () => {},
        error: () => {},
      });
  }
}

@Component({
  selector: "app-home-category-showcase-row",
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center space-y-12 select-none"
      appScrollReveal="fade"
    >
      <div class="text-center space-y-2">
        <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-650 font-display">
          Featured Collection
        </h2>
        <h3 class="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tighter font-display uppercase font-serif">
          {{ category.name }}
        </h3>
      </div>

      <!-- Products Grid (Recent 5 Products) -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8 w-full justify-center">
        @for (p of products(); track p.id) {
          <a
            [routerLink]="['/product', p.slug]"
            class="group flex flex-col items-center justify-between text-center select-none cursor-pointer h-full"
          >
            <!-- Image container -->
            <div class="relative w-full aspect-square bg-transparent rounded-2xl overflow-hidden flex items-center justify-center p-3 mb-3 group-hover:scale-105 transition-transform duration-300 product-card-image-container">
              <img
                [src]="p.primaryImage || (p.images && p.images[0]) || 'https://via.placeholder.com/400'"
                [alt]="p.name"
                class="max-w-full max-h-full object-contain primary-image absolute inset-0 m-auto"
              />
              @if (p.secondaryImage && p.secondaryImage !== (p.primaryImage || (p.images && p.images[0]))) {
                <img
                  [src]="p.secondaryImage"
                  [alt]="p.name + ' Alternate'"
                  class="max-w-full max-h-full object-contain secondary-image absolute inset-0 m-auto"
                />
              }
              @if (p.stock <= 0) {
                <span class="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-black text-white text-[8px] font-black uppercase tracking-wider rounded-md shadow-md z-10">
                  Sold out
                </span>
              }
            </div>

            <!-- Title & Price -->
            <div class="flex-1 flex flex-col justify-between w-full px-1">
              <h4 class="text-xs font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-snug group-hover:text-orange-500 transition-colors">
                {{ p.name }}
              </h4>
              <p class="text-xs font-black text-[#d65108] dark:text-orange-400 mt-2 font-mono">
                {{ formatPrice(p) }}
              </p>
            </div>
          </a>
        }
      </div>

      <div class="pt-4">
        <button
          (click)="selectFilterCategory(category.slug)"
          class="h-11 px-8 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-md cursor-pointer border-none rounded-none font-sans min-w-[150px]"
        >
          View all
        </button>
      </div>
    </section>
  `,
})
export class HomeCategoryShowcaseRowComponent {
  ds = inject(DatastoreService);
  router = inject(Router);
  
  @Input() category!: Category;

  isDealerPriceActive = computed(() => {
    const r = this.ds.userRole();
    return (
      r === "admin" ||
      r === "super-admin" ||
      (this.ds.activeUser()?.rewardPoints || 0) > 300
    );
  });

  products = computed(() => {
    const cat = this.category;
    if (!cat) return [];
    
    const categories = this.ds.categories();
    const childIds = categories
      .filter((c) => c.parentId === cat.id || c.parent_id === cat.id)
      .map((c) => c.id);
    const targetIds = [cat.id, ...childIds];
    
    return this.ds.products()
      .filter((p) => targetIds.includes(p.categoryId || p.category_id || p.category?.id || ''))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);
  });

  formatPrice(p: any): string {
    const isDealer = this.isDealerPriceActive();
    const price = isDealer
      ? p.dealer_price || p.sale_price || p.mrp
      : p.sale_price || p.mrp;
      
    const hasVariants = p.variants && p.variants.length > 0;
    const formatted = Number(price).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    const prefix = hasVariants ? 'From ' : '';
    return `${prefix}Rs. ${formatted}`;
  }

  selectFilterCategory(slug: string) {
    this.router.navigate(["/products"], { queryParams: { category: slug } });
  }
}

// 1. FLASH DEALS
@Component({
  selector: "app-home-flash-deals",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-7xl mx-auto px-6 py-12" *ngIf="deals().length > 0">
      <div class="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-8">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center p-2.5 bg-red-500/10 text-red-500 rounded-xl">
            <mat-icon class="scale-110">flash_on</mat-icon>
          </div>
          <div>
            <h2 class="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase font-display">
              Flash Deals of the Day
            </h2>
            <p class="text-zinc-500 text-xs font-semibold">Super-limited stock. Ending soon!</p>
          </div>
        </div>
        <div class="flex items-center gap-2 bg-red-500/5 dark:bg-red-500/10 border border-red-500/15 px-4 py-2 rounded-2xl text-red-500 font-extrabold text-sm tracking-wide">
          <mat-icon class="scale-75">access_time</mat-icon>
          <span>ENDS IN:</span>
          <span>{{ countdown() }}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div 
          *ngFor="let p of deals()" 
          class="bg-white dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl p-4 flex flex-col justify-between hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all relative group"
        >
          <div class="absolute top-4 left-4 z-10 bg-red-600 text-white px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider shadow-sm">
            {{ getDiscount(p.mrp, p.salePrice) }}% OFF
          </div>

          <a [routerLink]="['/product', p.slug]" class="block relative w-full aspect-square bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl overflow-hidden p-4 mb-4 flex items-center justify-center product-card-image-container">
            <img [src]="p.primaryImage || p.images[0] || 'assets/images/user-placeholder.png'" (error)="handleImageError($event)" class="max-w-[85%] max-h-[85%] object-contain primary-image absolute inset-0 m-auto transform group-hover:scale-105 transition-transform duration-500" alt="Product" />
            @if (p.secondaryImage && p.secondaryImage !== (p.primaryImage || p.images[0])) {
              <img [src]="p.secondaryImage" (error)="handleImageError($event)" class="max-w-[85%] max-h-[85%] object-contain secondary-image absolute inset-0 m-auto" alt="Product Alternate" />
            }
          </a>

          <div class="space-y-2 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="text-sm font-bold text-zinc-800 dark:text-zinc-100 line-clamp-2 min-h-[40px] leading-snug">
                {{ p.name }}
              </h3>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-base font-black text-zinc-900 dark:text-white">₹{{ p.salePrice | number }}</span>
                <span class="text-xs text-zinc-400 line-through font-semibold">₹{{ p.mrp | number }}</span>
              </div>
            </div>

            <div class="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 mt-2">
              <div class="flex items-center justify-between text-[10px] font-bold text-zinc-500">
                <span>Stock Left: {{ p.stock }}</span>
                <span class="text-red-500">Almost Sold Out!</span>
              </div>
              <div class="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div class="h-full bg-red-600 rounded-full animate-pulse" [style.width.%]="mathMin(100, (p.stock / 20) * 100)"></div>
              </div>

              <a [routerLink]="['/product', p.slug]" class="w-full h-10 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10 cursor-pointer">
                Buy Now
                <mat-icon class="scale-75">bolt</mat-icon>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomeFlashDealsComponent {
  ds = inject(DatastoreService);
  deals = computed(() => this.ds.homepageData()?.flashDeals || []);
  countdown = signal('02h 44m 12s');

  constructor() {
    setInterval(() => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diff = endOfDay.getTime() - now.getTime();
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      this.countdown.set(
        `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
      );
    }, 1000);
  }

  getDiscount(mrp: number, sale: number): number {
    if (!mrp) return 0;
    return Math.round(((mrp - sale) / mrp) * 100);
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  handleImageError(event: any) {
    if (event.target) {
      (event.target as HTMLImageElement).src = 'https://picsum.photos/seed/galaxy/200/200';
    }
  }
}

// 2. BEST SELLERS
@Component({
  selector: "app-home-best-sellers",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-7xl mx-auto px-6 py-12" *ngIf="items().length > 0">
      <div class="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-8">
        <div class="flex items-center justify-center p-2.5 bg-orange-500/10 text-orange-500 rounded-xl">
          <mat-icon class="scale-110">military_tech</mat-icon>
        </div>
        <div>
          <h2 class="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase font-display">
            Best Sellers
          </h2>
          <p class="text-zinc-500 text-xs font-semibold">Our most popular and trusted 3D printing choices.</p>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div 
          *ngFor="let p of items()" 
          class="bg-white dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl p-4 flex flex-col justify-between hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all relative group"
        >
          <div class="absolute top-4 left-4 z-10 bg-orange-600 text-white px-2 py-0.5 text-[8px] font-black rounded-lg uppercase tracking-wider shadow-sm">
            BESTSELLER
          </div>

          <a [routerLink]="['/product', p.slug]" class="block relative w-full aspect-square bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl overflow-hidden p-4 mb-4 flex items-center justify-center product-card-image-container">
            <img [src]="p.primaryImage || p.images[0] || 'assets/images/user-placeholder.png'" (error)="handleImageError($event)" class="max-w-[85%] max-h-[85%] object-contain primary-image absolute inset-0 m-auto transform group-hover:scale-105 transition-transform duration-500" alt="Product" />
            @if (p.secondaryImage && p.secondaryImage !== (p.primaryImage || p.images[0])) {
              <img [src]="p.secondaryImage" (error)="handleImageError($event)" class="max-w-[85%] max-h-[85%] object-contain secondary-image absolute inset-0 m-auto" alt="Product Alternate" />
            }
          </a>

          <div class="space-y-2 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-1 mb-1">
                <mat-icon class="text-amber-500 scale-75">star</mat-icon>
                <span class="text-xs font-bold text-zinc-600 dark:text-zinc-300">4.8 (24)</span>
              </div>
              <h3 class="text-sm font-bold text-zinc-800 dark:text-zinc-100 line-clamp-2 min-h-[40px] leading-snug">
                {{ p.name }}
              </h3>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-base font-black text-zinc-900 dark:text-white">₹{{ p.salePrice | number }}</span>
                <span class="text-xs text-zinc-400 line-through font-semibold" *ngIf="p.mrp > p.salePrice">₹{{ p.mrp | number }}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 mt-2">
              <a [routerLink]="['/product', p.slug]" class="w-full h-10 bg-zinc-900 dark:bg-zinc-850 hover:bg-orange-600 dark:hover:bg-orange-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors duration-300">
                View Details
                <mat-icon class="scale-75">arrow_forward</mat-icon>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomeBestSellersComponent {
  ds = inject(DatastoreService);
  items = computed(() => this.ds.homepageData()?.bestSellers || []);

  handleImageError(event: any) {
    if (event.target) {
      (event.target as HTMLImageElement).src = 'https://picsum.photos/seed/galaxy/200/200';
    }
  }
}

// 3. TRENDING PRODUCTS
@Component({
  selector: "app-home-trending-products",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-7xl mx-auto px-6 py-12" *ngIf="items().length > 0">
      <div class="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-8">
        <div class="flex items-center justify-center p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
          <mat-icon class="scale-110">trending_up</mat-icon>
        </div>
        <div>
          <h2 class="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase font-display">
            Trending Now
          </h2>
          <p class="text-zinc-500 text-xs font-semibold">High-interest printing machines and custom design templates.</p>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div 
          *ngFor="let p of items()" 
          class="bg-white dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl p-4 flex flex-col justify-between hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all relative group"
        >
          <a [routerLink]="['/product', p.slug]" class="block relative w-full aspect-square bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl overflow-hidden p-4 mb-4 flex items-center justify-center product-card-image-container">
            <img [src]="p.primaryImage || p.images[0] || 'assets/images/user-placeholder.png'" (error)="handleImageError($event)" class="max-w-[85%] max-h-[85%] object-contain primary-image absolute inset-0 m-auto transform group-hover:scale-105 transition-transform duration-500" alt="Product" />
            @if (p.secondaryImage && p.secondaryImage !== (p.primaryImage || p.images[0])) {
              <img [src]="p.secondaryImage" (error)="handleImageError($event)" class="max-w-[85%] max-h-[85%] object-contain secondary-image absolute inset-0 m-auto" alt="Product Alternate" />
            }
          </a>

          <div class="space-y-2 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="text-sm font-bold text-zinc-800 dark:text-zinc-100 line-clamp-2 min-h-[40px] leading-snug">
                {{ p.name }}
              </h3>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-base font-black text-zinc-900 dark:text-white">₹{{ p.salePrice | number }}</span>
                <span class="text-xs text-zinc-400 line-through font-semibold" *ngIf="p.mrp > p.salePrice">₹{{ p.mrp | number }}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 mt-2">
              <a [routerLink]="['/product', p.slug]" class="w-full h-10 bg-zinc-900 dark:bg-zinc-850 hover:bg-orange-600 dark:hover:bg-orange-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors duration-300">
                View Details
                <mat-icon class="scale-75">arrow_forward</mat-icon>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomeTrendingProductsComponent {
  ds = inject(DatastoreService);
  items = computed(() => this.ds.homepageData()?.trendingProducts || []);

  handleImageError(event: any) {
    if (event.target) {
      (event.target as HTMLImageElement).src = 'https://picsum.photos/seed/galaxy/200/200';
    }
  }
}

// 4. NEW ARRIVALS
@Component({
  selector: "app-home-new-arrivals",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-7xl mx-auto px-6 py-12" *ngIf="items().length > 0">
      <div class="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-8">
        <div class="flex items-center justify-center p-2.5 bg-green-500/10 text-green-500 rounded-xl">
          <mat-icon class="scale-110">fiber_new</mat-icon>
        </div>
        <div>
          <h2 class="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase font-display">
            New Arrivals
          </h2>
          <p class="text-zinc-500 text-xs font-semibold">The absolute latest releases in the 3D world.</p>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div 
          *ngFor="let p of items()" 
          class="bg-white dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl p-4 flex flex-col justify-between hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all relative group"
        >
          <div class="absolute top-4 left-4 z-10 bg-green-650 text-white px-2 py-0.5 text-[8px] font-black rounded-lg uppercase tracking-wider shadow-sm">
            NEW
          </div>

          <a [routerLink]="['/product', p.slug]" class="block relative w-full aspect-square bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl overflow-hidden p-4 mb-4 flex items-center justify-center product-card-image-container">
            <img [src]="p.primaryImage || p.images[0] || 'assets/images/user-placeholder.png'" (error)="handleImageError($event)" class="max-w-[85%] max-h-[85%] object-contain primary-image absolute inset-0 m-auto transform group-hover:scale-105 transition-transform duration-500" alt="Product" />
            @if (p.secondaryImage && p.secondaryImage !== (p.primaryImage || p.images[0])) {
              <img [src]="p.secondaryImage" (error)="handleImageError($event)" class="max-w-[85%] max-h-[85%] object-contain secondary-image absolute inset-0 m-auto" alt="Product Alternate" />
            }
          </a>

          <div class="space-y-2 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="text-sm font-bold text-zinc-800 dark:text-zinc-100 line-clamp-2 min-h-[40px] leading-snug">
                {{ p.name }}
              </h3>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-base font-black text-zinc-900 dark:text-white">₹{{ p.salePrice | number }}</span>
                <span class="text-xs text-zinc-400 line-through font-semibold" *ngIf="p.mrp > p.salePrice">₹{{ p.mrp | number }}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 mt-2">
              <a [routerLink]="['/product', p.slug]" class="w-full h-10 bg-zinc-900 dark:bg-zinc-850 hover:bg-orange-600 dark:hover:bg-orange-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors duration-300">
                View Details
                <mat-icon class="scale-75">arrow_forward</mat-icon>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomeNewArrivalsComponent {
  ds = inject(DatastoreService);
  items = computed(() => this.ds.homepageData()?.newArrivals || []);

  handleImageError(event: any) {
    if (event.target) {
      (event.target as HTMLImageElement).src = 'https://picsum.photos/seed/galaxy/200/200';
    }
  }
}

// 5. SHOP BY MATERIAL
@Component({
  selector: "app-home-materials",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-7xl mx-auto px-6 py-12" *ngIf="materials().length > 0">
      <div class="text-center space-y-2 mb-10">
        <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600 font-display">
          Premium Consumables
        </h2>
        <h3 class="text-3xl font-black text-neutral-900 dark:text-white tracking-tighter font-display">
          Shop by Materials
        </h3>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
        <a 
          *ngFor="let m of materials()" 
          [routerLink]="['/products']" 
          [queryParams]="{ material: m.name }"
          class="bg-white dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl p-6 flex flex-col items-center text-center hover:shadow-[0_12px_30px_rgba(234,88,12,0.06)] hover:border-orange-500/30 hover:-translate-y-0.5 transition-all group"
        >
          <div class="w-24 h-24 bg-orange-500/5 dark:bg-orange-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <mat-icon class="text-orange-500 scale-125">category</mat-icon>
          </div>
          <h4 class="text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-1 font-display">
            {{ m.name }}
          </h4>
          <span class="text-xs text-zinc-400 font-semibold mb-2">Starts from ₹{{ m.startsFrom | number }}</span>
          <span class="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 rounded-full">
            {{ m.totalProducts }} Products
          </span>
        </a>
      </div>
    </section>
  `
})
export class HomeMaterialsComponent {
  ds = inject(DatastoreService);
  materials = computed(() => this.ds.homepageData()?.materials || []);
}

// 6. SHOP BY APPLICATION
@Component({
  selector: "app-home-applications",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-7xl mx-auto px-6 py-12" *ngIf="apps().length > 0">
      <div class="text-center space-y-2 mb-10">
        <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600 font-display">
          Use Cases & Sectors
        </h2>
        <h3 class="text-3xl font-black text-neutral-900 dark:text-white tracking-tighter font-display">
          Shop by Application
        </h3>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <a 
          *ngFor="let a of apps()" 
          [routerLink]="['/products']" 
          [queryParams]="{ application: a.name }"
          class="relative bg-zinc-900 rounded-3xl overflow-hidden group min-h-[160px] p-6 flex flex-col justify-end text-left hover:-translate-y-0.5 transition-all"
        >
          <img [src]="'https://picsum.photos/seed/' + a.name + '/300/160'" class="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-700" alt="App" />
          <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/40 to-transparent"></div>
          
          <div class="relative z-10">
            <h4 class="text-lg font-black text-white uppercase tracking-wider font-display">{{ a.name }}</h4>
            <p class="text-xs text-zinc-300 font-semibold mt-1">Starts from ₹{{ a.startsFrom | number }}</p>
          </div>
        </a>
      </div>
    </section>
  `
})
export class HomeApplicationsComponent {
  ds = inject(DatastoreService);
  apps = computed(() => this.ds.homepageData()?.applications || []);
}

// 7. POPULAR COLLECTIONS
@Component({
  selector: "app-home-collections",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-7xl mx-auto px-6 py-12" *ngIf="cols().length > 0">
      <div class="text-center space-y-2 mb-10">
        <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600 font-display">
          Curated Choices
        </h2>
        <h3 class="text-3xl font-black text-neutral-900 dark:text-white tracking-tighter font-display">
          Popular Collections
        </h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          *ngFor="let c of cols()" 
          class="bg-white dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between p-6 min-h-[220px]"
        >
          <div class="space-y-2 text-left">
            <h4 class="text-xl font-black text-zinc-900 dark:text-white tracking-tight uppercase font-display">
              {{ c.name }}
            </h4>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              {{ c.description }}
            </p>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800/60 mt-4">
            <span class="text-sm text-zinc-400 font-semibold">Starts From ₹{{ c.startingPrice | number }}</span>
            <a [routerLink]="['/products']" [queryParams]="{ collection: c.slug }" class="h-10 px-5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm">
              Explore Collection
              <mat-icon class="scale-75">arrow_forward</mat-icon>
            </a>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomeCollectionsComponent {
  ds = inject(DatastoreService);
  cols = computed(() => this.ds.homepageData()?.collections || []);
}

// 8. BUNDLE OFFERS & COMBOS
@Component({
  selector: "app-home-bundles",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-7xl mx-auto px-6 py-12" *ngIf="deals().length > 0">
      <div class="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-8">
        <div class="flex items-center justify-center p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
          <mat-icon class="scale-110">card_giftcard</mat-icon>
        </div>
        <div>
          <h2 class="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase font-display">
            Bundle Combos & Value Deals
          </h2>
          <p class="text-zinc-500 text-xs font-semibold">Save extra on machine and consumable packs.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          *ngFor="let p of deals()" 
          class="bg-linear-to-br from-purple-500/5 to-pink-500/5 dark:from-purple-500/10 dark:to-pink-500/10 border border-purple-500/15 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center hover:shadow-[0_12px_40px_rgba(168,85,247,0.06)] transition-all group"
        >
          <div class="w-40 h-40 bg-white dark:bg-zinc-950/40 rounded-2xl p-4 shrink-0 flex items-center justify-center border border-purple-500/10 product-card-image-container relative">
            <img [src]="p.primaryImage || p.images[0]" (error)="handleImageError($event)" class="max-w-full max-h-full object-contain primary-image absolute inset-0 m-auto transform group-hover:scale-105 transition-transform duration-500" alt="Bundle" />
            @if (p.secondaryImage && p.secondaryImage !== (p.primaryImage || p.images[0])) {
              <img [src]="p.secondaryImage" (error)="handleImageError($event)" class="max-w-full max-h-full object-contain secondary-image absolute inset-0 m-auto" alt="Bundle Alternate" />
            }
          </div>

          <div class="space-y-4 text-left flex-1">
            <div class="inline-flex px-3 py-1 bg-purple-500/10 text-purple-500 border border-purple-500/15 text-[9px] font-black uppercase tracking-wider rounded-full">
              MEGA BUNDLE SAVINGS
            </div>
            <div>
              <h3 class="text-lg font-black text-zinc-900 dark:text-white leading-tight font-display">
                {{ p.name }}
              </h3>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                {{ p.description }}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xl font-black text-zinc-900 dark:text-white">₹{{ p.salePrice | number }}</span>
              <span class="text-sm text-zinc-400 line-through font-semibold">₹{{ p.mrp | number }}</span>
            </div>
            <a [routerLink]="['/product', p.slug]" class="inline-flex h-11 px-6 bg-purple-650 hover:bg-purple-750 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest items-center justify-center gap-1.5 shadow-md shadow-purple-500/10 cursor-pointer">
              Grab Bundle
              <mat-icon class="scale-75">offline_bolt</mat-icon>
            </a>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomeBundleOffersComponent {
  ds = inject(DatastoreService);
  deals = computed(() => this.ds.homepageData()?.bundleDeals || []);

  handleImageError(event: any) {
    if (event.target) {
      (event.target as HTMLImageElement).src = 'https://picsum.photos/seed/galaxy/200/200';
    }
  }
}

// 9. DYNAMIC CUSTOMER REVIEWS
@Component({
  selector: "app-home-reviews",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-7xl mx-auto px-6 py-12" *ngIf="reviews().length > 0">
      <div class="text-center space-y-2 mb-10">
        <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600 font-display">
          Testimonials & Feedback
        </h2>
        <h3 class="text-3xl font-black text-neutral-900 dark:text-white tracking-tighter font-display">
          Verified Buyer Experiences
        </h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          *ngFor="let r of reviews()" 
          class="bg-white dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl p-6 flex flex-col justify-between min-h-[220px]"
        >
          <div class="space-y-4 text-left">
            <div class="flex items-center gap-1">
              <mat-icon class="text-amber-500 scale-90" *ngFor="let star of [1,2,3,4,5]">star</mat-icon>
            </div>
            <p class="text-sm text-zinc-600 dark:text-zinc-300 font-medium italic line-clamp-4">
              "{{ r.comment }}"
            </p>
          </div>

          <div class="flex items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 mt-4">
            <img [src]="r.customerPhoto" (error)="handleAvatarError($event)" class="w-10 h-10 rounded-full object-cover shrink-0 border border-zinc-200" alt="Avatar" />
            <div class="flex flex-col text-left">
              <span class="text-sm font-bold text-zinc-900 dark:text-white">{{ r.customerName }}</span>
              <span class="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                <mat-icon class="text-green-500 scale-50">verified</mat-icon> Verified Buyer
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomeReviewsComponent {
  ds = inject(DatastoreService);
  reviews = computed(() => this.ds.homepageData()?.reviews || []);

  handleAvatarError(event: any) {
    if (event.target) {
      (event.target as HTMLImageElement).src = 'assets/images/user-placeholder.png';
    }
  }
}

// 10. RECENT ARTICLES (BLOGS)
@Component({
  selector: "app-home-blogs",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-7xl mx-auto px-6 py-12" *ngIf="blogs().length > 0">
      <div class="text-center space-y-2 mb-10">
        <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600 font-display">
          Learning & Knowledge
        </h2>
        <h3 class="text-3xl font-black text-neutral-900 dark:text-white tracking-tighter font-display">
          Latest 3D Articles & Slicing Tips
        </h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          *ngFor="let b of blogs()" 
          class="bg-white dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
        >
          <div class="relative w-full h-48 overflow-hidden bg-zinc-100">
            <img [src]="b.imageUrl || 'https://picsum.photos/seed/blog/400/200'" (error)="handleImageError($event)" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Blog Title" />
          </div>

          <div class="p-5 flex-1 flex flex-col justify-between text-left space-y-4">
            <div>
              <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                {{ b.createdAt | date:'mediumDate' }}
              </span>
              <h4 class="text-base font-black text-zinc-900 dark:text-white mt-1 leading-snug font-display line-clamp-2">
                {{ b.title }}
              </h4>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                {{ b.excerpt }}
              </p>
            </div>
            
            <a [routerLink]="['/blog', b.slug]" class="inline-flex text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 items-center gap-1">
              Read Article
              <mat-icon class="scale-75">arrow_forward</mat-icon>
            </a>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomeBlogsComponent {
  ds = inject(DatastoreService);
  blogs = computed(() => this.ds.homepageData()?.blogs || []);

  handleImageError(event: any) {
    if (event.target) {
      (event.target as HTMLImageElement).src = 'https://picsum.photos/seed/galaxy/400/200';
    }
  }
}

