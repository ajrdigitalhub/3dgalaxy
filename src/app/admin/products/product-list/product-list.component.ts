import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProductService } from '../../shared/services/product.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchFilterComponent } from '../../shared/components/search-filter/search-filter.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-admin-product-list',
  imports: [CommonModule, RouterModule, MatIconModule, PageHeaderComponent, SearchFilterComponent, DataTableComponent, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss'
})
export class ProductListComponent {
  productService = inject(ProductService);
  private router = inject(Router);

  searchQuery = signal<string>('');
  
  // Dialog State
  isDeleteDialogOpen = signal<boolean>(false);
  productToDeleteId = signal<string | null>(null);

  headers = ['Asset Item', 'Category', 'SKU barcode', 'Stock remaining', 'Retail Cost', 'Dealer Pricing', 'Actions'];

  filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.productService.products();
    if (!query) return list;
    return list.filter(p => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query));
  });

  onSearch(query: string) {
    this.searchQuery.set(query);
  }

  editProduct(productId: string) {
    this.router.navigate(['/admin/products/edit', productId]);
  }

  viewProductDetails(productId: string) {
    this.router.navigate(['/admin/products', productId]);
  }

  openDeleteDialog(productId: string, event: Event) {
    event.stopPropagation();
    this.productToDeleteId.set(productId);
    this.isDeleteDialogOpen.set(true);
  }

  closeDeleteDialog() {
    this.isDeleteDialogOpen.set(false);
    this.productToDeleteId.set(null);
  }

  async confirmDelete() {
    const id = this.productToDeleteId();
    if (id) {
      try {
        await this.productService.deleteProduct(id);
        alert('Asset removed successfully.');
      } catch (e) {
        alert('Operation failed.');
      }
    }
    this.closeDeleteDialog();
  }
}
