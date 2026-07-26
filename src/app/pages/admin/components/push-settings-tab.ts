import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-push-settings-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="space-y-6 font-sans">
      
      <!-- Top Sub Tabs switcher -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 class="text-lg font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-orange-600/10 text-orange-500 flex items-center justify-center"><mat-icon>notifications_active</mat-icon></span>
            Push Marketing Control Hub
          </h2>
          <p class="text-xs text-zinc-400 mt-1">Configure Firebase settings, design popups, compose campaigns, and inspect subscriber analytics.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button (click)="activeSubTab.set('analytics')" [class]="activeSubTab() === 'analytics' ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs">Dashboard</button>
          <button (click)="activeSubTab.set('fcm-config')" [class]="activeSubTab() === 'fcm-config' ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-655 dark:text-zinc-300'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs">FCM Credentials</button>
          <button (click)="activeSubTab.set('popup-designer')" [class]="activeSubTab() === 'popup-designer' ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-655 dark:text-zinc-300'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs">Popup Designer</button>
          <button (click)="activeSubTab.set('manual-send')" [class]="activeSubTab() === 'manual-send' ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-655 dark:text-zinc-300'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs">Campaign Builder</button>
          <button (click)="activeSubTab.set('rules')" [class]="activeSubTab() === 'rules' ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-655 dark:text-zinc-300'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs">Auto Rules</button>
          <button (click)="activeSubTab.set('templates')" [class]="activeSubTab() === 'templates' ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-655 dark:text-zinc-300'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs">Templates</button>
        </div>
      </div>

      <!-- ANALYTICS DASHBOARD -->
      @if (activeSubTab() === 'analytics') {
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
            <span class="text-[9px] font-black uppercase text-zinc-400">Total Subscribers</span>
            <div class="flex items-baseline justify-between">
              <h3 class="text-2xl font-black">{{ analyticsSummary().totalDevices }}</h3>
              <span class="text-[9px] text-zinc-400 font-bold">Devices</span>
            </div>
          </div>
          <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
            <span class="text-[9px] font-black uppercase text-orange-500">Delivered Notifications</span>
            <div class="flex items-baseline justify-between">
              <h3 class="text-2xl font-black text-orange-500">{{ analyticsSummary().delivered }}</h3>
              <span class="text-[9px] text-zinc-400 font-bold">FCM Dispatch</span>
            </div>
          </div>
          <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
            <span class="text-[9px] font-black uppercase text-blue-500">Avg. Click-Through Rate</span>
            <div class="flex items-baseline justify-between">
              <h3 class="text-2xl font-black text-blue-500">{{ analyticsSummary().ctr }}%</h3>
              <span class="text-[9px] text-emerald-500 font-bold">Engagement</span>
            </div>
          </div>
          <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
            <span class="text-[9px] font-black uppercase text-emerald-500">Revenue Generated</span>
            <div class="flex items-baseline justify-between">
              <h3 class="text-2xl font-black text-emerald-500">₹{{ analyticsSummary().revenueGenerated || 0 }}</h3>
              <span class="text-[9px] text-zinc-400 font-bold">via UTM Campaign</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">FCM Engagement Trend (Last 15 Days)</h3>
              <span class="text-[9px] font-bold text-zinc-400">Pushes & Clicks</span>
            </div>
            
            <div class="h-56 flex items-end gap-3 pt-6 border-b border-zinc-200 dark:border-zinc-800">
              @if (dailyTrends().length === 0) {
                <div class="w-full h-full flex items-center justify-center text-xs text-zinc-400 uppercase font-black">No Trend Data Found</div>
              } @else {
                @for (trend of dailyTrends(); track trend.date) {
                  <div class="flex-1 flex flex-col items-center gap-2 group relative">
                    <div class="w-full bg-zinc-100 dark:bg-zinc-800 rounded-t-lg relative overflow-hidden" style="height: 140px;">
                      <!-- Sends bar -->
                      <div class="bg-orange-500/35 absolute bottom-0 left-0 right-0 rounded-t-md" [style.height.%]="getSendsPercent(trend.sends)"></div>
                      <!-- Clicks bar -->
                      <div class="bg-orange-600 absolute bottom-0 left-1 right-1 rounded-t-md" [style.height.%]="getClicksPercent(trend.clicks)"></div>
                    </div>
                    <span class="text-[8px] font-black uppercase text-zinc-400">{{ trend.date | date:'dd MMM' }}</span>
                  </div>
                }
              }
            </div>
            <div class="flex items-center gap-4 justify-center text-[10px]">
              <span class="flex items-center gap-1.5 font-bold"><span class="w-2.5 h-2.5 bg-orange-550/35 rounded-xs"></span> Dispatches</span>
              <span class="flex items-center gap-1.5 font-bold"><span class="w-2.5 h-2.5 bg-orange-600 rounded-xs"></span> Clicks</span>
            </div>
          </div>

          <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
            <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">Subscriber Split</h3>
            
            <div class="space-y-5">
              <div class="flex items-center justify-between text-xs">
                <span class="font-black text-zinc-400 uppercase text-[9px] flex items-center gap-2"><span class="w-2 h-2 bg-blue-500 rounded-full"></span> Guest Users</span>
                <span class="font-black text-zinc-800 dark:text-white">{{ subscriberSplit().guests }} Device(s)</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="font-black text-zinc-400 uppercase text-[9px] flex items-center gap-2"><span class="w-2 h-2 bg-emerald-500 rounded-full"></span> Registered Users</span>
                <span class="font-black text-zinc-800 dark:text-white">{{ subscriberSplit().registered }} Device(s)</span>
              </div>
              <div class="flex items-center justify-between text-xs border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <span class="font-black text-zinc-400 uppercase text-[9px] flex items-center gap-2"><span class="w-2 h-2 bg-red-500 rounded-full"></span> Invalid/Opted Out</span>
                <span class="font-black text-zinc-800 dark:text-white">{{ subscriberSplit().disabled }} Device(s)</span>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- FIREBASE CONFIGURATION -->
      @if (activeSubTab() === 'fcm-config') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
            <div class="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Firebase Project Settings</h3>
              <span class="text-[8px] font-black uppercase px-2 py-0.5 rounded-full" [ngClass]="fcmConfig.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'">
                {{ fcmConfig.enabled ? 'ACTIVE' : 'DISABLED' }}
              </span>
            </div>

            <form class="grid grid-cols-1 md:grid-cols-2 gap-4" (submit)="saveFCMConfig($event)">
              <div class="md:col-span-2 flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
                <input type="checkbox" id="fcm-enabled" [(ngModel)]="fcmConfig.enabled" name="enabled" class="w-4 h-4 text-orange-600 border-zinc-300 rounded focus:ring-orange-500 cursor-pointer">
                <label for="fcm-enabled" class="text-xs font-black uppercase cursor-pointer">Enable FCM Push Notification Marketing System</label>
              </div>

              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Firebase Project ID</label>
                <input type="text" [(ngModel)]="fcmConfig.projectId" name="projectId" placeholder="my-firebase-project" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">API Key</label>
                <input type="password" [(ngModel)]="fcmConfig.apiKey" name="apiKey" placeholder="AIzaSy..." class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">App ID</label>
                <input type="text" [(ngModel)]="fcmConfig.appId" name="appId" placeholder="1:12345:web:abcd" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Sender ID</label>
                <input type="text" [(ngModel)]="fcmConfig.messagingSenderId" name="messagingSenderId" placeholder="123456789" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>
              <div class="md:col-span-2 space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">VAPID Public Key</label>
                <input type="text" [(ngModel)]="fcmConfig.vapidPublicKey" name="vapidPublicKey" placeholder="BEl62wpCL7..." class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>
              <div class="md:col-span-2 space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase flex justify-between">
                  <span>Firebase Admin Credentials JSON (Service Account)</span>
                  <span class="text-zinc-500 lowercase text-[8px] font-normal">base64 encoded or plain text JSON</span>
                </label>
                <textarea [(ngModel)]="fcmConfig.serviceAccount" name="serviceAccount" rows="4" placeholder='{ "type": "service_account", "project_id": ... }' class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500 font-mono"></textarea>
              </div>

              <!-- Defaults Configuration -->
              <div class="md:col-span-2 border-t border-zinc-150 dark:border-zinc-800 pt-4 mt-2">
                <h4 class="text-[10px] font-black uppercase text-zinc-500 mb-3">Notification Defaults</h4>
              </div>

              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Default Icon</label>
                <input type="text" [(ngModel)]="fcmConfig.defaultIcon" name="defaultIcon" placeholder="/assets/icon.png" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Default Badge</label>
                <input type="text" [(ngModel)]="fcmConfig.defaultBadge" name="defaultBadge" placeholder="/assets/badge.png" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>
              <div class="md:col-span-2 space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Default Click Redirect URL</label>
                <input type="text" [(ngModel)]="fcmConfig.defaultClickUrl" name="defaultClickUrl" placeholder="/" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>

              <div class="md:col-span-2 flex flex-wrap gap-2 justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button type="button" (click)="validateFCMConfig()" class="px-4 py-2 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-black uppercase cursor-pointer border-none flex items-center gap-1.5"><mat-icon class="text-sm">verified_user</mat-icon> Validate Config</button>
                <button type="button" (click)="testFCMConnection()" class="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-xl text-xs font-black uppercase cursor-pointer border-none flex items-center gap-1.5"><mat-icon class="text-sm">rss_feed</mat-icon> Test Connection</button>
                <button type="button" (click)="triggerTestPush()" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 dark:bg-zinc-750 dark:hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer border-none flex items-center gap-1.5"><mat-icon class="text-sm">send</mat-icon> Test Notification</button>
                <button type="submit" class="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer border-none flex items-center gap-1.5"><mat-icon class="text-sm">save</mat-icon> Save Configuration</button>
              </div>
            </form>
          </div>

          <!-- AUDIT LOGS & AUDIENCE -->
          <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
            <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">Audit Trail</h3>
            
            <div class="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              @if (auditLogs().length === 0) {
                <div class="text-xs text-zinc-400 py-6 text-center uppercase font-black">No Audit Logs Found</div>
              } @else {
                @for (log of auditLogs(); track log.id) {
                  <div class="border-b border-zinc-100 dark:border-zinc-800 pb-3 space-y-1.5">
                    <div class="flex justify-between items-start">
                      <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">{{ log.action }}</span>
                      <span class="text-[9px] text-zinc-400 font-bold">{{ log.createdAt | date:'dd MMM, hh:mm a' }}</span>
                    </div>
                    <p class="text-[10px] text-zinc-500 dark:text-zinc-400">By user ID: <span class="font-bold font-mono">{{ log.userId || 'System' }}</span></p>
                    <p class="text-[10px] text-zinc-500 dark:text-zinc-400">IP Address: <span class="font-bold">{{ log.ipAddress || 'unknown' }}</span></p>
                  </div>
                }
              }
            </div>
          </div>
        </div>
      }

      <!-- POPUP CONFIGURATION DESIGNER -->
      @if (activeSubTab() === 'popup-designer') {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- Designer Controls -->
          <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
            <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">Popup Styling & Behavior</h3>
            
            <form class="grid grid-cols-1 md:grid-cols-2 gap-4" (submit)="savePopupConfig($event)">
              <div class="md:col-span-2 flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
                <input type="checkbox" id="popup-enabled" [(ngModel)]="popupConfig.enabled" name="enabled" class="w-4 h-4 text-orange-600 border-zinc-300 rounded focus:ring-orange-500 cursor-pointer">
                <label for="popup-enabled" class="text-xs font-black uppercase cursor-pointer">Enable Permission Popup Banner</label>
              </div>

              <div class="md:col-span-2 space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Popup Title</label>
                <input type="text" [(ngModel)]="popupConfig.title" name="title" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>
              <div class="md:col-span-2 space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Popup Description</label>
                <textarea [(ngModel)]="popupConfig.description" name="description" rows="4" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500"></textarea>
              </div>

              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Allow Button Text</label>
                <input type="text" [(ngModel)]="popupConfig.allowText" name="allowText" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Cancel Button Text</label>
                <input type="text" [(ngModel)]="popupConfig.cancelText" name="cancelText" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>

              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Logo Image URL</label>
                <input type="text" [(ngModel)]="popupConfig.logoUrl" name="logoUrl" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Banner Image URL</label>
                <input type="text" [(ngModel)]="popupConfig.bannerUrl" name="bannerUrl" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>

              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Background Color</label>
                <div class="flex gap-2">
                  <input type="color" [(ngModel)]="popupConfig.backgroundColor" name="backgroundColor" class="w-10 h-8 border border-zinc-200 dark:border-zinc-850 rounded-lg cursor-pointer bg-transparent">
                  <input type="text" [(ngModel)]="popupConfig.backgroundColor" name="backgroundColorVal" class="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                </div>
              </div>
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Text Color</label>
                <div class="flex gap-2">
                  <input type="color" [(ngModel)]="popupConfig.textColor" name="textColor" class="w-10 h-8 border border-zinc-200 dark:border-zinc-850 rounded-lg cursor-pointer bg-transparent">
                  <input type="text" [(ngModel)]="popupConfig.textColor" name="textColorVal" class="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                </div>
              </div>
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Button Primary Color</label>
                <div class="flex gap-2">
                  <input type="color" [(ngModel)]="popupConfig.buttonColor" name="buttonColor" class="w-10 h-8 border border-zinc-200 dark:border-zinc-850 rounded-lg cursor-pointer bg-transparent">
                  <input type="text" [(ngModel)]="popupConfig.buttonColor" name="buttonColorVal" class="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                </div>
              </div>
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Border Radius (px)</label>
                <input type="number" [(ngModel)]="popupConfig.borderRadius" name="borderRadius" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>

              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Entrance Animation</label>
                <select [(ngModel)]="popupConfig.animation" name="animation" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                  <option value="scale-in">Scale In</option>
                  <option value="slide-in-bottom">Slide In Bottom</option>
                  <option value="fade">Fade In</option>
                  <option value="bounce-in">Bounce In</option>
                </select>
              </div>

              <!-- Cooldown & Delays -->
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Delay Before Show (sec)</label>
                <input type="number" [(ngModel)]="popupConfig.delayShow" name="delayShow" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
              </div>
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Show After Scroll %</label>
                <input type="number" [(ngModel)]="popupConfig.scrollShow" name="scrollShow" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
              </div>
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Re-show Cooldown (days)</label>
                <input type="number" [(ngModel)]="popupConfig.reshowDays" name="reshowDays" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
              </div>

              <div class="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 mt-2">
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="pop-once" [(ngModel)]="popupConfig.showOnce" name="showOnce" class="w-3.5 h-3.5 text-orange-600 rounded">
                  <label for="pop-once" class="text-[10px] font-black uppercase text-zinc-400 cursor-pointer">Show Once</label>
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="pop-hide-exist" [(ngModel)]="popupConfig.hideExisting" name="hideExisting" class="w-3.5 h-3.5 text-orange-600 rounded">
                  <label for="pop-hide-exist" class="text-[10px] font-black uppercase text-zinc-400 cursor-pointer">Hide Existing</label>
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="pop-hide-chk" [(ngModel)]="popupConfig.hideCheckout" name="hideCheckout" class="w-3.5 h-3.5 text-orange-600 rounded">
                  <label for="pop-hide-chk" class="text-[10px] font-black uppercase text-zinc-400 cursor-pointer">Hide Checkout</label>
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="pop-hide-pay" [(ngModel)]="popupConfig.hidePayment" name="hidePayment" class="w-3.5 h-3.5 text-orange-600 rounded">
                  <label for="pop-hide-pay" class="text-[10px] font-black uppercase text-zinc-400 cursor-pointer">Hide Payment</label>
                </div>
              </div>

              <div class="md:col-span-2 flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button type="submit" class="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer border-none flex items-center gap-1.5"><mat-icon class="text-sm">save</mat-icon> Save Popup Settings</button>
              </div>
            </form>
          </div>

          <!-- Interactive Live Preview -->
          <div class="space-y-4">
            <div class="flex justify-between items-center bg-zinc-100 dark:bg-zinc-800/40 p-4 rounded-2xl">
              <span class="text-xs font-black uppercase text-zinc-500">Live Preview Sandbox</span>
              <div class="flex gap-2">
                <button (click)="previewDevice.set('desktop')" [class]="previewDevice() === 'desktop' ? 'bg-orange-600/10 text-orange-500 font-black' : 'text-zinc-400'" class="px-3 py-1 text-[10px] uppercase border-none rounded-lg cursor-pointer">Desktop</button>
                <button (click)="previewDevice.set('mobile')" [class]="previewDevice() === 'mobile' ? 'bg-orange-600/10 text-orange-500 font-black' : 'text-zinc-400'" class="px-3 py-1 text-[10px] uppercase border-none rounded-lg cursor-pointer">Mobile</button>
              </div>
            </div>

            <!-- Preview viewport container -->
            <div class="w-full flex items-center justify-center p-6 bg-zinc-100/50 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-[2.5rem] relative overflow-hidden" [style.minHeight.px]="450">
              
              <!-- Desktop Frame -->
              @if (previewDevice() === 'desktop') {
                <div class="w-full max-w-md border border-neutral-200 dark:border-neutral-800 shadow-2xl p-8 text-center relative overflow-hidden transition-all duration-300"
                     [style.backgroundColor]="popupConfig.backgroundColor || '#1e293b'"
                     [style.color]="popupConfig.textColor || '#ffffff'"
                     [style.borderRadius.px]="popupConfig.borderRadius || 24">
                  
                  @if (popupConfig.bannerUrl) {
                    <div class="-mt-8 -mx-8 mb-6 h-28 overflow-hidden relative">
                      <img [src]="popupConfig.bannerUrl" class="w-full h-full object-cover" alt="Banner" />
                    </div>
                  }

                  <div class="flex justify-center mb-4">
                    @if (popupConfig.logoUrl) {
                      <img [src]="popupConfig.logoUrl" class="w-12 h-12 object-contain rounded-lg" alt="Logo" />
                    } @else {
                      <div class="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center">
                        <mat-icon>notifications_active</mat-icon>
                      </div>
                    }
                  </div>

                  <h3 class="text-lg font-bold tracking-tight mb-2">{{ popupConfig.title || 'Never Miss Amazing Deals!' }}</h3>
                  <p class="opacity-80 text-xs leading-relaxed mb-6 whitespace-pre-line">{{ popupConfig.description || 'Enable notifications for deals, offers and status tracking.' }}</p>

                  <div class="flex gap-3 justify-center">
                    <button [style.backgroundColor]="popupConfig.buttonColor || '#f97316'" class="h-10 px-5 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer border-none flex-1">
                      {{ popupConfig.allowText || 'Allow' }}
                    </button>
                    <button class="h-10 px-5 bg-white/10 text-current rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer border border-white/20">
                      {{ popupConfig.cancelText || 'Cancel' }}
                    </button>
                  </div>
                </div>
              }

              <!-- Mobile Frame -->
              @if (previewDevice() === 'mobile') {
                <div class="w-64 h-[400px] bg-zinc-800 dark:bg-black rounded-[2.5rem] border-[6px] border-zinc-700 relative overflow-hidden flex flex-col justify-end p-2 shadow-xl">
                  <!-- Notch -->
                  <div class="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-700 rounded-full"></div>
                  
                  <!-- Floating bottom popup -->
                  <div class="w-full shadow-2xl p-4 text-center relative overflow-hidden transition-all duration-300 mb-2 border border-white/10"
                       [style.backgroundColor]="popupConfig.backgroundColor || '#1e293b'"
                       [style.color]="popupConfig.textColor || '#ffffff'"
                       [style.borderRadius.px]="(popupConfig.borderRadius || 24) * 0.8">
                    
                    <div class="flex items-center gap-2 mb-2 text-left">
                      @if (popupConfig.logoUrl) {
                        <img [src]="popupConfig.logoUrl" class="w-8 h-8 object-contain rounded-xs" alt="Logo" />
                      } @else {
                        <div class="w-8 h-8 bg-orange-500/10 text-orange-500 rounded flex items-center justify-center">
                          <mat-icon class="scale-75">notifications</mat-icon>
                        </div>
                      }
                      <div>
                        <h3 class="text-[9px] font-bold tracking-tight">{{ popupConfig.title || 'Never Miss Amazing Deals!' }}</h3>
                        <p class="opacity-80 text-[7px] leading-tight line-clamp-2">{{ popupConfig.description || 'Enable notifications.' }}</p>
                      </div>
                    </div>

                    <div class="flex gap-1.5 justify-center mt-3">
                      <button [style.backgroundColor]="popupConfig.buttonColor || '#f97316'" class="h-6 px-3 text-white rounded-md font-bold text-[8px] uppercase tracking-wider cursor-pointer border-none flex-1">
                        {{ popupConfig.allowText || 'Allow' }}
                      </button>
                      <button class="h-6 px-3 bg-white/10 text-current rounded-md font-bold text-[8px] uppercase tracking-wider cursor-pointer border border-white/10">
                        {{ popupConfig.cancelText || 'Cancel' }}
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- CAMPAIGN BUILDER (MANUAL SEND) -->
      @if (activeSubTab() === 'manual-send') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Composing card -->
          <div class="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
            <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">Compose Manual Push Notification</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <!-- Segment selector -->
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Target Audience Segment</label>
                <select [(ngModel)]="campaignForm.targetType" (change)="estimateAudience()" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                  <option value="everyone">Everyone (All Opt-ins)</option>
                  <option value="guests">Guest Users only</option>
                  <option value="registered">Registered Logged-in Users only</option>
                  <option value="cart_abandoners">Cart Abandoners</option>
                  <option value="wishlist">Wishlist Users</option>
                  <option value="returning_customers">Previous Customers</option>
                </select>
                <span class="block text-[9px] text-zinc-400 mt-1 font-bold">Estimated Audience: <span class="text-orange-500">{{ audienceCount() }} devices</span></span>
              </div>

              <!-- Product Search auto-filler -->
              <div class="space-y-1 relative">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Auto-Fill from Product</label>
                <div class="flex gap-2">
                  <input type="text" [(ngModel)]="productSearchQuery" placeholder="Search product name..." class="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                  <button type="button" (click)="searchProducts()" class="px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer">Search</button>
                </div>
                
                @if (searchResults().length > 0) {
                  <div class="absolute z-20 top-full left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto p-2 space-y-1">
                    @for (p of searchResults(); track p.id) {
                      <button (click)="selectProduct(p)" class="w-full flex items-center gap-3 p-1.5 hover:bg-zinc-55 dark:hover:bg-zinc-800 text-left border-none bg-transparent rounded-lg cursor-pointer">
                        <img [src]="p.image || '/assets/icon.png'" class="w-8 h-8 object-cover rounded" />
                        <div class="flex-1 overflow-hidden">
                          <h4 class="text-xs font-bold truncate">{{ p.name }}</h4>
                          <p class="text-[9px] text-zinc-400 font-bold">₹{{ p.salePrice || p.basePrice }} - {{ p.discountPercent }}% OFF</p>
                        </div>
                      </button>
                    }
                  </div>
                }
              </div>

              <div class="md:col-span-2 space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Notification Title</label>
                <input type="text" [(ngModel)]="campaignForm.title" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
              </div>
              
              <div class="md:col-span-2 space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Message Body</label>
                <textarea [(ngModel)]="campaignForm.body" rows="3" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500"></textarea>
              </div>

              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Large Rich Image URL</label>
                <input type="text" [(ngModel)]="campaignForm.image" placeholder="https://..." class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
              </div>
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Action URL (Click action)</label>
                <input type="text" [(ngModel)]="campaignForm.actionUrl" placeholder="/product/slug" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
              </div>

              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Priority</label>
                <select [(ngModel)]="campaignForm.priority" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                  <option value="Normal">Normal</option>
                  <option value="High">High Priority (Immediate wake)</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Campaign Name (Internal reference)</label>
                <input type="text" [(ngModel)]="campaignForm.name" placeholder="July Sale Blast" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
              </div>

              <!-- Schedule configuration -->
              <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-2">
                <div class="space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">Scheduling Mode</label>
                  <select [(ngModel)]="campaignForm.scheduleMode" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                    <option value="now">Send Immediately</option>
                    <option value="later">Schedule for Later Date & Time</option>
                  </select>
                </div>

                @if (campaignForm.scheduleMode === 'later') {
                  <div class="space-y-1">
                    <label class="block text-[9px] font-black text-zinc-400 uppercase">Scheduled Time (IST)</label>
                    <input type="datetime-local" [(ngModel)]="campaignForm.scheduledAt" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                  </div>
                }
              </div>

              <div class="md:col-span-2 flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button type="button" (click)="clearCampaignForm()" class="px-4 py-2 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-black uppercase cursor-pointer border-none">Clear Form</button>
                <button type="button" (click)="dispatchManualCampaign()" class="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer border-none flex items-center gap-1.5"><mat-icon class="text-sm">send</mat-icon> Dispatch Notification</button>
              </div>

            </div>
          </div>

          <!-- Rich Preview Section -->
          <div class="space-y-4">
            <div class="bg-zinc-150/40 p-4 rounded-2xl">
              <span class="text-xs font-black uppercase text-zinc-500">Live Device Mockup Previews</span>
            </div>

            <!-- Android Push Card Mockup -->
            <div class="bg-zinc-100/50 dark:bg-zinc-950/20 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-850 flex flex-col gap-4">
              <div class="text-[9px] font-black uppercase text-zinc-400">Android/Mobile View</div>
              
              <div class="w-full bg-[#1c1c1e] text-white p-4 rounded-2xl shadow-lg border border-neutral-800 flex items-start gap-3">
                <img [src]="fcmConfig.defaultIcon || '/assets/icon.png'" class="w-8 h-8 rounded-lg object-contain bg-zinc-900 border border-zinc-800" />
                <div class="flex-1 overflow-hidden space-y-1">
                  <div class="flex justify-between items-center text-[10px] text-zinc-400">
                    <span class="font-black uppercase tracking-tight text-neutral-200">3D Galaxy Hub</span>
                    <span>now</span>
                  </div>
                  <h4 class="text-xs font-black truncate">{{ campaignForm.title || "🔥 Today's Mega Offer" }}</h4>
                  <p class="text-[10px] text-neutral-400 leading-normal">{{ campaignForm.body || "Compose notification body to preview details here." }}</p>
                  
                  @if (campaignForm.image) {
                    <img [src]="campaignForm.image" class="w-full h-28 object-cover rounded-lg mt-2 shadow" />
                  }
                </div>
              </div>
            </div>

            <!-- Desktop notification panel mockup -->
            <div class="bg-zinc-100/50 dark:bg-zinc-950/20 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-850 flex flex-col gap-4">
              <div class="text-[9px] font-black uppercase text-zinc-400">Desktop Web Push</div>
              
              <div class="w-full max-w-sm bg-zinc-900 text-white p-4 rounded-xl shadow-xl flex gap-3 border border-neutral-700 relative">
                <img [src]="fcmConfig.defaultIcon || '/assets/icon.png'" class="w-10 h-10 rounded-md object-contain bg-zinc-950" />
                <div class="flex-1 overflow-hidden">
                  <h4 class="text-xs font-black truncate">{{ campaignForm.title || "🔥 Today's Mega Offer" }}</h4>
                  <p class="text-[10px] text-neutral-400 truncate mt-0.5">{{ campaignForm.body || "Compose notification body." }}</p>
                  <span class="block text-[8px] text-zinc-550 mt-1.5 tracking-wide">3dgalaxy.com</span>
                </div>
                <mat-icon class="text-neutral-500 scale-75 absolute top-2 right-2">close</mat-icon>
              </div>
            </div>

          </div>
        </div>
      }

      <!-- AUTO RULES PAGE -->
      @if (activeSubTab() === 'rules') {
        <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
          <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">Product Selection Rules (Daily Auto-Offer 5:00 PM IST)</h3>
          
          <form class="grid grid-cols-1 md:grid-cols-2 gap-6" (submit)="saveRulesConfig($event)">
            
            <div class="space-y-1">
              <label class="block text-[9px] font-black text-zinc-400 uppercase">Random Products Count per day</label>
              <input type="number" [(ngModel)]="rulesConfig.randomProductCount" name="prodCount" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
            </div>
            
            <div class="space-y-1">
              <label class="block text-[9px] font-black text-zinc-400 uppercase">Stock Threshold (Min quantity in stock)</label>
              <input type="number" [(ngModel)]="rulesConfig.stockThreshold" name="stockThresh" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
            </div>

            <div class="space-y-1">
              <label class="block text-[9px] font-black text-zinc-400 uppercase">Minimum Discount (%)</label>
              <input type="number" [(ngModel)]="rulesConfig.minDiscountPercent" name="minDisc" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
            </div>

            <div class="space-y-1">
              <label class="block text-[9px] font-black text-zinc-400 uppercase">Maximum Discount (%)</label>
              <input type="number" [(ngModel)]="rulesConfig.maxDiscountPercent" name="maxDisc" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
            </div>

            <div class="space-y-1">
              <label class="block text-[9px] font-black text-zinc-400 uppercase">Duplicate Prevention Limit (Days)</label>
              <input type="number" [(ngModel)]="rulesConfig.duplicatePreventionDays" name="dupPrev" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
            </div>
            
            <div class="space-y-1">
              <label class="block text-[9px] font-black text-zinc-400 uppercase">Maximum Notifications Per Day</label>
              <input type="number" [(ngModel)]="rulesConfig.maxNotificationsPerDay" name="maxNotif" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
            </div>

            <div class="md:col-span-2 flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button type="button" (click)="triggerDailyOfferTest()" class="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-xl text-xs font-black uppercase border-none cursor-pointer">Run Cron Job Now</button>
              <button type="submit" class="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer border-none flex items-center gap-1.5"><mat-icon class="text-sm">save</mat-icon> Save Rules</button>
            </div>
          </form>
        </div>
      }

      <!-- CAMPAIGN TEMPLATES MANAGER -->
      @if (activeSubTab() === 'templates') {
        <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
          <div class="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Marketing Notification Templates</h3>
            <button (click)="openTemplateEditor(null)" class="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-black uppercase border-none cursor-pointer flex items-center gap-1"><mat-icon class="text-sm">add</mat-icon> New Template</button>
          </div>

          <!-- Template editor modal -->
          @if (editingTemplate()) {
            <div class="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850 space-y-4">
              <h4 class="text-xs font-black uppercase">{{ templateForm.id ? 'Edit Template' : 'Create Template' }}</h4>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">Template Name</label>
                  <input type="text" [(ngModel)]="templateForm.name" class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                </div>
                <div class="space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">Category</label>
                  <select [(ngModel)]="templateForm.category" class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                    <option value="Daily Deal">Daily Deal</option>
                    <option value="Festival Offer">Festival Offer</option>
                    <option value="Weekend Sale">Weekend Sale</option>
                    <option value="Flash Sale">Flash Sale</option>
                    <option value="Clearance Sale">Clearance Sale</option>
                    <option value="Price Drop">Price Drop</option>
                    <option value="New Arrival">New Arrival</option>
                  </select>
                </div>
                <div class="md:col-span-2 space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">Default Title</label>
                  <input type="text" [(ngModel)]="templateForm.title" class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                </div>
                <div class="md:col-span-2 space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">Default Body Message</label>
                  <textarea [(ngModel)]="templateForm.body" rows="3" class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"></textarea>
                </div>
                <div class="space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">Image URL (Optional)</label>
                  <input type="text" [(ngModel)]="templateForm.image" class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                </div>
                <div class="space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">Redirect Click Action (Optional)</label>
                  <input type="text" [(ngModel)]="templateForm.actionUrl" class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                </div>
              </div>

              <div class="flex justify-end gap-2">
                <button (click)="editingTemplate.set(false)" class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-305 rounded-lg text-[10px] font-black uppercase cursor-pointer border-none">Cancel</button>
                <button (click)="saveTemplate()" class="px-5 py-2 bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer border-none">Save Template</button>
              </div>
            </div>
          }

          <!-- Templates Grid List -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (item of templatesList(); track item.id) {
              <div class="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-150 dark:border-zinc-850 flex flex-col justify-between gap-4">
                <div class="space-y-2">
                  <div class="flex justify-between items-start">
                    <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-orange-500/10 text-orange-500">{{ item.category }}</span>
                    <span class="text-xs font-black text-zinc-900 dark:text-white">{{ item.name }}</span>
                  </div>
                  <h4 class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Title: {{ item.title }}</h4>
                  <p class="text-[10px] text-zinc-450 dark:text-zinc-450 leading-relaxed">{{ item.body }}</p>
                </div>

                <div class="flex gap-2 justify-end border-t border-zinc-200/50 dark:border-zinc-800 pt-3">
                  <button (click)="openTemplateEditor(item)" class="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-[9px] font-black uppercase rounded-lg border-none cursor-pointer">Edit</button>
                  <button (click)="cloneTemplate(item)" class="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-[9px] font-black uppercase rounded-lg border-none cursor-pointer">Clone</button>
                  <button (click)="deleteTemplate(item.id)" class="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[9px] font-black uppercase rounded-lg border-none cursor-pointer">Delete</button>
                </div>
              </div>
            }
          </div>

        </div>
      }

    </div>
  `,
  styles: [`
    .cursor-pointer { cursor: pointer; }
    .border-none { border: none; }
  `]
})
export class PushSettingsTabComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  activeSubTab = signal<string>('analytics');
  previewDevice = signal<string>('desktop');

  // Stats signals
  analyticsSummary = signal<any>({
    totalDevices: 0,
    delivered: 0,
    ctr: 0.0,
    revenueGenerated: 0
  });
  subscriberSplit = signal<any>({
    guests: 0,
    registered: 0,
    disabled: 0
  });
  dailyTrends = signal<any[]>([]);

  // Config signals
  fcmConfig = {
    enabled: false,
    projectId: '',
    apiKey: '',
    appId: '',
    messagingSenderId: '',
    vapidPublicKey: '',
    serviceAccount: '',
    defaultIcon: '/assets/icon.png',
    defaultBadge: '/assets/badge.png',
    defaultClickUrl: '/'
  };

  popupConfig = {
    enabled: true,
    title: '',
    description: '',
    allowText: '',
    cancelText: '',
    logoUrl: '',
    bannerUrl: '',
    backgroundColor: '#1e293b',
    textColor: '#ffffff',
    buttonColor: '#f97316',
    borderRadius: 12,
    animation: 'scale-in',
    delayShow: 5,
    scrollShow: 30,
    showOnce: false,
    hideExisting: true,
    hideCheckout: true,
    hidePayment: true,
    reshowDays: 7
  };

  rulesConfig = {
    randomProductCount: 3,
    minDiscountPercent: 10,
    maxDiscountPercent: 90,
    categoriesInclude: [],
    categoriesExclude: [],
    brandsInclude: [],
    brandsExclude: [],
    stockThreshold: 5,
    duplicatePreventionDays: 7,
    maxNotificationsPerDay: 1
  };

  auditLogs = signal<any[]>([]);

  // Campaign Form State
  campaignForm = {
    targetType: 'everyone',
    title: '',
    body: '',
    image: '',
    actionUrl: '',
    priority: 'Normal',
    name: '',
    scheduleMode: 'now',
    scheduledAt: ''
  };
  audienceCount = signal<number>(0);
  productSearchQuery = '';
  searchResults = signal<any[]>([]);

  // Template signals
  templatesList = signal<any[]>([]);
  editingTemplate = signal<boolean>(false);
  templateForm = {
    id: '',
    name: '',
    category: 'Daily Deal',
    title: '',
    body: '',
    image: '',
    actionUrl: ''
  };

  constructor() {
    this.loadAnalytics();
    this.loadFCMConfig();
    this.loadPopupConfig();
    this.loadRulesConfig();
    this.loadTemplates();
    this.estimateAudience();
    this.loadAuditLogs();
  }

  // Loaders
  loadAnalytics() {
    this.api.get<any>('/admin/push/analytics').subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          const s = res.data.summary;
          this.analyticsSummary.set({
            totalDevices: s.totalDevices || 0,
            delivered: s.delivered || 0,
            ctr: s.ctr || 0.0,
            revenueGenerated: s.revenueGenerated || 0
          });
          this.subscriberSplit.set({
            guests: (s.totalDevices || 0) - (s.unsubscribedUsers || 0) - (s.registeredUsers || 0), // estimation fallback
            registered: s.registeredUsers || 0,
            disabled: s.unsubscribedUsers || 0
          });
          this.dailyTrends.set(res.data.dailyTrends || []);
        }
      }
    });
  }

  loadFCMConfig() {
    this.api.get<any>('/admin/push/config').subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.fcmConfig = { ...this.fcmConfig, ...res.data };
        }
      }
    });
  }

  loadPopupConfig() {
    this.api.get<any>('/admin/push/popup-config').subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.popupConfig = { ...this.popupConfig, ...res.data };
        }
      }
    });
  }

  loadRulesConfig() {
    this.api.get<any>('/settings').subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          const rules = res.data.pushRulesSettings || {};
          this.rulesConfig = { ...this.rulesConfig, ...rules };
        }
      }
    });
  }

  loadAuditLogs() {
    this.api.get<any>('/admin/fcm/logs').subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.auditLogs.set(res.data || []);
        }
      }
    });
  }

  loadTemplates() {
    this.api.get<any>('/admin/push/templates').subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.templatesList.set(res.data || []);
        }
      }
    });
  }

  // Updators & Savers
  saveFCMConfig(event: Event) {
    event.preventDefault();
    this.api.post<any>('/admin/push/config', this.fcmConfig).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Firebase configuration saved successfully!');
          this.loadAuditLogs();
        }
      },
      error: (err) => this.toast.error('Failed to save config: ' + err.message)
    });
  }

  savePopupConfig(event: Event) {
    event.preventDefault();
    this.api.post<any>('/admin/push/popup-config', this.popupConfig).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Popup styling saved successfully!');
          this.loadAuditLogs();
        }
      },
      error: (err) => this.toast.error('Failed to save popup styling: ' + err.message)
    });
  }

  saveRulesConfig(event: Event) {
    event.preventDefault();
    this.api.put<any>('/admin/settings', { pushRulesSettings: this.rulesConfig }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Product selection rules saved!');
          this.loadAuditLogs();
        }
      },
      error: (err) => this.toast.error('Failed to save rules: ' + err.message)
    });
  }

  // FCM config validations
  validateFCMConfig() {
    this.api.post<any>('/admin/push/config/validate', {
      serviceAccount: this.fcmConfig.serviceAccount,
      storageBucket: `${this.fcmConfig.projectId}.firebasestorage.app`
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(res.message);
        } else {
          this.toast.error(res.message);
        }
      },
      error: (err) => this.toast.error(err.error?.message || 'Validation failed.')
    });
  }

  testFCMConnection() {
    this.toast.info('Testing connection with Firebase servers...');
    this.api.post<any>('/admin/push/config/validate', {
      serviceAccount: this.fcmConfig.serviceAccount
    }).subscribe({
      next: (res) => {
        if (res.success) this.toast.success('FCM API connection test successful!');
      },
      error: (err) => this.toast.error('Connection test failed: ' + err.error?.message)
    });
  }

  triggerTestPush() {
    const token = prompt('Enter recipient FCM Token to send test notification:');
    if (!token) return;

    this.api.post<any>('/admin/push/test', {
      fcmToken: token,
      title: '🔥 Live Connection Test Success!',
      body: 'Your Firebase integration is fully active and delivering notifications.',
      image: 'https://picsum.photos/seed/test/400/200',
      actionUrl: '/'
    }).subscribe({
      next: (res) => {
        if (res.success) this.toast.success('Test notification sent successfully!');
      },
      error: (err) => this.toast.error('Failed to send test push: ' + err.message)
    });
  }

  // Campaign compose
  estimateAudience() {
    this.api.post<any>('/admin/push/audience/estimate', { targetType: this.campaignForm.targetType }).subscribe({
      next: (res) => {
        if (res.success) {
          this.audienceCount.set(res.data.count || 0);
        }
      }
    });
  }

  searchProducts() {
    if (!this.productSearchQuery) return;
    this.api.get<any>('/admin/push/products/search', { q: this.productSearchQuery }).subscribe({
      next: (res) => {
        if (res.success) {
          this.searchResults.set(res.data || []);
        }
      }
    });
  }

  selectProduct(product: any) {
    this.campaignForm.title = `🔥 Price Drop Alert: ${product.name}`;
    this.campaignForm.body = `Get ${product.discountPercent}% OFF! Only ₹${product.salePrice || product.basePrice} (was ₹${product.basePrice}). Shop Now!`;
    this.campaignForm.image = product.image;
    this.campaignForm.actionUrl = product.productUrl;
    this.campaignForm.name = `Promo: ${product.name} drop`;
    this.searchResults.set([]);
    this.productSearchQuery = '';
    this.toast.success('Product fields loaded into builder.');
  }

  clearCampaignForm() {
    this.campaignForm = {
      targetType: 'everyone',
      title: '',
      body: '',
      image: '',
      actionUrl: '',
      priority: 'Normal',
      name: '',
      scheduleMode: 'now',
      scheduledAt: ''
    };
    this.estimateAudience();
  }

  dispatchManualCampaign() {
    if (!this.campaignForm.title || !this.campaignForm.body) {
      this.toast.error('Title and message body are required.');
      return;
    }

    const payload = {
      name: this.campaignForm.name || `Manual Campaign: ${this.campaignForm.title}`,
      type: 'Promotional',
      title: this.campaignForm.title,
      body: this.campaignForm.body,
      image: this.campaignForm.image || null,
      actionUrl: this.campaignForm.actionUrl || '/',
      priority: this.campaignForm.priority,
      audienceRules: { targetType: this.campaignForm.targetType },
      scheduleMode: this.campaignForm.scheduleMode,
      scheduledAt: this.campaignForm.scheduleMode === 'later' ? this.campaignForm.scheduledAt : null
    };

    const endpoint = this.campaignForm.scheduleMode === 'now' ? '/admin/push/campaign' : '/admin/push/schedule';
    
    // First save campaign
    this.api.post<any>('/admin/push/campaign', payload).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const campaignId = res.data.id;
          
          if (payload.scheduleMode === 'now') {
            // Trigger send immediately
            this.api.post<any>('/admin/push/send', { campaignId }).subscribe({
              next: () => {
                this.toast.success('Campaign dispatched successfully to audience!');
                this.clearCampaignForm();
                this.loadAnalytics();
              },
              error: (err) => this.toast.error('Failed to queue dispatch: ' + err.message)
            });
          } else {
            // Schedule it
            this.api.post<any>('/admin/push/schedule', {
              campaignId,
              scheduledAt: payload.scheduledAt,
              timezone: 'Asia/Kolkata',
              scheduleType: 'Specific Date & Time'
            }).subscribe({
              next: () => {
                this.toast.success('Campaign scheduled successfully for ' + payload.scheduledAt);
                this.clearCampaignForm();
              },
              error: (err) => this.toast.error('Failed to schedule campaign: ' + err.message)
            });
          }
        }
      },
      error: (err) => this.toast.error('Failed to create campaign: ' + err.message)
    });
  }

  triggerDailyOfferTest() {
    this.toast.info('Triggering Daily offer automatic generation job...');
    // We will invoke the daily offer scheduler routine directly from testing endpoint
    this.api.post<any>('/admin/push/test', {
      fcmToken: 'CRON_TRIGGER_DAILY_OFFER',
      title: 'Run cron',
      body: 'cron'
    }).subscribe({
      next: () => {
        this.toast.success('Cron job completed successfully! Check analytics dashboard.');
        setTimeout(() => this.loadAnalytics(), 2000);
      },
      error: (err) => this.toast.error('Cron dispatch trigger failed: ' + err.message)
    });
  }

  triggerDailyOfferCronDirect() {
    // Invoke cron
    this.api.post<any>('/admin/push/test', {
      fcmToken: 'CRON_TRIGGER',
      title: 'Triggering auto cron',
      body: 'daily'
    }).subscribe({
      next: () => this.toast.success('Cron job invoked successfully!')
    });
  }

  // Templates CRUD
  openTemplateEditor(tmpl: any) {
    if (tmpl) {
      this.templateForm = { ...tmpl };
    } else {
      this.templateForm = {
        id: '',
        name: '',
        category: 'Daily Deal',
        title: '',
        body: '',
        image: '',
        actionUrl: ''
      };
    }
    this.editingTemplate.set(true);
  }

  saveTemplate() {
    if (!this.templateForm.name || !this.templateForm.title || !this.templateForm.body) {
      this.toast.error('Please fill name, title and body.');
      return;
    }

    const request = this.templateForm.id
      ? this.api.put<any>(`/admin/push/templates/${this.templateForm.id}`, this.templateForm)
      : this.api.post<any>('/admin/push/templates', this.templateForm);

    request.subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Template saved successfully!');
          this.editingTemplate.set(false);
          this.loadTemplates();
        }
      },
      error: (err) => this.toast.error('Failed to save template: ' + err.message)
    });
  }

  cloneTemplate(tmpl: any) {
    const cloned = {
      ...tmpl,
      id: '',
      name: `${tmpl.name} (Clone)`
    };
    this.api.post<any>('/admin/push/templates', cloned).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Template cloned!');
          this.loadTemplates();
        }
      }
    });
  }

  deleteTemplate(id: string) {
    if (!confirm('Are you sure you want to delete this template?')) return;
    this.api.delete<any>(`/admin/push/templates/${id}`).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Template deleted.');
          this.loadTemplates();
        }
      }
    });
  }

  // Graphical helpers
  getSendsPercent(sends: number): number {
    if (!sends) return 0;
    const maxSends = Math.max(...this.dailyTrends().map(t => t.sends || 0), 10);
    return Math.round((sends / maxSends) * 100);
  }

  getClicksPercent(clicks: number): number {
    if (!clicks) return 0;
    const maxSends = Math.max(...this.dailyTrends().map(t => t.sends || 0), 10);
    return Math.round((clicks / maxSends) * 100);
  }
}
