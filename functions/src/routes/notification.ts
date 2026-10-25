import { Router } from 'express';
import {
  registerDevice,
  updateToken,
  unbindDeviceAccount,
  subscribeToTopic,
  unsubscribeFromTopic,
  getNotifications,
  markRead,
  deleteNotification,
  adminSendNotification,
  adminSendTopic,
  adminSendUser,
  adminGetLogs,
  adminGetAnalytics,
  adminGetDevices
} from '../controllers/notification';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const adminGuard = [authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager'])];

// --- Customer / Guest Endpoints ---
router.post('/notifications/register-device', registerDevice);
router.post('/notifications/update-token', updateToken);
router.post('/notifications/unbind-account', unbindDeviceAccount);
router.post('/notifications/subscribe', subscribeToTopic);
router.post('/notifications/unsubscribe', unsubscribeFromTopic);
router.get('/notifications', getNotifications);
router.put('/notifications/read', markRead);
router.delete('/notifications/:id', deleteNotification);

// --- Public Push settings endpoints ---
import {
  getFirebaseSettings,
  updateFirebaseSettings,
  validateFirebaseConfig,
  getPopupSettings,
  updatePopupSettings,
  getPublicFirebaseSettings,
  searchProductsForPush,
  getTargetAudienceCount
} from '../controllers/pushMarketing';

router.get('/notifications/popup-config', getPopupSettings);
router.get('/notifications/fcm-config/public', getPublicFirebaseSettings);

// --- Admin Endpoints ---
router.get('/admin/push/config', adminGuard, getFirebaseSettings);
router.post('/admin/push/config', adminGuard, updateFirebaseSettings);
router.post('/admin/push/config/validate', adminGuard, validateFirebaseConfig);
router.get('/admin/push/popup-config', adminGuard, getPopupSettings);
router.post('/admin/push/popup-config', adminGuard, updatePopupSettings);
router.get('/admin/push/products/search', adminGuard, searchProductsForPush);
router.post('/admin/push/audience/estimate', adminGuard, getTargetAudienceCount);
router.post('/admin/notifications/send', adminGuard, adminSendNotification);
router.post('/admin/notifications/send-topic', adminGuard, adminSendTopic);
router.post('/admin/notifications/send-user', adminGuard, adminSendUser);
router.get('/admin/notifications/logs', adminGuard, adminGetLogs);
router.get('/admin/notifications/analytics', adminGuard, adminGetAnalytics);
router.get('/admin/notifications/devices', adminGuard, adminGetDevices);

// --- Push Campaign Management System Endpoints ---
import {
  generateAIContent,
  getAudienceSegments,
  createAudienceSegment,
  getAudienceCount,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaignNow,
  scheduleCampaign,
  sendTestNotification,
  trackClick,
  trackOpen,
  trackConversion,
  simulateCampaignEvent,
  getCampaignAnalytics
} from '../controllers/pushCampaign';

router.post('/notifications/track-click', trackClick);
router.post('/notifications/track-open', trackOpen);
router.post('/notifications/track-conversion', trackConversion);

router.post('/admin/push/ai-generate', adminGuard, generateAIContent);
router.get('/admin/push/audience', adminGuard, getAudienceSegments);
router.post('/admin/push/audience', adminGuard, createAudienceSegment);
router.post('/admin/push/audience/count', adminGuard, getAudienceCount);
router.get('/admin/push/templates', adminGuard, getTemplates);
router.post('/admin/push/templates', adminGuard, createTemplate);
router.put('/admin/push/templates/:id', adminGuard, updateTemplate);
router.delete('/admin/push/templates/:id', adminGuard, deleteTemplate);
router.get('/admin/push/campaigns', adminGuard, getCampaigns);
router.post('/admin/push/campaign', adminGuard, createCampaign);
router.put('/admin/push/campaign/:id', adminGuard, updateCampaign);
router.delete('/admin/push/campaign/:id', adminGuard, deleteCampaign);
router.post('/admin/push/send', adminGuard, sendCampaignNow);
router.post('/admin/push/schedule', adminGuard, scheduleCampaign);
router.get('/admin/push/analytics', adminGuard, getCampaignAnalytics);
router.post('/admin/push/test', adminGuard, sendTestNotification);
router.post('/admin/push/campaign/:id/simulate-event', adminGuard, simulateCampaignEvent);

// --- Push Billing System Endpoints ---
import {
  getPushBillingConfig,
  updatePushBillingConfig,
  getMonthlyPushBillingUsage,
  getPushBillingInvoices,
  generateMonthlyPushInvoice,
  exportPushBillingUsage
} from '../controllers/pushBilling';

router.get('/admin/push/billing/config', adminGuard, getPushBillingConfig);
router.post('/admin/push/billing/config', adminGuard, updatePushBillingConfig);
router.get('/admin/push/billing/monthly', adminGuard, getMonthlyPushBillingUsage);
router.get('/admin/push/billing/invoices', adminGuard, getPushBillingInvoices);
router.post('/admin/push/billing/generate-invoice', adminGuard, generateMonthlyPushInvoice);
router.get('/admin/push/billing/export', adminGuard, exportPushBillingUsage);

export default router;
