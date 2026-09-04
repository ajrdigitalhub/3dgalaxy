import { Router } from 'express';
import {
  getCustomerNotifications,
  getCustomerNotificationDetail,
  getAdminWhatsappLogs,
  getAdminWhatsappLogDetail,
  handleManualSend,
  handlePreviewOrderStatusMessage,
  handlePreviewServiceTemplate,
  handleManualRetry,
  handleCampaignBroadcast,
  handleMetaWebhook,
  handleMetaWebhookVerification,
  getAdminWhatsappConversations,
  getAdminWhatsappConversationDetail,
  getAdminWhatsappMessages,
  handleAdminReply,
  handleUpdateConversationStatus,
  handleUpdateConversationMode,
  handleAssignConversation,
  handleMarkConversationRead
} from '../controllers/whatsapp';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Customer Endpoints
router.get('/whatsapp/notifications', authenticateToken, getCustomerNotifications);
router.get('/whatsapp/notifications/:id', authenticateToken, getCustomerNotificationDetail);

// Admin Conversation Inbox Endpoints
router.get('/admin/whatsapp/conversations', authenticateToken, getAdminWhatsappConversations);
router.get('/admin/whatsapp/conversations/:id', authenticateToken, getAdminWhatsappConversationDetail);
router.get('/admin/whatsapp/conversations/:id/messages', authenticateToken, getAdminWhatsappMessages);
router.post('/admin/whatsapp/conversations/:id/messages', authenticateToken, handleAdminReply);
router.patch('/admin/whatsapp/conversations/:id/status', authenticateToken, handleUpdateConversationStatus);
router.patch('/admin/whatsapp/conversations/:id/mode', authenticateToken, handleUpdateConversationMode);
router.patch('/admin/whatsapp/conversations/:id/assign', authenticateToken, handleAssignConversation);
router.post('/admin/whatsapp/conversations/:id/read', authenticateToken, handleMarkConversationRead);

// Admin Logs & Broadcast Endpoints
router.get('/admin/whatsapp/logs', authenticateToken, getAdminWhatsappLogs);
router.get('/admin/whatsapp/logs/:id', authenticateToken, getAdminWhatsappLogDetail);
router.post('/admin/whatsapp/send', authenticateToken, handleManualSend);
router.post('/admin/whatsapp/preview-status', authenticateToken, handlePreviewOrderStatusMessage);
router.post('/admin/whatsapp/preview-service', authenticateToken, handlePreviewServiceTemplate);
router.post('/admin/whatsapp/retry', authenticateToken, handleManualRetry);
router.post('/admin/whatsapp/campaign', authenticateToken, handleCampaignBroadcast);

// Webhook Endpoints (Public - Meta WhatsApp Cloud API)
// Supported paths: /api/webhooks/whatsapp and /api/whatsapp/webhook
router.post('/webhooks/whatsapp', handleMetaWebhook);
router.get('/webhooks/whatsapp', handleMetaWebhookVerification);
router.post('/whatsapp/webhook', handleMetaWebhook);
router.get('/whatsapp/webhook', handleMetaWebhookVerification);

export default router;

