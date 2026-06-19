import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BrandService } from '../../shared/services/brand.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Brand } from '../../../services/datastore';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-brand-list',
  imports: [CommonModule, MatIconModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brand-list.component.html',
  styleUrl: './brand-list.component.scss'
})
export class BrandListComponent {
  toastService = inject(ToastService);
  brandService = inject(BrandService);

  // Form fields
  editingBrand = signal<Brand | null>(null);
  brandName = signal<string>('');
  brandSlug = signal<string>('');
  brandCountry = signal<string>('Global HQ');
  brandLogo = signal<string>('https://picsum.photos/seed/logo/200/100');
  brandBanner = signal<string>('https://picsum.photos/seed/brand/800/200');
  brandDesc = signal<string>('');
  brandActive = signal<boolean>(true);

  startBrandEdit(brand: Brand) {
    this.editingBrand.set(brand);
    this.brandName.set(brand.name || '');
    this.brandSlug.set(brand.slug || '');
    this.brandLogo.set(brand.logo || 'https://picsum.photos/seed/logo/200/100');
    this.brandCountry.set(brand.country || 'Global HQ');
    this.brandBanner.set(brand.banner || 'https://picsum.photos/seed/brand/800/200');
    this.brandDesc.set(brand.description || '');
    this.brandActive.set(brand.active !== false);
  }

  cancelBrandEdit() {
    this.editingBrand.set(null);
    this.brandName.set('');
    this.brandSlug.set('');
    this.brandLogo.set('https://picsum.photos/seed/logo/200/100');
    this.brandCountry.set('Global HQ');
    this.brandBanner.set('https://picsum.photos/seed/brand/800/200');
    this.brandDesc.set('');
    this.brandActive.set(true);
  }

  async saveBrand() {
    const name = (this.brandName() || '').trim();
    if (!name) {
      this.toastService.error('Brand name is required.');
      return;
    }
    const slug = (this.brandSlug() || '').trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const brandData: any = {
      name,
      slug,
      logo: (this.brandLogo() || '').trim(),
      country: (this.brandCountry() || '').trim(),
      banner: (this.brandBanner() || '').trim(),
      description: (this.brandDesc() || '').trim(),
      active: this.brandActive()
    };

    try {
      const editing = this.editingBrand();
      if (editing) {
        await this.brandService.editBrand(editing.id, brandData);
        this.toastService.success('Brand updated successfully!');
      } else {
        await this.brandService.addBrand(brandData);
        this.toastService.success('Brand added successfully!');
      }
      this.cancelBrandEdit();
    } catch {
      this.toastService.error('Access Denied: Brand-level authentication token is missing or expired.');
    }
  }

  async deleteBrand(id: string) {
    if (!confirm('Are you sure you want to delete this Brand?')) return;
    try {
      await this.brandService.deleteBrand(id);
      this.toastService.success('Brand deleted successfully.');
    } catch {
      this.toastService.error('Operation failed.');
    }
  }
}
