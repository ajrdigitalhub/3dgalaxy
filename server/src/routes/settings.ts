import { Router } from 'express';
import { getThemeSettings, updateThemeSettings } from '../controllers/settings';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.get('/', getThemeSettings);
router.put('/', authenticateToken, requirePermission('write:settings'), updateThemeSettings);

export default router;
