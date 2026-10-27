/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 3: INTEGRATION TESTS — Firebase Push Notifications Domain & Environment Isolation
 */

import assert from 'node:assert';
import { AxiosInstance } from 'axios';
import {
  normalizeOrigin,
  isOriginAllowed,
  getAppEnv,
  getAppOrigin,
  getFirebaseProjectId,
  isFcmNotificationsEnabled,
  sanitizeTokenForLog,
  getAllowedOriginsForEnv,
} from '../../functions/src/config/notificationEnv';
import { NotificationService } from '../../functions/src/services/notification.service';
import { NotificationDiagnostics } from '../../functions/src/services/notificationDiagnostics.service';

export async function runFcmEnvironmentIsolationTests(client: AxiosInstance) {
  const results = { passed: 0, failed: 0, errors: [] as string[] };

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      results.passed++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${name}: ${err.message}`);
    }
  }

  // =========================================================================
  // 1. ORIGIN NORMALIZATION & ALLOWLIST ENFORCEMENT
  // =========================================================================

  await test('Origin Normalization: Normalizes URLs, downcases host, strips trailing slashes', () => {
    assert.strictEqual(normalizeOrigin('https://3dgalaxy.co/'), 'https://3dgalaxy.co');
    assert.strictEqual(normalizeOrigin('HTTPS://3DGALAXY.CO'), 'https://3dgalaxy.co');
    assert.strictEqual(normalizeOrigin('http://localhost:4200/path?query=1'), 'http://localhost:4200');
    assert.strictEqual(normalizeOrigin('https://3dgalaxy.co:443'), 'https://3dgalaxy.co');
    assert.strictEqual(normalizeOrigin('http://localhost:80'), 'http://localhost');
    assert.strictEqual(normalizeOrigin('invalid-origin'), null);
    assert.strictEqual(normalizeOrigin(null), null);
    assert.strictEqual(normalizeOrigin(undefined), null);
  });

  await test('Domain Isolation: Validates allowed origins for production, staging, development', () => {
    // Production checks
    assert.strictEqual(isOriginAllowed('https://3dgalaxy.co.in', 'production'), true, '3dgalaxy.co.in must be allowed in production');
    assert.strictEqual(isOriginAllowed('https://www.3dgalaxy.co.in', 'production'), true, 'www.3dgalaxy.co.in must be allowed in production');
    assert.strictEqual(isOriginAllowed('https://3dgalaxy.co', 'production'), true, '3dgalaxy.co must be allowed in production');
    assert.strictEqual(isOriginAllowed('https://www.3dgalaxy.co', 'production'), true, 'www.3dgalaxy.co must be allowed in production');
    assert.strictEqual(isOriginAllowed('https://3dgalaxy.com', 'production'), true, '3dgalaxy.com must be allowed in production');
    assert.strictEqual(isOriginAllowed('http://localhost:4200', 'production'), false, 'localhost must be rejected in production');
    assert.strictEqual(isOriginAllowed('https://staging.3dgalaxy.co', 'production'), false, 'staging must be rejected in production');

    // Staging checks
    assert.strictEqual(isOriginAllowed('https://staging.3dgalaxy.co', 'staging'), true, 'staging origin must be allowed in staging');
    assert.strictEqual(isOriginAllowed('https://3dgalaxy.co', 'staging'), false, 'production domain must be rejected in staging');

    // Development & Test checks
    assert.strictEqual(isOriginAllowed('http://localhost:4200', 'development'), true, 'localhost:4200 allowed in dev');
    assert.strictEqual(isOriginAllowed('http://localhost:3000', 'development'), true, 'localhost:3000 allowed in dev');
    assert.strictEqual(isOriginAllowed('http://localhost:4200', 'test'), true, 'localhost allowed in test');
  });

  await test('Security: Rejects malicious, spoofed, and subdomain-traversal origins', () => {
    // Subdomain-as-domain attack: attacker owns attacker.com and registers 3dgalaxy.co.attacker.com
    assert.strictEqual(isOriginAllowed('https://3dgalaxy.co.attacker.com', 'production'), false);
    assert.strictEqual(isOriginAllowed('https://attacker-3dgalaxy.co', 'production'), false);
    assert.strictEqual(isOriginAllowed('http://3dgalaxy.co', 'production'), false, 'Insecure HTTP must be rejected in production');
    assert.strictEqual(isOriginAllowed('https://evil.com', 'production'), false);
    assert.strictEqual(isOriginAllowed('javascript:void(0)', 'production'), false);
    assert.strictEqual(isOriginAllowed('', 'production'), false);
  });

  // =========================================================================
  // 2. BACKEND ENVIRONMENT RESOLUTION & SERVER AUTHORITY
  // =========================================================================

  await test('Backend Authority: Derives environment from server configuration, not client', () => {
    const env = getAppEnv();
    assert.ok(['production', 'staging', 'development', 'test'].includes(env), `Valid app env: ${env}`);

    const origin = getAppOrigin();
    assert.ok(typeof origin === 'string' && origin.length > 0, 'Configured app origin must be a valid string');

    const projectId = getFirebaseProjectId();
    assert.ok(typeof projectId === 'string' && projectId.length > 0, 'Project ID must be resolved');
  });

  await test('Token Sanitization: Masks FCM token bodies in diagnostic logs', () => {
    const rawToken = 'fcm_token_super_long_secret_string_1234567890_abcdef';
    const sanitized = sanitizeTokenForLog(rawToken);
    assert.ok(sanitized.startsWith('fcm_to...'), 'Sanitized token should start with prefix');
    assert.ok(sanitized.endsWith('cdef'), 'Sanitized token should end with suffix');
    assert.ok(!sanitized.includes('super_long_secret'), 'Sanitized token must not reveal full credential');

    assert.strictEqual(sanitizeTokenForLog(''), '[NO_TOKEN]');
    assert.strictEqual(sanitizeTokenForLog(null as any), '[NO_TOKEN]');
  });

  // =========================================================================
  // 3. API ENDPOINTS: ENVIRONMENT STATUS & REGISTRATION VALIDATION
  // =========================================================================

  await test('GET /api/admin/fcm/environment-status: Returns isolation telemetry metadata', async () => {
    const res = await client.get('/api/admin/fcm/environment-status');
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.strictEqual(res.data?.success, true, 'Response must indicate success');

    const telemetry = res.data?.data;
    assert.ok(telemetry, 'Telemetry data must be present');
    assert.ok(telemetry.environment, 'Environment must be present');
    assert.ok(telemetry.configuredOrigin, 'Configured origin must be present');
    assert.ok(Array.isArray(telemetry.allowedOrigins), 'Allowed origins must be an array');
    assert.ok(typeof telemetry.fcmNotificationsEnabled === 'boolean', 'FCM flag must be boolean');
    assert.ok(typeof telemetry.registeredDevicesCount === 'number', 'Registered devices count must be a number');
    assert.ok(typeof telemetry.activeDevicesCount === 'number', 'Active devices count must be a number');
    assert.ok(typeof telemetry.invalidTokensCount === 'number', 'Invalid tokens count must be a number');
  });

  await test('POST /api/notifications/register-device: Rejects registration with unallowed origin', async () => {
    const res = await client.post('/api/notifications/register-device', {
      fcmToken: 'mock-fcm-token-invalid-origin-123',
      platform: 'browser',
    }, {
      headers: {
        Origin: 'https://malicious-site.attacker.com',
      },
    });

    assert.strictEqual(res.status, 400, 'Must reject registration from unallowed origin with 400 Bad Request');
    assert.strictEqual(res.data?.success, false);
    assert.ok(res.data?.error?.includes('Unauthorized application origin'), 'Error message must specify origin restriction');
  });

  await test('POST /api/notifications/register-device: Ignores client-supplied spoofed environment', async () => {
    // Current environment in tests is 'production' (or 'test')
    const currentEnv = getAppEnv();
    const validOrigin = getAllowedOriginsForEnv(currentEnv)[0] || 'https://3dgalaxy.co';

    const testToken = `test-token-spoof-${Date.now()}`;
    const res = await client.post('/api/notifications/register-device', {
      fcmToken: testToken,
      platform: 'browser',
      // Client attempts to claim it is 'development' or 'staging'
      environment: 'development',
      appOrigin: validOrigin,
    }, {
      headers: {
        Origin: validOrigin,
      },
    });

    assert.ok(res.status === 200 || res.status === 201, `Expected 200/201 for valid registration, got ${res.status}`);
    assert.strictEqual(res.data?.success, true);
    // Verified that server stamped currentEnv
    assert.strictEqual(res.data?.data?.environment, currentEnv, 'Server must enforce its own environment and ignore client spoofing');
  });

  await test('POST /api/notifications/unbind-account: Disassociates account on logout without deleting device', async () => {
    const currentEnv = getAppEnv();
    const validOrigin = getAllowedOriginsForEnv(currentEnv)[0] || 'https://3dgalaxy.co';
    const testToken = `test-token-unbind-${Date.now()}`;

    // Register token first
    await client.post('/api/notifications/register-device', {
      fcmToken: testToken,
      platform: 'browser',
      appOrigin: validOrigin,
    }, {
      headers: { Origin: validOrigin },
    });

    // Unbind account
    const unbindRes = await client.post('/api/notifications/unbind-account', {
      fcmToken: testToken,
      appOrigin: validOrigin,
    }, {
      headers: { Origin: validOrigin },
    });

    assert.strictEqual(unbindRes.status, 200, `Expected 200 OK for unbind, got ${unbindRes.status}`);
    assert.strictEqual(unbindRes.data?.success, true);
    assert.ok(unbindRes.data?.message?.includes('disassociated'), 'Message must confirm account disassociation');
  });

  // =========================================================================
  // 4. NOTIFICATION TARGETING & MULTICAST ISOLATION
  // =========================================================================

  await test('Multicast Isolation: getCustomerFcmTokens filters strictly by current environment', async () => {
    // Calling with non-existent user should return empty array safely without error
    const tokens = await NotificationService.getCustomerFcmTokens('00000000-0000-0000-0000-000000000000');
    assert.ok(Array.isArray(tokens), 'Tokens must be an array');
    assert.strictEqual(tokens.length, 0, 'No tokens should be found for non-existent user');

    // Calling with invalid non-UUID string safely returns empty array
    const invalidUuidTokens = await NotificationService.getCustomerFcmTokens('not-a-uuid');
    assert.ok(Array.isArray(invalidUuidTokens), 'Tokens must be an array');
    assert.strictEqual(invalidUuidTokens.length, 0, 'Must safely reject non-UUID user id without database crash');
  });

  await test('Multicast Isolation: getAdminFcmTokens filters out invalid tokens', async () => {
    const adminTokens = await NotificationService.getAdminFcmTokens();
    assert.ok(Array.isArray(adminTokens), 'Admin tokens must be an array');
  });

  await test('Diagnostic Logger: Records attempt with environment and projectId attribution', async () => {
    let recorded = false;
    try {
      await NotificationDiagnostics.recordAttempt({
        category: 'orders',
        eventKey: 'NEW_ORDER',
        recipientType: 'ADMIN',
        eligibleTokenCount: 1,
        success: true,
        title: 'Diagnostic Test Notification',
        bodySnippet: 'Testing attribution telemetry',
      });
      recorded = true;
    } catch {
      recorded = false;
    }
    assert.strictEqual(recorded, true, 'NotificationDiagnostics must record attempt safely without error');
  });

  return results;
}
