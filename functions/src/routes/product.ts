import { Router } from 'express';
import { getProducts, getProductById, getProductBySlug, createProduct, updateProduct, deleteProduct } from '../controllers/product';
import { getProductImages, uploadProductImages, uploadProductImagesBySlug, deleteProductImage, setPrimaryImage, reorderImages } from '../controllers/productImage';
import { authenticateToken, requireRole } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

router.get('/', getProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProductById);

router.post('/', authenticateToken, requireRole(['Admin', 'Manager']), createProduct);
router.put('/:id', authenticateToken, requireRole(['Admin', 'Manager']), updateProduct);
router.put('/:id/stock', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;
  try {
    const updated = await prisma.productVariant.updateMany({
      where: { productId: id },
      data: { stock: parseInt(stock, 10) }
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
router.delete('/:id', authenticateToken, requireRole(['Admin', 'Manager']), deleteProduct);

// Image routes
router.get('/:productId/images', getProductImages);
router.post('/slug/:slug/images', authenticateToken, requireRole(['Admin', 'Manager']), uploadProductImagesBySlug);
router.post('/:productId/images', authenticateToken, requireRole(['Admin', 'Manager']), uploadProductImages);
router.delete('/images/:imageId', authenticateToken, requireRole(['Admin', 'Manager']), deleteProductImage);
router.put('/images/:imageId/primary', authenticateToken, requireRole(['Admin', 'Manager']), setPrimaryImage);
router.put('/:productId/images/reorder', authenticateToken, requireRole(['Admin', 'Manager']), reorderImages);

export default router;
