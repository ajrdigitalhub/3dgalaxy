import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PwaService, PwaSettings, DEFAULT_PWA_SETTINGS } from '../../../core/services/pwa.service';

@Component({
  selector: 'app-admin-pwa-settings-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fadeIn pb-12 font-sans max-w-5xl">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-xs">
        <div>
          <h1 class="text-xl font-black uppercase text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            PWA Configuration & Installation Settings
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
              Admin Control
            </span>
          </h1>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Configure environment restrictions, caching strategies, offline access, and auto-update rules for the PWA portal.</p>
        </div>

        <div class="flex items-center gap-3">
          <button 
            (click)="resetDefaults()"
            class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider transition border-none cursor-pointer"
          >
            Reset Defaults
          </button>
          <button 
            (click)="save()"
            class="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition border-none cursor-pointer shadow-md shadow-orange-500/20 active:scale-98 flex items-center gap-2"
          >
            <mat-icon class="text-sm">save</mat-icon>
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      <!-- Settings Cards Form -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- 1. General & Installation Controls -->
        <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-xs space-y-4">
          <h2 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-850">
            <mat-icon class="text-orange-500 text-sm">settings</mat-icon>
            General & Installation Controls
          </h2>

          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-850/50">
              <div>
                <span class="text-xs font-bold text-zinc-900 dark:text-white block">Enable PWA Module</span>
                <span class="text-[10px] text-zinc-500">Enable progressive web app features for administrators.</span>
              </div>
              <input type="checkbox" [(ngModel)]="formSettings.enablePwa" class="w-5 h-5 accent-orange-600 cursor-pointer">
            </div>

            <div class="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-850/50">
              <div>
                <span class="text-xs font-bold text-zinc-900 dark:text-white block">Show Install App Button</span>
                <span class="text-[10px] text-zinc-500">Render native PWA install button in Admin Dashboard widget.</span>
              </div>
              <input type="checkbox" [(ngModel)]="formSettings.enableInstallButton" class="w-5 h-5 accent-orange-600 cursor-pointer">
            </div>

            <div class="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-850/50">
              <div>
                <span class="text-xs font-bold text-zinc-900 dark:text-white block">Allow Offline Mode</span>
                <span class="text-[10px] text-zinc-500">Cache essential static assets for offline admin navigation.</span>
              </div>
              <input type="checkbox" [(ngModel)]="formSettings.allowOfflineMode" class="w-5 h-5 accent-orange-600 cursor-pointer">
            </div>

            <div class="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-850/50">
              <div>
                <span class="text-xs font-bold text-zinc-900 dark:text-white block">Background Sync</span>
                <span class="text-[10px] text-zinc-500">Queue pending admin offline actions for automatic background sync.</span>
              </div>
              <input type="checkbox" [(ngModel)]="formSettings.enableBackgroundSync" class="w-5 h-5 accent-orange-600 cursor-pointer">
            </div>
          </div>
        </div>

        <!-- 2. Update & Caching Strategy -->
        <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-xs space-y-4">
          <h2 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-850">
            <mat-icon class="text-orange-500 text-sm">cached</mat-icon>
            Update & Cache Policies
          </h2>

          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-850/50">
              <div>
                <span class="text-xs font-bold text-zinc-900 dark:text-white block">Auto Background Update</span>
                <span class="text-[10px] text-zinc-500">Automatically check and prepare new service worker builds.</span>
              </div>
              <input type="checkbox" [(ngModel)]="formSettings.autoUpdate" class="w-5 h-5 accent-orange-600 cursor-pointer">
            </div>

            <div class="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-850/50">
              <div>
                <span class="text-xs font-bold text-zinc-900 dark:text-white block">Force Update On Outdated Version</span>
                <span class="text-[10px] text-zinc-500">Prompt administrators immediately if critical security build released.</span>
              </div>
              <input type="checkbox" [(ngModel)]="formSettings.forceUpdate" class="w-5 h-5 accent-orange-600 cursor-pointer">
            </div>

            <div class="space-y-1 pt-1">
              <label class="text-xs font-bold text-zinc-900 dark:text-white block">Cache Strategy Policy</label>
              <select [(ngModel)]="formSettings.cacheStrategy" class="w-full h-10 px-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-900 dark:text-white outline-none">
                <option value="network-first">Network-First (Recommended for Admin Data)</option>
                <option value="stale-while-revalidate">Stale-While-Revalidate (Balanced Speed)</option>
                <option value="cache-first">Cache-First (Maximum Offline Capability)</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-bold text-zinc-900 dark:text-white block">Install Card Theme Style</label>
              <select [(ngModel)]="formSettings.installBannerTheme" class="w-full h-10 px-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-900 dark:text-white outline-none">
                <option value="orange">3D Galaxy Signature Orange</option>
                <option value="dark">Dark Minimalist Slate</option>
                <option value="minimal">Compact Light Slate</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      <!-- 3. Allowed Environments -->
      <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-xs space-y-4">
        <h2 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-850">
          <mat-icon class="text-orange-500 text-sm">domain</mat-icon>
          Environment Permissions
        </h2>

        <p class="text-xs text-zinc-500 dark:text-zinc-400">Select host environments where PWA installation and caching commands are permitted for administrators.</p>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <label *ngFor="let env of availableEnvironments" class="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-850/50 cursor-pointer select-none">
            <input 
              type="checkbox" 
              [checked]="isEnvSelected(env.id)" 
              (change)="toggleEnv(env.id)" 
              class="w-4 h-4 accent-orange-600 cursor-pointer"
            >
            <div>
              <span class="text-xs font-bold text-zinc-900 dark:text-white block">{{ env.label }}</span>
              <span class="text-[9px] font-mono text-zinc-400">{{ env.hostPattern }}</span>
            </div>
          </label>
        </div>
      </div>

    </div>
  `
})
export class PwaSettingsTabComponent implements OnInit {
  pwa = inject(PwaService);

  formSettings: PwaSettings = { ...DEFAULT_PWA_SETTINGS };

  availableEnvironments = [
    { id: 'localhost', label: 'Local Development', hostPattern: 'localhost / 127.0.0.1' },
    { id: 'dev', label: 'Development Node', hostPattern: '*.dev.3dgalaxy.in' },
    { id: 'uat', label: 'UAT Staging', hostPattern: '*.uat.3dgalaxy.in' },
    { id: 'production', label: 'Production Hub', hostPattern: '3dgalaxy.in / admin' }
  ];

  ngOnInit() {
    this.formSettings = { ...this.pwa.pwaSettings() };
  }

  isEnvSelected(envId: string): boolean {
    return this.formSettings.allowedEnvironments.includes(envId);
  }

  toggleEnv(envId: string) {
    if (this.isEnvSelected(envId)) {
      this.formSettings.allowedEnvironments = this.formSettings.allowedEnvironments.filter(e => e !== envId);
    } else {
      this.formSettings.allowedEnvironments = [...this.formSettings.allowedEnvironments, envId];
    }
  }

  resetDefaults() {
    this.formSettings = { ...DEFAULT_PWA_SETTINGS };
  }

  save() {
    this.pwa.saveSettings(this.formSettings);
  }
}
