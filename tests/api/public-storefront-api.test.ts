/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 2: API TESTS — Public Storefront & Guest Experience APIs
 */

import assert from 'node:assert';
import { AxiosInstance } from 'axios';

export async function runPublicStorefrontApiTests(client: AxiosInstance) {
  const results = { passed: 0, failed: 0, errors: [] as string[] };

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.passed++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${name}: ${err.message}`);
    }
  }

  // --- SECTION 5: HOMEPAGE APIs ---

  await test('GET /api/home: Responds 200 with home layout data', async () => {
    const res = await client.get('/api/home');
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(res.data, 'Response should contain data payload');
  });

  await test('GET /api/home/featured-products: Responds 200 with products array', async () => {
    const res = await client.get('/api/home/featured-products');
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(res.data.success !== false, 'Response should be successful');
  });

  await test('GET /api/service-config: Responds 200 with service configuration', async () => {
    const res = await client.get('/api/service-config');
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
  });

  // --- SECTION 6: CATEGORIES APIs ---

  await test('GET /api/categories: Responds 200 with categories listing', async () => {
    const res = await client.get('/api/categories');
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const data = res.data?.data || res.data;
    assert.ok(Array.isArray(data), 'Categories should return an array');
  });

  // --- SECTION 7: PRODUCTS APIs ---

  await test('GET /api/products: Responds 200 with paginated product catalog', async () => {
    const res = await client.get('/api/products?page=1&limit=10');
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(res.data, 'Products endpoint should return data');
  });

  await test('GET /api/products: Supports sorting and filtering without error', async () => {
    const res = await client.get('/api/products?sortBy=price&sortOrder=asc&limit=5');
    assert.strictEqual(res.status, 200, `Expected 200 OK for sorted products, got ${res.status}`);
  });

  // --- SECTION 19 & 45: SEARCH & GUEST ACCESSIBILITY ---

  await test('GET /api/search: Responds 200 for keyword queries', async () => {
    const res = await client.get('/api/search?q=PLA');
    assert.strictEqual(res.status, 200, `Expected 200 OK for search query, got ${res.status}`);
  });

  await test('GET /api/search/recent: Does NOT return 401 for unauthenticated guest browsing', async () => {
    const res = await client.get('/api/search/recent');
    // Guest browsing should either return empty recent searches or succeed without 401
    assert.notStrictEqual(res.status, 401, 'Guest user browsing recent search must NOT receive 401 Unauthorized');
    assert.ok([200, 204].includes(res.status), `Expected 200 or 204, got ${res.status}`);
  });

  await test('GET /api/explore-navigation: Responds without requiring authorization', async () => {
    const res = await client.get('/api/explore-navigation');
    assert.notStrictEqual(res.status, 401, 'Explore navigation must be guest accessible');
    assert.ok([200, 404].includes(res.status), `Expected valid HTTP response, got ${res.status}`);
  });

  // --- SECTION 24: MARKETING & ANNOUNCEMENTS ---

  await test('GET /api/header-announcements: Responds 200 with announcements array', async () => {
    const res = await client.get('/api/header-announcements');
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
  });

  await test('GET /api/banners: Responds 200 for public banners', async () => {
    const res = await client.get('/api/banners');
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
  });

  // --- SECTION 25: INSTAGRAM LIVE FEED APIs ---

  await test('GET /api/public/instagram-feed: Responds 200 with enabled, profile, and posts', async () => {
    const res = await client.get('/api/public/instagram-feed');
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.strictEqual(res.data.success, true, 'Response must indicate success: true');
    assert.ok(res.data.data, 'Response must have data object');
    assert.strictEqual(typeof res.data.data.enabled, 'boolean', 'Enabled flag must be boolean');
    assert.ok(res.data.data.profile, 'Profile object must be present');
    assert.ok(Array.isArray(res.data.data.posts), 'Posts must be an array');
  });

  await test('GET /api/public/instagram-feed: Security check — Never leaks access tokens', async () => {
    const res = await client.get('/api/public/instagram-feed');
    const rawJson = JSON.stringify(res.data);
    assert.ok(!rawJson.includes('accessToken'), 'Response must never leak raw accessToken');
    assert.ok(!rawJson.includes('IGAA'), 'Response must never expose Meta token string');
  });

  await test('POST /api/public/instagram-feed/interaction: Records impression and click events', async () => {
    const impressionRes = await client.post('/api/public/instagram-feed/interaction', {
      eventType: 'impression',
      postId: 'test_post_1',
    });
    assert.strictEqual(impressionRes.status, 200, `Expected 200 OK for impression, got ${impressionRes.status}`);

    const clickRes = await client.post('/api/public/instagram-feed/interaction', {
      eventType: 'click',
      postId: 'test_post_1',
    });
    assert.strictEqual(clickRes.status, 200, `Expected 200 OK for click, got ${clickRes.status}`);
  });

  return results;
}
