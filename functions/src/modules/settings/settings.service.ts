import prisma from '../../config/database';

let settingsCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const defaultSettings = {
  theme: {
    primaryColor: '#2563EB',
    secondaryColor: '#7C3AED',
    gradientAngle: 135,
    darkMode: false,
    logo: '',
    favicon: ''
  },
  heroSlides: [],
  footer: {
    description: '',
    groups: [],
    socialLinks: [],
    paymentIcons: [],
    trustBadges: []
  },
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
  contact: {
    phone: '',
    email: '',
    address: ''
  },
  socialMedia: {
    facebook: '',
    instagram: '',
    linkedin: '',
    youtube: ''
  }
};

export const getSettingsService = async () => {
  const now = Date.now();
  if (settingsCache && now - cacheTimestamp < CACHE_TTL) {
    return settingsCache;
  }

  const record = await prisma.setting.findUnique({
    where: { settingKey: 'app_settings' }
  });

  if (record && record.settingData) {
    try {
      settingsCache = typeof record.settingData === 'string' ? JSON.parse(record.settingData) : record.settingData as any;
    } catch (e) {
      // IF invalid JSON, replace with defaultSettings.
      settingsCache = { ...defaultSettings };
    }
  } else {
    settingsCache = { ...defaultSettings };
    await prisma.setting.create({
      data: {
        settingKey: 'app_settings',
        settingData: JSON.stringify(settingsCache)
      }
    });
  }

  cacheTimestamp = now;
  return settingsCache;
};

export const updateSettingsService = async (payload: any) => {
  const currentSettings = await getSettingsService();
  const newSettings = { ...currentSettings, ...payload };

  const updatedRecord = await prisma.setting.upsert({
    where: { settingKey: 'app_settings' },
    update: { settingData: newSettings },
    create: { settingKey: 'app_settings', settingData: newSettings }
  });

  try {
     settingsCache = typeof updatedRecord.settingData === 'string' ? JSON.parse(updatedRecord.settingData) : updatedRecord.settingData as any;
  } catch (e) {
     settingsCache = newSettings;
  }
  cacheTimestamp = Date.now();
  
  return settingsCache;
};
