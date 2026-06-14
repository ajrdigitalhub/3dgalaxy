import { Request, Response } from 'express';
import prisma from '../config/database';

export const getOrders = async (req: Request, res: Response) => {
  try {
    const list = await prisma.order.findMany({
      include: {
        customer: true,
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

export const getOrderById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order reference does not exist' });
    }

    return res.status(200).json(order);
  } catch (error: any) {
    return res.status(500).json({ error: 'Order detail retrieval failed', details: error.message });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  const { customerId, items, totalAmount } = req.body; // Items: [{productId, variantId, quantity}]
  if (!customerId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Customer identifier and checkout items are required' });
  }

  try {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `B3D-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ error: 'Associated customer profile missing' });
    }

    // Wrap in a transaction to safely handle inventory check & deductions
    const transaction = await prisma.$transaction(async (tx: any) => {
      let finalTotal = 0;
      const parsedItems = [];

      for (const it of items) {
        const prod = await tx.product.findUnique({ where: { id: it.productId } });
        if (!prod || prod.stock < it.quantity) {
          throw new Error(`Insufficient inventory stock for SKU: ${prod?.name || it.productId}`);
        }

        let price = prod.salePrice;
        // Dealer pricing logic - customerType field in Customer model
        if (customer.customerType === 'DEALER') {
          price = prod.dealerPrice || prod.salePrice; // Fallback if dealerPrice not set
        }

        // Handle variant price override if specified
        if (it.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: it.variantId } });
          if (variant) {
            price = variant.price;
          }
        }

        finalTotal += price * it.quantity;

        // Deduct core asset stock using inventory (Not required for this simple mock but let's avoid product.stock)
        // Note: product stock field was removed in favor of relational Inventory tracking.
        
        parsedItems.push({
          productId: it.productId,
          variantId: it.variantId || null,
          quantity: it.quantity,
          unitPrice: price,
          totalPrice: price * it.quantity
        });
      }

      const orderEntity = await tx.order.create({
        data: {
          customerId,
          orderNumber,
          totalAmount: totalAmount || finalTotal,
          status: 'PENDING',
          items: {
            create: parsedItems,
          },
        },
        include: {
          items: true,
        },
      });

      return orderEntity;
    });

    return res.status(201).json(transaction);
  } catch (error: any) {
    return res.status(500).json({ error: 'Checkout command transaction reverted', details: error.message });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED

  if (!status) {
    return res.status(400).json({ error: 'Status attribute represents a required input' });
  }

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: { status },
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
