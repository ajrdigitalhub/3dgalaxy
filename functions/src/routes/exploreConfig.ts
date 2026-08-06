import { Router } from 'express';
import {
  getExploreNavigationData,
  getExploreNavigationSettings,
  updateExploreNavigationSettings,
} from '../controllers/exploreConfig';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public payload for frontend Explore Discovery Hub
router.get('/explore-navigation', getExploreNavigationData);

// Admin Configuration endpoints
router.get('/admin/explore-navigation', authenticateToken, getExploreNavigationSettings);
router.put('/admin/explore-navigation', authenticateToken, updateExploreNavigationSettings);

export default router;
