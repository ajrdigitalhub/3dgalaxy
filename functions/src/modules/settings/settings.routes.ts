import { Router } from 'express';
import { getSettings, updateSettings, getSettingsVersion } from './settings.controller';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { cacheMiddleware } from '../../middleware/cache';
import { getInstagramDiagnostics, testInstagramConnection } from '../../controllers/instagram';

const settingsRoutes = Router();
settingsRoutes.get('/version', getSettingsVersion);
settingsRoutes.get('/', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
}, getSettings);

const adminSettingsRoutes = Router();
adminSettingsRoutes.put('/', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), updateSettings);
adminSettingsRoutes.get('/instagram/diagnostics', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), getInstagramDiagnostics);
adminSettingsRoutes.post('/instagram/test-connection', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), testInstagramConnection);

export { settingsRoutes, adminSettingsRoutes };
export default settingsRoutes; // for backwards compatibility if needed
