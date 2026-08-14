import { Injectable, signal, computed } from '@angular/core';
import {
  VariantGroupConfig,
  BundleTier,
  BundleSlotSelection,
  BundlePricingSummary,
  BundleSelectionResult,
  CartBundleDetails
} from '../core/models/variant-engine.model';

@Injectable({
  providedIn: 'root'
})
export class VariantSelectionEngineService {
  // State Signals
  readonly product = signal<any | null>(null);
  readonly availableVariants = signal<any[]>([]);
  readonly variantGroups = signal<VariantGroupConfig[]>([]);
  
  // Selected state per single/multiple option group (e.g. { "Color": "Grey", "Size": "0.4mm" })
  readonly selectedOptions = signal<Record<string, string>>({});
  
  // Active Bundle Group configuration (if any group is displayType === 'bundle-builder' or selectionMode === 'bundle')
  readonly activeBundleGroup = computed(() => {
    const groups = this.variantGroups();
    return groups.find(g => g.active && (g.displayType === 'bundle-builder' || g.selectionMode === 'bundle')) || null;
  });

  // Selected Bundle Tier (e.g. Buy 1, Buy 3, Buy 5, Buy 10)
  readonly selectedBundleTier = signal<BundleTier | null>(null);

  // Bundle Slots state signal
  readonly bundleSlots = signal<BundleSlotSelection[]>([]);

  /**
   * Initialize the engine with a product, its variants, and optional configured groups.
   */
  initializeProduct(product: any, variants: any[], configuredGroups?: VariantGroupConfig[]) {
    this.product.set(product);
    this.availableVariants.set(variants || []);

    const groups = configuredGroups && configuredGroups.length > 0 
      ? configuredGroups 
      : this.deriveDefaultVariantGroups(product, variants);

    this.variantGroups.set(groups);

    // Initialize single selectedOptions default
    const initialOpts: Record<string, string> = {};
    if (variants && variants.length > 0) {
      const defaultVar = variants.find(v => v.isDefault || v.is_default) || variants[0];
      if (defaultVar && defaultVar.optionValues) {
        Object.entries(defaultVar.optionValues).forEach(([k, v]) => {
          initialOpts[k] = String(v);
        });
      }
    }
    this.selectedOptions.set(initialOpts);

    // Initialize Bundle Tier if a bundle group exists
    const bundleGrp = groups.find(g => g.active && (g.displayType === 'bundle-builder' || g.selectionMode === 'bundle'));
    if (bundleGrp && bundleGrp.bundleTiers && bundleGrp.bundleTiers.length > 0) {
      const defaultTier = bundleGrp.bundleTiers.find(t => t.isPopular) || bundleGrp.bundleTiers[0];
      this.selectBundleTier(defaultTier, bundleGrp);
    } else {
      this.selectedBundleTier.set(null);
      this.bundleSlots.set([]);
    }
  }

  /**
   * Derive default variant groups if product doesn't have custom configuration saved
   */
  private deriveDefaultVariantGroups(product: any, variants: any[]): VariantGroupConfig[] {
    const rawOptions = product?.options || [];
    const derived: VariantGroupConfig[] = [];

    // Check if product has explicit bundle_products or bundle configuration in options
    if (Array.isArray(rawOptions) && rawOptions.length > 0) {
      rawOptions.forEach((opt: any, index: number) => {
        const isBundle = opt.displayType === 'bundle-builder' || opt.selectionMode === 'bundle' || (opt.bundleTiers && opt.bundleTiers.length > 0);
        derived.push({
          id: opt.id || `grp-${index}`,
          variantName: opt.name || opt.variantName || 'Option Group',
          displayName: opt.displayName || opt.name || 'Select Option',
          displayOrder: opt.displayOrder ?? index,
          required: opt.required ?? true,
          default: opt.default ?? null,
          active: opt.active ?? true,
          displayType: (opt.displayType as any) || (isBundle ? 'bundle-builder' : 'chip'),
          selectionMode: (opt.selectionMode as any) || (isBundle ? 'bundle' : 'single'),
          minSelection: opt.minSelection ?? 1,
          maxSelection: opt.maxSelection ?? 1,
          allowDuplicates: opt.allowDuplicates ?? true,
          bundleTiers: opt.bundleTiers || (isBundle ? this.getDefaultBundleTiers(product) : undefined),
          slotLabels: opt.slotLabels || undefined
        });
      });
      return derived;
    }

    // Default fallback: single Color group or standard variant selector
    const optionKeys = new Set<string>();
    (variants || []).forEach(v => {
      if (v.optionValues && typeof v.optionValues === 'object') {
        Object.keys(v.optionValues).forEach(k => optionKeys.add(k));
      }
    });

    if (optionKeys.size > 0) {
      Array.from(optionKeys).forEach((key, idx) => {
        derived.push({
          id: `grp-derived-${idx}`,
          variantName: key,
          displayName: key.charAt(0).toUpperCase() + key.slice(1),
          displayOrder: idx,
          required: true,
          active: true,
          displayType: key.toLowerCase().includes('color') ? 'color-chips' : 'chip',
          selectionMode: 'single',
          allowDuplicates: true
        });
      });
    }

    return derived;
  }

  /**
   * Generate default bundle tiers (Buy 1, Buy 3, Buy 5, Buy 10) for filament / bundle products
   */
  getDefaultBundleTiers(product: any): BundleTier[] {
    const basePrice = Number(product?.salePrice || product?.sale_price || product?.basePrice || product?.mrp || 756);
    return [
      {
        id: 'tier-1',
        name: 'Buy 1',
        count: 1,
        priceType: 'fixed',
        priceValue: basePrice,
        customPricePerItem: basePrice,
        savingsText: ''
      },
      {
        id: 'tier-3',
        name: 'Buy 3',
        count: 3,
        priceType: 'per_variant',
        priceValue: Math.round(basePrice * 0.95), // ~5% discount
        customPricePerItem: Math.round(basePrice * 0.95),
        savingsText: `Rs. ${Math.round(basePrice * 0.95)}.00 / each`,
        isPopular: true
      },
      {
        id: 'tier-5',
        name: 'Buy 5',
        count: 5,
        priceType: 'per_variant',
        priceValue: Math.round(basePrice * 0.916), // ~8.4% discount
        customPricePerItem: Math.round(basePrice * 0.916),
        badgeText: 'Popular',
        savingsText: `Rs. ${Math.round(basePrice * 0.916)}.00 / each`
      },
      {
        id: 'tier-10',
        name: 'Buy 10',
        count: 10,
        priceType: 'per_variant',
        priceValue: Math.round(basePrice * 0.857), // ~14.3% discount
        badgeText: 'Best Value',
        customPricePerItem: Math.round(basePrice * 0.857),
        savingsText: `Rs. ${Math.round(basePrice * 0.857)}.00 / each`
      }
    ];
  }

  /**
   * Select a Bundle Tier (Buy 1, Buy 3, Buy 5, etc.) and auto-populate slots
   */
  selectBundleTier(tier: BundleTier, groupConfig?: VariantGroupConfig) {
    this.selectedBundleTier.set(tier);
    const count = tier.count || 1;
    let variants = this.availableVariants();
    const product = this.product();

    // If no variants in availableVariants, synthesize from product.options
    if (!variants || variants.length === 0) {
      const rawOpts = product?.options || [];
      if (rawOpts.length > 0) {
        const first = rawOpts[0];
        let vals: string[] = [];
        if (Array.isArray(first.values)) {
          vals = first.values.map((v: any) => typeof v === 'string' ? v : (v.name || v.value || ''));
        } else if (typeof first.values === 'string') {
          vals = first.values.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (typeof first.valuesString === 'string') {
          vals = first.valuesString.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        if (vals.length > 0) {
          variants = vals.map(val => ({
            id: `opt-${val}`,
            name: val,
            sku: `SKU-${val.toUpperCase()}`,
            stock: 999,
            price: Number(product?.salePrice || product?.basePrice || 0)
          }));
        }
      }
    }

    if (!variants || variants.length === 0) {
      variants = [{
        id: 'default-variant',
        name: product?.name || 'Default Option',
        stock: 999,
        price: Number(product?.salePrice || product?.basePrice || 0)
      }];
    }

    const config = groupConfig || this.activeBundleGroup();
    const allowDuplicates = config?.allowDuplicates ?? true;
    const slotLabels = config?.slotLabels || [];

    const existingSlots = this.bundleSlots();
    const newSlots: BundleSlotSelection[] = [];

    const inStockVariants = variants.filter(v => (v.stock ?? v.quantity ?? 1) > 0);
    const fallbackVariant = inStockVariants[0] || variants[0];

    for (let i = 0; i < count; i++) {
      let variantToAssign: any = null;

      if (existingSlots[i] && existingSlots[i].selectedVariant) {
        variantToAssign = existingSlots[i].selectedVariant;
      } else {
        if (allowDuplicates) {
          variantToAssign = variants[i % variants.length] || fallbackVariant;
        } else {
          const usedIds = new Set(newSlots.map(s => s.selectedVariantId).filter(Boolean));
          const availableUnused = variants.find(v => !usedIds.has(v.id) && (v.stock ?? 1) > 0);
          variantToAssign = availableUnused || fallbackVariant;
        }
      }

      const label = slotLabels[i] || `Slot #${i + 1}`;

      newSlots.push({
        slotIndex: i,
        slotLabel: label,
        selectedVariantId: variantToAssign ? (variantToAssign.id || variantToAssign.name) : 'default',
        selectedVariant: variantToAssign,
        error: null
      });
    }

    this.bundleSlots.set(newSlots);
    this.validateSlots();
  }

  /**
   * Update selection in a specific bundle slot
   */
  updateSlotSelection(slotIndex: number, val: any) {
    let variants = this.availableVariants();
    const product = this.product();

    // If variants list is empty, synthesize
    if (!variants || variants.length === 0) {
      const rawOpts = product?.options || [];
      if (rawOpts.length > 0) {
        const first = rawOpts[0];
        let vals: string[] = [];
        if (Array.isArray(first.values)) vals = first.values.map((v: any) => typeof v === 'string' ? v : (v.name || v.value || ''));
        else if (typeof first.values === 'string') vals = first.values.split(',').map((s: string) => s.trim()).filter(Boolean);
        else if (typeof first.valuesString === 'string') vals = first.valuesString.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (vals.length > 0) {
          variants = vals.map(vName => ({ id: `opt-${vName}`, name: vName, stock: 999, price: Number(product?.salePrice || product?.basePrice || 0) }));
        }
      }
    }

    let selectedVar = (variants || []).find(v => v.id === val || v.name === val || v.sku === val || v.displayName === val);
    if (!selectedVar && typeof val === 'string' && val.trim()) {
      selectedVar = {
        id: `opt-${val}`,
        name: val,
        sku: `SKU-${val.toUpperCase()}`,
        stock: 999,
        price: Number(product?.salePrice || product?.basePrice || 0)
      };
    }

    const slots = [...this.bundleSlots()];
    if (slots[slotIndex]) {
      slots[slotIndex] = {
        ...slots[slotIndex],
        selectedVariantId: selectedVar ? (selectedVar.id || selectedVar.name) : String(val),
        selectedVariant: selectedVar,
        error: null
      };
      this.bundleSlots.set(slots);
      this.validateSlots();
    }
  }

  /**
   * Validate slot choices (out-of-stock, duplicates if forbidden)
   */
  validateSlots(): boolean {
    const slots = [...this.bundleSlots()];
    const config = this.activeBundleGroup();
    const allowDuplicates = config?.allowDuplicates ?? true;
    let isValid = true;

    const chosenIds = new Map<string, number[]>();

    slots.forEach((slot, index) => {
      let error: string | null = null;
      const v = slot.selectedVariant;

      if (!v && !slot.selectedVariantId) {
        error = 'Please select a variant';
        isValid = false;
      } else if (v && (v.stock ?? v.quantity ?? 1) <= 0) {
        error = 'Selected variant is Out of Stock';
        isValid = false;
      }

      if (slot.selectedVariantId) {
        if (!chosenIds.has(slot.selectedVariantId)) {
          chosenIds.set(slot.selectedVariantId, []);
        }
        chosenIds.get(slot.selectedVariantId)!.push(index);
      }

      slots[index] = { ...slot, error };
    });

    // Check duplicate violations if allowDuplicates is false
    if (!allowDuplicates) {
      chosenIds.forEach((indices, varId) => {
        if (indices.length > 1) {
          isValid = false;
          indices.forEach(idx => {
            slots[idx] = {
              ...slots[idx],
              error: 'Duplicate variant selection not allowed'
            };
          });
        }
      });
    }

    this.bundleSlots.set(slots);
    return isValid;
  }

  /**
   * Computed Pricing Summary
   */
  readonly bundlePricing = computed<BundlePricingSummary>(() => {
    const p = this.product();
    const tier = this.selectedBundleTier();
    const slots = this.bundleSlots();

    if (!p || !tier || slots.length === 0) {
      const basePrice = Number(p?.salePrice || p?.sale_price || p?.basePrice || 0);
      return {
        subtotal: basePrice,
        originalSubtotal: basePrice,
        savings: 0,
        savingsPercentage: 0,
        pricePerItem: basePrice
      };
    }

    const count = tier.count;
    // Calculate raw base total from selected slot variants
    const rawTotal = slots.reduce((acc, slot) => {
      const v = slot.selectedVariant;
      const price = Number(v?.salePrice || v?.sale_price || v?.price || p.salePrice || p.basePrice || 0);
      return acc + price;
    }, 0);

    const baseItemPrice = slots.length > 0 ? (rawTotal / slots.length) : Number(p.salePrice || p.basePrice || 0);

    let subtotal = 0;
    let pricePerItem = 0;

    switch (tier.priceType) {
      case 'fixed':
        subtotal = Number(tier.priceValue);
        pricePerItem = subtotal / count;
        break;
      case 'percentage':
        subtotal = rawTotal * (1 - Number(tier.priceValue) / 100);
        pricePerItem = subtotal / count;
        break;
      case 'per_variant':
      case 'custom':
      default:
        pricePerItem = Number(tier.priceValue || tier.customPricePerItem || baseItemPrice);
        subtotal = pricePerItem * count;
        break;
    }

    const originalSubtotal = baseItemPrice * count;
    const savings = Math.max(0, originalSubtotal - subtotal);
    const savingsPercentage = originalSubtotal > 0 ? Math.round((savings / originalSubtotal) * 100) : 0;

    return {
      subtotal: Math.round(subtotal),
      originalSubtotal: Math.round(originalSubtotal),
      savings: Math.round(savings),
      savingsPercentage,
      pricePerItem: Math.round(pricePerItem)
    };
  });

  /**
   * Final bundle selection evaluation result
   */
  readonly bundleResult = computed<BundleSelectionResult>(() => {
    const tier = this.selectedBundleTier();
    const slots = this.bundleSlots();
    const pricing = this.bundlePricing();
    const errors: string[] = [];

    if (!tier) {
      errors.push('No bundle tier selected');
    }

    if (slots.length !== (tier?.count || 0)) {
      errors.push(`Expected ${tier?.count} items in bundle, got ${slots.length}`);
    }

    slots.forEach((s, idx) => {
      if (!s.selectedVariantId) {
        errors.push(`Slot #${idx + 1} selection is required`);
      }
      if (s.error) {
        errors.push(`Slot #${idx + 1}: ${s.error}`);
      }
    });

    return {
      isComplete: errors.length === 0,
      selectedTier: tier,
      slots,
      pricing,
      errorMessages: errors
    };
  });

  /**
   * Single variant selection update for non-bundle products
   */
  selectOption(groupName: string, value: string) {
    const updated = { ...this.selectedOptions(), [groupName]: value };
    this.selectedOptions.set(updated);
  }

  /**
   * Finds matching variant object based on single selectedOptions
   */
  readonly selectedSingleVariant = computed(() => {
    const variants = this.availableVariants();
    const selected = this.selectedOptions();
    if (!variants || variants.length === 0) return null;

    const match = variants.find(v => {
      if (!v.optionValues) return false;
      return Object.entries(selected).every(([key, val]) => String(v.optionValues[key]) === String(val));
    });

    return match || variants.find(v => v.isDefault || v.is_default) || variants[0] || null;
  });

  /**
   * Helper to build CartBundleDetails for adding to cart
   */
  buildCartBundleDetails(): CartBundleDetails | null {
    const result = this.bundleResult();
    const group = this.activeBundleGroup();
    const product = this.product();
    if (!result.isComplete || !result.selectedTier) return null;

    const baseProductPrice = Number(product?.salePrice || product?.sale_price || product?.basePrice || 0);
    const effectiveBundlePrice = result.pricing.subtotal || (result.pricing.pricePerItem * result.selectedTier.count);

    return {
      bundleGroupId: group?.id,
      bundleName: result.selectedTier.name,
      bundleCount: result.selectedTier.count,
      bundleDiscount: result.pricing.savings,
      basePrice: baseProductPrice,
      unitPrice: result.pricing.pricePerItem,
      effectivePrice: effectiveBundlePrice,
      bundlePrice: effectiveBundlePrice,
      configurationType: 'bundle',
      selectedOptions: result.slots.map(s => {
        const v = s.selectedVariant;
        return {
          slot: s.slotIndex + 1,
          attribute: group?.displayName || group?.variantName || 'Option',
          value: v?.name || s.selectedVariantId || 'Default',
          variantId: v?.id || s.selectedVariantId,
          name: v?.name || s.selectedVariantId,
          color: v?.optionValues?.color || v?.optionValues?.Color || v?.name,
          sku: v?.sku
        };
      }),
      selectedVariants: result.slots.map(s => {
        const v = s.selectedVariant;
        return {
          slotIndex: s.slotIndex,
          slotLabel: s.slotLabel,
          variantId: v?.id || s.selectedVariantId || 'default',
          sku: v?.sku || `SKU-${v?.id || s.slotIndex}`,
          name: v?.name || v?.variantSlug || `Variant ${s.slotIndex + 1}`,
          color: v?.optionValues?.color || v?.optionValues?.Color || v?.name,
          price: result.pricing.pricePerItem,
          image: Array.isArray(v?.variantImages) && v?.variantImages[0] ? v?.variantImages[0] : (Array.isArray(v?.images) ? v?.images[0] : null),
          optionValues: v?.optionValues || {}
        };
      })
    };
  }
}
