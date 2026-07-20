import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  PLATFORM_ID,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { CommonModule } from "@angular/common";
import { Title, Meta } from "@angular/platform-browser";
import { DatastoreService } from "../../services/datastore";
import { LoadingService } from "../../core/services/loading.service";
import { SkeletonPageComponent } from "../../shared/components/skeleton/skeleton-page/skeleton-page.component";

// Import subcomponents
import { HomeHeroComponent } from "./components/home-hero.component";
import { HomeCategoriesComponent } from "./components/home-categories.component";
import { HomeFeaturedProductsComponent } from "./components/home-featured-products.component";
import { HomeBrandsComponent } from "./components/home-brands.component";
import { HomeFeaturedShowcaseComponent } from "./components/home-featured-showcase.component";
import {
  HomeShowcaseTwoComponent,
  HomeNewsletterComponent,
  HomeShopByCategoryComponent,
  HomeTechnologyHubsComponent,
  HomeEnterpriseSolutionsComponent,
  HomeServicesComponent,
  HomeWhyChooseUsComponent,
  HomeStatisticsComponent,
  HomeTestimonialsComponent,
  HomeInstagramFeedComponent,
  HomeCategoryShowcaseRowComponent,
  HomeFlashDealsComponent,
  HomeBestSellersComponent,
  HomeTrendingProductsComponent,
  HomeNewArrivalsComponent,
  HomeMaterialsComponent,
  HomeApplicationsComponent,
  HomeCollectionsComponent,
  HomeBundleOffersComponent,
  HomeReviewsComponent,
  HomeBlogsComponent
} from "./components/home-sections.component";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [
    CommonModule,
    SkeletonPageComponent,
    HomeHeroComponent,
    HomeCategoriesComponent,
    HomeFeaturedProductsComponent,
    HomeFeaturedShowcaseComponent,
    HomeBrandsComponent,
    HomeShowcaseTwoComponent,
    HomeCategoryShowcaseRowComponent,
    HomeNewsletterComponent,
    HomeShopByCategoryComponent,
    HomeTechnologyHubsComponent,
    HomeEnterpriseSolutionsComponent,
    HomeServicesComponent,
    HomeWhyChooseUsComponent,
    HomeStatisticsComponent,
    HomeTestimonialsComponent,
    HomeInstagramFeedComponent,
    HomeFlashDealsComponent,
    HomeBestSellersComponent,
    HomeTrendingProductsComponent,
    HomeNewArrivalsComponent,
    HomeMaterialsComponent,
    HomeApplicationsComponent,
    HomeCollectionsComponent,
    HomeBundleOffersComponent,
    HomeReviewsComponent,
    HomeBlogsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class Home {
  ds = inject(DatastoreService);
  loadingService = inject(LoadingService);
  titleService = inject(Title);
  metaService = inject(Meta);

  loading = computed(() => this.ds.homepageLoading());

  featuredCategories = computed(() => {
    return this.ds.categories().filter(
      (c) => c.isFeatured === true && c.isActive !== false
    );
  });

  activeTopAd = computed(() =>
    this.ds
      .advertisements()
      .find((a) => a.position === "top-banner" && a.status === "active"),
  );
  activeFooterAd = computed(() =>
    this.ds
      .advertisements()
      .find((a) => a.position === "footer" && a.status === "active"),
  );

  constructor() {
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    // Set dynamic sales-focused SEO tags
    this.titleService.setTitle(
      "3D Galaxy | Buy 3D Printers, Filaments & Custom 3D Printing Service Online",
    );
    this.metaService.updateTag({
      name: "description",
      content:
        "Shop professional 3D printers, high-grade filaments & spare parts at India's lowest prices. Get instant online slicing quotes for custom SLA & FDM 3D printing. Upload STL now & save 15% on bulk dealer orders!",
    });
    this.metaService.updateTag({
      property: "og:title",
      content:
        "3D Galaxy | Buy 3D Printers, Filaments & 3D Printing Services Online",
    });
    this.metaService.updateTag({
      property: "og:description",
      content:
        "Shop professional 3D printers, high-grade filaments & spare parts at India's lowest prices. Get instant online slicing quotes for custom SLA & FDM 3D printing. Upload STL now & save 15% on bulk dealer orders!",
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

  trackAdClick(id: string) {
    this.ds.recordAdClick(id);
  }
}
