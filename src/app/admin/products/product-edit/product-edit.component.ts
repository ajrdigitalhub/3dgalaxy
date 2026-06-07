import { Component, ChangeDetectionStrategy, inject, signal, OnInit, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProductService } from '../../shared/services/product.service';
import { CategoryService } from '../../shared/services/category.service';
import { BrandService } from '../../shared/services/brand.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Product } from '../../../services/datastore';

@Component({
  selector: 'app-admin-product-edit',
  imports: [CommonModule, RouterModule, MatIconModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-edit.component.html',
  styleUrl: './product-edit.component.scss'
})
export class ProductEditComponent implements OnInit {
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  brandService = inject(BrandService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  productId = signal<string | null>(null);
  currentProduct = signal<Product | null>(null);

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

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.productId.set(id);

    if (id) {
      // Find product
      const found = this.productService.products().find(p => p.id === id);
      if (found) {
        this.currentProduct.set(found);
        this.fillForm(found);
      }
    }
  }

  constructor() {
    // Re-evaluate form values if list initializes late
    effect(() => {
      const id = this.productId();
      const products = this.productService.products();
      if (id && products.length > 0 && !this.currentProduct()) {
        const found = products.find(p => p.id === id);
        if (found) {
          this.currentProduct.set(found);
          this.fillForm(found);
        }
      }
    }, { allowSignalWrites: true });
  }

  fillForm(p: Product) {
    this.pName.set(p.name || '');
    this.pSku.set(p.sku || '');
    this.pCatId.set(p.category_id || '');
    this.pBrand.set(p.brand || '3D Galaxy');
    this.pMrp.set(p.mrp || 1499);
    this.pSale.set(p.sale_price || 1199);
    this.pDealer.set(p.dealer_price || 999);
    this.pStock.set(p.stock || 50);
    this.pStatus.set(p.status || 'active');
    this.pImages.set((p.images || []).join('\n'));
    this.pDesc.set(p.description || '');
    this.pLongDesc.set(p.long_description || '');
    this.pVariants.set(JSON.stringify(p.variants || [], null, 2));
    this.pSeoTitle.set(p.seoTitle || '');
    this.pSeoDescription.set(p.seoDescription || '');
  }

  async saveProduct() {
    const id = this.productId();
    const name = this.pName().trim();
    if (!id || !name) {
      alert('Name is required.');
      return;
    }

    // Parse images from line breaks
    let imagesArr = ['https://picsum.photos/seed/' + Date.now() + '/800/800'];
    const textImgs = this.pImages().trim();
    if (textImgs) {
      imagesArr = textImgs.split('\n').map(x => x.trim()).filter(Boolean);
    } else if (this.currentProduct()?.images) {
      imagesArr = this.currentProduct()!.images;
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

    const pData: Partial<Product> = {
      name,
      brand: this.pBrand() || '3D Galaxy',
      category_id: this.pCatId() || 'materials',
      sku: this.pSku() || 'GLX-SKU-' + Math.floor(1000 + Math.random() * 9000),
      mrp: this.pMrp(),
      sale_price: this.pSale(),
      dealer_price: this.pDealer(),
      stock: this.pStock(),
      description: this.pDesc(),
      long_description: this.pLongDesc(),
      images: imagesArr,
      variants: variantsArr,
      status: this.pStatus() as 'active' | 'draft' | 'out_of_stock',
      seoTitle: this.pSeoTitle(),
      seoDescription: this.pSeoDescription(),
      featured: this.currentProduct()?.featured || false,
      is360Supported: this.currentProduct()?.is360Supported || false,
      tags: [this.pBrand() || '3D Galaxy']
    };

    try {
      await this.productService.editProduct(id, pData);
      alert('Product updated successfully!');
      this.back();
    } catch {
      alert('Operation failed. Verify privileges.');
    }
  }

  back() {
    this.router.navigate(['/admin/products']);
  }
}
