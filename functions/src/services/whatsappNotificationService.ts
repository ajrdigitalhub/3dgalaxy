import prisma from '../config/database';
import { getSettingsService } from '../modules/settings/settings.service';
import { sanitizeTemplateParam, sanitizeComponents } from '../utils/whatsappSanitizer';
import { NotificationTemplateResolver } from './notificationTemplateResolver';
import { TrackingService } from './tracking.service';

export interface StatusContent {
  currentStatus: string;
  statusDescription: string;
  additionalInformation: string;
}

export class WhatsAppNotificationService {
  /**
   * Helper to format recipient mobile number into E.164 without '+' for Meta API
   */
  private static formatPhoneNumber(phone: string, defaultCountryCode: string = '+91'): string {
    let clean = (phone || '').replace(/[^\d+]/g, '');
    if (!clean.startsWith('+')) {
      const code = defaultCountryCode.replace(/[^\d+]/g, '') || '+91';
      clean = `${code}${clean}`;
    }
    // Remove the leading '+' for Meta WhatsApp API payload recipient
    return clean.replace('+', '');
  }

  /**
   * Helper to check if a string is a valid UUID
   */
  private static isValidUuid(uuid?: string | null): boolean {
    if (!uuid || typeof uuid !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
  }

  /**
   * Helper to extract valid customer mobile phone from order object, relations, or extraParams
   */
  public static extractCustomerPhone(order: any, extraParams: any = {}): string {
    if (extraParams?.recipientNumber && String(extraParams.recipientNumber).trim().length >= 8) {
      return String(extraParams.recipientNumber).trim();
    }

    const orderAny = (order as any) || {};
    let phone =
      order?.customer?.phone ||
      order?.customer?.user?.mobile ||
      order?.customerUserPhone ||
      orderAny?.customerPhone ||
      orderAny?.mobile ||
      orderAny?.phone ||
      '';

    if (!phone && order?.shippingAddress) {
      let addr: any = order.shippingAddress;
      if (typeof addr === 'string' && addr.trim().startsWith('{')) {
        try { addr = JSON.parse(addr); } catch { }
      }

      if (addr && typeof addr === 'object') {
        phone = addr.phone || addr.mobile || addr.contactNumber || addr.phoneNumber || '';

        if (!phone && addr.addressLine1 && typeof addr.addressLine1 === 'string' && addr.addressLine1.includes('|')) {
          const parts = addr.addressLine1.split('|').map((p: string) => p.trim());
          for (const part of parts) {
            const cleanPart = part.replace(/[^\d+]/g, '');
            if (cleanPart.length >= 8 && cleanPart.length <= 15) {
              phone = part;
              break;
            }
          }
        }
      }
    }

    return phone ? String(phone).trim() : '';
  }

  /**
   * Helper to extract valid customer full name from order object, relations, or extraParams
   */
  public static extractCustomerName(order: any, extraParams: any = {}): string {
    const isCleanName = (val: any): boolean => {
      if (!val || typeof val !== 'string') return false;
      const str = val.trim();
      if (!str) return false;
      const lower = str.toLowerCase();
      return lower !== 'undefined' && lower !== 'null' && lower !== 'undefined undefined' && lower !== 'null null' && lower !== '[object object]';
    };

    if (extraParams && isCleanName(extraParams.customerName)) {
      return extraParams.customerName.trim();
    }

    if (order) {
      if (isCleanName(order.customerName)) return order.customerName.trim();
      if (isCleanName(order.guestName)) return order.guestName.trim();

      // Shipping Address fullName / name / combined
      if (order.shippingAddress) {
        let addr: any = order.shippingAddress;
        if (typeof addr === 'string' && addr.trim().startsWith('{')) {
          try { addr = JSON.parse(addr); } catch { }
        }
        if (addr && typeof addr === 'object') {
          if (isCleanName(addr.fullName)) return addr.fullName.trim();
          if (isCleanName(addr.name)) return addr.name.trim();
          const combined = `${addr.firstName || ''} ${addr.lastName || ''}`.trim();
          if (isCleanName(combined)) return combined;
        }
      }

      // Billing Address fullName / name / combined
      if (order.billingAddress) {
        let addr: any = order.billingAddress;
        if (typeof addr === 'string' && addr.trim().startsWith('{')) {
          try { addr = JSON.parse(addr); } catch { }
        }
        if (addr && typeof addr === 'object') {
          if (isCleanName(addr.fullName)) return addr.fullName.trim();
          if (isCleanName(addr.name)) return addr.name.trim();
          const combined = `${addr.firstName || ''} ${addr.lastName || ''}`.trim();
          if (isCleanName(combined)) return combined;
        }
      }

      // Order User
      if (order.user) {
        const combined = `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim();
        if (isCleanName(combined)) return combined;
        if (isCleanName(order.user.name)) return order.user.name.trim();
      }

      // Customer relation
      if (order.customer) {
        if (order.customer.user) {
          const combined = `${order.customer.user.firstName || ''} ${order.customer.user.lastName || ''}`.trim();
          if (isCleanName(combined)) return combined;
          if (isCleanName(order.customer.user.name)) return order.customer.user.name.trim();
        }
        const combinedCust = `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim();
        if (isCleanName(combinedCust)) return combinedCust;
        if (isCleanName(order.customer.name)) return order.customer.name.trim();
      }
    }

    return 'Valued Customer';
  }

  /**
   * Generate dynamic content for Current Status ({{3}}), Status Description ({{4}}), and Additional Info ({{5}})
   */
  public static generateStatusContent(
    statusKey: string,
    order: any = null,
    extraParams: any = {},
    siteName: string = '3D Galaxy'
  ): StatusContent {
    const rawKey = String(statusKey || '').toLowerCase().replace(/[\s_-]+/g, '');

    let currentStatus = 'Order Status Updated';
    let statusDescription = 'Your order status has been updated.';
    let additionalInformation = `Thank you for shopping with ${siteName}. Our support team is always here to help.`;

    switch (rawKey) {
      case 'orderconfirmed':
      case 'confirmed':
      case 'pending':
      case 'placed':
        currentStatus = 'Order Confirmed';
        statusDescription = 'Your order has been confirmed successfully and is now queued for processing by our warehouse team.';
        additionalInformation = [
          '• Your order has been received successfully.',
          '• Our team will begin preparing your items shortly.',
          '• You will receive another update once your order has been packed.'
        ].join(' | ');
        break;

      case 'processing':
      case 'inprogress':
        currentStatus = 'Processing';
        statusDescription = 'Your order is currently being processed and undergoing quality verification before packing.';
        additionalInformation = [
          '• Our warehouse team is preparing your order.',
          '• Every product is being quality checked before dispatch.',
          "• We'll notify you once your package has been packed."
        ].join(' | ');
        break;

      case 'packed':
      case 'packing':
      case 'readyfordispatch':
        currentStatus = 'Packed';
        statusDescription = 'Great news! Your order has been securely packed and is ready for dispatch.';
        additionalInformation = [
          '• Your package has been packed securely.',
          '• It is waiting for pickup by our delivery partner.',
          '• Shipping details will be shared once dispatched.'
        ].join(' | ');
        break;

      case 'shipped':
      case 'dispatched':
      case 'intransit':
        currentStatus = 'Shipped';
        statusDescription = 'Your order has been shipped and is on its way to your delivery address.';
        {
          const courierName = order?.courier || order?.shipmentCarrier || extraParams.courierName || extraParams.courier;
          const trackingNumber = order?.trackingNumber || extraParams.trackingNumber || extraParams.tracking_number;
          const trackingUrl = order?.trackingUrl || extraParams.trackingUrl || extraParams.tracking_url;
          const estimatedDeliveryDate = order?.estimatedDelivery
            ? new Date(order.estimatedDelivery).toLocaleDateString('en-IN')
            : (extraParams.estimatedDeliveryDate || extraParams.estimatedDelivery || extraParams.expectedDelivery);

          const shippedLines: string[] = [];
          if (courierName && courierName !== 'N/A') shippedLines.push(`🚚 Courier Partner: ${courierName}`);
          if (trackingNumber && trackingNumber !== 'N/A') shippedLines.push(`📦 Tracking Number: ${trackingNumber}`);
          if (trackingUrl && trackingUrl !== 'N/A') shippedLines.push(`🔗 Track Shipment: ${trackingUrl}`);
          if (estimatedDeliveryDate && estimatedDeliveryDate !== 'N/A') shippedLines.push(`📅 Estimated Delivery: ${estimatedDeliveryDate}`);

          if (shippedLines.length > 0) {
            additionalInformation = shippedLines.join(' | ');
          } else {
            additionalInformation = [
              '• Your shipment is on its way to your delivery address.',
              '• Live tracking details will be updated shortly.'
            ].join(' | ');
          }
        }
        break;

      case 'outfordelivery':
      case 'outfordelivered':
      case 'dispatch':
        currentStatus = 'Out for Delivery';
        statusDescription = 'Your order is out for delivery and should arrive today.';
        additionalInformation = [
          '• Please keep your mobile phone available.',
          '• Our delivery partner may contact you before delivery.',
          '• Kindly keep any required OTP ready if applicable.'
        ].join(' | ');
        break;

      case 'delivered':
      case 'completed':
        currentStatus = 'Delivered';
        statusDescription = 'Your order has been delivered successfully.';
        additionalInformation = [
          '• We hope you enjoy your purchase.',
          '• Thank you for shopping with us.',
          "• We'd love to hear your feedback.",
          '• Please consider leaving a product review.'
        ].join(' | ');
        break;

      case 'cancelled':
      case 'canceled':
        currentStatus = 'Cancelled';
        statusDescription = 'Your order has been cancelled successfully.';
        {
          const cancelReason = order?.cancellationReason || extraParams.cancellationReason || extraParams.cancelReason || 'Customer Request';
          const paymentMethod = String(order?.paymentMethod || extraParams.paymentMethod || '').toLowerCase();
          const isCOD = paymentMethod === 'cod' || paymentMethod === 'cash_on_delivery';

          const cancelLines: string[] = [`Cancellation Reason: ${cancelReason}`];
          if (!isCOD) {
            cancelLines.push('• If payment was completed, your refund will be initiated according to our refund policy.');
          }
          additionalInformation = cancelLines.join(' | ');
        }
        break;

      case 'refundinitiated':
      case 'refundapproved':
        currentStatus = 'Refund Initiated';
        statusDescription = 'Your refund request has been approved and the refund process has started.';
        {
          const refundAmount = extraParams.refundAmount || order?.totalAmount || 0;
          const refundReference = extraParams.refundReference || extraParams.refundRef || order?.paymentId || `REF-${Date.now()}`;
          additionalInformation = [
            `Refund Amount: ₹${refundAmount}`,
            `Refund Reference: ${refundReference}`,
            'Expected Credit: 3–7 Business Days'
          ].join(' | ');
        }
        break;

      case 'refundcompleted':
      case 'refunded':
        currentStatus = 'Refund Completed';
        statusDescription = 'Your refund has been processed successfully.';
        {
          const refundAmount = extraParams.refundAmount || order?.totalAmount || 0;
          const refundReference = extraParams.refundReference || extraParams.refundRef || order?.paymentId || `REF-${Date.now()}`;
          additionalInformation = [
            `Refund Amount: ₹${refundAmount}`,
            `Refund Reference: ${refundReference}`,
            '• The amount should reflect in your original payment method based on your bank\'s processing time.'
          ].join(' | ');
        }
        break;

      case 'returnrequested':
        currentStatus = 'Return Requested';
        statusDescription = 'Your return request has been received successfully.';
        additionalInformation = '• Our support team will review your request shortly and arrange the next steps.';
        break;

      case 'returnapproved':
        currentStatus = 'Return Approved';
        statusDescription = 'Your return request has been approved.';
        additionalInformation = '• Our logistics partner will contact you to schedule the pickup.';
        break;

      case 'returncompleted':
      case 'returned':
        currentStatus = 'Return Completed';
        statusDescription = 'We have successfully received your returned product.';
        additionalInformation = '• Your refund or replacement process will continue according to your selected resolution.';
        break;

      default:
        // Future status fallback generator
        currentStatus = statusKey.split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        statusDescription = `Your order status has been updated to ${currentStatus}.`;
        additionalInformation = `Thank you for shopping with ${siteName}. Our support team is always here to help.`;
        break;
    }

    return {
      currentStatus: sanitizeTemplateParam(currentStatus, 'Order Status Updated'),
      statusDescription: sanitizeTemplateParam(statusDescription, 'Order status updated'),
      additionalInformation: sanitizeTemplateParam(additionalInformation, 'Thank you for shopping with 3D Galaxy.')
    };
  }

  /**
   * Centralized method to send Order Status WhatsApp Notification using template order_status_update_3dgal
   */
  public static async sendOrderStatusNotification(
    order: any,
    extraParams: any = {}
  ): Promise<{ success: boolean; logId?: string; messageId?: string; error?: string }> {
    try {
      const settingsObj = await getSettingsService();
      const whatsappSettings = settingsObj?.whatsappSettings || {};

      // Site defaults
      const siteName = settingsObj?.storeName || whatsappSettings?.storeName || '3D Galaxy';
      const siteUrl = extraParams?.origin || process.env.APP_URL || 'https://3dgalaxy.co.in';

      // Status key
      const statusKey = extraParams?.statusKey || order?.status || 'Order Confirmed';

      // Dynamic content generator
      const content = this.generateStatusContent(statusKey, order, extraParams, siteName);

      // Recipient mobile number
      const rawPhone = this.extractCustomerPhone(order, extraParams);

      if (!rawPhone) {
        console.warn(`[WhatsAppNotificationService] No recipient phone for order ${order?.id || 'N/A'}`);
        return { success: false, error: 'Recipient phone number is missing' };
      }

      const formattedPhone = this.formatPhoneNumber(rawPhone, whatsappSettings?.defaultCountryCode || '+91');

      // Extract Customer Name
      let customerName = extraParams?.customerName || order?.customerName;
      if (!customerName && order?.customer) {
        customerName = [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ');
      }
      if (!customerName && order?.shippingAddress) {
        let addr = order.shippingAddress;
        if (typeof addr === 'string') {
          try { addr = JSON.parse(addr); } catch { }
        }
        customerName = addr?.name;
      }
      customerName = customerName || 'Customer';

      const orderId = order?.orderNumber || order?.id || extraParams?.orderId || 'N/A';
      const orderLink = extraParams?.orderLink || `${siteUrl}/account/orders`;

      // Approved single template name strictly set to order_status_update_3dgal
      const templateName = 'order_status_update';

      // Deduplication check: prevent duplicate notifications within 2 minutes for same status
      if (order?.id) {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const existingLog = await prisma.whatsappLog.findFirst({
          where: {
            orderId: order.id,
            templateName: templateName,
            status: 'Sent',
            createdAt: { gte: twoMinutesAgo }
          }
        });

        if (existingLog) {
          const reqPayload = existingLog.requestPayload as any;
          if (reqPayload?.statusKey === statusKey || reqPayload?.currentStatus === content.currentStatus) {
            console.log(`[WhatsAppNotificationService] Duplicate suppressed for order ${order.id} status: ${statusKey}`);
            return { success: true, logId: existingLog.id, messageId: existingLog.messageId || 'duplicate_suppressed' };
          }
        }
      }

      // Build 8 Template Parameters for order_status_update_3dgal:
      // {{1}} customerName, {{2}} orderId, {{3}} currentStatus, {{4}} statusDescription, {{5}} additionalInformation, {{6}} siteName, {{7}} siteName, {{8}} orderLink
      const components = sanitizeComponents([
        {
          type: 'body',
          parameters: [
            { type: 'text', text: sanitizeTemplateParam(customerName, 'Customer') },
            { type: 'text', text: sanitizeTemplateParam(orderId, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(content.currentStatus, 'Order Update') },
            { type: 'text', text: sanitizeTemplateParam(content.statusDescription, 'Order status updated') },
            { type: 'text', text: sanitizeTemplateParam(content.additionalInformation, 'Thank you for shopping with 3D Galaxy') },
            { type: 'text', text: sanitizeTemplateParam(siteName, '3D Galaxy') },
            { type: 'text', text: sanitizeTemplateParam(siteName, '3D Galaxy') },
            { type: 'text', text: sanitizeTemplateParam(orderLink, 'https://3dgalaxy.co.in') }
          ]
        }
      ]);

      const requestPayload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: components
        },
        statusKey: statusKey,
        currentStatus: content.currentStatus
      };

      // Create WhatsApp Log entry in database
      const log = await prisma.whatsappLog.create({
        data: {
          customerId: order?.customerId || null,
          orderId: order?.id || null,
          phone: formattedPhone,
          templateName: templateName,
          templateLanguage: 'en',
          messageType: 'transactional',
          provider: 'meta',
          status: 'Pending',
          requestPayload: requestPayload as any,
          retryCount: 0
        }
      });

      // API credentials
      const apiUrl = whatsappSettings.apiUrl || `https://graph.facebook.com/v19.0/${whatsappSettings.phoneNumberId}/messages`;
      const accessToken = whatsappSettings.apiKey || whatsappSettings.accessToken;

      if (!whatsappSettings.enabled || !whatsappSettings.apiEnabled || !accessToken) {
        // Simulated Sandbox dispatch
        await prisma.whatsappLog.update({
          where: { id: log.id },
          data: {
            status: 'Sent',
            responsePayload: { simulated: true, note: 'Sandbox dispatch. Configure Meta WhatsApp credentials for live dispatch.' },
            messageId: 'sim_' + Math.random().toString(36).substring(7)
          }
        });

        return { success: true, logId: log.id, messageId: 'simulated' };
      }

      // Dispatch to Meta WhatsApp Cloud API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestPayload)
      });

      const resData = (await response.json()) as any;

      if (response.ok) {
        const messageId = resData?.messages?.[0]?.id || null;
        await prisma.whatsappLog.update({
          where: { id: log.id },
          data: {
            status: 'Sent',
            responsePayload: resData,
            messageId: messageId
          }
        });
        return { success: true, logId: log.id, messageId: messageId || undefined };
      } else {
        const errMsg = resData?.error?.message || 'Meta WhatsApp API request failed';
        await prisma.whatsappLog.update({
          where: { id: log.id },
          data: {
            status: 'Failed',
            errorMessage: errMsg,
            responsePayload: resData
          }
        });
        return { success: false, logId: log.id, error: errMsg };
      }

    } catch (err: any) {
      console.error('[WhatsAppNotificationService] Error sending status notification:', err);
      return { success: false, error: err.message || 'Internal notification error' };
    }
  }

  /**
   * Format product list for order_confirmation_admin_3dgal (Variable {{9}})
   */
  public static formatProductList(order: any): string {
    const items = order?.items || [];
    if (!items || items.length === 0) {
      return '• Order Items';
    }
    const listStr = items.map((item: any) => {
      const prodName = item.product?.name || item.name || 'Product';
      const variantName = item.variantName || item.variant?.name;
      const variant = variantName ? ` (${variantName})` : '';
      const qty = item.quantity || 1;
      return `• ${prodName}${variant} × ${qty}`;
    }).join(', ');
    return sanitizeTemplateParam(listStr, '• Order Items');
  }

  /**
   * Format readable shipping address for order_confirmation_admin_3dgal (Variable {{10}})
   */
  public static formatShippingAddress(order: any, fallbackName: string = 'Customer'): string {
    let addr = order?.shippingAddress;
    if (typeof addr === 'string') {
      try { addr = JSON.parse(addr); } catch { addr = null; }
    }

    if (!addr) {
      return sanitizeTemplateParam(`${fallbackName}, Address details available in Admin Portal`);
    }

    const name = addr.name || addr.fullName || fallbackName;
    const line1 = addr.addressLine1 || addr.address || '';
    const line2 = addr.addressLine2 || '';
    const landmark = addr.landmark ? `Near ${addr.landmark}` : '';
    const cityPincode = [addr.city, addr.pincode || addr.postalCode || addr.zipCode].filter(Boolean).join(' - ');
    const state = addr.state || '';
    const country = addr.country || 'India';
    const phone = addr.phone || addr.contactNumber ? `Mobile: ${addr.phone || addr.contactNumber}` : '';

    const lines = [name, line1, line2, landmark, cityPincode, state, country, phone].filter(l => l && String(l).trim().length > 0);
    return sanitizeTemplateParam(lines.join(', '), `${fallbackName}, Address details in Admin`);
  }

  /**
   * Fetch all registered active admin WhatsApp numbers from Database and Config
   */
  public static async getAdminRecipients(whatsappSettings: any): Promise<{ phone: string; adminId?: string; adminName?: string }[]> {
    const recipientsMap = new Map<string, { phone: string; adminId?: string; adminName?: string }>();

    // 1. Add Configured Admin Phones from whatsappSettings (Primary)
    const configPhone = whatsappSettings?.adminPhoneNumber;
    if (configPhone && typeof configPhone === 'string' && configPhone.trim().length >= 8) {
      const formatted = this.formatPhoneNumber(configPhone, whatsappSettings?.defaultCountryCode || '+91');
      recipientsMap.set(formatted, { phone: formatted, adminName: 'Store Admin' });
    }

    const configPhoneList = whatsappSettings?.adminPhoneNumbers;
    if (Array.isArray(configPhoneList)) {
      for (const num of configPhoneList) {
        if (num && typeof num === 'string' && num.trim().length >= 8) {
          const formatted = this.formatPhoneNumber(num, whatsappSettings?.defaultCountryCode || '+91');
          if (!recipientsMap.has(formatted)) {
            recipientsMap.set(formatted, { phone: formatted, adminName: 'Store Admin' });
          }
        }
      }
    }

    // 2. Query Active Admin Users from Database if no explicit settings admin phone is set
    if (recipientsMap.size === 0) {
      try {
        const adminUsers = await prisma.user.findMany({
          where: {
            isActive: true,
            deletedAt: null,
            mobile: { not: null },
            roles: {
              some: {
                role: {
                  name: {
                    in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'Super Admin', 'Admin', 'Manager', 'Staff'],
                    mode: 'insensitive'
                  }
                }
              }
            }
          },
          select: { id: true, mobile: true, firstName: true, lastName: true }
        });

        for (const u of adminUsers) {
          if (u.mobile && u.mobile.trim().length >= 8) {
            const formatted = this.formatPhoneNumber(u.mobile, whatsappSettings?.defaultCountryCode || '+91');
            if (!recipientsMap.has(formatted)) {
              recipientsMap.set(formatted, {
                phone: formatted,
                adminId: u.id,
                adminName: [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Admin'
              });
            }
          }
        }
      } catch (err) {
        console.warn('[WhatsAppNotificationService] Could not query admin users from DB:', err);
      }
    }

    return Array.from(recipientsMap.values());
  }

  /**
   * Centralized method to send Admin Order WhatsApp Notification using template order_confirmation_admin_3dgal
   */
  public static async sendAdminOrderNotification(
    order: any,
    extraParams: any = {}
  ): Promise<{ success: boolean; dispatchedCount: number; logs: any[]; error?: string }> {
    try {
      const settingsObj = await getSettingsService();
      const whatsappSettings = settingsObj?.whatsappSettings || {};

      const siteName = settingsObj?.storeName || whatsappSettings?.storeName || '3D Galaxy';
      const adminBaseUrl = extraParams?.adminUrl || process.env.ADMIN_APP_URL || 'https://admin.3dgalaxy.in';

      const orderId = order?.orderNumber || order?.id || 'N/A';
      const orderUrl = `${adminBaseUrl}/orders/${order?.id || orderId}`;

      // Customer Details
      let customerName = extraParams?.customerName || order?.customerName;
      if (!customerName && order?.customer) {
        customerName = [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ');
      }
      if (!customerName && order?.shippingAddress) {
        let addr = order.shippingAddress;
        if (typeof addr === 'string') { try { addr = JSON.parse(addr); } catch { } }
        customerName = addr?.name;
      }
      customerName = customerName || 'Valued Customer';

      let rawMobile = order?.customer?.phone || order?.customer?.mobile;
      if (!rawMobile && order?.shippingAddress) {
        let addr = order.shippingAddress;
        if (typeof addr === 'string') { try { addr = JSON.parse(addr); } catch { } }
        rawMobile = addr?.phone;
      }
      const mobileNumber = rawMobile ? this.formatPhoneNumber(rawMobile, whatsappSettings?.defaultCountryCode || '+91') : 'N/A';
      const emailId = order?.customer?.email || order?.customer?.user?.email || order?.shippingAddress?.email || 'N/A';

      // Amount (without duplicate currency symbol as template contains ₹{{6}})
      const orderAmountStr = Number(order?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // City Extraction
      let city = extraParams?.city;
      if (!city && order?.shippingAddress) {
        let addr = order.shippingAddress;
        if (typeof addr === 'string') { try { addr = JSON.parse(addr); } catch { } }
        city = addr?.city;
      }
      if (!city && order?.billingAddress) {
        let addr = order.billingAddress;
        if (typeof addr === 'string') { try { addr = JSON.parse(addr); } catch { } }
        city = addr?.city;
      }
      city = city || 'N/A';

      // Payment Details
      const rawMethod = String(order?.paymentMethod || extraParams?.paymentMethod || '').toLowerCase();
      const isCOD = rawMethod === 'cod' || rawMethod === 'cash_on_delivery';
      const isPaid = !!order?.paymentId || order?.paymentStatus === 'PAID' || order?.paymentStatus === 'Paid';

      let paymentMethod = 'Online Payment';
      if (isCOD) paymentMethod = 'Cash on Delivery (COD)';
      else if (rawMethod.includes('razorpay')) paymentMethod = 'Online Payment (Razorpay)';
      else if (rawMethod.includes('stripe')) paymentMethod = 'Online Payment (Stripe)';
      else if (rawMethod.includes('upi')) paymentMethod = 'UPI Payment';

      const paymentStatus = isPaid ? 'Paid' : (isCOD ? 'Pending (COD)' : 'Pending');

      // Product List
      const productList = this.formatProductList(order);

      // Admin Portal Link
      const adminPortalUrl = orderUrl;

      // Template Name
      const templateName = whatsappSettings.orderConfirmationAdminTemplateName || 'order_confirmation_admin';
      const languageCode = whatsappSettings.languageCode || whatsappSettings.templateLanguage || 'en';

      // Admin Recipients
      const adminRecipients = await this.getAdminRecipients(whatsappSettings);
      if (adminRecipients.length === 0) {
        console.warn(`[WhatsAppNotificationService] No active admin WhatsApp numbers found.`);
        return { success: false, dispatchedCount: 0, logs: [], error: 'No active admin WhatsApp numbers configured' };
      }

      // Parameters for order_confirmation_admin (10 variables)
      // {{1}} orderId, {{2}} customerName, {{3}} mobile, {{4}} email, {{5}} city, {{6}} orderAmount, {{7}} paymentMethod, {{8}} paymentStatus, {{9}} products, {{10}} adminPortalUrl
      const components = sanitizeComponents([
        {
          type: 'body',
          parameters: [
            { type: 'text', text: sanitizeTemplateParam(orderId, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(customerName, 'Customer') },
            { type: 'text', text: sanitizeTemplateParam(mobileNumber, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(emailId, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(city, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(orderAmountStr, '0.00') },
            { type: 'text', text: sanitizeTemplateParam(paymentMethod, 'Online Payment') },
            { type: 'text', text: sanitizeTemplateParam(paymentStatus, 'Pending') },
            { type: 'text', text: sanitizeTemplateParam(productList, '• Order Items') },
            { type: 'text', text: sanitizeTemplateParam(adminPortalUrl, 'https://admin.3dgalaxy.in') }
          ]
        }
      ]);

      const logs: any[] = [];
      let dispatchedCount = 0;

      for (const admin of adminRecipients) {
        // Deduplication check per admin phone within 2 minutes
        if (order?.id) {
          const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
          const existingLog = await prisma.whatsappLog.findFirst({
            where: {
              orderId: order.id,
              phone: admin.phone,
              templateName: templateName,
              status: 'Sent',
              createdAt: { gte: twoMinutesAgo }
            }
          });

          if (existingLog) {
            console.log(`[WhatsAppNotificationService] Admin notification suppressed for order ${order.id} to ${admin.phone}`);
            logs.push({ phone: admin.phone, status: 'Suppressed (Duplicate)' });
            continue;
          }
        }

        const requestPayload = {
          messaging_product: 'whatsapp',
          to: admin.phone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components
          },
          orderId: order?.id,
          recipientRole: 'ADMIN'
        };

        const log = await prisma.whatsappLog.create({
          data: {
            customerId: admin.adminId || null,
            orderId: order?.id || null,
            phone: admin.phone,
            templateName: templateName,
            templateLanguage: 'en',
            messageType: 'admin_notification',
            provider: 'meta',
            status: 'Pending',
            requestPayload: requestPayload as any,
            retryCount: 0
          }
        });

        const apiUrl = whatsappSettings.apiUrl || `https://graph.facebook.com/v19.0/${whatsappSettings.phoneNumberId}/messages`;
        const accessToken = whatsappSettings.apiKey || whatsappSettings.accessToken;

        if (!whatsappSettings.enabled || !whatsappSettings.apiEnabled || !accessToken) {
          await prisma.whatsappLog.update({
            where: { id: log.id },
            data: {
              status: 'Sent',
              responsePayload: { simulated: true, note: 'Sandbox admin dispatch.' },
              messageId: 'sim_admin_' + Math.random().toString(36).substring(7)
            }
          });
          dispatchedCount++;
          logs.push({ phone: admin.phone, status: 'Sent (Simulated)', logId: log.id });
          continue;
        }

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(requestPayload)
          });

          const resData = (await response.json()) as any;

          if (response.ok) {
            const messageId = resData?.messages?.[0]?.id || null;
            await prisma.whatsappLog.update({
              where: { id: log.id },
              data: {
                status: 'Sent',
                responsePayload: resData,
                messageId: messageId
              }
            });
            dispatchedCount++;
            logs.push({ phone: admin.phone, status: 'Sent', messageId, logId: log.id });
          } else {
            const errMsg = resData?.error?.message || 'Meta WhatsApp API admin request failed';
            await prisma.whatsappLog.update({
              where: { id: log.id },
              data: {
                status: 'Failed',
                errorMessage: errMsg,
                responsePayload: resData
              }
            });
            logs.push({ phone: admin.phone, status: 'Failed', error: errMsg, logId: log.id });
          }
        } catch (err: any) {
          await prisma.whatsappLog.update({
            where: { id: log.id },
            data: {
              status: 'Failed',
              errorMessage: err.message || 'Network error'
            }
          });
          logs.push({ phone: admin.phone, status: 'Failed', error: err.message, logId: log.id });
        }
      }

      return { success: dispatchedCount > 0, dispatchedCount, logs };
    } catch (err: any) {
      console.error('[WhatsAppNotificationService] Error in sendAdminOrderNotification:', err);
      return { success: false, dispatchedCount: 0, logs: [], error: err.message };
    }
  }

  /**
   * Centralized method to send Customer Order Confirmation WhatsApp Notification (Intelligent COD vs Prepaid Routing)
   */
  public static async sendOrderConfirmation(
    order: any,
    extraParams: any = {}
  ): Promise<{ success: boolean; logId?: string; messageId?: string; error?: string }> {
    try {
      const settingsObj = await getSettingsService();
      const whatsappSettings = settingsObj?.whatsappSettings || {};

      // 1. Resolve template selection, payment type (COD vs PREPAID), and 8 dynamic variables
      const resolved = await NotificationTemplateResolver.resolveOrderConfirmationTemplate(order, whatsappSettings, extraParams);

      if (!resolved.shouldSend) {
        console.log(`[WhatsAppNotificationService] Order confirmation suppressed for order ${order?.id || 'N/A'} (resolved type: ${resolved.type})`);
        return { success: true, messageId: 'order_confirmation_suppressed' };
      }

      // Phone Details
      const rawPhone = this.extractCustomerPhone(order, extraParams);

      if (!rawPhone) {
        console.warn(`[WhatsAppNotificationService] No recipient phone for customer order confirmation ${resolved.variables.orderId}`);
        return { success: false, error: 'Recipient phone number is missing' };
      }

      const formattedPhone = this.formatPhoneNumber(rawPhone, whatsappSettings?.defaultCountryCode || '+91');
      const templateName = resolved.templateName;
      const languageCode = whatsappSettings.languageCode || whatsappSettings.templateLanguage || 'en';

      // Deduplication Check (2 minutes)
      if (order?.id) {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const existingLog = await prisma.whatsappLog.findFirst({
          where: {
            orderId: order.id,
            phone: formattedPhone,
            templateName: templateName,
            status: 'Sent',
            createdAt: { gte: twoMinutesAgo }
          }
        });

        if (existingLog) {
          console.log(`[WhatsAppNotificationService] Order confirmation suppressed for order ${order.id} to ${formattedPhone}`);
          return { success: true, logId: existingLog.id, messageId: existingLog.messageId || 'duplicate_suppressed' };
        }
      }

      // 2. Build 8 Body Component Variables for COD/Prepaid templates:
      // {{1}} customerName, {{2}} orderId, {{3}} orderAmount, {{4}} paymentMethod, {{5}} paymentStatus, {{6}} estimatedDeliveryDate, {{7}} orderUrl, {{8}} siteName
      const vars = resolved.variables;
      let components: any[] = [];

      if (templateName.includes('cod') || templateName.includes('paid') || templateName.includes('prepaid')) {
        components = sanitizeComponents([
          {
            type: 'body',
            parameters: [
              { type: 'text', text: sanitizeTemplateParam(vars.customerName, 'Customer') },
              { type: 'text', text: sanitizeTemplateParam(vars.orderId, 'N/A') },
              { type: 'text', text: sanitizeTemplateParam(vars.orderAmount, '0.00') },
              { type: 'text', text: sanitizeTemplateParam(vars.paymentMethod, 'Online Payment') },
              { type: 'text', text: sanitizeTemplateParam(vars.paymentStatus, 'Pending') },
              { type: 'text', text: sanitizeTemplateParam(vars.estimatedDeliveryDate, '3-5 Business Days') },
              { type: 'text', text: sanitizeTemplateParam(vars.orderUrl, 'https://3dgalaxy.co.in/account/orders') },
              { type: 'text', text: sanitizeTemplateParam(vars.siteName, '3D Galaxy') }
            ]
          }
        ]);
      } else {
        // Fallback for legacy order_confirmation_client_3dgal template (8 variables):
        // {{1}} customerName, {{2}} siteName, {{3}} orderId, {{4}} orderAmount, {{5}} paymentMethod, {{6}} paymentStatus, {{7}} orderUrl, {{8}} siteName
        components = sanitizeComponents([
          {
            type: 'body',
            parameters: [
              { type: 'text', text: sanitizeTemplateParam(vars.customerName, 'Customer') },
              { type: 'text', text: sanitizeTemplateParam(vars.siteName, '3D Galaxy') },
              { type: 'text', text: sanitizeTemplateParam(vars.orderId, 'N/A') },
              { type: 'text', text: sanitizeTemplateParam(`₹${vars.orderAmount}`, '₹0.00') },
              { type: 'text', text: sanitizeTemplateParam(vars.paymentMethod, 'Online Payment') },
              { type: 'text', text: sanitizeTemplateParam(vars.paymentStatus, 'Pending') },
              { type: 'text', text: sanitizeTemplateParam(vars.orderUrl, 'https://3dgalaxy.co.in/account/orders') },
              { type: 'text', text: sanitizeTemplateParam(vars.siteName, '3D Galaxy') }
            ]
          }
        ]);
      }

      const requestPayload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: components
        },
        orderId: order?.id
      };

      const log = await prisma.whatsappLog.create({
        data: {
          customerId: order?.customerId || null,
          orderId: order?.id || null,
          phone: formattedPhone,
          templateName: templateName,
          templateLanguage: 'en',
          messageType: 'order_confirmation',
          provider: 'meta',
          status: 'Pending',
          requestPayload: requestPayload as any,
          retryCount: 0
        }
      });

      const apiUrl = whatsappSettings.apiUrl || `https://graph.facebook.com/v19.0/${whatsappSettings.phoneNumberId}/messages`;
      const accessToken = whatsappSettings.apiKey || whatsappSettings.accessToken;

      if (!whatsappSettings.enabled || !whatsappSettings.apiEnabled || !accessToken) {
        await prisma.whatsappLog.update({
          where: { id: log.id },
          data: {
            status: 'Sent',
            responsePayload: { simulated: true, note: 'Sandbox customer confirmation dispatch with PDF attachment.' },
            messageId: 'sim_conf_' + Math.random().toString(36).substring(7)
          }
        });
        return { success: true, logId: log.id, messageId: 'simulated' };
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestPayload)
      });

      const resData = (await response.json()) as any;

      if (response.ok) {
        const messageId = resData?.messages?.[0]?.id || null;
        await prisma.whatsappLog.update({
          where: { id: log.id },
          data: {
            status: 'Sent',
            responsePayload: resData,
            messageId: messageId
          }
        });
        return { success: true, logId: log.id, messageId: messageId || undefined };
      } else {
        const errMsg = resData?.error?.message || 'Meta WhatsApp API customer order confirmation failed';
        await prisma.whatsappLog.update({
          where: { id: log.id },
          data: {
            status: 'Failed',
            errorMessage: errMsg,
            responsePayload: resData
          }
        });

        if (resData?.error?.code === 132001) {
          console.warn(`[WhatsAppNotificationService] Template ${templateName} not found in Meta (${errMsg}). Falling back to order_status_update_3dgal...`);
          return this.sendOrderStatusNotification(order, { ...extraParams, recipientNumber: formattedPhone, statusKey: 'Order Confirmed' });
        }

        return { success: false, logId: log.id, error: errMsg };
      }
    } catch (err: any) {
      console.error('[WhatsAppNotificationService] Error in sendOrderConfirmation:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Centralized method to send Order Shipped WhatsApp Notification using template order_shipped (11 Variables)
   */
  public static async sendOrderShippedNotification(
    order: any,
    shipmentDataToSave?: any,
    extraParams: any = {}
  ): Promise<{ success: boolean; logId?: string; messageId?: string; error?: string }> {
    try {
      const settingsObj = await getSettingsService();
      const whatsappSettings = settingsObj?.whatsappSettings || {};

      const siteName = settingsObj?.storeName || whatsappSettings?.storeName || '3D Galaxy';
      const siteUrl = extraParams?.origin || whatsappSettings?.siteUrl || process.env.APP_URL || 'https://3dgalaxy.co.in';

      // Recipient mobile number check
      const rawPhone = this.extractCustomerPhone(order, extraParams);
      if (!rawPhone) {
        console.warn(`[WhatsAppNotificationService] Missing customer phone number for order_shipped notification (Order ID: ${order?.orderNumber || order?.id || 'N/A'})`);
        return { success: false, error: 'Recipient phone number is missing' };
      }

      const formattedPhone = this.formatPhoneNumber(rawPhone, whatsappSettings?.defaultCountryCode || '+91');

      // 1. {{1}} customerName
      const customerName = this.extractCustomerName(order, extraParams);

      // 2. {{2}} orderId (public display number)
      const orderId = String(order?.orderNumber || order?.id || extraParams?.orderId || 'N/A');

      // 3. {{3}} orderAmount
      const orderAmountStr = Number(order?.totalAmount || extraParams?.orderAmount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      // 4. {{4}} paymentMethod
      const rawMethod = String(order?.paymentMethod || extraParams?.paymentMethod || '').toLowerCase();
      const isCOD = rawMethod === 'cod' || rawMethod === 'cash_on_delivery';
      let paymentMethod = 'Online Payment';
      if (isCOD) paymentMethod = 'Cash on Delivery (COD)';
      else if (rawMethod.includes('razorpay')) paymentMethod = 'Online Payment (Razorpay)';
      else if (rawMethod.includes('stripe')) paymentMethod = 'Online Payment (Stripe)';
      else if (rawMethod.includes('upi')) paymentMethod = 'UPI Payment';
      else if (rawMethod.includes('prepaid')) paymentMethod = 'Prepaid Online Payment';
      else if (order?.paymentMethod) paymentMethod = String(order.paymentMethod);

      // 5. {{5}} paymentStatus
      const isPaid = !!order?.paymentId || order?.paymentStatus === 'PAID' || order?.paymentStatus === 'Paid' || order?.payment?.status === 'PAID';
      const paymentStatus = isPaid ? 'PAID' : (isCOD ? 'PENDING (COD)' : 'PENDING');

      // 6. {{6}} orderStatus
      const orderStatus = 'SHIPPED';

      // 7. {{7}} courierPartner
      const courierPartner = shipmentDataToSave?.courierDisplayName ||
        shipmentDataToSave?.courierPartner ||
        order?.courier ||
        order?.shipmentCarrier ||
        extraParams?.courierName ||
        extraParams?.courierPartner ||
        'Standard Delivery';

      // 8. {{8}} trackingNumber
      const trackingNumber = shipmentDataToSave?.trackingNumber ||
        shipmentDataToSave?.awbNumber ||
        order?.trackingNumber ||
        extraParams?.trackingNumber ||
        extraParams?.awbNumber ||
        'N/A';

      // 9. {{9}} estimatedDate
      let estimatedDate = shipmentDataToSave?.estimatedDelivery ||
        extraParams?.estimatedDeliveryDate ||
        extraParams?.estimatedDelivery ||
        order?.estimatedDelivery ||
        '3-5 Business Days';

      if (estimatedDate instanceof Date) {
        estimatedDate = estimatedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }

      // 10. {{10}} trackingUrl
      let trackingUrl = shipmentDataToSave?.trackingUrl ||
        extraParams?.trackingUrl ||
        order?.trackingUrl ||
        '';

      if (!trackingUrl && courierPartner && trackingNumber && trackingNumber !== 'N/A') {
        trackingUrl = TrackingService.generateTrackingUrl(courierPartner, trackingNumber);
      }
      if (!trackingUrl || trackingUrl === 'N/A') {
        trackingUrl = `${siteUrl}/order-tracking?id=${orderId}`;
      }

      // 11. {{11}} orderLink
      const orderLink = `https://3dgalaxy.co.in/account/orders/${orderId}`;

      // Configurable template name (default: order_shipped)
      const templateName = whatsappSettings.orderShippedTemplateName || 'order_shipped';
      const languageCode = whatsappSettings.languageCode || whatsappSettings.templateLanguage || 'en';

      const validOrderId = this.isValidUuid(order?.id) ? order.id : null;
      const validCustomerId = this.isValidUuid(order?.customerId) ? order.customerId : null;

      // Deduplication check: prevent duplicate order_shipped notifications within 5 minutes for same order
      if (validOrderId) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existingLog = await prisma.whatsappLog.findFirst({
          where: {
            orderId: validOrderId,
            templateName: templateName,
            status: 'Sent',
            createdAt: { gte: fiveMinutesAgo }
          }
        });

        if (existingLog) {
          console.log(`[WhatsAppNotificationService] Duplicate order_shipped notification suppressed for order ${order.id} to ${formattedPhone}`);
          return { success: true, logId: existingLog.id, messageId: existingLog.messageId || 'duplicate_suppressed' };
        }
      }

      // Build 11 Component Parameters for order_shipped template
      const components = sanitizeComponents([
        {
          type: 'body',
          parameters: [
            { type: 'text', text: sanitizeTemplateParam(customerName, 'Valued Customer') },
            { type: 'text', text: sanitizeTemplateParam(orderId, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(orderAmountStr, '0.00') },
            { type: 'text', text: sanitizeTemplateParam(paymentMethod, 'Online Payment') },
            { type: 'text', text: sanitizeTemplateParam(paymentStatus, 'PAID') },
            { type: 'text', text: sanitizeTemplateParam(orderStatus, 'SHIPPED') },
            { type: 'text', text: sanitizeTemplateParam(courierPartner, 'Standard Delivery') },
            { type: 'text', text: sanitizeTemplateParam(trackingNumber, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(estimatedDate, '3-5 Business Days') },
            { type: 'text', text: sanitizeTemplateParam(trackingUrl, `${siteUrl}/order-tracking`) },
            { type: 'text', text: sanitizeTemplateParam(orderLink, `https://3dgalaxy.co.in/account/orders/${orderId}`) }
          ]
        }
      ]);

      const requestPayload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: components
        },
        orderId: order?.id,
        statusKey: 'shipped'
      };

      // Create WhatsApp Log in Database
      const log = await prisma.whatsappLog.create({
        data: {
          customerId: validCustomerId,
          orderId: validOrderId,
          phone: formattedPhone,
          templateName: templateName,
          templateLanguage: languageCode,
          messageType: 'order_shipped',
          provider: 'meta',
          status: 'Pending',
          requestPayload: requestPayload as any,
          retryCount: 0
        }
      });

      // API details
      const apiUrl = whatsappSettings.apiUrl || `https://graph.facebook.com/v19.0/${whatsappSettings.phoneNumberId}/messages`;
      const accessToken = whatsappSettings.apiKey || whatsappSettings.accessToken;

      if (!whatsappSettings.enabled || !whatsappSettings.apiEnabled || !accessToken) {
        console.log(`[WhatsAppNotificationService] Sandbox/Simulated dispatch for order_shipped notification (Order: ${orderId}, Phone: ${formattedPhone})`);
        await prisma.whatsappLog.update({
          where: { id: log.id },
          data: {
            status: 'Sent',
            responsePayload: { simulated: true, note: 'Sandbox order_shipped notification dispatch. Configure Meta WhatsApp Cloud API credentials for live dispatch.' },
            messageId: 'sim_shipped_' + Math.random().toString(36).substring(7)
          }
        });
        return { success: true, logId: log.id, messageId: 'simulated' };
      }

      // Live Dispatch to Meta Cloud API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestPayload)
      });

      const resData = (await response.json()) as any;

      if (response.ok) {
        const messageId = resData?.messages?.[0]?.id || null;
        await prisma.whatsappLog.update({
          where: { id: log.id },
          data: {
            status: 'Sent',
            responsePayload: resData,
            messageId: messageId
          }
        });
        console.log(`[WhatsAppNotificationService] WhatsApp order_shipped notification sent successfully for order ${orderId} (Message ID: ${messageId})`);
        return { success: true, logId: log.id, messageId: messageId || undefined };
      } else {
        const errMsg = resData?.error?.message || 'Meta WhatsApp Cloud API request failed for order_shipped';
        console.error(`[WhatsAppNotificationService] Meta WhatsApp Cloud API error for order ${orderId}: ${errMsg}`, resData);
        await prisma.whatsappLog.update({
          where: { id: log.id },
          data: {
            status: 'Failed',
            errorMessage: errMsg,
            responsePayload: resData
          }
        });

        if (resData?.error?.code === 132001) {
          console.warn(`[WhatsAppNotificationService] Template ${templateName} not found in Meta (${errMsg}). Falling back to sendOrderStatusNotification...`);
          return this.sendOrderStatusNotification(order, { ...extraParams, recipientNumber: formattedPhone, statusKey: 'shipped' });
        }

        return { success: false, logId: log.id, error: errMsg };
      }
    } catch (err: any) {
      console.error('[WhatsAppNotificationService] Error sending order_shipped notification:', err);
      return { success: false, error: err.message || 'Internal notification error' };
    }
  }
}
