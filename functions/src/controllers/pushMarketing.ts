import { Request, Response } from 'express';
import prisma from '../config/database';
import { setDynamicFirebaseConfig, getFirebaseAdmin } from '../config/firebase';

// Helper to safely parse JSON
const parseJSON = (str: any, defaultVal: any = {}) => {
  if (!str) return defaultVal;
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultVal;
  }
};

// 1. Get Firebase Credentials Settings
export const getFirebaseSettings = async (req: Request, res: Response) => {
  try {
    const record = await prisma.setting.findUnique({
      where: { settingKey: 'firebase-settings' }
    });

    const defaultVal = {
      enabled: false,
      projectId: '',
      apiKey: '',
      appId: '',
      messagingSenderId: '',
      vapidPublicKey: '',
      serviceAccount: '',
      defaultIcon: '/assets/icon.png',
      defaultBadge: '/assets/badge.png',
      defaultImage: '',
      defaultClickUrl: '/',
      priority: 'Normal',
      ttl: 3600,
      sound: 'default',
      version: 1
    };

    if (!record) {
      return res.status(200).json({ success: true, data: defaultVal });
    }

    const data = parseJSON(record.settingData, defaultVal);
    // Mask service account JSON for security
    if (data.serviceAccount) {
      data.serviceAccount = '********';
    }

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching Firebase settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch Firebase settings', error: error.message });
  }
};

// 2. Update Firebase Settings
export const updateFirebaseSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || null;
    const incomingData = req.body;

    const existingRecord = await prisma.setting.findUnique({
      where: { settingKey: 'firebase-settings' }
    });

    let currentSettings = existingRecord ? parseJSON(existingRecord.settingData, {}) : {};
    
    // If service account is masked or empty, preserve existing one
    let serviceAccount = incomingData.serviceAccount;
    if (serviceAccount === '********' || !serviceAccount) {
      serviceAccount = currentSettings.serviceAccount || '';
    }

    const version = (Number(currentSettings.version) || 1) + 1;

    const updatedData = {
      ...currentSettings,
      ...incomingData,
      serviceAccount,
      version,
      updatedAt: new Date().toISOString()
    };

    const record = await prisma.setting.upsert({
      where: { settingKey: 'firebase-settings' },
      update: { settingData: updatedData },
      create: { settingKey: 'firebase-settings', settingData: updatedData }
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_FIREBASE_SETTINGS',
        entityType: 'MARKETING_SETTINGS',
        entityId: record.id,
        newData: { ...updatedData, serviceAccount: '********' } as any,
        ipAddress: req.ip || null
      }
    });

    // Reinitialize FCM Admin SDK dynamically in real-time
    if (updatedData.enabled && updatedData.serviceAccount) {
      let sa = updatedData.serviceAccount;
      if (typeof sa === 'string') {
        if (!sa.trim().startsWith('{')) {
          try {
            sa = Buffer.from(sa, 'base64').toString('utf-8');
          } catch (e) {}
        }
      }
      await setDynamicFirebaseConfig(sa, updatedData.storageBucket || undefined);
    }

    return res.status(200).json({
      success: true,
      message: 'Firebase settings saved successfully.',
      data: { ...updatedData, serviceAccount: '********' }
    });
  } catch (error: any) {
    console.error('Error updating Firebase settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to save Firebase settings', error: error.message });
  }
};

// 3. Validate Firebase Config / Connection
export const validateFirebaseConfig = async (req: Request, res: Response) => {
  try {
    const { serviceAccount, storageBucket } = req.body;
    if (!serviceAccount || serviceAccount === '********') {
      return res.status(400).json({ success: false, message: 'Raw Service Account credentials required for validation.' });
    }

    let parsedCert = serviceAccount;
    if (typeof parsedCert === 'string') {
      if (!parsedCert.trim().startsWith('{')) {
        try {
          parsedCert = Buffer.from(parsedCert, 'base64').toString('utf-8');
        } catch (e) {}
      }
      parsedCert = JSON.parse(parsedCert);
    }

    // Try starting a sandbox validation
    await setDynamicFirebaseConfig(parsedCert, storageBucket || undefined);
    const adminInstance = getFirebaseAdmin();
    if (!adminInstance) {
      throw new Error('Initialization returned null admin.');
    }
    
    // Test FCM messaging service load
    const messaging = adminInstance.messaging();
    if (!messaging) {
      throw new Error('FCM service failed to load.');
    }

    return res.status(200).json({
      success: true,
      message: 'Firebase configuration is valid and connection established successfully!'
    });
  } catch (error: any) {
    console.error('Firebase validation failed:', error);
    return res.status(400).json({
      success: false,
      message: 'Firebase validation failed: ' + (error.message || 'Unknown error'),
      details: error.message
    });
  }
};

// 4. Get Popup Settings
export const getPopupSettings = async (req: Request, res: Response) => {
  try {
    const record = await prisma.setting.findUnique({
      where: { settingKey: 'push-popup-settings' }
    });

    const defaultVal = {
      enabled: true,
      title: '🎉 Never Miss Amazing Deals!',
      description: 'Get notified instantly about:\n🔥 Today\'s Special Offers\n🎁 Festival Offers\n💰 Exclusive Discounts\n🚚 Flash Sales\n🆕 New Arrivals',
      allowText: 'Allow Notifications',
      cancelText: 'Maybe Later',
      logoUrl: '/assets/logo.png',
      bannerUrl: '',
      backgroundColor: '#1e293b',
      textColor: '#ffffff',
      buttonColor: '#f97316',
      borderRadius: 12,
      animation: 'slide-in-bottom',
      delayShow: 5,
      scrollShow: 30,
      showOnce: false,
      reshowDays: 7,
      hideExisting: true,
      hideCheckout: true,
      hidePayment: true,
      version: 1
    };

    if (!record) {
      return res.status(200).json({ success: true, data: defaultVal });
    }

    const data = parseJSON(record.settingData, defaultVal);
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching popup settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch popup settings', error: error.message });
  }
};

// 5. Update Popup Settings
export const updatePopupSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || null;
    const incomingData = req.body;

    const existingRecord = await prisma.setting.findUnique({
      where: { settingKey: 'push-popup-settings' }
    });

    let currentSettings = existingRecord ? parseJSON(existingRecord.settingData, {}) : {};
    const version = (Number(currentSettings.version) || 1) + 1;

    const updatedData = {
      ...currentSettings,
      ...incomingData,
      version,
      updatedAt: new Date().toISOString()
    };

    const record = await prisma.setting.upsert({
      where: { settingKey: 'push-popup-settings' },
      update: { settingData: updatedData },
      create: { settingKey: 'push-popup-settings', settingData: updatedData }
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_PUSH_POPUP_SETTINGS',
        entityType: 'MARKETING_SETTINGS',
        entityId: record.id,
        newData: updatedData as any,
        ipAddress: req.ip || null
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Popup settings saved successfully.',
      data: updatedData
    });
  } catch (error: any) {
    console.error('Error updating popup settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to save popup settings', error: error.message });
  }
};

// 6. Get Public Firebase Settings (Safe to expose)
export const getPublicFirebaseSettings = async (req: Request, res: Response) => {
  try {
    const record = await prisma.setting.findUnique({
      where: { settingKey: 'firebase-settings' }
    });
    if (!record) {
      return res.status(200).json({ success: true, data: { enabled: false } });
    }
    const data = parseJSON(record.settingData, {});
    const publicData = {
      enabled: !!data.enabled,
      projectId: data.projectId || '',
      apiKey: data.apiKey || '',
      appId: data.appId || '',
      messagingSenderId: data.messagingSenderId || '',
      vapidPublicKey: data.vapidPublicKey || ''
    };
    return res.status(200).json({ success: true, data: publicData });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 7. Search Products for Push Builder
export const searchProductsForPush = async (req: Request, res: Response) => {
  const { q } = req.query;
  try {
    const searchString = q ? String(q) : '';
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: searchString, mode: 'insensitive' } },
          { sku: { contains: searchString, mode: 'insensitive' } }
        ]
      },
      include: {
        category: true,
        brand: true,
        variants: true
      },
      take: 10
    });

    const results = products.map(p => {
      const basePrice = Number(p.basePrice);
      const salePrice = p.salePrice ? Number(p.salePrice) : null;
      let discountPercent = 0;
      if (salePrice && basePrice > 0) {
        discountPercent = Math.round(((basePrice - salePrice) / basePrice) * 100);
      }

      const imageUrls = parseJSON(p.images, []);
      const primaryImage = imageUrls.length > 0 ? imageUrls[0] : '';

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        image: primaryImage,
        basePrice,
        salePrice,
        discountPercent,
        category: p.category?.name || 'Uncategorized',
        brand: p.brand?.name || 'Generic',
        stock: p.stock,
        productUrl: `/product/${p.slug}`
      };
    });

    return res.status(200).json({ success: true, data: results });
  } catch (error: any) {
    console.error('Error searching products for push:', error);
    return res.status(500).json({ success: false, message: 'Failed to search products', error: error.message });
  }
};

// 8. Custom Audience Count Estimator
export const getTargetAudienceCount = async (req: Request, res: Response) => {
  const { targetType } = req.body;
  try {
    let count = 0;
    const optInFilter = { notificationEnabled: true };

    if (targetType === 'everyone') {
      count = await prisma.notificationDevice.count({ where: optInFilter });
    } else if (targetType === 'guests') {
      count = await prisma.notificationDevice.count({
        where: { ...optInFilter, userId: null }
      });
    } else if (targetType === 'registered') {
      count = await prisma.notificationDevice.count({
        where: { ...optInFilter, userId: { not: null } }
      });
    } else if (targetType === 'cart_abandoners') {
      const activeCheckouts = await prisma.abandonedCheckout.findMany({
        where: { recoveryStatus: 'Active' },
        select: { customerId: true, guestId: true }
      });
      const customerIds = activeCheckouts.map(c => c.customerId).filter(Boolean) as string[];
      const guestIds = activeCheckouts.map(c => c.guestId).filter(Boolean) as string[];
      let userIds: string[] = [];
      if (customerIds.length > 0) {
        const customers = await prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { userId: true }
        });
        userIds = customers.map(c => c.userId).filter(Boolean) as string[];
      }
      count = await prisma.notificationDevice.count({
        where: {
          ...optInFilter,
          OR: [
            { userId: { in: userIds } },
            { guestId: { in: guestIds } }
          ]
        }
      });
    } else if (targetType === 'wishlist') {
      const wishlistEntries = await prisma.customerWishlist.findMany({
        select: { customer: { select: { userId: true } } }
      });
      const userIds = wishlistEntries.map(w => w.customer.userId).filter(Boolean) as string[];
      count = await prisma.notificationDevice.count({
        where: { ...optInFilter, userId: { in: userIds } }
      });
    } else if (targetType === 'returning_customers') {
      const completedOrders = await prisma.order.findMany({
        where: { status: { in: ['COMPLETED', 'DELIVERED', 'SHIPPED'] } },
        select: { customer: { select: { userId: true } } }
      });
      const userIds = completedOrders.map(o => o.customer?.userId).filter(Boolean) as string[];
      count = await prisma.notificationDevice.count({
        where: { ...optInFilter, userId: { in: userIds } }
      });
    } else {
      count = await prisma.notificationDevice.count({ where: optInFilter });
    }

    return res.status(200).json({ success: true, data: { count } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
