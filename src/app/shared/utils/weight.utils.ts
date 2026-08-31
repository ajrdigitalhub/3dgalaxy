/**
 * Product Weight Management System - Centralized Weight Utility
 * 
 * Rules:
 * - Standard weight units supported: 'kg', 'g', 'lb', 'oz'
 * - If weight < 1000 g: display in grams (e.g. 850 g, 250 g)
 * - If weight >= 1000 g: display converted to kilograms rounded to 2 decimal places (e.g. 1.00 kg, 1.25 kg, 10.95 kg)
 */

export type WeightUnit = 'kg' | 'g' | 'lb' | 'oz';

const GRAM_CONVERSION_RATES: Record<string, number> = {
  g: 1,
  kg: 1000,
  lb: 453.59237,
  oz: 28.349523
};

/**
 * Convert any weight value in a given unit to standard grams
 */
export function convertToGrams(value: number | null | undefined, unit: string = 'kg'): number {
  const numericVal = Math.max(0, Number(value) || 0);
  const normalizedUnit = (unit || 'kg').toLowerCase().trim();
  const rate = GRAM_CONVERSION_RATES[normalizedUnit] || 1000;
  return Number((numericVal * rate).toFixed(4));
}

/**
 * Convert weight in grams to a target unit
 */
export function convertFromGrams(grams: number | null | undefined, targetUnit: string = 'kg'): number {
  const numericGrams = Math.max(0, Number(grams) || 0);
  const normalizedUnit = (targetUnit || 'kg').toLowerCase().trim();
  const rate = GRAM_CONVERSION_RATES[normalizedUnit] || 1000;
  return Number((numericGrams / rate).toFixed(3));
}

/**
 * Format weight value with explicit unit label
 */
export function formatWeightWithUnit(value: number | null | undefined, unit: string = 'kg'): string {
  const val = Number(value) || 0;
  const cleanUnit = (unit || 'kg').toLowerCase().trim();
  const formattedVal = Number.isInteger(val) ? val.toString() : val.toFixed(2);
  return `${formattedVal} ${cleanUnit}`;
}

export function formatWeight(weightInGrams: number | null | undefined): string {
  const val = Number(weightInGrams) || 0;
  if (val <= 0) {
    return '0 g';
  }
  if (val < 1000) {
    const formattedGrams = Number.isInteger(val) ? val : Number(val.toFixed(2));
    return `${formattedGrams} g`;
  }
  const kg = val / 1000;
  return `${kg.toFixed(2)} kg`;
}

export interface EffectiveWeightDetails {
  weightInGrams: number;
  displayWeight: string;
  source: 'VARIANT' | 'PRODUCT' | 'GLOBAL_FALLBACK';
  isFallback: boolean;
  badgeLabel: string;
  badgeClass: string;
  sourceLabel: string;
  warningText?: string;
}

/**
 * Multi-level variant weight resolution with fallback logic:
 * Level 1: Individual Variant weight (if present, non-null, > 0)
 * Level 2: Main product default weight (if present, non-null, > 0)
 * Level 3: Global admin fallback weight (with warning indicator)
 */
export function resolveEffectiveWeight(
  targetItemOrProduct: any,
  explicitVariant?: any,
  globalDefaultGrams: number = 1000
): EffectiveWeightDetails {
  const item = targetItemOrProduct || {};
  const v = explicitVariant || item.variant || (item.product ? null : (item.sku && item.name && !item.images ? item : null));
  const p = item.product || (item.name ? item : {});
  const bd = item.bundleDetails;
  const tier = item.selectedTier || item.bundleTier || bd?.selectedTier || item.tier;

  // Direct explicit weightInGrams on item
  if (item.weightInGrams !== undefined && item.weightInGrams !== null && Number(item.weightInGrams) > 0) {
    const g = Number(item.weightInGrams);
    return {
      weightInGrams: g,
      displayWeight: formatWeight(g),
      source: 'VARIANT',
      isFallback: false,
      badgeLabel: 'Configured Weight',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      sourceLabel: `${formatWeight(g)} (Configured Weight)`
    };
  }

  // Check bundleDetails weight
  if (bd) {
    const bdGrams = Number(bd.weightInGrams ?? bd.weight_in_grams ?? 0);
    if (bdGrams > 0) {
      return {
        weightInGrams: bdGrams,
        displayWeight: formatWeight(bdGrams),
        source: 'VARIANT',
        isFallback: false,
        badgeLabel: 'Bundle Weight',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        sourceLabel: `${formatWeight(bdGrams)} (Bundle Weight)`
      };
    }
    if (bd.selectedWeightValue !== undefined && bd.selectedWeightValue !== null && Number(bd.selectedWeightValue) > 0) {
      const g = convertToGrams(bd.selectedWeightValue, bd.selectedWeightUnit || 'kg');
      return {
        weightInGrams: g,
        displayWeight: formatWeight(g),
        source: 'VARIANT',
        isFallback: false,
        badgeLabel: 'Bundle Weight',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        sourceLabel: `${formatWeight(g)} (Bundle Weight)`
      };
    }
    if (Array.isArray(bd.selectedVariants) && bd.selectedVariants.length > 0) {
      let slotSum = 0;
      for (const slot of bd.selectedVariants) {
        const v = slot?.selectedVariant || slot;
        if (v) {
          const vGrams = Number(v.weightInGrams ?? v.weight_in_grams ?? v.weight ?? 0);
          if (vGrams > 0) slotSum += vGrams;
          else if (v.weightValue) slotSum += convertToGrams(v.weightValue, v.weightUnit || 'kg');
        }
      }
      if (slotSum > 0) {
        return {
          weightInGrams: slotSum,
          displayWeight: formatWeight(slotSum),
          source: 'VARIANT',
          isFallback: false,
          badgeLabel: 'Bundle Weight',
          badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          sourceLabel: `${formatWeight(slotSum)} (Bundle Weight)`
        };
      }
    }
    if (bd.bundleCount && Number(bd.bundleCount) > 0) {
      const perUnitGrams = Number(p.weightInGrams ?? p.weight_in_grams ?? p.weight ?? 1000) || 1000;
      const totalBundleUnitGrams = perUnitGrams * Number(bd.bundleCount);
      return {
        weightInGrams: totalBundleUnitGrams,
        displayWeight: formatWeight(totalBundleUnitGrams),
        source: 'VARIANT',
        isFallback: false,
        badgeLabel: 'Bundle Weight',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        sourceLabel: `${formatWeight(totalBundleUnitGrams)} (Bundle Weight)`
      };
    }
  }

  // Check direct tier weight (e.g. selectedTier or bundleTier)
  if (tier) {
    if (tier.weightValue !== undefined && tier.weightValue !== null && Number(tier.weightValue) > 0) {
      const g = convertToGrams(tier.weightValue, tier.weightUnit || 'kg');
      return {
        weightInGrams: g,
        displayWeight: formatWeight(g),
        source: 'VARIANT',
        isFallback: false,
        badgeLabel: 'Tier Weight',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        sourceLabel: `${formatWeight(g)} (Tier Weight)`
      };
    }
    const tGrams = Number(tier.weightInGrams ?? tier.weight_in_grams ?? 0);
    if (tGrams > 0) {
      return {
        weightInGrams: tGrams,
        displayWeight: formatWeight(tGrams),
        source: 'VARIANT',
        isFallback: false,
        badgeLabel: 'Tier Weight',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        sourceLabel: `${formatWeight(tGrams)} (Tier Weight)`
      };
    }
  }

  // Check custom/selected weight choice (e.g. from weight selector dropdown/chips)
  if (item.selectedWeightGrams !== undefined && item.selectedWeightGrams !== null && Number(item.selectedWeightGrams) > 0) {
    const g = Number(item.selectedWeightGrams);
    return {
      weightInGrams: g,
      displayWeight: formatWeight(g),
      source: 'VARIANT',
      isFallback: false,
      badgeLabel: 'Selected Weight',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      sourceLabel: `${formatWeight(g)} (Selected Weight Choice)`
    };
  }
  if (item.selectedWeightValue !== undefined && item.selectedWeightValue !== null && Number(item.selectedWeightValue) > 0) {
    const g = convertToGrams(item.selectedWeightValue, item.selectedWeightUnit || 'kg');
    return {
      weightInGrams: g,
      displayWeight: formatWeight(g),
      source: 'VARIANT',
      isFallback: false,
      badgeLabel: 'Selected Weight',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      sourceLabel: `${formatWeight(g)} (Selected Weight Choice)`
    };
  }

  // Level 1: Check individual variant's own weight value
  if (v) {
    const vGrams = Number(v.weightInGrams ?? v.weight_in_grams ?? v.weight ?? v.weightGrams ?? 0);
    if (vGrams > 0) {
      return {
        weightInGrams: vGrams,
        displayWeight: formatWeight(vGrams),
        source: 'VARIANT',
        isFallback: false,
        badgeLabel: 'Variant Specific',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        sourceLabel: `${formatWeight(vGrams)} (Variant Specific)`
      };
    }
    if (v.weightValue !== undefined && v.weightValue !== null && Number(v.weightValue) > 0) {
      const g = convertToGrams(v.weightValue, v.weightUnit || 'kg');
      return {
        weightInGrams: g,
        displayWeight: formatWeight(g),
        source: 'VARIANT',
        isFallback: false,
        badgeLabel: 'Variant Specific',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        sourceLabel: `${formatWeight(vGrams)} (Variant Specific)`
      };
    }
  }

  // Level 2: Fall back to Main Product Default Weight
  const pGrams = Number(p.weightInGrams ?? p.weight_in_grams ?? p.weight ?? p.shipping?.weight ?? 0);
  if (pGrams > 0) {
    return {
      weightInGrams: pGrams,
      displayWeight: formatWeight(pGrams),
      source: 'PRODUCT',
      isFallback: true,
      badgeLabel: 'Product Default',
      badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      sourceLabel: `${formatWeight(pGrams)} (Inherited from Product Default)`
    };
  }

  // Level 3: Fall back to Global Default Weight with warning
  const fallbackGrams = Math.max(1, Number(globalDefaultGrams) || 1000);
  return {
    weightInGrams: fallbackGrams,
    displayWeight: formatWeight(fallbackGrams),
    source: 'GLOBAL_FALLBACK',
    isFallback: true,
    badgeLabel: 'Global Fallback',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    warningText: 'Neither variant nor main product weight is configured. Applying global fallback weight.',
    sourceLabel: `${formatWeight(fallbackGrams)} (Global Fallback - Unconfigured Weight)`
  };
}

/**
 * Extract total weight in grams for a single item (accounting for variants, selected weight, custom weight)
 */
export function getItemWeightGrams(item: any): number {
  if (!item) return 0;
  if (item.effectiveWeightGrams !== undefined && item.effectiveWeightGrams !== null && Number(item.effectiveWeightGrams) > 0) {
    return Number(item.effectiveWeightGrams);
  }
  return resolveEffectiveWeight(item).weightInGrams;
}

/**
 * Validate custom or variant weight input against bounds
 */
export function validateWeightInput(
  value: number | string | null | undefined,
  unit: string = 'kg',
  minInUnit: number = 0.1,
  maxInUnit: number = 100
): { isValid: boolean; error?: string; weightInGrams: number } {
  const num = Number(value);
  if (value === null || value === undefined || isNaN(num) || num <= 0) {
    return {
      isValid: false,
      error: 'Please enter a valid positive weight value.',
      weightInGrams: 0
    };
  }

  if (num < minInUnit) {
    return {
      isValid: false,
      error: `Minimum allowed weight is ${minInUnit} ${unit}.`,
      weightInGrams: convertToGrams(num, unit)
    };
  }

  if (num > maxInUnit) {
    return {
      isValid: false,
      error: `Maximum allowed weight is ${maxInUnit} ${unit}.`,
      weightInGrams: convertToGrams(num, unit)
    };
  }

  return {
    isValid: true,
    weightInGrams: convertToGrams(num, unit)
  };
}

export function calculateItemWeight(itemOrGrams: any, qty?: number): {
  totalGrams: number;
  display: string;
  unitWeightDisplay: string;
} {
  let unitGrams = 0;
  let quantity = 1;

  if (typeof itemOrGrams === 'object' && itemOrGrams !== null) {
    unitGrams = getItemWeightGrams(itemOrGrams);
    quantity = Math.max(1, Number(itemOrGrams.quantity) || 1);
  } else {
    unitGrams = Number(itemOrGrams) || 0;
    quantity = Math.max(1, Number(qty) || 1);
  }

  const totalGrams = unitGrams * quantity;

  return {
    totalGrams,
    display: formatWeight(totalGrams),
    unitWeightDisplay: formatWeight(unitGrams)
  };
}

export function calculatePackageSummary(items: Array<any>): {
  itemCount: number;
  totalItems: number;
  totalQuantity: number;
  totalWeightGrams: number;
  displayWeight: string;
} {
  if (!items || !Array.isArray(items)) {
    return {
      itemCount: 0,
      totalItems: 0,
      totalQuantity: 0,
      totalWeightGrams: 0,
      displayWeight: '0 g'
    };
  }

  let totalQuantity = 0;
  let totalWeightGrams = 0;

  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const itemGrams = getItemWeightGrams(item);
    totalQuantity += qty;
    totalWeightGrams += itemGrams * qty;
  }

  return {
    itemCount: items.length,
    totalItems: items.length,
    totalQuantity,
    totalWeightGrams,
    displayWeight: formatWeight(totalWeightGrams)
  };
}

