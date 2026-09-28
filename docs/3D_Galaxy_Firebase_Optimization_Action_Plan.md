# 3D GALAXY — FIREBASE OPTIMIZATION ACTION PLAN

**Target Application:** 3D Galaxy E-Commerce & Admin Hub  
**Organization:** AJR Digital Hub  
**Document Version:** 1.0  
**Implementation Phase:** Technical Action Plan (Post Audit Approval)  

---

## OVERVIEW

This document outlines the step-by-step implementation plan to resolve high Firebase Cloud Functions billing and optimize overall application performance. 

All recommended changes adhere to the **OPTIMIZE over REMOVE** principle to ensure **100% feature preservation** across e-commerce storefront, product variants, shopping cart, checkout, Razorpay/COD payments, shipping rules, GST calculation, order tracking, notifications, WhatsApp integration, and admin portal management.

---

## PHASE 1: ZERO-RISK FRONTEND & CACHING OPTIMIZATIONS

### Action 1.1: Add `/explore-navigation` to Frontend Caching
* **Target File:** `src/app/services/api.service.ts`
* **Current Code:**
  ```typescript
  const cacheableEndpoints = [
    '/api/settings',
    '/api/categories',
    '/api/brands',
    '/api/home',
    '/api/homepage',
    '/api/public/instagram-feed',
    '/api/service-config'
  ];
  ```
* **Modification:** Add `'/api/explore-navigation'` to `cacheableEndpoints`.
* **Expected Effect:** Prevents duplicate requests to `/api/explore-navigation` during component lifecycle re-initializations across route transitions.
* **Risk Level:** Zero risk.

### Action 1.2: Suppress Logging Amplification Loop on HTTP 401/403/404
* **Target File:** `src/app/services/logger.service.ts`
* **Current Code:**
  ```typescript
  public reportError(message: string, error?: any, metadata: any = {}, feature: string = 'FRONTEND') {
    ...
    const apiUrl = `${environment.apiUrl}/logs/client`;
    fetch(apiUrl, { ... });
  }
  ```
* **Modification:** Add a guard check to exit early if `metadata?.status` is `401`, `403`, or `404`.
  ```typescript
  const status = metadata?.status || metadata?.statusCode;
  if (status === 401 || status === 403 || status === 404) {
    return; // Do not report client-side 401/403/404 errors back to Cloud Functions
  }
  ```
* **Expected Effect:** Prevents exponential logging loops when unauthenticated guest users or expired tokens trigger HTTP error responses.
* **Risk Level:** Zero risk.

### Action 1.3: Replace Admin SSE Long-Polling Streams with Adaptive Polling
* **Target Files:**
  - `src/app/pages/admin/components/sales-analytics/sales-analytics.component.ts`
  - `src/app/core/services/admin-whatsapp.service.ts`
* **Current Code:** Creates an `EventSource` connection to `/api/admin/analytics/sales/stream` and `/api/whatsapp/stream`, which times out every 60s in Cloud Functions 2nd Gen and reconnects infinitely.
* **Modification:** Replace `EventSource` with an adaptive 30-second interval timer that polls only when `document.hidden === false`.
* **Expected Effect:** Eliminates continuous 60-second function request holds, saving up to 1,440 function invocations per active admin tab per day.
* **Risk Level:** Low. Live metrics update smoothly every 30s.

---

## PHASE 2: BACKEND QUERY & DATABASE OPTIMIZATIONS

### Action 2.1: Fix Unbounded Scans in Image Controllers
* **Target Files:**
  - `functions/src/controllers/productImage.ts`
  - `functions/src/controllers/productVariantImage.ts`
* **Current Code:**
  ```typescript
  // BAD: Full table scan into process RAM
  const products = await prisma.product.findMany();
  const variants = await prisma.productVariant.findMany();
  ```
* **Modification:** Refactor `deleteProductImage`, `setPrimaryImage`, and `deleteVariantImage` to accept `productId` or `variantId` explicitly in the API route parameters, performing targeted indexed queries (`where: { id }`).
* **Expected Effect:** Eliminates full database table reads into Node process RAM during admin image management.
* **Risk Level:** Low.

### Action 2.2: Add Field Projections & Pagination to Product Listing Endpoints
* **Target File:** `functions/src/controllers/product.ts`
* **Current Code:** Product list queries return heavy JSON fields (descriptions, full variant lists, raw specification arrays).
* **Modification:** Add explicit `select` blocks to return only card preview fields (`id`, `name`, `slug`, `basePrice`, `salePrice`, `images`, `rating`, `stock`, `isActive`) for product listing endpoints.
* **Expected Effect:** Reduces database payload size and network bandwidth by ~60%.
* **Risk Level:** Low.

---

## PHASE 3: INFRASTRUCTURE & SCHEDULER DECOUPLING

### Action 3.1: Move In-Memory Schedulers to Cloud Scheduler
* **Target Files:**
  - `functions/src/services/scheduler.ts`
  - `functions/src/controllers/whatsapp.ts`
* **Current Code:** `setInterval` daemons execute every 20s and 60s inside Express app initialization.
* **Modification:**
  1. Remove `setInterval` daemon invocations from Express app startup.
  2. Create secure internal endpoints (e.g. `POST /api/internal/cron/push-campaigns` and `POST /api/internal/cron/whatsapp-retry`) protected by a secret `X-CRON-SECRET` header.
  3. Configure Google Cloud Scheduler jobs to trigger these endpoints at desired intervals (e.g. every 5 minutes).
* **Expected Effect:** Allows Cloud Function containers to scale to 0 when idle without running continuous database ticks inside warm instances.
* **Risk Level:** Medium (Requires Cloud Scheduler console setup).

### Action 3.2: Enable Function Concurrency & Memory Sizing
* **Target File:** `functions/index.js`
* **Current Code:**
  ```javascript
  exports.api = onRequest({ 
    cors: true,
    memory: "512MiB",
    timeoutSeconds: 60
  }, app);
  ```
* **Modification:** Configure concurrency setting (`concurrency: 80`).
* **Expected Effect:** Enables a single container instance to process up to 80 concurrent HTTP requests, dramatically reducing active container instance count and billing hours.
* **Risk Level:** Low.

---

## PHASE 4: MONITORING & TELEMETRY SETUP

### Action 4.1: Firebase Billing Budget Alerts
* Set up a budget alert in Google Cloud Console at **₹500 / month** with notifications at 50%, 80%, and 100%.

### Action 4.2: Realtime Function Invocation Dashboards
* Create a Cloud Monitoring dashboard tracking:
  - Invocation count per route
  - Execution duration (p50, p95, p99)
  - Active Cloud Run instance count

---

## VERIFICATION & REGRESSION CHECKLIST

| Feature Module | Verification Test | Expected Outcome |
|---|---|---|
| E-Commerce Catalog | Browse Categories & Filter Products | Loads quickly with cached navigation |
| Product Details | View Product & Change Variants | Dynamic variant pricing & images work seamlessly |
| Shopping Cart & Shipping | Add to Cart & Calculate Shipping Rules | Cart calculations & shipping rules compute correctly |
| Razorpay / COD Checkout | Complete Test Order | Payment order creation & verification pass |
| Admin Dashboard | View Sales Analytics & Products | Dashboard updates cleanly without SSE timeouts |
| WhatsApp Inbox | Send/Receive Admin Messages | Messages sync reliably via 15s adaptive polling |
