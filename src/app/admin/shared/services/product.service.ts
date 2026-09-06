import { Injectable, inject, signal } from '@angular/core';
import { Product } from '../../../services/datastore'; // we can still use interfaces from here!
import { ApiService } from '../../../services/api.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private api = inject(ApiService);
  
  products = signal<Product[]>([]);
  isLoading = signal<boolean>(false);

  loadProducts(searchQuery?: string) {
    this.isLoading.set(true);
    const params: any = { limit: 500 };
    if (searchQuery && searchQuery.trim().length > 0) {
      params.search = searchQuery.trim();
    }

    this.api.get<any>('/admin/products', params).subscribe({
      next: (res) => {
        const list = res?.products || res?.data || (Array.isArray(res) ? res : []);
        this.products.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback if token or admin scope differs
        this.api.get<any>('/products', params).subscribe({
          next: (res) => {
            const list = res?.products || res?.data || (Array.isArray(res) ? res : []);
            this.products.set(list);
            this.isLoading.set(false);
          },
          error: () => {
            this.isLoading.set(false);
          }
        });
      }
    });
  }

  addProduct(product: Omit<Product, 'id' | 'stock' | 'reserved' | 'reviews' | 'qnas' | 'slug'> & { stock: number }) {
    return new Promise((resolve, reject) => {
      this.api.post<Product>('/products', product).subscribe({
        next: (created) => {
          this.loadProducts();
          resolve(created);
        },
        error: reject
      });
    });
  }

  editProduct(id: string, updated: Partial<Product>) {
    return new Promise((resolve, reject) => {
      this.api.put<Product>(`/products/${id}`, updated).subscribe({
        next: (updated) => {
          this.loadProducts();
          resolve(updated);
        },
        error: reject
      });
    });
  }

  deleteProduct(id: string) {
    return new Promise<void>((resolve, reject) => {
      this.api.delete(`/products/${id}`).subscribe({
        next: () => {
          this.loadProducts();
          resolve();
        },
        error: reject
      });
    });
  }

  updateProductStock(productId: string, stock: number) {
    return this.editProduct(productId, { stock });
  }
}

