import { Request, Response } from 'express';
import { ENV } from '../config/env';
import { runScheduledMaintenance } from '../services/scheduler';

/**
 * Controller to handle Cloud Scheduler triggers (11:00 AM IST & 5:00 PM IST)
 * Endpoint: POST /api/internal/scheduler/run or POST /api/scheduler/run
 */
export const triggerScheduledMaintenance = async (req: Request, res: Response) => {
  try {
    // 1. Verify Secret Header or Bearer token or Admin Auth
    const authHeader = req.headers['authorization'] || '';
    const cronSecretHeader = req.headers['x-cron-secret'] || req.headers['x-scheduler-secret'] || '';

    const expectedSecret = ENV.CRON_SECRET;
    const isValidSecret =
      cronSecretHeader === expectedSecret ||
      authHeader === `Bearer ${expectedSecret}` ||
      authHeader.includes(expectedSecret);

    // If request comes from an authenticated admin session or valid cron secret, allow execution
    const isAdmin = !!(req as any).user && (req as any).user.role === 'ADMIN';

    if (!isValidSecret && !isAdmin) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid cron secret header or admin authentication required.'
      });
    }

    const jobType = (req.body?.jobType || req.query?.jobType || 'full') as string;
    const results = await runScheduledMaintenance(jobType);

    return res.status(200).json({
      success: true,
      message: 'Scheduled maintenance executed successfully.',
      results
    });
  } catch (error: any) {
    console.error('Error executing scheduled maintenance controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute scheduled maintenance',
      details: error.message
    });
  }
};
