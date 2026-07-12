import { Router } from 'express';
import {
  registerDevice,
  updateToken,
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
router.post('/notifications/subscribe', subscribeToTopic);
router.post('/notifications/unsubscribe', unsubscribeFromTopic);
router.get('/notifications', getNotifications);
router.put('/notifications/read', markRead);
router.delete('/notifications/:id', deleteNotification);

// --- Admin Endpoints ---
router.post('/admin/notifications/send', adminGuard, adminSendNotification);
router.post('/admin/notifications/send-topic', adminGuard, adminSendTopic);
router.post('/admin/notifications/send-user', adminGuard, adminSendUser);
router.get('/admin/notifications/logs', adminGuard, adminGetLogs);
router.get('/admin/notifications/analytics', adminGuard, adminGetAnalytics);
router.get('/admin/notifications/devices', adminGuard, adminGetDevices);

export default router;
