import { Router } from 'express';
import { getThemeSettings, updateThemeSettings, getPaymentGateways, updatePaymentGateway, getSecuritySettings, updateSecuritySettings } from '../controllers/settings';
import { authenticateToken, requireRole } from '../middleware/auth';
import { cacheMiddleware } from '../middleware/cache';

const router = Router();

router.get('/', cacheMiddleware(3600), getThemeSettings);
router.put('/', authenticateToken, requireRole(['Admin', 'Super Admin']), updateThemeSettings);
router.get('/payment-gateways', getPaymentGateways);
router.put('/payment-gateways/:id', authenticateToken, requireRole(['Admin', 'Super Admin']), updatePaymentGateway);

router.get('/security', getSecuritySettings);
router.put('/security', authenticateToken, requireRole(['Admin', 'Super Admin']), updateSecuritySettings);

export default router;
