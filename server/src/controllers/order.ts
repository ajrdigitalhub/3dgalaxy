import { Request, Response } from 'express';
import prisma from '../config/database';
import { triggerWhatsAppNotification } from './whatsapp';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bbrahma_3d_galaxy_labs_secret_jwt_key_2026';

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
        customer: {
          include: { user: true }
        },
        shippingAddress: true,
        billingAddress: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' }
        },
        shipments: {
          orderBy: { createdAt: 'desc' }
        },
        payments: true
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
  const {
    items,
    totalAmount,
    shippingAddress,
    billingAddress,
    guestName,
    guestEmail,
    guestPhone,
    gstNumber,
    companyName,
    orderNotes,
  } = req.body; // Items: [{productId, variantId, quantity}]

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Checkout items are required' });
  }

  try {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `B3D-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    // Inline parse token from authorization header if present
    let userId: string | null = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.id;
      } catch (err) {
        // invalid token is treated as guest
      }
    }

    // Resolve or create Customer record
    let customerIdToUse: string | null = null;
    let customerPhone = '';

    if (userId) {
      const customer = await prisma.customer.findFirst({ where: { userId } });
      if (customer) {
        customerIdToUse = customer.id;
        customerPhone = customer.phone || '';
      } else {
        const newCust = await prisma.customer.create({
          data: {
            userId,
            phone: guestPhone || '',
          }
        });
        customerIdToUse = newCust.id;
        customerPhone = newCust.phone || '';
      }
    } else {
      const email = guestEmail || `guest-${Date.now()}@3dgalaxy.com`;
      const name = guestName || 'Guest Customer';
      const phone = guestPhone || '';
      customerPhone = phone;

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

    // Resolve shipping/billing addresses
    let shippingAddressId: string | null = null;
    let billingAddressId: string | null = null;

    if (shippingAddress) {
      const shipAddr = await prisma.customerAddress.create({
        data: {
          customerId: customerIdToUse,
          addressLine1: shippingAddress.addressLine1 || 'N/A',
          addressLine2: shippingAddress.addressLine2 || '',
          city: shippingAddress.city || 'N/A',
          state: shippingAddress.state || 'N/A',
          postalCode: shippingAddress.pincode || '000000',
          country: shippingAddress.country || 'India',
        }
      });
      shippingAddressId = shipAddr.id;

      const billAddr = billingAddress ? await prisma.customerAddress.create({
        data: {
          customerId: customerIdToUse,
          addressLine1: billingAddress.addressLine1 || 'N/A',
          addressLine2: billingAddress.addressLine2 || '',
          city: billingAddress.city || 'N/A',
          state: billingAddress.state || 'N/A',
          postalCode: billingAddress.pincode || '000000',
          country: billingAddress.country || 'India',
        }
      }) : shipAddr;
      billingAddressId = billAddr.id;
    }

    // Wrap in a transaction to safely handle inventory check & deductions
    const transaction = await prisma.$transaction(async (tx) => {
      let finalTotal = 0;
      const parsedItems = [];

      // Gather all paid product IDs
      const paidProductIds = items.filter((it: any) => !it.isFree).map((it: any) => it.productId);
      const validBundleProductIds = new Set<string>();

      for (const pId of paidProductIds) {
        const p = await tx.product.findUnique({ where: { id: pId } });
        if (p && p.bundleProducts) {
          try {
            const list = typeof p.bundleProducts === 'string' ? JSON.parse(p.bundleProducts) : p.bundleProducts;
            if (Array.isArray(list)) {
              list.forEach((item: any) => {
                const id = typeof item === 'string' ? item : item.id;
                if (id) {
                  validBundleProductIds.add(id);
                }
              });
            }
          } catch (e) {
            console.error("Error parsing bundleProducts in order controller:", e);
          }
        }
      }

      for (const it of items) {
        const prod = await tx.product.findUnique({ where: { id: it.productId } });
        if (!prod || prod.stock < it.quantity) {
          throw new Error(`Insufficient inventory stock for SKU: ${prod?.name || it.productId}`);
        }

        let price = 0;
        const isFreeBundle = !!it.isFree && validBundleProductIds.has(it.productId);

        if (!isFreeBundle) {
          price = prod.salePrice ? Number(prod.salePrice) : Number(prod.basePrice);

          // Handle variant price override if specified
          if (it.variantId) {
            const variant = await tx.productVariant.findUnique({ where: { id: it.variantId } });
            if (variant) {
              price = Number(variant.price);
            }
          }
        }

        finalTotal += price * it.quantity;

        // Deduct core asset stock
        await tx.product.update({
          where: { id: it.productId },
          data: { stock: { decrement: it.quantity } },
        });

        parsedItems.push({
          productId: it.productId,
          variantId: it.variantId || null,
          quantity: it.quantity,
          unitPrice: price,
          totalPrice: price * it.quantity,
        });
      }

      const orderEntity = await tx.order.create({
        data: {
          customerId: customerIdToUse,
          orderNumber,
          totalAmount: totalAmount ? parseFloat(totalAmount) : finalTotal,
          status: 'PENDING',
          shippingAddressId,
          billingAddressId,
          gstNumber: gstNumber || null,
          companyName: companyName || null,
          notes: orderNotes || null,
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

    // Fetch full order details with customer and items to send WhatsApp Placed notification
    const fullOrder = await prisma.order.findUnique({
      where: { id: transaction.id },
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    });

    if (fullOrder && fullOrder.customer?.phone) {
      await triggerWhatsAppNotification('order_placed', fullOrder.customer.phone, fullOrder, fullOrder.customer);
    }

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
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    });

    const phone = (updated as any).customer?.phone || (typeof (updated as any).shippingAddress === 'string' ? JSON.parse((updated as any).shippingAddress).phone : (updated as any).shippingAddress?.phone);
    if (phone) {
      const statusKey = String(status).toLowerCase();
      await triggerWhatsAppNotification(statusKey, phone, updated, (updated as any).customer);
    }

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update order tracking status', details: error.message });
  }
};

export const updatePaymentStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentStatus } = req.body; // UNPAID, PAID, REFUNDED

  if (!paymentStatus) {
    return res.status(400).json({ error: 'paymentStatus attribute represents a required input' });
  }

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: { paymentStatus } as any,
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    });

    const phone = (updated as any).customer?.phone || (typeof (updated as any).shippingAddress === 'string' ? JSON.parse((updated as any).shippingAddress).phone : (updated as any).shippingAddress?.phone);
    if (phone) {
      if (paymentStatus === 'PAID') {
        await triggerWhatsAppNotification('payment_success', phone, updated, (updated as any).customer);
      } else if (paymentStatus === 'FAILED') {
        await triggerWhatsAppNotification('payment_failed', phone, updated, (updated as any).customer);
      } else if (paymentStatus === 'REFUNDED') {
        await triggerWhatsAppNotification('refund_completed', phone, updated, (updated as any).customer);
      }
    }

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to transition payment status', details: error.message });
  }
};

export const updateShipmentTracking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { shipmentCarrier, trackingNumber } = req.body;

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: shipmentCarrier ? 'SHIPPED' : undefined,
        shipments: {
          create: {
            carrier: shipmentCarrier,
            trackingNumber: trackingNumber,
            status: 'SHIPPED'
          }
        }
      } as any,
    });
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to attach shipment registry details', details: error.message });
  }
};
