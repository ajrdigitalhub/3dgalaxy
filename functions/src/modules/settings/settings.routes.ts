import { Router } from 'express';
import { getSettings, updateSettings, getSettingsVersion } from './settings.controller';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { cacheMiddleware } from '../../middleware/cache';

const settingsRoutes = Router();
settingsRoutes.get('/version', getSettingsVersion);
settingsRoutes.get('/', cacheMiddleware(300), getSettings);

const adminSettingsRoutes = Router();
adminSettingsRoutes.put('/', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), updateSettings);

export { settingsRoutes, adminSettingsRoutes };
export default settingsRoutes; // for backwards compatibility if needed
