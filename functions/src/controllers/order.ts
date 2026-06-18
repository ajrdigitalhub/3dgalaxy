import { Request, Response } from 'express';
import prisma from '../config/database';

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
                images: true,
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

    if (userRole !== 'Admin' && userRole !== 'Manager') {
      if (order.customerType === 'GUEST') {
        const reqSessionId = req.headers['x-guest-session-id'] || req.query.guestSessionId;
        if (order.guestSessionId !== reqSessionId) {
          return res.status(403).json({ error: 'Forbidden: Guest session mismatch' });
        }
      } else {
        if (order.customer?.userId !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
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

  const isGuest = customerType === 'GUEST' || !userId;

  if (isGuest) {
    if (!items || items.length === 0 || !shippingAddress || !paymentMethod || !guestName || !guestEmail || !guestPhone) {
      return res.status(400).json({ error: 'Missing required guest checkout information' });
    }
  } else {
    if (!items || items.length === 0 || !shippingAddress || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required checkout information' });
    }
  }

  try {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ORD-2026-${randomSuffix.toString().padStart(6, '0')}`;

    const transaction = await prisma.$transaction(async (tx) => {
      let customerId: string | null = null;
      let shippingAddressId: string | null = null;
      let billingAddressId: string | null = null;

      if (!isGuest) {
        // Get or create customer for the user
        let customer = await prisma.customer.findFirst({ where: { userId } });
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              userId,
              customerType: 'retail'
            }
          });
        }
        customerId = customer.id;

        // Create Address
        const shipAddr = await tx.customerAddress.create({
          data: {
            customerId: customer.id,
            addressLine1: shippingAddress.addressLine1 || shippingAddress.address || 'N/A',
            addressLine2: shippingAddress.addressLine2 || '',
            city: shippingAddress.city || 'N/A',
            state: shippingAddress.state || 'N/A',
            postalCode: shippingAddress.postalCode || shippingAddress.pincode || 'N/A',
            country: shippingAddress.country || 'India',
            isDefault: true
          }
        });
        shippingAddressId = shipAddr.id;

        billingAddressId = shipAddr.id;
        if (billingAddress && (billingAddress.addressLine1 || billingAddress.address)) {
          const billingAddrInput = billingAddress.addressLine1 || billingAddress.address;
          if (billingAddrInput !== (shippingAddress.addressLine1 || shippingAddress.address)) {
            const billAddr = await tx.customerAddress.create({
              data: {
                customerId: customer.id,
                addressLine1: billingAddress.addressLine1 || billingAddress.address || 'N/A',
                addressLine2: billingAddress.addressLine2 || '',
                city: billingAddress.city || 'N/A',
                state: billingAddress.state || 'N/A',
                postalCode: billingAddress.postalCode || billingAddress.pincode || 'N/A',
                country: billingAddress.country || 'India',
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

        let price = prod.salePrice || prod.basePrice;
        
        // Check dealer price if registered user has user type DEALER
        if (!isGuest && customerId) {
          const customerDb = await tx.customer.findUnique({ where: { id: customerId } });
          if (customerDb && customerDb.customerType === 'DEALER') {
            price = prod.dealerPrice || prod.basePrice;
          }
        }

        if (it.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: it.variantId } });
          if (variant) price = variant.price;
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
      const taxAmount = subtotal * 0.18; // 18% GST example
      const discountAmount = 0;
      const totalAmount = subtotal + shippingAmount + taxAmount - discountAmount;

      // 3. Create Order
      const orderEntity = await tx.order.create({
        data: {
          customerId,
          customerType: isGuest ? 'GUEST' : 'REGISTERED',
          guestName: isGuest ? guestName : null,
          guestEmail: isGuest ? guestEmail : null,
          guestPhone: isGuest ? guestPhone : null,
          guestAddress: isGuest ? JSON.stringify(shippingAddress) : null,
          guestSessionId: isGuest ? guestSessionId : null,
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
            create: [{ status: 'Pending', comments: isGuest ? 'Guest Order created' : 'Order created', createdBy: userId || 'GUEST' }] 
          },
          payments: {
            create: [{ paymentMethod, amount: totalAmount, status: 'Pending' }]
          }
        },
        include: { items: true, payments: true }
      });

      return orderEntity;
    });

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
        OR: [
          { guestEmail: email.trim() },
          { customer: { user: { email: email.trim() } } }
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
            product: {
              include: { images: true }
            },
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
    });
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
    const order = await prisma.order.findUnique({ where: orderWhere, include: { payments: true } });
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
        trackingUrl: trackingUrl || null,
        estimatedDelivery: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
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

      await prisma.notification.create({
        data: {
          userId,
          templateId: template.id,
          status: 'SENT',
          sentAt: new Date()
        }
      });
    }

    return res.status(200).json({ success: true, message: 'Order notification resent successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to resend notification', details: error.message });
  }
};
