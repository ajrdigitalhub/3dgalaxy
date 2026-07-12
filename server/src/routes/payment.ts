import { Router } from 'express';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createCashfreeOrder,
  createCODOrder,
  handleRazorpayWebhook,
  handleCashfreeWebhook,
  getCustomerHistory,
  getCustomerTransaction,
  getAdminTransactions,
  getAdminTransactionDetail,
  getAdminWebhookLogs,
  handleAdminRefund,
} from '../controllers/payment';
import { authenticateToken, optionalAuthenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

// Webhook endpoints (Public - No Token required)
router.post('/webhooks/razorpay', handleRazorpayWebhook);
router.post('/webhooks/cashfree', handleCashfreeWebhook);

// Authenticated / Guest payment endpoints
router.post('/payments/razorpay/create-order', optionalAuthenticateToken, createRazorpayOrder);
router.post('/payments/razorpay/verify', optionalAuthenticateToken, verifyRazorpayPayment);
router.post('/payments/cashfree/create-order', optionalAuthenticateToken, createCashfreeOrder);
router.post('/payments/cod/create-order', optionalAuthenticateToken, createCODOrder);
router.get('/payments/history', authenticateToken, getCustomerHistory);
router.get('/payments/history/:transactionId', authenticateToken, getCustomerTransaction);

// Admin endpoints
router.get('/admin/transactions', authenticateToken, requirePermission('read:orders'), getAdminTransactions);
router.get('/admin/webhook-logs', authenticateToken, requirePermission('read:orders'), getAdminWebhookLogs);
router.get('/admin/transactions/:id', authenticateToken, requirePermission('read:orders'), getAdminTransactionDetail);
router.post('/admin/payments/refund', authenticateToken, requirePermission('write:orders'), handleAdminRefund);

export default router;
