# 3D GALAXY — API OPTIMIZATION & WATERFALL REPORT

**Target Application:** 3D Galaxy E-Commerce & Admin Hub  
**Organization:** AJR Digital Hub  
**Document Version:** 1.0  

---

## 1. FRONTEND API CACHING STRATEGY

### Endpoint Caching Registry (`ApiService`)
The following endpoints are registered under `cacheableEndpoints` in [`api.service.ts`](file:///d:/Web%20Dev/3DGalaxy-Hub/3dgalaxy/src/app/services/api.service.ts#L59) to prevent duplicate HTTP calls across Angular component lifecycles:

```typescript
const cacheableEndpoints = [
  '/api/settings',
  '/api/categories',
  '/api/brands',
  '/api/home',
  '/api/homepage',
  '/api/public/instagram-feed',
  '/api/service-config',
  '/api/explore-navigation', // Added in Optimization Phase
  '/api/menus',              // Added in Optimization Phase
  '/api/header-menu'         // Added in Optimization Phase
];
```

---

## 2. ADMIN PORTAL WATERFALL CONSOLIDATION

### Before Optimization (Sequential Independent Requests)
```
[0ms]   GET /api/auth/me                      (Session Verification)
[120ms] GET /api/service-config               (App Configuration)
[250ms] GET /api/admin/analytics/overview     (Metrics Summary)
[400ms] GET /api/admin/analytics/sales/stream (60s SSE Stream Hold)
[550ms] GET /api/admin/notifications          (Admin Log Alerts)
[680ms] GET /api/admin/whatsapp/conversations (WhatsApp Inbox List)
```

### After Optimization (Consolidated Startup & Adaptive Polling)
```
[0ms]   GET /api/auth/me                      (Session Verification)
[110ms] GET /api/admin/dashboard-init         (Consolidated Startup Payload)
[200ms] GET /api/admin/analytics/sales        (Lightweight Initial Fetch)
```

*Note: Heavy sections (WhatsApp Inbox, Detailed Analytics, Order Logs) load lazily only when their respective admin tabs are selected by the user.*

---

## 3. ERROR LOGGING AMPLIFICATION SUPPRESSION

### Problem Solved
Previously, any HTTP failure (including 401 Unauthorized errors caused by expired tokens or guest users) triggered `LoggerService.reportError()`, dispatching a `POST /api/logs/client` back to Cloud Functions.

### Solution Applied
In [`logger.service.ts`](file:///d:/Web%20Dev/3DGalaxy-Hub/3dgalaxy/src/app/services/logger.service.ts#L111), status codes `401`, `403`, and `404` are filtered out early:

```typescript
const status = metadata?.status || metadata?.statusCode || (error && typeof error === 'object' ? error.status : undefined);
if (status === 401 || status === 403 || status === 404) {
  return; // Suppress client error log reporting for expected auth/navigation status codes
}
```

---

## 4. GUEST VS AUTHENTICATED API REQUEST SCOPING

| Endpoint | Guest User Action | Authenticated User Action | Security & Cost Prevention |
|---|---|---|---|
| `/api/wishlist` | Skipped by guard (`userRole() === 'guest'`) | Loaded for customer ID | Prevents 401 error logging loops |
| `/api/orders` | Protected route guard redirects to `/login` | Loads authenticated customer orders | Prevents unauthorized function execution |
| `/api/profile` | Skipped by guard | Loads profile data | Eliminates 401 round trips |
