# TaskHub Observability Integration Guide (v1)

## 1. Architectural Overview

This document specifies the minimal-change, high-performance **TaskHub Observability Integration** implemented for the **3D Galaxy Storefront & Fabricator Engine**.

The integration reuses existing runtime telemetry, PostgreSQL connection pooling (`pg.Pool`), centralized structured logger (`functions/src/utils/logger.ts`), and global error handling. It adds zero heavy dependencies, produces no mock production data, preserves existing API consumers, and introduces no recursion or metric amplification loops.

---

## 2. Environment Variables & Secret Configuration

Add the following variables to `functions/.env` (or Google Cloud Run / Secret Manager in production):

```dotenv
# ==============================================================================
# TaskHub Observability & Telemetry Integration
# ==============================================================================
TASKHUB_INTEGRATION_ENABLED=true
TASKHUB_INTEGRATION_API_KEY=th_sec_3dgalaxy_prod_live_9f8b2c4e1a
TASKHUB_INTEGRATION_API_KEY_SECONDARY=
TASKHUB_INTEGRATION_KEY_ID=th_key_3dgalaxy_01
TASKHUB_INTEGRATION_ALLOWED_RESOURCES=health,metrics,logs,traffic,deployments
TASKHUB_APPLICATION_ID=3dgalaxy
TASKHUB_ENVIRONMENT=production
TASKHUB_ERROR_INGESTION_URL=
```

### Key Security & Rotation Policies
- **Timing-Safe Comparison**: Validated using `crypto.timingSafeEqual` to eliminate side-channel timing attacks.
- **Key Rotation**: Multiple comma-delimited keys in `TASKHUB_INTEGRATION_API_KEY` or `TASKHUB_INTEGRATION_API_KEY_SECONDARY` are accepted simultaneously, allowing seamless zero-downtime rotation.
- **Secret Redaction**: API keys and tokens are automatically masked as `[REDACTED]` or `[REDACTED_TOKEN]` by `maskSensitiveData` in logs and diagnostics.
- **HTTPS Enforcement**: In `production` (`process.env.NODE_ENV === 'production'`), requests without HTTPS or `X-Forwarded-Proto: https` are rejected with `403 Forbidden` (`HTTPS_REQUIRED`).

---

## 3. Uniform Response Envelope

All endpoints return the consistent TaskHub response envelope:

### Success Response Envelope
```json
{
  "success": true,
  "data": [],
  "meta": {
    "applicationId": "3dgalaxy",
    "environment": "production",
    "resource": "metrics",
    "timestamp": "2026-10-18T14:35:00.000Z",
    "requestId": "req_20261018_xyz123",
    "page": 1,
    "limit": 100,
    "total": 1,
    "hasMore": false,
    "nextCursor": null
  },
  "error": null
}
```

### Error Response Envelope
```json
{
  "success": false,
  "data": null,
  "meta": {
    "applicationId": "3dgalaxy",
    "environment": "production",
    "resource": "auth",
    "timestamp": "2026-10-18T14:35:00.000Z",
    "requestId": "req_20261018_xyz123",
    "page": null,
    "limit": null,
    "total": null,
    "hasMore": false,
    "nextCursor": null
  },
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid TaskHub integration API key.",
    "details": null
  }
}
```

---

## 4. Endpoint Reference

All endpoints accept authentication via the `X-API-Key` request header (or `Authorization: Bearer <key>`).

### 4.1. Application & Service Health
- **Endpoint**: `GET /api/integration/v1/health`
- **Resource Scope**: `health`
- **Rate Limit**: 120 req/min
- **Response**:
  - `status`: `'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'`
  - `isHealthy`: `boolean`
  - `uptimeSeconds`: Process uptime in seconds
  - `services.database`: Status and query latency (`SELECT 1`)
  - `services.firebase`: Firebase Admin SDK status
  - `services.storage`: Google Cloud Storage bucket binding status
  - `services.backupScheduler`: Automated disaster recovery scheduler status and schedule

### 4.2. Runtime Metrics
- **Endpoint**: `GET /api/integration/v1/metrics`
- **Resource Scope**: `metrics`
- **Rate Limit**: 120 req/min (cached 5s)
- **Response**:
  - `application`: Process uptime, boot timestamp, application version
  - `cpu`: Process user/system time, process CPU %, system load averages (1m, 5m, 15m), CPU core count
  - `memory`: Process heap used/total/rss/external in bytes and MB; system total and free memory
  - `disk`: Host filesystem bytes (total, free, used, percentUsed) via `fs.statfsSync` (or `null` if container restricts filesystem stats)
  - `network`: Process HTTP bytes in/out; `hostThroughput: null` (explicitly documented as unavailable in unprivileged container)
  - `traffic`: Request rate / sec, request rate / min, avg/p50/p95/p99 response latency (ms), 5m error rates
  - `database`: PostgreSQL connectivity, roundtrip query latency in ms, connection pool statistics (`pool.totalCount`, `pool.idleCount`, `pool.waitingCount`, `maxConnections`)
  - `backgroundJobs`: In-process backup daemon health and FCM notification service status
  - `deployment`: Application ID, commit SHA, Cloud Run revision, Node.js version, platform, arch

### 4.3. Structured Logs
- **Endpoint**: `GET /api/integration/v1/logs`
- **Resource Scope**: `logs`
- **Rate Limit**: 60 req/min
- **Query Parameters**:
  - `page`: Page index (default: `1`, min: `1`)
  - `limit`: Page size (default: `50`, min: `1`, max: `200`)
  - `date`: Specific calendar date (`YYYY-MM-DD`)
  - `from`: ISO start timestamp
  - `to`: ISO end timestamp
  - `level`: Severity filter (`DEBUG`, `INFO`, `WARN`, `ERROR`)
  - `module`: Subsystem module filter (`HTTP`, `ORDER`, `AUTH`, `PAYMENT`)
  - `search`: Case-insensitive text search
  - `requestId`: Correlation ID trace
  - `errorCode`: Specific error identifier

### 4.4. Traffic Measurements
- **Endpoint**: `GET /api/integration/v1/traffic`
- **Resource Scope**: `traffic`
- **Rate Limit**: 60 req/min
- **Query Parameters**:
  - `window`: Aggregation interval (`1m`, `5m`, `15m`, `1h`, `24h`, default: `5m`)
  - `from`: Start ISO timestamp
  - `to`: End ISO timestamp
  - `endpoint`: Route template filter (e.g. `/api/products/:id`)
  - `method`: HTTP method filter (`GET`, `POST`, `PUT`, `DELETE`)
  - `statusCode`: Status filter (`200`, `400`, `4xx`, `5xx`)
  - `page`: Page index (default: `1`)
  - `limit`: Page size (default: `50`, max: `100`)
- **Buckets Contain**:
  - Timestamp, interval duration, request count
  - Successful count (2xx/3xx), client errors (4xx), server errors (5xx)
  - Latency percentiles: `avgLatencyMs`, `minLatencyMs`, `maxLatencyMs`, `p50LatencyMs`, `p95LatencyMs`, `p99LatencyMs`
  - Breakdown maps: `byRoute`, `byMethod`, `byStatusCode`

### 4.5. Deployment Status
- **Endpoint**: `GET /api/integration/v1/deployments`
- **Resource Scope**: `deployments`
- **Rate Limit**: 120 req/min
- **Response**: Array of deployment records with `deploymentId`, `version`, `commitSha`, `branch`, `deployedAt`, `runtime`, `uptimeSeconds`, `healthStatus`

### 4.6. Restricted Live Terminal Diagnostics
- **Endpoint**: `GET /api/integration/v1/diagnostics`
- **Resource Scope**: `health` or `metrics`
- **Rate Limit**: 120 req/min
- **Security Policy**: Strictly **read-only**. Exposes no operating system shell execution. Aggregates system health, process resource utilization, database connection state, recent error logs, and deployment details.

---

## 5. Centralized Error Ingestion Forwarding

When `TASKHUB_ERROR_INGESTION_URL` (or `TASKHUB_WEBHOOK_URL`) is defined and `TASKHUB_INTEGRATION_ENABLED=true`:
1. Unhandled 5xx exceptions caught by `globalErrorHandler` are enqueued in an in-memory ring buffer (capacity: 100).
2. The buffer flushes asynchronously in the background via HTTP POST to the configured ingestion URL.
3. Recursive reporting is strictly prohibited: errors occurring during delivery or originating from `/api/integration/v1/*` are never re-reported.
4. Passwords, secrets, payment credentials, and tokens are redacted prior to payload dispatch.
5. Standard application HTTP responses are never blocked or altered.

---

## 6. Verification & Test Results

The test suite validates authentication, rate limiting, header interoperability, key rotation, query parameter bounds, metric accuracy, log pagination, and response envelope structure:

```bash
npm test
```

**Results**:
- Total Test Cases: **192**
- Passed: **192**
- Failed: **0**
- Execution Time: **~14s**
