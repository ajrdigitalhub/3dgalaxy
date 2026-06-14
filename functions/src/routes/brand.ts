import { Router } from 'express';
import { getBrands, getBrandById, getBrandBySlug, createBrand, updateBrand, deleteBrand } from '../controllers/brand';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.get('/', getBrands);
router.get('/slug/:slug', getBrandBySlug);
router.get('/:id', getBrandById);

router.post('/', authenticateToken, requirePermission('write:brands'), createBrand);
router.put('/:id', authenticateToken, requirePermission('write:brands'), updateBrand);
router.delete('/:id', authenticateToken, requirePermission('write:brands'), deleteBrand);

export default router;
