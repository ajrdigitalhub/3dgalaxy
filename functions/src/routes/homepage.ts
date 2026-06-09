import { Router } from 'express';
import {
  getHomepageSections,
  getFrontendLayout,
  createHomepageSection,
  updateHomepageSection,
  deleteHomepageSection,
} from '../controllers/homepage';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.get('/', getFrontendLayout);
router.get('/admin', authenticateToken, requirePermission('read:homepage'), getHomepageSections);

router.post('/', authenticateToken, requirePermission('write:homepage'), createHomepageSection);
router.put('/:id', authenticateToken, requirePermission('write:homepage'), updateHomepageSection);
router.delete('/:id', authenticateToken, requirePermission('write:homepage'), deleteHomepageSection);

export default router;
