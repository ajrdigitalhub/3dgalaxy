import { Router } from 'express';
import { register, login, logout, refreshToken, forgotPassword, resetPassword } from '../controllers/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
