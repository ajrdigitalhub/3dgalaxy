import { Router } from 'express';
import { getHeaderMenuData, getHeaderMenuSettings, updateHeaderMenuSettings } from '../controllers/headerMenu';
import { cacheMiddleware } from '../middleware/cache';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Single optimized API endpoint for Header Navigation Mega Menu
router.get('/header-menu', cacheMiddleware(900), getHeaderMenuData);

// Admin Configuration Endpoints
router.get('/admin/header-menu/settings', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), getHeaderMenuSettings);
router.put('/admin/header-menu/settings', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), updateHeaderMenuSettings);

export default router;
