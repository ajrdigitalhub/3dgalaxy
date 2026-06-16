import {Component, ChangeDetectionStrategy, inject, signal, computed, effect, ElementRef, viewChild, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {CommonModule} from '@angular/common';
import {RouterModule, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService, Product, Category} from '../../services/datastore';
import {LoadingService} from '../../core/services/loading.service';
import {animate} from 'motion';
import {SkeletonPageComponent} from '../../shared/components/skeleton/skeleton-page/skeleton-page.component';

interface QuickNavItem {
  id: string;
  name: string;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule, MatIconModule, SkeletonPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  ds = inject(DatastoreService);
  router = inject(Router);
  loadingService = inject(LoadingService);
  heroContainer = viewChild<ElementRef>('heroContainer');

  loading = computed(() => {
    if (this.loadingService.isLoading()) return true;
    if (this.ds.homepageLoading()) return true;
    return false;
  });

  searchQuery = signal<string>('');
  aiSuggestions = signal<string[]>([]);
  isLoadingAiSuggestion = signal<boolean>(false);
  filterCategory = signal<string>('');
  expandedCatId = signal<string | null>(null);

  // Slider State
  currentSlide = signal(0);
  slides = computed(() => {
    const banners = this.ds.banners().filter(b => b.isActive && b.position === 'Main Carousel');
    if (banners.length === 0) {
       // fallback placeholder if no banners
       return [{
         id: 1,
         title: '3D Galaxy Storefront',
         titleHighlight: 'The Future of Manufacturing',
         desc: 'Check out our latest products and deals on 3D Printers, Filaments and more.',
         image: 'https://images.unsplash.com/photo-1631035626723-cd8e9ef9e728?auto=format&fit=crop&q=80&w=2000',
         badge: 'Welcome',
         badgeIcon: 'rocket_launch',
         link: '/products',
         btnText: 'Shop Ecosystem'
       }];
    }
    
    return banners.map((b, i) => {
      // Split the title into title and highlight if it has a dash or something,
      // But let's just make the first half title and second half titleHighlight
      const words = (b.title || '').split(' ');
      const half = Math.ceil(words.length / 2);
      const title = words.slice(0, half).join(' ');
      const highlight = words.slice(half).join(' ');

      return {
        id: b.id || i,
        title: title || 'Promo Event',
        titleHighlight: highlight,
        desc: '', 
        image: b.imageUrl,
        badge: 'Featured',
        badgeIcon: 'bolt',
        link: b.linkUrl || '/products',
        btnText: 'Explore Now'
      };
    });
  });

  technologies = [
    { id: 'fdm', icon: 'animation', name: 'FDM Printing', desc: 'Desktop & industrial fused deposition modeling for rapid prototyping.', image: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&q=80&w=800' },
    { id: 'resin', icon: 'opacity', name: 'Resin Printing', desc: 'High-precision SLA/DLP/LCD for jewelry, dental, and miniatures.', image: 'https://images.unsplash.com/photo-1551021210-994c6498a44b?auto=format&fit=crop&q=80&w=800' },
    { id: 'industrial', icon: 'precision_manufacturing', name: 'Industrial', desc: 'Large scale manufacturing for automotive and aerospace sectors.', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800' },
    { id: 'edu', icon: 'school', name: 'Educational', desc: 'STEM approved units for schools, universities, and makerspaces.', image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800' }
  ];

  brands = [
    { name: 'CREALITY', logo: 'C' },
    { name: 'BAMBU LAB', logo: 'B' },
    { name: 'ANYCUBIC', logo: 'A' },
    { name: 'FLASHFORGE', logo: 'F' },
    { name: 'PHROZEN', logo: 'P' },
    { name: 'VORON', logo: 'V' }
  ];

  solutions = [
    { name: 'Education', icon: 'school', desc: 'Transform learning with immersive 3D technology.' },
    { name: 'Manufacturing', icon: 'factory', desc: 'Scale production with rapid batch capabilities.' },
    { name: 'Medical', icon: 'medical_services', desc: 'Bespoke surgical guides and patient-specific models.' },
    { name: 'Architecture', icon: 'architecture', desc: 'Translate complex blueprints into tactile models.' }
  ];

  academyItems = [
    { title: 'Beginner Guide', level: 'Intro', duration: '2 hours', icon: 'play_circle' },
    { title: 'Slicer Mastery', level: 'Advanced', duration: '5 hours', icon: 'settings_suggest' },
    { title: 'Maintenance Pro', level: 'Industrial', duration: '8 hours', icon: 'build_circle' }
  ];

  galaxyStats = [
    { label: 'Units Deployed', value: '12K+' },
    { label: 'Partner Brands', value: '45+' },
    { label: 'Active Students', value: '8.5K' },
    { label: 'Hub Locations', value: '120+' }
  ];

  // Sourced active elements
  activeTopAd = computed(() => this.ds.advertisements().find(a => a.position === 'top-banner' && a.status === 'active'));
  activeFooterAd = computed(() => this.ds.advertisements().find(a => a.position === 'footer' && a.status === 'active'));
  activeSocialPosts = computed(() => this.ds.socialPosts().filter(p => p.approved));
  
  featuredProducts = computed(() => this.ds.products().slice(0, 8));

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

  getProductRating(p: Product): number {
    if (!p.reviews || p.reviews.length === 0) return 4.5; // Premium fallback
    const sum = p.reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / p.reviews.length) * 10) / 10;
  }

  filteredProducts = computed(() => {
    const term = this.searchQuery().toLowerCase().trim();
    const catId = this.filterCategory();
    let prods = this.ds.products();

    if (catId) {
      // Find all child category IDs recursively (simpler for 1 level)
      const childIds = this.ds.categories().filter(c => c.parent_id === catId).map(c => c.id);
      prods = prods.filter(p => p.category_id === catId || (p.subcategory_id && childIds.includes(p.subcategory_id)) || p.subcategory_id === catId);
    }

    if (term) {
      prods = prods.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.tags.some(t => t.toLowerCase().includes(term))
      );
    }
    return prods;
  });

  filteredSearchProducts = computed(() => {
    const term = this.searchQuery().toLowerCase().trim();
    if (!term) return [];
    return this.ds.products().filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term) ||
      p.tags.some(t => t.toLowerCase().includes(term))
    ).slice(0, 4);
  });

  isDealerPriceActive = computed(() => {
    const r = this.ds.userRole();
    return r === 'admin' || r === 'super-admin' || (this.ds.activeUser()?.rewardPoints || 0) > 300;
  });

  // Tree Structure Helpers
  isRoot = (c: Category) => !c.parent_id;
  isSubBy = (parentId: string) => (c: Category) => c.parent_id === parentId;
  getCategoryName = (id: string) => this.ds.categories().find(c => c.id === id)?.name || '';
  
  toggleCat(id: string) {
    if (this.expandedCatId() === id) {
      this.expandedCatId.set(null);
    } else {
      this.expandedCatId.set(id);
    }
  }

  constructor() {
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    // Auto-slide effect
    effect((onCleanup) => {
      if (!isBrowser) return;
      const interval = setInterval(() => {
        this.nextSlide();
      }, 8000);
      onCleanup(() => clearInterval(interval));
    });

    // Record top impressions when component boots
    if (isBrowser) {
      setTimeout(() => {
        const topAd = this.activeTopAd();
        if (topAd) this.ds.recordAdImpression(topAd.id);
        const footerAd = this.activeFooterAd();
        if (footerAd) this.ds.recordAdImpression(footerAd.id);
      }, 1000);
    }
  }

  scrollToProducts() {
    const el = document.getElementById('products-catalog');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  activePrice(p: Product): number {
    return this.isDealerPriceActive() ? p.dealer_price : p.sale_price;
  }

  nextSlide() {
    this.currentSlide.update(c => (c + 1) % this.slides().length);
    this.animateSlide('next');
  }

  prevSlide() {
    this.currentSlide.update(c => (c - 1 + this.slides().length) % this.slides().length);
    this.animateSlide('prev');
  }

  setSlide(idx: number) {
    const dir = idx > this.currentSlide() ? 'next' : 'prev';
    this.currentSlide.set(idx);
    this.animateSlide(dir);
  }

  private animateSlide(dir: 'next' | 'prev') {
    const container = this.heroContainer()?.nativeElement;
    if (!container) return;

    const elements = container.querySelectorAll('.hero-anim');
    const xOffset = dir === 'next' ? 40 : -40;

    animate(
      elements,
      { 
        opacity: [0, 1],
        x: [xOffset, 0]
      },
      { 
        duration: 1, 
        ease: [0.16, 1, 0.3, 1] 
      }
    );
  }

  addToCart(p: Product) {
    this.ds.addToCart(p, 1);
  }

  addToCartById(id: string) {
    const prod = this.ds.products().find(p => p.id === id);
    if (prod) {
      this.ds.addToCart(prod, 1);
    } else {
      this.ds.addToCart({
        id,
        name: id === 'prod-3' ? 'Bambu Lab A1 Combo' : 'Creality Sparx i7 Combo',
        brand: id === 'prod-3' ? 'BAMBU LAB' : 'CREALITY',
        slug: id === 'prod-3' ? 'bambu-lab-a1-combo' : 'creality-sparx-i7-combo',
        sku: 'MOCK-SKU-' + id,
        barcode: '123456789',
        category_id: 'materials',
        description: id === 'prod-3' ? 'Seamless multicolor 3D printing with full auto calibration.' : 'Professional grade dual extrusion combo printer setup.',
        mrp: 55000,
        sale_price: 48999,
        dealer_price: 45000,
        stock: 100,
        reserved: 0,
        images: [id === 'prod-3' ? 'https://store.bambulab.com/cdn/shop/files/A1_Combo_600x600.png' : 'https://store.bambulab.com/cdn/shop/files/X1C_Combo_800x800.png'],
        specs: [],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: [id === 'prod-3' ? 'BAMBU LAB' : 'CREALITY']
      } as Product, 1);
    }
  }

  asArray(value: unknown): QuickNavItem[] {
    return Array.isArray(value) ? (value as QuickNavItem[]) : [];
  }

  asNumber(value: unknown): number {
    return typeof value === 'number' ? value : Number(value) || 0;
  }

  trackAdClick(id: string) {
    this.ds.recordAdClick(id);
  }

  onSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    if (!val) {
      this.aiSuggestions.set([]);
    }
  }

  selectQuery(q: string) {
    this.searchQuery.set(q);
  }

  isSubscribed = signal(false);

  subscribeNewsletter(input: HTMLInputElement) {
    const val = input.value?.trim();
    if (val) {
      this.isSubscribed.set(true);
      input.value = '';
      setTimeout(() => {
        this.isSubscribed.set(false);
      }, 5000);
    }
  }

  selectFilterCategory(cat: string) {
    const layout = this.ds.homeLayout();
    const isCatalogVisible = layout.some(s => s.id === 'featured-innovations' && s.visible);
    if (isCatalogVisible) {
      this.filterCategory.set(cat);
      this.scrollToProducts();
    } else {
      this.router.navigate(['/products'], { queryParams: { category: cat } });
    }
  }

  // AI-powered suggestions call using browser proxy back to our server
  async triggerAiSearchSuggestion() {
    const q = this.searchQuery().trim();
    this.isLoadingAiSuggestion.set(true);
    try {
      const resp = await fetch('/api/generate-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.suggestions && Array.isArray(data.suggestions)) {
          this.aiSuggestions.set(data.suggestions);
        }
      } else {
        // Fallback popular queries
        this.aiSuggestions.set(['Bambu carbon-fiber settings', 'Precision TPU nozzles', 'High viscosity resins', 'Ender 3 direct drive calibration']);
      }
    } catch {
      this.aiSuggestions.set(['Bambu carbon-fiber settings', 'Precision TPU nozzles', 'High viscosity resins', 'Ender 3 direct drive calibration']);
    } finally {
      this.isLoadingAiSuggestion.set(false);
    }
  }
}
