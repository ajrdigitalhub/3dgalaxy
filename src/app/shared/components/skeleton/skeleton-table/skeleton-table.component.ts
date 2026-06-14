import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-skeleton-table',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent],
  template: `
    <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/10 overflow-hidden">
      <!-- Toolbar -->
      <div class="p-4 border-b border-black/5 dark:border-white/10 flex justify-between">
        <app-skeleton-loader width="w-64" height="h-10" />
        <div class="flex gap-2">
          <app-skeleton-loader width="w-24" height="h-10" />
          <app-skeleton-loader width="w-24" height="h-10" />
        </div>
      </div>
      
      <!-- Headers -->
      <div class="flex p-4 border-b border-black/5 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-800/50 gap-4">
        @for(c of columnsArray; track $index) {
          <div class="flex-1">
            <app-skeleton-loader width="w-1/2" height="h-5" />
          </div>
        }
      </div>

      <!-- Rows -->
      <div class="flex flex-col">
        @for(r of rowsArray; track $index) {
          <div class="flex p-4 border-b border-black/5 dark:border-white/10 last:border-0 gap-4 transition-colors">
            @for(c of columnsArray; track $index) {
              <div class="flex-1 flex items-center">
                <app-skeleton-loader width="w-3/4" height="h-4" />
              </div>
            }
          </div>
        }
      </div>

      <!-- Pagination -->
      <div class="p-4 border-t border-black/5 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/50">
         <app-skeleton-loader width="w-48" height="h-5" />
         <div class="flex gap-2">
            <app-skeleton-loader width="w-8" height="h-8" borderRadius="rounded-md" />
            <app-skeleton-loader width="w-8" height="h-8" borderRadius="rounded-md" />
            <app-skeleton-loader width="w-8" height="h-8" borderRadius="rounded-md" />
         </div>
      </div>
    </div>
  `
})
export class SkeletonTableComponent {
  rows = input<number>(5);
  columns = input<number>(5);

  get rowsArray() {
    return Array.from({ length: this.rows() });
  }

  get columnsArray() {
    return Array.from({ length: this.columns() });
  }
}
