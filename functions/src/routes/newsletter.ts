import { Router } from 'express';
import {
  subscribeNewsletter,
  unsubscribeNewsletter,
  getNewsletterSubscribers,
  updateNewsletterSubscriber,
  deleteNewsletterSubscriber,
  getNewsletterAnalytics,
  sendNewsletterCampaign,
} from '../controllers/newsletter';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Public subscription routes
router.post('/subscribe', subscribeNewsletter);
router.post('/unsubscribe', unsubscribeNewsletter);

// Protected admin settings/management routes
const adminGuard = [authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager'])];
const superAdminGuard = [authenticateToken, requireRole(['Admin', 'Super Admin'])];

router.get('/admin/subscribers', adminGuard, getNewsletterSubscribers);
router.get('/admin/analytics', adminGuard, getNewsletterAnalytics);
router.put('/admin/subscribers/:id', adminGuard, updateNewsletterSubscriber);
router.delete('/admin/subscribers/:id', superAdminGuard, deleteNewsletterSubscriber);
router.post('/admin/send', adminGuard, sendNewsletterCampaign);

export default router;
