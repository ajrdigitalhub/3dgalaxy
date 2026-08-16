export type VariantDisplayType =
  | 'chip'
  | 'dropdown'
  | 'image'
  | 'card'
  | 'radio-chips'
  | 'color-chips'
  | 'button-group'
  | 'bundle-builder'
  | 'quantity-selector'
  | 'weight-selector'
  | 'grid-cards';

export type VariantSelectionMode =
  | 'single'
  | 'multiple'
  | 'bundle'
  | 'quantity'
  | 'weight'
  | 'pack';

export type BundlePricingType =
  | 'fixed'
  | 'percentage'
  | 'per_variant'
  | 'custom';

export interface WeightVariantOption {
  id: string;
  label: string; // e.g. "Buy 1 (1 kg)", "Buy 3 (3 kg)", "Buy 5 (5 kg)", "1 kg", "2.5 kg"
  weightValue: number; // e.g. 1, 3, 5, 2.5
  weightUnit: 'kg' | 'g' | 'lb' | 'oz'; // e.g. 'kg'
  weightInGrams: number; // e.g. 1000, 3000, 5000, 2500
  pricePerUnit?: number; // e.g. 500 per kg
  totalPrice?: number; // Calculated or fixed total price for this weight variant
  discountPercentage?: number; // e.g. 10 for 10% bulk discount
  badgeText?: string; // e.g. "Popular", "Best Value"
  savingsText?: string; // e.g. "Save 15%"
  isDefault?: boolean;
  isPopular?: boolean;
  allowCustom?: boolean;
}

export interface ProductWeightConfig {
  enabled: boolean;
  allowCustomWeight: boolean;
  defaultUnit: 'kg' | 'g' | 'lb' | 'oz';
  minWeight: number; // e.g. 0.1
  maxWeight: number; // e.g. 50
  step?: number; // e.g. 0.5
  unitPrice: number; // Price per defaultUnit
  weightVariants: WeightVariantOption[];
}

export interface BundleTier {
  id: string;
  name: string;
  count: number;
  priceType: BundlePricingType;
  priceValue: number; // For 'fixed', it's total price. For 'percentage', e.g. 10 for 10% off. For 'per_variant', e.g. 699 per item.
  customPricePerItem?: number;
  badgeText?: string;
  savingsText?: string;
  isPopular?: boolean;
  weightValue?: number;
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
}

export interface VariantGroupConfig {
  id: string;
  variantName: string;
  displayName: string;
  displayOrder: number;
  required: boolean;
  default?: string | number | null;
  active: boolean;
  displayType: VariantDisplayType;
  selectionMode: VariantSelectionMode;
  selectionRules?: Record<string, any>;
  minSelection?: number;
  maxSelection?: number;
  allowDuplicates?: boolean;
  bundleTiers?: BundleTier[];
  weightVariants?: WeightVariantOption[];
  weightConfig?: ProductWeightConfig;
  slotLabels?: string[]; // Custom labels per slot e.g., ["Printer", "Filament", "Nozzle"] for Pack Builder
}

export interface BundleSlotSelection {
  slotIndex: number;
  slotLabel: string;
  selectedVariantId: string | null;
  selectedVariant: any | null;
  error?: string | null;
}

export interface BundlePricingSummary {
  subtotal: number;
  originalSubtotal: number;
  savings: number;
  savingsPercentage: number;
  pricePerItem: number;
}

export interface BundleSelectionResult {
  isComplete: boolean;
  selectedTier: BundleTier | null;
  slots: BundleSlotSelection[];
  pricing: BundlePricingSummary;
  errorMessages: string[];
}

export interface CartBundleDetails {
  bundleGroupId?: string;
  bundleName: string;
  bundleCount: number;
  bundleDiscount: number;
  basePrice?: number;
  unitPrice?: number;
  effectivePrice?: number;
  bundlePrice?: number;
  configurationType?: string;
  selectedTier?: BundleTier;
  selectedWeightValue?: number;
  selectedWeightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  isCustomWeight?: boolean;
  customWeightValue?: number;
  weightInGrams?: number;
  selectedOptions?: Array<{
    slot: number;
    attribute: string;
    value: string;
    variantId?: string;
    name?: string;
    color?: string;
    image?: string;
    sku?: string;
  }>;
  selectedVariants: Array<{
    slotIndex: number;
    slotLabel: string;
    variantId: string;
    sku: string;
    name: string;
    color?: string;
    price: number;
    image?: string;
    optionValues?: Record<string, any>;
  }>;
}

