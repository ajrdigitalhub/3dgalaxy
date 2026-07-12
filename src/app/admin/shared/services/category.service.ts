import { Injectable, inject, signal } from '@angular/core';
import { Category } from '../../../services/datastore';
import { ApiService } from '../../../services/api.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private api = inject(ApiService);

  categories = signal<Category[]>([]);

  constructor() {
    this.loadCategories();
  }

  loadCategories() {
    this.api.get<Category[]>('/categories').subscribe({
      next: (data) => {
        if (data) {
          const list = Array.isArray(data) ? data : ((data as any)?.data && Array.isArray((data as any).data)) ? (data as any).data : [];
          this.categories.set(list);
        }
      }
    });
  }

  addCategory(cat: Omit<Category, 'id'>) {
    return new Promise((resolve, reject) => {
      this.api.post<Category>('/categories', cat).subscribe({
        next: (created) => {
          this.loadCategories();
          resolve(created);
        },
        error: reject
      });
    });
  }

  editCategory(id: string, updated: Partial<Category>) {
    return new Promise((resolve, reject) => {
      this.api.put<Category>(`/categories/${id}`, updated).subscribe({
        next: (updated) => {
          this.loadCategories();
          resolve(updated);
        },
        error: reject
      });
    });
  }

  deleteCategory(id: string) {
    return new Promise<void>((resolve, reject) => {
      this.api.delete(`/categories/${id}`).subscribe({
        next: () => {
          this.loadCategories();
          resolve();
        },
        error: reject
      });
    });
  }
}
