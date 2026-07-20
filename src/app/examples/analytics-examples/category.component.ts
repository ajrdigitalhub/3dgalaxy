import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, AnalyticsItem } from '../../core/analytics';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="category-page p-6">
      <h1 class="text-2xl font-bold mb-4">Category: 3D Printers</h1>
      
      <div class="flex space-x-4 mb-4">
        <button (click)="onFilter('price', 'under_20k')" class="bg-gray-100 px-3 py-1 rounded text-sm">
          Under ₹20,000
        </button>
        <button (click)="onSort('price_low_to_high')" class="bg-gray-100 px-3 py-1 rounded text-sm">
          Sort: Price Low to High
        </button>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div *ngFor="let item of products" (click)="onProductClick(item)" class="border p-4 cursor-pointer hover:shadow">
          <h3 class="font-bold">{{ item.item_name }}</h3>
          <p class="text-indigo-600">₹{{ item.price }}</p>
        </div>
      </div>
    </div>
  `
})
export class CategoryComponent implements OnInit {
  private analytics = inject(AnalyticsService);

  products: AnalyticsItem[] = [
    { item_id: 'PRINTER-01', item_name: 'Ender 3 V3 SE', item_category: '3D Printers', price: 18999 },
    { item_id: 'PRINTER-02', item_name: 'Bambu Lab A1 Mini', item_category: '3D Printers', price: 29999 }
  ];

  ngOnInit(): void {
    this.analytics.trackCategoryView('3D Printers');
    this.analytics.trackProductImpression(this.products, '3D Printers Category List');
  }

  onFilter(cat: string, val: string): void {
    this.analytics.trackFilter(cat, val);
  }

  onSort(sortBy: string): void {
    this.analytics.trackSort(sortBy);
  }

  onProductClick(item: AnalyticsItem): void {
    this.analytics.trackProductClick(item, '3D Printers Category List');
  }
}
