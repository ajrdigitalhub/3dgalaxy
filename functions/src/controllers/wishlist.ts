import { Request, Response } from 'express';
import prisma from '../config/database';

export const getWishlist = async (req: any, res: Response) => {
  const userId = req.user?.id;
  try {
    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) {
      return res.status(200).json({ success: true, data: [] });
    }

    const wishlist = await prisma.customerWishlist.findMany({
      where: { customerId: customer.id },
      include: { product: true }
    });

    return res.status(200).json({ success: true, data: wishlist });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to access wishlist', details: error.message });
  }
};

export const addToWishlist = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ success: false, error: 'Product ID required' });
  }

  try {
    let customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId,
          customerType: 'retail'
        }
      });
    }

    const existing = await prisma.customerWishlist.findUnique({
      where: {
        customerId_productId: { customerId: customer.id, productId }
      }
    });

    if (existing) {
      return res.status(200).json({ success: true, data: existing });
    }

    const added = await prisma.customerWishlist.create({
      data: { customerId: customer.id, productId }
    });

    return res.status(201).json({ success: true, data: added });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to add to wishlist', details: error.message });
  }
};

export const removeFromWishlist = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { productId } = req.params;

  try {
    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer missing' });
    }

    await prisma.customerWishlist.delete({
      where: {
        customerId_productId: { customerId: customer.id, productId }
      }
    });

    return res.status(200).json({ success: true, message: 'Removed from wishlist' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to remove from wishlist', details: error.message });
  }
};
