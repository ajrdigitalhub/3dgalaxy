import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { createRazorpayOrder, verifyRazorpayPayment, handleRazorpayWebhook } from '../controllers/payment';

const router = Router();

router.post('/razorpay/create-order', authenticateToken, createRazorpayOrder);
router.post('/razorpay/verify', authenticateToken, verifyRazorpayPayment);

export default router;
