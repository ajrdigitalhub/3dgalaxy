import { Injectable, inject, signal, effect, computed } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { environment } from "../../../environments/environment";

export const DEFAULT_FOOTER_GROUPS = [
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
];

export const DEFAULT_HEADER_ANNOUNCEMENTS: Array<{
  id: string;
  title: string;
  shortMessage: string;
  description?: string;
  icon?: string;
  iconType?: 'material' | 'emoji' | 'svg';
  bgColor?: string;
  textColor?: string;
  ctaText?: string;
  ctaUrl?: string;
  openInNewTab?: boolean;
  animationType?: 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom' | 'bounce' | 'pulse' | 'glow';
  displayMode?: 'static' | 'marquee' | 'rotating';
  scrollDirection?: 'left' | 'right';
  scrollSpeed?: number;
  priority?: number;
  visiblePages?: string[];
  targetAudience?: 'all' | 'guest' | 'logged_in';
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  isDismissible?: boolean;
  sortOrder?: number;
}> = [
  {
    id: "ann-free-shipping",
    title: "Free Shipping",
    shortMessage: "🚚 Free Shipping on Orders Above ₹999",
    description: "Enjoy free standard delivery across India on all eligible cart totals exceeding ₹999.",
    icon: "local_shipping",
    iconType: "material",
    bgColor: "linear-gradient(135deg, #d65108 0%, #b83200 100%)",
    textColor: "#ffffff",
    ctaText: "Shop Now",
    ctaUrl: "/products",
    openInNewTab: false,
    animationType: "fade",
    displayMode: "rotating",
    scrollDirection: "left",
    scrollSpeed: 4,
    priority: 1,
    visiblePages: ["all"],
    targetAudience: "all",
    startDate: null,
    endDate: null,
    isActive: true,
    isDismissible: true,
    sortOrder: 1
  },
  {
    id: "ann-flash-sale",
    title: "Flash Sale",
    shortMessage: "🔥 Flash Sale - Flat 20% OFF 3D Printing Filaments",
    description: "Limited time offer on premium PLA, PETG & ABS filaments.",
    icon: "whatshot",
    iconType: "material",
    bgColor: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
    textColor: "#ffffff",
    ctaText: "Claim Deal",
    ctaUrl: "/products?category=filaments",
    openInNewTab: false,
    animationType: "pulse",
    displayMode: "rotating",
    scrollDirection: "left",
    scrollSpeed: 4,
    priority: 2,
    visiblePages: ["all"],
    targetAudience: "all",
    startDate: null,
    endDate: null,
    isActive: true,
    isDismissible: true,
    sortOrder: 2
  },
  {
    id: "ann-coupon",
    title: "Coupon Code",
    shortMessage: "🎁 Use Coupon AJR100 & Save ₹100 Extra",
    description: "Apply code AJR100 at checkout for instant ₹100 discount.",
    icon: "card_giftcard",
    iconType: "material",
    bgColor: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    textColor: "#ffffff",
    ctaText: "Use Code",
    ctaUrl: "/products",
    openInNewTab: false,
    animationType: "bounce",
    displayMode: "rotating",
    scrollDirection: "left",
    scrollSpeed: 4,
    priority: 3,
    visiblePages: ["all"],
    targetAudience: "all",
    startDate: null,
    endDate: null,
    isActive: true,
    isDismissible: true,
    sortOrder: 3
  },
  {
    id: "ann-stl-slicer",
    title: "Custom Slicing",
    shortMessage: "🖨️ Upload STL Files & Get Instant Online Slicing Quotes",
    description: "Automated FDM & SLA 3D printing price calculator.",
    icon: "print",
    iconType: "material",
    bgColor: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    textColor: "#ffffff",
    ctaText: "Upload STL",
    ctaUrl: "/slicer",
    openInNewTab: false,
    animationType: "slide-left",
    displayMode: "rotating",
    scrollDirection: "left",
    scrollSpeed: 4,
    priority: 4,
    visiblePages: ["all"],
    targetAudience: "all",
    startDate: null,
    endDate: null,
    isActive: true,
    isDismissible: true,
    sortOrder: 4
  }
];

@Injectable({
  providedIn: "root",
})
export class SettingsService {
  private http = inject(HttpClient);
  private loadPromise: Promise<any> | null = null;

  constructor() {
    effect(() => {
      const themeData = this.theme();
      if (themeData && Object.keys(themeData).length > 0) {
        this.applyTheme(themeData);
      }
    });

    this.loadFromLocalStorage();

    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event: StorageEvent) => {
        if (event.key === "3d_galaxy_settings_version") {
          const newVer = Number(event.newValue) || 0;
          const currVer = Number(this.settingsData()?.version) || 0;
          if (newVer > currVer) {
            console.log(`[SETTINGS SYNC] Settings update detected in another tab. Version: ${newVer}`);
            this.loadSettings(true);
          }
        }
      });

      // DISABLED: Version polling was triggering /api/settings/version every 12s — excessive billing
      // this.initVersionPolling();
    }
  }

  private loadFromLocalStorage() {
    if (typeof window === "undefined") return;
    try {
      const cached = localStorage.getItem("3d_galaxy_settings");
      if (cached) {
        const parsed = JSON.parse(cached);
        this.hydrateSettings(parsed);
        console.log(`[SETTINGS CACHE] Loaded settings from local storage. Version: ${parsed.version || 1}`);
      }
    } catch (e) {
      console.warn("Failed to load settings from local storage cache:", e);
    }
  }

  private initVersionPolling() {
    if (typeof window === "undefined") return;
    setInterval(() => {
      if (document.visibilityState === "visible") {
        this.checkVersionAndSync();
      }
    }, 12000);
  }

  private async checkVersionAndSync() {
    try {
      const resp = await firstValueFrom(this.http.get<any>(environment.apiUrl + "/settings/version"));
      if (resp && resp.success) {
        const remoteVersion = resp.version;
        const currentVersion = this.settingsData()?.version || 0;
        if (remoteVersion > currentVersion) {
          console.log(`[SETTINGS SYNC] Remote version (${remoteVersion}) is newer than current (${currentVersion}). Syncing...`);
          await this.loadSettings(true);
        }
      }
    } catch (e) {
      console.warn("[SETTINGS SYNC] Background version check failed.");
    }
  }

  // Expose signals for reactivity
  public settingsData = signal<any>({});
  public isLoaded = signal(false);

  // Easy accessors for all required 23 categories
  public siteName = signal<string>("3D Galaxy");
  public logoUrl = signal<string>("");
  public currency = signal<string>("₹");
  public theme = signal<any>({});
  public heroSlides = signal<any[]>([]);
  public promoBanners = signal<any[]>([]);
  public advertisements = signal<any[]>([]);
  public banners = signal<any[]>([]);
  public footer = signal<any>({ groups: DEFAULT_FOOTER_GROUPS });
  public headerAnnouncements = signal<any[]>(DEFAULT_HEADER_ANNOUNCEMENTS);
  public aboutPage = signal<any>({});
  public contact = signal<any>({});
  public socialLinks = signal<any>({});
  public emailSettings = signal<any>({});
  public whatsappSettings = signal<any>({});
  public shippingSettings = signal<any>({});
  public payment = signal<any>({});
  public paymentGatewaySettings = signal<any>({});
  public newsletterSettings = signal<any>({});
  public chatbotSettings = signal<any>({});
  public homepage = signal<any>({});
  public homepageSections = signal<any>({});
  public productPageSettings = signal<any>({});
  public instagramFeedSettings = signal<any>({});
  public tourSettings = signal<any>({});
  public colorPresets = signal<any[]>([]);
  public managedFonts = signal<any[]>([]);
  public tickerTexts = signal<any[]>([]);
  public faqs = signal<any[]>([]);
  public services = signal<any[]>([]);
  public companyInfo = signal<any>({});
  public themeSettings = signal<any>({});
  public gradientSettings = signal<any>({});
  public security = signal<any>({});
  public printServiceSettings = signal<any>({
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
  });

  public hydrateSettings(d: any) {
    if (!d) return;
    this.settingsData.set(d);

    // Update all sub-signals
    if (d.siteName !== undefined) this.siteName.set(d.siteName);
    if (d.logoUrl !== undefined) this.logoUrl.set(d.logoUrl);
    if (d.currency !== undefined) this.currency.set(d.currency);

    let themeData = d.theme;
    if (!themeData) {
      themeData = {
        primaryColor: d.primaryColor || "#d65108",
        secondaryColor: d.secondaryColor || "#1e3a8a",
        accentColor: d.accentColor || "#3B82F6",
        borderRadius: d.borderRadius || "0.75rem",
        fontFamily: d.typography || "Inter",
        darkMode: d.darkMode || false,
        themeText: d.themeText || "#ffffff",
      };
    }
    this.theme.set(themeData);
    this.applyTheme(themeData);

    if (d.heroSlides) this.heroSlides.set(d.heroSlides);
    if (d.promoBanners) this.promoBanners.set(d.promoBanners);
    if (d.advertisements) this.advertisements.set(d.advertisements);
    if (d.headerAnnouncements && Array.isArray(d.headerAnnouncements) && d.headerAnnouncements.length > 0) {
      this.headerAnnouncements.set(d.headerAnnouncements);
    }
    if (d.footer) {
      const footerObj = { ...d.footer };
      if (!footerObj.groups || footerObj.groups.length === 0) {
        footerObj.groups = DEFAULT_FOOTER_GROUPS;
      }
      this.footer.set(footerObj);
    }
    if (d.aboutPage) this.aboutPage.set(d.aboutPage);
    if (d.contact) this.contact.set(d.contact);
    if (d.socialLinks) this.socialLinks.set(d.socialLinks);
    if (d.emailSettings) this.emailSettings.set(d.emailSettings);
    if (d.whatsappSettings) this.whatsappSettings.set(d.whatsappSettings);
    if (d.shippingSettings) this.shippingSettings.set(d.shippingSettings);
    if (d.paymentGatewaySettings)
      this.paymentGatewaySettings.set(d.paymentGatewaySettings);
    if (d.newsletterSettings) this.newsletterSettings.set(d.newsletterSettings);
    if (d.chatbotSettings) this.chatbotSettings.set(d.chatbotSettings);
    if (d.homepageSections) this.homepageSections.set(d.homepageSections);
    if (d.productPageSettings)
      this.productPageSettings.set(d.productPageSettings);
    if (d.instagramFeedSettings)
      this.instagramFeedSettings.set(d.instagramFeedSettings);
    if (d.tourSettings) this.tourSettings.set(d.tourSettings);
    if (d.colorPresets) this.colorPresets.set(d.colorPresets);
    if (d.managedFonts) this.managedFonts.set(d.managedFonts);
    if (d.tickerTexts) this.tickerTexts.set(d.tickerTexts);
    if (d.faqs) this.faqs.set(d.faqs);
    if (d.services) this.services.set(d.services);
    if (d.companyInfo) this.companyInfo.set(d.companyInfo);
    if (d.gradientSettings) this.gradientSettings.set(d.gradientSettings);
    if (d.security) this.security.set(d.security);
    if (d.printServiceSettings)
      this.printServiceSettings.set(d.printServiceSettings);

    // Compatibility signals
    if (d.banners) this.banners.set(d.banners);
    if (d.paymentGatewaySettings) this.payment.set(d.paymentGatewaySettings);
    if (d.homepageSections) this.homepage.set(d.homepageSections);

    this.isLoaded.set(true);
  }

  async loadSettings(force = false) {
    if (this.loadPromise && !force) return this.loadPromise;

    // Immediately hydrate from localStorage if available for fast initial rendering
    if (typeof window !== "undefined") {
      this.loadFromLocalStorage();
    }

    // Always fetch dynamic settings from Settings API to apply latest theme
    this.loadPromise = firstValueFrom(this.http.get<any>(environment.apiUrl + "/settings"))
      .then((resp) => {
        if (resp) {
          const d = resp.data !== undefined ? resp.data : resp;
          this.hydrateSettings(d);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("3d_galaxy_settings", JSON.stringify(d));
              localStorage.setItem("3d_galaxy_settings_version", String(d.version || 1));
            } catch (e) {
              console.warn("Failed to save settings to local storage:", e);
            }
          }
        }
        this.loadPromise = null;
        return this.settingsData();
      })
      .catch((err) => {
        this.loadPromise = null;
        if (typeof window !== "undefined") {
          this.loadFromLocalStorage();
        }
        if (this.isLoaded()) {
          this.applyTheme(this.theme());
          return this.settingsData();
        }
        throw err;
      });

    return this.loadPromise;
  }

  async saveSettings(payload: any) {
    try {
      const resp = await firstValueFrom(
        this.http.put<any>(environment.apiUrl + "/admin/settings", payload),
      );
      const d = resp.data !== undefined ? resp.data : resp;
      if (typeof window !== "undefined" && d) {
        localStorage.setItem("3d_galaxy_settings", JSON.stringify(d));
        localStorage.setItem("3d_galaxy_settings_version", String(d.version || 1));
      }
      await this.loadSettings(true);
      return resp;
    } catch (e: any) {
      throw new Error(
        e.error?.error || e.message || "Failed to update settings",
      );
    }
  }

  public applyTheme(themeData: any) {
    if (!themeData || typeof document === "undefined") return;
    const root = document.documentElement;
    const d = this.settingsData() || {};

    const primaryColor = themeData.primaryColor || d.primaryColor || "#f54f00";
    const secondaryColor = themeData.secondaryColor || d.secondaryColor || "#ea580c";
    const accentColor = themeData.accentColor || d.accentColor || "#3B82F6";

    // RGB extractor helper for rgba CSS background & glow utilities
    const hexToRgb = (hex: string) => {
      if (!hex) return '245, 79, 0';
      const cleanHex = hex.replace('#', '').trim();
      if (cleanHex.length === 3) {
        const r = parseInt(cleanHex[0] + cleanHex[0], 16);
        const g = parseInt(cleanHex[1] + cleanHex[1], 16);
        const b = parseInt(cleanHex[2] + cleanHex[2], 16);
        return `${r}, ${g}, ${b}`;
      } else if (cleanHex.length === 6) {
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        return `${r}, ${g}, ${b}`;
      }
      return '245, 79, 0';
    };

    // Gradient Angle
    let angle =
      themeData.gradientAngle !== undefined ? themeData.gradientAngle : "135";
    if (typeof angle === "number" || !String(angle).endsWith("deg")) {
      angle = `${angle}deg`;
    }

    // Border Radius
    let borderRadius =
      themeData.borderRadius !== undefined ? themeData.borderRadius : "0.75rem";
    if (
      typeof borderRadius === "number" ||
      /^\d+$/.test(String(borderRadius).trim())
    ) {
      borderRadius = `${String(borderRadius).trim()}px`;
    }

    // Hover Effect
    const hoverEffect = themeData.hoverEffect || "brightness(1.15) scale(1.02)";

    // Gradient build
    const gradSettings = d.gradientSettings || {};
    const gradColor = gradSettings.gradientColor || secondaryColor;
    let gradient =
      gradSettings.gradient ||
      `linear-gradient(${angle}, ${primaryColor}, ${gradColor})`;

    // Theme active mode colors
    let userPrefMode: boolean | null = null;
    if (typeof localStorage !== "undefined") {
      const savedTheme = localStorage.getItem("3d_galaxy_theme") || localStorage.getItem("theme");
      if (savedTheme === "light") userPrefMode = false;
      else if (savedTheme === "dark") userPrefMode = true;
    }

    const isDarkMode = themeData.darkMode !== undefined 
      ? themeData.darkMode 
      : (userPrefMode !== null 
          ? userPrefMode 
          : (d.darkMode !== undefined ? d.darkMode : false));
    const lightColors = d.lightThemeColors || {};
    const darkColors = d.darkThemeColors || {};
    const actColors = isDarkMode ? darkColors : lightColors;

    const finalPrimary = actColors.primary || primaryColor;
    const finalSecondary = actColors.secondary || secondaryColor;
    const finalAccent = actColors.accent || accentColor;

    // Apply primary CSS variables to document root
    root.style.setProperty("--primary-color", finalPrimary);
    root.style.setProperty("--secondary-color", finalSecondary);
    root.style.setProperty("--accent-color", finalAccent);
    root.style.setProperty("--primary-color-rgb", hexToRgb(finalPrimary));
    root.style.setProperty("--secondary-color-rgb", hexToRgb(finalSecondary));
    root.style.setProperty("--gradient-angle", angle);
    root.style.setProperty("--theme-radius", borderRadius);
    root.style.setProperty("--radius", borderRadius);
    root.style.setProperty("--theme-gradient", gradient);
    root.style.setProperty("--theme-text", themeData.themeText || "#ffffff");
    root.style.setProperty("--theme-hover-effect", hoverEffect);

    // Compatibility CSS variables
    root.style.setProperty("--color-primary", finalPrimary);
    root.style.setProperty("--color-secondary", finalSecondary);
    root.style.setProperty("--color-theme-primary", finalPrimary);
    root.style.setProperty("--color-theme-secondary", finalSecondary);

    // Typography
    const font = themeData.fontFamily || themeData.typography || d.fontFamily || "Inter";
    root.style.setProperty("--font-sans", `"${font}", ui-sans-serif, system-ui, sans-serif`);
    root.style.setProperty("--font-display", `"${font}", "Space Grotesk", sans-serif`);

    // Animation & transition settings
    const animSpeed = themeData.animationSpeed || "0.5s";
    const animStyle =
      themeData.animationStyle || "cubic-bezier(0.16, 1, 0.3, 1)";
    const pageTrans = themeData.pageTransition || "fade";
    const hvrStyle = themeData.hoverStyle || "translateY(-8px)";
    const crdStyle = themeData.cardStyle || "glassmorphism";
    const btnStyle = themeData.buttonStyle || "rounded-xl";
    const plxEnabled =
      themeData.parallaxEnabled !== undefined
        ? themeData.parallaxEnabled
        : true;

    root.style.setProperty("--animation-speed", animSpeed);
    root.style.setProperty("--animation-style", animStyle);
    root.style.setProperty("--page-transition", pageTrans);
    root.style.setProperty("--hover-style", hvrStyle);
    root.style.setProperty("--card-style", crdStyle);
    root.style.setProperty("--button-style", btnStyle);
    root.style.setProperty("--parallax-enabled", plxEnabled ? "1" : "0");

    // Apply dark mode class to html and body
    if (isDarkMode) {
      root.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      document.body.classList.remove("dark");
    }

    // Favicon update
    if (themeData.favicon && typeof document !== "undefined") {
      const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (link) {
        link.href = themeData.favicon;
      } else {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = themeData.favicon;
        document.head.appendChild(newLink);
      }
    }
  }

  getSettings() {
    return this.settingsData();
  }

  updateSettings(payload: any) {
    return this.saveSettings(payload);
  }

  getTheme() {
    return this.theme();
  }

  getFooter() {
    return this.footer();
  }

  getHeroSlides() {
    return this.heroSlides();
  }

  getHomepage() {
    return this.homepage();
  }

  getPaymentSettings() {
    return this.payment();
  }

  getSecuritySettings() {
    return this.security();
  }

  getBanners() {
    return this.banners();
  }

  getInstagramFeedSettings() {
    return this.instagramFeedSettings();
  }

  getFaqs() {
    return this.faqs();
  }
}
