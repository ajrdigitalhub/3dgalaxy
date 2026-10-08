/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 2: API TESTS — Checkout, COD Validation, Payment Verification & Orders
 */

import assert from 'node:assert';
import { AxiosInstance } from 'axios';

export async function runCheckoutAndOrdersApiTests(client: AxiosInstance) {
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

  // --- SECTION 11, 12, 13: CHECKOUT & ORDER VALIDATION ---

  await test('POST /api/orders: Rejects empty or invalid order payloads with 400', async () => {
    const res = await client.post('/api/orders', {});
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request for empty order payload, got ${res.status}`);
  });

  await test('POST /api/orders: Enforces COD rejection when total exceeds 2500 limit', async () => {
    // Attempt to place a COD order with subtotal 5000 (> 2500)
    const payload = {
      paymentMethod: 'COD',
      items: [
        {
          productId: 'any-product-id',
          quantity: 2,
          unitPrice: 2500,
          totalPrice: 5000
        }
      ],
      shippingAddress: {
        fullName: 'Test Customer',
        phone: '9876543210',
        addressLine1: 'Test Address Line',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452001'
      }
    };

    const res = await client.post('/api/orders', payload);
    // Backend must reject this either via 400 Bad Request or validation failure message
    const isRejected = res.status === 400 || (res.data && res.data.success === false);
    assert.ok(isRejected, `Order exceeding 2500 with COD must be rejected (Status: ${res.status})`);
  });

  await test('POST /api/payment/verify-payment: Rejects invalid or forged Razorpay signature', async () => {
    const fakeVerification = {
      razorpay_order_id: 'order_fake_12345',
      razorpay_payment_id: 'pay_fake_67890',
      razorpay_signature: 'forged_fake_signature_hash_000000000000'
    };

    const res = await client.post('/api/payment/verify-payment', fakeVerification);
    const isRejected = [400, 401, 404, 422].includes(res.status) || res.data?.success === false;
    assert.ok(isRejected, `Payment with forged signature must be rejected, got status: ${res.status}`);
  });

  await test('GET /api/orders: Protected user orders requires authentication (401 for guests)', async () => {
    const res = await client.get('/api/orders');
    // Calling protected user order list without token must reject with 401 or require auth
    assert.ok([401, 403].includes(res.status), `Accessing /api/orders without token should return 401/403, got ${res.status}`);
  });

  await test('GET /api/wishlist: Protected wishlist requires authentication (401 for guests)', async () => {
    const res = await client.get('/api/wishlist');
    assert.ok([401, 403].includes(res.status), `Accessing /api/wishlist without token should return 401/403, got ${res.status}`);
  });

  return results;
}
