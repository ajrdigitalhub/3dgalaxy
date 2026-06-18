import { Router } from 'express';
import { getBanners, createBanner, updateBanner, deleteBanner } from './banner.controller';
import { authenticateToken, requireRole } from '../../middleware/auth';

const bannerRoutes = Router();
bannerRoutes.get('/', getBanners);

const adminBannerRoutes = Router();
adminBannerRoutes.get('/', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), getBanners);
adminBannerRoutes.post('/', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), createBanner);
adminBannerRoutes.put('/:id', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), updateBanner);
adminBannerRoutes.delete('/:id', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), deleteBanner);

export { bannerRoutes, adminBannerRoutes };
export default bannerRoutes;
