import { Request, Response } from 'express';
import prisma from '../config/database';

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
          value: {
            logo: 'https://picsum.photos/seed/logo/200/50',
            favicon: 'https://picsum.photos/seed/favicon/32/32',
            primaryColor: '#d65108',
            secondaryColor: '#1e3a8a',
            typography: 'Inter',
            theme: {
              primaryColor: '#d65108',
              secondaryColor: '#1e3a8a',
              accentColor: '#3b82f6',
              borderRadius: '0.75rem',
              fontFamily: 'Inter',
              darkMode: false,
              themeText: '#2b2a2aff'
            },
            headerConfig: { announceBar: 'Welcome B2B Buyers - Brahma 3D Galactic Fabrication Platform' },
            footerConfig: { copyright: '© 2026 Brahma 3D Galaxy Labs. All Rights Reserved.' },
            homepageConfig: { columnsCount: 3, itemsFeaturedCount: 6 },
          }
        },
      });
    }

    return res.status(200).json({ success: true, data: settingRecord.value });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to find storefront visual presets', details: error.message });
  }
};

export const updateThemeSettings = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.themeSetting.findUnique({
      where: { keyName: 'global-settings' },
    });

    const currentValue = existing ? (existing.value as any) : {};
    const newValue = { ...currentValue, ...req.body };

    const updated = await prisma.themeSetting.upsert({
      where: { keyName: 'global-settings' },
      update: {
        value: newValue
      },
      create: {
        keyName: 'global-settings',
        value: newValue
      },
    });

    return res.status(200).json({ success: true, data: updated.value });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to write storefront visual presets', details: error.message });
  }
};

