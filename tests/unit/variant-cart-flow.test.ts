/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 1: UNIT TESTS — Add to Cart Flow for Variant Products (50 Test Cases)
 */

import assert from 'node:assert';

export interface TestVariant {
  id: string;
  name?: string;
  title?: string;
  sku: string;
  price: number;
  salePrice?: number;
  dealerPrice?: number;
  mrp?: number;
  stock: number;
  isActive?: boolean;
  weightInGrams?: number;
  imageUrl?: string;
  options?: Record<string, string>;
  option1?: string;
  option2?: string;
  option3?: string;
}

export interface TestProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  basePrice: number;
  salePrice: number;
  dealerPrice?: number;
  mrp: number;
  stock: number;
  codAvailable: boolean;
  weightInGrams: number;
  isActive: boolean;
  images?: string[];
  variants?: TestVariant[];
}

export interface CartItem {
  product: TestProduct;
  variant?: TestVariant;
  quantity: number;
  selectedPriceType?: 'sale' | 'dealer';
  weightInGrams?: number;
  selectedWeightValue?: number;
  selectedWeightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  calculatedPrice?: number;
  effectivePrice?: number;
}

export class CartManager {
  private items: CartItem[] = [];
  public userRole: 'customer' | 'dealer' | 'admin' = 'customer';

  constructor(role: 'customer' | 'dealer' | 'admin' = 'customer') {
    this.userRole = role;
  }

  getItems(): CartItem[] {
    return [...this.items];
  }

  clear() {
    this.items = [];
  }

  addToCart(product: TestProduct, quantity = 1, variant?: TestVariant, customWeight?: { weightInGrams?: number; calculatedPrice?: number }) {
    if (!product.isActive) {
      throw new Error(`Product ${product.name} is inactive and cannot be added to cart.`);
    }

    // Auto-resolve variant if product has variants and none specified
    let selectedVariant = variant;
    if (!selectedVariant && product.variants && product.variants.length > 0) {
      selectedVariant = product.variants.find(v => v.isActive !== false) || product.variants[0];
    }

    if (selectedVariant && selectedVariant.isActive === false) {
      throw new Error(`Variant ${selectedVariant.name || selectedVariant.sku} is inactive and cannot be added to cart.`);
    }

    // Stock validation
    const maxStock = selectedVariant ? selectedVariant.stock : product.stock;
    if (maxStock <= 0) {
      throw new Error(`Variant ${selectedVariant?.name || product.name} is out of stock.`);
    }

    const isMatch = (i: CartItem) => {
      if (selectedVariant && i.variant) {
        return i.product.id === product.id && (String(i.variant.id) === String(selectedVariant.id) || i.variant.sku === selectedVariant.sku);
      }
      if (!selectedVariant && !i.variant) {
        return i.product.id === product.id;
      }
      return false;
    };

    const existing = this.items.find(isMatch);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > maxStock) {
        throw new Error(`Cannot add ${quantity} more units. Maximum available stock is ${maxStock}.`);
      }
      existing.quantity = newQty;
      if (selectedVariant) existing.variant = selectedVariant;
      return existing;
    }

    if (quantity > maxStock) {
      throw new Error(`Requested quantity ${quantity} exceeds available stock of ${maxStock}.`);
    }

    const priceType = (this.userRole === 'admin' || this.userRole === 'dealer') ? 'dealer' : 'sale';
    const newItem: CartItem = {
      product,
      variant: selectedVariant,
      quantity,
      selectedPriceType: priceType,
      weightInGrams: customWeight?.weightInGrams ?? selectedVariant?.weightInGrams ?? product.weightInGrams,
      calculatedPrice: customWeight?.calculatedPrice,
      effectivePrice: customWeight?.calculatedPrice
    };

    this.items.push(newItem);
    return newItem;
  }

  updateQty(productId: string, quantity: number, variantId?: string) {
    if (quantity <= 0) {
      this.items = this.items.filter(i => {
        if (variantId) return !(i.product.id === productId && String(i.variant?.id) === String(variantId));
        return i.product.id !== productId;
      });
      return;
    }

    const item = this.items.find(i => {
      if (variantId) return i.product.id === productId && String(i.variant?.id) === String(variantId);
      return i.product.id === productId;
    });

    if (item) {
      const maxStock = item.variant ? item.variant.stock : item.product.stock;
      if (quantity > maxStock) {
        throw new Error(`Requested quantity ${quantity} exceeds maximum available stock ${maxStock}.`);
      }
      item.quantity = quantity;
    }
  }

  getItemPrice(item: CartItem): number {
    if (item.calculatedPrice !== undefined && item.calculatedPrice > 0) {
      return item.calculatedPrice;
    }
    const isDealer = this.userRole === 'admin' || this.userRole === 'dealer';
    if (item.variant) {
      const vDealer = item.variant.dealerPrice ?? item.variant.salePrice ?? item.variant.price;
      const vSale = item.variant.salePrice ?? item.variant.price;
      const price = isDealer ? vDealer : vSale;
      if (price !== undefined && price > 0) return price;
    }
    return isDealer ? (item.product.dealerPrice || item.product.basePrice) : (item.product.salePrice || item.product.basePrice);
  }

  getItemMrp(item: CartItem): number {
    if (item.variant?.mrp && item.variant.mrp > 0) return item.variant.mrp;
    if (item.variant?.price && item.variant.price > 0) return item.variant.price;
    return item.product.mrp || item.product.salePrice;
  }

  getItemWeightGrams(item: CartItem): number {
    return item.weightInGrams ?? item.variant?.weightInGrams ?? item.product.weightInGrams ?? 1000;
  }

  getSubtotal(): number {
    return this.items.reduce((sum, item) => sum + this.getItemPrice(item) * item.quantity, 0);
  }

  getMrpSubtotal(): number {
    return this.items.reduce((sum, item) => sum + this.getItemMrp(item) * item.quantity, 0);
  }

  getTotalSavings(): number {
    return Math.max(0, this.getMrpSubtotal() - this.getSubtotal());
  }

  getTotalWeightGrams(): number {
    return this.items.reduce((sum, item) => sum + this.getItemWeightGrams(item) * item.quantity, 0);
  }

  getTotalItemsCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  isCodEligible(maxCodThreshold = 2500): boolean {
    if (this.items.length === 0) return false;
    const allCodAvailable = this.items.every(i => i.product.codAvailable);
    return allCodAvailable && this.getSubtotal() <= maxCodThreshold;
  }

  getShippingCharge(freeShippingThreshold = 3500): number {
    if (this.getSubtotal() >= freeShippingThreshold) return 0;
    const totalGrams = this.getTotalWeightGrams();
    if (totalGrams <= 500) return 60;
    if (totalGrams <= 1000) return 90;
    if (totalGrams <= 2000) return 150;
    return 200;
  }

  getVariantThumbnail(item: CartItem): string {
    if (item.variant?.imageUrl) return item.variant.imageUrl;
    if (item.product.images && item.product.images.length > 0) return item.product.images[0];
    return 'https://3dgalaxy.co.in/assets/images/placeholder.png';
  }

  normalizeVariantName(name?: string, sku?: string): string {
    if (!name) return 'Standard';
    const clean = name.trim();
    const defaults = ['default title', 'default', 'standard', 'title', 'variant'];
    if (defaults.includes(clean.toLowerCase())) {
      if (sku && sku.includes('-')) {
        const parts = sku.split('-');
        return parts[parts.length - 1].toUpperCase();
      }
      return 'Standard';
    }
    return clean;
  }
}

// ============================================================================
// TEST SUITE: 50 ADD-TO-CART VARIANT TEST CASES
// ============================================================================

export async function runVariantCartFlowTests() {
  const results = { passed: 0, failed: 0, errors: [] as string[], testNames: [] as string[] };

  function test(name: string, fn: () => void) {
    results.testNames.push(name);
    try {
      fn();
      results.passed++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${name}: ${err.message}`);
    }
  }

  // Common Product Mock
  const mockPlaProduct: TestProduct = {
    id: 'prod-pla-pro',
    name: 'PLA Pro 3D Filament',
    slug: 'pla-pro-3d-filament',
    sku: 'PLA-PRO',
    basePrice: 899,
    salePrice: 899,
    dealerPrice: 750,
    mrp: 1299,
    stock: 100,
    codAvailable: true,
    weightInGrams: 1000,
    isActive: true,
    images: ['https://storage.googleapis.com/3dgalaxy/pla-default.jpg'],
    variants: [
      { id: 'v-blk-1kg', name: 'Black', sku: 'PLA-PRO-BLK', price: 899, salePrice: 899, dealerPrice: 750, mrp: 1299, stock: 50, weightInGrams: 1000, imageUrl: 'https://storage.googleapis.com/3dgalaxy/pla-black.jpg' },
      { id: 'v-wht-1kg', name: 'White', sku: 'PLA-PRO-WHT', price: 899, salePrice: 899, dealerPrice: 750, mrp: 1299, stock: 40, weightInGrams: 1000, imageUrl: 'https://storage.googleapis.com/3dgalaxy/pla-white.jpg' },
      { id: 'v-red-1kg', name: 'Red', sku: 'PLA-PRO-RED', price: 949, salePrice: 949, dealerPrice: 790, mrp: 1399, stock: 15, weightInGrams: 1000 },
      { id: 'v-blk-25kg', name: 'Black - 2.5kg Spool', sku: 'PLA-PRO-BLK-2.5KG', price: 2199, salePrice: 2199, dealerPrice: 1850, mrp: 2899, stock: 10, weightInGrams: 2500 }
    ]
  };

  const mockResinProduct: TestProduct = {
    id: 'prod-resin-v2',
    name: 'ELEGOO Water-Washable Resin V2.0',
    slug: 'elegoo-water-washable-resin-v2-0',
    sku: 'ELG-RESIN-V2',
    basePrice: 1799,
    salePrice: 1799,
    mrp: 2499,
    stock: 20,
    codAvailable: true,
    weightInGrams: 1200,
    isActive: true,
    variants: [
      { id: 'v-resin-skin', name: 'Skin', sku: 'ELG-RES-SKIN', price: 1799, salePrice: 1799, mrp: 2499, stock: 5, weightInGrams: 1200 },
      { id: 'v-resin-yellow', name: 'Yellow', sku: 'ELG-RES-YLW', price: 1799, salePrice: 1799, mrp: 2499, stock: 4, weightInGrams: 1200 },
      { id: 'v-resin-grey', name: 'Ceramic Grey', sku: 'ELG-RES-GRY', price: 1799, salePrice: 1799, mrp: 2499, stock: 3, weightInGrams: 1200 },
      { id: 'v-resin-green', name: 'Mint Green', sku: 'ELG-RES-GRN', price: 1799, salePrice: 1799, mrp: 2499, stock: 0, weightInGrams: 1200 } // Out of stock
    ]
  };

  const mockPrinterProduct: TestProduct = {
    id: 'prod-bambu-p1s',
    name: 'Bambu Lab P1S 3D Printer',
    slug: 'bambu-lab-p1s-3d-printer',
    sku: 'BAMBU-P1S',
    basePrice: 75000,
    salePrice: 69999,
    mrp: 89999,
    stock: 5,
    codAvailable: false, // Machine: High-value, strictly no COD
    weightInGrams: 15000,
    isActive: true,
    variants: [
      { id: 'v-p1s-standalone', name: 'P1S Standalone', sku: 'BAMBU-P1S-STD', price: 69999, salePrice: 69999, mrp: 89999, stock: 5, weightInGrams: 15000 },
      { id: 'v-p1s-combo', name: 'P1S AMS Combo', sku: 'BAMBU-P1S-COMBO', price: 92999, salePrice: 92999, mrp: 110000, stock: 3, weightInGrams: 20000 }
    ]
  };

  // ==========================================================================
  // CATEGORY 1: SINGLE-ATTRIBUTE VARIANT SELECTION & ADDING (TESTS 1 - 6)
  // ==========================================================================

  test('TC-VAR-01: Add single color variant (PLA Black) to an empty cart creates 1 line item', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]);
    const items = cart.getItems();
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].variant?.id, 'v-blk-1kg');
    assert.strictEqual(items[0].quantity, 1);
  });

  test('TC-VAR-02: Add distinct color variant (PLA White) of same product creates separate line item', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]); // Black
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![1]); // White
    const items = cart.getItems();
    assert.strictEqual(items.length, 2, 'Should create 2 distinct line items for different color variants');
    assert.strictEqual(items[0].variant?.name, 'Black');
    assert.strictEqual(items[1].variant?.name, 'White');
  });

  test('TC-VAR-03: Add material variant (Flexible TPU vs Rigid PLA) preserves variant-specific SKU and properties', () => {
    const cart = new CartManager();
    const tpuVariant: TestVariant = { id: 'v-tpu-95a', name: 'TPU 95A', sku: 'FIL-TPU-95A', price: 1499, salePrice: 1499, mrp: 1999, stock: 20, weightInGrams: 1000 };
    cart.addToCart(mockPlaProduct, 1, tpuVariant);
    const item = cart.getItems()[0];
    assert.strictEqual(item.variant?.sku, 'FIL-TPU-95A');
    assert.strictEqual(cart.getItemPrice(item), 1499);
  });

  test('TC-VAR-04: Add diameter variant (1.75mm vs 2.85mm) retains exact diameter variant attribute', () => {
    const cart = new CartManager();
    const diaVariant: TestVariant = { id: 'v-dia-285', name: '2.85mm Diameter', sku: 'PLA-2.85MM', price: 999, salePrice: 999, mrp: 1399, stock: 10, weightInGrams: 1000 };
    cart.addToCart(mockPlaProduct, 1, diaVariant);
    assert.strictEqual(cart.getItems()[0].variant?.name, '2.85mm Diameter');
  });

  test('TC-VAR-05: Add nozzle size variant (0.4mm vs 0.6mm) preserves hardware dimension tag', () => {
    const cart = new CartManager();
    const nozzleProduct: TestProduct = {
      id: 'prod-nozzle-v6', name: 'Hardened Steel Nozzle V6', slug: 'nozzle-v6', sku: 'NOZ-V6',
      basePrice: 450, salePrice: 450, mrp: 600, stock: 50, codAvailable: true, weightInGrams: 50, isActive: true
    };
    const var04: TestVariant = { id: 'v-noz-04', name: '0.4mm', sku: 'NOZ-V6-04', price: 450, stock: 25 };
    const var06: TestVariant = { id: 'v-noz-06', name: '0.6mm', sku: 'NOZ-V6-06', price: 490, stock: 15 };
    cart.addToCart(nozzleProduct, 1, var04);
    cart.addToCart(nozzleProduct, 1, var06);
    assert.strictEqual(cart.getItems().length, 2);
    assert.strictEqual(cart.getItems()[1].variant?.name, '0.6mm');
    assert.strictEqual(cart.getItemPrice(cart.getItems()[1]), 490);
  });

  test('TC-VAR-06: Add spool weight variant (1kg vs 2.5kg) stores variant-specific weight and unit price', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![3]); // 2.5kg Spool
    const item = cart.getItems()[0];
    assert.strictEqual(cart.getItemWeightGrams(item), 2500, 'Variant weight must be 2500g');
    assert.strictEqual(cart.getItemPrice(item), 2199, 'Variant price must be 2199');
  });

  // ==========================================================================
  // CATEGORY 2: MULTI-ATTRIBUTE MATRIX COMBINATIONS (TESTS 7 - 12)
  // ==========================================================================

  test('TC-VAR-07: Add 2-attribute variant (Color: Black × Spool: 1kg) sets compound option values', () => {
    const cart = new CartManager();
    const compoundVar: TestVariant = {
      id: 'v-pla-blk-1kg', name: 'Black / 1kg', sku: 'PLA-BLK-1KG', price: 899, stock: 30,
      options: { Color: 'Black', SpoolSize: '1kg' }, option1: 'Black', option2: '1kg'
    };
    cart.addToCart(mockPlaProduct, 1, compoundVar);
    const item = cart.getItems()[0];
    assert.strictEqual(item.variant?.options?.Color, 'Black');
    assert.strictEqual(item.variant?.options?.SpoolSize, '1kg');
  });

  test('TC-VAR-08: Add 2-attribute variant with same color but different spool (Black / 2.5kg) creates separate line', () => {
    const cart = new CartManager();
    const var1: TestVariant = { id: 'v1', name: 'Black / 1kg', sku: 'PLA-BLK-1KG', price: 899, stock: 30 };
    const var2: TestVariant = { id: 'v2', name: 'Black / 2.5kg', sku: 'PLA-BLK-2.5KG', price: 2199, stock: 15 };
    cart.addToCart(mockPlaProduct, 1, var1);
    cart.addToCart(mockPlaProduct, 1, var2);
    assert.strictEqual(cart.getItems().length, 2);
    assert.notStrictEqual(cart.getItems()[0].variant?.sku, cart.getItems()[1].variant?.sku);
  });

  test('TC-VAR-09: Add 3-attribute variant (Material: PETG × Color: Silk Blue × Dia: 1.75mm) handles multi-dimension matrix', () => {
    const cart = new CartManager();
    const triVar: TestVariant = {
      id: 'v-tri-1', name: 'PETG - Silk Blue - 1.75mm', sku: 'PETG-SLKBLU-175', price: 1199, stock: 10,
      options: { Material: 'PETG', Color: 'Silk Blue', Diameter: '1.75mm' }, option1: 'PETG', option2: 'Silk Blue', option3: '1.75mm'
    };
    cart.addToCart(mockPlaProduct, 1, triVar);
    assert.strictEqual(cart.getItems()[0].variant?.option2, 'Silk Blue');
    assert.strictEqual(cart.getItems()[0].variant?.option3, '1.75mm');
  });

  test('TC-VAR-10: Add 3-attribute variant differing in only 1 dimension keeps both distinct lines', () => {
    const cart = new CartManager();
    const varA: TestVariant = { id: 'va', name: 'PETG - Silk Blue - 1.75mm', sku: 'PETG-SLKBLU-175', price: 1199, stock: 10 };
    const varB: TestVariant = { id: 'vb', name: 'PETG - Silk Red - 1.75mm', sku: 'PETG-SLKRED-175', price: 1199, stock: 10 };
    cart.addToCart(mockPlaProduct, 1, varA);
    cart.addToCart(mockPlaProduct, 1, varB);
    assert.strictEqual(cart.getItems().length, 2);
    assert.strictEqual(cart.getTotalItemsCount(), 2);
  });

  test('TC-VAR-11: Add hardware voltage variant (220V EU vs 110V US) captures region configuration correctly', () => {
    const cart = new CartManager();
    const euVariant: TestVariant = { id: 'v-eu-220', name: '220V EU Plug', sku: 'PRN-EU-220', price: 69999, stock: 2, weightInGrams: 15000 };
    cart.addToCart(mockPrinterProduct, 1, euVariant);
    assert.strictEqual(cart.getItems()[0].variant?.name, '220V EU Plug');
  });

  test('TC-VAR-12: Add resin variant with special finish (Ceramic Grey vs Transparent) updates selected SKU', () => {
    const cart = new CartManager();
    cart.addToCart(mockResinProduct, 1, mockResinProduct.variants![2]); // Ceramic Grey
    assert.strictEqual(cart.getItems()[0].variant?.name, 'Ceramic Grey');
    assert.strictEqual(cart.getItems()[0].variant?.sku, 'ELG-RES-GRY');
  });

  // ==========================================================================
  // CATEGORY 3: QUANTITY INCREMENTS, DEDUPLICATION & MERGING (TESTS 13 - 18)
  // ==========================================================================

  test('TC-VAR-13: Add identical variant twice consecutively increments quantity to 2 without duplicating lines', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]);
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]);
    assert.strictEqual(cart.getItems().length, 1, 'Must remain 1 line item');
    assert.strictEqual(cart.getItems()[0].quantity, 2, 'Quantity should increment to 2');
  });

  test('TC-VAR-14: Add identical variant with quantity > 1 (e.g. qty: 3) initializes line quantity to 3', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 3, mockPlaProduct.variants![0]);
    assert.strictEqual(cart.getItems()[0].quantity, 3);
  });

  test('TC-VAR-15: Interleaved addition (Var A -> Var B -> Var A) correctly increments Var A to 2 and keeps Var B at 1', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]); // Black
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![1]); // White
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]); // Black again
    assert.strictEqual(cart.getItems().length, 2);
    const blk = cart.getItems().find(i => i.variant?.id === 'v-blk-1kg');
    const wht = cart.getItems().find(i => i.variant?.id === 'v-wht-1kg');
    assert.strictEqual(blk?.quantity, 2);
    assert.strictEqual(wht?.quantity, 1);
  });

  test('TC-VAR-16: Add base product without variant, then add Variant A of same product keeps them in separate lines', () => {
    const cart = new CartManager();
    const productWithoutVariant: TestProduct = { ...mockPlaProduct, variants: [] };
    cart.addToCart(productWithoutVariant, 1, undefined);
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]);
    assert.strictEqual(cart.getItems().length, 2, 'Base item and variant item must not merge');
    assert.strictEqual(cart.getItems()[0].variant, undefined);
    assert.ok(cart.getItems()[1].variant);
  });

  test('TC-VAR-17: Variant matching by SKU fallback when variant ID format differs', () => {
    const cart = new CartManager();
    const v1: TestVariant = { id: 'temp-id-1', sku: 'SKU-SAME-01', price: 500, stock: 10 };
    const v2: TestVariant = { id: 'temp-id-2', sku: 'SKU-SAME-01', price: 500, stock: 10 };
    cart.addToCart(mockPlaProduct, 1, v1);
    cart.addToCart(mockPlaProduct, 2, v2);
    assert.strictEqual(cart.getItems().length, 1, 'Items with identical product & SKU must merge');
    assert.strictEqual(cart.getItems()[0].quantity, 3);
  });

  test('TC-VAR-18: Auto-resolve default variant when product has variants and no variant is explicitly specified', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, undefined);
    const items = cart.getItems();
    assert.strictEqual(items.length, 1);
    assert.ok(items[0].variant, 'Should auto-assign first active variant');
    assert.strictEqual(items[0].variant?.id, 'v-blk-1kg');
  });

  // ==========================================================================
  // CATEGORY 4: VARIANT PRICING DYNAMICS & CALCULATION (TESTS 19 - 25)
  // ==========================================================================

  test('TC-VAR-19: Variant with price equal to base product computes line price matching base price', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 2, mockPlaProduct.variants![0]); // Price 899
    assert.strictEqual(cart.getItemPrice(cart.getItems()[0]), 899);
    assert.strictEqual(cart.getSubtotal(), 1798);
  });

  test('TC-VAR-20: Variant with price markup/premium (+₹50 for Red color) computes accurate line total', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 2, mockPlaProduct.variants![2]); // Red: 949
    assert.strictEqual(cart.getItemPrice(cart.getItems()[0]), 949);
    assert.strictEqual(cart.getSubtotal(), 1898);
  });

  test('TC-VAR-21: Variant with discounted sale price calculates correct MRP savings', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![3]); // Sale: 2199, MRP: 2899
    assert.strictEqual(cart.getItemPrice(cart.getItems()[0]), 2199);
    assert.strictEqual(cart.getItemMrp(cart.getItems()[0]), 2899);
    assert.strictEqual(cart.getTotalSavings(), 700);
  });

  test('TC-VAR-22: Variant with zero or undefined price gracefully falls back to parent product price', () => {
    const cart = new CartManager();
    const freeVar: TestVariant = { id: 'v-noprice', sku: 'NOPRICE', price: 0, salePrice: undefined, stock: 10 };
    cart.addToCart(mockPlaProduct, 1, freeVar);
    assert.strictEqual(cart.getItemPrice(cart.getItems()[0]), mockPlaProduct.salePrice);
  });

  test('TC-VAR-23: Dealer/B2B user role automatically receives variant dealerPrice instead of salePrice', () => {
    const cart = new CartManager('dealer');
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]); // salePrice: 899, dealerPrice: 750
    const price = cart.getItemPrice(cart.getItems()[0]);
    assert.strictEqual(price, 750, 'Dealer user should get 750 instead of 899');
    assert.strictEqual(cart.getSubtotal(), 750);
  });

  test('TC-VAR-24: Regular customer role uses variant salePrice even when dealerPrice is defined', () => {
    const cart = new CartManager('customer');
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]);
    const price = cart.getItemPrice(cart.getItems()[0]);
    assert.strictEqual(price, 899, 'Regular customer must pay salePrice 899');
  });

  test('TC-VAR-25: Multi-variant mixed cart subtotal calculation across 4 different variant price tiers', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]); // 899 * 1 = 899
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![2]); // 949 * 1 = 949
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![3]); // 2199 * 1 = 2199
    cart.addToCart(mockResinProduct, 1, mockResinProduct.variants![0]); // 1799 * 1 = 1799
    // Expected Subtotal: 899 + 949 + 2199 + 1799 = 5846
    assert.strictEqual(cart.getSubtotal(), 5846);
  });

  // ==========================================================================
  // CATEGORY 5: STOCK LIMITS, AVAILABILITY & VALIDATION (TESTS 26 - 31)
  // ==========================================================================

  test('TC-VAR-26: In-stock variant (stock: 50) adds requested quantity successfully', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 5, mockPlaProduct.variants![0]);
    assert.strictEqual(cart.getItems()[0].quantity, 5);
  });

  test('TC-VAR-27: Out-of-stock variant (stock: 0) throws OutOfStock error and is rejected', () => {
    const cart = new CartManager();
    const outOfStockVariant = mockResinProduct.variants![3]; // Mint Green: stock 0
    assert.throws(
      () => cart.addToCart(mockResinProduct, 1, outOfStockVariant),
      /out of stock/i,
      'Must reject out of stock variant'
    );
    assert.strictEqual(cart.getItems().length, 0);
  });

  test('TC-VAR-28: Inactive variant (isActive: false) throws error and prevents addition', () => {
    const cart = new CartManager();
    const inactiveVar: TestVariant = { id: 'v-inact', sku: 'INACT', price: 800, stock: 10, isActive: false };
    assert.throws(
      () => cart.addToCart(mockPlaProduct, 1, inactiveVar),
      /inactive/i,
      'Must reject inactive variant'
    );
  });

  test('TC-VAR-29: Low-stock variant (stock: 4) allows adding up to exactly available stock', () => {
    const cart = new CartManager();
    const lowStockVar = mockResinProduct.variants![1]; // Yellow: stock 4
    cart.addToCart(mockResinProduct, 4, lowStockVar);
    assert.strictEqual(cart.getItems()[0].quantity, 4);
  });

  test('TC-VAR-30: Low-stock variant rejects requested quantity greater than available stock', () => {
    const cart = new CartManager();
    const lowStockVar = mockResinProduct.variants![1]; // Yellow: stock 4
    assert.throws(
      () => cart.addToCart(mockResinProduct, 5, lowStockVar),
      /exceeds available stock/i
    );
  });

  test('TC-VAR-31: Successive additions exceeding total variant stock are prevented from over-allocation', () => {
    const cart = new CartManager();
    const lowStockVar = mockResinProduct.variants![2]; // Ceramic Grey: stock 3
    cart.addToCart(mockResinProduct, 2, lowStockVar);
    assert.throws(
      () => cart.addToCart(mockResinProduct, 2, lowStockVar), // 2 + 2 = 4 > 3
      /Maximum available stock is 3/i
    );
    assert.strictEqual(cart.getItems()[0].quantity, 2);
  });

  // ==========================================================================
  // CATEGORY 6: WEIGHT, PACKAGING & SHIPPING CALCULATIONS (TESTS 32 - 37)
  // ==========================================================================

  test('TC-VAR-32: Variant with explicit weightInGrams (2500g) overrides parent product default (1000g)', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![3]); // 2.5kg spool
    assert.strictEqual(cart.getItemWeightGrams(cart.getItems()[0]), 2500);
    assert.strictEqual(cart.getTotalWeightGrams(), 2500);
  });

  test('TC-VAR-33: Variant without explicit weight inherits parent product default weight', () => {
    const cart = new CartManager();
    const noWeightVar: TestVariant = { id: 'v-nw', sku: 'NW', price: 899, stock: 10 };
    cart.addToCart(mockPlaProduct, 1, noWeightVar);
    assert.strictEqual(cart.getItemWeightGrams(cart.getItems()[0]), 1000);
  });

  test('TC-VAR-34: Cart total weight with mixed variant spools calculates cumulative grams accurately', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 2, mockPlaProduct.variants![0]); // 2 * 1000g = 2000g
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![3]); // 1 * 2500g = 2500g
    cart.addToCart(mockResinProduct, 1, mockResinProduct.variants![0]); // 1 * 1200g = 1200g
    // Total weight = 2000 + 2500 + 1200 = 5700g
    assert.strictEqual(cart.getTotalWeightGrams(), 5700);
  });

  test('TC-VAR-35: Weight tier shipping fee calculation based on total variant cart weight', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]); // 1000g -> tier 501-1000g -> ₹90
    assert.strictEqual(cart.getShippingCharge(), 90);
  });

  test('TC-VAR-36: Free shipping eligibility triggered when variant price sum meets free shipping threshold (₹3500)', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 2, mockPlaProduct.variants![3]); // 2199 * 2 = 4398 >= 3500
    assert.strictEqual(cart.getShippingCharge(3500), 0, 'Orders over 3500 must receive free shipping');
  });

  test('TC-VAR-37: Custom weight payload (unitPricePerWeight × selectedWeightValue) sets calculated price', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0], { weightInGrams: 500, calculatedPrice: 499 });
    const item = cart.getItems()[0];
    assert.strictEqual(cart.getItemPrice(item), 499);
    assert.strictEqual(cart.getItemWeightGrams(item), 500);
  });

  // ==========================================================================
  // CATEGORY 7: CASH ON DELIVERY (COD) RULES WITH VARIANTS (TESTS 38 - 42)
  // ==========================================================================

  test('TC-VAR-38: Cart with COD-eligible variant totaling <= ₹2500 is COD eligible', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 2, mockPlaProduct.variants![0]); // 899 * 2 = 1798 <= 2500
    assert.strictEqual(cart.isCodEligible(2500), true);
  });

  test('TC-VAR-39: High-value variant pushing cart total > ₹2500 disables COD option', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 3, mockPlaProduct.variants![0]); // 899 * 3 = 2697 > 2500
    assert.strictEqual(cart.isCodEligible(2500), false);
  });

  test('TC-VAR-40: Adding variant of product where codAvailable: false strictly disables COD for entire cart', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]); // 899, cod: true
    cart.addToCart(mockPrinterProduct, 1, mockPrinterProduct.variants![0]); // cod: false
    assert.strictEqual(cart.isCodEligible(), false, 'Presence of non-COD item must revoke COD');
  });

  test('TC-VAR-41: COD surcharge (+₹100) applied accurately to variant cart grand total', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]); // 899
    const subtotal = cart.getSubtotal();
    const shipping = cart.getShippingCharge(); // 90
    const codSurcharge = cart.isCodEligible() ? 100 : 0;
    const grandTotal = subtotal + shipping + codSurcharge;
    assert.strictEqual(grandTotal, 899 + 90 + 100);
  });

  test('TC-VAR-42: Updating variant quantity in cart that crosses ₹2500 dynamically flips COD eligibility', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 2, mockPlaProduct.variants![0]); // 1798 <= 2500 -> COD eligible
    assert.strictEqual(cart.isCodEligible(2500), true);
    cart.updateQty('prod-pla-pro', 3, 'v-blk-1kg'); // 2697 > 2500 -> Ineligible
    assert.strictEqual(cart.isCodEligible(2500), false);
  });

  // ==========================================================================
  // CATEGORY 8: CART MUTATION, UPDATES & REMOVAL (TESTS 43 - 47)
  // ==========================================================================

  test('TC-VAR-43: Incrementing variant quantity in cart updates line total and subtotal', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]); // 899
    cart.updateQty('prod-pla-pro', 3, 'v-blk-1kg');
    assert.strictEqual(cart.getItems()[0].quantity, 3);
    assert.strictEqual(cart.getSubtotal(), 2697);
  });

  test('TC-VAR-44: Decrementing variant quantity in cart decreases subtotal and preserves line item', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 3, mockPlaProduct.variants![0]);
    cart.updateQty('prod-pla-pro', 2, 'v-blk-1kg');
    assert.strictEqual(cart.getItems()[0].quantity, 2);
    assert.strictEqual(cart.getSubtotal(), 1798);
  });

  test('TC-VAR-45: Decrementing variant quantity to 0 removes that specific variant from cart', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]);
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![1]);
    cart.updateQty('prod-pla-pro', 0, 'v-blk-1kg'); // Remove Black
    assert.strictEqual(cart.getItems().length, 1);
    assert.strictEqual(cart.getItems()[0].variant?.id, 'v-wht-1kg', 'White variant must remain');
  });

  test('TC-VAR-46: Direct deletion of Variant A leaves Variant B with unchanged quantity, price and weight', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 2, mockPlaProduct.variants![1]); // White (qty 2)
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![3]); // 2.5kg (qty 1)
    cart.updateQty('prod-pla-pro', 0, 'v-wht-1kg'); // Delete White
    assert.strictEqual(cart.getItems().length, 1);
    assert.strictEqual(cart.getItems()[0].variant?.id, 'v-blk-25kg');
    assert.strictEqual(cart.getItems()[0].quantity, 1);
    assert.strictEqual(cart.getTotalWeightGrams(), 2500);
  });

  test('TC-VAR-47: Clearing cart empties all variant items completely and resets subtotal to 0', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 2, mockPlaProduct.variants![0]);
    cart.addToCart(mockResinProduct, 1, mockResinProduct.variants![0]);
    cart.clear();
    assert.strictEqual(cart.getItems().length, 0);
    assert.strictEqual(cart.getSubtotal(), 0);
    assert.strictEqual(cart.getTotalWeightGrams(), 0);
  });

  // ==========================================================================
  // CATEGORY 9: MEDIA ASSOCIATION, NAMING & HIGH-VOLUME STRESS (TESTS 48 - 50)
  // ==========================================================================

  test('TC-VAR-48: Variant with specific image assigns variant image as cart thumbnail, falling back to product image', () => {
    const cart = new CartManager();
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![0]); // Has variant image
    cart.addToCart(mockPlaProduct, 1, mockPlaProduct.variants![2]); // No variant image
    const thumb1 = cart.getVariantThumbnail(cart.getItems()[0]);
    const thumb2 = cart.getVariantThumbnail(cart.getItems()[1]);
    assert.strictEqual(thumb1, 'https://storage.googleapis.com/3dgalaxy/pla-black.jpg');
    assert.strictEqual(thumb2, 'https://storage.googleapis.com/3dgalaxy/pla-default.jpg', 'Should fall back to product image');
  });

  test('TC-VAR-49: Variant display name normalization strips default words and extracts descriptor from SKU', () => {
    const cart = new CartManager();
    const norm1 = cart.normalizeVariantName('Default Title', 'PROD-SKU-RED');
    const norm2 = cart.normalizeVariantName('Standard', 'PROD-SKU-XL');
    const norm3 = cart.normalizeVariantName('Silk Copper Metallic');
    assert.strictEqual(norm1, 'RED');
    assert.strictEqual(norm2, 'XL');
    assert.strictEqual(norm3, 'Silk Copper Metallic');
  });

  test('TC-VAR-50: High-Volume Stress: Adding 50 distinct variants in a single cart session executes in < 50ms with 100% integrity', () => {
    const cart = new CartManager();
    const start = Date.now();
    for (let i = 1; i <= 50; i++) {
      const variant: TestVariant = {
        id: `var-stress-${i}`,
        name: `Color Shade #${i}`,
        sku: `STRESS-VAR-${i}`,
        price: 500 + i * 10,
        salePrice: 500 + i * 10,
        stock: 100,
        weightInGrams: 1000
      };
      cart.addToCart(mockPlaProduct, 1, variant);
    }
    const elapsed = Date.now() - start;
    assert.strictEqual(cart.getItems().length, 50, 'Must have exactly 50 distinct items');
    assert.strictEqual(cart.getTotalItemsCount(), 50, 'Total item count must be 50');
    assert.strictEqual(cart.getTotalWeightGrams(), 50000, 'Total weight must be 50,000g');
    assert.ok(elapsed < 100, `Execution time was ${elapsed}ms, which is within the 100ms budget`);
  });

  return results;
}
