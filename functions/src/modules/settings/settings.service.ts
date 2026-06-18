import prisma from '../../config/database';
import { sysCache } from '../../config/cache';

const defaultSettings = {
  siteName: "3D Galaxy",
  logoUrl: "",
  currency: "₹",
  footer: {
    description: '',
    groups: [],
    socialLinks: [],
    paymentIcons: [],
    trustBadges: []
  },
  heroSlides: [],
  promoBanners: [],
  advertisements: [],
  theme: {
    primaryColor: '#2563EB',
    secondaryColor: '#7C3AED',
    gradientAngle: 135,
    darkMode: false,
    logo: '',
    favicon: ''
  },
  gradientSettings: {},
  socialLinks: {
    facebook: '',
    instagram: '',
    linkedin: '',
    youtube: ''
  },
  aboutPage: {},
  contact: {
    phone: '',
    email: '',
    address: ''
  },
  paymentGatewaySettings: {
    razorpayEnabled: true,
    razorpayKeyId: '',
    codEnabled: true
  },
  shippingSettings: {},
  whatsappSettings: {},
  emailSettings: {},
  newsletterSettings: {},
  chatbotSettings: {},
  homePageSections: {
    featuredCategories: [],
    featuredProducts: [],
    bestSellers: [],
    brands: []
  },
  productPageSettings: {},
  tourSettings: {},
  colorPresets: [],
  managedFonts: [],
  tickerTexts: [],
  faqs: [],
  services: [],
  companyInfo: {},

  // Legacy fields for high backward-compatibility
  homepage: {
    featuredCategories: [],
    featuredProducts: [],
    bestSellers: [],
    brands: []
  },
  payment: {
    razorpayEnabled: true,
    razorpayKeyId: '',
    codEnabled: true
  },
  security: {
    sessionTimeout: 30,
    warningBeforeLogout: 5,
    enableIdleLogout: true
  },
  socialMedia: {
    facebook: '',
    instagram: '',
    linkedin: '',
    youtube: ''
  }
};

export const getSettingsService = async () => {
  const cached = sysCache.get('app_settings');
  if (cached) {
    return cached;
  }

  const record = await prisma.setting.findUnique({
    where: { settingKey: 'app_settings' }
  });

  let settingsObj: any = null;
  if (record && record.settingData) {
    try {
      settingsObj = typeof record.settingData === 'string' ? JSON.parse(record.settingData) : record.settingData as any;
    } catch (e) {
      settingsObj = { ...defaultSettings };
    }
  } else {
    settingsObj = { ...defaultSettings };
    await prisma.setting.create({
      data: {
        settingKey: 'app_settings',
        settingData: settingsObj
      }
    });
  }

  // CENTRAL CACHE: 30 minutes (1800 seconds)
  sysCache.set('app_settings', settingsObj, 1800);
  return settingsObj;
};

export const updateSettingsService = async (payload: any) => {
  const currentSettings = await getSettingsService();
  const newSettings = { ...currentSettings, ...payload };

  const updatedRecord = await prisma.setting.upsert({
    where: { settingKey: 'app_settings' },
    update: { settingData: newSettings },
    create: { settingKey: 'app_settings', settingData: newSettings }
  });

  let finalSettingsObj: any = null;
  try {
     finalSettingsObj = typeof updatedRecord.settingData === 'string' ? JSON.parse(updatedRecord.settingData) : updatedRecord.settingData as any;
  } catch (e) {
     finalSettingsObj = newSettings;
  }

  // Clear cache and replace
  sysCache.del('app_settings');
  sysCache.set('app_settings', finalSettingsObj, 1800);
  
  return finalSettingsObj;
};

