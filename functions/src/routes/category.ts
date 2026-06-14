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
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.get('/', getCategories);
router.get('/tree', getCategoriesTree);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/breadcrumbs/slug/:slug', getBreadcrumbsBySlug);
router.get('/breadcrumbs/:id', getBreadcrumbs);
router.get('/children/:parentId', getDirectChildren);

router.post('/', authenticateToken, requirePermission('write:categories'), createCategory);
router.put('/:id', authenticateToken, requirePermission('write:categories'), updateCategory);
router.delete('/:id', authenticateToken, requirePermission('write:categories'), deleteCategory);

export default router;
