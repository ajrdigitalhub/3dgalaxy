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

    // 1. Merge Theme Settings from theme_settings table
    try {
      const themeRecord = await prisma.themeSetting.findUnique({
        where: { keyName: "global-settings" },
      });
      if (themeRecord && themeRecord.value) {
        const themeVal = typeof themeRecord.value === "string"
          ? JSON.parse(themeRecord.value)
          : themeRecord.value;
        settingsObj.theme = { ...settingsObj.theme, ...themeVal };
      } else {
        // Seed the theme_settings table with initial visual settings from current settings blob
        await prisma.themeSetting.create({
          data: {
            keyName: "global-settings",
            value: settingsObj.theme || defaultSettings.theme,
          },
        });
      }
    } catch (themeError) {
      console.error("Error loading theme settings into config:", themeError);
    }

    // 2. Merge Banners/Sliders from banners table
    try {
      const banners = await prisma.banner.findMany({
        where: { isActive: true },
      });

      if (banners.length > 0) {
        const heroSlides = banners
          .filter(b => b.position === "HERO" || b.position === "slider")
          .map(b => ({
            id: b.id,
            title: b.title || "",
            imageUrl: b.imageUrl,
            linkUrl: b.linkUrl || "",
            position: b.position || "HERO",
            isActive: b.isActive
          }));

        const promoBanners = banners
          .filter(b => b.position === "PROMO" || b.position === "banner")
          .map(b => ({
            id: b.id,
            title: b.title || "",
            imageUrl: b.imageUrl,
            linkUrl: b.linkUrl || "",
            position: b.position || "PROMO",
            isActive: b.isActive
          }));

        settingsObj.heroSlides = heroSlides;
        settingsObj.promoBanners = promoBanners;
        settingsObj.banners = banners;
      } else {
        // Seed banners table from settingsObj.heroSlides and settingsObj.promoBanners
        const initialBanners = [];
        if (settingsObj.heroSlides && Array.isArray(settingsObj.heroSlides)) {
          for (const slide of settingsObj.heroSlides) {
            initialBanners.push({
              title: slide.title || "",
              imageUrl: slide.imageUrl || "",
              linkUrl: slide.linkUrl || "",
              position: "HERO",
              isActive: slide.isActive !== undefined ? slide.isActive : true
            });
          }
        }
        if (settingsObj.promoBanners && Array.isArray(settingsObj.promoBanners)) {
          for (const banner of settingsObj.promoBanners) {
            initialBanners.push({
              title: banner.title || "",
              imageUrl: banner.imageUrl || "",
              linkUrl: banner.linkUrl || "",
              position: "PROMO",
              isActive: banner.isActive !== undefined ? banner.isActive : true
            });
          }
        }
        if (initialBanners.length > 0) {
          await prisma.banner.createMany({
            data: initialBanners,
          });
        }
      }
    } catch (bannerError) {
      console.error("Error loading banners into config:", bannerError);
    }

    // 3. Merge Homepage Sections from homepage_sections & homepage_section_items
    try {
      const homeSections = await prisma.homepageSection.findMany({
        where: { isActive: true },
        include: {
          items: {
            include: {
              product: {
                include: { variants: true }
              },
              category: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: { sortOrder: 'asc' }
      });

      if (homeSections.length > 0) {
        settingsObj.homepageSections = homeSections;

        // Build legacy mapping for backward compatibility
        const featuredCategories = homeSections
          .filter(s => s.type === "CATEGORIES" || s.type === "featuredCategories")
          .flatMap(s => s.items.map(i => i.category).filter(Boolean));

        const featuredProducts = homeSections
          .filter(s => s.type === "PRODUCTS" || s.type === "featuredProducts")
          .flatMap(s => s.items.map(i => i.product).filter(Boolean));

        const bestSellers = homeSections
          .filter(s => s.type === "BEST_SELLERS" || s.type === "bestSellers")
          .flatMap(s => s.items.map(i => i.product).filter(Boolean));

        const brands = homeSections
          .filter(s => s.type === "BRANDS" || s.type === "brands")
          .flatMap(s => s.items.map(i => i.category || i.title).filter(Boolean));

        settingsObj.homePageSections = {
          featuredCategories,
          featuredProducts,
          bestSellers,
          brands
        };
        settingsObj.homepage = settingsObj.homePageSections;
      }
    } catch (sectionError) {
      console.error("Error loading homepage sections into config:", sectionError);
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
    // 1. Sync Theme Settings if updated
    if (payload.theme) {
      await prisma.themeSetting.upsert({
        where: { keyName: "global-settings" },
        update: { value: payload.theme },
        create: { keyName: "global-settings", value: payload.theme },
      });
    }

    // 2. Sync Banners (heroSlides and promoBanners) if updated
    if (payload.heroSlides !== undefined || payload.promoBanners !== undefined) {
      const updatedHeroSlides = payload.heroSlides !== undefined ? payload.heroSlides : currentSettings.heroSlides;
      const updatedPromoBanners = payload.promoBanners !== undefined ? payload.promoBanners : currentSettings.promoBanners;

      await prisma.$transaction(async (tx) => {
        // Delete all current banners in HERO/PROMO positions
        await tx.banner.deleteMany({
          where: {
            position: { in: ["HERO", "PROMO", "slider", "banner"] }
          }
        });

        // Insert new ones
        const bannersToCreate = [];
        if (updatedHeroSlides && Array.isArray(updatedHeroSlides)) {
          for (const slide of updatedHeroSlides) {
            bannersToCreate.push({
              title: slide.title || "",
              imageUrl: slide.imageUrl || "",
              linkUrl: slide.linkUrl || "",
              position: "HERO",
              isActive: slide.isActive !== undefined ? slide.isActive : true
            });
          }
        }
        if (updatedPromoBanners && Array.isArray(updatedPromoBanners)) {
          for (const banner of updatedPromoBanners) {
            bannersToCreate.push({
              title: banner.title || "",
              imageUrl: banner.imageUrl || "",
              linkUrl: banner.linkUrl || "",
              position: "PROMO",
              isActive: banner.isActive !== undefined ? banner.isActive : true
            });
          }
        }

        if (bannersToCreate.length > 0) {
          await tx.banner.createMany({
            data: bannersToCreate
          });
        }
      });
    }

    // 3. Sync Homepage Sections if updated
    if (payload.homePageSections !== undefined || payload.homepageSections !== undefined) {
      const sectionsData = payload.homepageSections || payload.homePageSections;
      if (Array.isArray(sectionsData)) {
        await prisma.$transaction(async (tx) => {
          // Clear all existing section mappings and rewrite
          await tx.homepageSection.deleteMany({});

          for (let i = 0; i < sectionsData.length; i++) {
            const sec = sectionsData[i];
            const createdSec = await tx.homepageSection.create({
              data: {
                name: sec.name,
                type: sec.type,
                sortOrder: sec.sortOrder !== undefined ? sec.sortOrder : i,
                isActive: sec.isActive !== undefined ? sec.isActive : true
              }
            });

            if (sec.items && Array.isArray(sec.items)) {
              const itemsToCreate = sec.items.map((item: any, idx: number) => ({
                sectionId: createdSec.id,
                productId: item.productId || null,
                categoryId: item.categoryId || null,
                imageUrl: item.imageUrl || null,
                title: item.title || null,
                subTitle: item.subTitle || null,
                linkUrl: item.linkUrl || null,
                sortOrder: item.sortOrder !== undefined ? item.sortOrder : idx
              }));

              if (itemsToCreate.length > 0) {
                await tx.homepageSectionItem.createMany({
                  data: itemsToCreate
                });
              }
            }
          }
        });
      }
    }

    // Save consolidated settings to monolithic settings table
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
    sysCache.del("app_settings");
    if (payload && payload.instagramFeedSettings) {
      try {
        sysCache.del("instagram_feed");
      } catch (e) {
        // ignore
      }
    }
    sysCache.set("app_settings", finalSettingsObj, 1800);
    clearCache(); // flush route-level cache

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
