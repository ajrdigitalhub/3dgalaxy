import { Injectable, signal } from '@angular/core';
import { BannerCampaign } from '../models/banner.model';

@Injectable({
  providedIn: 'root'
})
export class BannerService {
  bannerCampaigns = signal<BannerCampaign[]>([]);

  addBanner(banner: any) {
    this.bannerCampaigns.update(all => [...all, banner]);
  }

  deleteBanner(id: string) {
    this.bannerCampaigns.update(all => all.filter(b => b.id !== id));
  }
}
