import { Request, Response } from 'express';
import prisma from '../config/database';
import { triggerWhatsAppNotification } from './whatsapp';

export const getOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limitNum = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limitNum;

    const [total, list] = await Promise.all([
      prisma.order.count(),
      prisma.order.findMany({
        skip,
        take: limitNum,
        include: {
          customer: {
            include: { user: true }
          },
          shippingAddress: true,
          statusHistory: true,
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    ]);
    return res.status(200).json({ total, page, limit: limitNum, data: list });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to find orders index', details: error.message });
  }
};

export const getMyOrders = async (req: any, res: Response) => {
  const userId = req.user?.id;
  try {
    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) {
      return res.status(200).json({ total: 0, data: [] });
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limitNum = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limitNum;

    const [total, list] = await Promise.all([
      prisma.order.count({ where: { customerId: customer.id } }),
      prisma.order.findMany({
        skip,
        take: limitNum,
        where: { customerId: customer.id },
        include: {
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    ]);
    return res.status(200).json({ total, page, limit: limitNum, data: list });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve your orders', details: error.message });
  }
};

export const getOrderById = async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  try {
    let orderWhere: any;
    if (id.startsWith('B3D-') || id.startsWith('ORD-')) {
      orderWhere = { orderNumber: id };
    } else {
      orderWhere = { id };
    }

    const order = await prisma.order.findUnique({
      where: orderWhere,
      include: {
        customer: {
          include: { user: true }
        },
        shippingAddress: true,
        billingAddress: true,
        items: {
          include: {
            product: {
              include: { 
                inventory: {
                  include: { warehouse: true }
                }
              }
            },
            variant: {
              include: {
                inventory: {
                  include: { warehouse: true }
                }
              }
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' }
        },
        payments: true,
        shipments: {
          orderBy: { createdAt: 'desc' }
        }
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order reference does not exist' });
    }

    const normalizedRole = userRole ? userRole.toLowerCase().replace(/[\s\-_]/g, '') : '';
    if (normalizedRole !== 'admin' && normalizedRole !== 'superadmin' && normalizedRole !== 'manager') {
      if (order.customer?.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    return res.status(200).json(order);
  } catch (error: any) {
    return res.status(500).json({ error: 'Order detail retrieval failed', details: error.message });
  }
};

export const createOrder = async (req: any, res: Response) => {
  const { customerType, guestName, guestEmail, guestPhone, guestSessionId, items, shippingAddress, billingAddress, paymentMethod } = req.body;
  const userId = req.user?.id; // from auth middleware

  const resolvedName = guestName || req.body.name || req.body.customerName || '';
  const resolvedEmail = guestEmail || req.body.email || req.body.customerEmail || '';
  const resolvedPhone = guestPhone || req.body.phone || req.body.customerPhone || '';
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

  try {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ORD-2026-${randomSuffix.toString().padStart(6, '0')}`;

    // Resolve or create Customer record
    let customerIdToUse: string | null = null;

    if (userId) {
      let customer = await prisma.customer.findFirst({ where: { userId } });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            userId,
            customerType: 'retail'
          }
        });
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
          guestRole = await prisma.role.create({
            data: { name: 'Guest', description: 'Guest customer role' }
          });
        }
        guestUser = await prisma.user.create({
          data: {
            email,
            firstName: name.split(' ')[0] || 'Guest',
            lastName: name.split(' ').slice(1).join(' ') || 'Customer',
            passwordHash: '',
            isActive: true,
            roles: {
              create: {
                roleId: guestRole.id
              }
            }
          }
        });
      }

      let guestCust = await prisma.customer.findFirst({ where: { userId: guestUser.id } });
      if (!guestCust) {
        guestCust = await prisma.customer.create({
          data: {
            userId: guestUser.id,
            phone,
            customerType: 'guest'
          }
        });
      }
      customerIdToUse = guestCust.id;
    }

    const transaction = await prisma.$transaction(async (tx) => {
      let shippingAddressId: string | null = null;
      let billingAddressId: string | null = null;

      if (resolvedAddress) {
        const isObj = typeof resolvedAddress === 'object' && resolvedAddress !== null;
        const addrLine1 = isObj ? (resolvedAddress.addressLine1 || resolvedAddress.address || 'N/A') : resolvedAddress;
        const addrLine2 = isObj ? (resolvedAddress.addressLine2 || '') : '';
        const city = isObj ? (resolvedAddress.city || 'N/A') : 'City';
        const state = isObj ? (resolvedAddress.state || 'N/A') : 'State';
        const postalCode = isObj ? (resolvedAddress.postalCode || resolvedAddress.pincode || 'N/A') : '100001';
        const country = isObj ? (resolvedAddress.country || 'India') : 'India';

        const shipAddr = await tx.customerAddress.create({
          data: {
            customerId: customerIdToUse!,
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
                customerId: customerIdToUse!,
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

      for (const it of items) {
        const prod = await tx.product.findUnique({ where: { id: it.productId } });
        if (!prod) throw new Error(`Product not found: ${it.productId}`);

        let price = prod.salePrice ? Number(prod.salePrice) : Number(prod.basePrice);
        
        // Check dealer price if registered user has user type DEALER
        if (!isGuest && customerIdToUse) {
          const customerDb = await tx.customer.findUnique({ where: { id: customerIdToUse } });
          if (customerDb && customerDb.customerType === 'DEALER') {
            price = prod.dealerPrice ? Number(prod.dealerPrice) : Number(prod.basePrice);
          }
        }

        if (it.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: it.variantId } });
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

      const shippingAmount = subtotal > 1000 ? 0 : 99;
      const taxAmount = 0; // GST already included in product price
      const discountAmount = 0;
      const totalAmount = subtotal + shippingAmount + taxAmount - discountAmount;

      // 3. Create Order
      const orderEntity = await tx.order.create({
        data: {
          customerId: customerIdToUse,
          orderNumber,
          totalAmount,
          taxAmount,
          shippingAmount,
          discountAmount,
          status: 'Pending',
          shippingAddressId,
          billingAddressId,
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

    // Fetch full order details with customer and items to send WhatsApp Placed notification
    const fullOrder = await prisma.order.findUnique({
      where: { id: transaction.id },
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    });

    const phone = fullOrder?.customer?.phone;
    if (fullOrder && phone) {
      await triggerWhatsAppNotification('order_placed', phone, fullOrder, fullOrder.customer);
    }

    return res.status(201).json(transaction);
  } catch (error: any) {
    return res.status(500).json({ error: 'Checkout processing failed', details: error.message });
  }
};

export const trackOrder = async (req: Request, res: Response) => {
  const { orderNumber, email } = req.body;

  if (!orderNumber || !email) {
    return res.status(400).json({ error: 'Order Number and Email are required for tracking' });
  }

  try {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: orderNumber.trim(),
        customer: { user: { email: email.trim() } }
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

export const updateOrderStatus = async (req: any, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; 

  if (!status) {
    return res.status(400).json({ error: 'Status attribute represents a required input' });
  }

  try {
    let orderWhere: any = { id };
    if (id.startsWith('B3D-') || id.startsWith('ORD-')) orderWhere = { orderNumber: id };
    const existing = await prisma.order.findUnique({ where: orderWhere });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: { 
        status, 
        statusHistory: {
          create: {
            status,
            comments: `Status updated to ${status}`,
            createdBy: req.user?.id
          }
        }
      },
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    });

    const phone = updated.customer?.phone;
    if (phone) {
      const statusKey = String(status).toLowerCase();
      await triggerWhatsAppNotification(statusKey, phone, updated, updated.customer);
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
    if (id.startsWith('B3D-') || id.startsWith('ORD-')) orderWhere = { orderNumber: id };
    const order = await prisma.order.findUnique({
      where: orderWhere,
      include: {
        payments: true,
        customer: true,
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

    const phone = order.customer?.phone;
    if (phone) {
      if (paymentStatus === 'PAID') {
        await triggerWhatsAppNotification('payment_success', phone, order, order.customer);
      } else if (paymentStatus === 'FAILED') {
        await triggerWhatsAppNotification('payment_failed', phone, order, order.customer);
      } else if (paymentStatus === 'REFUNDED') {
        await triggerWhatsAppNotification('refund_completed', phone, order, order.customer);
      }
    }

    return res.status(200).json({ message: 'Payment status updated' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to transition payment status', details: error.message });
  }
};

export const updateShipmentTracking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { shipmentCarrier, trackingNumber, trackingUrl, estimatedDeliveryDate } = req.body;

  try {
    let orderWhere: any = { id };
    if (id.startsWith('B3D-') || id.startsWith('ORD-')) orderWhere = { orderNumber: id };
    const order = await prisma.order.findUnique({ where: orderWhere });
    if (!order) return res.status(404).json({ error: 'Not found' });

    await prisma.shipment.create({
      data: {
        orderId: order.id,
        carrier: shipmentCarrier || 'Unknown',
        trackingNumber: trackingNumber || '',
        status: 'SHIPPED',
        shippedAt: new Date()
      }
    });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'SHIPPED',
      },
    });
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
    if (id.startsWith('B3D-') || id.startsWith('ORD-')) orderWhere = { orderNumber: id };
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
    if (id.startsWith('B3D-') || id.startsWith('ORD-')) orderWhere = { orderNumber: id };
    const order = await prisma.order.findUnique({
      where: orderWhere,
      include: { customer: { include: { user: true } } }
    });
    if (!order) return res.status(404).json({ error: 'Order reference does not exist' });

    const userId = order.customer?.userId;
    if (userId) {
      let template = await prisma.notificationTemplate.findFirst({
        where: { name: 'Order Update' }
      });
      if (!template) {
        template = await prisma.notificationTemplate.create({
          data: {
            name: 'Order Update',
            channel: 'EMAIL',
            subject: 'Order Status Update',
            body: 'Your order status has been updated. Please check the website for more details.'
          }
        });
      }

      await prisma.systemNotification.create({
        data: {
          userId,
          templateId: template.id,
          status: 'SENT',
          sentAt: new Date()
        }
      });
    }

    //test
    return res.status(200).json({ success: true, message: 'Order notification resent successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to resend notification', details: error.message });
  }
};
