import { Component } from '@angular/core';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-skeleton-banner',
  standalone: true,
  imports: [SkeletonLoaderComponent],
  template: `
    <div class="w-full relative overflow-hidden rounded-2xl h-[400px] md:h-[500px]">
      <app-skeleton-loader width="w-full" height="h-full" borderRadius="rounded-2xl" />
      <div class="absolute inset-0 flex flex-col justify-center px-8 md:px-16 w-full md:w-1/2 gap-4">
        <app-skeleton-loader width="w-1/3" height="h-6" />
        <app-skeleton-loader width="w-full" height="h-12" />
        <app-skeleton-loader width="w-4/5" height="h-12" />
        <app-skeleton-loader width="w-full" height="h-16" extraClasses="mt-4" />
        <app-skeleton-loader width="w-40" height="h-12" borderRadius="rounded-full" extraClasses="mt-4" />
      </div>
    </div>
  `
})
export class SkeletonBannerComponent {}
