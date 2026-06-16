import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, requireRole } from '../middleware/auth';
import fs from 'fs';
import { FirebaseStorageService } from '../modules/storage/firebase-storage.service';

import { upload } from '../middleware/upload';

const router = Router();

// Ensure roles: Admin and Super Admin have full access
const adminGuard = [authenticateToken, requireRole(['Admin', 'Super Admin'])];

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
  const record = await prisma.themeSetting.findUnique({ where: { keyName } });
  if (!record) {
    return defaultValue;
  }
  try {
    return JSON.parse(record.value);
  } catch {
    return record.value;
  }
}

async function saveSetting(keyName: string, data: any) {
  const valueStr = typeof data === 'string' ? data : JSON.stringify(data);
  await prisma.themeSetting.upsert({
    where: { keyName },
    update: { value: valueStr },
    create: { keyName, value: valueStr },
  });
}

// -------------------------------------------------------------
// 1. STORE SETTINGS CORES
// -------------------------------------------------------------
router.get('/settings/store', adminGuard, async (req: Request, res: Response) => {
  try {
    const store = await getSetting('store-settings', {
      storeName: '3D Galaxy India',
      storeEmail: 'support@3dgalaxy.co.in',
      storePhone: '+91 99999 55555',
      storeAddress: 'Enclave Road, Sector 3, Delhi, India',
      currency: 'INR',
      timezone: 'IST',
    });
    return res.status(200).json({ success: true, data: store });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Database access failure', details: err.message });
  }
});

router.put('/settings/store', adminGuard, async (req: Request, res: Response) => {
  try {
    const storeData = req.body;
    await saveSetting('store-settings', storeData);
    return res.status(200).json({ success: true, message: 'Store settings synchronized successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Save failure', details: err.message });
  }
});

// -------------------------------------------------------------
// 2. THEME SETTINGS CORES
// -------------------------------------------------------------
router.get('/settings/theme', adminGuard, async (req: Request, res: Response) => {
  try {
    const theme = await getSetting('global-settings', {
      primaryColor: '#2563eb',
      secondaryColor: '#4f46e5',
      accentColor: '#10b981',
      borderRadius: 20,
      fontFamily: 'Inter',
      logoUrl: 'https://picsum.photos/seed/galaxy/200/50',
      faviconUrl: 'https://picsum.photos/seed/galaxy/32/32',
    });
    return res.status(200).json({ success: true, data: theme });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Theme fetch failure', details: err.message });
  }
});

router.put('/settings/theme', adminGuard, async (req: Request, res: Response) => {
  try {
    const themeData = req.body;
    await saveSetting('global-settings', themeData);
    return res.status(200).json({ success: true, message: 'Theme settings updated', data: themeData });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Theme save failure', details: err.message });
  }
});

// -------------------------------------------------------------
// 3. PAYMENT SETTINGS CORES
// -------------------------------------------------------------
router.get('/settings/payment', adminGuard, async (req: Request, res: Response) => {
  try {
    const gateways = await prisma.paymentGateway.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return res.status(200).json({ success: true, data: gateways });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to yield payment gateways', details: err.message });
  }
});

router.put('/settings/payment', adminGuard, async (req: Request, res: Response) => {
  try {
    const { gateways } = req.body;
    if (Array.isArray(gateways)) {
      for (const gw of gateways) {
        await prisma.paymentGateway.upsert({
          where: { gatewayCode: gw.gatewayCode },
          update: {
            isEnabled: !!gw.isEnabled,
            isTestMode: gw.isTestMode !== undefined ? !!gw.isTestMode : true,
            keyId: gw.keyId || null,
            keySecret: gw.keySecret || null,
            displayName: gw.displayName || gw.name,
          },
          create: {
            name: gw.name || gw.displayName || gw.gatewayCode,
            gatewayCode: gw.gatewayCode,
            isEnabled: !!gw.isEnabled,
            isTestMode: gw.isTestMode !== undefined ? !!gw.isTestMode : true,
            keyId: gw.keyId || null,
            keySecret: gw.keySecret || null,
          }
        });
      }
    }
    return res.status(200).json({ success: true, message: 'Payment gateway configuration updated' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Payment save failure', details: err.message });
  }
});

// -------------------------------------------------------------
// 4. SHIPPING SETTINGS CORES
// -------------------------------------------------------------
router.get('/settings/shipping', adminGuard, async (req: Request, res: Response) => {
  try {
    const config = await getSetting('shipping-settings', {
      freeShippingThreshold: 999,
      flatRate: 80,
      zones: [
        { id: 'sz1', zone: 'Domestic (All India Enclave)', courier: 'BlueDart Cluster', baseRate: 80, freeThreshold: 999 },
        { id: 'sz2', zone: 'International Express', courier: 'DHL Logistics', baseRate: 1500, freeThreshold: 20000 }
      ],
    });
    return res.status(200).json({ success: true, data: config });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to locate shipping settings', details: err.message });
  }
});

router.put('/settings/shipping', adminGuard, async (req: Request, res: Response) => {
  try {
    await saveSetting('shipping-settings', req.body);
    return res.status(200).json({ success: true, message: 'Shipping settings registered' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Shipping settings sync failure', details: err.message });
  }
});

// -------------------------------------------------------------
// 5. TAX SETTINGS CORES
// -------------------------------------------------------------
router.get('/settings/tax', adminGuard, async (req: Request, res: Response) => {
  try {
    const tax = await getSetting('tax-settings', {
      defaultTaxRate: 18,
      taxRules: [
        { id: 'tr1', state: 'Delhi NCR', rate: 18, active: true },
        { id: 'tr2', state: 'Maharashtra', rate: 18, active: true },
        { id: 'tr3', state: 'Karnataka', rate: 18, active: true },
      ],
    });
    return res.status(200).json({ success: true, data: tax });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to access tax rules', details: err.message });
  }
});

router.put('/settings/tax', adminGuard, async (req: Request, res: Response) => {
  try {
    await saveSetting('tax-settings', req.body);
    return res.status(200).json({ success: true, message: 'Tax parameters cataloged' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Tax parameter change write failure', details: err.message });
  }
});

// -------------------------------------------------------------
// 6. CMS PAGES OPERATIONS
// -------------------------------------------------------------
router.get('/pages', adminGuard, async (req: Request, res: Response) => {
  try {
    const list = await prisma.page.findMany({ orderBy: { title: 'asc' } });
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
router.get('/blogs', adminGuard, async (req: Request, res: Response) => {
  try {
    const list = await prisma.blog.findMany({ orderBy: { createdAt: 'desc' } });
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
// 8. CMS FAQS OPERATIONS
// -------------------------------------------------------------
router.get('/faqs', adminGuard, async (req: Request, res: Response) => {
  try {
    const list = await getSetting('faq-settings', [
      { id: 'f1', category: 'Pricing & B2B', question: 'Do you offer custom SLA pricing constructs?', answer: 'Yes, we offer dynamic B2B custom discounts based on custom bulk volume tiers.' },
      { id: 'f2', category: 'Brahma 3D Farm', question: 'How is printing telemetry synchronized?', answer: 'Our hardware modules communicate directly over secure live WebSockets to the monitor telemetry cluster.' }
    ]);
    return res.status(200).json({ success: true, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Faqs query failed', details: err.message });
  }
});

router.post('/faqs', adminGuard, async (req: Request, res: Response) => {
  try {
    const { category, question, answer } = req.body;
    if (!question || !answer) return res.status(400).json({ success: false, error: 'Question and answer required' });
    const current = await getSetting('faq-settings', []);
    const newItem = {
      id: 'faq-' + Date.now(),
      category: category || 'Pricing & B2B',
      question,
      answer,
    };
    current.push(newItem);
    await saveSetting('faq-settings', current);
    return res.status(201).json({ success: true, data: newItem });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'FAQ appending failed', details: err.message });
  }
});

router.delete('/faqs/:id', adminGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const current = await getSetting('faq-settings', []);
    const filtered = current.filter((f: any) => f.id !== id);
    await saveSetting('faq-settings', filtered);
    return res.status(200).json({ success: true, message: 'FAQ successfully deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to edit FAQs list', details: err.message });
  }
});

// -------------------------------------------------------------
// 9. CMS BANNERS OPERATIONS
// -------------------------------------------------------------
router.get('/banners', adminGuard, async (req: Request, res: Response) => {
  try {
    const list = await prisma.banner.findMany({ orderBy: { createdAt: 'desc' } });
    return res.status(200).json({ success: true, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Banners fetch failure', details: err.message });
  }
});

router.post('/banners', adminGuard, async (req: Request, res: Response) => {
  try {
    const { title, imageUrl, linkUrl, position, isActive } = req.body;
    if (!imageUrl) return res.status(400).json({ success: false, error: 'Image URL is required' });
    const banner = await prisma.banner.create({
      data: {
        title: title || 'Hero Promo Banner',
        imageUrl,
        linkUrl: linkUrl || '/',
        position: position || 'Main Carousel',
        isActive: isActive !== undefined ? !!isActive : true,
      },
    });
    return res.status(201).json({ success: true, data: banner });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Promo Banner registration failed', details: err.message });
  }
});

router.put('/banners/:id', adminGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, imageUrl, linkUrl, position, isActive } = req.body;
    const updated = await prisma.banner.update({
      where: { id },
      data: {
        title,
        imageUrl,
        linkUrl,
        position,
        isActive: isActive !== undefined ? !!isActive : undefined,
      },
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Promo Banner alterations failed', details: err.message });
  }
});

router.delete('/banners/:id', adminGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.banner.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Promo Banner successfully erased' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Banner deletion command halted', details: err.message });
  }
});

// Helper to ensure a string id is mapped to a valid deterministic UUID structure
function toValidUuid(id: string): string {
  if (!id) return '00000000-0000-0000-0000-000000000000';
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (uuidRegex.test(id)) {
    return id.toLowerCase();
  }
  const idMap: { [key: string]: string } = {
    'hero-1': '11111111-1111-1111-1111-111111111111',
    'cat-2': '22222222-2222-2222-2222-222222222222',
    'feat-3': '33333333-3333-3333-3333-333333333333',
    'best-4': '44444444-4444-4444-4444-444444444444',
    'brands-5': '55555555-5555-5555-5555-555555555555'
  };
  if (idMap[id]) {
    return idMap[id];
  }
  let clean = id.replace(/[^a-fA-F0-9]/g, '');
  if (clean.length < 32) {
    clean = clean.padEnd(32, '0');
  } else {
    clean = clean.slice(0, 32);
  }
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`.toLowerCase();
}

// -------------------------------------------------------------
// 10. DYNAMIC HOMEPAGE BUILDER (SECTIONS ORDER)
// -------------------------------------------------------------
router.get('/homepage', adminGuard, async (req: Request, res: Response) => {
  try {
    const sections = await prisma.homepageSection.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return res.status(200).json({ success: true, data: sections });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to access layout configurations', details: err.message });
  }
});

router.put('/homepage', adminGuard, async (req: Request, res: Response) => {
  try {
    const { sections } = req.body;
    if (Array.isArray(sections)) {
      for (const sec of sections) {
        const mappedId = toValidUuid(sec.id);
        await prisma.homepageSection.upsert({
          where: { id: mappedId },
          update: {
            name: sec.name,
            type: sec.type,
            sortOrder: parseInt(sec.order || sec.sortOrder || '0', 10),
            isActive: sec.visible !== undefined ? !!sec.visible : (sec.isActive !== undefined ? !!sec.isActive : true),
          },
          create: {
            id: mappedId,
            name: sec.name,
            type: sec.type || 'HERO',
            sortOrder: parseInt(sec.order || sec.sortOrder || '0', 10),
            isActive: sec.visible !== undefined ? !!sec.visible : (sec.isActive !== undefined ? !!sec.isActive : true),
          }
        });
      }
    }
    return res.status(200).json({ success: true, message: 'Homepage layout section mapped successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Sections update failure', details: err.message });
  }
});

router.post('/homepage/sections', adminGuard, async (req: Request, res: Response) => {
  try {
    const { name, type, order, visible } = req.body;
    const count = await prisma.homepageSection.count();
    const created = await prisma.homepageSection.create({
      data: {
        name: name || 'Custom Section',
        type: type || 'HERO',
        sortOrder: order !== undefined ? parseInt(order, 10) : count + 1,
        isActive: visible !== undefined ? !!visible : true,
      },
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed' });
  }
});

router.delete('/homepage/sections/:id', adminGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mappedId = toValidUuid(id);
    await prisma.homepageSection.delete({ where: { id: mappedId } });
    return res.status(200).json({ success: true, message: 'Successfully deleted structural sequence' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Purge failed' });
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
    const list = await getSetting('advertisements-list', [
      { id: 'ad1', title: 'Industrial Brahma Printing Cluster Service', position: 'top-banner', mediaUrl: 'https://picsum.photos/seed/adbanner/1920/220', targetUrl: '/pages/brahma-3d-printing-service', status: 'active', clicks: 212, impressions: 5320 },
      { id: 'ad2', title: 'Unlock B2B Distributor Rates', position: 'footer', mediaUrl: 'https://picsum.photos/seed/footerad/1920/180', targetUrl: '/profile', status: 'active', clicks: 88, impressions: 4210 }
    ]);
    return res.status(200).json({ success: true, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/advertisements/:id/click', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const current = await getSetting('advertisements-list', []);
    const idx = current.findIndex((ad: any) => ad.id === id);
    if (idx !== -1) {
      current[idx].clicks = (current[idx].clicks || 0) + 1;
      await saveSetting('advertisements-list', current);
      return res.status(200).json({ success: true, data: current[idx] });
    }
    return res.status(404).json({ success: false, error: 'Advertisement not found' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/advertisements/:id/impression', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const current = await getSetting('advertisements-list', []);
    const idx = current.findIndex((ad: any) => ad.id === id);
    if (idx !== -1) {
      current[idx].impressions = (current[idx].impressions || 0) + 1;
      await saveSetting('advertisements-list', current);
      return res.status(200).json({ success: true, data: current[idx] });
    }
    return res.status(404).json({ success: false, error: 'Advertisement not found' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/social-posts', adminGuard, async (req: Request, res: Response) => {
  try {
    const newItem = req.body;
    newItem.id = 's-' + Date.now();
    const current = await getSetting('social-posts-list', []);
    current.push(newItem);
    await saveSetting('social-posts-list', current);
    return res.status(201).json({ success: true, data: newItem });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/advertisements', adminGuard, async (req: Request, res: Response) => {
  try {
    const newItem = req.body;
    newItem.id = 'ad-' + Date.now();
    newItem.clicks = 0;
    newItem.impressions = 0;
    const current = await getSetting('advertisements-list', []);
    current.push(newItem);
    await saveSetting('advertisements-list', current);
    return res.status(201).json({ success: true, data: newItem });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
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

export default router;
