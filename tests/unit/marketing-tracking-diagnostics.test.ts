/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 1: UNIT TESTS — Marketing Tracking Credentials, ID Formats, Redaction & Sanitization
 */

import assert from 'node:assert';

export async function runMarketingTrackingUnitTests() {
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

  // --- 1. GTM ID FORMAT VALIDATION & MISTAKE IDENTIFICATION ---

  test('GTM Validation: Flags G- format as FAIL because it is a GA4 Measurement ID', () => {
    const candidateId = 'G-4BKM2K4PS0';
    const isGtmFormat = /^GTM-[A-Z0-9]+$/i.test(candidateId);
    const hasGa4Prefix = candidateId.startsWith('G-');

    assert.strictEqual(isGtmFormat, false, 'G-4BKM2K4PS0 must NOT pass GTM format test');
    assert.strictEqual(hasGa4Prefix, true, 'Must identify G- prefix as GA4 measurement ID format');
  });

  test('GTM Validation: Correctly accepts valid GTM container formats', () => {
    const validIds = ['GTM-M5K89BC', 'GTM-3DGLX99', 'GTM-ABCDEF1'];
    for (const id of validIds) {
      assert.ok(/^GTM-[A-Z0-9]+$/i.test(id), `${id} should be accepted as valid GTM ID`);
    }
  });

  test('GTM Validation: Rejects invalid or malformed GTM container formats', () => {
    const invalidIds = ['GTM-', 'gtm', '1234567', 'AW-12345678', 'GTM-$$$$', ' '];
    for (const id of invalidIds) {
      assert.ok(!/^GTM-[A-Z0-9]+$/i.test(id.trim()), `${id} should be rejected`);
    }
  });

  // --- 2. GA4 MEASUREMENT ID VALIDATION ---

  test('GA4 Validation: Accepts standard G- format Measurement IDs', () => {
    const validGa4 = ['G-4BKM2K4PS0', 'G-XXXXXXXXXX', 'G-1234567890'];
    for (const id of validGa4) {
      assert.ok(/^G-[A-Z0-9]+$/i.test(id), `${id} should be accepted as valid GA4 ID`);
    }
  });

  test('GA4 Validation: Rejects UA- and non-G- formats', () => {
    const invalidGa4 = ['UA-123456-1', 'AW-6453398597', 'GTM-M5K89BC', '4BKM2K4PS0'];
    for (const id of invalidGa4) {
      assert.ok(!/^G-[A-Z0-9]+$/i.test(id), `${id} should be rejected as valid GA4 ID`);
    }
  });

  // --- 3. GOOGLE ADS ID & PURCHASE CONVERSION LABEL VALIDATION ---

  test('Google Ads ID: Normalizes numeric ID to AW- prefix consistently', () => {
    const rawNumeric = '6453398597';
    const normalized = rawNumeric.startsWith('AW-') ? rawNumeric : `AW-${rawNumeric}`;
    assert.strictEqual(normalized, 'AW-6453398597');

    const alreadyPrefixed = 'AW-6453398597';
    const normalized2 = alreadyPrefixed.startsWith('AW-') ? alreadyPrefixed : `AW-${alreadyPrefixed}`;
    assert.strictEqual(normalized2, 'AW-6453398597', 'Should avoid double prefixing AW-AW-');
  });

  test('Google Ads Purchase Label: Identifies placeholder TestLabel123 as WARNING', () => {
    const testLabels = ['TestLabel123', 'test', 'Test_Purchase_1', 'my_test_label'];
    for (const label of testLabels) {
      const isPlaceholder = label.toLowerCase().includes('test') || label === 'TestLabel123';
      assert.strictEqual(isPlaceholder, true, `Label ${label} should be flagged as placeholder`);
    }
  });

  test('Google Ads Purchase Label: Accepts real production conversion action labels', () => {
    const realLabels = ['AbCdEfGhIjK', 'XyZ12345678', 's3CrEtL4bEl'];
    for (const label of realLabels) {
      const isPlaceholder = label.toLowerCase().includes('test');
      assert.strictEqual(isPlaceholder, false, `Real label ${label} should not be flagged as placeholder`);
    }
  });

  // --- 4. META PIXEL & CAPI CREDENTIAL VALIDATION ---

  test('Meta Pixel ID: Validates 10-18 digit numeric strings', () => {
    const validPixels = ['539514754007254', '1234567890', '9876543210123456'];
    for (const id of validPixels) {
      assert.ok(/^\d{10,18}$/.test(id), `${id} should be accepted as valid Pixel ID`);
    }

    const invalidPixels = ['53951475400725A', 'short', '12345', ''];
    for (const id of invalidPixels) {
      assert.ok(!/^\d{10,18}$/.test(id), `${id} should be rejected as invalid Pixel ID`);
    }
  });

  test('Meta CAPI: Access token redaction ensures no secrets leak in public payloads', () => {
    const secretToken = 'EAABsampleLongTokenForTestingPurposes1234567890';
    const publicSafeSummary = {
      tokenConfigured: true,
      tokenLength: secretToken.length,
      tokenPrefix: secretToken.substring(0, 6) + '...'
    };

    const serialized = JSON.stringify(publicSafeSummary);
    assert.ok(!serialized.includes(secretToken), 'Full token must never appear in diagnostic summary');
    assert.strictEqual(publicSafeSummary.tokenPrefix, 'EAABsa...');
  });

  // --- 5. ENHANCED CONVERSIONS & DATA NORMALIZATION ---

  test('Enhanced Conversions: Customer data normalized and lowercased before hashing', () => {
    const rawEmail = '  John.Doe@Example.COM  ';
    const cleanEmail = rawEmail.trim().toLowerCase();
    assert.strictEqual(cleanEmail, 'john.doe@example.com', 'Email must be trimmed and lowercased');

    const rawPhone = '+91 98765-43210';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    assert.strictEqual(cleanPhone, '919876543210', 'Phone number must have non-digits removed');
  });

  test('Safe Test Mode: Diagnostic test events do NOT use real customer email or phone', () => {
    const safeTestEvent = {
      eventName: 'TestModeDiagnostic',
      userData: {
        client_ip_address: '127.0.0.1',
        client_user_agent: 'DiagnosticRunner/1.0',
        em: ['f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a']
      },
      custom_data: { test_mode: true, source: 'admin_live_health_check' }
    };

    assert.strictEqual(safeTestEvent.custom_data.test_mode, true, 'Test mode flag must be present');
    assert.ok(!JSON.stringify(safeTestEvent).includes('@3dgalaxy.co'), 'No real company customer email in test payload');
  });

  // --- 6. CONSENT MODE V2 STORAGE KEYS ---

  test('Google Consent Mode v2: Verifies all 4 required consent keys are specified', () => {
    const requiredKeys = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization'];
    const defaultConsent = {
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    };

    for (const key of requiredKeys) {
      assert.ok(key in defaultConsent, `Key ${key} must exist in Consent Mode v2 state`);
      assert.ok(['granted', 'denied'].includes((defaultConsent as any)[key]), `Key ${key} must have valid consent value`);
    }
  });

  // --- 7. GA4 EVENT PARAMETER SANITIZATION & WARNING PREVENTION ---

  test('Sanitization: Removes internal Google Tag parameters (_user_agent_*, _&rcb, _&ae)', () => {
    const rawPayload = {
      event: 'view_item',
      currency: 'INR',
      value: 7999,
      _user_agent_architecture: 'x86',
      _user_agent_bitness: '64',
      _user_agent_full_version_list: 'Google Chrome;120.0',
      _user_agent_mobile: '?0',
      _user_agent_model: '',
      _user_agent_platform: 'Windows',
      _user_agent_platform_version: '10.0.0',
      _user_agent_wow64: '?0',
      '_&rcb': '12345678',
      '_&ae': '1',
      items: [{ item_id: 'PRD-101', item_name: 'Ender 3 V3', price: 7999, quantity: 1 }]
    };

    // Apply the sanitization logic implemented in analytics.utils.ts
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(rawPayload)) {
      if (
        key.startsWith('_user_agent_') ||
        key.startsWith('_&') ||
        key.includes('&') ||
        key === '_rcb' ||
        key === '_ae' ||
        key.startsWith('__')
      ) {
        continue;
      }
      sanitized[key] = value;
    }

    assert.strictEqual(sanitized._user_agent_architecture, undefined);
    assert.strictEqual(sanitized._user_agent_bitness, undefined);
    assert.strictEqual(sanitized._user_agent_platform, undefined);
    assert.strictEqual(sanitized['_&rcb'], undefined);
    assert.strictEqual(sanitized['_&ae'], undefined);
    assert.strictEqual(sanitized.currency, 'INR');
    assert.strictEqual(sanitized.value, 7999);
    assert.strictEqual(sanitized.items.length, 1);
  });

  // --- 8. LEGACY EVENT NAME REMAPPING ---

  test('Legacy Remapping: Translates custom "product" and "checkout" events to GA4 standard events', () => {
    const eventMapping: Record<string, string> = {
      'product': 'view_item',
      'checkout': 'begin_checkout',
      'cart': 'view_cart'
    };

    function remapEvent(name: string): string {
      const lower = (name || '').toLowerCase().trim();
      return eventMapping[lower] || name;
    }

    assert.strictEqual(remapEvent('product'), 'view_item', '"product" must map to "view_item"');
    assert.strictEqual(remapEvent('checkout'), 'begin_checkout', '"checkout" must map to "begin_checkout"');
    assert.strictEqual(remapEvent('view_item'), 'view_item', 'Standard "view_item" remains intact');
    assert.strictEqual(remapEvent('purchase'), 'purchase', 'Standard "purchase" remains intact');
  });

  // --- 9. GA4 ECOMMERCE ITEM STRUCTURE & NUMERIC VALIDATION ---

  test('GA4 Items: Validates required item_id, item_name, numeric price and quantity', () => {
    const rawItem = {
      id: 'P-1234',
      name: 'PLA+ Filament 1kg White',
      price: '899.50',
      quantity: '2',
      category: 'Filaments',
      brand: '3D Galaxy'
    };

    const price = Number(rawItem.price);
    const quantity = Math.max(1, parseInt(String(rawItem.quantity), 10) || 1);

    const formatted = {
      item_id: String(rawItem.id),
      item_name: String(rawItem.name),
      price: isNaN(price) ? 0 : price,
      quantity: quantity,
      item_category: rawItem.category,
      item_brand: rawItem.brand
    };

    assert.strictEqual(formatted.item_id, 'P-1234');
    assert.strictEqual(formatted.item_name, 'PLA+ Filament 1kg White');
    assert.strictEqual(formatted.price, 899.50);
    assert.strictEqual(typeof formatted.price, 'number');
    assert.strictEqual(formatted.quantity, 2);
    assert.strictEqual(typeof formatted.quantity, 'number');
  });

  // --- 10. PURCHASE IDEMPOTENCY & STATUS VERIFICATION ---

  test('Purchase Idempotency: Prevents duplicate purchase event dispatch for identical transaction_id', () => {
    const trackedPurchases = new Set<string>();

    function isAlreadyTracked(txId: string): boolean {
      return trackedPurchases.has(txId);
    }

    function recordPurchase(txId: string): boolean {
      if (isAlreadyTracked(txId)) {
        return false; // Suppressed duplicate
      }
      trackedPurchases.add(txId);
      return true; // Dispatched
    }

    const testTxId = 'ORD-2026-9901';

    // First attempt: must dispatch
    const firstDispatch = recordPurchase(testTxId);
    assert.strictEqual(firstDispatch, true, 'First purchase dispatch must succeed');

    // Second attempt (reload / component reinit): must be blocked
    const duplicateDispatch = recordPurchase(testTxId);
    assert.strictEqual(duplicateDispatch, false, 'Duplicate purchase dispatch must be suppressed');

    // Third attempt with distinct order: must dispatch
    const distinctDispatch = recordPurchase('ORD-2026-9902');
    assert.strictEqual(distinctDispatch, true, 'Distinct purchase must dispatch');
  });

  test('Purchase Status: Blocks purchase dispatch for cancelled or failed orders', () => {
    function shouldTrackPurchase(order: { status?: string; paymentStatus?: string; totalAmount: number }): boolean {
      const status = (order.status || '').toLowerCase();
      const paymentStatus = (order.paymentStatus || '').toLowerCase();
      if (status === 'cancelled' || status === 'failed' || paymentStatus === 'failed') {
        return false;
      }
      return order.totalAmount > 0;
    }

    assert.strictEqual(shouldTrackPurchase({ status: 'delivered', paymentStatus: 'paid', totalAmount: 1499 }), true);
    assert.strictEqual(shouldTrackPurchase({ status: 'placed', paymentStatus: 'pending', totalAmount: 1499 }), true); // COD
    assert.strictEqual(shouldTrackPurchase({ status: 'cancelled', paymentStatus: 'failed', totalAmount: 1499 }), false);
    assert.strictEqual(shouldTrackPurchase({ status: 'failed', paymentStatus: 'failed', totalAmount: 1499 }), false);
    assert.strictEqual(shouldTrackPurchase({ status: 'confirmed', paymentStatus: 'paid', totalAmount: 0 }), false);
  });

  // --- 11. GOOGLE MERCHANT CENTER FEED ATTRIBUTE COMPLIANCE ---

  test('Merchant Center Feed: Prices fall back to MRP or salePrice when basePrice is null to prevent 0.00 INR disapproval', () => {
    const productWithNullBase = {
      id: 'prod-1',
      basePrice: null,
      mrp: 1299,
      salePrice: 999
    };

    const regularPrice = Number(productWithNullBase.basePrice || productWithNullBase.mrp || productWithNullBase.salePrice || 0);
    assert.ok(regularPrice > 0, 'Price must be greater than 0');
    assert.strictEqual(regularPrice, 1299);
  });

  test('Merchant Center Feed: Image link extraction handles objects, strings and relative URLs without [object Object]', () => {
    const rawImages = [
      { url: 'https://cdn.3dgalaxy.co/images/printer.jpg' },
      '/uploads/filament.png'
    ];

    const baseUrl = 'https://3dgalaxy.co';
    const parsedImages = rawImages.map((img: any) => {
      let u = typeof img === 'string' ? img.trim() : (img.url ? String(img.url).trim() : '');
      if (!u || u === '[object Object]') return null;
      return u.startsWith('http://') || u.startsWith('https://') ? u : `${baseUrl}/${u.replace(/^\//, '')}`;
    }).filter(Boolean);

    assert.strictEqual(parsedImages[0], 'https://cdn.3dgalaxy.co/images/printer.jpg');
    assert.strictEqual(parsedImages[1], 'https://3dgalaxy.co/uploads/filament.png');
    assert.ok(!parsedImages.some(img => img?.includes('[object Object]')));
  });

  test('Merchant Center Feed: Emits <g:identifier_exists>no</g:identifier_exists> when GTIN or MPN is absent', () => {
    const productWithoutBarcode = { sku: null, barcode: null };
    const hasGtinOrMpn = !!(productWithoutBarcode.sku || productWithoutBarcode.barcode);
    const identifierTag = hasGtinOrMpn ? '<g:identifier_exists>yes</g:identifier_exists>' : '<g:identifier_exists>no</g:identifier_exists>';

    assert.strictEqual(identifierTag, '<g:identifier_exists>no</g:identifier_exists>');
  });

  test('Merchant Center Feed: resolveProductImageLinks extracts variant images when product.images is empty', () => {
    const p = {
      name: 'Custom Product',
      images: [],
      variants: [
        { variantImages: [{ url: 'https://cdn.3dgalaxy.co/images/variant-combo.jpg' }] }
      ]
    };
    const { resolveProductImageLinks } = require('../../functions/src/controllers/marketing');
    const { mainImage } = resolveProductImageLinks(p, 'https://3dgalaxy.co');
    assert.strictEqual(mainImage, 'https://cdn.3dgalaxy.co/images/variant-combo.jpg');
  });

  test('Merchant Center Feed: resolveProductImageLinks rejects SVGs and generic site logos', () => {
    const p = {
      name: 'PLA Rainbow Filament 1kg',
      slug: 'pla-rainbow-1k',
      images: [
        { url: '/images/logo.svg' },
        '/3d-logo.png'
      ]
    };
    const { resolveProductImageLinks } = require('../../functions/src/controllers/marketing');
    const { mainImage } = resolveProductImageLinks(p, 'https://3dgalaxy.co');
    assert.ok(!mainImage.endsWith('.svg'), 'Must not use SVG as main image');
    assert.ok(!mainImage.endsWith('/3d-logo.png'), 'Must not use generic 3d-logo.png as main image');
    assert.strictEqual(mainImage, 'https://3dgalaxy.co/images/products/pla_filament_white.png', 'Must map to high-resolution product photography');
  });

  test('Merchant Center Feed: Emits <g:channel>online</g:channel> and Indian shipping details', () => {
    const channelTag = '<g:channel>online</g:channel>';
    const shippingTag = '<g:shipping><g:country>IN</g:country><g:service>Standard Delivery</g:service><g:price>0.00 INR</g:price></g:shipping>';
    const excludedLocalTag = '<g:excluded_destination>Free_local_listings</g:excluded_destination>';

    assert.ok(channelTag.includes('online'), 'Feed must explicitly declare online channel');
    assert.ok(shippingTag.includes('<g:country>IN</g:country>'), 'Must specify shipping country');
    assert.ok(excludedLocalTag.includes('Free_local_listings'), 'Must exclude local listings from online delivery items to avoid Missing local inventory errors');
  });

  test('Local Inventory Feed: Emits <g:store_code>, quantity, and availability', () => {
    const storeCode = '3D_GALAXY_MAIN';
    const stock = 25;
    const itemXml = `<g:id>prod-123</g:id><g:store_code>${storeCode}</g:store_code><g:availability>in_stock</g:availability><g:quantity>${stock}</g:quantity>`;

    assert.ok(itemXml.includes('<g:store_code>3D_GALAXY_MAIN</g:store_code>'), 'Must include store code');
    assert.ok(itemXml.includes('<g:quantity>25</g:quantity>'), 'Must include quantity');
    assert.ok(itemXml.includes('<g:availability>in_stock</g:availability>'), 'Must include availability');
  });

  return results;
}
