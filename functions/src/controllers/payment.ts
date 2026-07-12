import { Request, Response } from 'express';
import prisma from '../config/database';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth';
import { getSettingsService } from '../modules/settings/settings.service';

// Helper to get payment settings
const getPaymentSettings = async () => {
  const settings = await getSettingsService();
  return settings?.paymentGatewaySettings || {};
};

// Razorpay Order Creation
export const createRazorpayOrder = async (req: Request, res: Response) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { include: { user: true } } },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const settings = await getPaymentSettings();
    const rzConfig = settings.paymentMethods?.razorpay;

    if (!rzConfig || !rzConfig.enabled) {
      return res.status(400).json({ error: 'Razorpay gateway is not enabled' });
    }

    const keyId = rzConfig.keyId;
    const keySecret = rzConfig.keySecret;

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Razorpay keys not configured' });
    }

    // Razorpay amount is in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(Number(order.totalAmount) * 100);

    // Call Razorpay API
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: settings.currency || 'INR',
        receipt: order.orderNumber,
      }),
    });

    const data = (await response.json()) as any;
    if (!response.ok) {
      throw new Error(data.error?.description || 'Razorpay order creation failed');
    }

    // Save transaction history record
    await prisma.transactionHistory.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        paymentMethod: 'RAZORPAY',
        gatewayName: 'razorpay',
        gatewayOrderId: data.id,
        amount: order.totalAmount,
        currency: settings.currency || 'INR',
        status: 'Initiated',
        paymentStatus: 'Pending',
        requestPayload: { orderId, amountInPaise },
        responsePayload: data,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        razorpayOrderId: data.id,
        amount: amountInPaise,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Razorpay Signature Verification
export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Payment response parameters are required' });
  }

  try {
    const settings = await getPaymentSettings();
    const rzConfig = settings.paymentMethods?.razorpay;

    if (!rzConfig) {
      return res.status(400).json({ error: 'Razorpay configuration missing' });
    }

    const generated = crypto
      .createHmac('sha256', rzConfig.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated !== razorpay_signature) {
      return res.status(400).json({ error: 'Signature verification failed' });
    }

    // Find the transaction record
    const transaction = await prisma.transactionHistory.findFirst({
      where: { gatewayOrderId: razorpay_order_id },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction record not found' });
    }

    // Wrap in a transaction to update status
    await prisma.$transaction([
      prisma.transactionHistory.update({
        where: { id: transaction.id },
        data: {
          gatewayPaymentId: razorpay_payment_id,
          status: 'Captured',
          paymentStatus: 'PAID',
          responsePayload: { ...(transaction.responsePayload as any), verifyPayload: req.body },
        },
      }),
      prisma.order.update({
        where: { id: transaction.orderId },
        data: {
          status: 'CONFIRMED',
        },
      }),
      prisma.payment.create({
        data: {
          orderId: transaction.orderId,
          paymentMethod: 'RAZORPAY',
          transactionId: razorpay_payment_id,
          amount: transaction.amount,
          status: 'PAID',
        },
      }),
    ]);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Cashfree Order Creation
export const createCashfreeOrder = async (req: Request, res: Response) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { include: { user: true } } },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const settings = await getPaymentSettings();
    const cfConfig = settings.paymentMethods?.cashfree;

    if (!cfConfig || !cfConfig.enabled) {
      return res.status(400).json({ error: 'Cashfree gateway is not enabled' });
    }

    const appId = cfConfig.appId;
    const secretKey = cfConfig.secretKey;
    const sandbox = cfConfig.sandbox;

    if (!appId || !secretKey) {
      return res.status(500).json({ error: 'Cashfree keys not configured' });
    }

    const baseUrl = sandbox
      ? 'https://sandbox.cashfree.com/pg/orders'
      : 'https://api.cashfree.com/pg/orders';

    const customerDetails = {
      customer_id: order.customerId || 'GUEST_' + Date.now(),
      customer_phone: order.customer?.phone || '9999999999',
      customer_email: order.customer?.user?.email || 'guest@example.com',
    };

    const payload = {
      order_amount: Number(order.totalAmount),
      order_currency: settings.currency || 'INR',
      order_id: order.orderNumber,
      customer_details: customerDetails,
      order_meta: {
        return_url: `${(req.headers.origin || 'http://localhost:4200').replace(/^http:\/\//i, 'https://')}/order-success?order_id=${order.id}`,
      },
    };

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as any;
    if (!response.ok) {
      throw new Error(data.message || 'Cashfree order creation failed');
    }

    // Save transaction history
    await prisma.transactionHistory.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        paymentMethod: 'CASHFREE',
        gatewayName: 'cashfree',
        gatewayOrderId: data.cf_order_id,
        amount: order.totalAmount,
        currency: settings.currency || 'INR',
        status: 'Initiated',
        paymentStatus: 'Pending',
        requestPayload: payload,
        responsePayload: data,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        paymentSessionId: data.payment_session_id,
        cfOrderId: data.cf_order_id,
        orderId: order.id,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Cash on Delivery Order logic
export const createCODOrder = async (req: Request, res: Response) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await prisma.$transaction([
      prisma.transactionHistory.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          paymentMethod: 'COD',
          gatewayName: 'cod',
          amount: order.totalAmount,
          status: 'Pending',
          paymentStatus: 'PENDING',
        },
      }),
      prisma.payment.create({
        data: {
          orderId: order.id,
          paymentMethod: 'COD',
          amount: order.totalAmount,
          status: 'PENDING',
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PENDING',
        },
      }),
    ]);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Razorpay Webhook
export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  try {
    const settings = await getPaymentSettings();
    const webhookSecret = settings.paymentMethods?.razorpay?.webhookSecret;

    // Log the webhook
    const log = await prisma.paymentWebhookLog.create({
      data: {
        gateway: 'razorpay',
        headers: req.headers as any,
        payload: req.body,
        status: 'received',
      },
    });

    if (webhookSecret && signature) {
      const shasum = crypto.createHmac('sha256', webhookSecret);
      shasum.update(rawBody);
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        await prisma.paymentWebhookLog.update({
          where: { id: log.id },
          data: { status: 'signature_failed' },
        });
        return res.status(400).send('Invalid signature');
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const gatewayOrderId = paymentEntity?.order_id;
      const gatewayPaymentId = paymentEntity?.id;

      if (gatewayOrderId) {
        const transaction = await prisma.transactionHistory.findFirst({
          where: { gatewayOrderId },
        });

        if (transaction) {
          await prisma.$transaction([
            prisma.transactionHistory.update({
              where: { id: transaction.id },
              data: {
                status: 'Captured',
                paymentStatus: 'PAID',
                gatewayPaymentId,
                responsePayload: { ...(transaction.responsePayload as any), webhookPayload: req.body },
              },
            }),
            prisma.order.update({
              where: { id: transaction.orderId },
              data: { status: 'CONFIRMED' },
            }),
            prisma.payment.upsert({
              where: { id: transaction.id }, // use transaction id since we maps it
              create: {
                id: transaction.id,
                orderId: transaction.orderId,
                paymentMethod: 'RAZORPAY',
                transactionId: gatewayPaymentId,
                amount: transaction.amount,
                status: 'PAID',
              },
              update: {
                status: 'PAID',
                transactionId: gatewayPaymentId,
              },
            }),
          ]);
        }
      }
    }

    await prisma.paymentWebhookLog.update({
      where: { id: log.id },
      data: { status: 'processed' },
    });

    return res.status(200).send('OK');
  } catch (error) {
    return res.status(500).send('Internal Error');
  }
};

// Cashfree Webhook
export const handleCashfreeWebhook = async (req: Request, res: Response) => {
  try {
    const settings = await getPaymentSettings();
    const webhookSecret = settings.paymentMethods?.cashfree?.webhookSecret;

    const log = await prisma.paymentWebhookLog.create({
      data: {
        gateway: 'cashfree',
        headers: req.headers as any,
        payload: req.body,
        status: 'received',
      },
    });

    // Verification for Cashfree v3 signature
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;

    if (webhookSecret && signature && timestamp) {
      const data = timestamp + JSON.stringify(req.body);
      const generated = crypto.createHmac('sha256', webhookSecret).update(data).digest('base64');

      if (generated !== signature) {
        await prisma.paymentWebhookLog.update({
          where: { id: log.id },
          data: { status: 'signature_failed' },
        });
        return res.status(400).send('Invalid signature');
      }
    }

    const { data } = req.body;
    const order = data?.order;
    const payment = data?.payment;

    if (order && payment && payment.payment_status === 'SUCCESS') {
      const gatewayOrderId = order.cf_order_id;
      const gatewayPaymentId = payment.cf_payment_id;

      const transaction = await prisma.transactionHistory.findFirst({
        where: { gatewayOrderId: String(gatewayOrderId) },
      });

      if (transaction) {
        await prisma.$transaction([
          prisma.transactionHistory.update({
            where: { id: transaction.id },
            data: {
              status: 'Captured',
              paymentStatus: 'PAID',
              gatewayPaymentId: String(gatewayPaymentId),
              responsePayload: { ...(transaction.responsePayload as any), webhookPayload: req.body },
            },
          }),
          prisma.order.update({
            where: { id: transaction.orderId },
            data: { status: 'CONFIRMED' },
          }),
          prisma.payment.upsert({
            where: { id: transaction.id },
            create: {
              id: transaction.id,
              orderId: transaction.orderId,
              paymentMethod: 'CASHFREE',
              transactionId: String(gatewayPaymentId),
              amount: transaction.amount,
              status: 'PAID',
            },
            update: {
              status: 'PAID',
              transactionId: String(gatewayPaymentId),
            },
          }),
        ]);
      }
    }

    await prisma.paymentWebhookLog.update({
      where: { id: log.id },
      data: { status: 'processed' },
    });

    return res.status(200).send('OK');
  } catch (error) {
    return res.status(500).send('Internal Error');
  }
};

// Customer transaction history
export const getCustomerHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { userId: req.user?.id },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const list = await prisma.transactionHistory.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Customer transaction detail
export const getCustomerTransaction = async (req: AuthenticatedRequest, res: Response) => {
  const { transactionId } = req.params;
  try {
    const customer = await prisma.customer.findFirst({
      where: { userId: req.user?.id },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const tx = await prisma.transactionHistory.findFirst({
      where: { id: transactionId, customerId: customer.id },
    });

    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.status(200).json(tx);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Admin Transactions list
export const getAdminTransactions = async (req: Request, res: Response) => {
  try {
    const list = await prisma.transactionHistory.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ status: 'success', success: true, message: 'success', data: list });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message, error: error.message });
  }
};

// Admin Webhook logs
export const getAdminWebhookLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.paymentWebhookLog.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });
    return res.status(200).json({ status: 'success', success: true, message: 'success', data: logs });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message, error: error.message });
  }
};

// Admin Transaction Detail
export const getAdminTransactionDetail = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const tx = await prisma.transactionHistory.findUnique({
      where: { id },
    });

    if (!tx) {
      return res.status(404).json({ status: 'error', success: false, message: 'Transaction not found', error: 'Transaction not found' });
    }

    return res.status(200).json({ status: 'success', success: true, message: 'success', data: tx });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Admin Refund action
export const handleAdminRefund = async (req: Request, res: Response) => {
  const { transactionId, amount } = req.body;

  if (!transactionId || !amount) {
    return res.status(400).json({ error: 'Transaction ID and amount are required' });
  }

  try {
    const tx = await prisma.transactionHistory.findUnique({
      where: { id: transactionId },
    });

    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Call Gateway specific refund endpoint
    const settings = await getPaymentSettings();

    let success = false;
    let gatewayResponse: any = null;

    if (tx.paymentMethod === 'RAZORPAY') {
      const rzConfig = settings.paymentMethods?.razorpay;
      if (rzConfig) {
        const auth = Buffer.from(`${rzConfig.keyId}:${rzConfig.keySecret}`).toString('base64');
        const response = await fetch(`https://api.razorpay.com/v1/payments/${tx.gatewayPaymentId}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({ amount: Math.round(Number(amount) * 100) }),
        });

        gatewayResponse = (await response.json()) as any;
        success = response.ok;
      }
    } else if (tx.paymentMethod === 'CASHFREE') {
      const cfConfig = settings.paymentMethods?.cashfree;
      if (cfConfig) {
        const baseUrl = cfConfig.sandbox
          ? 'https://sandbox.cashfree.com/pg/refunds'
          : 'https://api.cashfree.com/pg/refunds';

        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': cfConfig.appId,
            'x-client-secret': cfConfig.secretKey,
            'x-api-version': '2023-08-01',
          },
          body: JSON.stringify({
            refund_amount: Number(amount),
            refund_id: 'REF_' + Date.now(),
            order_id: tx.gatewayOrderId,
          }),
        });

        gatewayResponse = (await response.json()) as any;
        success = response.ok;
      }
    } else {
      // For COD or others, simulate success
      success = true;
      gatewayResponse = { message: 'Manual COD refund registered' };
    }

    if (!success) {
      return res.status(400).json({ error: 'Gateway refund request failed', details: gatewayResponse });
    }

    // Record the refund in transaction history
    await prisma.$transaction([
      prisma.transactionHistory.create({
        data: {
          orderId: tx.orderId,
          customerId: tx.customerId,
          paymentMethod: tx.paymentMethod,
          gatewayName: tx.gatewayName,
          gatewayOrderId: tx.gatewayOrderId,
          amount: Number(amount),
          status: 'Refunded',
          paymentStatus: 'REFUNDED',
          responsePayload: gatewayResponse,
        },
      }),
      prisma.order.update({
        where: { id: tx.orderId },
        data: { status: 'CANCELLED' }, // update status or keep as refunded
      }),
    ]);

    return res.status(200).json({ success: true, data: gatewayResponse });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
