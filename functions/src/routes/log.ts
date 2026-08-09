import { Router } from 'express';
import { handleClientLog, handleHealthCheck, handleGetAdminLogs, handleGetAdminLogStats } from '../controllers/log';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Public client log ingestion & health endpoints
router.post('/logs/client', handleClientLog);
router.get('/health', handleHealthCheck);

// Protected Admin log search & health analytics endpoints
router.get('/admin/logs', authenticateToken, requireRole(['Admin', 'Manager']), handleGetAdminLogs);
router.get('/admin/logs/stats', authenticateToken, requireRole(['Admin', 'Manager']), handleGetAdminLogStats);

export default router;
