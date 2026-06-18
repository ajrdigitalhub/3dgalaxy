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
  resendOrderNotification,
  trackOrder
} from '../controllers/order';
import { authenticateToken, optionalAuthenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Guest Tracking endpoint (no auth needed)
router.post('/track', trackOrder);

// Authenticated customer my-orders
router.get('/my-orders', authenticateToken, getMyOrders);

// Admin-only order index list
router.get('/', authenticateToken, requireRole(['Admin', 'Manager']), getOrders);

// Order detail by ID (optional auth to support guest viewers)
router.get('/:id', optionalAuthenticateToken, getOrderById);

// Order creation (optional auth to support guest checkout)
router.post('/', optionalAuthenticateToken, createOrder);

router.put('/:id/status', authenticateToken, requireRole(['Admin', 'Manager']), updateOrderStatus);
router.put('/:id/payment', authenticateToken, requireRole(['Admin', 'Manager']), updatePaymentStatus);
router.put('/:id/shipment', authenticateToken, requireRole(['Admin', 'Manager']), updateShipmentTracking);
router.post('/:id/notes', authenticateToken, requireRole(['Admin', 'Manager']), addOrderNotes);
router.post('/:id/resend-notification', authenticateToken, requireRole(['Admin', 'Manager']), resendOrderNotification);

export default router;
