import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const list = await prisma.customer.findMany({
      include: {
        user: true,
        addresses: true
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = list.map((c: any) => ({
      id: c.id,
      userId: c.userId,
      phone: c.phone,
      rewardPoints: c.rewardPoints,
      tier: c.customerType,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      name: c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : 'Customer',
      email: c.user?.email || '',
      company: '',
      addresses: c.addresses,
    }));

    return res.status(200).json(mapped);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to find customers listing', details: error.message });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const c = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: true,
        addresses: true,
        orders: true,
        wishlist: { include: { product: true } },
        reviews: { include: { product: true } },
      },
    });

    if (!c) {
      return res.status(404).json({ error: 'Customer account missing' });
    }

    const mapped = {
      id: c.id,
      userId: c.userId,
      phone: c.phone,
      rewardPoints: c.rewardPoints,
      tier: c.customerType,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      name: c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : 'Customer',
      email: c.user?.email || '',
      company: '',
      addresses: c.addresses,
      orders: c.orders,
      wishlistItems: c.wishlist,
      reviews: c.reviews.map((r: any) => ({
        id: r.id,
        customerId: r.customerId,
        productId: r.productId,
        rating: r.rating,
        comment: r.reviewText,
        createdAt: r.createdAt,
        product: r.product,
      })),
    };

    return res.status(200).json(mapped);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to access customer profile detail', details: error.message });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  const { name, email, phone, company, tier } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Mandatory profile parameters email and name are required' });
  }

  try {
    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const nameParts = (name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || '';
      const hashedPassword = await bcrypt.hash('12345678', 10);

      user = await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          firstName,
          lastName,
          isActive: true,
        },
      });
    }

    const created = await prisma.customer.create({
      data: {
        userId: user.id,
        phone,
        customerType: tier || 'retail',
      },
      include: {
        user: true,
        addresses: true,
      },
    });

    const mapped = {
      id: created.id,
      userId: created.userId,
      phone: created.phone,
      rewardPoints: created.rewardPoints,
      tier: created.customerType,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      name: `${created.user.firstName || ''} ${created.user.lastName || ''}`.trim(),
      email: created.user.email,
      company: '',
      addresses: created.addresses,
    };

    return res.status(201).json(mapped);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to initiate customer account', details: error.message });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, company, tier } = req.body;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (email || name) {
      const nameParts = (name || '').trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      await prisma.user.update({
        where: { id: customer.userId },
        data: {
          email: email || undefined,
          firstName: firstName || undefined,
          lastName: lastName !== undefined ? lastName : undefined,
        },
      });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        phone,
        customerType: tier,
      },
      include: {
        user: true,
        addresses: true,
      },
    });

    const mapped = {
      id: updated.id,
      userId: updated.userId,
      phone: updated.phone,
      rewardPoints: updated.rewardPoints,
      tier: updated.customerType,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      name: `${updated.user.firstName || ''} ${updated.user.lastName || ''}`.trim(),
      email: updated.user.email,
      company: '',
      addresses: updated.addresses,
    };

    return res.status(200).json(mapped);
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
  const { addressId, type, addressLine1, addressLine2, city, state, zipCode, postalCode, country, isDefault, name, phone } = req.body;

  try {
    if (isDefault) {
      // Clear legacy default flags
      await prisma.customerAddress.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    const payload = {
      customerId,
      name: name || null,
      phone: phone || null,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode: postalCode || zipCode || '',
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
      where: {
        customerId_productId: { customerId, productId }
      },
    });

    if (existing) {
      await prisma.customerWishlist.delete({
        where: {
          customerId_productId: { customerId, productId }
        }
      });
      return res.status(200).json({ active: false, message: 'Removed from watchlist indexes' });
    } else {
      const added = await prisma.customerWishlist.create({
        data: { customerId, productId },
      });
      return res.status(201).json({ active: true, data: added });
    }
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to toggle client watchlist index', details: error.message });
  }
};

// Reviews management
export const getReviews = async (req: Request, res: Response) => {
  try {
    const list = await prisma.customerReview.findMany({
      include: {
        product: true,
        customer: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = list.map((r: any) => ({
      id: r.id,
      productId: r.productId,
      customerId: r.customerId,
      rating: r.rating,
      comment: r.reviewText,
      reviewText: r.reviewText,
      createdAt: r.createdAt,
      product: r.product,
      customer: {
        id: r.customer.id,
        userId: r.customer.userId,
        phone: r.customer.phone,
        name: r.customer.user ? `${r.customer.user.firstName || ''} ${r.customer.user.lastName || ''}`.trim() : 'Customer',
        email: r.customer.user?.email || '',
      }
    }));

    return res.status(200).json(mapped);
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
    const review = await prisma.customerReview.create({
      data: {
        productId,
        customerId,
        rating: parseInt(rating, 10),
        reviewText: comment || '',
      },
    });

    return res.status(201).json({
      id: review.id,
      productId: review.productId,
      customerId: review.customerId,
      rating: review.rating,
      comment: review.reviewText,
      createdAt: review.createdAt,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to record customer product evaluation', details: error.message });
  }
};

export const approveReview = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved } = req.body;

  try {
    // Fallback: system-wide customerReviews approve mock as approved flag is not in schema
    return res.status(200).json({ id, isApproved: !!approved });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to authorize customer feedback card', details: error.message });
  }
};
