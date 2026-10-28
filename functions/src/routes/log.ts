import { Router } from 'express';
import { handleClientLog, handleHealthCheck, handleGetAdminLogs, handleGetAdminLogStats, handleExportAdminLogsCsv } from '../controllers/log';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Public client log ingestion & health endpoints
router.post('/logs/client', handleClientLog);
router.get('/health', handleHealthCheck);

// Protected Admin log search, export & health analytics endpoints
router.get('/admin/logs', authenticateToken, requireRole(['Admin', 'Manager']), handleGetAdminLogs);
router.get('/admin/logs/export', authenticateToken, requireRole(['Admin', 'Manager']), handleExportAdminLogsCsv);
router.get('/admin/logs/stats', authenticateToken, requireRole(['Admin', 'Manager']), handleGetAdminLogStats);

export default router;
