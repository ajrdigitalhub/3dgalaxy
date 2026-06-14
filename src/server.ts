import express from 'express';
import {join} from 'node:path';
import axios from 'axios';
import { insertWhatsAppLog, fetchWhatsAppLogs, TemplateParams } from './server/queries';
import { createProxyMiddleware } from 'http-proxy-middleware';

const browserDistFolder = join(process.cwd(), 'dist/applet/browser');

const app = express();

// Proxy API requests to the Decoupled Backend running on PORT 4000
app.use('/api', createProxyMiddleware({
  target: 'http://127.0.0.1:4000',
  changeOrigin: true
}));

app.use('/sitemap.xml', createProxyMiddleware({
  target: 'http://127.0.0.1:4000',
  changeOrigin: true
}));

app.use(express.json());


const templates: Record<string, (params: TemplateParams) => string> = {
  ACCOUNT_CREATED: (params: TemplateParams) => `Hello ${params['Name'] || params['name'] || 'User'},

Your account has been successfully created on Kall Me.

Role: ${params['Role'] || params['role'] || 'Member'}
Username: ${params['Username'] || params['username'] || params['Email'] || 'User'}

Set your password using the link below:
${params['PasswordLink'] || params['passwordLink'] || 'https://kallme.com/reset'}

If you did not request this, please contact support.`,

  ORDER_ASSIGNED: (params: TemplateParams) => `Hello ${params['DeliveryPersonName'] || params['deliveryPersonName'] || 'Delivery Agent'},

You have received a new delivery assignment.

Order Details:
Order Date: ${params['OrderDate'] || params['orderDate'] || 'Today'}
Restaurant: ${params['Restaurant'] || params['restaurant'] || 'Kall Me Store'}
Items Ordered: ${params['MenuItems'] || params['menuItems'] || 'Catalog Items'}
Delivery Charge: ₹${params['DeliveryCharge'] || params['deliveryCharge'] || '0'}

Please confirm the pickup from the restaurant and start the delivery.

Thank you for your service.

- Kall Me Team`,

  CUSTOMER_INVOICE: (params: TemplateParams) => `Hello ${params['CustomerName'] || params['customerName'] || 'Customer'},

Thank you for your order with Kall Me! Here is your invoice:

Order ID: ${params['OrderId'] || params['orderId'] || 'N/A'}
Date: ${params['OrderDate'] || params['orderDate'] || 'Today'}
Items Mapped: ${params['MenuItems'] || params['menuItems'] || 'Shop Items'}
Total Amount: ₹${params['TotalAmount'] || params['totalAmount'] || '0'}

Thank you for shopping with us!

- Kall Me Team`,

  CAMPAIGN_BROADCAST: (params: TemplateParams) => `📢 ${params['Title'] || 'Special Broadcast'}:
${params['Message'] || params['message'] || ''}

- Kall Me Team`
};

app.post('/api/whatsapp/send', async (req, res) => {
  const { recipientNumber, templateName, parameters } = req.body;

  if (!recipientNumber || !templateName) {
    res.status(400).json({ error: 'recipientNumber and templateName are required fields.' });
    return;
  }

  const templateFn = templates[templateName];
  if (!templateFn) {
    res.status(400).json({ error: `Template "${templateName}" is not registered.` });
    return;
  }

  try {
    const messageContent = templateFn((parameters as TemplateParams) || {});

    const apiUrl = process.env['WHATSAPP_API_URL'];
    const apiKey = process.env['WHATSAPP_API_KEY'];

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
      } catch (err: unknown) {
        status = 'FAILED';
        if (axios.isAxiosError(err)) {
          reason = err.response?.data?.message || err.message;
        } else {
          reason = err instanceof Error ? err.message : String(err);
        }
      }
    } else {
      status = 'SENT';
      reason = 'Simulated sandbox dispatch. Set WHATSAPP_API_URL and WHATSAPP_API_KEY in .env to unlock real message delivery.';
    }

    await insertWhatsAppLog({
      recipientNumber,
      messageContent,
      status,
      reason,
      templateName,
      parameters: parameters || {}
    });

    res.status(200).json({
      success: status === 'SENT',
      status,
      reason,
      content: messageContent
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('ERROR BROADCASTING WHATSAPP LOG:', error);
    res.status(500).json({ error: 'Failed to process WhatsApp request', details: errorMsg });
  }
});

app.get('/api/whatsapp/logs', async (req, res) => {
  try {
    const logs = await fetchWhatsAppLogs(100);
    res.status(200).json(logs);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Failed to query firestore whatsapp logs', details: errorMsg });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    redirect: false,
  }),
);

// Fallback all routes to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(join(browserDistFolder, 'index.html'));
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
const port = process.env['PORT'] || 4000;
app.listen(port, () => {
  console.log(`Node Express server listening on http://0.0.0.0:${port}`);
});

