import { Router } from 'express';
import { getVariantImages, uploadVariantImages, deleteVariantImage, setPrimaryVariantImage } from '../controllers/productVariantImage';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/variants/:variantId/images', getVariantImages);
router.post('/variants/:variantId/images', authenticateToken, requireRole(['Admin', 'Manager']), uploadVariantImages);
router.delete('/product-variant-images/:imageId', authenticateToken, requireRole(['Admin', 'Manager']), deleteVariantImage);
router.put('/product-variant-images/:imageId/primary', authenticateToken, requireRole(['Admin', 'Manager']), setPrimaryVariantImage);

export default router;
