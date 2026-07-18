import { Injectable, inject, signal } from '@angular/core';
import { Product } from '../../../services/datastore'; // we can still use interfaces from here!
import { ApiService } from '../../../services/api.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private api = inject(ApiService);
  
  products = signal<Product[]>([]);

  constructor() {
    this.loadProducts();
  }

  loadProducts() {
    this.api.get<any>('/products', { limit: 1000 }).subscribe({
      next: (res) => {
        const list = res?.products || res?.data || (Array.isArray(res) ? res : []);
        this.products.set(list);
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

