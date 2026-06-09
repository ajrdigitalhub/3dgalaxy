import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/product';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.get('/', getProducts);
router.get('/:id', getProductById);

router.post('/', authenticateToken, requirePermission('write:products'), createProduct);
router.put('/:id', authenticateToken, requirePermission('write:products'), updateProduct);
router.delete('/:id', authenticateToken, requirePermission('write:products'), deleteProduct);

export default router;
