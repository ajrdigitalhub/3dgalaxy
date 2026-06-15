import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  updateShipmentTracking,
  getMyOrders,
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

export default router;
