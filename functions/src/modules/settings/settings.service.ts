import prisma from "../../config/database";
import { sysCache } from "../../config/cache";
import { clearCache } from "../../middleware/cache";

const defaultSettings = {
  siteName: "3D Galaxy",
  logoUrl: "",
  currency: "₹",
  footer: {
    description: "",
    groups: [
      {
        id: "policies",
        title: "Policies",
        isActive: true,
        links: [
          { id: "ref-policy", title: "Refund Policy", url: "/refund-policy", isActive: true, openInNewTab: false },
          { id: "ret-policy", title: "Return Policy", url: "/return-policy", isActive: true, openInNewTab: false },
          { id: "priv-policy", title: "Privacy Policy", url: "/privacy-policy", isActive: true, openInNewTab: false },
          { id: "tos-policy", title: "Terms of Service", url: "/terms-of-service", isActive: true, openInNewTab: false },
          { id: "ship-policy", title: "Shipping Policy", url: "/shipping-policy", isActive: true, openInNewTab: false },
          { id: "abt-policy", title: "About Us", url: "/about", isActive: true, openInNewTab: false }
        ]
      },
      {
        id: "quick-links",
        title: "Quick links",
        isActive: true,
        links: [
          { id: "search-link", title: "Search", url: "/products", isActive: true, openInNewTab: false },
          { id: "contact-link", title: "Contact Us", url: "/about", isActive: true, openInNewTab: false },
          { id: "products-link", title: "All products", url: "/products", isActive: true, openInNewTab: false },
          { id: "track-link", title: "Track Order", url: "/orders", isActive: true, openInNewTab: false }
        ]
      }
    ],
    socialLinks: [],
    paymentIcons: [
      { id: "visa", name: "VISA", isActive: true },
      { id: "rupay", name: "RuPay", isActive: true },
      { id: "cashfree", name: "Cashfree", isActive: true },
      { id: "mastercard", name: "Mastercard", isActive: true }
    ],
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
  whatsappSettings: {
    orderConfirmationCodTemplateName: "order_confirmation_cod_3dgal",
    orderConfirmationPaidTemplateName: "order_confirmation_paid_3dgal",
    orderConfirmationAdminTemplateName: "order_confirmation_admin",
    order3dprintClientTemplateName: "order_3dprint_client",
    order3dprintAdminTemplateName: "order_3dprint_admin",
    welcomeMessageTemplateName: "welcome_message",
    orderStatusUpdateTemplateName: "order_status_update",
    orderShippedTemplateName: "order_shipped",
    enableCodNotifications: true,
    enablePaidNotifications: true,
    serviceRequestCustomerTemplateName: "order_3dprint_client",
    serviceRequestAdminTemplateName: "order_3dprint_admin",
    enableServiceRequestCustomerNotifications: true,
    enableServiceRequestAdminNotifications: true,
    enableServiceRequestEmailNotifications: false
  },
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
  supportSettings: {
    whatsappNumber: "+919876543210",
    email: "3dgalaxy@hotmail.com",
    businessHours: "9 AM - 6 PM",
    autoReply: "Thank you for contacting support! We will get back to you shortly.",
    returnPolicyUrl: "/return-policy",
    refundPolicyUrl: "/refund-policy",
    returnWindowDays: 10,
    refundWindowDays: 10
  },
};

const isDatabaseUnavailableError = (error: any) => {
  const message = error?.message || "";
  const code = error?.code || "";
  return (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1008" ||
    code === "P1017" ||
    code === "P2024" ||
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EHOSTUNREACH" ||
    /Can't reach database server|database server is running|ECONNREFUSED|ENOTFOUND|getaddrinfo|ETIMEDOUT|EHOSTUNREACH|connect/i.test(
      message
    )
  );
};

export const getSettingsService = async () => {
  const cached = sysCache.get("app_settings");
  if (cached) {
    return cached;
  }

  try {
    // Fetch primary setting and banners concurrently to minimize database latency
    const [record, banners] = await Promise.all([
      prisma.setting.findUnique({
        where: { settingKey: "app_settings" },
      }).catch(() => null),
      prisma.banner.findMany({
        where: { isActive: true },
      }).catch(() => []),
    ]);

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
      }).catch(() => null);
    }

    // 2. Merge Banners/Sliders from banners table
    try {
      if (banners && banners.length > 0) {
        const storedHeroSlides = (settingsObj.heroSlides && Array.isArray(settingsObj.heroSlides)) ? settingsObj.heroSlides : [];
        const heroBanners = banners.filter(b => b.position === "HERO" || b.position === "slider" || b.position === "hero_main" || b.position === "hero");
        
        if (storedHeroSlides.length > 0) {
          settingsObj.heroSlides = storedHeroSlides.map((slide: any, idx: number) => {
            const matchingBanner = heroBanners.find(b => b.id === slide.id || (slide.title && b.title === slide.title)) || heroBanners[idx];
            const resolvedImg = slide.bgImageUrl || slide.imageUrl || matchingBanner?.imageUrl || "";
            const resolvedVideo = slide.bgVideoUrl || slide.videoUrl || "";
            const resolvedTitle = slide.title !== undefined ? slide.title : (matchingBanner?.title || "");
            const resolvedSubtitle = slide.subtitle || slide.subheading || "";
            const resolvedActive = slide.active !== undefined ? slide.active : (slide.isActive !== undefined ? slide.isActive : (matchingBanner?.isActive !== undefined ? matchingBanner.isActive : true));
            return {
              ...slide,
              id: slide.id || matchingBanner?.id || `slide_${idx + 1}`,
              title: resolvedTitle,
              subtitle: resolvedSubtitle,
              subheading: resolvedSubtitle,
              imageUrl: slide.imageUrl || "",
              bgImageUrl: slide.bgImageUrl || resolvedImg,
              videoUrl: resolvedVideo,
              bgVideoUrl: resolvedVideo,
              linkUrl: slide.linkUrl !== undefined ? slide.linkUrl : (matchingBanner?.linkUrl || ""),
              position: "HERO",
              active: resolvedActive,
              isActive: resolvedActive
            };
          });
        } else if (heroBanners.length > 0) {
          settingsObj.heroSlides = heroBanners.map((b, idx) => ({
            id: b.id || `slide_${idx + 1}`,
            title: b.title || "",
            subtitle: "",
            subheading: "",
            imageUrl: b.imageUrl || "",
            bgImageUrl: b.imageUrl || "",
            videoUrl: "",
            bgVideoUrl: "",
            linkUrl: b.linkUrl || "",
            position: "HERO",
            badge: "Featured",
            badgeIcon: "bolt",
            btnText: "Buy Now",
            secBtnText: "View Details",
            price: "",
            oldPrice: "",
            discountText: "",
            productTag: "",
            bgColor: "#09090b",
            animationType: "fade",
            overlayOpacity: 0.4,
            textAlignment: "left",
            darkOverlay: true,
            btnTheme: "primary",
            slideOrder: idx,
            slideDuration: 3000,
            active: b.isActive !== false,
            isActive: b.isActive !== false,
            hideOnMobile: false,
            hideOnDesktop: false
          }));
        }

        const storedPromoBanners = (settingsObj.promoBanners && Array.isArray(settingsObj.promoBanners)) ? settingsObj.promoBanners : [];
        const promoBannersDb = banners.filter(b => b.position === "PROMO" || b.position === "banner" || b.position === "promo_strip" || b.position === "promo");
        if (storedPromoBanners.length > 0) {
          settingsObj.promoBanners = storedPromoBanners.map((banner: any, idx: number) => {
            const matchingBanner = promoBannersDb.find(b => b.id === banner.id || (banner.title && b.title === banner.title)) || promoBannersDb[idx];
            const resolvedImg = banner.imageUrl || matchingBanner?.imageUrl || "";
            return {
              ...banner,
              id: banner.id || matchingBanner?.id || `banner_${idx + 1}`,
              title: banner.title !== undefined ? banner.title : (matchingBanner?.title || ""),
              imageUrl: resolvedImg,
              linkUrl: banner.linkUrl !== undefined ? banner.linkUrl : (matchingBanner?.linkUrl || ""),
              position: "PROMO",
              isActive: matchingBanner?.isActive !== undefined ? matchingBanner.isActive : (banner.isActive !== undefined ? banner.isActive : true)
            };
          });
        } else if (promoBannersDb.length > 0) {
          settingsObj.promoBanners = promoBannersDb.map((b, idx) => ({
            id: b.id || `banner_${idx + 1}`,
            title: b.title || "",
            imageUrl: b.imageUrl || "",
            linkUrl: b.linkUrl || "",
            position: b.position || "PROMO",
            isActive: b.isActive !== false
          }));
        }

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

    // 4. Merge Advertisements from prisma.advertisement & settings
    try {
      let settingsAds = (settingsObj.advertisements && Array.isArray(settingsObj.advertisements))
        ? settingsObj.advertisements
        : [];
      const dbAds = await prisma.advertisement.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' }
      });
      if (dbAds.length > 0) {
        const mergedMap = new Map();
        for (const ad of settingsAds) mergedMap.set(ad.id, ad);
        for (const dbAd of dbAds) {
          if (!mergedMap.has(dbAd.id)) mergedMap.set(dbAd.id, dbAd);
        }
        settingsAds = Array.from(mergedMap.values());
      }
      settingsObj.advertisements = settingsAds;
    } catch (adError) {
      console.error("Error loading advertisements into config:", adError);
    }

    // CENTRAL CACHE: 300 seconds (5 mins cache to prevent DB load while updating instantaneously on save)
    sysCache.set("app_settings", settingsObj, 300);
    return settingsObj;
  } catch (error: any) {
    if (isDatabaseUnavailableError(error)) {
      const fallbackSettings = { ...defaultSettings };
      sysCache.set("app_settings", fallbackSettings, 300);
      return fallbackSettings;
    }
    throw error;
  }
};

export const updateSettingsService = async (payload: any) => {
  const currentSettings = await getSettingsService();
  const currentVersion = Number(currentSettings.version) || 1;
  
  let newSettings: any;
  if (payload && payload.resetToDefault === true) {
    newSettings = {
      ...defaultSettings,
      version: currentVersion + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: payload.updatedBy || "Admin"
    };
  } else {
    newSettings = {
      ...currentSettings,
      ...payload,
      version: currentVersion + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: payload.updatedBy || "Admin"
    };
  }

  try {
    // 1. Sync Theme Settings if updated
    if (!newSettings.theme) {
      newSettings.theme = {};
    }
    if (payload.primaryColor) newSettings.theme.primaryColor = payload.primaryColor;
    if (payload.secondaryColor) newSettings.theme.secondaryColor = payload.secondaryColor;
    if (payload.accentColor) newSettings.theme.accentColor = payload.accentColor;
    if (payload.borderRadius) newSettings.theme.borderRadius = payload.borderRadius;
    if (payload.fontFamily || payload.typography) newSettings.theme.fontFamily = payload.fontFamily || payload.typography;
    if (payload.darkMode !== undefined) newSettings.theme.darkMode = payload.darkMode;



    // 2. Sync Banners (heroSlides and promoBanners) if updated
    if (payload.heroSlides !== undefined || payload.promoBanners !== undefined || payload.resetToDefault) {
      if (newSettings.heroSlides && Array.isArray(newSettings.heroSlides)) {
        newSettings.heroSlides = newSettings.heroSlides.map((slide: any, idx: number) => {
          const img = slide.bgImageUrl || slide.imageUrl || "";
          const vid = slide.bgVideoUrl || slide.videoUrl || "";
          const sub = slide.subtitle || slide.subheading || "";
          const act = slide.active !== undefined ? slide.active : (slide.isActive !== undefined ? slide.isActive : true);
          return {
            ...slide,
            id: slide.id || `slide_${idx + 1}`,
            title: slide.title || "",
            subtitle: sub,
            subheading: sub,
            imageUrl: slide.imageUrl || "",
            bgImageUrl: slide.bgImageUrl || img,
            videoUrl: vid,
            bgVideoUrl: vid,
            active: act,
            isActive: act,
            slideOrder: slide.slideOrder !== undefined ? slide.slideOrder : idx,
            slideDuration: slide.slideDuration !== undefined ? slide.slideDuration : 3000,
          };
        });
      }

      const updatedHeroSlides = newSettings.heroSlides;
      const updatedPromoBanners = newSettings.promoBanners;

      try {
        await prisma.$transaction(async (tx) => {
          // Delete all current banners in HERO/PROMO positions
          await tx.banner.deleteMany({
            where: {
              position: { in: ["HERO", "PROMO", "slider", "banner", "hero_main", "promo_strip", "hero", "promo"] }
            }
          });

          // Insert new ones
          const bannersToCreate = [];
          if (updatedHeroSlides && Array.isArray(updatedHeroSlides)) {
            for (const slide of updatedHeroSlides) {
              const img = slide.imageUrl || slide.bgImageUrl || "";
              bannersToCreate.push({
                title: (slide.title || "").substring(0, 255),
                imageUrl: img.substring(0, 255),
                linkUrl: (slide.linkUrl || "").substring(0, 255),
                position: "HERO",
                isActive: (slide.active !== undefined ? slide.active : slide.isActive) !== false
              });
            }
          }
          if (updatedPromoBanners && Array.isArray(updatedPromoBanners)) {
            for (const banner of updatedPromoBanners) {
              const img = banner.imageUrl || "";
              bannersToCreate.push({
                title: (banner.title || "").substring(0, 255),
                imageUrl: img.substring(0, 255),
                linkUrl: (banner.linkUrl || "").substring(0, 255),
                position: "PROMO",
                isActive: (banner.active !== undefined ? banner.active : banner.isActive) !== false
              });
            }
          }

          if (bannersToCreate.length > 0) {
            await tx.banner.createMany({
              data: bannersToCreate
            });
          }
        });
      } catch (bannerSyncErr) {
        console.warn("Non-fatal: Error syncing banners table during settings update:", bannerSyncErr);
      }
    }

    // 3. Sync Homepage Sections if updated
    if (payload.homePageSections !== undefined || payload.homepageSections !== undefined || payload.resetToDefault) {
      const sectionsData = newSettings.homepageSections || newSettings.homePageSections;
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

    // Clear all memory & route-level caches completely to guarantee fresh sync
    sysCache.del("app_settings");
    sysCache.del("consolidated_home_payload");
    sysCache.del("consolidated_dynamic_homepage_payload");
    sysCache.del("featured_products_payload");
    sysCache.del("theme_settings");
    sysCache.del("security_settings");
    sysCache.del("service_config");
    sysCache.del("homepage_sections");
    sysCache.del("frontend_layout");

    if (payload && payload.instagramFeedSettings) {
      try {
        sysCache.del("instagram_feed");
      } catch (e) {
        // ignore
      }
    }
    sysCache.set("app_settings", finalSettingsObj, 300);
    clearCache(); // flush route-level cache

    return finalSettingsObj;
  } catch (error: any) {
    if (isDatabaseUnavailableError(error)) {
      sysCache.del("app_settings");
      sysCache.del("consolidated_home_payload");
      sysCache.del("consolidated_dynamic_homepage_payload");
      sysCache.del("featured_products_payload");
      sysCache.del("theme_settings");
      sysCache.del("security_settings");
      sysCache.del("service_config");
      sysCache.del("homepage_sections");
      sysCache.del("frontend_layout");

      if (payload && payload.instagramFeedSettings) {
        try {
          sysCache.del("instagram_feed");
        } catch (e) {
          // ignore
        }
      }
      sysCache.set("app_settings", newSettings, 300);
      clearCache();
      return newSettings;
    }
    throw error;
  }
};
