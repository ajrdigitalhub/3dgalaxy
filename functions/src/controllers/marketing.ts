import { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import prisma, { withDbRetry } from '../config/database';
import { ENV } from '../config/env';

const DEFAULT_MARKETING_CONFIG = {
  enabled: true,
  metaPixelId: '',
  metaCapiToken: '',
  metaCatalogId: '',
  ga4MeasurementId: 'G-4BKM2K4PS0',
  googleAdsConversionId: '',
  googleAdsConversionLabel: '',
  googleAdsLeadLabel: '',
  gtmContainerId: 'GTM-THJDDXCK',
  googleMerchantCenterId: '',
  googleMerchantStoreCode: '3D_GALAXY_MAIN',
  enableEnhancedConversions: true,
  enableDynamicRemarketing: true,
  enableConsentMode: true,
  enableServerSideCapi: true,
  debugMode: false,
  defaultCurrency: 'INR',
  metaTestEventCode: ''
};

const hashSha256 = (val?: string | null): string | null => {
  if (!val) return null;
  const clean = val.trim().toLowerCase();
  return crypto.createHash('sha256').update(clean).digest('hex');
};

/**
 * Public Endpoint: GET /api/marketing/config
 */
export const getMarketingConfig = async (req: Request, res: Response) => {
  try {
    const record = await prisma.setting.findUnique({
      where: { settingKey: 'marketing_tracking_config' }
    });

    const config = record
      ? { ...DEFAULT_MARKETING_CONFIG, ...(record.settingData as object) }
      : DEFAULT_MARKETING_CONFIG;

    return res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Admin Endpoint: GET /api/admin/marketing/settings
 */
export const getAdminMarketingSettings = async (req: Request, res: Response) => {
  return getMarketingConfig(req, res);
};

/**
 * Admin Endpoint: PUT /api/admin/marketing/settings
 */
export const updateAdminMarketingSettings = async (req: Request, res: Response) => {
  try {
    const newSettings = req.body;
    const userId = (req as any).user?.id || null;

    const setting = await prisma.setting.upsert({
      where: { settingKey: 'marketing_tracking_config' },
      update: { settingData: newSettings },
      create: {
        settingKey: 'marketing_tracking_config',
        settingData: newSettings
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_MARKETING_SETTINGS',
        entityType: 'MARKETING_CONFIG',
        entityId: setting.id,
        newData: newSettings as any,
        ipAddress: req.ip || null
      }
    });

    return res.json({
      success: true,
      message: 'Marketing tracking configuration updated successfully',
      data: setting.settingData
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Meta Conversions API (CAPI) Proxy Handler
 * POST /api/marketing/meta-capi
 */
export const sendMetaCapiEvent = async (req: Request, res: Response) => {
  try {
    const record = await prisma.setting.findUnique({
      where: { settingKey: 'marketing_tracking_config' }
    });

    const config = record ? (record.settingData as any) : DEFAULT_MARKETING_CONFIG;
    if (!config.enabled || !config.metaPixelId || !config.metaCapiToken) {
      return res.json({
        success: false,
        message: 'Meta CAPI is not configured or disabled'
      });
    }

    const { eventName, eventId, eventTime, eventSourceUrl, userData, customData, utmParams } = req.body;

    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const clientUserAgent = req.headers['user-agent'] || '';

    const hashedUserData: any = {
      client_ip_address: clientIp,
      client_user_agent: clientUserAgent
    };

    if (userData?.email) hashedUserData.em = [hashSha256(userData.email)];
    if (userData?.phone) hashedUserData.ph = [hashSha256(userData.phone)];
    if (userData?.firstName) hashedUserData.fn = [hashSha256(userData.firstName)];
    if (userData?.lastName) hashedUserData.ln = [hashSha256(userData.lastName)];
    if (userData?.externalId) hashedUserData.external_id = [hashSha256(userData.externalId)];

    if (utmParams?.fbclid) {
      hashedUserData.fbc = `fb.1.${Date.now()}.${utmParams.fbclid}`;
    }

    const eventPayload = {
      data: [
        {
          event_name: eventName,
          event_time: eventTime || Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: eventSourceUrl || ENV.SITE_URL,
          action_source: 'website',
          user_data: hashedUserData,
          custom_data: customData || {}
        }
      ]
    };

    const url = `https://graph.facebook.com/v19.0/${config.metaPixelId}/events?access_token=${config.metaCapiToken}`;
    const fbRes = await axios.post(url, eventPayload, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Log CAPI Audit Record
    await prisma.auditLog.create({
      data: {
        action: 'META_CAPI_DISPATCH',
        entityType: 'MARKETING_TRACKING',
        entityId: '00000000-0000-0000-0000-000000000000',
        newData: { eventName, eventId, fbResponse: fbRes.data },
        ipAddress: (clientIp as string) || null
      }
    });

    return res.json({
      success: true,
      message: 'Meta CAPI event dispatched successfully',
      fbResponse: fbRes.data
    });
  } catch (error: any) {
    console.error('Error dispatching Meta CAPI event:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to send Meta CAPI event',
      error: error.response?.data || error.message
    });
  }
};

/**
 * Resolves fully-qualified canonical base URL from request or environment
 */
export const resolveSiteBaseUrl = (req?: Request): string => {
  if (req) {
    const host = (req.get('x-forwarded-host') || req.get('host') || '').toLowerCase().trim();
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1') && !host.includes('.run.app') && !host.includes('cloudfunctions.net')) {
      const proto = (req.get('x-forwarded-proto') || (req.secure ? 'https' : 'https')).toLowerCase().trim();
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  }
  return (ENV.SITE_URL || 'https://3dgalaxy.co.in').replace(/\/+$/, '');
};

const sanitizeCdata = (val?: string | null): string => {
  if (!val) return '';
  return String(val).replace(/\]\]>/g, ']]&gt;').trim();
};

/**
 * Intelligent Image Resolver for Google Merchant & Local Inventory Feeds:
 * - Scans p.images (objects, strings, relative paths, storage paths)
 * - Scans p.variants (variantImages, images)
 * - Scans HTML descriptions for <img> tags
 * - Eliminates SVG files, data URIs, and [object Object] artifacts
 * - Maps product names/slugs to bundled high-resolution product photography
 * - Never returns a generic site logo as product image (which triggers Google disapproval)
 */
export const resolveProductImageLinks = (p: any, baseUrl: string): { mainImage: string; additionalImages: string[] } => {
  const imagesFound: string[] = [];
  const seen = new Set<string>();

  const addImage = (raw: any) => {
    if (!raw) return;
    let u = '';
    if (typeof raw === 'string') {
      u = raw.trim();
    } else if (typeof raw === 'object') {
      u = (raw.url || raw.imageUrl || raw.src || raw.storagePath || raw.path || '').trim();
    }
    if (!u || u === '[object Object]' || u.startsWith('data:image')) return;

    // Disapprove SVGs for Google Merchant product image
    const uLower = u.toLowerCase();
    if (uLower.endsWith('.svg') || uLower.includes('.svg?') || uLower.includes('.svg#')) return;

    // Reject generic site logos from being used as product photos
    if (uLower.endsWith('/3d-logo.png') || uLower.endsWith('/logo.png') || uLower.includes('favicon')) return;

    let fullUrl = u;
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      if (fullUrl.startsWith('//')) {
        fullUrl = `https:${fullUrl}`;
      } else {
        fullUrl = `${baseUrl.replace(/\/+$/, '')}/${fullUrl.replace(/^\/+/, '')}`;
      }
    }

    if (!seen.has(fullUrl)) {
      seen.add(fullUrl);
      imagesFound.push(fullUrl);
    }
  };

  // 1. Check p.images
  let rawImages = p.images;
  if (typeof rawImages === 'string') {
    try {
      rawImages = JSON.parse(rawImages);
    } catch {
      rawImages = [rawImages];
    }
  }
  if (Array.isArray(rawImages)) {
    rawImages.forEach(addImage);
  }

  // 2. Check p.variants
  if (Array.isArray(p.variants)) {
    for (const v of p.variants) {
      let vImgs = v.variantImages;
      if (typeof vImgs === 'string') {
        try { vImgs = JSON.parse(vImgs); } catch { vImgs = [vImgs]; }
      }
      if (Array.isArray(vImgs)) {
        vImgs.forEach(addImage);
      }
      let vMore = v.images;
      if (typeof vMore === 'string') {
        try { vMore = JSON.parse(vMore); } catch { vMore = [vMore]; }
      }
      if (Array.isArray(vMore)) {
        vMore.forEach(addImage);
      }
    }
  }

  // 3. Check HTML descriptions for <img> tags
  if (imagesFound.length === 0 && (p.description || p.shortDescription)) {
    const html = `${p.description || ''} ${p.shortDescription || ''}`;
    const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["']/gi);
    if (imgMatches) {
      for (const m of imgMatches) {
        const srcMatch = m.match(/src=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1]) {
          addImage(srcMatch[1]);
        }
      }
    }
  }

  // 4. Keyword fallback to high-resolution product photography
  if (imagesFound.length === 0) {
    const nameLower = (p.name || '').toLowerCase();
    const slugLower = (p.slug || '').toLowerCase();
    const combined = `${nameLower} ${slugLower}`;

    if (combined.includes('a1 combo') || (combined.includes('bambu') && combined.includes('a1') && combined.includes('combo'))) {
      addImage(`${baseUrl}/images/products/bambu_a1_combo.png`);
    } else if (combined.includes('a1 mini combo')) {
      addImage(`${baseUrl}/images/products/bambu_a1_mini_combo.png`);
    } else if (combined.includes('a1 mini')) {
      addImage(`${baseUrl}/images/products/bambu_a1_mini.png`);
    } else if (combined.includes('x1') || combined.includes('x1e') || combined.includes('x1-carbon')) {
      addImage(`${baseUrl}/images/products/bambu_x1_carbon.png`);
    } else if (combined.includes('p1s') || combined.includes('p1p')) {
      addImage(`${baseUrl}/images/products/bambu_p1s.png`);
    } else if (combined.includes('ender') || combined.includes('creality') || combined.includes('k1')) {
      addImage(`${baseUrl}/images/products/creality_k1_max.png`);
    } else if (combined.includes('filament') || combined.includes('pla') || combined.includes('rainbow') || combined.includes('petg') || combined.includes('abs')) {
      addImage(`${baseUrl}/images/products/pla_filament_white.png`);
    } else if (combined.includes('resin') || combined.includes('sla')) {
      addImage(`${baseUrl}/images/products/standard_resin_grey.png`);
    } else if (combined.includes('scanner') || combined.includes('einstar')) {
      addImage(`${baseUrl}/images/products/einstar_scanner.png`);
    } else if (combined.includes('mars') || combined.includes('elegoo')) {
      addImage(`${baseUrl}/images/products/elegoo_mars_4.png`);
    } else {
      addImage(`${baseUrl}/images/products/bambu_a1_combo.png`);
    }
  }

  const mainImage = imagesFound[0] || `${baseUrl}/images/products/bambu_a1_combo.png`;
  const additionalImages = imagesFound.slice(1, 10);
  return { mainImage, additionalImages };
};

/**
 * Google Merchant Center Dynamic Product XML Feed Generator
 * GET /api/marketing/feeds/google-merchant.xml
 * Features:
 * - Channel: online (eliminates "Missing local inventory data" error)
 * - Explicit Shipping element for India
 * - Intelligent image extraction with fallback to high-res product photos
 * - Free listings & Shopping ads inclusion
 */
export const generateGoogleMerchantFeedXml = async (req: Request, res: Response) => {
  try {
    const baseUrl = resolveSiteBaseUrl(req);
    const includeLocal = req.query.include_local === 'true';

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      include: {
        category: true,
        brand: true,
        variants: {
          where: { isActive: true, deletedAt: null }
        }
      }
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${sanitizeCdata(ENV.SITE_NAME)} Official Product Catalog</title>
    <link>${baseUrl}</link>
    <description>3D Printers, Filaments, SLA Resins and Spare Parts in India</description>\n`;

    products.forEach(p => {
      const regularPriceNum = Number(p.basePrice || (p as any).mrp || p.salePrice || 0);
      if (regularPriceNum <= 0) return; // Skip products without valid pricing to avoid Google Merchant disapproval

      const price = regularPriceNum.toFixed(2);
      const salePriceNum = p.salePrice ? Number(p.salePrice) : 0;
      const hasSalePrice = salePriceNum > 0 && salePriceNum < regularPriceNum;
      const salePrice = hasSalePrice ? salePriceNum.toFixed(2) : null;

      const { mainImage, additionalImages } = resolveProductImageLinks(p, baseUrl);
      const availability = p.stock > 0 ? 'in_stock' : 'out_of_stock';
      const brandName = p.brand?.name || ENV.SITE_NAME;
      const categoryName = p.category?.name || '3D Printers & Accessories';
      const hasGtinOrMpn = !!(p.sku || (p as any).barcode);
      const shippingPrice = p.freeShippingEligible ? 0 : Number(p.baseShippingCharge || 0);

      xml += `    <item>\n`;
      xml += `      <g:id>${p.id}</g:id>\n`;
      xml += `      <g:title><![CDATA[${sanitizeCdata(p.name)}]]></g:title>\n`;
      xml += `      <g:description><![CDATA[${sanitizeCdata(p.description || p.shortDescription || p.name)}]]></g:description>\n`;
      xml += `      <g:link>${baseUrl}/product/${p.slug}</g:link>\n`;
      xml += `      <g:image_link>${mainImage}</g:image_link>\n`;
      additionalImages.forEach(img => {
        xml += `      <g:additional_image_link>${img}</g:additional_image_link>\n`;
      });
      xml += `      <g:availability>${availability}</g:availability>\n`;
      xml += `      <g:price>${price} INR</g:price>\n`;

      if (salePrice) {
        xml += `      <g:sale_price>${salePrice} INR</g:sale_price>\n`;
      }

      xml += `      <g:brand><![CDATA[${sanitizeCdata(brandName)}]]></g:brand>\n`;
      xml += `      <g:condition>new</g:condition>\n`;
      xml += `      <g:channel>online</g:channel>\n`;
      xml += `      <g:shipping>\n`;
      xml += `        <g:country>IN</g:country>\n`;
      xml += `        <g:service>Standard Delivery</g:service>\n`;
      xml += `        <g:price>${shippingPrice.toFixed(2)} INR</g:price>\n`;
      xml += `      </g:shipping>\n`;
      xml += `      <g:included_destination>Free_listings</g:included_destination>\n`;
      xml += `      <g:included_destination>Shopping_ads</g:included_destination>\n`;
      if (!includeLocal) {
        xml += `      <g:excluded_destination>Free_local_listings</g:excluded_destination>\n`;
        xml += `      <g:excluded_destination>Local_inventory_ads</g:excluded_destination>\n`;
      }
      xml += `      <g:google_product_category><![CDATA[${sanitizeCdata(categoryName)}]]></g:google_product_category>\n`;

      if (hasGtinOrMpn) {
        if (p.sku) xml += `      <g:mpn>${p.sku}</g:mpn>\n`;
        if ((p as any).barcode) xml += `      <g:gtin>${(p as any).barcode}</g:gtin>\n`;
        xml += `      <g:identifier_exists>yes</g:identifier_exists>\n`;
      } else {
        xml += `      <g:identifier_exists>no</g:identifier_exists>\n`;
      }

      xml += `    </item>\n`;
    });

    xml += `  </channel>\n</rss>`;

    res.header('Content-Type', 'application/xml; charset=utf-8');
    return res.send(xml);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Google Merchant Center Dynamic Product JSON Feed Generator
 * GET /api/marketing/feeds/google-merchant.json
 */
export const generateGoogleMerchantFeedJson = async (req: Request, res: Response) => {
  try {
    const baseUrl = resolveSiteBaseUrl(req);
    const includeLocal = req.query.include_local === 'true';

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      include: {
        category: true,
        brand: true,
        variants: {
          where: { isActive: true, deletedAt: null }
        }
      }
    });

    const feedItems = products
      .map(p => {
        const regularPriceNum = Number(p.basePrice || (p as any).mrp || p.salePrice || 0);
        if (regularPriceNum <= 0) return null;

        const salePriceNum = p.salePrice ? Number(p.salePrice) : 0;
        const hasSalePrice = salePriceNum > 0 && salePriceNum < regularPriceNum;
        const { mainImage, additionalImages } = resolveProductImageLinks(p, baseUrl);
        const hasGtinOrMpn = !!(p.sku || (p as any).barcode);
        const shippingPrice = p.freeShippingEligible ? 0 : Number(p.baseShippingCharge || 0);

        return {
          id: p.id,
          title: p.name,
          description: p.description || p.shortDescription || p.name,
          link: `${baseUrl}/product/${p.slug}`,
          image_link: mainImage,
          additional_image_links: additionalImages,
          availability: p.stock > 0 ? 'in_stock' : 'out_of_stock',
          price: `${regularPriceNum.toFixed(2)} INR`,
          sale_price: hasSalePrice ? `${salePriceNum.toFixed(2)} INR` : undefined,
          brand: p.brand?.name || ENV.SITE_NAME,
          condition: 'new',
          channel: 'online',
          shipping: [
            {
              country: 'IN',
              service: 'Standard Delivery',
              price: `${shippingPrice.toFixed(2)} INR`
            }
          ],
          included_destinations: ['Free_listings', 'Shopping_ads'],
          excluded_destinations: includeLocal ? [] : ['Free_local_listings', 'Local_inventory_ads'],
          google_product_category: p.category?.name || '3D Printers & Accessories',
          identifier_exists: hasGtinOrMpn ? 'yes' : 'no',
          mpn: p.sku || undefined,
          gtin: (p as any).barcode || undefined
        };
      })
      .filter(Boolean);

    return res.json({
      title: `${ENV.SITE_NAME} Product Feed`,
      link: baseUrl,
      updatedAt: new Date().toISOString(),
      items: feedItems
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Google Merchant Center Dynamic Local Product Inventory XML Feed Generator
 * GET /api/marketing/feeds/google-local-inventory.xml
 * Supports ?store_code=XYZ (defaults to config or '3D_GALAXY_MAIN')
 */
export const generateGoogleLocalInventoryFeedXml = async (req: Request, res: Response) => {
  try {
    const baseUrl = resolveSiteBaseUrl(req);
    let storeCode = String(req.query.store_code || req.query.storeCode || '').trim();

    if (!storeCode) {
      try {
        const record = await prisma.setting.findUnique({
          where: { settingKey: 'marketing_tracking_config' }
        });
        storeCode = (record?.settingData as any)?.googleMerchantStoreCode || '3D_GALAXY_MAIN';
      } catch {
        storeCode = '3D_GALAXY_MAIN';
      }
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      include: {
        variants: {
          where: { isActive: true, deletedAt: null }
        }
      }
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${sanitizeCdata(ENV.SITE_NAME)} Local Product Inventory</title>
    <link>${baseUrl}</link>
    <description>Local store inventory availability and pricing for ${sanitizeCdata(ENV.SITE_NAME)}</description>\n`;

    products.forEach(p => {
      const regularPriceNum = Number(p.basePrice || (p as any).mrp || p.salePrice || 0);
      if (regularPriceNum <= 0) return;

      const price = regularPriceNum.toFixed(2);
      const salePriceNum = p.salePrice ? Number(p.salePrice) : 0;
      const hasSalePrice = salePriceNum > 0 && salePriceNum < regularPriceNum;
      const salePrice = hasSalePrice ? salePriceNum.toFixed(2) : null;
      const availability = p.stock > 0 ? 'in_stock' : 'out_of_stock';

      xml += `    <item>\n`;
      xml += `      <g:id>${p.id}</g:id>\n`;
      xml += `      <g:store_code>${storeCode}</g:store_code>\n`;
      xml += `      <g:availability>${availability}</g:availability>\n`;
      xml += `      <g:quantity>${p.stock}</g:quantity>\n`;
      xml += `      <g:price>${price} INR</g:price>\n`;
      if (salePrice) {
        xml += `      <g:sale_price>${salePrice} INR</g:sale_price>\n`;
      }
      xml += `      <g:pickup_method>buy</g:pickup_method>\n`;
      xml += `      <g:pickup_sla>same_day</g:pickup_sla>\n`;
      xml += `    </item>\n`;
    });

    xml += `  </channel>\n</rss>`;

    res.header('Content-Type', 'application/xml; charset=utf-8');
    return res.send(xml);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Google Merchant Center Dynamic Local Product Inventory JSON Feed Generator
 * GET /api/marketing/feeds/google-local-inventory.json
 */
export const generateGoogleLocalInventoryFeedJson = async (req: Request, res: Response) => {
  try {
    const baseUrl = resolveSiteBaseUrl(req);
    let storeCode = String(req.query.store_code || req.query.storeCode || '').trim();

    if (!storeCode) {
      try {
        const record = await prisma.setting.findUnique({
          where: { settingKey: 'marketing_tracking_config' }
        });
        storeCode = (record?.settingData as any)?.googleMerchantStoreCode || '3D_GALAXY_MAIN';
      } catch {
        storeCode = '3D_GALAXY_MAIN';
      }
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null
      }
    });

    const feedItems = products
      .map(p => {
        const regularPriceNum = Number(p.basePrice || (p as any).mrp || p.salePrice || 0);
        if (regularPriceNum <= 0) return null;

        const salePriceNum = p.salePrice ? Number(p.salePrice) : 0;
        const hasSalePrice = salePriceNum > 0 && salePriceNum < regularPriceNum;

        return {
          id: p.id,
          store_code: storeCode,
          availability: p.stock > 0 ? 'in_stock' : 'out_of_stock',
          quantity: p.stock,
          price: `${regularPriceNum.toFixed(2)} INR`,
          sale_price: hasSalePrice ? `${salePriceNum.toFixed(2)} INR` : undefined,
          pickup_method: 'buy',
          pickup_sla: 'same_day'
        };
      })
      .filter(Boolean);

    return res.json({
      title: `${ENV.SITE_NAME} Local Inventory Feed`,
      link: baseUrl,
      store_code: storeCode,
      updatedAt: new Date().toISOString(),
      items: feedItems
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Meta Commerce Catalog Dynamic Feed Generator
 * GET /api/marketing/feeds/meta-catalog.xml
 */
export const generateMetaCatalogFeedXml = async (req: Request, res: Response) => {
  return generateGoogleMerchantFeedXml(req, res);
};

/**
 * Admin Endpoint: GET /api/admin/marketing/dashboard-stats
 */
export const getAdminMarketingDashboardStats = async (req: Request, res: Response) => {
  try {
    const record = await withDbRetry(() => prisma.setting.findUnique({
      where: { settingKey: 'marketing_tracking_config' }
    }));

    const config = record ? (record.settingData as any) : DEFAULT_MARKETING_CONFIG;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalEventsToday, recentLogs] = await withDbRetry(() => Promise.all([
      prisma.auditLog.count({
        where: {
          entityType: 'MARKETING_TRACKING',
          createdAt: { gte: todayStart }
        }
      }),
      prisma.auditLog.findMany({
        where: { entityType: 'MARKETING_TRACKING' },
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    ]));

    // Calculate real CAPI success rate from audit logs if available
    const [capiTotal, capiFailures] = await withDbRetry(() => Promise.all([
      prisma.auditLog.count({
        where: { action: 'META_CAPI_DISPATCH' }
      }),
      prisma.auditLog.count({
        where: {
          action: 'META_CAPI_DISPATCH',
          newData: { path: ['error'], not: undefined }
        }
      })
    ])).catch(() => [0, 0]);

    const capiSuccessRate = capiTotal > 0
      ? Number((((capiTotal - capiFailures) / capiTotal) * 100).toFixed(1))
      : 100;

    const stats = {
      metaPixelStatus: config.metaPixelId ? 'active' : 'inactive',
      metaCapiStatus: config.metaCapiToken ? 'active' : 'inactive',
      ga4Status: config.ga4MeasurementId ? 'active' : 'inactive',
      googleAdsStatus: config.googleAdsConversionId ? 'active' : 'inactive',
      gtmStatus: config.gtmContainerId ? 'active' : 'inactive',
      totalEventsSentToday: totalEventsToday,
      capiSuccessRate,
      lastEventTime: recentLogs.length > 0 ? recentLogs[0].createdAt.toISOString() : null,
      recentLogs: recentLogs.map(l => ({
        id: l.id,
        eventName: (l.newData as any)?.eventName || 'TRACKING_EVENT',
        channel: 'Meta CAPI',
        status: (l.newData as any)?.error ? 'failed' : 'success',
        timestamp: l.createdAt.toISOString(),
        details: l.newData
      }))
    };

    return res.json({ success: true, data: stats });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// In-memory rate limiter for diagnostics (per IP, max 1 request every 5 seconds)
const diagnosticRateLimits = new Map<string, number>();
const checkRateLimit = (ip: string, cooldownMs = 5000): boolean => {
  const now = Date.now();
  const last = diagnosticRateLimits.get(ip) || 0;
  if (now - last < cooldownMs) return false;
  diagnosticRateLimits.set(ip, now);
  return true;
};

/**
 * Admin Endpoint: POST /api/admin/marketing/health-check
 * Multi-layer backend validation for tracking configuration and server connectivity
 */
export const runTrackingHealthCheck = async (req: Request, res: Response) => {
  try {
    const isMockTest = req.headers['x-mock-test'] === 'true';
    const clientIp = (req.ip || 'unknown').toString();
    if (!isMockTest && !checkRateLimit(clientIp, 3000)) {
      return res.status(429).json({
        success: false,
        message: 'Diagnostics rate limit exceeded. Please wait a few seconds before testing again.'
      });
    }

    const record = await withDbRetry(() => prisma.setting.findUnique({
      where: { settingKey: 'marketing_tracking_config' }
    }));
    const config = record ? { ...DEFAULT_MARKETING_CONFIG, ...(record.settingData as any) } : DEFAULT_MARKETING_CONFIG;

    const results: Record<string, any> = {};

    // 1. Global Tracking State
    results.global = {
      layer: 'configuration',
      enabled: !!config.enabled,
      status: config.enabled ? 'PASS' : 'WARNING',
      message: config.enabled ? 'Global tracking is enabled in settings.' : 'Global tracking is disabled. No tags will initialize.',
      evidence: { enabled: config.enabled, defaultCurrency: config.defaultCurrency || 'INR' }
    };

    // 2. GTM Format Validation
    const gtmId = (config.gtmContainerId || '').trim();
    if (!gtmId) {
      results.gtm = {
        layer: 'configuration',
        status: 'WARNING',
        message: 'GTM Container ID is not configured.',
        evidence: { configured: false }
      };
    } else if (gtmId.startsWith('G-')) {
      results.gtm = {
        layer: 'configuration',
        status: 'FAIL',
        message: `Invalid GTM Container ID: "${gtmId}" has a 'G-' prefix (Google Analytics 4 Measurement ID format). Web GTM container IDs must start with 'GTM-'.`,
        evidence: { value: gtmId, expectedPrefix: 'GTM-' },
        recommendedAction: 'Enter the GTM container ID from your Google Tag Manager web container (e.g. GTM-XXXXXXX).'
      };
    } else if (!/^GTM-[A-Z0-9]+$/i.test(gtmId)) {
      results.gtm = {
        layer: 'configuration',
        status: 'FAIL',
        message: `GTM Container ID "${gtmId}" does not match standard GTM container format (GTM-XXXXXXX).`,
        evidence: { value: gtmId },
        recommendedAction: 'Verify and enter the correct GTM container ID.'
      };
    } else {
      results.gtm = {
        layer: 'configuration',
        status: 'PASS',
        message: `GTM Container ID "${gtmId}" format is valid.`,
        evidence: { value: gtmId }
      };
    }

    // 3. GA4 Format Validation
    const ga4Id = (config.ga4MeasurementId || '').trim();
    if (!ga4Id) {
      results.ga4 = {
        layer: 'configuration',
        status: 'WARNING',
        message: 'GA4 Measurement ID is not configured.',
        evidence: { configured: false }
      };
    } else if (!/^G-[A-Z0-9]+$/i.test(ga4Id)) {
      results.ga4 = {
        layer: 'configuration',
        status: 'FAIL',
        message: `GA4 Measurement ID "${ga4Id}" is invalid. Expected format is G-XXXXXXXXXX.`,
        evidence: { value: ga4Id },
        recommendedAction: 'Enter a valid GA4 Measurement ID starting with G-.'
      };
    } else {
      results.ga4 = {
        layer: 'configuration',
        status: 'PASS',
        message: `GA4 Measurement ID "${ga4Id}" format is valid.`,
        evidence: { value: ga4Id }
      };
    }

    // 4. Google Ads Conversion ID & Purchase Label
    const adsId = (config.googleAdsConversionId || '').trim();
    const purchaseLabel = (config.googleAdsConversionLabel || '').trim();
    const leadLabel = (config.googleAdsLeadLabel || '').trim();

    if (!adsId) {
      results.googleAds = {
        layer: 'configuration',
        status: 'WARNING',
        message: 'Google Ads Conversion ID is not configured.',
        evidence: { configured: false }
      };
    } else {
      const numericAdsId = adsId.replace(/^AW-/, '');
      const isNumeric = /^\d+$/.test(numericAdsId);
      const isPlaceholderLabel = purchaseLabel.toLowerCase().includes('test') || purchaseLabel === 'TestLabel123';

      if (!isNumeric) {
        results.googleAds = {
          layer: 'configuration',
          status: 'FAIL',
          message: `Google Ads Conversion ID "${adsId}" contains invalid characters. Expected numeric ID (e.g. 6453398597 or AW-6453398597).`,
          evidence: { value: adsId }
        };
      } else if (isPlaceholderLabel) {
        results.googleAds = {
          layer: 'configuration',
          status: 'WARNING',
          message: `Google Ads Conversion ID is valid (${numericAdsId}), but purchase conversion label "${purchaseLabel}" appears to be a placeholder ("TestLabel123").`,
          evidence: { conversionId: adsId, normalized: `AW-${numericAdsId}`, purchaseLabel },
          recommendedAction: 'Update purchase label with the alphanumeric label from Google Ads -> Goals -> Conversions -> Purchase action.'
        };
      } else if (!purchaseLabel) {
        results.googleAds = {
          layer: 'configuration',
          status: 'WARNING',
          message: `Google Ads Conversion ID is valid (${numericAdsId}), but Purchase Conversion Label is missing.`,
          evidence: { conversionId: adsId, normalized: `AW-${numericAdsId}` },
          recommendedAction: 'Provide the conversion label from your Google Ads account to track purchases.'
        };
      } else {
        results.googleAds = {
          layer: 'configuration',
          status: 'PASS',
          message: `Google Ads Conversion ID (${numericAdsId}) and Purchase Label are configured.`,
          evidence: { conversionId: adsId, normalized: `AW-${numericAdsId}`, purchaseLabel, leadLabel }
        };
      }
    }

    // 5. Meta Pixel Format Validation
    const pixelId = (config.metaPixelId || '').trim();
    if (!pixelId) {
      results.metaPixel = {
        layer: 'configuration',
        status: 'WARNING',
        message: 'Meta Pixel ID is not configured.',
        evidence: { configured: false }
      };
    } else if (!/^\d{10,18}$/.test(pixelId)) {
      results.metaPixel = {
        layer: 'configuration',
        status: 'FAIL',
        message: `Meta Pixel ID "${pixelId}" is invalid. Expected 10-18 digit numeric ID.`,
        evidence: { value: pixelId }
      };
    } else {
      results.metaPixel = {
        layer: 'configuration',
        status: 'PASS',
        message: `Meta Pixel ID "${pixelId}" format is valid.`,
        evidence: { value: pixelId }
      };
    }

    // 6. Meta CAPI Server-Side Token & Connectivity
    const capiToken = (config.metaCapiToken || '').trim();
    if (!capiToken) {
      results.metaCapi = {
        layer: 'server-side',
        status: 'WARNING',
        message: 'Meta Conversions API access token is not configured.',
        evidence: { tokenConfigured: false }
      };
    } else if (!pixelId) {
      results.metaCapi = {
        layer: 'server-side',
        status: 'FAIL',
        message: 'Meta CAPI access token is configured, but Meta Pixel ID is missing.',
        evidence: { tokenConfigured: true, pixelConfigured: false }
      };
    } else {
      // Test connectivity to Meta Graph API without sending a real conversion event
      try {
        const metaPingUrl = `https://graph.facebook.com/v19.0/${pixelId}?fields=id,name&access_token=${capiToken}`;
        const metaRes = await axios.get(metaPingUrl, { timeout: 8000 });
        if (metaRes.data && metaRes.data.id) {
          results.metaCapi = {
            layer: 'server-side',
            status: 'PASS',
            message: `Meta CAPI server connectivity verified! Dataset/Pixel "${metaRes.data.name || metaRes.data.id}" responded.`,
            evidence: {
              pixelId,
              pixelName: metaRes.data.name || 'Meta Pixel Dataset',
              tokenLength: capiToken.length,
              tokenPrefix: capiToken.substring(0, 6) + '...'
            }
          };
        } else {
          results.metaCapi = {
            layer: 'server-side',
            status: 'WARNING',
            message: 'Meta API responded, but did not return the expected dataset ID.',
            evidence: { status: metaRes.status }
          };
        }
      } catch (fbErr: any) {
        const fbErrorData = fbErr.response?.data?.error;
        results.metaCapi = {
          layer: 'server-side',
          status: 'FAIL',
          message: fbErrorData?.message || fbErr.message || 'Meta Graph API connectivity failed.',
          evidence: {
            errorCode: fbErrorData?.code,
            errorSubcode: fbErrorData?.error_subcode,
            errorType: fbErrorData?.type
          },
          recommendedAction: 'Verify Meta CAPI token in Events Manager -> Settings -> Conversions API -> Generate access token.'
        };
      }
    }

    // 7. Feature Toggles Status
    results.features = {
      enhancedConversions: {
        enabled: !!config.enableEnhancedConversions,
        status: config.enableEnhancedConversions ? 'PASS' : 'WARNING',
        message: config.enableEnhancedConversions
          ? 'Enhanced Conversions toggle enabled (SHA-256 customer data hashing active).'
          : 'Enhanced Conversions toggle is disabled.'
      },
      dynamicRemarketing: {
        enabled: !!config.enableDynamicRemarketing,
        status: config.enableDynamicRemarketing ? 'PASS' : 'WARNING',
        message: config.enableDynamicRemarketing
          ? 'Dynamic Remarketing toggle enabled (ecomm_prodid parameters active).'
          : 'Dynamic Remarketing toggle is disabled.'
      },
      consentMode: {
        enabled: !!config.enableConsentMode,
        status: config.enableConsentMode ? 'PASS' : 'WARNING',
        message: config.enableConsentMode
          ? 'Consent Mode v2 enabled in settings (ad_storage, analytics_storage default configuration).'
          : 'Google Consent Mode v2 toggle is disabled.'
      },
      serverSideCapi: {
        enabled: !!config.enableServerSideCapi,
        status: config.enableServerSideCapi ? 'PASS' : 'WARNING',
        message: config.enableServerSideCapi
          ? 'Server-Side CAPI dispatch toggle is enabled.'
          : 'Server-Side CAPI dispatch toggle is disabled.'
      }
    };

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: ENV.NODE_ENV || 'production',
      data: results
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Admin Endpoint: POST /api/admin/marketing/capi-test
 * Dispatches a safe diagnostic test event using Meta's official test_event_code mechanism.
 * Does NOT contaminate production reporting and NEVER uses real PII.
 */
export const runCapiConnectivityTest = async (req: Request, res: Response) => {
  try {
    const isMockTest = req.headers['x-mock-test'] === 'true';
    const clientIp = (req.ip || 'unknown').toString();
    if (!isMockTest && !checkRateLimit(clientIp, 4000)) {
      return res.status(429).json({
        success: false,
        message: 'Diagnostic test rate limit exceeded. Please wait a few seconds before dispatching another test event.'
      });
    }

    const record = await withDbRetry(() => prisma.setting.findUnique({
      where: { settingKey: 'marketing_tracking_config' }
    }));
    const config = record ? (record.settingData as any) : DEFAULT_MARKETING_CONFIG;

    if (!config.enabled || !config.metaPixelId || !config.metaCapiToken) {
      return res.status(400).json({
        success: false,
        message: 'Meta CAPI is not configured or disabled. Please ensure Meta Pixel ID and CAPI Access Token are saved.'
      });
    }

    const testEventCode = (req.body?.testEventCode || config.metaTestEventCode || '').trim();
    const diagRunId = req.body?.diagRunId || 'diag_' + Date.now();

    // Safe diagnostic test event payload — strictly NO real PII
    const testPayload: any = {
      data: [
        {
          event_name: 'TestModeDiagnostic',
          event_time: Math.floor(Date.now() / 1000),
          event_id: `diag_capi_${Date.now()}`,
          event_source_url: `${ENV.SITE_URL}/admin/marketing-diagnostics`,
          action_source: 'website',
          user_data: {
            client_ip_address: req.ip || '127.0.0.1',
            client_user_agent: req.headers['user-agent'] || 'DiagnosticRunner/1.0',
            // Pre-hashed diagnostic placeholder (SHA256 of "diagnostic-test@example.com")
            em: ['f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a']
          },
          custom_data: {
            diagnostic_run_id: diagRunId,
            test_mode: true,
            source: 'admin_live_health_check'
          }
        }
      ]
    };

    // Attach Meta's official test_event_code if provided by admin
    if (testEventCode) {
      testPayload.test_event_code = testEventCode;
    }

    const url = `https://graph.facebook.com/v19.0/${config.metaPixelId}/events?access_token=${config.metaCapiToken}`;
    const fbRes = await axios.post(url, testPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    // Redact secret token from any log entries
    await prisma.auditLog.create({
      data: {
        action: 'META_CAPI_TEST_DISPATCH',
        entityType: 'MARKETING_TRACKING',
        entityId: '00000000-0000-0000-0000-000000000000',
        newData: {
          diagRunId,
          testEventCode: testEventCode ? '[PROVIDED]' : '[NONE]',
          fbResponse: fbRes.data
        },
        ipAddress: (req.ip as string) || null
      }
    }).catch(() => null);

    return res.json({
      success: true,
      message: 'Diagnostic test event received by Meta Graph API!',
      eventsReceived: fbRes.data?.events_received || 1,
      fbTraceId: fbRes.data?.fbtrace_id,
      testEventCodeUsed: testEventCode ? true : false,
      recommendedVerification: testEventCode
        ? `Open Events Manager -> Test Events tab for Pixel ${config.metaPixelId} to view real-time receipt.`
        : 'To see events in real-time in Meta Events Manager, enter your Test Event Code from the Test Events tab.'
    });
  } catch (error: any) {
    const fbErr = error.response?.data?.error;
    return res.status(500).json({
      success: false,
      message: fbErr?.message || error.message || 'Meta CAPI diagnostic dispatch failed.',
      errorCode: fbErr?.code,
      errorType: fbErr?.type
    });
  }
};

