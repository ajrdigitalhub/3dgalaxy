import { Router } from 'express';
import { triggerScheduledMaintenance } from '../controllers/schedulerController';

const router = Router();

// Protected HTTP endpoint for Google Cloud Scheduler (runs 11:00 AM IST & 5:00 PM IST)
router.post('/internal/scheduler/run', triggerScheduledMaintenance);
router.post('/scheduler/run', triggerScheduledMaintenance);
router.get('/internal/scheduler/run', triggerScheduledMaintenance);

export default router;
