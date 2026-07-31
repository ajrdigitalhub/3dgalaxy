import { Injectable, inject, computed, Injector } from "@angular/core";
import { DatastoreService } from "../../services/datastore";
import { SettingsService } from "./settings.service";

export interface ShippingCalculationResult {
  shippingCharge: number;
  source: "Product" | "Category" | "Global" | "Free";
  estimatedDays: number;
  freeShipping: boolean;
  shippingLabel: string;
  breakdown: Array<{
    productId: string;
    productName: string;
    charge: number;
    source: "Product" | "Category" | "Global" | "Free";
    estimatedDays: number;
  }>;
}

@Injectable({
  providedIn: "root",
})
export class ShippingService {
  private injector = inject(Injector);
  private settingsService = inject(SettingsService);

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
   * Enforces Priority: Product Shipping -> Category Shipping -> Global Shipping -> Free Shipping
   */
  public calculateCartShipping(cartItems: any[]): ShippingCalculationResult {
    if (!cartItems || cartItems.length === 0) {
      return {
        shippingCharge: 0,
        source: "Free",
        estimatedDays: 3,
        freeShipping: true,
        shippingLabel: "Free Shipping",
        breakdown: [],
      };
    }

    const settings = this.globalSettings();
    const enableProductShipping = settings.enableProductShipping === true;
    const enableCategoryShipping = settings.enableCategoryShipping === true;
    const enableGlobalShipping = settings.enableGlobalShipping !== false;
    const defaultShippingCharge = settings.defaultShippingCharge !== undefined && !isNaN(Number(settings.defaultShippingCharge))
      ? Number(settings.defaultShippingCharge)
      : 150;
    const freeShippingThreshold = (settings.freeShippingMinSpent !== undefined && settings.freeShippingMinSpent !== null && !isNaN(Number(settings.freeShippingMinSpent)))
      ? Number(settings.freeShippingMinSpent)
      : ((settings.freeShippingThreshold !== undefined && settings.freeShippingThreshold !== null && !isNaN(Number(settings.freeShippingThreshold))) ? Number(settings.freeShippingThreshold) : null);
    const shippingLabel = settings.shippingLabel || "Delivery Charges";

    let totalShippingCharge = 0;
    let maxEstimatedDays = 3;
    const sourcesUsed = new Set<"Product" | "Category" | "Global" | "Free">();
    const breakdown: Array<{
      productId: string;
      productName: string;
      charge: number;
      source: "Product" | "Category" | "Global" | "Free";
      estimatedDays: number;
    }> = [];

    // Calculate cart subtotal to check if free shipping threshold is met
    let subtotal = 0;
    cartItems.forEach((item: any) => {
      const price =
        item.variant?.salePrice ||
        item.variant?.price ||
        item.product?.salePrice ||
        item.product?.basePrice ||
        item.product?.price ||
        item.price ||
        0;
      subtotal += Number(price) * (item.quantity || 1);
    });

    const isGlobalThresholdMet =
      freeShippingThreshold !== null &&
      freeShippingThreshold > 0 &&
      subtotal >= freeShippingThreshold;

    const allCategories = this.categories();

    for (const item of cartItems) {
      const prod = item.product || item;
      if (!prod) continue;

      const prodId = prod.id || "";
      const prodName = prod.name || "Product";

      let itemCharge = 0;
      let itemSource: "Product" | "Category" | "Global" | "Free" = "Free";
      let itemDays = prod.estimatedDeliveryDays
        ? Number(prod.estimatedDeliveryDays)
        : 3;

      // Priority 1: Product Shipping Charge (only if Product Shipping Engine is enabled)
      const hasProductChargeConfigured =
        prod.baseShippingCharge !== null &&
        prod.baseShippingCharge !== undefined &&
        !isNaN(Number(prod.baseShippingCharge)) &&
        Number(prod.baseShippingCharge) > 0;
      const isProductFreeEligible = prod.freeShippingEligible === true;

      if (enableProductShipping && isProductFreeEligible) {
        itemCharge = 0;
        itemSource = "Free";
      } else if (enableProductShipping && hasProductChargeConfigured) {
        itemCharge = Number(prod.baseShippingCharge);
        itemSource = "Product";
      } else {
        // Priority 2: Category Shipping Charge (only if Category Shipping Engine is enabled)
        const catId = prod.categoryId || prod.category?.id;
        const category = allCategories.find((c: any) => c.id === catId) || prod.category;

        const hasCategoryChargeConfigured =
          category &&
          category.shippingCharge !== null &&
          category.shippingCharge !== undefined &&
          !isNaN(Number(category.shippingCharge)) &&
          Number(category.shippingCharge) > 0;
        const isCategoryFreeEligible = category && category.freeShippingEligible === true;

        if (enableCategoryShipping && isCategoryFreeEligible) {
          itemCharge = 0;
          itemSource = "Free";
        } else if (enableCategoryShipping && hasCategoryChargeConfigured) {
          itemCharge = Number(category.shippingCharge);
          itemSource = "Category";
          if (category.estimatedDeliveryDays) {
            itemDays = Number(category.estimatedDeliveryDays);
          }
        } else {
          // Priority 3: Global Shipping Charge (only if Global Shipping Engine is enabled)
          if (enableGlobalShipping && defaultShippingCharge > 0 && !isGlobalThresholdMet) {
            itemCharge = defaultShippingCharge;
            itemSource = "Global";
          } else {
            // Priority 4: Free Shipping
            itemCharge = 0;
            itemSource = "Free";
          }
        }
      }

      // If global threshold is met and item has no explicit product shipping charge, make it 0
      if (isGlobalThresholdMet && itemSource !== "Product") {
        itemCharge = 0;
        itemSource = "Free";
      }

      totalShippingCharge += itemCharge;
      sourcesUsed.add(itemSource);
      if (itemDays > maxEstimatedDays) {
        maxEstimatedDays = itemDays;
      }

      breakdown.push({
        productId: prodId,
        productName: prodName,
        charge: itemCharge,
        source: itemSource,
        estimatedDays: itemDays,
      });
    }

    // Determine aggregate order shipping source
    let mainSource: "Product" | "Category" | "Global" | "Free" = "Free";
    if (totalShippingCharge > 0) {
      if (sourcesUsed.has("Product")) {
        mainSource = "Product";
      } else if (sourcesUsed.has("Category")) {
        mainSource = "Category";
      } else if (sourcesUsed.has("Global")) {
        mainSource = "Global";
      }
    } else {
      mainSource = "Free";
    }

    return {
      shippingCharge: totalShippingCharge,
      source: mainSource,
      estimatedDays: maxEstimatedDays,
      freeShipping: totalShippingCharge === 0,
      shippingLabel: totalShippingCharge === 0 ? "Free" : shippingLabel,
      breakdown,
    };
  }

  /**
   * Get single product shipping info for display on product page
   */
  public getProductShippingInfo(product: any) {
    if (!product) {
      return {
        charge: 0,
        source: "Free" as const,
        estimatedDays: 3,
        isFree: true,
        label: "Free Shipping",
      };
    }
    const result = this.calculateCartShipping([{ product, quantity: 1 }]);
    return {
      charge: result.shippingCharge,
      source: result.source,
      estimatedDays: result.estimatedDays,
      isFree: result.freeShipping,
      label: result.shippingLabel,
    };
  }
}
