import { Request, Response } from 'express';
import prisma from '../config/database';
import {
  NotificationService,
  EVENT_DEFINITIONS,
  NotificationEventKey,
} from '../services/notification.service';

/**
 * Get Admin Notifications for Notification Center
 * GET /api/admin/notifications
 */
export const getAdminNotifications = async (req: Request, res: Response) => {
  try {
    const { category, search, unreadOnly, page = 1, limit = 50 } = req.query as any;

    const where: any = {};

    if (category && category !== 'all') {
      where.category = String(category).toLowerCase();
    }

    if (unreadOnly === 'true' || unreadOnly === '1') {
      where.isRead = false;
    }

    if (search && String(search).trim() !== '') {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { body: { contains: String(search), mode: 'insensitive' } },
        { eventKey: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const takeNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const skipNum = (pageNum - 1) * takeNum;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.adminNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: skipNum,
        take: takeNum,
      }),
      prisma.adminNotification.count({ where }),
      prisma.adminNotification.count({ where: { isRead: false } }),
    ]);

    return res.status(200).json({
      success: true,
      unreadCount,
      totalCount,
      page: pageNum,
      limit: takeNum,
      data: notifications,
    });
  } catch (error: any) {
    console.error('getAdminNotifications error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch admin notifications' });
  }
};

/**
 * Mark Single Notification as Read
 * PATCH /api/admin/notifications/:id/read
 */
export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notif = await prisma.adminNotification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notif,
    });
  } catch (error: any) {
    console.error('markNotificationRead error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update notification' });
  }
};

/**
 * Mark All Notifications as Read
 * POST /api/admin/notifications/mark-all-read
 */
export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    await prisma.adminNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({
      success: true,
      message: 'All admin notifications marked as read',
    });
  } catch (error: any) {
    console.error('markAllNotificationsRead error:', error);
    return res.status(500).json({ error: error.message || 'Failed to mark all as read' });
  }
};

/**
 * Delete Single Notification
 * DELETE /api/admin/notifications/:id
 */
export const deleteAdminNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.adminNotification.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error: any) {
    console.error('deleteAdminNotification error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete notification' });
  }
};

/**
 * Clear All Notifications
 * DELETE /api/admin/notifications/clear-all
 */
export const clearAllAdminNotifications = async (req: Request, res: Response) => {
  try {
    await prisma.adminNotification.deleteMany({});

    return res.status(200).json({
      success: true,
      message: 'All notifications cleared',
    });
  } catch (error: any) {
    console.error('clearAllAdminNotifications error:', error);
    return res.status(500).json({ error: error.message || 'Failed to clear notifications' });
  }
};

const settingSelect = {
  id: true,
  eventKey: true,
  eventLabel: true,
  category: true,
  pushEnabled: true,
  whatsappEnabled: true,
  emailEnabled: true,
};

/**
 * Get Notification Channel Settings Matrix
 * GET /api/admin/notification-settings
 */
export const getNotificationSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.notificationChannelSetting.findMany({
      select: settingSelect,
      orderBy: { category: 'asc' },
    });

    // Ensure all defined keys exist in response
    const dbKeyMap = new Set(settings.map((s) => s.eventKey));
    const missingKeys = Object.keys(EVENT_DEFINITIONS).filter((k) => !dbKeyMap.has(k as NotificationEventKey));

    if (missingKeys.length > 0 || settings.length === 0) {
      for (const def of Object.values(EVENT_DEFINITIONS)) {
        if (!dbKeyMap.has(def.eventKey)) {
          try {
            await prisma.notificationChannelSetting.upsert({
              where: { eventKey: def.eventKey },
              update: {},
              create: {
                eventKey: def.eventKey,
                eventLabel: def.eventLabel,
                category: def.category,
                pushEnabled: def.defaultPush,
                whatsappEnabled: def.defaultWhatsapp,
                emailEnabled: def.defaultEmail,
              },
              select: settingSelect,
            });
          } catch (err) {
            console.warn(`[getNotificationSettings] Skip insert for ${def.eventKey}:`, err);
          }
        }
      }

      try {
        settings = await prisma.notificationChannelSetting.findMany({
          select: settingSelect,
          orderBy: { category: 'asc' },
        });
      } catch (err) {
        console.warn('[getNotificationSettings] findMany failed:', err);
      }
    }

    const finalKeySet = new Set(settings.map((s) => s.eventKey));
    const fullSettings = [...settings];

    for (const def of Object.values(EVENT_DEFINITIONS)) {
      if (!finalKeySet.has(def.eventKey)) {
        fullSettings.push({
          id: `default-${def.eventKey}`,
          eventKey: def.eventKey,
          eventLabel: def.eventLabel,
          category: def.category,
          pushEnabled: def.defaultPush,
          whatsappEnabled: def.defaultWhatsapp,
          emailEnabled: def.defaultEmail,
        });
      }
    }

    // STRICT BUSINESS RULE: Ensure whatsappEnabled is FALSE for non-NEW_ORDER
    const sanitizedSettings = fullSettings.map((s) => ({
      ...s,
      whatsappEnabled: s.eventKey === 'NEW_ORDER' ? s.whatsappEnabled : false,
    }));

    return res.status(200).json({
      success: true,
      data: sanitizedSettings,
    });
  } catch (error: any) {
    console.error('getNotificationSettings error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch notification settings' });
  }
};

/**
 * Save / Update Notification Channel Settings Matrix
 * PUT /api/admin/notification-settings
 */
export const updateNotificationSettings = async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'settings must be an array of event channel objects' });
    }

    const updated: any[] = [];
    for (const item of settings) {
      if (!item.eventKey || !EVENT_DEFINITIONS[item.eventKey as NotificationEventKey]) {
        continue;
      }

      const eventKey = item.eventKey as NotificationEventKey;
      const def = EVENT_DEFINITIONS[eventKey];

      // STRICT BUSINESS RULE: WhatsApp enabled ONLY for NEW_ORDER
      const whatsappEnabled = eventKey === 'NEW_ORDER' ? Boolean(item.whatsappEnabled) : false;

      const record = await prisma.notificationChannelSetting.upsert({
        where: { eventKey },
        update: {
          pushEnabled: Boolean(item.pushEnabled),
          whatsappEnabled,
          emailEnabled: Boolean(item.emailEnabled),
        },
        create: {
          eventKey,
          eventLabel: def.eventLabel,
          category: def.category,
          pushEnabled: Boolean(item.pushEnabled),
          whatsappEnabled,
          emailEnabled: Boolean(item.emailEnabled),
        },
        select: settingSelect,
      });

      updated.push(record);
    }

    return res.status(200).json({
      success: true,
      message: 'Notification channel settings updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('updateNotificationSettings error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update notification settings' });
  }
};

/**
 * Register Admin FCM Device Token
 * POST /api/admin/fcm/register
 */
export const registerAdminFcmDevice = async (req: Request, res: Response) => {
  try {
    const { fcmToken, deviceName, browser, operatingSystem, platform, adminId } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ error: 'fcmToken is required' });
    }

    const device = await prisma.adminNotificationDevice.upsert({
      where: { fcmToken },
      update: {
        deviceName: deviceName || 'Chrome Desktop',
        browser: browser || 'Chrome',
        isActive: true,
        lastSeen: new Date(),
      },
      create: {
        adminId: adminId || 'admin-main',
        fcmToken,
        deviceName: deviceName || 'Chrome Desktop',
        browser: browser || 'Chrome',
        isActive: true,
      },
      select: {
        id: true,
        adminId: true,
        deviceName: true,
        browser: true,
        fcmToken: true,
        isActive: true,
        lastSeen: true,
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Admin FCM device registered successfully',
      data: device,
    });
  } catch (error: any) {
    console.error('registerAdminFcmDevice error:', error);
    return res.status(500).json({ error: error.message || 'Failed to register admin device' });
  }
};

/**
 * Send Test Admin Push Notification
 * POST /api/admin/fcm/test
 */
export const sendTestAdminPush = async (req: Request, res: Response) => {
  try {
    const result = await NotificationService.dispatch({
      eventKey: 'SYSTEM_ALERT',
      title: '🚀 3DGalaxy Admin Push Test',
      body: 'Admin push notification channel is active and receiving live events.',
      deepLink: '/admin',
      metadata: { test: true, timestamp: new Date().toISOString() },
    });

    return res.status(200).json({
      success: true,
      message: 'Test admin push notification dispatched',
      result,
    });
  } catch (error: any) {
    console.error('sendTestAdminPush error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send test push' });
  }
};
