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
    <!-- QUICK NAVIGATION (Mobile Swipeable Slider) -->
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

      <div class="flex md:block overflow-x-auto md:overflow-visible pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory hide-scroll border-b border-transparent [scrollbar-width:none] [-ms-overflow-style:none]">
        <div class="flex md:grid gap-3 md:gap-4 md:grid-cols-5 lg:grid-cols-10 pb-2 w-full">
          @for (item of parentCategories(); track item.id; let idx = $index) {
            <button (click)="selectFilterCategory(item.id)" [appScrollReveal]="'rotate-in'" [delay]="idx * 80" appTilt [tiltMax]="5"
              [class]="'group flex-shrink-0 snap-center flex flex-col items-center justify-center gap-2 p-3 md:p-4 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md rounded-3xl md:rounded-[2rem] transition-all h-44 w-36 md:h-56 md:w-full border-none cursor-pointer relative overflow-hidden ' + 
                       (ds.filterCategory() === item.id 
                         ? 'bg-theme-primary/10 shadow-lg shadow-theme-primary/20 scale-[1.05]' 
                         : 'hover:scale-[1.06] hover:bg-white/80 dark:hover:bg-neutral-900/80')"
              [attr.aria-label]="'Filter by ' + item.name">
              
              @if (ds.filterCategory() === item.id) {
                <div class="absolute top-0 left-0 right-0 h-1.5 bg-theme-gradient rounded-full"></div>
              }

              <div [class]="'h-28 w-28 md:h-36 md:w-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 border-none bg-transparent p-1 ' + 
                            (ds.filterCategory() === item.id 
                              ? 'text-theme-primary scale-110' 
                              : 'text-neutral-700 dark:text-neutral-200 group-hover:scale-110')">
                @if (item.image) {
                  <img [src]="item.image" [alt]="item.name" class="w-full h-full object-contain p-0.5 border-none filter drop-shadow-xl logo-img group-hover:scale-110 transition-transform duration-500 ease-out"
                    (error)="onImageError($event)" referrerpolicy="no-referrer" loading="lazy" decoding="async">
                } @else {
                  <mat-icon class="scale-[3.2] md:scale-[4] filter drop-shadow-md transition-transform duration-300 group-hover:scale-[3.5] md:group-hover:scale-[4.5]">{{ getIcon(item.id) }}</mat-icon>
                }
              </div>

              <div class="flex flex-col items-center gap-0.5 mt-1">
                <span [class]="'text-xs md:text-sm font-black uppercase tracking-wider text-center leading-tight px-1 transition-colors ' + 
                               (ds.filterCategory() === item.id 
                                 ? 'text-theme-primary font-bold' 
                                 : 'text-neutral-800 dark:text-neutral-200 group-hover:text-theme-primary')">{{ item.name }}</span>
                <span class="text-[10px] text-neutral-400 font-bold uppercase tracking-wide">
                  {{ ds.productCountMap()[item.id] || 0 }} Items
                </span>
              </div>
            </button>
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
