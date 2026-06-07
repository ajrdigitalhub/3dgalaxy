import { Injectable, inject } from '@angular/core';
import { DatastoreService, Brand } from '../../../services/datastore';

@Injectable({
  providedIn: 'root'
})
export class BrandService {
  private ds = inject(DatastoreService);

  brands = this.ds.brands;

  addBrand(brand: Omit<Brand, 'id'>) {
    return this.ds.addBrand(brand);
  }

  editBrand(id: string, updated: Partial<Brand>) {
    return this.ds.editBrand(id, updated);
  }

  deleteBrand(id: string) {
    return this.ds.deleteBrand(id);
  }
}
