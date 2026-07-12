import { Request, Response } from 'express';
import prisma from '../config/database';

export const getThemeSettings = async (req: Request, res: Response) => {
  try {
    // Read from the unified setting.app_settings table (same as admin writes to)
    let settingRecord = await prisma.setting.findUnique({
      where: { settingKey: 'app_settings' },
    });

    if (!settingRecord) {
      // Seed with defaults if no settings exist yet
      const defaultSettings = {
        siteName: '3D Galaxy',
        logoUrl: '',
        currency: '₹',
        theme: {
          primaryColor: '#d65108',
          secondaryColor: '#1e3a8a',
          accentColor: '#3b82f6',
          borderRadius: '0.75rem',
          fontFamily: 'Inter',
          darkMode: false,
          themeText: '#2b2a2aff'
        },
        heroSlides: [],
        promoBanners: [],
        advertisements: [],
        footer: {},
        paymentGatewaySettings: {
          razorpayEnabled: true,
          razorpayKeyId: '',
          codEnabled: true
        }
      };
      settingRecord = await prisma.setting.create({
        data: {
          settingKey: 'app_settings',
          settingData: defaultSettings as any
        },
      });
    }

    const data = typeof settingRecord.settingData === 'string'
      ? JSON.parse(settingRecord.settingData)
      : settingRecord.settingData;

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to find storefront visual presets', details: error.message });
  }
};

export const updateThemeSettings = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.setting.findUnique({
      where: { settingKey: 'app_settings' },
    });

    const currentValue = existing
      ? (typeof existing.settingData === 'string' ? JSON.parse(existing.settingData) : existing.settingData as any)
      : {};
    const newValue = { ...currentValue, ...req.body };

    const updated = await prisma.setting.upsert({
      where: { settingKey: 'app_settings' },
      update: {
        settingData: newValue
      },
      create: {
        settingKey: 'app_settings',
        settingData: newValue
      },
    });

    const data = typeof updated.settingData === 'string'
      ? JSON.parse(updated.settingData)
      : updated.settingData;

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to write storefront visual presets', details: error.message });
  }
};

export const getServiceConfig = async (req: Request, res: Response) => {
  try {
    const settingRecord = await prisma.themeSetting.findUnique({
      where: { keyName: 'global-settings' },
    });

    const config = (settingRecord?.value as any)?.printServiceSettings || {};

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
      gstTaxRate: config.gstTaxRate !== undefined ? config.gstTaxRate : 18,
      setupCost: config.setupCost !== undefined ? config.setupCost : 100,
      machineFeePerHour: config.machineFeePerHour !== undefined ? config.machineFeePerHour : 150
    };

    return res.status(200).json(responseData);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve printing service configuration', details: error.message });
  }
};


