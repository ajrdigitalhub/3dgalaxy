import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ProductService } from '../../shared/services/product.service';
import { CategoryService } from '../../shared/services/category.service';
import { BrandService } from '../../shared/services/brand.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Product } from '../../../services/datastore';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-product-edit',
  imports: [CommonModule, RouterModule, FormsModule, MatIconModule, PageHeaderComponent],
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
  pSeoTitle = signal<string>('');
  pSeoDescription = signal<string>('');
  
  pSpecifications = signal<any[]>([]);
  pDownloads = signal<any[]>([]);
  pFeatures = signal<any[]>([]);
  pFaqs = signal<any[]>([]);
  pWarranty = signal<any>(null);
  pShipping = signal<any>(null);
  pRelatedProducts = signal<any[]>([]);

  // Variant & Option Signals
  adminOptions = signal<{ name: string; valuesString: string }[]>([]);
  adminVariants = signal<any[]>([]);

  isLoading = signal<boolean>(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.productId.set(id);

    if (id) {
      this.isLoading.set(true);
      fetch(`${environment.apiUrl}/admin/products/${id}/details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })
      .then(r => r.json())
      .then(found => {
        this.isLoading.set(false);
        if (found && !found.error) {
          this.currentProduct.set(found);
          this.fillForm(found);
        } else {
          this.toastService.error('Failed to load product details');
        }
      })
      .catch(e => {
        this.isLoading.set(false);
        this.toastService.error('Error fetching product details');
      });
    }
  }

  fillForm(data: any) {
    const p = data.product || data;
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
    const imgs = data.images || p.images || [];
    const urls = imgs.map((img: any) => typeof img === 'string' ? img : img?.url).filter(Boolean);
    this.pImages.set(urls.join('\n'));
    
    this.pDesc.set(p.description || '');
    this.pLongDesc.set(p.long_description || '');
    
    const seoData = data.seo || p.seo || {};
    this.pSeoTitle.set(p.seoTitle || seoData.title || seoData.seoTitle || '');
    this.pSeoDescription.set(p.seoDescription || seoData.description || seoData.seoDescription || '');

    this.pSpecifications.set(data.specifications || p.specifications || []);
    this.pDownloads.set(data.downloads || p.downloads || []);
    this.pFeatures.set(data.features || p.features || []);
    this.pFaqs.set(data.faqs || p.faqs || []);
    this.pWarranty.set(data.warranty || p.warranty || null);
    this.pShipping.set(data.shipping || p.shipping || null);
    this.pRelatedProducts.set(data.relatedProducts || p.relatedProducts || []);

    // Map dynamic options
    const opts = data.options || p.options || [];
    const mappedOptions = opts.map((opt: any) => ({
      name: opt.name || '',
      valuesString: Array.isArray(opt.values) ? opt.values.join(', ') : ''
    }));
    this.adminOptions.set(mappedOptions);

    // Map dynamic variants
    const vars = data.variants || p.variants || [];
    const mappedVariants = vars.map((v: any) => ({
      name: v.name || '',
      sku: v.sku || '',
      price: v.price || 0,
      salePrice: v.salePrice || null,
      stock: v.stock || 0,
      variantImages: Array.isArray(v.variantImages) ? v.variantImages.join('\n') : (Array.isArray(v.images) ? v.images.join('\n') : ''),
      optionValues: v.optionValues || {}
    }));
    this.adminVariants.set(mappedVariants);
  }

  addOption() {
    this.adminOptions.update(opts => [...opts, { name: '', valuesString: '' }]);
  }

  removeOption(index: number) {
    this.adminOptions.update(opts => opts.filter((_, i) => i !== index));
  }

  generateVariants() {
    const baseName = this.pName().trim();
    const baseSku = this.pSku().trim();
    if (!baseName || !baseSku) {
      this.toastService.error('Please enter Product Name and SKU first.');
      return;
    }

    const options = this.adminOptions().map(opt => ({
      name: opt.name.trim(),
      values: opt.valuesString.split(',').map(v => v.trim()).filter(Boolean)
    })).filter(o => o.name && o.values.length > 0);

    if (options.length === 0) {
      this.toastService.error('Please add at least one Option with values.');
      return;
    }

    // Generate Cartesian product combinations
    const cartesian = (arrays: any[]): any[][] => {
      return arrays.reduce((acc, curr) => {
        return acc.flatMap((d: any) => curr.map((e: any) => [...d, e]));
      }, [[]]);
    };

    const combinations = cartesian(options.map(o => o.values));
    
    const newVariants = combinations.map(comb => {
      const optValues: Record<string, string> = {};
      options.forEach((opt, idx) => {
        optValues[opt.name] = comb[idx];
      });

      const suffix = comb.join(' / ');
      const name = `${baseName} - ${suffix}`;
      const skuSuffix = comb.map(c => c.toLowerCase().replace(/[^a-z0-9]+/g, '')).join('-');
      const sku = `${baseSku}-${skuSuffix}`.toUpperCase();

      return {
        name,
        sku,
        price: this.pSale() || this.pMrp() || 0,
        salePrice: this.pSale() || null,
        stock: this.pStock() || 0,
        variantImages: '',
        optionValues: optValues
      };
    });

    this.adminVariants.set(newVariants);
    this.toastService.success(`Generated ${newVariants.length} variant combinations!`);
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

    // Parse dynamic options
    const optionsArr = this.adminOptions().map(opt => ({
      name: opt.name.trim(),
      values: opt.valuesString.split(',').map(v => v.trim()).filter(Boolean)
    })).filter(o => o.name && o.values.length > 0);

    // Map dynamic variants
    const variantsArr = this.adminVariants().map(v => ({
      name: v.name,
      sku: v.sku,
      price: parseFloat(v.price) || 0,
      salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
      stock: parseInt(v.stock, 10) || 0,
      variantImages: v.variantImages ? v.variantImages.split('\n').map((url: string) => url.trim()).filter(Boolean) : [],
      optionValues: v.optionValues
    }));

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
      options: optionsArr,
      isActive: this.pStatus() === 'active',
      seoTitle: this.pSeoTitle(),
      seoDescription: this.pSeoDescription(),
      specifications: this.pSpecifications(),
      downloads: this.pDownloads(),
      features: this.pFeatures(),
      faqs: this.pFaqs(),
      warranty: this.pWarranty(),
      shipping: this.pShipping(),
      relatedProducts: this.pRelatedProducts(),
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
