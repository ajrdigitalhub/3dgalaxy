import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PwaService } from '../../../core/services/pwa.service';

@Component({
  selector: 'app-admin-pwa-dashboard-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 p-6 shadow-xs space-y-6 font-sans">
      
      <!-- Card Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-850">
        <div class="flex items-center gap-4">
          <div class="relative w-14 h-14 rounded-2xl bg-zinc-950 p-2.5 border border-zinc-800 shadow-md shrink-0 flex items-center justify-center">
            <img src="/3d-logo.png" alt="3D Galaxy Admin" class="w-full h-full object-contain">
            <span [class.bg-emerald-500]="pwa.isOnline()" [class.bg-amber-500]="!pwa.isOnline()" class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900"></span>
          </div>

          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-black uppercase text-zinc-900 dark:text-white tracking-tight">Application Installation Hub</h2>
              
              <!-- Install Status Badge -->
              <span *ngIf="pwa.isInstalled()" class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                <mat-icon class="text-xs w-3 h-3 flex items-center justify-center">verified</mat-icon>
                <span>Installed (Standalone)</span>
              </span>
              <span *ngIf="!pwa.isInstalled() && pwa.isInstallable()" class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1 animate-pulse">
                <mat-icon class="text-xs w-3 h-3 flex items-center justify-center">get_app</mat-icon>
                <span>Ready to Install</span>
              </span>
              <span *ngIf="!pwa.isInstalled() && !pwa.isInstallable()" class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 flex items-center gap-1">
                <mat-icon class="text-xs w-3 h-3 flex items-center justify-center">open_in_browser</mat-icon>
                <span>Browser Portal Mode</span>
              </span>

              <!-- Environment Badge -->
              <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
                {{ env.name }}
              </span>
            </div>

            <p class="text-xs text-zinc-500 dark:text-zinc-400">PWA seller portal controls, update manager, and offline cache diagnostics.</p>
          </div>
        </div>

        <!-- Quick Status Metrics Summary -->
        <div class="flex items-center gap-4 text-xs">
          <div class="text-right hidden sm:block">
            <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Cache Storage</span>
            <span class="font-black text-zinc-900 dark:text-white">{{ pwa.cacheSizeMB() }} MB</span>
          </div>
          <div class="text-right hidden sm:block">
            <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">SW Version</span>
            <span class="font-black text-zinc-900 dark:text-white">v1.4.2</span>
          </div>
        </div>
      </div>

      <!-- Main Status Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div class="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-850/60 space-y-1">
          <span class="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Portal Version</span>
          <div class="flex items-center gap-2">
            <mat-icon class="text-sm text-orange-500 w-4 h-4 flex items-center justify-center">token</mat-icon>
            <span class="text-sm font-black text-zinc-900 dark:text-white">v1.4.2</span>
          </div>
        </div>

        <div class="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-850/60 space-y-1">
          <span class="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Service Worker</span>
          <div class="flex items-center gap-2">
            <span [class.bg-emerald-500]="pwa.swRegistered()" [class.bg-red-500]="!pwa.swRegistered()" class="w-2 h-2 rounded-full"></span>
            <span class="text-xs font-black text-zinc-900 dark:text-white">{{ pwa.swRegistered() ? 'Active & Registered' : 'Not Active' }}</span>
          </div>
        </div>

        <div class="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-850/60 space-y-1">
          <span class="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Network Connection</span>
          <div class="flex items-center gap-2">
            <span [class.bg-emerald-500]="pwa.isOnline()" [class.bg-amber-500]="!pwa.isOnline()" class="w-2 h-2 rounded-full"></span>
            <span class="text-xs font-black text-zinc-900 dark:text-white">{{ pwa.isOnline() ? 'Online (High-Speed)' : 'Offline Mode' }}</span>
          </div>
        </div>

        <div class="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-850/60 space-y-1">
          <span class="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Last Storage Sync</span>
          <div class="flex items-center gap-2">
            <mat-icon class="text-sm text-zinc-400 w-4 h-4 flex items-center justify-center">schedule</mat-icon>
            <span class="text-xs font-black text-zinc-900 dark:text-white">{{ pwa.lastSyncTime() }}</span>
          </div>
        </div>

      </div>

      <!-- Action Buttons Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          
          <!-- Install App Button -->
          <button 
            (click)="pwa.promptInstall()"
            [disabled]="pwa.isInstalled() || pwa.installing()"
            [class.opacity-50]="pwa.isInstalled()"
            class="flex-1 sm:flex-none h-10 px-5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-none shadow-sm shadow-orange-500/20 active:scale-98 disabled:cursor-not-allowed"
          >
            <mat-icon class="text-sm w-4 h-4 flex items-center justify-center">get_app</mat-icon>
            <span>{{ pwa.isInstalled() ? 'App Installed' : (pwa.installing() ? 'Installing...' : 'Install App') }}</span>
          </button>

          <!-- Check for Updates Button -->
          <button 
            (click)="pwa.checkForUpdates()"
            [disabled]="pwa.checkingUpdate()"
            class="h-10 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer border-none"
          >
            <mat-icon [class.animate-spin]="pwa.checkingUpdate()" class="text-sm w-4 h-4 flex items-center justify-center">sync</mat-icon>
            <span>{{ pwa.checkingUpdate() ? 'Checking...' : 'Check Updates' }}</span>
          </button>

          <!-- Update Application Button (Conditional) -->
          <button 
            *ngIf="pwa.hasUpdate()"
            (click)="pwa.activateUpdate()"
            class="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer border-none shadow-sm animate-bounce"
          >
            <mat-icon class="text-sm w-4 h-4 flex items-center justify-center">system_update_alt</mat-icon>
            <span>Update Now (v1.4.2)</span>
          </button>

          <!-- Clear Cache Dropdown/Action -->
          <div class="relative group">
            <button 
              (click)="pwa.clearCache('all')"
              [disabled]="pwa.clearingCache()"
              class="h-10 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer border-none"
            >
              <mat-icon class="text-sm w-4 h-4 flex items-center justify-center">cleaning_services</mat-icon>
              <span>{{ pwa.clearingCache() ? 'Clearing...' : 'Clear Cache' }}</span>
            </button>
          </div>

          <!-- Refresh Service Worker -->
          <button 
            (click)="pwa.refreshServiceWorker()"
            class="h-10 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer border-none"
            title="Re-register Service Worker"
          >
            <mat-icon class="text-sm w-4 h-4 flex items-center justify-center">build</mat-icon>
          </button>
        </div>

        <button 
          (click)="showReleaseNotes.set(true)"
          class="h-10 px-4 text-orange-600 hover:text-orange-500 text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-transparent border-none ml-auto"
        >
          <mat-icon class="text-sm w-4 h-4 flex items-center justify-center">notes</mat-icon>
          <span>Release Notes</span>
        </button>
      </div>

      <!-- Collapsible System Diagnostic Specs -->
      <div class="pt-4 border-t border-zinc-100 dark:border-zinc-850">
        <button 
          (click)="showDiagnostics.set(!showDiagnostics())"
          class="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition bg-transparent border-none cursor-pointer"
        >
          <span class="flex items-center gap-2">
            <mat-icon class="text-sm w-4 h-4 flex items-center justify-center">developer_board</mat-icon>
            System Diagnostics & Device Specs
          </span>
          <mat-icon class="text-sm w-4 h-4 flex items-center justify-center">{{ showDiagnostics() ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>

        <div *ngIf="showDiagnostics()" class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div>
            <span class="text-[9px] font-bold text-zinc-400 block uppercase">Browser</span>
            <span class="font-bold text-zinc-800 dark:text-zinc-200">{{ sysInfo.browser }}</span>
          </div>
          <div>
            <span class="text-[9px] font-bold text-zinc-400 block uppercase">Device Category</span>
            <span class="font-bold text-zinc-800 dark:text-zinc-200">{{ sysInfo.device }}</span>
          </div>
          <div>
            <span class="text-[9px] font-bold text-zinc-400 block uppercase">Build Number</span>
            <span class="font-bold text-zinc-800 dark:text-zinc-200">{{ sysInfo.buildNumber }}</span>
          </div>
          <div>
            <span class="text-[9px] font-bold text-zinc-400 block uppercase">Manifest Status</span>
            <span class="font-bold text-emerald-500">{{ sysInfo.manifestStatus }}</span>
          </div>
        </div>
      </div>

      <!-- Release Notes Modal Dialog -->
      <div *ngIf="showReleaseNotes()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-zinc-900 max-w-lg w-full rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 animate-scaleUp">
          <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 class="text-base font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2">
              <mat-icon class="text-orange-500">new_releases</mat-icon>
              Release Notes (v1.4.2)
            </h3>
            <button (click)="showReleaseNotes.set(false)" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 bg-transparent border-none cursor-pointer">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="space-y-3 text-xs text-zinc-600 dark:text-zinc-300 max-h-80 overflow-y-auto pr-2 font-sans">
            <div class="space-y-1">
              <span class="font-black text-zinc-900 dark:text-white text-xs block">🚀 PWA Seller Hub Management</span>
              <p class="text-zinc-500 dark:text-zinc-400">Integrated full progressive web application controls for administrators, supporting offline diagnostics, custom install prompts, update checks, and storage purges.</p>
            </div>
            <div class="space-y-1">
              <span class="font-black text-zinc-900 dark:text-white text-xs block">📣 Push Notification Campaign Console</span>
              <p class="text-zinc-500 dark:text-zinc-400">Full marketing suite with automated scheduling, audience segmentation, Gemini AI copywriter, and dynamic product recommendation triggers.</p>
            </div>
            <div class="space-y-1">
              <span class="font-black text-zinc-900 dark:text-white text-xs block">🔒 Role-Based Privacy</span>
              <p class="text-zinc-500 dark:text-zinc-400">PWA installation management is restricted to authorized seller portal administrators.</p>
            </div>
          </div>

          <div class="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
            <button (click)="showReleaseNotes.set(false)" class="h-9 px-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-black uppercase text-xs rounded-xl border-none cursor-pointer">
              Close Notes
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class PwaDashboardCardComponent {
  pwa = inject(PwaService);

  showDiagnostics = signal<boolean>(false);
  showReleaseNotes = signal<boolean>(false);

  get env() {
    return this.pwa.getEnvironment();
  }

  get sysInfo() {
    return this.pwa.getSystemInfo();
  }
}
