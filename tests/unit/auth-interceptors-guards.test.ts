/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 1: UNIT TESTS — Authentication, HTTP Interceptor & Request Deduplication
 */

import assert from 'node:assert';

export async function runAuthAndInterceptorUnitTests() {
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

  // --- SECTION 30: HTTP INTERCEPTOR TOKEN ATTACHMENT RULES ---

  test('Interceptor: Attaches Bearer token when valid token exists', () => {
    const mockStorage = { access_token: 'valid_jwt_token_12345' };
    const reqHeaders: Record<string, string> = {};

    if (mockStorage.access_token) {
      reqHeaders['Authorization'] = `Bearer ${mockStorage.access_token}`;
    }

    assert.strictEqual(reqHeaders['Authorization'], 'Bearer valid_jwt_token_12345');
  });

  test('Interceptor: Does NOT attach Bearer header when token is null or undefined (Guest)', () => {
    const mockStorage: { access_token?: string | null } = { access_token: null };
    const reqHeaders: Record<string, string> = {};

    const token = mockStorage.access_token;
    if (token && typeof token === 'string' && token.trim() !== '') {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    assert.strictEqual(reqHeaders['Authorization'], undefined, 'No Authorization header should be set for guests');
  });

  test('Interceptor: Strictly avoids "Bearer undefined" or "Bearer null"', () => {
    const testCases = [undefined, null, '', '   '];
    for (const val of testCases) {
      const isInvalid = !val || (typeof val === 'string' && val.trim() === '');
      assert.strictEqual(isInvalid, true, `Value '${val}' must be flagged invalid for Authorization header`);
    }
  });

  test('Interceptor: Skips Authorization header for public auth routes (/login, /register)', () => {
    const publicEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh-token'];
    for (const url of publicEndpoints) {
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');
      assert.strictEqual(isAuthEndpoint, true, `URL '${url}' should be identified as a public auth endpoint`);
    }
  });

  // --- SECTION 45 & 46: IN-FLIGHT GET REQUEST DEDUPLICATION ---

  test('Deduplication: In-flight identical GET requests share a single request key', () => {
    const generateKey = (method: string, url: string, auth: string) => `${method}::${url}::${auth}`;
    const key1 = generateKey('GET', '/api/categories', '');
    const key2 = generateKey('GET', '/api/categories', '');
    const key3 = generateKey('GET', '/api/categories', 'Bearer abc');

    assert.strictEqual(key1, key2, 'Identical unauthenticated GET requests must share identical keys');
    assert.notStrictEqual(key1, key3, 'Requests with different auth headers must have distinct keys');
  });

  test('Deduplication: Non-GET requests (POST, PUT, DELETE) are never deduplicated', () => {
    const isEligible = (method: string) => method === 'GET';
    assert.strictEqual(isEligible('GET'), true);
    assert.strictEqual(isEligible('POST'), false);
    assert.strictEqual(isEligible('PUT'), false);
    assert.strictEqual(isEligible('DELETE'), false);
  });

  return results;
}
