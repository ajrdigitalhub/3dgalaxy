/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 2: API TESTS — Admin Authorization, Media Preservation & Security
 */

import assert from 'node:assert';
import { AxiosInstance } from 'axios';

export async function runAdminManagementApiTests(client: AxiosInstance) {
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

  // --- SECTION 4: ADMIN API AUTHORIZATION & RBAC CHECKS ---

  await test('GET /api/integration/v1/admin/inventory: Rejects unauthenticated request with 401', async () => {
    const res = await client.get('/api/integration/v1/admin/inventory');
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized for unauthenticated inventory access, got ${res.status}`);
  });

  await test('GET /api/integration/v1/admin/configuration: Rejects unauthenticated request with 401', async () => {
    const res = await client.get('/api/integration/v1/admin/configuration');
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized for unauthenticated configuration read, got ${res.status}`);
  });

  await test('GET /api/integration/v1/admin/backups/history: Rejects unauthenticated request with 401', async () => {
    const res = await client.get('/api/integration/v1/admin/backups/history');
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized for unauthenticated backup access, got ${res.status}`);
  });

  await test('POST /api/integration/v1/admin/auth/token: Rejects invalid client credentials with 401', async () => {
    const res = await client.post('/api/integration/v1/admin/auth/token', {
      clientId: 'invalid-client',
      clientSecret: 'wrong-secret'
    });
    assert.strictEqual(res.status, 401, `Expected 401 for bad client credentials, got ${res.status}`);
  });

  // --- SECTION 25 & 26: TOKEN MINTING, SCOPES & SECURITY MASKING ---

  await test('GET /api/integration/v1/admin/health: Public unauthenticated health responds 200', async () => {
    const res = await client.get('/api/integration/v1/admin/health');
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(res.data?.status === 'UP' || res.data?.healthy !== false, 'Health check should be UP');
  });

  await test('POST /api/integration/v1/admin/auth/token: Mints token with granted scopes', async () => {
    const res = await client.post('/api/integration/v1/admin/auth/token', {
      clientId: 'taskhub',
      clientSecret: 'taskhub_admin_secret_key_2026',
      scopes: ['configuration:read', 'logs:read']
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data?.accessToken, 'Response should contain accessToken');
  });

  await test('Security: Admin configuration endpoints mask secrets ([REDACTED])', async () => {
    const tokenRes = await client.post('/api/integration/v1/admin/auth/token', {
      clientId: 'taskhub',
      clientSecret: 'taskhub_admin_secret_key_2026',
      scopes: ['configuration:read']
    });

    assert.strictEqual(tokenRes.status, 200);
    const token = tokenRes.data.accessToken;

    const configRes = await client.get('/api/integration/v1/admin/configuration', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(configRes.status, 200);

    const gatewaySettings = configRes.data?.data?.paymentGatewaySettings;
    const razorpaySecret = gatewaySettings?.paymentMethods?.razorpay?.keySecret;
    if (razorpaySecret) {
      assert.strictEqual(razorpaySecret, '[REDACTED]', 'Sensitive API keys must be masked as [REDACTED]');
    }
  });

  await test('Authorization: Rejects insufficient scope with 403 Forbidden', async () => {
    // Mint token with ONLY logs:read (missing configuration:write)
    const tokenRes = await client.post('/api/integration/v1/admin/auth/token', {
      clientId: 'taskhub',
      clientSecret: 'taskhub_admin_secret_key_2026',
      scopes: ['logs:read']
    });

    assert.strictEqual(tokenRes.status, 200);
    const token = tokenRes.data.accessToken;

    const putRes = await client.put('/api/integration/v1/admin/configuration', { siteName: 'Test' }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(putRes.status, 403, `Expected 403 Forbidden for missing scope, got ${putRes.status}`);
  });

  return results;
}
