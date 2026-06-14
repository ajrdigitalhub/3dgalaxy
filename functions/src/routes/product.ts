import { Router } from 'express';
import { getProducts, getProductById, getProductBySlug, createProduct, updateProduct, deleteProduct } from '../controllers/product';
import { getProductImages, uploadProductImages, uploadProductImagesBySlug, deleteProductImage, setPrimaryImage, reorderImages } from '../controllers/productImage';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.get('/', getProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProductById);

router.post('/', authenticateToken, requirePermission('write:products'), createProduct);
router.put('/:id', authenticateToken, requirePermission('write:products'), updateProduct);
router.delete('/:id', authenticateToken, requirePermission('write:products'), deleteProduct);

// Image routes
router.get('/:productId/images', getProductImages);
router.post('/slug/:slug/images', authenticateToken, requirePermission('write:products'), uploadProductImagesBySlug);
router.post('/:productId/images', authenticateToken, requirePermission('write:products'), uploadProductImages);
router.delete('/images/:imageId', authenticateToken, requirePermission('write:products'), deleteProductImage);
router.put('/images/:imageId/primary', authenticateToken, requirePermission('write:products'), setPrimaryImage);
router.put('/:productId/images/reorder', authenticateToken, requirePermission('write:products'), reorderImages);

export default router;
