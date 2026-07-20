import { Router } from 'express';
import { getPwaSettings, updatePwaSettings, logPwaAudit } from '../controllers/pwa';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const adminGuard = [authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager'])];

router.get('/admin/pwa/settings', adminGuard, getPwaSettings);
router.put('/admin/pwa/settings', adminGuard, updatePwaSettings);
router.post('/admin/pwa/audit', adminGuard, logPwaAudit);

export default router;
