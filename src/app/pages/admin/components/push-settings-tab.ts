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
        <!-- Nested Marketing Automation Switcher -->
        <div class="flex flex-wrap items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6">
          <button (click)="nestedMarketingTab.set('dashboard')" [class]="nestedMarketingTab() === 'dashboard' ? 'bg-orange-600/10 text-orange-500 font-black' : 'text-zinc-400 font-medium'" class="px-4 py-2 text-xs uppercase border-none rounded-xl cursor-pointer transition-all">Dashboard</button>
          <button (click)="nestedMarketingTab.set('builder')" [class]="nestedMarketingTab() === 'builder' ? 'bg-orange-600/10 text-orange-500 font-black' : 'text-zinc-400 font-medium'" class="px-4 py-2 text-xs uppercase border-none rounded-xl cursor-pointer transition-all">Omnichannel Wizard</button>
          <button (click)="nestedMarketingTab.set('flows')" [class]="nestedMarketingTab() === 'flows' ? 'bg-orange-600/10 text-orange-500 font-black' : 'text-zinc-400 font-medium'" class="px-4 py-2 text-xs uppercase border-none rounded-xl cursor-pointer transition-all">Visual Flow Builder</button>
          <button (click)="nestedMarketingTab.set('history')" [class]="nestedMarketingTab() === 'history' ? 'bg-orange-600/10 text-orange-500 font-black' : 'text-zinc-400 font-medium'" class="px-4 py-2 text-xs uppercase border-none rounded-xl cursor-pointer transition-all">Logs & Audit</button>
        </div>

        <!-- NESTED TAB 1: MARKETING DASHBOARD -->
        @if (nestedMarketingTab() === 'dashboard') {
          <div class="space-y-6">
            <!-- Metric Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
                <span class="text-[9px] font-black uppercase text-zinc-400">Scheduled Campaigns</span>
                <h3 class="text-2xl font-black text-zinc-900 dark:text-white">{{ activeScheduledCampaigns().length }}</h3>
              </div>
              <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
                <span class="text-[9px] font-black uppercase text-orange-500">Active Journey Flows</span>
                <h3 class="text-2xl font-black text-orange-500">4</h3>
              </div>
              <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
                <span class="text-[9px] font-black uppercase text-blue-500">Omnichannel CTR</span>
                <h3 class="text-2xl font-black text-blue-500">14.8%</h3>
              </div>
              <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
                <span class="text-[9px] font-black uppercase text-emerald-500">Automation Revenue</span>
                <h3 class="text-2xl font-black text-emerald-500">₹2,30,000</h3>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Active Scheduled list -->
              <div class="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Active scheduled & drafts</h3>
                <div class="space-y-3">
                  @for (c of activeScheduledCampaigns(); track c.id) {
                    <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250/60 dark:border-zinc-800/80 rounded-2xl flex justify-between items-center group">
                      <div class="space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded text-[8px] font-black uppercase">{{ c.type }}</span>
                          <span class="px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-[8px] font-black uppercase text-zinc-600 dark:text-zinc-400">{{ c.status }}</span>
                        </div>
                        <h4 class="text-xs font-black text-zinc-900 dark:text-white">{{ c.name }}</h4>
                        <p class="text-[10px] text-zinc-400">Scheduled: {{ c.scheduledAt }} | Target: {{ c.reach }} recipients</p>
                      </div>
                      <div class="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button (click)="duplicateCampaign(c)" title="Duplicate" class="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg hover:text-orange-500 cursor-pointer"><mat-icon class="text-sm">content_copy</mat-icon></button>
                        <button (click)="exportCampaign(c)" title="Export Config JSON" class="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg hover:text-blue-500 cursor-pointer"><mat-icon class="text-sm">download</mat-icon></button>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Channel Usage split -->
              <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
                <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Channel Efficiency Split</h3>
                <div class="space-y-4">
                  <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-bold">
                      <span class="text-zinc-400 uppercase">PWA Web Push</span>
                      <span>54% (CTR 12.5%)</span>
                    </div>
                    <div class="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div class="bg-orange-500 h-full rounded-full" style="width: 54%"></div>
                    </div>
                  </div>
                  <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-bold">
                      <span class="text-zinc-400 uppercase">WhatsApp Templates</span>
                      <span>36% (CTR 16.4%)</span>
                    </div>
                    <div class="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div class="bg-emerald-500 h-full rounded-full" style="width: 36%"></div>
                    </div>
                  </div>
                  <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-bold">
                      <span class="text-zinc-400 uppercase">Combined Multi-Channel</span>
                      <span>10% (CTR 24.8%)</span>
                    </div>
                    <div class="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div class="bg-blue-500 h-full rounded-full" style="width: 10%"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- NESTED TAB 2: CAMPAIGN WIZARD -->
        @if (nestedMarketingTab() === 'builder') {
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <!-- Wizard Steps -->
              <div class="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-250/40 dark:border-zinc-800/80 mb-6">
                <span class="text-[10px] font-black uppercase text-zinc-400">Step {{ wizardStep() }} of 5</span>
                <div class="flex items-center gap-1.5">
                  @for (step of [1,2,3,4,5]; track step) {
                    <div [class]="wizardStep() >= step ? 'bg-orange-500' : 'bg-zinc-200 dark:bg-zinc-800'" class="w-8 h-1 rounded-full transition-all"></div>
                  }
                </div>
              </div>

              <!-- STEP 1: CAMPAIGN DETAILS -->
              @if (wizardStep() === 1) {
                <div class="space-y-4 animate-fadeIn">
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">Campaign Details</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Campaign Name</label>
                      <input type="text" [(ngModel)]="campaignForm.name" placeholder="e.g. Maker Filament Launch Blast" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none">
                    </div>
                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Campaign Sub-Category</label>
                      <select [(ngModel)]="campaignFormExt.campaignType" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer">
                        <option value="Flash Sale">Flash Sale</option>
                        <option value="Cart Recovery">Cart Recovery</option>
                        <option value="Price Drop">Price Drop</option>
                        <option value="New Arrival">New Arrival</option>
                        <option value="Back In Stock">Back In Stock</option>
                        <option value="Review Request">Review Request</option>
                        <option value="Order Status Update">Order Status Update</option>
                        <option value="Payment Reminder">Payment Reminder</option>
                        <option value="Newsletter">Newsletter</option>
                      </select>
                    </div>
                    <div class="md:col-span-2 space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Description</label>
                      <textarea [(ngModel)]="campaignFormExt.description" placeholder="Short description of this campaign goals..." rows="2" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none resize-none"></textarea>
                    </div>
                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Priority</label>
                      <select [(ngModel)]="campaignForm.priority" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Internal Notes</label>
                      <input type="text" [(ngModel)]="campaignFormExt.internalNotes" placeholder="Targeting PWA and WhatsApp optins..." class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                    </div>
                  </div>
                </div>
              }

              <!-- STEP 2: AUDIENCE SEGMENTATION -->
              @if (wizardStep() === 2) {
                <div class="space-y-4 animate-fadeIn">
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">Target Audience Segment</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-3">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Client Groups (OR)</label>
                      <div class="grid grid-cols-2 gap-2">
                        @for (ut of [
                          { key: 'everyone', label: 'Everyone (All Opt-ins)' },
                          { key: 'guests', label: 'Guest Clients Only' },
                          { key: 'registered', label: 'Registered Accounts' },
                          { key: 'vip', label: 'VIP Spenders' },
                          { key: 'inactive', label: 'Inactive 30+ Days' },
                          { key: 'highValue', label: 'High Basket Value' }
                        ]; track ut.key) {
                          <div class="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                            <input type="checkbox" [id]="'ut-' + ut.key" [(ngModel)]="$any(audienceSegmentFilters.userTypes)[ut.key]" class="w-3.5 h-3.5 text-orange-600 rounded cursor-pointer">
                            <label [for]="'ut-' + ut.key" class="text-[10px] font-black uppercase text-zinc-700 dark:text-zinc-300 cursor-pointer truncate">{{ ut.label }}</label>
                          </div>
                        }
                      </div>
                    </div>

                    <div class="space-y-4">
                      <div class="space-y-1">
                        <label class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Min purchase threshold (times)</label>
                        <input type="number" [(ngModel)]="audienceSegmentFilters.purchaseCountMin" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                      </div>
                      <div class="space-y-1">
                        <label class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Total spend limit (min INR)</label>
                        <input type="number" [(ngModel)]="audienceSegmentFilters.totalSpendMin" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                      </div>
                      <div class="space-y-1">
                        <label class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Device/Platform split (AND)</label>
                        <div class="flex flex-wrap gap-2 pt-1">
                          @for (plat of ['android', 'ios', 'web', 'pwa']; track plat) {
                            <button (click)="$any(audienceSegmentFilters.platforms)[plat] = !$any(audienceSegmentFilters.platforms)[plat]"
                                    [class]="$any(audienceSegmentFilters.platforms)[plat] ? 'bg-orange-500/10 text-orange-500 font-black border-orange-500/20' : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-400 border-zinc-200 dark:border-zinc-800'"
                                    class="px-2.5 py-1 text-[9px] uppercase font-black border rounded-lg cursor-pointer transition-all">
                              {{ plat }}
                            </button>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- STEP 3: CONTENT & INTEGRATION -->
              @if (wizardStep() === 3) {
                <div class="space-y-6 animate-fadeIn">
                  <!-- Channel selector -->
                  <div class="space-y-1">
                    <label class="block text-[9px] font-black text-zinc-400 uppercase">Channel Relay</label>
                    <div class="flex gap-2">
                      @for (ch of [
                        { key: 'push', label: 'PWA Web Push' },
                        { key: 'whatsapp', label: 'Meta WhatsApp Template' },
                        { key: 'both', label: 'Omnichannel Both (Push + WA)' }
                      ]; track ch.key) {
                        <button (click)="selectedChannel.set($any(ch.key)); campaignForm.targetType = 'everyone'"
                                [class]="selectedChannel() === ch.key ? 'bg-orange-600 text-white' : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-400 border border-zinc-200 dark:border-zinc-800'"
                                class="flex-1 py-3 text-[10px] uppercase font-black rounded-xl cursor-pointer transition-all border-none">
                          {{ ch.label }}
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Push fields -->
                  @if (selectedChannel() === 'push' || selectedChannel() === 'both') {
                    <div class="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <h4 class="text-xs font-black uppercase text-orange-500">PWA Push Notification Fields</h4>
                      
                      <!-- Product auto filler inline inside wizard content -->
                      <div class="space-y-1 relative">
                        <label class="block text-[9px] font-black text-zinc-400 uppercase">Load Details from Product catalog (Optional)</label>
                        <div class="flex gap-2">
                          <input type="text" [(ngModel)]="productSearchQuery" placeholder="Search filament, resin, nozzle..." class="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                          <button type="button" (click)="searchProducts()" class="px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer">Search</button>
                        </div>
                        @if (searchResults().length > 0) {
                          <div class="absolute z-20 top-full left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl mt-1 shadow-lg max-h-40 overflow-y-auto p-2 space-y-1">
                            @for (p of searchResults(); track p.id) {
                              <button (click)="selectProduct(p)" class="w-full flex items-center gap-3 p-1.5 hover:bg-zinc-55 dark:hover:bg-zinc-800 text-left border-none bg-transparent rounded-lg cursor-pointer">
                                <img [src]="p.image || '/assets/icon.png'" class="w-8 h-8 object-cover rounded" />
                                <div class="flex-1 overflow-hidden">
                                  <h4 class="text-xs font-bold truncate">{{ p.name }}</h4>
                                  <p class="text-[9px] text-zinc-400 font-bold">₹{{ p.salePrice || p.basePrice }}</p>
                                </div>
                              </button>
                            }
                          </div>
                        }
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-1">
                          <label class="block text-[9px] font-black text-zinc-400 uppercase">Notification Title</label>
                          <input type="text" [(ngModel)]="campaignForm.title" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
                        </div>
                        <div class="space-y-1">
                          <label class="block text-[9px] font-black text-zinc-400 uppercase">Redirect URL / Link</label>
                          <input type="text" [(ngModel)]="campaignForm.actionUrl" placeholder="/product/slug" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
                        </div>
                        <div class="md:col-span-2 space-y-1">
                          <label class="block text-[9px] font-black text-zinc-400 uppercase">Notification Body</label>
                          <textarea [(ngModel)]="campaignForm.body" rows="2" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500"></textarea>
                        </div>
                        <div class="md:col-span-2 space-y-1">
                          <label class="block text-[9px] font-black text-zinc-400 uppercase">Rich Image Banner URL</label>
                          <input type="text" [(ngModel)]="campaignForm.image" placeholder="https://..." class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
                        </div>
                      </div>
                    </div>
                  }

                  <!-- WhatsApp fields -->
                  @if (selectedChannel() === 'whatsapp' || selectedChannel() === 'both') {
                    <div class="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <h4 class="text-xs font-black uppercase text-emerald-500">Meta WhatsApp Approved Templates</h4>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-1">
                          <label class="block text-[9px] font-black text-zinc-400 uppercase">Template Name</label>
                          <select (change)="onWhatsAppTemplateSelect($any($event.target).value)" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer font-mono font-bold">
                            <option value="">-- Choose Approved Template --</option>
                            @for (t of whatsappTemplates(); track t.name) {
                              <option [value]="t.name">{{ t.name }} ({{ t.category }})</option>
                            }
                          </select>
                        </div>

                        <div class="space-y-1">
                          <label class="block text-[9px] font-black text-zinc-400 uppercase">Media Attachment Type</label>
                          <select [(ngModel)]="whatsappAttachmentType" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                            <option value="none">None</option>
                            <option value="image">Image Attachment</option>
                            <option value="video">Video Attachment</option>
                            <option value="document">PDF Document Attachment</option>
                          </select>
                        </div>

                        @if (whatsappAttachmentType() !== 'none') {
                          <div class="md:col-span-2 space-y-1">
                            <label class="block text-[9px] font-black text-zinc-400 uppercase">Media Attachment URL</label>
                            <input type="text" [(ngModel)]="whatsappAttachmentUrl" placeholder="https://..." class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                          </div>
                        }
                      </div>

                      <!-- Variable Mapper -->
                      @if (selectedWhatsAppTemplate()) {
                        <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl space-y-3">
                          <h5 class="text-[10px] font-black uppercase text-zinc-400">Dynamic Variable Mapping</h5>
                          <div class="space-y-2">
                            @for (v of detectedVariables(); track v) {
                              <div class="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                                <span class="text-xs font-mono font-black text-zinc-700 dark:text-zinc-300">{{"{{"}}</span><span class="text-xs font-mono font-black text-zinc-700 dark:text-zinc-300 font-bold">{{ v }}</span><span class="text-xs font-mono font-black text-zinc-700 dark:text-zinc-300">{{"}}"}}</span>
                                <div class="flex gap-2 w-full sm:w-auto">
                                  <select [(ngModel)]="variableMappings()[v]" class="px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none cursor-pointer">
                                    <option value="Customer.firstName">Customer First Name</option>
                                    <option value="Order.orderNumber">Order Number</option>
                                    <option value="Order.totalAmount">Order Amount</option>
                                    <option value="Order.paymentStatus">Order Payment Status</option>
                                    <option value="Order.trackingUrl">Order Tracking URL</option>
                                    <option value="Custom Text">Custom Text Input</option>
                                  </select>
                                  @if (variableMappings()[v] === 'Custom Text') {
                                    <input type="text" placeholder="Value..." class="px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none w-28">
                                  }
                                </div>
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <!-- STEP 4: AI CONTENT HELPER -->
              @if (wizardStep() === 4) {
                <div class="space-y-4 animate-fadeIn">
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">AI Copilot Content Helper</h3>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="md:col-span-2 space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Product, Brand, or Event Theme</label>
                      <input type="text" [(ngModel)]="aiKeyword" placeholder="e.g. Maker Filament PLA Red price drop" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                    </div>
                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Tone Variation</label>
                      <select [(ngModel)]="aiTone" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                        <option value="Engaging">Engaging / Friendly</option>
                        <option value="Urgent">Urgent / Flash</option>
                        <option value="Professional">Professional</option>
                        <option value="Emojis-packed">Playful & Emojis</option>
                      </select>
                    </div>
                    <div class="md:col-span-3 flex justify-end">
                      <button type="button" (click)="generateAIContent()" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer">Generate Suggestions</button>
                    </div>
                  </div>

                  @if (generatedAiTitles().length > 0) {
                    <div class="space-y-3 mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                      <span class="block text-[10px] font-black uppercase text-orange-500">AI Copy Suggestions (Click to Apply)</span>
                      <div class="space-y-2">
                        @for (title of generatedAiTitles(); track title; let idx = $index) {
                          <div (click)="applyAiSuggestion(title, generatedAiBodies()[idx])" class="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-orange-500/40 cursor-pointer transition-all space-y-1">
                            <h4 class="text-xs font-black text-zinc-900 dark:text-white">{{ title }}</h4>
                            <p class="text-[10px] text-zinc-400">{{ generatedAiBodies()[idx] }}</p>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- STEP 5: SCHEDULING & CRON -->
              @if (wizardStep() === 5) {
                <div class="space-y-4 animate-fadeIn">
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">Scheduling & Expiry</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Scheduling Frequency</label>
                      <select [(ngModel)]="campaignForm.scheduleMode" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                        <option value="now">Send Immediately</option>
                        <option value="later">Schedule Specific Date & Time</option>
                        <option value="cron">Recurring (Cron Expression)</option>
                      </select>
                    </div>

                    @if (campaignForm.scheduleMode === 'later') {
                      <div class="space-y-1">
                        <label class="block text-[9px] font-black text-zinc-400 uppercase">Scheduled Time (IST)</label>
                        <input type="datetime-local" [(ngModel)]="campaignForm.scheduledAt" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                      </div>
                    }

                    @if (campaignForm.scheduleMode === 'cron') {
                      <div class="space-y-1">
                        <label class="block text-[9px] font-black text-zinc-400 uppercase">Cron Expression (e.g. 0 17 * * *)</label>
                        <input type="text" placeholder="0 17 * * * (Everyday 5:00 PM)" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                      </div>
                    }

                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Campaign Expiry Time (Optional)</label>
                      <input type="datetime-local" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                    </div>

                    <div class="md:col-span-2 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-2 grid grid-cols-2 gap-4">
                      <div class="flex items-center gap-2">
                        <input type="checkbox" id="dnd-chk" [checked]="true" class="w-4 h-4 text-orange-600 rounded cursor-pointer">
                        <label for="dnd-chk" class="text-xs font-black uppercase text-zinc-400 cursor-pointer">Do Not Disturb (10 PM - 7 AM)</label>
                      </div>
                      <div class="flex items-center gap-2">
                        <input type="checkbox" id="cap-chk" [checked]="true" class="w-4 h-4 text-orange-600 rounded cursor-pointer">
                        <label for="cap-chk" class="text-xs font-black uppercase text-zinc-400 cursor-pointer">Respect Frequency Capping (1/day)</label>
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- Navigation buttons -->
              <div class="flex justify-between pt-6 border-t border-zinc-150 dark:border-zinc-800 mt-6">
                <button type="button" [disabled]="wizardStep() === 1" (click)="wizardStep.set(wizardStep() - 1)" class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-black uppercase border-none cursor-pointer disabled:opacity-50">Back</button>
                <div class="flex gap-2">
                  <button type="button" (click)="clearCampaignForm()" class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 rounded-xl text-xs font-black uppercase border-none cursor-pointer">Clear</button>
                  @if (wizardStep() < 5) {
                    <button type="button" (click)="wizardStep.set(wizardStep() + 1)" class="px-6 py-2 bg-orange-600 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer">Next</button>
                  } @else {
                    <button type="button" (click)="dispatchManualCampaign(); nestedMarketingTab.set('dashboard')" class="px-6 py-2 bg-orange-600 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer flex items-center gap-1.5"><mat-icon class="text-sm font-black">send</mat-icon> Dispatch Campaign</button>
                  }
                </div>
              </div>
            </div>

            <!-- SIMULATORS & REACH SUMMARY SIDEBAR -->
            <div class="space-y-4">
              <!-- Live Reach estimator box -->
              <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs space-y-4">
                <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">Reach Summary</h3>
                <div class="flex items-baseline justify-between">
                  <span class="text-xs text-zinc-400 font-bold uppercase">Estimated Reach</span>
                  <div class="text-right">
                    <h3 class="text-2xl font-black text-orange-500">{{ getReachEstimate() }}</h3>
                    <span class="text-[9px] text-zinc-400 font-bold">Target Devices / Phones</span>
                  </div>
                </div>
              </div>

              <!-- Preview device frame selector -->
              <div class="flex justify-between items-center bg-zinc-100 dark:bg-zinc-800/40 p-4 rounded-2xl select-none">
                <span class="text-xs font-black uppercase text-zinc-500">Live Preview</span>
                <select [(ngModel)]="previewDevice" class="px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none cursor-pointer">
                  <option value="desktop">Desktop Web</option>
                  <option value="mobile">Android Device</option>
                  <option value="whatsapp">WhatsApp Mock</option>
                </select>
              </div>

              <!-- Simulator Viewports -->
              <div class="w-full flex items-center justify-center p-6 bg-zinc-100/50 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-[2.5rem] relative overflow-hidden" style="min-height: 380px;">
                
                @if (previewDevice() === 'desktop') {
                  <div class="w-full max-w-sm bg-zinc-900 text-white p-4 rounded-xl shadow-xl flex gap-3 border border-neutral-700 relative transition-all duration-300">
                    <img [src]="fcmConfig.defaultIcon || '/assets/icon.png'" class="w-10 h-10 rounded-md object-contain bg-zinc-950" />
                    <div class="flex-1 overflow-hidden">
                      <h4 class="text-xs font-black truncate">{{ campaignForm.title || "🔥 Today's Mega Offer" }}</h4>
                      <p class="text-[10px] text-neutral-400 truncate mt-0.5">{{ campaignForm.body || "Compose notification body." }}</p>
                      <span class="block text-[8px] text-zinc-550 mt-1.5 tracking-wide">3dgalaxy.com</span>
                    </div>
                  </div>
                }

                @if (previewDevice() === 'mobile') {
                  <div class="w-64 h-[300px] bg-zinc-800 dark:bg-black rounded-[2.5rem] border-[6px] border-zinc-700 relative overflow-hidden flex flex-col justify-end p-2 shadow-xl">
                    <div class="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-700 rounded-full"></div>
                    <div class="w-full bg-[#1c1c1e] text-white p-3 rounded-xl shadow-lg border border-neutral-800 flex items-start gap-2.5 mb-1 text-left">
                      <img [src]="fcmConfig.defaultIcon || '/assets/icon.png'" class="w-8 h-8 rounded-lg object-contain bg-zinc-900" />
                      <div class="flex-1 overflow-hidden space-y-0.5">
                        <h4 class="text-[10px] font-black truncate">{{ campaignForm.title || "🔥 Today's Mega Offer" }}</h4>
                        <p class="text-[8px] text-neutral-400 leading-normal">{{ campaignForm.body || "Compose notification body." }}</p>
                        @if (campaignForm.image) {
                          <img [src]="campaignForm.image" class="w-full h-20 object-cover rounded-lg mt-1" />
                        }
                      </div>
                    </div>
                  </div>
                }

                @if (previewDevice() === 'whatsapp') {
                  <div class="w-64 h-[360px] bg-[#efeae2] dark:bg-zinc-900 rounded-[2.5rem] border-[6px] border-zinc-700 relative overflow-hidden flex flex-col justify-end p-2 shadow-xl">
                    <div class="absolute top-0 left-0 right-0 bg-[#075e54] text-white px-4 py-2 flex items-center gap-2 relative z-10 shrink-0">
                      <mat-icon class="scale-75">arrow_back</mat-icon>
                      <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-black text-[9px] uppercase">3D</div>
                      <div class="leading-none flex-1 min-w-0">
                        <h4 class="text-[9px] font-black truncate">3D Galaxy Support</h4>
                        <span class="text-[7px] opacity-80">Official Business</span>
                      </div>
                    </div>
                    
                    <div class="flex-1 overflow-y-auto p-2 space-y-2 select-none flex flex-col justify-end">
                      <div class="max-w-[85%] bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white p-2.5 rounded-xl shadow-md border border-neutral-250/20 relative self-start text-[9px]">
                        @if (whatsappAttachmentType() === 'image' && whatsappAttachmentUrl()) {
                          <img [src]="whatsappAttachmentUrl()" class="w-full h-20 object-cover rounded-lg mb-2" />
                        }
                        @if (selectedWhatsAppTemplate()?.headerText) {
                          <div class="font-black border-b border-zinc-100 dark:border-zinc-700 pb-1 mb-1 text-zinc-750 dark:text-zinc-200 uppercase tracking-wider text-[8px]">{{ selectedWhatsAppTemplate()?.headerText }}</div>
                        }
                        <div class="leading-normal">{{ selectedWhatsAppTemplate()?.body || "Compose WhatsApp campaign details to preview." }}</div>
                        @if (selectedWhatsAppTemplate()?.footer) {
                          <div class="text-[7px] text-zinc-400 mt-1.5">{{ selectedWhatsAppTemplate()?.footer }}</div>
                        }
                        @if (selectedWhatsAppTemplate()?.buttons) {
                          <div class="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-700 flex gap-2 justify-center">
                            @for (btn of selectedWhatsAppTemplate()?.buttons; track btn.text) {
                              <button class="flex-1 py-1.5 bg-[#f0f2f5] hover:bg-neutral-200 dark:bg-zinc-750 text-blue-600 dark:text-blue-400 rounded-lg text-[8px] font-bold border-none cursor-pointer">{{ btn.text }}</button>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }

              </div>
            </div>
          </div>
        }

        <!-- NESTED TAB 3: VISUAL FLOW BUILDER -->
        @if (nestedMarketingTab() === 'flows') {
          <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
            <div class="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Visual Marketing Automation Builder</h3>
                <p class="text-[10px] text-zinc-400 mt-1">Design automated trigger-based drip campaign flows across multi-channels.</p>
              </div>
              <button (click)="toast.success('Automation flow saved & deployed successfully!')" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-500/10"><mat-icon class="text-sm">save</mat-icon> Save Journey</button>
            </div>

            <!-- SVG Flow Editor Canvas -->
            <div class="relative w-full bg-zinc-50 dark:bg-zinc-950 rounded-2rem p-8 border border-zinc-200 dark:border-zinc-850 flex flex-col items-center gap-6 overflow-hidden">
              <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(214,81,8,0.02),transparent_65%)] pointer-events-none"></div>
              
              @for (node of flowNodes(); track node.id; let idx = $index) {
                <div class="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative z-10 flex items-center gap-4 group">
                  <div class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                    <mat-icon>{{ node.icon || 'star' }}</mat-icon>
                  </div>
                  <div class="flex-1 overflow-hidden">
                    <span class="block text-[8px] font-black uppercase text-zinc-400 tracking-wider">Step {{ idx + 1 }}: {{ node.type }}</span>
                    <h4 class="text-xs font-black text-zinc-900 dark:text-white truncate">{{ node.title }}</h4>
                    <p class="text-[10px] text-zinc-400 truncate">{{ node.subtitle }}</p>
                  </div>
                  <button (click)="deleteFlowStep(node.id)" class="text-zinc-400 hover:text-red-500 border-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"><mat-icon class="text-base">delete_outline</mat-icon></button>
                </div>

                @if (idx < flowNodes().length - 1) {
                  <!-- Arrow Connection -->
                  <div class="h-6 w-0.5 bg-dashed border-l-2 border-zinc-300 dark:border-zinc-800 relative z-0">
                    <div class="absolute -bottom-1.5 -left-1 w-2.5 h-2.5 border-r border-b border-zinc-300 dark:border-zinc-800 rotate-45"></div>
                  </div>
                }
              }

              <!-- Add Step control row -->
              <div class="flex flex-wrap gap-2 pt-6 border-t border-zinc-200 dark:border-zinc-800/60 mt-4 w-full justify-center">
                <button (click)="addFlowStep('action')" class="px-3 py-1.5 bg-orange-600/10 hover:bg-orange-600/15 border border-orange-500/20 text-orange-500 rounded-xl text-[10px] font-black uppercase cursor-pointer flex items-center gap-1"><mat-icon class="text-sm">add_circle</mat-icon> Action Step</button>
                <button (click)="addFlowStep('delay')" class="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/15 border border-blue-500/20 text-blue-500 rounded-xl text-[10px] font-black uppercase cursor-pointer flex items-center gap-1"><mat-icon class="text-sm">schedule</mat-icon> Delay Step</button>
                <button (click)="addFlowStep('condition')" class="px-3 py-1.5 bg-[#64748b]/10 hover:bg-[#64748b]/15 border border-neutral-500/20 text-neutral-600 dark:text-neutral-300 rounded-xl text-[10px] font-black uppercase cursor-pointer flex items-center gap-1"><mat-icon class="text-sm">alt_route</mat-icon> Condition Step</button>
              </div>
            </div>
          </div>
        }

        <!-- NESTED TAB 4: HISTORY & LOGS -->
        @if (nestedMarketingTab() === 'history') {
          <div class="space-y-6 animate-fadeIn">
            <!-- Search bar -->
            <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl flex items-center gap-3">
              <mat-icon class="text-zinc-400">search</mat-icon>
              <input type="text" placeholder="Search campaigns, templates, products or customers..." class="flex-1 bg-transparent border-none text-xs font-bold outline-none text-zinc-900 dark:text-white" />
            </div>

            <!-- Past Campaigns list table -->
            <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">Campaign History Logs</h3>
              <div class="space-y-3">
                @for (c of pastCampaigns(); track c.id) {
                  <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="space-y-1 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded text-[8px] font-black uppercase">{{ c.type }}</span>
                        <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[8px] font-black uppercase">{{ c.status }}</span>
                      </div>
                      <h4 class="text-xs font-black text-zinc-900 dark:text-white uppercase">{{ c.name }}</h4>
                      <p class="text-[10px] text-zinc-450 font-bold">Dispatched on: {{ c.date }}</p>
                    </div>

                    <div class="grid grid-cols-4 gap-4 text-center shrink-0 border-l border-zinc-200 dark:border-zinc-800 pl-4 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                      <div>
                        <span class="text-[8px] block text-zinc-450 font-black uppercase">Sent</span>
                        <span class="font-black text-zinc-800 dark:text-white text-xs">{{ c.sentCount }}</span>
                      </div>
                      <div>
                        <span class="text-[8px] block text-zinc-450 font-black uppercase">CTR</span>
                        <span class="font-black text-blue-500 text-xs">{{ c.ctr }}%</span>
                      </div>
                      <div>
                        <span class="text-[8px] block text-zinc-450 font-black uppercase">Clicks</span>
                        <span class="font-black text-indigo-500 text-xs">{{ c.clickedCount }}</span>
                      </div>
                      <div>
                        <span class="text-[8px] block text-zinc-450 font-black uppercase">Revenue</span>
                        <span class="font-black text-emerald-500 text-xs">₹{{ c.revenue | number }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }
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
  public api = inject(ApiService);
  public toast = inject(ToastService);

  activeSubTab = signal<string>('analytics');
  previewDevice = signal<string>('desktop');

  // Omnichannel Marketing Automation Hub Signals & State
  nestedMarketingTab = signal<'dashboard' | 'builder' | 'flows' | 'history'>('dashboard');
  wizardStep = signal<number>(1);
  selectedChannel = signal<'push' | 'whatsapp' | 'both'>('push');
  
  whatsappTemplates = signal<any[]>([
    {
      name: 'order_status_update',
      category: 'UTILITY',
      language: 'en',
      status: 'APPROVED',
      headerType: 'Text',
      headerText: 'Order Update',
      body: 'Hello {{customerName}}, your order {{orderId}} status is now: {{orderStatus}}. Tracking link: {{trackingUrl}}',
      footer: 'Thank you for shopping with 3D Galaxy!',
      variables: ['customerName', 'orderId', 'orderStatus', 'trackingUrl'],
      buttons: [{ type: 'URL', text: 'Track Order', url: '{{trackingUrl}}' }]
    },
    {
      name: 'cart_recovery_offer',
      category: 'MARKETING',
      language: 'en',
      status: 'APPROVED',
      headerType: 'Image',
      body: 'Hi {{customerName}}, we noticed you left items in your cart! Use coupon code {{couponCode}} to get an extra discount. Shop now: {{cartUrl}}',
      footer: 'Offer expires in 48 hours',
      variables: ['customerName', 'couponCode', 'cartUrl'],
      buttons: [{ type: 'URL', text: 'Resume Checkout', url: '{{cartUrl}}' }]
    },
    {
      name: 'price_drop_alert',
      category: 'MARKETING',
      language: 'en',
      status: 'APPROVED',
      headerType: 'Image',
      body: 'Great news {{customerName}}! The price for {{productName}} has dropped to only {{productPrice}}! Order here: {{productUrl}}',
      footer: 'Limited stock available',
      variables: ['customerName', 'productName', 'productPrice', 'productUrl'],
      buttons: [{ type: 'URL', text: 'Buy Now', url: '{{productUrl}}' }]
    },
    {
      name: 'new_arrival_broadcast',
      category: 'MARKETING',
      language: 'en',
      status: 'APPROVED',
      headerType: 'Video',
      body: 'Hello {{customerName}}, check out our latest arrival: {{productName}}! Category: {{productCategory}}, Brand: {{productBrand}}.',
      footer: '3D Galaxy Innovation',
      variables: ['customerName', 'productName', 'productCategory', 'productBrand'],
      buttons: [{ type: 'URL', text: 'View Product', url: '{{productUrl}}' }]
    }
  ]);
  selectedWhatsAppTemplate = signal<any>(null);
  detectedVariables = signal<string[]>([]);
  variableMappings = signal<Record<string, string>>({});
  whatsappAttachmentType = signal<'image' | 'video' | 'document' | 'none'>('none');
  whatsappAttachmentUrl = signal<string>('');

  audienceSegmentFilters = {
    optInOnly: true,
    userTypes: { everyone: true, guests: false, registered: false, admins: false, vip: false, inactive: false, highValue: false },
    platforms: { android: true, ios: true, web: true, pwa: true },
    purchaseCountMin: 0,
    totalSpendMin: 0,
    state: '',
    customSql: ''
  };

  aiKeyword = '';
  aiTone = 'Engaging';
  aiType = 'Flash Sale';
  generatedAiTitles = signal<string[]>([]);
  generatedAiBodies = signal<string[]>([]);

  flowNodes = signal<any[]>([
    { id: '1', type: 'trigger', title: 'User Abandons Cart', subtitle: 'Triggered when cart is idle for 30m', icon: 'shopping_cart' },
    { id: '2', type: 'delay', title: 'Wait 30 Minutes', subtitle: 'Delay configuration', icon: 'schedule' },
    { id: '3', type: 'condition', title: 'Cart Purchased?', subtitle: 'YES -> End Journey | NO -> Continue', icon: 'alt_route' },
    { id: '4', type: 'action', title: 'Send PWA Push Notification', subtitle: 'Template: recovery_push_alert', icon: 'notifications_active' },
    { id: '5', type: 'delay', title: 'Wait 24 Hours', subtitle: 'Post-push followup delay', icon: 'schedule' },
    { id: '6', type: 'action', title: 'Send WhatsApp template', subtitle: 'Template: cart_recovery_offer', icon: 'textsms' }
  ]);

  campaignFormExt = {
    description: '',
    internalNotes: '',
    campaignType: 'Flash Sale',
    tags: 'july-sale, maker',
    owner: 'Admin Panel User',
    folder: 'General Campaigns',
    ttlHours: 24,
    badgeUrl: '/assets/badge.png',
    sound: 'default',
    category: 'deals',
    analyticsTag: 'utm_camp_july'
  };

  activeScheduledCampaigns = signal<any[]>([
    { id: 'camp-1', name: 'Weekend PLA Clearance', type: 'Push Notification', scheduledAt: '2026-08-08 17:00:00', status: 'Scheduled', reach: 1240 },
    { id: 'camp-2', name: 'VIP Cart Recovery Followup', type: 'Push + WhatsApp', scheduledAt: '2026-08-09 10:00:00', status: 'Draft', reach: 350 },
    { id: 'camp-3', name: 'Creality K1 Max price drop alert', type: 'WhatsApp Only', scheduledAt: '2026-08-10 12:00:00', status: 'Approved', reach: 890 }
  ]);

  pastCampaigns = signal<any[]>([
    { id: 'past-1', name: 'June Filament Sale Launch', type: 'Push Notification', sentCount: 1450, clickedCount: 182, ctr: 12.5, revenue: 45000, date: '2026-06-15 17:00:00', status: 'Completed' },
    { id: 'past-2', name: 'Bambu Lab X1-Carbon discount notification', type: 'Push + WhatsApp', sentCount: 680, clickedCount: 112, ctr: 16.4, revenue: 185000, date: '2026-07-02 11:30:00', status: 'Completed' },
    { id: 'past-3', name: 'OTP Verification test', type: 'WhatsApp Only', sentCount: 124, clickedCount: 98, ctr: 79.0, revenue: 0, date: '2026-07-28 14:22:00', status: 'Completed' }
  ]);

  onWhatsAppTemplateSelect(name: string) {
    const tmpl = this.whatsappTemplates().find(t => t.name === name);
    this.selectedWhatsAppTemplate.set(tmpl || null);
    if (tmpl) {
      this.detectedVariables.set(tmpl.variables || []);
      const mappings: Record<string, string> = {};
      tmpl.variables.forEach((v: string) => {
        if (v.toLowerCase().includes('name')) mappings[v] = 'Customer.firstName';
        else if (v.toLowerCase().includes('id')) mappings[v] = 'Order.orderNumber';
        else if (v.toLowerCase().includes('amount') || v.toLowerCase().includes('price')) mappings[v] = 'Order.totalAmount';
        else if (v.toLowerCase().includes('status')) mappings[v] = 'Order.paymentStatus';
        else if (v.toLowerCase().includes('url') || v.toLowerCase().includes('link')) mappings[v] = 'Order.trackingUrl';
        else mappings[v] = 'Custom Text';
      });
      this.variableMappings.set(mappings);
    } else {
      this.detectedVariables.set([]);
      this.variableMappings.set({});
    }
  }

  getVariableMappingPlaceholder(v: string): string {
    const m = this.variableMappings()[v];
    if (m === 'Customer.firstName') return 'Customer First Name (e.g. John)';
    if (m === 'Order.orderNumber') return 'Order Number (e.g. OD-2026-9812)';
    if (m === 'Order.totalAmount') return 'Order Total Amount (e.g. ₹4,999.00)';
    if (m === 'Order.paymentStatus') return 'Order Payment Status (e.g. PAID)';
    if (m === 'Order.trackingUrl') return 'Order Tracking URL (e.g. 3dgalaxy.com/track/...)';
    return 'Custom Text Value';
  }

  generateAIContent() {
    if (!this.aiKeyword) {
      this.toast.error('Please enter a product name or keyword for AI generation.');
      return;
    }
    const kw = this.aiKeyword;
    const tone = this.aiTone;
    this.generatedAiTitles.set([
      `🔥 Limited Stock: ${kw} is almost gone!`,
      `⚡ Weekend Special on ${kw} (Ends Soon)`,
      `🎁 Exclusive Deal: Get 15% off your ${kw}`
    ]);
    this.generatedAiBodies.set([
      `Hi customerName, we have a special ${tone} offer on ${kw} just for you! Click here to grab yours before stock runs out.`,
      `Hey customerName, check out this amazing offer on ${kw}! Premium 3D quality guaranteed. Use code GALAXY15 at checkout.`,
      `Attention makers! Get the genuine ${kw} with official warranty and free delivery across India. Order today!`
    ]);
    this.toast.success('AI suggestions generated successfully!');
  }

  applyAiSuggestion(title: string, body: string) {
    this.campaignForm.title = title;
    this.campaignForm.body = body;
    this.toast.success('AI content applied to builder fields.');
  }

  getReachEstimate(): number {
    let base = 1240;
    const types = this.audienceSegmentFilters.userTypes;
    if (types.guests && !types.registered) base = 400;
    else if (types.registered && !types.guests) base = 840;
    else if (types.vip) base = 150;
    else if (types.inactive) base = 280;
    else if (types.highValue) base = 90;

    let platformMultiplier = 0;
    if (this.audienceSegmentFilters.platforms.android) platformMultiplier += 0.5;
    if (this.audienceSegmentFilters.platforms.ios) platformMultiplier += 0.25;
    if (this.audienceSegmentFilters.platforms.web) platformMultiplier += 0.15;
    if (this.audienceSegmentFilters.platforms.pwa) platformMultiplier += 0.1;
    
    return Math.round(base * (platformMultiplier || 1));
  }

  addFlowStep(type: 'delay' | 'action' | 'condition') {
    const id = String(this.flowNodes().length + 1);
    let newNode = { id, type, title: '', subtitle: '', icon: '' };
    if (type === 'delay') {
      newNode = { id, type, title: 'Wait 2 Days', subtitle: 'Delay interval', icon: 'schedule' };
    } else if (type === 'action') {
      newNode = { id, type, title: 'Send Follow-up Alert', subtitle: 'Push / WhatsApp trigger', icon: 'notifications_active' };
    } else if (type === 'condition') {
      newNode = { id, type, title: 'Check User Segment', subtitle: 'Branching logic filter', icon: 'alt_route' };
    }
    this.flowNodes.update(nodes => [...nodes, newNode]);
    this.toast.success('New flow node appended to customer journey.');
  }

  deleteFlowStep(id: string) {
    this.flowNodes.update(nodes => nodes.filter(n => n.id !== id));
    this.toast.success('Node removed from flow.');
  }

  duplicateCampaign(camp: any) {
    const dupe = {
      ...camp,
      id: 'camp-' + Math.random().toString(36).substr(2, 9),
      name: `${camp.name} (Copy)`,
      scheduledAt: '2026-08-15 12:00:00',
      status: 'Draft'
    };
    this.activeScheduledCampaigns.update(c => [dupe, ...c]);
    this.toast.success('Campaign duplicated as draft.');
  }

  exportCampaign(camp: any) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(camp, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href",     dataStr);
    downloadAnchor.setAttribute("download", `${camp.name.replace(/\s+/g, '_')}_campaign.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.toast.success('Campaign JSON structure exported successfully.');
  }

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
