import { Router } from 'express';
import {
  logCartActivity,
  startCheckoutTracking,
  logCheckoutHeartbeat,
  recoverCartByToken,
  getAdminAbandonedCheckouts,
  getAdminAbandonedCheckoutDetail,
  manualResendReminder,
  manualRecoverCheckout,
  getAdminAbandonedCheckoutsAnalytics
} from '../controllers/abandonedCheckout';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/cart/activity', logCartActivity);
router.post('/checkout/start', startCheckoutTracking);
router.post('/checkout/heartbeat', logCheckoutHeartbeat);
router.get('/recover-cart/:token', recoverCartByToken);

router.get('/admin/abandoned-checkouts', authenticateToken, getAdminAbandonedCheckouts);
router.get('/admin/abandoned-checkouts/analytics', authenticateToken, getAdminAbandonedCheckoutsAnalytics);
router.get('/admin/abandoned-checkouts/:id', authenticateToken, getAdminAbandonedCheckoutDetail);
router.post('/admin/abandoned-checkouts/resend', authenticateToken, manualResendReminder);
router.post('/admin/abandoned-checkouts/recover', authenticateToken, manualRecoverCheckout);

export default router;
