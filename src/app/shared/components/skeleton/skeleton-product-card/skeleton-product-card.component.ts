import { Component } from '@angular/core';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-skeleton-product-card',
  standalone: true,
  imports: [SkeletonLoaderComponent],
  template: `
    <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/10 overflow-hidden flex flex-col h-full">
      <div class="w-full aspect-square p-4">
        <app-skeleton-loader height="h-full" width="w-full" />
      </div>
      <div class="p-4 flex flex-col flex-1 pb-6">
        <app-skeleton-loader height="h-4" width="w-1/3" extraClasses="mb-2" />
        <app-skeleton-loader height="h-6" width="w-full" extraClasses="mb-1" />
        <app-skeleton-loader height="h-6" width="w-3/4" extraClasses="mb-4" />
        <div class="mt-auto flex justify-between items-end">
          <app-skeleton-loader height="h-7" width="w-24" />
          <app-skeleton-loader height="h-10" width="w-24" borderRadius="rounded-full" />
        </div>
      </div>
    </div>
  `
})
export class SkeletonProductCardComponent {}
