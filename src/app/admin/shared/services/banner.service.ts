import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BannerService {
  bannerCampaigns = signal([
    { id: 'b1', name: 'Summer Hot Deals 3D Filament', type: 'Hero Slider', status: 'Published', device: 'Desktop & Mobile', activeHours: '24 Hours', cta: 'Shop Sale' },
    { id: 'b2', name: 'Authorized Creality Launch Promo', type: 'Category Banner', status: 'Published', device: 'Desktop Only', activeHours: 'Scheduled', cta: 'Explore' },
    { id: 'b3', name: 'Free Brass Nozzle Pack on orders over ₹3000', type: 'Sticky Banner', status: 'Draft', device: 'All Platforms', activeHours: 'Manual Override', cta: 'Grab Code' }
  ]);

  addBanner(banner: any) {
    this.bannerCampaigns.update(all => [...all, banner]);
  }

  deleteBanner(id: string) {
    this.bannerCampaigns.update(all => all.filter(b => b.id !== id));
  }
}
