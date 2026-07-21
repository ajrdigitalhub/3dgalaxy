import { Router } from 'express';
import {
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteAdminNotification,
  clearAllAdminNotifications,
  getNotificationSettings,
  updateNotificationSettings,
  registerAdminFcmDevice,
  sendTestAdminPush,
} from '../controllers/adminNotification.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Notification Center Endpoints
router.get('/admin/notifications', authenticateToken, requireRole(['Admin', 'Manager', 'Super Admin']), getAdminNotifications);
router.patch('/admin/notifications/:id/read', authenticateToken, requireRole(['Admin', 'Manager', 'Super Admin']), markNotificationRead);
router.post('/admin/notifications/mark-all-read', authenticateToken, requireRole(['Admin', 'Manager', 'Super Admin']), markAllNotificationsRead);
router.delete('/admin/notifications/clear-all', authenticateToken, requireRole(['Admin', 'Manager', 'Super Admin']), clearAllAdminNotifications);
router.delete('/admin/notifications/:id', authenticateToken, requireRole(['Admin', 'Manager', 'Super Admin']), deleteAdminNotification);

// Notification Settings Endpoints
router.get('/admin/notification-settings', authenticateToken, requireRole(['Admin', 'Manager', 'Super Admin']), getNotificationSettings);
router.put('/admin/notification-settings', authenticateToken, requireRole(['Admin', 'Manager', 'Super Admin']), updateNotificationSettings);

// FCM Device & Test Endpoints
router.post('/admin/fcm/register', registerAdminFcmDevice);
router.post('/admin/fcm/test', authenticateToken, requireRole(['Admin', 'Manager', 'Super Admin']), sendTestAdminPush);

export default router;
