import { Router } from 'express';
import {
  getCustomerNotifications,
  getCustomerNotificationDetail,
  getAdminWhatsappLogs,
  getAdminWhatsappLogDetail,
  handleManualSend,
  handleManualRetry,
  handleCampaignBroadcast,
  handleMetaWebhook,
  handleMetaWebhookVerification
} from '../controllers/whatsapp';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Customer Endpoints
router.get('/notifications', authenticateToken, getCustomerNotifications);
router.get('/notifications/:id', authenticateToken, getCustomerNotificationDetail);

// Admin Endpoints
router.get('/admin/whatsapp/logs', authenticateToken, getAdminWhatsappLogs);
router.get('/admin/whatsapp/logs/:id', authenticateToken, getAdminWhatsappLogDetail);
router.post('/admin/whatsapp/send', authenticateToken, handleManualSend);
router.post('/admin/whatsapp/retry', authenticateToken, handleManualRetry);
router.post('/admin/whatsapp/campaign', authenticateToken, handleCampaignBroadcast);

// Webhook Endpoints (Public)
router.post('/webhooks/whatsapp', handleMetaWebhook);
router.get('/webhooks/whatsapp', handleMetaWebhookVerification);

export default router;
