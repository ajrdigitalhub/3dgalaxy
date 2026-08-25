import prisma from '../config/database';
import { getSettingsService } from '../modules/settings/settings.service';

export interface WeightRule {
  fromGrams: number;
  toGrams: number;
  charge: number;
}

export interface ShippingCalculationResult {
  shippingCharge: number;
  source: 'PRODUCT' | 'CATEGORY' | 'DEFAULT' | 'FREE_SHIPPING';
  totalWeightGrams: number;
  formattedWeight: string;
  estimatedDays: number;
  freeShipping: boolean;
  shippingLabel: string;
  appliedRule: {
    type: 'PRODUCT_SPECIFIC' | 'CATEGORY_WEIGHT' | 'CATEGORY_FLAT' | 'DEFAULT_WEIGHT' | 'DEFAULT_FLAT' | 'FREE_SHIPPING';
    name: string;
    details?: string;
    categoryId?: string;
    categoryName?: string;
    weightGrams?: number;
    minWeight?: number;
    maxWeight?: number;
  };
  breakdown: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitWeightGrams: number;
    totalWeightGrams: number;
    charge: number;
    source: 'PRODUCT' | 'CATEGORY' | 'DEFAULT' | 'FREE_SHIPPING';
    ruleName: string;
    estimatedDays: number;
  }>;
}

export function formatWeight(weightInGrams: number | null | undefined): string {
  const val = Number(weightInGrams) || 0;
  if (val <= 0) return '0 g';
  if (val < 1000) {
    const formattedGrams = Number.isInteger(val) ? val : Number(val.toFixed(2));
    return `${formattedGrams} g`;
  }
  const kg = val / 1000;
  return `${Number(kg.toFixed(2))} kg`;
}

export function formatWeightRange(fromGrams: number, toGrams: number): string {
  const fromStr = formatWeight(fromGrams);
  if (!toGrams || toGrams >= 999999) {
    return `${fromStr}+`;
  }
  const toStr = formatWeight(toGrams);
  return `${fromStr} – ${toStr}`;
}

export class ShippingService {
  /**
   * Centralized backend shipping calculation engine.
   * Enforces strict priority:
   * 1. PRODUCT-SPECIFIC SHIPPING
   * 2. CATEGORY-BASED SHIPPING (Weight Range Pricing / Flat / Free)
   * 3. DEFAULT / COMMON SHIPPING (Default Weight Range / Flat Rate)
   */
  static async calculateShipping(
    items: Array<{ productId: string; variantId?: string | null; quantity?: number; weightInGrams?: number }>,
    customGlobalSettings?: any
  ): Promise<ShippingCalculationResult> {
    if (!items || items.length === 0) {
      return {
        shippingCharge: 0,
        source: 'FREE_SHIPPING',
        totalWeightGrams: 0,
        formattedWeight: '0 g',
        estimatedDays: 3,
        freeShipping: true,
        shippingLabel: 'Free Shipping',
        appliedRule: {
          type: 'FREE_SHIPPING',
          name: 'Free Shipping',
        },
        breakdown: [],
      };
    }

    const appSettings = customGlobalSettings || (await getSettingsService()) || {};
    const settings = appSettings.shippingSettings || {};

    const enableProductShipping = settings.enableProductShipping !== false;
    const enableCategoryShipping = settings.enableCategoryShipping !== false;
    const enableGlobalShipping = settings.enableGlobalShipping !== false;
    const enableWeightBasedShipping = settings.enableWeightBasedShipping === true;
    const defaultWeightRules: WeightRule[] = Array.isArray(settings.weightRules) ? settings.weightRules : [];
    const defaultShippingCharge =
      settings.defaultShippingCharge !== undefined && !isNaN(Number(settings.defaultShippingCharge))
        ? Number(settings.defaultShippingCharge)
        : 150;
    const freeShippingThreshold =
      settings.freeShippingThreshold !== undefined &&
      settings.freeShippingThreshold !== null &&
      !isNaN(Number(settings.freeShippingThreshold))
        ? Number(settings.freeShippingThreshold)
        : settings.freeShippingMinSpent !== undefined &&
          settings.freeShippingMinSpent !== null &&
          !isNaN(Number(settings.freeShippingMinSpent))
        ? Number(settings.freeShippingMinSpent)
        : null;
    const shippingLabel = settings.shippingLabel || 'Delivery Charges';

    // 1. Fetch full product & category records
    const resolvedItems: Array<{
      item: { productId: string; variantId?: string | null; quantity?: number };
      product: any;
      variant?: any;
      unitWeightGrams: number;
      totalWeightGrams: number;
      quantity: number;
      lineSubtotal: number;
    }> = [];

    let totalCartSubtotal = 0;
    let totalCartWeightGrams = 0;

    for (const item of items) {
      if (!item.productId) continue;
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          category: true,
          productCategories: {
            include: { category: true },
            orderBy: { sortOrder: 'asc' },
          },
          variants: true,
        },
      });

      if (product) {
        const qty = Math.max(1, Number(item.quantity) || 1);
        let variant: any = null;
        if (item.variantId && Array.isArray(product.variants)) {
          variant = product.variants.find((v: any) => v.id === item.variantId) || null;
        }

        const price = variant?.salePrice
          ? Number(variant.salePrice)
          : variant?.price
          ? Number(variant.price)
          : product.salePrice
          ? Number(product.salePrice)
          : Number(product.basePrice);

        const lineSubtotal = price * qty;
        totalCartSubtotal += lineSubtotal;

        // Weight resolution: variant weight -> product weightInGrams -> item.weightInGrams -> 0
        const unitWeight = Number(
          variant?.weight ||
          variant?.weightInGrams ||
          product.weightInGrams ||
          (product as any).weight ||
          item.weightInGrams ||
          0
        );

        const itemTotalWeight = unitWeight * qty;
        totalCartWeightGrams += itemTotalWeight;

        resolvedItems.push({
          item,
          product,
          variant,
          unitWeightGrams: unitWeight,
          totalWeightGrams: itemTotalWeight,
          quantity: qty,
          lineSubtotal,
        });
      }
    }

    const isGlobalThresholdMet =
      freeShippingThreshold !== null &&
      freeShippingThreshold > 0 &&
      totalCartSubtotal >= freeShippingThreshold;

    let totalShippingCharge = 0;
    let maxEstimatedDays = 3;
    let primaryRule: any = null;
    const breakdown: ShippingCalculationResult['breakdown'] = [];
    const sourcesUsed = new Set<'PRODUCT' | 'CATEGORY' | 'DEFAULT' | 'FREE_SHIPPING'>();

    // Items grouped by category for weight-based category aggregation if multiple items share category
    // For single item or mixed carts, evaluate per item
    let reliesOnDefaultShipping = false;
    let defaultShippingWeightGrams = 0;

    const getCategoryRulesBackend = (c: any): WeightRule[] => {
      let rawRules = c?.shippingRules || c?.shipping_rules || c?.weightRules || c?.weight_rules;
      if (typeof rawRules === 'string' && rawRules.trim()) {
        try { rawRules = JSON.parse(rawRules); } catch (e) {}
      }
      if (Array.isArray(rawRules) && rawRules.length > 0) {
        return rawRules.map((r: any) => ({
          fromGrams: Number(r.fromGrams !== undefined ? r.fromGrams : (r.from_grams !== undefined ? r.from_grams : r.from)) || 0,
          toGrams: r.toGrams !== undefined && r.toGrams !== null ? Number(r.toGrams) : r.to_grams !== undefined && r.to_grams !== null ? Number(r.to_grams) : r.to !== undefined && r.to !== null ? Number(r.to) : 999999,
          charge: Number(r.charge !== undefined ? r.charge : r.fee) || 0,
        }));
      }
      return [];
    };

    const categoryGroups = new Map<string, {
      category: any;
      items: typeof resolvedItems;
      totalWeightGrams: number;
      totalSubtotal: number;
      maxDays: number;
    }>();

    for (const entry of resolvedItems) {
      const { product, unitWeightGrams, totalWeightGrams, quantity } = entry;
      let itemDays = product.estimatedDeliveryDays ? Number(product.estimatedDeliveryDays) : 3;
      if (itemDays > maxEstimatedDays) {
        maxEstimatedDays = itemDays;
      }

      const prodShipping = product.shipping || {};
      const prodShippingMode = prodShipping.mode || (product.baseShippingCharge > 0 ? 'product_specific' : 'default');

      const hasProductCharge =
        enableProductShipping &&
        prodShippingMode === 'product_specific' &&
        product.baseShippingCharge !== null &&
        product.baseShippingCharge !== undefined &&
        Number(product.baseShippingCharge) > 0;

      const isProductFree =
        enableProductShipping &&
        (product.freeShippingEligible === true || prodShipping.freeShippingEligible === true) &&
        prodShippingMode === 'product_specific';

      if (isProductFree) {
        sourcesUsed.add('FREE_SHIPPING');
        if (!primaryRule) {
          primaryRule = {
            type: 'PRODUCT_SPECIFIC',
            name: `${product.name} (Free Shipping)`,
            details: 'Product explicitly marked as eligible for free shipping',
          };
        }
        breakdown.push({
          productId: product.id,
          productName: product.name,
          quantity,
          unitWeightGrams,
          totalWeightGrams,
          charge: 0,
          source: 'FREE_SHIPPING',
          ruleName: 'Product: Free Shipping',
          estimatedDays: itemDays,
        });
      } else if (hasProductCharge) {
        const itemCharge = Number(product.baseShippingCharge);
        totalShippingCharge += itemCharge;
        sourcesUsed.add('PRODUCT');
        if (!primaryRule) {
          primaryRule = {
            type: 'PRODUCT_SPECIFIC',
            name: `${product.name} (₹${itemCharge})`,
            details: 'Product-specific shipping charge applied',
          };
        }
        breakdown.push({
          productId: product.id,
          productName: product.name,
          quantity,
          unitWeightGrams,
          totalWeightGrams,
          charge: itemCharge,
          source: 'PRODUCT',
          ruleName: `Product Specific (₹${itemCharge})`,
          estimatedDays: itemDays,
        });
      } else {
        let selectedCategory: any = null;

        if (enableCategoryShipping && product.category) {
          const cat = product.category;
          const catRules = getCategoryRulesBackend(cat);
          const catMode = cat.shippingMode || cat.shipping_mode || (catRules.length > 0 ? 'weight_based' : 'default');
          const catCharge = cat.shippingCharge !== undefined && cat.shippingCharge !== null
            ? Number(cat.shippingCharge)
            : cat.shipping_charge !== undefined && cat.shipping_charge !== null
            ? Number(cat.shipping_charge)
            : null;

          if (
            catMode === 'weight_based' ||
            catMode === 'flat' ||
            catMode === 'free' ||
            catRules.length > 0 ||
            (catCharge !== null && catCharge > 0) ||
            cat.freeShippingEligible === true ||
            cat.free_shipping_eligible === true
          ) {
            selectedCategory = cat;
          }
        }

        if (!selectedCategory && enableCategoryShipping && Array.isArray(product.productCategories)) {
          for (const pc of product.productCategories) {
            const cat = pc.category;
            if (!cat) continue;
            const catRules = getCategoryRulesBackend(cat);
            const catMode = cat.shippingMode || cat.shipping_mode || (catRules.length > 0 ? 'weight_based' : 'default');
            const catCharge = cat.shippingCharge !== undefined && cat.shippingCharge !== null
              ? Number(cat.shippingCharge)
              : cat.shipping_charge !== undefined && cat.shipping_charge !== null
              ? Number(cat.shipping_charge)
              : null;

            if (
              catMode === 'weight_based' ||
              catMode === 'flat' ||
              catMode === 'free' ||
              catRules.length > 0 ||
              (catCharge !== null && catCharge > 0) ||
              cat.freeShippingEligible === true ||
              cat.free_shipping_eligible === true
            ) {
              selectedCategory = cat;
              break;
            }
          }
        }

        if (selectedCategory) {
          const groupKey = selectedCategory.id || selectedCategory.slug || selectedCategory.name;
          if (!categoryGroups.has(groupKey)) {
            categoryGroups.set(groupKey, {
              category: selectedCategory,
              items: [],
              totalWeightGrams: 0,
              totalSubtotal: 0,
              maxDays: 3,
            });
          }
          const group = categoryGroups.get(groupKey)!;
          group.items.push(entry);
          group.totalWeightGrams += totalWeightGrams;
          group.totalSubtotal += entry.lineSubtotal;
          if (itemDays > group.maxDays) group.maxDays = itemDays;
        } else {
          reliesOnDefaultShipping = true;
          defaultShippingWeightGrams += totalWeightGrams;
          breakdown.push({
            productId: product.id,
            productName: product.name,
            quantity,
            unitWeightGrams,
            totalWeightGrams,
            charge: 0,
            source: 'DEFAULT',
            ruleName: 'Default Shipping',
            estimatedDays: itemDays,
          });
        }
      }
    }

    // Process Category Groups (evaluate category rule ONCE per category based on aggregate category weight)
    for (const [, group] of categoryGroups) {
      const cat = group.category;
      const catRules = getCategoryRulesBackend(cat);
      const catMode = cat.shippingMode || cat.shipping_mode || (catRules.length > 0 ? 'weight_based' : 'default');
      const catFreeEligible = cat.freeShippingEligible === true || cat.free_shipping_eligible === true;
      const catFreeThreshold =
        cat.freeShippingThreshold !== undefined && cat.freeShippingThreshold !== null
          ? Number(cat.freeShippingThreshold)
          : cat.free_shipping_threshold !== undefined && cat.free_shipping_threshold !== null
          ? Number(cat.free_shipping_threshold)
          : null;
      const catCharge = cat.shippingCharge !== undefined && cat.shippingCharge !== null
        ? Number(cat.shippingCharge)
        : cat.shipping_charge !== undefined && cat.shipping_charge !== null
        ? Number(cat.shipping_charge)
        : null;

      let groupCharge = 0;
      let groupSource: 'CATEGORY' | 'FREE_SHIPPING' = 'CATEGORY';
      let groupRuleName = '';

      if (catMode === 'free' || catFreeEligible) {
        if (catFreeThreshold && totalCartSubtotal < catFreeThreshold) {
          groupCharge = catCharge !== null ? catCharge : defaultShippingCharge;
          groupSource = 'CATEGORY';
          groupRuleName = `Category: ${cat.name} (Flat ₹${groupCharge})`;
        } else {
          groupCharge = 0;
          groupSource = 'FREE_SHIPPING';
          groupRuleName = `Category: ${cat.name} (Free Shipping)`;
        }
        if (!primaryRule) {
          primaryRule = {
            type: 'FREE_SHIPPING',
            name: `Category: ${cat.name} (Free Shipping)`,
            categoryId: cat.id,
            categoryName: cat.name,
          };
        }
      } else if (catMode === 'weight_based' || catRules.length > 0) {
        const sortedRules = [...catRules].sort((a, b) => (a.fromGrams || 0) - (b.fromGrams || 0));
        let matchedTier: WeightRule | null = null;

        for (const tier of sortedRules) {
          const minW = Number(tier.fromGrams) || 0;
          const maxW = tier.toGrams !== undefined && tier.toGrams !== null && Number(tier.toGrams) > 0
            ? Number(tier.toGrams)
            : Infinity;

          if (group.totalWeightGrams >= minW && group.totalWeightGrams <= maxW) {
            matchedTier = tier;
            break;
          }
        }

        if (!matchedTier && sortedRules.length > 0) {
          matchedTier = sortedRules[sortedRules.length - 1];
        }

        if (matchedTier) {
          groupCharge = Number(matchedTier.charge);
          groupSource = 'CATEGORY';
          const rangeStr = formatWeightRange(matchedTier.fromGrams, matchedTier.toGrams);
          groupRuleName = `Category: ${cat.name} (${rangeStr} → ₹${groupCharge})`;
          if (!primaryRule) {
            primaryRule = {
              type: 'CATEGORY_WEIGHT',
              name: `Category: ${cat.name}`,
              details: `Weight Range: ${rangeStr}`,
              categoryId: cat.id,
              categoryName: cat.name,
              weightGrams: group.totalWeightGrams,
              minWeight: matchedTier.fromGrams,
              maxWeight: matchedTier.toGrams,
            };
          }
        } else {
          groupCharge = catCharge !== null ? catCharge : defaultShippingCharge;
          groupSource = 'CATEGORY';
          groupRuleName = `Category: ${cat.name} (₹${groupCharge})`;
          if (!primaryRule) {
            primaryRule = {
              type: 'CATEGORY_FLAT',
              name: `Category: ${cat.name}`,
              details: `Flat Charge: ₹${groupCharge}`,
              categoryId: cat.id,
              categoryName: cat.name,
            };
          }
        }
      } else if (catCharge !== null && catCharge > 0) {
        groupCharge = catCharge;
        groupSource = 'CATEGORY';
        groupRuleName = `Category: ${cat.name} (Flat ₹${groupCharge})`;
        if (!primaryRule) {
          primaryRule = {
            type: 'CATEGORY_FLAT',
            name: `Category: ${cat.name}`,
            details: `Flat Charge: ₹${groupCharge}`,
            categoryId: cat.id,
            categoryName: cat.name,
          };
        }
      } else {
        reliesOnDefaultShipping = true;
        defaultShippingWeightGrams += group.totalWeightGrams;
        for (const itemEntry of group.items) {
          breakdown.push({
            productId: itemEntry.product.id,
            productName: itemEntry.product.name,
            quantity: itemEntry.quantity,
            unitWeightGrams: itemEntry.unitWeightGrams,
            totalWeightGrams: itemEntry.totalWeightGrams,
            charge: 0,
            source: 'DEFAULT',
            ruleName: 'Default Shipping',
            estimatedDays: itemEntry.product.estimatedDeliveryDays ? Number(itemEntry.product.estimatedDeliveryDays) : 3,
          });
        }
        continue;
      }

      if (isGlobalThresholdMet) {
        groupCharge = 0;
        groupSource = 'FREE_SHIPPING';
        groupRuleName = `Free Shipping (Order > ₹${freeShippingThreshold})`;
      }

      totalShippingCharge += groupCharge;
      sourcesUsed.add(groupSource);

      for (const itemEntry of group.items) {
        breakdown.push({
          productId: itemEntry.product.id,
          productName: itemEntry.product.name,
          quantity: itemEntry.quantity,
          unitWeightGrams: itemEntry.unitWeightGrams,
          totalWeightGrams: itemEntry.totalWeightGrams,
          charge: groupCharge,
          source: groupSource,
          ruleName: groupRuleName,
          estimatedDays: itemEntry.product.estimatedDeliveryDays ? Number(itemEntry.product.estimatedDeliveryDays) : 3,
        });
      }
    }

    // Apply default/common shipping charge once if any item relied on default shipping
    if (reliesOnDefaultShipping && !isGlobalThresholdMet && enableGlobalShipping) {
      let defaultCharge = 0;
      let defaultRuleName = '';

      if (enableWeightBasedShipping && defaultWeightRules.length > 0) {
        const sortedRules = [...defaultWeightRules].sort((a, b) => (a.fromGrams || 0) - (b.fromGrams || 0));
        let matchedTier: WeightRule | null = null;

        for (const tier of sortedRules) {
          const minW = Number(tier.fromGrams) || 0;
          const maxW = tier.toGrams !== undefined && tier.toGrams !== null && Number(tier.toGrams) > 0
            ? Number(tier.toGrams)
            : Infinity;

          if (defaultShippingWeightGrams >= minW && defaultShippingWeightGrams <= maxW) {
            matchedTier = tier;
            break;
          }
        }

        if (!matchedTier && sortedRules.length > 0) {
          matchedTier = sortedRules[sortedRules.length - 1];
        }

        if (matchedTier) {
          defaultCharge = Number(matchedTier.charge);
          const rangeStr = formatWeightRange(matchedTier.fromGrams, matchedTier.toGrams);
          defaultRuleName = `Default Weight Rule (${rangeStr})`;
          if (!primaryRule) {
            primaryRule = {
              type: 'DEFAULT_WEIGHT',
              name: 'Default Weight-based Shipping',
              details: `Range: ${rangeStr} (₹${defaultCharge})`,
              weightGrams: defaultShippingWeightGrams,
              minWeight: matchedTier.fromGrams,
              maxWeight: matchedTier.toGrams,
            };
          }
        } else {
          defaultCharge = defaultShippingCharge;
          defaultRuleName = `Default Flat Rate (₹${defaultCharge})`;
          if (!primaryRule) {
            primaryRule = {
              type: 'DEFAULT_FLAT',
              name: 'Standard Delivery',
              details: `Default Flat Rate: ₹${defaultCharge}`,
            };
          }
        }
      } else {
        defaultCharge = defaultShippingCharge;
        defaultRuleName = `Default Flat Rate (₹${defaultCharge})`;
        if (!primaryRule) {
          primaryRule = {
            type: 'DEFAULT_FLAT',
            name: 'Standard Delivery',
            details: `Default Flat Rate: ₹${defaultCharge}`,
          };
        }
      }

      totalShippingCharge += defaultCharge;
      sourcesUsed.add('DEFAULT');

      // Update breakdown items that relied on default shipping
      for (const b of breakdown) {
        if (b.source === 'DEFAULT') {
          b.charge = defaultCharge;
          b.ruleName = defaultRuleName;
        }
      }
    }

    // Free shipping threshold waiver check on overall cart
    if (isGlobalThresholdMet && totalShippingCharge > 0) {
      totalShippingCharge = 0;
      primaryRule = {
        type: 'FREE_SHIPPING',
        name: `Free Shipping (Orders above ₹${freeShippingThreshold})`,
      };
      sourcesUsed.clear();
      sourcesUsed.add('FREE_SHIPPING');
    }

    // Determine aggregate shipping source
    let mainSource: 'PRODUCT' | 'CATEGORY' | 'DEFAULT' | 'FREE_SHIPPING' = 'FREE_SHIPPING';
    if (totalShippingCharge > 0) {
      if (sourcesUsed.has('PRODUCT')) {
        mainSource = 'PRODUCT';
      } else if (sourcesUsed.has('CATEGORY')) {
        mainSource = 'CATEGORY';
      } else {
        mainSource = 'DEFAULT';
      }
    } else {
      mainSource = 'FREE_SHIPPING';
    }

    if (!primaryRule) {
      primaryRule = {
        type: totalShippingCharge === 0 ? 'FREE_SHIPPING' : 'DEFAULT_FLAT',
        name: totalShippingCharge === 0 ? 'Free Shipping' : 'Standard Delivery',
      };
    }

    return {
      shippingCharge: totalShippingCharge,
      source: mainSource,
      totalWeightGrams: totalCartWeightGrams,
      formattedWeight: formatWeight(totalCartWeightGrams),
      estimatedDays: maxEstimatedDays,
      freeShipping: totalShippingCharge === 0,
      shippingLabel: totalShippingCharge === 0 ? 'Free' : shippingLabel,
      appliedRule: primaryRule,
      breakdown,
    };
  }
}
