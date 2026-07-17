import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { CommonModule, DOCUMENT } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule, Router } from "@angular/router";
import { Title, Meta, DomSanitizer } from "@angular/platform-browser";
import { MatIconModule } from "@angular/material/icon";
import { DatastoreService, Product, Review } from "../../services/datastore";
import { LoadingService } from "../../core/services/loading.service";
import { ApiService } from "../../services/api.service";
import { ToastService } from "../../shared/components/toast/toast.service";
import { SkeletonPageComponent } from "../../shared/components/skeleton/skeleton-page/skeleton-page.component";
import { AppButton } from "../../shared/components/app-button/app-button";
import { environment } from "../../../environments/environment";
import { ScrollRevealDirective } from "../../shared/directives/scroll-reveal.directive";
import { TiltDirective } from "../../shared/directives/tilt.directive";

@Component({
  selector: "app-product-detail",
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    SkeletonPageComponent,
    AppButton,
    ScrollRevealDirective,
    TiltDirective,
    FormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./product-detail.html",
  styleUrl: "./product-detail.scss",
})
export class ProductDetail {
  private sanitizer = inject(DomSanitizer);
  route = inject(ActivatedRoute);
  ds = inject(DatastoreService);
  loadingService = inject(LoadingService);
  api = inject(ApiService);
  toastService = inject(ToastService);
  router = inject(Router);

  isAddingToCart = signal(false);
  isSubmittingReview = signal(false);
  isLoadingProduct = signal(true);
  isReviewModalOpen = signal(false);
  reviewsHighlight = signal(false);
  @ViewChild("relatedScroll") relatedScroll?: ElementRef<HTMLElement>;
  reviewDraft = signal({
    rating: 5,
    title: "",
    comment: "",
    recommended: true,
    images: [] as File[],
    imagePreviews: [] as string[],
    uploading: false,
  });
  reviewSort = signal<
    "helpful" | "latest" | "highest" | "lowest" | "images" | "verified"
  >("latest");
  reviewSortOptions = [
    { key: "latest" as const, label: "Latest" },
    { key: "helpful" as const, label: "Most Helpful" },
    { key: "highest" as const, label: "Highest Rating" },
    { key: "lowest" as const, label: "Lowest Rating" },
    { key: "images" as const, label: "With Images" },
    { key: "verified" as const, label: "Verified Purchases" },
  ];
  reviewStats = computed(() => {
    const reviews = this.productReviews();
    const total = reviews.length;
    if (!total) {
      return { average: 0, total, distribution: [0, 0, 0, 0, 0] };
    }
    const distribution = [5, 4, 3, 2, 1].map(
      (star) => reviews.filter((r: any) => Number(r.rating) === star).length,
    );
    const sum = reviews.reduce(
      (acc: number, review: any) => acc + Number(review.rating || 0),
      0,
    );
    return { average: Number((sum / total).toFixed(1)), total, distribution };
  });
  filteredReviews = computed(() => {
    const reviews = [...this.productReviews()];
    const sort = this.reviewSort();
    if (sort === "highest")
      return reviews.sort((a, b) => Number(b.rating) - Number(a.rating));
    if (sort === "lowest")
      return reviews.sort((a, b) => Number(a.rating) - Number(b.rating));
    if (sort === "images")
      return reviews.filter((review: any) => (review.images || []).length > 0);
    if (sort === "verified")
      return reviews.filter((review: any) => review.verified !== false);
    if (sort === "helpful")
      return reviews.sort(
        (a, b) => Number(b.helpfulCount || 0) - Number(a.helpfulCount || 0),
      );
    return reviews.sort(
      (a, b) =>
        new Date(b.date || b.createdAt || 0).getTime() -
        new Date(a.date || a.createdAt || 0).getTime(),
    );
  });

  safeHtml(html: string) {
    if (!html) return "";
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  slug = signal<string>("");
  quantity = signal<number>(1);
  activeImage = signal<string>("");
  is360Active = signal<boolean>(false);
  rotationAngle = signal<number>(0);
  activeTab = signal<string>("overview");
  wishlistIds = signal<Set<string>>(new Set());

  // Variant Logic
  selectedOptions = signal<Record<string, string>>({}); // { optionName: valueString }

  private normalizeOptionKey(value: unknown): string {
    return String(value ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "");
  }

  private normalizeOptionValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number") {
      return String(value).trim();
    }
    return this.getOptionValueStr(value);
  }

  private getVariantOptionValues(variant: any): Record<string, string> {
    const values: Record<string, string> = {};
    const rawValues = variant?.optionValues || {};
    Object.entries(rawValues).forEach(([key, value]) => {
      values[this.normalizeOptionKey(key)] = this.normalizeOptionValue(value);
    });

    const optionItems = Array.isArray(variant?.options) ? variant.options : [];
    optionItems.forEach((item: any) => {
      const key =
        item?.optionName || item?.optionValue?.optionName || item?.name || "";
      const value =
        item?.optionValue?.value ||
        item?.value ||
        item?.optionValue?.label ||
        item?.label ||
        "";
      if (key) {
        values[this.normalizeOptionKey(key)] = this.normalizeOptionValue(value);
      }
    });

    return values;
  }

  private getSelectedOptionsFromVariant(
    product: any,
    variant: any,
  ): Record<string, string> {
    const opts: Record<string, string> = {};
    const optionNames = Array.isArray(product?.options)
      ? product.options.map((item: any) => this.getOptionValueStr(item.name))
      : [];
    const variantEntries = Object.entries(this.getVariantOptionValues(variant));

    if (!variantEntries.length) return opts;

    if (!optionNames.length) {
      const [firstKey, firstValue] = variantEntries[0];
      if (firstKey) opts[firstKey] = firstValue;
      return opts;
    }

    variantEntries.forEach(([key, value], index) => {
      const matchingName =
        optionNames[index] ||
        optionNames.find((name: unknown) => {
          const normalizedName = this.normalizeOptionKey(name);
          return (
            normalizedName === key ||
            normalizedName.includes(key) ||
            key.includes(normalizedName)
          );
        }) ||
        key;
      if (matchingName) {
        opts[matchingName] = value;
      }
    });

    return opts;
  }

  private extractVariantImages(variant: any): any[] {
    const images: any[] = [];
    if (!variant) return images;
    if (Array.isArray(variant.images)) images.push(...variant.images);
    if (Array.isArray(variant.variantImages))
      images.push(...variant.variantImages);
    return images.filter(Boolean);
  }

  private syncVariantSelection(product: any, variant: any) {
    const variantImages = this.extractVariantImages(variant);
    if (variantImages.length > 0) {
      this.activeImage.set(this.getImageUrl(variantImages[0]));
    } else if (product?.images?.length) {
      this.activeImage.set(this.getImageUrl(product.images[0]));
    }

    const mappedOptions = this.getSelectedOptionsFromVariant(product, variant);
    if (Object.keys(mappedOptions).length > 0) {
      this.selectedOptions.set(mappedOptions);
    }
  }

  selectedVariant = computed(() => {
    const p = this.product();
    if (!p || !p.variants || p.variants.length === 0) return null;
    const opts = this.selectedOptions();
    const matched = p.variants.find((variant: any) => {
      const variantOptions = this.getVariantOptionValues(variant);
      if (!Object.keys(variantOptions).length) return false;
      return Object.keys(opts).every((key) => {
        const normalizedKey = this.normalizeOptionKey(key);
        const matchedKey = Object.keys(variantOptions).find((variantKey) => {
          const normalizedVariantKey = this.normalizeOptionKey(variantKey);
          return (
            normalizedVariantKey === normalizedKey ||
            normalizedVariantKey.includes(normalizedKey) ||
            normalizedKey.includes(normalizedVariantKey)
          );
        });
        if (!matchedKey) return false;
        return (
          this.normalizeOptionValue(variantOptions[matchedKey]) ===
          this.normalizeOptionValue(opts[key])
        );
      });
    });
    return matched || null;
  });

  galleryImages = computed(() => {
    const productImages = Array.isArray(this.product()?.images)
      ? this.product()?.images
      : [];

    const variant = this.selectedVariant();
    const variantImages: any[] = [];
    if (variant) {
      if (Array.isArray(variant.images)) {
        variantImages.push(...variant.images);
      }
      if (Array.isArray(variant.variantImages)) {
        variantImages.push(...variant.variantImages);
      }
    }

    const allImages = [...variantImages, ...productImages];
    const seen = new Set<string>();
    return allImages.filter((img) => {
      const url = this.getImageUrl(img).trim();
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  });

  getColorCode(colorName: string): string {
    if (!colorName || typeof colorName !== "string") return "#e2e8f0";
    const name = colorName.toLowerCase().trim();
    const colors: Record<string, string> = {
      white: "#ffffff",
      black: "#000000",
      red: "#ef4444",
      blue: "#3b82f6",
      green: "#22c55e",
      yellow: "#eab308",
      orange: "#f97316",
      grey: "#6b7280",
      gray: "#6b7280",
      purple: "#a855f7",
      pink: "#ec4899",
      brown: "#78350f",
      ivory: "#fffff0",
      silver: "#c0c0c0",
      gold: "#ffd700",
      copper: "#b87333",
      natural: "#e2e8f0",
      translucent: "#f1f5f9",
      sky_blue: "#0ea5e9",
      metallic_blue: "#1d4ed8",
    };
    return colors[name] || colors[name.replace(/\s+/g, "_")] || name;
  }

  isOptionValueOutOfStock(optionName: string, val: string): boolean {
    const p = this.product();
    if (!p || !p.variants || p.variants.length === 0) return false;
    const toStr = (v: any) =>
      typeof v === "string" ? v : v?.label || v?.value || v?.name || String(v);
    const currentOpts = { ...this.selectedOptions(), [optionName]: val };
    const matchingVariant = p.variants.find((v: any) => {
      if (!v.optionValues) return false;
      return Object.keys(currentOpts).every(
        (k) => toStr(v.optionValues[k]) === toStr(currentOpts[k]),
      );
    });

    if (matchingVariant) {
      return matchingVariant.stock <= 0;
    }

    const anyInStock = p.variants.some((v: any) => {
      return (
        v.optionValues &&
        toStr(v.optionValues[optionName]) === toStr(val) &&
        v.stock > 0
      );
    });
    return !anyInStock;
  }

  initializeDefaultVariant(p: any) {
    if (!p) return;
    const queryParams = this.route.snapshot.queryParams;
    const initialVariantId = queryParams["variant"];

    let targetVariant = p.variants?.find(
      (v: any) => String(v.id) === String(initialVariantId),
    );
    if (!targetVariant && p.variants && p.variants.length > 0) {
      targetVariant = p.variants.find((v: any) => v.isDefault) || p.variants[0];
    }

    if (targetVariant) {
      this.syncVariantSelection(p, targetVariant);

      if (!initialVariantId) {
        this.router.navigate([], {
          queryParams: { variant: targetVariant.id },
          queryParamsHandling: "merge",
          replaceUrl: true,
        });
      }
    } else {
      this.selectedOptions.set({});
      if (p.images && p.images.length > 0) {
        this.activeImage.set(this.getImageUrl(p.images[0]));
      }
    }
  }

  // Discussions and rating state drafts
  newQuestionText = signal<string>("");
  draftStars = signal<number>(5);
  draftComment = signal<string>("");

  fetchedProduct = signal<any>(null);

  product = computed(() => {
    // Return fetched details if available, else structural outline
    return (
      this.fetchedProduct() ||
      this.ds.products().find((p) => p.slug === this.slug())
    );
  });

  detailTabs = computed(() => [
    { id: "overview", label: "Overview" },
    {
      id: "specs",
      label: "Technical Specifications",
      visible: this.productSpecs().length > 0,
    },
    {
      id: "features",
      label: "Features",
      visible: this.productFeatures().length > 0,
    },
    {
      id: "downloads",
      label: "Downloads",
      visible: this.productDownloads().length > 0,
    },
    { id: "reviews", label: "Reviews & Ratings" },
    {
      id: "faqs",
      label: "Frequently Asked Questions",
      visible: this.productFaqs().length > 0,
    },
  ]);

  breadcrumbs = computed(() => {
    const p = this.product();
    if (!p) return [];
    const crumbs = [];
    const cat = this.ds.categories().find((c) => c.id === p.category_id);
    if (cat) {
      crumbs.push({ label: cat.name, url: "/category/" + cat.slug });
    }
    const brand = this.ds.brands().find((b) => b.name === p.brand);
    if (brand) {
      crumbs.push({ label: brand.name, url: "/brand/" + brand.slug });
    }
    return crumbs;
  });

  // Derived properties from product if available or fallback
  productSpecs = computed(
    () =>
      this.product()?.specifications?.map((s: any) => ({
        label: s.name,
        value: s.value,
      })) ||
      this.product()?.specs ||
      [],
  );
  productReviews = computed(() => {
    const reviews = this.product()?.reviews || [];
    return reviews.map((review: any) => ({
      ...review,
      rating: Number(review.rating || review.stars || 0),
      images: Array.isArray(review.images) ? review.images : [],
      helpfulCount: review.helpfulCount || 0,
      verified: review.verified !== false,
      title: review.title || review.comment || "Great purchase",
      comment: review.comment || review.review || "",
      date: review.date || review.createdAt || new Date().toISOString(),
      sellerReply: review.sellerReply || null,
    }));
  });
  productFeatures = computed(
    () => this.product()?.features || (this.product() as any)?.features || [],
  );
  productApplications = computed(
    () => (this.product() as any)?.applications || [],
  );
  productIncludes = computed(() => (this.product() as any)?.includes || []);
  productDownloads = computed(
    () => this.product()?.downloads || (this.product() as any)?.downloads || [],
  );
  productFaqs = computed(
    () => this.product()?.faqs || this.product()?.qnas || [],
  );

  relatedProducts = computed(() => {
    const p = this.product();
    if (!p) return [];

    const normalizeProduct = (item: any) => {
      if (!item) return null;
      if (typeof item === "object" && item.name) return item;
      if (typeof item === "object" && item.relatedProduct)
        return item.relatedProduct;
      const id =
        typeof item === "string"
          ? item
          : item.id || item.relatedToId || item.relatedProduct?.id;
      if (!id) return null;
      return this.ds.products().find((x) => x.id === id || x.slug === id);
    };

    let rels = p.relatedProducts;
    if (typeof rels === "string") {
      try {
        rels = JSON.parse(rels);
      } catch {
        rels = [];
      }
    }

    const explicitProducts = Array.isArray(rels)
      ? rels.map(normalizeProduct).filter((x): x is Product => Boolean(x))
      : [];

    if (explicitProducts.length > 0) {
      return Array.from(
        new Map(
          explicitProducts.map((product) => [
            product.id || product.slug,
            product,
          ]),
        ).values(),
      ).slice(0, 8);
    }

    return this.ds
      .products()
      .filter((x) => x.category_id === p.category_id && x.id !== p.id)
      .slice(0, 8);
  });

  optionalFilaments = computed(() => {
    return this.ds
      .products()
      .filter((p) => p.category_id === "cat-2")
      .slice(0, 4);
  });

  bundleProductsList = computed(() => {
    const p = this.product();
    if (!p || !p.bundleProducts) return [];
    const list =
      typeof p.bundleProducts === "string"
        ? JSON.parse(p.bundleProducts)
        : p.bundleProducts;
    if (!Array.isArray(list)) return [];
    return list
      .map((item: any) => {
        if (item && typeof item === "object" && item.name) return item;
        const id = typeof item === "string" ? item : item.id;
        return this.ds.products().find((x) => x.id === id);
      })
      .filter((x) => x !== undefined) as Product[];
  });

  recommendedFilamentsList = computed(() => {
    const p = this.product();
    if (!p || !p.recommendedFilaments) return [];
    const list =
      typeof p.recommendedFilaments === "string"
        ? JSON.parse(p.recommendedFilaments)
        : p.recommendedFilaments;
    if (!Array.isArray(list)) return [];
    return list
      .map((item: any) => {
        if (item && typeof item === "object" && item.name) return item;
        const id = typeof item === "string" ? item : item.id;
        return this.ds.products().find((x) => x.id === id);
      })
      .filter((x) => x !== undefined) as Product[];
  });

  scrollRelatedProducts(direction: number) {
    this.relatedScroll?.nativeElement.scrollBy({
      left: direction * 320,
      behavior: "smooth",
    });
  }

  scrollToReviews(event?: Event) {
    event?.preventDefault();
    this.activeTab.set("reviews");
    this.reviewsHighlight.set(true);
    setTimeout(() => this.reviewsHighlight.set(false), 1600);

    const currentFragment = this.route.snapshot.fragment;
    if (currentFragment !== "reviews") {
      this.router.navigate([], {
        fragment: "reviews",
        queryParamsHandling: "merge",
      });
    }

    setTimeout(() => {
      const reviewSection = this.document.getElementById("reviews");
      if (reviewSection) {
        const top =
          reviewSection.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }, 0);
  }

  addRelatedToCart(product: Product) {
    if (product.stock <= 0) {
      this.toastService.error(`${product.name} is out of stock.`);
      return;
    }
    this.ds.addToCart(product, 1);
    this.toastService.success(`${product.name} added to cart.`);
  }

  buyRelatedNow(product: Product) {
    this.router.navigate(["/checkout"], {
      state: { product, quantity: 1 },
    });
  }

  quickViewRelatedProduct(product: Product) {
    this.router.navigate(["/product", product.slug]);
  }

  addRecommendedFilamentToCart(filament: Product) {
    if (filament.stock <= 0) {
      this.toastService.error(`${filament.name} is out of stock.`);
      return;
    }
    this.ds.addToCart(filament, 1);
    this.toastService.success(`${filament.name} added to cart!`);
  }

  isDealerActive = computed(() => {
    const r = this.ds.userRole();
    return (
      r === "admin" ||
      r === "super-admin" ||
      (this.ds.activeUser()?.rewardPoints || 0) > 300
    );
  });

  titleService = inject(Title);
  metaService = inject(Meta);
  document = inject(DOCUMENT);

  activePrice(p: any): number {
    const variant = this.selectedVariant();
    const dealerPrice = variant
      ? variant.price
      : p.dealerPrice || p.dealer_price; // dealer fallback or variant price
    const salePrice = variant
      ? variant.salePrice || variant.price
      : p.salePrice || p.sale_price;

    return this.isDealerActive() ? dealerPrice : salePrice;
  }

  mrpDiscountPercent(p: any): number {
    const sale = this.activePrice(p);
    const mrp = this.getMrp(p);
    return Math.round(((mrp - sale) / mrp) * 100);
  }

  getMrp(p: any): number {
    const variant = this.selectedVariant();
    if (variant) return variant.price;
    return p.mrp || p.basePrice || p.sale_price || 0;
  }

  getImageUrl(img: any): string {
    return typeof img === "string" ? img : img?.url || "";
  }

  currentActiveImageUrl = computed(() => {
    const actImg = this.activeImage();
    if (actImg) return this.getImageUrl(actImg);
    const imgs = this.galleryImages();
    if (imgs && imgs.length > 0) return this.getImageUrl(imgs[0]);
    return "";
  });

  isZoomActive = signal<boolean>(false);
  lensLeft = signal<number>(0);
  lensTop = signal<number>(0);
  zoomBgPosition = signal<string>("0% 0%");

  onMouseEnter() {
    if (!this.is360Active()) {
      this.isZoomActive.set(true);
    }
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isZoomActive()) return;

    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const boundedX = Math.max(0, Math.min(x, rect.width));
    const boundedY = Math.max(0, Math.min(y, rect.height));

    const pctX = (boundedX / rect.width) * 100;
    const pctY = (boundedY / rect.height) * 100;

    const lensWidthPct = 30;
    const lensHeightPct = 30;

    let leftPct = (boundedX / rect.width) * 100 - lensWidthPct / 2;
    let topPct = (boundedY / rect.height) * 100 - lensHeightPct / 2;

    leftPct = Math.max(0, Math.min(leftPct, 100 - lensWidthPct));
    topPct = Math.max(0, Math.min(topPct, 100 - lensHeightPct));

    this.lensLeft.set(leftPct);
    this.lensTop.set(topPct);
    this.zoomBgPosition.set(`${pctX}% ${pctY}%`);
  }

  onMouseLeave() {
    this.isZoomActive.set(false);
  }

  selectOption(optionName: string, value: string) {
    this.selectedOptions.update((opts) => ({ ...opts, [optionName]: value }));

    const product = this.product();
    const variant = this.selectedVariant();
    if (product) {
      this.syncVariantSelection(product, variant);
    }

    if (variant) {
      this.router.navigate([], {
        queryParams: { variant: variant.id },
        queryParamsHandling: "merge",
        replaceUrl: true,
      });
    }
  }

  getOptionValueName(values: any[], selectedId: string): string {
    return selectedId || "";
  }

  /** Safely extract a plain string label from an option value that may be a string or object */
  getOptionValueStr(val: any): string {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "number") return String(val);
    // Handle objects — prefer label > value > name > toString
    return (
      val.label || val.value || val.name || val.title || JSON.stringify(val)
    );
  }

  constructor() {
    this.route.params.subscribe((p) => {
      if (p["slug"]) {
        const slugStr = p["slug"];
        this.slug.set(slugStr);

        // Fetch detailed product data
        this.isLoadingProduct.set(true);
        fetch(`${environment.apiUrl}/products/slug/${slugStr}`)
          .then((res) => res.json())
          .then((detailedProd) => {
            if (detailedProd && !detailedProd.error) {
              // Reconstruct flat object for existing frontend properties mapped to it
              const merged = {
                ...detailedProd.product,
                options:
                  detailedProd.options || detailedProd.product?.options || [],
                images: detailedProd.images,
                variants: detailedProd.variants,
                reviews: detailedProd.reviews,
                relatedProducts: detailedProd.relatedProducts,
              };
              this.fetchedProduct.set(merged);
              this.initializeDefaultVariant(merged);
            }
          })
          .catch((err) =>
            console.error("Could not fetch product details:", err),
          )
          .finally(() => {
            this.isLoadingProduct.set(false);
          });

        const matched = this.ds.products().find((x) => x.slug === slugStr);
        if (matched) {
          const firstImg =
            matched.images && matched.images.length > 0
              ? this.getImageUrl(matched.images[0])
              : "";
          this.activeImage.set(firstImg);
          this.quantity.set(1);
          this.is360Active.set(false);
          this.rotationAngle.set(0);

          this.initializeDefaultVariant(matched);

          // Update SEO
          const pageTitle =
            (matched as any).seoTitle ||
            `Buy ${matched.brand} ${matched.name} Online (Best Price) | 3D Galaxy`;
          const pageDesc =
            (matched as any).seoDescription ||
            `Get genuine ${matched.brand} ${matched.name} in India. OEM warranty, bulk dealer pricing, and fast shipping options. Check out specifications and reviews.`;
          this.titleService.setTitle(pageTitle);
          this.metaService.updateTag({
            name: "description",
            content: pageDesc,
          });
          this.metaService.updateTag({
            property: "og:title",
            content: pageTitle,
          });
          this.metaService.updateTag({
            property: "og:description",
            content: pageDesc,
          });
          if (firstImg) {
            this.metaService.updateTag({
              property: "og:image",
              content: firstImg,
            });
          }

          let link: HTMLLinkElement | null = this.document.querySelector(
            "link[rel='canonical']",
          );
          if (!link) {
            link = this.document.createElement("link");
            link.setAttribute("rel", "canonical");
            this.document.head.appendChild(link);
          }
          link.setAttribute(
            "href",
            `https://3dgalaxy.com/product/${matched.slug}`,
          );
        }
      }
    });

    // When query parameters change, update selected options if a variant matches
    this.route.queryParams.subscribe((q) => {
      const varId = q["variant"];
      if (varId) {
        const prod = this.product();
        const currentVariant = this.selectedVariant();
        if (currentVariant && String(currentVariant.id) === String(varId)) {
          return; // Already matched
        }
        if (prod && prod.variants) {
          const matchedVar = prod.variants.find(
            (v: any) => String(v.id) === String(varId),
          );
          if (matchedVar) {
            this.syncVariantSelection(prod, matchedVar);
          }
        }
      }
    });

    this.route.fragment.subscribe((fragment) => {
      if (fragment === "reviews") {
        this.activeTab.set("reviews");
        setTimeout(() => this.scrollToReviews(), 0);
      }
    });
  }

  adjustQty(diff: number) {
    const nextVal = this.quantity() + diff;
    if (nextVal >= 1 && nextVal <= 99) {
      this.quantity.set(nextVal);
    }
  }

  selectImage(img: string) {
    this.activeImage.set(img);
    this.is360Active.set(false);
  }

  toggle360Sensor() {
    this.is360Active.update((v) => !v);
    this.rotationAngle.set(0);
  }

  rotateAngle(deg: number) {
    this.rotationAngle.update((current) => {
      let next = current + deg;
      if (next >= 360) next = 0;
      if (next < 0) next = 315;
      return next;
    });
  }

  // Hypothetically loading image references representing angular rotation frames.
  active360Image(): string {
    const angle = this.rotationAngle();
    // Simulate high precision angles by modifying lighting hues in picsum photos
    if (angle === 45 || angle === 225) {
      return "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&q=80&w=400";
    }
    if (angle === 90 || angle === 270) {
      return "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=400";
    }
    return "https://images.unsplash.com/photo-1615840287214-7fe58a8f3685?auto=format&fit=crop&q=80&w=450";
  }

  addToCart(p: Product) {
    if (this.isAddingToCart()) return;

    if (p.variants && p.variants.length > 0) {
      const selected = this.selectedVariant();
      if (!selected) {
        this.toastService.error("Please select all variant options.");
        return;
      }
      if (selected.stock <= 0) {
        this.toastService.error("Selected variant is out of stock.");
        return;
      }
      this.isAddingToCart.set(true);
      this.ds.addToCart(p, this.quantity(), selected);
    } else {
      if (p.stock <= 0) {
        this.toastService.error("Product is out of stock.");
        return;
      }
      this.isAddingToCart.set(true);
      this.ds.addToCart(p, this.quantity());
    }

    // Automatically add complimentary bundle items to the cart
    const bundleItems = this.bundleProductsList();
    if (bundleItems && bundleItems.length > 0) {
      for (const item of bundleItems) {
        this.ds.cart.update((items) => {
          const isExist = items.some(
            (i) => i.product.id === item.id && i.isFree,
          );
          if (isExist) {
            return items.map((i) =>
              i.product.id === item.id && i.isFree
                ? { ...i, quantity: i.quantity + this.quantity() }
                : i,
            );
          }
          const role = this.ds.userRole();
          const priceType =
            role === "admin" || role === "super-admin" ? "dealer" : "sale";
          return [
            ...items,
            {
              product: item,
              quantity: this.quantity(),
              selectedPriceType: priceType,
              isFree: true,
            },
          ];
        });
      }
    }

    setTimeout(() => {
      this.isAddingToCart.set(false);
      this.toastService.success(`${p.name} added to cart!`);
    }, 600);
  }

  async ngOnInit() {
    await this.loadWishlist();
  }

  async loadWishlist() {
    if (this.ds.userRole() === "guest") {
      this.wishlistIds.set(new Set());
      return;
    }

    try {
      const res: any = await this.api.get("/wishlist").toPromise();
      if (res?.success && res.data) {
        const ids = new Set<string>();
        // Handle response array
        res.data.forEach((i: any) => ids.add(i.productId));
        this.wishlistIds.set(ids);
      }
    } catch (e) {}
  }

  async toggleWishlist(productId: string) {
    if (this.ds.userRole() === "guest") {
      this.toastService.info("Please log in to manage your wishlist");
      this.router.navigate(["/login"]);
      return;
    }
    const current = this.wishlistIds();
    try {
      if (current.has(productId)) {
        await this.api.delete(`/wishlist/${productId}`).toPromise();
        const newSet = new Set(current);
        newSet.delete(productId);
        this.wishlistIds.set(newSet);
        this.toastService.success("Removed from Wishlist");
      } else {
        await this.api.post("/wishlist", { productId }).toPromise();
        const newSet = new Set(current);
        newSet.add(productId);
        this.wishlistIds.set(newSet);
        this.toastService.success("Added to Wishlist");
      }
    } catch (e) {
      this.toastService.error("Wishlist action failed");
    }
  }

  buyNow(p: Product) {
    if (p.variants && p.variants.length > 0) {
      const selected = this.selectedVariant();
      if (!selected) {
        this.toastService.error("Please select all variant options.");
        return;
      }
      if (selected.stock <= 0) {
        this.toastService.error("Selected variant is out of stock.");
        return;
      }
      this.router.navigate(["/checkout"], {
        state: { product: p, quantity: this.quantity(), variant: selected },
      });
    } else {
      if (p.stock <= 0) {
        this.toastService.error("Product is out of stock.");
        return;
      }
      this.router.navigate(["/checkout"], {
        state: { product: p, quantity: this.quantity() },
      });
    }
  }

  // WHATSAPP REDIRECT AND CAMPAIGN SIMULATION
  async shareProduct(p: Product) {
    const origin = this.document.location?.origin || "https://3dgalaxy.com";
    const shareUrl = `${origin}/product/${p.slug}`;
    const shareText = `Check out ${p.name} on 3D Galaxy.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: p.name,
          text: shareText,
          url: shareUrl,
        });
        this.toastService.success("Product shared successfully.");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        this.toastService.success("Product link copied to clipboard.");
      } else {
        this.toastService.info("Sharing is unavailable on this device.");
      }
    } catch (error) {
      console.error("Share failed:", error);
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          this.toastService.success("Product link copied to clipboard.");
          return;
        } catch (clipboardError) {
          console.error("Clipboard copy failed:", clipboardError);
        }
      }
      this.toastService.error("Unable to share this product right now.");
    }
  }

  triggerWhatsAppInquiry(p: Product) {
    const contact = "919876543210"; // Demo 3D Galaxy WhatsApp business number
    const price = this.activePrice(p);
    const textMessage = `Hi 3D Galaxy Team! I am interested in purchasing ${p.name} (SKU: ${p.sku}) for ₹${price} / each. Quantity needed: ${this.quantity()}. Kindly advise on bulk delivery times. Thanks!`;
    const targetUrl = `https://wa.me/${contact}?text=${encodeURIComponent(textMessage)}`;

    // Attempt non-blocking window redirect or notification log
    if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank");
    }
  }

  // DISCUSSIONS FORM RECORDERS
  onQuestionInput(event: Event) {
    this.newQuestionText.set((event.target as HTMLInputElement).value);
  }

  submitQuestion(productId: string) {
    const desc = this.newQuestionText().trim();
    if (!desc) return;

    this.ds.products.update((all) => {
      return all.map((p) => {
        if (p.id === productId) {
          const newQA = {
            id: "qa-" + Date.now(),
            question: desc,
            askedBy: this.ds.activeUser().name || "Anonymous Maker",
            date: new Date().toISOString().split("T")[0],
          };
          return { ...p, qnas: [newQA, ...p.qnas] };
        }
        return p;
      });
    });

    this.newQuestionText.set("");
  }

  selectDraftStar(val: number) {
    this.draftStars.set(val);
  }

  onCommentInput(event: Event) {
    this.draftComment.set((event.target as HTMLInputElement).value);
  }

  setReviewRating(rating: number) {
    this.reviewDraft.update((value) => ({ ...value, rating }));
  }

  updateReviewTitle(title: string) {
    this.reviewDraft.update((value) => ({ ...value, title }));
  }

  updateReviewComment(comment: string) {
    this.reviewDraft.update((value) => ({ ...value, comment }));
  }

  updateReviewRecommended(recommended: boolean) {
    this.reviewDraft.update((value) => ({ ...value, recommended }));
  }

  openReviewModal() {
    this.isReviewModalOpen.set(true);
  }

  closeReviewModal() {
    this.isReviewModalOpen.set(false);
    this.reviewDraft.set({
      rating: 5,
      title: "",
      comment: "",
      recommended: true,
      images: [],
      imagePreviews: [],
      uploading: false,
    });
  }

  async submitReview(productId: string) {
    if (this.isSubmittingReview()) return;
    const draft = this.reviewDraft();
    if (!draft.comment.trim() || !draft.title.trim()) {
      this.toastService.error(
        "Please add a title and detailed review before submitting.",
      );
      return;
    }

    this.isSubmittingReview.set(true);
    this.reviewDraft.update((value) => ({ ...value, uploading: true }));

    try {
      const payload: any = {
        productId,
        orderId:
          (this.router.getCurrentNavigation()?.extras?.state as any)?.orderId ||
          "",
        rating: draft.rating,
        title: draft.title,
        review: draft.comment,
        recommended: draft.recommended,
        images: [],
      };

      const res: any = await this.api.post("/reviews", payload).toPromise();
      if (res?.success) {
        this.toastService.success(
          "Thanks! Your review has been submitted for approval.",
        );
        this.closeReviewModal();
        this.loadReviews(productId);
      } else {
        this.toastService.error(
          res?.error || "Unable to submit your review right now.",
        );
      }
    } catch (error: any) {
      this.toastService.error(
        error?.message || "Unable to submit your review right now.",
      );
    } finally {
      this.isSubmittingReview.set(false);
      this.reviewDraft.update((value) => ({ ...value, uploading: false }));
    }
  }

  async loadReviews(productId: string) {
    try {
      const res: any = await this.api
        .get(`/products/${productId}/reviews`)
        .toPromise();
      const reviews = res?.data || [];
      const current = this.fetchedProduct();
      this.fetchedProduct.set({ ...current, reviews });
    } catch (error) {
      console.error("Review load failed", error);
    }
  }

  onReviewImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    const validFiles = files.filter((file) => allowed.includes(file.type));
    if (!validFiles.length) {
      this.toastService.error("Only JPG, PNG, and WEBP images are supported.");
      return;
    }

    const previews = validFiles.map((file) => URL.createObjectURL(file));
    this.reviewDraft.update((value) => ({
      ...value,
      images: [...value.images, ...validFiles],
      imagePreviews: [...value.imagePreviews, ...previews],
    }));
  }

  removeReviewImage(index: number) {
    this.reviewDraft.update((value) => ({
      ...value,
      images: value.images.filter((_, idx) => idx !== index),
      imagePreviews: value.imagePreviews.filter((_, idx) => idx !== index),
    }));
  }

  trackReview(index: number, review: any) {
    return review?.id || index;
  }

  getReviewPercentage(star: number) {
    const { total, distribution } = this.reviewStats();
    if (!total) return 0;
    return Math.round((distribution[5 - star] / total) * 100);
  }

  formatRatingValue(value: number) {
    return Number(value || 0).toFixed(1);
  }

  getReviewStars(rating: number) {
    return Array.from({ length: 5 }, (_, index) => index < rating);
  }

  setReviewSort(
    sort: "helpful" | "latest" | "highest" | "lowest" | "images" | "verified",
  ) {
    this.reviewSort.set(sort);
  }

  isReviewEligible() {
    return true;
  }
}
