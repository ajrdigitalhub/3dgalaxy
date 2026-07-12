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
          <h2 class="text-xs md:text-[10px] font-black uppercase tracking-widest md:tracking-[0.4em] text-[#d65108] font-display">
            QUICK NAVIGATION</h2>
        </div>
        <div>
          <a routerLink="/products"
            class="text-[10px] md:text-xs font-black uppercase tracking-widest text-[#d65108] hover:underline flex items-center gap-1 transition-all">
            <span class="hidden md:inline">All Products →</span>
            <span class="md:hidden">View All</span>
          </a>
        </div>
      </div>

      <div class="flex md:block overflow-x-auto md:overflow-visible pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory hide-scroll border-b border-transparent [scrollbar-width:none] [-ms-overflow-style:none]">
        <div class="flex md:grid gap-3 md:gap-4 md:grid-cols-5 lg:grid-cols-10 pb-2 w-full">
          @for (item of parentCategories(); track item.id; let idx = $index) {
            <button (click)="selectFilterCategory(item.id)" [appScrollReveal]="'rotate-in'" [delay]="idx * 80" appTilt [tiltMax]="5"
              [class]="'group flex-shrink-0 snap-center flex flex-col items-center justify-center gap-1.5 p-2 md:p-3 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl md:rounded-[1.5rem] transition-all h-36 w-32 md:h-48 md:w-full border border-neutral-200/50 dark:border-neutral-800/40 cursor-pointer relative overflow-hidden ' + 
                       (ds.filterCategory() === item.id 
                         ? 'border-orange-500 shadow-md shadow-orange-500/10' 
                         : 'hover:border-orange-500 hover:scale-[1.04] hover:shadow-lg hover:shadow-orange-500/5')"
              [attr.aria-label]="'Filter by ' + item.name">
              
              @if (ds.filterCategory() === item.id) {
                <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600 to-amber-500"></div>
              }

              <div [class]="'h-20 w-20 md:h-26 md:w-26 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 overflow-hidden ' + 
                            (ds.filterCategory() === item.id 
                              ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white' 
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-amber-500 group-hover:text-white group-hover:rotate-6')">
                @if (item.image) {
                  <img [src]="item.image" [alt]="item.name" class="w-full h-full object-contain p-1.5 logo-img"
                    (error)="onImageError($event)" referrerpolicy="no-referrer" loading="lazy" decoding="async">
                } @else {
                  <mat-icon class="scale-[2] md:scale-[2.5]">{{ getIcon(item.id) }}</mat-icon>
                }
              </div>

              <div class="flex flex-col items-center gap-0.5 mt-1">
                <span [class]="'text-[9px] md:text-[10px] font-black uppercase tracking-wider text-center leading-tight px-1 transition-colors ' + 
                               (ds.filterCategory() === item.id 
                                 ? 'text-neutral-900 dark:text-white' 
                                 : 'text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white')">{{ item.name }}</span>
                <span class="text-[8px] text-neutral-400 font-bold uppercase tracking-wide">
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
    return this.ds.categories()
      .filter((c: Category) => {
        const pId = c.parentId || c.parent_id;
        if (!pId) return true;
        if (pId === 'null' || pId === 'undefined') return true;
        return false;
      })
      .slice(0, 10);
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
    const layout = this.ds.homeLayout();
    const isCatalogVisible = layout.some(s => s.id === 'featured-innovations' && s.visible);
    if (isCatalogVisible) {
      this.ds.filterCategory.set(cat);
      const el = document.getElementById('products-catalog');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      this.router.navigate(['/products'], { queryParams: { category: cat } });
    }
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = this.ds.settings()?.defaultPlaceholderUrl || 'https://picsum.photos/seed/placeholder/400/400';
  }
}
