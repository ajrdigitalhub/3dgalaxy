import { Component, ChangeDetectionStrategy, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DatastoreService } from '../../../services/datastore';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-home-brands',
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes gradientBorderFlow {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    .brand-section-bg {
      background: radial-gradient(circle at 50% 20%, rgba(245, 79, 0, 0.12) 0%, transparent 65%),
                  linear-gradient(180deg, #070709 0%, #0d0e14 50%, #070709 100%);
    }

    .brand-card-animated {
      position: relative;
      background: rgba(18, 19, 26, 0.85);
      backdrop-filter: blur(14px);
      border-radius: 1.25rem;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .brand-card-animated::before {
      content: '';
      position: absolute;
      inset: -1.5px;
      border-radius: 1.35rem;
      padding: 1.5px;
      background: linear-gradient(120deg, 
        rgba(245, 79, 0, 0.85), 
        rgba(251, 146, 60, 0.5), 
        rgba(99, 102, 241, 0.7), 
        rgba(245, 79, 0, 0.85)
      );
      background-size: 250% 250%;
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0.35;
      animation: gradientBorderFlow 5s ease infinite;
      transition: opacity 0.35s ease, filter 0.35s ease;
      pointer-events: none;
    }

    .brand-card-animated:hover::before {
      opacity: 1;
      filter: drop-shadow(0 0 10px rgba(245, 79, 0, 0.6));
    }

    .brand-card-animated:hover {
      transform: translateY(-4px) scale(1.04);
      background: rgba(32, 34, 46, 0.95);
      box-shadow: 0 16px 36px -8px rgba(245, 79, 0, 0.3);
    }

    /* Normal state: crisp monochrome white logo */
    .brand-logo-img {
      max-height: 4rem;
      max-width: 88%;
      object-fit: contain;
      filter: brightness(0) invert(1) opacity(0.8);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Hover state: FULL VIBRANT COLOR EFFECT with backlight glow */
    .brand-card-animated:hover .brand-logo-img {
      filter: brightness(1) invert(0) grayscale(0) drop-shadow(0 0 10px rgba(255, 255, 255, 0.85));
      opacity: 1;
      transform: scale(1.12);
    }

    .section-border-line {
      height: 1px;
      background: linear-gradient(90deg, 
        transparent 0%, 
        rgba(245, 79, 0, 0.6) 30%, 
        rgba(251, 146, 60, 0.9) 50%, 
        rgba(245, 79, 0, 0.6) 70%, 
        transparent 100%
      );
      background-size: 200% 100%;
      animation: gradientBorderFlow 6s linear infinite;
    }
  `],
  template: `
    <!-- FEATURED BRANDS MARQUEE -->
    <section class="relative w-full brand-section-bg py-16 md:py-22 overflow-hidden" appScrollReveal="fade">
      <!-- Animated Top Border Line -->
      <div class="absolute top-0 inset-x-0 section-border-line"></div>
      
      <!-- Ambient Theme Glow Orbs -->
      <div class="absolute -top-24 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-6 mb-12 text-center relative z-10">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-xs font-black uppercase tracking-[0.35em] text-orange-400 font-display mb-3 shadow-sm shadow-orange-500/10">
          <span class="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
          Verified Partners
        </div>
        <h2 class="text-3xl md:text-4xl font-black text-white tracking-tight font-display bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-100 to-neutral-400">
          Shop By Brands
        </h2>
      </div>

      <div class="relative flex overflow-hidden w-full group py-6">
        <!-- Left & Right Gradient Fades for Smooth Seamless Effect -->
        <div class="absolute top-0 bottom-0 left-0 w-20 md:w-40 bg-gradient-to-r from-[#070709] to-transparent z-20 pointer-events-none"></div>
        <div class="absolute top-0 bottom-0 right-0 w-20 md:w-40 bg-gradient-to-l from-[#070709] to-transparent z-20 pointer-events-none"></div>

        <div class="flex animate-marquee gap-8 md:gap-12 whitespace-nowrap px-4 group-hover:[animation-play-state:paused]">
          @for (brand of designedBrands(); track brand.slug + $index) {
            <a [routerLink]="['/products']" [queryParams]="{brand: brand.name}"
              class="brand-card-animated flex items-center justify-center h-28 w-48 md:h-32 md:w-60 px-6 cursor-pointer">
              @if (brand.logoUrl && !isImageFailed(brand.slug)) {
                <img [src]="brand.logoUrl" [alt]="brand.name"
                  class="brand-logo-img"
                  (error)="onImageError(brand.slug)" referrerpolicy="no-referrer" loading="lazy" decoding="async">
              } @else {
                <div class="flex items-center gap-3">
                  <span class="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 text-sm md:text-base font-black flex items-center justify-center font-mono shadow-inner">{{ brand.icon }}</span>
                  <span class="text-base md:text-lg font-black tracking-wider uppercase font-display bg-clip-text text-transparent bg-gradient-to-r from-neutral-100 to-neutral-300 group-hover:from-white group-hover:to-orange-300 transition-all duration-300">{{ brand.name }}</span>
                </div>
              }
            </a>
          }
        </div>
        <div class="flex animate-marquee2 absolute top-6 gap-8 md:gap-12 whitespace-nowrap px-4 group-hover:[animation-play-state:paused]" aria-hidden="true">
          @for (brand of designedBrands(); track brand.slug + '-dup-' + $index) {
            <a [routerLink]="['/products']" [queryParams]="{brand: brand.name}"
              class="brand-card-animated flex items-center justify-center h-28 w-48 md:h-32 md:w-60 px-6 cursor-pointer">
              @if (brand.logoUrl && !isImageFailed(brand.slug)) {
                <img [src]="brand.logoUrl" [alt]="brand.name"
                  class="brand-logo-img"
                  (error)="onImageError(brand.slug)" referrerpolicy="no-referrer" loading="lazy" decoding="async">
              } @else {
                <div class="flex items-center gap-3">
                  <span class="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 text-sm md:text-base font-black flex items-center justify-center font-mono shadow-inner">{{ brand.icon }}</span>
                  <span class="text-base md:text-lg font-black tracking-wider uppercase font-display bg-clip-text text-transparent bg-gradient-to-r from-neutral-100 to-neutral-300 group-hover:from-white group-hover:to-orange-300 transition-all duration-300">{{ brand.name }}</span>
                </div>
              }
            </a>
          }
        </div>
      </div>

      <!-- Animated Bottom Border Line -->
      <div class="absolute bottom-0 inset-x-0 section-border-line"></div>
    </section>
  `
})
export class HomeBrandsComponent implements OnInit {
  ds = inject(DatastoreService);
  failedLogos = signal<Set<string>>(new Set());

  designedBrands = computed(() => {
    // 1. Fetch active brands configured in Admin via DatastoreService
    const activeDbBrands = (this.ds.brands() || []).filter(b => b.active !== false);

    if (activeDbBrands.length > 0) {
      return activeDbBrands.map(b => ({
        name: b.name,
        slug: b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        icon: (b.name || 'BR').substring(0, 2).toUpperCase(),
        logoUrl: b.logo || '',
        image: b.banner || '',
        description: b.description || ''
      }));
    }

    // 2. Default fallback if no admin brands configured yet
    const defaults = [
      { name: 'Creality', icon: 'CR' },
      { name: 'Bambu Lab', icon: 'BL' },
      { name: 'Flashforge', icon: 'FF' },
      { name: 'Elegoo', icon: 'EG' },
      { name: 'Phrozen', icon: 'PH' },
      { name: 'CreatBot', icon: 'CB' },
      { name: 'Snapmaker', icon: 'SM' },
      { name: 'Anycubic', icon: 'AC' },
      { name: 'Prusa', icon: 'PR' }
    ];

    return defaults.map(item => ({
      name: item.name,
      slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      icon: item.icon,
      logoUrl: '',
      image: '',
      description: ''
    }));
  });

  ngOnInit() {
    this.ds.reloadBrands();
  }

  onImageError(slug: string) {
    this.failedLogos.update(set => {
      const newSet = new Set(set);
      newSet.add(slug);
      return newSet;
    });
  }

  isImageFailed(slug: string): boolean {
    return this.failedLogos().has(slug);
  }
}


