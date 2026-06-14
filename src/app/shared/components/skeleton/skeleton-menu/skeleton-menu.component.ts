import { Component } from '@angular/core';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-skeleton-menu',
  standalone: true,
  imports: [SkeletonLoaderComponent],
  template: `
    <div class="flex items-center gap-6 h-full px-4">
      <app-skeleton-loader width="w-20" height="h-5" />
      <app-skeleton-loader width="w-24" height="h-5" />
      <app-skeleton-loader width="w-16" height="h-5" />
      <app-skeleton-loader width="w-32" height="h-5" />
    </div>
  `
})
export class SkeletonMenuComponent {}
