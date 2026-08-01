/**
 * Product Weight Management System - Centralized Weight Utility
 * 
 * Rules:
 * - If weight < 1000 g: display in grams (e.g. 850 g, 250 g)
 * - If weight >= 1000 g: display converted to kilograms rounded to 2 decimal places (e.g. 1.00 kg, 1.25 kg, 10.95 kg)
 */

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

export function getItemWeightGrams(item: any): number {
  if (!item) return 0;
  const p = item.product || item;
  const v = item.variant;
  return Number(v?.weight || v?.weightInGrams || p?.weightInGrams || p?.weight || p?.weight_in_grams || 0);
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
