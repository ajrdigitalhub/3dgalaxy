import { Router } from 'express';
import { getSearchSuggestions, getSearchResults, getRecentSearches } from '../controllers/search';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getSearchResults);
router.get('/suggestions', getSearchSuggestions);
router.get('/recent', authenticateToken, getRecentSearches);

export default router;
