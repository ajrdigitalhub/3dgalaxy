import prisma from "../config/database";
import { triggerWhatsAppNotification, getWhatsappSettings } from "../controllers/whatsapp";
import { NotificationService } from "./notification.service";
import { WhatsAppNotificationService } from "./whatsappNotificationService";
import { NotificationTemplateResolver } from "./notificationTemplateResolver";
import { getFirebaseAdmin } from "../config/firebase";
import {
  getAppEnv,
  getAppOrigin,
  getFirebaseProjectId,
  isFcmNotificationsEnabled,
} from "../config/notificationEnv";
import { NotificationDiagnostics } from "./notificationDiagnostics.service";

export interface NotificationResult {
  customerWhatsApp: boolean;
  customerPush?: boolean;
  adminWhatsApp: boolean;
  adminPush: boolean;
  logs: string[];
}

/**
 * End-to-End Centralized Order Notification Pipeline
 * Dispatches Customer WhatsApp, Customer FCM Push, Admin WhatsApp, and Admin FCM Push Notifications.
 */
export async function dispatchOrderNotifications(orderId: string): Promise<NotificationResult> {
  const result: NotificationResult = {
    customerWhatsApp: false,
    customerPush: false,
    adminWhatsApp: false,
    adminPush: false,
    logs: [],
  };

  try {
    console.log(`\n======================================================`);
    console.log(`[OrderNotificationPipeline] Starting Pipeline for Order: ${orderId}`);
    console.log(`======================================================`);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { include: { user: true } },
        items: { include: { product: true, variant: true } },
        shippingAddress: true,
      },
    });

    if (!order) {
      const msg = `[OrderNotificationPipeline] Order ${orderId} not found in database. Skipping notifications.`;
      console.warn(msg);
      result.logs.push(msg);
      return result;
    }

    // Cast to any for flexible field access across different order shapes
    const orderAny = order as any;

    let shipmentObj: any = null;
    if (order.shipment) {
      if (typeof order.shipment === 'string') {
        try { shipmentObj = JSON.parse(order.shipment); } catch (e) {}
      } else if (typeof order.shipment === 'object') {
        shipmentObj = order.shipment;
      }
    }

    // Customer Name & Phone Resolution
    const customerObj = order.customer;
    let custName = shipmentObj?.contactDetails?.name || shipmentObj?.customerName || orderAny.customerName || '';
    if (!custName && customerObj?.user) {
      custName = `${customerObj.user.firstName || ''} ${customerObj.user.lastName || ''}`.trim();
    }
    if (!custName && customerObj) {
      custName = `${(customerObj as any).firstName || ''} ${(customerObj as any).lastName || ''}`.trim();
    }

    // Prioritize contactDetails snapshot from checkout session / shipment, then direct order fields, then customerObj
    let custPhone = shipmentObj?.contactDetails?.phone ||
      shipmentObj?.customerPhone ||
      shipmentObj?.phone ||
      orderAny.customerPhone ||
      orderAny.guestPhone ||
      orderAny.phone ||
      orderAny.mobile ||
      customerObj?.phone ||
      customerObj?.user?.mobile ||
      '';

    if (order.shippingAddress) {
      let addrObj: any = order.shippingAddress;
      if (typeof addrObj === 'string' && addrObj.trim().startsWith('{')) {
        try { addrObj = JSON.parse(addrObj); } catch (e) {}
      }

      if (addrObj && typeof addrObj === 'object') {
        if (!custPhone) {
          custPhone = addrObj.phone || addrObj.mobile || addrObj.contactNumber || addrObj.phoneNumber || '';
        }
        if (addrObj.addressLine1 && typeof addrObj.addressLine1 === 'string' && addrObj.addressLine1.includes('|')) {
          const parts = addrObj.addressLine1.split('|').map((p: string) => p.trim());
          if (parts.length >= 2 && /^\+?\d{8,15}$/.test(parts[1].replace(/[\s-]/g, ''))) {
            if (!custPhone) {
              custPhone = parts[1];
            }
          }
          if (!custName && parts[0]) {
            custName = parts[0];
          }
        }
      }
    }

    if (!custName) custName = 'Customer';

    // 1. CUSTOMER WHATSAPP NOTIFICATION (INTELLIGENT ROUTING: COD vs PREPAID)
    if (custPhone && custPhone.trim().length >= 8) {
      try {
        console.log(`[OrderNotificationPipeline] Sending Customer Order Confirmation WhatsApp to ${custPhone}...`);
        const custRes = await WhatsAppNotificationService.sendOrderConfirmation(order, { recipientNumber: custPhone, customerName: custName });
        result.customerWhatsApp = custRes.success;
        result.logs.push(`Customer WhatsApp Order Confirmation: ${custRes.success ? 'SENT' : 'FAILED (' + custRes.error + ')'}`);
      } catch (waErr: any) {
        console.error(`[OrderNotificationPipeline] Customer WhatsApp error:`, waErr);
        result.logs.push(`Customer WhatsApp failed: ${waErr.message}`);
      }
    } else {
      console.warn(`[OrderNotificationPipeline] No valid customer phone number found for order ${order.orderNumber}`);
      result.logs.push(`No customer phone number available.`);
    }

    // 2. CUSTOMER FCM PUSH NOTIFICATION (ENVIRONMENT & DOMAIN ISOLATED)
    const customerUserId = orderAny.userId || order.customer?.userId || (order.customer as any)?.user?.id || null;
    if (customerUserId && isFcmNotificationsEnabled()) {
      try {
        const custTokens = await NotificationService.getCustomerFcmTokens(customerUserId);
        if (custTokens.length > 0) {
          const pushTitle = 'Order Confirmed! 🛒';
          const pushBody = `Thank you for your order #${order.orderNumber || order.id}. We're preparing it for dispatch.`;
          const deepLink = `/orders/${order.id}`;
          const currentEnv = getAppEnv();

          const fbAdmin = getFirebaseAdmin();
          if (fbAdmin.apps.length) {
            const pushPayload = {
              tokens: custTokens,
              notification: { title: pushTitle, body: pushBody },
              data: {
                type: 'orders',
                eventKey: 'NEW_ORDER',
                deepLink,
                click_action: deepLink,
                orderId: order.id,
                orderNumber: String(order.orderNumber || order.id),
                title: pushTitle,
                body: pushBody,
                environment: currentEnv,
                appOrigin: getAppOrigin(),
                firebaseProjectId: getFirebaseProjectId(),
              },
              webpush: {
                fcmOptions: { link: deepLink },
                notification: {
                  title: pushTitle,
                  body: pushBody,
                  icon: '/assets/icons/icon-192x192.png',
                  badge: '/assets/icons/badge-72x72.png',
                },
              },
            };

            const pushRes = await fbAdmin.messaging().sendEachForMulticast(pushPayload);
            result.customerPush = pushRes.successCount > 0;
            result.logs.push(`Customer Push Notification: ${result.customerPush ? 'SENT (' + pushRes.successCount + ' devices)' : 'FAILED'}`);

            const invalidTokens: string[] = [];
            if (pushRes.failureCount > 0) {
              pushRes.responses.forEach((resp, idx) => {
                if (!resp.success && resp.error) {
                  const errCode = resp.error.code;
                  if (
                    errCode === 'messaging/invalid-registration-token' ||
                    errCode === 'messaging/registration-token-not-registered'
                  ) {
                    invalidTokens.push(custTokens[idx]);
                  }
                }
              });
            }

            if (invalidTokens.length > 0) {
              try {
                await (prisma.notificationDevice as any).updateMany({
                  where: { fcmToken: { in: invalidTokens } },
                  data: { notificationEnabled: false, tokenStatus: 'INVALID' },
                });
              } catch {}
            }

            await NotificationDiagnostics.recordAttempt({
              category: 'orders',
              eventKey: 'NEW_ORDER',
              recipientType: 'CUSTOMER',
              eligibleTokenCount: custTokens.length,
              environment: currentEnv,
              success: result.customerPush,
              title: pushTitle,
              bodySnippet: pushBody,
            });

            for (const token of custTokens) {
              await prisma.notificationLog.create({
                data: {
                  title: pushTitle,
                  body: pushBody,
                  type: 'ORDER_CUSTOMER_PUSH',
                  actionUrl: deepLink,
                  sentTo: token,
                  status: result.customerPush ? 'SENT' : 'FAILED',
                  deliveryStatus: `Success: ${pushRes.successCount}, Failed: ${pushRes.failureCount}`,
                  payload: pushPayload as any,
                },
              });
            }
          }
        } else {
          result.logs.push('Customer has no registered active FCM push devices for current environment.');
        }
      } catch (custPushErr: any) {
        console.error('[OrderNotificationPipeline] Customer FCM Push error:', custPushErr);
        result.logs.push(`Customer Push failed: ${custPushErr.message}`);
      }
    }

    // 3 & 4. CENTRALIZED ADMIN ROUTING (FCM Push & WhatsApp order_confirmation_admin to all active admins)
    try {
      const isCod = NotificationTemplateResolver.isCodPayment(order.paymentMethod);
      const pushTitle = `🛒 Order Confirmed`;
      const paymentNote = isCod ? 'Payment Pending (COD)' : 'Payment Received';
      const pushBody = `${custName} placed Order #${order.orderNumber || order.id} for ₹${Number(order.totalAmount).toFixed(2)}. ${paymentNote}`;

      const dispatchResult = await NotificationService.dispatch({
        eventKey: 'NEW_ORDER',
        title: pushTitle,
        body: pushBody,
        deepLink: `/admin/orders`,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalAmount: String(order.totalAmount),
          customerName: custName,
          paymentMethod: order.paymentMethod || (isCod ? 'Cash on Delivery' : 'Online'),
          paymentStatus: isCod ? 'Pending (COD)' : 'Paid',
        },
        order,
      });

      // Dispatch Order Notification to all Active Admin WhatsApp Numbers
      const adminWaResult = await WhatsAppNotificationService.sendAdminOrderNotification(order);

      result.adminWhatsApp = adminWaResult.success;
      result.adminPush = dispatchResult.pushSent;
      result.logs.push(`Admin Central Dispatch: Push ${dispatchResult.pushSent ? 'SENT' : 'SKIPPED'}, WhatsApp ${adminWaResult.success ? 'SENT (' + adminWaResult.dispatchedCount + ' admins)' : 'SKIPPED/FAILED'}`);
    } catch (adminErr: any) {
      console.error(`[OrderNotificationPipeline] Admin Central Dispatch error:`, adminErr);
      result.logs.push(`Admin Dispatch failed: ${adminErr.message}`);
    }

    console.log(`======================================================`);
    console.log(`[OrderNotificationPipeline Summary] Order ${order.orderNumber}:`);
    console.log(`  - Customer WhatsApp: ${result.customerWhatsApp ? '✅ SENT' : '❌ SKIPPED/FAILED'}`);
    console.log(`  - Customer FCM Push: ${result.customerPush ? '✅ SENT' : '❌ SKIPPED/FAILED'}`);
    console.log(`  - Admin WhatsApp:    ${result.adminWhatsApp ? '✅ SENT' : '❌ SKIPPED/FAILED'}`);
    console.log(`  - Admin FCM Push:    ${result.adminPush ? '✅ SENT' : '❌ SKIPPED/FAILED'}`);
    console.log(`======================================================\n`);

    return result;
  } catch (globalErr: any) {
    console.error(`[OrderNotificationPipeline CRITICAL ERROR] Order ID ${orderId}:`, globalErr);
    result.logs.push(`Critical failure: ${globalErr.message}`);
    return result;
  }
}
