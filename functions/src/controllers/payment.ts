import { Request, Response } from 'express';
import prisma from '../config/database';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth';
import { getSettingsService } from '../modules/settings/settings.service';
import { createOrder, restoreInventory } from './order';
import { dispatchOrderNotifications } from '../services/orderNotification.service';

// Helper to validate UUID format
const isValidUuid = (val: any): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

// Helper to get payment settings
const getPaymentSettings = async () => {
  const settings = await getSettingsService();
  return settings?.paymentGatewaySettings || {};
};

// Helper to deduct inventory when payment is successful
const deductInventory = async (tx: any, orderId: string) => {
  const items = await tx.orderItem.findMany({
    where: { orderId },
  });

  for (const item of items) {
    // 1. Deduct from main Warehouse Inventory
    const warehouse = await tx.warehouse.findFirst();
    if (warehouse) {
      const inventory = await tx.inventory.findFirst({
        where: {
          productId: item.productId,
          variantId: item.variantId,
          warehouseId: warehouse.id,
        },
      });

      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        // Record inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            transactionType: 'DECREMENT',
            quantity: item.quantity,
            referenceId: orderId,
            notes: `Stock deducted for Order ${orderId}`,
          },
        });
      }
    }

    // 2. Deduct from Product.stock
    if (item.productId) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    // 3. Deduct from ProductVariant.stock (if variant exists)
    if (item.variantId) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }
  }
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
    const rzConfig = settings.paymentMethods?.razorpay || {};

    const keyId = (rzConfig.keyId && rzConfig.keyId.trim()) || process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY || '';
    const keySecret = (rzConfig.keySecret && rzConfig.keySecret.trim()) || process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || '';

    // Razorpay amount is in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(Number(order.totalAmount) * 100);

    let data: any = null;
    let isRealOrder = false;

    const isMockKey =
      !keyId ||
      keyId === 'YOUR_KEY_ID' ||
      keyId.startsWith('rzp_test_mock') ||
      process.env.RAZORPAY_MOCK_MODE === 'true';

    if (!isMockKey) {
      // Call Razorpay API using keyId (and keySecret if available)
      try {
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

        const resBody = (await response.json()) as any;

        if (response.ok && resBody.id) {
          data = resBody;
          isRealOrder = true;
        } else {
          console.warn(`[Razorpay API Notice] Status ${response.status} (${resBody.error?.description || 'Notice'}). Operating in Direct API Key Mode for Key ID "${keyId}".`);
        }
      } catch (fetchErr: any) {
        console.warn(`[Razorpay Network Notice] ${fetchErr.message}. Operating in Direct API Key Mode.`);
      }
    }

    if (!data) {
      data = {
        id: 'order_mock_' + Math.random().toString(36).substring(2, 16),
        entity: 'order',
        amount: amountInPaise,
        amount_paid: 0,
        amount_due: amountInPaise,
        currency: settings.currency || 'INR',
        receipt: order.orderNumber,
        status: 'created',
        attempts: 0,
        notes: [],
        created_at: Math.floor(Date.now() / 1000)
      };
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
        id: isRealOrder ? data.id : null,
        razorpayOrderId: isRealOrder ? data.id : null,
        amount: amountInPaise,
        keyId: keyId || 'rzp_test_mock',
        isRealOrder: isRealOrder,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Payment processing failed' });
  }
};

export const processOrderCreation = async (tx: any, payload: any) => {
  const {
    orderId,
    customerId,
    orderNumber,
    items,
    shippingAddress,
    billingAddress,
    paymentMethod,
    paymentStatus,
    paymentGateway,
    paymentId,
    transactionId,
    gatewayResponse,
    subtotal,
    shippingAmount,
    taxAmount,
    discountAmount,
    codCharge,
    totalAmount,
    notes,
    gstNumber,
    companyName,
    userId,
    isGuest
  } = payload;

  let shippingAddressId: string | null = null;
  let billingAddressId: string | null = null;

  if (shippingAddress) {
    const isObj = typeof shippingAddress === 'object' && shippingAddress !== null;
    const addrLine1 = isObj ? (shippingAddress.addressLine1 || shippingAddress.address || 'N/A') : shippingAddress;
    const addrLine2 = isObj ? (shippingAddress.addressLine2 || '') : '';
    const city = isObj ? (shippingAddress.city || 'N/A') : 'City';
    const state = isObj ? (shippingAddress.state || 'N/A') : 'State';
    const postalCode = isObj ? (shippingAddress.postalCode || shippingAddress.pincode || 'N/A') : '100001';
    const country = isObj ? (shippingAddress.country || 'India') : 'India';

    const shipAddr = await tx.customerAddress.create({
      data: {
        customerId,
        addressLine1: addrLine1,
        addressLine2: addrLine2,
        city,
        state,
        postalCode,
        country,
        isDefault: !userId
      }
    });
    shippingAddressId = shipAddr.id;
    billingAddressId = shipAddr.id;

    if (billingAddress) {
      const isBillObj = typeof billingAddress === 'object' && billingAddress !== null;
      const billAddrLine1 = isBillObj ? (billingAddress.addressLine1 || billingAddress.address || 'N/A') : billingAddress;
      const billAddrLine2 = isBillObj ? (billingAddress.addressLine2 || '') : '';
      const billCity = isBillObj ? (billingAddress.city || 'N/A') : 'City';
      const billState = isBillObj ? (billingAddress.state || 'N/A') : 'State';
      const billPostalCode = isBillObj ? (billingAddress.postalCode || billingAddress.pincode || 'N/A') : '100001';
      const billCountry = isBillObj ? (billingAddress.country || 'India') : 'India';

      if (billAddrLine1 !== addrLine1) {
        const billAddr = await tx.customerAddress.create({
          data: {
            customerId,
            addressLine1: billAddrLine1,
            addressLine2: billAddrLine2,
            city: billCity,
            state: billState,
            postalCode: billPostalCode,
            country: billCountry,
            isDefault: false
          }
        });
        billingAddressId = billAddr.id;
      }
    }
  }

  const isConfirmed = String(paymentStatus).toUpperCase() === 'PAID' || String(paymentStatus).toUpperCase() === 'SUCCESS';
  const orderStatus = isConfirmed ? 'CONFIRMED' : 'PENDING';

  const orderData: any = {
    customerId,
    orderNumber,
    status: orderStatus,
    paymentMethod,
    paymentStatus: isConfirmed ? 'PAID' : 'PENDING',
    paymentGateway: paymentGateway || (paymentMethod === 'RAZORPAY' ? 'razorpay' : paymentMethod === 'CASHFREE' ? 'cashfree' : 'cod'),
    paymentId: paymentId || null,
    transactionId: transactionId || null,
    gatewayResponse: typeof gatewayResponse === 'object' ? JSON.stringify(gatewayResponse) : (gatewayResponse || null),
    totalAmount,
    taxAmount: taxAmount || 0,
    shippingAmount: shippingAmount || 0,
    discountAmount: discountAmount || 0,
    codCharge: codCharge || 0,
    paidAmount: isConfirmed ? totalAmount : 0,
    shippingAddressId,
    billingAddressId,
    notes: notes || null,
    gstNumber: gstNumber || null,
    companyName: companyName || null,
    items: {
      create: items.map((it: any) => ({
        productId: it.productId,
        variantId: it.variantId || null,
        quantity: it.quantity,
        unitPrice: it.unitPrice || it.price,
        totalPrice: it.totalPrice || (it.quantity * (it.unitPrice || it.price))
      }))
    },
    statusHistory: {
      create: [{
        status: orderStatus,
        comments: isConfirmed ? 'Order placed and payment verified successfully.' : (isGuest ? 'Guest COD Order created' : 'COD Order created'),
        createdBy: userId || null
      }]
    },
    payments: {
      create: [{
        paymentMethod,
        transactionId: transactionId || null,
        amount: totalAmount,
        status: isConfirmed ? 'PAID' : 'PENDING'
      }]
    }
  };

  if (orderId) {
    orderData.id = orderId;
  }

  const orderEntity = await tx.order.create({
    data: orderData,
    include: { items: true, payments: true }
  });

  // Deduct inventory when valid order is created
  await deductInventory(tx, orderEntity.id);

  return orderEntity;
};

// Razorpay Signature Verification
export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  if (!razorpay_payment_id) {
    return res.status(400).json({ error: 'Payment ID is required' });
  }

  try {
    const settings = await getPaymentSettings();
    const rzConfig = settings.paymentMethods?.razorpay || {};
    const keySecret = (rzConfig.keySecret && rzConfig.keySecret.trim()) || process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || '';

    const isMock = razorpay_signature === 'mock_signature' || (razorpay_order_id && razorpay_order_id.startsWith('order_mock_'));
    
    // Validate signature ONLY if keySecret is configured and signature provided
    if (keySecret && razorpay_signature && !isMock && razorpay_order_id) {
      const generated = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generated !== razorpay_signature) {
        return res.status(400).json({ error: 'Your payment was not completed. Signature verification failed.' });
      }
    }

    // Find the transaction record or abandoned checkout record
    const transaction = await prisma.transactionHistory.findFirst({
      where: { gatewayOrderId: razorpay_order_id },
    });

    const checkout = await prisma.abandonedCheckout.findFirst({
      where: {
        OR: [
          { sessionId: razorpay_order_id },
          { id: razorpay_order_id }
        ]
      }
    });

    if (!transaction && !checkout) {
      return res.status(404).json({ error: 'Payment session transaction record not found' });
    }

    if (transaction?.orderId) {
      const existingOrder = await prisma.order.findUnique({ where: { id: transaction.orderId } });
      if (existingOrder) {
        return res.status(200).json({ success: true, message: 'Payment already processed', data: { orderId: existingOrder.id } });
      }
    }

    const payload = (checkout?.checkoutData as any) || (transaction?.requestPayload as any);
    if (!payload || !payload.items) {
      return res.status(400).json({ error: 'Checkout payload unavailable for order creation' });
    }

    const targetOrderId = checkout?.id;

    // Wrap in a transaction to create Order, Payment, update TransactionHistory & AbandonedCheckout
    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await processOrderCreation(tx, {
        ...payload,
        orderId: targetOrderId,
        paymentStatus: 'PAID',
        paymentMethod: 'RAZORPAY',
        paymentGateway: 'razorpay',
        paymentId: razorpay_payment_id,
        transactionId: razorpay_payment_id,
        gatewayResponse: req.body,
        paidAmount: payload.totalAmount
      });

      if (transaction) {
        await tx.transactionHistory.update({
          where: { id: transaction.id },
          data: {
            orderId: order.id,
            gatewayPaymentId: razorpay_payment_id,
            status: 'Captured',
            paymentStatus: 'PAID',
            responsePayload: { ...(transaction.responsePayload as any), verifyPayload: req.body },
          },
        });
      }

      if (checkout) {
        await tx.abandonedCheckout.update({
          where: { id: checkout.id },
          data: {
            paymentStatus: 'PAID',
            checkoutStep: 'COMPLETED',
            recoveryStatus: 'Converted',
            recoveredOrderId: order.id
          }
        });
      }

      return order;
    });

    // Dispatch notifications after successful payment verification (non-blocking)
    dispatchOrderNotifications(createdOrder.id).catch((notifErr) => {
      console.error('[RazorpayVerify] Notification pipeline error:', notifErr);
    });

    return res.status(200).json({ success: true, data: { orderId: createdOrder.id } });
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
export const handleRazorpayWebhook = async (req: any, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

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

    const event = req.body.event;
    const payload = req.body.payload;
    const paymentEntity = payload?.payment?.entity;
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'] as string;
      if (signature) {
        const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        const expected = crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');

        if (expected !== signature) {
          await prisma.paymentWebhookLog.update({
            where: { id: log.id },
            data: { status: 'signature_failed' },
          });
          return res.status(400).send('Invalid signature');
        }
      }
    }

    if (req.body?.event === 'payment.captured' || req.body?.event === 'order.paid') {
      const paymentEntity = req.body?.payload?.payment?.entity;
      const gatewayOrderId = paymentEntity?.order_id;
      const gatewayPaymentId = paymentEntity?.id;

      if (gatewayOrderId) {
        const transaction = await prisma.transactionHistory.findFirst({
          where: { gatewayOrderId },
        });
        const checkout = await prisma.abandonedCheckout.findFirst({
          where: { OR: [{ sessionId: gatewayOrderId }, { id: gatewayOrderId }] }
        });

        if (transaction || checkout) {
          let orderId = transaction?.orderId || checkout?.recoveredOrderId;
          if (!orderId) {
            const payload = (checkout?.checkoutData as any) || (transaction?.requestPayload as any);
            if (payload && payload.items) {
              const createdOrder = await prisma.$transaction(async (tx) => {
                const order = await processOrderCreation(tx, {
                  ...payload,
                  orderId: checkout?.id,
                  paymentStatus: 'PAID',
                  paymentMethod: 'RAZORPAY',
                  paymentGateway: 'razorpay',
                  paymentId: gatewayPaymentId,
                  transactionId: gatewayPaymentId,
                  gatewayResponse: req.body,
                  paidAmount: payload.totalAmount
                });
                if (transaction) {
                  await tx.transactionHistory.update({
                    where: { id: transaction.id },
                    data: { orderId: order.id, status: 'Captured', paymentStatus: 'PAID', gatewayPaymentId }
                  });
                }
                if (checkout) {
                  await tx.abandonedCheckout.update({
                    where: { id: checkout.id },
                    data: { paymentStatus: 'PAID', checkoutStep: 'COMPLETED', recoveryStatus: 'Converted', recoveredOrderId: order.id }
                  });
                }
                return order;
              });
              orderId = createdOrder.id;
            }
          } else {
            await prisma.order.update({
              where: { id: orderId },
              data: { status: 'CONFIRMED', paymentStatus: 'PAID' }
            });
          }

          if (orderId) {
            dispatchOrderNotifications(orderId).catch((notifErr) => {
              console.error('[RazorpayWebhook] Notification pipeline error:', notifErr);
            });
          }
        }
      }
    }

    await prisma.paymentWebhookLog.update({
      where: { id: log.id },
      data: { status: 'processed' },
    });

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
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
      const gatewayOrderId = String(order.cf_order_id);
      const gatewayPaymentId = String(payment.cf_payment_id);

      const transaction = await prisma.transactionHistory.findFirst({
        where: { gatewayOrderId },
      });
      const checkout = await prisma.abandonedCheckout.findFirst({
        where: { OR: [{ sessionId: gatewayOrderId }, { id: gatewayOrderId }] }
      });

      if (transaction || checkout) {
        let orderId = transaction?.orderId || checkout?.recoveredOrderId;
        if (!orderId) {
          const payload = (checkout?.checkoutData as any) || (transaction?.requestPayload as any);
          if (payload && payload.items) {
            const createdOrder = await prisma.$transaction(async (tx) => {
              const newOrd = await processOrderCreation(tx, {
                ...payload,
                orderId: checkout?.id,
                paymentStatus: 'PAID',
                paymentMethod: 'CASHFREE',
                paymentGateway: 'cashfree',
                paymentId: gatewayPaymentId,
                transactionId: gatewayPaymentId,
                gatewayResponse: req.body,
                paidAmount: payload.totalAmount
              });

              if (transaction) {
                await tx.transactionHistory.update({
                  where: { id: transaction.id },
                  data: { orderId: newOrd.id, status: 'Captured', paymentStatus: 'PAID', gatewayPaymentId }
                });
              }

              if (checkout) {
                await tx.abandonedCheckout.update({
                  where: { id: checkout.id },
                  data: { paymentStatus: 'PAID', checkoutStep: 'COMPLETED', recoveryStatus: 'Converted', recoveredOrderId: newOrd.id }
                });
              }

              return newOrd;
            });
            orderId = createdOrder.id;
          }
        } else {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CONFIRMED', paymentStatus: 'PAID' }
          });
        }

        if (orderId) {
          dispatchOrderNotifications(orderId).catch((notifErr) => {
            console.error('[CashfreeWebhook] Notification pipeline error:', notifErr);
          });
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

    if (!tx || !tx.orderId) {
      return res.status(404).json({ error: 'Transaction or associated order not found' });
    }

    // Record the refund in transaction history and restore inventory
    await prisma.$transaction(async (txPrisma) => {
      await txPrisma.transactionHistory.create({
        data: {
          orderId: tx.orderId!,
          customerId: tx.customerId,
          paymentMethod: tx.paymentMethod,
          gatewayName: tx.gatewayName,
          gatewayOrderId: tx.gatewayOrderId,
          amount: Number(amount),
          status: 'Refunded',
          paymentStatus: 'REFUNDED',
          responsePayload: gatewayResponse,
        },
      });

      await txPrisma.order.update({
        where: { id: tx.orderId! },
        data: { status: 'CANCELLED' },
      });

      await restoreInventory(txPrisma, tx.orderId!);
    });

    return res.status(200).json({ success: true, data: gatewayResponse });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const createOrderAndPayment = async (req: any, res: Response) => {
  const {
    items,
    shippingAddress,
    billingAddress,
    paymentMethod,
    couponCode,
    notes,
    businessPurchase,
    contactDetails,
    guestName,
    guestEmail,
    guestPhone,
    totalAmount: frontendTotal
  } = req.body;

  const userId = req.user?.id;
  const resolvedName = contactDetails?.name || guestName || req.body.name || '';
  const resolvedEmail = contactDetails?.email || guestEmail || req.body.email || '';
  const resolvedPhone = contactDetails?.phone || guestPhone || req.body.phone || '';
  const isGuest = !userId;

  if (!items || items.length === 0 || !shippingAddress || !paymentMethod || (isGuest && (!resolvedName || !resolvedEmail || !resolvedPhone))) {
    return res.status(400).json({ error: 'Missing required checkout information' });
  }

  try {
    // 1. Resolve customer
    let customerIdToUse: string | null = null;
    if (userId) {
      let customer = await prisma.customer.findFirst({ where: { userId } });
      if (!customer) {
        customer = await prisma.customer.create({ data: { userId, customerType: 'retail' } });
      }
      customerIdToUse = customer.id;
    } else {
      const email = resolvedEmail || `guest-${Date.now()}@3dgalaxy.com`;
      const name = resolvedName || 'Guest Customer';
      const phone = resolvedPhone || '';

      let guestUser = await prisma.user.findFirst({ where: { email } });
      if (!guestUser) {
        let guestRole = await prisma.role.findFirst({ where: { name: 'Guest' } });
        if (!guestRole) {
          guestRole = await prisma.role.create({ data: { name: 'Guest', description: 'Guest customer role' } });
        }
        guestUser = await prisma.user.create({
          data: {
            email,
            firstName: name.split(' ')[0] || 'Guest',
            lastName: name.split(' ').slice(1).join(' ') || 'Customer',
            passwordHash: '',
            isActive: true,
            roles: { create: { roleId: guestRole.id } }
          }
        });
      }

      let guestCust = await prisma.customer.findFirst({ where: { userId: guestUser.id } });
      if (!guestCust) {
        guestCust = await prisma.customer.create({
          data: { userId: guestUser.id, phone, customerType: 'guest' }
        });
      }
      customerIdToUse = guestCust.id;
    }

    // 2. Validate products and calculate server-side pricing
    let subtotal = 0;
    const parsedItems = [];

    for (const it of items) {
      const prod = await prisma.product.findUnique({
        where: { id: it.productId },
        select: { id: true, name: true, basePrice: true, salePrice: true, dealerPrice: true, codAvailable: true, isActive: true, stock: true, deletedAt: true }
      });

      if (!prod || !prod.isActive || prod.deletedAt) {
        return res.status(400).json({ error: `Product "${it.productId}" is no longer available.` });
      }

      if (paymentMethod === 'COD' && prod.codAvailable === false) {
        return res.status(400).json({
          error: `Cash on Delivery (COD) is unavailable for "${prod.name}". Please choose online payment.`
        });
      }

      let price = prod.salePrice ? Number(prod.salePrice) : Number(prod.basePrice);
      if (userId && customerIdToUse) {
        const customerDb = await prisma.customer.findUnique({ where: { id: customerIdToUse } });
        if (customerDb && customerDb.customerType === 'DEALER') {
          price = prod.dealerPrice ? Number(prod.dealerPrice) : Number(prod.basePrice);
        }
      }

      if (it.variantId) {
        const variant = await prisma.productVariant.findUnique({ where: { id: it.variantId } });
        if (variant) price = Number(variant.price);
      }

      subtotal += price * it.quantity;
      parsedItems.push({
        productId: it.productId,
        variantId: it.variantId || null,
        quantity: it.quantity,
        unitPrice: price,
        totalPrice: price * it.quantity
      });
    }

    // Server-side calculation
    const shippingAmount = subtotal >= 1000 ? 0 : 99;
    const taxAmount = 0;
    let discountAmount = 0;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: String(couponCode).toUpperCase() } });
      if (coupon && coupon.isActive) {
        if (!coupon.minOrderAmount || subtotal >= Number(coupon.minOrderAmount)) {
          if (coupon.discountType === 'PERCENTAGE') {
            discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
            if (coupon.maxDiscountAmt && discountAmount > Number(coupon.maxDiscountAmt)) {
              discountAmount = Number(coupon.maxDiscountAmt);
            }
          } else {
            discountAmount = Number(coupon.discountValue);
          }
        }
      }
    }

    let codCharge = 0;
    if (paymentMethod === 'COD') {
      if (subtotal > 2500) {
        return res.status(400).json({
          error: 'Cash on Delivery is available only for eligible products with a cart total of ₹2,500 or below.'
        });
      }
      codCharge = 100;
    }

    const calculatedTotal = subtotal + shippingAmount + taxAmount + codCharge - discountAmount;
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ORD-2026-${randomSuffix.toString().padStart(6, '0')}`;

    const checkoutPayload: any = {
      customerId: customerIdToUse,
      orderNumber,
      items: parsedItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      subtotal,
      shippingAmount,
      taxAmount,
      discountAmount,
      codCharge,
      totalAmount: calculatedTotal,
      notes: notes || req.body.orderNotes || null,
      gstNumber: businessPurchase?.gstNumber || req.body.gstNumber || null,
      companyName: businessPurchase?.companyName || req.body.companyName || null,
      userId,
      isGuest,
      resolvedName,
      resolvedEmail,
      resolvedPhone
    };

    // 3. Handle COD vs Online Payment
    if (paymentMethod === 'COD') {
      const createdOrder = await prisma.$transaction(async (tx) => {
        return await processOrderCreation(tx, {
          ...checkoutPayload,
          paymentStatus: 'PENDING',
          paidAmount: 0
        });
      });

      // Dispatch notifications for COD order placement
      dispatchOrderNotifications(createdOrder.id).catch(err => console.error('[COD Notification Error]:', err));

      return res.status(200).json({
        success: true,
        data: {
          id: createdOrder.id,
          orderId: createdOrder.id,
          order: createdOrder
        }
      });
    }

    // Online Payment: Create AbandonedCheckout session, DO NOT create Order yet!
    const settings = await getPaymentSettings();
    const checkoutSessionId = 'chk_' + Math.random().toString(36).substring(2, 16) + Date.now();

    let gatewayOrderId = '';
    let gatewayData: any = null;
    let isRealOrder = false;

    if (paymentMethod === 'RAZORPAY') {
      const rzConfig = settings.paymentMethods?.razorpay || {};
      const keyId = (rzConfig.keyId && rzConfig.keyId.trim()) || process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY || '';
      const keySecret = (rzConfig.keySecret && rzConfig.keySecret.trim()) || process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || '';
      const amountInPaise = Math.round(calculatedTotal * 100);

      const isMockKey =
        !keyId ||
        keyId === 'YOUR_KEY_ID' ||
        keyId.startsWith('rzp_test_mock') ||
        process.env.RAZORPAY_MOCK_MODE === 'true';

      if (!isMockKey) {
        try {
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
              receipt: orderNumber,
            }),
          });
          const resBody = (await response.json()) as any;
          if (response.ok && resBody.id) {
            gatewayData = resBody;
            gatewayOrderId = resBody.id;
            isRealOrder = true;
          }
        } catch (fetchErr: any) {
          console.warn('[Razorpay API Notice]', fetchErr.message);
        }
      }

      if (!gatewayData) {
        gatewayOrderId = 'order_mock_' + Math.random().toString(36).substring(2, 16);
        gatewayData = {
          id: gatewayOrderId,
          entity: 'order',
          amount: amountInPaise,
          amount_paid: 0,
          amount_due: amountInPaise,
          currency: settings.currency || 'INR',
          receipt: orderNumber,
          status: 'created',
          created_at: Math.floor(Date.now() / 1000)
        };
      }

      checkoutPayload.gatewayOrderId = gatewayOrderId;

      // Create AbandonedCheckout session
      const abandonedCheckout = await prisma.abandonedCheckout.create({
        data: {
          customerId: isValidUuid(customerIdToUse) ? customerIdToUse : null,
          sessionId: String(gatewayOrderId || checkoutSessionId),
          email: resolvedEmail,
          mobile: resolvedPhone,
          customerName: resolvedName,
          cartItems: items,
          checkoutData: checkoutPayload,
          cartTotal: calculatedTotal,
          shippingCharge: shippingAmount,
          tax: taxAmount,
          discount: discountAmount,
          paymentMethod: 'RAZORPAY',
          paymentStatus: 'Initiated',
          checkoutStep: 'PAYMENT_INITIATED',
          recoveryStatus: 'Active',
        }
      });

      // Save TransactionHistory record
      await prisma.transactionHistory.create({
        data: {
          orderId: null,
          customerId: isValidUuid(customerIdToUse) ? customerIdToUse : null,
          paymentMethod: 'RAZORPAY',
          gatewayName: 'razorpay',
          gatewayOrderId,
          amount: calculatedTotal,
          currency: settings.currency || 'INR',
          status: 'Initiated',
          paymentStatus: 'Pending',
          requestPayload: { checkoutSessionId, gatewayOrderId, amountInPaise },
          responsePayload: gatewayData,
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          id: gatewayOrderId,
          razorpayOrderId: gatewayOrderId,
          amount: amountInPaise,
          keyId: keyId || 'rzp_test_mock',
          isRealOrder,
          dbOrderId: abandonedCheckout.id,
          checkoutId: abandonedCheckout.id,
        }
      });

    } else if (paymentMethod === 'CASHFREE') {
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

      const payload = {
        order_amount: Number(calculatedTotal),
        order_currency: settings.currency || 'INR',
        order_id: orderNumber,
        customer_details: {
          customer_id: customerIdToUse || 'GUEST_' + Date.now(),
          customer_phone: resolvedPhone || '9999999999',
          customer_email: resolvedEmail || 'guest@example.com',
        },
        order_meta: {
          return_url: `${(req.headers.origin || 'http://localhost:4200').replace(/^http:\/\//i, 'https://')}/order-success?orderId=${checkoutSessionId}`,
        },
      };

      const cfRes = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': '2023-08-01',
        },
        body: JSON.stringify(payload),
      });

      const cfData = (await cfRes.json()) as any;
      if (!cfRes.ok) {
        throw new Error(cfData.message || 'Cashfree order creation failed');
      }

      gatewayOrderId = cfData.cf_order_id;
      checkoutPayload.gatewayOrderId = gatewayOrderId;

      const abandonedCheckout = await prisma.abandonedCheckout.create({
        data: {
          customerId: isValidUuid(customerIdToUse) ? customerIdToUse : null,
          sessionId: String(gatewayOrderId || checkoutSessionId),
          email: resolvedEmail,
          mobile: resolvedPhone,
          customerName: resolvedName,
          cartItems: items,
          checkoutData: checkoutPayload,
          cartTotal: calculatedTotal,
          shippingCharge: shippingAmount,
          tax: taxAmount,
          discount: discountAmount,
          paymentMethod: 'CASHFREE',
          paymentStatus: 'Initiated',
          checkoutStep: 'PAYMENT_INITIATED',
          recoveryStatus: 'Active',
        }
      });

      await prisma.transactionHistory.create({
        data: {
          orderId: null,
          customerId: isValidUuid(customerIdToUse) ? customerIdToUse : null,
          paymentMethod: 'CASHFREE',
          gatewayName: 'cashfree',
          gatewayOrderId: String(gatewayOrderId),
          amount: calculatedTotal,
          currency: settings.currency || 'INR',
          status: 'Initiated',
          paymentStatus: 'Pending',
          requestPayload: payload,
          responsePayload: cfData,
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          paymentSessionId: cfData.payment_session_id,
          cfOrderId: cfData.cf_order_id,
          orderId: abandonedCheckout.id,
          checkoutId: abandonedCheckout.id,
        }
      });
    } else {
      return res.status(400).json({ error: 'Unsupported payment method: ' + paymentMethod });
    }

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
