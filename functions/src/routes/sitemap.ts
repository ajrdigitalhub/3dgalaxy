import * as express from 'express';
import { getSitemap } from '../controllers/sitemap';

const router = express.Router();

router.get('/sitemap.xml', getSitemap);

export default router;
