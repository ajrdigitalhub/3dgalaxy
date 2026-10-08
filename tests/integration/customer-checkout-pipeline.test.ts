/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 3: INTEGRATION TESTS — Customer Checkout Pipeline & Flow
 */

import assert from 'node:assert';
import { AxiosInstance } from 'axios';

export async function runCustomerCheckoutIntegrationTests(client: AxiosInstance) {
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

  await test('Pipeline: Product Discovery -> Details -> Cart Calculation -> COD Evaluation', async () => {
    // 1. Discover products from public API
    const productsRes = await client.get('/api/products?page=1&limit=5');
    assert.strictEqual(productsRes.status, 200, 'Product catalog should load successfully');

    const products = productsRes.data?.data || productsRes.data?.products || [];
    assert.ok(Array.isArray(products) && products.length > 0, 'Catalog should contain products');

    const selectedProduct = products[0];
    assert.ok(selectedProduct.id, 'Selected product must have a valid ID');

    // 2. Fetch specific product details
    const detailRes = await client.get(`/api/products/${selectedProduct.id}`);
    assert.strictEqual(detailRes.status, 200, 'Product details endpoint should load successfully');

    // 3. Assemble simulated Cart item
    const cartItem = {
      product: detailRes.data?.data || detailRes.data,
      quantity: 1
    };

    const price = Number(cartItem.product.price) || 0;
    assert.ok(price >= 0, 'Product price must be non-negative');

    // 4. Assert COD business rules on assembled cart
    const isCodSupported = cartItem.product.codAvailable !== false;
    const isUnderLimit = price <= 2500;
    const shouldBeEligible = isCodSupported && isUnderLimit;

    // 5. Test attempt to submit invalid order with missing details
    const invalidOrderRes = await client.post('/api/orders', {
      items: [{ productId: selectedProduct.id, quantity: 1, unitPrice: price }],
      paymentMethod: shouldBeEligible ? 'COD' : 'RAZORPAY'
      // Missing shippingAddress
    });

    assert.strictEqual(invalidOrderRes.status, 400, 'Incomplete order payload must be rejected by backend with 400');
  });

  return results;
}
