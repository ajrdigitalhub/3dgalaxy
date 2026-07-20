import { Request, Response } from 'express';
import prisma from '../config/database';

const DEFAULT_PWA_SETTINGS = {
  enablePwa: true,
  enableInstallButton: true,
  allowOfflineMode: true,
  enableBackgroundSync: true,
  enablePushNotifications: true,
  autoUpdate: true,
  forceUpdate: false,
  cacheStrategy: 'network-first',
  installBannerTheme: 'orange',
  allowedEnvironments: ['localhost', 'dev', 'uat', 'production']
};

/**
 * Get PWA Settings
 * GET /api/admin/pwa/settings
 */
export const getPwaSettings = async (req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { settingKey: 'pwa_settings' }
    });

    if (!setting) {
      return res.json({
        success: true,
        data: DEFAULT_PWA_SETTINGS
      });
    }

    const mergedSettings = { ...DEFAULT_PWA_SETTINGS, ...(setting.settingData as object) };
    return res.json({
      success: true,
      data: mergedSettings
    });
  } catch (error: any) {
    console.error('Error fetching PWA settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve PWA settings',
      error: error.message
    });
  }
};

/**
 * Update PWA Settings
 * PUT /api/admin/pwa/settings
 */
export const updatePwaSettings = async (req: Request, res: Response) => {
  try {
    const newSettings = req.body;
    const userId = (req as any).user?.id || null;

    const setting = await prisma.setting.upsert({
      where: { settingKey: 'pwa_settings' },
      update: { settingData: newSettings },
      create: {
        settingKey: 'pwa_settings',
        settingData: newSettings
      }
    });

    // Log Audit Action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_PWA_SETTINGS',
        entityType: 'PWA_SETTINGS',
        entityId: setting.id,
        newData: newSettings as any,
        ipAddress: req.ip || null
      }
    });

    return res.json({
      success: true,
      message: 'PWA configuration updated successfully',
      data: setting.settingData
    });
  } catch (error: any) {
    console.error('Error updating PWA settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update PWA settings',
      error: error.message
    });
  }
};

/**
 * Log PWA Audit Actions
 * POST /api/admin/pwa/audit
 */
export const logPwaAudit = async (req: Request, res: Response) => {
  try {
    const { action, payload } = req.body;
    const userId = (req as any).user?.id || null;

    const audit = await prisma.auditLog.create({
      data: {
        userId,
        action: action || 'PWA_ACTION',
        entityType: 'PWA_MANAGEMENT',
        entityId: '00000000-0000-0000-0000-000000000000',
        newData: payload || {},
        ipAddress: req.ip || null
      }
    });

    return res.json({
      success: true,
      data: audit
    });
  } catch (error: any) {
    console.error('Error logging PWA audit:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to log PWA audit event',
      error: error.message
    });
  }
};
