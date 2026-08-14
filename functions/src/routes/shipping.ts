import { Router } from 'express';
import { calculateShipping } from '../controllers/shipping';

const router = Router();

router.post('/calculate', calculateShipping);

export default router;
