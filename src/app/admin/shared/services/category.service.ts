import { Injectable, inject } from '@angular/core';
import { DatastoreService, Category } from '../../../services/datastore';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private ds = inject(DatastoreService);

  categories = this.ds.categories;

  addCategory(cat: Omit<Category, 'id'>) {
    return this.ds.addCategory(cat);
  }

  editCategory(id: string, updated: Partial<Category>) {
    return this.ds.editCategory(id, updated);
  }

  deleteCategory(id: string) {
    return this.ds.deleteCategory(id);
  }
}
