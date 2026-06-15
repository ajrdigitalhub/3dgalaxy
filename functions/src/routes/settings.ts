import { Router } from 'express';
import { getThemeSettings, updateThemeSettings, getPaymentGateways, updatePaymentGateway } from '../controllers/settings';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getThemeSettings);
router.put('/', authenticateToken, requireRole(['Admin', 'Super Admin']), updateThemeSettings);
router.get('/payment-gateways', getPaymentGateways);
router.put('/payment-gateways/:id', authenticateToken, requireRole(['Admin', 'Super Admin']), updatePaymentGateway);

export default router;
