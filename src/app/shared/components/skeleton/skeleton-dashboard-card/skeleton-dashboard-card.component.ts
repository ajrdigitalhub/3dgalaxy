import { Component } from '@angular/core';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-skeleton-dashboard-card',
  standalone: true,
  imports: [SkeletonLoaderComponent],
  template: `
    <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/10 p-6 flex flex-col gap-4">
      <div class="flex justify-between items-center">
        <app-skeleton-loader width="w-1/2" height="h-5" />
        <app-skeleton-loader width="w-8" height="h-8" borderRadius="rounded-full" />
      </div>
      <div>
        <app-skeleton-loader width="w-3/4" height="h-8" extraClasses="mb-2" />
        <app-skeleton-loader width="w-1/3" height="h-4" />
      </div>
    </div>
  `
})
export class SkeletonDashboardCardComponent {}
