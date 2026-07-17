import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, requireRole } from '../middleware/auth';
import fs from 'fs';
import { FirebaseStorageService } from '../modules/storage/firebase-storage.service';

import { upload } from '../middleware/upload';

const router = Router();


// Ensure roles: Admin, Super Admin and Manager have full access
const adminGuard = [authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager'])];

router.post('/upload-image', adminGuard, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }
    const originalPath = req.file.path;
    const fileBuffer = fs.readFileSync(originalPath);
    const destination = `uploads/${Date.now()}-${req.file.filename}`;
    const mimeType = req.file.mimetype;

    const url = await FirebaseStorageService.uploadFile(fileBuffer, destination, mimeType);

    // Clean up temporary local file
    try {
      if (fs.existsSync(originalPath)) {
        fs.unlinkSync(originalPath);
      }
    } catch (cleanupErr: any) {
      console.error('Failed to remove local temporary file:', cleanupErr.message);
    }

    return res.status(200).json({
      success: true,
      url: url,
      fileName: req.file.filename
    });
  } catch (err: any) {
    console.error('Firebase storage upload failed:', err);
    return res.status(500).json({ success: false, error: 'Upload failed', details: err.message });
  }
});

router.post('/delete-image', adminGuard, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'No image URL provided' });
    }
    await FirebaseStorageService.deleteFile(url);
    return res.status(200).json({ success: true, message: 'Image deleted from Firebase Storage successfully' });
  } catch (err: any) {
    console.error('Firebase storage delete failed:', err);
    return res.status(500).json({ success: false, error: 'Deletion failed', details: err.message });
  }
});

// Helper to get or create ThemeSetting key-value pair
async function getSetting(keyName: string, defaultValue: any) {
  const record = await prisma.setting.findUnique({ where: { settingKey: keyName } });
  if (!record) {
    return defaultValue;
  }
  try {
    return typeof record.settingData === 'string' ? JSON.parse(record.settingData) : record.settingData;
  } catch {
    return record.settingData;
  }
}

async function saveSetting(keyName: string, data: any) {
  const valueStr = typeof data === 'string' ? data : JSON.stringify(data);
  await prisma.setting.upsert({
    where: { settingKey: keyName },
    update: { settingData: valueStr },
    create: { settingKey: keyName, settingData: valueStr },
  });
}

// -------------------------------------------------------------
// 6. CMS PAGES OPERATIONS
// -------------------------------------------------------------
router.get('/pages', async (req: Request, res: Response) => {
  try {
    const user = await lenientAuth(req);
    const isPrivileged = user && (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager');
    const condition = isPrivileged ? {} : { isPublished: true };
    const list = await prisma.page.findMany({ where: condition, orderBy: { title: 'asc' } });
    return res.status(200).json({ success: true, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Query failed', details: err.message });
  }
});

router.post('/pages', adminGuard, async (req: Request, res: Response) => {
  try {
    const { title, slug, content, isPublished } = req.body;
    if (!title || !slug) return res.status(400).json({ success: false, error: 'Title and URL slug are required' });
    const created = await prisma.page.create({
      data: {
        title,
        slug,
        content: content || '',
        isPublished: isPublished !== undefined ? !!isPublished : true,
      },
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Creation failed', details: err.message });
  }
});

router.put('/pages/:id', adminGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, slug, content, isPublished } = req.body;
    const updated = await prisma.page.update({
      where: { id },
      data: {
        title,
        slug,
        content,
        isPublished: isPublished !== undefined ? !!isPublished : undefined,
      },
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Update failed', details: err.message });
  }
});

router.delete('/pages/:id', adminGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.page.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Page successfully deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Purge failed', details: err.message });
  }
});

// -------------------------------------------------------------
// 7. CMS BLOGS OPERATIONS
// -------------------------------------------------------------
router.get('/blogs', async (req: Request, res: Response) => {
  try {
    const user = await lenientAuth(req);
    const isPrivileged = user && (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager');
    const condition = isPrivileged ? {} : { isPublished: true };
    const list = await prisma.blog.findMany({ where: condition, orderBy: { createdAt: 'desc' } });
    return res.status(200).json({ success: true, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Blogs query failed', details: err.message });
  }
});

router.post('/blogs', adminGuard, async (req: Request, res: Response) => {
  try {
    const { title, excerpt, content, imageUrl, author, tags } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, error: 'Title and content required' });
    const slug = title.toLowerCase().replace(/[\s\-_]+/g, '-').replace(/[^\w\-]+/g, '');
    const created = await prisma.blog.create({
      data: {
        title,
        slug,
        content,
        imageUrl: imageUrl || 'https://picsum.photos/seed/blog/800/500',
        isPublished: true,
      },
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Blog insertion failed', details: err.message });
  }
});

router.put('/blogs/:id', adminGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, slug, excerpt, content, imageUrl, isPublished } = req.body;
    const updated = await prisma.blog.update({
      where: { id },
      data: {
        title,
        slug,
        content,
        imageUrl,
        isPublished: isPublished !== undefined ? !!isPublished : undefined,
      },
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Blog sync updates halted', details: err.message });
  }
});

router.delete('/blogs/:id', adminGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.blog.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Blog destroyed' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to purge blog', details: err.message });
  }
});


// -------------------------------------------------------------
// 11. CENTRALIZED API BACKEND FOR EXTENSIONS (QUOTES, COUPONS, SOCIAL, ADS)
// -------------------------------------------------------------

import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'bbrahma_3d_galaxy_labs_secret_jwt_key_2026';

async function lenientAuth(req: Request) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userRecord = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { roles: { include: { role: true } } }
    });
    if (!userRecord || !userRecord.isActive) return null;
    return {
      id: userRecord.id,
      email: userRecord.email,
      role: userRecord.roles?.[0]?.role?.name || 'Customer'
    };
  } catch {
    return null;
  }
}

// QUOTES ENDPOINTS
router.get('/quotes', async (req: Request, res: Response) => {
  try {
    const userObj = await lenientAuth(req);
    const quotes = await getSetting('quotes-list', [
      {
        id: 'q-demo',
        quoteNumber: '3DG-PRNT-7771',
        customerName: 'Galaxy Partner',
        customerPhone: '+91 98822 11000',
        customerEmail: 'arunjaya1999@gmail.com',
        fileName: 'extrusion_coupling_v3.stl',
        fileSize: '4.2 MB',
        materialType: 'PLA',
        color: 'Black',
        infill: 20,
        layerHeight: '0.2',
        weightGrams: 35,
        volumeCm3: 28,
        estimatedPrintTimeHours: 2.5,
        status: 'estimated',
        estimatedCost: 350,
        mrpPrice: 450,
        date: new Date().toISOString()
      }
    ]);

    if (!userObj) {
      const emailQuery = req.query.email as string;
      if (emailQuery) {
        const filtered = quotes.filter((q: any) => q.customerEmail?.toLowerCase() === emailQuery.toLowerCase());
        return res.status(200).json({ success: true, data: filtered });
      }
      return res.status(200).json({ success: true, data: [] });
    }

    const { role, email } = userObj;
    if (role === 'Admin' || role === 'Super Admin' || role === 'Manager') {
      return res.status(200).json({ success: true, data: quotes });
    } else {
      const filtered = quotes.filter((q: any) => q.customerEmail?.toLowerCase() === email.toLowerCase());
      return res.status(200).json({ success: true, data: filtered });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/quotes', async (req: Request, res: Response) => {
  try {
    const newQuote = req.body;
    if (!newQuote.customerEmail) {
      return res.status(400).json({ success: false, error: 'Customer email is required' });
    }
    const current = await getSetting('quotes-list', []);
    current.unshift(newQuote);
    await saveSetting('quotes-list', current);
    return res.status(201).json({ success: true, data: newQuote });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/quotes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const current = await getSetting('quotes-list', []);
    const idx = current.findIndex((q: any) => q.id === id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updates };
      await saveSetting('quotes-list', current);
      return res.status(200).json({ success: true, data: current[idx] });
    }
    const idx2 = current.findIndex((q: any) => q.quoteNumber === id);
    if (idx2 !== -1) {
      current[idx2] = { ...current[idx2], ...updates };
      await saveSetting('quotes-list', current);
      return res.status(200).json({ success: true, data: current[idx2] });
    }
    return res.status(404).json({ success: false, error: 'Quote request not found' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// COUPONS ENDPOINTS
router.get('/coupons', async (req: Request, res: Response) => {
  try {
    const list = await getSetting('coupons-list', [
      { id: 'c1', code: 'LAUNCH50', discountPercent: 12, minSpent: 500, expiryDate: '2026-12-31' },
      { id: 'c2', code: 'B2BFILAMENT', discountPercent: 18, minSpent: 2500, expiryDate: '2026-09-30' },
      { id: 'c3', code: 'FREEZE25', discountPercent: 25, minSpent: 10000, expiryDate: '2026-10-15' }
    ]);
    return res.status(200).json({ success: true, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/coupons', adminGuard, async (req: Request, res: Response) => {
  try {
    const coupon = req.body;
    if (!coupon.code) {
      return res.status(400).json({ success: false, error: 'Coupon code required' });
    }
    const current = await getSetting('coupons-list', []);
    const filtered = current.filter((c: any) => c.code.toUpperCase() !== coupon.code.toUpperCase());
    filtered.unshift(coupon);
    await saveSetting('coupons-list', filtered);
    return res.status(201).json({ success: true, data: coupon });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/coupons/:code', adminGuard, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const current = await getSetting('coupons-list', []);
    const filtered = current.filter((c: any) => c.code.toUpperCase() !== code.toUpperCase() && c.id !== code);
    await saveSetting('coupons-list', filtered);
    return res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// SOCIAL POSTS ENDPOINTS
router.get('/social-posts', async (req: Request, res: Response) => {
  try {
    const list = await getSetting('social-posts-list', [
      { id: 's1', username: '3d_matrix_designs', platform: 'Instagram', profileUrl: 'https://instagram.com', imageUrl: 'https://picsum.photos/seed/print1/600/600', caption: 'Absolute precision with the newly commissioned industrial Brahma cluster! Filament: PETG Steel Grey.', approved: true, likes: 245 },
      { id: 's2', username: 'rapid_crafts_india', platform: 'Twitter', profileUrl: 'https://twitter.com', imageUrl: 'https://picsum.photos/seed/print2/600/600', caption: 'Elegoo Saturn Resin print output. Absolute display model tier output. Post-curing done using Galaxy custom curing profiles.', approved: true, likes: 112 },
      { id: 's3', username: 'build_matrix_fab', platform: 'Linkedin', profileUrl: 'https://linkedin.com', imageUrl: 'https://picsum.photos/seed/print3/600/600', caption: 'Unboxed the new Bambu Lab A1 Mini Combo. Amazing multi-color capabilities out of the box!', approved: true, likes: 89 }
    ]);
    return res.status(200).json({ success: true, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ADVERTISEMENTS ENDPOINTS
router.get('/advertisements', async (req: Request, res: Response) => {
  try {
    const list = await prisma.advertisement.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ status: 'success', success: true, message: 'success', data: list });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, message: err.message, error: err.message });
  }
});

router.put('/advertisements/:id/click', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const advertisement = await prisma.advertisement.findUnique({ where: { id } });
    if (advertisement && advertisement.status === 'active' && !advertisement.deletedAt) {
      const updated = await prisma.advertisement.update({
        where: { id },
        data: { clicks: { increment: 1 } }
      });
      return res.status(200).json({ status: 'success', success: true, message: 'success', data: updated });
    }
    return res.status(404).json({ status: 'error', success: false, message: 'Advertisement not found', error: 'Advertisement not found' });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, message: err.message, error: err.message });
  }
});

router.post('/advertisements/:id/impression', async (req: Request, res: Response) => {
  try {
    const { id: advertisementId } = req.params;
    console.log("Advertisement ID:", advertisementId);
    const advertisement = await prisma.advertisement.findUnique({ where: { id: advertisementId } });
    if (advertisement && advertisement.status === 'active' && !advertisement.deletedAt) {
      const updated = await prisma.advertisement.update({
        where: { id: advertisementId },
        data: { impressions: { increment: 1 } }
      });
      return res.status(200).json({ status: 'success', success: true, message: 'success', data: updated });
    }
    return res.status(404).json({ status: 'error', success: false, message: 'Advertisement not found', error: 'Advertisement not found' });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, message: err.message, error: err.message });
  }
});

router.post('/social-posts', adminGuard, async (req: Request, res: Response) => {
  try {
    const newItem = req.body;
    newItem.id = 's-' + Date.now();
    const current = await getSetting('social-posts-list', []);
    current.push(newItem);
    await saveSetting('social-posts-list', current);
    return res.status(201).json({ status: 'success', success: true, message: 'success', data: newItem });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, message: err.message, error: err.message });
  }
});

router.post('/advertisements', adminGuard, async (req: Request, res: Response) => {
  try {
    const { title, position, mediaUrl, targetUrl, status } = req.body;
    const newItem = await prisma.advertisement.create({
      data: {
        title,
        position,
        mediaUrl,
        targetUrl,
        status: status || 'active'
      }
    });
    return res.status(201).json({ status: 'success', success: true, message: 'success', data: newItem });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, message: err.message, error: err.message });
  }
});

// -------------------------------------------------------------
// 12. ACTIVE SESSION MANAGEMENT
// -------------------------------------------------------------
router.get('/sessions', adminGuard, async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.refreshToken.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    return res.status(200).json({ success: true, data: sessions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve active sessions', details: err.message });
  }
});

router.post('/sessions/:id/terminate', adminGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.refreshToken.update({
      where: { id },
      data: { revoked: true }
    });
    return res.status(200).json({ success: true, message: 'Session successfully terminated' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to terminate session', details: err.message });
  }
});

// --- LIVE DB-DRIVEN DASHBOARD, CUSTOMERS, CARTS, REVIEWS, WISHLIST, NOTIFICATIONS ---

// 1. Overview Dashboard Stats
router.get('/dashboard', adminGuard, async (req: Request, res: Response) => {
  try {
    const [
      totalProducts,
      totalOrders,
      totalCustomers,
      revenueAgg,
      abandonedCarts,
      pendingOrders
    ] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.customer.count(),
      prisma.order.aggregate({
        where: {
          status: { notIn: ['cancelled', 'CANCELLED'] }
        },
        _sum: {
          totalAmount: true
        }
      }),
      prisma.cart.count({
        where: {
          status: 'ACTIVE',
          items: { some: {} }
        }
      }),
      prisma.order.count({
        where: {
          status: { in: ['pending', 'PENDING'] }
        }
      })
    ]);

    const totalRevenue = revenueAgg._sum.totalAmount || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalOrders,
        totalCustomers,
        totalRevenue,
        abandonedCarts,
        pendingOrders
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Customers List
router.get('/customers', adminGuard, async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        user: true,
        orders: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formatted = customers.map(c => {
      const name = c.user.firstName ? `${c.user.firstName} ${c.user.lastName || ''}`.trim() : (c.user.email || 'N/A');
      return {
        id: c.id,
        name,
        email: c.user.email,
        mobile: c.phone || c.user.mobile || 'N/A',
        ordersCount: c.orders.length,
        status: c.user.isActive ? 'Active' : 'Inactive',
        createdDate: c.createdAt.toISOString().split('T')[0]
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Abandoned Carts List
router.get('/abandoned-carts', adminGuard, async (req: Request, res: Response) => {
  try {
    const carts = await prisma.cart.findMany({
      where: {
        status: 'ACTIVE',
        items: { some: {} }
      },
      include: {
        customer: {
          include: {
            user: true
          }
        },
        items: {
          include: {
            product: true,
            variant: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    const formatted = carts.map(cart => {
      const customerName = cart.customer?.user?.firstName ? `${cart.customer.user.firstName} ${cart.customer.user.lastName || ''}`.trim() : (cart.customer?.user?.email || 'Guest Customer');
      const email = cart.customer?.user?.email || 'N/A';
      const phone = cart.customer?.phone || cart.customer?.user?.mobile || 'N/A';

      const itemsText = cart.items.map(i => `${i.product.name}${i.variant ? ' (' + i.variant.name + ')' : ''} x ${i.quantity}`).join(', ');

      const cartValue = cart.items.reduce((total, i) => {
        const price = i.variant?.price ? Number(i.variant.price) : (i.product.salePrice ? Number(i.product.salePrice) : Number(i.product.basePrice));
        return total + (price * i.quantity);
      }, 0);

      return {
        id: cart.id,
        customer: customerName,
        email,
        phone,
        items: itemsText || 'No items',
        cartValue,
        date: cart.updatedAt.toISOString().split('T')[0],
        recovered: false
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Reviews List
router.get('/reviews', adminGuard, async (req: Request, res: Response) => {
  try {
    const reviews = await prisma.productReview.findMany({
      include: {
        user: true,
        product: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formatted = reviews.map(r => {
      const userName = r.user ? (r.user.firstName ? `${r.user.firstName} ${r.user.lastName || ''}`.trim() : r.user.email) : 'Guest';
      return {
        id: r.id,
        productName: r.product.name,
        userName,
        rating: r.rating,
        comment: r.comment || '',
        date: r.createdAt.toISOString().split('T')[0],
        status: r.isApproved ? 'Approved' : 'Pending',
        response: ''
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Wishlist List
router.get('/wishlist', adminGuard, async (req: Request, res: Response) => {
  try {
    const wishlist = await prisma.customerWishlist.findMany({
      include: {
        customer: {
          include: { user: true }
        },
        product: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formatted = wishlist.map(w => {
      const customerName = w.customer.user.firstName ? `${w.customer.user.firstName} ${w.customer.user.lastName || ''}`.trim() : w.customer.user.email;
      return {
        id: `${w.customerId}-${w.productId}`,
        customerName,
        productName: w.product.name,
        date: w.createdAt.toISOString().split('T')[0]
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Notifications List
router.get('/notifications', adminGuard, async (req: Request, res: Response) => {
  try {
    const list = await prisma.systemNotification.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true, template: true }
    });

    const formatted = list.map(n => ({
      id: n.id,
      title: n.template?.subject || 'Notification',
      message: n.template?.body || '',
      type: n.template?.channel || 'Campaign',
      sentTo: n.user?.email || 'All Users',
      createdAt: n.createdAt.toISOString().split('T')[0]
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// RECENT PURCHASES — Social Proof Popup API
// -------------------------------------------------------------
let recentPurchasesCache: { data: any[]; expiresAt: number } | null = null;
const RECENT_PURCHASES_TTL = 5 * 60 * 1000; // 5 minutes

const DEMO_PURCHASES = [
  { id: 'd1', customerName: 'R*** K', city: 'Mumbai', state: 'Maharashtra', country: 'India', productName: 'Bambu Lab A1 Mini', productImage: 'https://picsum.photos/seed/bambu/80/80', productSlug: 'bambu-lab-a1-mini', minutesAgo: 3 },
  { id: 'd2', customerName: 'S*** P', city: 'Bangalore', state: 'Karnataka', country: 'India', productName: 'PLA Pro Filament 1.75mm', productImage: 'https://picsum.photos/seed/pla/80/80', productSlug: 'pla-pro-filament-175mm', minutesAgo: 11 },
  { id: 'd3', customerName: 'A*** M', city: 'Chennai', state: 'Tamil Nadu', country: 'India', productName: 'Elegoo Mars 4 Ultra', productImage: 'https://picsum.photos/seed/elegoo/80/80', productSlug: 'elegoo-mars-4-ultra', minutesAgo: 18 },
  { id: 'd4', customerName: 'T*** S', city: 'Gaya', state: 'Bihar', country: 'India', productName: 'PETG Filament 1kg Black', productImage: 'https://picsum.photos/seed/petg/80/80', productSlug: 'petg-filament-1kg', minutesAgo: 24 },
  { id: 'd5', customerName: 'V*** R', city: 'Hyderabad', state: 'Telangana', country: 'India', productName: 'Bambu Lab P1S Combo', productImage: 'https://picsum.photos/seed/p1s/80/80', productSlug: 'bambu-lab-p1s-combo', minutesAgo: 37 },
  { id: 'd6', customerName: 'D*** L', city: 'Pune', state: 'Maharashtra', country: 'India', productName: 'Creality K1 Max', productImage: 'https://picsum.photos/seed/k1max/80/80', productSlug: 'creality-k1-max', minutesAgo: 52 },
];

function maskCustomerName(firstName: string | null, lastName: string | null, email: string | null): string {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();
  if (first && last) {
    return `${first.charAt(0).toUpperCase()}*** ${last.charAt(0).toUpperCase()}`;
  }
  if (first) {
    return `${first.charAt(0).toUpperCase()}*** Customer`;
  }
  if (email) {
    const localPart = email.split('@')[0];
    return `${localPart.charAt(0).toUpperCase()}*** Customer`;
  }
  return 'Customer';
}

function getMinutesAgo(date: Date): number {
  return Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
}

router.get('/recent-purchases', async (req: Request, res: Response) => {
  try {
    // Serve from cache if still fresh
    if (recentPurchasesCache && Date.now() < recentPurchasesCache.expiresAt) {
      return res.status(200).json({ success: true, data: recentPurchasesCache.data, cached: true });
    }

    const rawSettings = await prisma.themeSetting.findUnique({
      where: { keyName: 'global-settings' }
    });
    const settings = rawSettings ? (typeof rawSettings.value === 'string' ? JSON.parse(rawSettings.value) : rawSettings.value) as any : null;
    const config = settings?.recentPurchasePopup ?? {};

    const maxItems = Number(config.maxItems || 20);
    const windowMinutes = Number(config.recentPurchaseMinutes || 10);
    const timeWindow = new Date(Date.now() - windowMinutes * 60 * 1000);

    const allowedStatuses = ['paid', 'PAID', 'confirmed', 'CONFIRMED', 'processing', 'PROCESSING', 'completed', 'COMPLETED', 'pending', 'PENDING'];

    // 1. Fetch real orders in the window
    const orders = await prisma.order.findMany({
      where: {
        status: { in: allowedStatuses },
        createdAt: { gte: timeWindow }
      },
      orderBy: { createdAt: 'desc' },
      take: maxItems,
      include: {
        customer: {
          include: { user: true }
        },
        items: {
          take: 1,
          include: {
            product: {
              select: { name: true, slug: true, images: true }
            }
          }
        }
      }
    });

    const items: any[] = [];
    for (const order of orders) {
      const firstItem = order.items[0];
      if (!firstItem) continue;

      const user = order.customer?.user;
      const customerName = maskCustomerName(
        user?.firstName || null,
        user?.lastName || null,
        user?.email || null
      );

      let city = 'India';
      let state = '';
      let country = 'India';

      if ((order as any).shippingAddress) {
        try {
          const addr = typeof (order as any).shippingAddress === 'string'
            ? JSON.parse((order as any).shippingAddress)
            : (order as any).shippingAddress;
          city = addr.city || addr.town || city;
          state = addr.state || addr.province || state;
          country = addr.country || country;
        } catch (_) {}
      }

      let productImage = 'https://picsum.photos/seed/product/80/80';
      if (firstItem.product) {
        try {
          const imgs = typeof firstItem.product.images === 'string'
            ? JSON.parse(firstItem.product.images as any)
            : (firstItem.product.images as any[]);
          if (Array.isArray(imgs) && imgs.length > 0) {
            const img = imgs[0];
            productImage = typeof img === 'string' ? img : (img.url || productImage);
          }
        } catch (_) {}
      }

      items.push({
        id: order.id,
        customerName,
        city,
        state,
        country,
        productName: firstItem.product?.name || 'Unknown Product',
        productImage,
        productSlug: firstItem.product?.slug || '',
        minutesAgo: getMinutesAgo(order.createdAt)
      });
    }

    let finalData = items;
    if (finalData.length === 0) {
      // 2. Fetch active catalog products to dynamically mock recent purchases
      const activeProducts = await prisma.product.findMany({
        where: { isActive: true },
        take: maxItems,
        select: { id: true, name: true, slug: true, images: true }
      });

      const mockNames = ['T*** S', 'R*** K', 'A*** M', 'V*** P', 'M*** D', 'S*** A', 'N*** C', 'P*** G'];
      const mockCities = [
        { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
        { city: 'Bangalore', state: 'Karnataka', country: 'India' },
        { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
        { city: 'Gaya', state: 'Bihar', country: 'India' },
        { city: 'New Delhi', state: 'Delhi', country: 'India' },
        { city: 'Hyderabad', state: 'Telangana', country: 'India' },
        { city: 'Pune', state: 'Maharashtra', country: 'India' }
      ];

      const count = Math.min(maxItems, activeProducts.length);
      for (let i = 0; i < count; i++) {
        const p = activeProducts[i];
        const name = mockNames[i % mockNames.length];
        const loc = mockCities[i % mockCities.length];
        
        let productImage = 'https://picsum.photos/seed/product/80/80';
        try {
          const imgs = typeof p.images === 'string' ? JSON.parse(p.images as any) : (p.images as any[]);
          if (Array.isArray(imgs) && imgs.length > 0) {
            const img = imgs[0];
            productImage = typeof img === 'string' ? img : (img.url || productImage);
          }
        } catch (_) {}

        finalData.push({
          id: `mock_${p.id}_${i}`,
          customerName: name,
          city: loc.city,
          state: loc.state,
          country: loc.country,
          productName: p.name,
          productImage,
          productSlug: p.slug,
          minutesAgo: Math.floor(Math.random() * (windowMinutes - 1)) + 1
        });
      }
    }

    if (finalData.length === 0) {
      finalData = DEMO_PURCHASES;
    }

    recentPurchasesCache = { data: finalData, expiresAt: Date.now() + RECENT_PURCHASES_TTL };
    return res.status(200).json({ success: true, data: finalData });
  } catch (err: any) {
    console.error('recent-purchases error:', err.message);
    return res.status(200).json({ success: true, data: DEMO_PURCHASES, fallback: true });
  }
});

export default router;
