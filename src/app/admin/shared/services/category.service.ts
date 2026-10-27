import { Injectable, inject, signal } from '@angular/core';
import { Category, DatastoreService } from '../../../services/datastore';
import { ApiService } from '../../../services/api.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private api = inject(ApiService);
  private ds = inject(DatastoreService);

  categories = signal<Category[]>([]);

  loadCategories(force = false) {
    if (!force && this.categories().length > 0) {
      return;
    }
    this.api.get<Category[]>('/categories', null, force).subscribe({
      next: (data) => {
        if (data) {
          const list = Array.isArray(data) ? data : ((data as any)?.data && Array.isArray((data as any).data)) ? (data as any).data : [];
          this.categories.set(list);
          this.ds.categories.set(list);
        }
      }
    });
  }

  addCategory(cat: Omit<Category, 'id'>) {
    return new Promise((resolve, reject) => {
      this.api.post<Category>('/categories', cat).subscribe({
        next: (created: any) => {
          const item = created?.data || created;
          if (item && item.id) {
            this.categories.update(cats => [item, ...cats]);
            this.ds.categories.update(cats => [item, ...cats]);
          }
          this.api.clearCache('categor');
          this.api.clearCache('homepage');
          this.api.clearCache('home');
          this.loadCategories(true);
          this.ds.loadConsolidatedHome(true);
          this.ds.reloadCategories(true);
          resolve(created);
        },
        error: reject
      });
    });
  }

  editCategory(id: string, updated: Partial<Category>) {
    return new Promise((resolve, reject) => {
      this.api.put<Category>(`/categories/${id}`, updated).subscribe({
        next: (updatedRes: any) => {
          const item = updatedRes?.data || updatedRes;
          if (item) {
            this.categories.update(cats => cats.map(c => c.id === id ? { ...c, ...item } : c));
            this.ds.categories.update(cats => cats.map(c => c.id === id ? { ...c, ...item } : c));
          }
          this.api.clearCache('categor');
          this.api.clearCache('homepage');
          this.api.clearCache('home');
          this.loadCategories(true);
          this.ds.loadConsolidatedHome(true);
          this.ds.reloadCategories(true);
          resolve(updatedRes);
        },
        error: reject
      });
    });
  }

  deleteCategory(id: string) {
    this.categories.update(cats => cats.filter(c => c.id !== id));
    this.ds.categories.update(cats => cats.filter(c => c.id !== id));
    return new Promise<void>((resolve, reject) => {
      this.api.delete(`/categories/${id}`).subscribe({
        next: () => {
          this.api.clearCache('categor');
          this.api.clearCache('homepage');
          this.api.clearCache('home');
          this.loadCategories(true);
          this.ds.loadConsolidatedHome(true);
          this.ds.reloadCategories(true);
          resolve();
        },
        error: reject
      });
    });
  }
}
