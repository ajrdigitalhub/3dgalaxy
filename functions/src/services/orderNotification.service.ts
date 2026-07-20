import prisma from "../config/database";
import { triggerWhatsAppNotification, getWhatsappSettings } from "../controllers/whatsapp";
import { dispatchAdminPushNotification } from "../controllers/adminFcm";

export interface NotificationResult {
  customerWhatsApp: boolean;
  adminWhatsApp: boolean;
  adminPush: boolean;
  logs: string[];
}

/**
 * End-to-End Centralized Order Notification Pipeline
 * Dispatches Customer WhatsApp, Admin WhatsApp, and Admin FCM Push Notifications.
 */
export async function dispatchOrderNotifications(orderId: string): Promise<NotificationResult> {
  const result: NotificationResult = {
    customerWhatsApp: false,
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

    // Customer Name Resolution
    const customerObj = order.customer;
    const custName =
      order.customerName ||
      (customerObj?.user
        ? `${customerObj.user.firstName || ''} ${customerObj.user.lastName || ''}`.trim()
        : 'Customer');

    // Customer Phone Resolution
    let custPhone = customerObj?.phone || customerObj?.user?.phone || '';
    if (!custPhone && order.shippingAddress) {
      const addrObj = typeof order.shippingAddress === 'string'
        ? (function() { try { return JSON.parse(order.shippingAddress as any); } catch { return {}; } })()
        : order.shippingAddress;
      custPhone = addrObj?.phone || addrObj?.contactNumber || '';
    }

    // 1. CUSTOMER WHATSAPP NOTIFICATION
    if (custPhone && custPhone.trim().length >= 8) {
      try {
        console.log(`[OrderNotificationPipeline] Sending Customer WhatsApp to ${custPhone}...`);
        await triggerWhatsAppNotification('order_placed', custPhone, order, customerObj);
        result.customerWhatsApp = true;
        result.logs.push(`Customer WhatsApp dispatched to ${custPhone}`);
      } catch (waErr: any) {
        console.error(`[OrderNotificationPipeline] Customer WhatsApp error:`, waErr);
        result.logs.push(`Customer WhatsApp failed: ${waErr.message}`);
      }
    } else {
      console.warn(`[OrderNotificationPipeline] No valid customer phone number found for order ${order.orderNumber}`);
      result.logs.push(`No customer phone number available.`);
    }

    // 2. ADMIN WHATSAPP NOTIFICATION
    try {
      const settings = await getWhatsappSettings();
      const adminPhonesRaw = settings.adminPhoneNumber || process.env.ADMIN_WHATSAPP_PHONE || '';
      if (adminPhonesRaw && adminPhonesRaw.trim().length > 0) {
        const phoneList = adminPhonesRaw.split(',').map((p: string) => p.trim()).filter(Boolean);
        for (const adminPhone of phoneList) {
          console.log(`[OrderNotificationPipeline] Sending Admin WhatsApp to ${adminPhone}...`);
          await triggerWhatsAppNotification('admin_new_order', adminPhone, order, customerObj, { is_admin: true });
        }
        result.adminWhatsApp = true;
        result.logs.push(`Admin WhatsApp dispatched to ${phoneList.length} phone(s)`);
      } else {
        result.logs.push(`No admin phone number configured in WhatsApp settings.`);
      }
    } catch (adminWaErr: any) {
      console.error(`[OrderNotificationPipeline] Admin WhatsApp error:`, adminWaErr);
      result.logs.push(`Admin WhatsApp failed: ${adminWaErr.message}`);
    }

    // 3. ADMIN PUSH (FCM) MULTICAST NOTIFICATION
    try {
      const pushTitle = `🛒 New Order #${order.orderNumber || order.id}`;
      const pushBody = `${custName} placed order #${order.orderNumber || order.id} (₹${Number(order.totalAmount).toFixed(2)})`;
      
      console.log(`[OrderNotificationPipeline] Sending Admin FCM Push Notification...`);
      const pushRes = await dispatchAdminPushNotification({
        title: pushTitle,
        body: pushBody,
        type: 'order',
        orderId: order.id,
        deepLink: `/admin/orders`,
        data: {
          orderNumber: order.orderNumber,
          totalAmount: String(order.totalAmount),
          customerName: custName,
        },
      });

      result.adminPush = pushRes.success;
      result.logs.push(`Admin FCM Push dispatched (${pushRes.successCount || 0} succeeded, ${pushRes.failureCount || 0} failed)`);
    } catch (fcmErr: any) {
      console.error(`[OrderNotificationPipeline] Admin FCM Push error:`, fcmErr);
      result.logs.push(`Admin Push failed: ${fcmErr.message}`);
    }

    console.log(`======================================================`);
    console.log(`[OrderNotificationPipeline Summary] Order ${order.orderNumber}:`);
    console.log(`  - Customer WhatsApp: ${result.customerWhatsApp ? '✅ SENT' : '❌ SKIPPED/FAILED'}`);
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
