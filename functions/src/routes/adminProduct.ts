import { Router } from 'express';
import { getProductById } from '../controllers/product';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
router.get('/:id/details', authenticateToken, requireRole(['Admin', 'Manager', 'Super Admin']), getProductById);

export default router;
