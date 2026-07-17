import { Router } from "express";
import prisma from "../config/database";

const router = Router();

function maskCustomerName(first: string | null, last: string | null, email: string | null): string {
  if (first) {
    return `${first.charAt(0)}*** ${last ? last.charAt(0) : ''}`.trim() + ' Customer';
  }
  if (email) {
    const parts = email.split('@');
    const name = parts[0];
    return `${name.charAt(0)}***${name.charAt(name.length - 1)} Customer`;
  }
  return 'Customer';
}

function getMinutesAgo(date: Date): number {
  return Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
}

const DEMO_PURCHASES = [
  { id: 'd1', customerName: 'T*** S', city: 'Gaya', state: 'Bihar', country: 'India', productName: 'PLA Pro Filament 1.75mm', productImage: 'https://picsum.photos/seed/pla/80/80', productSlug: 'pla-pro-filament-175mm', minutesAgo: 24 },
  { id: 'd2', customerName: 'R*** K', city: 'Mumbai', state: 'Maharashtra', country: 'India', productName: 'Bambu Lab A1 Mini', productImage: 'https://picsum.photos/seed/bambu/80/80', productSlug: 'bambu-lab-a1-mini', minutesAgo: 8 },
];

router.get('/recent-purchases', async (req, res) => {
  try {
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

    return res.status(200).json({ success: true, data: finalData });
  } catch (err: any) {
    console.error('recent-purchases error:', err.message);
    return res.status(200).json({ success: true, data: DEMO_PURCHASES, fallback: true });
  }
});

export default router;
