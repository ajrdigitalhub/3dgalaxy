import prisma from "../config/database";
import { triggerWhatsAppNotification, getWhatsappSettings } from "../controllers/whatsapp";
import { NotificationService } from "./notification.service";
import { WhatsAppNotificationService } from "./whatsappNotificationService";

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

    // Cast to any for flexible field access across different order shapes
    const orderAny = order as any;

    // Customer Name & Phone Resolution
    const customerObj = order.customer;
    let custName = orderAny.customerName || '';
    if (!custName && customerObj?.user) {
      custName = `${customerObj.user.firstName || ''} ${customerObj.user.lastName || ''}`.trim();
    }

    let custPhone = customerObj?.phone || customerObj?.user?.mobile || orderAny.customerPhone || orderAny.mobile || orderAny.phone || '';

    if (order.shippingAddress) {
      let addrObj: any = order.shippingAddress;
      if (typeof addrObj === 'string' && addrObj.trim().startsWith('{')) {
        try { addrObj = JSON.parse(addrObj); } catch (e) {}
      }

      if (addrObj && typeof addrObj === 'object') {
        if (!custPhone) {
          custPhone = addrObj.phone || addrObj.mobile || addrObj.contactNumber || addrObj.phoneNumber || '';
        }
        if (!custPhone && addrObj.addressLine1 && typeof addrObj.addressLine1 === 'string' && addrObj.addressLine1.includes('|')) {
          const parts = addrObj.addressLine1.split('|').map((p: string) => p.trim());
          if (parts.length >= 2 && /^\+?\d{8,15}$/.test(parts[1].replace(/[\s-]/g, ''))) {
            custPhone = parts[1];
          }
          if (!custName && parts[0]) {
            custName = parts[0];
          }
        }
      }
    }

    if (!custName) custName = 'Customer';

    // 1. CUSTOMER WHATSAPP NOTIFICATION
    if (custPhone && custPhone.trim().length >= 8) {
      try {
        console.log(`[OrderNotificationPipeline] Sending Customer WhatsApp (order_confirmation_client_3dgal with PDF) to ${custPhone}...`);
        const custRes = await WhatsAppNotificationService.sendOrderConfirmation(order, { recipientNumber: custPhone, customerName: custName });
        result.customerWhatsApp = custRes.success;
        result.logs.push(`Customer WhatsApp (order_confirmation_client_3dgal): ${custRes.success ? 'SENT' : 'FAILED (' + custRes.error + ')'}`);
      } catch (waErr: any) {
        console.error(`[OrderNotificationPipeline] Customer WhatsApp error:`, waErr);
        result.logs.push(`Customer WhatsApp failed: ${waErr.message}`);
      }
    } else {
      console.warn(`[OrderNotificationPipeline] No valid customer phone number found for order ${order.orderNumber}`);
      result.logs.push(`No customer phone number available.`);
    }

    // 2 & 3. CENTRALIZED ADMIN ROUTING (FCM Push & WhatsApp order_confirmation_admin_3dgal to all active admins)
    try {
      const pushTitle = `🛒 New Order Received`;
      const pushBody = `${custName} placed Order #${order.orderNumber || order.id} for ₹${Number(order.totalAmount).toFixed(2)}`;

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
          paymentMethod: order.paymentMethod || 'Online',
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
