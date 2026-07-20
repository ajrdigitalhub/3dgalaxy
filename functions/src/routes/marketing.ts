import { Router } from 'express';
import {
  getMarketingConfig,
  getAdminMarketingSettings,
  updateAdminMarketingSettings,
  sendMetaCapiEvent,
  generateGoogleMerchantFeedXml,
  generateGoogleMerchantFeedJson,
  generateMetaCatalogFeedXml,
  getAdminMarketingDashboardStats
} from '../controllers/marketing';
import { authenticateToken, requireRole } from '../middleware/auth';
import { cacheMiddleware } from '../middleware/cache';

const router = Router();

// Storefront Marketing Config (Public)
router.get('/marketing/config', cacheMiddleware(300), getMarketingConfig);

// Meta Conversions API (CAPI) Proxy
router.post('/marketing/meta-capi', sendMetaCapiEvent);

// Public Product Feed Generator Endpoints (Google Merchant & Meta Catalog)
router.get('/marketing/feeds/google-merchant.xml', cacheMiddleware(900), generateGoogleMerchantFeedXml);
router.get('/marketing/feeds/google-merchant.json', cacheMiddleware(900), generateGoogleMerchantFeedJson);
router.get('/marketing/feeds/meta-catalog.xml', cacheMiddleware(900), generateMetaCatalogFeedXml);

// Admin Configuration & Tracking Dashboard Endpoints
router.get('/admin/marketing/settings', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), getAdminMarketingSettings);
router.put('/admin/marketing/settings', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), updateAdminMarketingSettings);
router.get('/admin/marketing/dashboard-stats', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), getAdminMarketingDashboardStats);

export default router;
