import { Request, Response } from 'express';
import prisma from '../config/database';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getSettingsService } from '../modules/settings/settings.service';

export const createRazorpayOrder = async (req: Request, res: Response) => {
  const { orderId } = req.body;

  try {
    let orderWhere: any = { id: orderId };
    if (orderId.startsWith('B3D-') || orderId.startsWith('ORD-')) orderWhere = { orderNumber: orderId };
    const order = await prisma.order.findUnique({ where: orderWhere });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const settings = await getSettingsService();
    const paymentSettings = settings.payment;

    if (!paymentSettings || !paymentSettings.razorpayEnabled || !paymentSettings.razorpayKeyId || !paymentSettings.razorpayKeySecret) {
      return res.status(400).json({ success: false, error: 'Razorpay is not enabled or properly configured' });
    }

    const instance = new Razorpay({
      key_id: paymentSettings.razorpayKeyId,
      key_secret: paymentSettings.razorpayKeySecret,
    });

    const options = {
      amount: Math.round(order.totalAmount * 100), // amount in the smallest currency unit
      currency: "INR",
      receipt: order.orderNumber
    };

    const razorpayOrder = await instance.orders.create(options);

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.totalAmount,
        paymentMethod: 'RAZORPAY',
        status: 'PENDING',
        gatewayOrderId: razorpayOrder.id,
      }
    });

    return res.status(200).json({ success: true, data: { razorpayOrderId: razorpayOrder.id, amount: options.amount } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to create razorpay order', details: error.message });
  }
};

export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  try {
    const settings = await getSettingsService();
    const paymentSettings = settings.payment;

    if (!paymentSettings || !paymentSettings.razorpayKeySecret) {
      return res.status(400).json({ success: false, error: 'Razorpay configuration error' });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', paymentSettings.razorpayKeySecret).update(body.toString()).digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    const payment = await prisma.payment.findFirst({ where: { gatewayOrderId: razorpay_order_id } });
    if (!payment) {
      return res.status(400).json({ success: false, error: 'Payment record not found' });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId: razorpay_payment_id,
        status: 'Paid',
        paidAt: new Date(),
        transactionId: razorpay_payment_id
      }
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: 'Confirmed'
      }
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: payment.orderId,
        status: 'Confirmed',
        comments: 'Payment verified successfully via Razorpay.'
      }
    });

    return res.status(200).json({ success: true, message: 'Payment verified' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to verify payment', details: error.message });
  }
};

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const settings = await getSettingsService();
    const paymentSettings = settings.payment;

    if (!paymentSettings || !paymentSettings.razorpayWebhookSecret) {
      return res.status(400).json({ success: false, error: 'Webhook secret not configured' });
    }

    const shasum = crypto.createHmac('sha256', paymentSettings.razorpayWebhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== req.headers['x-razorpay-signature']) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    // Process webhook...
    const event = req.body.event;
    if (event === 'payment.captured') {
        const paymentEntity = req.body.payload.payment.entity;
        const razorpayOrderId = paymentEntity.order_id;
        
        const payment = await prisma.payment.findFirst({ where: { gatewayOrderId: razorpayOrderId } });
        if (payment && payment.status !== 'Paid') {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: 'Paid', paidAt: new Date(), gatewayPaymentId: paymentEntity.id, transactionId: paymentEntity.id }
            });
            await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'Confirmed' } });
        }
    } else if (event === 'payment.failed') {
        const paymentEntity = req.body.payload.payment.entity;
        const razorpayOrderId = paymentEntity.order_id;
        
        const payment = await prisma.payment.findFirst({ where: { gatewayOrderId: razorpayOrderId } });
        if (payment) {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: 'Failed', gatewayPaymentId: paymentEntity.id }
            });
        }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
