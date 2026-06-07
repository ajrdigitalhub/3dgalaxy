import {Component, ChangeDetectionStrategy, inject, signal, computed, effect, ElementRef, viewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService, Product, Category} from '../../services/datastore';
import {animate} from 'motion';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  ds = inject(DatastoreService);
  heroContainer = viewChild<ElementRef>('heroContainer');

  searchQuery = signal<string>('');
  aiSuggestions = signal<string[]>([]);
  isLoadingAiSuggestion = signal<boolean>(false);
  filterCategory = signal<string>('');
  expandedCatId = signal<string | null>(null);

  // Slider State
  currentSlide = signal(0);
  slides = [
    {
      id: 1,
      title: 'Galaxy Core Ecosystem',
      titleHighlight: 'The Future of Manufacturing',
      desc: 'Deploy high-performance 3D printers, precision resins, and industrial filaments across your entire lab with a single unified platform.',
      image: '/images/hero_galaxy_ecosystem.png',
      badge: '3D Galaxy Enterprise',
      badgeIcon: 'rocket_launch',
      link: '/products',
      btnText: 'Shop Ecosystem'
    },
    {
      id: 2,
      title: 'Precision Metrology',
      titleHighlight: 'Every Layer Redefined',
      desc: 'Industrial-grade SLA and FDM solutions for engineering parts with +/- 0.01mm tolerances. From prototyping to production.',
      image: '/images/hero_precision_metrology.png',
      badge: 'Advanced Services',
      badgeIcon: 'precision_manufacturing',
      link: '/printing-service',
      btnText: 'Start Project'
    },
    {
      id: 3,
      title: 'Next-Gen Academy',
      titleHighlight: 'Master the Machine',
      desc: 'Join the industry largest training hub. Certification programs for industrial design, slicer optimization, and maintenance.',
      image: '/images/hero_academy_mastery.png',
      badge: 'Learning Hub',
      badgeIcon: 'school',
      link: '/admin',
      btnText: 'Join Academy'
    }
  ];

  technologies = [
    { id: 'fdm', icon: 'animation', name: 'FDM Printing', desc: 'Desktop & industrial fused deposition modeling for rapid prototyping.', image: '/images/tech_fdm_printing.png' },
    { id: 'resin', icon: 'opacity', name: 'Resin Printing', desc: 'High-precision SLA/DLP/LCD for jewelry, dental, and miniatures.', image: '/images/tech_resin_printing.png' },
    { id: 'industrial', icon: 'precision_manufacturing', name: 'Industrial', desc: 'Large scale manufacturing for automotive and aerospace sectors.', image: '/images/tech_industrial_printing.png' },
    { id: 'edu', icon: 'school', name: 'Educational', desc: 'STEM approved units for schools, universities, and makerspaces.', image: '/images/tech_educational_printing.png' }
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

  featuredPrinters = computed(() => {
    return this.ds.products().filter(p => p.category_id === '3d-printers').slice(0, 6);
  });

  featuredFilaments = computed(() => {
    return this.ds.products().filter(p => p.category_id === 'materials').slice(0, 6);
  });

  featuredSpareParts = computed(() => {
    return this.ds.products().filter(p => p.category_id === 'spare-parts').slice(0, 6);
  });

  getIcon(catId: string): string {
    const icons: Record<string, string> = {
      '3d-printers': 'precision_manufacturing',
      'fdm-printers': 'layers',
      'resin-printers': 'opacity',
      'filaments': 'grain',
      'pla-filaments': 'eco',
      'abs-filaments': 'science',
      'resins': 'water_drop',
      'scanners': 'scanner',
      '3d-scanners': 'document_scanner',
      'spare-parts': 'settings',
      'cat-1': 'precision_manufacturing',
      'cat-2': 'grain',
      'cat-3': 'science',
      'cat-4': 'settings'
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
    // Auto-slide effect
    effect((onCleanup) => {
      const interval = setInterval(() => {
        this.nextSlide();
      }, 8000);
      onCleanup(() => clearInterval(interval));
    });

    // Record top impressions when component boots
    setTimeout(() => {
      const topAd = this.activeTopAd();
      if (topAd) this.ds.recordAdImpression(topAd.id);
      const footerAd = this.activeFooterAd();
      if (footerAd) this.ds.recordAdImpression(footerAd.id);
    }, 1000);
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
    this.currentSlide.update(c => (c + 1) % this.slides.length);
    this.animateSlide('next');
  }

  prevSlide() {
    this.currentSlide.update(c => (c - 1 + this.slides.length) % this.slides.length);
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
    const p = this.ds.products().find(x => x.id === id);
    if (p) {
      this.ds.addToCart(p, 1);
    }
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

  selectFilterCategory(cat: string) {
    this.filterCategory.set(cat);
    this.scrollToProducts();
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
