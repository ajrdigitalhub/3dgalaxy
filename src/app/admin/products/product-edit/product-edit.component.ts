import { Component, ChangeDetectionStrategy, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductService } from '../../shared/services/product.service';
import { CategoryService } from '../../shared/services/category.service';
import { BrandService } from '../../shared/services/brand.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { CategoryMultiSelectComponent } from '../../../shared/components/category-multi-select/category-multi-select.component';
import { Product } from '../../../services/datastore';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { environment } from '../../../../environments/environment';
import { VariantTourGuideComponent } from '../../../shared/components/variant-tour-guide/variant-tour-guide.component';
import { VariantTourService } from '../../../core/services/variant-tour.service';

@Component({
  selector: 'app-admin-product-edit',
  imports: [CommonModule, RouterModule, FormsModule, MatIconModule, MatTooltipModule, PageHeaderComponent, CategoryMultiSelectComponent, VariantTourGuideComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-edit.component.html',
  styleUrl: './product-edit.component.scss'
})
export class ProductEditComponent implements OnInit {
  toastService = inject(ToastService);
  tourService = inject(VariantTourService);
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
  
  // Storefront Live Preview Signal
  selectedPreviewOptionValues = signal<Record<string, string>>({});

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

    // Auto-update preview selection when variants change
    effect(() => {
      const vars = this.adminVariants();
      if (vars.length > 0) {
        const currentSel = this.selectedPreviewOptionValues();
        const hasKeys = Object.keys(currentSel).length > 0;
        if (!hasKeys && vars[0].optionValues) {
          this.selectedPreviewOptionValues.set({ ...vars[0].optionValues });
        }
      }
    }, { allowSignalWrites: true });
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
    const urls = imgs.map((img: any) => typeof img === 'string' ? img : (img?.url || img?.imageUrl || '')).filter(Boolean);
    this.pImages.set(urls.join('\n'));
    
    this.pDesc.set(p.description || '');
    this.pLongDesc.set(p.long_description || p.longDescription || '');
    
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

    // 1. Robust Map Options
    let rawOptions = data.options || p.options || data.variantGroups || p.variantGroups || data.variant_groups || p.variant_groups || [];
    if (typeof rawOptions === 'string') {
      try { rawOptions = JSON.parse(rawOptions); } catch (e) { rawOptions = []; }
    }

    let mappedOptions: { name: string; valuesString: string }[] = [];
    if (Array.isArray(rawOptions) && rawOptions.length > 0) {
      mappedOptions = rawOptions.map((opt: any) => {
        let vals: string[] = [];
        if (Array.isArray(opt.values)) {
          vals = opt.values.map((v: any) => (typeof v === 'string' ? v.trim() : (v.value || v.name || ''))).filter(Boolean);
        } else if (typeof opt.values === 'string') {
          vals = opt.values.split(',').map((v: string) => v.trim()).filter(Boolean);
        }
        return {
          name: opt.name || '',
          valuesString: vals.join(', ')
        };
      }).filter(o => o.name);
    }

    // 2. Robust Map Variants
    let rawVars = data.variants || p.variants || [];
    if (typeof rawVars === 'string') {
      try { rawVars = JSON.parse(rawVars); } catch (e) { rawVars = []; }
    }

    const mappedVariants = (Array.isArray(rawVars) ? rawVars : []).map((v: any) => {
      let vImgs = '';
      if (Array.isArray(v.variantImages)) {
        vImgs = v.variantImages.map((img: any) => typeof img === 'string' ? img : (img?.url || '')).filter(Boolean).join('\n');
      } else if (Array.isArray(v.images)) {
        vImgs = v.images.map((img: any) => typeof img === 'string' ? img : (img?.url || '')).filter(Boolean).join('\n');
      } else if (typeof v.variantImages === 'string') {
        vImgs = v.variantImages;
      } else if (typeof v.images === 'string') {
        vImgs = v.images;
      }

      let parsedOptVals: Record<string, string> = {};
      if (v.optionValues) {
        if (typeof v.optionValues === 'object' && !Array.isArray(v.optionValues)) {
          parsedOptVals = { ...v.optionValues };
        } else if (typeof v.optionValues === 'string') {
          try { parsedOptVals = JSON.parse(v.optionValues); } catch (e) {}
        }
      }

      return {
        id: v.id || null,
        name: v.name || '',
        sku: v.sku || '',
        price: Number(v.price || v.mrp || p.mrp || p.basePrice || 0),
        salePrice: v.salePrice !== undefined && v.salePrice !== null ? Number(v.salePrice) : (v.sale_price !== undefined && v.sale_price !== null ? Number(v.sale_price) : null),
        stock: v.stock !== undefined && v.stock !== null ? Number(v.stock) : 0,
        variantImages: vImgs,
        optionValues: parsedOptVals,
        isActive: v.isActive !== false,
        isDefault: !!v.isDefault
      };
    });

    // 3. Fallback: Reconstruct Options from Variant OptionValues if Options were empty
    if (mappedOptions.length === 0 && mappedVariants.length > 0) {
      const optionMap: Record<string, Set<string>> = {};
      mappedVariants.forEach((v: any) => {
        if (v.optionValues && typeof v.optionValues === 'object') {
          Object.entries(v.optionValues).forEach(([optName, optVal]) => {
            if (optName && optVal) {
              if (!optionMap[optName]) optionMap[optName] = new Set();
              optionMap[optName].add(String(optVal));
            }
          });
        }
      });
      mappedOptions = Object.entries(optionMap).map(([name, set]) => ({
        name,
        valuesString: Array.from(set).join(', ')
      }));
    }

    this.adminOptions.set(mappedOptions);
    this.adminVariants.set(mappedVariants);

    if (mappedVariants.length > 0 && mappedVariants[0].optionValues) {
      this.selectedPreviewOptionValues.set({ ...mappedVariants[0].optionValues });
    }
  }

  addOption() {
    this.adminOptions.update(opts => [...opts, { name: '', valuesString: '' }]);
  }

  removeOption(index: number) {
    this.adminOptions.update(opts => opts.filter((_, i) => i !== index));
  }

  addCustomVariant() {
    const baseName = this.pName().trim() || 'New Variant';
    const baseSku = (this.pSku().trim() || 'SKU') + `-VAR-${Date.now().toString().slice(-4)}`;
    const newVar = {
      id: null,
      name: baseName,
      sku: baseSku,
      price: this.pSale() || this.pMrp() || 0,
      salePrice: this.pSale() || null,
      stock: this.pStock() || 0,
      variantImages: '',
      optionValues: {},
      isActive: true,
      isDefault: this.adminVariants().length === 0
    };
    this.adminVariants.update(vars => [...vars, newVar]);
  }

  removeVariant(index: number) {
    this.adminVariants.update(vars => vars.filter((_, i) => i !== index));
  }

  toggleVariantStatus(index: number) {
    this.adminVariants.update(vars => {
      const copy = [...vars];
      copy[index] = { ...copy[index], isActive: !copy[index].isActive };
      return copy;
    });
  }

  setDefaultVariant(index: number) {
    this.adminVariants.update(vars => {
      return vars.map((v, i) => ({
        ...v,
        isDefault: i === index
      }));
    });
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
    const existingVars = this.adminVariants();
    
    const newVariants = combinations.map(comb => {
      const optValues: Record<string, string> = {};
      options.forEach((opt, idx) => {
        optValues[opt.name] = comb[idx];
      });

      const suffix = comb.join(' / ');
      const name = `${baseName} - ${suffix}`;
      const skuSuffix = comb.map(c => c.toLowerCase().replace(/[^a-z0-9]+/g, '')).join('-');
      const sku = `${baseSku}-${skuSuffix}`.toUpperCase();

      // Check if a variant with matching optionValues or SKU already exists to preserve custom price/stock/images!
      const matchedExisting = existingVars.find(ev => {
        if (!ev.optionValues) return false;
        return Object.entries(optValues).every(([k, val]) => ev.optionValues[k] === val);
      });

      if (matchedExisting) {
        return {
          ...matchedExisting,
          name,
          optionValues: optValues
        };
      }

      return {
        id: null,
        name,
        sku,
        price: this.pSale() || this.pMrp() || 0,
        salePrice: this.pSale() || null,
        stock: this.pStock() || 0,
        variantImages: '',
        optionValues: optValues,
        isActive: true,
        isDefault: false
      };
    });

    if (newVariants.length > 0 && !newVariants.some(v => v.isDefault)) {
      newVariants[0].isDefault = true;
    }

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

  selectedPreviewVariantId = signal<string>('');

  selectPreviewOption(optName: string, value: string) {
    this.selectedPreviewVariantId.set('');
    this.selectedPreviewOptionValues.update((current) => ({
      ...current,
      [optName]: value,
    }));
  }

  selectPreviewVariantById(idOrSku: string) {
    this.selectedPreviewVariantId.set(idOrSku);
    const variants = this.adminVariants();
    const matched = variants.find((v: any) => (v.id && String(v.id) === String(idOrSku)) || (v.sku && String(v.sku) === String(idOrSku)));
    if (matched && matched.optionValues) {
      this.selectedPreviewOptionValues.set({ ...matched.optionValues });
    }
  }

  getMatchedPreviewVariant(): any {
    const variants = this.adminVariants();
    if (!variants || variants.length === 0) return null;

    const selId = this.selectedPreviewVariantId();
    if (selId) {
      const explicit = variants.find((v: any) => String(v.id) === String(selId) || String(v.sku) === String(selId));
      if (explicit) return explicit;
    }

    const selected = this.selectedPreviewOptionValues();
    const activeKeys = Object.keys(selected);

    if (activeKeys.length > 0) {
      const match = variants.find((v: any) => {
        const optVals = v.optionValues || {};
        const optKeys = Object.keys(optVals);
        return activeKeys.every((k) => {
          const targetVal = String(selected[k]).trim().toLowerCase();
          if (!targetVal) return true;
          if (optVals[k] !== undefined) {
            return String(optVals[k]).trim().toLowerCase() === targetVal;
          }
          return optKeys.some(ok => String(optVals[ok]).trim().toLowerCase() === targetVal);
        });
      });
      if (match) return match;
    }

    return variants.find((v: any) => v.isDefault) || variants[0];
  }

  getFirstVariantImageUrl(variant: any): string {
    if (variant) {
      const imgs = variant.variantImages || variant.images || [];
      if (Array.isArray(imgs) && imgs.length > 0) {
        const first = imgs[0];
        const url = typeof first === 'string' ? first : (first?.url || '');
        if (url && url.trim().length > 0) return url;
      }
    }
    const rawImgs = this.pImages();
    if (rawImgs) {
      const lines = typeof rawImgs === 'string' ? rawImgs.split('\n').map(s => s.trim()).filter(Boolean) : [];
      if (lines.length > 0) return lines[0];
    }
    return '';
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
      imagesArr = origImgs.map((img: any) => typeof img === 'string' ? img : (img?.url || '')).filter(Boolean);
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
      id: v.id || undefined,
      name: v.name,
      sku: v.sku,
      price: parseFloat(v.price) || 0,
      salePrice: v.salePrice !== undefined && v.salePrice !== null && String(v.salePrice).trim() !== '' ? parseFloat(v.salePrice) : null,
      stock: parseInt(v.stock, 10) || 0,
      variantImages: v.variantImages ? (typeof v.variantImages === 'string' ? v.variantImages.split('\n').map((url: string) => url.trim()).filter(Boolean) : v.variantImages) : [],
      optionValues: v.optionValues,
      isActive: v.isActive !== false,
      isDefault: !!v.isDefault
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
