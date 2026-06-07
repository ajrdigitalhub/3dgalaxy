import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProductService } from '../../shared/services/product.service';
import { CategoryService } from '../../shared/services/category.service';
import { BrandService } from '../../shared/services/brand.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-product-create',
  imports: [CommonModule, RouterModule, MatIconModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-create.component.html',
  styleUrl: './product-create.component.scss'
})
export class ProductCreateComponent {
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  brandService = inject(BrandService);
  private router = inject(Router);

  // Form signals
  pName = signal<string>('');
  pSku = signal<string>('');
  pCatId = signal<string>('');
  pBrand = signal<string>('3D Galaxy');
  pMrp = signal<number>(1499);
  pSale = signal<number>(1199);
  pDealer = signal<number>(999);
  pStock = signal<number>(50);
  pStatus = signal<string>('active');
  pImages = signal<string>('');
  pDesc = signal<string>('');
  pLongDesc = signal<string>('');
  pVariants = signal<string>('[]');
  pSeoTitle = signal<string>('');
  pSeoDescription = signal<string>('');

  async saveProduct() {
    const name = this.pName().trim();
    if (!name) {
      alert('Name is required.');
      return;
    }

    // Parse images from line breaks
    let imagesArr = ['https://picsum.photos/seed/' + Date.now() + '/800/800'];
    const textImgs = this.pImages().trim();
    if (textImgs) {
      imagesArr = textImgs.split('\n').map(x => x.trim()).filter(Boolean);
    }

    // Parse variants JSON block
    let variantsArr = [];
    try {
      const vText = this.pVariants().trim();
      if (vText) {
        variantsArr = JSON.parse(vText);
      }
    } catch {
      alert('Invalid Variants JSON. Correct or empty this field.');
      return;
    }

    const pData: any = {
      name,
      brand: this.pBrand() || '3D Galaxy',
      category_id: this.pCatId() || 'materials',
      sku: this.pSku() || 'GLX-SKU-' + Math.floor(1000 + Math.random() * 9000),
      barcode: Date.now().toString(),
      mrp: this.pMrp(),
      sale_price: this.pSale(),
      dealer_price: this.pDealer(),
      stock: this.pStock(),
      description: this.pDesc(),
      long_description: this.pLongDesc(),
      images: imagesArr,
      variants: variantsArr,
      status: this.pStatus(),
      seoTitle: this.pSeoTitle(),
      seoDescription: this.pSeoDescription(),
      featured: false,
      is360Supported: false,
      tags: [this.pBrand() || '3D Galaxy'],
      specs: [],
      reviews: [],
      qnas: []
    };

    try {
      await this.productService.addProduct(pData);
      alert('Product created successfully!');
      this.back();
    } catch {
      alert('Operation failed. Verify privileges.');
    }
  }

  back() {
    this.router.navigate(['/admin/products']);
  }
}
