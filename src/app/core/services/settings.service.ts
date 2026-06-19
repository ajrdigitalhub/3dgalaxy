import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);

  // Expose signals for reactivity
  public settingsData = signal<any>({});
  public isLoaded = signal(false);

  // Easy accessors for all required 23 categories
  public siteName = signal<string>('3D Galaxy');
  public logoUrl = signal<string>('');
  public currency = signal<string>('₹');
  public theme = signal<any>({});
  public heroSlides = signal<any[]>([]);
  public promoBanners = signal<any[]>([]);
  public advertisements = signal<any[]>([]);
  public banners = signal<any[]>([]);
  public footer = signal<any>({});
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

  async loadSettings(force = false) {
    if (this.isLoaded() && !force) return;
    
    try {
      const resp = await firstValueFrom(this.http.get<any>('/api/settings'));
      if (resp && resp.data) {
        const d = resp.data;
        this.settingsData.set(d);
        
        // Update all sub-signals
        if (d.siteName !== undefined) this.siteName.set(d.siteName);
        if (d.logoUrl !== undefined) this.logoUrl.set(d.logoUrl);
        if (d.currency !== undefined) this.currency.set(d.currency);
        if (d.theme) this.theme.set(d.theme);
        if (d.heroSlides) this.heroSlides.set(d.heroSlides);
        if (d.promoBanners) this.promoBanners.set(d.promoBanners);
        if (d.advertisements) this.advertisements.set(d.advertisements);
        if (d.footer) this.footer.set(d.footer);
        if (d.aboutPage) this.aboutPage.set(d.aboutPage);
        if (d.contact) this.contact.set(d.contact);
        if (d.socialLinks) this.socialLinks.set(d.socialLinks);
        if (d.emailSettings) this.emailSettings.set(d.emailSettings);
        if (d.whatsappSettings) this.whatsappSettings.set(d.whatsappSettings);
        if (d.shippingSettings) this.shippingSettings.set(d.shippingSettings);
        if (d.paymentGatewaySettings) this.paymentGatewaySettings.set(d.paymentGatewaySettings);
        if (d.newsletterSettings) this.newsletterSettings.set(d.newsletterSettings);
        if (d.chatbotSettings) this.chatbotSettings.set(d.chatbotSettings);
        if (d.homepageSections) this.homepageSections.set(d.homepageSections);
        if (d.productPageSettings) this.productPageSettings.set(d.productPageSettings);
        if (d.tourSettings) this.tourSettings.set(d.tourSettings);
        if (d.colorPresets) this.colorPresets.set(d.colorPresets);
        if (d.managedFonts) this.managedFonts.set(d.managedFonts);
        if (d.tickerTexts) this.tickerTexts.set(d.tickerTexts);
        if (d.faqs) this.faqs.set(d.faqs);
        if (d.services) this.services.set(d.services);
        if (d.companyInfo) this.companyInfo.set(d.companyInfo);
        if (d.gradientSettings) this.gradientSettings.set(d.gradientSettings);
        if (d.security) this.security.set(d.security);

        // Compatibility signals
        if (d.banners) this.banners.set(d.banners);
        if (d.paymentGatewaySettings) this.payment.set(d.paymentGatewaySettings);
        if (d.homepageSections) this.homepage.set(d.homepageSections);

        this.applyTheme(d.theme);
      }
      this.isLoaded.set(true);
    } catch (e) {
      console.error('Failed to load global settings', e);
    }
  }

  async saveSettings(payload: any) {
    try {
      const resp = await firstValueFrom(this.http.put<any>('/api/admin/settings', payload));
      if (resp && resp.data) {
        // Automatically reload and apply correctly
        await this.loadSettings(true);
      }
      return resp;
    } catch (e: any) {
      throw new Error(e.error?.error || e.message || 'Failed to update settings');
    }
  }

  private applyTheme(themeData: any) {
    if (!themeData || typeof document === 'undefined') return;
    const root = document.documentElement;
    const d = this.settingsData() || {};

    const primaryColor = themeData.primaryColor || '#2563EB';
    const secondaryColor = themeData.secondaryColor || '#7C3AED';
    const accentColor = themeData.accentColor || '#3B82F6';
    
    // Gradient Angle
    let angle = themeData.gradientAngle !== undefined ? themeData.gradientAngle : '135';
    if (typeof angle === 'number' || !String(angle).endsWith('deg')) {
      angle = `${angle}deg`;
    }

    // Border Radius
    const borderRadius = themeData.borderRadius || '0.75rem';

    // Hover Effect (brightness or custom transform)
    const hoverEffect = themeData.hoverEffect || 'brightness(1.15) scale(1.02)';

    // Gradient build
    const gradSettings = d.gradientSettings || {};
    const gradColor = gradSettings.gradientColor || secondaryColor;
    let gradient = gradSettings.gradient || `linear-gradient(${angle}, ${primaryColor}, ${gradColor})`;

    // Theme active mode colors
    const isDarkMode = themeData.darkMode || false;
    const lightColors = d.lightThemeColors || {};
    const darkColors = d.darkThemeColors || {};
    const actColors = isDarkMode ? darkColors : lightColors;

    const finalPrimary = actColors.primary || primaryColor;
    const finalSecondary = actColors.secondary || secondaryColor;
    const finalAccent = actColors.accent || accentColor;

    root.style.setProperty('--primary-color', finalPrimary);
    root.style.setProperty('--secondary-color', finalSecondary);
    root.style.setProperty('--accent-color', finalAccent);
    root.style.setProperty('--gradient-angle', angle);
    root.style.setProperty('--theme-radius', borderRadius);
    root.style.setProperty('--theme-gradient', gradient);
    root.style.setProperty('--theme-text', themeData.themeText || '#ffffff');
    root.style.setProperty('--theme-hover-effect', hoverEffect);
    
    // Compatibility variables
    root.style.setProperty('--color-primary', finalPrimary);
    root.style.setProperty('--color-secondary', finalSecondary);

    // Apply variables to body class for Dark Mode if enabled
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
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

  getFaqs() {
    return this.faqs();
  }
}
