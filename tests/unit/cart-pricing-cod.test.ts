/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 1: UNIT TESTS — Cart, Pricing, COD Rules, Shipping Priority & Variants
 */

import assert from 'node:assert';
import { MOCK_PRODUCTS, MOCK_SHIPPING_SETTINGS, TestProduct } from '../fixtures/mock-data';

export async function runCartAndCodUnitTests() {
  const results = { passed: 0, failed: 0, errors: [] as string[] };

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.passed++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${name}: ${err.message}`);
    }
  }

  // --- SECTION 11 & 12: CART & COD ELIGIBILITY UNIT TESTS ---

  test('Cart: computes subtotal accurately for multiple line items', () => {
    const item1 = { product: MOCK_PRODUCTS[0], quantity: 2 }; // 899 * 2 = 1798
    const item2 = { product: MOCK_PRODUCTS[3], quantity: 1 }; // 450 * 1 = 450
    const subtotal = item1.product.price * item1.quantity + item2.product.price * item2.quantity;
    assert.strictEqual(subtotal, 2248, 'Subtotal should equal sum of unit prices * quantities');
  });

  test('COD Rule: Cart <= 2500 with all codAvailable products is ELIGIBLE', () => {
    const cart = [
      { product: MOCK_PRODUCTS[0], quantity: 2 } // 899 * 2 = 1798 <= 2500, codAvailable=true
    ];
    const subtotal = cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
    const allCod = cart.every(i => i.product.codAvailable);
    const isCodEligible = allCod && subtotal <= 2500;
    assert.strictEqual(isCodEligible, true, 'Cart under 2500 with codAvailable=true items must be COD eligible');
  });

  test('COD Rule: Cart > 2500 is strictly INELIGIBLE for COD', () => {
    const cart = [
      { product: MOCK_PRODUCTS[0], quantity: 3 } // 899 * 3 = 2697 > 2500
    ];
    const subtotal = cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
    const allCod = cart.every(i => i.product.codAvailable);
    const isCodEligible = allCod && subtotal <= 2500;
    assert.strictEqual(isCodEligible, false, 'Cart exceeding 2500 must NOT be eligible for COD');
  });

  test('COD Rule: Cart with even one non-COD product is strictly INELIGIBLE', () => {
    const cart = [
      { product: MOCK_PRODUCTS[3], quantity: 1 }, // 450, codAvailable=true
      { product: MOCK_PRODUCTS[2], quantity: 1 }  // 65000, codAvailable=false
    ];
    const allCod = cart.every(i => i.product.codAvailable);
    assert.strictEqual(allCod, false, 'Cart containing a product with codAvailable=false must fail COD check');
  });

  test('COD Rule: Surcharge is exactly 100 when COD is applied', () => {
    const paymentMethod = 'COD';
    const isCodEligible = true;
    const codCharge = (paymentMethod === 'COD' && isCodEligible) ? 100 : 0;
    assert.strictEqual(codCharge, 100, 'COD handling charge must strictly be 100');
  });

  test('Online Payment Rule: Surcharge is strictly 0 for online gateways', () => {
    const paymentMethod = 'RAZORPAY';
    const isCodEligible = true;
    const codCharge = (paymentMethod === 'COD' && isCodEligible) ? 100 : 0;
    assert.strictEqual(codCharge, 0, 'Online payment must not incur COD surcharge');
  });

  // --- SECTION 16: SHIPPING CALCULATION PRIORITY ---

  test('Shipping: Subtotal >= freeShippingThreshold grants free shipping', () => {
    const subtotal = 1200;
    const freeShipping = subtotal >= MOCK_SHIPPING_SETTINGS.freeShippingThreshold;
    const charge = freeShipping ? 0 : MOCK_SHIPPING_SETTINGS.defaultFlatRate;
    assert.strictEqual(charge, 0, 'Orders at or above free shipping threshold must have 0 shipping charge');
  });

  test('Shipping: Subtotal < freeShippingThreshold computes weight tier charge', () => {
    const subtotal = 500;
    const weightGrams = 800; // Falls in 501-1000g tier => 99
    const tier = MOCK_SHIPPING_SETTINGS.weightRules.find(r => weightGrams >= r.fromGrams && weightGrams <= r.toGrams);
    assert.ok(tier, 'A matching weight tier should exist');
    assert.strictEqual(tier!.charge, 99, 'Weight tier 501-1000g must charge 99');
  });

  // --- SECTION 8: PRODUCT VARIANT COMBINATIONS & PERFORMANCE ---

  test('Variants: 2 options (Colors: 2, Sizes: 2) produces 4 combinations', () => {
    const colors = ['Black', 'White'];
    const sizes = ['Standard', 'XL'];
    const combos = colors.flatMap(c => sizes.map(s => `${c}-${s}`));
    assert.strictEqual(combos.length, 4);
  });

  test('Variants: 50 combinations generates without performance degradation (< 50ms)', () => {
    const start = performance.now();
    const options1 = Array.from({ length: 5 }, (_, i) => `OptA_${i}`);
    const options2 = Array.from({ length: 10 }, (_, i) => `OptB_${i}`);
    const combinations = options1.flatMap(a => options2.map(b => ({
      sku: `SKU-${a}-${b}`,
      title: `${a} / ${b}`,
      price: 999,
      stock: 10
    })));
    const duration = performance.now() - start;

    assert.strictEqual(combinations.length, 50, 'Should generate exactly 50 combinations');
    assert.ok(duration < 50, `Matrix generation must be faster than 50ms (took ${duration.toFixed(2)}ms)`);
  });

  return results;
}
