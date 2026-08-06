import {
  Component,
  Input,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminPanel } from '../admin';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

export interface AdminExploreConfig {
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
}

@Component({
  selector: 'app-admin-explore-config-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300 font-sans">
      
      <!-- HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white font-display">
              Explore Page Management
            </h1>
            <span class="px-2.5 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-mono font-bold rounded-full border border-orange-500/20">
              Bambu / Shopify Discovery Hub
            </span>
          </div>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Configure Hero banners, Category product sections, Featured collections, Brands, Buying guides & Layout section builder for the /explore page.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="fetchSettings()"
            [disabled]="loading()"
            class="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none shadow-xs disabled:opacity-50"
          >
            <mat-icon class="text-sm" [class.animate-spin]="loading()">refresh</mat-icon>
            <span>Reset</span>
          </button>

          <button
            type="button"
            (click)="saveSettings()"
            [disabled]="saving()"
            class="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none shadow-md shadow-orange-500/20 active:scale-95 disabled:opacity-50"
          >
            <mat-icon class="text-sm">save</mat-icon>
            <span>{{ saving() ? 'Saving...' : 'Save Changes' }}</span>
          </button>
        </div>
      </div>

      <!-- SUB-NAVIGATION TABS -->
      <div class="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-x-auto no-scrollbar">
        <button
          type="button"
          (click)="activeSubTab.set('general')"
          [class]="activeSubTab() === 'general'
            ? 'px-4 py-2 bg-white dark:bg-zinc-800 text-orange-500 font-black rounded-xl text-xs uppercase shadow-xs'
            : 'px-4 py-2 text-zinc-600 dark:text-zinc-400 font-bold hover:text-zinc-900 dark:hover:text-white rounded-xl text-xs uppercase transition-colors'"
        >
          General
        </button>
        <button
          type="button"
          (click)="activeSubTab.set('hero')"
          [class]="activeSubTab() === 'hero'
            ? 'px-4 py-2 bg-white dark:bg-zinc-800 text-orange-500 font-black rounded-xl text-xs uppercase shadow-xs'
            : 'px-4 py-2 text-zinc-600 dark:text-zinc-400 font-bold hover:text-zinc-900 dark:hover:text-white rounded-xl text-xs uppercase transition-colors'"
        >
          Hero Banners
        </button>
        <button
          type="button"
          (click)="activeSubTab.set('categories')"
          [class]="activeSubTab() === 'categories'
            ? 'px-4 py-2 bg-white dark:bg-zinc-800 text-orange-500 font-black rounded-xl text-xs uppercase shadow-xs'
            : 'px-4 py-2 text-zinc-600 dark:text-zinc-400 font-bold hover:text-zinc-900 dark:hover:text-white rounded-xl text-xs uppercase transition-colors'"
        >
          Category Sections
        </button>
        <button
          type="button"
          (click)="activeSubTab.set('collections')"
          [class]="activeSubTab() === 'collections'
            ? 'px-4 py-2 bg-white dark:bg-zinc-800 text-orange-500 font-black rounded-xl text-xs uppercase shadow-xs'
            : 'px-4 py-2 text-zinc-600 dark:text-zinc-400 font-bold hover:text-zinc-900 dark:hover:text-white rounded-xl text-xs uppercase transition-colors'"
        >
          Collections
        </button>
        <button
          type="button"
          (click)="activeSubTab.set('guides')"
          [class]="activeSubTab() === 'guides'
            ? 'px-4 py-2 bg-white dark:bg-zinc-800 text-orange-500 font-black rounded-xl text-xs uppercase shadow-xs'
            : 'px-4 py-2 text-zinc-600 dark:text-zinc-400 font-bold hover:text-zinc-900 dark:hover:text-white rounded-xl text-xs uppercase transition-colors'"
        >
          Buying Guides
        </button>
        <button
          type="button"
          (click)="activeSubTab.set('builder')"
          [class]="activeSubTab() === 'builder'
            ? 'px-4 py-2 bg-white dark:bg-zinc-800 text-orange-500 font-black rounded-xl text-xs uppercase shadow-xs'
            : 'px-4 py-2 text-zinc-600 dark:text-zinc-400 font-bold hover:text-zinc-900 dark:hover:text-white rounded-xl text-xs uppercase transition-colors'"
        >
          Section Builder
        </button>
      </div>

      <!-- TAB 1: GENERAL SETTINGS -->
      @if (activeSubTab() === 'general') {
        <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-6 shadow-xs">
          <h3 class="text-sm font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2">
            <mat-icon class="text-orange-500">tune</mat-icon>
            <span>General Explore Page Settings</span>
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
              <div>
                <span class="text-xs font-black uppercase text-zinc-900 dark:text-white block">Enable /Explore Page</span>
                <span class="text-[10px] text-zinc-400">Master toggle for the Explore product discovery page.</span>
              </div>
              <input
                type="checkbox"
                [ngModel]="config().general.enableExplore"
                (ngModelChange)="updateGeneralSetting('enableExplore', $event)"
                class="h-5 w-5 accent-orange-500 rounded cursor-pointer"
              />
            </div>

            <div class="space-y-1">
              <span class="block text-[10px] font-black uppercase text-zinc-400">Products Per Category Grid</span>
              <input
                type="number"
                [ngModel]="config().categorySectionsConfig.productsPerCategory"
                (ngModelChange)="config().categorySectionsConfig.productsPerCategory = $event"
                min="2"
                max="12"
                class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>
        </div>
      }

      <!-- TAB 2: HERO BANNERS -->
      @if (activeSubTab() === 'hero') {
        <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-6 shadow-xs">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2">
              <mat-icon class="text-orange-500">view_carousel</mat-icon>
              <span>Top Hero Banner Carousel Slides</span>
            </h3>

            <button
              type="button"
              (click)="addHeroSlide()"
              class="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border-none cursor-pointer"
            >
              <mat-icon class="text-sm">add</mat-icon>
              <span>Add Hero Slide</span>
            </button>
          </div>

          <div class="space-y-4">
            @for (slide of config().heroBanners; track slide.id; let idx = $index) {
              <div class="p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black uppercase text-orange-500">Hero Slide #{{ idx + 1 }}</span>
                  <button
                    type="button"
                    (click)="removeHeroSlide(idx)"
                    class="text-rose-500 hover:text-rose-600 text-xs font-bold border-none bg-transparent cursor-pointer flex items-center gap-1"
                  >
                    <mat-icon class="text-sm">delete</mat-icon>
                    <span>Remove</span>
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div class="space-y-1">
                    <span class="block text-[9px] font-black uppercase text-zinc-400">Slide Title</span>
                    <input
                      type="text"
                      [ngModel]="slide.title"
                      (ngModelChange)="slide.title = $event"
                      placeholder="Title..."
                      class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div class="space-y-1">
                    <span class="block text-[9px] font-black uppercase text-zinc-400">Subtitle</span>
                    <input
                      type="text"
                      [ngModel]="slide.subtitle"
                      (ngModelChange)="slide.subtitle = $event"
                      placeholder="Subtitle..."
                      class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                    />
                  </div>

                  <div class="space-y-1">
                    <span class="block text-[9px] font-black uppercase text-zinc-400">Image URL</span>
                    <input
                      type="text"
                      [ngModel]="slide.image"
                      (ngModelChange)="slide.image = $event"
                      placeholder="https://..."
                      class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>

                  <div class="space-y-1">
                    <span class="block text-[9px] font-black uppercase text-zinc-400">Button Text</span>
                    <input
                      type="text"
                      [ngModel]="slide.buttonText"
                      (ngModelChange)="slide.buttonText = $event"
                      placeholder="Explore Now"
                      class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div class="space-y-1">
                    <span class="block text-[9px] font-black uppercase text-zinc-400">Button Link</span>
                    <input
                      type="text"
                      [ngModel]="slide.buttonLink"
                      (ngModelChange)="slide.buttonLink = $event"
                      placeholder="/category/..."
                      class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- TAB 3: CATEGORY SECTIONS -->
      @if (activeSubTab() === 'categories') {
        <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-6 shadow-xs">
          <h3 class="text-sm font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2">
            <mat-icon class="text-orange-500">grid_view</mat-icon>
            <span>Featured Category Cards & Layout Config</span>
          </h3>

          <div class="space-y-4">
            @for (fCat of config().featuredCategoriesConfig; track fCat.slug; let idx = $index) {
              <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black uppercase text-zinc-900 dark:text-white">{{ fCat.name }}</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    [ngModel]="fCat.name"
                    (ngModelChange)="fCat.name = $event"
                    placeholder="Name"
                    class="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                  />
                  <input
                    type="text"
                    [ngModel]="fCat.image"
                    (ngModelChange)="fCat.image = $event"
                    placeholder="Image URL"
                    class="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                  />
                  <input
                    type="text"
                    [ngModel]="fCat.description"
                    (ngModelChange)="fCat.description = $event"
                    placeholder="Short description"
                    class="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- TAB 4: COLLECTIONS -->
      @if (activeSubTab() === 'collections') {
        <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-6 shadow-xs">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2">
              <mat-icon class="text-orange-500">layers</mat-icon>
              <span>Featured Collections Cards</span>
            </h3>

            <button
              type="button"
              (click)="addCollection()"
              class="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border-none cursor-pointer"
            >
              <mat-icon class="text-sm">add</mat-icon>
              <span>Add Collection</span>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            @for (col of config().featuredCollections; track col.id; let idx = $index) {
              <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black uppercase text-orange-500">{{ col.name }}</span>
                  <button
                    type="button"
                    (click)="removeCollection(idx)"
                    class="text-rose-500 hover:text-rose-600 text-xs font-bold border-none bg-transparent cursor-pointer"
                  >
                    Remove
                  </button>
                </div>

                <div class="space-y-2">
                  <input
                    type="text"
                    [ngModel]="col.name"
                    (ngModelChange)="col.name = $event"
                    placeholder="Collection Name"
                    class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                  />
                  <input
                    type="text"
                    [ngModel]="col.image"
                    (ngModelChange)="col.image = $event"
                    placeholder="Image URL"
                    class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                  />
                  <input
                    type="text"
                    [ngModel]="col.description"
                    (ngModelChange)="col.description = $event"
                    placeholder="Description"
                    class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- TAB 5: BUYING GUIDES -->
      @if (activeSubTab() === 'guides') {
        <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-6 shadow-xs">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2">
              <mat-icon class="text-orange-500">article</mat-icon>
              <span>3D Printing Buying Guides & Tutorials</span>
            </h3>

            <button
              type="button"
              (click)="addGuide()"
              class="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border-none cursor-pointer"
            >
              <mat-icon class="text-sm">add</mat-icon>
              <span>Add Guide</span>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            @for (guide of config().buyingGuides; track guide.id; let idx = $index) {
              <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black uppercase text-orange-500">Guide #{{ idx + 1 }}</span>
                  <button
                    type="button"
                    (click)="removeGuide(idx)"
                    class="text-rose-500 hover:text-rose-600 text-xs font-bold border-none bg-transparent cursor-pointer"
                  >
                    Remove
                  </button>
                </div>

                <div class="space-y-2">
                  <input
                    type="text"
                    [ngModel]="guide.title"
                    (ngModelChange)="guide.title = $event"
                    placeholder="Guide Title"
                    class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                  />
                  <input
                    type="text"
                    [ngModel]="guide.subtitle"
                    (ngModelChange)="guide.subtitle = $event"
                    placeholder="Subtitle"
                    class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                  />
                  <div class="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      [ngModel]="guide.image"
                      (ngModelChange)="guide.image = $event"
                      placeholder="Image URL"
                      class="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                    <input
                      type="text"
                      [ngModel]="guide.link"
                      (ngModelChange)="guide.link = $event"
                      placeholder="/slicer or /products"
                      class="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- TAB 6: SECTION BUILDER -->
      @if (activeSubTab() === 'builder') {
        <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-6 shadow-xs">
          <h3 class="text-sm font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2">
            <mat-icon class="text-orange-500">reorder</mat-icon>
            <span>Section Builder (Reorder Page Sections)</span>
          </h3>

          <div class="space-y-2">
            @for (sec of config().sectionOrder; track sec; let idx = $index) {
              <div class="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="h-7 w-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-black text-xs font-mono">
                    {{ idx + 1 }}
                  </span>
                  <span class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                    {{ sec.replace('-', ' ') }}
                  </span>
                </div>

                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    (click)="moveSectionUp(idx)"
                    [disabled]="idx === 0"
                    class="p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-orange-500 hover:text-white text-zinc-700 dark:text-zinc-300 border-none cursor-pointer disabled:opacity-30"
                  >
                    <mat-icon class="text-sm">arrow_upward</mat-icon>
                  </button>
                  <button
                    type="button"
                    (click)="moveSectionDown(idx)"
                    [disabled]="idx === config().sectionOrder.length - 1"
                    class="p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-orange-500 hover:text-white text-zinc-700 dark:text-zinc-300 border-none cursor-pointer disabled:opacity-30"
                  >
                    <mat-icon class="text-sm">arrow_downward</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

    </div>
  `,
})
export class AdminExploreConfigTabComponent implements OnInit {
  @Input({ required: true }) admin!: AdminPanel;

  api = inject(ApiService);
  toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);
  activeSubTab = signal<'general' | 'hero' | 'categories' | 'collections' | 'guides' | 'builder'>('general');

  config = signal<AdminExploreConfig>({
    general: {
      enableExplore: true,
      theme: 'auto',
      spacing: 'comfortable',
      animation: 'smooth-slide',
    },
    heroBanners: [],
    featuredCategoriesConfig: [],
    categorySectionsConfig: {
      productsPerCategory: 6,
      layout: 'grid',
    },
    featuredCollections: [],
    trendingConfig: {
      mode: 'most-viewed',
      count: 8,
    },
    buyingGuides: [],
    bottomCta: {
      title: 'Need Help Choosing?',
      subtitle: 'Talk to our senior experts',
      primaryButtonText: 'Chat on WhatsApp',
      primaryButtonLink: 'https://wa.me/919876543210',
      secondaryButtonText: 'Explore Services',
      secondaryButtonLink: '/slicer',
    },
    sectionOrder: [
      'hero',
      'featured-categories',
      'category-sections',
      'collections',
      'trending',
      'new-arrivals',
      'best-sellers',
      'brands',
      'buying-guides',
      'bottom-cta',
    ],
  });

  ngOnInit(): void {
    this.fetchSettings();
  }

  fetchSettings(): void {
    this.loading.set(true);

    this.api.get<any>('/admin/explore-navigation').subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.config.set(res.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[AdminExploreConfig] Failed to fetch config:', err);
        this.toast.error('Failed to load explore settings');
        this.loading.set(false);
      },
    });
  }

  saveSettings(): void {
    this.saving.set(true);
    this.api.put('/admin/explore-navigation', this.config()).subscribe({
      next: (res: any) => {
        this.toast.success('Explore page settings saved successfully!');
        this.saving.set(false);
      },
      error: (err: any) => {
        console.error('[AdminExploreConfig] Save error:', err);
        this.toast.error(err.error?.error || 'Failed to save settings');
        this.saving.set(false);
      },
    });
  }

  updateGeneralSetting(key: string, val: any) {
    this.config.update((c) => ({
      ...c,
      general: { ...c.general, [key]: val },
    }));
  }

  addHeroSlide() {
    this.config.update((c) => ({
      ...c,
      heroBanners: [
        ...c.heroBanners,
        {
          id: 'hero_' + Date.now(),
          title: 'New Special Offer',
          subtitle: 'Exclusive discounts on 3D Galaxy products',
          image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1600&auto=format&fit=crop',
          buttonText: 'Explore Now',
          buttonLink: '/products',
          priority: c.heroBanners.length + 1,
        },
      ],
    }));
  }

  removeHeroSlide(idx: number) {
    this.config.update((c) => ({
      ...c,
      heroBanners: c.heroBanners.filter((_, i) => i !== idx),
    }));
  }

  addCollection() {
    this.config.update((c) => ({
      ...c,
      featuredCollections: [
        ...c.featuredCollections,
        {
          id: 'col_' + Date.now(),
          name: 'New Collection',
          slug: '3d-printers',
          description: 'Special curated 3D printing collection',
          image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
          count: 10,
        },
      ],
    }));
  }

  removeCollection(idx: number) {
    this.config.update((c) => ({
      ...c,
      featuredCollections: c.featuredCollections.filter((_, i) => i !== idx),
    }));
  }

  addGuide() {
    this.config.update((c) => ({
      ...c,
      buyingGuides: [
        ...c.buyingGuides,
        {
          id: 'guide_' + Date.now(),
          title: 'New Printing Guide',
          subtitle: 'Step-by-step tutorial & maintenance tips',
          image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?q=80&w=600&auto=format&fit=crop',
          link: '/slicer',
          readTime: '5 min read',
        },
      ],
    }));
  }

  removeGuide(idx: number) {
    this.config.update((c) => ({
      ...c,
      buyingGuides: c.buyingGuides.filter((_, i) => i !== idx),
    }));
  }

  moveSectionUp(idx: number) {
    if (idx <= 0) return;
    this.config.update((c) => {
      const arr = [...c.sectionOrder];
      const temp = arr[idx];
      arr[idx] = arr[idx - 1];
      arr[idx - 1] = temp;
      return { ...c, sectionOrder: arr };
    });
  }

  moveSectionDown(idx: number) {
    if (idx >= this.config().sectionOrder.length - 1) return;
    this.config.update((c) => {
      const arr = [...c.sectionOrder];
      const temp = arr[idx];
      arr[idx] = arr[idx + 1];
      arr[idx + 1] = temp;
      return { ...c, sectionOrder: arr };
    });
  }
}
