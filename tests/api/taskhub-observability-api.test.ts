/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 2: API TESTS — TaskHub Observability Integration Suite
 */

import assert from 'node:assert';
import { AxiosInstance } from 'axios';
import { ENV } from '../../functions/src/config/env';

export async function runTaskHubObservabilityApiTests(client: AxiosInstance) {
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

  const validApiKey = (ENV.TASKHUB_INTEGRATION_API_KEY || 'th_sec_3dgalaxy_prod_live_9f8b2c4e1a').split(',')[0].trim();
  const authHeaders = { 'X-API-Key': validApiKey };

  // ---------------------------------------------------------------------------
  // SECTION 1: AUTHENTICATION, AUTHORIZATION & SECURITY ENVELOPE CHECKS
  // ---------------------------------------------------------------------------

  await test('TaskHub Auth: Rejects unauthenticated request with 401 and MISSING_CREDENTIALS', async () => {
    const res = await client.get('/api/integration/v1/health');
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
    assert.strictEqual(res.data?.success, false);
    assert.strictEqual(res.data?.data, null);
    assert.strictEqual(res.data?.error?.code, 'MISSING_CREDENTIALS');
    assert.ok(res.data?.meta?.requestId, 'Meta must include correlation requestId');
    assert.ok(res.data?.meta?.timestamp, 'Meta must include timestamp');
  });

  await test('TaskHub Auth: Rejects invalid API key with 401 and INVALID_CREDENTIALS', async () => {
    const res = await client.get('/api/integration/v1/health', {
      headers: { 'X-API-Key': 'totally-invalid-secret-key-12345' },
    });
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
    assert.strictEqual(res.data?.success, false);
    assert.strictEqual(res.data?.error?.code, 'INVALID_CREDENTIALS');
  });

  await test('TaskHub Auth: Accepts valid API key in X-API-Key header', async () => {
    const res = await client.get('/api/integration/v1/health', {
      headers: authHeaders,
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK with valid API key, got ${res.status}`);
    assert.strictEqual(res.data?.success, true);
    assert.ok(res.data?.data, 'Should return health data payload');
  });

  await test('TaskHub Auth: Accepts API key in Authorization: Bearer header (interoperability)', async () => {
    const res = await client.get('/api/integration/v1/health', {
      headers: { Authorization: `Bearer ${validApiKey}` },
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK with Bearer token, got ${res.status}`);
    assert.strictEqual(res.data?.success, true);
  });

  await test('TaskHub Auth: Accepts API key in X-Integration-Key header (interoperability)', async () => {
    const res = await client.get('/api/integration/v1/health', {
      headers: { 'X-Integration-Key': validApiKey },
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK with X-Integration-Key, got ${res.status}`);
    assert.strictEqual(res.data?.success, true);
  });

  await test('TaskHub Auth: Supports API-key rotation via secondary key', async () => {
    const secondaryKey = 'th_sec_rotated_secondary_key_abc123';
    const originalSecondary = ENV.TASKHUB_INTEGRATION_API_KEY_SECONDARY;
    ENV.TASKHUB_INTEGRATION_API_KEY_SECONDARY = secondaryKey;

    try {
      const res = await client.get('/api/integration/v1/health', {
        headers: { 'X-API-Key': secondaryKey },
      });
      assert.strictEqual(res.status, 200, 'Secondary rotated key must authenticate successfully');
      assert.strictEqual(res.data?.success, true);
    } finally {
      ENV.TASKHUB_INTEGRATION_API_KEY_SECONDARY = originalSecondary;
    }
  });

  await test('TaskHub Auth: Rejects requests when integration is disabled with 503 INTEGRATION_DISABLED', async () => {
    const originalEnabled = ENV.TASKHUB_INTEGRATION_ENABLED;
    ENV.TASKHUB_INTEGRATION_ENABLED = false;

    try {
      const res = await client.get('/api/integration/v1/health', {
        headers: authHeaders,
      });
      assert.strictEqual(res.status, 503, `Expected 503 Service Unavailable, got ${res.status}`);
      assert.strictEqual(res.data?.success, false);
      assert.strictEqual(res.data?.error?.code, 'INTEGRATION_DISABLED');
    } finally {
      ENV.TASKHUB_INTEGRATION_ENABLED = originalEnabled;
    }
  });

  await test('TaskHub Request Correlation: Preserves incoming X-Request-ID across response and meta', async () => {
    const customCorrelationId = 'th_corr_test_987654321';
    const res = await client.get('/api/integration/v1/health', {
      headers: {
        ...authHeaders,
        'X-Request-ID': customCorrelationId,
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data?.meta?.requestId, customCorrelationId);
    assert.strictEqual(res.headers['x-request-id'], customCorrelationId);
  });

  await test('TaskHub Envelope: Validates common TaskHub response envelope structure', async () => {
    const res = await client.get('/api/integration/v1/health', {
      headers: authHeaders,
    });
    assert.strictEqual(res.status, 200);
    const body = res.data;
    assert.strictEqual(typeof body.success, 'boolean');
    assert.ok(body.data !== undefined);
    assert.ok(body.meta, 'Envelope must contain meta block');
    assert.strictEqual(typeof body.meta.applicationId, 'string');
    assert.strictEqual(typeof body.meta.environment, 'string');
    assert.strictEqual(body.meta.resource, 'health');
    assert.ok(!isNaN(Date.parse(body.meta.timestamp)), 'Meta timestamp must be valid ISO-8601');
    assert.strictEqual(body.error, null);
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: HEALTH ENDPOINT (GET /api/integration/v1/health)
  // ---------------------------------------------------------------------------

  await test('GET /api/integration/v1/health: Returns real service health and process uptime', async () => {
    const res = await client.get('/api/integration/v1/health', {
      headers: authHeaders,
    });
    assert.strictEqual(res.status, 200);
    const data = res.data?.data;
    assert.ok(data?.application?.name, 'Must report application name');
    assert.ok(data?.application?.version, 'Must report application version');
    assert.ok(typeof data?.isHealthy === 'boolean', 'Must report isHealthy boolean');
    assert.ok(typeof data?.uptimeSeconds === 'number' && data?.uptimeSeconds >= 0, 'Must report positive uptimeSeconds');
    assert.ok(data?.services?.database, 'Must report database service status');
    assert.ok(data?.services?.database?.status === 'HEALTHY' || data?.services?.database?.status === 'UNHEALTHY');
    assert.ok(typeof data?.services?.database?.latencyMs === 'number', 'Must report database check latencyMs');
    assert.ok(data?.services?.backupScheduler, 'Must report backup scheduler status');
  });

  // ---------------------------------------------------------------------------
  // SECTION 3: RUNTIME METRICS ENDPOINT (GET /api/integration/v1/metrics)
  // ---------------------------------------------------------------------------

  await test('GET /api/integration/v1/metrics: Returns genuine process CPU, memory, database pool & traffic measurements', async () => {
    const res = await client.get('/api/integration/v1/metrics', {
      headers: authHeaders,
    });
    assert.strictEqual(res.status, 200);
    const data = res.data?.data;

    // Process & System CPU
    assert.ok(data?.cpu?.process, 'Must report process CPU measurements');
    assert.ok(typeof data?.cpu?.process?.cpuPercent === 'number', 'cpuPercent must be number');
    assert.ok(typeof data?.cpu?.process?.userMicroseconds === 'number', 'userMicroseconds must be number');
    assert.ok(data?.cpu?.system?.cpuCount > 0, 'Must report system CPU count');

    // Memory (process & system)
    assert.ok(data?.memory?.process?.heapUsedBytes > 0, 'Must report heapUsedBytes');
    assert.ok(data?.memory?.process?.rssBytes > 0, 'Must report rssBytes');
    assert.ok(data?.memory?.system?.totalBytes > 0, 'Must report system totalBytes');
    assert.ok(data?.memory?.system?.freeBytes > 0, 'Must report system freeBytes');

    // Database connection pool
    assert.ok(data?.database?.connected !== undefined, 'Must report DB connectivity');
    assert.ok(typeof data?.database?.latencyMs === 'number', 'Must report DB latencyMs');
    assert.ok(data?.database?.pool, 'Must report DB pool statistics');
    assert.ok(typeof data?.database?.pool?.totalConnections === 'number', 'Pool totalConnections must be number');
    assert.ok(typeof data?.database?.pool?.idleConnections === 'number', 'Pool idleConnections must be number');
    assert.ok(typeof data?.database?.pool?.activeConnections === 'number', 'Pool activeConnections must be number');
    assert.ok(data?.database?.pool?.maxConnections > 0, 'Pool maxConnections must be positive');

    // Traffic measurements summary
    assert.ok(data?.traffic, 'Must report traffic measurements');
    assert.ok(typeof data?.traffic?.requestRatePerSecond === 'number');
    assert.ok(typeof data?.traffic?.avgLatencyMs === 'number');

    // Background job health
    assert.ok(data?.backgroundJobs?.backupScheduler, 'Must report backup scheduler status');

    // Deployment version & platform
    assert.strictEqual(data?.deployment?.version, '1.0.0');
    assert.ok(data?.deployment?.nodeVersion?.startsWith('v'));
    assert.ok(data?.deployment?.processId > 0);

    // Host network throughput is genuine null (not fabricated mock)
    assert.strictEqual(data?.network?.hostThroughput, null, 'Host network throughput must be null as container lacks privileged counters');
    assert.ok(data?.collection?.limitations?.length > 0, 'Must document measurement limitations');
  });

  // ---------------------------------------------------------------------------
  // SECTION 4: TRAFFIC INSTRUMENTATION (GET /api/integration/v1/traffic)
  // ---------------------------------------------------------------------------

  await test('GET /api/integration/v1/traffic: Aggregates real application HTTP traffic into time windows', async () => {
    // Generate sample application traffic
    await client.get('/api/service-config');
    await client.get('/api/categories/');

    const res = await client.get('/api/integration/v1/traffic?window=5m&limit=10', {
      headers: authHeaders,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data?.success, true);
    assert.strictEqual(res.data?.meta?.resource, 'traffic');
    assert.ok(Array.isArray(res.data?.data), 'Traffic data must be array of time buckets');

    if (res.data?.data?.length > 0) {
      const bucket = res.data.data[0];
      assert.ok(bucket.timestamp, 'Bucket must have ISO timestamp');
      assert.ok(typeof bucket.totalRequests === 'number', 'totalRequests must be number');
      assert.ok(typeof bucket.successfulRequests === 'number', 'successfulRequests must be number');
      assert.ok(typeof bucket.avgLatencyMs === 'number', 'avgLatencyMs must be number');
      assert.ok(typeof bucket.p95LatencyMs === 'number', 'p95LatencyMs must be number');
      assert.ok(bucket.byRoute !== undefined, 'Must provide route breakdown');
      assert.ok(bucket.byMethod !== undefined, 'Must provide method breakdown');
    }
  });

  await test('GET /api/integration/v1/traffic: Validates query parameter limits', async () => {
    const res = await client.get('/api/integration/v1/traffic?limit=9999', {
      headers: authHeaders,
    });
    assert.strictEqual(res.status, 400, 'Expected 400 for excessive limit');
    assert.strictEqual(res.data?.error?.code, 'INVALID_PARAMETER');
  });

  // ---------------------------------------------------------------------------
  // SECTION 5: LOGS RETRIEVAL & FILTERING (GET /api/integration/v1/logs)
  // ---------------------------------------------------------------------------

  await test('GET /api/integration/v1/logs: Returns structured logs with pagination envelope', async () => {
    const res = await client.get('/api/integration/v1/logs?limit=10', {
      headers: authHeaders,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data?.success, true);
    assert.strictEqual(res.data?.meta?.resource, 'logs');
    assert.strictEqual(res.data?.meta?.limit, 10);
    assert.strictEqual(res.data?.meta?.page, 1);
    assert.ok(Array.isArray(res.data?.data), 'data must be array of log entries');
  });

  await test('GET /api/integration/v1/logs: Validates query parameters', async () => {
    const res = await client.get('/api/integration/v1/logs?page=0', {
      headers: authHeaders,
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data?.error?.code, 'INVALID_PARAMETER');
  });

  // ---------------------------------------------------------------------------
  // SECTION 6: DEPLOYMENTS ENDPOINT (GET /api/integration/v1/deployments)
  // ---------------------------------------------------------------------------

  await test('GET /api/integration/v1/deployments: Returns deployment status and active build details', async () => {
    const res = await client.get('/api/integration/v1/deployments', {
      headers: authHeaders,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data?.success, true);
    assert.strictEqual(res.data?.meta?.resource, 'deployments');
    assert.ok(Array.isArray(res.data?.data));
    assert.ok(res.data?.data?.length > 0);

    const dep = res.data.data[0];
    assert.strictEqual(dep.version, '1.0.0');
    assert.strictEqual(dep.status, 'ACTIVE');
    assert.strictEqual(dep.healthStatus, 'HEALTHY');
    assert.ok(dep.runtime?.includes('Node.js'));
    assert.ok(dep.deployedAt);
    assert.ok(typeof dep.uptimeSeconds === 'number');
  });

  // ---------------------------------------------------------------------------
  // SECTION 7: RESTRICTED READ-ONLY DIAGNOSTICS (GET /api/integration/v1/diagnostics)
  // ---------------------------------------------------------------------------

  await test('GET /api/integration/v1/diagnostics: Exposes restricted read-only operational state (No OS shell)', async () => {
    const res = await client.get('/api/integration/v1/diagnostics', {
      headers: authHeaders,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data?.success, true);
    const data = res.data?.data;
    assert.strictEqual(data?.readOnly, true, 'Diagnostics must explicitly declare read-only');
    assert.ok(data?.applicationHealth, 'Must include applicationHealth');
    assert.ok(data?.processStatus, 'Must include processStatus');
    assert.ok(data?.resourceUtilization, 'Must include resourceUtilization');
    assert.ok(data?.databaseConnectivity, 'Must include databaseConnectivity');
    assert.ok(Array.isArray(data?.recentLogs), 'Must include recentLogs array');
    assert.ok(Array.isArray(data?.recentDeployments), 'Must include recentDeployments array');
  });

  // ---------------------------------------------------------------------------
  // SECTION 8: RESOURCE AUTHORIZATION POLICY
  // ---------------------------------------------------------------------------

  await test('TaskHub Authz: Rejects access when resource is forbidden by policy', async () => {
    // Temporarily constrain allowed resources
    const originalAllowed = ENV.TASKHUB_INTEGRATION_ALLOWED_RESOURCES;
    ENV.TASKHUB_INTEGRATION_ALLOWED_RESOURCES = ['health', 'metrics'];

    try {
      const res = await client.get('/api/integration/v1/deployments', {
        headers: authHeaders,
      });
      assert.strictEqual(res.status, 403, `Expected 403 Forbidden for disallowed resource, got ${res.status}`);
      assert.strictEqual(res.data?.success, false);
      assert.strictEqual(res.data?.error?.code, 'RESOURCE_ACCESS_DENIED');
    } finally {
      ENV.TASKHUB_INTEGRATION_ALLOWED_RESOURCES = originalAllowed;
    }
  });

  return results;
}
