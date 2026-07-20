import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../core/analytics';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-box p-4">
      <input
        type="text"
        [(ngModel)]="query"
        (keyup.enter)="onSearch()"
        placeholder="Search filaments, printers..."
        class="border p-2 rounded w-64 mr-2"
      />
      <button (click)="onSearch()" class="bg-indigo-600 text-white px-4 py-2 rounded">
        Search
      </button>
    </div>
  `
})
export class SearchComponent {
  private analytics = inject(AnalyticsService);
  query = '';

  onSearch(): void {
    if (this.query.trim()) {
      this.analytics.trackSearch(this.query.trim());
    }
  }
}
