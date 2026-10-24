import { AnalyticsItem } from './analytics.types';

const TRACKED_PURCHASES_KEY = '3dgalaxy_tracked_purchases';

/**
 * Strips internal parameters (_user_agent_*, _&rcb, _&ae, keys with '&')
 * and undefined/null values from custom event payloads before dispatching to GA4/gtag.
 */
export function sanitizeAnalyticsPayload<T extends Record<string, any>>(payload?: T): Record<string, any> {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const clean: Record<string, any> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) {
      continue;
    }

    // Reject internal Google Tag / Client Hint parameters
    if (key.startsWith('_user_agent_') || key.startsWith('_&') || key.includes('&')) {
      continue;
    }

    // Recursively clean items array if present
    if (key === 'items' && Array.isArray(value)) {
      clean['items'] = value.map((item) => sanitizeAnalyticsItem(item));
      continue;
    }

    // Avoid nested complex objects leaking internal browser descriptors
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      clean[key] = sanitizeAnalyticsPayload(value);
      continue;
    }

    clean[key] = value;
  }

  return clean;
}

/**
 * Sanitizes an individual item object ensuring only standard GA4 ecommerce attributes are sent.
 */
export function sanitizeAnalyticsItem(item: any): AnalyticsItem {
  if (!item || typeof item !== 'object') {
    return {
      item_id: 'UNKNOWN',
      item_name: 'Product',
      price: 0,
      quantity: 1
    };
  }

  const price = Number(item.price);
  const qty = Number(item.quantity);

  const cleanItem: AnalyticsItem = {
    item_id: String(item.item_id || item.productId || item.id || 'PRODUCT'),
    item_name: String(item.item_name || item.name || item.productName || 'Product'),
    price: isNaN(price) || price < 0 ? 0 : Number(price.toFixed(2)),
    quantity: isNaN(qty) || qty < 1 ? 1 : Math.round(qty)
  };

  if (item.currency) cleanItem.currency = String(item.currency);
  if (item.item_category) cleanItem.item_category = String(item.item_category);
  if (item.item_brand) cleanItem.item_brand = String(item.item_brand);
  if (item.item_variant) cleanItem.item_variant = String(item.item_variant);
  if (item.coupon) cleanItem.coupon = String(item.coupon);
  if (typeof item.index === 'number') cleanItem.index = item.index;
  if (typeof item.discount === 'number') cleanItem.discount = Number(item.discount);
  if (item.item_list_id) cleanItem.item_list_id = String(item.item_list_id);
  if (item.item_list_name) cleanItem.item_list_name = String(item.item_list_name);

  return cleanItem;
}

/**
 * Normalizes storefront Product entity into a standard GA4 AnalyticsItem.
 */
export function mapProductToAnalyticsItem(
  product: any,
  quantityOrOptions: number | { quantity?: number; price?: number; item_list_id?: string; item_list_name?: string; index?: number; variant?: any } = 1,
  variant?: any
): AnalyticsItem {
  if (!product) {
    return {
      item_id: 'PRODUCT',
      item_name: 'Product',
      price: 0,
      quantity: 1
    };
  }

  const isOptions = typeof quantityOrOptions === 'object' && quantityOrOptions !== null;
  const options = isOptions ? quantityOrOptions : {};
  const qty = isOptions ? (options.quantity ?? 1) : (quantityOrOptions ?? 1);
  const activeVariant = isOptions ? (options.variant ?? variant) : variant;

  const effectivePrice = isOptions && options.price !== undefined
    ? options.price
    : (activeVariant?.salePrice ?? activeVariant?.price ?? product.salePrice ?? product.basePrice ?? product.sale_price ?? product.mrp ?? 0);

  const itemId = activeVariant?.sku || activeVariant?.id || product.sku || product.id || 'PRODUCT';
  const categoryName = typeof product.category === 'object' ? (product.category?.name || product.primaryCategory?.name) : (product.category || product.primaryCategory?.name || '3D Printers & Filaments');
  const brandName = typeof product.brand === 'object' ? (product.brand?.name || '3D Galaxy') : (product.brand || '3D Galaxy');
  const variantTitle = activeVariant?.title || activeVariant?.name || (activeVariant ? activeVariant.sku : undefined);

  const item: AnalyticsItem = {
    item_id: String(itemId),
    item_name: String(product.name || 'Product'),
    item_category: String(categoryName),
    item_brand: String(brandName),
    item_variant: variantTitle ? String(variantTitle) : undefined,
    price: Number(Number(effectivePrice).toFixed(2)) || 0,
    quantity: Math.max(1, Math.round(Number(qty) || 1)),
    currency: 'INR'
  };

  if (isOptions && options.item_list_id) item.item_list_id = options.item_list_id;
  if (isOptions && options.item_list_name) item.item_list_name = options.item_list_name;
  if (isOptions && typeof options.index === 'number') item.index = options.index;

  return item;
}

/**
 * Normalizes storefront CartItem entity into a standard GA4 AnalyticsItem.
 */
export function mapCartItemToAnalyticsItem(cartItem: any): AnalyticsItem {
  if (!cartItem) {
    return {
      item_id: 'CART_ITEM',
      item_name: 'Product',
      price: 0,
      quantity: 1
    };
  }

  const prod = cartItem.product || cartItem;
  const qty = cartItem.quantity || 1;
  const variant = cartItem.variant;

  return mapProductToAnalyticsItem(prod, qty, variant);
}

/**
 * Idempotency check: Determines whether an order/transaction has already been dispatched to GA4.
 * Uses persistent browser storage to survive reloads, browser navigations, and re-renders.
 */
export function isPurchaseAlreadyTracked(transactionId: string): boolean {
  if (typeof window === 'undefined' || !transactionId) return false;

  try {
    const raw = localStorage.getItem(TRACKED_PURCHASES_KEY);
    if (!raw) return false;
    const trackedList: string[] = JSON.parse(raw);
    const cleanId = String(transactionId).trim().toLowerCase();
    return Array.isArray(trackedList) && trackedList.map((id) => String(id).toLowerCase()).includes(cleanId);
  } catch (err) {
    console.warn('[Analytics Idempotency] Failed reading tracked purchases:', err);
    return false;
  }
}

/**
 * Idempotency recorder: Marks an order/transaction as dispatched in persistent storage.
 */
export function markPurchaseAsTracked(transactionId: string): void {
  if (typeof window === 'undefined' || !transactionId) return;

  try {
    const raw = localStorage.getItem(TRACKED_PURCHASES_KEY);
    const trackedList: string[] = raw ? JSON.parse(raw) : [];
    const cleanId = String(transactionId).trim();

    if (!trackedList.includes(cleanId)) {
      trackedList.push(cleanId);
      // Retain max 100 recent transactions to manage storage
      if (trackedList.length > 100) {
        trackedList.splice(0, trackedList.length - 100);
      }
      localStorage.setItem(TRACKED_PURCHASES_KEY, JSON.stringify(trackedList));
    }
  } catch (err) {
    console.warn('[Analytics Idempotency] Failed recording tracked purchase:', err);
  }
}

/**
 * Helper to clear tracked purchases (useful in automated tests).
 */
export function clearTrackedPurchases(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TRACKED_PURCHASES_KEY);
  }
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

/**
 * Validates an ecommerce payload against standard GA4 ecommerce rules before dispatching.
 * Ensures valid event name, ISO 4217 currency, non-negative numeric value, non-empty items
 * with valid item_id, item_name, numeric price/quantity, valid purchase transaction_id,
 * and checks that purchase value agrees with sum(item.price * item.quantity).
 */
export function validateEcommercePayload(eventName: string, payload: any): ValidationResult {
  const issues: string[] = [];

  if (!eventName || typeof eventName !== 'string') {
    issues.push('Missing or invalid event name');
  }

  if (!payload || typeof payload !== 'object') {
    issues.push('Payload must be an object');
    return { valid: false, issues };
  }

  // Reject forbidden internal parameters
  for (const key of Object.keys(payload)) {
    if (key.startsWith('_user_agent_') || key.startsWith('_&') || key.includes('&')) {
      issues.push(`Forbidden internal parameter "${key}" in payload`);
    }
  }

  // Validate Currency (must be uppercase 3-letter ISO code)
  if (payload.currency !== undefined) {
    if (typeof payload.currency !== 'string' || !/^[A-Z]{3}$/.test(payload.currency)) {
      issues.push(`Invalid currency "${payload.currency}", expected 3-letter ISO 4217 code (e.g. 'INR')`);
    }
  }

  // Validate Value (if present, must be non-negative finite number)
  if (payload.value !== undefined) {
    const val = Number(payload.value);
    if (isNaN(val) || !isFinite(val) || val < 0) {
      issues.push(`Invalid numeric value: ${payload.value}`);
    }
  }

  // Validate Items (if present)
  if (payload.items !== undefined) {
    if (!Array.isArray(payload.items)) {
      issues.push('items must be an array');
    } else {
      const requiredItemsEvents = ['view_item', 'add_to_cart', 'remove_from_cart', 'begin_checkout', 'purchase'];
      if (requiredItemsEvents.includes(eventName) && payload.items.length === 0) {
        issues.push(`Event "${eventName}" requires a non-empty items array`);
      }

      payload.items.forEach((item: any, idx: number) => {
        if (!item || typeof item !== 'object') {
          issues.push(`Item at index ${idx} is not an object`);
          return;
        }
        if (!item.item_id && !item.id && !item.productId) {
          issues.push(`Item at index ${idx} is missing item_id`);
        }
        if (!item.item_name && !item.name && !item.productName) {
          issues.push(`Item at index ${idx} is missing item_name`);
        }
        const p = Number(item.price);
        if (isNaN(p) || !isFinite(p) || p < 0) {
          issues.push(`Item "${item.item_name || idx}" has invalid price: ${item.price}`);
        }
        const q = Number(item.quantity);
        if (isNaN(q) || !isFinite(q) || q < 1) {
          issues.push(`Item "${item.item_name || idx}" has invalid quantity: ${item.quantity}`);
        }
      });
    }
  }

  // Specific validations for purchase
  if (eventName === 'purchase') {
    if (!payload.transaction_id || String(payload.transaction_id).trim().length === 0) {
      issues.push('Purchase event requires a non-empty transaction_id');
    }

    if (Array.isArray(payload.items) && payload.items.length > 0 && payload.value !== undefined) {
      const itemsSum = payload.items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
      const val = Number(payload.value);
      const ship = Number(payload.shipping || 0);
      const tax = Number(payload.tax || 0);
      const grandSum = itemsSum + ship + tax;
      // Accept either items subtotal or grand total (items + shipping + tax)
      if (Math.abs(itemsSum - val) > 0.1 && Math.abs(grandSum - val) > 0.1) {
        issues.push(`Purchase value (${val}) does not match sum of item price * quantity (${Number(itemsSum.toFixed(2))}) or grand total (${Number(grandSum.toFixed(2))})`);
      }
    }

    if (payload.shipping !== undefined) {
      const ship = Number(payload.shipping);
      if (isNaN(ship) || !isFinite(ship) || ship < 0) {
        issues.push(`Invalid shipping value: ${payload.shipping}`);
      }
    }

    if (payload.tax !== undefined) {
      const tax = Number(payload.tax);
      if (isNaN(tax) || !isFinite(tax) || tax < 0) {
        issues.push(`Invalid tax value: ${payload.tax}`);
      }
    }
  }

  if (issues.length > 0) {
    console.warn(`[Analytics Validation Warning] [${eventName}]:`, issues);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

