import prisma from "../../config/database";
import { sysCache } from "../../config/cache";
import { clearCache } from "../../middleware/cache";

const defaultSettings = {
  siteName: "3D Galaxy",
  logoUrl: "",
  currency: "₹",
  footer: {
    description: "",
    groups: [],
    socialLinks: [],
    paymentIcons: [],
    trustBadges: [],
  },
  heroSlides: [],
  promoBanners: [],
  advertisements: [],
  theme: {
    primaryColor: "#2563EB",
    secondaryColor: "#7C3AED",
    gradientAngle: 135,
    darkMode: false,
    logo: "",
    favicon: "",
  },
  gradientSettings: {},
  socialLinks: {
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
  },
  aboutPage: {},
  contact: {
    phone: "",
    email: "",
    address: "",
  },
  paymentGatewaySettings: {
    razorpayEnabled: true,
    razorpayKeyId: "",
    codEnabled: true,
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
    brands: [],
  },
  instagramFeedSettings: {
    enabled: false,
    accessToken: "",
    profileId: "me",
    profileName: "Instagram",
    profileUrl: "",
    profileImageUrl: "",
    profileBio: "",
    postCount: 6,
    cacheMinutes: 30,
  },
  productPageSettings: {},
  tourSettings: {},
  colorPresets: [],
  managedFonts: [],
  tickerTexts: [],
  faqs: [],
  services: [],
  companyInfo: {},
  printServiceSettings: {
    materials: [
      {
        name: "PLA",
        pricePerGram: 2.5,
        density: 1.25,
        active: true,
        colors: [
          { name: "White", hex: "#FFFFFF" },
          { name: "Black", hex: "#000000" },
          { name: "Red", hex: "#FF0000" },
          { name: "Blue", hex: "#0000FF" },
          { name: "Green", hex: "#008000" },
        ],
      },
      {
        name: "PETG",
        pricePerGram: 3.2,
        density: 1.27,
        active: true,
        colors: [
          { name: "Orange", hex: "#FF8C00" },
          { name: "Grey", hex: "#808080" },
          { name: "Silver", hex: "#C0C0C0" },
        ],
      },
      {
        name: "ABS",
        pricePerGram: 3.5,
        density: 1.05,
        active: true,
        colors: [
          { name: "Black", hex: "#000000" },
          { name: "White", hex: "#FFFFFF" },
          { name: "Red", hex: "#FF0000" },
        ],
      },
      {
        name: "TPU",
        pricePerGram: 4.8,
        density: 1.2,
        active: true,
        colors: [
          { name: "Purple", hex: "#800080" },
          { name: "Yellow", hex: "#FFFF00" },
        ],
      },
      {
        name: "Resin",
        pricePerGram: 7.5,
        density: 1.1,
        active: true,
        colors: [
          { name: "Gold", hex: "#FFD700" },
          { name: "Grey", hex: "#808080" },
        ],
      },
    ],
    qualities: [
      { name: "Standard", height: 0.2 },
      { name: "Medium", height: 0.15 },
      { name: "High", height: 0.1 },
    ],
    infillStandards: [
      { name: "10 - 30%", desc: "Standard", min: 10, max: 30, defaultVal: 20 },
      { name: "31 - 50%", desc: "Medium", min: 31, max: 50, defaultVal: 40 },
      { name: "51 - 80%", desc: "Strong", min: 51, max: 80, defaultVal: 60 },
    ],
    machineFeePerHour: 150,
    gstTaxRate: 18,
  },

  // Legacy fields for high backward-compatibility
  homepage: {
    featuredCategories: [],
    featuredProducts: [],
    bestSellers: [],
    brands: [],
  },
  payment: {
    razorpayEnabled: true,
    razorpayKeyId: "",
    codEnabled: true,
  },
  security: {
    sessionTimeout: 30,
    warningBeforeLogout: 5,
    enableIdleLogout: true,
  },
  socialMedia: {
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
  },
};

const isDatabaseUnavailableError = (error: any) => {
  const message = error?.message || "";
  return (
    error?.code === "P1001" ||
    error?.code === "P2024" ||
    error?.code === "ECONNREFUSED" ||
    /Can't reach database server|database server is running|ECONNREFUSED|connect/i.test(
      message,
    )
  );
};

export const getSettingsService = async () => {
  const cached = sysCache.get("app_settings");
  if (cached) {
    return cached;
  }

  try {
    const record = await prisma.setting.findUnique({
      where: { settingKey: "app_settings" },
    });

    let settingsObj: any = null;
    if (record && record.settingData) {
      try {
        settingsObj =
          typeof record.settingData === "string"
            ? JSON.parse(record.settingData)
            : (record.settingData as any);
      } catch (e) {
        settingsObj = { ...defaultSettings };
      }
    } else {
      settingsObj = { ...defaultSettings };
      await prisma.setting.create({
        data: {
          settingKey: "app_settings",
          settingData: settingsObj,
        },
      });
    }

    // CENTRAL CACHE: 30 minutes (1800 seconds)
    sysCache.set("app_settings", settingsObj, 1800);
    return settingsObj;
  } catch (error: any) {
    if (isDatabaseUnavailableError(error)) {
      const fallbackSettings = { ...defaultSettings };
      sysCache.set("app_settings", fallbackSettings, 1800);
      return fallbackSettings;
    }
    throw error;
  }
};

export const updateSettingsService = async (payload: any) => {
  const currentSettings = await getSettingsService();
  const newSettings = { ...currentSettings, ...payload };

  try {
    const updatedRecord = await prisma.setting.upsert({
      where: { settingKey: "app_settings" },
      update: { settingData: newSettings },
      create: { settingKey: "app_settings", settingData: newSettings },
    });

    let finalSettingsObj: any = null;
    try {
      finalSettingsObj =
        typeof updatedRecord.settingData === "string"
          ? JSON.parse(updatedRecord.settingData)
          : (updatedRecord.settingData as any);
    } catch (e) {
      finalSettingsObj = newSettings;
    }

    // Clear cache and replace
    // Clear both caches: sysCache (app-level) and route-level NodeCache
    sysCache.del("app_settings");
    // If instagram settings were updated, clear the instagram feed cache so new settings take effect immediately
    if (payload && payload.instagramFeedSettings) {
      try {
        sysCache.del("instagram_feed");
      } catch (e) {
        // ignore
      }
    }
    sysCache.set("app_settings", finalSettingsObj, 1800);
    clearCache(); // flush route-level cache so GET /api/settings returns fresh data

    return finalSettingsObj;
  } catch (error: any) {
    if (isDatabaseUnavailableError(error)) {
      sysCache.del("app_settings");
      if (payload && payload.instagramFeedSettings) {
        try {
          sysCache.del("instagram_feed");
        } catch (e) {
          // ignore
        }
      }
      sysCache.set("app_settings", newSettings, 1800);
      clearCache();
      return newSettings;
    }
    throw error;
  }
};
