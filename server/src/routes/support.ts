import { Router } from 'express';
import { generateSupportMessage } from '../controllers/support';

const router = Router();

router.post('/generate', generateSupportMessage);

export default router;
