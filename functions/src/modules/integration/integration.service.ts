import fs from 'fs';
import path from 'path';
import readline from 'readline';
import jwt from 'jsonwebtoken';
import * as admin from 'firebase-admin';
import prisma, { isPoolHealthy } from '../../config/database';
import { ENV } from '../../config/env';
import { getStorageBucket, getFirebaseAdmin } from '../../config/firebase';
import { logger, maskSensitiveData } from '../../utils/logger';
import backupEngine from '../../services/backupEngine.service';
import backupScheduler from '../../services/backupScheduler.service';
import { getSettingsService, updateSettingsService } from '../settings/settings.service';
import { clearCache } from '../../middleware/cache';
import {
  IntegrationHealthResponse,
  NormalizedInventoryItem,
  IntegrationTokenPayload,
  IntegrationScope,
} from './integration.types';

const INTEGRATION_JWT_SECRET =
  process.env.INTEGRATION_JWT_SECRET ||
  process.env.JWT_SECRET ||
  'bbrahma_3d_galaxy_labs_secret_jwt_key_2026';

const DEFAULT_INTEGRATION_CLIENT_ID = process.env.INTEGRATION_CLIENT_ID || 'taskhub';
const DEFAULT_INTEGRATION_CLIENT_SECRET =
  process.env.INTEGRATION_CLIENT_SECRET || 'taskhub_admin_secret_key_2026';

export class IntegrationService {
  // ---------------------------------------------------------------------------
  // 1. HEALTH (Requirement 14)
  // ---------------------------------------------------------------------------
  public async getHealth(): Promise<IntegrationHealthResponse> {
    const timestamp = new Date().toISOString();
    let dbStatus: 'HEALTHY' | 'UNHEALTHY' = 'HEALTHY';
    let firebaseStatus: 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';
    let storageStatus: 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';
    let backupStatus: 'HEALTHY' | 'DEGRADED' | 'DISABLED' | 'BUSY' = 'HEALTHY';

    // 1A. Database Check
    try {
      const poolOk = await isPoolHealthy();
      if (!poolOk) {
        dbStatus = 'UNHEALTHY';
      } else {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'HEALTHY';
      }
    } catch {
      dbStatus = 'UNHEALTHY';
    }

    // 1B. Firebase Auth Check
    try {
      const fbAdmin = getFirebaseAdmin();
      if (fbAdmin.apps && fbAdmin.apps.length > 0) {
        firebaseStatus = 'CONNECTED';
      }
    } catch {
      firebaseStatus = 'DISCONNECTED';
    }

    // 1C. Firebase Storage Check
    try {
      const bucket = getStorageBucket();
      if (bucket) {
        storageStatus = 'CONNECTED';
      }
    } catch {
      storageStatus = 'DISCONNECTED';
    }

    // 1D. Backup Service Check
    try {
      if (!ENV.BACKUP_MODULE_ENABLED) {
        backupStatus = 'DISABLED';
      } else if (backupEngine.isBusy()) {
        backupStatus = 'BUSY';
      } else {
        backupStatus = 'HEALTHY';
      }
    } catch {
      backupStatus = 'DEGRADED';
    }

    const isSystemHealthy =
      dbStatus === 'HEALTHY' &&
      firebaseStatus === 'CONNECTED' &&
      storageStatus === 'CONNECTED' &&
      backupStatus !== 'DEGRADED';

    return {
      success: isSystemHealthy,
      application: '3D Galaxy',
      environment: process.env.NODE_ENV || 'production',
      status: isSystemHealthy ? 'HEALTHY' : dbStatus === 'UNHEALTHY' ? 'UNHEALTHY' : 'DEGRADED',
      version: '1.0.0',
      timestamp,
      services: {
        database: dbStatus,
        firebase: firebaseStatus,
        storage: storageStatus,
        backup: backupStatus,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 2. LOGS & TELEMETRY (Requirement 4)
  // ---------------------------------------------------------------------------
  private getPossibleLogDirs(): string[] {
    return [
      process.env.LOG_DIR || '',
      path.resolve(process.cwd(), 'logs'),
      path.resolve(process.cwd(), 'functions/logs'),
      path.resolve(__dirname, '../../../logs'),
      path.resolve(__dirname, '../../logs'),
    ].filter((dir) => dir && fs.existsSync(dir));
  }

  public async getLogs(filter: {
    page?: number;
    limit?: number;
    date?: string;
    from?: string;
    to?: string;
    level?: string;
    module?: string;
    search?: string;
    requestId?: string;
    errorCode?: string;
  }): Promise<{ logs: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(filter.page || 1));
    const limit = Math.min(200, Math.max(1, Number(filter.limit || 50)));

    const logDirs = this.getPossibleLogDirs();
    if (logDirs.length === 0) {
      return { logs: [], total: 0, page, limit };
    }

    const targetDate = filter.date ? String(filter.date) : null;
    const fromDate = filter.from ? new Date(filter.from) : null;
    const toDate = filter.to ? new Date(filter.to) : null;
    const levelStr = filter.level ? String(filter.level).toUpperCase() : null;
    const moduleStr = filter.module ? String(filter.module).toUpperCase() : null;
    const searchStr = filter.search ? String(filter.search).toLowerCase() : null;
    const reqIdStr = filter.requestId ? String(filter.requestId).trim() : null;
    const errCodeStr = filter.errorCode ? String(filter.errorCode).trim().toUpperCase() : null;

    const matchedEntries: any[] = [];
    const seenEntryKeys = new Set<string>();

    for (const logDir of logDirs) {
      try {
        const files = fs.readdirSync(logDir).filter((f) => f.endsWith('.log'));

        for (const file of files) {
          // If specific date requested, filter file names containing that date
          if (targetDate && !file.includes(targetDate)) {
            continue;
          }

          const filePath = path.join(logDir, file);
          const fileStream = fs.createReadStream(filePath);
          const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

          for await (const line of rl) {
            if (!line.trim()) continue;
            try {
              const raw = JSON.parse(line);

              // Date & Range filtering
              if (raw.timestamp) {
                const entryTime = new Date(raw.timestamp);
                if (fromDate && entryTime < fromDate) continue;
                if (toDate && entryTime > toDate) continue;
                if (targetDate && !raw.timestamp.startsWith(targetDate)) continue;
              }

              // Property filtering
              if (levelStr && raw.level !== levelStr) continue;
              if (moduleStr && raw.module !== moduleStr) continue;
              if (reqIdStr && raw.requestId !== reqIdStr && raw.metadata?.requestId !== reqIdStr) continue;
              if (errCodeStr && raw.errorCode !== errCodeStr) continue;

              if (searchStr) {
                const lineLower = line.toLowerCase();
                if (!lineLower.includes(searchStr)) continue;
              }

              // Deduplication key
              const dedupKey = `${raw.timestamp}_${raw.requestId || ''}_${raw.message || ''}`;
              if (seenEntryKeys.has(dedupKey)) continue;
              seenEntryKeys.add(dedupKey);

              // Normalize to standard telemetry format
              const normalized = {
                timestamp: raw.timestamp || new Date().toISOString(),
                level: raw.level || 'INFO',
                service: raw.service || 'backend',
                environment: raw.environment || process.env.NODE_ENV || 'production',
                module: raw.module || 'HTTP',
                message: raw.message || '',
                errorCode: raw.errorCode || null,
                metadata: {
                  requestId: raw.requestId || raw.metadata?.requestId || null,
                  route: raw.route || raw.metadata?.route || null,
                  method: raw.method || raw.metadata?.method || null,
                  statusCode: raw.statusCode ?? raw.metadata?.statusCode ?? null,
                  durationMs: raw.durationMs ?? raw.metadata?.durationMs ?? null,
                  ...(raw.metadata || {}),
                },
              };

              matchedEntries.push(normalized);
            } catch {
              // Skip malformed log lines
            }
          }
        }
      } catch {
        // Continue to next directory if any
      }
    }

    // Sort descending by timestamp
    matchedEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = matchedEntries.length;
    const startIndex = (page - 1) * limit;
    const paginated = matchedEntries.slice(startIndex, startIndex + limit);

    return {
      logs: paginated,
      total,
      page,
      limit,
    };
  }

  public async getLogById(id: string): Promise<any | null> {
    const logDirs = this.getPossibleLogDirs();
    for (const logDir of logDirs) {
      try {
        const files = fs.readdirSync(logDir).filter((f) => f.endsWith('.log'));
        for (const file of files) {
          const filePath = path.join(logDir, file);
          const fileStream = fs.createReadStream(filePath);
          const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

          for await (const line of rl) {
            if (!line.trim() || !line.includes(id)) continue;
            try {
              const raw = JSON.parse(line);
              if (
                raw.requestId === id ||
                raw.id === id ||
                raw.metadata?.requestId === id ||
                raw.metadata?.id === id
              ) {
                return {
                  timestamp: raw.timestamp || new Date().toISOString(),
                  level: raw.level || 'INFO',
                  service: raw.service || 'backend',
                  environment: raw.environment || process.env.NODE_ENV || 'production',
                  module: raw.module || 'HTTP',
                  message: raw.message || '',
                  errorCode: raw.errorCode || null,
                  metadata: {
                    requestId: raw.requestId || raw.metadata?.requestId || null,
                    route: raw.route || raw.metadata?.route || null,
                    method: raw.method || raw.metadata?.method || null,
                    statusCode: raw.statusCode ?? raw.metadata?.statusCode ?? null,
                    durationMs: raw.durationMs ?? raw.metadata?.durationMs ?? null,
                    ...(raw.metadata || {}),
                  },
                };
              }
            } catch {}
          }
        }
      } catch {}
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // 3. INVENTORY & DATA (Requirement 5)
  // Reuses existing inventory and product data with normalized adapter
  // ---------------------------------------------------------------------------
  public async getInventory(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ data: NormalizedInventoryItem[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit || 50)));
    const skip = (page - 1) * limit;
    const searchTerm = query.search ? String(query.search).trim() : '';

    // Check count of inventory records
    const inventoryCount = await prisma.inventory.count();

    if (inventoryCount > 0) {
      // Query existing Inventory table joined with Product & Warehouse
      const whereCondition: any = {};
      if (searchTerm) {
        whereCondition.product = {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { sku: { contains: searchTerm, mode: 'insensitive' } },
          ],
        };
      }

      const [total, records] = await Promise.all([
        prisma.inventory.count({ where: whereCondition }),
        prisma.inventory.findMany({
          where: whereCondition,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
            variant: true,
            warehouse: true,
          },
        }),
      ]);

      const normalized: NormalizedInventoryItem[] = records.map((inv) => {
        const prod = inv.product;
        const variant = inv.variant;
        const name = variant ? `${prod.name} (${variant.name})` : prod.name;
        const type = prod.category?.name || 'Standard 3D Product';

        let status = 'IN_STOCK';
        if (inv.quantity <= 0) {
          status = 'OUT_OF_STOCK';
        } else if (inv.quantity <= 5) {
          status = 'LOW_STOCK';
        } else if (!prod.isActive) {
          status = 'INACTIVE';
        }

        return {
          id: inv.id,
          name,
          type,
          status,
          quantity: inv.quantity,
          updatedAt: inv.updatedAt.toISOString(),
          details: {
            sku: variant?.sku || prod.sku,
            slug: prod.slug,
            brand: prod.brand?.name,
            basePrice: Number(prod.basePrice),
            salePrice: prod.salePrice ? Number(prod.salePrice) : null,
            warehouse: inv.warehouse?.name,
            reservedQty: inv.reservedQty,
          },
        };
      });

      return { data: normalized, total, page, limit };
    } else {
      // Fallback adapter: query existing Product catalog directly
      const whereCondition: any = { deletedAt: null };
      if (searchTerm) {
        whereCondition.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { sku: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      const [total, products] = await Promise.all([
        prisma.product.count({ where: whereCondition }),
        prisma.product.findMany({
          where: whereCondition,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            category: true,
            brand: true,
            variants: true,
          },
        }),
      ]);

      const normalized: NormalizedInventoryItem[] = products.map((prod) => {
        let status = 'IN_STOCK';
        if (prod.stock <= 0) {
          status = 'OUT_OF_STOCK';
        } else if (prod.stock <= 5) {
          status = 'LOW_STOCK';
        } else if (!prod.isActive) {
          status = 'INACTIVE';
        }

        return {
          id: prod.id,
          name: prod.name,
          type: prod.category?.name || 'Standard 3D Product',
          status,
          quantity: prod.stock,
          updatedAt: prod.updatedAt.toISOString(),
          details: {
            sku: prod.sku,
            slug: prod.slug,
            brand: prod.brand?.name,
            basePrice: Number(prod.basePrice),
            salePrice: prod.salePrice ? Number(prod.salePrice) : null,
            variantsCount: prod.variants.length,
          },
        };
      });

      return { data: normalized, total, page, limit };
    }
  }

  public async getInventoryById(id: string): Promise<NormalizedInventoryItem | null> {
    const isUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    if (!id || !isUuid(id)) {
      return null;
    }

    // 1. Try finding in Inventory table
    const inv = await prisma.inventory.findUnique({
      where: { id },
      include: {
        product: { include: { category: true, brand: true } },
        variant: true,
        warehouse: true,
      },
    });

    if (inv) {
      const prod = inv.product;
      const variant = inv.variant;
      const name = variant ? `${prod.name} (${variant.name})` : prod.name;
      const type = prod.category?.name || 'Standard 3D Product';

      let status = 'IN_STOCK';
      if (inv.quantity <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (inv.quantity <= 5) {
        status = 'LOW_STOCK';
      } else if (!prod.isActive) {
        status = 'INACTIVE';
      }

      return {
        id: inv.id,
        name,
        type,
        status,
        quantity: inv.quantity,
        updatedAt: inv.updatedAt.toISOString(),
        details: {
          sku: variant?.sku || prod.sku,
          slug: prod.slug,
          brand: prod.brand?.name,
          basePrice: Number(prod.basePrice),
          salePrice: prod.salePrice ? Number(prod.salePrice) : null,
          warehouse: inv.warehouse?.name,
          reservedQty: inv.reservedQty,
        },
      };
    }

    // 2. Try finding in Product table
    const prod = await prisma.product.findUnique({
      where: { id },
      include: { category: true, brand: true, variants: true },
    });

    if (prod) {
      let status = 'IN_STOCK';
      if (prod.stock <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (prod.stock <= 5) {
        status = 'LOW_STOCK';
      } else if (!prod.isActive) {
        status = 'INACTIVE';
      }

      return {
        id: prod.id,
        name: prod.name,
        type: prod.category?.name || 'Standard 3D Product',
        status,
        quantity: prod.stock,
        updatedAt: prod.updatedAt.toISOString(),
        details: {
          sku: prod.sku,
          slug: prod.slug,
          brand: prod.brand?.name,
          basePrice: Number(prod.basePrice),
          salePrice: prod.salePrice ? Number(prod.salePrice) : null,
          variantsCount: prod.variants.length,
        },
      };
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // 4. BACKUP SERVICES (Requirements 6, 7, 8)
  // Reuses existing backupEngine without duplicating backup logic
  // ---------------------------------------------------------------------------
  public async getBackupsHealth() {
    return await backupEngine.performHealthCheck();
  }

  public async getBackupsHistory(page = 1, limit = 20) {
    return await backupEngine.getBackupHistory(page, limit);
  }

  public async getBackupsConfig() {
    const { cronExpr, description } = backupScheduler.getCronExpression();
    const history = await backupEngine.getBackupHistory(1, 1).catch(() => ({
      isOverdue: false,
      overdueDays: 0,
      totalCount: 0,
      totalSizeBytes: 0,
      lastSuccessfulBackup: null,
    }));

    return {
      backupModuleEnabled: ENV.BACKUP_MODULE_ENABLED,
      autoBackupEnabled: ENV.BACKUP_ENABLED,
      scheduleType: ENV.BACKUP_SCHEDULE,
      cronExpression: cronExpr,
      scheduleDescription: description,
      backupTime: ENV.BACKUP_TIME,
      backupDays: ENV.BACKUP_SCHEDULE === 'twice-weekly' ? ENV.BACKUP_DAYS : ENV.BACKUP_DAY,
      timezone: ENV.BACKUP_TIMEZONE,
      retentionCount: ENV.BACKUP_RETENTION_COUNT,
      storageRoot: ENV.BACKUP_STORAGE_ROOT,
      isOverdue: history.isOverdue,
      overdueDays: history.overdueDays,
      totalBackups: history.totalCount,
      totalSizeBytes: history.totalSizeBytes,
      lastSuccessfulBackup: history.lastSuccessfulBackup,
      isBusy: backupEngine.isBusy(),
      activeJob: backupEngine.getActiveJob(),
    };
  }

  public async verifyBackup(id: string) {
    return await backupEngine.verifyBackup(id);
  }

  public async restoreBackup(id: string, performedBy: string) {
    if (backupEngine.isBusy()) {
      throw {
        status: 409,
        message: 'A backup or restore operation is already in progress.',
        activeJob: backupEngine.getActiveJob(),
      };
    }

    const isUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    if (!id || !isUuid(id)) {
      throw {
        status: 404,
        message: `Backup archive with identifier '${id}' was not found.`,
      };
    }

    // 1. Look up backup record
    const record = await prisma.databaseBackup.findUnique({
      where: { id },
    });

    if (!record) {
      throw {
        status: 404,
        message: `Backup archive with identifier '${id}' was not found.`,
      };
    }

    // 2. Validate backup status
    if (record.status !== 'SUCCESS') {
      throw {
        status: 400,
        message: `Cannot restore backup with status '${record.status}'. Only SUCCESS backups can be restored.`,
      };
    }

    // 3. Validate application ownership
    const validRoot = ENV.BACKUP_STORAGE_ROOT.replace(/^\/+|\/+$/g, '');
    if (!record.storagePath.startsWith(validRoot) && !record.storagePath.includes('3dgalaxy')) {
      throw {
        status: 403,
        message: 'Security validation failed: Backup archive does not belong to this application.',
      };
    }

    // 4. Execute existing restore service
    logger.warn(`[INTEGRATION RESTORE] Restoring database from backup ${id} initiated by ${performedBy}`);
    const result = await backupEngine.restoreBackup({
      storagePath: record.storagePath,
      performedBy: `TaskHub Admin (${performedBy})`,
    });

    return result;
  }

  public async getDownloadInfo(
    id: string,
    reqHost: string
  ): Promise<{
    backupId: string;
    fileName: string;
    fileSize: number;
    checksum: string;
    expiresAt: string;
    downloadUrl: string;
  }> {
    const isUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    if (!id || !isUuid(id)) {
      throw { status: 404, message: `Backup with ID '${id}' not found.` };
    }

    const record = await prisma.databaseBackup.findUnique({
      where: { id },
    });

    if (!record) {
      throw { status: 404, message: `Backup with ID '${id}' not found.` };
    }

    const validRoot = ENV.BACKUP_STORAGE_ROOT.replace(/^\/+|\/+$/g, '');
    if (!record.storagePath.startsWith(validRoot) && !record.storagePath.includes('3dgalaxy')) {
      throw {
        status: 403,
        message: 'Security violation: Backup archive does not belong to this application.',
      };
    }

    const expiresInSeconds = 15 * 60; // 15 minutes
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const downloadToken = jwt.sign(
      {
        sub: 'integration_download',
        type: 'integration_download_token',
        targetBackupId: id,
        scopes: ['backup:download'],
      },
      INTEGRATION_JWT_SECRET,
      { expiresIn: '15m' }
    );

    const downloadUrl = `/api/integration/v1/admin/backups/${id}/download?token=${downloadToken}`;

    return {
      backupId: record.id,
      fileName: record.backupName,
      fileSize: Number(record.fileSize),
      checksum: record.checksum,
      expiresAt,
      downloadUrl,
    };
  }

  public async getDownloadStream(id: string) {
    return await backupEngine.getDownloadStream(id);
  }

  // ---------------------------------------------------------------------------
  // 5. CONFIGURATION (Requirement 11)
  // Reuses existing settings service and strictly masks sensitive fields
  // ---------------------------------------------------------------------------
  public async getConfiguration() {
    const rawConfig = await getSettingsService();
    return maskSensitiveData(rawConfig);
  }

  public async updateConfiguration(updatePayload: any, adminUser: string) {
    if (!updatePayload || typeof updatePayload !== 'object') {
      throw { status: 400, message: 'Invalid configuration payload.' };
    }

    // Strip out redacted placeholders so existing secrets are not wiped out
    const cleanPayload = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(cleanPayload);
      if (obj && typeof obj === 'object') {
        const cleaned: Record<string, any> = {};
        for (const [k, v] of Object.entries(obj)) {
          if (v === '[REDACTED]' || v === '[REDACTED_TOKEN]') {
            continue; // Skip redacted values so existing stored secret is retained
          }
          cleaned[k] = cleanPayload(v);
        }
        return cleaned;
      }
      return obj;
    };

    const sanitizedUpdate = cleanPayload(updatePayload);
    const updated = await updateSettingsService(sanitizedUpdate);
    clearCache();

    logger.info(`[INTEGRATION CONFIG] Configuration updated by ${adminUser}`, {
      adminUser,
      module: 'SETTINGS',
    });

    return maskSensitiveData(updated);
  }

  // ---------------------------------------------------------------------------
  // 6. TOKEN MINTING (Service-to-Service OAuth2 / JWT helper)
  // ---------------------------------------------------------------------------
  public mintIntegrationToken(
    clientId: string,
    clientSecret: string,
    requestedScopes?: string[]
  ): { accessToken: string; tokenType: string; expiresIn: number; scope: string } {
    const validClientId = DEFAULT_INTEGRATION_CLIENT_ID;
    const validClientSecret = DEFAULT_INTEGRATION_CLIENT_SECRET;

    if (clientId !== validClientId || clientSecret !== validClientSecret) {
      throw { status: 401, message: 'Invalid client credentials for integration token minting.' };
    }

    const allAllowedScopes = [
      'logs:read',
      'inventory:read',
      'backup:read',
      'backup:verify',
      'backup:restore',
      'configuration:read',
      'configuration:write',
    ];

    const grantedScopes =
      requestedScopes && requestedScopes.length > 0
        ? requestedScopes.filter((s) => allAllowedScopes.includes(s) || s === '*')
        : allAllowedScopes;

    const payload: IntegrationTokenPayload = {
      sub: `${clientId}_integration_service`,
      clientId,
      role: 'ADMIN',
      scopes: grantedScopes,
      type: 'integration_access_token',
    };

    const expiresIn = 3600; // 1 hour short-lived token
    const token = jwt.sign(payload, INTEGRATION_JWT_SECRET, { expiresIn: '1h' });

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn,
      scope: grantedScopes.join(' '),
    };
  }
}

export const integrationService = new IntegrationService();
export default integrationService;
