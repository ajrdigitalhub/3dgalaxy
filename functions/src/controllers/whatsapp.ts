import { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import prisma from '../config/database';
import { ENV } from '../config/env';
import { AuthenticatedRequest } from '../middleware/auth';
import { getSettingsService } from '../modules/settings/settings.service';
import { WhatsAppNotificationService } from '../services/whatsappNotificationService';
import { sanitizeTemplateParam, sanitizeComponents } from '../utils/whatsappSanitizer';

// Helper to get WhatsApp settings
export const getWhatsappSettings = async () => {
  const settings = await getSettingsService();
  return settings?.whatsappSettings || {};
};

// Parse placeholders from text (e.g. {{customer_name}})
function getPlaceholderKeys(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const keys: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    keys.push(match[1].trim());
  }
  return keys;
}

// Generate values for placeholders
function resolvePlaceholders(order: any, customer: any, settings: any, extraParams: any = {}) {
  const storeName = settings.storeName || ENV.SITE_NAME;
  const supportPhone = settings.adminPhoneNumber || '9999999999';
  const supportEmail = settings.storeSupportEmail || ENV.SUPPORT_EMAIL;
  const siteUrl = extraParams.origin || settings.siteUrl || ENV.SITE_URL;

  let customerName = 'Customer';
  if (customer) {
    customerName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Customer';
  } else if (order?.shippingAddress) {
    const addr = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress;
    customerName = addr.name || 'Customer';
  }

  let orderItems = '';
  if (order?.items && order.items.length > 0) {
    orderItems = order.items.map((i: any) => `${i.product?.name || 'Product'} x ${i.quantity}`).join(', ');
  }

  let shippingAddress = '';
  if (order?.shippingAddress) {
    const addr = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress;
    shippingAddress = `${addr.addressLine1 || ''}, ${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}`;
  }

  return {
    customer_name: sanitizeTemplateParam(customerName, 'Customer'),
    order_id: sanitizeTemplateParam(order?.orderNumber || order?.id, 'N/A'),
    tracking_number: sanitizeTemplateParam(order?.trackingNumber, 'N/A'),
    courier: sanitizeTemplateParam(order?.courier, 'N/A'),
    estimated_delivery: sanitizeTemplateParam(order?.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString() : 'N/A'),
    payment_status: sanitizeTemplateParam(order?.paymentStatus || order?.payment?.status, 'Pending'),
    order_total: sanitizeTemplateParam(String(order?.totalAmount || '0')),
    currency: sanitizeTemplateParam(settings.currency, 'INR'),
    store_name: sanitizeTemplateParam(storeName, ENV.SITE_NAME),
    support_phone: sanitizeTemplateParam(supportPhone, '9999999999'),
    support_email: sanitizeTemplateParam(supportEmail, ENV.SUPPORT_EMAIL),
    site_url: sanitizeTemplateParam(siteUrl, ENV.SITE_URL),
    order_items: sanitizeTemplateParam(orderItems, 'Order Items'),
    shipping_address: sanitizeTemplateParam(shippingAddress, 'Address details in Admin'),
    ...extraParams
  };
}



// Meta Dispatch Service
export const dispatchMetaNotification = async (logId: string, settings: any, payload: any) => {
  const apiUrl = settings.apiUrl || `https://graph.facebook.com/v19.0/${settings.phoneNumberId}/messages`;
  const accessToken = settings.apiKey || settings.accessToken;

  if (!settings.apiEnabled || !accessToken) {
    // Simulated Sandbox dispatch
    await prisma.whatsappLog.update({
      where: { id: logId },
      data: {
        status: 'Sent',
        responsePayload: { simulated: true, msg: 'Sandbox dispatch. Configure Meta credentials to send real messages.' },
        messageId: 'sim_' + Math.random().toString(36).substring(7),
      },
    });
    return;
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as any;
    if (response.ok) {
      const msgId = data.messages?.[0]?.id;
      await prisma.whatsappLog.update({
        where: { id: logId },
        data: {
          status: 'Sent',
          responsePayload: data,
          messageId: msgId || null,
        },
      });
    } else {
      const err = data.error?.message || 'Meta API request failed';
      await handleLogDispatchFailure(logId, settings, err, data);
    }
  } catch (err: any) {
    await handleLogDispatchFailure(logId, settings, err.message || 'Network Timeout', null);
  }
};

// Failure and retry helper
export const handleLogDispatchFailure = async (logId: string, settings: any, errMessage: string, responsePayload: any) => {
  const log = await prisma.whatsappLog.findUnique({ where: { id: logId } });
  if (!log) return;

  const maxRetry = settings.sendRetryCount || 3;
  if (log.retryCount < maxRetry) {
    await prisma.whatsappLog.update({
      where: { id: logId },
      data: {
        status: 'Retrying',
        retryCount: log.retryCount + 1,
        errorMessage: errMessage,
        responsePayload: responsePayload || undefined,
      },
    });
  } else {
    await prisma.whatsappLog.update({
      where: { id: logId },
      data: {
        status: 'Failed',
        errorMessage: errMessage,
        responsePayload: responsePayload || undefined,
      },
    });
  }
};

// Dynamic WhatsApp Order Status Content Generator
export function getDynamicOrderStatusContent(
  statusKey: string,
  order: any = null,
  extraParams: any = {},
  settings: any = {}
) {
  const siteName = settings.storeName || '3D Galaxy';
  const content = WhatsAppNotificationService.generateStatusContent(statusKey, order, extraParams, siteName);

  // Admin Custom Config Overrides
  const normalizedKey = String(statusKey || '').toLowerCase().replace(/[\s_-]+/g, '');
  const customConfig = settings.statusMappings?.[statusKey] || settings.statusMappings?.[normalizedKey] || settings.statusConfigs?.[statusKey];
  let statusTitle = content.currentStatus;
  let statusMessage = content.statusDescription;
  let additionalInfo = content.additionalInformation;

  if (customConfig) {
    if (customConfig.statusTitle) statusTitle = customConfig.statusTitle;
    if (customConfig.message) statusMessage = customConfig.message;
    if (customConfig.additionalInfo) additionalInfo = customConfig.additionalInfo;
  }

  return { statusTitle, statusMessage, additionalInfo };
}

// WhatsApp Automated Notification Trigger Helper
export const triggerWhatsAppNotification = async (
  triggerKey: string,
  recipientNumber: string,
  order: any = null,
  customer: any = null,
  extraParams: any = {}
) => {
  try {
    const settings = await getWhatsappSettings();
    if (settings.enabled === false) return;

    // Check if trigger is enabled (support alias keys like status_update, order_status_update, or specific status key)
    const lowerKey = triggerKey.toLowerCase();
    const explicitVal = settings.triggers?.[triggerKey] ?? settings.triggers?.[lowerKey] ?? settings.triggers?.['status_update'] ?? settings.triggers?.['order_status_update'];
    const triggerEnabled = explicitVal !== false;
    if (!triggerEnabled) return;

    // Format recipient number (add default country code if missing)
    let formattedPhone = recipientNumber.replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) {
      const code = settings.defaultCountryCode || '+91';
      formattedPhone = `${code}${formattedPhone}`;
    }

    let templateName = '';
    let components: any[] = [];
    let isStandardTemplate = false;

    const siteName = settings.storeName || ENV.SITE_NAME;
    const siteUrl = extraParams.origin || settings.siteUrl || ENV.SITE_URL;
    const currency = settings.currency || '₹';

    const isAdmin = !!extraParams.is_admin || triggerKey === 'admin_new_order';

    const statusTriggers = [
      'pending', 'confirmed', 'order_confirmed', 'processing', 'packed',
      'shipped', 'out_for_delivery', 'out for delivery', 'delivered',
      'cancelled', 'canceled', 'refunded', 'returned'
    ];
    const isStatusUpdateTrigger = statusTriggers.includes(triggerKey.toLowerCase()) ||
      triggerKey.startsWith('order_status_') ||
      extraParams.isOrderStatusUpdate === true ||
      (order && ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned'].includes(order.status?.toLowerCase()));

    if (isAdmin) {
      templateName = settings.orderConfirmationAdminTemplateName || 'order_confirmation_admin';
      isStandardTemplate = true;

      const paymentMethodMap: any = {
        'razorpay': 'Online Payment',
        'cod': 'Cash on Delivery',
        'manual': 'Manual Payment'
      };
      const rawMethod = String(order?.paymentMethod || extraParams?.paymentMethod || '').toLowerCase();
      const isCOD = rawMethod === 'cod' || rawMethod === 'cash_on_delivery';
      const isPaid = !!order?.paymentId || (order?.status !== 'Pending Payment' && !isCOD);

      let paymentMethod = 'Online Payment';
      if (isCOD) paymentMethod = 'Cash on Delivery (COD)';
      else if (rawMethod.includes('razorpay')) paymentMethod = 'Online Payment (Razorpay)';
      else if (rawMethod.includes('stripe')) paymentMethod = 'Online Payment (Stripe)';
      else if (rawMethod.includes('upi')) paymentMethod = 'UPI Payment';

      const paymentStatus = isPaid ? 'Paid' : (isCOD ? 'Pending (COD)' : 'Pending');

      let shippingAddress = order?.shippingAddress;
      if (typeof shippingAddress === 'string') {
        try { shippingAddress = JSON.parse(shippingAddress); } catch { shippingAddress = {}; }
      }
      const city = shippingAddress?.city || extraParams?.city || 'N/A';
      const emailId = customer?.email || customer?.user?.email || shippingAddress?.email || 'N/A';
      const custName = order?.customerName || (customer ? `${customer.firstName} ${customer.lastName || ''}`.trim() : 'Customer');
      const mobileNumber = recipientNumber || customer?.phone || customer?.mobile || 'N/A';

      const orderAmountStr = Number(order?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let itemsSummary = '';
      if (order?.items && order.items.length > 0) {
        itemsSummary = order.items.map((i: any) => `${i.product?.name || 'Product'} x ${i.quantity}`).join(', ');
      } else {
        itemsSummary = 'Order Items';
      }

      const adminBaseUrl = settings.adminUrl || ENV.ADMIN_APP_URL;
      const adminPortalUrl = order ? `${adminBaseUrl}/orders/${order.id}` : adminBaseUrl;

      components = sanitizeComponents([
        {
          type: "body",
          parameters: [
            { type: "text", text: sanitizeTemplateParam(order?.orderNumber || order?.id, 'N/A') },
            { type: "text", text: sanitizeTemplateParam(custName, 'Customer') },
            { type: "text", text: sanitizeTemplateParam(mobileNumber, 'N/A') },
            { type: "text", text: sanitizeTemplateParam(emailId, 'N/A') },
            { type: "text", text: sanitizeTemplateParam(city, 'N/A') },
            { type: "text", text: sanitizeTemplateParam(orderAmountStr, '0.00') },
            { type: "text", text: sanitizeTemplateParam(paymentMethod, 'Online Payment') },
            { type: "text", text: sanitizeTemplateParam(paymentStatus, 'Pending') },
            { type: "text", text: sanitizeTemplateParam(itemsSummary, 'Order Items') },
            { type: "text", text: sanitizeTemplateParam(adminPortalUrl, adminBaseUrl) }
          ],
        }
      ]);
    } else if (triggerKey === 'registration' || triggerKey === 'welcome') {
      templateName = settings.welcomeMessageTemplateName || 'welcome_message';
      isStandardTemplate = true;
      components = sanitizeComponents([
        {
          type: "body",
          parameters: [
            { type: "text", text: sanitizeTemplateParam(customer?.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : (customer?.name || "Customer")) },
            { type: "text", text: sanitizeTemplateParam(siteUrl) },
          ],
        },
      ]);
    } else if (triggerKey === 'service_request_customer' || triggerKey === 'order_3dprint_client') {
      templateName = settings.order3dprintClientTemplateName || settings.serviceRequestCustomerTemplateName || 'order_3dprint_client';
      isStandardTemplate = true;

      const custName = order?.customerName || customer?.name || extraParams.customerName || 'Valued Customer';
      const trackingId = order?.id || extraParams.requestId || extraParams.trackingId || 'ENQ-123456';
      const reqDateObj = order?.createdAt ? new Date(order.createdAt) : new Date();
      const requestDate = extraParams.requestDate || reqDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const fileName = order?.modelName || order?.fileName || extraParams.FileName || extraParams.fileName || '3D_Model.stl';
      const quantity = String(order?.quantity || extraParams.quantity || 1);
      const material = order?.material || extraParams.material || 'PLA';
      const color = order?.color || extraParams.color || 'Default';
      const printQuality = order?.layerHeight || extraParams.printQuality || 'Standard (0.20mm)';
      const infill = extraParams.Infill || extraParams.infill || `${order?.infillPercent ?? 20}%`;
      const additionalReqs = extraParams.additionalRequirements || (order?.notes && order.notes.trim() ? order.notes.trim() : 'None');
      const trackUrl = extraParams.viewRequesturl || extraParams.trackUrl || `${siteUrl}/services/track?trk=${order?.trackingNumber || order?.id || 'TRK-123456'}`;
      const rawStatus = order?.status || extraParams.status || 'submitted';
      const statusFormatted = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

      components = sanitizeComponents([
        {
          type: 'body',
          parameters: [
            { type: 'text', text: sanitizeTemplateParam(custName, 'Valued Customer') },
            { type: 'text', text: sanitizeTemplateParam(trackingId, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(requestDate, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(fileName, '3D_Model.stl') },
            { type: 'text', text: sanitizeTemplateParam(quantity, '1') },
            { type: 'text', text: sanitizeTemplateParam(material, 'PLA') },
            { type: 'text', text: sanitizeTemplateParam(color, 'Default') },
            { type: 'text', text: sanitizeTemplateParam(printQuality, 'Standard') },
            { type: 'text', text: sanitizeTemplateParam(infill, '20%') },
            { type: 'text', text: sanitizeTemplateParam(additionalReqs, 'None') },
            { type: 'text', text: sanitizeTemplateParam(trackUrl, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(statusFormatted, 'Submitted') }
          ]
        }
      ]);
    } else if (triggerKey === 'service_request_admin' || triggerKey === 'order_3dprint_admin') {
      templateName = settings.order3dprintAdminTemplateName || settings.serviceRequestAdminTemplateName || 'order_3dprint_admin';
      isStandardTemplate = true;

      const trackingId = order?.id || extraParams.requestId || extraParams.trackingId || 'ENQ-123456';
      const reqDateObj = order?.createdAt ? new Date(order.createdAt) : new Date();
      const requestDate = extraParams.requestDate || reqDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const custName = order?.customerName || customer?.name || extraParams.customerName || 'Valued Customer';
      const emailId = order?.customerEmail || customer?.email || extraParams.customerEmail || extraParams.email || 'Not provided';
      const mobileNumber = order?.customerPhone || customer?.phone || extraParams.customerMobile || extraParams.mobile || 'Not provided';
      const fileName = order?.modelName || order?.fileName || extraParams.fileName || '3D_Model.stl';
      const quantity = String(order?.quantity || extraParams.quantity || 1);
      const material = order?.material || extraParams.material || 'PLA';
      const color = order?.color || extraParams.color || 'Default';
      const printQuality = order?.layerHeight || extraParams.printQuality || 'Standard (0.20mm)';
      const infill = extraParams.infill || `${order?.infillPercent ?? 20}%`;
      const additionalReqs = extraParams.additioanalRequirements || extraParams.additionalRequirements || (order?.notes && order.notes.trim() ? order.notes.trim() : 'None');
      const adminBaseUrl = settings.adminUrl || ENV.ADMIN_APP_URL;
      const adminPortalUrl = extraParams.adminorderUrlLink || extraParams.adminPortalUrl || (order ? `${adminBaseUrl}/services/${order.id}` : `${adminBaseUrl}/services/ENQ-123456`);
      const rawStatus = order?.status || extraParams.status || 'submitted';
      const statusFormatted = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

      components = sanitizeComponents([
        {
          type: 'body',
          parameters: [
            { type: 'text', text: sanitizeTemplateParam(trackingId, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(requestDate, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(custName, 'Valued Customer') },
            { type: 'text', text: sanitizeTemplateParam(emailId, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(mobileNumber, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(fileName, '3D_Model.stl') },
            { type: 'text', text: sanitizeTemplateParam(quantity, '1') },
            { type: 'text', text: sanitizeTemplateParam(material, 'PLA') },
            { type: 'text', text: sanitizeTemplateParam(color, 'Default') },
            { type: 'text', text: sanitizeTemplateParam(printQuality, 'Standard') },
            { type: 'text', text: sanitizeTemplateParam(infill, '20%') },
            { type: 'text', text: sanitizeTemplateParam(additionalReqs, 'None') },
            { type: 'text', text: sanitizeTemplateParam(adminPortalUrl, 'N/A') },
            { type: 'text', text: sanitizeTemplateParam(statusFormatted, 'Submitted') }
          ]
        }
      ]);
    } else if (['order_placed', 'order_confirmed', 'order_confirmation'].includes(triggerKey.toLowerCase())) {
      await WhatsAppNotificationService.sendOrderConfirmation(order, {
        ...extraParams,
        recipientNumber: recipientNumber || customer?.phone,
        customerName: WhatsAppNotificationService.extractCustomerName(order, { customer, ...extraParams })
      });
      return;
    } else if (['shipped', 'order_shipped'].includes(triggerKey.toLowerCase())) {
      await WhatsAppNotificationService.sendOrderShippedNotification(order, extraParams.shipment || extraParams, {
        ...extraParams,
        recipientNumber: recipientNumber || customer?.phone,
        customerName: WhatsAppNotificationService.extractCustomerName(order, { customer, ...extraParams })
      });
      return;
    } else if (isStatusUpdateTrigger) {
      await WhatsAppNotificationService.sendOrderStatusNotification(order, {
        ...extraParams,
        recipientNumber: recipientNumber || customer?.phone,
        customerName: WhatsAppNotificationService.extractCustomerName(order, { customer, ...extraParams }),
        statusKey: triggerKey
      });
      return;
    } else if (triggerKey === 'order_delivered_review') {
      templateName = settings.orderDeliveredReviewTemplateName || 'order_delivered_review_template';
      isStandardTemplate = true;

      const reviewLink = order ? `${siteUrl}/feedback?orderId=${order.id}` : '';
      const custName = WhatsAppNotificationService.extractCustomerName(order, { customer, ...extraParams });

      components = sanitizeComponents([
        {
          type: "body",
          parameters: [
            { type: "text", text: sanitizeTemplateParam(custName, 'Customer') },
            { type: "text", text: sanitizeTemplateParam(order?.orderNumber || order?.id, 'N/A') },
            { type: "text", text: sanitizeTemplateParam(reviewLink, '') }
          ]
        }
      ]);
    }

    if (!isStandardTemplate) {
      const template = settings.templates?.[triggerKey];
      if (!template || !template.name) return;
      templateName = template.name;

      const resolvedVars = resolvePlaceholders(order, customer, settings, extraParams);
      const keys = getPlaceholderKeys(template.body || '');
      const parameters = keys.map(k => {
        const val = resolvedVars[k as keyof typeof resolvedVars] || '';
        return { type: 'text', text: sanitizeTemplateParam(val) };
      });

      components = sanitizeComponents([
        {
          type: 'body',
          parameters,
        },
      ]);


    }

    components = sanitizeComponents(components);

    const metaPayload: any = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en',
        },
        components,
      },
    };

    const log = await prisma.whatsappLog.create({
      data: {
        customerId: customer?.id || order?.customerId || null,
        orderId: order?.id || null,
        phone: formattedPhone,
        templateName: templateName,
        templateLanguage: 'en',
        messageType: triggerKey.includes('otp') ? 'otp' : 'transactional',
        provider: settings.provider || 'meta',
        status: 'Queued',
        requestPayload: metaPayload,
        retryCount: 0,
      },
    });

    // Dispatch
    await dispatchMetaNotification(log.id, settings, metaPayload);



    // Handle Admin notifications trigger if enabled
    if (settings.sendAdminNotification !== false && !isAdmin) {
      const adminTriggers = ['order_placed', 'payment_success'];
      if (adminTriggers.includes(triggerKey)) {
        await WhatsAppNotificationService.sendAdminOrderNotification(order, extraParams);
      }
    }
  } catch (error) {
    console.error('Failed to trigger automated WhatsApp notification:', error);
  }
};

// Webhook subscription verification
export const handleMetaWebhookVerification = async (req: Request, res: Response) => {
  const settings = await getWhatsappSettings();
  const verifyToken = settings.verifyToken || '3dgalaxy_verify_token';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Verification mismatch');
};

// Webhook status processor
export const handleMetaWebhook = async (req: Request, res: Response) => {
  try {
    const settings = await getWhatsappSettings();
    const signature = req.headers['x-hub-signature-256'] as string;

    if (settings.webhookSecret && signature) {
      const rawBody = JSON.stringify(req.body);
      const hash = crypto.createHmac('sha256', settings.webhookSecret).update(rawBody).digest('hex');
      const expectedSignature = `sha256=${hash}`;

      if (signature !== expectedSignature) {
        return res.status(400).send('Signature check failed');
      }
    }

    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const val = changes?.value;
    const statuses = val?.statuses;

    if (statuses && statuses.length > 0) {
      for (const st of statuses) {
        const messageId = st.id;
        const statusStr = st.status; // sent, delivered, read, failed
        const timestamp = st.timestamp ? new Date(Number(st.timestamp) * 1000) : new Date();

        let dbStatus = 'Sent';
        if (statusStr === 'delivered') dbStatus = 'Delivered';
        if (statusStr === 'read') dbStatus = 'Read';
        if (statusStr === 'failed') dbStatus = 'Failed';

        const logs = await prisma.whatsappLog.findMany({
          where: { messageId },
        });

        for (const log of logs) {
          await prisma.whatsappLog.update({
            where: { id: log.id },
            data: {
              status: dbStatus,
              deliveredAt: statusStr === 'delivered' ? timestamp : log.deliveredAt,
              readAt: statusStr === 'read' ? timestamp : log.readAt,
              errorMessage: statusStr === 'failed' ? (st.errors?.[0]?.message || 'Meta webhook delivery failure') : log.errorMessage,
            },
          });
        }
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    return res.status(500).send('Internal Server Error');
  }
};

// Get Admin WhatsApp logs with filters
export const getAdminWhatsappLogs = async (req: Request, res: Response) => {
  const { searchQuery, status, templateName, phone } = req.query;
  try {
    const whereClause: any = {};

    if (status) {
      whereClause.status = String(status);
    }

    if (templateName) {
      whereClause.templateName = { contains: String(templateName), mode: 'insensitive' };
    }

    if (phone) {
      whereClause.phone = { contains: String(phone) };
    }

    if (searchQuery) {
      const q = String(searchQuery);
      whereClause.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { templateName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.whatsappLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.status(200).json(logs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Get single admin log details
export const getAdminWhatsappLogDetail = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const log = await prisma.whatsappLog.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({ error: 'WhatsApp log not found' });
    }
    return res.status(200).json(log);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Manual trigger test
export const handleManualSend = async (req: Request, res: Response) => {
  const { recipientNumber, templateName, parameters } = req.body;
  if (!recipientNumber || !templateName) {
    return res.status(400).json({ error: 'recipientNumber and templateName are required.' });
  }

  try {
    await triggerWhatsAppNotification(templateName, recipientNumber, null, null, parameters);
    return res.status(200).json({ success: true, message: 'Test WhatsApp message queued successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Preview Dynamic WhatsApp Order Status Message
export const handlePreviewOrderStatusMessage = async (req: Request, res: Response) => {
  try {
    const { status, customerName, orderId, extraParams } = req.body;
    const settings = await getWhatsappSettings();
    const siteName = settings.storeName || ENV.SITE_NAME;
    const siteUrl = extraParams?.origin || settings.siteUrl || ENV.SITE_URL;
    const content = WhatsAppNotificationService.generateStatusContent(status || 'Order Confirmed', null, extraParams || {}, siteName);

    const name = customerName || 'Alex Johnson';
    const ordId = orderId || 'B3D-10294';

    if (['shipped', 'order_shipped', 'dispatched'].includes(String(status || '').toLowerCase().trim())) {
      const templateName = settings.orderShippedTemplateName || 'order_shipped';
      const custName = name;
      const orderAmountStr = '1,499.00';
      const paymentMethod = 'Online Payment';
      const paymentStatus = 'PAID';
      const orderStatus = 'SHIPPED';
      const courierPartner = extraParams?.courierPartner || extraParams?.courierName || 'Delhivery Courier';
      const trackingNumber = extraParams?.trackingNumber || 'DEL123456789';
      const estimatedDate = extraParams?.estimatedDeliveryDate || '3-5 Business Days';
      const trackingUrl = extraParams?.trackingUrl || `${siteUrl}/order-tracking?id=${ordId}`;
      const ordLink = extraParams?.orderLink || `${siteUrl}/account/orders/${ordId}`;

      const previewText = `Hello *${custName}* 👋,\nGreat news! Your order from ${siteName} has been dispatched and is now on its way to you. 🚚📦\n━━━━━━━━━━━━━━━━━━━\n📦 ORDER SUMMARY 📦\n\n🧾 Order ID:${ordId}\n💰 Order Value: ₹${orderAmountStr}\n💳 Payment Method: ${paymentMethod}\n✅ Payment Status: ${paymentStatus}\n📦 Order Status: ${orderStatus}\n━━━━━━━━━━━━━━━━━━━\n🚚 SHIPPING DETAILS 🚚\n\n📦 Courier Partner: ${courierPartner}\n🔢 Tracking Number: ${trackingNumber}\n📅 Estimated Delivery: ${estimatedDate}\n\n🔗 Track Your Shipment\n${trackingUrl}\n━━━━━━━━━━━━━━━━━━━\n🔗 View Order Details\n${ordLink}\n━━━━━━━━━━━━━━━━━━\n\n📍 Your package is on its way!\nYou can use the tracking link above to check the latest shipment status and delivery updates.\nPlease keep your phone available, as the courier partner may contact you regarding the delivery.\n\nThank you for choosing ${siteName}.\nWe appreciate your trust and look forward to serving you again.\nHave a Nice Day! 🌟\n\nBest Regards,\n*${siteName} Team*`;

      return res.status(200).json({
        success: true,
        templateName: templateName,
        variables: {
          1: sanitizeTemplateParam(custName, 'Valued Customer'),
          2: sanitizeTemplateParam(ordId, 'N/A'),
          3: sanitizeTemplateParam(orderAmountStr, '0.00'),
          4: sanitizeTemplateParam(paymentMethod, 'Online Payment'),
          5: sanitizeTemplateParam(paymentStatus, 'PAID'),
          6: sanitizeTemplateParam(orderStatus, 'SHIPPED'),
          7: sanitizeTemplateParam(courierPartner, 'Standard Delivery'),
          8: sanitizeTemplateParam(trackingNumber, 'N/A'),
          9: sanitizeTemplateParam(estimatedDate, '3-5 Business Days'),
          10: sanitizeTemplateParam(trackingUrl, `${siteUrl}/order-tracking`),
          11: sanitizeTemplateParam(ordLink, `${siteUrl}/account/orders/${ordId}`)
        },
        previewText
      });
    }

    const orderLink = extraParams?.orderLink || `${siteUrl}/account/orders`;

    const previewText = `Hello ${name} 👋,\n\n📢 *Your Order Status Has Been Updated*\n\nWe're pleased to inform you that your order has reached a new stage.\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n📦 *ORDER DETAILS*\n\n🧾 Order ID: *${ordId}*\n\n📌 Current Status: *${content.currentStatus}*\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n📝 *Update*\n\n${content.statusDescription}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n${content.additionalInformation}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n🔗 *View Order*\n\n${orderLink}\n\nNeed assistance?\n\nOur support team is always here to help.\n\nThank you for choosing *${siteName}*.\n\nWe appreciate your trust and look forward to serving you again.\n\nBest Regards,\n\n*${siteName} Team*`;

    return res.status(200).json({
      success: true,
      templateName: 'order_status_update',
      variables: {
        1: sanitizeTemplateParam(name, 'Customer'),
        2: sanitizeTemplateParam(ordId, 'N/A'),
        3: sanitizeTemplateParam(content.currentStatus, 'Order Update'),
        4: sanitizeTemplateParam(content.statusDescription, 'Order status updated'),
        5: sanitizeTemplateParam(content.additionalInformation, 'Thank you for shopping with 3D Galaxy'),
        6: sanitizeTemplateParam(siteName, ENV.SITE_NAME),
        7: sanitizeTemplateParam(siteName, ENV.SITE_NAME),
        8: sanitizeTemplateParam(orderLink, siteUrl)
      },
      previewText
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Preview Service Template
export const handlePreviewServiceTemplate = async (req: Request, res: Response) => {
  try {
    const { templateType, customerName, trackingId, email, mobile, city, material, color, remarks } = req.body;
    const settings = await getWhatsappSettings();
    const siteName = settings.storeName || ENV.SITE_NAME;
    const siteUrl = settings.siteUrl || ENV.SITE_URL;

    const name = customerName || 'Jayakumar';
    const trkId = trackingId || 'ENQ-123456';
    const requestDate = new Date().toLocaleDateString('en-IN');
    const estResponseTime = '24-48 Hours';
    const serviceType = '3D Printing Service';
    const trackUrl = `${siteUrl}/services/track?trk=TRK-123456`;

    if (templateType === 'customer') {
      const templateName = settings.order3dprintClientTemplateName || settings.serviceRequestCustomerTemplateName || 'order_3dprint_client';
      const prFileName = req.body.fileName || '3D_Model.stl';
      const prQty = String(req.body.quantity || 1);
      const prMaterial = material || 'PLA';
      const prColor = color || 'White';
      const prQuality = req.body.printQuality || 'Standard (0.20mm)';
      const prInfill = req.body.infill || '20%';
      const prNotes = remarks || 'None';
      const prStatus = 'Submitted';
      
      const previewText = `Hello *${name}* 👋,

Thank you for choosing 3D Galaxy!

We have successfully received your 3D Printing Service Request. Our team will review your model and requirements and get back to you shortly.

━━━━━━━━━━━━━━━━━━━
📋 REQUEST DETAILS
━━━━━━━━━━━━━━━━━━━

🧾 Request ID: *${trkId}*
📅 Request Date: *${requestDate}*
📁 File Name: *${prFileName}*
📦 Quantity: *${prQty}*
🧱 Material: *${prMaterial}*
🎨 Color: *${prColor}*
⚙️ Print Quality: *${prQuality}*

📐 PRINT SPECIFICATIONS
━━━━━━━━━━━━━━━━━━━
🧵 Infill: ${prInfill}

📝 Additional Requirements:
${prNotes}

━━━━━━━━━━━━━━━━━━
📋 Request Status: *${prStatus}*

Our team is reviewing your model and requirements. Once the review is completed, we will share the quotation and estimated delivery details with you.

🔗 View Request Details:
${trackUrl}

Best Regards,
*3D Galaxy Team*`;

      return res.status(200).json({
        success: true,
        templateName,
        variables: {
          1: name,
          2: trkId,
          3: requestDate,
          4: prFileName,
          5: prQty,
          6: prMaterial,
          7: prColor,
          8: prQuality,
          9: prInfill,
          10: prNotes,
          11: trackUrl,
          12: prStatus
        },
        previewText
      });
    } else {
      const templateName = settings.order3dprintAdminTemplateName || settings.serviceRequestAdminTemplateName || 'order_3dprint_admin';
      const custMail = email || 'customer@example.com';
      const custPhone = mobile || '+919876543210';
      const prFileName = req.body.fileName || '3D_Model.stl';
      const prQty = String(req.body.quantity || 1);
      const prMaterial = material || 'PLA';
      const prColor = color || 'Black';
      const prQuality = req.body.printQuality || 'Standard (0.20mm)';
      const prInfill = req.body.infill || '20%';
      const prRemarks = remarks || 'Print with high resolution';
      const prStatus = 'Submitted';
      const adminBaseUrl = settings.adminUrl || ENV.ADMIN_APP_URL;
      const adminPortalUrl = `${adminBaseUrl}/services/${trkId}`;

      const previewText = `*🔔 NEW 3D PRINT REQUEST!*

Hello Team 👋,

A new 3D Printing Service Request has been submitted.

📋 REQUEST DETAILS
━━━━━━━━━━━━━━━━━━━

🧾 Request ID: *${trkId}*
📅 Request Date: ${requestDate}
📋 Status: ${prStatus}

👤 CUSTOMER DETAILS
━━━━━━━━━━━━━━━━━━━

👤 Name: ${name}
📧 Email: ${custMail}
📱 Mobile: ${custPhone}

🖨️ PRINT DETAILS
━━━━━━━━━━━━━━━━━━━

📁 File Name: ${prFileName}
📦 Quantity: ${prQty}
🧱 Material: ${prMaterial}
🎨 Color: ${prColor}
⚙️ Print Quality: ${prQuality}
🧵 Infill: ${prInfill}

📝 Additional Requirements:
${prRemarks}

━━━━━━━━━━━━━━━━━━━

🔗 View Request in Admin Panel:
${adminPortalUrl}

━━━━━━━━━━━━━━━━━━━

⚠️ ACTION REQUIRED

Please review the uploaded model and requirements, prepare the quotation, and update the request status.

*3D Galaxy Team*`;

      return res.status(200).json({
        success: true,
        templateName,
        variables: {
          1: trkId,
          2: requestDate,
          3: name,
          4: custMail,
          5: custPhone,
          6: prFileName,
          7: prQty,
          8: prMaterial,
          9: prColor,
          10: prQuality,
          11: prInfill,
          12: prRemarks,
          13: adminPortalUrl,
          14: prStatus
        },
        previewText
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Manual retry failed log
export const handleManualRetry = async (req: Request, res: Response) => {
  const { logId } = req.body;
  if (!logId) {
    return res.status(400).json({ error: 'Log ID is required for retry.' });
  }

  try {
    const log = await prisma.whatsappLog.findUnique({ where: { id: logId } });
    if (!log) {
      return res.status(404).json({ error: 'Log entry not found' });
    }

    const settings = await getWhatsappSettings();
    await prisma.whatsappLog.update({
      where: { id: logId },
      data: { status: 'Queued', retryCount: log.retryCount + 1 },
    });

    await dispatchMetaNotification(logId, settings, log.requestPayload);
    return res.status(200).json({ success: true, message: 'Message successfully re-queued for dispatch.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Handle Campaign Broadcasts
export const handleCampaignBroadcast = async (req: Request, res: Response) => {
  const { title, templateName, targetType, targetFilters, scheduledAt } = req.body;
  if (!title || !templateName || !targetType) {
    return res.status(400).json({ error: 'title, templateName, and targetType are required.' });
  }

  try {
    const campaign = await prisma.whatsappCampaign.create({
      data: {
        title,
        templateName,
        targetType,
        targetFilters,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'Scheduled' : 'Processing',
      },
    });

    if (scheduledAt) {
      return res.status(200).json({ success: true, campaignId: campaign.id, message: 'Campaign scheduled successfully.' });
    }

    // Find target customers
    let customers: any[] = [];
    if (targetType === 'All') {
      customers = await prisma.customer.findMany({ where: { user: { deletedAt: null } } });
    } else if (targetType === 'Inactive') {
      // Inactive: No orders in last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      customers = await prisma.customer.findMany({
        where: {
          orders: {
            none: {
              createdAt: { gte: ninetyDaysAgo },
            },
          },
        },
      });
    } else if (targetType === 'Recently Purchased') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      customers = await prisma.customer.findMany({
        where: {
          orders: {
            some: {
              createdAt: { gte: thirtyDaysAgo },
            },
          },
        },
      });
    }

    const settings = await getWhatsappSettings();
    let sentCount = 0;

    for (const cust of customers) {
      const phone = cust.phone;
      if (!phone) continue;

      let formattedPhone = phone.replace(/\s+/g, '');
      if (!formattedPhone.startsWith('+')) {
        const code = settings.defaultCountryCode || '+91';
        formattedPhone = `${code}${formattedPhone}`;
      }

      const template = settings.templates?.[templateName];
      if (!template) continue;

      const resolvedVars = resolvePlaceholders(null, cust, settings, targetFilters || {});
      const keys = getPlaceholderKeys(template.body || '');
      const parameters = keys.map(k => {
        const val = resolvedVars[k as keyof typeof resolvedVars] || '';
        return { type: 'text', text: sanitizeTemplateParam(val) };
      });

      const metaPayload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: template.name,
          language: {
            code: template.language || 'en',
          },
          components: sanitizeComponents([
            {
              type: 'body',
              parameters,
            },
          ]),
        },
      };

      const log = await prisma.whatsappLog.create({
        data: {
          customerId: cust.id,
          phone: formattedPhone,
          templateName: template.name,
          templateLanguage: template.language || 'en',
          messageType: 'campaign',
          provider: settings.provider || 'meta',
          status: 'Queued',
          requestPayload: metaPayload,
          retryCount: 0,
        },
      });

      await dispatchMetaNotification(log.id, settings, metaPayload);
      sentCount++;
    }

    await prisma.whatsappCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'Completed',
        sentCount,
      },
    });

    return res.status(200).json({ success: true, campaignId: campaign.id, sentCount });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Customer Notifications history
export const getCustomerNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { userId: req.user?.id },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const logs = await prisma.whatsappLog.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.status(200).json(logs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Customer Notification Details
export const getCustomerNotificationDetail = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const customer = await prisma.customer.findFirst({
      where: { userId: req.user?.id },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const log = await prisma.whatsappLog.findFirst({
      where: { id, customerId: customer.id },
    });

    if (!log) {
      return res.status(404).json({ error: 'Notification log not found' });
    }

    return res.status(200).json(log);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Start background retry worker
export const startRetryWorker = () => {
  setInterval(async () => {
    try {
      const settings = await getWhatsappSettings();
      if (!settings.enabled) return;

      const maxRetry = settings.sendRetryCount || 3;
      const intervalMinutes = settings.retryInterval || 5;
      const intervalMs = intervalMinutes * 60 * 1000;

      const retriableLogs = await prisma.whatsappLog.findMany({
        where: {
          status: 'Retrying',
          retryCount: { lt: maxRetry },
        },
      });

      for (const log of retriableLogs) {
        if (Date.now() - log.updatedAt.getTime() >= intervalMs) {
          // Increment retryCount, reset status to Queued
          await prisma.whatsappLog.update({
            where: { id: log.id },
            data: {
              retryCount: log.retryCount + 1,
              status: 'Queued',
            },
          });

          await dispatchMetaNotification(log.id, settings, log.requestPayload);
        }
      }
    } catch (e) {
      console.error('Error in background WhatsApp retry worker:', e);
    }
  }, 60000); // Check every minute
};
