import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  manageAddress,
  deleteAddress,
  toggleWishlistItem,
  getReviews,
  createReview,
  approveReview,
} from '../controllers/customer';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Feedbacks do not require global user logins
router.get('/reviews', getReviews);
router.post('/reviews', createReview);

router.use(authenticateToken);

router.get('/', requireRole(['Admin', 'Manager']), getCustomers);
router.get('/:id', requireRole(['Admin', 'Manager']), getCustomerById);
router.post('/', requireRole(['Admin']), createCustomer);
router.put('/:id', requireRole(['Admin', 'Manager']), updateCustomer);
router.delete('/:id', requireRole(['Admin']), deleteCustomer);

router.post('/:customerId/address', manageAddress);
router.delete('/address/:addressId', deleteAddress);
router.post('/:customerId/wishlist', toggleWishlistItem);

router.put('/reviews/:id/approve', requireRole(['Admin', 'Manager']), approveReview);

export default router;
