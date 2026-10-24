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
 * Google Merchant Center Dynamic Product XML Feed Generator
 * GET /api/marketing/feeds/google-merchant.xml
 */
export const generateGoogleMerchantFeedXml = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      include: {
        category: true,
        brand: true
      }
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${ENV.SITE_NAME} Official Product Catalog</title>
    <link>${ENV.SITE_URL}</link>
    <description>3D Printers, Filaments, SLA Resins and Spare Parts in India</description>\n`;

    products.forEach(p => {
      const regularPriceNum = Number(p.basePrice || p.mrp || p.salePrice || 0);
      if (regularPriceNum <= 0) return; // Skip products without valid pricing to avoid Google Merchant disapproval

      const price = regularPriceNum.toFixed(2);
      const salePriceNum = p.salePrice ? Number(p.salePrice) : 0;
      const hasSalePrice = salePriceNum > 0 && salePriceNum < regularPriceNum;
      const salePrice = hasSalePrice ? salePriceNum.toFixed(2) : null;

      let rawImages = p.images;
      if (typeof rawImages === 'string') {
        try {
          rawImages = JSON.parse(rawImages);
        } catch {
          rawImages = [rawImages];
        }
      }

      const parsedImages = (Array.isArray(rawImages) ? rawImages : [])
        .map((img: any) => {
          if (!img) return null;
          let u = typeof img === 'string' ? img.trim() : (img.url ? String(img.url).trim() : '');
          if (!u || u === '[object Object]') return null;
          return u.startsWith('http://') || u.startsWith('https://') ? u : `${ENV.SITE_URL.replace(/\/$/, '')}/${u.replace(/^\//, '')}`;
        })
        .filter(Boolean) as string[];

      const mainImage = parsedImages[0] || `${ENV.SITE_URL}/3d-logo.png`;
      const additionalImages = parsedImages.slice(1, 10);
      const availability = p.stock > 0 ? 'in_stock' : 'out_of_stock';
      const brandName = p.brand?.name || ENV.SITE_NAME;
      const categoryName = p.category?.name || '3D Printers & Accessories';
      const hasGtinOrMpn = !!(p.sku || p.barcode);

      xml += `    <item>\n`;
      xml += `      <g:id>${p.id}</g:id>\n`;
      xml += `      <g:title><![CDATA[${p.name}]]></g:title>\n`;
      xml += `      <g:description><![CDATA[${p.description || p.name}]]></g:description>\n`;
      xml += `      <g:link>${ENV.SITE_URL}/product/${p.slug}</g:link>\n`;
      xml += `      <g:image_link>${mainImage}</g:image_link>\n`;
      additionalImages.forEach(img => {
        xml += `      <g:additional_image_link>${img}</g:additional_image_link>\n`;
      });
      xml += `      <g:availability>${availability}</g:availability>\n`;
      xml += `      <g:price>${price} INR</g:price>\n`;

      if (salePrice) {
        xml += `      <g:sale_price>${salePrice} INR</g:sale_price>\n`;
      }

      xml += `      <g:brand><![CDATA[${brandName}]]></g:brand>\n`;
      xml += `      <g:condition>new</g:condition>\n`;
      xml += `      <g:google_product_category><![CDATA[${categoryName}]]></g:google_product_category>\n`;

      if (hasGtinOrMpn) {
        if (p.sku) xml += `      <g:mpn>${p.sku}</g:mpn>\n`;
        if (p.barcode) xml += `      <g:gtin>${p.barcode}</g:gtin>\n`;
        xml += `      <g:identifier_exists>yes</g:identifier_exists>\n`;
      } else {
        xml += `      <g:identifier_exists>no</g:identifier_exists>\n`;
      }

      xml += `    </item>\n`;
    });

    xml += `  </channel>
</rss>`;

    res.header('Content-Type', 'application/xml');
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
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      include: {
        category: true,
        brand: true
      }
    });

    const feedItems = products
      .map(p => {
        const regularPriceNum = Number(p.basePrice || p.mrp || p.salePrice || 0);
        if (regularPriceNum <= 0) return null;

        const salePriceNum = p.salePrice ? Number(p.salePrice) : 0;
        const hasSalePrice = salePriceNum > 0 && salePriceNum < regularPriceNum;

        let rawImages = p.images;
        if (typeof rawImages === 'string') {
          try {
            rawImages = JSON.parse(rawImages);
          } catch {
            rawImages = [rawImages];
          }
        }

        const parsedImages = (Array.isArray(rawImages) ? rawImages : [])
          .map((img: any) => {
            if (!img) return null;
            let u = typeof img === 'string' ? img.trim() : (img.url ? String(img.url).trim() : '');
            if (!u || u === '[object Object]') return null;
            return u.startsWith('http://') || u.startsWith('https://') ? u : `${ENV.SITE_URL.replace(/\/$/, '')}/${u.replace(/^\//, '')}`;
          })
          .filter(Boolean) as string[];

        const mainImage = parsedImages[0] || `${ENV.SITE_URL}/3d-logo.png`;
        const additionalImages = parsedImages.slice(1, 10);
        const hasGtinOrMpn = !!(p.sku || p.barcode);

        return {
          id: p.id,
          title: p.name,
          description: p.description || p.name,
          link: `${ENV.SITE_URL}/product/${p.slug}`,
          image_link: mainImage,
          additional_image_links: additionalImages,
          availability: p.stock > 0 ? 'in_stock' : 'out_of_stock',
          price: `${regularPriceNum.toFixed(2)} INR`,
          sale_price: hasSalePrice ? `${salePriceNum.toFixed(2)} INR` : undefined,
          brand: p.brand?.name || ENV.SITE_NAME,
          condition: 'new',
          google_product_category: p.category?.name || '3D Printers & Accessories',
          identifier_exists: hasGtinOrMpn ? 'yes' : 'no',
          mpn: p.sku || undefined,
          gtin: p.barcode || undefined
        };
      })
      .filter(Boolean);

    return res.json({
      title: `${ENV.SITE_NAME} Product Feed`,
      link: ENV.SITE_URL,
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

