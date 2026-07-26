import { Router } from 'express';
import { getSettings, updateSettings, getSettingsVersion } from './settings.controller';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { cacheMiddleware } from '../../middleware/cache';

const settingsRoutes = Router();
// DISABLED TO REDUCE BILLING — version polling removed from frontend
// settingsRoutes.get('/version', getSettingsVersion);
settingsRoutes.get('/', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
}, getSettings);

const adminSettingsRoutes = Router();
adminSettingsRoutes.put('/', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), updateSettings);

export { settingsRoutes, adminSettingsRoutes };
export default settingsRoutes; // for backwards compatibility if needed
