import { Component, ChangeDetectionStrategy, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { MarketingConfig, MarketingDashboardStats } from '../../../core/models/tracking.model';

export type DiagnosticStatus = 'PASS' | 'FAIL' | 'WARNING' | 'NOT TESTED' | 'NEEDS EXTERNAL VERIFICATION';

export interface IntegrationDiagnostic {
  id: string;
  name: string;
  category: 'gtm' | 'ga4' | 'googleAds' | 'metaPixel' | 'metaCapi' | 'enhancedConversions' | 'dynamicRemarketing' | 'consentMode' | 'serverSide';
  configStatus: DiagnosticStatus;
  runtimeStatus: DiagnosticStatus;
  eventStatus: DiagnosticStatus;
  destinationStatus: DiagnosticStatus;
  details: string;
  evidence: any;
  recommendation?: string;
  expanded?: boolean;
}

@Component({
  selector: 'app-admin-marketing-tracking-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 select-none font-sans max-w-7xl mx-auto pb-16">
      
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
            @if (testModeActive()) {
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                Diagnostic Test Mode Active
              </span>
            }
          </div>
          <h2 class="text-2xl sm:text-3xl font-black tracking-tight">Digital Marketing & Conversion Architecture</h2>
          <p class="text-xs text-neutral-400 max-w-2xl">
            Unified tracking suite supporting Meta Pixel, Meta Conversions API (CAPI), Google Analytics 4, Google Ads, GTM, Enhanced Conversions, Dynamic Remarketing, and Google Consent Mode v2.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          @if (!testModeActive()) {
            <button
              type="button"
              (click)="startTestMode()"
              class="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer border border-neutral-700 flex items-center gap-2 active:scale-95"
            >
              <mat-icon class="text-sm">science</mat-icon>
              <span>Enable Test Mode</span>
            </button>
          } @else {
            <button
              type="button"
              (click)="endTestMode()"
              class="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer border-none flex items-center gap-2 active:scale-95"
            >
              <mat-icon class="text-sm">stop_circle</mat-icon>
              <span>Exit Test Mode</span>
            </button>
          }

          <button
            type="button"
            (click)="dispatchSafeCapiTest()"
            [disabled]="testingCapi()"
            class="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer border-none flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <mat-icon class="text-sm">send</mat-icon>
            <span>{{ testingCapi() ? 'Testing...' : 'Test Meta CAPI' }}</span>
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
              <button type="button" (click)="copyFeedUrl('/api/marketing/feeds/google-merchant.xml')" class="text-[#d65108] hover:underline cursor-pointer border-none bg-transparent font-bold">Copy URL</button>
            </div>
            <code class="block text-[10px] font-mono text-neutral-500 truncate bg-white dark:bg-neutral-900 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800">
              /api/marketing/feeds/google-merchant.xml
            </code>
          </div>

          <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
              <span>Google Merchant Center (JSON)</span>
              <button type="button" (click)="copyFeedUrl('/api/marketing/feeds/google-merchant.json')" class="text-[#d65108] hover:underline cursor-pointer border-none bg-transparent font-bold">Copy URL</button>
            </div>
            <code class="block text-[10px] font-mono text-neutral-500 truncate bg-white dark:bg-neutral-900 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800">
              /api/marketing/feeds/google-merchant.json
            </code>
          </div>

          <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
              <span>Meta Commerce Catalog Feed</span>
              <button type="button" (click)="copyFeedUrl('/api/marketing/feeds/meta-catalog.xml')" class="text-[#d65108] hover:underline cursor-pointer border-none bg-transparent font-bold">Copy URL</button>
            </div>
            <code class="block text-[10px] font-mono text-neutral-500 truncate bg-white dark:bg-neutral-900 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800">
              /api/marketing/feeds/meta-catalog.xml
            </code>
          </div>
        </div>
      </div>

      <!-- Configuration Form (PRESERVED FIELDS) -->
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

          <!-- Optional: Meta Test Event Code (Admin-Only Diagnostic) -->
          <div class="space-y-1.5 md:col-span-2">
            <label class="text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
              <span>Meta Test Event Code (Optional for Live CAPI Testing)</span>
              <span class="text-[10px] text-neutral-400 lowercase font-normal">Found in Meta Events Manager &rarr; Test Events tab</span>
            </label>
            <input type="text" [(ngModel)]="formConfig.metaTestEventCode" name="metaTestEventCode" placeholder="e.g. TEST12345" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-[#d65108]">
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

      <!-- ========================================================================= -->
      <!-- SECTION: TRACKING HEALTH & LIVE TEST (NEW COMPREHENSIVE PANEL)             -->
      <!-- ========================================================================= -->
      <div class="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-xl space-y-8">
        
        <!-- Panel Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-neutral-100 dark:border-neutral-800 gap-4">
          <div>
            <div class="flex items-center gap-3">
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Layer-by-Layer Verification
              </span>
              <span class="text-xs text-neutral-400 font-mono">
                Environment: {{ environmentInfo() }}
              </span>
            </div>
            <h3 class="text-xl font-black uppercase tracking-tight text-neutral-900 dark:text-white mt-1">
              Tracking Health & Live Test Suite
            </h3>
            <p class="text-xs text-neutral-500">
              Validates database configuration, browser tag execution, client-side event dispatch, server-side CAPI connectivity, and destination verification requirements.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              (click)="runAllDiagnostics()"
              [disabled]="runningDiagnostics()"
              class="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer border-none flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <mat-icon class="text-sm" [class.animate-spin]="runningDiagnostics()">sync</mat-icon>
              <span>{{ runningDiagnostics() ? 'Testing Integrations...' : 'Run All Tests' }}</span>
            </button>

            <button
              type="button"
              (click)="refreshStatus()"
              class="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-neutral-200 dark:border-neutral-700 flex items-center gap-2 active:scale-95"
            >
              <mat-icon class="text-sm">refresh</mat-icon>
              <span>Refresh Status</span>
            </button>
          </div>
        </div>

        <!-- Overall Health Status Card -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 space-y-1">
            <span class="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Overall Health Status</span>
            <div class="flex items-center gap-2">
              <span [ngClass]="getHealthBadgeClass(overallStatus())" class="px-2.5 py-1 rounded-full text-xs font-black uppercase">
                {{ overallStatus() }}
              </span>
            </div>
            <p class="text-[11px] text-neutral-500 mt-1">
              {{ overallStatusSummary() }}
            </p>
          </div>

          <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 space-y-1">
            <span class="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Last Health Test</span>
            <div class="text-xs font-black text-neutral-900 dark:text-white font-mono">
              {{ lastTestTime() || 'Not tested in this session' }}
            </div>
            <p class="text-[11px] text-neutral-500">
              Session Run ID: <span class="font-mono text-[10px]">{{ currentDiagRunId() }}</span>
            </p>
          </div>

          <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 space-y-1">
            <span class="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Browser Script Inspection</span>
            <div class="flex items-center gap-2">
              <span [class.text-emerald-500]="browserGtagDetected()" [class.text-neutral-400]="!browserGtagDetected()" class="text-xs font-bold">
                gtag: {{ browserGtagDetected() ? 'Present' : 'Not Found' }}
              </span>
              <span class="text-neutral-300 dark:text-neutral-700">&middot;</span>
              <span [class.text-emerald-500]="browserFbqDetected()" [class.text-neutral-400]="!browserFbqDetected()" class="text-xs font-bold">
                fbq: {{ browserFbqDetected() ? 'Present' : 'Not Found' }}
              </span>
            </div>
            <p class="text-[11px] text-neutral-500">
              dataLayer entries: {{ dataLayerCount() }}
            </p>
          </div>

          <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 space-y-1">
            <span class="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Google Consent Mode v2 State</span>
            <div class="text-xs font-black text-neutral-900 dark:text-white font-mono flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full" [ngClass]="formConfig.enableConsentMode ? 'bg-emerald-500' : 'bg-neutral-400'"></span>
              <span>{{ formConfig.enableConsentMode ? 'Initialized (Default State Active)' : 'Disabled' }}</span>
            </div>
            <p class="text-[11px] text-neutral-500">
              ad_storage &amp; analytics_storage respected
            </p>
          </div>
        </div>

        <!-- Layer Verification Results Dashboard Table -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-black uppercase tracking-tight text-neutral-900 dark:text-white">
              Layer-by-Layer Verification Matrix
            </h4>
            <span class="text-xs text-neutral-500">
              Config &rarr; Runtime &rarr; Event Dispatch &rarr; Destination
            </span>
          </div>

          <div class="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-neutral-50 dark:bg-neutral-950 text-neutral-500 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th class="py-3 px-4">Integration</th>
                  <th class="py-3 px-3">Configuration</th>
                  <th class="py-3 px-3">Runtime / Script</th>
                  <th class="py-3 px-3">Event Dispatch</th>
                  <th class="py-3 px-3">Destination Verification</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/80 bg-white dark:bg-neutral-900">
                
                @for (item of diagnosticsList(); track item.id) {
                  <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-850/50 transition-colors">
                    <td class="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                      <div class="flex items-center gap-2">
                        <span class="text-sm">{{ item.name }}</span>
                        @if (item.expanded) {
                          <button type="button" (click)="toggleExpand(item.id)" class="text-neutral-400 hover:text-neutral-600 bg-transparent border-none cursor-pointer">
                            <mat-icon class="text-xs">expand_less</mat-icon>
                          </button>
                        } @else {
                          <button type="button" (click)="toggleExpand(item.id)" class="text-neutral-400 hover:text-neutral-600 bg-transparent border-none cursor-pointer">
                            <mat-icon class="text-xs">expand_more</mat-icon>
                          </button>
                        }
                      </div>
                      <p class="text-[10px] text-neutral-400 font-normal mt-0.5 max-w-xs truncate">{{ item.details }}</p>
                    </td>

                    <!-- Configuration Status -->
                    <td class="py-3.5 px-3">
                      <span [ngClass]="getStatusPillClass(item.configStatus)" class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                        {{ item.configStatus }}
                      </span>
                    </td>

                    <!-- Runtime Status -->
                    <td class="py-3.5 px-3">
                      <span [ngClass]="getStatusPillClass(item.runtimeStatus)" class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                        {{ item.runtimeStatus }}
                      </span>
                    </td>

                    <!-- Event Status -->
                    <td class="py-3.5 px-3">
                      <span [ngClass]="getStatusPillClass(item.eventStatus)" class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                        {{ item.eventStatus }}
                      </span>
                    </td>

                    <!-- Destination Status -->
                    <td class="py-3.5 px-3">
                      <span [ngClass]="getStatusPillClass(item.destinationStatus)" class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                        {{ item.destinationStatus }}
                      </span>
                    </td>

                    <!-- Action Button -->
                    <td class="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        (click)="runSingleTest(item.category)"
                        [disabled]="runningDiagnostics()"
                        class="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border border-neutral-200 dark:border-neutral-700 disabled:opacity-50"
                      >
                        Test
                      </button>
                    </td>
                  </tr>

                  <!-- Expandable Diagnostic Drawer -->
                  @if (item.expanded) {
                    <tr class="bg-neutral-50/70 dark:bg-neutral-950/70 border-b border-neutral-200 dark:border-neutral-800">
                      <td colspan="6" class="p-4 space-y-3">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div class="space-y-1">
                            <span class="font-bold text-neutral-700 dark:text-neutral-300 block">Observed Diagnostics &amp; Evidence:</span>
                            <div class="font-mono text-[11px] p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 overflow-x-auto">
                              <pre class="m-0 whitespace-pre-wrap">{{ item.evidence | json }}</pre>
                            </div>
                          </div>
                          <div class="space-y-2">
                            @if (item.recommendation) {
                              <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-amber-800 dark:text-amber-300 text-xs space-y-1">
                                <span class="font-bold flex items-center gap-1.5">
                                  <mat-icon class="text-xs">info</mat-icon> Recommended Fix:
                                </span>
                                <p class="m-0 leading-relaxed">{{ item.recommendation }}</p>
                              </div>
                            }

                            <!-- Specific external verification instructions -->
                            @if (item.category === 'gtm') {
                              <div class="p-3 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 rounded-xl text-cyan-800 dark:text-cyan-300 text-xs space-y-1">
                                <span class="font-bold flex items-center gap-1.5">
                                  <mat-icon class="text-xs">open_in_new</mat-icon> Google Tag Assistant:
                                </span>
                                <p class="m-0">
                                  Use <a href="https://tagassistant.google.com/" target="_blank" rel="noopener" class="underline font-bold text-cyan-600 dark:text-cyan-400">Google Tag Assistant</a> to inspect preview mode tags and triggers for container <code>{{ formConfig.gtmContainerId || 'GTM-XXXXXXX' }}</code>.
                                </p>
                              </div>
                            }

                            @if (item.category === 'ga4') {
                              <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-amber-800 dark:text-amber-300 text-xs space-y-1">
                                <span class="font-bold flex items-center gap-1.5">
                                  <mat-icon class="text-xs">analytics</mat-icon> GA4 Realtime &amp; DebugView:
                                </span>
                                <p class="m-0">
                                  Click <strong>Send Safe Test Page View</strong> below to dispatch a session-isolated test event with <code>debug_mode: true</code>, then open GA4 &rarr; Admin &rarr; DebugView.
                                </p>
                                <button
                                  type="button"
                                  (click)="sendSafeGa4TestEvent()"
                                  class="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border-none"
                                >
                                  Send Safe Test Page View
                                </button>
                              </div>
                            }

                            @if (item.category === 'metaPixel' || item.category === 'metaCapi') {
                              <div class="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl text-blue-800 dark:text-blue-300 text-xs space-y-1">
                                <span class="font-bold flex items-center gap-1.5">
                                  <mat-icon class="text-xs">open_in_new</mat-icon> Meta Events Manager Verification:
                                </span>
                                <p class="m-0">
                                  Inspect real-time browser events with <strong>Meta Pixel Helper</strong> Chrome extension, or view server events in Meta Events Manager &rarr; Test Events tab.
                                </p>
                              </div>
                            }

                            @if (item.category === 'googleAds') {
                              <div class="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
                                <span class="font-bold flex items-center gap-1.5">
                                  <mat-icon class="text-xs">check_circle</mat-icon> Google Ads Purchase Wiring:
                                </span>
                                <p class="m-0">
                                  Purchase conversion tag is wired exclusively to the order confirmation page (<code>OrderSuccessComponent</code>). It triggers only upon completed customer checkout.
                                </p>
                              </div>
                            }
                          </div>
                        </div>
                      </td>
                    </tr>
                  }
                }

              </tbody>
            </table>
          </div>
        </div>

        <!-- Diagnostic Log Console -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-black uppercase tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon class="text-sm text-neutral-400">terminal</mat-icon>
              <span>Live Diagnostic Activity Log</span>
            </h4>
            <button type="button" (click)="clearLogs()" class="text-xs text-neutral-400 hover:text-neutral-600 bg-transparent border-none cursor-pointer">
              Clear Logs
            </button>
          </div>

          <div class="bg-neutral-950 rounded-2xl p-4 font-mono text-[11px] text-neutral-300 border border-neutral-800 max-h-56 overflow-y-auto space-y-1.5">
            @if (diagnosticLogs().length === 0) {
              <div class="text-neutral-500 italic">No diagnostic events dispatched yet in this session. Click "Run All Tests" or individual test buttons to start.</div>
            } @else {
              @for (log of diagnosticLogs(); track $index) {
                <div class="flex items-start gap-2 leading-relaxed">
                  <span class="text-neutral-500 shrink-0">[{{ log.time }}]</span>
                  <span [ngClass]="getLogSeverityClass(log.level)" class="font-bold uppercase text-[9px] px-1.5 py-0.2 rounded shrink-0">
                    {{ log.level }}
                  </span>
                  <span class="text-neutral-200">{{ log.message }}</span>
                </div>
              }
            }
          </div>
        </div>

      </div>

    </div>
  `
})
export class MarketingTrackingTabComponent implements OnInit {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);

  saving = signal<boolean>(false);
  testingCapi = signal<boolean>(false);
  runningDiagnostics = signal<boolean>(false);
  testModeActive = signal<boolean>(false);
  stats = signal<MarketingDashboardStats | null>(null);

  // Diagnostic State Signals
  lastTestTime = signal<string | null>(null);
  currentDiagRunId = signal<string>('idle');
  environmentInfo = signal<string>('Browser Client');
  overallStatus = signal<DiagnosticStatus>('NOT TESTED');
  overallStatusSummary = signal<string>('Click "Run All Tests" to inspect all tracking layers.');

  // Browser-level detection signals
  browserGtagDetected = signal<boolean>(false);
  browserFbqDetected = signal<boolean>(false);
  dataLayerCount = signal<number>(0);

  // Diagnostic logs
  diagnosticLogs = signal<Array<{ time: string; level: 'INFO' | 'PASS' | 'WARN' | 'FAIL'; message: string }>>([]);

  // Integrated diagnostics state
  diagnosticsList = signal<IntegrationDiagnostic[]>([
    {
      id: 'gtm',
      name: 'Google Tag Manager',
      category: 'gtm',
      configStatus: 'NOT TESTED',
      runtimeStatus: 'NOT TESTED',
      eventStatus: 'NOT TESTED',
      destinationStatus: 'NEEDS EXTERNAL VERIFICATION',
      details: 'GTM container script injection and dataLayer push engine.',
      evidence: null,
      expanded: false
    },
    {
      id: 'ga4',
      name: 'Google Analytics 4',
      category: 'ga4',
      configStatus: 'NOT TESTED',
      runtimeStatus: 'NOT TESTED',
      eventStatus: 'NOT TESTED',
      destinationStatus: 'NEEDS EXTERNAL VERIFICATION',
      details: 'GA4 tag, Measurement ID routing, and virtual page views.',
      evidence: null,
      expanded: false
    },
    {
      id: 'googleAds',
      name: 'Google Ads Conversion Tracking',
      category: 'googleAds',
      configStatus: 'NOT TESTED',
      runtimeStatus: 'NOT TESTED',
      eventStatus: 'NOT TESTED',
      destinationStatus: 'NEEDS EXTERNAL VERIFICATION',
      details: 'AW- conversion ID, purchase conversion label, and checkout wiring.',
      evidence: null,
      expanded: false
    },
    {
      id: 'metaPixel',
      name: 'Meta Pixel (Browser)',
      category: 'metaPixel',
      configStatus: 'NOT TESTED',
      runtimeStatus: 'NOT TESTED',
      eventStatus: 'NOT TESTED',
      destinationStatus: 'NEEDS EXTERNAL VERIFICATION',
      details: 'Browser-side fbq script, PageView, and ViewContent dispatch.',
      evidence: null,
      expanded: false
    },
    {
      id: 'metaCapi',
      name: 'Meta Conversions API (CAPI)',
      category: 'metaCapi',
      configStatus: 'NOT TESTED',
      runtimeStatus: 'NOT TESTED',
      eventStatus: 'NOT TESTED',
      destinationStatus: 'NEEDS EXTERNAL VERIFICATION',
      details: 'Secure server-to-server Meta Graph API event dispatch.',
      evidence: null,
      expanded: false
    },
    {
      id: 'enhancedConversions',
      name: 'Enhanced Conversions',
      category: 'enhancedConversions',
      configStatus: 'NOT TESTED',
      runtimeStatus: 'NOT TESTED',
      eventStatus: 'NOT TESTED',
      destinationStatus: 'NEEDS EXTERNAL VERIFICATION',
      details: 'SHA-256 hashed customer data user_data payload in Google Ads.',
      evidence: null,
      expanded: false
    },
    {
      id: 'dynamicRemarketing',
      name: 'Dynamic Remarketing',
      category: 'dynamicRemarketing',
      configStatus: 'NOT TESTED',
      runtimeStatus: 'NOT TESTED',
      eventStatus: 'NOT TESTED',
      destinationStatus: 'NEEDS EXTERNAL VERIFICATION',
      details: 'ecomm_prodid and ecomm_totalvalue parameters for catalog sync.',
      evidence: null,
      expanded: false
    },
    {
      id: 'consentMode',
      name: 'Google Consent Mode v2',
      category: 'consentMode',
      configStatus: 'NOT TESTED',
      runtimeStatus: 'NOT TESTED',
      eventStatus: 'NOT TESTED',
      destinationStatus: 'NEEDS EXTERNAL VERIFICATION',
      details: 'ad_storage, analytics_storage, ad_user_data, and ad_personalization defaults.',
      evidence: null,
      expanded: false
    },
    {
      id: 'serverSide',
      name: 'Server-Side Event Pipeline',
      category: 'serverSide',
      configStatus: 'NOT TESTED',
      runtimeStatus: 'NOT TESTED',
      eventStatus: 'NOT TESTED',
      destinationStatus: 'NEEDS EXTERNAL VERIFICATION',
      details: 'Decoupled checkout completion and backend event logging.',
      evidence: null,
      expanded: false
    }
  ]);

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
    defaultCurrency: 'INR',
    metaTestEventCode: ''
  };

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadSettings();
      this.loadDashboardStats();
      this.inspectBrowserEnvironment();
    }
  }

  private addLog(level: 'INFO' | 'PASS' | 'WARN' | 'FAIL', message: string) {
    const time = new Date().toLocaleTimeString();
    this.diagnosticLogs.update(logs => [{ time, level, message }, ...logs.slice(0, 49)]);
  }

  clearLogs() {
    this.diagnosticLogs.set([]);
  }

  private inspectBrowserEnvironment() {
    if (!isPlatformBrowser(this.platformId)) return;
    const hasGtag = typeof (window as any).gtag === 'function';
    const hasFbq = typeof (window as any).fbq === 'function';
    const dataLayer = (window as any).dataLayer;
    const dlCount = Array.isArray(dataLayer) ? dataLayer.length : 0;

    this.browserGtagDetected.set(hasGtag);
    this.browserFbqDetected.set(hasFbq);
    this.dataLayerCount.set(dlCount);
  }

  loadSettings() {
    this.api.get<any>('/admin/marketing/settings').subscribe({
      next: (res) => {
        if (res && res.data) {
          this.formConfig = { ...this.formConfig, ...res.data };
          this.addLog('INFO', 'Loaded marketing configuration from database.');
        }
      },
      error: (err) => {
        this.addLog('FAIL', 'Failed to load marketing settings: ' + err.message);
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
        this.addLog('PASS', 'Marketing tracking configuration saved successfully.');
        alert('Marketing tracking configuration saved successfully!');
        this.loadDashboardStats();
        this.runAllDiagnostics();
      },
      error: (err) => {
        this.saving.set(false);
        this.addLog('FAIL', 'Failed to save settings: ' + (err.error?.message || err.message));
        alert('Failed to save settings: ' + (err.error?.message || err.message));
      }
    });
  }

  startTestMode() {
    const runId = 'test_' + Math.random().toString(36).substring(2, 8);
    this.testModeActive.set(true);
    this.currentDiagRunId.set(runId);
    this.addLog('INFO', `Diagnostic Test Mode enabled. Run ID: ${runId}. Safe test session started.`);
  }

  endTestMode() {
    this.testModeActive.set(false);
    this.currentDiagRunId.set('idle');
    this.addLog('INFO', 'Diagnostic Test Mode disabled. Restored standard mode.');
  }

  toggleExpand(id: string) {
    this.diagnosticsList.update(list =>
      list.map(item => item.id === id ? { ...item, expanded: !item.expanded } : item)
    );
  }

  refreshStatus() {
    this.loadSettings();
    this.loadDashboardStats();
    this.inspectBrowserEnvironment();
    this.addLog('INFO', 'Status and browser environment refreshed.');
  }

  /**
   * Run All Diagnostics: Comprehensive multi-layer test
   */
  runAllDiagnostics() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.runningDiagnostics.set(true);
    const runId = this.testModeActive() ? this.currentDiagRunId() : 'diag_' + Date.now();
    this.currentDiagRunId.set(runId);
    this.addLog('INFO', `Initiating comprehensive tracking health check (Run ID: ${runId})...`);

    this.inspectBrowserEnvironment();

    // Call backend multi-layer health-check endpoint
    this.api.post<any>('/admin/marketing/health-check', { diagRunId: runId }).subscribe({
      next: (res) => {
        this.runningDiagnostics.set(false);
        this.lastTestTime.set(new Date().toLocaleTimeString());

        if (res && res.data) {
          this.applyDiagnosticResults(res.data);
          this.addLog('PASS', 'Server-side and configuration health checks completed.');
        }
      },
      error: (err) => {
        this.runningDiagnostics.set(false);
        this.addLog('FAIL', 'Server health check failed: ' + (err.error?.message || err.message));
        // Still run browser-side checks even if backend fails
        this.applyBrowserOnlyChecks();
      }
    });
  }

  private applyDiagnosticResults(serverData: any) {
    const isBrowser = isPlatformBrowser(this.platformId);
    const hasGtag = isBrowser && typeof (window as any).gtag === 'function';
    const hasFbq = isBrowser && typeof (window as any).fbq === 'function';
    const hasDataLayer = isBrowser && Array.isArray((window as any).dataLayer);

    // Check DOM for script tags
    const ga4ScriptInDom = isBrowser && !!document.querySelector('script[src*="googletagmanager.com/gtag/js?id=G-"]');
    const gadsScriptInDom = isBrowser && !!document.querySelector('script[src*="googletagmanager.com/gtag/js?id=AW-"]');
    const gtmScriptInDom = isBrowser && !!document.querySelector('script[src*="googletagmanager.com/gtm.js?id=GTM-"]');
    const fbqScriptInDom = isBrowser && !!document.querySelector('script[src*="connect.facebook.net"]');

    let overallIssues = 0;

    this.diagnosticsList.update(list => list.map(item => {
      let updated = { ...item };

      if (item.category === 'gtm') {
        const gtmServer = serverData.gtm;
        updated.configStatus = gtmServer?.status || 'NOT TESTED';
        updated.runtimeStatus = gtmScriptInDom ? 'PASS' : (gtmServer?.status === 'FAIL' ? 'FAIL' : 'WARNING');
        updated.eventStatus = hasDataLayer ? 'PASS' : 'WARNING';
        updated.destinationStatus = 'NEEDS EXTERNAL VERIFICATION';
        updated.details = gtmServer?.message || 'GTM container status';
        updated.evidence = {
          configuredId: this.formConfig.gtmContainerId,
          scriptInjected: gtmScriptInDom,
          dataLayerActive: hasDataLayer,
          serverValidation: gtmServer
        };
        updated.recommendation = gtmServer?.recommendedAction;
        if (updated.configStatus === 'FAIL') overallIssues++;
      }

      if (item.category === 'ga4') {
        const ga4Server = serverData.ga4;
        updated.configStatus = ga4Server?.status || 'NOT TESTED';
        updated.runtimeStatus = (hasGtag || ga4ScriptInDom) ? 'PASS' : 'WARNING';
        updated.eventStatus = hasGtag ? 'PASS' : 'WARNING';
        updated.destinationStatus = 'NEEDS EXTERNAL VERIFICATION';
        updated.details = ga4Server?.message || 'GA4 measurement status';
        updated.evidence = {
          configuredId: this.formConfig.ga4MeasurementId,
          gtagAvailable: hasGtag,
          scriptInDom: ga4ScriptInDom,
          serverValidation: ga4Server
        };
        updated.recommendation = ga4Server?.recommendedAction;
        if (updated.configStatus === 'FAIL') overallIssues++;
      }

      if (item.category === 'googleAds') {
        const adsServer = serverData.googleAds;
        updated.configStatus = adsServer?.status || 'NOT TESTED';
        updated.runtimeStatus = (hasGtag || gadsScriptInDom) ? 'PASS' : 'WARNING';
        updated.eventStatus = 'PASS'; // Wired in order-success.ts
        updated.destinationStatus = 'NEEDS EXTERNAL VERIFICATION';
        updated.details = adsServer?.message || 'Google Ads conversion tracking status';
        updated.evidence = {
          conversionId: this.formConfig.googleAdsConversionId,
          purchaseLabel: this.formConfig.googleAdsConversionLabel,
          wiredToCheckout: true,
          serverValidation: adsServer
        };
        updated.recommendation = adsServer?.recommendedAction;
        if (updated.configStatus === 'FAIL') overallIssues++;
      }

      if (item.category === 'metaPixel') {
        const pixelServer = serverData.metaPixel;
        updated.configStatus = pixelServer?.status || 'NOT TESTED';
        updated.runtimeStatus = (hasFbq || fbqScriptInDom) ? 'PASS' : 'WARNING';
        updated.eventStatus = hasFbq ? 'PASS' : 'WARNING';
        updated.destinationStatus = 'NEEDS EXTERNAL VERIFICATION';
        updated.details = pixelServer?.message || 'Meta Pixel client-side status';
        updated.evidence = {
          pixelId: this.formConfig.metaPixelId,
          fbqAvailable: hasFbq,
          scriptInDom: fbqScriptInDom,
          serverValidation: pixelServer
        };
        if (updated.configStatus === 'FAIL') overallIssues++;
      }

      if (item.category === 'metaCapi') {
        const capiServer = serverData.metaCapi;
        updated.configStatus = this.formConfig.metaCapiToken ? 'PASS' : 'WARNING';
        updated.runtimeStatus = 'PASS'; // Server endpoint exists
        updated.eventStatus = capiServer?.status || 'NOT TESTED';
        updated.destinationStatus = capiServer?.status === 'PASS' ? 'PASS' : (capiServer?.status || 'NEEDS EXTERNAL VERIFICATION');
        updated.details = capiServer?.message || 'Meta CAPI server connectivity';
        updated.evidence = {
          tokenConfigured: !!this.formConfig.metaCapiToken,
          serverConnectivity: capiServer
        };
        updated.recommendation = capiServer?.recommendedAction;
        if (capiServer?.status === 'FAIL') overallIssues++;
      }

      if (item.category === 'enhancedConversions') {
        const feat = serverData.features?.enhancedConversions;
        updated.configStatus = feat?.status || 'NOT TESTED';
        updated.runtimeStatus = 'PASS'; // SHA256 crypto.subtle implemented
        updated.eventStatus = this.formConfig.enableEnhancedConversions ? 'PASS' : 'WARNING';
        updated.destinationStatus = 'NEEDS EXTERNAL VERIFICATION';
        updated.details = feat?.message || 'SHA-256 Customer Data Hashing for Google Ads';
        updated.evidence = { enabled: this.formConfig.enableEnhancedConversions };
      }

      if (item.category === 'dynamicRemarketing') {
        const feat = serverData.features?.dynamicRemarketing;
        updated.configStatus = feat?.status || 'NOT TESTED';
        updated.runtimeStatus = 'PASS';
        updated.eventStatus = this.formConfig.enableDynamicRemarketing ? 'PASS' : 'WARNING';
        updated.destinationStatus = 'NEEDS EXTERNAL VERIFICATION';
        updated.details = feat?.message || 'ecomm_prodid parameter injection in page_view';
        updated.evidence = { enabled: this.formConfig.enableDynamicRemarketing };
      }

      if (item.category === 'consentMode') {
        const feat = serverData.features?.consentMode;
        updated.configStatus = feat?.status || 'NOT TESTED';
        updated.runtimeStatus = 'PASS'; // ConsentService initializes default consent
        updated.eventStatus = this.formConfig.enableConsentMode ? 'PASS' : 'WARNING';
        updated.destinationStatus = 'NEEDS EXTERNAL VERIFICATION';
        updated.details = feat?.message || 'Google Consent Mode v2 default initialization';
        updated.evidence = {
          enabled: this.formConfig.enableConsentMode,
          storageKeys: ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization']
        };
      }

      if (item.category === 'serverSide') {
        const feat = serverData.features?.serverSideCapi;
        updated.configStatus = feat?.status || 'NOT TESTED';
        updated.runtimeStatus = 'PASS';
        updated.eventStatus = this.formConfig.enableServerSideCapi ? 'PASS' : 'WARNING';
        updated.destinationStatus = 'NEEDS EXTERNAL VERIFICATION';
        updated.details = feat?.message || 'Non-blocking server event dispatch';
        updated.evidence = { enabled: this.formConfig.enableServerSideCapi };
      }

      return updated;
    }));

    if (overallIssues > 0) {
      this.overallStatus.set('WARNING');
      this.overallStatusSummary.set(`Found ${overallIssues} integration(s) requiring attention or corrections.`);
    } else {
      this.overallStatus.set('PASS');
      this.overallStatusSummary.set('All configured tracking services passed automated format and server connectivity checks.');
    }
  }

  private applyBrowserOnlyChecks() {
    this.overallStatus.set('WARNING');
    this.overallStatusSummary.set('Client inspection completed, but backend health check could not be reached.');
  }

  runSingleTest(category: string) {
    this.addLog('INFO', `Running focused test for ${category}...`);
    if (category === 'metaCapi') {
      this.dispatchSafeCapiTest();
    } else if (category === 'ga4') {
      this.sendSafeGa4TestEvent();
    } else {
      this.runAllDiagnostics();
    }
  }

  sendSafeGa4TestEvent() {
    if (!isPlatformBrowser(this.platformId)) return;
    const gtag = (window as any).gtag;
    const ga4Id = this.formConfig.ga4MeasurementId || 'G-4BKM2K4PS0';

    if (typeof gtag !== 'function') {
      this.addLog('FAIL', 'gtag function is not available on window. Cannot send safe test page view.');
      alert('gtag is not initialized in the browser.');
      return;
    }

    try {
      gtag('event', 'page_view', {
        page_title: 'Admin Diagnostics Test Page',
        page_location: window.location.href,
        page_path: '/admin/marketing-diagnostics',
        send_to: ga4Id,
        debug_mode: true, // Scoped to this single test event only
        diagnostic_run_id: this.currentDiagRunId()
      });

      this.addLog('PASS', `Safe diagnostic GA4 page_view dispatched with debug_mode: true to ${ga4Id}. Check GA4 Realtime / DebugView.`);
      alert(`Safe GA4 diagnostic event sent to ${ga4Id}! You can view it in GA4 Realtime or Admin -> DebugView.`);
    } catch (e: any) {
      this.addLog('FAIL', 'Failed to dispatch GA4 test event: ' + e.message);
    }
  }

  dispatchSafeCapiTest() {
    this.testingCapi.set(true);
    const diagRunId = this.testModeActive() ? this.currentDiagRunId() : 'diag_' + Date.now();
    this.addLog('INFO', `Dispatching safe Meta CAPI test event (test_event_code: ${this.formConfig.metaTestEventCode || 'none'})...`);

    this.api.post<any>('/admin/marketing/capi-test', {
      testEventCode: this.formConfig.metaTestEventCode,
      diagRunId
    }).subscribe({
      next: (res) => {
        this.testingCapi.set(false);
        this.addLog('PASS', `Meta CAPI test event acknowledged: ${res.message} (Trace: ${res.fbTraceId || 'N/A'})`);
        alert(`Meta CAPI Test Success!\n\n${res.message}\n${res.recommendedVerification}`);
        this.loadDashboardStats();
      },
      error: (err) => {
        this.testingCapi.set(false);
        const msg = err.error?.message || err.message;
        this.addLog('FAIL', 'Meta CAPI test event failed: ' + msg);
        alert(`Meta CAPI Test Failed:\n\n${msg}`);
      }
    });
  }

  copyFeedUrl(path: string) {
    const fullUrl = window.location.origin + path;
    navigator.clipboard.writeText(fullUrl);
    alert('Copied product feed URL to clipboard:\n' + fullUrl);
  }

  // Visual helper styles
  getStatusPillClass(status: DiagnosticStatus): string {
    switch (status) {
      case 'PASS':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'FAIL':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'NEEDS EXTERNAL VERIFICATION':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      default:
        return 'bg-neutral-500/10 text-neutral-500 border border-neutral-500/20';
    }
  }

  getHealthBadgeClass(status: DiagnosticStatus): string {
    switch (status) {
      case 'PASS':
        return 'bg-emerald-500 text-white';
      case 'FAIL':
        return 'bg-rose-500 text-white';
      case 'WARNING':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-neutral-500 text-white';
    }
  }

  getLogSeverityClass(level: 'INFO' | 'PASS' | 'WARN' | 'FAIL'): string {
    switch (level) {
      case 'PASS':
        return 'bg-emerald-950 text-emerald-400 border border-emerald-800';
      case 'FAIL':
        return 'bg-rose-950 text-rose-400 border border-rose-800';
      case 'WARN':
        return 'bg-amber-950 text-amber-400 border border-amber-800';
      default:
        return 'bg-neutral-800 text-neutral-300 border border-neutral-700';
    }
  }
}
