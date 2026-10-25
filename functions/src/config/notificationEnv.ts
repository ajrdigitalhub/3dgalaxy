import { Request } from 'express';

export type AppEnvironment = 'production' | 'staging' | 'development' | 'test';

/**
 * Standard allowlists for known application environments
 */
const BASE_ALLOWLIST: Record<AppEnvironment, string[]> = {
  production: [
    'https://3dgalaxy.co',
    'https://www.3dgalaxy.co',
    'https://3dgalaxy.co',
    'https://www.3dgalaxy.co.in',
    'https://3dgalaxy.co',
    'https://3dgalaxy.com',
    'https://admin.3dgalaxy.co',
    'https://admin.3dgalaxy.co.in',
    'https://admin.3dgalaxy.co',
  ],
  staging: [
    'https://staging.3dgalaxy.co',
    'https://staging.3dgalaxy.co.in',
    'https://staging.3dgalaxy.co',
    'https://staging.3dgalaxy.com',
    'https://staging-admin.3dgalaxy.co',
    'https://staging-admin.3dgalaxy.co.in',
  ],
  development: [
    'http://localhost:4200',
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:5000',
    'http://127.0.0.1:4200',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4000',
    'http://127.0.0.1:5000',
  ],
  test: [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'http://localhost:51150',
    'http://127.0.0.1:51150',
    'http://localhost:0',
    'http://127.0.0.1:0',
    'http://test.local',
    'http://localhost',
    'http://127.0.0.1',
  ],
};

/**
 * Safely parse and normalize an HTTP origin string.
 * Strips path, query, hash, trailing slashes, and ensures standard scheme & host formatting.
 * Rejects non-HTTP schemes, IP spoofing, or malformed strings.
 */
export function normalizeOrigin(rawOrigin: string | null | undefined): string | null {
  if (!rawOrigin || typeof rawOrigin !== 'string') return null;
  const trimmed = rawOrigin.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const protocol = url.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return null;
    }

    const hostname = url.hostname.toLowerCase();
    if (!hostname) return null;

    // Check port (omit standard 80 for http, 443 for https)
    let portPart = '';
    if (url.port) {
      const portNum = parseInt(url.port, 10);
      if (
        (protocol === 'http:' && portNum !== 80) ||
        (protocol === 'https:' && portNum !== 443)
      ) {
        portPart = `:${portNum}`;
      }
    }

    return `${protocol}//${hostname}${portPart}`;
  } catch {
    return null;
  }
}

/**
 * Resolves the active server deployment environment.
 * The environment is authoritatively controlled by server configuration, never by client input.
 */
export function getAppEnv(): AppEnvironment {
  const envVal = (
    process.env.APP_ENV ||
    process.env.NODE_ENV ||
    'development'
  ).toLowerCase().trim();

  if (envVal === 'production' || envVal === 'prod') return 'production';
  if (envVal === 'staging' || envVal === 'stage') return 'staging';
  if (envVal === 'test' || envVal === 'testing') return 'test';
  return 'development';
}

/**
 * Resolves the canonical primary origin for the active environment.
 */
export function getAppOrigin(): string {
  const custom = normalizeOrigin(process.env.APP_ORIGIN || process.env.APP_URL || process.env.SITE_URL);
  if (custom) return custom;

  const currentEnv = getAppEnv();
  switch (currentEnv) {
    case 'production':
      return 'https://3dgalaxy.co';
    case 'staging':
      return 'https://staging.3dgalaxy.co.in';
    case 'test':
      return 'http://127.0.0.1:51150';
    case 'development':
    default:
      return 'http://localhost:4200';
  }
}

/**
 * Resolves the configured Firebase project ID for the active environment.
 */
export function getFirebaseProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    'ajr3dgalaxy'
  );
}

/**
 * Checks whether push notifications are enabled on the active environment.
 */
export function isFcmNotificationsEnabled(): boolean {
  if (process.env.FCM_NOTIFICATIONS_ENABLED !== undefined) {
    return process.env.FCM_NOTIFICATIONS_ENABLED !== 'false';
  }
  return true;
}

/**
 * Returns the complete allowlist of permitted origins for a specific environment.
 */
export function getAllowedOriginsForEnv(env: AppEnvironment): string[] {
  const list = [...(BASE_ALLOWLIST[env] || [])];

  // Optional custom comma-separated origins from environment variables
  const envCustom = process.env.ALLOWED_ORIGINS || process.env.CORS_ALLOWED_ORIGINS;
  if (envCustom) {
    const parts = envCustom.split(',').map((p) => normalizeOrigin(p)).filter(Boolean) as string[];
    list.push(...parts);
  }

  // Allow dynamically configured APP_ORIGIN if set
  const appOrigin = normalizeOrigin(process.env.APP_ORIGIN);
  if (appOrigin && !list.includes(appOrigin)) {
    list.push(appOrigin);
  }

  return Array.from(new Set(list));
}

/**
 * Strictly verifies whether a normalized origin is authorized for the specified environment.
 * Prevents subdomain traversal, substring spoofing, and cross-environment leakage.
 */
export function isOriginAllowed(origin: string | null | undefined, env?: AppEnvironment): boolean {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  const targetEnv = env || getAppEnv();
  const allowedList = getAllowedOriginsForEnv(targetEnv);

  return allowedList.includes(normalized);
}

/**
 * Helper to inspect Express request headers and body to extract and validate the client origin.
 * Extracts from 'Origin' header, 'Referer' header, or request body.
 */
export function resolveClientOrigin(req: Request): {
  rawOrigin: string | null;
  normalizedOrigin: string | null;
  isValid: boolean;
  environment: AppEnvironment;
  projectId: string;
} {
  const currentEnv = getAppEnv();
  const projectId = getFirebaseProjectId();

  const rawOrigin =
    (req.headers['origin'] as string) ||
    (req.headers['referer'] as string) ||
    (req.body && req.body.origin) ||
    (req.body && req.body.appOrigin) ||
    null;

  const normalized = normalizeOrigin(rawOrigin);
  const isValid = isOriginAllowed(normalized, currentEnv);

  return {
    rawOrigin,
    normalizedOrigin: isValid ? normalized : (normalized || null),
    isValid,
    environment: currentEnv,
    projectId,
  };
}

/**
 * Sanitizes FCM tokens for safe diagnostic logging (e.g. ciuv2C...0VM)
 */
export function sanitizeTokenForLog(token: string | null | undefined): string {
  if (!token || typeof token !== 'string') return '[NO_TOKEN]';
  const trimmed = token.trim();
  if (trimmed.length <= 12) return '[REDACTED]';
  return `${trimmed.substring(0, 6)}...${trimmed.substring(trimmed.length - 4)}`;
}
