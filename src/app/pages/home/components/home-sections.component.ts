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
  imports: [CommonModule, ScrollRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [id]="section.id"
      class="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center justify-center text-center space-y-6"
      appScrollReveal="scale-in"
    >
      <div class="space-y-2">
        <h1
          class="text-5xl md:text-6xl font-black tracking-widest text-neutral-950 dark:text-white uppercase font-display select-text leading-none"
        >
          {{ section.config["title"] || "PREMIUM FILAMENT" }}
        </h1>
        <h2
          class="text-[10px] font-black uppercase tracking-[0.3em] text-[#d65108]"
        >
          {{ section.config["subtitle"] || "Ecosystem Materials" }}
        </h2>
      </div>
      <div class="pt-4">
        <button
          (click)="selectFilterCategory('materials')"
          class="h-11 px-8 bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-md cursor-pointer"
        >
          {{ section.config["buttonText"] || "VIEW ALL" }}
        </button>
      </div>
    </section>
  `,
})
export class HomeCategoryViewFilamentComponent {
  ds = inject(DatastoreService);
  router = inject(Router);
  @Input() section!: any;

  selectFilterCategory(cat: string) {
    this.router.navigate(["/products"], { queryParams: { category: cat } });
  }
}

@Component({
  selector: "app-home-category-view-spare-parts",
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [id]="section.id"
      class="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center justify-center text-center space-y-6"
      appScrollReveal="scale-in"
    >
      <div class="space-y-2">
        <h1
          class="text-5xl md:text-6xl font-black tracking-widest text-neutral-950 dark:text-white uppercase font-display select-text leading-none"
        >
          {{ section.config["title"] || "SPARE PARTS" }}
        </h1>
        <h2
          class="text-[10px] font-black uppercase tracking-[0.3em] text-[#d65108]"
        >
          {{ section.config["subtitle"] || "Original Components" }}
        </h2>
      </div>
      <div class="pt-4">
        <button
          (click)="selectFilterCategory('spare-parts')"
          class="h-11 px-8 bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-md cursor-pointer"
        >
          {{ section.config["buttonText"] || "VIEW ALL" }}
        </button>
      </div>
    </section>
  `,
})
export class HomeCategoryViewSparePartsComponent {
  ds = inject(DatastoreService);
  router = inject(Router);
  @Input() section!: any;

  selectFilterCategory(cat: string) {
    this.router.navigate(["/products"], { queryParams: { category: cat } });
  }
}

@Component({
  selector: "app-home-category-view-3d-printer",
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [id]="section.id"
      class="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center justify-center text-center space-y-6"
      appScrollReveal="scale-in"
    >
      <div class="space-y-2">
        <h1
          class="text-5xl md:text-6xl font-black tracking-widest text-neutral-950 dark:text-white uppercase font-display select-text leading-none"
        >
          {{ section.config["title"] || "3D PRINTERS" }}
        </h1>
        <h2
          class="text-[10px] font-black uppercase tracking-[0.3em] text-[#d65108]"
        >
          {{ section.config["subtitle"] || "Flagship Systems" }}
        </h2>
      </div>
      <div class="pt-4">
        <button
          (click)="selectFilterCategory('3d-printers')"
          class="h-11 px-8 bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-md cursor-pointer"
        >
          {{ section.config["buttonText"] || "VIEW ALL" }}
        </button>
      </div>
    </section>
  `,
})
export class HomeCategoryView3DPrinterComponent {
  ds = inject(DatastoreService);
  router = inject(Router);
  @Input() section!: any;

  selectFilterCategory(cat: string) {
    this.router.navigate(["/products"], { queryParams: { category: cat } });
  }
}

@Component({
  selector: "app-home-newsletter",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
})
export class HomeNewsletterComponent {
  ds = inject(DatastoreService);
  @Input() section!: any;
  isSubscribed = signal(false);

  subscribeNewsletter(input: HTMLInputElement) {
    const val = input.value?.trim();
    if (val) {
      this.isSubscribed.set(true);
      input.value = "";
      setTimeout(() => {
        this.isSubscribed.set(false);
      }, 5000);
    }
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

      <div class="space-y-12">
        @for (
          group of shopByCategoryGroups();
          track group.category.id;
          let idx = $index
        ) {
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <!-- Large Card -->
            <div
              class="lg:col-span-5 bg-neutral-100 dark:bg-neutral-900 rounded-[2.5rem] overflow-hidden relative group p-8 md:p-12 flex flex-col justify-end min-h-[500px] lg:min-h-[550px]"
              [class.lg:order-2]="idx % 2 !== 0"
              appScrollReveal="scale-in"
            >
              <img
                [src]="
                  group.category.image ||
                  'https://images.unsplash.com/photo-1631035626723-cd8e9ef9e728?auto=format&fit=crop&q=80&w=800'
                "
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-105"
                referrerpolicy="no-referrer"
                loading="lazy"
                decoding="async"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t from-neutral-950/95 via-neutral-900/60 to-transparent pointer-events-none"
              ></div>

              <div class="relative z-10 space-y-4 text-left">
                <h4
                  class="text-4xl font-black text-white tracking-tight uppercase font-display"
                >
                  {{ group.category.name }}
                </h4>
                <p
                  class="text-neutral-300 text-sm leading-relaxed max-w-sm line-clamp-2"
                >
                  {{
                    group.category.description ||
                      "Explore the latest collection of premium " +
                        group.category.name +
                        " for your next project."
                  }}
                </p>
                <a
                  [routerLink]="['/category', group.category.slug]"
                  class="inline-flex h-12 px-6 bg-white hover:bg-orange-600 text-neutral-950 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest items-center gap-2 transition-colors duration-300 shadow-md"
                >
                  VIEW COLLECTION
                  <mat-icon class="scale-75">arrow_forward</mat-icon>
                </a>
              </div>
            </div>

            <!-- Medium Cards Grid -->
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
                    class="w-32 h-32 md:w-36 md:h-36 bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl flex items-center justify-center p-1.5 shrink-0 overflow-hidden border border-neutral-100 dark:border-neutral-800/30"
                  >
                    <img
                      [src]="
                        (p.images && p.images[0]?.url) ||
                        (p.images && p.images[0]) ||
                        'https://via.placeholder.com/150'
                      "
                      class="w-full h-full object-contain transform group-hover/item:scale-110 transition-transform duration-700 ease-out"
                      referrerpolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div
                    class="flex-1 min-w-0 flex flex-col justify-center space-y-1.5 text-left"
                  >
                    <span
                      class="text-[9px] font-extrabold uppercase tracking-widest text-[#d65108] truncate"
                      >{{ p.brand }}</span
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

  shopByCategoryGroups = computed(() => {
    const products = this.ds.products();
    const categories = this.ds.categories();
    const selectedSlugs = this.selectedCategorySlugs();
    const targetSlugs =
      selectedSlugs.length > 0 ? selectedSlugs : ["3d-printers", "materials"];
    const groups = [];
    const isDealer = this.isDealerPriceActive();

    for (const slug of targetSlugs) {
      const category = categories.find(
        (c) => String(c.slug).toLowerCase() === slug || String(c.id) === slug,
      );
      if (!category) continue;

      const childIds = categories
        .filter((c) => c.parent_id === category.id)
        .map((c) => c.id);
      const targetIds = [category.id, ...childIds];

      const catProducts = products
        .filter((p) =>
          targetIds.includes(
            p.category_id || p.categoryId || p.category?.id || "",
          ),
        )
        .sort((a, b) => {
          const aScore =
            (a as any).salesCount ||
            0 + (a.reviews?.length || 0) + (a.avgRating || 0);
          const bScore =
            (b as any).salesCount ||
            0 + (b.reviews?.length || 0) + (b.avgRating || 0);
          return (
            bScore - aScore ||
            String(a.name || "").localeCompare(String(b.name || ""))
          );
        })
        .slice(0, 5)
        .map((p) => ({
          ...p,
          activePrice: isDealer
            ? p.dealerPrice || p.dealer_price || p.salePrice || p.sale_price
            : p.salePrice || p.sale_price || p.mrp,
        }));

      groups.push({ category, products: catProducts });
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
