import { Router } from 'express';
import {
  authenticateTaskHub,
  requireTaskHubResource,
  taskhubGeneralLimiter,
  taskhubQueryLimiter,
} from './taskhub.middleware';
import taskhubController from './taskhub.controller';

const router = Router();

// Apply global TaskHub rate limiter and authentication to all TaskHub routes
router.use(taskhubGeneralLimiter);
router.use(authenticateTaskHub);

// -----------------------------------------------------------------------------
// 1. GET /api/integration/v1/health
// -----------------------------------------------------------------------------
router.get(
  '/health',
  requireTaskHubResource('health'),
  taskhubController.getHealth
);

// -----------------------------------------------------------------------------
// 2. GET /api/integration/v1/metrics
// -----------------------------------------------------------------------------
router.get(
  '/metrics',
  requireTaskHubResource('metrics'),
  taskhubController.getMetrics
);

// -----------------------------------------------------------------------------
// 3. GET /api/integration/v1/logs
// -----------------------------------------------------------------------------
router.get(
  '/logs',
  requireTaskHubResource('logs'),
  taskhubQueryLimiter,
  taskhubController.getLogs
);

// -----------------------------------------------------------------------------
// 4. GET /api/integration/v1/traffic
// -----------------------------------------------------------------------------
router.get(
  '/traffic',
  requireTaskHubResource('traffic'),
  taskhubQueryLimiter,
  taskhubController.getTraffic
);

// -----------------------------------------------------------------------------
// 5. GET /api/integration/v1/deployments
// -----------------------------------------------------------------------------
router.get(
  '/deployments',
  requireTaskHubResource('deployments'),
  taskhubController.getDeployments
);

// -----------------------------------------------------------------------------
// 6. GET /api/integration/v1/diagnostics (Restricted Read-Only Terminal Diagnostics)
// -----------------------------------------------------------------------------
router.get(
  '/diagnostics',
  requireTaskHubResource('diagnostics'),
  taskhubController.getDiagnostics
);

export default router;
