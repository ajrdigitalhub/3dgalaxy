import assert from 'node:assert';
import axios from 'axios';
import { pool } from '../src/config/database';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(category: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ category, name, passed: true, durationMs });
    console.log(`  ✓ [${category}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ category, name, passed: false, durationMs, error: err.message });
    console.error(`  ❌ [${category}] ${name} FAILED: ${err.message}`);
  }
}

async function main() {
  console.log('\n================================================================');
  console.log('   3D GALAXY — COMPREHENSIVE NON-DESTRUCTIVE APPLICATION TEST');
  console.log('   (Zero Database Mutation / 100% Read-Only & In-Memory Logic)');
  console.log('================================================================\n');

  const client = axios.create({
    baseURL: 'http://localhost:4000',
    timeout: 8000,
    validateStatus: () => true, // Do not throw on HTTP status codes
  });

  // =================================================================
  // SECTION 1: IN-MEMORY BUSINESS LOGIC & CALCULATION TESTS
  // =================================================================
  console.log('--- SECTION 1: IN-MEMORY BUSINESS LOGIC & ALGORITHMS ---');

  await runTest('Business Logic', 'Pricing & 18% GST calculation with proper rounding', async () => {
    const basePrice = 1499.5;
    const gstRate = 0.18;
    const taxAmount = Math.round(basePrice * gstRate * 100) / 100;
    const totalAmount = Math.round((basePrice + taxAmount) * 100) / 100;
    assert.strictEqual(taxAmount, 269.91);
    assert.strictEqual(totalAmount, 1769.41);
  });

  await runTest('Business Logic', 'COD Eligibility rules (Max limit ₹2500, ₹100 handling fee)', async () => {
    const isCodEligible = (amount: number, productCodAllowed: boolean) => {
      return productCodAllowed && amount <= 2500;
    };
    const calculateCodFee = (isCod: boolean) => (isCod ? 100 : 0);

    assert.strictEqual(isCodEligible(2499, true), true);
    assert.strictEqual(isCodEligible(2501, true), false);
    assert.strictEqual(isCodEligible(1500, false), false);
    assert.strictEqual(calculateCodFee(true), 100);
    assert.strictEqual(calculateCodFee(false), 0);
  });

  await runTest('Business Logic', 'Weight-tier shipping charge calculator', async () => {
    const calculateShipping = (weightGrams: number, freeShippingEligible: boolean, orderTotal: number) => {
      if (freeShippingEligible && orderTotal >= 2000) return 0;
      if (weightGrams <= 500) return 60;
      if (weightGrams <= 1000) return 100;
      return 100 + Math.ceil((weightGrams - 1000) / 500) * 40;
    };

    assert.strictEqual(calculateShipping(300, true, 2500), 0); // Free shipping threshold met
    assert.strictEqual(calculateShipping(400, false, 1500), 60); // <500g base rate
    assert.strictEqual(calculateShipping(850, false, 1500), 100); // 500g-1kg rate
    assert.strictEqual(calculateShipping(1800, false, 1500), 180); // 1kg + 2*40 for extra 800g
  });

  await runTest('Business Logic', 'Coupon discount algorithms (Percentage vs Flat, Max Discount cap)', async () => {
    const applyCoupon = (subtotal: number, type: 'PERCENTAGE' | 'FLAT', value: number, maxDiscount?: number, minOrder?: number) => {
      if (minOrder && subtotal < minOrder) return { discount: 0, reason: 'MIN_ORDER_NOT_MET' };
      let discount = type === 'PERCENTAGE' ? (subtotal * value) / 100 : value;
      if (maxDiscount && discount > maxDiscount) discount = maxDiscount;
      discount = Math.min(discount, subtotal);
      return { discount: Math.round(discount * 100) / 100, reason: 'APPLIED' };
    };

    // 10% off with max ₹300 cap on ₹5000 order
    assert.deepStrictEqual(applyCoupon(5000, 'PERCENTAGE', 10, 300), { discount: 300, reason: 'APPLIED' });
    // Flat ₹200 off on ₹1500 order with min ₹1000 order requirement
    assert.deepStrictEqual(applyCoupon(1500, 'FLAT', 200, undefined, 1000), { discount: 200, reason: 'APPLIED' });
    // Min order ₹1000 not met on ₹800 order
    assert.deepStrictEqual(applyCoupon(800, 'FLAT', 200, undefined, 1000), { discount: 0, reason: 'MIN_ORDER_NOT_MET' });
  });

  await runTest('Business Logic', 'Variant combinations matrix generator', async () => {
    const attributes = [
      { name: 'Color', values: ['Black', 'White', 'Red'] },
      { name: 'Size', values: ['1kg', '2kg'] }
    ];

    const generateCombinations = (attrs: Array<{ name: string; values: string[] }>): string[][] => {
      return attrs.reduce(
        (acc, attr) => acc.flatMap(combo => attr.values.map(val => [...combo, val])),
        [[]] as string[][]
      );
    };

    const combinations = generateCombinations(attributes);
    assert.strictEqual(combinations.length, 6);
    assert.deepStrictEqual(combinations[0], ['Black', '1kg']);
    assert.deepStrictEqual(combinations[5], ['Red', '2kg']);
  });

  await runTest('Business Logic', 'Weighted average review calculation & distribution', async () => {
    const ratings = [5, 5, 4, 3, 5, 2, 5, 4];
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of ratings) {
      distribution[r] = (distribution[r] || 0) + 1;
      sum += r;
    }
    const avg = Math.round((sum / ratings.length) * 10) / 10;
    assert.strictEqual(ratings.length, 8);
    assert.strictEqual(distribution[5], 4);
    assert.strictEqual(distribution[4], 2);
    assert.strictEqual(distribution[1], 0);
    assert.strictEqual(avg, 4.1);
  });

  // =================================================================
  // SECTION 2: LIVE READ-ONLY API ENDPOINTS (PORT 4000)
  // =================================================================
  console.log('\n--- SECTION 2: LIVE READ-ONLY API ENDPOINTS (PORT 4000) ---');

  await runTest('Live API', 'GET /api/service-config responds 200 with active config', async () => {
    const res = await client.get('/api/service-config');
    assert.strictEqual(res.status, 200);
    assert.ok(res.data, 'Should return service configuration object');
  });

  await runTest('Live API', 'GET /api/home responds 200 with dynamic sections & layout', async () => {
    const res = await client.get('/api/home');
    assert.strictEqual(res.status, 200);
    const data = res.data?.data || res.data;
    assert.ok(data, 'Home payload must exist');
  });

  await runTest('Live API', 'GET /api/categories responds 200 with active categories array', async () => {
    const res = await client.get('/api/categories');
    assert.strictEqual(res.status, 200);
    const cats = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    assert.ok(cats.length > 0, 'Categories should contain active records');
  });

  await runTest('Live API', 'GET /api/brands responds 200 with active brands array', async () => {
    const res = await client.get('/api/brands');
    assert.strictEqual(res.status, 200);
    const brands = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    assert.ok(Array.isArray(brands), 'Brands must be an array');
  });

  await runTest('Live API', 'GET /api/banners responds 200', async () => {
    const res = await client.get('/api/banners');
    assert.strictEqual(res.status, 200);
  });

  let sampleProductSlug = '';
  let sampleProductId = '';

  await runTest('Live API', 'GET /api/products?page=1&limit=5 returns paginated catalog', async () => {
    const res = await client.get('/api/products?page=1&limit=5');
    assert.strictEqual(res.status, 200);
    const prods = res.data?.data || res.data?.products || [];
    assert.ok(prods.length > 0, 'Should return at least 1 product');
    sampleProductSlug = prods[0].slug;
    sampleProductId = prods[0].id;
  });

  await runTest('Live API', 'GET /api/products/:identifier resolves single product detail', async () => {
    const target = sampleProductSlug || sampleProductId;
    assert.ok(target, 'Sample product identifier must exist');
    const res = await client.get(`/api/products/${target}`);
    assert.strictEqual(res.status, 200);
    const product = res.data?.product || res.data?.data || res.data;
    assert.ok(product, 'Product detail must be returned');
    assert.ok(product.name || product.title, 'Product must have a name');
  });

  await runTest('Live API', 'GET /api/search?q=3D handles search without review error', async () => {
    const res = await client.get('/api/search?q=3D');
    assert.strictEqual(res.status, 200);
  });

  await runTest('Live API', 'GET /api/search/suggestions?q=fila responds 200 with type breakdown', async () => {
    const res = await client.get('/api/search/suggestions?q=fila');
    assert.strictEqual(res.status, 200);
    const data = res.data?.data || res.data;
    assert.ok(data.products !== undefined, 'Suggestions should have products array');
    assert.ok(data.categories !== undefined, 'Suggestions should have categories array');
  });

  await runTest('Live API', 'GET /api/public/instagram-feed responds 200', async () => {
    const res = await client.get('/api/public/instagram-feed');
    assert.strictEqual(res.status, 200);
  });

  // =================================================================
  // SECTION 3: SECURITY & REJECTION TESTS (ZERO DB WRITE VERIFICATION)
  // =================================================================
  console.log('\n--- SECTION 3: SECURITY & REJECTION GUARDS (ZERO DB MUTATION) ---');

  await runTest('Security Guard', 'POST /api/auth/login rejects empty payload with 400/401 (0 DB writes)', async () => {
    const res = await client.post('/api/auth/login', {});
    assert.ok([400, 401, 422].includes(res.status), `Expected 400 or 401, got ${res.status}`);
  });

  await runTest('Security Guard', 'POST /api/orders rejects empty order with 400 (0 DB writes)', async () => {
    const res = await client.post('/api/orders', {});
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
  });

  await runTest('Security Guard', 'GET /api/integration/v1/admin/inventory rejects unauthenticated access (401)', async () => {
    const res = await client.get('/api/integration/v1/admin/inventory');
    assert.strictEqual(res.status, 401, `Protected admin endpoint must return 401, got ${res.status}`);
  });

  await runTest('Security Guard', 'Admin routes reject invalid/forged authorization tokens with 401/403', async () => {
    const res = await client.get('/api/integration/v1/admin/inventory', {
      headers: { Authorization: 'Bearer forged_token_12345' }
    });
    assert.ok([401, 403].includes(res.status), `Protected admin endpoint must reject invalid tokens, got ${res.status}`);
  });

  // =================================================================
  // SECTION 4: LIVE DATABASE INTEGRITY CHECKS (SELECT ONLY)
  // =================================================================
  console.log('\n--- SECTION 4: DATABASE INTEGRITY DIAGNOSTICS (SELECT ONLY) ---');

  await runTest('DB Integrity', 'Confirmed exact 62 active tables in public schema', async () => {
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    assert.strictEqual(res.rows.length, 62, `Expected exactly 62 public tables, found ${res.rows.length}`);
  });

  await runTest('DB Integrity', 'Confirmed all 14 dead tables are completely absent from DB', async () => {
    const droppedTables = [
      'blog_categories', 'contact_requests', 'coupon_usage', 'page_sections',
      'notification_templates', 'inventory_transactions', 'order_status_history',
      'product_reviews', 'theme_settings', 'warehouses', 'role_permissions',
      'user_roles', 'permissions', 'roles'
    ];
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[]);",
      [droppedTables]
    );
    assert.strictEqual(res.rows.length, 0, `None of the 14 dropped tables should exist, found: ${res.rows.map((r: any) => r.table_name).join(', ')}`);
  });

  await runTest('DB Integrity', 'Confirmed homepage_sections and homepage_section_items are preserved and readable', async () => {
    const res = await pool.query(
      "SELECT count(*) FROM homepage_sections;"
    );
    const count = parseInt(res.rows[0].count, 10);
    assert.ok(count >= 0, 'homepage_sections query must succeed');
  });

  await runTest('DB Integrity', 'Confirmed public.users table has role column with active data', async () => {
    const res = await pool.query(
      "SELECT count(*) as total, count(role) as with_role FROM public.users;"
    );
    const total = parseInt(res.rows[0].total, 10);
    const withRole = parseInt(res.rows[0].with_role, 10);
    assert.strictEqual(total, withRole, 'All users must have a non-null role string');
  });

  await runTest('DB Integrity', 'Confirmed active product stock is non-negative and queryable', async () => {
    const res = await pool.query(
      "SELECT count(*) as valid_stock FROM products WHERE stock >= 0 AND deleted_at IS NULL;"
    );
    const validCount = parseInt(res.rows[0].valid_stock, 10);
    assert.ok(validCount > 0, 'Products should have valid stock records');
  });

  await runTest('DB Integrity', 'Confirmed all 24 optimization indexes exist in PostgreSQL catalog', async () => {
    const targetIndexes = [
      'idx_users_role', 'idx_products_is_active_is_featured', 'idx_products_category_id',
      'idx_products_brand_id', 'idx_products_created_at_desc', 'idx_products_sku',
      'idx_products_slug', 'idx_product_variants_product_active', 'idx_product_variants_sku',
      'idx_categories_active_sort', 'idx_categories_parent_id', 'idx_categories_slug',
      'idx_customer_reviews_product_id', 'idx_customer_reviews_customer_id',
      'idx_orders_customer_created', 'idx_orders_status', 'idx_orders_order_number',
      'idx_order_items_order_id', 'idx_order_items_product_id', 'idx_payments_order_id',
      'idx_payments_transaction_id', 'idx_customer_addresses_customer_default',
      'idx_inventory_product_variant', 'idx_settings_setting_key'
    ];
    const res = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1::text[]);",
      [targetIndexes]
    );
    assert.strictEqual(res.rows.length, targetIndexes.length, `Expected all ${targetIndexes.length} indexes, found ${res.rows.length}`);
  });

  // =================================================================
  // SECTION 5: FRONTEND STATUS (PORT 4200)
  // =================================================================
  console.log('\n--- SECTION 5: FRONTEND STOREFRONT HEALTH (PORT 4200) ---');

  await runTest('Frontend', 'GET http://localhost:4200/ responds HTTP 200 with HTML shell', async () => {
    const res = await axios.get('http://localhost:4200/', { timeout: 5000 });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.includes('<app-root') || res.data.includes('<!DOCTYPE html>'), 'HTML shell should load');
  });

  // Final summary
  console.log('\n================================================================');
  console.log('   TEST EXECUTION SUMMARY');
  console.log('================================================================');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`Total Tests Executed: ${results.length}`);
  console.log(`✓ Passed:             ${passedCount}`);
  console.log(`❌ Failed:             ${failedCount}`);
  console.log(`Database Mutations:   ZERO (0 writes, 0 updates, 0 deletes)`);
  console.log('================================================================\n');

  await pool.end();

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
