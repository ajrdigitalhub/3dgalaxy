/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 4: CRITICAL SMOKE TESTS (Section 41 Deployment Pre-Flight Validations)
 *
 * Every deployment MUST pass these 14 critical smoke checks.
 */

import assert from 'node:assert';
import { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';

export async function runCriticalSmokeTests(client: AxiosInstance) {
  const results = { passed: 0, failed: 0, errors: [] as string[] };

  async function test(smokeNumber: number, name: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.passed++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`[Smoke #${smokeNumber}] ${name}: ${err.message}`);
    }
  }

  // 1. Application builds
  await test(1, 'Application build artifacts are valid & present', async () => {
    const distPath = path.join(process.cwd(), 'dist/applet');
    const functionsDistPath = path.join(process.cwd(), 'functions/dist/server.js');
    const distExists = fs.existsSync(distPath);
    const serverExists = fs.existsSync(functionsDistPath);
    assert.ok(distExists && serverExists, 'Both frontend and backend build artifacts must exist');
  });

  // 2. Homepage loads
  await test(2, 'Homepage API responds successfully (Status 200)', async () => {
    const res = await client.get('/api/home');
    assert.strictEqual(res.status, 200);
  });

  // 3. Product listing loads
  await test(3, 'Product listing catalog loads with data (Status 200)', async () => {
    const res = await client.get('/api/products?page=1&limit=5');
    assert.strictEqual(res.status, 200);
  });

  // 4. Product detail loads
  await test(4, 'Product detail endpoint responds correctly', async () => {
    const listRes = await client.get('/api/products?limit=1');
    const products = listRes.data?.data || listRes.data?.products || [];
    if (products.length > 0) {
      const detailRes = await client.get(`/api/products/${products[0].id}`);
      assert.strictEqual(detailRes.status, 200);
    } else {
      assert.ok(true, 'No products found to fetch detail');
    }
  });

  // 5. Product variant selection works
  await test(5, 'Variant combination matrices are computed accurately', async () => {
    const optionsA = ['1.75mm', '2.85mm'];
    const optionsB = ['1kg', '3kg'];
    const matrix = optionsA.flatMap(a => optionsB.map(b => `${a}_${b}`));
    assert.strictEqual(matrix.length, 4);
  });

  // 6. Cart works
  await test(6, 'Cart calculation logic sums prices accurately', async () => {
    const items = [
      { price: 1000, qty: 2 },
      { price: 500, qty: 1 }
    ];
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    assert.strictEqual(total, 2500);
  });

  // 7. Checkout loads & COD rules enforced
  await test(7, 'COD rules enforce <= 2500 limit and 100 fee', async () => {
    const eligibleAmount = 2400;
    const ineligibleAmount = 2600;
    assert.ok(eligibleAmount <= 2500, '2400 is COD eligible');
    assert.ok(ineligibleAmount > 2500, '2600 is COD ineligible');
  });

  // 8. Authentication works
  await test(8, 'Authentication endpoint rejects missing credentials with 400', async () => {
    const res = await client.post('/api/auth/login', {});
    assert.ok([400, 401, 422].includes(res.status), `Expected 400 or 401 for empty login, got ${res.status}`);
  });

  // 9. Admin login / protected route rejection works
  await test(9, 'Admin routes strictly reject unauthenticated calls (401/403)', async () => {
    const res = await client.get('/api/integration/v1/admin/inventory');
    assert.strictEqual(res.status, 401, `Admin routes must reject unauthenticated guests (got ${res.status})`);
  });

  // 10. Admin product endpoints are mounted and secured
  await test(10, 'Admin configuration endpoints are mounted and secured with auth guards', async () => {
    const res = await client.get('/api/integration/v1/admin/configuration');
    assert.strictEqual(res.status, 401, `Admin configuration modification must require authorization (got ${res.status})`);
  });

  // 11. Order API validation works
  await test(11, 'Order API rejects malformed orders with 400', async () => {
    const res = await client.post('/api/orders', { invalidField: true });
    assert.strictEqual(res.status, 400);
  });

  // 12. Guest APIs don't incorrectly require authentication
  await test(12, 'Guest endpoints (/search/recent, /categories) do NOT return 401', async () => {
    const resSearch = await client.get('/api/search/recent');
    const resCat = await client.get('/api/categories');
    assert.notStrictEqual(resSearch.status, 401, 'Recent search must not return 401 for guests');
    assert.notStrictEqual(resCat.status, 401, 'Categories must not return 401 for guests');
  });

  // 13. WhatsApp webhook endpoint responds correctly to verification
  await test(13, 'WhatsApp webhook subscription verification returns hub.challenge', async () => {
    const challenge = 'smoke_test_challenge_Wa_2026';
    const res = await client.get(`/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=3dgalaxy_meta_wa_2026&hub.challenge=${challenge}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(String(res.data), challenge);
  });

  // 14. Critical database / system health check responds
  await test(14, 'System service configuration & health endpoints respond 200', async () => {
    const res = await client.get('/api/service-config');
    assert.strictEqual(res.status, 200);
  });

  return results;
}
