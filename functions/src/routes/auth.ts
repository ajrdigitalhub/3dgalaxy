import { Router } from 'express';
import { register, login, logout, logoutAll, refreshToken, forgotPassword, resetPassword } from '../controllers/auth';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/logout-all', authenticateToken, logoutAll);
router.post('/refresh', refreshToken);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
