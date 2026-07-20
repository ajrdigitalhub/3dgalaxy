import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../shared/components/toast/toast.service';

export interface PwaSettings {
  enablePwa: boolean;
  enableInstallButton: boolean;
  allowOfflineMode: boolean;
  enableBackgroundSync: boolean;
  enablePushNotifications: boolean;
  autoUpdate: boolean;
  forceUpdate: boolean;
  cacheStrategy: 'network-first' | 'cache-first' | 'stale-while-revalidate';
  installBannerTheme: 'dark' | 'orange' | 'minimal';
  allowedEnvironments: string[];
}

export const DEFAULT_PWA_SETTINGS: PwaSettings = {
  enablePwa: true,
  enableInstallButton: true,
  allowOfflineMode: true,
  enableBackgroundSync: true,
  enablePushNotifications: true,
  autoUpdate: true,
  forceUpdate: false,
  cacheStrategy: 'network-first',
  installBannerTheme: 'orange',
  allowedEnvironments: ['localhost', 'dev', 'uat', 'production']
};

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  private deferredPrompt: any = null;
  private swRegistration: ServiceWorkerRegistration | null = null;

  // Reactive Signals
  isSupported = signal<boolean>(false);
  isInstallable = signal<boolean>(false);
  isInstalled = signal<boolean>(false);
  isOnline = signal<boolean>(true);
  swRegistered = signal<boolean>(false);
  hasUpdate = signal<boolean>(false);
  cacheSizeMB = signal<number>(0.0);
  lastSyncTime = signal<string>(new Date().toLocaleTimeString());
  pwaSettings = signal<PwaSettings>(DEFAULT_PWA_SETTINGS);
  
  installing = signal<boolean>(false);
  checkingUpdate = signal<boolean>(false);
  clearingCache = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initPWA();
    }
  }

  private initPWA() {
    // 1. Detect Network Online/Offline
    this.isOnline.set(navigator.onLine);
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.toast.info('Network Connection Restored');
    });
    window.addEventListener('offline', () => {
      this.isOnline.set(false);
      this.toast.warning('Offline Mode Active');
    });

    // 2. Detect Standalone Display Mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (navigator as any).standalone === true ||
                        document.referrer.includes('android-app://');
    if (isStandalone) {
      this.isInstalled.set(true);
    }

    // 3. Listen for Install Prompt (beforeinstallprompt)
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.isInstallable.set(true);
    });

    // 4. Listen for App Installed Event
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isInstallable.set(false);
      this.isInstalled.set(true);
      this.toast.success('PWA Installed Successfully on Device');
      this.logAuditAction('INSTALL_PWA', { mode: 'browser_event' });
    });

    // 5. Initialize Service Worker if Supported
    if ('serviceWorker' in navigator) {
      this.isSupported.set(true);
      this.registerServiceWorker();
    }

    // 6. Calculate initial Cache Size
    this.calculateCacheSize();

    // 7. Load PWA Settings from Backend
    this.loadSettings();
  }

  private registerServiceWorker() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        this.swRegistration = reg;
        this.swRegistered.set(true);

        // Listen for new SW update
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.hasUpdate.set(true);
                this.toast.info('A new application update is available!');
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('[PWA Service] Service Worker registration failed:', err);
        this.swRegistered.set(false);
      });
  }

  // Trigger Native Install Prompt
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      this.toast.info('PWA Installation is managed by your browser or app is already installed.');
      return false;
    }

    this.installing.set(true);
    try {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        this.toast.success('Application installed to home screen!');
        this.isInstallable.set(false);
        this.isInstalled.set(true);
        this.deferredPrompt = null;
        this.logAuditAction('INSTALL_PWA', { outcome: 'accepted' });
        return true;
      } else {
        this.toast.info('Installation request was cancelled.');
        this.logAuditAction('INSTALL_PWA', { outcome: 'dismissed' });
        return false;
      }
    } catch (err: any) {
      this.toast.error('Failed to trigger PWA installation: ' + err.message);
      return false;
    } finally {
      this.installing.set(false);
    }
  }

  // Manual Check for Updates
  async checkForUpdates() {
    this.checkingUpdate.set(true);
    try {
      if (this.swRegistration) {
        await this.swRegistration.update();
        this.toast.success('Update check complete. You are running the latest version.');
      } else {
        this.toast.info('Service Worker not registered in current environment.');
      }
    } catch (err: any) {
      this.toast.error('Update check failed: ' + err.message);
    } finally {
      this.checkingUpdate.set(false);
      this.lastSyncTime.set(new Date().toLocaleTimeString());
    }
  }

  // Activate Application Update
  activateUpdate() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ action: 'SKIP_WAITING' });
    }
    this.logAuditAction('UPDATE_APP', { version: 'v1.4.2' });
    window.location.reload();
  }

  // Refresh Service Worker Registration
  async refreshServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
      this.swRegistered.set(false);
      await this.registerServiceWorker();
      this.toast.success('Service Worker re-registered successfully.');
      this.logAuditAction('REFRESH_SERVICE_WORKER', {});
    } catch (err: any) {
      this.toast.error('Failed to refresh Service Worker: ' + err.message);
    }
  }

  // Cache Management
  async clearCache(type: 'all' | 'api' | 'images' = 'all') {
    this.clearingCache.set(true);
    try {
      if ('caches' in window) {
        if (type === 'all') {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
          this.api.clearCache();
          this.toast.success('All application & API caches cleared successfully.');
        } else if (type === 'api') {
          this.api.clearCache();
          const keys = await caches.keys();
          const apiKeys = keys.filter(k => k.includes('api'));
          await Promise.all(apiKeys.map(k => caches.delete(k)));
          this.toast.success('API Cache cleared successfully.');
        } else if (type === 'images') {
          const keys = await caches.keys();
          const imgKeys = keys.filter(k => k.includes('images'));
          await Promise.all(imgKeys.map(k => caches.delete(k)));
          this.toast.success('Image Cache cleared successfully.');
        }
      }
      await this.calculateCacheSize();
      this.logAuditAction('CLEAR_CACHE', { type });
    } catch (err: any) {
      this.toast.error('Failed to clear cache: ' + err.message);
    } finally {
      this.clearingCache.set(false);
      this.lastSyncTime.set(new Date().toLocaleTimeString());
    }
  }

  // Calculate Cache Storage Estimate
  async calculateCacheSize() {
    if (isPlatformBrowser(this.platformId) && 'storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageMB = (estimate.usage || 0) / (1024 * 1024);
        this.cacheSizeMB.set(parseFloat(usageMB.toFixed(2)));
      } catch (e) {
        this.cacheSizeMB.set(0.0);
      }
    }
  }

  // Environment Helper
  getEnvironment(): { name: string; color: string } {
    if (!isPlatformBrowser(this.platformId)) return { name: 'Server SSR', color: 'gray' };
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return { name: 'Local Development', color: 'emerald' };
    } else if (host.includes('dev') || host.includes('stage')) {
      return { name: 'Development / Staging', color: 'blue' };
    } else if (host.includes('uat')) {
      return { name: 'UAT Environment', color: 'amber' };
    } else {
      return { name: 'Production Hub', color: 'purple' };
    }
  }

  // System Diagnostics Meta Info
  getSystemInfo() {
    if (!isPlatformBrowser(this.platformId)) return {};
    const ua = navigator.userAgent;
    let browser = 'Chrome';
    if (ua.includes('Edg')) browser = 'Microsoft Edge';
    else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Apple Safari';
    else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';

    return {
      appVersion: 'v1.4.2',
      buildNumber: '2026.07.20.104',
      environment: this.getEnvironment().name,
      browser,
      os: navigator.platform || 'Unknown OS',
      device: /Mobile|Android|iPhone/i.test(ua) ? 'Mobile Device' : 'Desktop Workstation',
      serviceWorkerVersion: '1.4.2-sw',
      manifestStatus: 'Loaded & Active',
      installationStatus: this.isInstalled() ? 'Installed (Standalone)' : (this.isInstallable() ? 'Installable' : 'Browser Mode')
    };
  }

  // Backend Sync
  loadSettings() {
    this.api.get<any>('/admin/pwa/settings').subscribe({
      next: (res) => {
        if (res && res.data) {
          this.pwaSettings.set({ ...DEFAULT_PWA_SETTINGS, ...res.data });
        }
      },
      error: () => {
        // Fallback to defaults if endpoint not ready
      }
    });
  }

  saveSettings(newSettings: PwaSettings) {
    this.api.put<any>('/admin/pwa/settings', newSettings).subscribe({
      next: (res) => {
        this.pwaSettings.set(newSettings);
        this.toast.success('PWA Configuration Settings Saved');
        this.logAuditAction('UPDATE_PWA_SETTINGS', newSettings);
      },
      error: (err) => {
        this.toast.error('Failed to save PWA settings: ' + err.message);
      }
    });
  }

  private logAuditAction(action: string, payload: any) {
    this.api.post<any>('/admin/pwa/audit', { action, payload }).subscribe({
      next: () => {},
      error: () => {}
    });
  }
}
