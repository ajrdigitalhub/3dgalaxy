import { Request, Response } from 'express';
import { getSettingsService, updateSettingsService } from './settings.service';
import { clearCache } from '../../middleware/cache';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const data = await getSettingsService();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to find settings', details: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const updated = await updateSettingsService(req.body);
    clearCache(); // Invalidate server-side cache for settings and layout configs
    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update settings', details: error.message });
  }
};
