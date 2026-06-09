import { Router } from 'express';
import { sendWhatsappNotification, getWhatsappLogs } from '../controllers/whatsapp';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/send', sendWhatsappNotification);
router.get('/logs', authenticateToken, getWhatsappLogs);

export default router;
