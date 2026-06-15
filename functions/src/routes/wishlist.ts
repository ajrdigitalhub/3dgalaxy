import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist
} from '../controllers/wishlist';

const router = Router();

router.use(authenticateToken);

router.get('/', getWishlist);
router.post('/', addToWishlist);
router.delete('/:productId', removeFromWishlist);

export default router;
