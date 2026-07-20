import { Component, ChangeDetectionStrategy, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { MarketingConfig, MarketingDashboardStats } from '../../../core/models/tracking.model';

@Component({
  selector: 'app-admin-marketing-tracking-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 select-none font-sans max-w-7xl mx-auto pb-12">
      
      <!-- Header Banner -->
      <div class="bg-linear-to-r from-neutral-900 via-neutral-850 to-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/30">
              Omnichannel Tracking Engine
            </span>
            <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              SSR & CAPI Ready
            </span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black tracking-tight">Digital Marketing & Conversion Architecture</h2>
          <p class="text-xs text-neutral-400 max-w-2xl">
            Unified tracking suite supporting Meta Pixel, Meta Conversions API (CAPI), Google Analytics 4, Google Ads, GTM, Enhanced Conversions, Dynamic Remarketing, and Google Consent Mode v2.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="sendTestEvent()"
            [disabled]="sendingTestEvent()"
            class="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer border-none flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <mat-icon class="text-sm">send</mat-icon>
            <span>{{ sendingTestEvent() ? 'Dispatching...' : 'Send Test CAPI Event' }}</span>
          </button>
        </div>
      </div>

      <!-- Live Channel Status Cards Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div class="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-neutral-500">
            <span class="font-bold">Meta Pixel</span>
            <mat-icon class="text-sm text-blue-500">public</mat-icon>
          </div>
          <div class="flex items-center gap-2">
            <span [ngClass]="{'bg-emerald-500': stats()?.metaPixelStatus === 'active', 'bg-neutral-400': stats()?.metaPixelStatus !== 'active'}" class="w-2.5 h-2.5 rounded-full animate-pulse"></span>
            <span class="text-xs font-black uppercase dark:text-white">{{ stats()?.metaPixelStatus || 'Checking...' }}</span>
          </div>
        </div>

        <div class="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-neutral-500">
            <span class="font-bold">Meta CAPI</span>
            <mat-icon class="text-sm text-indigo-500">dns</mat-icon>
          </div>
          <div class="flex items-center gap-2">
            <span [ngClass]="{'bg-emerald-500': stats()?.metaCapiStatus === 'active', 'bg-neutral-400': stats()?.metaCapiStatus !== 'active'}" class="w-2.5 h-2.5 rounded-full animate-pulse"></span>
            <span class="text-xs font-black uppercase dark:text-white">{{ stats()?.metaCapiStatus || 'Checking...' }}</span>
          </div>
        </div>

        <div class="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-neutral-500">
            <span class="font-bold">Google GA4</span>
            <mat-icon class="text-sm text-amber-500">analytics</mat-icon>
          </div>
          <div class="flex items-center gap-2">
            <span [ngClass]="{'bg-emerald-500': stats()?.ga4Status === 'active', 'bg-neutral-400': stats()?.ga4Status !== 'active'}" class="w-2.5 h-2.5 rounded-full animate-pulse"></span>
            <span class="text-xs font-black uppercase dark:text-white">{{ stats()?.ga4Status || 'Checking...' }}</span>
          </div>
        </div>

        <div class="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-neutral-500">
            <span class="font-bold">Google Ads</span>
            <mat-icon class="text-sm text-emerald-500">ads_click</mat-icon>
          </div>
          <div class="flex items-center gap-2">
            <span [ngClass]="{'bg-emerald-500': stats()?.googleAdsStatus === 'active', 'bg-neutral-400': stats()?.googleAdsStatus !== 'active'}" class="w-2.5 h-2.5 rounded-full animate-pulse"></span>
            <span class="text-xs font-black uppercase dark:text-white">{{ stats()?.googleAdsStatus || 'Checking...' }}</span>
          </div>
        </div>

        <div class="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-neutral-500">
            <span class="font-bold">Google GTM</span>
            <mat-icon class="text-sm text-cyan-500">extension</mat-icon>
          </div>
          <div class="flex items-center gap-2">
            <span [ngClass]="{'bg-emerald-500': stats()?.gtmStatus === 'active', 'bg-neutral-400': stats()?.gtmStatus !== 'active'}" class="w-2.5 h-2.5 rounded-full animate-pulse"></span>
            <span class="text-xs font-black uppercase dark:text-white">{{ stats()?.gtmStatus || 'Checking...' }}</span>
          </div>
        </div>

        <div class="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-neutral-500">
            <span class="font-bold">Events Today</span>
            <mat-icon class="text-sm text-orange-500">insights</mat-icon>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-lg font-black text-[#d65108]">{{ stats()?.totalEventsSentToday || 0 }}</span>
          </div>
        </div>

      </div>

      <!-- Merchant & Catalog Product Feed Generator URLs -->
      <div class="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-6">
        <div class="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 class="text-lg font-black uppercase tracking-tight text-neutral-900 dark:text-white">Product Feed Generator (Merchant Center & Meta Catalog)</h3>
            <p class="text-xs text-neutral-500">Dynamic product catalog URLs for Google Merchant Center and Meta Commerce Manager.</p>
          </div>
          <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">Auto Sync</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
              <span>Google Merchant Center (XML)</span>
              <button (click)="copyFeedUrl('/api/marketing/feeds/google-merchant.xml')" class="text-[#d65108] hover:underline cursor-pointer border-none bg-transparent font-bold">Copy URL</button>
            </div>
            <code class="block text-[10px] font-mono text-neutral-500 truncate bg-white dark:bg-neutral-900 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800">
              /api/marketing/feeds/google-merchant.xml
            </code>
          </div>

          <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
              <span>Google Merchant Center (JSON)</span>
              <button (click)="copyFeedUrl('/api/marketing/feeds/google-merchant.json')" class="text-[#d65108] hover:underline cursor-pointer border-none bg-transparent font-bold">Copy URL</button>
            </div>
            <code class="block text-[10px] font-mono text-neutral-500 truncate bg-white dark:bg-neutral-900 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800">
              /api/marketing/feeds/google-merchant.json
            </code>
          </div>

          <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
              <span>Meta Commerce Catalog Feed</span>
              <button (click)="copyFeedUrl('/api/marketing/feeds/meta-catalog.xml')" class="text-[#d65108] hover:underline cursor-pointer border-none bg-transparent font-bold">Copy URL</button>
            </div>
            <code class="block text-[10px] font-mono text-neutral-500 truncate bg-white dark:bg-neutral-900 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800">
              /api/marketing/feeds/meta-catalog.xml
            </code>
          </div>

        </div>
      </div>

      <!-- Configuration Form -->
      <form (submit)="saveSettings($event)" class="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-8">
        
        <div class="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 class="text-lg font-black uppercase tracking-tight text-neutral-900 dark:text-white">Marketing & Pixel Credentials</h3>
            <p class="text-xs text-neutral-500">Configure tracking parameters and API tokens. Changes apply dynamically storefront-wide.</p>
          </div>
          
          <label class="flex items-center gap-3 cursor-pointer">
            <span class="text-xs font-bold text-neutral-600 dark:text-neutral-400">Global Tracking Enabled</span>
            <input type="checkbox" [(ngModel)]="formConfig.enabled" name="enabled" class="w-5 h-5 accent-[#d65108]">
          </label>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <!-- Meta Pixel ID -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300">Meta Pixel ID (Facebook / Instagram)</label>
            <input type="text" [(ngModel)]="formConfig.metaPixelId" name="metaPixelId" placeholder="e.g. 123456789012345" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-[#d65108]">
          </div>

          <!-- Meta CAPI Access Token -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300">Meta Conversions API (CAPI) Access Token</label>
            <input type="password" [(ngModel)]="formConfig.metaCapiToken" name="metaCapiToken" placeholder="EAAXXXXXXX..." class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-[#d65108]">
          </div>

          <!-- GA4 Measurement ID -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300">Google Analytics 4 (GA4) Measurement ID</label>
            <input type="text" [(ngModel)]="formConfig.ga4MeasurementId" name="ga4MeasurementId" placeholder="e.g. G-XXXXXXXXXX" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-[#d65108]">
          </div>

          <!-- Google Ads Conversion ID -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300">Google Ads Conversion ID</label>
            <input type="text" [(ngModel)]="formConfig.googleAdsConversionId" name="googleAdsConversionId" placeholder="e.g. AW-123456789" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-[#d65108]">
          </div>

          <!-- Google Ads Purchase Label -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300">Google Ads Purchase Conversion Label</label>
            <input type="text" [(ngModel)]="formConfig.googleAdsConversionLabel" name="googleAdsConversionLabel" placeholder="e.g. AbCdEfGhIjK" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-[#d65108]">
          </div>

          <!-- Google Tag Manager Container ID -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300">Google Tag Manager (GTM) Container ID</label>
            <input type="text" [(ngModel)]="formConfig.gtmContainerId" name="gtmContainerId" placeholder="e.g. GTM-XXXXXXX" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-[#d65108]">
          </div>

        </div>

        <!-- Feature Toggles Grid -->
        <div class="pt-4 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          <label class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 flex items-center justify-between cursor-pointer">
            <div class="space-y-0.5">
              <span class="text-xs font-bold text-neutral-900 dark:text-white block">Enhanced Conversions</span>
              <span class="text-[10px] text-neutral-400 block">SHA-256 Hashed Customer Data</span>
            </div>
            <input type="checkbox" [(ngModel)]="formConfig.enableEnhancedConversions" name="enableEnhancedConversions" class="w-4 h-4 accent-[#d65108]">
          </label>

          <label class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 flex items-center justify-between cursor-pointer">
            <div class="space-y-0.5">
              <span class="text-xs font-bold text-neutral-900 dark:text-white block">Dynamic Remarketing</span>
              <span class="text-[10px] text-neutral-400 block">ecomm_prodid Parameters</span>
            </div>
            <input type="checkbox" [(ngModel)]="formConfig.enableDynamicRemarketing" name="enableDynamicRemarketing" class="w-4 h-4 accent-[#d65108]">
          </label>

          <label class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 flex items-center justify-between cursor-pointer">
            <div class="space-y-0.5">
              <span class="text-xs font-bold text-neutral-900 dark:text-white block">Google Consent Mode v2</span>
              <span class="text-[10px] text-neutral-400 block">EU GDPR & Privacy Defaults</span>
            </div>
            <input type="checkbox" [(ngModel)]="formConfig.enableConsentMode" name="enableConsentMode" class="w-4 h-4 accent-[#d65108]">
          </label>

          <label class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 flex items-center justify-between cursor-pointer">
            <div class="space-y-0.5">
              <span class="text-xs font-bold text-neutral-900 dark:text-white block">Server-Side CAPI</span>
              <span class="text-[10px] text-neutral-400 block">Meta Server Event Dispatch</span>
            </div>
            <input type="checkbox" [(ngModel)]="formConfig.enableServerSideCapi" name="enableServerSideCapi" class="w-4 h-4 accent-[#d65108]">
          </label>

        </div>

        <div class="flex justify-end pt-4">
          <button
            type="submit"
            [disabled]="saving()"
            class="px-8 py-3 bg-[#d65108] hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer border-none flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <mat-icon class="text-sm">save</mat-icon>
            <span>{{ saving() ? 'Saving Changes...' : 'Save Marketing Configuration' }}</span>
          </button>
        </div>

      </form>

    </div>
  `
})
export class MarketingTrackingTabComponent implements OnInit {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);

  saving = signal<boolean>(false);
  sendingTestEvent = signal<boolean>(false);
  stats = signal<MarketingDashboardStats | null>(null);

  formConfig: MarketingConfig = {
    enabled: true,
    metaPixelId: '',
    metaCapiToken: '',
    metaCatalogId: '',
    ga4MeasurementId: '',
    googleAdsConversionId: '',
    googleAdsConversionLabel: '',
    googleAdsLeadLabel: '',
    gtmContainerId: '',
    googleMerchantCenterId: '',
    enableEnhancedConversions: true,
    enableDynamicRemarketing: true,
    enableConsentMode: true,
    enableServerSideCapi: true,
    debugMode: false,
    defaultCurrency: 'INR'
  };

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadSettings();
      this.loadDashboardStats();
    }
  }

  loadSettings() {
    this.api.get<any>('/admin/marketing/settings').subscribe({
      next: (res) => {
        if (res && res.data) {
          this.formConfig = { ...this.formConfig, ...res.data };
        }
      }
    });
  }

  loadDashboardStats() {
    this.api.get<any>('/admin/marketing/dashboard-stats').subscribe({
      next: (res) => {
        if (res && res.data) {
          this.stats.set(res.data);
        }
      }
    });
  }

  saveSettings(event: Event) {
    event.preventDefault();
    this.saving.set(true);
    this.api.put('/admin/marketing/settings', this.formConfig).subscribe({
      next: () => {
        this.saving.set(false);
        alert('Marketing tracking configuration saved successfully!');
        this.loadDashboardStats();
      },
      error: (err) => {
        this.saving.set(false);
        alert('Failed to save settings: ' + (err.error?.message || err.message));
      }
    });
  }

  sendTestEvent() {
    this.sendingTestEvent.set(true);
    const testPayload = {
      eventName: 'TestConversion',
      eventId: 'test_' + Date.now(),
      customData: { value: 999, currency: 'INR', note: 'Admin Panel Test Event' },
      userData: { email: 'test@3dgalaxy.in', phone: '+919999999999' }
    };

    this.api.post('/marketing/meta-capi', testPayload).subscribe({
      next: () => {
        this.sendingTestEvent.set(false);
        alert('Test CAPI conversion event dispatched successfully!');
        this.loadDashboardStats();
      },
      error: (err) => {
        this.sendingTestEvent.set(false);
        alert('Failed to send test event: ' + (err.error?.message || err.message));
      }
    });
  }

  copyFeedUrl(path: string) {
    const fullUrl = window.location.origin + path;
    navigator.clipboard.writeText(fullUrl);
    alert('Copied product feed URL to clipboard:\n' + fullUrl);
  }
}
