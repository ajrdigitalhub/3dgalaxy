import { Router } from 'express';
import { getBrands, getBrandById, getBrandBySlug, createBrand, updateBrand, deleteBrand } from '../controllers/brand';
import { authenticateToken, requireRole } from '../middleware/auth';
import { cacheMiddleware } from '../middleware/cache';

const router = Router();

router.get('/', cacheMiddleware(1800), getBrands);
router.get('/slug/:slug', cacheMiddleware(1800), getBrandBySlug);
router.get('/:id', cacheMiddleware(1800), getBrandById);

router.post('/', authenticateToken, requireRole(['Admin', 'Manager']), createBrand);
router.put('/:id', authenticateToken, requireRole(['Admin', 'Manager']), updateBrand);
router.delete('/:id', authenticateToken, requireRole(['Admin', 'Manager']), deleteBrand);

export default router;
