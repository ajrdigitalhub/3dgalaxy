import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';

// 1. Get Customers List (Server-side Paginated, Filtered, Sorted)
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const customerType = (req.query.customerType as string) || '';
    const status = (req.query.status as string) || '';
    const dateFrom = (req.query.dateFrom as string) || '';
    const dateTo = (req.query.dateTo as string) || '';
    const sortField = (req.query.sortField as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const skip = (page - 1) * limit;

    // Build Prisma query condition
    const where: any = {
      user: {
        deletedAt: null // Soft-delete check
      }
    };

    // Apply Search Filter
    if (search) {
      where.OR = [
        { phone: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ]
          }
        }
      ];
    }

    // Apply Customer Type Filter
    if (customerType) {
      where.customerType = customerType;
    }

    // Apply Status Filter
    if (status) {
      where.user.isActive = status === 'active';
    }

    // Apply Date Range Filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Determine Sort options
    let orderBy: any = {};
    if (sortField === 'name') {
      orderBy = { user: { firstName: sortOrder } };
    } else if (sortField === 'email') {
      orderBy = { user: { email: sortOrder } };
    } else if (sortField === 'status') {
      orderBy = { user: { isActive: sortOrder } };
    } else {
      orderBy = { [sortField]: sortOrder };
    }

    // Execute queries in parallel
    const [total, list] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: {
          user: true,
          orders: {
            select: {
              totalAmount: true,
              createdAt: true,
            }
          }
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    // Map list for client response
    const data = list.map((c) => {
      const ordersCount = c.orders.length;
      const spend = c.orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const lastOrder = c.orders.length > 0
        ? c.orders.reduce((max, o) => (o.createdAt > max ? o.createdAt : max), c.orders[0].createdAt)
        : null;

      return {
        id: c.id,
        userId: c.userId,
        name: c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : 'Customer',
        email: c.user?.email || '',
        phone: c.phone || '',
        customerType: c.customerType,
        registrationDate: c.createdAt,
        totalOrders: ordersCount,
        totalSpend: spend,
        lastOrderDate: lastOrder,
        status: c.user?.isActive ? 'Active' : 'Blocked',
        profileImage: c.user?.profileImage || '',
      };
    });

    return res.status(200).json({
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to query customers list.', details: error.message });
  }
};

// 2. Get Customer Profile Details
export const getCustomerById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const c = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: true,
        addresses: true,
        orders: {
          select: {
            totalAmount: true,
          }
        }
      },
    });

    if (!c || c.user.deletedAt) {
      return res.status(404).json({ success: false, error: 'Customer profile not found.' });
    }

    const totalOrders = c.orders.length;
    const totalSpend = c.orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0;

    const data = {
      id: c.id,
      userId: c.userId,
      name: `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim(),
      firstName: c.user.firstName || '',
      lastName: c.user.lastName || '',
      email: c.user.email,
      phone: c.phone || '',
      profileImage: c.user.profileImage || '',
      registrationDate: c.createdAt,
      customerType: c.customerType,
      status: c.user.isActive ? 'Active' : 'Blocked',
      lastLogin: c.user.lastLogin,
      rewardPoints: c.rewardPoints,
      gender: c.user.gender || '',
      dateOfBirth: c.user.dateOfBirth || null,
      stats: {
        totalOrders,
        totalSpend,
        averageOrderValue,
      },
      addresses: c.addresses,
    };

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to access customer profile detail.', details: error.message });
  }
};

// 3. Create Customer
export const createCustomer = async (req: Request, res: Response) => {
  const { name, email, phone, password, customerType, status } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Name and email are required.' });
  }

  try {
    // Validate uniqueness
    const existingUser = await prisma.user.findFirst({
      where: { email, deletedAt: null }
    });

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'A customer with this email already exists.' });
    }

    const nameParts = (name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || '';
    const hashedPassword = await bcrypt.hash(password || '12345678', 10);

    // Create User record and Customer record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          firstName,
          lastName,
          isActive: status !== 'Blocked',
        },
      });

      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          phone: phone || null,
          customerType: customerType || 'retail',
        },
        include: {
          user: true,
        }
      });

      // Log activity
      await tx.customerActivityLog.create({
        data: {
          customerId: customer.id,
          action: 'ACCOUNT_CREATED',
          details: 'Account created by Administrator.',
        }
      });

      return customer;
    });

    return res.status(201).json({
      success: true,
      message: 'Customer profile successfully created.',
      data: {
        id: result.id,
        name: `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim(),
        email: result.user.email,
        phone: result.phone || '',
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to create customer.', details: error.message });
  }
};

// 4. Update Customer Details
export const updateCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, customerType, status, gender, dateOfBirth } = req.body;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!customer || customer.user.deletedAt) {
      return res.status(404).json({ success: false, error: 'Customer profile not found.' });
    }

    // Validate email uniqueness if changing
    if (email && email !== customer.user.email) {
      const match = await prisma.user.findFirst({
        where: { email, deletedAt: null }
      });
      if (match) {
        return res.status(400).json({ success: false, error: 'Email address already in use.' });
      }
    }

    const nameParts = (name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || customer.user.firstName;
    const lastName = nameParts.slice(1).join(' ') || customer.user.lastName;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: customer.userId },
        data: {
          email: email || undefined,
          firstName: firstName || undefined,
          lastName: lastName !== undefined ? lastName : undefined,
          isActive: status !== undefined ? status === 'Active' : undefined,
          gender: gender !== undefined ? gender : undefined,
          dateOfBirth: dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : undefined,
        },
      });

      await tx.customer.update({
        where: { id },
        data: {
          phone: phone !== undefined ? phone : undefined,
          customerType: customerType || undefined,
        },
      });

      // Log activity
      await tx.customerActivityLog.create({
        data: {
          customerId: id,
          action: 'PROFILE_UPDATED',
          details: 'Account profile details updated by Admin.',
        }
      });
    });

    return res.status(200).json({ success: true, message: 'Customer profile successfully updated.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update customer.', details: error.message });
  }
};

// 5. Soft Delete Customer
export const deleteCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: true,
        orders: {
          where: {
            status: { in: ['PENDING', 'PROCESSING', 'SHIPPED'] }
          }
        }
      },
    });

    if (!customer || customer.user.deletedAt) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    // Security check: prevent deletion if active orders exist
    if (customer.orders.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete customer profile with active or pending orders.',
      });
    }

    await prisma.$transaction(async (tx) => {
      // Set User.deletedAt (Soft delete)
      await tx.user.update({
        where: { id: customer.userId },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });

      // Log activity
      await tx.customerActivityLog.create({
        data: {
          customerId: id,
          action: 'ACCOUNT_DELETED',
          details: 'Account soft-deleted by Admin.',
        }
      });
    });

    return res.status(200).json({ success: true, message: 'Customer profile successfully deactivated (soft delete).' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to deactivate customer.', details: error.message });
  }
};

// 6. Block Customer
export const blockCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found.' });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: customer.userId },
        data: { isActive: false },
      });
      await tx.customerActivityLog.create({
        data: {
          customerId: id,
          action: 'ACCOUNT_BLOCKED',
          details: 'Account status set to Blocked by Admin.',
        }
      });
    });

    return res.status(200).json({ success: true, message: 'Customer blocked successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to block customer.', details: error.message });
  }
};

// 7. Unblock Customer
export const unblockCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found.' });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: customer.userId },
        data: { isActive: true },
      });
      await tx.customerActivityLog.create({
        data: {
          customerId: id,
          action: 'ACCOUNT_UNBLOCKED',
          details: 'Account status set to Active by Admin.',
        }
      });
    });

    return res.status(200).json({ success: true, message: 'Customer unblocked successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to unblock customer.', details: error.message });
  }
};

// 8. Get Customer Orders
export const getCustomerOrders = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: id },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          }
        },
        payments: true,
        shipments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = orders.map((o) => {
      // Map items structure
      const itemsMapped = o.items.map((i) => ({
        productImage: i.product?.images ? (JSON.parse(JSON.stringify(i.product.images))[0] || '') : '',
        productName: i.product?.name || 'Product',
        variant: i.variant?.name || '',
        sku: i.variant?.sku || i.product?.sku || '',
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      }));

      const payment = o.payments[0];
      const shipment = o.shipments[0];

      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        orderDate: o.createdAt,
        totalAmount: o.totalAmount,
        paymentMethod: payment?.paymentMethod || 'Razorpay',
        paymentStatus: payment?.status || 'PENDING',
        deliveryStatus: o.status,
        trackingStatus: shipment?.status || 'UNSHIPPED',
        invoiceUrl: o.invoiceUrl || '',
        items: itemsMapped,
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to query customer orders.', details: error.message });
  }
};

// 9. Get Customer Addresses
export const getCustomerAddresses = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const addresses = await prisma.customerAddress.findMany({
      where: { customerId: id },
      orderBy: { isDefault: 'desc' },
    });
    return res.status(200).json({ success: true, data: addresses });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to query customer addresses.', details: error.message });
  }
};

// 10. Get Customer Activity Timeline
export const getCustomerActivity = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const logs = await prisma.customerActivityLog.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ success: true, data: logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to query customer activity logs.', details: error.message });
  }
};

// 11. Get Customer Reviews
export const getCustomerReviews = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const reviews = await prisma.customerReview.findMany({
      where: { customerId: id },
      include: {
        product: {
          select: {
            name: true,
            images: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.reviewText,
      reviewText: r.reviewText,
      createdAt: r.createdAt,
      product: {
        name: r.product.name,
        image: r.product.images ? (JSON.parse(JSON.stringify(r.product.images))[0] || '') : '',
      }
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to query customer reviews.', details: error.message });
  }
};

// 12. Get Customer Wishlist
export const getCustomerWishlist = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const wishlist = await prisma.customerWishlist.findMany({
      where: { customerId: id },
      include: {
        product: {
          select: {
            name: true,
            images: true,
            basePrice: true,
            salePrice: true,
            stock: true,
            category: { select: { name: true } },
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = wishlist.map((w) => ({
      productId: w.productId,
      name: w.product.name,
      image: w.product.images ? (JSON.parse(JSON.stringify(w.product.images))[0] || '') : '',
      category: w.product.category?.name || 'Materials',
      price: w.product.salePrice || w.product.basePrice,
      stockStatus: w.product.stock > 0 ? 'In Stock' : 'Out of Stock',
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to query customer wishlist.', details: error.message });
  }
};

// 13. Customer Notes Management
export const getCustomerNotes = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const notes = await prisma.customerNote.findMany({
      where: { customerId: id },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const formatted = notes.map((n) => ({
      id: n.id,
      note: n.note,
      isPinned: n.isPinned,
      createdAt: n.createdAt,
      author: n.author ? `${n.author.firstName || ''} ${n.author.lastName || ''}`.trim() : 'Administrator',
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to query customer notes.', details: error.message });
  }
};

export const addCustomerNote = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { note, isPinned } = req.body;
  const adminId = (req as any).user?.id || null;

  if (!note) {
    return res.status(400).json({ success: false, error: 'Note content is required.' });
  }

  try {
    const newNote = await prisma.customerNote.create({
      data: {
        customerId: id,
        note,
        isPinned: !!isPinned,
        createdBy: adminId,
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      data: {
        id: newNote.id,
        note: newNote.note,
        isPinned: newNote.isPinned,
        createdAt: newNote.createdAt,
        author: newNote.author ? `${newNote.author.firstName || ''} ${newNote.author.lastName || ''}`.trim() : 'Administrator',
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to create customer note.', details: error.message });
  }
};

export const pinCustomerNote = async (req: Request, res: Response) => {
  const { noteId } = req.params;
  const { isPinned } = req.body;

  try {
    const note = await prisma.customerNote.update({
      where: { id: noteId },
      data: { isPinned: !!isPinned },
    });
    return res.status(200).json({ success: true, data: note });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to pin note.', details: error.message });
  }
};

export const deleteCustomerNote = async (req: Request, res: Response) => {
  const { noteId } = req.params;
  try {
    await prisma.customerNote.delete({ where: { id: noteId } });
    return res.status(200).json({ success: true, message: 'Note deleted.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete note.', details: error.message });
  }
};

// 14. Customer Analytics Dashboard Metrics
export const getCustomerAnalytics = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel metric counts
    const [
      totalCustomers,
      newCustomers,
      activeCustomers,
      guestCustomers,
      registeredCustomers,
      allCustomersForLeaderboard,
    ] = await Promise.all([
      // Total customers count
      prisma.customer.count({
        where: { user: { deletedAt: null } },
      }),
      // New customers in last 30 days
      prisma.customer.count({
        where: {
          user: { deletedAt: null },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      // Active customers
      prisma.customer.count({
        where: {
          user: { deletedAt: null, isActive: true },
        },
      }),
      // Guest customers (customerType === 'guest')
      prisma.customer.count({
        where: {
          user: { deletedAt: null },
          customerType: 'guest',
        },
      }),
      // Registered customers (customerType !== 'guest')
      prisma.customer.count({
        where: {
          user: { deletedAt: null },
          customerType: { not: 'guest' },
        },
      }),
      // Fetch customers for leaderboard calculations
      prisma.customer.findMany({
        where: { user: { deletedAt: null } },
        include: {
          user: true,
          orders: { select: { totalAmount: true } },
          reviews: { select: { id: true } },
        },
      }),
    ]);

    // Calculate returning customers (customers with >= 2 orders)
    const returningCustomers = allCustomersForLeaderboard.filter((c) => c.orders.length >= 2).length;

    // Leaderboards
    const leaderboardBySpend = allCustomersForLeaderboard
      .map((c) => ({
        id: c.id,
        name: c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : 'Customer',
        email: c.user?.email || '',
        value: c.orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const leaderboardByOrders = allCustomersForLeaderboard
      .map((c) => ({
        id: c.id,
        name: c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : 'Customer',
        email: c.user?.email || '',
        value: c.orders.length,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const leaderboardByReviews = allCustomersForLeaderboard
      .map((c) => ({
        id: c.id,
        name: c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : 'Customer',
        email: c.user?.email || '',
        value: c.reviews.length,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Dynamic growth trends (last 6 months registrations)
    const growthTrend = [];
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const count = allCustomersForLeaderboard.filter(
        (c) => c.createdAt >= startOfMonth && c.createdAt <= endOfMonth,
      ).length;

      const monthName = startOfMonth.toLocaleString('default', { month: 'short' });
      growthTrend.push({ label: monthName, value: count });
    }

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCustomers,
          newCustomers,
          activeCustomers,
          guestCustomers,
          registeredCustomers,
          returningCustomers,
          growthPercent: totalCustomers > 0 ? Math.round((newCustomers / totalCustomers) * 100) : 0,
        },
        charts: {
          registrationTrend: growthTrend,
        },
        leaderboards: {
          bySpend: leaderboardBySpend,
          byOrders: leaderboardByOrders,
          byReviews: leaderboardByReviews,
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to compute customer analytics dashboard.', details: error.message });
  }
};
