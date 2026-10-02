import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as admin from 'firebase-admin';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { createRateLimiter } from '../../middleware/rateLimiter';
import {
  AuthenticatedIntegrationRequest,
  IntegrationClient,
  IntegrationScope,
  IntegrationAuditRecord,
  IntegrationTokenPayload,
} from './integration.types';

const INTEGRATION_JWT_SECRET =
  process.env.INTEGRATION_JWT_SECRET ||
  process.env.JWT_SECRET ||
  'bbrahma_3d_galaxy_labs_secret_jwt_key_2026';

const DEFAULT_INTEGRATION_CLIENT_ID = process.env.INTEGRATION_CLIENT_ID || 'taskhub';
const DEFAULT_INTEGRATION_CLIENT_SECRET =
  process.env.INTEGRATION_CLIENT_SECRET || 'taskhub_admin_secret_key_2026';

// -----------------------------------------------------------------------------
// 1. CORS CONFIGURATION (Requirement 15)
// Strictly forbids wildcard *; checks configured TaskHub / admin origins
// -----------------------------------------------------------------------------
export const integrationCorsMiddleware = (
  req: AuthenticatedIntegrationRequest,
  res: Response,
  next: NextFunction
) => {
  const origin = req.headers.origin;
  const configuredOrigins = (
    process.env.TASKHUB_ALLOWED_ORIGINS ||
    process.env.INTEGRATION_ALLOWED_ORIGINS ||
    process.env.ALLOWED_ORIGINS ||
    'http://localhost:4200,http://localhost:3000,https://3dgalaxy.co.in,https://admin.3dgalaxy.in'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (origin) {
    const isAllowed =
      configuredOrigins.includes(origin) ||
      (process.env.NODE_ENV !== 'production' &&
        (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')));

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      logger.warn(`[INTEGRATION CORS] Blocked unauthorized origin: ${origin}`, {
        origin,
        url: req.originalUrl,
      });
      return res.status(403).json({
        success: false,
        error: 'CORS policy: Origin not allowed for Admin Integration API',
        requestId: req.requestId,
      });
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Request-ID, X-Integration-Key, X-Integration-Token, Accept, Origin'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

// -----------------------------------------------------------------------------
// 2. REQUEST CORRELATION & AUDIT LOGGING (Requirements 9 & 10)
// -----------------------------------------------------------------------------
export const integrationCorrelationAndAuditMiddleware = (
  req: AuthenticatedIntegrationRequest,
  res: Response,
  next: NextFunction
) => {
  const incomingId =
    req.headers['x-request-id'] ||
    req.headers['x-correlation-id'] ||
    req.query.requestId;

  let requestId: string;
  if (incomingId && typeof incomingId === 'string' && incomingId.trim().length > 0) {
    requestId = incomingId.trim();
  } else {
    const dateStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 8);
    const randStr = Math.random().toString(36).substring(2, 8);
    requestId = `taskhub_${dateStr}_${randStr}`;
  }

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();

  // Deduce standard audit action based on method and route if not explicitly set
  const deduceAction = (): string => {
    if (req.auditAction) return req.auditAction;
    const url = req.originalUrl || req.url;
    const m = req.method.toUpperCase();

    if (url.includes('/health')) return 'SYSTEM_HEALTH_CHECK';
    if (url.includes('/logs')) return m === 'GET' ? 'LOGS_READ' : 'LOGS_QUERY';
    if (url.includes('/inventory')) return m === 'GET' ? 'INVENTORY_READ' : 'INVENTORY_QUERY';
    if (url.includes('/backups/health')) return 'BACKUP_HEALTH_CHECK';
    if (url.includes('/backups/history')) return 'BACKUP_HISTORY_READ';
    if (url.includes('/backups/config')) return 'BACKUP_CONFIG_READ';
    if (url.includes('/verify')) return 'BACKUP_VERIFY';
    if (url.includes('/restore')) return 'BACKUP_RESTORE';
    if (url.includes('/download')) return 'BACKUP_DOWNLOAD';
    if (url.includes('/configuration')) return m === 'PUT' ? 'CONFIGURATION_WRITE' : 'CONFIGURATION_READ';
    if (url.includes('/auth/token')) return 'INTEGRATION_TOKEN_MINT';
    return `${m}_${url.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}`;
  };

  // Intercept response finish to emit audit record
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    const action = deduceAction();
    const resourceId = req.params?.id || req.auditResourceId || undefined;
    const status = res.statusCode >= 400 ? (res.statusCode >= 500 ? 'ERROR' : 'FAILURE') : 'SUCCESS';

    const auditRecord: IntegrationAuditRecord = {
      timestamp: new Date().toISOString(),
      requestId,
      integrationClient: req.integration?.client || 'ANONYMOUS',
      adminUser: req.integration?.adminUser || req.integration?.client || 'SYSTEM',
      endpoint: req.originalUrl || req.url,
      method: req.method,
      action,
      resourceId,
      status,
      statusCode: res.statusCode,
      duration,
    };

    // Log structured audit event
    logger.info(`[INTEGRATION AUDIT] ${action} -> ${status} (${res.statusCode}) in ${duration}ms`, {
      ...auditRecord,
      module: 'INTEGRATION_AUDIT',
      errorCode: status !== 'SUCCESS' ? `HTTP_${res.statusCode}` : undefined,
    });

    // Optionally record to Postgres audit log if resource is UUID and user available
    if (resourceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId)) {
      try {
        await prisma.auditLog.create({
          data: {
            action: `INTEGRATION_${action}`,
            entityType: 'INTEGRATION_API',
            entityId: resourceId,
            ipAddress: req.ip || null,
            newData: auditRecord as any,
          },
        });
      } catch {
        // Non-blocking for audit logging
      }
    }
  });

  next();
};

// -----------------------------------------------------------------------------
// 3. AUTHENTICATION MIDDLEWARE (Requirement 2)
// Strictly authenticates integration callers via JWT, Firebase, or Service Keys
// -----------------------------------------------------------------------------
export const authenticateIntegration = async (
  req: AuthenticatedIntegrationRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

  if (!token && req.headers['x-integration-token']) {
    token = String(req.headers['x-integration-token']).trim();
  }
  if (!token && req.query && req.query.token) {
    token = String(req.query.token).trim();
  }

  const apiKey = req.headers['x-integration-key'] || req.headers['x-api-key'];

  // Case 1: Bearer JWT or Signed Integration Token
  if (token) {
    // 1A: Check as application JWT
    try {
      const decoded: any = jwt.verify(token, INTEGRATION_JWT_SECRET);
      if (decoded) {
        const clientName = decoded.clientId || decoded.client || 'TASKHUB';
        const role = (decoded.role || 'ADMIN').toUpperCase();
        let scopes: string[] = [];

        if (Array.isArray(decoded.scopes)) {
          scopes = decoded.scopes;
        } else if (typeof decoded.scope === 'string') {
          scopes = decoded.scope.split(' ').map((s: string) => s.trim()).filter(Boolean);
        } else if (decoded.permissions && Array.isArray(decoded.permissions)) {
          scopes = decoded.permissions;
        } else {
          scopes = ['*'];
        }

        req.integration = {
          client: clientName,
          role,
          scopes,
          adminUser: decoded.email || decoded.sub || `${clientName}-service`,
          authType: 'JWT',
        };
        return next();
      }
    } catch {
      // Token was not signed by local JWT secret; try Firebase ID token next
    }

    // 1B: Check as Firebase ID Token
    if (admin.apps.length > 0) {
      try {
        const firebaseUser = await admin.auth().verifyIdToken(token);
        if (firebaseUser) {
          // Check role in claims or DB
          const email = firebaseUser.email || '';
          let role = 'ADMIN';
          let scopes = ['*'];

          if (firebaseUser.admin === true || firebaseUser.role === 'admin' || firebaseUser.role === 'Admin') {
            role = 'ADMIN';
          } else {
            // Verify in Prisma DB
            const dbUser = await prisma.user.findFirst({
              where: { email, isActive: true },
              include: { roles: { include: { role: true } } },
            });
            const dbRole = dbUser?.roles[0]?.role?.name?.toUpperCase();
            if (dbRole === 'ADMIN' || dbRole === 'SUPERADMIN' || dbRole === 'MANAGER') {
              role = 'ADMIN';
            } else {
              role = dbRole || 'CUSTOMER';
            }
          }

          req.integration = {
            client: 'FIREBASE_AUTH',
            role,
            scopes,
            adminUser: email || firebaseUser.uid,
            authType: 'FIREBASE',
          };
          return next();
        }
      } catch {
        // Not a valid Firebase ID token
      }
    }
  }

  // Case 2: Signed Service Integration Key / Secret
  if (apiKey) {
    const validKey = process.env.INTEGRATION_API_KEY || DEFAULT_INTEGRATION_CLIENT_SECRET;
    if (apiKey === validKey) {
      const configuredScopes = (
        process.env.INTEGRATION_SCOPES ||
        'logs:read,inventory:read,backup:read,backup:verify,backup:restore,configuration:read,configuration:write'
      )
        .split(',')
        .map((s) => s.trim());

      req.integration = {
        client: (req.headers['x-integration-client'] as string) || DEFAULT_INTEGRATION_CLIENT_ID.toUpperCase(),
        role: 'ADMIN',
        scopes: configuredScopes,
        adminUser: 'TASKHUB_SYSTEM',
        authType: 'API_KEY',
      };
      return next();
    }
  }

  // If no valid auth method succeeded
  logger.warn('[INTEGRATION AUTH] Authentication rejected: Missing or invalid credentials', {
    url: req.originalUrl,
    hasToken: Boolean(token),
    hasApiKey: Boolean(apiKey),
    requestId: req.requestId,
  });

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Authentication required. Provide a valid Bearer token or X-Integration-Key.',
    code: 'AUTH_REQUIRED',
    requestId: req.requestId,
  });
};

// -----------------------------------------------------------------------------
// 4. AUTHORIZATION MIDDLEWARE (Requirement 3)
// Requires role = ADMIN and specific least-privilege integration scope
// -----------------------------------------------------------------------------
export const requireIntegrationScope = (scope: IntegrationScope) => {
  return (req: AuthenticatedIntegrationRequest, res: Response, next: NextFunction) => {
    if (!req.integration) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing integration context',
        requestId: req.requestId,
      });
    }

    const { role, scopes, client } = req.integration;
    const normalizedRole = role.toUpperCase();

    // Verify role = ADMIN
    const isAdmin =
      normalizedRole === 'ADMIN' ||
      normalizedRole === 'SUPERADMIN' ||
      normalizedRole === 'SUPER ADMIN' ||
      normalizedRole === 'MANAGER';

    if (!isAdmin) {
      logger.warn(`[INTEGRATION AUTHZ] Forbidden role: ${role} from ${client}`, {
        client,
        role,
        requiredScope: scope,
        requestId: req.requestId,
      });

      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient privileges. Role ADMIN is required.',
        code: 'ROLE_ADMIN_REQUIRED',
        requestId: req.requestId,
      });
    }

    // Verify integration scope
    const hasScope =
      scopes.includes('*') ||
      scopes.includes('admin:*') ||
      scopes.includes(scope) ||
      (scope.endsWith(':read') && scopes.includes(`${scope.split(':')[0]}:*`));

    if (!hasScope) {
      logger.warn(`[INTEGRATION AUTHZ] Missing scope: ${scope} from ${client}`, {
        client,
        grantedScopes: scopes,
        requiredScope: scope,
        requestId: req.requestId,
      });

      return res.status(403).json({
        success: false,
        error: `Forbidden: Missing required integration scope '${scope}'.`,
        code: 'INSUFFICIENT_SCOPE',
        requiredScope: scope,
        requestId: req.requestId,
      });
    }

    next();
  };
};

// -----------------------------------------------------------------------------
// 5. RATE LIMITERS (Requirement 12)
// -----------------------------------------------------------------------------
export const integrationGeneralLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: 'Integration API rate limit exceeded. Max 120 requests per minute.',
  keyPrefix: 'int_gen',
});

export const integrationQueryLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'Integration query rate limit exceeded. Max 60 requests per minute.',
  keyPrefix: 'int_query',
});

export const integrationRestoreLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: 'Destructive operation rate limit reached. Only 3 restore requests permitted per 15-minute window.',
  keyPrefix: 'int_restore',
});
