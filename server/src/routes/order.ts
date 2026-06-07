import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  updateShipmentTracking,
} from '../controllers/order';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('read:orders'), getOrders);
router.get('/:id', requirePermission('read:orders'), getOrderById);

router.post('/', requirePermission('create:orders'), createOrder);
router.put('/:id/status', requirePermission('write:orders'), updateOrderStatus);
router.put('/:id/payment', requirePermission('write:orders'), updatePaymentStatus);
router.put('/:id/shipment', requirePermission('write:orders'), updateShipmentTracking);

export default router;
