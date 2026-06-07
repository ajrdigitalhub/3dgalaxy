import { Request, Response } from 'express';
import prisma from '../config/database';

export const getThemeSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.themeSettings.findUnique({
      where: { id: 'global-settings' },
    });

    if (!settings) {
      // Seed with initial generic fallback styling presets
      settings = await prisma.themeSettings.create({
        data: {
          id: 'global-settings',
          logo: 'https://picsum.photos/seed/logo/200/50',
          favicon: 'https://picsum.photos/seed/favicon/32/32',
          primaryColor: '#d65108',
          secondaryColor: '#1e3a8a',
          typography: 'Inter',
          headerConfig: { announceBar: 'Welcome B2B Buyers - Brahma 3D Galactic Fabrication Platform' },
          footerConfig: { copyright: '© 2026 Brahma 3D Galaxy Labs. All Rights Reserved.' },
          homepageConfig: { columnsCount: 3, itemsFeaturedCount: 6 },
        },
      });
    }

    return res.status(200).json(settings);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to find storefront visual presets', details: error.message });
  }
};

export const updateThemeSettings = async (req: Request, res: Response) => {
  const { logo, favicon, primaryColor, secondaryColor, typography, headerConfig, footerConfig, homepageConfig } = req.body;

  try {
    const updated = await prisma.themeSettings.upsert({
      where: { id: 'global-settings' },
      update: {
        logo,
        favicon,
        primaryColor,
        secondaryColor,
        typography,
        headerConfig: headerConfig || undefined,
        footerConfig: footerConfig || undefined,
        homepageConfig: homepageConfig || undefined,
      },
      create: {
        id: 'global-settings',
        logo: logo || 'https://picsum.photos/seed/logo/200/50',
        favicon: favicon || 'https://picsum.photos/seed/favicon/32/32',
        primaryColor: primaryColor || '#d65108',
        secondaryColor: secondaryColor || '#1e3a8a',
        typography: typography || 'Inter',
        headerConfig: headerConfig || {},
        footerConfig: footerConfig || {},
        homepageConfig: homepageConfig || {},
      },
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to write storefront visual presets', details: error.message });
  }
};
