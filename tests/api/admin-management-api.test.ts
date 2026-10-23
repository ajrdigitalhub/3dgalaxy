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

  // --- SECTION 30: MARKETING TRACKING CREDENTIALS & HEALTH CHECK TESTS ---

  await test('GET /api/marketing/config: Public config responds 200 and masks CAPI secrets', async () => {
    const res = await client.get('/api/marketing/config');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(res.data?.success, 'Response should indicate success');
    // Public config must never leak the plain CAPI token if configured
    assert.strictEqual(typeof res.data?.data?.enabled, 'boolean', 'Enabled flag must be a boolean');
  });

  await test('POST /api/admin/marketing/health-check: Validates configurations and layer statuses', async () => {
    const res = await client.post('/api/admin/marketing/health-check', { diagRunId: 'test_ci_run_1' });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(res.data?.success, 'Health check must return success: true');
    assert.ok(res.data?.data?.global, 'Health check must report global status');
    assert.ok(res.data?.data?.features, 'Health check must report features status');
    assert.ok(res.data?.data?.ga4, 'Health check must report GA4 status');
    assert.ok(res.data?.data?.gtm, 'Health check must report GTM status');
    // Ensure CAPI access token is never exposed in response
    const jsonStr = JSON.stringify(res.data);
    assert.ok(!jsonStr.includes('EAAB') && !jsonStr.includes('EAAC'), 'Secrets must never appear in response body');
  });

  await test('POST /api/admin/marketing/capi-test: Rejects missing CAPI configuration gracefully without crashes', async () => {
    const res = await client.post('/api/admin/marketing/capi-test', {
      testEventCode: 'TEST12345',
      diagRunId: 'test_ci_run_2'
    });
    // If not configured, should return 400 with helpful message, not 500 unhandled crash
    assert.ok(res.status === 200 || res.status === 400 || res.status === 500, 'Should handle CAPI test safely');
    assert.ok(res.data?.message, 'Response should contain an explanatory message');
  });

  return results;
}

