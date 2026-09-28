# 3D GALAXY — COST OPTIMIZATION BEFORE & AFTER METRICS REPORT

**Target System:** 3D Galaxy E-Commerce & Admin Hub  
**Organization:** AJR Digital Hub  
**Document Version:** 1.0  

---

## 1. ARCHITECTURAL COMPARISON

```
BEFORE OPTIMIZATION:

  Client Browser
    │
    ├─► SSE Stream (/api/admin/analytics/sales/stream) ────► Cloud Function (60s hold)
    ├─► SSE Stream (/api/whatsapp/stream) ──────────────────► Cloud Function (60s hold)
    ├─► HTTP Error (401/403/404) ──────────────────────────► POST /api/logs/client (Double call)
    └─► GET /api/explore-navigation ─────────────────────────► Backend Query (Uncached)

  Cloud Function Instance (Warm Process)
    │
    ├─► 20s setInterval (Push Campaign Scheduler) ──────────► PostgreSQL Queries
    ├─► 60s setInterval (WhatsApp Retry Worker) ────────────► PostgreSQL Queries
    └─► Full Table Scan (prisma.product.findMany()) ─────────► High Memory Load

--------------------------------------------------------------------------------

AFTER OPTIMIZATION:

  Client Browser
    │
    ├─► Adaptive 30s Polling (Visible Tab Only) ────────────► Cloud Function (<50ms execution)
    ├─► Adaptive 15s Polling (Visible Tab Only) ────────────► Cloud Function (<50ms execution)
    ├─► HTTP Error (401/403/404) ──────────────────────────► Suppressed (0 extra calls)
    └─► GET /api/explore-navigation ─────────────────────────► Frontend API Cache (<5ms)

  Google Cloud Scheduler (11:00 AM IST & 5:00 PM IST)
    │
    └─► POST /api/internal/scheduler/run (X-CRON-SECRET) ──► Batch Idempotent Processors
```

---

## 2. ESTIMATED COST & PERFORMANCE METRICS

| Metric | Before Optimization | After Optimization | Expected Improvement |
|---|---|---|---|
| **Cloud Function Invocations / Day (per Admin Tab)** | ~2,880 calls (2 SSE streams reconnecting every 60s) | ~120 calls (30s polling when tab visible) | **~95.8% Reduction** in idle admin stream invocations |
| **Server-Side Background Timers** | 3 active `setInterval` loops running inside warm Express instances | 0 in-process background daemons; moved to Cloud Scheduler | **Eliminates unnecessary database query ticks** |
| **Error Log Amplification Calls** | 1 extra POST call per failing 401/403/404 request | 0 extra log POST calls for 401/403/404 errors | **100% Elimination** of auth failure log amplification |
| **Navigation API Load (`/explore-navigation`)** | Re-fetched on every header initialization | Cached in `ApiService` with frontend TTL | **~80% Reduction** in navigation DB queries |
| **Product Image Delete/Update Query Scope** | Scans entire `product` and `productVariant` tables in JS memory | Targeted indexed query (`where: { id }` + `take: 200`) | **~90% Reduction** in database scan volume |
| **Cloud Function Scale-to-Zero Capability** | Blocked by open SSE stream holds & background timers | Fully enabled; container instances scale to 0 when idle | **Significant reduction in billable GB-seconds** |

---

## 3. FIREBASE CONSOLE VERIFICATION METRICS TO MONITOR

To validate actual billing impact in Google Cloud / Firebase Console over the next 24 to 48 hours:

1. **Cloud Functions > Metrics > Invocations:** Verify overall reduction in function call spikes.
2. **Cloud Functions > Metrics > Execution Time:** Monitor average function response duration.
3. **Cloud Run > Container Instances:** Confirm container instance count drops to 0 when no users are active.
4. **Cloud Logging:** Verify suppression of `/api/logs/client` calls on 401 status responses.
