# Admin Integration API (v1) Specification

A secure, controlled, versioned Admin Integration API enabling external administration and operational platforms (such as **TaskHub**) to securely access telemetry, inventory, backups, configuration, and system health from **3D Galaxy**.

---

## 1. Architecture Overview

```
                      Central Administration Platform (TaskHub)
                                          │
                                          ▼  [HTTPS + X-Request-ID]
                       ┌──────────────────────────────────────┐
                       │  CORS / Origin Enforcement (No '*') │
                       └──────────────────┬───────────────────┘
                                          │
                                          ▼
                       ┌──────────────────────────────────────┐
                       │ Authentication (JWT / Firebase / Key)│
                       └──────────────────┬───────────────────┘
                                          │
                                          ▼
                       ┌──────────────────────────────────────┐
                       │ Authorization (Role=ADMIN & Scopes) │
                       └──────────────────┬───────────────────┘
                                          │
                                          ▼
                       ┌──────────────────────────────────────┐
                       │ Rate Limiting & Audit Telemetry Log  │
                       └──────────────────┬───────────────────┘
                                          │
                                          ▼
                         /api/integration/v1/admin
                                          │
        ┌───────────────┬─────────────────┼─────────────────┬────────────────┐
        ▼               ▼                 ▼                 ▼                ▼
   GET /health      GET /logs      GET /inventory    /backups/*       /configuration
        │               │                 │                 │                │
  [Health Checks] [Existing Logs] [Inventory Adapter] [BackupEngine] [Settings Service]
```

### Key Principles
1. **Zero Functionality Duplication:** Exposes existing application telemetry, inventory, backup engine, and configuration without creating duplicate databases or engines.
2. **Strict Least Privilege:** Every endpoint requires `role = ADMIN` and a specific granular scope.
3. **No Permanent Unrestricted Passwords:** Uses short-lived JWT tokens, signed integration keys, and Firebase identity tokens.
4. **Data Masking:** Sensitive credentials (passwords, secrets, private keys, database credentials) are masked (`[REDACTED]`) before leaving the server.

---

## 2. Base URL & API Versioning

All integration endpoints are scoped under:
```http
/api/integration/v1/admin
```

---

## 3. Request Correlation (`X-Request-ID`)

Every incoming request can supply an `X-Request-ID` (or `x-request-id`) header for distributed end-to-end tracing with TaskHub.

- If supplied by TaskHub, the API uses it across all logs, telemetry, and audit records.
- If omitted, the server automatically generates one formatted as `taskhub_<date>_<random>`.
- The correlated ID is always returned in the response header:
  ```http
  X-Request-ID: taskhub_20261002_abc123
  ```

---

## 4. Authentication

All integration endpoints require authentication via one of three service-to-service mechanisms:

### Option A: Short-lived Bearer JWT (Recommended)
Pass an OAuth2 access token issued by the token minting endpoint:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### Option B: Signed Service Key
For automated cron jobs or backend workers:
```http
X-Integration-Key: <INTEGRATION_CLIENT_SECRET>
X-Integration-Client: TASKHUB
```

### Option C: Firebase Admin ID Token
```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

---

## 5. Token Minting (Client Credentials Flow)

Central admin platforms can exchange client credentials for a short-lived (1 hour) scoped JWT.

### `POST /api/integration/v1/admin/auth/token`

#### Request Headers
```http
Content-Type: application/json
X-Request-ID: req_token_001
```

#### Request Body
```json
{
  "clientId": "taskhub",
  "clientSecret": "taskhub_admin_secret_key_2026",
  "scopes": [
    "logs:read",
    "inventory:read",
    "backup:read",
    "backup:verify",
    "backup:restore",
    "configuration:read",
    "configuration:write"
  ]
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "scope": "logs:read inventory:read backup:read backup:verify backup:restore configuration:read configuration:write",
  "meta": {
    "requestId": "req_token_001"
  }
}
```

---

## 6. Permissions & Scopes Matrix

| Endpoint | Method | Required Role | Required Scope | Rate Limit |
|:---|:---|:---|:---|:---|
| `/health` | `GET` | *Public or Authenticated* | None | 120 req / min |
| `/auth/token` | `POST` | *Service Credentials* | None | 120 req / min |
| `/logs` | `GET` | `ADMIN` | `logs:read` | 60 req / min |
| `/logs/:id` | `GET` | `ADMIN` | `logs:read` | 60 req / min |
| `/inventory` | `GET` | `ADMIN` | `inventory:read` | 60 req / min |
| `/inventory/:id` | `GET` | `ADMIN` | `inventory:read` | 60 req / min |
| `/backups/health` | `GET` | `ADMIN` | `backup:read` | 120 req / min |
| `/backups/history` | `GET` | `ADMIN` | `backup:read` | 60 req / min |
| `/backups/config` | `GET` | `ADMIN` | `backup:read` | 120 req / min |
| `/backups/:id/verify`| `POST`| `ADMIN` | `backup:verify` | 60 req / min |
| `/backups/:id/restore`| `POST`| `ADMIN` | `backup:restore` | **3 req / 15 min** |
| `/backups/:id/download`| `GET` | `ADMIN` | `backup:read` | 60 req / min |
| `/configuration` | `GET` | `ADMIN` | `configuration:read` | 120 req / min |
| `/configuration` | `PUT` | `ADMIN` | `configuration:write`| 120 req / min |

---

## 7. Rate Limits

Integration endpoints enforce in-memory sliding-window IP rate limiters to prevent resource abuse:

1. **General Limiter:** 120 requests / minute across all integration routes (`int_gen`).
2. **Query Limiter:** 60 requests / minute for query-heavy operations (`int_query` on `/logs`, `/inventory`, `/backups/history`).
3. **Restore Limiter:** 3 requests / 15-minute window for destructive operations (`int_restore` on `/backups/:id/restore`).

When a rate limit is exceeded, the server returns HTTP `429 Too Many Requests` with a `Retry-After` header indicating seconds until reset.

---

## 8. Audit Logging

Every integration request is audited and stored in structured server logs and telemetry with `module: "INTEGRATION_AUDIT"`:

```json
{
  "timestamp": "2026-10-02T02:19:38.620Z",
  "requestId": "taskhub_20261002_abc123",
  "integrationClient": "TASKHUB",
  "adminUser": "taskhub_integration_service",
  "endpoint": "/api/integration/v1/admin/backups/a80620f5-2745-4a52-b9c9-9e22d7fd4648/verify",
  "method": "POST",
  "action": "BACKUP_VERIFY",
  "resourceId": "a80620f5-2745-4a52-b9c9-9e22d7fd4648",
  "status": "SUCCESS",
  "statusCode": 200,
  "duration": 42
}
```

---

## 9. Endpoints Specification

### 9.1 Health Check

#### `GET /api/integration/v1/admin/health`
Performs live health checks on the database, Firebase connection, storage bucket, and backup engine.

#### Response (`200 OK` or `503 Service Unavailable`)
```json
{
  "success": true,
  "application": "3D Galaxy",
  "environment": "production",
  "status": "HEALTHY",
  "version": "1.0.0",
  "timestamp": "2026-10-02T02:17:25.159Z",
  "services": {
    "database": "HEALTHY",
    "firebase": "CONNECTED",
    "storage": "CONNECTED",
    "backup": "HEALTHY"
  }
}
```

---

### 9.2 Logs & Telemetry

#### `GET /api/integration/v1/admin/logs`
Reads and queries existing application telemetry files line-by-line.

#### Query Parameters
- `page` *(number, default: 1)*
- `limit` *(number, default: 50, max: 200)*
- `date` *(string, format: YYYY-MM-DD)*
- `from` *(string, ISO timestamp)*
- `to` *(string, ISO timestamp)*
- `level` *(string: `DEBUG`, `INFO`, `WARN`, `ERROR`)*
- `module` *(string: `HTTP`, `SETTINGS`, `SECURITY`, `DATABASE`, etc.)*
- `search` *(string, full-text substring search)*
- `requestId` *(string, correlation ID)*
- `errorCode` *(string, e.g. `SLOW_API_RESPONSE`)*

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2026-10-02T02:17:28.359Z",
      "level": "WARN",
      "service": "backend",
      "environment": "production",
      "module": "HTTP",
      "message": "Slow API Warning: HTTP GET /api/integration/v1/admin/inventory took 1679ms",
      "errorCode": "SLOW_API_RESPONSE",
      "metadata": {
        "requestId": "test_inv_req_003",
        "route": "/api/integration/v1/admin/inventory",
        "method": "GET",
        "statusCode": 200,
        "durationMs": 1679
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 34,
    "requestId": "taskhub_20261002_xyz789"
  }
}
```

#### `GET /api/integration/v1/admin/logs/:id`
Retrieves a single log entry by its `requestId` or unique log ID.

---

### 9.3 Inventory Data

#### `GET /api/integration/v1/admin/inventory`
Exposes the normalized inventory records from the application's existing database.

#### Query Parameters
- `page` *(number, default: 1)*
- `limit` *(number, default: 50)*
- `search` *(string, searches product name, SKU)*
- `status` *(string: `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, `INACTIVE`)*

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "02e7b302-6b81-4f6d-b125-2141a27af989",
      "name": "PLA Pro Filament 1.75mm",
      "type": "Filaments",
      "status": "IN_STOCK",
      "quantity": 4028,
      "updatedAt": "2026-09-18T08:28:56.977Z",
      "details": {
        "sku": "pla-filament-for-3d-prinitng",
        "slug": "pla-pro-filament-1-75mm",
        "brand": "3D Galaxy",
        "basePrice": 620,
        "salePrice": 620,
        "variantsCount": 54
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 145,
    "requestId": "taskhub_20261002_inv001"
  }
}
```

#### `GET /api/integration/v1/admin/inventory/:id`
Retrieves a single normalized inventory item by ID. Returns `404` if not found.

---

### 9.4 Database Backups

#### `GET /api/integration/v1/admin/backups/health`
Runs database and integrity health check via the backup engine.

#### `GET /api/integration/v1/admin/backups/history`
Returns paginated database backup records and retention metadata.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "a80620f5-2745-4a52-b9c9-9e22d7fd4648",
      "backupName": "3dgalaxy-db-backup-2026-10-01-161311.zip",
      "storagePath": "db_backups/2026-10-01/3dgalaxy-db-backup-2026-10-01-161311.zip",
      "fileSize": 1941934,
      "checksum": "624d911184df96cf69d8b47f4da81a0f776a6723e8a2d77cd886ff63489cbc97",
      "tableCount": 74,
      "backupType": "MANUAL",
      "status": "SUCCESS",
      "durationMs": 73180,
      "createdAt": "2026-10-01T10:43:11.636Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 13,
    "isOverdue": false,
    "overdueDays": 0,
    "totalSizeBytes": 15378240,
    "requestId": "taskhub_20261002_bkh001"
  }
}
```

#### `GET /api/integration/v1/admin/backups/config`
Returns safe backup configuration (cron schedule, retention rules, storage root) without exposing private keys.

#### `POST /api/integration/v1/admin/backups/:id/verify`
Validates ZIP archive structure, manifest, and SHA-256 checksums in storage without modifying database state.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "valid": true,
    "tableCount": 74,
    "databaseVersion": "17.6",
    "createdAt": "2026-10-01T10:44:20.230Z",
    "checksumMatches": true,
    "manifest": {
      "application": "3D Galaxy",
      "backupType": "FULL_DATABASE",
      "tableCount": 74,
      "databaseType": "PostgreSQL"
    }
  },
  "meta": {
    "requestId": "taskhub_20261002_vfy001"
  }
}
```

#### `POST /api/integration/v1/admin/backups/:id/restore`
Executes an actual restore using the existing backup engine.

- Validates that the backup belongs to this application (`3D Galaxy`).
- Validates that the backup status is `SUCCESS`.
- Audits the operation.
- **Does not return success before the restore operation confirms actual completion.**

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Database backup successfully restored and verified.",
  "data": {
    "success": true,
    "preRestoreSafetyBackupPath": "db_backups/safety/pre-restore-2026-10-02-120000.zip",
    "healthCheck": { "healthy": true },
    "durationMs": 14250
  },
  "meta": {
    "requestId": "taskhub_20261002_rst001"
  }
}
```

#### `GET /api/integration/v1/admin/backups/:id/download`
Returns a secure, temporary download URL and short-lived signed download token valid for 15 minutes. Does **not** expose permanent cloud credentials.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "backupId": "a80620f5-2745-4a52-b9c9-9e22d7fd4648",
    "fileName": "3dgalaxy-db-backup-2026-10-01-161311.zip",
    "fileSize": 1941934,
    "checksum": "624d911184df96cf69d8b47f4da81a0f776a6723e8a2d77cd886ff63489cbc97",
    "expiresAt": "2026-10-02T02:34:38.495Z",
    "downloadUrl": "/api/integration/v1/admin/backups/a80620f5-2745-4a52-b9c9-9e22d7fd4648/download?token=eyJhbGciOi..."
  },
  "meta": {
    "requestId": "taskhub_20261002_dl001"
  }
}
```

---

### 9.5 Configuration Management

#### `GET /api/integration/v1/admin/configuration`
Returns application settings with all sensitive credentials automatically masked.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "siteName": "3D Galaxy",
    "currency": "₹",
    "paymentGatewaySettings": {
      "codEnabled": true,
      "razorpay": {
        "keyId": "rzp_live_SNG7uJLmD1ITuz",
        "enabled": true,
        "keySecret": "[REDACTED]"
      }
    }
  },
  "meta": {
    "requestId": "taskhub_20261002_cfg001"
  }
}
```

#### `PUT /api/integration/v1/admin/configuration`
Updates application settings, invalidates server cache, and audits the change. Redacted fields (`[REDACTED]`) in the request payload are automatically preserved and not overwritten.

---

## 10. Standard Error Responses

All errors return JSON with the correlated `requestId`:

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized: Authentication required. Provide a valid Bearer token or X-Integration-Key.",
  "code": "AUTH_REQUIRED",
  "requestId": "taskhub_20261002_err001"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Forbidden: Missing required integration scope 'configuration:write'.",
  "code": "INSUFFICIENT_SCOPE",
  "requiredScope": "configuration:write",
  "requestId": "taskhub_20261002_err002"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Backup archive with identifier '00000000-0000-0000-0000-000000000000' was not found.",
  "requestId": "taskhub_20261002_err003"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "A backup or restore operation is already in progress.",
  "activeJob": { "type": "RESTORE", "stage": "VERIFYING", "progressPercent": 20 },
  "requestId": "taskhub_20261002_err004"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Destructive operation rate limit reached. Only 3 restore requests permitted per 15-minute window.",
  "message": "Destructive operation rate limit reached. Only 3 restore requests permitted per 15-minute window.",
  "requestId": "taskhub_20261002_err005"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal database query execution error",
  "requestId": "taskhub_20261002_err006"
}
```

### 503 Service Unavailable
```json
{
  "success": false,
  "application": "3D Galaxy",
  "environment": "production",
  "status": "DEGRADED",
  "version": "1.0.0",
  "timestamp": "2026-10-02T02:17:25.159Z",
  "services": {
    "database": "HEALTHY",
    "firebase": "DISCONNECTED",
    "storage": "CONNECTED",
    "backup": "HEALTHY"
  }
}
```

---

## 11. TaskHub Integration Quickstart (cURL Examples)

### Step 1: Mint Integration Access Token
```bash
curl -X POST https://3dgalaxy.co.in/api/integration/v1/admin/auth/token \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: taskhub_init_001" \
  -d '{
    "clientId": "taskhub",
    "clientSecret": "taskhub_admin_secret_key_2026",
    "scopes": ["logs:read", "inventory:read", "backup:read", "backup:verify", "backup:restore", "configuration:read", "configuration:write"]
  }'
```

### Step 2: Fetch System Health
```bash
curl -X GET https://3dgalaxy.co.in/api/integration/v1/admin/health \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Request-ID: taskhub_health_001"
```

### Step 3: Fetch Normalized Inventory
```bash
curl -X GET "https://3dgalaxy.co.in/api/integration/v1/admin/inventory?limit=50&status=IN_STOCK" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Request-ID: taskhub_inv_001"
```

### Step 4: Fetch Telemetry Logs
```bash
curl -X GET "https://3dgalaxy.co.in/api/integration/v1/admin/logs?limit=50&level=WARN" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Request-ID: taskhub_logs_001"
```

### Step 5: Verify and Restore Backup
```bash
# Verify backup integrity first
curl -X POST https://3dgalaxy.co.in/api/integration/v1/admin/backups/a80620f5-2745-4a52-b9c9-9e22d7fd4648/verify \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Request-ID: taskhub_verify_001"

# Execute controlled restore
curl -X POST https://3dgalaxy.co.in/api/integration/v1/admin/backups/a80620f5-2745-4a52-b9c9-9e22d7fd4648/restore \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Request-ID: taskhub_restore_001"
```
