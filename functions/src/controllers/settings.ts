import { Request, Response } from 'express';
import prisma from '../config/database';
import { clearCache } from '../middleware/cache';
import { getSettingsService } from '../modules/settings/settings.service';
import { sysCache } from '../config/cache';

export const clearSettingsCache = () => {
  sysCache.del('theme_settings');
  sysCache.del('security_settings');
  sysCache.del('service_config');
  sysCache.del('consolidated_home_payload');
  clearCache();
};

export const getThemeSettings = async (req: Request, res: Response) => {
  try {
    let cached = sysCache.get('theme_settings');
    if (cached) {
      return res.status(200).json(cached);
    }

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
            recentPurchasePopup: {
              enabled: true,
              interval: 5000,
              displayDuration: 4000,
              maxItems: 20,
              showLocation: true,
              showTime: true
            }
          })
        },
      });
    }

    const data = JSON.parse(settingRecord.value as string);
    sysCache.set('theme_settings', data, 1800);
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to find storefront visual presets', details: error.message });
  }
};

const STATIC_GATEWAYS = [
  { id: '1', name: 'Razorpay', gatewayCode: 'RAZORPAY', isEnabled: false, isTestMode: true, displayName: 'Razorpay (Cards / UPI / NetBanking)', keyId: '', keySecret: '', webhookSecret: '', description: '', sortOrder: 1 },
  { id: '2', name: 'Cash On Delivery', gatewayCode: 'COD', isEnabled: true, isTestMode: false, displayName: 'Cash on Delivery (COD)', keyId: '', keySecret: '', webhookSecret: '', description: '', sortOrder: 2 },
  { id: '3', name: 'Bank Transfer', gatewayCode: 'BANK_TRANSFER', isEnabled: false, isTestMode: false, displayName: 'Direct Bank Transfer', keyId: '', keySecret: '', webhookSecret: '', description: '', sortOrder: 3 }
];

export const getPaymentGateways = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({ success: true, data: STATIC_GATEWAYS });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to find payment gateways', details: error.message });
  }
};

export const updatePaymentGateway = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({ success: true, message: 'Payment gateway configuration updated successfully (Mocked)' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update payment gateway', details: error.message });
  }
};

export const getSecuritySettings = async (req: Request, res: Response) => {
  try {
    let cached = sysCache.get('security_settings');
    if (cached) {
      return res.status(200).json(cached);
    }

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

    const data = JSON.parse(settingRecord.value as string);
    sysCache.set('security_settings', data, 1800);
    return res.status(200).json(data);
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

    clearSettingsCache();
    return res.status(200).json(JSON.parse(updated.value as string));
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update security settings', details: error.message });
  }
};
export const updateThemeSettings = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.themeSetting.findUnique({
      where: { keyName: 'global-settings' },
    });

    const currentValue = existing ? JSON.parse(existing.value as string) : {};
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

    clearSettingsCache();
    return res.status(200).json(JSON.parse(updated.value as string));
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to write storefront visual presets', details: error.message });
  }
};

export const getServiceConfig = async (req: Request, res: Response) => {
  try {
    let cached = sysCache.get('service_config');
    if (cached) {
      return res.status(200).json(cached);
    }

    const settings = await getSettingsService();
    const config = settings?.printServiceSettings || {};

    const defaultMaterials = [
      { name: 'PLA', pricePerGram: 2.5, density: 1.25, active: true },
      { name: 'PETG', pricePerGram: 3.2, density: 1.27, active: true },
      { name: 'ABS', pricePerGram: 3.5, density: 1.05, active: true },
      { name: 'TPU', pricePerGram: 4.8, density: 1.20, active: true },
      { name: 'Resin', pricePerGram: 7.5, density: 1.10, active: true }
    ];

    const defaultQualities = [
      { name: 'Draft (0.30mm)', height: 0.30, price: 0 },
      { name: 'Standard (0.20mm)', height: 0.20, price: 50 },
      { name: 'Fine (0.16mm)', height: 0.16, price: 120 },
      { name: 'Ultra Fine (0.12mm)', height: 0.12, price: 250 }
    ];

    const defaultColors = ['White', 'Black', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Silver', 'Gold'];
    const defaultSupports = ['None', 'Touching Build Plate', 'Everywhere', 'Tree Supports', 'Organic Supports'];
    const defaultFillPatterns = ['Grid', 'Gyroid', 'Honeycomb', 'Lines', 'Cubic', 'Triangles'];
    const defaultAdhesionTypes = ['None', 'Skirt', 'Brim', 'Raft'];
    const defaultLayerHeights = ['0.08 mm', '0.12 mm', '0.16 mm', '0.20 mm', '0.24 mm', '0.28 mm', '0.32 mm'];
    const defaultPrintSpeeds = ['Slow', 'Normal', 'Fast', 'Ultra Fast'];
    const defaultNozzleSizes = ['0.2 mm', '0.4 mm', '0.6 mm', '0.8 mm'];
    const defaultWallCounts = ['2', '3', '4', '5', '6'];
    const defaultDeliveryPriorities = ['Standard', 'Express', 'Urgent'];
    const defaultInfillOptions = ['10%', '20%', '30%', '40%', '50%', '60%', '80%', '100%'];
    const defaultSurfaceFinishes = ['Matte', 'Glossy', 'Textured'];
    const defaultInfillStandards = [
      { name: '10 - 30%', desc: 'Standard', min: 10, max: 30, default: 20 },
      { name: '31 - 50%', desc: 'Medium', min: 31, max: 50, default: 40 },
      { name: '51 - 80%', desc: 'Strong', min: 51, max: 80, default: 60 }
    ];

    // Merge database configurations with default configurations
    const responseData = {
      materials: config.materials || defaultMaterials,
      qualities: config.qualities || defaultQualities,
      colors: config.colors || defaultColors,
      supports: config.supports || defaultSupports,
      fillPatterns: config.fillPatterns || defaultFillPatterns,
      adhesionTypes: config.adhesionTypes || defaultAdhesionTypes,
      layerHeights: config.layerHeights || defaultLayerHeights,
      printSpeeds: config.printSpeeds || defaultPrintSpeeds,
      nozzleSizes: config.nozzleSizes || defaultNozzleSizes,
      wallCounts: config.wallCounts || defaultWallCounts,
      deliveryPriorities: config.deliveryPriorities || defaultDeliveryPriorities,
      infillOptions: config.infillOptions || defaultInfillOptions,
      surfaceFinishes: config.surfaceFinishes || defaultSurfaceFinishes,
      infillStandards: config.infillStandards || defaultInfillStandards,
      gstTaxRate: config.gstTaxRate !== undefined ? config.gstTaxRate : 18,
      setupCost: config.setupCost !== undefined ? config.setupCost : 100,
      machineFeePerHour: config.machineFeePerHour !== undefined ? config.machineFeePerHour : 150
    };

    sysCache.set('service_config', responseData, 1800);
    return res.status(200).json(responseData);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve printing service configuration', details: error.message });
  }
};
