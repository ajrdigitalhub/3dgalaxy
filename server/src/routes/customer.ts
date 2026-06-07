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
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

// Feedbacks do not require global user logins
router.get('/reviews', getReviews);
router.post('/reviews', createReview);

router.use(authenticateToken);

router.get('/', requirePermission('read:users'), getCustomers);
router.get('/:id', requirePermission('read:users'), getCustomerById);
router.post('/', requirePermission('write:users'), createCustomer);
router.put('/:id', requirePermission('write:users'), updateCustomer);
router.delete('/:id', requirePermission('write:users'), deleteCustomer);

router.post('/:customerId/address', manageAddress);
router.delete('/address/:addressId', deleteAddress);
router.post('/:customerId/wishlist', toggleWishlistItem);

router.put('/reviews/:id/approve', requirePermission('write:reviews'), approveReview);

export default router;
