import {Component, ChangeDetectionStrategy, inject, signal, computed, effect} from '@angular/core';
import {CommonModule, DOCUMENT} from '@angular/common';
import {ActivatedRoute, RouterModule, Router} from '@angular/router';
import {Title, Meta, DomSanitizer} from '@angular/platform-browser';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService, Product, Review} from '../../services/datastore';
import {LoadingService} from '../../core/services/loading.service';
import {ApiService} from '../../services/api.service';
import {ToastService} from '../../shared/components/toast/toast.service';
import {SkeletonPageComponent} from '../../shared/components/skeleton/skeleton-page/skeleton-page.component';
import {AppButton} from '../../shared/components/app-button/app-button';
import {environment} from '../../../environments/environment';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';
import { TiltDirective } from '../../shared/directives/tilt.directive';
import { CountUpDirective } from '../../shared/directives/count-up.directive';

@Component({
  selector: 'app-product-detail',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    SkeletonPageComponent,
    AppButton,
    ScrollRevealDirective,
    TiltDirective,
    CountUpDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss'
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

  safeHtml(html: string) {
    if (!html) return '';
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  slug = signal<string>('');
  quantity = signal<number>(1);
  activeImage = signal<string>('');
  is360Active = signal<boolean>(false);
  rotationAngle = signal<number>(0);
  activeTab = signal<string>('overview');
  wishlistIds = signal<Set<string>>(new Set());

  // Variant Logic
  selectedOptions = signal<Record<string, string>>({}); // { optionId: valueId }
  selectedVariant = computed(() => {
      const p = this.product();
      if (!p || !p.variants || p.variants.length === 0) return null;
      const opts = this.selectedOptions();
      // Match variant based on selected options
      const matched = p.variants.find((v: any) => {
          return v.options?.every((vo: any) => opts[vo.optionValue.optionId] === vo.optionValueId);
      });
      return matched || p.variants[0];
  });

  galleryImages = computed(() => {
      const v = this.selectedVariant();
      if (v && v.images && v.images.length > 0) {
          return v.images;
      }
      return this.product()?.images || [];
  });

  // Discussions and rating state drafts
  newQuestionText = signal<string>('');
  draftStars = signal<number>(5);
  draftComment = signal<string>('');

  fetchedProduct = signal<any>(null);

  product = computed(() => {
    // Return fetched details if available, else structural outline
    return this.fetchedProduct() || this.ds.products().find(p => p.slug === this.slug());
  });

  breadcrumbs = computed(() => {
    const p = this.product();
    if (!p) return [];
    const crumbs = [];
    const cat = this.ds.categories().find(c => c.id === p.category_id);
    if (cat) {
       crumbs.push({ label: cat.name, url: '/category/' + cat.slug });
    }
    const brand = this.ds.brands().find(b => b.name === p.brand);
    if (brand) {
       crumbs.push({ label: brand.name, url: '/brand/' + brand.slug });
    }
    return crumbs;
  });

  // Derived properties from product if available or fallback
  productSpecs = computed(() => this.product()?.specifications?.map((s: any) => ({ label: s.name, value: s.value })) || this.product()?.specs || []);
  productReviews = computed(() => this.product()?.reviews || []);
  productFeatures = computed(() => this.product()?.features || (this.product() as any)?.features || []);
  productApplications = computed(() => (this.product() as any)?.applications || []);
  productIncludes = computed(() => (this.product() as any)?.includes || []);
  productDownloads = computed(() => this.product()?.downloads || (this.product() as any)?.downloads || []);
  productFaqs = computed(() => this.product()?.faqs || this.product()?.qnas || []);
  
  relatedProducts = computed(() => {
    const p = this.product();
    if (!p) return [];
    if (p.relatedProducts && p.relatedProducts.length > 0) {
       return p.relatedProducts.map((rp: any) => rp.relatedProduct).slice(0, 4);
    }
    return this.ds.products().filter(x => x.category_id === p.category_id && x.id !== p.id).slice(0, 4);
  });

  optionalFilaments = computed(() => {
    return this.ds.products().filter(p => p.category_id === 'cat-2').slice(0, 4);
  });

  isDealerActive = computed(() => {
    const r = this.ds.userRole();
    return r === 'admin' || r === 'super-admin' || (this.ds.activeUser()?.rewardPoints || 0) > 300;
  });

  titleService = inject(Title);
  metaService = inject(Meta);
  document = inject(DOCUMENT);

  activePrice(p: any): number {
    const variant = this.selectedVariant();
    const dealerPrice = variant ? (variant.price) : (p.dealerPrice || p.dealer_price); // dealer fallback or variant price
    const salePrice = variant ? (variant.salePrice || variant.price) : (p.salePrice || p.sale_price);

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
    return typeof img === 'string' ? img : img?.url || '';
  }

  currentActiveImageUrl = computed(() => {
    const actImg = this.activeImage();
    if (actImg) return this.getImageUrl(actImg);
    const imgs = this.galleryImages();
    if (imgs && imgs.length > 0) return this.getImageUrl(imgs[0]);
    return '';
  });

  isZoomActive = signal<boolean>(false);
  lensLeft = signal<number>(0);
  lensTop = signal<number>(0);
  zoomBgPosition = signal<string>('0% 0%');

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
    
    let leftPct = (boundedX / rect.width) * 100 - (lensWidthPct / 2);
    let topPct = (boundedY / rect.height) * 100 - (lensHeightPct / 2);

    leftPct = Math.max(0, Math.min(leftPct, 100 - lensWidthPct));
    topPct = Math.max(0, Math.min(topPct, 100 - lensHeightPct));

    this.lensLeft.set(leftPct);
    this.lensTop.set(topPct);
    this.zoomBgPosition.set(`${pctX}% ${pctY}%`);
  }

  onMouseLeave() {
    this.isZoomActive.set(false);
  }

  selectOption(optionId: string, valueId: string) {
      this.selectedOptions.update(opts => ({...opts, [optionId]: valueId}));
      
      // Update variant images if variant matches
      const variant = this.selectedVariant();
      if (variant) {
          if (variant.images && variant.images.length > 0) {
              this.activeImage.set(this.getImageUrl(variant.images[0]));
          }
          this.router.navigate([], {
              queryParams: { variant: variant.id },
              queryParamsHandling: 'merge',
              replaceUrl: true
          });
      }
  }

  getOptionValueName(values: any[], selectedId: string): string {
     const val = values.find(v => v.id === selectedId);
     return val ? (val.displayValue || val.value) : '';
  }

  constructor() {
    this.route.params.subscribe(p => {
      if (p['slug']) {
        const slugStr = p['slug'];
        this.slug.set(slugStr);
        
        // Fetch detailed product data
        fetch(`${environment.apiUrl}/products/slug/${slugStr}`)
          .then(res => res.json())
          .then(detailedProd => {
            if (detailedProd && !detailedProd.error) {
               // Reconstruct flat object for existing frontend properties mapped to it
               const merged = { ...detailedProd.product, images: detailedProd.images, variants: detailedProd.variants, reviews: detailedProd.reviews, relatedProducts: detailedProd.relatedProducts };
               this.fetchedProduct.set(merged);
            }
          })
          .catch(err => console.error("Could not fetch product details:", err));

        const matched = this.ds.products().find(x => x.slug === slugStr);
        if (matched) {
          const firstImg = matched.images && matched.images.length > 0 ? this.getImageUrl(matched.images[0]) : '';
          this.activeImage.set(firstImg);
          this.quantity.set(1);
          this.is360Active.set(false);
          this.rotationAngle.set(0);

          // Build default options based on URL variant tracking or default variant
          const queryParams = this.route.snapshot.queryParams;
          const initialVariantId = queryParams['variant'];
          
          let targetVariant = matched.variants?.find((v: any) => v.id === initialVariantId);
          if (!targetVariant && matched.variants && matched.variants.length > 0) {
              targetVariant = matched.variants[0];
          }

          if (targetVariant && targetVariant.options) {
             const opts: Record<string, string> = {};
             targetVariant.options.forEach((vo: any) => {
                 opts[vo.optionValue.optionId] = vo.optionValueId;
             });
             this.selectedOptions.set(opts);
             
             if (targetVariant.images && targetVariant.images.length > 0) {
                 this.activeImage.set(this.getImageUrl(targetVariant.images[0]));
             }
          }

          // Update SEO
          const pageTitle = (matched as any).seoTitle || `${matched.brand} ${matched.name} | 3D Galaxy`;
          const pageDesc = (matched as any).seoDescription || matched.description;
          this.titleService.setTitle(pageTitle);
          this.metaService.updateTag({ name: 'description', content: pageDesc });
          this.metaService.updateTag({ property: 'og:title', content: pageTitle });
          this.metaService.updateTag({ property: 'og:description', content: pageDesc });
          if (firstImg) {
             this.metaService.updateTag({ property: 'og:image', content: firstImg });
          }

          let link: HTMLLinkElement | null = this.document.querySelector("link[rel='canonical']");
          if (!link) {
             link = this.document.createElement('link');
             link.setAttribute('rel', 'canonical');
             this.document.head.appendChild(link);
          }
          link.setAttribute('href', `https://3dgalaxy.com/product/${matched.slug}`);
        }
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
    this.is360Active.update(v => !v);
    this.rotationAngle.set(0);
  }

  rotateAngle(deg: number) {
    this.rotationAngle.update(current => {
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
      return 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&q=80&w=400';
    }
    if (angle === 90 || angle === 270) {
      return 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=400';
    }
    return 'https://images.unsplash.com/photo-1615840287214-7fe58a8f3685?auto=format&fit=crop&q=80&w=450';
  }

  addToCart(p: Product) {
    if (this.isAddingToCart()) return;
    this.isAddingToCart.set(true);
    this.ds.addToCart(p, this.quantity(), this.selectedVariant() || undefined);
    
    setTimeout(() => {
      this.isAddingToCart.set(false);
      this.toastService.success(`${p.name} added to cart!`);
    }, 600);
  }

  async ngOnInit() {
    await this.loadWishlist();
  }

  async loadWishlist() {
    if (this.ds.userRole() !== 'guest') {
      try {
        const res: any = await this.api.get('/wishlist').toPromise();
        if (res?.success && res.data) {
          const ids = new Set<string>();
          // Handle response array
          res.data.forEach((i: any) => ids.add(i.productId));
          this.wishlistIds.set(ids);
        }
      } catch(e) {}
    }
  }

  async toggleWishlist(productId: string) {
    if (this.ds.userRole() === 'guest') {
      this.toastService.info('Please log in to manage your wishlist');
      this.router.navigate(['/login']);
      return;
    }
    const current = this.wishlistIds();
    try {
      if (current.has(productId)) {
        await this.api.delete(`/wishlist/${productId}`).toPromise();
        const newSet = new Set(current);
        newSet.delete(productId);
        this.wishlistIds.set(newSet);
        this.toastService.success('Removed from Wishlist');
      } else {
        await this.api.post('/wishlist', { productId }).toPromise();
        const newSet = new Set(current);
        newSet.add(productId);
        this.wishlistIds.set(newSet);
        this.toastService.success('Added to Wishlist');
      }
    } catch(e) {
      this.toastService.error('Wishlist action failed');
    }
  }

  buyNow(p: Product) {
    this.router.navigate(['/checkout'], { state: { product: p, quantity: this.quantity(), variant: this.selectedVariant() || undefined } });
  }

  // WHATSAPP REDIRECT AND CAMPAIGN SIMULATION
  triggerWhatsAppInquiry(p: Product) {
    const contact = '919876543210'; // Demo 3D Galaxy WhatsApp business number
    const price = this.activePrice(p);
    const textMessage = `Hi 3D Galaxy Team! I am interested in purchasing ${p.name} (SKU: ${p.sku}) for ₹${price} / each. Quantity needed: ${this.quantity()}. Kindly advise on bulk delivery times. Thanks!`;
    const targetUrl = `https://wa.me/${contact}?text=${encodeURIComponent(textMessage)}`;
    
    // Attempt non-blocking window redirect or notification log
    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank');
    }
  }

  // DISCUSSIONS FORM RECORDERS
  onQuestionInput(event: Event) {
    this.newQuestionText.set((event.target as HTMLInputElement).value);
  }

  submitQuestion(productId: string) {
    const desc = this.newQuestionText().trim();
    if (!desc) return;

    this.ds.products.update(all => {
      return all.map(p => {
        if (p.id === productId) {
          const newQA = {
            id: 'qa-' + Date.now(),
            question: desc,
            askedBy: this.ds.activeUser().name || 'Anonymous Maker',
            date: new Date().toISOString().split('T')[0]
          };
          return { ...p, qnas: [newQA, ...p.qnas] };
        }
        return p;
      });
    });

    this.newQuestionText.set('');
  }

  selectDraftStar(val: number) {
    this.draftStars.set(val);
  }

  onCommentInput(event: Event) {
    this.draftComment.set((event.target as HTMLInputElement).value);
  }

  submitReview(productId: string) {
    if (this.isSubmittingReview()) return;
    if (!this.ds.activeUser()) {
      this.toastService.error('Please log in to write a review.');
      this.router.navigate(['/login']);
      return;
    }
    const text = this.draftComment().trim();
    if (!text) return;

    this.isSubmittingReview.set(true);

    this.ds.products.update(all => {
      return all.map(p => {
        if (p.id === productId) {
          const newRev: Review = {
            id: 'rev-' + Date.now(),
            userName: this.ds.activeUser().name || 'Anonymous Customer',
            rating: this.draftStars(),
            comment: text,
            date: new Date().toISOString().split('T')[0],
            verified: true
          };
          return { ...p, reviews: [newRev, ...p.reviews] };
        }
        return p;
      });
    });

    setTimeout(() => {
      this.draftComment.set('');
      this.draftStars.set(5);
      this.isSubmittingReview.set(false);
      this.toastService.success('Thank you! Your verified review was added.');
    }, 600);
  }
}
