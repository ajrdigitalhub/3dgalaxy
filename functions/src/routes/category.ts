import { Router } from 'express';
import {
  getCategories,
  getCategoriesTree,
  getBreadcrumbs,
  getBreadcrumbsBySlug,
  getCategoryBySlug,
  getDirectChildren,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getCategories);
router.get('/tree', getCategoriesTree);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/breadcrumbs/slug/:slug', getBreadcrumbsBySlug);
router.get('/breadcrumbs/:id', getBreadcrumbs);
router.get('/children/:parentId', getDirectChildren);

router.post('/', authenticateToken, requireRole(['Admin', 'Manager']), createCategory);
router.put('/:id', authenticateToken, requireRole(['Admin', 'Manager']), updateCategory);
router.delete('/:id', authenticateToken, requireRole(['Admin', 'Manager']), deleteCategory);

export default router;
