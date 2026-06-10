import { Request, Response } from 'express';
import axios from 'axios';
import prisma from '../config/database';

export const templates: Record<string, (params: any) => string> = {
  ACCOUNT_CREATED: (params: any) => `Hello ${params.Name || params.name || 'User'},

Your account has been successfully created on Kall Me.

Role: ${params.Role || params.role || 'Member'}
Username: ${params.Username || params.username || params.Email || 'User'}

Set your password using the link below:
${params.PasswordLink || params.passwordLink || 'https://kallme.com/reset'}

If you did not request this, please contact support.`,

  ORDER_ASSIGNED: (params: any) => `Hello ${params.DeliveryPersonName || params.deliveryPersonName || 'Delivery Agent'},

You have received a new delivery assignment.

Order Details:
Order Date: ${params.OrderDate || params.orderDate || 'Today'}
Restaurant: ${params.Restaurant || params.restaurant || 'Kall Me Store'}
Items Ordered: ${params.MenuItems || params.menuItems || 'Catalog Items'}
Delivery Charge: ₹${params.DeliveryCharge || params.deliveryCharge || '0'}

Please confirm the pickup from the restaurant and start the delivery.

Thank you for your service.

- Kall Me Team`,

  CUSTOMER_INVOICE: (params: any) => `Hello ${params.CustomerName || params.customerName || 'Customer'},

Thank you for your order with Kall Me! Here is your invoice:

Order ID: ${params.OrderId || params.orderId || 'N/A'}
Date: ${params.OrderDate || params.orderDate || 'Today'}
Items Mapped: ${params.MenuItems || params.menuItems || 'Shop Items'}
Total Amount: ₹${params.TotalAmount || params.totalAmount || '0'}

Thank you for shopping with us!

- Kall Me Team`,

  CAMPAIGN_BROADCAST: (params: any) => `📢 ${params.Title || 'Special Broadcast'}:
${params.Message || params.message || ''}

- Kall Me Team`
};

export const sendWhatsappNotification = async (req: Request, res: Response) => {
  const { recipientNumber, templateName, parameters } = req.body;

  if (!recipientNumber) {
    return res.status(400).json({ error: 'recipientNumber phone is required.' });
  }

  if (!templateName) {
    return res.status(400).json({ error: 'templateName is required.' });
  }

  const templateFn = templates[templateName];
  if (!templateFn) {
    return res.status(400).json({ error: `Template "${templateName}" is not registered.` });
  }

  try {
    const messageContent = templateFn(parameters || {});

    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;

    let status = 'SENT';
    let reason: string | null = null;

    if (apiUrl && apiKey) {
      try {
        await axios.post(apiUrl, {
          recipient: recipientNumber,
          message: messageContent,
          apikey: apiKey
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 8000
        });
      } catch (err: any) {
        status = 'FAILED';
        reason = err.response?.data?.message || err.message || 'WhatsApp Gateway connection timed out';
      }
    } else {
      // Automatic dev environment sandboxed success fallback
      status = 'SENT';
      reason = 'Simulated sandbox dispatch. Set WHATSAPP_API_URL and WHATSAPP_API_KEY in server environment variables to unlock real messages.';
    }

    return res.status(200).json({
      success: status === 'SENT',
      status,
      reason,
      content: messageContent
    });
  } catch (error: any) {
    console.error('SEVERE WHATSAPP REST DISPATCH SERVICE BROKE:', error);
    return res.status(500).json({ error: 'Server error dispatching WhatsApp payload', details: error.message });
  }
};

export const getWhatsappLogs = async (req: Request, res: Response) => {
  return res.status(501).json({ error: 'WhatsApp logging is not enabled for this deployment' });
};
