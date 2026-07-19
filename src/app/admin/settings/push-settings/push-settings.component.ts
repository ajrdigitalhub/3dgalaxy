import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SettingsService } from '../../shared/services/settings.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-push-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto p-6">
      
      <!-- Premium Breadcrumb Header -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-400">
          <span>Settings</span>
          <mat-icon class="scale-50">chevron_right</mat-icon>
          <span class="text-[#f54f00]">Push Notifications</span>
        </div>
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Push Settings</h1>
          <button (click)="save()" 
                  [disabled]="saving()"
                  class="h-11 px-8 bg-[#f54f00] hover:bg-orange-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-transform hover:scale-[1.02] flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <mat-icon class="scale-90" *ngIf="!saving()">save</mat-icon>
            <span>{{ saving() ? 'Saving...' : 'Save Settings' }}</span>
          </button>
        </div>
      </div>

      <!-- Main Config Grid -->
      <form [formGroup]="form" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Left 2 Cols: API credentials & configurations -->
        <div class="md:col-span-2 space-y-6">
          
          <!-- General toggle & service credentials card -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 sm:p-8 shadow-xs">
            <h3 class="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <mat-icon class="text-[#f54f00]">api</mat-icon>
              Firebase Credentials
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              <!-- Active toggle -->
              <div class="sm:col-span-2 flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <div>
                  <h4 class="font-bold text-sm text-neutral-900 dark:text-white">Enable Push Notification Service</h4>
                  <p class="text-xs text-neutral-500 mt-0.5">Toggle web push features on/off globally across the app.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" formControlName="enabled" class="sr-only peer">
                  <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-[#f54f00]"></div>
                </label>
              </div>

              <!-- Project ID -->
              <div class="space-y-1.5">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Firebase Project ID</label>
                <input type="text" formControlName="projectId" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

              <!-- App ID -->
              <div class="space-y-1.5">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Firebase App ID</label>
                <input type="text" formControlName="appId" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

              <!-- API Key -->
              <div class="space-y-1.5">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">API Key</label>
                <input type="password" formControlName="apiKey" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

              <!-- Sender ID -->
              <div class="space-y-1.5">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Sender ID</label>
                <input type="text" formControlName="senderId" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

              <!-- VAPID Key -->
              <div class="sm:col-span-2 space-y-1.5">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">VAPID Key (Web Push Link)</label>
                <input type="text" formControlName="vapidKey" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-mono font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

            </div>
          </div>

          <!-- Notification defaults card -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 sm:p-8 shadow-xs">
            <h3 class="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <mat-icon class="text-[#f54f00]">notifications</mat-icon>
              Default Payload Configs
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              <!-- Default Icon URL -->
              <div class="space-y-1.5">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Default Notification Icon</label>
                <input type="text" formControlName="defaultIcon" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

              <!-- Default Click Action -->
              <div class="space-y-1.5">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Default Redirect Route</label>
                <input type="text" formControlName="defaultClickAction" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

              <!-- Default Image URL -->
              <div class="sm:col-span-2 space-y-1.5">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Default Banner Image URL</label>
                <input type="text" formControlName="defaultImage" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

            </div>
          </div>

        </div>

        <!-- Right 1 Col: TTL, vibration, sound, triggers -->
        <div class="space-y-6">
          
          <!-- UX & Timing configuration card -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 shadow-xs space-y-5">
            <h3 class="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <mat-icon class="text-[#f54f00]">tune</mat-icon>
              UX & Expiry
            </h3>

            <div class="space-y-4">
              
              <!-- Expiry TTL -->
              <div class="space-y-1">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Time-to-Live (TTL - seconds)</label>
                <input type="number" formControlName="ttl" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

              <!-- Auto close duration -->
              <div class="space-y-1">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Auto Close Duration (ms)</label>
                <input type="number" formControlName="autoCloseDuration" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

              <!-- Sound Toggle -->
              <div class="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <h4 class="font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white">Enable Sound</h4>
                  <p class="text-[10px] text-neutral-450 mt-0.5">Play default alert tone on push arrival.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" formControlName="soundEnabled" class="sr-only peer">
                  <div class="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-[#f54f00]"></div>
                </label>
              </div>

              <!-- Vibration Toggle -->
              <div class="flex items-center justify-between py-2">
                <div>
                  <h4 class="font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white">Vibration Haptics</h4>
                  <p class="text-[10px] text-neutral-450 mt-0.5">Vibrate mobile devices on delivery.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" formControlName="vibrationEnabled" class="sr-only peer">
                  <div class="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-[#f54f00]"></div>
                </label>
              </div>

            </div>
          </div>

          <!-- Notification Trigger types -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 class="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <mat-icon class="text-[#f54f00]">campaign</mat-icon>
              Auto-Trigger Targets
            </h3>
            
            <div formGroupName="types" class="space-y-3">
              @for (type of triggerTypes; track type) {
                <div class="flex items-center justify-between py-1">
                  <span class="text-xs font-bold text-neutral-750 dark:text-neutral-300">{{ type }}</span>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" [formControlName]="type" class="sr-only peer">
                    <div class="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-[#f54f00]"></div>
                  </label>
                </div>
              }
            </div>
          </div>

        </div>

      </form>

    </div>
  `
})
export class PushSettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  form!: FormGroup;
  saving = signal(false);

  triggerTypes = [
    'User Registers',
    'User Logs In',
    'Order Placed',
    'Order Confirmed',
    'Payment Completed',
    'Payment Failed',
    'Order Cancelled',
    'Order Delivered',
    'Refund Initiated',
    'Refund Completed',
    'Wishlist Price Drop',
    'Product Back in Stock',
    'New Product Added',
    'Flash Sale Starts',
    'Offer Campaign'
  ];

  ngOnInit() {
    // Load existing settings
    const activeSettings = this.settingsService.settings();
    const config = activeSettings.pushNotifications || {};

    const typeGroup: Record<string, any> = {};
    this.triggerTypes.forEach(t => {
      typeGroup[t] = [config.types?.[t] !== false]; // Default to true if not configured
    });

    this.form = this.fb.group({
      enabled: [config.enabled || false],
      projectId: [config.projectId || 'manifest-replica-3lkqp'],
      apiKey: [config.apiKey || 'AIzaSyAhMymmsQh5hvLg-hiWtNMqYCwPiZkSWYY'],
      senderId: [config.senderId || '13671'],
      vapidKey: [config.vapidKey || 'BEl62wpCL7jH7QNSTWmK8t0dIL60VwU5B564U829s29528s0921509215'],
      appId: [config.appId || '1:13671285845:web:d590ce7b58aadc0dcf00dc'],
      defaultIcon: [config.defaultIcon || '/favicon.ico'],
      defaultClickAction: [config.defaultClickAction || '/'],
      defaultImage: [config.defaultImage || ''],
      ttl: [config.ttl || 86400],
      autoCloseDuration: [config.autoCloseDuration || 10000],
      soundEnabled: [config.soundEnabled !== false],
      vibrationEnabled: [config.vibrationEnabled !== false],
      types: this.fb.group(typeGroup)
    });
  }

  save() {
    this.saving.set(true);
    const updatedPayload = {
      pushNotifications: this.form.value
    };

    this.settingsService.updateSettings(updatedPayload).then(() => {
      this.toastService.success('Push notification settings updated successfully.');
    }).catch(err => {
      this.toastService.error(`Failed to save settings: ${err.message}`);
    }).finally(() => {
      this.saving.set(false);
    });
  }
}
