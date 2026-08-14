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
  | 'grid-cards';

export type VariantSelectionMode =
  | 'single'
  | 'multiple'
  | 'bundle'
  | 'quantity'
  | 'pack';

export type BundlePricingType =
  | 'fixed'
  | 'percentage'
  | 'per_variant'
  | 'custom';

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
