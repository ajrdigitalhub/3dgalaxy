import { Request, Response } from 'express';
import prisma from '../config/database';
import { clearCache } from '../middleware/cache';

export const getThemeSettings = async (req: Request, res: Response) => {
  try {
    let settingRecord = await prisma.themeSetting.findUnique({
      where: { keyName: 'global-settings' },
    });

    if (!settingRecord) {
      // Seed with initial generic fallback styling presets
      settingRecord = await prisma.themeSetting.create({
        data: {
          keyName: 'global-settings',
          value: JSON.stringify({
            logo: 'https://picsum.photos/seed/logo/200/50',
            favicon: 'https://picsum.photos/seed/favicon/32/32',
            primaryColor: '#d65108',
            secondaryColor: '#1e3a8a',
            typography: 'Inter',
            headerConfig: { announceBar: 'Welcome B2B Buyers - Brahma 3D Galactic Fabrication Platform' },
            footerConfig: { copyright: '© 2026 Brahma 3D Galaxy Labs. All Rights Reserved.' },
            homepageConfig: { columnsCount: 3, itemsFeaturedCount: 6 },
          })
        },
      });
    }

    return res.status(200).json(JSON.parse(settingRecord.value));
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to find storefront visual presets', details: error.message });
  }
};

export const getPaymentGateways = async (req: Request, res: Response) => {
  try {
    let gateways = await prisma.paymentGateway.findMany({ orderBy: { sortOrder: 'asc' } });
    if (gateways.length === 0) {
      // Seed initially
      await prisma.paymentGateway.createMany({
        data: [
          { name: 'Razorpay', gatewayCode: 'RAZORPAY', isEnabled: false, isTestMode: true, displayName: 'Razorpay (Cards / UPI / NetBanking)' },
          { name: 'Cash On Delivery', gatewayCode: 'COD', isEnabled: true, isTestMode: false, displayName: 'Cash on Delivery (COD)' },
          { name: 'Bank Transfer', gatewayCode: 'BANK_TRANSFER', isEnabled: false, isTestMode: false, displayName: 'Direct Bank Transfer' }
        ]
      });
      gateways = await prisma.paymentGateway.findMany({ orderBy: { sortOrder: 'asc' } });
    }
    return res.status(200).json({ success: true, data: gateways });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to find payment gateways', details: error.message });
  }
};

export const updatePaymentGateway = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isEnabled, isTestMode, keyId, keySecret, webhookSecret, displayName, description, sortOrder } = req.body;

  try {
    const updated = await prisma.paymentGateway.update({
      where: { id },
      data: {
        isEnabled,
        isTestMode,
        keyId,
        keySecret,
        webhookSecret,
        displayName,
        description,
        sortOrder
      }
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update payment gateway', details: error.message });
  }
};

export const getSecuritySettings = async (req: Request, res: Response) => {
  try {
    let settingRecord = await prisma.themeSetting.findUnique({
      where: { keyName: 'security-settings' },
    });

    if (!settingRecord) {
      settingRecord = await prisma.themeSetting.create({
        data: {
          keyName: 'security-settings',
          value: JSON.stringify({
             sessionTimeout: 30,
             idleWarningTime: 25,
             enableIdleTimeout: true,
             enableSessionWarningPopup: true,
          })
        },
      });
    }

    return res.status(200).json(JSON.parse(settingRecord.value));
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to get security settings', details: error.message });
  }
};

export const updateSecuritySettings = async (req: Request, res: Response) => {
  const { sessionTimeout, idleWarningTime, enableIdleTimeout, enableSessionWarningPopup } = req.body;

  try {
    const updated = await prisma.themeSetting.upsert({
      where: { keyName: 'security-settings' },
      update: {
        value: JSON.stringify({
          sessionTimeout: sessionTimeout ?? 30,
          idleWarningTime: idleWarningTime ?? 25,
          enableIdleTimeout: enableIdleTimeout ?? true,
          enableSessionWarningPopup: enableSessionWarningPopup ?? true,
        })
      },
      create: {
        keyName: 'security-settings',
        value: JSON.stringify({
          sessionTimeout: sessionTimeout ?? 30,
          idleWarningTime: idleWarningTime ?? 25,
          enableIdleTimeout: enableIdleTimeout ?? true,
          enableSessionWarningPopup: enableSessionWarningPopup ?? true,
        })
      },
    });

    clearCache();
    return res.status(200).json(JSON.parse(updated.value));
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update security settings', details: error.message });
  }
};
export const updateThemeSettings = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.themeSetting.findUnique({
      where: { keyName: 'global-settings' },
    });

    const currentValue = existing ? JSON.parse(existing.value) : {};
    const newValue = { ...currentValue, ...req.body };

    const updated = await prisma.themeSetting.upsert({
      where: { keyName: 'global-settings' },
      update: {
        value: JSON.stringify(newValue)
      },
      create: {
        keyName: 'global-settings',
        value: JSON.stringify(newValue)
      },
    });

    clearCache();
    return res.status(200).json(JSON.parse(updated.value));
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to write storefront visual presets', details: error.message });
  }
};
