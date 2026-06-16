import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  updateShipmentTracking,
  getMyOrders,
  addOrderNotes,
  resendOrderNotification
} from '../controllers/order';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/my-orders', getMyOrders);
router.get('/', requireRole(['Admin', 'Manager']), getOrders);
router.get('/:id', getOrderById);

router.post('/', createOrder);
router.put('/:id/status', requireRole(['Admin', 'Manager']), updateOrderStatus);
router.put('/:id/payment', requireRole(['Admin', 'Manager']), updatePaymentStatus);
router.put('/:id/shipment', requireRole(['Admin', 'Manager']), updateShipmentTracking);
router.post('/:id/notes', requireRole(['Admin', 'Manager']), addOrderNotes);
router.post('/:id/resend-notification', requireRole(['Admin', 'Manager']), resendOrderNotification);

export default router;
