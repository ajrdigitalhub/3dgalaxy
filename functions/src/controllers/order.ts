import { Request, Response } from 'express';
import prisma from '../config/database';
import { triggerWhatsAppNotification } from './whatsapp';
import { dispatchOrderNotifications } from '../services/orderNotification.service';
import { generateNextOrderNumber } from '../utils/orderNumber';
import { ShippingService } from '../services/shipping.service';
import { WhatsAppNotificationService } from '../services/whatsappNotificationService';
import { TrackingService } from '../services/tracking.service';
import { logger } from '../utils/logger';
import { calculateEffectiveItemPrice } from './payment';
import { sysCache } from '../config/cache';
import { generateOrderAccessToken, verifyOrderAccessToken, verifyOrderEmail } from '../utils/orderSecurity';
import { getSettingsService } from '../modules/settings/settings.service';

export const invalidateOrdersCache = () => {
  sysCache.clearPattern('admin_orders_');
};

const safeParseArray = (val: any): any[] => {
  if (!val) return [];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(val) ? val : [];
};

const mapOrderWithVariantDetails = (order: any) => {
  if (!order) return order;

  try {
    order.totalAmount = order.totalAmount !== undefined ? Number(order.totalAmount) : 0;
    order.shippingAmount = order.shippingAmount !== undefined ? Number(order.shippingAmount) : 0;
    order.taxAmount = order.taxAmount !== undefined ? Number(order.taxAmount) : 0;
    order.discountAmount = order.discountAmount !== undefined ? Number(order.discountAmount) : 0;
    order.codCharge = order.codCharge !== undefined ? Number(order.codCharge) : 0;
    order.paidAmount = order.paidAmount !== undefined ? Number(order.paidAmount) : 0;

    let shipmentObj: any = null;
    if (order.shipment) {
      if (typeof order.shipment === 'string') {
        try { shipmentObj = JSON.parse(order.shipment); } catch (e) {}
      } else if (typeof order.shipment === 'object') {
        shipmentObj = order.shipment;
      }
    }
    const itemConfigs = Array.isArray(shipmentObj?.itemConfigurations) ? shipmentObj.itemConfigurations : [];

    if (order.items && Array.isArray(order.items)) {
      order.items = order.items.map((item: any, idx: number) => {
        const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
        const qty = Number(item.quantity || 1);
        const totalPrice = item.totalPrice ? Number(item.totalPrice) : unitPrice * qty;

        const matchedConfig = itemConfigs.find((c: any) => 
          (c.productId && c.productId === item.productId && (!c.variantId || c.variantId === item.variantId)) ||
          (c.variantId && c.variantId === item.variantId)
        ) || itemConfigs[idx];

        const bundleDetails = item.bundleDetails || matchedConfig?.bundleDetails || null;
        const selectedOptions = item.selectedOptions || matchedConfig?.selectedOptions || [];
        const configurationType = item.configurationType || matchedConfig?.configurationType || (bundleDetails ? 'bundle' : 'standard');
        const configurationName = item.configurationName || matchedConfig?.configurationName || bundleDetails?.bundleName || null;
        const basePrice = matchedConfig?.basePrice || Number(item.product?.basePrice || item.product?.salePrice || unitPrice);

        if (item.variant) {
          const variantImages = safeParseArray(item.variant.variantImages || item.variant.images);
          let firstImg = '';
          if (variantImages && variantImages.length > 0) {
            const primaryObj = variantImages.find((x: any) => typeof x === 'object' && x && x.isPrimary) || variantImages[0];
            firstImg = typeof primaryObj === 'string' ? primaryObj : (primaryObj?.url || primaryObj?.imageUrl || '');
          }
          
          item.variant = {
            ...item.variant,
            imageUrl: firstImg || (item.product?.images && safeParseArray(item.product.images).length > 0 ? (typeof safeParseArray(item.product.images)[0] === 'string' ? safeParseArray(item.product.images)[0] : safeParseArray(item.product.images)[0]?.url) : '')
          };
        }
        const selectedWeightValue = item.selectedWeightValue || matchedConfig?.selectedWeightValue || null;
        const selectedWeightUnit = item.selectedWeightUnit || matchedConfig?.selectedWeightUnit || 'kg';
        const isCustomWeight = item.isCustomWeight !== undefined ? item.isCustomWeight : Boolean(matchedConfig?.isCustomWeight);
        const customWeightValue = item.customWeightValue || matchedConfig?.customWeightValue || null;
        const unitPricePerWeight = item.unitPricePerWeight || matchedConfig?.unitPricePerWeight || null;
        const weightInGrams = item.weightInGrams !== undefined ? Number(item.weightInGrams) : (matchedConfig?.weightInGrams || 0);

        const isFree = item.isFree || matchedConfig?.isFree || (configurationType === 'free_bundle') || (unitPrice === 0);

        return {
          ...item,
          isFree,
          unitPrice,
          quantity: qty,
          totalPrice,
          basePrice,
          effectivePrice: unitPrice,
          bundleDetails,
          selectedOptions,
          configurationType: isFree ? 'free_bundle' : (configurationType || (selectedWeightValue ? 'weight' : (item.variant ? 'variant' : 'standard'))),
          configurationName: isFree ? (configurationName || 'Free Included') : configurationName,
          selectedWeightValue,
          selectedWeightUnit,
          isCustomWeight,
          customWeightValue,
          unitPricePerWeight,
          weightInGrams
        };
      });

      const itemsSubtotal = order.items.reduce((sum: number, i: any) => sum + i.totalPrice, 0);
      order.subtotal = itemsSubtotal;
    }

    if (!order.statusHistory || !Array.isArray(order.statusHistory) || order.statusHistory.length === 0) {
      order.statusHistory = [
        {
          id: `status-${order.id || 'initial'}`,
          status: order.status || 'PENDING',
          createdAt: order.updatedAt || order.createdAt || new Date().toISOString(),
          comments: order.notes || (order.paymentMethod === 'COD' ? 'Order placed with Cash on Delivery' : 'Order placed')
        }
      ];
    }
  } catch (err: any) {
    logger.warn('[mapOrderWithVariantDetails Warning]:', err.message);
  }
  return order;
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'admin_orders_' + JSON.stringify(req.query);
    const cached = sysCache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limitNum = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limitNum;

    const search = req.query.search as string;
    const status = req.query.status as string;
    const customerType = req.query.customerType as string;
    const minAmount = req.query.minAmount !== undefined && req.query.minAmount !== ''
      ? parseFloat(req.query.minAmount as string)
      : undefined;
    const maxAmount = req.query.maxAmount !== undefined && req.query.maxAmount !== ''
      ? parseFloat(req.query.maxAmount as string)
      : undefined;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    const andConditions: any[] = [];

    if (search && (search as string).trim()) {
      const s = (search as string).trim();
      andConditions.push({
        OR: [
          { orderNumber: { contains: s, mode: 'insensitive' } },
          { notes: { contains: s, mode: 'insensitive' } },
          { paymentMethod: { contains: s, mode: 'insensitive' } },
          { transactionId: { contains: s, mode: 'insensitive' } },
          { paymentId: { contains: s, mode: 'insensitive' } },
          {
            customer: {
              OR: [
                { phone: { contains: s, mode: 'insensitive' } },
                {
                  user: {
                    OR: [
                      { firstName: { contains: s, mode: 'insensitive' } },
                      { lastName: { contains: s, mode: 'insensitive' } },
                      { email: { contains: s, mode: 'insensitive' } },
                      { mobile: { contains: s, mode: 'insensitive' } }
                    ]
                  }
                }
              ]
            }
          },
          {
            shippingAddress: {
              OR: [
                { addressLine1: { contains: s, mode: 'insensitive' } },
                { city: { contains: s, mode: 'insensitive' } },
                { state: { contains: s, mode: 'insensitive' } },
                { postalCode: { contains: s, mode: 'insensitive' } }
              ]
            }
          },
          {
            shipments: {
              some: {
                OR: [
                  { trackingNumber: { contains: s, mode: 'insensitive' } },
                  { courierPartner: { contains: s, mode: 'insensitive' } },
                  { courierDisplayName: { contains: s, mode: 'insensitive' } }
                ]
              }
            }
          }
        ]
      });
    }

    if (status && status !== 'ALL' && (status as string).trim()) {
      const st = (status as string).trim();
      andConditions.push({
        status: { equals: st, mode: 'insensitive' }
      });
    }

    if (customerType && customerType !== 'ALL' && (customerType as string).trim()) {
      const norm = (customerType as string).trim().toUpperCase();
      if (norm === 'GUEST') {
        andConditions.push({
          OR: [
            { customerId: null },
            { customer: { customerType: { equals: 'guest', mode: 'insensitive' } } },
            { customer: { user: { role: { equals: 'Guest', mode: 'insensitive' } } } }
          ]
        });
      } else if (norm === 'REG' || norm === 'REGISTERED') {
        andConditions.push({
          customerId: { not: null },
          customer: {
            customerType: { notIn: ['guest', 'GUEST'] },
            user: { role: { not: 'Guest' } }
          }
        });
      } else {
        andConditions.push({
          customer: {
            customerType: { equals: (customerType as string).trim(), mode: 'insensitive' }
          }
        });
      }
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      const amountCond: any = {};
      if (minAmount !== undefined && !isNaN(minAmount)) amountCond.gte = minAmount;
      if (maxAmount !== undefined && !isNaN(maxAmount)) amountCond.lte = maxAmount;
      if (Object.keys(amountCond).length > 0) {
        andConditions.push({ totalAmount: amountCond });
      }
    }

    if (dateFrom || dateTo) {
      const dateCond: any = {};
      if (dateFrom && (dateFrom as string).trim()) {
        const dFrom = new Date((dateFrom as string).trim());
        if (!isNaN(dFrom.getTime())) {
          dFrom.setHours(0, 0, 0, 0);
          dateCond.gte = dFrom;
        }
      }
      if (dateTo && (dateTo as string).trim()) {
        const dTo = new Date((dateTo as string).trim());
        if (!isNaN(dTo.getTime())) {
          dTo.setHours(23, 59, 59, 999);
          dateCond.lte = dTo;
        }
      }
      if (Object.keys(dateCond).length > 0) {
        andConditions.push({ createdAt: dateCond });
      }
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    const [total, list] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            include: { user: true }
          },
          shippingAddress: true,
          billingAddress: true,
          shipments: true,
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  sku: true,
                  basePrice: true,
                  salePrice: true,
                  images: true,
                  brandId: true,
                  categoryId: true,
                  codAvailable: true,
                  weightInGrams: true,
                  weightUnit: true
                }
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  salePrice: true,
                  variantImages: true,
                  weight: true,
                  stock: true,
                  isActive: true
                }
              }
            }
          },
          payments: true
        }
      })
    ]);

    const resultPayload = { total, page, limit: limitNum, data: list.map(mapOrderWithVariantDetails) };
    sysCache.set(cacheKey, resultPayload, 30);
    return res.status(200).json(resultPayload);
  } catch (error: any) {
    logger.error('Error in getOrders:', error);
    return res.status(500).json({ error: 'Order retrieval failed', details: error.message });
  }
};

export const getMyOrders = async (req: any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limitQuery = req.query.limit as string;
    const isAll = limitQuery === 'all' || limitQuery === '-1';
    const limitNum = isAll ? 500 : (parseInt(limitQuery, 10) || 10);
    const skip = isAll ? 0 : (page - 1) * limitNum;

    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) {
      return res.status(200).json({ total: 0, page: 1, limit: limitNum, data: [] });
    }

    const where = { customerId: customer.id };
    const [total, list] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            include: { user: true }
          },
          shippingAddress: true,
          billingAddress: true,
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  sku: true,
                  basePrice: true,
                  salePrice: true,
                  images: true,
                  brandId: true,
                  categoryId: true,
                  codAvailable: true,
                  weightInGrams: true,
                  weightUnit: true
                }
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  salePrice: true,
                  variantImages: true,
                  weight: true,
                  stock: true,
                  isActive: true
                }
              }
            }
          },
          payments: true
        }
      })
    ]);
    return res.status(200).json({ total, page, limit: limitNum, data: list.map(mapOrderWithVariantDetails) });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve your orders', details: error.message });
  }
};

export const getOrderById = async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const rawId = String(id || '').trim();

  if (!rawId) {
    return res.status(400).json({ error: 'Order ID or Order Number is required' });
  }

  if (rawId.startsWith('mock_') || rawId.startsWith('3DX-MOCK-')) {
    return res.status(200).json({
      success: true,
      isMock: true,
      order: {
        id: rawId,
        orderNumber: '3DX-MOCK-9999',
        status: 'CONFIRMED',
        totalAmount: 1499,
        paymentMethod: 'COD',
        items: [],
        customer: { user: { firstName: 'Mock', lastName: 'Tester' } }
      }
    });
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
    const standardIncludes = {
      customer: {
        include: { user: true }
      },
      shippingAddress: true,
      billingAddress: true,
      items: {
        include: {
          product: true,
          variant: true
        },
      },
      payments: true,
      shipments: {
        orderBy: { createdAt: 'desc' as const }
      }
    };

    let order: any = null;

    if (isUuid) {
      order = await prisma.order.findUnique({
        where: { id: rawId },
        include: standardIncludes,
      });
    }

    if (!order) {
      order = await prisma.order.findFirst({
        where: {
          OR: [
            { orderNumber: rawId },
            { orderNumber: { equals: rawId, mode: 'insensitive' } },
            ...(isUuid ? [{ id: rawId }] : [])
          ]
        },
        include: standardIncludes,
      });
    }

    if (!order) {
      let checkout = await prisma.abandonedCheckout.findFirst({
        where: {
          OR: [
            ...(isUuid ? [{ id: rawId }] : []),
            { sessionId: rawId }
          ]
        }
      });

      if (!checkout) {
        // Also check if rawId matches transaction_history gatewayOrderId or gatewayTransactionId
        try {
          const tx = await prisma.transactionHistory.findFirst({
            where: {
              OR: [
                { gatewayOrderId: rawId },
                { gatewayTransactionId: rawId }
              ]
            },
            orderBy: { createdAt: 'desc' }
          });
          if (tx && tx.orderId) {
            order = await prisma.order.findUnique({
              where: { id: tx.orderId },
              include: standardIncludes,
            });
          } else if (tx) {
            const txOrderId = (tx.requestPayload as any)?.order_id;
            checkout = await prisma.abandonedCheckout.findFirst({
              where: {
                OR: [
                  ...(txOrderId ? [{ sessionId: txOrderId }] : []),
                  { sessionId: tx.gatewayOrderId },
                  ...(tx.customerId ? [{ customerId: tx.customerId }] : [])
                ]
              },
              orderBy: { createdAt: 'desc' }
            });
          }
        } catch (txLookupErr) {}
      }

      if (checkout) {
        if (checkout.recoveredOrderId) {
          const recovered = await prisma.order.findUnique({
            where: { id: checkout.recoveredOrderId },
            include: standardIncludes,
          });
          if (recovered) {
            order = recovered;
          }
        } else if (checkout.paymentMethod === 'CASHFREE') {
          // Automatic on-the-fly reconciliation with Cashfree
          try {
            const { getSettingsService } = await import('../modules/settings/settings.service');
            const { processOrderCreation } = await import('./payment');
            const settings = await getSettingsService();
            const cfConfig = settings?.paymentGatewaySettings?.paymentMethods?.cashfree;
            if (cfConfig && cfConfig.appId && cfConfig.secretKey) {
              const baseUrl = cfConfig.sandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

              // Build candidate Cashfree merchant order IDs to check
              const candidateIds = [
                req.query?.order_id as string,
                (checkout.checkoutData as any)?.merchantOrderId,
                (checkout.checkoutData as any)?.checkoutSessionId,
                checkout.sessionId
              ].filter(Boolean).map(String);

              if (!candidateIds.some(id => id.startsWith('chk_'))) {
                try {
                  const tx = await prisma.transactionHistory.findFirst({
                    where: {
                      OR: [
                        { gatewayOrderId: checkout.sessionId },
                        { gatewayTransactionId: checkout.sessionId },
                        ...(checkout.customerId ? [{ customerId: checkout.customerId }] : [])
                      ]
                    },
                    orderBy: { createdAt: 'desc' }
                  });
                  const txOrderId = (tx?.requestPayload as any)?.order_id;
                  if (txOrderId && !candidateIds.includes(txOrderId)) {
                    candidateIds.unshift(txOrderId);
                  }
                } catch (txErr) {}
              }

              let successfulOrderId: string | null = null;
              let cfData: any = null;

              for (const idToCheck of candidateIds) {
                try {
                  const cfRes = await fetch(`${baseUrl}/orders/${idToCheck}`, {
                    headers: {
                      'x-client-id': cfConfig.appId,
                      'x-client-secret': cfConfig.secretKey,
                      'x-api-version': '2023-08-01'
                    }
                  });
                  if (cfRes.ok) {
                    const resJson: any = await cfRes.json();
                    if (resJson && (resJson.order_status === 'PAID' || resJson.order_status === 'ACTIVE')) {
                      successfulOrderId = idToCheck;
                      cfData = resJson;
                      break;
                    }
                  }
                } catch (e) {}
              }

              if (cfData) {
                let gatewayPaymentId = String(cfData.cf_order_id || '');
                let isPaymentSuccess = cfData.order_status === 'PAID';

                try {
                  const payRes = await fetch(`${baseUrl}/orders/${successfulOrderId}/payments`, {
                    headers: {
                      'x-client-id': cfConfig.appId,
                      'x-client-secret': cfConfig.secretKey,
                      'x-api-version': '2023-08-01'
                    }
                  });
                  if (payRes.ok) {
                    const payList: any = await payRes.json();
                    const successPay = Array.isArray(payList) ? payList.find((p: any) => p.payment_status === 'SUCCESS') : null;
                    if (successPay) {
                      isPaymentSuccess = true;
                      if (successPay.cf_payment_id) {
                        gatewayPaymentId = String(successPay.cf_payment_id);
                      }
                    }
                  }
                } catch (e) {}

                if (isPaymentSuccess) {
                  const payload = (checkout.checkoutData as any) || {};
                  if (payload && payload.items) {
                    const created = await prisma.$transaction(async (tx) => {
                      const newOrd = await processOrderCreation(tx, {
                        ...payload,
                        orderId: checkout.id,
                        paymentStatus: 'PAID',
                        paymentMethod: 'CASHFREE',
                        paymentGateway: 'cashfree',
                        paymentId: gatewayPaymentId,
                        transactionId: gatewayPaymentId,
                        gatewayResponse: cfData,
                        paidAmount: payload.totalAmount
                      });

                      await tx.abandonedCheckout.update({
                        where: { id: checkout.id },
                        data: {
                          paymentStatus: 'PAID',
                          checkoutStep: 'COMPLETED',
                          recoveryStatus: 'Converted',
                          recoveredOrderId: newOrd.id
                        }
                      });

                      await tx.transactionHistory.updateMany({
                        where: {
                          OR: [
                            { gatewayOrderId: checkout.sessionId },
                            { gatewayOrderId: successfulOrderId || '' },
                            { gatewayTransactionId: String(cfData.cf_order_id || '') }
                          ]
                        },
                        data: {
                          orderId: newOrd.id,
                          status: 'Captured',
                          paymentStatus: 'PAID',
                          gatewayPaymentId
                        }
                      }).catch(() => {});

                      return newOrd;
                    });

                    order = await prisma.order.findUnique({
                      where: { id: created.id },
                      include: standardIncludes,
                    });

                    dispatchOrderNotifications(created.id).catch(e => console.error('[OrderReconcile] Notification error:', e));
                  }
                }
              }
            }
          } catch (reconcileErr) {
            console.error('[OrderReconciliation] Error reconciling Cashfree order:', reconcileErr);
          }
        }
      }
    }

    if (!order) {
      return res.status(404).json({ error: `Order "${rawId}" not found.` });
    }

    const normalizedRole = userRole ? userRole.toLowerCase().replace(/[\s\-_]/g, '') : '';
    const isAdminOrStaff = ['admin', 'superadmin', 'manager', 'staff', 'employee', 'storeowner', 'owner'].includes(normalizedRole);

    if (!isAdminOrStaff) {
      const orderToken = (req.query?.token as string) || (req.headers['x-order-token'] as string);
      const providedEmail = (req.query?.email as string) || (req.headers['x-order-email'] as string);
      const guestSessionHeader = req.headers['x-guest-session-id'] as string;

      let isAuthorized = false;

      // 1. Authenticated customer who owns the order
      if (userId && order.customer?.userId && order.customer.userId === userId) {
        isAuthorized = true;
      }

      // 2. Verified via secure order access token (e.g. from WhatsApp / email links)
      if (!isAuthorized && orderToken) {
        if (verifyOrderAccessToken(orderToken, order)) {
          isAuthorized = true;
        }
      }

      // 3. Verified via matching email address
      if (!isAuthorized && providedEmail) {
        if (verifyOrderEmail(providedEmail, order)) {
          isAuthorized = true;
        }
      }

      // 4. Verified via guest session ID match (for immediate post-checkout access)
      if (!isAuthorized && guestSessionHeader && order.guestSessionId && order.guestSessionId === guestSessionHeader) {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        if (userId && order.customer?.userId && order.customer.userId !== userId) {
          // A logged-in customer trying to access another customer's order
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to view this order.',
            code: 'FORBIDDEN_ORDER_ACCESS'
          });
        }

        // Guest or unauthenticated access without token/email
        return res.status(403).json({
          success: false,
          error: 'Email verification required to view this order. Please enter the email address used during purchase.',
          code: 'EMAIL_VERIFICATION_REQUIRED',
          orderNumber: order.orderNumber,
          requiresEmail: true
        });
      }
    }

    // Load audit logs to populate statusHistory timeline if available
    let statusHistory: any[] = [];
    try {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'Order',
          entityId: order.id,
          action: { in: ['ORDER_STATUS_UPDATE', 'ORDER_SHIPMENT_TRACKING_UPDATE', 'ORDER_CREATED'] }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (auditLogs && auditLogs.length > 0) {
        statusHistory = auditLogs.map((log: any) => {
          let parsedNew: any = {};
          try {
            parsedNew = typeof log.newData === 'string' ? JSON.parse(log.newData) : (log.newData || {});
          } catch {}
          return {
            id: log.id,
            status: parsedNew.status || 'UPDATED',
            createdAt: log.createdAt,
            comments: parsedNew.comments || (parsedNew.status ? `Status updated to ${parsedNew.status}` : 'Order update')
          };
        });
      }
    } catch (auditErr: any) {
      logger.warn(`[getOrderById AuditLog Warning]: ${auditErr?.message || auditErr}`);
    }

    // If no audit logs exist yet, build synthesized initial history entry
    if (statusHistory.length === 0) {
      statusHistory = [
        {
          id: `status-created-${order.id}`,
          status: order.status || 'PENDING',
          createdAt: order.createdAt || new Date().toISOString(),
          comments: order.paymentMethod === 'COD' ? 'Order placed with Cash on Delivery' : 'Order placed'
        }
      ];
      if (order.status && order.status.toUpperCase() !== 'PENDING' && order.updatedAt && new Date(order.updatedAt).getTime() !== new Date(order.createdAt).getTime()) {
        statusHistory.unshift({
          id: `status-curr-${order.id}`,
          status: order.status,
          createdAt: order.updatedAt,
          comments: `Order status: ${order.status}`
        });
      }
    }

    order.statusHistory = statusHistory;

    const mapped = mapOrderWithVariantDetails(order);
    mapped.accessToken = generateOrderAccessToken(order);
    return res.status(200).json(mapped);
  } catch (error: any) {
    logger.error(`Error in getOrderById for ID ${id}:`, error);
    return res.status(500).json({ error: 'Order detail retrieval failed', details: error.message });
  }
};

const isValidUuid = (val: any): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
};

export const createOrder = async (req: any, res: Response) => {
  const { customerType, guestName, guestEmail, guestPhone, guestSessionId, items, shippingAddress, billingAddress, paymentMethod } = req.body;
  const rawUserId = req.user?.id || req.body?.userId;
  const userId = isValidUuid(rawUserId) ? rawUserId : null;
  const requestId = req.requestId;

  logger.info('Order creation process initiated', {
    paymentMethod,
    itemCount: Array.isArray(items) ? items.length : 0,
    customerType: customerType || (userId ? 'registered' : 'guest')
  }, {
    requestId,
    userId,
    module: 'ORDER',
    errorCode: 'ORDER_CREATE_STARTED'
  });

  const isMockTest = 
    req.headers['x-mock-test'] === 'true' ||
    req.headers['x-mock-mode'] === 'true' ||
    process.env.MOCK_ORDER_MODE === 'true' ||
    req.body.isMockTest === true ||
    (typeof req.body.notes === 'string' && (req.body.notes === '__AUTOMATED_DEPLOYMENT_TEST__' || req.body.notes === '__DEPLOYMENT_TEST__')) ||
    (typeof req.body.email === 'string' && (req.body.email.endsWith('.internal.test') || req.body.email === 'deployment_test@3dgalaxy.test')) ||
    (typeof req.user?.email === 'string' && (req.user.email.endsWith('.internal.test') || req.user.email === 'deployment_test@3dgalaxy.test'));

  if (isMockTest) {
    if (!items || !Array.isArray(items) || items.length === 0 || !shippingAddress || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required order fields for mock order' });
    }

    if (paymentMethod === 'COD') {
      const mockSubtotal = items.reduce((acc: number, it: any) => {
        const p = Number(it.totalPrice || it.unitPrice || it.price || 0);
        const q = Number(it.quantity || 1);
        return acc + (it.totalPrice ? p : p * q);
      }, 0);
      if (mockSubtotal > 2500) {
        return res.status(400).json({
          success: false,
          error: 'Cash on Delivery is available only for eligible products with a cart total of ₹2,500 or below.'
        });
      }
    }
    const mockOrderId = 'mock_order_' + Math.random().toString(36).substring(2, 10);
    const mockOrderNumber = '3DX-MOCK-' + Math.floor(1000 + Math.random() * 9000);
    return res.status(201).json({
      success: true,
      isMock: true,
      data: {
        id: mockOrderId,
        orderId: mockOrderId,
        orderNumber: mockOrderNumber,
        status: paymentMethod === 'COD' ? 'PENDING' : 'CONFIRMED',
        paymentMethod,
        isMock: true,
        message: 'Mock test order validated successfully. Zero database records inserted.'
      },
      order: {
        id: mockOrderId,
        orderNumber: mockOrderNumber,
        status: paymentMethod === 'COD' ? 'PENDING' : 'CONFIRMED',
        paymentMethod,
        isMock: true
      }
    });
  }

  let userRecord: any = null;
  if (userId) {
    try {
      userRecord = await prisma.user.findUnique({ where: { id: userId } });
    } catch (e) {}
  }

  const contactDetails = req.body.contactDetails || {};
  const shippingAddressSnapshot = req.body.shippingAddressSnapshot || {};

  const resolvedName = 
    req.body.name || 
    req.body.customerName || 
    contactDetails.name || 
    shippingAddressSnapshot.fullName || 
    shippingAddressSnapshot.name || 
    guestName || 
    (userRecord ? `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim() : null) || 
    'Valued Customer';

  const resolvedEmail = 
    req.body.email || 
    req.body.customerEmail || 
    contactDetails.email || 
    guestEmail || 
    userRecord?.email || 
    '';

  const resolvedPhone = 
    req.body.phone || 
    req.body.customerPhone || 
    contactDetails.phone || 
    shippingAddressSnapshot.phone || 
    guestPhone || 
    userRecord?.mobile || 
    '';

  const resolvedAddress = shippingAddress || req.body.address || null;

  const isGuest = customerType === 'GUEST' || !userId;

  if (isGuest) {
    if (!items || items.length === 0 || !resolvedAddress || !paymentMethod || !resolvedName || !resolvedEmail || !resolvedPhone) {
      return res.status(400).json({ 
        error: 'Missing required guest checkout information',
        received: {
          hasItems: !!items && items.length > 0,
          hasAddress: !!resolvedAddress,
          hasPaymentMethod: !!paymentMethod,
          hasName: !!resolvedName,
          hasEmail: !!resolvedEmail,
          hasPhone: !!resolvedPhone
        }
      });
    }
  } else {
    if (!items || items.length === 0 || !resolvedAddress || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required checkout information' });
    }
  }

  // Backend GST Validation & Sanitization
  const businessPurchase = req.body.businessPurchase || {};
  const rawGstNumber = (req.body.gstNumber || req.body.gstin || req.body.gstDetails?.gstin || businessPurchase.gstNumber || '').toString().trim().toUpperCase();
  const rawCompanyName = (req.body.companyName || req.body.businessName || req.body.gstDetails?.companyName || businessPurchase.companyName || '').toString().trim();

  let finalGstNumber: string | null = null;
  let finalCompanyName: string | null = rawCompanyName.length > 0 ? rawCompanyName : null;

  if (rawGstNumber.length > 0) {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(rawGstNumber)) {
      return res.status(400).json({ error: 'Please enter a valid GSTIN.' });
    }
    finalGstNumber = rawGstNumber;
  }

  // Validate COD eligibility if paymentMethod is COD
  if (paymentMethod === 'COD') {
    let orderSubtotal = 0;
    for (const item of items) {
      if (item.productId) {
        const prod = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true, basePrice: true, salePrice: true, dealerPrice: true, codAvailable: true, isActive: true, deletedAt: true, variants: true }
        });
        if (!prod || !prod.isActive || prod.deletedAt) {
          return res.status(400).json({ error: `Product "${item.productId}" is no longer available.` });
        }
        if (!item.isFree && prod.codAvailable === false) {
          return res.status(400).json({
            error: `Cash on Delivery (COD) is unavailable for "${prod.name}". Please choose online payment.`
          });
        }
        const effectivePrice = calculateEffectiveItemPrice(prod, item, customerType);
        orderSubtotal += effectivePrice * (item.quantity || 1);
      }
    }
    if (orderSubtotal > 2500) {
      logger.warn('[COD Validation Failed in order.ts]: Effective subtotal exceeds 2500 limit', {
        orderSubtotal,
        limit: 2500
      });
      return res.status(400).json({
        error: 'Cash on Delivery is available only for eligible products with a cart total of ₹2,500 or below.'
      });
    }
  }

  try {
    const orderNumber = await generateNextOrderNumber(prisma);

    // Resolve or create Customer record
    let customerIdToUse: string | null = null;

    if (userId) {
      let customer = await prisma.customer.findFirst({ where: { userId } });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            userId,
            phone: resolvedPhone || null,
            customerType: customerType || 'retail'
          }
        });
      } else if (resolvedPhone && customer.phone !== resolvedPhone) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { phone: resolvedPhone }
        });
        customer.phone = resolvedPhone;
      }
      if (resolvedPhone) {
        await prisma.user.update({
          where: { id: userId },
          data: { mobile: resolvedPhone }
        }).catch(() => {});
      }
      customerIdToUse = customer.id;
    } else {
      // Find or create guest user
      let guestUser = await prisma.user.findFirst({ where: { email: resolvedEmail } });
      if (!guestUser) {
        guestUser = await prisma.user.create({
          data: {
            email: resolvedEmail,
            firstName: resolvedName.split(' ')[0] || 'Guest',
            lastName: resolvedName.split(' ').slice(1).join(' ') || 'Customer',
            mobile: resolvedPhone || null,
            passwordHash: '',
            isActive: true,
            role: 'Guest'
          }
        });
      } else if (resolvedPhone && guestUser.mobile !== resolvedPhone) {
        await prisma.user.update({
          where: { id: guestUser.id },
          data: { mobile: resolvedPhone }
        }).catch(() => {});
      }

      let guestCustomer = await prisma.customer.findFirst({ where: { userId: guestUser.id } });
      if (!guestCustomer) {
        guestCustomer = await prisma.customer.create({
          data: {
            userId: guestUser.id,
            phone: resolvedPhone,
            customerType: 'guest'
          }
        });
      } else if (resolvedPhone && guestCustomer.phone !== resolvedPhone) {
        await prisma.customer.update({
          where: { id: guestCustomer.id },
          data: { phone: resolvedPhone }
        });
        guestCustomer.phone = resolvedPhone;
      }
      customerIdToUse = guestCustomer.id;
    }

    // Execute order creation in a managed transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Process Addresses
      let shippingAddressId: string | null = null;
      let billingAddressId: string | null = null;

      if (resolvedAddress) {
        const addressObj = typeof resolvedAddress === 'object' ? resolvedAddress : shippingAddressSnapshot;
        const name = addressObj.fullName || addressObj.name || resolvedName;
        const phone = addressObj.phone || addressObj.mobile || resolvedPhone;
        const addressType = addressObj.addressType || 'home';
        const rawLine1 = addressObj.addressLine1 || (addressObj.houseNo ? `${addressObj.houseNo} ${addressObj.street || ''}`.trim() : (addressObj.street || addressObj.address || 'N/A'));
        const addrLine2 = addressObj.addressLine2 || addressObj.landmark || '';
        const city = addressObj.city || 'N/A';
        const state = addressObj.state || 'N/A';
        const postalCode = addressObj.postalCode || addressObj.pincode || '100001';
        const country = addressObj.country || 'India';

        let formattedLine1 = rawLine1;
        if (!rawLine1.includes('|')) {
          formattedLine1 = `${name || 'Customer'} | ${phone || ''} | ${addressType} | ${rawLine1}`.trim();
        }

        // Primary dedup: exact match on formatted or raw addressLine1
        let shipAddr = await tx.customerAddress.findFirst({
          where: {
            customerId: customerIdToUse,
            OR: [
              { addressLine1: formattedLine1 },
              { addressLine1: rawLine1 }
            ]
          }
        });

        // Secondary dedup: match by city + postalCode + street part (catches pre-saved addresses)
        if (!shipAddr && postalCode && postalCode !== '100001') {
          const rawStreetPart = rawLine1.trim().toLowerCase();
          const candidates = await tx.customerAddress.findMany({
            where: { customerId: customerIdToUse, city, postalCode }
          });
          shipAddr = candidates.find((a: any) => {
            const existStreet = a.addressLine1.includes('|')
              ? a.addressLine1.split('|').slice(3).join('|').trim()
              : a.addressLine1.trim();
            return existStreet.toLowerCase() === rawStreetPart
              || a.addressLine1.toLowerCase().includes(rawStreetPart.substring(0, Math.min(rawStreetPart.length, 15)));
          }) || null;
        }

        if (!shipAddr) {
          shipAddr = await tx.customerAddress.create({
            data: {
              customerId: customerIdToUse,
              addressLine1: formattedLine1,
              addressLine2: addrLine2,
              city,
              state,
              postalCode,
              country,
              isDefault: !userId
            }
          });
        } else if (phone && !shipAddr.addressLine1.includes(phone)) {
          shipAddr = await tx.customerAddress.update({
            where: { id: shipAddr.id },
            data: { addressLine1: formattedLine1 }
          });
        }
        shippingAddressId = shipAddr.id;
        billingAddressId = shipAddr.id;

        if (billingAddress) {
          const isBillObj = typeof billingAddress === 'object';
          const billAddrLine1 = isBillObj ? (billingAddress.addressLine1 || billingAddress.address || 'N/A') : billingAddress;
          const billAddrLine2 = isBillObj ? (billingAddress.addressLine2 || '') : '';
          const billCity = isBillObj ? (billingAddress.city || 'N/A') : 'City';
          const billState = isBillObj ? (billingAddress.state || 'N/A') : 'State';
          const billPostalCode = isBillObj ? (billingAddress.postalCode || billingAddress.pincode || 'N/A') : '100001';
          const billCountry = isBillObj ? (billingAddress.country || 'India') : 'India';

          if (billAddrLine1 !== rawLine1) {
            let billAddr = await tx.customerAddress.findFirst({
              where: { customerId: customerIdToUse, OR: [{ addressLine1: billAddrLine1 }], city: billCity, postalCode: billPostalCode }
            });
            if (!billAddr) {
              billAddr = await tx.customerAddress.create({
                data: {
                  customerId: customerIdToUse,
                  addressLine1: billAddrLine1,
                  addressLine2: billAddrLine2,
                  city: billCity,
                  state: billState,
                  postalCode: billPostalCode,
                  country: billCountry,
                  isDefault: false
                }
              });
            }
            billingAddressId = billAddr.id;
          }
        }
      }

      // 2. Process Items and calculate totals
      let subtotal = 0;
      const parsedItems = [];
      const itemConfigs: any[] = [];

      for (const it of items) {
        const prod = await tx.product.findUnique({
          where: { id: it.productId },
          include: { variants: true }
        });
        if (!prod) throw new Error(`Product not found: ${it.productId}`);

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
          basePrice: it.isFree ? 0 : Number(prod.salePrice || prod.basePrice || effectiveUnitPrice),
          effectivePrice: effectiveUnitPrice,
          quantity: qty,
          lineTotal,
          isFree: it.isFree || false,
          configurationType: it.isFree ? 'free_bundle' : (it.configurationType || it.bundleDetails?.configurationType || (it.bundleDetails ? 'bundle' : 'standard')),
          configurationName: it.configurationName || it.bundleDetails?.bundleName || (it.isFree ? `Free Included` : null),
          bundleDetails: it.bundleDetails || null,
          selectedOptions: it.selectedOptions || it.bundleDetails?.selectedOptions || it.bundleDetails?.selectedVariants || []
        });
      }

      // Calculate dynamic shipping using Centralized Shipping Engine
      const appSettings = (await getSettingsService()) || {};
      const orderShippingSettings = appSettings.shippingSettings || {};
      const orderFreeShippingThreshold = orderShippingSettings.freeShippingThreshold !== undefined && orderShippingSettings.freeShippingThreshold !== null && !isNaN(Number(orderShippingSettings.freeShippingThreshold))
        ? Number(orderShippingSettings.freeShippingThreshold)
        : (orderShippingSettings.freeShippingMinSpent !== undefined && orderShippingSettings.freeShippingMinSpent !== null && !isNaN(Number(orderShippingSettings.freeShippingMinSpent))
          ? Number(orderShippingSettings.freeShippingMinSpent)
          : 3500);

      const shippingCalc = await ShippingService.calculateShipping(parsedItems, undefined, subtotal);
      let shippingAmount = shippingCalc.shippingCharge;
      if (shippingCalc.freeShipping || (orderFreeShippingThreshold > 0 && subtotal >= orderFreeShippingThreshold)) {
        shippingAmount = 0;
      } else if ((shippingAmount === 0 || isNaN(shippingAmount)) && typeof req.body.shippingAmount === 'number' && req.body.shippingAmount > 0) {
        shippingAmount = Number(req.body.shippingAmount);
      }
      const shippingSource = shippingCalc.source;
      const estimatedDelivery = `${shippingCalc.estimatedDays} Days`;
      const shippingMethod = req.body.shippingMethod || 'Standard Delivery';

      const codCharge = paymentMethod === 'COD' ? 100 : 0;
      const taxAmount = 0; // GST already included in product price
      const discountAmount = 0;
      const totalAmount = subtotal + shippingAmount + codCharge + taxAmount - discountAmount;

      // 3. Create Order
      const orderEntity = await tx.order.create({
        data: {
          customerId: customerIdToUse,
          orderNumber,
          totalAmount,
          taxAmount,
          shippingAmount,
          shippingSource,
          estimatedDelivery,
          shippingMethod,
          discountAmount,
          status: 'Pending',
          gstNumber: finalGstNumber,
          companyName: finalCompanyName,
          shippingAddressId,
          billingAddressId,
          shipment: {
            itemConfigurations: itemConfigs,
            contactDetails: {
              name: resolvedName,
              email: resolvedEmail,
              phone: resolvedPhone
            },
            customerPhone: resolvedPhone,
            customerName: resolvedName,
            customerEmail: resolvedEmail,
            shippingRule: shippingCalc.appliedRule,
            shippingWeightGrams: shippingCalc.totalWeightGrams,
            shippingWeightDisplay: shippingCalc.formattedWeight,
          },
          items: { create: parsedItems },
          payments: {
            create: [{ paymentMethod, amount: totalAmount, status: 'Pending' }]
          }
        },
        include: { items: true, payments: true }
      });

      return orderEntity;
    });

    logger.info(`Order ${newOrder.orderNumber} created successfully`, {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      totalAmount: newOrder.totalAmount,
      paymentMethod
    }, {
      requestId,
      userId,
      module: 'ORDER',
      errorCode: 'ORDER_CREATE_SUCCESS'
    });

    // Fire the centralized order notification pipeline (Customer WhatsApp + Admin WhatsApp + Admin FCM Push)
    // Run async, don't block the response
    dispatchOrderNotifications(newOrder.id).catch((notifErr) => {
      logger.error(`[CreateOrder] Notification pipeline error for order ${newOrder.id}:`, notifErr, {
        requestId,
        orderId: newOrder.id,
        module: 'NOTIFICATION'
      });
    });

    invalidateOrdersCache();
    return res.status(201).json(newOrder);
  } catch (error: any) {
    logger.error('Order creation failed', error, {
      paymentMethod,
      customerType
    }, {
      requestId,
      userId,
      module: 'ORDER',
      errorCode: 'ORDER_CREATE_FAILED'
    });
    return res.status(500).json({ error: 'Checkout processing failed', details: error.message });
  }
};

export const trackOrder = async (req: Request, res: Response) => {
  const { orderNumber, email } = req.body;

  if (!orderNumber || !email) {
    return res.status(400).json({ error: 'Order Number and Email are required for tracking' });
  }

  const cleanNum = String(orderNumber).trim();
  const cleanMail = String(email).trim();

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanNum);
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: { equals: cleanNum, mode: 'insensitive' } },
          ...(isUuid ? [{ id: cleanNum }] : [])
        ]
      },
      include: {
        customer: {
          include: { user: true }
        },
        shippingAddress: true,
        billingAddress: true,
        items: {
          include: {
            product: true,
            variant: true
          }
        },
        payments: true,
        shipments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'No order found matching the provided Number' });
    }

    if (!verifyOrderEmail(cleanMail, order)) {
      return res.status(403).json({ error: 'Email does not match this order. Please enter the email address used during checkout.' });
    }

    return res.status(200).json({
      ...mapOrderWithVariantDetails(order),
      accessToken: generateOrderAccessToken(order),
      statusHistory: [
        {
          id: `status-curr-${order.id}`,
          status: order.status,
          createdAt: order.updatedAt || order.createdAt,
          comments: `Current status: ${order.status}`
        }
      ]
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to track order', details: error.message });
  }
};

export const restoreInventory = async (tx: any, orderId: string) => {
  const items = await tx.orderItem.findMany({
    where: { orderId },
  });

  for (const item of items) {
    if (item.productId) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }

    if (item.variantId) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }
  }
};

export const updateOrderStatus = async (req: any, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; 

  if (!status) {
    return res.status(400).json({ error: 'Status attribute represents a required input' });
  }

  try {
    let orderWhere: any = { id };
    if (id.startsWith('3DX') || id.startsWith('B3D-') || id.startsWith('ORD-')) orderWhere = { orderNumber: id };
    const existing = await prisma.order.findUnique({
      where: orderWhere,
      include: {
        items: { include: { product: true } }
      }
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    if (String(status).toUpperCase() === 'CANCELLED') {
      await prisma.$transaction(async (tx) => {
        await restoreInventory(tx, existing.id);
      });
    }

    const previousStatus = String(existing.status).toUpperCase();
    const newStatus = String(status).toUpperCase();
    const isShippedStatus = newStatus === 'SHIPPED';
    const isTransitioningToShipped = previousStatus !== 'SHIPPED' && isShippedStatus;

    let shipmentDataToSave: any = (existing as any).shipment || null;

    if (isShippedStatus || req.body.courierPartner || req.body.trackingNumber) {
      const courierPartner = req.body.courierPartner || req.body.shipmentCarrier || req.body.shipment?.courierPartner || 'Delhivery Courier';
      const courierDisplayName = req.body.courierDisplayName || req.body.courierName || req.body.shipment?.courierDisplayName || (courierPartner === 'Others' ? (req.body.courierName || 'Custom Courier') : courierPartner);
      const trackingNumber = req.body.trackingNumber || req.body.shipment?.trackingNumber || '';
      const trackingUrl = req.body.trackingUrl || req.body.shipment?.trackingUrl || TrackingService.generateTrackingUrl(courierPartner, trackingNumber, req.body.customUrlPattern);
      const shipmentDate = req.body.shipmentDate || req.body.shipment?.shipmentDate ? new Date(req.body.shipmentDate || req.body.shipment?.shipmentDate) : new Date();
      const estimatedDelivery = req.body.estimatedDelivery || req.body.estimatedDeliveryDate || req.body.shipment?.estimatedDelivery || '3-5 Days';
      const shippingNotes = req.body.shippingNotes || req.body.shipment?.shippingNotes || '';
      const dispatchLocation = req.body.dispatchLocation || req.body.shipment?.dispatchLocation || 'Warehouse';
      const awbNumber = req.body.awbNumber || req.body.shipment?.awbNumber || trackingNumber;

      shipmentDataToSave = {
        courierPartner,
        courierDisplayName,
        trackingNumber,
        trackingUrl,
        shipmentDate,
        estimatedDeliveryStart: req.body.estimatedDeliveryStart || req.body.shipment?.estimatedDeliveryStart || null,
        estimatedDeliveryEnd: req.body.estimatedDeliveryEnd || req.body.shipment?.estimatedDeliveryEnd || null,
        estimatedDelivery,
        shippingNotes,
        dispatchLocation,
        awbNumber,
        lastTrackingSync: new Date().toISOString(),
        status: 'SHIPPED'
      };

      try {
        await prisma.shipment.create({
          data: {
            orderId: existing.id,
            carrier: courierDisplayName,
            courierPartner,
            courierDisplayName,
            trackingNumber,
            trackingUrl,
            dispatchLocation,
            shippingNotes,
            status: 'SHIPPED',
            shippedAt: shipmentDate,
            lastTrackingSync: new Date()
          }
        });
      } catch (shipErr) {
        console.error('[updateOrderStatus] Shipment record creation error:', shipErr);
      }
    }

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: { 
        status,
        ...(shipmentDataToSave?.estimatedDelivery ? { estimatedDelivery: shipmentDataToSave.estimatedDelivery } : {}),
      },
      include: {
        customer: { include: { user: true } },
        shippingAddress: true,
        items: { include: { product: true } },
        shipments: { orderBy: { createdAt: 'desc' } }
      }
    });

    // Write audit log for status update
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        action: 'ORDER_STATUS_UPDATE',
        entityType: 'Order',
        entityId: existing.id,
        newData: JSON.stringify({
          status,
          comments: isShippedStatus && shipmentDataToSave?.trackingNumber ? `Order shipped via ${shipmentDataToSave.courierDisplayName} (Tracking: ${shipmentDataToSave.trackingNumber})` : `Status updated to ${status}`
        }),
      },
    }).catch(() => {});

    if (shipmentDataToSave) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "orders" SET "shipment" = $1::jsonb WHERE "id" = $2`,
          JSON.stringify(shipmentDataToSave),
          existing.id
        );
      } catch (rawErr) {
        console.warn('[updateOrderStatus] Raw JSON shipment update warning:', rawErr);
      }
      (updated as any).shipment = shipmentDataToSave;
    }

    const phone = WhatsAppNotificationService.extractCustomerPhone(updated);
    if (phone) {
      if (isTransitioningToShipped) {
        triggerWhatsAppNotification('order_shipped', phone, updated, updated.customer, {
          shipment: shipmentDataToSave,
          courierName: shipmentDataToSave?.courierDisplayName,
          courierPartner: shipmentDataToSave?.courierPartner,
          trackingNumber: shipmentDataToSave?.trackingNumber,
          trackingUrl: shipmentDataToSave?.trackingUrl,
          estimatedDeliveryDate: shipmentDataToSave?.estimatedDelivery
        }).catch((err) => {
          console.error(`[updateOrderStatus] WhatsApp shipped notification error for order ${updated.orderNumber}:`, err);
        });
      } else if (!isShippedStatus) {
        const statusKey = String(status).toLowerCase();
        triggerWhatsAppNotification(statusKey, phone, updated, updated.customer, shipmentDataToSave ? {
          courierName: shipmentDataToSave?.courierDisplayName,
          trackingNumber: shipmentDataToSave?.trackingNumber,
          trackingUrl: shipmentDataToSave?.trackingUrl,
          estimatedDeliveryDate: shipmentDataToSave?.estimatedDelivery
        } : undefined).catch((err) => {
          console.error(`[updateOrderStatus] WhatsApp trigger error for order ${updated.orderNumber}:`, err);
        });
      }
    }

    invalidateOrdersCache();
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update order tracking status', details: error.message });
  }
};

export const updatePaymentStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!paymentStatus) {
    return res.status(400).json({ error: 'paymentStatus attribute represents a required input' });
  }

  try {
    let orderWhere: any = { id };
    if (id.startsWith('3DX') || id.startsWith('B3D-') || id.startsWith('ORD-')) orderWhere = { orderNumber: id };
    const order = await prisma.order.findUnique({
      where: orderWhere,
      include: {
        payments: true,
        customer: { include: { user: true } },
        shippingAddress: true,
        items: { include: { product: true } }
      }
    });
    if (!order) return res.status(404).json({ error: 'Not found' });

    if (order.payments && order.payments.length > 0) {
      await prisma.payment.update({
        where: { id: order.payments[0].id },
        data: { status: paymentStatus }
      });
    } else {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          paymentMethod: 'UNKNOWN',
          status: paymentStatus
        }
      });
    }

    const phone = WhatsAppNotificationService.extractCustomerPhone(order);
    if (phone) {
      if (paymentStatus === 'PAID') {
        triggerWhatsAppNotification('payment_success', phone, order, order.customer).catch(() => {});
      } else if (paymentStatus === 'FAILED') {
        triggerWhatsAppNotification('payment_failed', phone, order, order.customer).catch(() => {});
      } else if (paymentStatus === 'REFUNDED') {
        triggerWhatsAppNotification('refund_completed', phone, order, order.customer).catch(() => {});
      }
    }

    return res.status(200).json({ message: 'Payment status updated' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to transition payment status', details: error.message });
  }
};

export const updateShipmentTracking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { courierPartner, courierDisplayName, courierName, shipmentCarrier, trackingNumber, trackingUrl, estimatedDelivery, estimatedDeliveryDate, shipmentDate, dispatchLocation, shippingNotes, awbNumber } = req.body;

  try {
    let orderWhere: any = { id };
    if (id.startsWith('3DX') || id.startsWith('B3D-') || id.startsWith('ORD-')) orderWhere = { orderNumber: id };
    const order = await prisma.order.findUnique({
      where: orderWhere,
      include: {
        customer: { include: { user: true } },
        shippingAddress: true,
        items: { include: { product: true } }
      }
    });
    if (!order) return res.status(404).json({ error: 'Not found' });

    const previousStatus = String(order.status).toUpperCase();
    const isTransitioningToShipped = previousStatus !== 'SHIPPED';

    const partner = courierPartner || shipmentCarrier || 'Delhivery Courier';
    const displayName = courierDisplayName || courierName || (partner === 'Others' ? (courierName || 'Custom Courier') : partner);
    const trackNum = trackingNumber || '';
    const trackUrl = trackingUrl || TrackingService.generateTrackingUrl(partner, trackNum);
    const shipDate = shipmentDate ? new Date(shipmentDate) : new Date();
    const estDelivery = estimatedDelivery || estimatedDeliveryDate || '3-5 Days';
    const loc = dispatchLocation || 'Warehouse';
    const notes = shippingNotes || '';
    const awb = awbNumber || trackNum;

    const shipmentObj = {
      courierPartner: partner,
      courierDisplayName: displayName,
      trackingNumber: trackNum,
      trackingUrl: trackUrl,
      shipmentDate: shipDate,
      estimatedDelivery: estDelivery,
      shippingNotes: notes,
      dispatchLocation: loc,
      awbNumber: awb,
      lastTrackingSync: new Date().toISOString(),
      status: 'SHIPPED'
    };

    await prisma.shipment.create({
      data: {
        orderId: order.id,
        carrier: displayName,
        courierPartner: partner,
        courierDisplayName: displayName,
        trackingNumber: trackNum,
        trackingUrl: trackUrl,
        dispatchLocation: loc,
        shippingNotes: notes,
        status: 'SHIPPED',
        shippedAt: shipDate,
        lastTrackingSync: new Date()
      }
    });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'Shipped',
        estimatedDelivery: estDelivery,
      },
      include: {
        customer: { include: { user: true } },
        shippingAddress: true,
        items: { include: { product: true } },
        shipments: { orderBy: { createdAt: 'desc' } }
      }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.id || null,
        action: 'ORDER_SHIPMENT_TRACKING_UPDATE',
        entityType: 'Order',
        entityId: order.id,
        newData: JSON.stringify({
          status: 'Shipped',
          comments: `Shipment details updated: ${displayName} (${trackNum})`
        }),
      },
    }).catch(() => {});

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "orders" SET "shipment" = $1::jsonb WHERE "id" = $2`,
        JSON.stringify(shipmentObj),
        order.id
      );
    } catch (rawErr) {
      console.warn('[updateShipmentTracking] Raw JSON shipment update warning:', rawErr);
    }
    (updated as any).shipment = shipmentObj;

    const phone = WhatsAppNotificationService.extractCustomerPhone(updated);
    if (phone && isTransitioningToShipped) {
      triggerWhatsAppNotification('order_shipped', phone, updated, updated.customer, {
        shipment: shipmentObj,
        courierName: displayName,
        courierPartner: partner,
        trackingNumber: trackNum,
        trackingUrl: trackUrl,
        estimatedDeliveryDate: estDelivery
      }).catch((err) => {
        console.error(`[updateShipmentTracking] WhatsApp shipped trigger error:`, err);
      });
    }

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to attach shipment registry details', details: error.message });
  }
};

export const addOrderNotes = async (req: any, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    let orderWhere: any = { id };
    if (id.startsWith('3DX') || id.startsWith('B3D-') || id.startsWith('ORD-')) orderWhere = { orderNumber: id };
    const order = await prisma.order.findUnique({ where: orderWhere });
    if (!order) return res.status(404).json({ error: 'Not found' });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'admin',
        action: 'ORDER_NOTE_ADDED',
        entityType: 'Order',
        entityId: order.id,
        newData: JSON.stringify({ note: notes, status: order.status, orderNumber: order.orderNumber })
      }
    });

    return res.status(200).json({ message: 'Note added successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to add order notes', details: error.message });
  }
};

export const resendOrderNotification = async (req: any, res: Response) => {
  const { id } = req.params;
  try {
    let orderWhere: any = { id };
    if (id.startsWith('3DX') || id.startsWith('B3D-') || id.startsWith('ORD-')) orderWhere = { orderNumber: id };
    const order = await prisma.order.findUnique({
      where: orderWhere,
    });
    if (!order) return res.status(404).json({ error: 'Order reference does not exist' });

    // Use centralized notification pipeline for resend
    const notifResult = await dispatchOrderNotifications(order.id);

    return res.status(200).json({
      success: true,
      message: 'Order notification resent successfully',
      notifications: notifResult,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to resend notification', details: error.message });
  }
};

export const getOrdersByCustomerId = async (req: any, res: Response) => {
  const { customerId } = req.params;
  const user = req.user;
  const normalizedRole = (user?.role || '').toLowerCase().replace(/[\s\-_]/g, '');
  const isAdmin = ['admin', 'superadmin', 'manager', 'staff'].includes(normalizedRole);

  // Enforce customer ownership authorization check
  if (!isAdmin) {
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    // Verify that the customer record belongs to the authenticated user
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { userId: true }
    });
    if (!customer || customer.userId !== user.id) {
      return res.status(403).json({ success: false, error: 'Access denied: Cannot view other customers\' orders.' });
    }
  }

  try {
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          }
        },
        payments: true,
        shipments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = orders.map((o) => {
      const payment = o.payments?.[0];
      const shipment = o.shipments?.[0];
      return {
        id: o.id,
        orderId: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        orderDate: o.createdAt,
        totalAmount: o.totalAmount,
        paymentMethod: payment?.paymentMethod || 'Razorpay',
        paymentStatus: payment?.status || 'PENDING',
        status: o.status,
        deliveryStatus: o.status,
        trackingStatus: shipment?.status || 'UNSHIPPED',
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to query customer orders', details: error.message });
  }
};

