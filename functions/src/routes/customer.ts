import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  manageAddress,
  deleteAddress,
  toggleWishlistItem,
  getReviews,
  createReview,
  approveReview,
} from '../controllers/customer';

const router = Router();

// Feedbacks do not require global user logins
router.get('/reviews', getReviews);
router.post('/reviews', createReview);

// Helper to format/parse address records
function parseCustomerAddress(a: any) {
  let fullName = '';
  let phone = '';
  let addressType = 'home';
  let houseNo = '';
  let street = a.addressLine1 || '';

  if (a.addressLine1 && typeof a.addressLine1 === 'string' && a.addressLine1.includes('|')) {
    const parts = a.addressLine1.split('|').map((p: string) => p.trim());
    fullName = parts[0] || '';
    phone = parts[1] || '';
    addressType = parts[2] || 'home';
    street = parts.slice(3).join(' ') || '';
  }

  // Fallback to customer user profile if name or phone not pipe-delimited
  const userObj = a.customer?.user;
  if (!fullName || fullName === 'Valued Customer') {
    if (userObj?.firstName || userObj?.lastName) {
      fullName = `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim();
    } else {
      fullName = 'Customer';
    }
  }

  if (!phone) {
    phone = a.customer?.phone || userObj?.mobile || '';
  }

  // Clean street string if it contains duplicated city/state text like ", Chennai, Tamil Nadu - 604302"
  if (street && a.city && street.includes(a.city)) {
    const cityIdx = street.lastIndexOf(a.city);
    if (cityIdx > 10) {
      street = street.substring(0, cityIdx).replace(/, \s*$/, '').trim();
    }
  }

  let city = a.city === 'N/A' || !a.city ? 'City' : a.city;
  let state = a.state === 'N/A' || !a.state ? 'State' : a.state;
  let pincode = a.postalCode || '100001';

  return {
    id: a.id,
    customerId: a.customerId,
    fullName,
    phone,
    addressType: addressType || 'home',
    houseNo,
    street: street || a.addressLine1 || '',
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2 || '',
    city,
    state,
    pincode,
    postalCode: pincode,
    country: a.country || 'India',
    isDefault: !!a.isDefault,
    createdAt: a.createdAt,
  };
}

async function getOrCreateCustomerForUser(userId: string) {
  let customer = await prisma.customer.findFirst({ where: { userId } });
  if (!customer) {
    customer = await prisma.customer.create({ data: { userId } });
  }
  return customer;
}

// --- Customer Self Address Endpoints ---
router.get('/addresses', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    if (String(userId).startsWith('mock_') || String(userId).startsWith('fallback-') || req.headers['x-mock-test'] === 'true' || process.env.MOCK_ORDER_MODE === 'true') {
      return res.status(200).json({ success: true, data: [] });
    }

    const customer = await getOrCreateCustomerForUser(userId);
    const list = await prisma.customerAddress.findMany({
      where: { customerId: customer.id },
      include: { customer: { include: { user: true } } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    const data = list.map(parseCustomerAddress);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/addresses/default', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    if (String(userId).startsWith('mock_') || String(userId).startsWith('fallback-') || req.headers['x-mock-test'] === 'true' || process.env.MOCK_ORDER_MODE === 'true') {
      return res.status(200).json({ success: true, data: null });
    }

    const customer = await getOrCreateCustomerForUser(userId);
    const defaultAddr = await prisma.customerAddress.findFirst({
      where: { customerId: customer.id, isDefault: true },
      include: { customer: { include: { user: true } } },
    }) || await prisma.customerAddress.findFirst({
      where: { customerId: customer.id },
      include: { customer: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!defaultAddr) {
      return res.status(200).json({ success: true, data: null });
    }

    return res.status(200).json({ success: true, data: parseCustomerAddress(defaultAddr) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/address', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const customer = await getOrCreateCustomerForUser(userId);
    const {
      fullName = '',
      phone = '',
      addressType = 'home',
      houseNo = '',
      street = '',
      addressLine1,
      addressLine2 = '',
      city = '',
      state = '',
      pincode,
      postalCode,
      country = 'India',
      isDefault = false,
    } = req.body;

    const pin = pincode || postalCode || '600001';
    const formattedLine1 = addressLine1 || `${fullName} | ${phone} | ${addressType} | ${houseNo} ${street}`.trim();

    // Extract bare street part for dedup (strip the "Name | Phone | Type | " prefix if present)
    const streetPart = formattedLine1.includes('|')
      ? formattedLine1.split('|').slice(3).join('|').trim()
      : formattedLine1.trim();

    // ── Dedup: find existing address with same location (city + postalCode + street) ──
    const existingAddresses = await prisma.customerAddress.findMany({
      where: { customerId: customer.id, city: city || 'City', postalCode: pin },
    });

    const duplicate = existingAddresses.find(a => {
      const existStreet = a.addressLine1.includes('|')
        ? a.addressLine1.split('|').slice(3).join('|').trim()
        : a.addressLine1.trim();
      return existStreet.toLowerCase() === streetPart.toLowerCase()
        || a.addressLine1 === formattedLine1
        || a.addressLine1 === (addressLine1 || '');
    });

    if (duplicate) {
      // Address already exists – return it without creating a duplicate
      console.log(`[CustomerAddresses] Dedup: returning existing address ${duplicate.id} for customer ${customer.id}`);
      if (isDefault && !duplicate.isDefault) {
        await prisma.customerAddress.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });
        await prisma.customerAddress.update({ where: { id: duplicate.id }, data: { isDefault: true } });
        duplicate.isDefault = true;
      }
      return res.status(200).json({ success: true, data: parseCustomerAddress(duplicate) });
    }

    if (isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }

    const created = await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        addressLine1: formattedLine1,
        addressLine2: addressLine2 || null,
        city: city || 'City',
        state: state || 'State',
        postalCode: pin,
        country: country || 'India',
        isDefault: !!isDefault,
      },
    });

    return res.status(201).json({ success: true, data: parseCustomerAddress(created) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Alias: POST /addresses (plural) — used by frontend checkout "saveAddressToAccount"
router.post('/addresses', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const customer = await getOrCreateCustomerForUser(userId);
    const {
      fullName = '',
      phone = '',
      addressType = 'home',
      houseNo = '',
      street = '',
      addressLine1,
      addressLine2 = '',
      city = '',
      state = '',
      pincode,
      postalCode,
      country = 'India',
      isDefault = false,
    } = req.body;

    const pin = pincode || postalCode || '600001';
    const formattedLine1 = addressLine1 || `${fullName} | ${phone} | ${addressType} | ${houseNo} ${street}`.trim();

    // Extract bare street part for dedup
    const streetPart = formattedLine1.includes('|')
      ? formattedLine1.split('|').slice(3).join('|').trim()
      : formattedLine1.trim();

    // Dedup: find existing address with same location
    const existingAddresses = await prisma.customerAddress.findMany({
      where: { customerId: customer.id, city: city || 'City', postalCode: pin },
    });

    const duplicate = existingAddresses.find((a) => {
      const existStreet = a.addressLine1.includes('|')
        ? a.addressLine1.split('|').slice(3).join('|').trim()
        : a.addressLine1.trim();
      return existStreet.toLowerCase() === streetPart.toLowerCase()
        || a.addressLine1 === formattedLine1
        || a.addressLine1 === (addressLine1 || '');
    });

    if (duplicate) {
      console.log(`[CustomerAddresses] Dedup (POST /addresses): returning existing ${duplicate.id} for customer ${customer.id}`);
      if (isDefault && !duplicate.isDefault) {
        await prisma.customerAddress.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });
        await prisma.customerAddress.update({ where: { id: duplicate.id }, data: { isDefault: true } });
        duplicate.isDefault = true;
      }
      return res.status(200).json({ success: true, data: parseCustomerAddress(duplicate) });
    }

    if (isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }

    const created = await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        addressLine1: formattedLine1,
        addressLine2: addressLine2 || null,
        city: city || 'City',
        state: state || 'State',
        postalCode: pin,
        country: country || 'India',
        isDefault: !!isDefault,
      },
    });

    return res.status(201).json({ success: true, data: parseCustomerAddress(created) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/address/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const addressId = req.params.id;

    const existing = await prisma.customerAddress.findUnique({
      where: { id: addressId },
      include: { customer: true },
    });

    if (!existing) return res.status(404).json({ success: false, error: 'Address not found' });
    if (existing.customer?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to update this address' });
    }

    const {
      fullName = '',
      phone = '',
      addressType = 'home',
      houseNo = '',
      street = '',
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      postalCode,
      country,
      isDefault,
    } = req.body;

    if (isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId: existing.customerId },
        data: { isDefault: false },
      });
    }

    const formattedLine1 = addressLine1 || `${fullName} | ${phone} | ${addressType} | ${houseNo} ${street}`.trim();

    const updated = await prisma.customerAddress.update({
      where: { id: addressId },
      data: {
        addressLine1: formattedLine1,
        addressLine2: addressLine2 !== undefined ? addressLine2 : existing.addressLine2,
        city: city || existing.city,
        state: state || existing.state,
        postalCode: pincode || postalCode || existing.postalCode,
        country: country || existing.country,
        isDefault: isDefault !== undefined ? !!isDefault : existing.isDefault,
      },
    });

    return res.status(200).json({ success: true, data: parseCustomerAddress(updated) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/address/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const addressId = req.params.id;

    const existing = await prisma.customerAddress.findUnique({
      where: { id: addressId },
      include: { customer: true },
    });

    if (!existing) return res.status(404).json({ success: false, error: 'Address not found' });
    if (existing.customer?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to delete this address' });
    }

    await prisma.customerAddress.delete({ where: { id: addressId } });
    return res.status(200).json({ success: true, message: 'Address deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/address/default/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const addressId = req.params.id;

    const existing = await prisma.customerAddress.findUnique({
      where: { id: addressId },
      include: { customer: true },
    });

    if (!existing) return res.status(404).json({ success: false, error: 'Address not found' });
    if (existing.customer?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    await prisma.$transaction([
      prisma.customerAddress.updateMany({
        where: { customerId: existing.customerId },
        data: { isDefault: false },
      }),
      prisma.customerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    return res.status(200).json({ success: true, message: 'Default address updated' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin-level customer management routes below
router.get('/', requireRole(['Admin', 'Manager']), getCustomers);
router.get('/:id', requireRole(['Admin', 'Manager']), getCustomerById);
router.post('/', requireRole(['Admin']), createCustomer);
router.put('/:id', requireRole(['Admin', 'Manager']), updateCustomer);
router.delete('/:id', requireRole(['Admin']), deleteCustomer);

router.post('/:customerId/address', authenticateToken, async (req: any, res, next) => {
  const { customerId } = req.params;
  const user = req.user;
  const role = (user?.role || '').toLowerCase().replace(/[\s\-_]/g, '');
  if (role !== 'admin' && role !== 'superadmin' && role !== 'manager') {
    const cust = await prisma.customer.findUnique({ where: { id: customerId }, select: { userId: true } });
    if (!cust || cust.userId !== user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify this customer\'s address' });
    }
  }
  return manageAddress(req, res);
});
router.post('/:customerId/wishlist', authenticateToken, async (req: any, res, next) => {
  const { customerId } = req.params;
  const user = req.user;
  const role = (user?.role || '').toLowerCase().replace(/[\s\-_]/g, '');
  if (role !== 'admin' && role !== 'superadmin' && role !== 'manager') {
    const cust = await prisma.customer.findUnique({ where: { id: customerId }, select: { userId: true } });
    if (!cust || cust.userId !== user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify this customer\'s wishlist' });
    }
  }
  return toggleWishlistItem(req, res);
});

router.put('/reviews/:id/approve', requireRole(['Admin', 'Manager']), approveReview);

export default router;
