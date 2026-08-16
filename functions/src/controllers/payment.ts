import { Request, Response } from 'express';
import prisma from '../config/database';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth';
import { getSettingsService } from '../modules/settings/settings.service';
import { ShippingService } from '../services/shipping.service';
import { createOrder, restoreInventory } from './order';
import { dispatchOrderNotifications } from '../services/orderNotification.service';
import { generateNextOrderNumber } from '../utils/orderNumber';
import { logger } from '../utils/logger';

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
  let {
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

  if (!orderNumber || orderNumber.startsWith('ORD-')) {
    orderNumber = await generateNextOrderNumber(tx);
  }

  let shippingAddressId: string | null = null;
  let billingAddressId: string | null = null;

  const shipObj = (typeof shippingAddress === 'object' && shippingAddress !== null)
    ? shippingAddress
    : (payload.shippingAddressSnapshot && typeof payload.shippingAddressSnapshot === 'object' ? payload.shippingAddressSnapshot : null);

  const customerName = payload.resolvedName || payload.contactDetails?.name || payload.guestName || payload.name || '';
  const customerPhone = payload.resolvedPhone || payload.contactDetails?.phone || payload.guestPhone || payload.phone || '';

  if (shippingAddress || shipObj) {
    const name = shipObj ? (shipObj.fullName || shipObj.name || customerName || '') : customerName;
    const phone = shipObj ? (shipObj.phone || shipObj.mobile || customerPhone || '') : customerPhone;
    const addressType = shipObj ? (shipObj.addressType || 'home') : 'home';

    const rawLine1 = shipObj
      ? (shipObj.addressLine1 || shipObj.street || (shipObj.houseNo ? `${shipObj.houseNo || ''} ${shipObj.street || ''}`.trim() : (shipObj.address || 'N/A')))
      : (typeof shippingAddress === 'string' ? shippingAddress : 'N/A');
    const addrLine2 = shipObj ? (shipObj.addressLine2 || shipObj.landmark || '') : '';
    const city = shipObj ? (shipObj.city || 'N/A') : 'N/A';
    const state = shipObj ? (shipObj.state || 'N/A') : 'N/A';
    const postalCode = shipObj ? (shipObj.postalCode || shipObj.pincode || 'N/A') : 'N/A';
    const country = shipObj ? (shipObj.country || 'India') : 'India';

    let formattedLine1 = rawLine1;
    if (!rawLine1.includes('|')) {
      formattedLine1 = `${name || 'Customer'} | ${phone || ''} | ${addressType} | ${rawLine1}`.trim();
    }

    let shipAddr = await tx.customerAddress.findFirst({
      where: {
        customerId,
        OR: [
          { addressLine1: formattedLine1 },
          { addressLine1: rawLine1 },
          ...(postalCode !== '100001' && postalCode !== 'N/A' ? [{ postalCode, city }] : [])
        ]
      }
    });

    if (!shipAddr) {
      shipAddr = await tx.customerAddress.create({
        data: {
          customerId,
          addressLine1: formattedLine1,
          addressLine2: addrLine2,
          city,
          state,
          postalCode,
          country,
          isDefault: !userId
        }
      });
    }
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

      if (billAddrLine1 !== rawLine1) {
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

  let computedSubtotal = 0;
  let computedTotalQuantity = 0;
  let computedTotalWeightGrams = 0;

  if (Array.isArray(items)) {
    for (const it of items) {
      const qty = Math.max(1, Number(it.quantity) || 1);
      const unitPrice = Number(it.unitPrice || it.price || it.effectivePrice || 0);
      const itemWeightGrams = Number(it.weightInGrams ?? it.weight ?? 0);
      computedSubtotal += unitPrice * qty;
      computedTotalQuantity += qty;
      computedTotalWeightGrams += itemWeightGrams * qty;
    }
  }

  const finalSubtotal = computedSubtotal > 0 ? computedSubtotal : Number(subtotal || 0);
  const finalDiscount = Number(discountAmount || 0);
  const finalShipping = Number(shippingAmount !== undefined ? shippingAmount : 0);
  const finalCodCharge = paymentMethod === 'COD' ? Number(codCharge !== undefined ? codCharge : 100) : 0;
  const finalTax = Number(taxAmount || 0);
  const calculatedGrandTotal = Math.max(0, finalSubtotal - finalDiscount + finalShipping + finalCodCharge + finalTax);
  const finalTotalAmount = calculatedGrandTotal > 0 ? calculatedGrandTotal : Number(totalAmount || 0);

  const formatWeightServer = (valInGrams: number): string => {
    const val = Number(valInGrams) || 0;
    if (val <= 0) return '0 g';
    if (val < 1000) return `${Number.isInteger(val) ? val : Number(val.toFixed(2))} g`;
    return `${(val / 1000).toFixed(2)} kg`;
  };

  const orderData: any = {
    orderNumber,
    status: orderStatus,
    paymentMethod,
    paymentStatus: isConfirmed ? 'PAID' : 'PENDING',
    paymentGateway: paymentGateway || (paymentMethod === 'RAZORPAY' ? 'razorpay' : paymentMethod === 'CASHFREE' ? 'cashfree' : 'cod'),
    paymentId: paymentId || null,
    transactionId: transactionId || null,
    gatewayResponse: typeof gatewayResponse === 'object' ? JSON.stringify(gatewayResponse) : (gatewayResponse || null),
    subtotal: finalSubtotal,
    totalAmount: finalTotalAmount,
    taxAmount: finalTax,
    shippingAmount: finalShipping,
    discountAmount: finalDiscount,
    codCharge: finalCodCharge,
    paidAmount: isConfirmed ? finalTotalAmount : 0,
    totalWeightInGrams: computedTotalWeightGrams,
    displayWeight: formatWeightServer(computedTotalWeightGrams),
    totalQuantity: computedTotalQuantity,
    notes: notes || null,
    gstNumber: gstNumber || null,
    companyName: companyName || null,
    shipment: payload.shipment || null,
    ...(customerId && isValidUuid(customerId) ? { customer: { connect: { id: customerId } } } : {}),
    ...(shippingAddressId && isValidUuid(shippingAddressId) ? { shippingAddress: { connect: { id: shippingAddressId } } } : {}),
    ...(billingAddressId && isValidUuid(billingAddressId) ? { billingAddress: { connect: { id: billingAddressId } } } : {}),
    items: {
      create: items.map((it: any) => ({
        ...(it.productId && isValidUuid(it.productId) ? { product: { connect: { id: it.productId } } } : {}),
        ...(it.variantId && isValidUuid(it.variantId) ? { variant: { connect: { id: it.variantId } } } : {}),
        quantity: it.quantity,
        unitPrice: it.unitPrice || it.price,
        totalPrice: it.totalPrice || (it.quantity * (it.unitPrice || it.price)),
        weightInGrams: Number(it.weightInGrams ?? it.weight ?? 0)
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

  if (orderId && isValidUuid(orderId)) {
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
    
    // Timing-Safe Signature Verification
    if (keySecret && razorpay_signature && !isMock && razorpay_order_id) {
      const generated = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const bufGen = Buffer.from(generated, 'utf8');
      const bufRec = Buffer.from(String(razorpay_signature), 'utf8');

      let isValidSig = false;
      if (bufGen.length === bufRec.length) {
        isValidSig = crypto.timingSafeEqual(bufGen, bufRec);
      }

      if (!isValidSig) {
        logger.error('Razorpay Payment Signature Verification Failed', {
          razorpay_order_id,
          razorpay_payment_id,
        }, {
          requestId: (req as any).requestId,
          module: 'PAYMENT',
          errorCode: 'PAYMENT_SIGNATURE_FAILED',
        });

        return res.status(400).json({
          success: false,
          error: 'Payment verification failed: Invalid digital signature',
          requestId: (req as any).requestId,
        });
      }
    }

    const searchCheckoutId = req.body.checkoutId || req.body.dbOrderId;

    // Find the transaction record or abandoned checkout record with robust multi-field lookup
    let transaction = await prisma.transactionHistory.findFirst({
      where: {
        OR: [
          ...(razorpay_order_id ? [{ gatewayOrderId: razorpay_order_id }] : []),
          ...(razorpay_payment_id ? [{ gatewayPaymentId: razorpay_payment_id }] : []),
          ...(searchCheckoutId && isValidUuid(searchCheckoutId) ? [{ orderId: searchCheckoutId }] : [])
        ]
      },
    });

    let checkout = await prisma.abandonedCheckout.findFirst({
      where: {
        OR: [
          ...(razorpay_order_id ? [{ sessionId: razorpay_order_id }] : []),
          ...(searchCheckoutId && isValidUuid(searchCheckoutId) ? [{ id: searchCheckoutId }] : []),
          ...(isValidUuid(razorpay_order_id) ? [{ id: razorpay_order_id }] : [])
        ]
      }
    });

    // Fallback: If not found by exact ID, find the latest pending checkout session
    if (!transaction && !checkout) {
      checkout = await prisma.abandonedCheckout.findFirst({
        where: {
          paymentMethod: 'RAZORPAY',
          paymentStatus: { in: ['Initiated', 'PENDING', 'Active', 'Created'] }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!transaction && !checkout) {
      return res.status(404).json({ error: 'Payment session transaction record not found' });
    }

    if (transaction?.orderId) {
      const existingOrder = isValidUuid(transaction.orderId)
        ? await prisma.order.findUnique({ where: { id: transaction.orderId } })
        : null;
      if (existingOrder) {
        return res.status(200).json({ success: true, message: 'Payment already processed', data: { orderId: existingOrder.id } });
      }
    }

    const payload = (checkout?.checkoutData as any) || (transaction?.requestPayload as any);
    if (!payload || !payload.items) {
      return res.status(400).json({ error: 'Checkout payload unavailable for order creation' });
    }

    const targetOrderId = (checkout?.id && isValidUuid(checkout.id)) ? checkout.id : undefined;

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
    }, { maxWait: 15000, timeout: 30000 });

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
          where: {
            OR: [
              { sessionId: gatewayOrderId },
              ...(isValidUuid(gatewayOrderId) ? [{ id: gatewayOrderId }] : [])
            ]
          }
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
              }, { maxWait: 15000, timeout: 30000 });
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
        where: {
          OR: [
            { sessionId: gatewayOrderId },
            ...(isValidUuid(gatewayOrderId) ? [{ id: gatewayOrderId }] : [])
          ]
        }
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
      take: 100,
    });

    const orders = await prisma.order.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        paymentStatus: true,
        customer: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        },
        shippingAddress: {
          select: {
            addressLine1: true,
            city: true,
          }
        },
        payments: {
          select: {
            id: true,
            paymentMethod: true,
            transactionId: true,
            amount: true,
            status: true,
            createdAt: true,
          }
        }
      }
    });

    const getOrderCustomerName = (o: any) => {
      if (!o) return null;
      if (o.customer?.user) {
        const name = `${o.customer.user.firstName || ''} ${o.customer.user.lastName || ''}`.trim();
        if (name) return name;
      }
      return null;
    };

    const getOrderCustomerEmail = (o: any) => {
      if (!o) return null;
      return o.customer?.user?.email || null;
    };

    const orderMap = new Map<string, any>();
    orders.forEach((o: any) => orderMap.set(o.id, o));

    const formattedList: any[] = list.map(tx => {
      const orderInfo = tx.orderId ? orderMap.get(tx.orderId) : null;
      return {
        ...tx,
        amount: Number(tx.amount || 0),
        orderNumber: orderInfo?.orderNumber || (tx.orderId ? (tx.orderId.length > 8 ? tx.orderId.slice(0, 8) : tx.orderId) : 'N/A'),
        customerName: getOrderCustomerName(orderInfo) || tx.customerId || 'Guest',
        customerEmail: getOrderCustomerEmail(orderInfo) || 'N/A',
      };
    });

    const txIds = new Set(list.map(t => t.id));
    const txOrderIds = new Set(list.map(t => t.orderId).filter(Boolean));

    orders.forEach((o: any) => {
      if (o.payments && o.payments.length > 0) {
        o.payments.forEach((p: any) => {
          if (!txIds.has(p.id) && (!p.transactionId || !txIds.has(p.transactionId)) && !txOrderIds.has(o.id)) {
            formattedList.push({
              id: p.id,
              orderId: o.id,
              orderNumber: o.orderNumber,
              customerId: null,
              customerName: getOrderCustomerName(o) || 'Guest',
              customerEmail: getOrderCustomerEmail(o) || 'N/A',
              paymentMethod: p.paymentMethod || 'ONLINE',
              gatewayName: p.paymentMethod || 'GATEWAY',
              gatewayOrderId: p.transactionId || o.orderNumber,
              gatewayTransactionId: p.transactionId,
              gatewayPaymentId: p.transactionId,
              amount: Number(p.amount || 0),
              currency: 'INR',
              status: p.status === 'SUCCESS' || p.status === 'CAPTURED' ? 'Captured' : p.status,
              paymentStatus: p.status,
              responsePayload: null,
              requestPayload: null,
              createdAt: p.createdAt,
              updatedAt: p.createdAt,
            });
          }
        });
      }
    });

    formattedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.status(200).json({ status: 'success', success: true, message: 'success', data: formattedList });
  } catch (error: any) {
    console.error('Error fetching admin transactions:', error);
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

export const calculateEffectiveItemPrice = (prod: any, item: any, customerType?: string): number => {
  const basePrice = Number(prod.salePrice || prod.basePrice || 0);
  const dealerPrice = prod.dealerPrice ? Number(prod.dealerPrice) : basePrice;
  const defaultPrice = customerType === 'DEALER' ? dealerPrice : basePrice;

  // 1. If bundle or bundle tier selected
  if (item.bundleDetails || item.configurationType === 'bundle' || item.bundleTier) {
    const bundleTier = item.bundleDetails || item.bundleTier;
    const tierName = bundleTier.bundleName || bundleTier.name;
    const tierCount = Number(bundleTier.bundleCount || bundleTier.count || 1);

    // Check if product has variantGroups in DB
    let vGroups: any[] = [];
    if (Array.isArray(prod.variantGroups)) {
      vGroups = prod.variantGroups;
    } else if (typeof prod.variantGroups === 'string') {
      try { vGroups = JSON.parse(prod.variantGroups); } catch (e) {}
    }

    if (vGroups.length > 0) {
      for (const grp of vGroups) {
        if (Array.isArray(grp.bundleTiers)) {
          const matchedTier = grp.bundleTiers.find((t: any) => 
            (tierName && t.name && t.name.trim().toLowerCase() === String(tierName).trim().toLowerCase()) ||
            (t.count && Number(t.count) === tierCount)
          );
          if (matchedTier) {
            const count = Number(matchedTier.count) || 1;
            if (matchedTier.priceType === 'per_variant' || matchedTier.customPricePerItem) {
              const perVal = Number(matchedTier.priceValue || matchedTier.customPricePerItem || defaultPrice);
              return perVal * count;
            } else if (matchedTier.priceType === 'fixed') {
              return Number(matchedTier.priceValue);
            } else if (matchedTier.priceType === 'percentage') {
              const pct = Number(matchedTier.priceValue) || 0;
              return defaultPrice * count * (1 - (pct / 100));
            } else {
              return Number(matchedTier.priceValue) || (defaultPrice * count);
            }
          }
        }
      }
    }

    // Direct bundle price from payload if valid
    if (bundleTier.effectivePrice !== undefined && Number(bundleTier.effectivePrice) > 0) {
      return Number(bundleTier.effectivePrice);
    }
    if (bundleTier.bundlePrice !== undefined && Number(bundleTier.bundlePrice) > 0) {
      return Number(bundleTier.bundlePrice);
    }
    if (bundleTier.unitPrice !== undefined && Number(bundleTier.unitPrice) > 0 && tierCount > 0) {
      return Number(bundleTier.unitPrice) * tierCount;
    }
    if (item.effectivePrice !== undefined && Number(item.effectivePrice) > 0) {
      return Number(item.effectivePrice);
    }
    if (item.price !== undefined && Number(item.price) > 0) {
      return Number(item.price);
    }
  }

  // 2. If variant selected
  if (item.variantId && prod.variants && Array.isArray(prod.variants)) {
    const v = prod.variants.find((vr: any) => vr.id === item.variantId);
    if (v) {
      return Number(v.salePrice || v.price || defaultPrice);
    }
  }

  // 3. Fallback to product sale/base price
  return defaultPrice;
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
    let customerType = 'retail';

    if (userId) {
      let customer = await prisma.customer.findFirst({ where: { userId } });
      if (!customer) {
        customer = await prisma.customer.create({ data: { userId, customerType: 'retail' } });
      }
      customerIdToUse = customer.id;
      customerType = customer.customerType || 'retail';
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
      customerType = 'guest';
    }

    // 2. Validate products and calculate authoritative server-side effective pricing
    let subtotal = 0;
    const parsedItems = [];
    const itemConfigs: any[] = [];

    for (const it of items) {
      const prod = await prisma.product.findUnique({
        where: { id: it.productId },
        select: {
          id: true,
          name: true,
          basePrice: true,
          salePrice: true,
          dealerPrice: true,
          codAvailable: true,
          isActive: true,
          stock: true,
          deletedAt: true,
          variants: true
        }
      });

      if (!prod || !prod.isActive || prod.deletedAt) {
        return res.status(400).json({ error: `Product "${it.productId}" is no longer available.` });
      }

      if (paymentMethod === 'COD' && prod.codAvailable === false) {
        return res.status(400).json({
          error: `Cash on Delivery (COD) is unavailable for "${prod.name}". Please choose online payment.`
        });
      }

      const effectiveUnitPrice = calculateEffectiveItemPrice(prod, it, customerType);
      const qty = Math.max(1, Number(it.quantity) || 1);
      const lineTotal = effectiveUnitPrice * qty;

      subtotal += lineTotal;
      parsedItems.push({
        productId: it.productId,
        variantId: it.variantId || null,
        quantity: qty,
        unitPrice: effectiveUnitPrice,
        totalPrice: lineTotal,
        weightInGrams: Number(it.weightInGrams ?? it.weight ?? 0)
      });

      itemConfigs.push({
        productId: it.productId,
        variantId: it.variantId || null,
        basePrice: Number(prod.salePrice || prod.basePrice || effectiveUnitPrice),
        effectivePrice: effectiveUnitPrice,
        quantity: qty,
        lineTotal,
        configurationType: it.configurationType || it.bundleDetails?.configurationType || (it.bundleDetails ? 'bundle' : 'standard'),
        configurationName: it.configurationName || it.bundleDetails?.bundleName || null,
        bundleDetails: it.bundleDetails || null,
        selectedOptions: it.selectedOptions || it.bundleDetails?.selectedOptions || it.bundleDetails?.selectedVariants || []
      });
    }

    // Server-side calculation
    const shippingResult = await ShippingService.calculateShipping(items);
    const shippingAmount = (typeof req.body.shippingAmount === 'number' && !isNaN(req.body.shippingAmount) && req.body.shippingAmount >= 0)
      ? req.body.shippingAmount
      : shippingResult.shippingCharge;
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
        logger.warn('[COD Eligibility Failed]: Effective subtotal exceeds 2500 limit', {
          subtotal,
          limit: 2500,
          itemCount: items.length
        });
        return res.status(400).json({
          error: 'Cash on Delivery is available only for eligible products with a cart total of ₹2,500 or below.'
        });
      }
      const shippingSettings = (await getSettingsService())?.shippingSettings || {};
      codCharge = shippingSettings.codHandlingCharge !== undefined ? Number(shippingSettings.codHandlingCharge) : 100;
    }

    const computedTotal = Math.max(0, subtotal + shippingAmount + taxAmount + codCharge - discountAmount);
    const calculatedTotal = (typeof frontendTotal === 'number' && !isNaN(frontendTotal) && frontendTotal > 0)
      ? frontendTotal
      : computedTotal;
    const orderNumber = await generateNextOrderNumber(prisma);

    const shippingAddressSnapshot = req.body.shippingAddressSnapshot || (typeof shippingAddress === 'object' ? shippingAddress : null);

    const checkoutPayload: any = {
      customerId: customerIdToUse,
      orderNumber,
      items: parsedItems,
      shippingAddress: shippingAddressSnapshot || shippingAddress,
      shippingAddressSnapshot,
      billingAddress: billingAddress || shippingAddressSnapshot || shippingAddress,
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
      resolvedPhone,
      shipment: {
        itemConfigurations: itemConfigs
      }
    };

    // 3. Handle COD vs Online Payment
    if (paymentMethod === 'COD') {
      const createdOrder = await prisma.$transaction(async (tx) => {
        return await processOrderCreation(tx, {
          ...checkoutPayload,
          paymentStatus: 'PENDING',
          paidAmount: 0
        });
      }, { maxWait: 15000, timeout: 30000 });

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

    const formattedAddressStr = typeof shippingAddress === 'string'
      ? shippingAddress
      : `${shippingAddressSnapshot?.addressLine1 || ''}, ${shippingAddressSnapshot?.city || ''} - ${shippingAddressSnapshot?.pincode || shippingAddressSnapshot?.postalCode || ''}`;

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
              notes: {
                shipping_address: formattedAddressStr,
                customer_name: resolvedName,
                customer_phone: resolvedPhone,
              }
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
      try {
        await prisma.transactionHistory.create({
          data: {
            customerId: isValidUuid(customerIdToUse) ? customerIdToUse : undefined,
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
      } catch (txLogErr: any) {
        console.warn('[PAYMENT_INIT] Soft warning creating transaction history record:', txLogErr?.message || txLogErr);
      }

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
        order_id: checkoutSessionId,
        customer_details: {
          customer_id: customerIdToUse || 'GUEST_' + Date.now(),
          customer_name: resolvedName || 'Customer',
          customer_phone: resolvedPhone || '9999999999',
          customer_email: resolvedEmail || 'guest@example.com',
        },
        order_meta: {
          return_url: `${(req.headers.origin || 'http://localhost:4200').replace(/^http:\/\//i, 'https://')}/order-success?orderId=${checkoutSessionId}`,
        },
        order_note: `Shipping to: ${resolvedName} (${resolvedPhone}) - ${formattedAddressStr}`
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

      try {
        await prisma.transactionHistory.create({
          data: {
            customerId: isValidUuid(customerIdToUse) ? customerIdToUse : undefined,
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
      } catch (txLogErr: any) {
        console.warn('[CASHFREE_INIT] Soft warning logging transaction history:', txLogErr?.message || txLogErr);
      }

      return res.status(200).json({
        success: true,
        data: {
          paymentSessionId: cfData.payment_session_id,
          payment_session_id: cfData.payment_session_id,
          cfOrderId: cfData.cf_order_id,
          orderId: abandonedCheckout.id,
          checkoutId: abandonedCheckout.id,
          sandbox: Boolean(sandbox),
        }
      });
    } else {
      return res.status(400).json({ error: 'Unsupported payment method: ' + paymentMethod });
    }

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
