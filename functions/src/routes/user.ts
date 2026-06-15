import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
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

router.get('/', requireRole(['Admin']), getUsers);
router.get('/audit-logs', requireRole(['Admin']), getAuditLogs);
router.get('/roles', requireRole(['Admin']), getRoles);
router.post('/roles', requireRole(['Admin']), createRole);
router.put('/roles/:id', requireRole(['Admin']), updateRole);

router.get('/:id', requireRole(['Admin']), getUserById);
router.put('/:id', requireRole(['Admin']), updateUser);
router.delete('/:id', requireRole(['Admin']), deleteUser);

export default router;
