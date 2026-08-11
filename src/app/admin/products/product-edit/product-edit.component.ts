import { Component, ChangeDetectionStrategy, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ProductService } from '../../shared/services/product.service';
import { CategoryService } from '../../shared/services/category.service';
import { BrandService } from '../../shared/services/brand.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { CategoryMultiSelectComponent } from '../../../shared/components/category-multi-select/category-multi-select.component';
import { Product } from '../../../services/datastore';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-product-edit',
  imports: [CommonModule, RouterModule, FormsModule, MatIconModule, PageHeaderComponent, CategoryMultiSelectComponent],
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
  rawProductData = signal<any>(null);

  // Form signals
  pName = signal<string>('');
  pSku = signal<string>('');
  pCatId = signal<string>('');
  pCategoryIds = signal<string[]>([]);
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

  constructor() {
    // Automatically re-resolve categories when CategoryService finishes loading categories list
    effect(() => {
      const data = this.rawProductData();
      const cats = this.categoryService.categories();
      if (data && cats && cats.length > 0) {
        this.extractAndSetCategories(data);
      }
    });
  }

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

  extractAndSetCategories(data: any) {
    if (!data) return;
    const p = data.product || data;
    const allCats = this.categoryService.categories();

    const rawHints: any[] = [];
    const pushHint = (val: any) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(v => pushHint(v));
      } else {
        rawHints.push(val);
      }
    };

    pushHint(p.categoryPath || data.categoryPath);
    pushHint(p.category_path || data.category_path);
    pushHint(p.categoryIds || data.categoryIds);
    pushHint(p.category_ids || data.category_ids);
    pushHint(p.categories || data.categories);
    pushHint(p.category || data.category);
    pushHint(p.categoryId || data.categoryId);
    pushHint(p.category_id || data.category_id);
    pushHint(p.categorySlug || data.categorySlug);
    pushHint(p.category_slug || data.category_slug);

    const resolvedIds = new Set<string>();

    rawHints.forEach(hint => {
      if (!hint) return;
      const hintStr = typeof hint === 'string' ? hint.trim() : (hint.id || hint._id || hint.name || hint.slug || '');
      if (!hintStr) return;

      const lower = hintStr.toLowerCase();
      const slugified = lower.replace(/[^a-z0-9]+/g, '-');

      let matched = allCats.find(c => 
        c.id === hintStr ||
        (c.id && c.id.toLowerCase() === lower) ||
        (c.name && c.name.toLowerCase() === lower) ||
        (c.slug && c.slug.toLowerCase() === lower) ||
        (c.slug && c.slug.toLowerCase() === slugified) ||
        (c.name && c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slugified)
      );

      if (matched) {
        resolvedIds.add(matched.id);
      } else {
        resolvedIds.add(hintStr);
      }
    });

    const finalIds = Array.from(resolvedIds);
    if (finalIds.length > 0) {
      this.pCategoryIds.set(finalIds);
    }

    const primaryHint = p.categoryId || p.category_id || p.category?.id || p.category?.slug || (finalIds.length > 0 ? finalIds[0] : '');
    const primaryStr = typeof primaryHint === 'string' ? primaryHint.trim() : (primaryHint?.id || primaryHint?.slug || primaryHint?.name || '');
    const primaryLower = primaryStr.toLowerCase();
    const primaryMatched = allCats.find(c => 
      c.id === primaryStr ||
      (c.id && c.id.toLowerCase() === primaryLower) ||
      (c.name && c.name.toLowerCase() === primaryLower) ||
      (c.slug && c.slug.toLowerCase() === primaryLower)
    );

    const finalPrimaryId = primaryMatched ? primaryMatched.id : (finalIds.length > 0 ? finalIds[0] : '');
    this.pCatId.set(finalPrimaryId);
  }

  fillForm(data: any) {
    const p = data.product || data;
    this.rawProductData.set(data);
    this.pName.set(p.name || '');
    this.pSku.set(p.sku || '');
    
    this.extractAndSetCategories(data);
    this.pBrand.set(p.brandId || p.brand_id || p.brand?.id || '');
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
    const mappedOptions = opts.map((opt: any) => {
      let valsString = '';
      if (Array.isArray(opt.values)) {
        valsString = opt.values.map((v: any) => (typeof v === 'string' ? v : (v.value || v.name || ''))).filter(Boolean).join(', ');
      } else if (typeof opt.values === 'string') {
        valsString = opt.values;
      }
      return {
        name: opt.name || '',
        valuesString: valsString
      };
    });
    this.adminOptions.set(mappedOptions);

    // Map dynamic variants
    const vars = data.variants || p.variants || [];
    const mappedVariants = vars.map((v: any) => {
      let vImgs = '';
      if (Array.isArray(v.variantImages)) {
        vImgs = v.variantImages.map((img: any) => typeof img === 'string' ? img : img?.url).filter(Boolean).join('\n');
      } else if (Array.isArray(v.images)) {
        vImgs = v.images.map((img: any) => typeof img === 'string' ? img : img?.url).filter(Boolean).join('\n');
      } else if (typeof v.variantImages === 'string') {
        vImgs = v.variantImages;
      } else if (typeof v.images === 'string') {
        vImgs = v.images;
      }
      return {
        name: v.name || '',
        sku: v.sku || '',
        price: v.price || v.salePrice || 0,
        salePrice: v.salePrice || null,
        stock: v.stock || 0,
        variantImages: vImgs,
        optionValues: v.optionValues || {}
      };
    });
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

  onCategorySelectionChange(event: { categoryIds: string[]; primaryCategoryId: string | null }) {
    this.pCategoryIds.set(event.categoryIds);
    if (event.primaryCategoryId) {
      this.pCatId.set(event.primaryCategoryId);
    } else if (event.categoryIds.length > 0) {
      this.pCatId.set(event.categoryIds[0]);
    } else {
      this.pCatId.set('');
    }
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
    const catId = this.pCatId().trim() || (this.pCategoryIds().length > 0 ? this.pCategoryIds()[0] : '');
    if (!catId && this.pCategoryIds().length === 0) {
       this.toastService.error('At least one Category is required.');
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

    const primaryId = this.pCatId() || (this.pCategoryIds().length > 0 ? this.pCategoryIds()[0] : '');
    const selectedList = this.pCategoryIds().length > 0 ? this.pCategoryIds() : (primaryId ? [primaryId] : []);
    const categoryIdsArr = selectedList.map((cId, idx) => ({
      id: cId,
      isPrimary: cId === primaryId || (idx === 0 && !primaryId)
    }));

    const pData: Partial<Product> | any = {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sku,
      brandId: brandStr,
      categoryId: primaryId,
      categoryIds: categoryIdsArr,
      categories: categoryIdsArr,
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
