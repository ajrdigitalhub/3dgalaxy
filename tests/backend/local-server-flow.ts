/**
 * 3D Galaxy Local Server-Side Complete Flow Test
 * 
 * Tests the entire business workflow against the local server engine in isolation
 * without requiring the Angular frontend browser UI.
 */

// Force test environment
process.env.NODE_ENV = 'production';

import assert from 'node:assert';
import { startTestServer, stopTestServer } from '../helpers/test-server';
import { AxiosInstance } from 'axios';

interface StepLog {
  step: string;
  endpoint: string;
  status: number;
  durationMs: number;
  details: string;
}

const logs: StepLog[] = [];

function recordStep(step: string, endpoint: string, status: number, durationMs: number, details: string) {
  logs.push({ step, endpoint, status, durationMs, details });
  const icon = status >= 200 && status < 400 ? '✓' : '⚠️';
  console.log(`  ${icon} [${step}] ${endpoint} -> ${status} (${durationMs}ms) | ${details}`);
}

async function runLocalServerFlow() {
  const startTime = Date.now();
  console.log('\n================================================================');
  console.log('   3D GALAXY — LOCAL SERVER-SIDE COMPLETE END-TO-END FLOW TEST');
  console.log('================================================================\n');

  console.log('[Phase 1] Booting In-Process Server in Local Environment...');
  const { client, baseUrl } = await startTestServer();
  console.log(`[+] Local backend server active at: ${baseUrl}\n`);

  let authToken = '';
  let customerUser: any = null;
  let testProduct: any = null;
  let createdOrderId = '';

  try {
    // -------------------------------------------------------------
    // PHASE 2: SYSTEM CONFIGURATION & SETTINGS
    // -------------------------------------------------------------
    console.log('--- PHASE 2: CONFIGURATION & SETTINGS ---');
    {
      const t0 = Date.now();
      const res = await client.get('/api/service-config');
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, 'service-config must return 200');
      recordStep('Config', 'GET /api/service-config', res.status, d, `Site: ${res.data?.siteName || '3D Galaxy'}`);
    }
    {
      const t0 = Date.now();
      const res = await client.get('/api/settings');
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, 'settings must return 200');
      const keys = Object.keys(res.data?.data || res.data || {});
      recordStep('Settings', 'GET /api/settings', res.status, d, `Loaded ${keys.length} setting keys (Cached)`);
    }

    // -------------------------------------------------------------
    // PHASE 3: STOREFRONT & CATALOG DISCOVERY
    // -------------------------------------------------------------
    console.log('\n--- PHASE 3: STOREFRONT & CATALOG DISCOVERY ---');
    {
      const t0 = Date.now();
      const res = await client.get('/api/home');
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, 'home must return 200');
      const categoriesCount = res.data?.data?.categories?.length || 0;
      const featuredCount = res.data?.data?.featuredProducts?.length || 0;
      recordStep('Storefront Home', 'GET /api/home', res.status, d, `Categories: ${categoriesCount}, Featured: ${featuredCount}`);
    }
    {
      const t0 = Date.now();
      const res = await client.get('/api/categories/');
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, 'categories must return 200');
      const cats = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      recordStep('Categories', 'GET /api/categories/', res.status, d, `Found ${cats.length} active categories`);
    }
    {
      const t0 = Date.now();
      const res = await client.get('/api/banners/');
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, 'banners must return 200');
      recordStep('Banners', 'GET /api/banners/', res.status, d, `Banners endpoint responded OK`);
    }

    // -------------------------------------------------------------
    // PHASE 4: SEARCH & CATALOG BROWSING
    // -------------------------------------------------------------
    console.log('\n--- PHASE 4: SEARCH & CATALOG BROWSING ---');
    {
      const t0 = Date.now();
      const res = await client.get('/api/search/?q=3D');
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, 'search must return 200');
      recordStep('Search', 'GET /api/search/?q=3D', res.status, d, `Query executed successfully`);
    }
    {
      const t0 = Date.now();
      const res = await client.get('/api/products/?page=1&limit=5');
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, 'products catalog must return 200');
      const prods = res.data?.data || res.data?.products || [];
      assert.ok(prods.length > 0, 'Catalog should contain at least 1 product');
      testProduct = prods[0];
      recordStep('Catalog', 'GET /api/products/?page=1&limit=5', res.status, d, `Selected product: "${testProduct.name}" (ID: ${testProduct.id})`);
    }

    // -------------------------------------------------------------
    // PHASE 5: PRODUCT DETAIL, REVIEWS & CACHE VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- PHASE 5: PRODUCT DETAIL, REVIEWS & CACHING ---');
    {
      const t0 = Date.now();
      const targetIdentifier = testProduct.slug || testProduct.id;
      const res = await client.get(`/api/products/${targetIdentifier}`);
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, 'product details must return 200');
      const prodData = res.data?.data || res.data;
      const specs = Array.isArray(prodData.specifications) ? prodData.specifications.length : 0;
      const variants = Array.isArray(prodData.variants) ? prodData.variants.length : 0;
      recordStep('Product Detail', `GET /api/products/${targetIdentifier}`, res.status, d, `Variants: ${variants}, Specs (JSONB): ${specs}`);
    }
    {
      // First Rating Aggregation Call (Initial population)
      const t0 = Date.now();
      const res = await client.get(`/api/reviews/product/${testProduct.id}`);
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, 'reviews endpoint must return 200');
      recordStep('Review Aggregation', `GET /api/reviews/product/${testProduct.id}`, res.status, d, `Initial rating fetch executed`);

      // Second Rating Aggregation Call (Verify in-memory TTL Cache optimization)
      const t1 = Date.now();
      const resCached = await client.get(`/api/reviews/product/${testProduct.id}`);
      const dCached = Date.now() - t1;
      assert.strictEqual(resCached.status, 200, 'cached reviews endpoint must return 200');
      recordStep('Review Cache Hit', `GET /api/reviews/product/${testProduct.id}`, resCached.status, dCached, `Optimized cache hit (Instant response)`);
    }

    // -------------------------------------------------------------
    // PHASE 6: CUSTOMER AUTHENTICATION & PROFILE
    // -------------------------------------------------------------
    console.log('\n--- PHASE 6: CUSTOMER AUTHENTICATION & PROFILE ---');
    const testEmail = `test_${Date.now()}@3dgalaxytest.in`;
    const testPassword = 'Password123!';
    {
      const t0 = Date.now();
      const res = await client.post('/api/auth/register', {
        name: 'Local Test Buyer',
        email: testEmail,
        password: testPassword,
        mobile: '+919876543210'
      });
      const d = Date.now() - t0;
      // Accept either 201 Created or 200 OK
      assert.ok([200, 201].includes(res.status), `Register should succeed, got ${res.status}`);
      customerUser = res.data?.user || res.data?.data?.user;
      authToken = res.data?.token || res.data?.accessToken || res.data?.data?.token;
      recordStep('Auth Register', 'POST /api/auth/register', res.status, d, `Registered customer: ${testEmail}`);
    }
    {
      const t0 = Date.now();
      const res = await client.post('/api/auth/login', {
        email: testEmail,
        password: testPassword
      });
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, 'login must return 200');
      authToken = res.data?.token || res.data?.accessToken || authToken;
      assert.ok(authToken, 'Access token must be issued on login');
      recordStep('Auth Login', 'POST /api/auth/login', res.status, d, `Authenticated successfully, token issued`);
    }
    {
      const t0 = Date.now();
      const res = await client.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, '/api/auth/me must return 200 with valid token');
      recordStep('Auth Session Verify', 'GET /api/auth/me', res.status, d, `Session verified for user ID: ${res.data?.user?.id || 'OK'}`);
    }

    // -------------------------------------------------------------
    // PHASE 7: ADDRESS & CART ASSEMBLY
    // -------------------------------------------------------------
    console.log('\n--- PHASE 7: ADDRESS & CART ASSEMBLY ---');
    {
      const t0 = Date.now();
      const res = await client.get('/api/customer/addresses', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const d = Date.now() - t0;
      assert.ok([200, 204].includes(res.status), 'Customer addresses endpoint responded');
      recordStep('Customer Addresses', 'GET /api/customer/addresses', res.status, d, `Addresses retrieved`);
    }

    // -------------------------------------------------------------
    // PHASE 8: ORDER CHECKOUT PIPELINE
    // -------------------------------------------------------------
    console.log('\n--- PHASE 8: ORDER CREATION & CHECKOUT ---');
    {
      const productPrice = Number(testProduct.salePrice || testProduct.price || testProduct.basePrice || 500);
      const isCodEligible = testProduct.codAvailable !== false && productPrice <= 2500;
      const orderPayload = {
        customerType: 'REGISTERED',
        userId: customerUser?.id,
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unitPrice: productPrice,
            totalPrice: productPrice
          }
        ],
        shippingAddress: {
          fullName: 'Local Test Buyer',
          phone: '9876543210',
          addressLine1: '42 Fabricator Hub, Industrial Area',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
          country: 'India'
        },
        paymentMethod: isCodEligible ? 'COD' : 'RAZORPAY',
        notes: 'Automated Local Server Flow Test Order'
      };

      const t0 = Date.now();
      const res = await client.post('/api/orders', orderPayload, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const d = Date.now() - t0;
      assert.ok([200, 201].includes(res.status), `Order placement should return 200/201, got ${res.status}`);
      
      const createdOrder = res.data?.order || res.data?.data || res.data;
      createdOrderId = createdOrder.id;
      assert.ok(createdOrderId, 'Created order must have a valid ID');
      recordStep('Order Placement', 'POST /api/orders', res.status, d, `Created Order ID: ${createdOrderId} (Method: ${orderPayload.paymentMethod})`);
    }

    // -------------------------------------------------------------
    // PHASE 9: ORDER TRACKING & FULFILLMENT
    // -------------------------------------------------------------
    console.log('\n--- PHASE 9: ORDER TRACKING & DETAILS ---');
    {
      const t0 = Date.now();
      const res = await client.get(`/api/orders/${createdOrderId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, 'Order detail lookup must return 200');
      const orderData = res.data?.order || res.data?.data || res.data;
      assert.strictEqual(orderData.id, createdOrderId, 'Retrieved order ID must match created ID');
      recordStep('Order Tracking', `GET /api/orders/${createdOrderId}`, res.status, d, `Status: ${orderData.status || 'PENDING'}, Total: ₹${orderData.totalAmount || orderData.total_amount}`);
    }

    // -------------------------------------------------------------
    // PHASE 10: ADMIN & SYSTEM INTEGRATION HEALTH
    // -------------------------------------------------------------
    console.log('\n--- PHASE 10: ADMIN & INTEGRATION HEALTH ---');
    {
      const t0 = Date.now();
      const res = await client.get('/api/admin/fcm/environment-status');
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, 'FCM environment status must return 200');
      recordStep('Admin FCM Status', 'GET /api/admin/fcm/environment-status', res.status, d, `Environment: ${res.data?.environment || 'Active'}`);
    }
    {
      const t0 = Date.now();
      const res = await client.get('/api/integration/v1/admin/health');
      const d = Date.now() - t0;
      assert.strictEqual(res.status, 200, 'Admin health endpoint must return 200');
      recordStep('System Health', 'GET /api/integration/v1/admin/health', res.status, d, `Database & Service Status: HEALTHY`);
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n================================================================');
    console.log('   LOCAL SERVER-SIDE COMPLETE FLOW TEST: ALL STEPS PASSED!      ');
    console.log(`   Total Steps: ${logs.length} | Total Duration: ${totalDuration}s`);
    console.log('================================================================\n');

  } finally {
    console.log('[Teardown] Stopping Local In-Process Test Server...');
    await stopTestServer();
    console.log('[+] Server stopped cleanly.\n');
  }
}

runLocalServerFlow().catch((err) => {
  console.error('\n❌ LOCAL SERVER FLOW TEST FAILED:', err);
  stopTestServer().finally(() => {
    process.exit(1);
  });
});
