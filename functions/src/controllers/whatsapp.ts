import { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { getSettingsService } from '../modules/settings/settings.service';

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
  const storeName = settings.storeName || '3D Galaxy';
  const supportPhone = settings.adminPhoneNumber || '9999999999';
  const supportEmail = 'support@3dgalaxy.com';
  const siteUrl = extraParams.origin || 'http://localhost:4200';
  
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
    customer_name: customerName,
    order_id: order?.orderNumber || order?.id || 'N/A',
    tracking_number: order?.trackingNumber || 'N/A',
    courier: order?.courier || 'N/A',
    estimated_delivery: order?.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString() : 'N/A',
    payment_status: order?.paymentStatus || order?.payment?.status || 'Pending',
    order_total: String(order?.totalAmount || '0'),
    currency: settings.currency || 'INR',
    invoice_url: order?.invoiceUrl ? `${siteUrl}${order.invoiceUrl}` : 'N/A',
    store_name: storeName,
    support_phone: supportPhone,
    support_email: supportEmail,
    site_url: siteUrl,
    order_items: orderItems,
    shipping_address: shippingAddress,
    ...extraParams
  };
}

// Generate Invoice PDF
export const generateInvoicePDF = async (order: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `invoice_${order.orderNumber || order.id}.pdf`;
      const uploadsPath = path.resolve(__dirname, '../../../uploads');
      const invoicesDir = path.join(uploadsPath, 'invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }
      const filePath = path.join(invoicesDir, filename);
      const writeStream = fs.createWriteStream(filePath);
      
      doc.pipe(writeStream);
      
      // Header
      doc.fontSize(20).text('INVOICE', { align: 'right' });
      doc.fontSize(14).text('3D Galaxy Hub', { align: 'left' });
      doc.fontSize(10).text('Website: https://3dgalaxy.com', { align: 'left' });
      doc.moveDown();
      
      // Order Metadata
      doc.fontSize(10).text(`Invoice Number: INV-${order.orderNumber || order.id.slice(0, 8)}`);
      doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Order Reference: ${order.id}`);
      doc.text(`Payment Status: ${order.paymentStatus || 'PAID'}`);
      doc.moveDown();
      
      // Address Info
      let shippingAddress = order.shippingAddress;
      if (typeof shippingAddress === 'string') {
        try {
          shippingAddress = JSON.parse(shippingAddress);
        } catch {
          shippingAddress = null;
        }
      }
      
      if (shippingAddress) {
        doc.fontSize(11).text('Shipping Address:', { underline: true });
        doc.fontSize(10).text(`${shippingAddress.name || ''}`);
        doc.text(`${shippingAddress.addressLine1 || ''}, ${shippingAddress.addressLine2 || ''}`);
        doc.text(`${shippingAddress.city || ''}, ${shippingAddress.state || ''} - ${shippingAddress.pincode || ''}`);
        doc.text(`Phone: ${shippingAddress.phone || ''}`);
        doc.moveDown();
      }
      
      // Order Items
      doc.fontSize(11).text('Order Summary:', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(10).text('Item Description', 50, doc.y, { width: 250 });
      doc.text('Qty', 300, doc.y, { width: 50, align: 'right' });
      doc.text('Unit Price', 370, doc.y, { width: 70, align: 'right' });
      doc.text('Total', 460, doc.y, { width: 80, align: 'right' });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();
      doc.moveDown(0.5);
      
      if (order.items && order.items.length > 0) {
        order.items.forEach((item: any) => {
          doc.text(item.product?.name || 'Product', 50, doc.y, { width: 250 });
          doc.text(String(item.quantity), 300, doc.y, { width: 50, align: 'right' });
          doc.text(`₹${item.unitPrice || item.price || 0}`, 370, doc.y, { width: 70, align: 'right' });
          doc.text(`₹${item.quantity * (item.unitPrice || item.price || 0)}`, 460, doc.y, { width: 80, align: 'right' });
          doc.moveDown();
        });
      }
      
      doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();
      doc.moveDown(0.5);
      
      doc.text('Subtotal:', 370, doc.y, { width: 70, align: 'right' });
      doc.text(`₹${order.totalAmount}`, 460, doc.y, { width: 80, align: 'right' });
      doc.moveDown(0.5);
      
      doc.text('GST:', 370, doc.y, { width: 70, align: 'right' });
      doc.text(`₹0`, 460, doc.y, { width: 80, align: 'right' });
      doc.moveDown(0.5);
      
      doc.fontSize(11).font('Helvetica-Bold').text('Grand Total:', 370, doc.y, { width: 70, align: 'right' });
      doc.text(`₹${order.totalAmount}`, 460, doc.y, { width: 80, align: 'right' });
      
      doc.end();
      
      writeStream.on('finish', () => {
        resolve(`/uploads/invoices/${filename}`);
      });
      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (e) {
      reject(e);
    }
  });
};

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
    if (!settings.enabled) return;
    
    // Check if trigger is enabled (defaulting to true if not specified)
    const triggerEnabled = settings.triggers?.[triggerKey] !== false;
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

    const siteName = settings.storeName || '3D Galaxy';
    const siteUrl = extraParams.origin || process.env.APP_URL || 'http://localhost:4200';
    const currency = settings.currency || '₹';

    const isAdmin = !!extraParams.is_admin || triggerKey === 'admin_new_order';

    if (isAdmin) {
      templateName = settings.orderConfirmationAdminTemplateName || 'order_confirmation_admin';
      isStandardTemplate = true;

      const paymentMethodMap: any = {
        'razorpay': 'Online Payment',
        'cod': 'Cash on Delivery',
        'manual': 'Manual Payment'
      };
      const paymentMethod = paymentMethodMap[order?.paymentMethod] || order?.paymentMethod || 'Cash on Delivery';
      const isPaid = !!order?.paymentId || (order?.status !== 'Pending Payment' && order?.paymentMethod !== 'cod');
      const paymentStatus = isPaid ? 'Paid' : 'Pending';

      let shippingAddress = order?.shippingAddress;
      if (typeof shippingAddress === 'string') {
        try { shippingAddress = JSON.parse(shippingAddress); } catch { shippingAddress = {}; }
      }
      const fullAddress = shippingAddress 
        ? `${shippingAddress.name || ''}, ${shippingAddress.addressLine1 || ''}, ${shippingAddress.city || ''}, ${shippingAddress.state || ''}, ${shippingAddress.pincode || ''}`
        : 'N/A';
      
      let itemsSummary = '';
      if (order?.items && order.items.length > 0) {
        itemsSummary = order.items.map((i: any) => `${i.quantity} x ${i.product?.name || 'Product'}`).join(', ');
      }
      const custName = order?.customerName || (customer ? `${customer.firstName} ${customer.lastName || ''}`.trim() : 'Customer');

      components = [
        {
          type: "body",
          parameters: [
            { type: "text", text: custName },
            { type: "text", text: recipientNumber || 'N/A' },
            { type: "text", text: order?.orderNumber || order?.id || 'N/A' },
            { type: "text", text: `${currency}${Number(order?.totalAmount || 0).toFixed(2)}` },
            { type: "text", text: `${paymentMethod} (${paymentStatus})` },
            { type: "text", text: new Date(order?.createdAt || Date.now()).toLocaleDateString('en-IN') },
            { type: "text", text: fullAddress },
            { type: "text", text: itemsSummary },
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [
            { type: "text", text: order ? `admin/orders/${order.id}` : '' }
          ]
        }
      ];
    } else if (triggerKey === 'registration' || triggerKey === 'welcome') {
      templateName = settings.welcomeMessageTemplateName || 'welcome_message';
      isStandardTemplate = true;
      components = [
        {
          type: "body",
          parameters: [
            { type: "text", text: customer?.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : (customer?.name || "Customer") },
            { type: "text", text: siteUrl },
          ],
        },
      ];
    } else if (triggerKey === 'order_placed') {
      templateName = settings.orderConfirmationClientTemplateName || 'order_confirmation_client';
      isStandardTemplate = true;
      
      const paymentMethodMap: any = {
        'razorpay': 'Online Payment',
        'cod': 'Cash on Delivery',
        'manual': 'Manual Payment'
      };
      const paymentMethod = paymentMethodMap[order?.paymentMethod] || order?.paymentMethod || 'Cash on Delivery';
      const isPaid = !!order?.paymentId || (order?.status !== 'Pending Payment' && order?.paymentMethod !== 'cod');
      const paymentStatus = isPaid ? 'Paid ✅' : 'Pending ⏳';
      const custName = order?.customerName || (customer ? `${customer.firstName} ${customer.lastName || ''}`.trim() : 'Customer');

      components = [
        {
          type: "body",
          parameters: [
            { type: "text", text: custName },
            { type: "text", text: siteName },
            { type: "text", text: order?.orderNumber || order?.id || 'N/A' },
            { type: "text", text: `${currency}${Number(order?.totalAmount || 0).toFixed(2)}` },
            { type: "text", text: paymentMethod },
            { type: "text", text: paymentStatus },
            { type: "text", text: custName },
            { type: "text", text: siteName },
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [
            { type: "text", text: order ? `account/orders/${order.id}` : '' }
          ]
        }
      ];
    } else if (['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(triggerKey)) {
      templateName = settings.orderStatusUpdateTemplateName || 'order_status_update';
      isStandardTemplate = true;

      let orderDetails = "";
      const statusTitle = triggerKey.charAt(0).toUpperCase() + triggerKey.slice(1);
      switch (triggerKey) {
        case "processing":
          orderDetails = "Your order is currently being processed by our team. We are getting everything ready for you! ⏳";
          break;
        case "shipped":
          orderDetails = `Great news! Your order has been shipped. 🚚\nTracking ID: ${order?.trackingNumber || 'N/A'}\nEstimated Delivery: ${order?.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString('en-IN') : 'N/A'}`;
          break;
        case "delivered":
          orderDetails = "Yay! Your order has been delivered successfully. We hope you love it! 🎉";
          break;
        case "cancelled":
          orderDetails = `Your order has been cancelled. ❌\nReason: ${order?.cancellationReason || 'Not provided'}`;
          break;
        default:
          orderDetails = `Your order status is now: ${statusTitle}.`;
      }

      const paymentMethodMap: any = {
        'razorpay': 'Online Payment',
        'cod': 'Cash on Delivery',
        'manual': 'Manual Payment'
      };
      const paymentMethod = paymentMethodMap[order?.paymentMethod] || order?.paymentMethod || 'Cash on Delivery';
      const custName = order?.customerName || (customer ? `${customer.firstName} ${customer.lastName || ''}`.trim() : 'Customer');

      components = [
        {
          type: "body",
          parameters: [
            { type: "text", text: custName },
            { type: "text", text: siteName },
            { type: "text", text: order?.orderNumber || order?.id || 'N/A' },
            { type: "text", text: statusTitle },
            { type: "text", text: `${currency}${Number(order?.totalAmount || 0).toFixed(2)}` },
            { type: "text", text: paymentMethod },
            { type: "text", text: orderDetails },
            { type: "text", text: custName },
            { type: "text", text: siteName },
            { type: "text", text: siteName },
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [
            { type: "text", text: order ? `account/orders/${order.id}` : '' }
          ]
        }
      ];
    } else if (triggerKey === 'order_delivered_review') {
      templateName = settings.orderDeliveredReviewTemplateName || 'order_delivered_review_template';
      isStandardTemplate = true;
      
      const fileName = `invoice_${order?.orderNumber || order?.id}.pdf`;
      const invoiceUrl = order?.invoiceUrl ? `${siteUrl}${order.invoiceUrl}` : `${siteUrl}/uploads/invoices/${fileName}`;
      const reviewLink = order ? `${siteUrl}/feedback?orderId=${order.id}` : '';
      const custName = order?.customerName || (customer ? `${customer.firstName} ${customer.lastName || ''}`.trim() : 'Customer');

      components = [
        {
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                link: invoiceUrl,
                filename: `Invoice_${order?.orderNumber || 'Download'}.pdf`
              }
            }
          ]
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: custName },
            { type: "text", text: order?.orderNumber || order?.id || 'N/A' },
            { type: "text", text: reviewLink }
          ]
        }
      ];
    }

    if (!isStandardTemplate) {
      const template = settings.templates?.[triggerKey];
      if (!template || !template.name) return;
      templateName = template.name;
      
      const resolvedVars = resolvePlaceholders(order, customer, settings, extraParams);
      const keys = getPlaceholderKeys(template.body || '');
      const parameters = keys.map(k => {
        const val = resolvedVars[k as keyof typeof resolvedVars] || '';
        return { type: 'text', text: String(val) };
      });

      components = [
        {
          type: 'body',
          parameters,
        },
      ];

      // Attach document if template type is Document
      if (template.headerType === 'Document' && resolvedVars.invoice_url && resolvedVars.invoice_url !== 'N/A') {
        components.push({
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: {
                link: resolvedVars.invoice_url,
                filename: `Invoice_${order?.orderNumber || 'Download'}.pdf`,
              },
            },
          ],
        });
      }
    }
    
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
    
    // Handle Delivered Order generation of Invoice PDF
    if (triggerKey === 'delivered' && settings.sendInvoiceOnDelivered) {
      // If invoice attachment is required but not yet generated
      if (settings.attachInvoicePdf && !order?.invoiceUrl && order) {
        try {
          const pdfPath = await generateInvoicePDF(order);
          const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: { invoiceUrl: pdfPath },
          });
          
          // Trigger Invoice Sent Template
          await triggerWhatsAppNotification('order_delivered_review', formattedPhone, updatedOrder, customer, extraParams);
        } catch (pdfErr) {
          console.error('Failed to auto generate invoice PDF on delivery:', pdfErr);
        }
      }
    }
    
    // Handle Admin notifications trigger if enabled
    if (settings.sendAdminNotification && settings.adminPhoneNumber && !isAdmin) {
      const adminTriggers = ['order_placed', 'payment_success', 'cancelled', 'refund_completed'];
      if (adminTriggers.includes(triggerKey)) {
        let adminTemplateKey = 'admin_new_order';
        if (triggerKey === 'payment_success') adminTemplateKey = 'admin_payment_received';
        if (triggerKey === 'cancelled') adminTemplateKey = 'admin_order_cancelled';
        
        await triggerWhatsAppNotification(adminTemplateKey, settings.adminPhoneNumber, order, customer, { ...extraParams, is_admin: true });
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
        return { type: 'text', text: String(val) };
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
          components: [
            {
              type: 'body',
              parameters,
            },
          ],
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
