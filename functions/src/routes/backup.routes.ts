import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { ENV } from '../config/env';
import {
  getBackupConfig,
  getBackupHistory,
  getActiveJobStatus,
  createManualBackup,
  verifyBackup,
  downloadBackup,
  restoreFromStorage,
  uploadAndRestore,
  getHealthCheck
} from '../controllers/backup.controller';

const router = Router();

// Server-side ENV Feature Gate Middleware
export const requireBackupModuleEnabled = (req: Request, res: Response, next: NextFunction) => {
  const isEnabled = process.env.BACKUP_MODULE_ENABLED !== undefined
    ? (process.env.BACKUP_MODULE_ENABLED === 'true' || process.env.BACKUP_MODULE_ENABLED === '1')
    : ENV.BACKUP_MODULE_ENABLED;

  if (!isEnabled) {
    return res.status(403).json({
      success: false,
      code: 'FEATURE_DISABLED',
      error: 'Database backup module is currently disabled by server environment policy.'
    });
  }
  next();
};

// Strict Super Admin Middleware for Restore
export const requireSuperAdminForRestore = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const role = (req.user.role || '').toLowerCase().replace(/[\s\-_]/g, '');
  const isSuperAdmin =
    role === 'superadmin' ||
    (req.user.permissions && (req.user.permissions.includes('*') || req.user.permissions.includes('restore_database')));

  if (!isSuperAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient authority: Restoring the database requires Super Administrator permissions.'
    });
  }
  next();
};

// Multer configuration for temporary ZIP upload
const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `3dgalaxy-restore-upload-${uniqueSuffix}.zip`);
  }
});

const uploadZip = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500 MB max backup file size
  },
  fileFilter: (_req, file, cb) => {
    const isZip =
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.mimetype === 'application/octet-stream' ||
      path.extname(file.originalname).toLowerCase() === '.zip';

    if (isZip) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP backup archives (.zip) are permitted.'));
    }
  }
});

// All backup endpoints require:
// 1. Authenticated token
// 2. Server-side ENV feature enabled
router.use(authenticateToken);
router.use(requireBackupModuleEnabled);

// Safe configuration & feature flag status
router.get('/config', getBackupConfig);

// Health check endpoint
router.get('/health-check', getHealthCheck);

// Active job real-time status
router.get('/active-job', getActiveJobStatus);

// Backup history (Admin only)
router.get('/history', requireRole(['admin', 'superadmin']), getBackupHistory);

// Trigger manual backup (Admin only)
router.post('/create', requireRole(['admin', 'superadmin']), createManualBackup);

// Verify existing backup integrity (Admin only)
router.post('/verify/:id', requireRole(['admin', 'superadmin']), verifyBackup);
router.post('/:id/verify', requireRole(['admin', 'superadmin']), verifyBackup);

// Download backup archive (Admin only)
router.get('/download/:id', requireRole(['admin', 'superadmin']), downloadBackup);
router.get('/:id/download', requireRole(['admin', 'superadmin']), downloadBackup);

// Restore from Firebase Storage (STRICTLY SUPER ADMIN)
router.post('/restore', requireSuperAdminForRestore, restoreFromStorage);

// Upload backup ZIP and restore (STRICTLY SUPER ADMIN)
router.post('/upload-and-restore', requireSuperAdminForRestore, uploadZip.single('file'), uploadAndRestore);

export default router;
