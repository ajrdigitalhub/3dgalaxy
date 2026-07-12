import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DatastoreService } from '../../../services/datastore';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-home-brands',
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- FEATURED BRANDS MARQUEE -->
    <section class="w-full bg-neutral-950 dark:bg-neutral-950 py-12 md:py-16 border-y border-neutral-900 overflow-hidden" appScrollReveal="fade">
      <div class="max-w-7xl mx-auto px-6 mb-8 text-center">
        <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 font-display">Verified Partners</h2>
        <h3 class="text-2xl font-black text-white tracking-tighter font-display">Shop By Brands</h3>
      </div>

      <div class="relative flex overflow-hidden w-full group py-4">
        <div class="flex animate-marquee gap-8 md:gap-16 whitespace-nowrap px-4 group-hover:[animation-play-state:paused]">
          @for (brand of designedBrands(); track brand.slug) {
            <a [routerLink]="['/products']" [queryParams]="{brand: brand.name}"
              class="flex items-center justify-center h-20 w-32 md:h-24 md:w-40 bg-neutral-900/50 rounded-2xl border border-neutral-800/60 hover:bg-neutral-800 hover:border-orange-500/30 hover:scale-[1.03] hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
              @if (brand.logoUrl) {
                <img [src]="brand.logoUrl" [alt]="brand.name"
                  class="max-h-16 max-w-[90%] md:max-h-20 object-contain filter grayscale hover:grayscale-0 transition-all duration-500 opacity-60 hover:opacity-100 logo-img"
                  (error)="onImageError($event)" referrerpolicy="no-referrer" loading="lazy" decoding="async">
              } @else {
                <span class="text-base md:text-xl font-black text-neutral-400 tracking-wider uppercase font-display">{{ brand.name }}</span>
              }
            </a>
          }
        </div>
        <div class="flex animate-marquee2 absolute top-4 gap-8 md:gap-16 whitespace-nowrap px-4 group-hover:[animation-play-state:paused]" aria-hidden="true">
          @for (brand of designedBrands(); track brand.slug) {
            <a [routerLink]="['/products']" [queryParams]="{brand: brand.name}"
              class="flex items-center justify-center h-20 w-32 md:h-24 md:w-40 bg-neutral-900/50 rounded-2xl border border-neutral-800/60 hover:bg-neutral-800 hover:border-orange-500/30 hover:scale-[1.03] hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
              @if (brand.logoUrl) {
                <img [src]="brand.logoUrl" [alt]="brand.name"
                  class="max-h-16 max-w-[90%] md:max-h-20 object-contain filter grayscale hover:grayscale-0 transition-all duration-500 opacity-60 hover:opacity-100 logo-img"
                  (error)="onImageError($event)" referrerpolicy="no-referrer" loading="lazy" decoding="async">
              } @else {
                <span class="text-base md:text-xl font-black text-neutral-400 tracking-wider uppercase font-display">{{ brand.name }}</span>
              }
            </a>
          }
        </div>
      </div>
    </section>
  `
})
export class HomeBrandsComponent implements OnInit {
  ds = inject(DatastoreService);

  designedBrands = computed(() => {
    const list = [
      { name: 'Creality', icon: 'CR', fallbackImage: 'https://images.unsplash.com/photo-1615840287214-7fe58a8f3685?auto=format&fit=crop&q=80&w=400' },
      { name: 'Bambu Lab', icon: 'BL', fallbackImage: 'https://store.bambulab.com/cdn/shop/files/A1_Combo_600x600.png' },
      { name: 'Flashforge', icon: 'FF', fallbackImage: 'https://images.unsplash.com/photo-1631035626723-cd8e9ef9e728?auto=format&fit=crop&q=80&w=400' },
      { name: 'Elegoo', icon: 'EG', fallbackImage: 'https://images.unsplash.com/photo-1551021210-994c6498a44b?auto=format&fit=crop&q=80&w=400' },
      { name: 'Phrozen', icon: 'PH', fallbackImage: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400' },
      { name: 'CreatBot', icon: 'CB', fallbackImage: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=400' },
      { name: 'Snapmaker', icon: 'SM', fallbackImage: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&q=80&w=400' },
      { name: 'Anycubic', icon: 'AC', fallbackImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=400' },
      { name: 'Prusa', icon: 'PR', fallbackImage: 'https://images.unsplash.com/photo-1608962714006-29d09083f830?auto=format&fit=crop&q=80&w=400' }
    ];

    return list.map(item => {
      const dbBrand = this.ds.brands().find(dbB =>
        dbB.name.toLowerCase() === item.name.toLowerCase() ||
        dbB.slug.toLowerCase() === item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      );
      return {
        name: dbBrand?.name || item.name,
        slug: dbBrand?.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        icon: item.icon,
        logoUrl: dbBrand?.logo || '',
        image: dbBrand?.banner || item.fallbackImage,
        description: dbBrand?.description || ''
      };
    });
  });

  ngOnInit() {
    this.ds.reloadBrands();
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = this.ds.settings()?.defaultPlaceholderUrl || 'https://picsum.photos/seed/placeholder/400/400';
  }
}
