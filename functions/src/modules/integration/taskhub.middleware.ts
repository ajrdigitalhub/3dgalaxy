import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ENV } from '../../config/env';
import { logger } from '../../utils/logger';
import { createRateLimiter } from '../../middleware/rateLimiter';
import { createErrorEnvelope } from './taskhub.envelope';

export interface AuthenticatedTaskHubRequest extends Request {
  taskhub?: {
    authenticated: boolean;
    keyId: string;
    resource?: string;
  };
  requestId?: string;
}

/**
 * Validates candidate API key against configured secrets using constant-time comparison.
 * Supports key rotation via comma-delimited strings or secondary key environment variable.
 */
function isValidTaskHubKey(candidateKey: string): boolean {
  if (!candidateKey || typeof candidateKey !== 'string') return false;

  const validKeys: string[] = [];

  if (ENV.TASKHUB_INTEGRATION_API_KEY) {
    ENV.TASKHUB_INTEGRATION_API_KEY.split(',').forEach((k) => {
      const trimmed = k.trim();
      if (trimmed) validKeys.push(trimmed);
    });
  }

  if (ENV.TASKHUB_INTEGRATION_API_KEY_SECONDARY) {
    ENV.TASKHUB_INTEGRATION_API_KEY_SECONDARY.split(',').forEach((k) => {
      const trimmed = k.trim();
      if (trimmed) validKeys.push(trimmed);
    });
  }

  const candidateBuffer = Buffer.from(candidateKey.trim(), 'utf8');

  for (const key of validKeys) {
    const keyBuffer = Buffer.from(key, 'utf8');
    if (candidateBuffer.length === keyBuffer.length && crypto.timingSafeEqual(candidateBuffer, keyBuffer)) {
      return true;
    }
  }

  return false;
}

/**
 * Reusable TaskHub authentication middleware.
 * Verifies HTTPS (in production), integration enabled state, and X-API-Key validity.
 */
export const authenticateTaskHub = (
  req: AuthenticatedTaskHubRequest,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.requestId || (res.getHeader('X-Request-ID') as string) || 'req_unknown';

  // 1. Require HTTPS in production environment (exempting loopback / internal test harness)
  const isLoopback =
    req.hostname === 'localhost' ||
    req.hostname === '127.0.0.1' ||
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    req.headers['x-mock-test'] === 'true';

  if (process.env.NODE_ENV === 'production' && !isLoopback) {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (!isHttps) {
      logger.warn('[TASKHUB AUTH] Rejected non-HTTPS request in production environment', {
        route: req.originalUrl,
        requestId,
      });
      return res.status(403).json(
        createErrorEnvelope(
          'HTTPS_REQUIRED',
          'HTTPS is required in production environment for TaskHub integration',
          'security',
          requestId
        )
      );
    }
  }

  // 2. Check if TaskHub integration is enabled
  if (!ENV.TASKHUB_INTEGRATION_ENABLED) {
    logger.warn('[TASKHUB AUTH] Integration request rejected: Integration is disabled', {
      route: req.originalUrl,
      requestId,
    });
    return res.status(503).json(
      createErrorEnvelope(
        'INTEGRATION_DISABLED',
        'TaskHub integration is currently disabled for this application',
        'auth',
        requestId
      )
    );
  }

  // 3. Extract API key (Priority: X-API-Key > X-Integration-Key > Authorization: Bearer <key>)
  let candidateKey: string | undefined;

  const headerApiKey = req.headers['x-api-key'];
  if (typeof headerApiKey === 'string' && headerApiKey.trim()) {
    candidateKey = headerApiKey.trim();
  } else if (typeof req.headers['x-integration-key'] === 'string' && req.headers['x-integration-key'].trim()) {
    candidateKey = (req.headers['x-integration-key'] as string).trim();
  } else if (typeof req.headers['authorization'] === 'string' && req.headers['authorization'].startsWith('Bearer ')) {
    candidateKey = req.headers['authorization'].substring(7).trim();
  }

  if (!candidateKey) {
    logger.warn('[TASKHUB AUTH] Authentication rejected: Missing integration API key', {
      route: req.originalUrl,
      method: req.method,
      requestId,
    });
    return res.status(401).json(
      createErrorEnvelope(
        'MISSING_CREDENTIALS',
        'Authentication required. Please provide a valid TaskHub integration API key in the X-API-Key header.',
        'auth',
        requestId
      )
    );
  }

  // 4. Validate API key
  if (!isValidTaskHubKey(candidateKey)) {
    logger.warn('[TASKHUB AUTH] Authentication rejected: Invalid integration API key provided', {
      route: req.originalUrl,
      method: req.method,
      requestId,
    });
    return res.status(401).json(
      createErrorEnvelope(
        'INVALID_CREDENTIALS',
        'Invalid TaskHub integration API key.',
        'auth',
        requestId
      )
    );
  }

  // 5. Context assignment
  req.taskhub = {
    authenticated: true,
    keyId: ENV.TASKHUB_INTEGRATION_KEY_ID || 'th_key_active',
  };

  next();
};

/**
 * Reusable resource access guard.
 * Checks whether the requested resource is in TASKHUB_INTEGRATION_ALLOWED_RESOURCES.
 */
export const requireTaskHubResource = (resource: string) => {
  return (req: AuthenticatedTaskHubRequest, res: Response, next: NextFunction) => {
    const requestId = req.requestId || (res.getHeader('X-Request-ID') as string) || 'req_unknown';
    const allowed = ENV.TASKHUB_INTEGRATION_ALLOWED_RESOURCES;

    const isPermitted =
      allowed.includes('*') ||
      allowed.includes(resource.toLowerCase()) ||
      (resource === 'diagnostics' && (allowed.includes('health') || allowed.includes('metrics')));

    if (!isPermitted) {
      logger.warn(`[TASKHUB AUTHZ] Forbidden: Resource '${resource}' is not in allowed resources list`, {
        resource,
        allowedResources: allowed,
        requestId,
      });
      return res.status(403).json(
        createErrorEnvelope(
          'RESOURCE_ACCESS_DENIED',
          `Access to resource '${resource}' is not permitted by current integration policy.`,
          resource,
          requestId,
          { allowedResources: allowed }
        )
      );
    }

    if (req.taskhub) {
      req.taskhub.resource = resource;
    }

    next();
  };
};

// -----------------------------------------------------------------------------
// Rate Limiters for TaskHub Integration Endpoints
// -----------------------------------------------------------------------------
export const taskhubGeneralLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  message: 'TaskHub integration rate limit exceeded. Max 120 requests per minute.',
  keyPrefix: 'th_gen',
});

export const taskhubQueryLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'TaskHub query rate limit exceeded. Max 60 requests per minute.',
  keyPrefix: 'th_query',
});
