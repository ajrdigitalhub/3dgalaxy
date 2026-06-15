import { Router } from 'express';
import { getMegaMenu, getMenuItemsList, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/menu';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/tree', getMegaMenu);
router.get('/', getMenuItemsList);

router.post('/', authenticateToken, requireRole(['Admin']), createMenuItem);
router.put('/:id', authenticateToken, requireRole(['Admin']), updateMenuItem);
router.delete('/:id', authenticateToken, requireRole(['Admin']), deleteMenuItem);

export default router;
