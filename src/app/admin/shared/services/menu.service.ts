import { Injectable, inject } from '@angular/core';
import { DatastoreService, MenuItem } from '../../../services/datastore';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private ds = inject(DatastoreService);

  menuItems = this.ds.menuItems;

  addMenuItem(item: Omit<MenuItem, 'id'>) {
    return this.ds.addMenuItem(item);
  }

  editMenuItem(id: string, updated: Partial<MenuItem>) {
    return this.ds.editMenuItem(id, updated);
  }

  deleteMenuItem(id: string) {
    return this.ds.deleteMenuItem(id);
  }
}
