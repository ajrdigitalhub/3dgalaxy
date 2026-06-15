import { Router } from 'express';
import { getBrands, getBrandById, getBrandBySlug, createBrand, updateBrand, deleteBrand } from '../controllers/brand';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getBrands);
router.get('/slug/:slug', getBrandBySlug);
router.get('/:id', getBrandById);

router.post('/', authenticateToken, requireRole(['Admin', 'Manager']), createBrand);
router.put('/:id', authenticateToken, requireRole(['Admin', 'Manager']), updateBrand);
router.delete('/:id', authenticateToken, requireRole(['Admin', 'Manager']), deleteBrand);

export default router;
