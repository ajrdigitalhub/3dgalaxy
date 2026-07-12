import { Injectable, inject, signal } from '@angular/core';
import { Brand } from '../../../services/datastore';
import { ApiService } from '../../../services/api.service';

@Injectable({
  providedIn: 'root'
})
export class BrandService {
  private api = inject(ApiService);

  brands = signal<Brand[]>([]);

  constructor() {
    this.loadBrands();
  }

  loadBrands() {
    this.api.get<Brand[]>('/brands').subscribe({
      next: (data) => {
        if (data) {
          const list = Array.isArray(data) ? data : ((data as any)?.data && Array.isArray((data as any).data)) ? (data as any).data : [];
          this.brands.set(list);
        }
      }
    });
  }

  addBrand(brand: Omit<Brand, 'id'>) {
    return new Promise((resolve, reject) => {
      this.api.post<Brand>('/brands', brand).subscribe({
        next: (created) => {
          this.loadBrands();
          resolve(created);
        },
        error: reject
      });
    });
  }

  editBrand(id: string, updated: Partial<Brand>) {
    return new Promise((resolve, reject) => {
      this.api.put<Brand>(`/brands/${id}`, updated).subscribe({
        next: (updated) => {
          this.loadBrands();
          resolve(updated);
        },
        error: reject
      });
    });
  }

  deleteBrand(id: string) {
    return new Promise<void>((resolve, reject) => {
      this.api.delete(`/brands/${id}`).subscribe({
        next: () => {
          this.loadBrands();
          resolve();
        },
        error: reject
      });
    });
  }
}
