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
import { cacheMiddleware } from '../middleware/cache';

const router = Router();

router.get('/', cacheMiddleware(1800), getCategories);
router.get('/tree', cacheMiddleware(1800), getCategoriesTree);
router.get('/slug/:slug', cacheMiddleware(1800), getCategoryBySlug);
router.get('/breadcrumbs/slug/:slug', cacheMiddleware(1800), getBreadcrumbsBySlug);
router.get('/breadcrumbs/:id', cacheMiddleware(1800), getBreadcrumbs);
router.get('/children/:parentId', cacheMiddleware(1800), getDirectChildren);

router.post('/', authenticateToken, requireRole(['Admin', 'Manager']), createCategory);
router.put('/:id', authenticateToken, requireRole(['Admin', 'Manager']), updateCategory);
router.delete('/:id', authenticateToken, requireRole(['Admin', 'Manager']), deleteCategory);

export default router;
