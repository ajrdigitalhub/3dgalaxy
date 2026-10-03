import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService, Category } from '../../../services/datastore';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';
import { TiltDirective } from '../../../shared/directives/tilt.directive';

@Component({
  selector: 'app-home-categories',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, ScrollRevealDirective, TiltDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- QUICK NAVIGATION (Centered & Responsive Category Section) -->
    <section class="max-w-7xl mx-auto px-4 md:px-6 space-y-6 md:space-y-8 text-left" appScrollReveal="fade">
      <div class="flex items-end justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 md:pb-5 gap-4">
        <div class="space-y-1">
          <h2 class="text-xs md:text-[10px] font-black uppercase tracking-widest md:tracking-[0.4em] text-theme-primary font-display">
            QUICK NAVIGATION</h2>
        </div>
        <div>
          <a routerLink="/products"
            class="text-[10px] md:text-xs font-black uppercase tracking-widest text-theme-primary hover:underline flex items-center gap-1 transition-all">
            <span class="hidden md:inline">All Products →</span>
            <span class="md:hidden">View All</span>
          </a>
        </div>
      </div>

      <div class="w-full flex justify-center">
        <div class="flex flex-wrap items-stretch justify-center gap-3.5 sm:gap-5 md:gap-6 w-full max-w-6xl mx-auto">
          @if (parentCategories().length === 0) {
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="flex flex-col items-center justify-center gap-3 p-4 bg-white/40 dark:bg-neutral-900/40 rounded-3xl md:rounded-[2.25rem] h-48 w-36 sm:w-44 md:w-52 animate-pulse border border-neutral-100 dark:border-neutral-800/40">
                <div class="h-24 w-24 md:h-28 md:w-28 rounded-full bg-neutral-200 dark:bg-neutral-800"></div>
                <div class="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-full mt-2"></div>
                <div class="h-2 w-12 bg-neutral-200 dark:bg-neutral-800 rounded-full"></div>
              </div>
            }
          } @else {
            @for (item of parentCategories(); track item.id; let idx = $index) {
              <button (click)="selectFilterCategory(item.id)" [appScrollReveal]="'rotate-in'" [delay]="idx * 80" appTilt [tiltMax]="5"
                [class]="'group flex flex-col items-center justify-between gap-2 p-4 sm:p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-3xl md:rounded-[2.25rem] transition-all h-48 sm:h-56 w-[calc(50%-0.5rem)] xs:w-[calc(33.333%-0.75rem)] sm:w-44 md:w-48 lg:w-52 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs hover:shadow-xl cursor-pointer relative overflow-hidden ' + 
                         (ds.filterCategory() === item.id 
                           ? 'bg-theme-primary/10 border-theme-primary/40 shadow-lg shadow-theme-primary/15 scale-[1.03]' 
                           : 'hover:scale-[1.03] hover:bg-white dark:hover:bg-neutral-900 hover:border-theme-primary/40')"
                [attr.aria-label]="'Filter by ' + item.name">
                
                @if (ds.filterCategory() === item.id) {
                  <div class="absolute top-0 left-0 right-0 h-1.5 bg-theme-gradient rounded-full"></div>
                }

                <div [class]="'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-2xl flex items-center justify-center transition-all duration-500 border-none bg-neutral-50/50 dark:bg-neutral-950/30 p-2 my-auto ' + 
                              (ds.filterCategory() === item.id 
                                ? 'text-theme-primary scale-105' 
                                : 'text-neutral-700 dark:text-neutral-200 group-hover:scale-110')">
                  @if (item.image) {
                    <img [src]="item.image" [alt]="item.name" class="max-w-full max-h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-500 ease-out"
                      (error)="onImageError($event)" referrerpolicy="no-referrer" loading="lazy" decoding="async">
                  } @else {
                    <mat-icon class="scale-[2.5] sm:scale-[3] md:scale-[3.5] filter drop-shadow-md transition-transform duration-300 group-hover:scale-[3.2] md:group-hover:scale-[3.8]">{{ getIcon(item.id) }}</mat-icon>
                  }
                </div>

                <div class="flex flex-col items-center gap-0.5 w-full mt-auto">
                  <span [class]="'text-xs sm:text-sm font-black uppercase tracking-wider text-center leading-snug line-clamp-2 px-1 transition-colors ' + 
                                 (ds.filterCategory() === item.id 
                                   ? 'text-theme-primary font-extrabold' 
                                   : 'text-neutral-800 dark:text-neutral-100 group-hover:text-theme-primary')">{{ item.name }}</span>
                  <span class="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wide">
                    {{ ds.productCountMap()[item.id] || 0 }} Items
                  </span>
                </div>
              </button>
            }
          }
        </div>
      </div>
    </section>
  `
})
export class HomeCategoriesComponent {
  ds = inject(DatastoreService);
  router = inject(Router);

  parentCategories = computed(() => {
    const categories = this.ds.categories();
    const featured = categories.filter((c: Category) => 
      c.isFeatured === true || 
      (c as any).is_featured === true || 
      (c as any).is_featured === 'true' || 
      (c as any).isFeatured === 'true'
    );
    const roots = categories.filter((c: Category) => {
      const pId = c.parentId || c.parent_id;
      return !pId || pId === 'null' || pId === 'undefined';
    });

    const combined: Category[] = [...featured];
    for (const r of roots) {
      if (!combined.some((c) => c.id === r.id)) {
        combined.push(r);
      }
    }
    return combined.slice(0, 10);
  });

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

  selectFilterCategory(cat: string) {
    const isSelected = this.ds.filterCategory() === cat;
    const finalCat = isSelected ? "" : cat;

    const layout = this.ds.homeLayout();
    const isCatalogVisible = layout.some(s => s.id === 'featured-innovations' && s.visible);
    if (isCatalogVisible) {
      this.ds.filterCategory.set(finalCat);
      const el = document.getElementById('products-catalog');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      this.router.navigate(['/products'], { queryParams: { category: finalCat } });
    }
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = this.ds.settings()?.defaultPlaceholderUrl || 'https://picsum.photos/seed/placeholder/400/400';
  }
}
