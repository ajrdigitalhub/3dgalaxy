import { Router } from 'express';
import { getMegaMenu, getMenuItemsList, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/menu';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.get('/tree', getMegaMenu);
router.get('/', getMenuItemsList);

router.post('/', authenticateToken, requirePermission('write:menu'), createMenuItem);
router.put('/:id', authenticateToken, requirePermission('write:menu'), updateMenuItem);
router.delete('/:id', authenticateToken, requirePermission('write:menu'), deleteMenuItem);

export default router;
