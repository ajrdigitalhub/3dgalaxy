import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getRoles,
  createRole,
  updateRole,
  getAuditLogs,
} from '../controllers/user';

const router = Router();

// Secure all access using universal JWT validation
router.use(authenticateToken);

router.get('/', requirePermission('read:users'), getUsers);
router.get('/audit-logs', requirePermission('read:logs'), getAuditLogs);
router.get('/roles', requirePermission('read:roles'), getRoles);
router.post('/roles', requirePermission('write:roles'), createRole);
router.put('/roles/:id', requirePermission('write:roles'), updateRole);

router.get('/:id', requirePermission('read:users'), getUserById);
router.put('/:id', requirePermission('write:users'), updateUser);
router.delete('/:id', requirePermission('write:users'), deleteUser);

export default router;
