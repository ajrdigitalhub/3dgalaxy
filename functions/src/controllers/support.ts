import { Request, Response } from 'express';
import prisma from '../config/database';
import { uploadFileToStorage } from '../config/firebase';
import fs from 'fs';

export const generateAndSaveSupportRequest = async (req: Request, res: Response) => {
  try {
    const { orderId, supportType, reason, comments, preferredContactMethod, attachments } = req.body;

    if (!orderId || !supportType || !reason) {
      return res.status(400).json({ success: false, error: 'Order ID, Support Type, and Reason are required.' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          include: { user: true }
        },
        items: {
          include: { product: true, variant: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    // Retrieve support settings from database
    const settingsRecord = await prisma.setting.findUnique({
      where: { settingKey: 'app_settings' }
    });
    const settingsVal = (settingsRecord?.settingData as any) || {};
    const supportSettings = settingsVal.supportSettings || {
      whatsappNumber: "+919876543210",
      email: "3dgalaxy@hotmail.com",
      businessHours: "9 AM - 6 PM",
      autoReply: "Thank you for contacting support! We will get back to you shortly.",
      returnPolicyUrl: "/return-policy",
      refundPolicyUrl: "/refund-policy",
      returnWindowDays: 10,
      refundWindowDays: 10
    };

    // Customer details resolution
    let customerName = 'Customer';
    let customerEmail = 'Not provided';
    let customerMobile = 'Not provided';

    if (order.customer) {
      if (order.customer.user) {
        const u = order.customer.user;
        customerName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || 'Customer';
        customerEmail = u.email || 'Not provided';
      }
      customerMobile = order.customer.phone || 'Not provided';
    }

    // Fallback to guest details if guest order
    if (customerName === 'Customer' && order.guestName) {
      customerName = order.guestName;
    }
    if (customerEmail === 'Not provided' && order.guestEmail) {
      customerEmail = order.guestEmail;
    }
    if (customerMobile === 'Not provided' && order.guestPhone) {
      customerMobile = order.guestPhone;
    }

    const orderDateFormatted = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) : 'Not provided';

    // Format products list
    // Example:
    // • PLA Filament Black × 2
    // • Bambu Lab A1 Combo × 1
    const productsLines = order.items?.map((item: any) => {
      const variantSuffix = item.variant?.name ? ` (${item.variant.name})` : '';
      return `• ${item.product?.name || 'Product'}${variantSuffix} × ${item.quantity}`;
    }) || [];
    const productsText = productsLines.join('\n');

    // Create SupportRequest ticket record in PostgreSQL using Prisma (Future Ready)
    const ticket = await prisma.supportRequest.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        type: supportType,
        reason: reason,
        comments: comments || '',
        status: 'OPEN',
        attachments: attachments || [],
      }
    });

    const orderValue = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(order.totalAmount || 0));

    // Generate dynamic message content
    const msg = `Hello 3D Galaxy Support Team,

I would like to raise a support request regarding my recent order.

Order ID:
${order.orderNumber}

Request Type:
${supportType} Request

Reason:
${reason}

Additional Comments:
${comments || 'No comments provided.'}

Customer Name:
${customerName}

Mobile:
${customerMobile}

Email:
${customerEmail}

Order Date:
${orderDateFormatted}

Product(s):
${productsText || 'No products listed'}

Order Value:
${orderValue}

Kindly review my request and let me know the next steps.

Thank you.`;

    // WhatsApp configuration
    const supportPhone = supportSettings.whatsappNumber || '+919876543210';
    const formattedPhone = supportPhone.replace(/[\s\+\-]/g, '');
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;

    // Email configuration
    const supportEmail = supportSettings.email || '3dgalaxy@hotmail.com';
    const emailSubject = `${supportType} Request - ${order.orderNumber}`;
    const emailUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(msg)}`;

    return res.status(200).json({
      success: true,
      data: {
        ticket,
        message: msg,
        whatsappUrl,
        emailUrl,
        supportSettings
      }
    });
  } catch (error: any) {
    console.error('Error creating support request:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const uploadAttachment = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const destination = `support_attachments/${Date.now()}-${req.file.originalname}`;
    const mimeType = req.file.mimetype;

    const downloadUrl = await uploadFileToStorage(fileBuffer, destination, mimeType);

    // Clean up local temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.warn('Failed to delete local temp file:', err);
    }

    return res.status(200).json({
      success: true,
      data: {
        url: downloadUrl,
        name: req.file.originalname,
        type: req.file.mimetype
      }
    });
  } catch (error: any) {
    console.error('Error uploading support attachment:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
