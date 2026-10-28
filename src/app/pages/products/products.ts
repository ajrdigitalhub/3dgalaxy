import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  OnInit,
  HostListener,
  DestroyRef,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule, DOCUMENT } from "@angular/common";
import { RouterModule, ActivatedRoute, Router } from "@angular/router";
import { Title, Meta } from "@angular/platform-browser";
import { MatIconModule } from "@angular/material/icon";
import { DatastoreService, Product, Category } from "../../services/datastore";
import { ApiService } from "../../services/api.service";
import { LoadingService } from "../../core/services/loading.service";
import { SkeletonProductCardComponent } from "../../shared/components/skeleton/skeleton-product-card/skeleton-product-card.component";
import { Subject, ReplaySubject, combineLatest, of, firstValueFrom } from "rxjs";
import { debounceTime, distinctUntilChanged, switchMap, catchError } from "rxjs/operators";
import { ToastService } from "../../shared/components/toast/toast.service";

import { DeliveryEstimatePipe } from "../../shared/pipes/delivery-estimate.pipe";
import { hasProductVariants } from "../../shared/utils/product.utils";
import { environment } from "../../../environments/environment";
import { AnalyticsService, mapProductToAnalyticsItem } from "../../core/analytics";
import { ShippingService } from "../../core/services/shipping.service";
import { SeoService } from "../../core/services/seo.service";

@Component({
  selector: "app-products",
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    SkeletonProductCardComponent,
    DeliveryEstimatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./products.html",
  styleUrl: "./products.scss",
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
  analytics = inject(AnalyticsService);
  shippingService = inject(ShippingService);
  toastService = inject(ToastService);
  seoService = inject(SeoService);
  wishlistIds = signal<Set<string>>(new Set());

  isFreeShippingApplicable(p: any): boolean {
    return this.shippingService.isFreeShippingApplicable(p);
  }

  // API State Signals
  productsList = signal<any[]>([]);
  totalProducts = signal<number>(0);
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  itemsPerPage = signal<number>(15);
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
    compatibilities: [],
  });

  // Local UI State
  expandedGroups = signal<Set<string>>(
    new Set(["category", "brand", "price", "rating", "availability"]),
  );
  showMobileFilters = signal<boolean>(false);
  showFilterDrawer = signal<boolean>(false);
  isListView = signal<boolean>(false);

  // Search filter inputs inside the sidebar (for local filtering of long lists)
  brandSearchTerm = signal<string>("");
  categorySearchTerm = signal<string>("");
  materialSearchTerm = signal<string>("");
  compatSearchTerm = signal<string>("");
  activeQuickDropdown = signal<string | null>(null);

  @HostListener("document:click")
  closeQuickDropdowns() {
    this.activeQuickDropdown.set(null);
  }

  toggleQuickDropdown(name: string, event: Event) {
    event.stopPropagation();
    this.activeQuickDropdown.set(
      this.activeQuickDropdown() === name ? null : name
    );
  }

  // Active query parameters (mirrored for convenience)
  queryParams = signal<Record<string, any>>({});
  activeSearch = signal<string>("");
  activeCategory = signal<string>("");
  activeSubcategory = signal<string>("");
  activeBrand = signal<string>("");
  activePriceMin = signal<string>("");
  activePriceMax = signal<string>("");
  activeRating = signal<string>("");
  activeStock = signal<string>("");
  activeFeatured = signal<string>("");
  activeColor = signal<string>("");
  activeMaterial = signal<string>("");
  activeTechnology = signal<string>("");
  activePrinterType = signal<string>("");
  activeCompatibility = signal<string>("");
  activeSort = signal<string>("popularity");

  // Debounced search subject
  private searchSubject = new Subject<string>();
  private filterRequest$ = new ReplaySubject<any>(1);
  private destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const ready = this.ds.authReady();
      const role = this.ds.userRole();

      if (!ready) return;

      if (role === "guest") {
        this.wishlistIds.set(new Set());
        return;
      }

      this.loadWishlist();
    });

    this.destroyRef.onDestroy(() => {
      this.seoService.removeJsonLd('category');
      this.seoService.removeJsonLd('breadcrumbs');
    });
  }

  ngOnInit() {
    // Set up switchMap request cancellation for product filters
    this.filterRequest$.pipe(
      switchMap((queryParams) => {
        this.isLoading.set(true);
        return this.api.get<any>("/products", queryParams).pipe(
          catchError((err) => {
            console.error("Failed to load products:", err);
            return of({ products: [], total: 0, totalPages: 1, availableFilters: null });
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((res: any) => {
      const products = res?.products || [];
      this.productsList.set(products);
      this.totalProducts.set(res?.total || 0);
      this.totalPages.set(res?.totalPages || 1);
      if (res?.availableFilters) {
        this.availableFilters.set(res.availableFilters);
      }
      this.isLoading.set(false);

      if (products.length > 0) {
        const listName = this.activeCategory() ? `Category: ${this.activeCategory()}` : 'Product Catalog';
        const listId = this.activeCategory() || 'all_products';
        const analyticsItems = products.slice(0, 20).map((p: any, idx: number) =>
          mapProductToAnalyticsItem(p, {
            item_list_id: listId,
            item_list_name: listName,
            index: idx + 1
          })
        );
        this.analytics.trackProductImpression(analyticsItems, listName);
      }
    });

    // Combine route path parameters and query parameters to run synchronously
    combineLatest([this.route.params, this.route.queryParams])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, queryParams]) => {
        const mergedParams = { ...(queryParams || {}) };

        if (params["categorySlug"]) {
          const slug = params["categorySlug"];
          const cat = this.ds
            .categories()
            .find((c) => c.slug === slug || c.id === slug);
          const catValue = cat ? cat.id : slug;

          // Set category from route path only if query parameter was not already provided
          if (!mergedParams["category"]) {
            mergedParams["category"] = catValue;
          }

          const name = cat ? cat.name : slug.replace(/-/g, " ");
          const fullTitle = `${name} | Buy Online at Best Price in India | 3D Galaxy`;
          const fullDesc = `Shop genuine ${name} at India's lowest prices. Explore authorized 3D printers, filaments, and parts with warranty & fast dispatch.`;
          this.setSeoTags(
            fullTitle,
            fullDesc,
            `category/${slug}`,
            {
              id: cat?.id,
              name: name,
              slug: slug,
              description: fullDesc,
              image: cat?.image || (cat as any)?.bannerImage
            }
          );
        } else if (params["brandSlug"]) {
          const bSlug = params["brandSlug"];
          const b = this.ds
            .brands()
            .find((br) => br.slug === bSlug || br.name === bSlug);
          const bValue = b ? b.name : bSlug;

          // Set brand from route path only if query parameter was not already provided
          if (!mergedParams["brand"]) {
            mergedParams["brand"] = bValue;
          }

          const name = b ? b.name : bSlug;
          const fullTitle = `Buy Original ${name} Products Online | 3D Galaxy India`;
          const fullDesc = `Get authorized ${name} 3D printers, parts & accessories at the best rates in India. 100% genuine products with manufacturer warranty & fast delivery.`;
          this.setSeoTags(
            fullTitle,
            fullDesc,
            `brand/${bSlug}`,
            {
              id: b?.id,
              name: name,
              slug: bSlug,
              description: fullDesc,
              image: (b as any)?.image || (b as any)?.logo
            }
          );
        } else {
          this.setSeoTags(
            "Buy 3D Printers, Filaments & Spare Parts Online | 3D Galaxy",
            "Browse India's largest catalog of industrial 3D printers, SLA/FDM materials, filaments, and precision spare parts. OEM warranty & bulk dealer discounts available.",
            "products",
          );
        }

        this.queryParams.set(mergedParams);
        this.syncParamsToSignals(mergedParams);
        this.fetchFilteredProducts();
      });

    // Set up debounced search inside page input
    this.searchSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((term) => {
        this.updateUrlQueryParam("search", term);
      });


  }

  setSeoTags(title: string, desc: string, path: string, categoryData?: any) {
    const canonicalPath = path.startsWith('/') ? path : `/${path}`;
    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: "description", content: desc });
    this.metaService.updateTag({ name: "robots", content: "index, follow" });

    this.seoService.setCanonicalUrl(canonicalPath);
    this.seoService.setSocialMetadata({
      title,
      description: desc,
      url: canonicalPath,
      image: categoryData?.image || 'https://3dgalaxy.co.in/3d-logo.png',
      type: 'website'
    });

    if (categoryData) {
      this.seoService.setCategorySeo(categoryData);
    } else {
      this.seoService.setBreadcrumbsSeo([
        { name: 'Home', url: '/' },
        { name: title.split('|')[0].trim(), url: canonicalPath }
      ]);
    }
  }

  syncParamsToSignals(params: any) {
    this.currentPage.set(params["page"] ? parseInt(params["page"], 10) : 1);
    this.itemsPerPage.set(params["limit"] ? parseInt(params["limit"], 10) : 15);

    this.activeSearch.set(params["search"] || "");
    this.activeCategory.set(params["category"] || "");
    this.activeSubcategory.set(params["subcategory"] || "");
    this.activeBrand.set(params["brand"] || "");
    this.activeRating.set(params["rating"] || "");
    this.activeStock.set(params["stock"] || "");
    this.activeFeatured.set(params["featured"] || "");
    this.activeColor.set(params["color"] || "");
    this.activeMaterial.set(params["material"] || "");
    this.activeTechnology.set(params["technology"] || "");
    this.activePrinterType.set(params["printerType"] || "");
    this.activeCompatibility.set(params["compatibility"] || "");
    this.activeSort.set(params["sort"] || "popularity");

    // Parse price range from 'price=min-max'
    if (params["price"]) {
      const parts = params["price"].split("-");
      this.activePriceMin.set(parts[0] || "");
      this.activePriceMax.set(parts[1] || "");
    } else {
      this.activePriceMin.set("");
      this.activePriceMax.set("");
    }
  }

  fetchFilteredProducts() {
    this.isLoading.set(true);

    const queryParams: any = {
      page: this.currentPage().toString(),
      limit: this.itemsPerPage().toString(),
      sort: this.activeSort(),
    };

    if (this.activeSearch()) queryParams.search = this.activeSearch();
    if (this.activeCategory()) queryParams.category = this.activeCategory();
    if (this.activeSubcategory())
      queryParams.subcategory = this.activeSubcategory();
    if (this.activeBrand()) queryParams.brand = this.activeBrand();
    if (this.activePriceMin()) queryParams.priceMin = this.activePriceMin();
    if (this.activePriceMax()) queryParams.priceMax = this.activePriceMax();
    if (this.activeRating()) queryParams.rating = this.activeRating();
    if (this.activeStock()) queryParams.stock = this.activeStock();
    if (this.activeFeatured()) queryParams.featured = this.activeFeatured();
    if (this.activeColor()) queryParams.color = this.activeColor();
    if (this.activeMaterial()) queryParams.material = this.activeMaterial();
    if (this.activeTechnology())
      queryParams.technology = this.activeTechnology();
    if (this.activePrinterType())
      queryParams.printerType = this.activePrinterType();
    if (this.activeCompatibility())
      queryParams.compatibility = this.activeCompatibility();

    this.filterRequest$.next(queryParams);
  }

  // URL Manipulation & Filter Navigation Helpers
  navigateWithFilters(queryParams: Record<string, any>) {
    this.router.navigate(["/products"], {
      queryParams,
    });
  }

  updateUrlQueryParam(key: string, value: string | null) {
    const currentParams = { ...this.queryParams() };
    if (value) {
      currentParams[key] = value;
    } else {
      delete currentParams[key];
    }
    if (key !== "page") {
      currentParams["page"] = "1";
    }

    this.navigateWithFilters(currentParams);
  }

  toggleFilter(key: string, value: string) {
    const currentParams = { ...this.queryParams() };
    let values = currentParams[key] ? currentParams[key].split(",") : [];

    let catObj: any = null;
    let brandObj: any = null;

    if (key === "category") {
      catObj = this.ds.categories().find((c) => c.id === value || c.slug === value || c.name.toLowerCase() === value.toLowerCase());
    } else if (key === "brand") {
      brandObj = this.ds.brands().find((br) => br.id === value || br.slug === value || br.name.toLowerCase() === value.toLowerCase());
    }

    const isMatch = (v: string) => {
      if (v === value) return true;
      if (catObj && (v === catObj.id || v === catObj.slug || v.toLowerCase() === catObj.name.toLowerCase())) return true;
      if (brandObj && (v.toLowerCase() === brandObj.name.toLowerCase() || v.toLowerCase() === brandObj.slug.toLowerCase() || v === brandObj.id)) return true;
      return v.toLowerCase() === value.toLowerCase();
    };

    if (values.some(isMatch)) {
      values = values.filter((v: string) => !isMatch(v));
    } else {
      values.push(value);
    }

    if (values.length > 0) {
      currentParams[key] = values.join(",");
    } else {
      delete currentParams[key];
    }

    currentParams["page"] = "1";

    this.navigateWithFilters(currentParams);
  }

  isFilterActive(key: string, value: string): boolean {
    const param = this.queryParams()[key];
    if (!param) return false;
    const values = param.split(",");
    if (values.includes(value)) return true;

    if (key === "category") {
      const cat = this.ds.categories().find((c) => c.id === value || c.slug === value || c.name.toLowerCase() === value.toLowerCase());
      if (cat) {
        return values.some((v: string) => v === cat.id || v === cat.slug || v.toLowerCase() === cat.name.toLowerCase());
      }
      return values.some((v: string) => v.toLowerCase() === value.toLowerCase());
    }
    if (key === "brand") {
      const b = this.ds.brands().find((br) => br.id === value || br.slug === value || br.name.toLowerCase() === value.toLowerCase());
      if (b) {
        return values.some((v: string) => v.toLowerCase() === b.name.toLowerCase() || v.toLowerCase() === b.slug.toLowerCase() || v === b.id);
      }
      return values.some((v: string) => v.toLowerCase() === value.toLowerCase());
    }
    return values.some((v: string) => v.toLowerCase() === value.toLowerCase());
  }

  setPriceRange(min: string, max: string) {
    const currentParams = { ...this.queryParams() };
    const cleanMin = min ? min.trim() : "";
    const cleanMax = max ? max.trim() : "";

    if (cleanMin || cleanMax) {
      currentParams["price"] = `${cleanMin}-${cleanMax}`;
    } else {
      delete currentParams["price"];
    }
    currentParams["page"] = "1";

    this.navigateWithFilters(currentParams);
  }

  clearPriceRange() {
    this.updateUrlQueryParam("price", null);
  }

  clearAllFilters() {
    const currentParams = { ...this.queryParams() };
    const preserved: Record<string, any> = {};
    if (currentParams["sort"]) preserved["sort"] = currentParams["sort"];
    if (currentParams["limit"]) preserved["limit"] = currentParams["limit"];

    this.activeSearch.set("");
    this.activeCategory.set("");
    this.activeSubcategory.set("");
    this.activeBrand.set("");
    this.activePriceMin.set("");
    this.activePriceMax.set("");
    this.activeRating.set("");
    this.activeStock.set("");
    this.activeFeatured.set("");
    this.activeColor.set("");
    this.activeMaterial.set("");
    this.activeTechnology.set("");
    this.activePrinterType.set("");
    this.activeCompatibility.set("");
    this.brandSearchTerm.set("");
    this.categorySearchTerm.set("");
    this.materialSearchTerm.set("");

    this.navigateWithFilters(preserved);
  }

  removeSingleFilter(key: string, value: string) {
    if (key === "price") {
      this.clearPriceRange();
      return;
    }
    if (key === "search" || key === "rating") {
      this.updateUrlQueryParam(key, null);
      return;
    }
    this.toggleFilter(key, value);
  }

  applyDrawerFilters(min?: string, max?: string) {
    const currentMin = this.activePriceMin();
    const currentMax = this.activePriceMax();
    const newMin = (min !== undefined && min !== null ? min : currentMin).trim();
    const newMax = (max !== undefined && max !== null ? max : currentMax).trim();

    if (newMin !== currentMin || newMax !== currentMax) {
      this.setPriceRange(newMin, newMax);
    }
    this.showFilterDrawer.set(false);
  }

  // Collapsible Accordion Groups
  toggleGroup(groupId: string) {
    this.expandedGroups.update((set) => {
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
  filterListOptions(list: any[], searchTerm: string, labelKey = "name"): any[] {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase().trim();
    return list.filter((item) => {
      const label = (item[labelKey] || item || "").toString().toLowerCase();
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
    const cats = this.availableFilters()?.categories || [];
    if (cats.length > 0) {
      return cats.filter((c: any) => !c.parentId);
    }
    return (this.ds.categories() || []).filter((c: any) => !c.parentId);
  }

  getChildCategories(parentId: string): any[] {
    const cats = this.availableFilters()?.categories || [];
    if (cats.length > 0) {
      return cats.filter((c: any) => c.parentId === parentId);
    }
    return (this.ds.categories() || []).filter((c: any) => c.parentId === parentId);
  }

  getRatingOptions(): any[] {
    return this.availableFilters()
      .ratings.filter((r: any) => r.rating < 5)
      .reverse();
  }

  floorValue(val: number): number {
    return Math.floor(val || 0);
  }

  getStarsArray(count: number): number[] {
    return Array(count).fill(0);
  }

  getProductAvgRating(p: any): number {
    if (!p) return 0;
    const reviews = Array.isArray(p.reviews) ? p.reviews : [];
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
      return Math.round((sum / reviews.length) * 10) / 10;
    }
    return p.avgRating ? Math.round(Number(p.avgRating) * 10) / 10 : 0;
  }

  getProductReviewCount(p: any): number {
    if (!p) return 0;
    const reviews = Array.isArray(p.reviews) ? p.reviews : [];
    if (reviews.length > 0) {
      return reviews.length;
    }
    return p.ratingCount || 0;
  }

  // Helper for dealer price calculations
  isDealerPriceActive = computed(() => {
    const r = this.ds.userRole();
    return (
      r === "admin" ||
      r === "super-admin" ||
      (this.ds.activeUser()?.rewardPoints || 0) > 300
    );
  });

  activePrice(p: any): number {
    return this.isDealerPriceActive()
      ? p.dealerPrice || p.activePrice
      : p.salePrice || p.activePrice;
  }

  getMrp(p: any): number {
    return p.basePrice;
  }

  mrpDiscountPercent(p: any): number {
    const sale = this.activePrice(p);
    const mrp = this.getMrp(p) || 1;
    return Math.round(((mrp - sale) / mrp) * 100);
  }

  hasVariants(p: any): boolean {
    return hasProductVariants(p);
  }

  addToCart(p: any) {
    if (this.hasVariants(p)) {
      this.router.navigate(['/product', p.slug || p.id]);
      return;
    }
    this.ds.addToCart(p, 1);
    const price = this.activePrice(p);
    const item = mapProductToAnalyticsItem(p, {
      quantity: 1,
      price: price,
      item_list_name: this.activeCategory() ? `Category: ${this.activeCategory()}` : 'Product Catalog'
    });
    this.analytics.trackAddToCart(item, 1);
  }

  getCategoryIcon(catId: string): string {
    const icons: Record<string, string> = {
      "3d-printers": "precision_manufacturing",
      materials: "grain",
      "3d-pens": "gesture",
      scanners: "document_scanner",
      "laser-engravers": "grain",
      "stem-kits": "school",
      "spare-parts": "build",
      "brahma-farm": "hub",
      fdm: "layers",
      "fdm-multicolor": "palette",
      resin: "opacity",
      diy: "hardware",
      "semi-assembled": "construction",
      assembled: "check_circle",
    };
    return icons[catId] || "category";
  }

  // Active filter display labels mapping
  getActiveFilterChips(): { key: string; value: string; label: string; display: string; icon: string }[] {
    const chips: { key: string; value: string; label: string; display: string; icon: string }[] = [];
    const params = this.queryParams();

    if (params["search"]) {
      chips.push({
        key: "search",
        value: params["search"],
        label: "Search",
        display: `"${params["search"]}"`,
        icon: "search",
      });
    }
    if (params["category"]) {
      params["category"].split(",").forEach((val: string) => {
        const cat = this.ds
          .categories()
          .find((c) => c.id === val || c.slug === val);
        chips.push({
          key: "category",
          value: val,
          label: "Category",
          display: cat ? cat.name : val,
          icon: "category",
        });
      });
    }
    if (params["subcategory"]) {
      params["subcategory"].split(",").forEach((val: string) => {
        const sub = this.ds
          .categories()
          .find((c) => c.id === val || c.slug === val);
        chips.push({
          key: "subcategory",
          value: val,
          label: "Subcategory",
          display: sub ? sub.name : val,
          icon: "subdirectory_arrow_right",
        });
      });
    }
    if (params["brand"]) {
      params["brand"].split(",").forEach((val: string) => {
        chips.push({
          key: "brand",
          value: val,
          label: "Brand",
          display: val,
          icon: "sell"
        });
      });
    }
    if (params["price"]) {
      chips.push({
        key: "price",
        value: params["price"],
        label: "Price",
        display: `₹${params["price"].replace("-", " - ₹")}`,
        icon: "payments",
      });
    }
    if (params["rating"]) {
      chips.push({
        key: "rating",
        value: params["rating"],
        label: "Rating",
        display: `${params["rating"]}★ & Up`,
        icon: "star",
      });
    }
    if (params["stock"]) {
      params["stock"].split(",").forEach((val: string) => {
        const displayMap: Record<string, string> = {
          IN_STOCK: "In Stock",
          OUT_OF_STOCK: "Out of Stock",
          PRE_ORDER: "Pre Order",
          COMING_SOON: "Coming Soon",
        };
        chips.push({
          key: "stock",
          value: val,
          label: "Availability",
          display: displayMap[val] || val,
          icon: "inventory_2",
        });
      });
    }
    if (params["featured"]) {
      params["featured"].split(",").forEach((val: string) => {
        chips.push({
          key: "featured",
          value: val,
          label: "Offers",
          display: val.replace("_", " "),
          icon: "local_offer",
        });
      });
    }
    if (params["color"]) {
      params["color"].split(",").forEach((val: string) => {
        chips.push({
          key: "color",
          value: val,
          label: "Color",
          display: val,
          icon: "palette"
        });
      });
    }
    if (params["material"]) {
      params["material"].split(",").forEach((val: string) => {
        chips.push({
          key: "material",
          value: val,
          label: "Material",
          display: val,
          icon: "layers",
        });
      });
    }
    if (params["technology"]) {
      params["technology"].split(",").forEach((val: string) => {
        chips.push({
          key: "technology",
          value: val,
          label: "Tech",
          display: val,
          icon: "precision_manufacturing"
        });
      });
    }
    if (params["printerType"]) {
      params["printerType"].split(",").forEach((val: string) => {
        chips.push({
          key: "printerType",
          value: val,
          label: "Type",
          display: val,
          icon: "print"
        });
      });
    }
    if (params["compatibility"]) {
      params["compatibility"].split(",").forEach((val: string) => {
        chips.push({
          key: "compatibility",
          value: val,
          label: "Fits",
          display: val,
          icon: "settings_suggest",
        });
      });
    }

    return chips;
  }

  onProductClick(product: any, index?: number): void {
    if (!product) return;
    const listName = this.activeCategory() ? `Category: ${this.activeCategory()}` : 'Product Catalog';
    const listId = this.activeCategory() || 'all_products';
    const item = mapProductToAnalyticsItem(product, {
      item_list_id: listId,
      item_list_name: listName,
      index: index !== undefined ? index + 1 : undefined
    });
    this.analytics.trackProductClick(item, listName);
  }

  async loadWishlist() {
    if (!this.ds.authReady() || this.ds.userRole() === "guest") {
      this.wishlistIds.set(new Set());
      return;
    }
    try {
      const res: any = await firstValueFrom(this.api.get<any>("/wishlist"));
      if (res?.success && Array.isArray(res.data)) {
        const ids = new Set<string>();
        res.data.forEach((i: any) => {
          if (i.productId) ids.add(i.productId);
          else if (i.id) ids.add(i.id);
        });
        this.wishlistIds.set(ids);
      }
    } catch (e) {
      console.error("Failed to load wishlist", e);
    }
  }

  async toggleWishlist(productId: string) {
    if (!productId) return;
    if (this.ds.userRole() === "guest") {
      this.toastService.info("Please log in to manage your wishlist");
      this.router.navigate(["/login"]);
      return;
    }

    const current = this.wishlistIds();
    const isWishlisted = current.has(productId);
    const newSet = new Set(current);

    if (isWishlisted) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    this.wishlistIds.set(newSet);

    try {
      if (isWishlisted) {
        await firstValueFrom(this.api.delete(`/wishlist/${productId}`));
        this.toastService.success("Removed from Wishlist");
      } else {
        await firstValueFrom(this.api.post("/wishlist", { productId }));
        this.toastService.success("Added to Wishlist");
      }
    } catch (e) {
      // Revert optimistic update
      this.wishlistIds.set(current);
      this.toastService.error(
        isWishlisted ? "Failed to remove from wishlist" : "Failed to add to wishlist"
      );
    }
  }
}
