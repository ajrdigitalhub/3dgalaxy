import { Router } from 'express';
import { updateThemeSettings, getPaymentGateways, updatePaymentGateway, getSecuritySettings, updateSecuritySettings } from '../controllers/settings';
import { getSettings } from '../modules/settings/settings.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { cacheMiddleware } from '../middleware/cache';

const router = Router();

router.get('/', cacheMiddleware(300), getSettings);
router.put('/', authenticateToken, requireRole(['Admin', 'Super Admin']), updateThemeSettings);
router.get('/payment-gateways', getPaymentGateways);
router.put('/payment-gateways/:id', authenticateToken, requireRole(['Admin', 'Super Admin']), updatePaymentGateway);

router.get('/security', getSecuritySettings);
router.put('/security', authenticateToken, requireRole(['Admin', 'Super Admin']), updateSecuritySettings);

export default router;
