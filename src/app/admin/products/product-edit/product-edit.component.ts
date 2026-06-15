import { Component, ChangeDetectionStrategy, inject, signal, OnInit, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProductService } from '../../shared/services/product.service';
import { CategoryService } from '../../shared/services/category.service';
import { BrandService } from '../../shared/services/brand.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Product } from '../../../services/datastore';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-product-edit',
  imports: [CommonModule, RouterModule, MatIconModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-edit.component.html',
  styleUrl: './product-edit.component.scss'
})
export class ProductEditComponent implements OnInit {
  toastService = inject(ToastService);
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

  fillForm(p: any) {
    this.pName.set(p.name || '');
    this.pSku.set(p.sku || '');
    this.pCatId.set(p.categoryId || p.category_id || p.category?.slug || '');
    this.pBrand.set(p.brandId || p.brand?.slug || p.brand || '3d-galaxy');
    this.pMrp.set(p.mrp || p.basePrice || 1499);
    this.pSale.set(p.salePrice || p.sale_price || 1199);
    this.pDealer.set(p.dealerPrice || p.dealer_price || 999);
    this.pStock.set(p.stock || 50);
    this.pStatus.set(p.isActive === false ? 'draft' : (p.status || 'active'));
    
    // Map objects to strings for textarea
    const imgs = p.images || [];
    const urls = imgs.map((img: any) => typeof img === 'string' ? img : img?.url).filter(Boolean);
    this.pImages.set(urls.join('\n'));
    
    this.pDesc.set(p.description || '');
    this.pLongDesc.set(p.long_description || '');
    this.pVariants.set(JSON.stringify(p.variants || [], null, 2));
    this.pSeoTitle.set(p.seoTitle || p.seo?.seoTitle || '');
    this.pSeoDescription.set(p.seoDescription || p.seo?.seoDescription || '');
  }

  async saveProduct() {
    const id = this.productId();
    const name = this.pName().trim();
    if (!id || !name) {
      this.toastService.error('Name is required.');
      return;
    }
    const sku = this.pSku().trim();
    if (!sku) {
      this.toastService.error('SKU is required.');
      return;
    }
    const catId = this.pCatId().trim();
    if (!catId) {
       this.toastService.error('Category is required.');
       return;
    }
    const brandStr = this.pBrand().trim();
    if (!brandStr) {
       this.toastService.error('Brand is required.');
       return;
    }

    // Parse images from line breaks
    let imagesArr: any[] = [];
    const textImgs = this.pImages().trim();
    if (textImgs) {
      imagesArr = textImgs.split('\n').map(x => x.trim()).filter(Boolean);
    } else if (this.currentProduct()?.images) {
      const origImgs = this.currentProduct()!.images;
      imagesArr = origImgs.map((img: any) => typeof img === 'string' ? img : img?.url).filter(Boolean);
    }

    if (imagesArr.length === 0) {
      this.toastService.error('Please upload at least one valid product image.');
      return;
    }

    // Parse variants JSON block
    let variantsArr = [];
    try {
      const vText = this.pVariants().trim();
      if (vText) {
        variantsArr = JSON.parse(vText);
      }
    } catch {
      this.toastService.error('Invalid Variants JSON. Correct or empty this field.');
      return;
    }

    const pData: Partial<Product> | any = {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sku,
      brandId: brandStr,
      categoryId: catId,
      mrp: this.pMrp(),
      salePrice: this.pSale(),
      dealerPrice: this.pDealer(),
      stock: this.pStock(),
      description: this.pDesc(),
      images: imagesArr.map((url, i) => ({ url, isPrimary: i === 0, sortOrder: i })),
      variants: variantsArr,
      isActive: this.pStatus() === 'active',
      seoTitle: this.pSeoTitle(),
      seoDescription: this.pSeoDescription(),
    };

    try {
      await this.productService.editProduct(id, pData);
      this.toastService.success('Product updated successfully!');
      this.back();
    } catch {
      this.toastService.error('Operation failed. Verify privileges.');
    }
  }

  back() {
    this.router.navigate(['/admin/products']);
  }
}
