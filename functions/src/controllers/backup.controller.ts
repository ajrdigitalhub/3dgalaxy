import { Request, Response } from 'express';
import backupEngine from '../services/backupEngine.service';
import backupScheduler from '../services/backupScheduler.service';
import { ENV } from '../config/env';
import { AuthenticatedRequest } from '../middleware/auth';
import { NotificationService } from '../services/notification.service';

/**
 * GET /api/admin/backups/config
 * Returns safe server feature flags, configuration, and status.
 * NEVER exposes secrets.
 */
export const getBackupConfig = async (req: Request, res: Response) => {
  try {
    const { cronExpr, description } = backupScheduler.getCronExpression();
    const history = await backupEngine.getBackupHistory(1, 1).catch(() => ({
      isOverdue: false,
      overdueDays: 0,
      totalCount: 0,
      totalSizeBytes: 0,
      lastSuccessfulBackup: null
    }));

    const isBusy = backupEngine.isBusy();
    const activeJob = backupEngine.getActiveJob();

    return res.status(200).json({
      success: true,
      data: {
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
        isBusy,
        activeJob: isBusy ? activeJob : null
      }
    });
  } catch (error: any) {
    console.error('[BACKUP CONTROLLER] getBackupConfig error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve backup configuration'
    });
  }
};

/**
 * GET /api/admin/backups/history
 * Returns paginated backup records with metadata
 */
export const getBackupHistory = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));

    const result = await backupEngine.getBackupHistory(page, limit);
    return res.status(200).json({
      success: true,
      page,
      limit,
      ...result
    });
  } catch (error: any) {
    console.error('[BACKUP CONTROLLER] getBackupHistory error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve backup history'
    });
  }
};

/**
 * GET /api/admin/backups/active-job
 * Returns real-time status of active backup or restore job
 */
export const getActiveJobStatus = async (req: Request, res: Response) => {
  const activeJob = backupEngine.getActiveJob();
  const isBusy = backupEngine.isBusy();
  return res.status(200).json({
    success: true,
    isBusy,
    job: activeJob
  });
};

/**
 * POST /api/admin/backups/create
 * Triggers a manual database backup
 */
export const createManualBackup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (backupEngine.isBusy()) {
      return res.status(409).json({
        success: false,
        error: 'A backup or restore operation is already in progress.',
        activeJob: backupEngine.getActiveJob()
      });
    }

    const adminEmail = req.user?.email || 'Administrator';

    // Start backup job asynchronously or await based on query
    const asyncMode = req.query.async === 'true';

    if (asyncMode) {
      // Launch in background
      backupEngine.createBackup({
        type: 'MANUAL',
        createdBy: adminEmail
      }).then(async (result) => {
        await NotificationService.createSystemNotification({
          eventKey: 'BACKUP_SUCCESS' as any,
          title: 'Manual Database Backup Completed',
          body: `Database backup completed successfully by ${adminEmail}. Size: ${(result.fileSize / (1024 * 1024)).toFixed(2)} MB, Tables: ${result.tableCount}.`,
          deepLink: '/admin/settings/backups',
          metadata: result
        }).catch(() => {});
      }).catch(async (err) => {
        await NotificationService.createSystemNotification({
          eventKey: 'BACKUP_FAILED' as any,
          title: 'Manual Database Backup Failed',
          body: `Database backup failed: ${err.message}`,
          deepLink: '/admin/settings/backups',
          metadata: { error: err.message }
        }).catch(() => {});
      });

      return res.status(202).json({
        success: true,
        message: 'Backup job initiated',
        job: backupEngine.getActiveJob()
      });
    } else {
      // Synchronous execution (with stage tracking)
      const result = await backupEngine.createBackup({
        type: 'MANUAL',
        createdBy: adminEmail
      });

      // Dispatch notification
      await NotificationService.createSystemNotification({
        eventKey: 'BACKUP_SUCCESS' as any,
        title: 'Manual Database Backup Completed',
        body: `Database backup completed successfully by ${adminEmail}. Size: ${(result.fileSize / (1024 * 1024)).toFixed(2)} MB, Tables: ${result.tableCount}.`,
        deepLink: '/admin/settings/backups',
        metadata: result
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: 'Database backup completed successfully',
        data: result
      });
    }
  } catch (error: any) {
    console.error('[BACKUP CONTROLLER] createManualBackup error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Manual backup operation failed'
    });
  }
};

/**
 * POST /api/admin/backups/:id/verify
 * Validates ZIP integrity, manifest, and SHA-256 checksum without restoring
 */
export const verifyBackup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Backup ID or storage path is required' });
    }

    const result = await backupEngine.verifyBackup(id);

    return res.status(200).json({
      success: result.valid,
      data: result
    });
  } catch (error: any) {
    console.error('[BACKUP CONTROLLER] verifyBackup error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Verification check failed'
    });
  }
};

/**
 * GET /api/admin/backups/:id/download
 * Streams the backup ZIP file securely from Firebase Storage
 */
export const downloadBackup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Backup identifier required' });
    }

    const fileDetails = await backupEngine.getDownloadStream(id);

    res.setHeader('Content-Disposition', `attachment; filename="${fileDetails.fileName}"`);
    res.setHeader('Content-Type', fileDetails.contentType);
    if (fileDetails.fileSize > 0) {
      res.setHeader('Content-Length', String(fileDetails.fileSize));
    }

    fileDetails.stream.on('error', (streamErr) => {
      console.error('[BACKUP CONTROLLER] Stream error while downloading backup:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Stream error during download' });
      }
    });

    fileDetails.stream.pipe(res);
  } catch (error: any) {
    console.error('[BACKUP CONTROLLER] downloadBackup error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to stream backup archive'
      });
    }
  }
};

/**
 * POST /api/admin/backups/restore
 * Restores database from an existing backup in Firebase Storage
 * STRICTLY SUPER ADMIN ONLY
 */
export const restoreFromStorage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { storagePath, confirmationText } = req.body;

    // Requirement 29: Require typed confirmation "RESTORE DATABASE"
    if (!confirmationText || confirmationText.trim() !== 'RESTORE DATABASE') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation text must match exactly "RESTORE DATABASE".'
      });
    }

    if (!storagePath) {
      return res.status(400).json({
        success: false,
        error: 'Target storagePath is required.'
      });
    }

    const adminEmail = req.user?.email || 'Super Administrator';

    console.warn(`[BACKUP RESTORE] Database restore initiated by ${adminEmail} targeting: ${storagePath}`);

    const result = await backupEngine.restoreBackup({
      storagePath,
      performedBy: adminEmail
    });

    // Notify of success
    await NotificationService.createSystemNotification({
      eventKey: 'RESTORE_SUCCESS' as any,
      title: 'Database Restored Successfully',
      body: `Database restore completed successfully by ${adminEmail}. System health checks passed.`,
      deepLink: '/admin/settings/backups',
      metadata: {
        target: storagePath,
        safetyBackup: result.preRestoreSafetyBackupPath,
        durationMs: result.durationMs
      }
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Database restored and verified successfully',
      data: result
    });
  } catch (error: any) {
    console.error('[BACKUP CONTROLLER] restoreFromStorage error:', error);

    // Notify of failure
    await NotificationService.createSystemNotification({
      eventKey: 'RESTORE_FAILED' as any,
      title: 'Database Restore Failed',
      body: `Database restore operation failed: ${error.message}`,
      deepLink: '/admin/settings/backups',
      metadata: { error: error.message }
    }).catch(() => {});

    return res.status(500).json({
      success: false,
      error: error.message || 'Database restore failed'
    });
  }
};

/**
 * POST /api/admin/backups/upload-and-restore
 * Accepts uploaded ZIP from admin's local machine, validates, and restores
 * STRICTLY SUPER ADMIN ONLY
 */
export const uploadAndRestore = async (req: AuthenticatedRequest, res: Response) => {
  const file = req.file;

  try {
    const { confirmationText } = req.body;

    if (!confirmationText || confirmationText.trim() !== 'RESTORE DATABASE') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation text must match exactly "RESTORE DATABASE".'
      });
    }

    if (!file || !file.path) {
      return res.status(400).json({
        success: false,
        error: 'A valid backup ZIP file is required.'
      });
    }

    const adminEmail = req.user?.email || 'Super Administrator';
    console.warn(`[BACKUP RESTORE] Uploaded database restore initiated by ${adminEmail} from file: ${file.originalname}`);

    const result = await backupEngine.restoreBackup({
      uploadedZipPath: file.path,
      performedBy: adminEmail
    });

    // Notify of success
    await NotificationService.createSystemNotification({
      eventKey: 'RESTORE_SUCCESS' as any,
      title: 'Uploaded Database Backup Restored',
      body: `Database restored from uploaded ZIP "${file.originalname}" by ${adminEmail}. Health checks passed.`,
      deepLink: '/admin/settings/backups',
      metadata: {
        originalFilename: file.originalname,
        safetyBackup: result.preRestoreSafetyBackupPath,
        durationMs: result.durationMs
      }
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Uploaded backup restored successfully',
      data: result
    });
  } catch (error: any) {
    console.error('[BACKUP CONTROLLER] uploadAndRestore error:', error);

    await NotificationService.createSystemNotification({
      eventKey: 'RESTORE_FAILED' as any,
      title: 'Uploaded Database Restore Failed',
      body: `Uploaded restore failed: ${error.message}`,
      deepLink: '/admin/settings/backups',
      metadata: { error: error.message }
    }).catch(() => {});

    return res.status(500).json({
      success: false,
      error: error.message || 'Uploaded database restore failed'
    });
  }
};

/**
 * GET /api/admin/backups/health-check
 * Runs post-restore / periodic health check
 */
export const getHealthCheck = async (req: Request, res: Response) => {
  try {
    const health = await backupEngine.performHealthCheck();
    return res.status(health.healthy ? 200 : 503).json({
      success: health.healthy,
      data: health
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Health check failed'
    });
  }
};
