import { Component } from '@angular/core';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-skeleton-category-card',
  standalone: true,
  imports: [SkeletonLoaderComponent],
  template: `
    <div class="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-black/5 dark:border-white/10 flex flex-col items-center justify-center gap-4 text-center h-full min-h-[160px]">
      <app-skeleton-loader width="w-16" height="h-16" borderRadius="rounded-full" />
      <app-skeleton-loader width="w-3/4" height="h-5" />
    </div>
  `
})
export class SkeletonCategoryCardComponent {}
