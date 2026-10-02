import { Router } from 'express';
import {
  integrationCorsMiddleware,
  integrationCorrelationAndAuditMiddleware,
  authenticateIntegration,
  requireIntegrationScope,
  integrationGeneralLimiter,
  integrationQueryLimiter,
  integrationRestoreLimiter,
} from './integration.middleware';
import integrationController from './integration.controller';

const router = Router();

// -----------------------------------------------------------------------------
// Global Integration Pipeline: Strict CORS, Correlation ID, and Audit Logging
// -----------------------------------------------------------------------------
router.use(integrationCorsMiddleware);
router.use(integrationCorrelationAndAuditMiddleware);
router.use(integrationGeneralLimiter);

// -----------------------------------------------------------------------------
// 1. Health Endpoint (Requirement 14)
// GET /api/integration/v1/admin/health
// -----------------------------------------------------------------------------
router.get(
  '/health',
  (req, res, next) => {
    // If an authorization or api key header is supplied, authenticate it
    if (req.headers.authorization || req.headers['x-integration-key'] || req.headers['x-integration-token']) {
      return authenticateIntegration(req as any, res, next);
    }
    next();
  },
  integrationController.getHealth
);

// -----------------------------------------------------------------------------
// 2. Token Minting (OAuth2 Service-to-Service Client Credentials Flow)
// POST /api/integration/v1/admin/auth/token
// -----------------------------------------------------------------------------
router.post('/auth/token', integrationController.mintToken);

// -----------------------------------------------------------------------------
// 3. Telemetry & Log Endpoints (Requirement 4)
// GET /api/integration/v1/admin/logs
// GET /api/integration/v1/admin/logs/:id
// -----------------------------------------------------------------------------
router.get(
  '/logs',
  authenticateIntegration,
  requireIntegrationScope('logs:read'),
  integrationQueryLimiter,
  integrationController.getLogs
);

router.get(
  '/logs/:id',
  authenticateIntegration,
  requireIntegrationScope('logs:read'),
  integrationQueryLimiter,
  integrationController.getLogById
);

// -----------------------------------------------------------------------------
// 4. Inventory Endpoints (Requirement 5)
// GET /api/integration/v1/admin/inventory
// GET /api/integration/v1/admin/inventory/:id
// -----------------------------------------------------------------------------
router.get(
  '/inventory',
  authenticateIntegration,
  requireIntegrationScope('inventory:read'),
  integrationQueryLimiter,
  integrationController.getInventory
);

router.get(
  '/inventory/:id',
  authenticateIntegration,
  requireIntegrationScope('inventory:read'),
  integrationQueryLimiter,
  integrationController.getInventoryById
);

// -----------------------------------------------------------------------------
// 5. Database Backup Endpoints (Requirements 6, 7, 8)
// GET  /api/integration/v1/admin/backups/health
// GET  /api/integration/v1/admin/backups/history
// GET  /api/integration/v1/admin/backups/config
// POST /api/integration/v1/admin/backups/:id/verify
// POST /api/integration/v1/admin/backups/:id/restore
// GET  /api/integration/v1/admin/backups/:id/download
// -----------------------------------------------------------------------------
router.get(
  '/backups/health',
  authenticateIntegration,
  requireIntegrationScope('backup:read'),
  integrationController.getBackupsHealth
);

router.get(
  '/backups/history',
  authenticateIntegration,
  requireIntegrationScope('backup:read'),
  integrationQueryLimiter,
  integrationController.getBackupsHistory
);

router.get(
  '/backups/config',
  authenticateIntegration,
  requireIntegrationScope('backup:read'),
  integrationController.getBackupsConfig
);

router.post(
  '/backups/:id/verify',
  authenticateIntegration,
  requireIntegrationScope('backup:verify'),
  integrationController.verifyBackup
);

router.post(
  '/backups/:id/restore',
  authenticateIntegration,
  requireIntegrationScope('backup:restore'),
  integrationRestoreLimiter,
  integrationController.restoreBackup
);

router.get(
  '/backups/:id/download',
  (req, res, next) => {
    // If signed temporary token is passed in query, skip header auth check
    if (req.query.token) {
      return next();
    }
    return authenticateIntegration(req as any, res, () => {
      requireIntegrationScope('backup:read')(req as any, res, next);
    });
  },
  integrationController.downloadBackup
);

// -----------------------------------------------------------------------------
// 6. Configuration Endpoints (Requirement 11)
// GET /api/integration/v1/admin/configuration
// PUT /api/integration/v1/admin/configuration
// -----------------------------------------------------------------------------
router.get(
  '/configuration',
  authenticateIntegration,
  requireIntegrationScope('configuration:read'),
  integrationController.getConfiguration
);

router.put(
  '/configuration',
  authenticateIntegration,
  requireIntegrationScope('configuration:write'),
  integrationController.updateConfiguration
);

export default router;
