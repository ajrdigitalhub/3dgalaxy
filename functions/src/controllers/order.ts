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
            firstImg = typeof variantImages[0] === 'string' ? variantImages[0] : (variantImages[0]?.url || '');
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

        return {
          ...item,
          unitPrice,
          quantity: qty,
          totalPrice,
          basePrice,
          effectivePrice: unitPrice,
          bundleDetails,
          selectedOptions,
          configurationType: configurationType || (selectedWeightValue ? 'weight' : (item.variant ? 'variant' : 'standard')),
          configurationName,
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
  } catch (err: any) {
    logger.warn('[mapOrderWithVariantDetails Warning]:', err.message);
  }
  return order;
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limitNum = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limitNum;

    const search = req.query.search as string;
    const status = req.query.status as string;
    const customerType = req.query.customerType as string;
    const minAmount = req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined;
    const maxAmount = req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    const where: any = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { phone: { contains: search, mode: 'insensitive' } },
              { customerType: { contains: search, mode: 'insensitive' } },
              {
                user: {
                  OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { mobile: { contains: search, mode: 'insensitive' } }
                  ]
                }
              }
            ]
          }
        },
        {
          shippingAddress: {
            OR: [
              { addressLine1: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
              { state: { contains: search, mode: 'insensitive' } },
              { postalCode: { contains: search, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (customerType && customerType !== 'ALL') {
      where.customer = {
        ...where.customer,
        customerType: { equals: customerType, mode: 'insensitive' }
      };
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.totalAmount = {};
      if (minAmount !== undefined) where.totalAmount.gte = minAmount;
      if (maxAmount !== undefined) where.totalAmount.lte = maxAmount;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

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
              product: true,
              variant: true
            }
          },
          payments: true
        }
      })
    ]);

    return res.status(200).json({ total, page, limit: limitNum, data: list.map(mapOrderWithVariantDetails) });
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
    const limitNum = isAll ? 500 : (parseInt(limitQuery, 10) || 50);
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
              product: true,
              variant: true
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
      statusHistory: {
        orderBy: { createdAt: 'desc' as const }
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

    if (!order && isUuid) {
      const checkout = await prisma.abandonedCheckout.findUnique({
        where: { id: rawId },
      });
      if (checkout && checkout.recoveredOrderId) {
        const recovered = await prisma.order.findUnique({
          where: { id: checkout.recoveredOrderId },
          include: standardIncludes,
        });
        if (recovered) {
          return res.status(200).json(mapOrderWithVariantDetails(recovered));
        }
      }
    }

    if (!order) {
      return res.status(404).json({ error: `Order "${rawId}" not found.` });
    }

    const normalizedRole = userRole ? userRole.toLowerCase().replace(/[\s\-_]/g, '') : '';
    const isAdminOrStaff = ['admin', 'superadmin', 'manager', 'staff', 'employee', 'storeowner', 'owner'].includes(normalizedRole);
    if (!isAdminOrStaff) {
      const isGuestCustomer = order.customer?.customerType === 'guest' || !order.customer?.userId;
      if (!isGuestCustomer && userId && order.customer?.userId && order.customer.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden. You do not have access to this order.' });
      }
    }

    return res.status(200).json(mapOrderWithVariantDetails(order));
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
        if (prod.codAvailable === false) {
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
            customerType: customerType || 'retail'
          }
        });
      }
      customerIdToUse = customer.id;
    } else {
      // Find or create guest user
      let guestUser = await prisma.user.findFirst({ where: { email: resolvedEmail } });
      if (!guestUser) {
        let guestRole = await prisma.role.findFirst({ where: { name: 'Guest' } });
        if (!guestRole) {
          guestRole = await prisma.role.create({
            data: { name: 'Guest', description: 'Guest customer role' }
          });
        }

        guestUser = await prisma.user.create({
          data: {
            email: resolvedEmail,
            firstName: resolvedName.split(' ')[0] || 'Guest',
            lastName: resolvedName.split(' ').slice(1).join(' ') || 'Customer',
            passwordHash: '',
            isActive: true,
            roles: {
              create: { roleId: guestRole.id }
            }
          }
        });
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

        let shipAddr = await tx.customerAddress.findFirst({
          where: {
            customerId: customerIdToUse,
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
            const billAddr = await tx.customerAddress.create({
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

      // Calculate dynamic shipping using Centralized Shipping Engine
      const shippingCalc = await ShippingService.calculateShipping(parsedItems);
      const shippingAmount = shippingCalc.shippingCharge;
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
            shippingRule: shippingCalc.appliedRule,
            shippingWeightGrams: shippingCalc.totalWeightGrams,
            shippingWeightDisplay: shippingCalc.formattedWeight,
          },
          items: { create: parsedItems },
          statusHistory: { 
            create: [{ status: 'Pending', comments: isGuest ? 'Guest Order created' : 'Order created', createdBy: userId || null }] 
          },
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
        AND: [
          {
            OR: [
              { orderNumber: { equals: cleanNum, mode: 'insensitive' } },
              ...(isUuid ? [{ id: cleanNum }] : [])
            ]
          },
          {
            customer: {
              user: {
                email: { equals: cleanMail, mode: 'insensitive' }
              }
            }
          }
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
        statusHistory: {
          orderBy: { createdAt: 'desc' }
        },
        payments: true,
        shipments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'No order found matching the provided Number and Email' });
    }

    return res.status(200).json(order);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to track order', details: error.message });
  }
};

export const restoreInventory = async (tx: any, orderId: string) => {
  const existingRestore = await tx.inventoryTransaction.findFirst({
    where: {
      referenceId: orderId,
      transactionType: 'INCREMENT',
      notes: { contains: 'Stock restored' }
    }
  });

  if (existingRestore) {
    console.log(`[InventoryRestore] Stock already restored for Order ${orderId}`);
    return;
  }

  const items = await tx.orderItem.findMany({
    where: { orderId },
  });

  const warehouse = await tx.warehouse.findFirst();

  for (const item of items) {
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
              increment: item.quantity,
            },
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            transactionType: 'INCREMENT',
            quantity: item.quantity,
            referenceId: orderId,
            notes: `Stock restored for cancelled Order ${orderId}`,
          },
        });
      }
    }

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
        statusHistory: {
          create: {
            status,
            comments: isShippedStatus && shipmentDataToSave?.trackingNumber ? `Order shipped via ${shipmentDataToSave.courierDisplayName} (Tracking: ${shipmentDataToSave.trackingNumber})` : `Status updated to ${status}`,
            createdBy: req.user?.id
          }
        }
      },
      include: {
        customer: { include: { user: true } },
        shippingAddress: true,
        items: { include: { product: true } },
        shipments: { orderBy: { createdAt: 'desc' } }
      }
    });

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
        statusHistory: {
          create: {
            status: 'Shipped',
            comments: `Shipment details updated: ${displayName} (${trackNum})`,
            createdBy: (req as any).user?.id
          }
        }
      },
      include: {
        customer: { include: { user: true } },
        shippingAddress: true,
        items: { include: { product: true } },
        shipments: { orderBy: { createdAt: 'desc' } }
      }
    });

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

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: order.status,
        comments: `Admin Note: ${notes}`,
        createdBy: req.user?.id
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
