import { Component } from '@angular/core';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';
import { SkeletonCardComponent } from '../skeleton-card/skeleton-card.component';
import { SkeletonBannerComponent } from '../skeleton-banner/skeleton-banner.component';

@Component({
  selector: 'app-skeleton-page',
  standalone: true,
  imports: [SkeletonLoaderComponent, SkeletonCardComponent, SkeletonBannerComponent],
  template: `
    <div class="flex flex-col gap-12 max-w-7xl mx-auto w-full p-4 md:p-8">
      <!-- Page Header -->
      <app-skeleton-banner />

      <!-- Content Section 1 -->
      <div class="flex flex-col gap-6 w-full">
        <app-skeleton-loader width="w-48" height="h-8" />
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <app-skeleton-card />
          <app-skeleton-card />
          <app-skeleton-card />
          <app-skeleton-card />
        </div>
      </div>
      
      <!-- Content Section 2 -->
      <div class="flex flex-col gap-6 w-full">
        <app-skeleton-loader width="w-64" height="h-8" />
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <app-skeleton-card />
          <app-skeleton-card />
          <app-skeleton-card />
        </div>
      </div>
    </div>
  `
})
export class SkeletonPageComponent {}
