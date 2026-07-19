import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  blockCustomer,
  unblockCustomer,
  getCustomerOrders,
  getCustomerAddresses,
  getCustomerActivity,
  getCustomerReviews,
  getCustomerWishlist,
  getCustomerNotes,
  addCustomerNote,
  pinCustomerNote,
  deleteCustomerNote,
  getCustomerAnalytics,
} from '../controllers/adminCustomer';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Guards: require Admin, Super Admin or Manager roles for customer management
const adminGuard = [authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager'])];
const superAdminGuard = [authenticateToken, requireRole(['Admin', 'Super Admin'])];

router.use(authenticateToken);

// Analytics
router.get('/analytics', requireRole(['Admin', 'Super Admin', 'Manager']), getCustomerAnalytics);

// Customer Notes
router.get('/:id/notes', requireRole(['Admin', 'Super Admin', 'Manager']), getCustomerNotes);
router.post('/:id/notes', requireRole(['Admin', 'Super Admin', 'Manager']), addCustomerNote);
router.patch('/:id/notes/:noteId/pin', requireRole(['Admin', 'Super Admin', 'Manager']), pinCustomerNote);
router.delete('/:id/notes/:noteId', requireRole(['Admin', 'Super Admin', 'Manager']), deleteCustomerNote);

// Sub-Resource Lookups
router.get('/:id/orders', requireRole(['Admin', 'Super Admin', 'Manager']), getCustomerOrders);
router.get('/:id/addresses', requireRole(['Admin', 'Super Admin', 'Manager']), getCustomerAddresses);
router.get('/:id/activity', requireRole(['Admin', 'Super Admin', 'Manager']), getCustomerActivity);
router.get('/:id/reviews', requireRole(['Admin', 'Super Admin', 'Manager']), getCustomerReviews);
router.get('/:id/wishlist', requireRole(['Admin', 'Super Admin', 'Manager']), getCustomerWishlist);

// Core CRUD Operations
router.get('/', requireRole(['Admin', 'Super Admin', 'Manager']), getCustomers);
router.get('/:id', requireRole(['Admin', 'Super Admin', 'Manager']), getCustomerById);
router.post('/', requireRole(['Admin', 'Super Admin']), createCustomer);
router.put('/:id', requireRole(['Admin', 'Super Admin', 'Manager']), updateCustomer);
router.delete('/:id', requireRole(['Admin', 'Super Admin']), deleteCustomer);

// Account Actions
router.patch('/:id/block', requireRole(['Admin', 'Super Admin', 'Manager']), blockCustomer);
router.patch('/:id/unblock', requireRole(['Admin', 'Super Admin', 'Manager']), unblockCustomer);

export default router;
