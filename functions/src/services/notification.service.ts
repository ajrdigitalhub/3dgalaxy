import prisma from '../config/database';
import { getFirebaseAdmin } from '../config/firebase';
import { getSettingsService } from '../modules/settings/settings.service';
import { triggerWhatsAppNotification, getWhatsappSettings } from '../controllers/whatsapp';
import { WhatsAppNotificationService } from './whatsappNotificationService';
import fs from 'fs';
import path from 'path';

export type NotificationCategory =
  | 'orders'
  | 'service'
  | 'inventory'
  | 'customers'
  | 'marketing'
  | 'reviews'
  | 'payments'
  | 'system';

export type NotificationEventKey =
  | 'NEW_ORDER'
  | 'NEW_SERVICE_REQUEST'
  | 'SERVICE_STATUS_UPDATED'
  | 'QUOTE_ACCEPTED'
  | 'QUOTE_REJECTED'
  | 'NEW_CUSTOMER_REGISTRATION'
  | 'NEW_PRODUCT_REVIEW'
  | 'CONTACT_FORM_SUBMITTED'
  | 'CALLBACK_REQUEST'
  | 'CART_ABANDONMENT'
  | 'WISHLIST_ACTIVITY'
  | 'LOW_STOCK_ALERT'
  | 'OUT_OF_STOCK_ALERT'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'REFUND_REQUEST'
  | 'ORDER_CANCELLED'
  | 'RETURN_REQUEST'
  | 'FAILED_NOTIFICATION'
  | 'FAILED_BACKGROUND_JOB'
  | 'SYSTEM_ALERT';

export interface NotificationEventDefinition {
  eventKey: NotificationEventKey;
  eventLabel: string;
  category: NotificationCategory;
  defaultPush: boolean;
  defaultWhatsapp: boolean; // TRUE ONLY for NEW_ORDER
  defaultEmail: boolean;
}

export interface NotificationPayload {
  eventKey: NotificationEventKey;
  title: string;
  body: string;
  deepLink?: string;
  metadata?: Record<string, any>;
  order?: any;
}

// Master Notification Events Configuration Matrix
export const EVENT_DEFINITIONS: Record<NotificationEventKey, NotificationEventDefinition> = {
  NEW_ORDER: {
    eventKey: 'NEW_ORDER',
    eventLabel: 'New Customer Order Received',
    category: 'orders',
    defaultPush: true,
    defaultWhatsapp: true, // ✅ ONLY EVENT WITH WHATSAPP ENABLED
    defaultEmail: false,
  },
  NEW_SERVICE_REQUEST: {
    eventKey: 'NEW_SERVICE_REQUEST',
    eventLabel: 'New 3D Printing Service Request',
    category: 'service',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  SERVICE_STATUS_UPDATED: {
    eventKey: 'SERVICE_STATUS_UPDATED',
    eventLabel: 'Service Request Status Updated',
    category: 'service',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  QUOTE_ACCEPTED: {
    eventKey: 'QUOTE_ACCEPTED',
    eventLabel: 'Customer Accepted Service Quote',
    category: 'service',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  QUOTE_REJECTED: {
    eventKey: 'QUOTE_REJECTED',
    eventLabel: 'Customer Rejected Service Quote',
    category: 'service',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  NEW_CUSTOMER_REGISTRATION: {
    eventKey: 'NEW_CUSTOMER_REGISTRATION',
    eventLabel: 'New Customer Registration',
    category: 'customers',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  NEW_PRODUCT_REVIEW: {
    eventKey: 'NEW_PRODUCT_REVIEW',
    eventLabel: 'New Product Review Submitted',
    category: 'reviews',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  CONTACT_FORM_SUBMITTED: {
    eventKey: 'CONTACT_FORM_SUBMITTED',
    eventLabel: 'Contact Form Submission',
    category: 'marketing',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  CALLBACK_REQUEST: {
    eventKey: 'CALLBACK_REQUEST',
    eventLabel: 'Customer Requested Callback',
    category: 'marketing',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  CART_ABANDONMENT: {
    eventKey: 'CART_ABANDONMENT',
    eventLabel: 'High-Value Cart Abandonment Alert',
    category: 'marketing',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  WISHLIST_ACTIVITY: {
    eventKey: 'WISHLIST_ACTIVITY',
    eventLabel: 'Customer Wishlist Saved Activity',
    category: 'marketing',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  LOW_STOCK_ALERT: {
    eventKey: 'LOW_STOCK_ALERT',
    eventLabel: 'Inventory Low Stock Alert',
    category: 'inventory',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  OUT_OF_STOCK_ALERT: {
    eventKey: 'OUT_OF_STOCK_ALERT',
    eventLabel: 'Inventory Out of Stock Alert',
    category: 'inventory',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  PAYMENT_RECEIVED: {
    eventKey: 'PAYMENT_RECEIVED',
    eventLabel: 'Payment Received Successfully',
    category: 'payments',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  PAYMENT_FAILED: {
    eventKey: 'PAYMENT_FAILED',
    eventLabel: 'Customer Payment Attempt Failed',
    category: 'payments',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  REFUND_REQUEST: {
    eventKey: 'REFUND_REQUEST',
    eventLabel: 'Customer Requested Order Refund',
    category: 'payments',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  ORDER_CANCELLED: {
    eventKey: 'ORDER_CANCELLED',
    eventLabel: 'Order Cancelled',
    category: 'orders',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  RETURN_REQUEST: {
    eventKey: 'RETURN_REQUEST',
    eventLabel: 'Customer Requested Item Return',
    category: 'orders',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  FAILED_NOTIFICATION: {
    eventKey: 'FAILED_NOTIFICATION',
    eventLabel: 'System Notification Dispatch Failed',
    category: 'system',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  FAILED_BACKGROUND_JOB: {
    eventKey: 'FAILED_BACKGROUND_JOB',
    eventLabel: 'Background Worker Job Failed',
    category: 'system',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
  SYSTEM_ALERT: {
    eventKey: 'SYSTEM_ALERT',
    eventLabel: 'Critical System Security Alert',
    category: 'system',
    defaultPush: true,
    defaultWhatsapp: false,
    defaultEmail: false,
  },
};

export class NotificationService {
  /**
   * Main Centralized Event Dispatcher
   */
  static async dispatch(payload: NotificationPayload): Promise<{
    success: boolean;
    pushSent: boolean;
    whatsappSent: boolean;
    notificationId?: string;
  }> {
    try {
      const def = EVENT_DEFINITIONS[payload.eventKey];
      if (!def) {
        console.warn(`[NotificationService] Unknown eventKey: ${payload.eventKey}`);
        return { success: false, pushSent: false, whatsappSent: false };
      }

      // 1. Resolve Configured Notification Channels for Event
      const channels = await this.resolveChannels(payload.eventKey);

      let pushSent = false;
      let whatsappSent = false;

      // 2. Dispatch FCM Push Notifications to Active Admin Devices
      if (channels.pushEnabled) {
        pushSent = await this.dispatchFcmPush(payload, def.category);
      }

      // 3. Dispatch WhatsApp Notification (STRICT RULE: ONLY FOR NEW_ORDER)
      if (channels.whatsappEnabled && payload.eventKey === 'NEW_ORDER') {
        whatsappSent = await this.dispatchWhatsApp(payload);
      }

      // 4. Save to Admin Notification Center (PostgreSQL)
      const notif = await prisma.adminNotification.create({
        data: {
          eventKey: payload.eventKey,
          category: def.category,
          title: payload.title,
          body: payload.body,
          deepLink: payload.deepLink || `/admin/${def.category}`,
          metadata: payload.metadata || {},
          isRead: false,
        },
      });

      // Sync legacy adminNotificationLogs.json for backwards compatibility
      this.syncLegacyJsonLog(notif);

      // 5. Log delivery results
      await this.logNotificationResult(payload, pushSent, whatsappSent);

      return {
        success: true,
        pushSent,
        whatsappSent,
        notificationId: notif.id,
      };
    } catch (err: any) {
      console.error(`[NotificationService] Error dispatching event ${payload.eventKey}:`, err);
      return { success: false, pushSent: false, whatsappSent: false };
    }
  }

  /**
   * Resolve Channel Configuration Matrix with DB overrides and Strict Non-Order WhatsApp Suppression
   */
  static async resolveChannels(eventKey: NotificationEventKey): Promise<{
    pushEnabled: boolean;
    whatsappEnabled: boolean;
    emailEnabled: boolean;
  }> {
    const def = EVENT_DEFINITIONS[eventKey];
    let pushEnabled = def.defaultPush;
    let whatsappEnabled = def.defaultWhatsapp;
    let emailEnabled = def.defaultEmail;

    try {
      const dbSetting = await prisma.notificationChannelSetting.findUnique({
        where: { eventKey },
        select: {
          id: true,
          eventKey: true,
          pushEnabled: true,
          whatsappEnabled: true,
          emailEnabled: true,
        }
      });

      if (dbSetting) {
        pushEnabled = dbSetting.pushEnabled;
        whatsappEnabled = dbSetting.whatsappEnabled;
        emailEnabled = dbSetting.emailEnabled;
      }
    } catch (e) {
      console.warn('[NotificationService] Failed to load channel setting from DB, using default:', e);
    }

    // STRICT BUSINESS RULE: ONLY NEW_ORDER can EVER trigger WhatsApp!
    if (eventKey !== 'NEW_ORDER') {
      whatsappEnabled = false;
    }

    return { pushEnabled, whatsappEnabled, emailEnabled };
  }

  private static adminFcmTokenTableExists: boolean | null = null;
  private static adminDevTableExists: boolean | null = null;

  private static async checkFcmTokenTableExists(): Promise<boolean> {
    if (this.adminFcmTokenTableExists !== null) return this.adminFcmTokenTableExists;
    try {
      const res: any = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'admin_fcm_tokens'
        ) as "exists";
      `;
      this.adminFcmTokenTableExists = Boolean(res && res[0] && res[0].exists);
    } catch (e) {
      this.adminFcmTokenTableExists = false;
    }
    return this.adminFcmTokenTableExists;
  }

  private static async checkDevTableExists(): Promise<boolean> {
    if (this.adminDevTableExists !== null) return this.adminDevTableExists;
    try {
      const res: any = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'admin_notification_devices'
        ) as "exists";
      `;
      this.adminDevTableExists = Boolean(res && res[0] && res[0].exists);
    } catch (e) {
      this.adminDevTableExists = false;
    }
    return this.adminDevTableExists;
  }

  /**
   * Multicast Dispatch FCM Push Notification to Active Admin Devices
   */
  private static async dispatchFcmPush(payload: NotificationPayload, category: NotificationCategory): Promise<boolean> {
    try {
      let dbTokens: string[] = [];
      try {
        const canFetchFcmToken = await this.checkFcmTokenTableExists();
        const canFetchDev = await this.checkDevTableExists();

        const fetchDev1 = async (): Promise<any[]> => {
          if (!canFetchFcmToken) return [];
          try {
            if ((prisma as any).adminFcmToken?.findMany) {
              return await (prisma as any).adminFcmToken.findMany({
                where: { isActive: true },
                select: { fcmToken: true },
              });
            }
          } catch (e: any) {}
          return [];
        };

        const fetchDev2 = async (): Promise<any[]> => {
          if (!canFetchDev) return [];
          try {
            if ((prisma as any).adminNotificationDevice?.findMany) {
              return await (prisma as any).adminNotificationDevice.findMany({
                where: { isActive: true },
                select: { fcmToken: true },
              });
            }
          } catch (e: any) {}
          return [];
        };

        const [dev1, dev2] = await Promise.all([fetchDev1(), fetchDev2()]);
        dbTokens = [
          ...(dev1 || []).map((d: any) => d.fcmToken),
          ...(dev2 || []).map((d: any) => d.fcmToken),
        ];
      } catch (e) {}

      // Also gather tokens from fallback legacy JSON file if any
      const legacyTokens = this.getLegacyDeviceTokens();
      const allTokens = Array.from(
        new Set([...dbTokens, ...legacyTokens].filter(Boolean))
      );

      if (allTokens.length === 0) {
        console.log(`[NotificationService] No active FCM devices for push alert "${payload.title}"`);
        return false;
      }

      const fbAdmin = getFirebaseAdmin();
      if (!fbAdmin.apps.length) return false;

      const targetLink = payload.deepLink || `/admin/${category}`;
      let totalSuccess = 0;
      let totalFailure = 0;
      const invalidTokens: string[] = [];

      // Chunk requests if token count exceeds 500
      const BATCH_SIZE = 500;
      for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
        const batch = allTokens.slice(i, i + BATCH_SIZE);
        const fcmMessage = {
          tokens: batch,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: {
            type: category,
            eventKey: payload.eventKey,
            deepLink: targetLink,
            click_action: targetLink,
            title: payload.title,
            body: payload.body,
            ...(payload.metadata
              ? Object.fromEntries(
                  Object.entries(payload.metadata).map(([k, v]) => [k, String(v)])
                )
              : {}),
          },
          webpush: {
            fcmOptions: {
              link: targetLink,
            },
            notification: {
              title: payload.title,
              body: payload.body,
              icon: '/assets/icons/icon-192x192.png',
              badge: '/assets/icons/badge-72x72.png',
            },
          },
        };

        const response = await fbAdmin.messaging().sendEachForMulticast(fcmMessage);
        totalSuccess += response.successCount;
        totalFailure += response.failureCount;

        if (response.failureCount > 0) {
          response.responses.forEach((res, idx) => {
            if (!res.success && res.error) {
              const errCode = res.error.code;
              if (
                errCode === 'messaging/invalid-registration-token' ||
                errCode === 'messaging/registration-token-not-registered'
              ) {
                invalidTokens.push(batch[idx]);
              }
            }
          });
        }
      }

      console.log(`[NotificationService] FCM Push multicast sent: ${totalSuccess} succeeded, ${totalFailure} failed.`);

      // Clean up invalid FCM tokens automatically
      if (invalidTokens.length > 0) {
        const canUpdateFcmToken = await this.checkFcmTokenTableExists();
        const canUpdateDev = await this.checkDevTableExists();

        if (canUpdateFcmToken) {
          try {
            if ((prisma as any).adminFcmToken?.updateMany) {
              await (prisma as any).adminFcmToken.updateMany({
                where: { fcmToken: { in: invalidTokens } },
                data: { isActive: false },
              });
            }
          } catch (e: any) {}
        }

        if (canUpdateDev) {
          try {
            if ((prisma as any).adminNotificationDevice?.updateMany) {
              await (prisma as any).adminNotificationDevice.updateMany({
                where: { fcmToken: { in: invalidTokens } },
                data: { isActive: false },
              });
            }
          } catch (e: any) {}
        }
      }

      return totalSuccess > 0;
    } catch (err: any) {
      console.error('[NotificationService] FCM Push Dispatch Error:', err.message || err);
      return false;
    }
  }

  /**
   * Dispatch WhatsApp Notification (STRICT: ONLY FOR NEW_ORDER)
   */
  private static async dispatchWhatsApp(payload: NotificationPayload): Promise<boolean> {
    try {
      if (payload.eventKey !== 'NEW_ORDER') {
        console.warn(`[NotificationService] Suppressed WhatsApp attempt for non-order event ${payload.eventKey}`);
        return false;
      }

      if (payload.order) {
        const res = await WhatsAppNotificationService.sendAdminOrderNotification(payload.order);
        return res.success;
      }

      const settings = await getSettingsService();
      const whatsappSettings = settings?.whatsappSettings || {};
      const adminPhone = whatsappSettings.adminPhoneNumber || settings.adminPhoneNumber || settings.contact?.phone;

      if (!adminPhone || adminPhone === '9999999999') {
        console.log('[NotificationService] No valid admin phone configured for WhatsApp dispatch');
        return false;
      }

      await triggerWhatsAppNotification(
        'new_order',
        adminPhone,
        payload.order || null,
        null,
        payload.metadata || {}
      );

      console.log(`[NotificationService] Admin WhatsApp notification dispatched for New Order to ${adminPhone}`);
      return true;
    } catch (err: any) {
      console.error('[NotificationService] WhatsApp Dispatch Error:', err.message || err);
      return false;
    }
  }

  /**
   * Helper to sync entries with legacy adminNotificationLogs.json
   */
  private static syncLegacyJsonLog(notif: any) {
    try {
      const dataDir = path.resolve(__dirname, '../../data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const logFile = path.join(dataDir, 'adminNotificationLogs.json');

      let logs: any[] = [];
      if (fs.existsSync(logFile)) {
        try {
          logs = JSON.parse(fs.readFileSync(logFile, 'utf-8') || '[]');
        } catch {
          logs = [];
        }
      }

      logs.unshift({
        id: notif.id,
        title: notif.title,
        body: notif.body,
        type: notif.category,
        eventKey: notif.eventKey,
        deepLink: notif.deepLink,
        data: notif.metadata,
        sentAt: notif.createdAt,
        isRead: false,
      });

      if (logs.length > 200) logs = logs.slice(0, 200);
      fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[NotificationService] Sync legacy JSON log error:', e);
    }
  }

  /**
   * Helper to fetch tokens from legacy adminDevices.json
   */
  private static getLegacyDeviceTokens(): string[] {
    try {
      const devicesFile = path.resolve(__dirname, '../../data/adminDevices.json');
      if (fs.existsSync(devicesFile)) {
        const data = JSON.parse(fs.readFileSync(devicesFile, 'utf-8') || '[]');
        return data.filter((d: any) => d.isActive).map((d: any) => d.fcmToken);
      }
    } catch {}
    return [];
  }

  /**
   * Log Notification Result in NotificationLog database table
   */
  private static async logNotificationResult(
    payload: NotificationPayload,
    pushSent: boolean,
    whatsappSent: boolean
  ) {
    try {
      await prisma.notificationLog.create({
        data: {
          title: payload.title,
          body: payload.body,
          type: payload.eventKey,
          actionUrl: payload.deepLink || null,
          status: pushSent || whatsappSent ? 'SENT' : 'FAILED',
          deliveryStatus: `Push: ${pushSent ? 'SUCCESS' : 'SKIPPED/FAILED'}, WhatsApp: ${whatsappSent ? 'SUCCESS' : 'SKIPPED/DISABLED'}`,
          payload: payload.metadata || {},
        },
      });
    } catch (e) {
      console.warn('[NotificationService] NotificationLog write error:', e);
    }
  }
}
