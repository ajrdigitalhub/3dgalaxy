import { Request } from 'express';

export type IntegrationScope =
  | 'logs:read'
  | 'inventory:read'
  | 'backup:read'
  | 'backup:verify'
  | 'backup:restore'
  | 'configuration:read'
  | 'configuration:write'
  | '*';

export interface IntegrationClient {
  client: string;
  role: string;
  scopes: string[];
  adminUser: string;
  authType: 'JWT' | 'FIREBASE' | 'API_KEY' | 'SERVICE_IDENTITY';
}

export interface AuthenticatedIntegrationRequest extends Request {
  integration?: IntegrationClient;
  requestId?: string;
  auditAction?: string;
  auditResourceId?: string;
}

export interface NormalizedInventoryItem {
  id: string;
  name: string;
  type: string;
  status: string;
  quantity: number;
  updatedAt: string;
  details?: {
    sku?: string;
    slug?: string;
    brand?: string;
    basePrice?: number;
    salePrice?: number | null;
    warehouse?: string;
    reservedQty?: number;
    variantsCount?: number;
  };
}

export interface IntegrationHealthResponse {
  success: boolean;
  application: string;
  environment: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  version: string;
  timestamp: string;
  services: {
    database: 'HEALTHY' | 'UNHEALTHY' | 'DEGRADED';
    firebase: 'CONNECTED' | 'DISCONNECTED';
    storage: 'CONNECTED' | 'DISCONNECTED';
    backup: 'HEALTHY' | 'DEGRADED' | 'DISABLED' | 'BUSY';
  };
}

export interface IntegrationAuditRecord {
  timestamp: string;
  requestId: string;
  integrationClient: string;
  adminUser: string;
  endpoint: string;
  method: string;
  action: string;
  resourceId?: string;
  status: 'SUCCESS' | 'FAILURE' | 'ERROR';
  statusCode: number;
  duration: number;
  details?: Record<string, any>;
}

export interface IntegrationTokenPayload {
  sub: string;
  clientId: string;
  role: string;
  scopes: string[];
  email?: string;
  type: 'integration_access_token' | 'integration_download_token';
  targetBackupId?: string;
  iat?: number;
  exp?: number;
}
