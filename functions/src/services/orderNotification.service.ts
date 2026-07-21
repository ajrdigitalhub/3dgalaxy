import prisma from "../config/database";
import { triggerWhatsAppNotification, getWhatsappSettings } from "../controllers/whatsapp";
import { NotificationService } from "./notification.service";

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

    // Customer Name Resolution
    const customerObj = order.customer;
    const custName =
      (orderAny.customerName) ||
      (customerObj?.user
        ? `${customerObj.user.firstName || ''} ${customerObj.user.lastName || ''}`.trim()
        : 'Customer');

    // Customer Phone Resolution
    let custPhone = customerObj?.phone || customerObj?.user?.mobile || '';
    if (!custPhone && order.shippingAddress) {
      const addrObj = typeof order.shippingAddress === 'string'
        ? (function() { try { return JSON.parse(order.shippingAddress as any); } catch { return {}; } })()
        : (order.shippingAddress as any);
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

    // 2 & 3. CENTRALIZED ADMIN ROUTING (FCM Push & WhatsApp Restricted to New Order)
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

      result.adminWhatsApp = dispatchResult.whatsappSent;
      result.adminPush = dispatchResult.pushSent;
      result.logs.push(`Admin Central Dispatch: Push ${dispatchResult.pushSent ? 'SENT' : 'SKIPPED'}, WhatsApp ${dispatchResult.whatsappSent ? 'SENT' : 'SKIPPED'}`);
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
