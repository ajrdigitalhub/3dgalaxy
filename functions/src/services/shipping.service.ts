import prisma from '../config/database';
import { getSettingsService } from '../modules/settings/settings.service';

export interface ShippingCalculationResult {
  shippingCharge: number;
  source: 'Product' | 'Category' | 'Global' | 'Free';
  estimatedDays: number;
  freeShipping: boolean;
  shippingLabel: string;
  breakdown?: Array<{
    productId: string;
    charge: number;
    source: 'Product' | 'Category' | 'Global' | 'Free';
    estimatedDays: number;
  }>;
}

export class ShippingService {
  /**
   * Centralized backend shipping calculation engine.
   * Enforces priority: Product Shipping -> Category Shipping -> Global Shipping -> Free Shipping
   */
  static async calculateShipping(
    items: Array<{ productId: string; variantId?: string | null; quantity?: number }>,
    customGlobalSettings?: any
  ): Promise<ShippingCalculationResult> {
    if (!items || items.length === 0) {
      return {
        shippingCharge: 0,
        source: 'Free',
        estimatedDays: 3,
        freeShipping: true,
        shippingLabel: 'Free Shipping',
      };
    }

    const settings = customGlobalSettings || (await getSettingsService())?.shippingSettings || {};
    
    const enableProductShipping = settings.enableProductShipping !== false;
    const enableCategoryShipping = settings.enableCategoryShipping !== false;
    const enableGlobalShipping = settings.enableGlobalShipping !== false;
    const defaultShippingCharge = settings.defaultShippingCharge !== undefined && !isNaN(Number(settings.defaultShippingCharge))
      ? Number(settings.defaultShippingCharge)
      : 150;
    const freeShippingThreshold = (settings.freeShippingMinSpent !== undefined && settings.freeShippingMinSpent !== null && !isNaN(Number(settings.freeShippingMinSpent)))
      ? Number(settings.freeShippingMinSpent)
      : ((settings.freeShippingThreshold !== undefined && settings.freeShippingThreshold !== null && !isNaN(Number(settings.freeShippingThreshold))) ? Number(settings.freeShippingThreshold) : null);
    const shippingLabel = settings.shippingLabel || 'Delivery Charges';

    let totalShippingCharge = 0;
    let maxEstimatedDays = 3;
    const sourcesUsed = new Set<'Product' | 'Category' | 'Global' | 'Free'>();
    const breakdown = [];

    // Pre-calculate subtotal to check global free shipping threshold
    let subtotal = 0;
    const fullProducts: any[] = [];

    for (const item of items) {
      if (!item.productId) continue;
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { category: true }
      });
      if (product) {
        fullProducts.push({ item, product });
        const price = product.salePrice ? Number(product.salePrice) : Number(product.basePrice);
        subtotal += price * (item.quantity || 1);
      }
    }

    const isGlobalThresholdMet = freeShippingThreshold !== null && freeShippingThreshold > 0 && subtotal >= freeShippingThreshold;

    for (const { item, product } of fullProducts) {
      let itemCharge = 0;
      let itemSource: 'Product' | 'Category' | 'Global' | 'Free' = 'Free';
      let itemDays = product.estimatedDeliveryDays ? Number(product.estimatedDeliveryDays) : 3;

      // Priority 1: Product Shipping Charge (only if Product Shipping Engine is enabled)
      const hasProductChargeConfigured =
        product.baseShippingCharge !== null &&
        product.baseShippingCharge !== undefined &&
        !isNaN(Number(product.baseShippingCharge)) &&
        Number(product.baseShippingCharge) > 0;
      const isProductFreeEligible = product.freeShippingEligible === true;

      if (enableProductShipping && isProductFreeEligible) {
        itemCharge = 0;
        itemSource = 'Free';
      } else if (enableProductShipping && hasProductChargeConfigured) {
        itemCharge = Number(product.baseShippingCharge);
        itemSource = 'Product';
      } else {
        // Priority 2: Category Shipping Charge (only if Category Shipping Engine is enabled)
        const category = product.category;
        const hasCategoryChargeConfigured =
          category &&
          category.shippingCharge !== null &&
          category.shippingCharge !== undefined &&
          !isNaN(Number(category.shippingCharge)) &&
          Number(category.shippingCharge) > 0;
        const isCategoryFreeEligible = category && category.freeShippingEligible === true;

        if (enableCategoryShipping && isCategoryFreeEligible) {
          itemCharge = 0;
          itemSource = 'Free';
        } else if (enableCategoryShipping && hasCategoryChargeConfigured) {
          itemCharge = Number(category.shippingCharge);
          itemSource = 'Category';
          if (category.estimatedDeliveryDays) {
            itemDays = Number(category.estimatedDeliveryDays);
          }
        } else {
          // Priority 3: Global Shipping Charge (only if Global Shipping Engine is enabled)
          if (enableGlobalShipping && defaultShippingCharge > 0 && !isGlobalThresholdMet) {
            itemCharge = defaultShippingCharge;
            itemSource = 'Global';
          } else {
            // Priority 4: Free Shipping
            itemCharge = 0;
            itemSource = 'Free';
          }
        }
      }

      // If global threshold is met and item has no explicit product shipping charge override, make it 0
      if (isGlobalThresholdMet && itemSource !== 'Product') {
        itemCharge = 0;
        itemSource = 'Free';
      }

      totalShippingCharge += itemCharge;
      sourcesUsed.add(itemSource);
      if (itemDays > maxEstimatedDays) {
        maxEstimatedDays = itemDays;
      }

      breakdown.push({
        productId: product.id,
        charge: itemCharge,
        source: itemSource,
        estimatedDays: itemDays,
      });
    }

    // Determine aggregate order shipping source
    let mainSource: 'Product' | 'Category' | 'Global' | 'Free' = 'Free';
    if (totalShippingCharge > 0) {
      if (sourcesUsed.has('Product')) {
        mainSource = 'Product';
      } else if (sourcesUsed.has('Category')) {
        mainSource = 'Category';
      } else if (sourcesUsed.has('Global')) {
        mainSource = 'Global';
      }
    } else {
      mainSource = 'Free';
    }

    return {
      shippingCharge: totalShippingCharge,
      source: mainSource,
      estimatedDays: maxEstimatedDays,
      freeShipping: totalShippingCharge === 0,
      shippingLabel: totalShippingCharge === 0 ? 'Free' : shippingLabel,
      breakdown,
    };
  }
}
