import { Component } from '@angular/core';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-skeleton-form',
  standalone: true,
  imports: [SkeletonLoaderComponent],
  template: `
    <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/10 p-6 flex flex-col gap-6">
      
      <div class="flex flex-col gap-2">
         <app-skeleton-loader width="w-1/3" height="h-6" />
         <app-skeleton-loader width="w-2/3" height="h-4" />
      </div>

      <!-- Form Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Input Placeholder 1 -->
        <div class="flex flex-col gap-2">
          <app-skeleton-loader width="w-24" height="h-4" />
          <app-skeleton-loader width="w-full" height="h-12" borderRadius="rounded-lg" />
        </div>
        
        <!-- Input Placeholder 2 -->
        <div class="flex flex-col gap-2">
          <app-skeleton-loader width="w-32" height="h-4" />
          <app-skeleton-loader width="w-full" height="h-12" borderRadius="rounded-lg" />
        </div>

        <!-- Input Placeholder 3 -->
        <div class="flex flex-col gap-2 md:col-span-2">
          <app-skeleton-loader width="w-28" height="h-4" />
          <app-skeleton-loader width="w-full" height="h-12" borderRadius="rounded-lg" />
        </div>
        
        <!-- Textarea Placeholder -->
        <div class="flex flex-col gap-2 md:col-span-2">
          <app-skeleton-loader width="w-40" height="h-4" />
          <app-skeleton-loader width="w-full" height="h-32" borderRadius="rounded-lg" />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-4 mt-4 pt-6 border-t border-black/5 dark:border-white/10">
        <app-skeleton-loader width="w-24" height="h-10" borderRadius="rounded-md" />
        <app-skeleton-loader width="w-32" height="h-10" borderRadius="rounded-md" />
      </div>
    </div>
  `
})
export class SkeletonFormComponent {}
