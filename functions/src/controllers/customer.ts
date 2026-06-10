import { Request, Response } from 'express';
import prisma from '../config/database';

const formatListName = (customer: any) => customer.user ? `${customer.user.firstName ?? ''} ${customer.user.lastName ?? ''}`.trim() : undefined;

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const list = await prisma.customer.findMany({
      include: { user: true, addresses: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(list.map((customer) => ({
      ...customer,
      name: formatListName(customer),
    })));
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to find customers listing', details: error.message });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const account = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: true,
        addresses: true,
        orders: true,
        wishlist: { include: { product: true } },
        reviews: true,
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Customer account missing' });
    }

    return res.status(200).json(account);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to access customer profile detail', details: error.message });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  const { userId, phone, customerType } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Associated user ID is required to create a customer profile' });
  }

  try {
    const created = await prisma.customer.create({
      data: { userId, phone, customerType: customerType || 'retail' },
    });
    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to initiate customer account', details: error.message });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { phone, customerType } = req.body;

  try {
    const updated = await prisma.customer.update({
      where: { id },
      data: { phone, customerType },
    });
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to modify account details', details: error.message });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.customer.delete({ where: { id } });
    return res.status(200).json({ message: 'Customer account permanently deactivated' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Deactivation command failed', details: error.message });
  }
};

// Address Management
export const manageAddress = async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { addressId, addressLine1, addressLine2, city, state, postalCode, country, isDefault } = req.body;

  try {
    if (isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId, country },
        data: { isDefault: false },
      });
    }

    const payload = {
      customerId,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault: !!isDefault,
    };

    let address;
    if (addressId) {
      address = await prisma.customerAddress.update({
        where: { id: addressId },
        data: payload,
      });
    } else {
      address = await prisma.customerAddress.create({ data: payload });
    }

    return res.status(200).json(address);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to write address record data', details: error.message });
  }
};

export const deleteAddress = async (req: Request, res: Response) => {
  const { addressId } = req.params;
  try {
    await prisma.customerAddress.delete({ where: { id: addressId } });
    return res.status(200).json({ message: 'Address card purged success' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Address delete request stalled', details: error.message });
  }
};

// Wishlist
export const toggleWishlistItem = async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'Product SKU ID component required' });
  }

  try {
    const existing = await prisma.customerWishlist.findUnique({
      where: { customerId_productId: { customerId, productId } },
    });

    if (existing) {
      await prisma.customerWishlist.delete({ where: { customerId_productId: { customerId, productId } } });
      return res.status(200).json({ active: false, message: 'Removed from watchlist indexes' });
    }

    const added = await prisma.customerWishlist.create({ data: { customerId, productId } });
    return res.status(201).json({ active: true, data: added });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to toggle client watchlist index', details: error.message });
  }
};

// Reviews management
export const getReviews = async (req: Request, res: Response) => {
  try {
    const reviews = await prisma.productReview.findMany({
      include: {
        product: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(reviews);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to access customer feedback logs', details: error.message });
  }
};

export const createReview = async (req: Request, res: Response) => {
  const { productId, customerId, rating, comment } = req.body;
  if (!productId || !customerId || !rating) {
    return res.status(400).json({ error: 'Product index, reviewer and score rating out of 5 required' });
  }

  try {
    const review = await prisma.productReview.create({
      data: {
        productId,
        userId: customerId,
        rating: parseInt(rating, 10),
        comment,
      },
    });
    return res.status(201).json(review);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to record customer product evaluation', details: error.message });
  }
};

export const approveReview = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved } = req.body;

  try {
    const review = await prisma.productReview.update({
      where: { id },
      data: { isApproved: !!approved },
    });
    return res.status(200).json(review);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to authorize customer feedback card', details: error.message });
  }
};
