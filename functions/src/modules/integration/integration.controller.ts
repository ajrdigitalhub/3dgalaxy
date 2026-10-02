import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import integrationService from './integration.service';
import { AuthenticatedIntegrationRequest } from './integration.types';
import { logger } from '../../utils/logger';

const INTEGRATION_JWT_SECRET =
  process.env.INTEGRATION_JWT_SECRET ||
  process.env.JWT_SECRET ||
  'bbrahma_3d_galaxy_labs_secret_jwt_key_2026';

export class IntegrationController {
  // ---------------------------------------------------------------------------
  // 1. HEALTH (Requirement 14)
  // ---------------------------------------------------------------------------
  public async getHealth(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const health = await integrationService.getHealth();
      const statusCode = health.status === 'HEALTHY' ? 200 : 503;
      return res.status(statusCode).json(health);
    } catch (error: any) {
      logger.error('[INTEGRATION API] Health check failed:', error);
      return res.status(500).json({
        success: false,
        application: '3D Galaxy',
        environment: process.env.NODE_ENV || 'production',
        status: 'UNHEALTHY',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        error: error.message || 'Health check execution failed',
        requestId: req.requestId,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 2. LOGS (Requirement 4)
  // ---------------------------------------------------------------------------
  public async getLogs(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 50,
        date,
        from,
        to,
        level,
        module: moduleFilter,
        search,
        requestId,
        errorCode,
      } = req.query;

      const result = await integrationService.getLogs({
        page: Number(page),
        limit: Number(limit),
        date: date ? String(date) : undefined,
        from: from ? String(from) : undefined,
        to: to ? String(to) : undefined,
        level: level ? String(level) : undefined,
        module: moduleFilter ? String(moduleFilter) : undefined,
        search: search ? String(search) : undefined,
        requestId: requestId ? String(requestId) : undefined,
        errorCode: errorCode ? String(errorCode) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.logs,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          requestId: req.requestId,
        },
      });
    } catch (error: any) {
      logger.error('[INTEGRATION API] getLogs error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve logs',
        requestId: req.requestId,
      });
    }
  }

  public async getLogById(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const { id } = req.params;
      const log = await integrationService.getLogById(id);

      if (!log) {
        return res.status(404).json({
          success: false,
          error: `Log entry or request with ID '${id}' was not found.`,
          requestId: req.requestId,
        });
      }

      return res.status(200).json({
        success: true,
        data: log,
        meta: { requestId: req.requestId },
      });
    } catch (error: any) {
      logger.error('[INTEGRATION API] getLogById error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve log entry',
        requestId: req.requestId,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 3. INVENTORY (Requirement 5)
  // ---------------------------------------------------------------------------
  public async getInventory(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const { page = 1, limit = 50, search, status } = req.query;

      const result = await integrationService.getInventory({
        page: Number(page),
        limit: Number(limit),
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          requestId: req.requestId,
        },
      });
    } catch (error: any) {
      logger.error('[INTEGRATION API] getInventory error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve inventory data',
        requestId: req.requestId,
      });
    }
  }

  public async getInventoryById(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const { id } = req.params;
      const item = await integrationService.getInventoryById(id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: `Inventory item with ID '${id}' was not found.`,
          requestId: req.requestId,
        });
      }

      return res.status(200).json({
        success: true,
        data: item,
        meta: { requestId: req.requestId },
      });
    } catch (error: any) {
      logger.error('[INTEGRATION API] getInventoryById error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve inventory item',
        requestId: req.requestId,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 4. BACKUP ENDPOINTS (Requirements 6, 7, 8)
  // ---------------------------------------------------------------------------
  public async getBackupsHealth(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const health = await integrationService.getBackupsHealth();
      const statusCode = health.healthy ? 200 : 503;

      return res.status(statusCode).json({
        success: health.healthy,
        data: health,
        meta: { requestId: req.requestId },
      });
    } catch (error: any) {
      logger.error('[INTEGRATION API] getBackupsHealth error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve backup health check',
        requestId: req.requestId,
      });
    }
  }

  public async getBackupsHistory(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));

      const result = await integrationService.getBackupsHistory(page, limit);

      return res.status(200).json({
        success: true,
        data: result.data || (result as any).backups || [],
        meta: {
          page,
          limit,
          total: result.totalCount,
          isOverdue: result.isOverdue,
          overdueDays: result.overdueDays,
          lastSuccessfulBackup: result.lastSuccessfulBackup,
          totalSizeBytes: result.totalSizeBytes,
          requestId: req.requestId,
        },
      });
    } catch (error: any) {
      logger.error('[INTEGRATION API] getBackupsHistory error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve backup history',
        requestId: req.requestId,
      });
    }
  }

  public async getBackupsConfig(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const config = await integrationService.getBackupsConfig();

      return res.status(200).json({
        success: true,
        data: config,
        meta: { requestId: req.requestId },
      });
    } catch (error: any) {
      logger.error('[INTEGRATION API] getBackupsConfig error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve backup configuration',
        requestId: req.requestId,
      });
    }
  }

  public async verifyBackup(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Backup ID is required.',
          requestId: req.requestId,
        });
      }

      const result = await integrationService.verifyBackup(id);

      return res.status(200).json({
        success: result.valid,
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (error: any) {
      logger.error('[INTEGRATION API] verifyBackup error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Backup verification check failed',
        requestId: req.requestId,
      });
    }
  }

  public async restoreBackup(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Backup identifier is required.',
          requestId: req.requestId,
        });
      }

      const adminUser = req.integration?.adminUser || req.integration?.client || 'TaskHub Admin';

      // Execute restore service and wait for confirmed actual completion
      const result = await integrationService.restoreBackup(id, adminUser);

      return res.status(200).json({
        success: result.success,
        message: 'Database backup successfully restored and verified.',
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (error: any) {
      const statusCode = error.status || 500;
      logger.error(`[INTEGRATION API] restoreBackup failed (${statusCode}):`, error);

      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Database restore operation failed',
        activeJob: error.activeJob,
        requestId: req.requestId,
      });
    }
  }

  public async downloadBackup(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const { id } = req.params;
      const downloadToken = req.query.token as string;
      const directStream =
        req.query.direct === 'true' ||
        (req.headers.accept && req.headers.accept.includes('application/octet-stream'));

      // If token provided, verify temporary download token
      if (downloadToken) {
        try {
          const decoded: any = jwt.verify(downloadToken, INTEGRATION_JWT_SECRET);
          if (decoded.type !== 'integration_download_token' || decoded.targetBackupId !== id) {
            return res.status(403).json({
              success: false,
              error: 'Invalid or expired temporary download token.',
              requestId: req.requestId,
            });
          }
        } catch {
          return res.status(403).json({
            success: false,
            error: 'Invalid or expired temporary download token.',
            requestId: req.requestId,
          });
        }

        // Stream the backup file
        const fileDetails = await integrationService.getDownloadStream(id);
        res.setHeader('Content-Disposition', `attachment; filename="${fileDetails.fileName}"`);
        res.setHeader('Content-Type', fileDetails.contentType);
        if (fileDetails.fileSize > 0) {
          res.setHeader('Content-Length', String(fileDetails.fileSize));
        }

        fileDetails.stream.on('error', (err) => {
          logger.error('[INTEGRATION API] Stream error during backup download:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Stream error during archive download',
              requestId: req.requestId,
            });
          }
        });

        return fileDetails.stream.pipe(res);
      }

      // If direct stream requested with valid admin token
      if (directStream) {
        const fileDetails = await integrationService.getDownloadStream(id);
        res.setHeader('Content-Disposition', `attachment; filename="${fileDetails.fileName}"`);
        res.setHeader('Content-Type', fileDetails.contentType);
        if (fileDetails.fileSize > 0) {
          res.setHeader('Content-Length', String(fileDetails.fileSize));
        }

        return fileDetails.stream.pipe(res);
      }

      // Return temporary download mechanism (URL and token)
      const downloadInfo = await integrationService.getDownloadInfo(id, req.get('host') || '');

      return res.status(200).json({
        success: true,
        data: downloadInfo,
        meta: { requestId: req.requestId },
      });
    } catch (error: any) {
      const statusCode = error.status || 500;
      logger.error(`[INTEGRATION API] downloadBackup failed (${statusCode}):`, error);

      if (!res.headersSent) {
        return res.status(statusCode).json({
          success: false,
          error: error.message || 'Failed to generate download mechanism',
          requestId: req.requestId,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. CONFIGURATION (Requirement 11)
  // ---------------------------------------------------------------------------
  public async getConfiguration(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const config = await integrationService.getConfiguration();

      return res.status(200).json({
        success: true,
        data: config,
        meta: { requestId: req.requestId },
      });
    } catch (error: any) {
      logger.error('[INTEGRATION API] getConfiguration error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve application configuration',
        requestId: req.requestId,
      });
    }
  }

  public async updateConfiguration(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const adminUser = req.integration?.adminUser || req.integration?.client || 'TaskHub Admin';
      const updated = await integrationService.updateConfiguration(req.body, adminUser);

      return res.status(200).json({
        success: true,
        message: 'Application configuration updated successfully.',
        data: updated,
        meta: { requestId: req.requestId },
      });
    } catch (error: any) {
      const statusCode = error.status || 500;
      logger.error(`[INTEGRATION API] updateConfiguration error (${statusCode}):`, error);

      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to update application configuration',
        requestId: req.requestId,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 6. OAUTH2 TOKEN MINTING HELPER
  // ---------------------------------------------------------------------------
  public async mintToken(req: AuthenticatedIntegrationRequest, res: Response) {
    try {
      const { clientId, clientSecret, scopes } = req.body;

      if (!clientId || !clientSecret) {
        return res.status(400).json({
          success: false,
          error: 'clientId and clientSecret are required in request body.',
          requestId: req.requestId,
        });
      }

      const tokenData = integrationService.mintIntegrationToken(clientId, clientSecret, scopes);

      return res.status(200).json({
        success: true,
        ...tokenData,
        meta: { requestId: req.requestId },
      });
    } catch (error: any) {
      const statusCode = error.status || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to mint integration token',
        requestId: req.requestId,
      });
    }
  }
}

export const integrationController = new IntegrationController();
export default integrationController;
