import { Router } from 'express';
import { getThemeSettings, updateThemeSettings } from '../controllers/settings';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getThemeSettings);
router.put('/', authenticateToken, requireRole(['Admin']), updateThemeSettings);

export default router;
