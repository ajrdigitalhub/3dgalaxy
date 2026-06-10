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
  const { customerId, items, totalAmount } = req.body;
  if (!customerId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Customer identifier and checkout items are required' });
  }

  try {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `B3D-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ error: 'Associated customer profile missing' });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      let finalTotal = 0;
      const parsedItems: any[] = [];

      for (const it of items) {
        const prod = await tx.product.findUnique({ where: { id: it.productId } });
        if (!prod) {
          throw new Error(`Product SKU missing: ${it.productId}`);
        }

        let price = prod.salePrice ?? prod.basePrice;
        if (customer.customerType === 'dealer') {
          price = prod.dealerPrice ?? price;
        }

        if (it.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: it.variantId } });
          if (variant) {
            price = variant.price;
          }
        }

        const unitPrice = Number(price);
        const quantity = parseInt(it.quantity, 10);
        const totalPrice = unitPrice * quantity;
        finalTotal += totalPrice;

        parsedItems.push({
          productId: it.productId,
          variantId: it.variantId || null,
          quantity,
          unitPrice,
          totalPrice,
        });
      }

      const orderEntity = await tx.order.create({
        data: {
          customerId,
          orderNumber,
          totalAmount: totalAmount ? parseFloat(totalAmount) : finalTotal,
          status: 'PENDING',
          items: { create: parsedItems },
        },
        include: { items: true },
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
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status attribute represents a required input' });
  }

  try {
    const updated = await prisma.order.update({ where: { id }, data: { status } });
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update order tracking status', details: error.message });
  }
};

export const updatePaymentStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentStatus, amount, paymentMethod, transactionId } = req.body;

  if (!paymentStatus) {
    return res.status(400).json({ error: 'paymentStatus attribute represents a required input' });
  }

  try {
    const payment = await prisma.payment.create({
      data: {
        orderId: id,
        paymentMethod: paymentMethod || 'UNKNOWN',
        transactionId,
        amount: amount ? parseFloat(amount) : 0,
        status: paymentStatus,
      },
    });
    return res.status(200).json(payment);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to transition payment status', details: error.message });
  }
};

export const updateShipmentTracking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { carrier, trackingNumber, status } = req.body;

  if (!carrier || !trackingNumber) {
    return res.status(400).json({ error: 'carrier and trackingNumber are required' });
  }

  try {
    const shipment = await prisma.shipment.create({
      data: {
        orderId: id,
        carrier,
        trackingNumber,
        status: status || 'SHIPPED',
      },
    });
    return res.status(200).json(shipment);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to attach shipment registry details', details: error.message });
  }
};
