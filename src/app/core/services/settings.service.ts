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

  // Easy accessors
  public theme = signal<any>({});
  public heroSlides = signal<any[]>([]);
  public footer = signal<any>({});
  public homepage = signal<any>({});
  public payment = signal<any>({});
  public security = signal<any>({});
  public contact = signal<any>({});
  public socialMedia = signal<any>({});

  async loadSettings(force = false) {
    if (this.isLoaded() && !force) return;
    
    try {
      const resp = await firstValueFrom(this.http.get<any>('/api/settings'));
      if (resp && resp.data) {
        this.settingsData.set(resp.data);
        
        // Update sub-signals
        if (resp.data.theme) this.theme.set(resp.data.theme);
        if (resp.data.heroSlides) this.heroSlides.set(resp.data.heroSlides);
        if (resp.data.footer) this.footer.set(resp.data.footer);
        if (resp.data.homepage) this.homepage.set(resp.data.homepage);
        if (resp.data.payment) this.payment.set(resp.data.payment);
        if (resp.data.security) this.security.set(resp.data.security);
        if (resp.data.contact) this.contact.set(resp.data.contact);
        if (resp.data.socialMedia) this.socialMedia.set(resp.data.socialMedia);

        this.applyTheme(resp.data.theme);
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
    if (!themeData) return;
    const root = document.documentElement;
    // We can map settings here to css variables
    if (themeData.primaryColor) {
      root.style.setProperty('--color-primary', themeData.primaryColor);
    }
    if (themeData.secondaryColor) {
      root.style.setProperty('--color-secondary', themeData.secondaryColor);
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
}
