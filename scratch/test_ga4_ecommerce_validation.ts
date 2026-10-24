import {
  validateEcommercePayload,
  sanitizeAnalyticsPayload,
  sanitizeAnalyticsItem,
  mapProductToAnalyticsItem,
  mapCartItemToAnalyticsItem
} from '../src/app/core/analytics/analytics.utils';

function runValidationTests() {
  console.log('--- RUNNING GA4 ECOMMERCE VALIDATION TESTS ---');

  // Test 1: Valid purchase event with actual product data
  const validPurchase = {
    transaction_id: 'ORD-2026-9921',
    value: 2999.00,
    currency: 'INR',
    tax: 539.82,
    shipping: 150.00,
    coupon: 'SAVE10',
    items: [
      {
        item_id: 'PLA-BLK-1KG',
        item_name: 'Premium PLA Filament 1KG Black',
        price: 999.00,
        quantity: 2,
        item_category: 'Filaments'
      },
      {
        item_id: 'NOZZLE-04',
        item_name: 'Hardened Steel Nozzle 0.4mm',
        price: 1001.00,
        quantity: 1,
        item_category: 'Spare Parts'
      }
    ]
  };

  const res1 = validateEcommercePayload('purchase', validPurchase);
  console.log('Test 1 (Valid Purchase):', res1.valid ? 'PASSED' : 'FAILED', res1.issues);
  if (!res1.valid) throw new Error('Test 1 failed');

  // Test 2: Purchase value mismatch with sum(price * qty)
  const mismatchPurchase = {
    ...validPurchase,
    value: 5000.00 // Intentionally incorrect: items sum is 2999
  };
  const res2 = validateEcommercePayload('purchase', mismatchPurchase);
  console.log('Test 2 (Value Mismatch Detected):', !res2.valid ? 'PASSED' : 'FAILED', res2.issues);
  if (res2.valid) throw new Error('Test 2 should have caught value mismatch');

  // Test 3: Missing transaction_id
  const noTxPurchase = {
    ...validPurchase,
    transaction_id: ''
  };
  const res3 = validateEcommercePayload('purchase', noTxPurchase);
  console.log('Test 3 (Missing Transaction ID Detected):', !res3.valid ? 'PASSED' : 'FAILED', res3.issues);
  if (res3.valid) throw new Error('Test 3 should have failed due to missing transaction_id');

  // Test 4: Internal parameters in payload
  const internalParamPayload = {
    ...validPurchase,
    '_user_agent_architecture': 'x86_64',
    '_&rcb': '12345'
  };
  const res4 = validateEcommercePayload('purchase', internalParamPayload);
  console.log('Test 4 (Internal Forbidden Params Detected):', !res4.valid ? 'PASSED' : 'FAILED', res4.issues);
  if (res4.valid) throw new Error('Test 4 should have rejected internal parameters');

  // Test 5: Sanitizer strips internal parameters
  const sanitized = sanitizeAnalyticsPayload(internalParamPayload);
  console.log('Test 5 (Sanitizer Strips Internal Params):',
    !('_user_agent_architecture' in sanitized) && !('_&rcb' in sanitized) ? 'PASSED' : 'FAILED'
  );
  if ('_user_agent_architecture' in sanitized || '_&rcb' in sanitized) {
    throw new Error('Test 5 sanitizer failed to strip internal params');
  }

  // Test 6: mapProductToAnalyticsItem maps correctly
  const mockProduct = {
    id: 'prod-bambu-x1c',
    name: 'Bambu Lab X1-Carbon 3D Printer',
    salePrice: 125000,
    category: { name: '3D Printers' },
    brand: { name: 'Bambu Lab' }
  };
  const mappedProduct = mapProductToAnalyticsItem(mockProduct, 1);
  console.log('Test 6 (Product Mapping):',
    mappedProduct.item_id === 'prod-bambu-x1c' &&
    mappedProduct.price === 125000 &&
    mappedProduct.quantity === 1 &&
    mappedProduct.item_name === 'Bambu Lab X1-Carbon 3D Printer' ? 'PASSED' : 'FAILED'
  );

  // Test 7: Valid begin_checkout event
  const checkoutPayload = {
    currency: 'INR',
    value: 2999.00,
    items: validPurchase.items
  };
  const res7 = validateEcommercePayload('begin_checkout', checkoutPayload);
  console.log('Test 7 (Valid Checkout):', res7.valid ? 'PASSED' : 'FAILED', res7.issues);
  if (!res7.valid) throw new Error('Test 7 failed');

  console.log('--- ALL GA4 ECOMMERCE VALIDATION TESTS PASSED SUCCESSFULLY ---');
}

runValidationTests();
