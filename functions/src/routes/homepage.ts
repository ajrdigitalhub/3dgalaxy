import { Router } from 'express';
import {
  getHomepageSections,
  getFrontendLayout,
  createHomepageSection,
  updateHomepageSection,
  deleteHomepageSection,
} from '../controllers/homepage';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getFrontendLayout);
router.get('/admin', authenticateToken, requireRole(['Admin']), getHomepageSections);

router.post('/', authenticateToken, requireRole(['Admin']), createHomepageSection);
router.put('/:id', authenticateToken, requireRole(['Admin']), updateHomepageSection);
router.delete('/:id', authenticateToken, requireRole(['Admin']), deleteHomepageSection);

export default router;
