import { Injectable, inject, computed, Injector, signal } from "@angular/core";
import { DatastoreService } from "../../services/datastore";
import { SettingsService } from "./settings.service";
import { formatWeight, getItemWeightGrams } from "../../shared/utils/weight.utils";

export type ShippingStatus = 'idle' | 'loading' | 'success' | 'free' | 'error';

export interface CentralShippingState {
  status: ShippingStatus;
  shippingCharge: number | null;
  isFreeShipping: boolean;
  source: 'PRODUCT' | 'CATEGORY' | 'DEFAULT' | 'FREE_SHIPPING' | null;
  loading: boolean;
  calculated: boolean;
  currency: string;
  error?: string | null;
  appliedRule?: AppliedShippingRule | null;
  estimatedDays?: number;
  formattedWeight?: string;
  breakdown?: any[];
}

export interface WeightRule {
  fromGrams: number;
  toGrams: number;
  charge: number;
}

export interface AppliedShippingRule {
  type: 'PRODUCT_SPECIFIC' | 'CATEGORY_WEIGHT' | 'CATEGORY_FLAT' | 'DEFAULT_WEIGHT' | 'DEFAULT_FLAT' | 'FREE_SHIPPING';
  name: string;
  details?: string;
  categoryId?: string;
  categoryName?: string;
  weightGrams?: number;
  minWeight?: number;
  maxWeight?: number;
}

export interface ShippingCalculationResult {
  shippingCharge: number;
  source: 'PRODUCT' | 'CATEGORY' | 'DEFAULT' | 'FREE_SHIPPING';
  totalWeightGrams: number;
  formattedWeight: string;
  estimatedDays: number;
  freeShipping: boolean;
  shippingLabel: string;
  appliedRule: AppliedShippingRule;
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

export function formatWeightRange(fromGrams: number, toGrams: number): string {
  const fromStr = formatWeight(fromGrams);
  if (!toGrams || toGrams >= 999999) {
    return `${fromStr}+`;
  }
  const toStr = formatWeight(toGrams);
  return `${fromStr} – ${toStr}`;
}

@Injectable({
  providedIn: "root",
})
export class ShippingService {
  private injector = inject(Injector);
  private settingsService = inject(SettingsService);

  private calculationStateSignal = signal<CentralShippingState>({
    status: 'idle',
    shippingCharge: null,
    isFreeShipping: false,
    source: null,
    loading: false,
    calculated: false,
    currency: 'INR',
    error: null,
    appliedRule: null,
    estimatedDays: 3,
    formattedWeight: '0 g',
    breakdown: [],
  });

  public readonly calculationState = this.calculationStateSignal.asReadonly();

  public setCalculationLoading() {
    this.calculationStateSignal.set({
      status: 'loading',
      shippingCharge: null,
      isFreeShipping: false,
      source: null,
      loading: true,
      calculated: false,
      currency: 'INR',
      error: null,
      appliedRule: null,
      estimatedDays: 3,
      formattedWeight: '0 g',
      breakdown: [],
    });
  }

  public setCalculationError(errorMessage: string) {
    this.calculationStateSignal.set({
      status: 'error',
      shippingCharge: null,
      isFreeShipping: false,
      source: null,
      loading: false,
      calculated: false,
      currency: 'INR',
      error: errorMessage,
      appliedRule: null,
      estimatedDays: 3,
      formattedWeight: '0 g',
      breakdown: [],
    });
  }

  private parseItemDays(val: any): number {
    if (val === undefined || val === null || val === '') return 305;
    let raw = val;
    if (typeof val === 'object') {
      raw = val.estimatedDeliveryDays ??
            val.estimated_delivery_days ??
            val.shipping?.estimatedDays ??
            val.shipping?.deliveryDays ??
            val.shipping?.deliveryTime ??
            val.category?.estimatedDeliveryDays ??
            val.category?.estimated_delivery_days;
    }
    if (raw === undefined || raw === null || raw === '') return 305;
    if (typeof raw === 'number') {
      if (isNaN(raw) || raw <= 0) return 305;
      if (raw >= 100) return raw;
      if (raw < 10) return raw * 100 + (raw + 2);
      return raw;
    }
    const str = String(raw).trim();
    if (str.includes('-')) {
      const parts = str.split('-').map(p => parseInt(p.trim(), 10));
      if (!isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] < parts[1]) {
        return parts[0] * 100 + parts[1];
      }
    }
    if (str.toLowerCase().includes('to')) {
      const parts = str.toLowerCase().split('to').map(p => parseInt(p.trim(), 10));
      if (!isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] < parts[1]) {
        return parts[0] * 100 + parts[1];
      }
    }
    const parsed = parseInt(str, 10);
    if (isNaN(parsed) || parsed <= 0) return 305;
    if (parsed >= 100) return parsed;
    if (parsed < 10) return parsed * 100 + (parsed + 2);
    return parsed;
  }

  public globalSettings = computed(() => {
    return this.settingsService.shippingSettings() || {};
  });

  public categories = computed(() => {
    try {
      const ds = this.injector.get(DatastoreService);
      return ds?.categories() || [];
    } catch {
      return [];
    }
  });

  /**
   * Centralized frontend shipping calculation engine.
   * Enforces strict priority:
   * 1. PRODUCT-SPECIFIC SHIPPING
   * 2. CATEGORY-BASED SHIPPING (Weight Range Pricing / Flat / Free)
   * 3. DEFAULT / COMMON SHIPPING (Default Weight Range / Flat Rate)
   */
  public calculateCartShipping(cartItems: any[], updateStateSignal: boolean = false): ShippingCalculationResult {
    if (!cartItems || cartItems.length === 0) {
      return {
        shippingCharge: 0,
        source: "FREE_SHIPPING",
        totalWeightGrams: 0,
        formattedWeight: "0 g",
        estimatedDays: 3,
        freeShipping: true,
        shippingLabel: "Free Shipping",
        appliedRule: {
          type: "FREE_SHIPPING",
          name: "Free Shipping",
        },
        breakdown: [],
      };
    }

    const settings = this.globalSettings();
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
    const shippingLabel = settings.shippingLabel || "Delivery Charges";

    let totalCartSubtotal = 0;
    let totalCartWeightGrams = 0;

    const resolvedItems: Array<{
      item: any;
      product: any;
      variant: any;
      unitWeightGrams: number;
      totalWeightGrams: number;
      quantity: number;
      lineSubtotal: number;
    }> = [];

    const allCategories = this.categories();

    for (const item of cartItems) {
      const prod = item.product || item;
      if (!prod) continue;

      const qty = Math.max(1, Number(item.quantity) || 1);
      const variant = item.variant || null;

      const price =
        variant?.salePrice ||
        variant?.price ||
        prod.salePrice ||
        prod.basePrice ||
        prod.price ||
        item.price ||
        0;

      const lineSubtotal = Number(price) * qty;
      totalCartSubtotal += lineSubtotal;

      const unitWeight = getItemWeightGrams(item);
      const itemTotalWeight = unitWeight * qty;
      totalCartWeightGrams += itemTotalWeight;

      resolvedItems.push({
        item,
        product: prod,
        variant,
        unitWeightGrams: unitWeight,
        totalWeightGrams: itemTotalWeight,
        quantity: qty,
        lineSubtotal,
      });
    }

    const isGlobalThresholdMet =
      freeShippingThreshold !== null &&
      freeShippingThreshold > 0 &&
      totalCartSubtotal >= freeShippingThreshold;

    let totalShippingCharge = 0;
    let maxEstimatedDays = 3;
    let primaryRule: AppliedShippingRule | null = null;
    const breakdown: ShippingCalculationResult["breakdown"] = [];
    const sourcesUsed = new Set<"PRODUCT" | "CATEGORY" | "DEFAULT" | "FREE_SHIPPING">();

    let reliesOnDefaultShipping = false;
    let defaultShippingWeightGrams = 0;

    const getCategoryRules = (c: any): WeightRule[] => {
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
      const prodId = product.id || "";
      const prodName = product.name || "Product";
      let itemDays = this.parseItemDays(product.estimatedDeliveryDays);
      if (itemDays > maxEstimatedDays) {
        maxEstimatedDays = itemDays;
      }

      const prodShipping = product.shipping || {};
      const prodShippingMode = prodShipping.mode || (Number(product.baseShippingCharge) > 0 ? "product_specific" : "default");

      const hasProductCharge =
        enableProductShipping &&
        prodShippingMode === "product_specific" &&
        product.baseShippingCharge !== null &&
        product.baseShippingCharge !== undefined &&
        Number(product.baseShippingCharge) > 0;

      const isProductFree =
        enableProductShipping &&
        (product.freeShippingEligible === true || prodShipping.freeShippingEligible === true) &&
        prodShippingMode === "product_specific";

      if (isProductFree) {
        sourcesUsed.add("FREE_SHIPPING");
        if (!primaryRule) {
          primaryRule = {
            type: "PRODUCT_SPECIFIC",
            name: `${prodName} (Free Shipping)`,
            details: "Product explicitly marked as eligible for free shipping",
          };
        }
        breakdown.push({
          productId: prodId,
          productName: prodName,
          quantity,
          unitWeightGrams,
          totalWeightGrams,
          charge: 0,
          source: "FREE_SHIPPING",
          ruleName: "Product: Free Shipping",
          estimatedDays: itemDays,
        });
      } else if (hasProductCharge) {
        const itemCharge = Number(product.baseShippingCharge);
        totalShippingCharge += itemCharge;
        sourcesUsed.add("PRODUCT");
        if (!primaryRule) {
          primaryRule = {
            type: "PRODUCT_SPECIFIC",
            name: `${prodName} (₹${itemCharge})`,
            details: "Product-specific shipping charge applied",
          };
        }
        breakdown.push({
          productId: prodId,
          productName: prodName,
          quantity,
          unitWeightGrams,
          totalWeightGrams,
          charge: itemCharge,
          source: "PRODUCT",
          ruleName: `Product Specific (₹${itemCharge})`,
          estimatedDays: itemDays,
        });
      } else {
        let selectedCategory: any = null;
        const catId = product.categoryId || product.category_id || product.parentCategoryId || product.parent_category_id || (typeof product.category === 'object' ? product.category?.id : null);
        const catName = product.categoryName || product.category_name || (typeof product.category === 'string' ? product.category : product.category?.name);

        let primaryCat = allCategories.find((c: any) =>
          (catId && (String(c.id) === String(catId) || c.slug === catId)) ||
          (catName && c.name && c.name.toLowerCase().trim() === String(catName).toLowerCase().trim()) ||
          (catId && c.name && c.name.toLowerCase().trim() === String(catId).toLowerCase().trim())
        );

        if (!primaryCat && typeof product.category === 'object' && product.category !== null) {
          primaryCat = product.category;
        }

        if (!primaryCat && typeof product.category === 'string' && product.category.trim()) {
          const searchName = product.category.trim().toLowerCase();
          primaryCat = allCategories.find((c: any) => c.name && c.name.toLowerCase().trim() === searchName);
        }

        if (enableCategoryShipping && primaryCat) {
          const catRules = getCategoryRules(primaryCat);
          const catMode = primaryCat.shippingMode || primaryCat.shipping_mode || (catRules.length > 0 ? "weight_based" : "default");
          const catCharge = primaryCat.shippingCharge !== undefined && primaryCat.shippingCharge !== null
            ? Number(primaryCat.shippingCharge)
            : primaryCat.shipping_charge !== undefined && primaryCat.shipping_charge !== null
            ? Number(primaryCat.shipping_charge)
            : null;

          if (
            catMode === "weight_based" ||
            catMode === "flat" ||
            catMode === "free" ||
            catRules.length > 0 ||
            (catCharge !== null && catCharge > 0) ||
            primaryCat.freeShippingEligible === true ||
            primaryCat.free_shipping_eligible === true
          ) {
            selectedCategory = primaryCat;
          }
        }

        if (!selectedCategory && enableCategoryShipping && Array.isArray(product.productCategories)) {
          for (const pc of product.productCategories) {
            const secondaryCatId = pc.categoryId || pc.category_id || pc.category?.id;
            const secCat = allCategories.find((c: any) => c.id === secondaryCatId) || pc.category;
            if (!secCat) continue;
            const catRules = getCategoryRules(secCat);
            const catMode = secCat.shippingMode || secCat.shipping_mode || (catRules.length > 0 ? "weight_based" : "default");
            const catCharge = secCat.shippingCharge !== undefined && secCat.shippingCharge !== null
              ? Number(secCat.shippingCharge)
              : secCat.shipping_charge !== undefined && secCat.shipping_charge !== null
              ? Number(secCat.shipping_charge)
              : null;

            if (
              catMode === "weight_based" ||
              catMode === "flat" ||
              catMode === "free" ||
              catRules.length > 0 ||
              (catCharge !== null && catCharge > 0) ||
              secCat.freeShippingEligible === true ||
              secCat.free_shipping_eligible === true
            ) {
              selectedCategory = secCat;
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
            productId: prodId,
            productName: prodName,
            quantity,
            unitWeightGrams,
            totalWeightGrams,
            charge: 0,
            source: "DEFAULT",
            ruleName: "Default Shipping",
            estimatedDays: itemDays,
          });
        }
      }
    }

    // Process Category Groups (evaluate category rule ONCE per category based on aggregate category weight)
    for (const [, group] of categoryGroups) {
      const cat = group.category;
      const catRules = getCategoryRules(cat);
      const catMode = cat.shippingMode || cat.shipping_mode || (catRules.length > 0 ? "weight_based" : "default");
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
      let groupSource: "CATEGORY" | "FREE_SHIPPING" = "CATEGORY";
      let groupRuleName = "";

      if (catMode === "free" || catFreeEligible) {
        if (catFreeThreshold && totalCartSubtotal < catFreeThreshold) {
          groupCharge = catCharge !== null ? catCharge : defaultShippingCharge;
          groupSource = "CATEGORY";
          groupRuleName = `Category: ${cat.name} (Flat ₹${groupCharge})`;
        } else {
          groupCharge = 0;
          groupSource = "FREE_SHIPPING";
          groupRuleName = `Category: ${cat.name} (Free Shipping)`;
        }
        if (!primaryRule) {
          primaryRule = {
            type: "FREE_SHIPPING",
            name: `Category: ${cat.name} (Free Shipping)`,
            categoryId: cat.id,
            categoryName: cat.name,
          };
        }
      } else if (catMode === "weight_based" || catRules.length > 0) {
        const sortedRules = [...catRules].sort((a, b) => (a.fromGrams || 0) - (b.fromGrams || 0));
        let matchedTier: WeightRule | null = null;

        for (const tier of sortedRules) {
          const minW = Number(tier.fromGrams) || 0;
          const maxW =
            tier.toGrams !== undefined && tier.toGrams !== null && Number(tier.toGrams) > 0
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
          groupSource = "CATEGORY";
          const rangeStr = formatWeightRange(matchedTier.fromGrams, matchedTier.toGrams);
          groupRuleName = `Category: ${cat.name} (${rangeStr} → ₹${groupCharge})`;
          if (!primaryRule) {
            primaryRule = {
              type: "CATEGORY_WEIGHT",
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
          groupSource = "CATEGORY";
          groupRuleName = `Category: ${cat.name} (₹${groupCharge})`;
          if (!primaryRule) {
            primaryRule = {
              type: "CATEGORY_FLAT",
              name: `Category: ${cat.name}`,
              details: `Flat Charge: ₹${groupCharge}`,
              categoryId: cat.id,
              categoryName: cat.name,
            };
          }
        }
      } else if (catCharge !== null && catCharge > 0) {
        groupCharge = catCharge;
        groupSource = "CATEGORY";
        groupRuleName = `Category: ${cat.name} (Flat ₹${groupCharge})`;
        if (!primaryRule) {
          primaryRule = {
            type: "CATEGORY_FLAT",
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
            productId: itemEntry.product.id || "",
            productName: itemEntry.product.name || "Product",
            quantity: itemEntry.quantity,
            unitWeightGrams: itemEntry.unitWeightGrams,
            totalWeightGrams: itemEntry.totalWeightGrams,
            charge: 0,
            source: "DEFAULT",
            ruleName: "Default Shipping",
            estimatedDays: this.parseItemDays(itemEntry.product.estimatedDeliveryDays),
          });
        }
        continue;
      }

      if (isGlobalThresholdMet) {
        groupCharge = 0;
        groupSource = "FREE_SHIPPING";
        groupRuleName = `Free Shipping (Order > ₹${freeShippingThreshold})`;
      }

      totalShippingCharge += groupCharge;
      sourcesUsed.add(groupSource);

      for (const itemEntry of group.items) {
        breakdown.push({
          productId: itemEntry.product.id || "",
          productName: itemEntry.product.name || "Product",
          quantity: itemEntry.quantity,
          unitWeightGrams: itemEntry.unitWeightGrams,
          totalWeightGrams: itemEntry.totalWeightGrams,
          charge: groupCharge,
          source: groupSource,
          ruleName: groupRuleName,
          estimatedDays: this.parseItemDays(itemEntry.product.estimatedDeliveryDays),
        });
      }
    }

    if (reliesOnDefaultShipping && !isGlobalThresholdMet && enableGlobalShipping) {
      let defaultCharge = 0;
      let defaultRuleName = "";

      if (enableWeightBasedShipping && defaultWeightRules.length > 0) {
        const sortedRules = [...defaultWeightRules].sort((a, b) => (a.fromGrams || 0) - (b.fromGrams || 0));
        let matchedTier: WeightRule | null = null;

        for (const tier of sortedRules) {
          const minW = Number(tier.fromGrams) || 0;
          const maxW =
            tier.toGrams !== undefined && tier.toGrams !== null && Number(tier.toGrams) > 0
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
              type: "DEFAULT_WEIGHT",
              name: "Default Weight-based Shipping",
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
              type: "DEFAULT_FLAT",
              name: "Standard Delivery",
              details: `Default Flat Rate: ₹${defaultCharge}`,
            };
          }
        }
      } else {
        defaultCharge = defaultShippingCharge;
        defaultRuleName = `Default Flat Rate (₹${defaultCharge})`;
        if (!primaryRule) {
          primaryRule = {
            type: "DEFAULT_FLAT",
            name: "Standard Delivery",
            details: `Default Flat Rate: ₹${defaultCharge}`,
          };
        }
      }

      totalShippingCharge += defaultCharge;
      sourcesUsed.add("DEFAULT");

      for (const b of breakdown) {
        if (b.source === "DEFAULT") {
          b.charge = defaultCharge;
          b.ruleName = defaultRuleName;
        }
      }
    }

    if (isGlobalThresholdMet && totalShippingCharge > 0) {
      totalShippingCharge = 0;
      primaryRule = {
        type: "FREE_SHIPPING",
        name: `Free Shipping (Orders above ₹${freeShippingThreshold})`,
      };
      sourcesUsed.clear();
      sourcesUsed.add("FREE_SHIPPING");
    }

    let mainSource: "PRODUCT" | "CATEGORY" | "DEFAULT" | "FREE_SHIPPING" = "FREE_SHIPPING";
    if (totalShippingCharge > 0) {
      if (sourcesUsed.has("PRODUCT")) {
        mainSource = "PRODUCT";
      } else if (sourcesUsed.has("CATEGORY")) {
        mainSource = "CATEGORY";
      } else {
        mainSource = "DEFAULT";
      }
    } else {
      mainSource = "FREE_SHIPPING";
    }

    if (!primaryRule) {
      primaryRule = {
        type: totalShippingCharge === 0 ? "FREE_SHIPPING" : "DEFAULT_FLAT",
        name: totalShippingCharge === 0 ? "Free Shipping" : "Standard Delivery",
      };
    }

    const result: ShippingCalculationResult = {
      shippingCharge: totalShippingCharge,
      source: mainSource,
      totalWeightGrams: totalCartWeightGrams,
      formattedWeight: formatWeight(totalCartWeightGrams),
      estimatedDays: maxEstimatedDays,
      freeShipping: totalShippingCharge === 0,
      shippingLabel: totalShippingCharge === 0 ? "Free" : shippingLabel,
      appliedRule: primaryRule,
      breakdown,
    };

    if (updateStateSignal) {
      this.calculationStateSignal.set({
        status: totalShippingCharge === 0 ? 'free' : 'success',
        shippingCharge: totalShippingCharge,
        isFreeShipping: totalShippingCharge === 0,
        source: mainSource,
        loading: false,
        calculated: true,
        currency: 'INR',
        error: null,
        appliedRule: primaryRule,
        estimatedDays: maxEstimatedDays,
        formattedWeight: formatWeight(totalCartWeightGrams),
        breakdown,
      });
    }

    return result;
  }

  /**
   * Get single product shipping info for display on product page
   */
  public getProductShippingInfo(product: any, itemContext?: any) {
    if (!product) {
      return {
        charge: 0,
        source: "FREE_SHIPPING" as const,
        estimatedDays: 3,
        isFree: true,
        label: "Free Shipping",
        appliedRule: {
          type: "FREE_SHIPPING" as const,
          name: "Free Shipping",
        },
      };
    }
    const qty = Math.max(1, Number(itemContext?.quantity) || 1);
    const cartItem = itemContext ? { product, ...itemContext, quantity: qty } : { product, quantity: 1 };
    const result = this.calculateCartShipping([cartItem]);
    return {
      charge: result.shippingCharge,
      source: result.source,
      estimatedDays: result.estimatedDays,
      isFree: result.freeShipping,
      label: result.shippingLabel,
      appliedRule: result.appliedRule,
    };
  }
}
