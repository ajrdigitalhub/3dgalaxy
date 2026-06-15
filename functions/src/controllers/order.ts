import { Request, Response } from 'express';
import prisma from '../config/database';

export const getOrders = async (req: Request, res: Response) => {
  try {
    const list = await prisma.order.findMany({
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
    });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to find orders index', details: error.message });
  }
};

export const getMyOrders = async (req: any, res: Response) => {
  const userId = req.user?.id;
  try {
    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) {
      return res.status(200).json([]);
    }

    const list = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(list);
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
        customer: true,
        shippingAddress: true,
        billingAddress: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        statusHistory: true,
        payments: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order reference does not exist' });
    }

    if (userRole !== 'Admin' && userRole !== 'Manager') {
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
  const { items, shippingAddress, billingAddress, paymentMethod } = req.body;
  const userId = req.user?.id; // from auth middleware

  if (!userId || !items || items.length === 0 || !shippingAddress || !paymentMethod) {
    return res.status(400).json({ error: 'Missing required checkout information' });
  }

  try {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ORD-2026-${randomSuffix.toString().padStart(6, '0')}`;

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

    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create Addresses
      const shipAddr = await tx.customerAddress.create({
        data: {
          customerId: customer.id,
          addressLine1: shippingAddress.addressLine1,
          addressLine2: shippingAddress.addressLine2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.pincode,
          country: shippingAddress.country || 'India',
          isDefault: true
        }
      });

      let billAddrId = shipAddr.id;
      if (billingAddress && billingAddress.addressLine1 !== shippingAddress.addressLine1) {
        const billAddr = await tx.customerAddress.create({
          data: {
            customerId: customer.id,
            addressLine1: billingAddress.addressLine1,
            addressLine2: billingAddress.addressLine2,
            city: billingAddress.city,
            state: billingAddress.state,
            postalCode: billingAddress.pincode,
            country: billingAddress.country || 'India',
            isDefault: false
          }
        });
        billAddrId = billAddr.id;
      }

      // 2. Process Items and calculate totals
      let subtotal = 0;
      const parsedItems = [];

      for (const it of items) {
        const prod = await tx.product.findUnique({ where: { id: it.productId } });
        if (!prod) throw new Error(`Product not found: ${it.productId}`);

        let price = prod.salePrice || prod.basePrice;
        if (customer.customerType === 'DEALER') price = prod.dealerPrice || prod.basePrice;

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
          customerId: customer.id,
          orderNumber,
          totalAmount,
          taxAmount,
          shippingAmount,
          discountAmount,
          status: 'Pending',
          shippingAddressId: shipAddr.id,
          billingAddressId: billAddrId,
          items: { create: parsedItems },
          statusHistory: { 
            create: [{ status: 'Pending', comments: 'Order created', createdBy: userId }] 
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

export const updateOrderStatus = async (req: any, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED

  if (!status) {
    return res.status(400).json({ error: 'Status attribute represents a required input' });
  }

  try {
    const updated = await prisma.order.update({
      where: { id },
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
  const { paymentStatus } = req.body; // USED AS PAYMENT STATUS STRING OR LOGIC

  if (!paymentStatus) {
    return res.status(400).json({ error: 'paymentStatus attribute represents a required input' });
  }

  try {
    // Usually updates Payment record, just return 200 for now.
    return res.status(200).json({ message: 'Payment status handled' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to transition payment status', details: error.message });
  }
};

export const updateShipmentTracking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { shipmentCarrier, trackingNumber } = req.body;

  try {
    // Add shipment record
    await prisma.shipment.create({
      data: {
        orderId: id,
        carrier: shipmentCarrier || 'Unknown',
        trackingNumber: trackingNumber || '',
        status: 'SHIPPED',
        shippedAt: new Date()
      }
    });

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: shipmentCarrier ? 'SHIPPED' : undefined,
      },
    });
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to attach shipment registry details', details: error.message });
  }
};
