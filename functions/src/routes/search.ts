import { Router } from 'express';
import { getSearchSuggestions, getSearchResults, getRecentSearches } from '../controllers/search';
import { optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getSearchResults);
router.get('/suggestions', getSearchSuggestions);
router.get('/recent', optionalAuthenticateToken, getRecentSearches);

export default router;
