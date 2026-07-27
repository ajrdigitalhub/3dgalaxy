import { Router } from 'express';
import {
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteAdminNotification,
  clearAllAdminNotifications,
  getNotificationSettings,
  updateNotificationSettings,
} from '../controllers/adminNotification.controller';

import {
  registerAdminDevice,
  updateAdminDevice,
  getAdminDevices,
  getActiveAdminDevices,
  deleteAdminDevice,
  sendTestNotification,
  broadcastAdminNotification,
  getAdminNotificationLogs,
} from '../controllers/adminFcm';

import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Notification Center Endpoints
router.get('/admin/notifications', getAdminNotifications);
router.patch('/admin/notifications/:id/read', markNotificationRead);
router.post('/admin/notifications/mark-all-read', markAllNotificationsRead);
router.delete('/admin/notifications/clear-all', clearAllAdminNotifications);
router.delete('/admin/notifications/:id', deleteAdminNotification);

// Notification Settings Endpoints
router.get('/admin/notification-settings', getNotificationSettings);
router.put('/admin/notification-settings', updateNotificationSettings);

// FCM Device Management Endpoints
router.post('/admin/fcm/register', registerAdminDevice);
router.put('/admin/fcm/update', updateAdminDevice);
router.get('/admin/fcm', getAdminDevices);
router.get('/admin/fcm/devices', getAdminDevices);
router.get('/admin/fcm/active', getActiveAdminDevices);
router.delete('/admin/fcm/:id', deleteAdminDevice);
router.delete('/admin/fcm/remove', deleteAdminDevice);
router.post('/admin/fcm/test', sendTestNotification);
router.get('/admin/fcm/logs', getAdminNotificationLogs);

// Multicast Notification Broadcast Endpoint
router.post('/admin/notifications/broadcast', broadcastAdminNotification);
router.post('/notifications/admin/send', broadcastAdminNotification);

export default router;
