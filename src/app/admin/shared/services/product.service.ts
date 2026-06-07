import { Injectable, inject } from '@angular/core';
import { DatastoreService, Product } from '../../../services/datastore';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private ds = inject(DatastoreService);

  products = this.ds.products;

  addProduct(product: Omit<Product, 'id' | 'stock' | 'reserved' | 'reviews' | 'qnas' | 'slug'> & { stock: number }) {
    return this.ds.addProduct(product);
  }

  editProduct(id: string, updated: Partial<Product>) {
    return this.ds.editProduct(id, updated);
  }

  deleteProduct(id: string) {
    return this.ds.deleteProduct(id);
  }

  updateProductStock(productId: string, stock: number) {
    return this.ds.updateProductStock(productId, stock);
  }
}
