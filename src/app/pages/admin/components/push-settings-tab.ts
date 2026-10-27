import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { DatastoreService } from '../../../services/datastore';
import { NotificationService } from '../../../services/notification.service';

const FALLBACK_PRODUCT_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="%23f97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21 16-9 5-9-5V8l9-5 9 5v8Z"/><path d="M12 21V12"/><path d="M3.27 6.96 12 12l8.73-5.04"/></svg>`;

@Component({
  selector: 'app-admin-push-settings-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="space-y-6 font-sans">
      
      <!-- Top Navigation Tabs Switcher -->
      <div class="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 class="text-lg font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
            <span class="w-8 h-8 rounded-xl bg-orange-600/10 text-orange-500 flex items-center justify-center">
              <mat-icon>notifications_active</mat-icon>
            </span>
            Push Notification Marketing Hub
          </h2>
          <p class="text-xs text-zinc-400 mt-1">PWA Web Push Campaigns, Subscriber Devices, Realtime Delivery Analytics & Monthly Billing.</p>
        </div>
        
        <div class="flex flex-wrap items-center gap-1.5">
          <button (click)="activeSubTab.set('overview')" [class]="activeSubTab() === 'overview' ? 'bg-orange-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs flex items-center gap-1.5">
            <mat-icon class="text-sm">dashboard</mat-icon> Overview
          </button>
          
          <button (click)="activeSubTab.set('campaigns'); campaignManagerMode.set('list')" [class]="activeSubTab() === 'campaigns' ? 'bg-orange-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs flex items-center gap-1.5">
            <mat-icon class="text-sm">campaign</mat-icon> Campaigns
            @if (allCampaigns().length > 0) {
              <span class="px-1.5 py-0.5 rounded-full text-[9px] font-black" [class]="activeSubTab() === 'campaigns' ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-500'">{{ allCampaigns().length }}</span>
            }
          </button>
          
          <button (click)="activeSubTab.set('devices')" [class]="activeSubTab() === 'devices' ? 'bg-orange-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs flex items-center gap-1.5">
            <mat-icon class="text-sm">devices</mat-icon> Devices & Opt-In
            @if (subscriberDevices().length > 0) {
              <span class="px-1.5 py-0.5 rounded-full text-[9px] font-black" [class]="activeSubTab() === 'devices' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'">{{ optedInDevicesCount() }}</span>
            }
          </button>
          
          <button (click)="activeSubTab.set('billing')" [class]="activeSubTab() === 'billing' ? 'bg-orange-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs flex items-center gap-1.5">
            <mat-icon class="text-sm">receipt_long</mat-icon> Monthly Billing
          </button>
          
          <button (click)="activeSubTab.set('analytics')" [class]="activeSubTab() === 'analytics' ? 'bg-orange-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs flex items-center gap-1.5">
            <mat-icon class="text-sm">insights</mat-icon> Analytics
          </button>
          
          <button (click)="activeSubTab.set('logs')" [class]="activeSubTab() === 'logs' ? 'bg-orange-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs flex items-center gap-1.5">
            <mat-icon class="text-sm">history</mat-icon> Logs & Audit
          </button>
          
          <button (click)="activeSubTab.set('fcm-config')" [class]="activeSubTab() === 'fcm-config' ? 'bg-orange-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs flex items-center gap-1.5">
            <mat-icon class="text-sm">vpn_key</mat-icon> FCM Credentials
          </button>
          
          <button (click)="activeSubTab.set('popup-designer')" [class]="activeSubTab() === 'popup-designer' ? 'bg-orange-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'" class="px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs flex items-center gap-1.5">
            <mat-icon class="text-sm">brush</mat-icon> Popup Designer
          </button>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- SECTION 1: OVERVIEW DASHBOARD -->
      <!-- ======================================================== -->
      @if (activeSubTab() === 'overview') {
        <div class="space-y-6 animate-fadeIn">
          
          <!-- Refresh bar with authoritative backend evidence -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-white">Live System Engine Active</span>
              <span class="text-[11px] text-zinc-400">| Last synced: {{ lastRefreshed() }}</span>
            </div>
            <div class="flex items-center gap-2">
              <button (click)="refreshAllHubData()" class="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer flex items-center gap-1.5 transition-all">
                <mat-icon class="text-sm">refresh</mat-icon> Refresh
              </button>
              <button (click)="openCreateCampaignWizard()" class="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer flex items-center gap-1.5 shadow-sm transition-all">
                <mat-icon class="text-sm">add</mat-icon> New Push Campaign
              </button>
            </div>
          </div>

          <!-- 10 Summary Cards from Real Backend Data -->
          <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            
            <!-- 1. Total Campaigns -->
            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-zinc-400">Total Campaigns</span>
              <h3 class="text-2xl font-black text-zinc-900 dark:text-white">{{ allCampaigns().length }}</h3>
              <p class="text-[10px] text-zinc-400">All created campaigns</p>
            </div>

            <!-- 2. Active Dispatches -->
            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-blue-500">Active Dispatches</span>
              <h3 class="text-2xl font-black text-blue-500">{{ analyticsSummary().activeCampaigns || 0 }}</h3>
              <p class="text-[10px] text-zinc-400">Sending or in queue</p>
            </div>

            <!-- 3. Opted-in Push Devices -->
            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1 cursor-pointer" (click)="activeSubTab.set('devices')">
              <span class="text-[9px] font-black uppercase tracking-wider text-emerald-500">Opted-In Devices</span>
              <div class="flex items-baseline justify-between">
                <h3 class="text-2xl font-black text-emerald-500">{{ optedInDevicesCount() }}</h3>
                <span class="text-[10px] text-zinc-400 font-bold">of {{ subscriberDevices().length }}</span>
              </div>
              <p class="text-[10px] text-zinc-400">Active PWA subscriptions</p>
            </div>

            <!-- 4. Notifications Queued -->
            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-amber-500">Notifications Queued</span>
              <h3 class="text-2xl font-black text-amber-500">{{ analyticsSummary().notificationsQueued || 0 }}</h3>
              <p class="text-[10px] text-zinc-400">Pending worker pickup</p>
            </div>

            <!-- 5. Notifications Sent -->
            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-orange-500">Successfully Sent</span>
              <h3 class="text-2xl font-black text-orange-500">{{ analyticsSummary().notificationsSent || 0 }}</h3>
              <p class="text-[10px] text-zinc-400">Accepted by push service</p>
            </div>

            <!-- 6. Notifications Delivered -->
            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-emerald-600">Confirmed Delivery</span>
              <div class="flex items-baseline justify-between">
                <h3 class="text-2xl font-black text-emerald-600">{{ analyticsSummary().delivered || 0 }}</h3>
                <span class="text-xs font-black text-emerald-500">{{ analyticsSummary().deliveryRate || 0.0 }}%</span>
              </div>
              <p class="text-[10px] text-zinc-400">Device confirmed receipts</p>
            </div>

            <!-- 7. Notifications Opened -->
            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-purple-500">Opens & Read Rate</span>
              <div class="flex items-baseline justify-between">
                <h3 class="text-2xl font-black text-purple-500">{{ analyticsSummary().opened || 0 }}</h3>
                <span class="text-xs font-black text-purple-400">{{ analyticsSummary().openRate || 0.0 }}%</span>
              </div>
              <p class="text-[10px] text-zinc-400">Notification views & opens</p>
            </div>

            <!-- 8. Clicks & CTR -->
            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-indigo-500">Clicks & CTR</span>
              <div class="flex items-baseline justify-between">
                <h3 class="text-2xl font-black text-indigo-500">{{ analyticsSummary().clicked || 0 }}</h3>
                <span class="text-xs font-black text-emerald-500">{{ analyticsSummary().ctr || 0.0 }}%</span>
              </div>
              <p class="text-[10px] text-zinc-400">User interactions</p>
            </div>

            <!-- 8. Monthly Billable Usage -->
            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1 cursor-pointer" (click)="activeSubTab.set('billing')">
              <span class="text-[9px] font-black uppercase tracking-wider text-purple-500">Month's Billable Usage</span>
              <h3 class="text-2xl font-black text-purple-500">{{ analyticsSummary().currentMonthBillableUsage || 0 }}</h3>
              <p class="text-[10px] text-zinc-400">Current calendar cycle</p>
            </div>

            <!-- 9. Month's Estimated Charge -->
            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1 cursor-pointer relative group/kpirate" (click)="activeSubTab.set('billing')">
              <span class="text-[9px] font-black uppercase tracking-wider text-emerald-500">Month's Charge</span>
              <h3 class="text-2xl font-black text-emerald-500">₹{{ (analyticsSummary().currentMonthEstimatedCharge || 0) | number:'1.2-2' }}</h3>
              @if (analyticsSummary().previousMonth) {
                <span class="text-[9px] text-zinc-400 font-bold block">Prev: ₹{{ analyticsSummary().previousMonth.totalAmount }}</span>
              } @else {
                <p class="text-[10px] text-zinc-400 flex items-center gap-1 cursor-help hover:text-purple-400 transition-colors">
                  <span>Rate: ₹{{ monthlyBillingData()?.financials?.unitRate || 0.05 }} / notif</span>
                  <span class="text-[8px] px-1 py-0.2 rounded bg-purple-500/10 text-purple-400 font-bold font-mono">{{ monthlyBillingData()?.financials?.activeTier || '1–10,000' }}</span>
                  <mat-icon class="text-[11px] text-zinc-500">info</mat-icon>
                </p>
              }

              <!-- Popover on Hover -->
              <div class="invisible group-hover/kpirate:visible opacity-0 group-hover/kpirate:opacity-100 transition-all duration-200 absolute left-0 bottom-full mb-2 z-50 w-72 bg-black border border-zinc-800 rounded-2xl p-3 shadow-2xl space-y-2 pointer-events-none">
                <div class="flex justify-between items-center text-[9px] font-black uppercase text-zinc-400 pb-1.5 border-b border-zinc-800">
                  <span>Monthly volume per project</span>
                  <span>Rate / push</span>
                </div>
                <div class="space-y-1">
                  @for (t of billingTiers; track t.label) {
                    <div class="flex justify-between items-center py-1 px-2 rounded-lg text-[11px]"
                         [ngClass]="(monthlyBillingData()?.financials?.activeTier || '1–10,000') === t.label ? 'bg-purple-950/60 text-purple-300 font-bold border border-purple-500/30' : 'text-zinc-300'">
                      <span>{{ t.label }}</span>
                      <span class="font-mono font-bold">{{ t.priceLabel }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- 10. Failed Notifications -->
            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-red-500">Failed Sends</span>
              <h3 class="text-2xl font-black text-red-500">{{ analyticsSummary().failedDeliveries || 0 }}</h3>
              <p class="text-[10px] text-zinc-400">Excluded from billing</p>
            </div>

          </div>

          <!-- Recent Campaigns Dispatches Feed -->
          <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                  <mat-icon class="text-base text-orange-500">campaign</mat-icon>
                  Recent Push Broadcasts & Activity
                </h3>
                <p class="text-[11px] text-zinc-400 mt-0.5">Authoritative status of recently dispatched or draft campaigns.</p>
              </div>
              <div class="flex items-center gap-2">
                <button (click)="refreshAllHubData()" title="Refresh Campaigns & Metrics" class="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-black uppercase border-none cursor-pointer flex items-center gap-1 transition-all">
                  <mat-icon class="text-xs">refresh</mat-icon> Refresh
                </button>
                <button (click)="activeSubTab.set('campaigns'); campaignManagerMode.set('list')" class="text-orange-500 text-xs font-black uppercase border-none bg-transparent cursor-pointer hover:underline flex items-center gap-1">
                  View All Campaigns <mat-icon class="text-xs">chevron_right</mat-icon>
                </button>
              </div>
            </div>

            <div class="space-y-3">
              @if (allCampaigns().length === 0) {
                <div class="p-8 text-center text-xs text-zinc-400 font-bold uppercase border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  No campaigns dispatched yet. Launch your first push notification campaign.
                </div>
              } @else {
                @for (c of allCampaigns().slice(0, 5); track c.id) {
                  <div class="p-4 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex items-start gap-3 min-w-0 flex-1">
                      <div class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 shrink-0 overflow-hidden flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                        @if (c.image) {
                          <img [src]="c.image" class="w-full h-full object-cover" (error)="onProductImgError($event)" />
                        } @else {
                          <mat-icon class="text-sm">notifications</mat-icon>
                        }
                      </div>
                      <div class="space-y-1 min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-orange-500/10 text-orange-500">{{ c.type }}</span>
                          <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase"
                                [ngClass]="c.status === 'Sent' || c.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : (c.status === 'Draft' ? 'bg-zinc-500/10 text-zinc-400' : 'bg-blue-500/10 text-blue-500')">
                            {{ c.status }}
                          </span>
                          <span class="text-[10px] text-zinc-400 font-bold">{{ c.date }}</span>
                        </div>
                        <h4 class="text-xs font-black text-zinc-900 dark:text-white truncate">{{ c.name }}</h4>
                        <p class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{{ c.title }}</p>
                      </div>
                    </div>

                    <div class="flex items-center gap-6 shrink-0 font-mono text-[10px] border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 pt-3 md:pt-0 md:pl-5">
                      <div class="text-center">
                        <span class="text-[8px] block text-zinc-400 uppercase font-black">Sent</span>
                        <span class="font-black text-zinc-800 dark:text-white text-xs">{{ c.sentCount }}</span>
                      </div>
                      <div class="text-center">
                        <span class="text-[8px] block text-zinc-400 uppercase font-black">Delivered</span>
                        <span class="font-black text-orange-500 text-xs">{{ c.deliveredCount }}</span>
                      </div>
                      <div class="text-center">
                        <span class="text-[8px] block text-zinc-400 uppercase font-black">Clicks</span>
                        <span class="font-black text-indigo-500 text-xs">{{ c.clickedCount }}</span>
                      </div>
                      <div class="flex items-center gap-1.5 pl-2">
                        <button (click)="useCampaignAsTemplate(c)" title="Duplicate / Edit" class="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 rounded-lg hover:text-orange-500 cursor-pointer">
                          <mat-icon class="text-xs">content_copy</mat-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        </div>
      }

      <!-- ======================================================== -->
      <!-- SECTION 2: CAMPAIGNS (LIST OR 5-STEP WIZARD) -->
      <!-- ======================================================== -->
      @if (activeSubTab() === 'campaigns') {
        
        <!-- Toggle header: List view vs New Wizard -->
        <div class="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-6">
          <div class="flex items-center gap-2">
            <button (click)="campaignManagerMode.set('list')" [class]="campaignManagerMode() === 'list' ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'" class="px-4 py-2 text-xs font-black uppercase rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-all">
              <mat-icon class="text-sm">list</mat-icon> All Campaigns ({{ allCampaigns().length }})
            </button>
            <button (click)="openCreateCampaignWizard()" [class]="campaignManagerMode() === 'wizard' ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'" class="px-4 py-2 text-xs font-black uppercase rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-all">
              <mat-icon class="text-sm">add</mat-icon> Create Campaign Wizard
            </button>
          </div>
          <span class="text-xs text-zinc-400 font-bold hidden sm:inline">PWA / Web Push Channels Only</span>
        </div>

        <!-- VIEW A: CAMPAIGN LIST -->
        @if (campaignManagerMode() === 'list') {
          <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <!-- Filter & Search Toolbar (Row 1: Search + Status Pills + Actions) -->
            <div class="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <!-- Search Input with Clear Button -->
              <div class="relative flex-1">
                <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">search</mat-icon>
                <input type="text"
                       [ngModel]="campaignSearchQuery()"
                       (ngModelChange)="campaignSearchQuery.set($event)"
                       placeholder="Search campaigns by title, body, URL or tag..."
                       class="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500 text-zinc-900 dark:text-white transition-all" />
                @if (campaignSearchQuery()) {
                  <button (click)="campaignSearchQuery.set('')"
                          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 border-none bg-transparent cursor-pointer p-0.5">
                    <mat-icon class="text-xs">close</mat-icon>
                  </button>
                }
              </div>

              <!-- Status Filter Pills with Live Badges -->
              <div class="flex items-center gap-2 flex-wrap">
                <div class="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                  <button (click)="campaignFilter.set('all')"
                          [class]="campaignFilter() === 'all' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-black shadow-xs' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'"
                          class="px-3 py-1 text-[10px] uppercase rounded-lg border-none cursor-pointer transition-all flex items-center gap-1.5">
                    <span>All</span>
                    <span class="px-1.5 py-0.2 rounded-full text-[9px]" [class]="campaignFilter() === 'all' ? 'bg-orange-500/10 text-orange-500 font-black' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'">{{ campaignCounts().all }}</span>
                  </button>

                  <button (click)="campaignFilter.set('sent')"
                          [class]="campaignFilter() === 'sent' ? 'bg-white dark:bg-zinc-900 text-emerald-500 font-black shadow-xs' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'"
                          class="px-3 py-1 text-[10px] uppercase rounded-lg border-none cursor-pointer transition-all flex items-center gap-1.5">
                    <span>Sent</span>
                    <span class="px-1.5 py-0.2 rounded-full text-[9px]" [class]="campaignFilter() === 'sent' ? 'bg-emerald-500/20 text-emerald-500 font-black' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'">{{ campaignCounts().sent }}</span>
                  </button>

                  <button (click)="campaignFilter.set('draft')"
                          [class]="campaignFilter() === 'draft' ? 'bg-white dark:bg-zinc-900 text-amber-500 font-black shadow-xs' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'"
                          class="px-3 py-1 text-[10px] uppercase rounded-lg border-none cursor-pointer transition-all flex items-center gap-1.5">
                    <span>Drafts</span>
                    <span class="px-1.5 py-0.2 rounded-full text-[9px]" [class]="campaignFilter() === 'draft' ? 'bg-amber-500/20 text-amber-500 font-black' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'">{{ campaignCounts().draft }}</span>
                  </button>

                  @if (campaignCounts().failed > 0) {
                    <button (click)="campaignFilter.set('failed')"
                            [class]="campaignFilter() === 'failed' ? 'bg-white dark:bg-zinc-900 text-rose-500 font-black shadow-xs' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'"
                            class="px-3 py-1 text-[10px] uppercase rounded-lg border-none cursor-pointer transition-all flex items-center gap-1.5">
                      <span>Failed</span>
                      <span class="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500/20 text-rose-500 font-black">{{ campaignCounts().failed }}</span>
                    </button>
                  }
                </div>

                <button (click)="refreshAllHubData()" title="Refresh Campaigns" class="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl border-none cursor-pointer flex items-center transition-all">
                  <mat-icon class="text-sm">refresh</mat-icon>
                </button>
                <button (click)="openCreateCampaignWizard()" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer flex items-center gap-1.5 shadow-sm transition-all shrink-0">
                  <mat-icon class="text-sm">add</mat-icon> New Campaign
                </button>
              </div>
            </div>

            <!-- Row 2: Secondary Dropdown Filters (Category, Date Range, Sort) & Counter -->
            <div class="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              <div class="flex items-center gap-2 flex-wrap">
                <!-- Category Select -->
                <div class="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 shadow-2xs">
                  <mat-icon class="text-zinc-400 text-xs">category</mat-icon>
                  <span class="text-[10px] font-black uppercase text-zinc-400">Category:</span>
                  <select [ngModel]="campaignCategoryFilter()"
                          (ngModelChange)="campaignCategoryFilter.set($event)"
                          class="bg-transparent border-none outline-none text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer pr-1">
                    <option value="all" class="bg-white dark:bg-zinc-900">All Categories</option>
                    @for (cat of availableCategories(); track cat) {
                      <option [value]="cat" class="bg-white dark:bg-zinc-900">{{ cat }}</option>
                    }
                  </select>
                </div>

                <!-- Date Range Select -->
                <div class="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 shadow-2xs">
                  <mat-icon class="text-zinc-400 text-xs">calendar_today</mat-icon>
                  <span class="text-[10px] font-black uppercase text-zinc-400">Period:</span>
                  <select [ngModel]="campaignDateFilter()"
                          (ngModelChange)="campaignDateFilter.set($event)"
                          class="bg-transparent border-none outline-none text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer pr-1">
                    <option value="all" class="bg-white dark:bg-zinc-900">All Time</option>
                    <option value="today" class="bg-white dark:bg-zinc-900">Today (Last 24h)</option>
                    <option value="7days" class="bg-white dark:bg-zinc-900">Last 7 Days</option>
                    <option value="30days" class="bg-white dark:bg-zinc-900">Last 30 Days</option>
                  </select>
                </div>

                <!-- Sort By Select -->
                <div class="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 shadow-2xs">
                  <mat-icon class="text-zinc-400 text-xs">swap_vert</mat-icon>
                  <span class="text-[10px] font-black uppercase text-zinc-400">Sort:</span>
                  <select [ngModel]="campaignSortBy()"
                          (ngModelChange)="campaignSortBy.set($event)"
                          class="bg-transparent border-none outline-none text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer pr-1">
                    <option value="newest" class="bg-white dark:bg-zinc-900">Most Recent</option>
                    <option value="oldest" class="bg-white dark:bg-zinc-900">Oldest First</option>
                    <option value="sends" class="bg-white dark:bg-zinc-900">Highest Dispatched</option>
                    <option value="clicks" class="bg-white dark:bg-zinc-900">Most Clicks</option>
                    <option value="ctr" class="bg-white dark:bg-zinc-900">Highest CTR (%)</option>
                  </select>
                </div>
              </div>

              <!-- Active Filters Count & Reset Button -->
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-zinc-400">
                  Showing <span class="font-black text-zinc-800 dark:text-zinc-200">{{ filteredCampaigns().length }}</span> of {{ allCampaigns().length }}
                </span>

                @if (hasActiveCampaignFilters()) {
                  <button (click)="resetCampaignFilters()"
                          class="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase border-none cursor-pointer flex items-center gap-1 transition-all">
                    <mat-icon class="text-xs">clear_all</mat-icon> Reset Filters
                  </button>
                }
              </div>
            </div>

            <div class="space-y-3">
              @if (filteredCampaigns().length === 0) {
                <div class="p-8 text-center text-xs text-zinc-400 font-bold uppercase border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  No campaigns found matching current filters.
                </div>
              } @else {
                @for (c of filteredCampaigns(); track c.id) {
                  <div class="p-4 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl hover:border-orange-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div class="flex items-start gap-3.5 flex-1 min-w-0">
                      <div class="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                        @if (c.image) {
                          <img [src]="c.image" class="w-full h-full object-cover" (error)="onProductImgError($event)" />
                        } @else {
                          <mat-icon class="text-orange-500 text-xl">notifications</mat-icon>
                        }
                      </div>

                      <div class="space-y-1 min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded text-[9px] font-black uppercase">{{ c.type }}</span>
                          <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase"
                                [ngClass]="c.status === 'Sent' || c.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : (c.status === 'Draft' ? 'bg-zinc-500/10 text-zinc-400' : 'bg-blue-500/10 text-blue-500')">
                            {{ c.status }}
                          </span>
                          @if (c.priority === 'High') {
                            <span class="px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded text-[8px] font-black uppercase">High Priority</span>
                          }
                        </div>
                        <h4 class="text-xs font-black text-zinc-900 dark:text-white truncate">{{ c.name }}</h4>
                        <div class="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-2 truncate">
                          <span class="font-bold text-zinc-800 dark:text-zinc-200">{{ c.title }}</span>
                          @if (c.body) {
                            <span>•</span>
                            <span class="text-zinc-400 truncate">{{ c.body }}</span>
                          }
                        </div>
                        <div class="flex items-center gap-3 text-[10px] text-zinc-400 pt-0.5 flex-wrap">
                          @if (c.date && c.date !== 'N/A') {
                            <span class="flex items-center gap-1"><mat-icon class="text-[12px] h-3 w-3">schedule</mat-icon> Dispatched: {{ c.date }}</span>
                          }
                          @if (c.actionUrl) {
                            <span class="flex items-center gap-1 text-zinc-400 font-mono text-[9px] truncate max-w-xs"><mat-icon class="text-[12px] h-3 w-3">link</mat-icon> {{ c.actionUrl }}</span>
                          }
                        </div>
                      </div>
                    </div>

                    <!-- Metrics: DISPATCHED, DELIVERED, OPENS, CLICKS, CTR -->
                    <div class="grid grid-cols-5 gap-2 text-center shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 pt-3 lg:pt-0 lg:pl-5 font-mono">
                      <div class="px-1.5">
                        <span class="text-[8px] block text-zinc-400 font-black uppercase">Dispatched</span>
                        <span class="font-black text-zinc-900 dark:text-white text-xs">{{ c.sentCount }}</span>
                      </div>
                      <div class="px-1.5">
                        <span class="text-[8px] block text-zinc-400 font-black uppercase">Delivered</span>
                        <span class="font-black text-orange-500 text-xs">{{ c.deliveredCount }}</span>
                        @if (c.sentCount > 0) {
                          <span class="text-[8px] text-zinc-400 block font-bold">{{ c.deliveryRate }}%</span>
                        }
                      </div>
                      <div class="px-1.5">
                        <span class="text-[8px] block text-zinc-400 font-black uppercase">Opens</span>
                        <span class="font-black text-purple-500 text-xs">{{ c.openedCount }}</span>
                        @if (c.deliveredCount > 0) {
                          <span class="text-[8px] text-purple-400 block font-bold">{{ c.openRate }}%</span>
                        }
                      </div>
                      <div class="px-1.5">
                        <span class="text-[8px] block text-zinc-400 font-black uppercase">Clicks</span>
                        <span class="font-black text-blue-500 text-xs">{{ c.clickedCount }}</span>
                      </div>
                      <div class="px-1.5">
                        <span class="text-[8px] block text-zinc-400 font-black uppercase">CTR</span>
                        <span class="font-black text-emerald-500 text-xs">{{ c.ctr }}%</span>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-1.5 justify-end shrink-0 border-t lg:border-t-0 border-zinc-200 dark:border-zinc-800 pt-2 lg:pt-0 flex-wrap">
                      <button (click)="openCampaignAnalytics(c)" title="View Detailed Campaign Performance & Funnel" class="px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 font-black rounded-xl text-[10px] uppercase border-none cursor-pointer flex items-center gap-1 transition-all">
                        <mat-icon class="text-xs">insights</mat-icon> Analytics
                      </button>
                      <button (click)="useCampaignAsTemplate(c)" title="Send Again / Edit in Composer" class="px-2.5 py-1.5 bg-orange-600/10 hover:bg-orange-600/20 text-orange-500 font-black rounded-xl text-[10px] uppercase border-none cursor-pointer flex items-center gap-1 transition-all">
                        <mat-icon class="text-xs">send</mat-icon> Re-send
                      </button>
                      <button (click)="duplicateCampaign(c)" title="Duplicate as Draft" class="p-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 rounded-xl cursor-pointer">
                        <mat-icon class="text-xs">content_copy</mat-icon>
                      </button>
                      <button (click)="exportCampaign(c)" title="Export Config JSON" class="p-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 rounded-xl cursor-pointer">
                        <mat-icon class="text-xs">download</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        }

        <!-- VIEW B: 5-STEP CAMPAIGN WIZARD WITH FUNCTIONAL LIVE PREVIEW -->
        @if (campaignManagerMode() === 'wizard') {
          <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            <!-- Left Side: Wizard Steps Container (7 Cols on Wide) -->
            <div class="xl:col-span-7 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              
              <!-- Step Progress Indicator -->
              <div class="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <span class="text-[10px] font-black uppercase text-zinc-400">Step {{ wizardStep() }} of 5: {{ getWizardStepName(wizardStep()) }}</span>
                <div class="flex items-center gap-1.5">
                  @for (step of [1,2,3,4,5]; track step) {
                    <div [class]="wizardStep() >= step ? 'bg-orange-500' : 'bg-zinc-200 dark:bg-zinc-800'" class="w-8 h-1 rounded-full transition-all"></div>
                  }
                </div>
              </div>

              <!-- STEP 1: CAMPAIGN DETAILS -->
              @if (wizardStep() === 1) {
                <div class="space-y-4 animate-fadeIn">
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">Step 1 — Campaign Details</h3>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2 space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Campaign Name *</label>
                      <input type="text" [(ngModel)]="campaignForm.name" placeholder="e.g. Maker Filament Festive Drop" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-orange-500">
                    </div>

                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Objective</label>
                      <select [(ngModel)]="campaignForm.objective" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer">
                        <option value="Promotional">Promotional Blast</option>
                        <option value="Price Drop">Price Drop Alert</option>
                        <option value="New Arrival">New Hardware Arrival</option>
                        <option value="Cart Recovery">Cart Abandonment Recovery</option>
                        <option value="Re-engagement">Customer Re-engagement</option>
                      </select>
                    </div>

                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Category</label>
                      <select [(ngModel)]="campaignForm.category" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer">
                        <option value="Flash Sale">Flash Sale</option>
                        <option value="Daily Deal">Daily Deal</option>
                        <option value="Hardware Discount">Hardware Discount</option>
                        <option value="Filament Clearance">Filament Clearance</option>
                        <option value="Community Notice">Community Notice</option>
                      </select>
                    </div>

                    <div class="md:col-span-2 space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Internal Description / Notes</label>
                      <textarea [(ngModel)]="campaignForm.description" rows="2" placeholder="Campaign strategy, targeted audience notes, or marketing goals..." class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500"></textarea>
                    </div>

                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Dispatch Strategy</label>
                      <select [(ngModel)]="campaignForm.scheduleMode" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer">
                        <option value="now">Immediate Dispatch (Send Now)</option>
                        <option value="draft">Save as Inactive Draft</option>
                      </select>
                    </div>

                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Optional UTM Campaign Tag</label>
                      <input type="text" [(ngModel)]="campaignForm.utmCampaign" placeholder="e.g. festive_diwali_2026" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500 font-mono">
                    </div>
                  </div>
                </div>
              }

              <!-- STEP 2: AUDIENCE -->
              @if (wizardStep() === 2) {
                <div class="space-y-4 animate-fadeIn">
                  <div class="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Step 2 — Target Audience Selection</h3>
                    <button (click)="refreshAudienceEstimate()" class="text-orange-500 text-xs font-bold uppercase border-none bg-transparent cursor-pointer hover:underline flex items-center gap-1">
                      <mat-icon class="text-xs">refresh</mat-icon> Refresh Count
                    </button>
                  </div>

                  <!-- Audience Reach Summary Card -->
                  <div class="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-between">
                    <div>
                      <span class="text-[9px] font-black uppercase text-orange-500">Eligible Opted-In Push Recipients</span>
                      <h4 class="text-2xl font-black text-zinc-900 dark:text-white">{{ getReachEstimate() }} Devices</h4>
                      <p class="text-[10px] text-zinc-400 mt-0.5">Verified active PWA tokens ready for delivery.</p>
                    </div>
                    <div class="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center">
                      <mat-icon>devices</mat-icon>
                    </div>
                  </div>

                  <div class="space-y-3">
                    <label class="block text-[9px] font-black text-zinc-400 uppercase">Target Segment</label>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      @for (seg of [
                        { id: 'everyone', name: 'All Opted-In Subscribers', desc: 'Broadcast to every valid push subscriber.' },
                        { id: 'active_shoppers', name: 'Active Customers', desc: 'Customers with orders in the last 60 days.' },
                        { id: 'abandoned_cart', name: 'Cart Abandoners', desc: 'Users with items left in their cart.' },
                        { id: 'wishlist', name: 'Wishlist Users', desc: 'Customers tracking favorite products.' }
                      ]; track seg.id) {
                        <div (click)="campaignForm.targetType = seg.id" [class]="campaignForm.targetType === seg.id ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950'" class="p-3.5 rounded-2xl border cursor-pointer transition-all space-y-1">
                          <div class="flex items-center justify-between">
                            <span class="text-xs font-black text-zinc-900 dark:text-white">{{ seg.name }}</span>
                            <span class="w-3 h-3 rounded-full border flex items-center justify-center" [class]="campaignForm.targetType === seg.id ? 'border-orange-500 bg-orange-500' : 'border-zinc-400'"></span>
                          </div>
                          <p class="text-[10px] text-zinc-400">{{ seg.desc }}</p>
                        </div>
                      }
                    </div>

                    <div class="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Platform Targeting</label>
                      <div class="flex gap-2">
                        @for (p of [
                          { id: 'all', label: 'All Platforms' },
                          { id: 'desktop', label: 'Desktop Web Only' },
                          { id: 'mobile', label: 'Android / Mobile Only' }
                        ]; track p.id) {
                          <button (click)="campaignForm.targetPlatform = p.id" [class]="campaignForm.targetPlatform === p.id ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'" class="flex-1 py-2 text-[10px] font-black uppercase rounded-xl border-none cursor-pointer transition-all">
                            {{ p.label }}
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- STEP 3: PUSH NOTIFICATION CONTENT (NO WHATSAPP) -->
              @if (wizardStep() === 3) {
                <div class="space-y-4 animate-fadeIn">
                  <div class="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <h3 class="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
                      <mat-icon class="text-sm">notifications_active</mat-icon>
                      PWA / Web Push Notification Content
                    </h3>
                    <span class="text-[10px] text-zinc-400 font-bold">Standard Push Channel</span>
                  </div>

                  <!-- Product catalogue autocomplete filler -->
                  <div class="space-y-1 relative bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <div class="flex justify-between items-center">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Load from Product Catalogue (Optional)</label>
                      @if (selectedProduct()) {
                        <button (click)="clearSelectedProduct()" class="text-[9px] text-red-500 font-bold border-none bg-transparent cursor-pointer hover:underline">
                          Clear Selected Product
                        </button>
                      }
                    </div>

                    <div class="flex gap-2">
                      <div class="relative flex-1">
                        <input type="text" [(ngModel)]="productSearchQuery" (input)="onProductSearchInput()" placeholder="Search ABS filament, resin, nozzle, printer..." class="w-full pl-3 pr-8 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500 text-zinc-900 dark:text-white font-medium">
                        @if (productSearchQuery) {
                          <button (click)="clearProductSearch()" class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 border-none bg-transparent cursor-pointer">
                            <mat-icon class="text-xs">close</mat-icon>
                          </button>
                        }
                      </div>
                      <button type="button" (click)="searchProducts()" class="px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer flex items-center gap-1">
                        @if (isSearchingProducts()) {
                          <mat-icon class="text-xs animate-spin">refresh</mat-icon>
                        } @else {
                          <mat-icon class="text-xs">search</mat-icon>
                        }
                        Search
                      </button>
                    </div>

                    <!-- Autocomplete dropdown with clean thumbnails & fallback -->
                    @if (searchResults().length > 0) {
                      <div class="absolute z-30 top-full left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl mt-1 shadow-xl max-h-56 overflow-y-auto p-2 space-y-1">
                        @for (p of searchResults(); track p.id) {
                          <button (click)="selectProduct(p)" class="w-full flex items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left border-none bg-transparent rounded-xl cursor-pointer transition-all">
                            <img [src]="p.image || fallbackProductImage" (error)="onProductImgError($event)" class="w-10 h-10 object-contain rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 border border-zinc-200 dark:border-zinc-700 shrink-0" />
                            <div class="flex-1 min-w-0">
                              <h4 class="text-xs font-black truncate text-zinc-900 dark:text-white">{{ p.name }}</h4>
                              <div class="flex items-center gap-2 text-[10px] text-zinc-400">
                                <span class="font-bold text-orange-500">₹{{ p.salePrice || p.basePrice }}</span>
                                @if (p.sku) {
                                  <span class="font-mono text-[9px] text-zinc-400">SKU: {{ p.sku }}</span>
                                }
                              </div>
                            </div>
                            <span class="text-[10px] text-orange-500 font-bold uppercase shrink-0">Use</span>
                          </button>
                        }
                      </div>
                    }
                  </div>

                  <!-- Notification Content Form Fields -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div class="space-y-1">
                      <div class="flex justify-between items-center">
                        <label class="block text-[9px] font-black text-zinc-400 uppercase">Notification Title *</label>
                        <span class="text-[9px] font-mono text-zinc-400" [class.text-red-500]="(campaignForm.title || '').length > 50">
                          {{ (campaignForm.title || '').length }}/50 recommended
                        </span>
                      </div>
                      <input type="text" [(ngModel)]="campaignForm.title" placeholder="e.g. Flash Deal: 20% OFF ABS Filament" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-orange-500">
                    </div>

                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Destination Redirect Link / URL *</label>
                      <input type="text" [(ngModel)]="campaignForm.actionUrl" placeholder="/category/filaments" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500 font-mono">
                    </div>

                    <div class="md:col-span-2 space-y-1">
                      <div class="flex justify-between items-center">
                        <label class="block text-[9px] font-black text-zinc-400 uppercase">Notification Body *</label>
                        <span class="text-[9px] font-mono text-zinc-400" [class.text-red-500]="(campaignForm.body || '').length > 120">
                          {{ (campaignForm.body || '').length }}/120 recommended
                        </span>
                      </div>
                      <textarea [(ngModel)]="campaignForm.body" rows="2" placeholder="e.g. Upgrade your 3D printing setup with premium Elegoo ABS. Special discount for next 24 hours only!" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500"></textarea>
                    </div>

                    <div class="md:col-span-2 space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Rich Image Banner URL (Recommended)</label>
                      <input type="text" [(ngModel)]="campaignForm.image" placeholder="https://storage.googleapis.com/... or public image URL" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500 font-mono">
                    </div>

                    <!-- Action Buttons -->
                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Action Button 1 (Text)</label>
                      <input type="text" [(ngModel)]="campaignForm.actionBtn1Text" placeholder="Shop Now" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
                    </div>

                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Action Button 1 (URL)</label>
                      <input type="text" [(ngModel)]="campaignForm.actionBtn1Url" placeholder="/" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500 font-mono">
                    </div>

                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Action Button 2 (Text, Optional)</label>
                      <input type="text" [(ngModel)]="campaignForm.actionBtn2Text" placeholder="View Deals" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500">
                    </div>

                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Action Button 2 (URL, Optional)</label>
                      <input type="text" [(ngModel)]="campaignForm.actionBtn2Url" placeholder="/deals" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500 font-mono">
                    </div>

                    <!-- Priority & Interaction Settings -->
                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Delivery Priority</label>
                      <select [(ngModel)]="campaignForm.priority" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                        <option value="Normal">Normal Priority</option>
                        <option value="High">High Priority (Urgent Flash)</option>
                      </select>
                    </div>

                    <div class="space-y-1">
                      <label class="block text-[9px] font-black text-zinc-400 uppercase">Deduplication Tag</label>
                      <input type="text" [(ngModel)]="campaignForm.tag" placeholder="e.g. daily-offer-tag" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500 font-mono">
                    </div>
                  </div>
                </div>
              }

              <!-- STEP 4: REVIEW AND BILLING IMPACT -->
              @if (wizardStep() === 4) {
                <div class="space-y-4 animate-fadeIn">
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">Step 4 — Review & Monthly Billing Impact</h3>

                  <!-- Billing Impact Summary with Hover Pricing Tiers -->
                  <div class="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl space-y-2 relative group/steprate">
                    <div class="flex justify-between items-center">
                      <span class="text-[9px] font-black uppercase text-purple-500">Estimated Monthly Billing Impact</span>
                      <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center gap-1 cursor-help">
                        <span>{{ getBillingTierLabelForVolume(getReachEstimate()) }} Tier</span>
                        <mat-icon class="text-[10px]">info</mat-icon>
                      </span>
                    </div>
                    <div class="flex items-baseline justify-between">
                      <div>
                        <h4 class="text-2xl font-black text-zinc-900 dark:text-white">
                          ₹{{ (getReachEstimate() * getBillingRateForVolume(getReachEstimate())) | number:'1.2-2' }}
                        </h4>
                        <p class="text-[10px] text-zinc-400">
                          {{ getReachEstimate() }} recipients &#64; <span class="font-mono font-bold text-purple-400">₹{{ getBillingRateForVolume(getReachEstimate()) }}</span> / notification
                        </p>
                      </div>
                      <span class="text-[10px] text-zinc-400 font-bold">Consolidated on monthly invoice</span>
                    </div>

                    <!-- Detailed Hover Popover in Step 4 -->
                    <div class="invisible group-hover/steprate:visible opacity-0 group-hover/steprate:opacity-100 transition-all duration-200 absolute right-4 top-12 z-50 w-80 bg-black border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3 pointer-events-none">
                      <div class="flex justify-between items-center text-[10px] font-black uppercase text-zinc-400 pb-2 border-b border-zinc-800">
                        <span>Monthly volume per project</span>
                        <span>Suggested charge</span>
                      </div>
                      <div class="space-y-1.5">
                        @for (t of billingTiers; track t.label) {
                          <div class="flex justify-between items-center py-1.5 px-2.5 rounded-xl text-xs"
                               [ngClass]="getBillingTierLabelForVolume(getReachEstimate()) === t.label ? 'bg-purple-950/60 text-purple-300 font-black border border-purple-500/40' : 'text-zinc-300 bg-zinc-900/60'">
                            <span>{{ t.label }}</span>
                            <span class="font-mono font-black">{{ t.priceLabel }}</span>
                          </div>
                        }
                      </div>
                      <div class="pt-2 border-t border-zinc-800 text-[9px] text-zinc-400">
                        Volume tiers apply automatically to aggregate calendar monthly dispatches.
                      </div>
                    </div>
                  </div>

                  <!-- Content Verification Summary -->
                  <div class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <span class="block text-[10px] font-black uppercase text-zinc-400">Campaign Content Checklist</span>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span class="text-[9px] text-zinc-400 uppercase block font-black">Title</span>
                        <span class="font-bold text-zinc-800 dark:text-white">{{ campaignForm.title || '(No title specified)' }}</span>
                      </div>
                      <div>
                        <span class="text-[9px] text-zinc-400 uppercase block font-black">Target URL</span>
                        <span class="font-mono text-zinc-800 dark:text-white text-[11px]">{{ campaignForm.actionUrl || '/' }}</span>
                      </div>
                      <div>
                        <span class="text-[9px] text-zinc-400 uppercase block font-black">Dispatch Strategy</span>
                        <span class="font-bold text-orange-500 uppercase">{{ campaignForm.scheduleMode === 'draft' ? 'Save as Draft' : 'Immediate Dispatch (Send Now)' }}</span>
                      </div>
                      <div>
                        <span class="text-[9px] text-zinc-400 uppercase block font-black">Audience Segment</span>
                        <span class="font-bold text-emerald-500">{{ campaignForm.targetType }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- STEP 5: CONFIRM AND LAUNCH -->
              @if (wizardStep() === 5) {
                <div class="space-y-4 animate-fadeIn">
                  <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Step 5 — Final Confirmation & Dispatch
                    </h3>
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-orange-500/10 text-orange-500 border border-orange-500/20">
                      ⚡ Verified Web Push Relay
                    </span>
                  </div>

                  <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-zinc-400 uppercase font-black text-[9px]">Campaign Name:</span>
                      <span class="font-bold text-zinc-900 dark:text-white">{{ campaignForm.name || 'Untitled Push Campaign' }}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs border-t border-zinc-200 dark:border-zinc-800 pt-2">
                      <span class="text-zinc-400 uppercase font-black text-[9px]">Dispatch Strategy:</span>
                      <span class="font-bold uppercase" [class]="campaignForm.scheduleMode === 'draft' ? 'text-zinc-400' : 'text-orange-500'">
                        {{ campaignForm.scheduleMode === 'draft' ? 'Save as Inactive Draft' : 'Immediate Dispatch (Send Now)' }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-xs border-t border-zinc-200 dark:border-zinc-800 pt-2">
                      <span class="text-zinc-400 uppercase font-black text-[9px]">Relay Channel:</span>
                      <span class="font-bold text-orange-500 uppercase">PWA Web Push</span>
                    </div>
                    <div class="flex items-center justify-between text-xs border-t border-zinc-200 dark:border-zinc-800 pt-2">
                      <span class="text-zinc-400 uppercase font-black text-[9px]">Eligible Target Devices:</span>
                      <span class="font-bold text-emerald-500">{{ getReachEstimate() }} Opted-In Devices</span>
                    </div>
                    <div class="flex items-center justify-between text-xs border-t border-zinc-200 dark:border-zinc-800 pt-2">
                      <span class="text-zinc-400 uppercase font-black text-[9px]">Estimated Charge:</span>
                      <span class="font-bold text-purple-500 font-mono">₹{{ (getReachEstimate() * getBillingRateForVolume(getReachEstimate())) | number:'1.2-2' }}</span>
                    </div>
                  </div>

                  <div class="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start gap-3">
                    <mat-icon class="text-orange-500 text-lg shrink-0 mt-0.5">check_circle</mat-icon>
                    <div class="space-y-1">
                      <h4 class="text-xs font-black text-orange-600 dark:text-orange-400 uppercase">Idempotency & Duplicate Prevention</h4>
                      <p class="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Double clicks are safely prevented on the server. Delivery status is monitored live in the Activity Feed and Logs tab.
                      </p>
                    </div>
                  </div>
                </div>
              }

              <!-- Wizard Stepper Controls -->
              <div class="flex justify-between items-center pt-6 border-t border-zinc-150 dark:border-zinc-800 mt-6">
                <button type="button" [disabled]="wizardStep() === 1" (click)="wizardStep.set(wizardStep() - 1)" class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-black uppercase border-none cursor-pointer disabled:opacity-40">
                  Back
                </button>
                
                <div class="flex items-center gap-2">
                  <button type="button" (click)="clearCampaignForm()" class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-black uppercase border-none cursor-pointer">
                    Clear Form
                  </button>

                  @if (wizardStep() < 5) {
                    <button type="button" (click)="goToNextWizardStep()" class="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer transition-all">
                      Next Step
                    </button>
                  } @else {
                    <button type="button" [disabled]="isSubmittingCampaign()" (click)="submitCampaign()" class="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-600/30 transition-all disabled:opacity-50">
                      @if (isSubmittingCampaign()) {
                        <mat-icon class="text-sm animate-spin">refresh</mat-icon> {{ campaignForm.scheduleMode === 'draft' ? 'Saving Draft...' : 'Dispatching...' }}
                      } @else if (campaignForm.scheduleMode === 'draft') {
                        <mat-icon class="text-sm">save</mat-icon> Save Inactive Draft
                      } @else {
                        <mat-icon class="text-sm">bolt</mat-icon> Confirm & Launch Now
                      }
                    </button>
                  }
                </div>
              </div>

            </div>

            <!-- Right Side: Genuine Live Campaign Preview (5 Cols on Wide) -->
            <div class="xl:col-span-5 space-y-4">
              
              <!-- Device Simulator Selector & Actions Bar -->
              <div class="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-200">Live Preview</span>
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                
                <div class="flex items-center gap-2">
                  <select [ngModel]="previewDevice()" (ngModelChange)="previewDevice.set($event)" class="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold outline-none cursor-pointer text-zinc-800 dark:text-white">
                    <option value="desktop">Desktop Web (Chrome)</option>
                    <option value="android">Android Chrome / PWA</option>
                    <option value="mobile">Mobile Web (iOS Banner)</option>
                    <option value="tablet">Tablet Viewport</option>
                  </select>
                  <button (click)="resetPreview()" title="Reset Preview Sample" class="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 border border-zinc-200 dark:border-zinc-700 text-zinc-500 rounded-lg cursor-pointer">
                    <mat-icon class="text-xs">restart_alt</mat-icon>
                  </button>
                </div>
              </div>

              <!-- Simulator Viewport Canvas -->
              <div class="w-full flex items-center justify-center p-6 bg-zinc-100/60 dark:bg-zinc-950/40 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl relative overflow-hidden" style="min-height: 420px;">
                
                <!-- SIMULATOR 1: DESKTOP WEB NOTIFICATION -->
                @if (previewDevice() === 'desktop') {
                  <div class="w-full max-w-sm bg-zinc-900 text-white rounded-2xl shadow-2xl border border-neutral-700 p-4 space-y-3 transition-all duration-300">
                    <div class="flex items-start gap-3">
                      <img [src]="campaignForm.icon || '/assets/icon.png'" (error)="onProductImgError($event)" class="w-9 h-9 rounded-lg object-contain bg-zinc-950 p-1 border border-neutral-800 shrink-0" />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                          <span class="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">3dgalaxy.co.in • now</span>
                          <mat-icon class="text-xs text-zinc-500 cursor-pointer">close</mat-icon>
                        </div>
                        <h4 class="text-xs font-black truncate mt-0.5">{{ campaignForm.title || "🔥 Today's Mega Deal" }}</h4>
                        <p class="text-[11px] text-zinc-400 leading-snug line-clamp-2 mt-0.5">{{ campaignForm.body || "Compose notification body to see how it renders on customer screens." }}</p>
                      </div>
                    </div>

                    @if (campaignForm.image) {
                      <div class="w-full h-36 rounded-xl overflow-hidden bg-black/40 border border-neutral-800">
                        <img [src]="campaignForm.image" (error)="onProductImgError($event)" class="w-full h-full object-cover" />
                      </div>
                    }

                    @if (campaignForm.actionBtn1Text || campaignForm.actionBtn2Text) {
                      <div class="flex gap-2 pt-1 border-t border-neutral-800">
                        @if (campaignForm.actionBtn1Text) {
                          <button (click)="simulateActionClick(campaignForm.actionBtn1Text, campaignForm.actionBtn1Url)" class="flex-1 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[10px] font-black uppercase border-none cursor-pointer transition-all">
                            {{ campaignForm.actionBtn1Text }}
                          </button>
                        }
                        @if (campaignForm.actionBtn2Text) {
                          <button (click)="simulateActionClick(campaignForm.actionBtn2Text, campaignForm.actionBtn2Url)" class="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-black uppercase border-none cursor-pointer transition-all">
                            {{ campaignForm.actionBtn2Text }}
                          </button>
                        }
                      </div>
                    }
                  </div>
                }

                <!-- SIMULATOR 2: ANDROID CHROME / PWA -->
                @if (previewDevice() === 'android') {
                  <div class="w-72 bg-zinc-900 rounded-[2.5rem] border-[6px] border-zinc-700 shadow-2xl p-2.5 space-y-2 relative">
                    <div class="w-20 h-3.5 bg-zinc-700 rounded-full mx-auto mb-2"></div>
                    
                    <div class="bg-[#1e1e24] text-white p-3.5 rounded-2xl border border-zinc-800 space-y-2.5">
                      <div class="flex items-center justify-between text-[8px] text-zinc-400 font-bold uppercase tracking-wider">
                        <div class="flex items-center gap-1.5">
                          <img [src]="campaignForm.icon || '/assets/icon.png'" (error)="onProductImgError($event)" class="w-4 h-4 rounded-full" />
                          <span>3D GALAXY PWA • now</span>
                        </div>
                        <mat-icon class="text-[12px] h-3 w-3">expand_more</mat-icon>
                      </div>

                      <div class="space-y-1">
                        <h4 class="text-xs font-black truncate">{{ campaignForm.title || "🔥 Today's Mega Deal" }}</h4>
                        <p class="text-[10px] text-zinc-400 leading-snug">{{ campaignForm.body || "Compose push body in the editor." }}</p>
                      </div>

                      @if (campaignForm.image) {
                        <div class="w-full h-28 rounded-xl overflow-hidden bg-black border border-zinc-800">
                          <img [src]="campaignForm.image" (error)="onProductImgError($event)" class="w-full h-full object-cover" />
                        </div>
                      }

                      @if (campaignForm.actionBtn1Text || campaignForm.actionBtn2Text) {
                        <div class="flex gap-2 pt-1 border-t border-zinc-800">
                          @if (campaignForm.actionBtn1Text) {
                            <button (click)="simulateActionClick(campaignForm.actionBtn1Text, campaignForm.actionBtn1Url)" class="flex-1 py-1 bg-white/10 hover:bg-white/20 text-orange-400 rounded-lg text-[9px] font-bold border-none cursor-pointer">
                              {{ campaignForm.actionBtn1Text }}
                            </button>
                          }
                          @if (campaignForm.actionBtn2Text) {
                            <button (click)="simulateActionClick(campaignForm.actionBtn2Text, campaignForm.actionBtn2Url)" class="flex-1 py-1 bg-white/10 hover:bg-white/20 text-zinc-300 rounded-lg text-[9px] font-bold border-none cursor-pointer">
                              {{ campaignForm.actionBtn2Text }}
                            </button>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- SIMULATOR 3: MOBILE WEB (iOS LOCK-SCREEN BANNER) -->
                @if (previewDevice() === 'mobile') {
                  <div class="w-72 bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-[2.5rem] border-[6px] border-zinc-700 shadow-2xl p-3 space-y-3 relative">
                    <div class="w-24 h-4 bg-black rounded-full mx-auto"></div>
                    <div class="text-center text-white py-4 space-y-0.5">
                      <span class="text-3xl font-black font-mono">10:45</span>
                      <span class="text-[9px] text-zinc-400 uppercase tracking-widest block font-bold">Sunday, October 25</span>
                    </div>

                    <div class="bg-white/15 backdrop-blur-md text-white p-3 rounded-2xl border border-white/20 space-y-1.5 shadow-lg">
                      <div class="flex items-center justify-between text-[8px] text-zinc-300 uppercase tracking-wider font-bold">
                        <div class="flex items-center gap-1.5">
                          <span class="w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center text-[7px] font-black">3D</span>
                          <span>3D GALAXY</span>
                        </div>
                        <span>NOW</span>
                      </div>
                      <h4 class="text-xs font-black truncate">{{ campaignForm.title || "Special Announcement" }}</h4>
                      <p class="text-[10px] text-zinc-200 leading-snug line-clamp-2">{{ campaignForm.body || "Notification content simulation." }}</p>
                      @if (campaignForm.image) {
                        <img [src]="campaignForm.image" (error)="onProductImgError($event)" class="w-full h-20 object-cover rounded-lg mt-1 border border-white/10" />
                      }
                    </div>
                  </div>
                }

                <!-- SIMULATOR 4: TABLET VIEWPORT -->
                @if (previewDevice() === 'tablet') {
                  <div class="w-full max-w-md bg-zinc-900 rounded-2xl border-4 border-zinc-700 shadow-2xl p-4 space-y-3">
                    <div class="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div class="flex items-center gap-2">
                        <img [src]="campaignForm.icon || '/assets/icon.png'" (error)="onProductImgError($event)" class="w-6 h-6 rounded-md" />
                        <span class="text-xs font-black text-white">3D Galaxy Web Push Relay</span>
                      </div>
                      <span class="text-[9px] text-zinc-400 font-mono">Tablet Notification Shade</span>
                    </div>

                    <div class="flex gap-4">
                      @if (campaignForm.image) {
                        <img [src]="campaignForm.image" (error)="onProductImgError($event)" class="w-28 h-24 object-cover rounded-xl border border-zinc-800 shrink-0" />
                      }
                      <div class="space-y-1 flex-1 min-w-0">
                        <h4 class="text-xs font-black text-white truncate">{{ campaignForm.title || "Special Push Campaign" }}</h4>
                        <p class="text-[11px] text-zinc-400 leading-snug">{{ campaignForm.body || "Preview how wide tablet notifications accommodate image thumbnails alongside text copy." }}</p>
                        @if (campaignForm.actionUrl) {
                          <span class="text-[9px] text-orange-500 font-mono block pt-1 truncate">{{ campaignForm.actionUrl }}</span>
                        }
                      </div>
                    </div>
                  </div>
                }

              </div>

              <!-- Simulation Disclaimer Notice -->
              <div class="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[10px] text-zinc-400 leading-normal">
                <strong>Simulation Disclaimer:</strong> Notification styling, action button rendering, and banner placement vary by operating system (Windows, macOS, Android, iOS), browser permissions, and user system settings.
              </div>

            </div>

          </div>
        }
      }

      <!-- ======================================================== -->
      <!-- SECTION 3: DEVICES & OPT-IN -->
      <!-- ======================================================== -->
      @if (activeSubTab() === 'devices') {
        <div class="space-y-6 animate-fadeIn">
          
          <!-- Devices Stats Header -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <span class="text-[9px] font-black uppercase text-zinc-400">Total Registered Devices</span>
              <h3 class="text-2xl font-black text-zinc-900 dark:text-white">{{ subscriberDevices().length }}</h3>
              <p class="text-[10px] text-zinc-400">In database</p>
            </div>

            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <span class="text-[9px] font-black uppercase text-emerald-500">Active Opted-In</span>
              <div class="flex items-baseline justify-between">
                <h3 class="text-2xl font-black text-emerald-500">{{ optedInDevicesCount() }}</h3>
                <span class="text-xs font-bold text-emerald-500">{{ optedInPercent() }}%</span>
              </div>
              <p class="text-[10px] text-zinc-400">Can receive push notifications</p>
            </div>

            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <span class="text-[9px] font-black uppercase text-red-500">Opted-Out / Disabled</span>
              <div class="flex items-baseline justify-between">
                <h3 class="text-2xl font-black text-red-500">{{ optedOutDevicesCount() }}</h3>
                <span class="text-xs font-bold text-red-500">{{ optedOutPercent() }}%</span>
              </div>
              <p class="text-[10px] text-zinc-400">Excluded from campaigns</p>
            </div>

            <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <span class="text-[9px] font-black uppercase text-blue-500">Platform Split</span>
              <div class="flex items-baseline justify-between">
                <span class="text-sm font-black text-zinc-800 dark:text-white">🖥️ {{ desktopCount() }}</span>
                <span class="text-sm font-black text-zinc-800 dark:text-white">📱 {{ mobileCount() }}</span>
              </div>
              <p class="text-[10px] text-zinc-400">Desktop vs Mobile Devices</p>
            </div>
          </div>

          <!-- Devices Table Container -->
          <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div class="flex items-center gap-2 flex-wrap">
                <div class="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                  <button (click)="devicesStatusFilter.set('all')" [class]="devicesStatusFilter() === 'all' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-black' : 'text-zinc-500'" class="px-3 py-1 text-[10px] uppercase rounded-lg border-none cursor-pointer">All ({{ subscriberDevices().length }})</button>
                  <button (click)="devicesStatusFilter.set('opted_in')" [class]="devicesStatusFilter() === 'opted_in' ? 'bg-white dark:bg-zinc-900 text-emerald-500 font-black' : 'text-zinc-500'" class="px-3 py-1 text-[10px] uppercase rounded-lg border-none cursor-pointer">Opted In ({{ optedInDevicesCount() }})</button>
                  <button (click)="devicesStatusFilter.set('opted_out')" [class]="devicesStatusFilter() === 'opted_out' ? 'bg-white dark:bg-zinc-900 text-red-500 font-black' : 'text-zinc-500'" class="px-3 py-1 text-[10px] uppercase rounded-lg border-none cursor-pointer">Opted Out ({{ optedOutDevicesCount() }})</button>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button (click)="exportDevicesCsv()" class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 border-none cursor-pointer flex items-center gap-1">
                  <mat-icon class="text-sm">download</mat-icon> Export CSV
                </button>
                <button (click)="loadSubscriberDevices()" class="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-xl text-zinc-600 dark:text-zinc-300 border-none cursor-pointer">
                  <mat-icon class="text-sm">refresh</mat-icon>
                </button>
              </div>
            </div>

            <!-- Devices List Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase text-[9px] font-black">
                    <th class="pb-3 pl-2">Device / OS</th>
                    <th class="pb-3">Browser</th>
                    <th class="pb-3">Opt-In Status</th>
                    <th class="pb-3">User / Session</th>
                    <th class="pb-3">Last Active</th>
                    <th class="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  @if (filteredDevices().length === 0) {
                    <tr>
                      <td colspan="6" class="py-8 text-center text-zinc-400 font-bold uppercase">No devices found.</td>
                    </tr>
                  } @else {
                    @for (d of filteredDevices(); track d.id) {
                      <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                        <td class="py-3 pl-2 font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          <mat-icon class="text-sm text-zinc-400">{{ d.device === 'mobile' ? 'smartphone' : 'laptop' }}</mat-icon>
                          <span>{{ d.os || 'Unknown OS' }}</span>
                        </td>
                        <td class="py-3 font-medium text-zinc-700 dark:text-zinc-300">{{ d.browser || 'Chrome' }}</td>
                        <td class="py-3">
                          <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase"
                                [ngClass]="d.notificationEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'">
                            {{ d.notificationEnabled ? 'Opted In' : 'Disabled' }}
                          </span>
                        </td>
                        <td class="py-3 text-zinc-500 font-mono text-[10px]">
                          {{ d.user?.email || (d.guestId ? 'Guest: ' + d.guestId.substring(0, 10) : 'Anonymous') }}
                        </td>
                        <td class="py-3 text-zinc-400 font-mono text-[10px]">{{ formatDeviceDate(d.lastActive || d.createdAt) }}</td>
                        <td class="py-3 text-right pr-2">
                          <button (click)="sendDirectTestPush(d)" class="px-2.5 py-1 bg-orange-600/10 hover:bg-orange-600/20 text-orange-500 font-black rounded-lg text-[9px] uppercase border-none cursor-pointer">
                            Ping Push
                          </button>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================== -->
      <!-- SECTION 4: MONTHLY BILLING & INVOICING -->
      <!-- ======================================================== -->
      @if (activeSubTab() === 'billing') {
        <div class="space-y-6 animate-fadeIn">
          
          <!-- Month Selector & Actions Header -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div class="flex items-center gap-3">
              <span class="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <mat-icon>receipt_long</mat-icon>
              </span>
              <div>
                <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Push Marketing Monthly Billing</h3>
                <p class="text-[11px] text-zinc-400">Aggregated usage per calendar month with automated invoice generation.</p>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <!-- Calendar Month Dropdown -->
              <select [ngModel]="selectedBillingMonth()" (ngModelChange)="onBillingMonthChange($event)" class="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer text-zinc-900 dark:text-white">
                @for (m of availableBillingMonths(); track m) {
                  <option [value]="m">{{ formatMonthLabel(m) }}</option>
                }
              </select>

              <button (click)="showBillingConfigModal.set(true)" class="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-black uppercase border-none cursor-pointer flex items-center gap-1">
                <mat-icon class="text-sm">table_chart</mat-icon> Pricing Slabs
              </button>

              <button (click)="exportBillingCsv()" class="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-black uppercase border-none cursor-pointer flex items-center gap-1">
                <mat-icon class="text-sm">download</mat-icon> Export Log
              </button>

              <button (click)="generateMonthlyInvoice()" [disabled]="isGeneratingInvoice()" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50">
                @if (isGeneratingInvoice()) {
                  <mat-icon class="text-sm animate-spin">refresh</mat-icon>
                } @else {
                  <mat-icon class="text-sm">receipt</mat-icon>
                }
                Generate Monthly Invoice
              </button>
            </div>
          </div>

          <!-- Monthly Usage & Financials Summary Cards -->
          @if (monthlyBillingData()) {
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
                <span class="text-[9px] font-black uppercase text-zinc-400">Billable Dispatches</span>
                <h3 class="text-2xl font-black text-purple-600 dark:text-purple-400">{{ monthlyBillingData()?.usage?.billableNotifications || 0 }}</h3>
                <p class="text-[10px] text-zinc-400">Accepted by provider</p>
              </div>

              <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1 relative group/rate cursor-help">
                <div class="flex justify-between items-center">
                  <span class="text-[9px] font-black uppercase text-zinc-400">Monthly Tier Rate</span>
                  <span class="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold uppercase">{{ monthlyBillingData()?.financials?.activeTier || '1–10,000' }}</span>
                </div>
                <div class="flex items-baseline gap-1.5">
                  <h3 class="text-2xl font-black text-zinc-900 dark:text-white">₹{{ monthlyBillingData()?.financials?.unitRate || 0.05 }}</h3>
                  <span class="text-[10px] text-zinc-400 font-bold">/ notif</span>
                </div>
                <p class="text-[10px] text-zinc-400 flex items-center gap-1">
                  <span>Hover to view slab details</span>
                  <mat-icon class="text-[11px] text-purple-400">info</mat-icon>
                </p>

                <!-- Detailed hover popover table -->
                <div class="invisible group-hover/rate:visible opacity-0 group-hover/rate:opacity-100 transition-all duration-200 absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-80 bg-black/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3 pointer-events-none sm:pointer-events-auto">
                  <div class="flex justify-between items-center text-[10px] font-black uppercase text-zinc-400 pb-2 border-b border-zinc-800">
                    <span>Monthly notification volume</span>
                    <span>Suggested charge</span>
                  </div>
                  <div class="space-y-1.5">
                    @for (t of billingTiers; track t.label) {
                      <div class="flex justify-between items-center py-1.5 px-2.5 rounded-xl text-xs transition-colors"
                           [ngClass]="(monthlyBillingData()?.financials?.activeTier || '1–10,000') === t.label ? 'bg-purple-950/50 text-purple-300 font-black border border-purple-500/40' : 'text-zinc-300 bg-zinc-900/60'">
                        <span class="flex items-center gap-1.5">
                          @if ((monthlyBillingData()?.financials?.activeTier || '1–10,000') === t.label) {
                            <span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                          }
                          {{ t.label }}
                        </span>
                        <span class="font-mono font-black">{{ t.priceLabel }}</span>
                      </div>
                    }
                  </div>
                  <div class="pt-2 border-t border-zinc-800/80 text-[9px] text-zinc-400">
                    Authoritative non-editable tiered rate automatically applied based on calendar month volume.
                  </div>
                </div>
              </div>

              <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
                <span class="text-[9px] font-black uppercase text-zinc-400">Total Usage Cost</span>
                <div class="flex items-baseline justify-between">
                  <h3 class="text-2xl font-black text-zinc-900 dark:text-white">₹{{ monthlyBillingData()?.financials?.totalAmount || monthlyBillingData()?.financials?.subtotal || 0 }}</h3>
                </div>
                <p class="text-[10px] text-zinc-400">Tier volume pricing (No tax)</p>
              </div>

              <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
                <span class="text-[9px] font-black uppercase text-emerald-500">Monthly Total Payable</span>
                <h3 class="text-2xl font-black text-emerald-500">₹{{ monthlyBillingData()?.financials?.totalAmount || 0 }}</h3>
                <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase inline-block mt-0.5"
                      [ngClass]="monthlyBillingData()?.invoice?.status === 'Generated' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'">
                  {{ monthlyBillingData()?.invoice?.status || 'Estimated' }}
                </span>
              </div>

            </div>

            <!-- Previous Month Real Comparison -->
            @if (monthlyBillingData()?.previousMonth) {
              <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-xs">
                <span class="font-bold text-zinc-500">Previous Period ({{ monthlyBillingData()?.previousMonth?.month }}):</span>
                <span class="font-mono font-black text-zinc-800 dark:text-white">
                  {{ monthlyBillingData()?.previousMonth?.billableNotifications }} dispatches — ₹{{ monthlyBillingData()?.previousMonth?.totalAmount }}
                </span>
              </div>
            }

            <!-- Invoices List Table -->
            <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">Generated Monthly Invoices</h3>
              
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase text-[9px] font-black">
                      <th class="pb-3 pl-2">Invoice #</th>
                      <th class="pb-3">Billing Cycle</th>
                      <th class="pb-3">Billable Notifications</th>
                      <th class="pb-3">Rate</th>
                      <th class="pb-3">Total Amount</th>
                      <th class="pb-3">Status</th>
                      <th class="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    @if (billingInvoices().length === 0) {
                      <tr>
                        <td colspan="7" class="py-8 text-center text-zinc-400 font-bold uppercase">
                          No official consolidated invoices generated yet. Click "Generate Monthly Invoice" above.
                        </td>
                      </tr>
                    } @else {
                      @for (inv of billingInvoices(); track inv.invoiceNumber) {
                        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                          <td class="py-3 pl-2 font-mono font-bold text-purple-600">{{ inv.invoiceNumber }}</td>
                          <td class="py-3 font-medium">{{ inv.periodLabel || inv.month }}</td>
                          <td class="py-3 font-mono">{{ inv.billableNotifications }}</td>
                          <td class="py-3 font-mono">₹{{ inv.unitRate }}</td>
                          <td class="py-3 font-mono font-bold text-emerald-500">₹{{ inv.totalAmount }}</td>
                          <td class="py-3">
                            <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500">
                              {{ inv.status || 'Generated' }}
                            </span>
                          </td>
                          <td class="py-3 text-right pr-2">
                            <button (click)="viewInvoice(inv)" class="px-2.5 py-1 bg-purple-600/10 hover:bg-purple-600/20 text-purple-500 font-black rounded-lg text-[9px] uppercase border-none cursor-pointer">
                              View Invoice
                            </button>
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- ======================================================== -->
      <!-- SECTION 5: ANALYTICS AND REPORTS -->
      <!-- ======================================================== -->
      @if (activeSubTab() === 'analytics') {
        <div class="space-y-6 animate-fadeIn">
          
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- 15-day engagement bar chart -->
            <div class="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Push Engagement Trend (Last 15 Days)</h3>
                <span class="text-[9px] font-bold text-zinc-400">Real Dispatches & Clicks</span>
              </div>

              <div class="h-56 flex items-end gap-3 pt-6 border-b border-zinc-200 dark:border-zinc-800">
                @if (dailyTrends().length === 0) {
                  <div class="w-full h-full flex items-center justify-center text-xs text-zinc-400 uppercase font-black">No Trend Data Found in Range</div>
                } @else {
                  @for (trend of dailyTrends(); track trend.date) {
                    <div class="flex-1 flex flex-col items-center gap-2 group relative">
                      <div class="w-full bg-zinc-100 dark:bg-zinc-800 rounded-t-lg relative overflow-hidden" style="height: 140px;">
                        <div class="bg-orange-500/35 absolute bottom-0 left-0 right-0 rounded-t-md" [style.height.%]="getSendsPercent(trend.sends)"></div>
                        <div class="bg-orange-600 absolute bottom-0 left-1 right-1 rounded-t-md" [style.height.%]="getClicksPercent(trend.clicks)"></div>
                      </div>
                      <span class="text-[8px] font-black uppercase text-zinc-400">{{ trend.date | date:'dd MMM' }}</span>
                    </div>
                  }
                }
              </div>

              <div class="flex items-center gap-4 justify-center text-[10px]">
                <span class="flex items-center gap-1.5 font-bold"><span class="w-2.5 h-2.5 bg-orange-500/35 rounded-xs"></span> Dispatches</span>
                <span class="flex items-center gap-1.5 font-bold"><span class="w-2.5 h-2.5 bg-orange-600 rounded-xs"></span> Clicks</span>
              </div>
            </div>

            <!-- Subscriber Split -->
            <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">Subscriber Audience Split</h3>
              
              <div class="space-y-5">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-black text-zinc-400 uppercase text-[9px] flex items-center gap-2"><span class="w-2 h-2 bg-blue-500 rounded-full"></span> Guest Devices</span>
                  <span class="font-black text-zinc-800 dark:text-white">{{ subscriberSplit().guests }} Device(s)</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="font-black text-zinc-400 uppercase text-[9px] flex items-center gap-2"><span class="w-2 h-2 bg-emerald-500 rounded-full"></span> Registered Users</span>
                  <span class="font-black text-zinc-800 dark:text-white">{{ subscriberSplit().registered }} Device(s)</span>
                </div>
                <div class="flex items-center justify-between text-xs border-t border-zinc-100 dark:border-zinc-800 pt-3">
                  <span class="font-black text-zinc-400 uppercase text-[9px] flex items-center gap-2"><span class="w-2 h-2 bg-red-500 rounded-full"></span> Opted Out Devices</span>
                  <span class="font-black text-zinc-800 dark:text-white">{{ subscriberSplit().disabled }} Device(s)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================== -->
      <!-- SECTION 9: LOGS & AUDIT -->
      <!-- ======================================================== -->
      @if (activeSubTab() === 'logs') {
        <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6 animate-fadeIn">
          <div class="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">FCM Delivery Logs & System Audit</h3>
              <p class="text-[10px] text-zinc-400 mt-1">Direct log trace of sent notifications, provider responses, and device delivery events.</p>
            </div>
            <button (click)="loadAuditLogs()" class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 border-none cursor-pointer flex items-center gap-1">
              <mat-icon class="text-sm">refresh</mat-icon> Refresh Logs
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase text-[9px] font-black">
                  <th class="pb-3 pl-2">Timestamp</th>
                  <th class="pb-3">Title / Campaign</th>
                  <th class="pb-3">Status</th>
                  <th class="pb-3">Recipient Token</th>
                  <th class="pb-3">Device / OS</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono text-[11px]">
                @if (auditLogs().length === 0) {
                  <tr>
                    <td colspan="5" class="py-8 text-center text-zinc-400 font-bold uppercase font-sans">No recent push logs found.</td>
                  </tr>
                } @else {
                  @for (log of auditLogs(); track log.id) {
                    <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td class="py-3 pl-2 text-zinc-400 text-[10px]">{{ log.createdAt | date:'dd MMM yyyy, HH:mm:ss' }}</td>
                      <td class="py-3 font-sans font-bold text-zinc-900 dark:text-white">{{ log.title || 'Notification' }}</td>
                      <td class="py-3">
                        <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase"
                              [ngClass]="log.status === 'SENT' || log.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'">
                          {{ log.status }}
                        </span>
                      </td>
                      <td class="py-3 text-zinc-400 text-[10px] truncate max-w-xs">{{ log.fcmToken ? log.fcmToken.substring(0, 24) + '...' : 'N/A' }}</td>
                      <td class="py-3 text-zinc-400 font-sans text-xs">{{ log.device?.browser || 'Browser' }} on {{ log.device?.os || 'OS' }}</td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ======================================================== -->
      <!-- SECTION 10: FCM CREDENTIALS -->
      <!-- ======================================================== -->
      @if (activeSubTab() === 'fcm-config') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          <div class="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
            <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">
              Firebase Project Credentials Configuration
            </h3>

            <form (submit)="saveFCMConfig($event)" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">Project ID</label>
                  <input type="text" [(ngModel)]="fcmConfig.projectId" name="projectId" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none">
                </div>

                <div class="space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">Messaging Sender ID</label>
                  <input type="text" [(ngModel)]="fcmConfig.messagingSenderId" name="senderId" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none">
                </div>

                <div class="space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">Web API Key</label>
                  <input type="password" [(ngModel)]="fcmConfig.apiKey" name="apiKey" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none">
                </div>

                <div class="space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">VAPID Public Key</label>
                  <input type="text" [(ngModel)]="fcmConfig.vapidPublicKey" name="vapidKey" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none">
                </div>

                <div class="sm:col-span-2 space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">Server Service Account JSON (Stored Securely)</label>
                  <textarea [(ngModel)]="fcmConfig.serviceAccount" name="serviceAccount" rows="4" placeholder="{ 'type': 'service_account', ... }" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"></textarea>
                </div>
              </div>

              <div class="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button type="button" (click)="testFCMConnection()" class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-black uppercase border-none cursor-pointer">
                  Test FCM Connection
                </button>
                <button type="submit" class="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer">
                  Save Credentials
                </button>
              </div>
            </form>
          </div>

          <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">Direct Test Notification</h3>
            <p class="text-xs text-zinc-400">Send an instant test ping to any specific device token to verify push delivery end-to-end.</p>
            <button (click)="triggerTestPush()" class="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-black uppercase border-none cursor-pointer">
              Send Manual Push Ping
            </button>
          </div>
        </div>
      }

      <!-- ======================================================== -->
      <!-- SECTION 11: POPUP DESIGNER -->
      <!-- ======================================================== -->
      @if (activeSubTab() === 'popup-designer') {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
            <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">Opt-In Modal Customizer</h3>
            
            <form (submit)="savePopupConfig($event)" class="space-y-4">
              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Modal Title</label>
                <input type="text" [(ngModel)]="popupConfig.title" name="popupTitle" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none">
              </div>

              <div class="space-y-1">
                <label class="block text-[9px] font-black text-zinc-400 uppercase">Modal Description</label>
                <textarea [(ngModel)]="popupConfig.description" name="popupDesc" rows="2" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"></textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">Allow Button Text</label>
                  <input type="text" [(ngModel)]="popupConfig.allowText" name="allowText" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none">
                </div>
                <div class="space-y-1">
                  <label class="block text-[9px] font-black text-zinc-400 uppercase">Cancel Button Text</label>
                  <input type="text" [(ngModel)]="popupConfig.cancelText" name="cancelText" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none">
                </div>
              </div>

              <div class="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button type="button" (click)="triggerLivePreview()" class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-black uppercase border-none cursor-pointer">
                  Test Trigger on Browser
                </button>
                <button type="submit" class="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer">
                  Save Styling
                </button>
              </div>
            </form>
          </div>

          <div class="bg-zinc-100/50 dark:bg-zinc-950/40 p-6 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 flex items-center justify-center">
            <div class="w-full max-w-sm p-6 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-4"
                 [style.background-color]="getPreviewBgColor()"
                 [style.color]="getPreviewTextColor()">
              <div class="flex items-center gap-3">
                <img [src]="getPreviewLogoUrl()" class="w-10 h-10 rounded-xl object-contain" />
                <h4 class="text-sm font-black">{{ popupConfig.title || 'Stay in the Loop!' }}</h4>
              </div>
              <p class="text-xs leading-relaxed opacity-80">{{ popupConfig.description || 'Get instant price drops, flash deals, and maker news directly to your device.' }}</p>
              <div class="flex gap-2 pt-2">
                <button type="button" class="flex-1 py-2 rounded-xl text-xs font-black uppercase border-none text-white cursor-pointer" [style.background-color]="popupConfig.buttonColor || '#f97316'">
                  {{ popupConfig.allowText || 'Allow Push' }}
                </button>
                <button type="button" class="flex-1 py-2 bg-zinc-200/50 dark:bg-zinc-800 text-zinc-500 rounded-xl text-xs font-bold border-none cursor-pointer">
                  {{ popupConfig.cancelText || 'Later' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

    </div>

    <!-- MODAL 1: BILLING PRICING POLICY (NON-EDITABLE AUTHORITATIVE SLABS) -->
    @if (showBillingConfigModal()) {
      <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-lg space-y-6 shadow-2xl animate-scaleIn">
          <div class="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div class="flex items-center gap-2">
              <mat-icon class="text-purple-500">verified</mat-icon>
              <div>
                <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Push Notification Pricing Policy</h3>
                <p class="text-[10px] text-zinc-400">Authoritative volume tier schedule (Standard & Non-Editable)</p>
              </div>
            </div>
            <button (click)="showBillingConfigModal.set(false)" class="text-zinc-400 hover:text-zinc-600 border-none bg-transparent cursor-pointer">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Exact Table Matching Image Specification -->
          <div class="bg-black border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div class="flex justify-between items-center text-[10px] font-black uppercase text-zinc-400 pb-2 border-b border-zinc-800">
              <span>Monthly notification volume per project</span>
              <span>Suggested charge per notification</span>
            </div>

            <div class="space-y-2">
              @for (t of billingTiers; track t.label) {
                <div class="flex justify-between items-center py-2.5 px-3.5 rounded-xl transition-all"
                     [ngClass]="(monthlyBillingData()?.financials?.activeTier || '1–10,000') === t.label ? 'bg-purple-950/40 border border-purple-500/50 text-white' : 'bg-zinc-900/70 border border-zinc-800/80 text-zinc-300'">
                  <div class="flex items-center gap-2">
                    @if ((monthlyBillingData()?.financials?.activeTier || '1–10,000') === t.label) {
                      <span class="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                    }
                    <span class="font-bold text-xs">{{ t.label }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-black text-sm text-purple-400">{{ t.priceLabel }}</span>
                    @if ((monthlyBillingData()?.financials?.activeTier || '1–10,000') === t.label) {
                      <span class="text-[9px] uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">Active Tier</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
            <div class="flex justify-between text-zinc-500">
              <span class="text-[10px] font-bold uppercase">Billing Cycle:</span>
              <span class="font-bold text-zinc-800 dark:text-zinc-200">Calendar Month (1st to Month-End)</span>
            </div>
            <div class="flex justify-between text-zinc-500">
              <span class="text-[10px] font-bold uppercase">Billable Event:</span>
              <span class="font-bold text-zinc-800 dark:text-zinc-200">Accepted Provider Deliveries</span>
            </div>
          </div>

          <div class="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button type="button" (click)="showBillingConfigModal.set(false)" class="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer">
              Close
            </button>
          </div>
        </div>
      </div>
    }

    <!-- MODAL 2: INVOICE VIEWER & PRINTABLE MODAL -->
    @if (showInvoiceModal() && selectedInvoice()) {
      <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 w-full max-w-2xl space-y-6 shadow-2xl animate-scaleIn">
          <div class="flex justify-between items-start pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <span class="text-xs font-black uppercase tracking-wider text-purple-600">3D Galaxy Web Push Relay</span>
              <h2 class="text-xl font-black text-zinc-900 dark:text-white mt-1">Monthly Billing Statement</h2>
              <p class="text-xs text-zinc-400 font-mono">Invoice Ref: {{ selectedInvoice()?.invoiceNumber }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button (click)="printInvoice()" class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-bold border-none cursor-pointer flex items-center gap-1">
                <mat-icon class="text-xs">print</mat-icon> Print
              </button>
              <button (click)="showInvoiceModal.set(false)" class="text-zinc-400 hover:text-zinc-600 border-none bg-transparent cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span class="text-[9px] text-zinc-400 font-black uppercase block">Billing Period</span>
              <span class="font-bold text-zinc-800 dark:text-white">{{ selectedInvoice()?.periodLabel || selectedInvoice()?.month }}</span>
            </div>
            <div>
              <span class="text-[9px] text-zinc-400 font-black uppercase block">Project Entity</span>
              <span class="font-bold text-zinc-800 dark:text-white">3D Galaxy Core Platform</span>
            </div>
            <div>
              <span class="text-[9px] text-zinc-400 font-black uppercase block">Generation Timestamp</span>
              <span class="font-mono text-zinc-600 dark:text-zinc-400">{{ selectedInvoice()?.generatedAt ? (selectedInvoice()?.generatedAt | date:'medium') : 'Realtime Estimate' }}</span>
            </div>
            <div>
              <span class="text-[9px] text-zinc-400 font-black uppercase block">Invoice Status</span>
              <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500">{{ selectedInvoice()?.status || 'Generated' }}</span>
            </div>
          </div>

          <!-- Breakdown table -->
          <div class="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table class="w-full text-left text-xs">
              <thead class="bg-zinc-50 dark:bg-zinc-950 text-zinc-400 uppercase text-[9px] font-black">
                <tr>
                  <th class="p-3">Description</th>
                  <th class="p-3 text-right">Quantity</th>
                  <th class="p-3 text-right">Unit Rate</th>
                  <th class="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr>
                  <td class="p-3 font-medium">PWA Web Push Accepted Deliveries</td>
                  <td class="p-3 text-right font-mono">{{ selectedInvoice()?.billableNotifications }}</td>
                  <td class="p-3 text-right font-mono">₹{{ selectedInvoice()?.unitRate }}</td>
                  <td class="p-3 text-right font-mono">₹{{ selectedInvoice()?.totalAmount || selectedInvoice()?.subtotal }}</td>
                </tr>
                <tr class="bg-purple-500/5 font-black text-sm">
                  <td colspan="3" class="p-3 text-right text-purple-600">Total Payable:</td>
                  <td class="p-3 text-right text-purple-600 font-mono">₹{{ selectedInvoice()?.totalAmount || selectedInvoice()?.subtotal }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    }

    <!-- MODAL 3: CAMPAIGN PERFORMANCE & ANALYTICS DRAWER/MODAL -->
    @if (selectedCampaignForAnalytics(); as camp) {
      <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-2xl space-y-5 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
          
          <!-- Modal Header -->
          <div class="flex justify-between items-start pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded text-[9px] font-black uppercase">{{ camp.type }}</span>
                <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase"
                      [ngClass]="camp.status === 'Sent' || camp.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'">
                  {{ camp.status }}
                </span>
                @if (camp.priority === 'High') {
                  <span class="px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded text-[8px] font-black uppercase">High Priority</span>
                }
              </div>
              <h3 class="text-sm font-black text-zinc-900 dark:text-white">{{ camp.name }}</h3>
              <p class="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                <mat-icon class="text-[13px] h-3.5 w-3.5">schedule</mat-icon> Dispatched: {{ camp.date }}
              </p>
            </div>
            <button (click)="closeCampaignAnalytics()" class="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 border-none cursor-pointer">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Notification Preview Snippet -->
          <div class="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
            @if (camp.image) {
              <img [src]="camp.image" (error)="onProductImgError($event)" class="w-14 h-14 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-800" alt="Notification preview">
            }
            <div class="space-y-1 min-w-0 flex-1">
              <h4 class="text-xs font-bold text-zinc-900 dark:text-white truncate">{{ camp.title }}</h4>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">{{ camp.body }}</p>
              <div class="pt-1 flex items-center gap-2 text-[10px] text-zinc-400 font-mono truncate">
                <span class="text-orange-500 font-bold">Target Link:</span>
                <span class="truncate">{{ camp.actionUrl }}</span>
              </div>
            </div>
          </div>

          <!-- Performance KPIs Grid (6 cards) -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
            <!-- 1. Dispatched -->
            <div class="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <span class="text-[8px] block text-zinc-400 font-black uppercase">Dispatched</span>
              <h4 class="text-lg font-black text-zinc-900 dark:text-white">{{ camp.sentCount }}</h4>
              <span class="text-[9px] text-zinc-400 block">Total attempts</span>
            </div>

            <!-- 2. Delivered -->
            <div class="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <span class="text-[8px] block text-zinc-400 font-black uppercase">Delivered</span>
              <h4 class="text-lg font-black text-orange-500">{{ camp.deliveredCount }}</h4>
              <span class="text-[9px] text-emerald-500 font-bold block">{{ camp.deliveryRate }}% Delivery Rate</span>
            </div>

            <!-- 3. Opened -->
            <div class="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <span class="text-[8px] block text-zinc-400 font-black uppercase">Opens</span>
              <h4 class="text-lg font-black text-purple-500">{{ camp.openedCount }}</h4>
              <span class="text-[9px] text-purple-400 font-bold block">{{ camp.openRate }}% Open Rate</span>
            </div>

            <!-- 4. Clicks & CTR -->
            <div class="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <span class="text-[8px] block text-zinc-400 font-black uppercase">Clicks</span>
              <h4 class="text-lg font-black text-blue-500">{{ camp.clickedCount }}</h4>
              <span class="text-[9px] text-emerald-500 font-bold block">{{ camp.ctr }}% CTR</span>
            </div>

            <!-- 5. Conversions -->
            <div class="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <span class="text-[8px] block text-zinc-400 font-black uppercase">Conversions</span>
              <h4 class="text-lg font-black text-emerald-600">{{ camp.conversionCount }}</h4>
              <span class="text-[9px] text-zinc-400 block">{{ camp.conversionRate }}% Conv. Rate</span>
            </div>

            <!-- 6. Revenue Generated -->
            <div class="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <span class="text-[8px] block text-zinc-400 font-black uppercase">Attributed Revenue</span>
              <h4 class="text-lg font-black text-emerald-500">₹{{ camp.revenueGenerated | number:'1.2-2' }}</h4>
              <span class="text-[9px] text-zinc-400 block">Direct purchases</span>
            </div>
          </div>

          <!-- Interactive Funnel Progress Visualization -->
          <div class="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div class="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-zinc-400">
              <span>Conversion Funnel</span>
              <span>Dispatched (100%) &rarr; Delivered &rarr; Opened &rarr; Clicked &rarr; Converted</span>
            </div>
            
            <div class="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden flex">
              <div class="bg-orange-500 h-full transition-all" [style.width.%]="camp.deliveryRate" title="Delivered: {{ camp.deliveryRate }}%"></div>
              <div class="bg-purple-500 h-full transition-all" [style.width.%]="camp.openRate" title="Opened: {{ camp.openRate }}%"></div>
              <div class="bg-blue-500 h-full transition-all" [style.width.%]="camp.ctr" title="Clicked: {{ camp.ctr }}%"></div>
            </div>
          </div>

          <!-- Real-Time Testing & Attribution Actions -->
          <div class="bg-purple-500/5 p-4 rounded-2xl border border-purple-500/20 space-y-3">
            <div class="flex justify-between items-center">
              <div>
                <h5 class="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider">Live Interaction & Testing Suite</h5>
                <p class="text-[10px] text-zinc-400">Simulate customer interactions or test in browser tab to verify attribution counters live</p>
              </div>
              @if (isSimulatingCampaignEvent()) {
                <span class="text-[10px] text-purple-500 animate-pulse font-mono font-bold">Syncing event...</span>
              }
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <button (click)="simulateCampaignInteraction(camp.id, 'click')" [disabled]="isSimulatingCampaignEvent()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer flex items-center gap-1 shadow-xs transition-all disabled:opacity-50">
                <mat-icon class="text-xs">touch_app</mat-icon> Simulate Click (+1)
              </button>
              <button (click)="simulateCampaignInteraction(camp.id, 'open')" [disabled]="isSimulatingCampaignEvent()" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer flex items-center gap-1 shadow-xs transition-all disabled:opacity-50">
                <mat-icon class="text-xs">visibility</mat-icon> Simulate Open (+1)
              </button>
              <button (click)="simulateCampaignInteraction(camp.id, 'conversion', 1299)" [disabled]="isSimulatingCampaignEvent()" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase border-none cursor-pointer flex items-center gap-1 shadow-xs transition-all disabled:opacity-50">
                <mat-icon class="text-xs">shopping_bag</mat-icon> Simulate Order (+₹1299)
              </button>
              <button (click)="openAttributedUrlInNewTab(camp.actionUrl, camp.id)" class="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold border-none cursor-pointer flex items-center gap-1 transition-all">
                <mat-icon class="text-xs">open_in_new</mat-icon> Test in Browser Tab
              </button>
              <button (click)="copyAttributedUrl(camp.actionUrl, camp.id)" class="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold border-none cursor-pointer flex items-center gap-1 transition-all">
                <mat-icon class="text-xs">content_copy</mat-icon> Copy Link
              </button>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <span class="text-[10px] text-zinc-400 font-mono">Campaign ID: {{ camp.id }}</span>
            <button (click)="closeCampaignAnalytics()" class="px-5 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-black uppercase border-none cursor-pointer">
              Close
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-fadeIn { animation: fadeIn 0.25s ease-in-out; }
    .animate-scaleIn { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class PushSettingsTabComponent {
  public api = inject(ApiService);
  public toast = inject(ToastService);
  public ds = inject(DatastoreService);
  public notif = inject(NotificationService);

  fallbackProductImage = FALLBACK_PRODUCT_IMAGE;

  // Active top-level subtab
  activeSubTab = signal<'overview' | 'campaigns' | 'devices' | 'billing' | 'analytics' | 'logs' | 'fcm-config' | 'popup-designer'>('overview');
  
  // Campaigns mode: list vs 5-step wizard
  campaignManagerMode = signal<'list' | 'wizard'>('list');
  wizardStep = signal<number>(1);
  isSubmittingCampaign = signal<boolean>(false);
  selectedCampaignForAnalytics = signal<any>(null);
  isSimulatingCampaignEvent = signal<boolean>(false);

  // Live preview device simulation
  previewDevice = signal<'desktop' | 'android' | 'mobile' | 'tablet'>('desktop');
  lastRefreshed = signal<string>(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));

  // Product Search State
  productSearchQuery = '';
  productSearchTimer: any = null;
  isSearchingProducts = signal<boolean>(false);
  searchResults = signal<any[]>([]);
  selectedProduct = signal<any>(null);

  // Campaign Form Reactive State
  campaignForm: any = {
    name: '',
    objective: 'Promotional',
    category: 'Flash Sale',
    description: '',
    targetType: 'everyone',
    targetPlatform: 'all',
    title: '',
    body: '',
    image: '',
    icon: '/assets/icon.png',
    badge: '/assets/badge.png',
    actionUrl: '/',
    actionBtn1Text: 'Shop Now',
    actionBtn1Url: '/',
    actionBtn2Text: 'View Deals',
    actionBtn2Url: '/deals',
    priority: 'Normal',
    requireInteraction: false,
    tag: '',
    scheduleMode: 'now' as 'now' | 'draft',
    utmCampaign: ''
  };

  // Tiered Pricing Schedule (Authoritative & Non-Editable)
  billingTiers = [
    { minVolume: 1, maxVolume: 10000, rate: 0.05, label: '1–10,000', priceLabel: '₹0.05' },
    { minVolume: 10001, maxVolume: 50000, rate: 0.04, label: '10,001–50,000', priceLabel: '₹0.04' },
    { minVolume: 50001, maxVolume: 100000, rate: 0.03, label: '50,001–1,00,000', priceLabel: '₹0.03' },
    { minVolume: 100001, maxVolume: Infinity, rate: 0.02, label: 'Above 1,00,000', priceLabel: '₹0.02' }
  ];

  getBillingRateForVolume(volume: number): number {
    const vol = Math.max(1, volume || 0);
    for (const t of this.billingTiers) {
      if (vol >= t.minVolume && vol <= t.maxVolume) {
        return t.rate;
      }
    }
    return 0.05;
  }

  getBillingTierLabelForVolume(volume: number): string {
    const vol = Math.max(1, volume || 0);
    for (const t of this.billingTiers) {
      if (vol >= t.minVolume && vol <= t.maxVolume) {
        return t.label;
      }
    }
    return '1–10,000';
  }

  // Monthly Billing State
  monthlyBillingData = signal<any>(null);
  selectedBillingMonth = signal<string>('');
  availableBillingMonths = signal<string[]>([]);
  billingInvoices = signal<any[]>([]);
  billingConfig = signal<any>({
    enabled: true,
    currency: 'INR',
    pricePerNotification: 0.05,
    freeMonthlyAllowance: 0,
    minimumMonthlyCharge: 0,
    taxPercent: 0,
    taxName: 'None'
  });
  showBillingConfigModal = signal<boolean>(false);
  showInvoiceModal = signal<boolean>(false);
  selectedInvoice = signal<any>(null);
  isLoadingBilling = signal<boolean>(false);
  isGeneratingInvoice = signal<boolean>(false);

  // FCM Registered Devices State
  subscriberDevices = signal<any[]>([]);
  loadingDevices = signal<boolean>(false);
  devicesStatusFilter = signal<'all' | 'opted_in' | 'opted_out'>('all');

  allCampaigns = signal<any[]>([]);
  campaignFilter = signal<'all' | 'sent' | 'draft' | 'failed'>('all');
  campaignCategoryFilter = signal<string>('all');
  campaignDateFilter = signal<'all' | 'today' | '7days' | '30days'>('all');
  campaignSortBy = signal<'newest' | 'oldest' | 'sends' | 'clicks' | 'ctr'>('newest');
  campaignSearchQuery = signal<string>('');

  campaignCounts = computed(() => {
    const list = this.allCampaigns();
    return {
      all: list.length,
      sent: list.filter(c => c.status === 'Sent' || c.status === 'Completed').length,
      draft: list.filter(c => c.status === 'Draft').length,
      failed: list.filter(c => c.status === 'Failed').length
    };
  });

  availableCategories = computed(() => {
    const list = this.allCampaigns();
    const set = new Set<string>();
    list.forEach(c => {
      if (c.type) set.add(c.type.trim());
    });
    ['Flash Sale', 'Promotional', 'Transactional', 'Announcement', 'Cart Recovery'].forEach(cat => set.add(cat));
    return Array.from(set);
  });

  hasActiveCampaignFilters = computed(() => {
    return (
      this.campaignSearchQuery().trim().length > 0 ||
      this.campaignFilter() !== 'all' ||
      this.campaignCategoryFilter() !== 'all' ||
      this.campaignDateFilter() !== 'all' ||
      this.campaignSortBy() !== 'newest'
    );
  });

  resetCampaignFilters() {
    this.campaignSearchQuery.set('');
    this.campaignFilter.set('all');
    this.campaignCategoryFilter.set('all');
    this.campaignDateFilter.set('all');
    this.campaignSortBy.set('newest');
  }
  analyticsSummary = signal<any>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    scheduledCampaigns: 0,
    optedInDevices: 0,
    notificationsQueued: 0,
    notificationsSent: 0,
    delivered: 0,
    clicked: 0,
    ctr: 0.0,
    failedDeliveries: 0,
    currentMonthBillableUsage: 0,
    currentMonthEstimatedCharge: 0,
    currency: 'INR',
    previousMonth: null
  });
  subscriberSplit = signal<any>({ guests: 0, registered: 0, disabled: 0 });
  dailyTrends = signal<any[]>([]);

  // FCM & Popup Configs
  fcmConfig = {
    enabled: true,
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

  popupConfig: any = {
    enabled: true,
    title: 'Stay in the Loop!',
    description: 'Get instant price drops, flash deals, and maker news directly to your device.',
    allowText: 'Allow Push',
    cancelText: 'Later',
    logoUrl: '/3d-logo.png',
    buttonColor: '#f97316'
  };

  auditLogs = signal<any[]>([]);

  // Computed Values
  optedInDevicesCount = computed(() => this.subscriberDevices().filter(d => d.notificationEnabled === true).length);
  optedOutDevicesCount = computed(() => this.subscriberDevices().filter(d => d.notificationEnabled === false).length);

  optedInPercent = computed(() => {
    const total = this.subscriberDevices().length;
    return total ? Math.round((this.optedInDevicesCount() / total) * 100) : 0;
  });

  optedOutPercent = computed(() => {
    const total = this.subscriberDevices().length;
    return total ? Math.round((this.optedOutDevicesCount() / total) * 100) : 0;
  });

  desktopCount = computed(() => {
    return this.subscriberDevices().filter(d => {
      const dev = (d.device || '').toLowerCase();
      const os = (d.os || '').toLowerCase();
      return dev === 'desktop' || os.includes('windows') || os.includes('mac') || os.includes('linux');
    }).length;
  });

  mobileCount = computed(() => {
    return this.subscriberDevices().filter(d => {
      const dev = (d.device || '').toLowerCase();
      const os = (d.os || '').toLowerCase();
      return dev === 'mobile' || os.includes('android') || os.includes('ios');
    }).length;
  });

  filteredDevices = computed(() => {
    let list = this.subscriberDevices();
    const status = this.devicesStatusFilter();
    if (status === 'opted_in') {
      list = list.filter(d => d.notificationEnabled === true);
    } else if (status === 'opted_out') {
      list = list.filter(d => d.notificationEnabled === false);
    }
    return list;
  });

  filteredCampaigns = computed(() => {
    const status = this.campaignFilter();
    const category = this.campaignCategoryFilter();
    const dateRange = this.campaignDateFilter();
    const sortBy = this.campaignSortBy();
    const query = this.campaignSearchQuery().toLowerCase().trim();
    let list = [...this.allCampaigns()];

    // 1. Status Filter
    if (status === 'sent') {
      list = list.filter(c => c.status === 'Sent' || c.status === 'Completed');
    } else if (status === 'draft') {
      list = list.filter(c => c.status === 'Draft');
    } else if (status === 'failed') {
      list = list.filter(c => c.status === 'Failed');
    }

    // 2. Category Filter
    if (category !== 'all') {
      list = list.filter(c => (c.type || '').toLowerCase() === category.toLowerCase());
    }

    // 3. Search Query Filter
    if (query) {
      list = list.filter(c =>
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.title && c.title.toLowerCase().includes(query)) ||
        (c.body && c.body.toLowerCase().includes(query)) ||
        (c.type && c.type.toLowerCase().includes(query)) ||
        (c.actionUrl && c.actionUrl.toLowerCase().includes(query))
      );
    }

    // 4. Date Range Filter
    if (dateRange !== 'all') {
      const now = new Date().getTime();
      list = list.filter(c => {
        if (!c.createdAt) return true;
        const cTime = new Date(c.createdAt).getTime();
        const diffMs = now - cTime;
        if (dateRange === 'today') {
          return diffMs <= 24 * 60 * 60 * 1000;
        } else if (dateRange === '7days') {
          return diffMs <= 7 * 24 * 60 * 60 * 1000;
        } else if (dateRange === '30days') {
          return diffMs <= 30 * 24 * 60 * 60 * 1000;
        }
        return true;
      });
    }

    // 5. Sorting
    list.sort((a, b) => {
      if (sortBy === 'newest') {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      } else if (sortBy === 'oldest') {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tA - tB;
      } else if (sortBy === 'sends') {
        return (b.sentCount || 0) - (a.sentCount || 0);
      } else if (sortBy === 'clicks') {
        return (b.clickedCount || 0) - (a.clickedCount || 0);
      } else if (sortBy === 'ctr') {
        return (b.ctr || 0) - (a.ctr || 0);
      }
      return 0;
    });

    return list;
  });

  constructor() {
    this.initBillingMonths();
    this.refreshAllHubData();
  }

  initBillingMonths() {
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const formatted = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      months.push(formatted);
    }
    this.availableBillingMonths.set(months);
    this.selectedBillingMonth.set(months[0]);
  }

  refreshAllHubData() {
    this.loadCampaigns();
    this.loadAnalytics();
    this.loadMonthlyBilling();
    this.loadBillingInvoices();
    this.loadSubscriberDevices();
    this.loadAuditLogs();
    this.loadFCMConfig();
    this.loadPopupConfig();
    this.lastRefreshed.set(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  }

  loadCampaigns() {
    this.api.get<any>('/admin/push/campaigns?limit=100').subscribe({
      next: (res) => {
        if (res && res.success && res.data && Array.isArray(res.data.list)) {
          const mapped = res.data.list.map((c: any) => {
            const an = Array.isArray(c.analytics) && c.analytics.length > 0 ? c.analytics[0] : (c.analytics || {});
            const sent = Number(an.sentCount || 0);
            const delivered = Number(an.deliveredCount || 0);
            const opened = Number(an.openedCount || 0);
            const clicked = Number(an.clickedCount || 0);
            const conversions = Number(an.conversionCount || 0);
            const revenue = Number(an.revenueGenerated || 0);

            const deliveryRate = sent > 0 ? Number(((delivered / sent) * 100).toFixed(1)) : 0;
            const openRate = delivered > 0 ? Number(((opened / delivered) * 100).toFixed(1)) : (sent > 0 ? Number(((opened / sent) * 100).toFixed(1)) : 0);
            const ctr = sent > 0 ? Number(((clicked / sent) * 100).toFixed(1)) : 0;
            const convRate = clicked > 0 ? Number(((conversions / clicked) * 100).toFixed(1)) : 0;

            return {
              id: c.id,
              name: c.name,
              type: c.type || 'Promotional',
              status: c.status || 'Sent',
              title: c.title || '',
              body: c.body || '',
              image: c.image || null,
              actionUrl: c.actionUrl || '/',
              priority: c.priority || 'Normal',
              sentCount: sent,
              deliveredCount: delivered,
              deliveryRate,
              openedCount: opened,
              openRate,
              clickedCount: clicked,
              ctr,
              conversionCount: conversions,
              conversionRate: convRate,
              revenueGenerated: revenue,
              date: c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A',
              createdAt: c.createdAt || new Date().toISOString()
            };
          });
          this.allCampaigns.set(mapped);
        }
      }
    });
  }

  loadAnalytics() {
    this.api.get<any>('/admin/push/analytics').subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          const s = res.data.summary;
          this.analyticsSummary.set(s);
          this.subscriberSplit.set({
            guests: Math.max(0, (s.totalDevices || 0) - (s.unsubscribedUsers || 0) - (s.registeredUsers || 0)),
            registered: s.registeredUsers || 0,
            disabled: s.unsubscribedUsers || 0
          });
          this.dailyTrends.set(res.data.dailyTrends || []);
        }
      }
    });
  }

  loadMonthlyBilling(month?: string) {
    const targetMonth = month || this.selectedBillingMonth();
    this.isLoadingBilling.set(true);
    this.api.get<any>(`/admin/push/billing/monthly?month=${targetMonth}`).subscribe({
      next: (res) => {
        this.isLoadingBilling.set(false);
        if (res && res.success && res.data) {
          this.monthlyBillingData.set(res.data);
          if (res.data.config) {
            this.billingConfig.set(res.data.config);
          }
          this.loadBillingInvoices();
        }
      },
      error: () => {
        this.isLoadingBilling.set(false);
        if (!this.monthlyBillingData()) {
          const cfg = this.billingConfig();
          this.monthlyBillingData.set({
            billingMonth: targetMonth,
            billingPeriodLabel: this.formatMonthLabel(targetMonth),
            config: cfg,
            usage: {
              totalEvents: 0,
              billableNotifications: 0,
              successfulDispatches: 0,
              confirmedDelivered: 0,
              failedDispatches: 0,
              clicksCount: 0,
              freeAllowanceApplied: 0,
              billableAfterAllowance: 0
            },
            financials: {
              currency: cfg.currency || 'INR',
              unitRate: 0.05,
              activeTier: '1–10,000',
              tierPriceLabel: '₹0.05',
              tiers: cfg.tiers || [
                { minVolume: 1, maxVolume: 10000, rate: 0.05, label: '1–10,000', priceLabel: '₹0.05' },
                { minVolume: 10001, maxVolume: 50000, rate: 0.04, label: '10,001–50,000', priceLabel: '₹0.04' },
                { minVolume: 50001, maxVolume: 100000, rate: 0.03, label: '50,001–1,00,000', priceLabel: '₹0.03' },
                { minVolume: 100001, maxVolume: null, rate: 0.02, label: 'Above 1,00,000', priceLabel: '₹0.02' }
              ],
              usageSubtotal: 0,
              minimumChargeApplied: false,
              subtotal: 0,
              taxPercent: 0,
              taxName: 'None',
              taxAmount: 0,
              totalAmount: 0
            },
            previousMonth: null,
            invoice: null
          });
        }
      }
    });
  }

  onBillingMonthChange(newMonth: string) {
    this.selectedBillingMonth.set(newMonth);
    this.loadMonthlyBilling(newMonth);
    this.loadBillingInvoices();
  }

  loadBillingInvoices() {
    this.api.get<any>('/admin/push/billing/invoices').subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.data)) {
          this.billingInvoices.set(res.data);
        }
      },
      error: () => {
        if (!this.billingInvoices().length) {
          this.billingInvoices.set([]);
        }
      }
    });
  }

  saveBillingConfig(event?: Event) {
    if (event) event.preventDefault();
    this.api.post<any>('/admin/push/billing/config', this.billingConfig()).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.toast.success('Billing pricing and policy configuration saved!');
          this.showBillingConfigModal.set(false);
          this.loadMonthlyBilling();
        }
      },
      error: (err) => this.toast.error('Failed to save billing configuration: ' + err.message)
    });
  }

  generateMonthlyInvoice() {
    const month = this.selectedBillingMonth();
    this.isGeneratingInvoice.set(true);
    this.api.post<any>('/admin/push/billing/generate-invoice', { month }).subscribe({
      next: (res) => {
        this.isGeneratingInvoice.set(false);
        if (res && res.success) {
          this.toast.success('Consolidated monthly invoice generated!');
          this.selectedInvoice.set(res.data);
          this.showInvoiceModal.set(true);
          this.loadMonthlyBilling();
          this.loadBillingInvoices();
        }
      },
      error: (err) => {
        this.isGeneratingInvoice.set(false);
        this.toast.error('Failed to generate invoice: ' + err.message);
      }
    });
  }

  exportBillingCsv() {
    const month = this.selectedBillingMonth();
    window.open(`/api/admin/push/billing/export?month=${month}`, '_blank');
    this.toast.success(`Exporting monthly billing usage CSV for ${month}...`);
  }

  viewInvoice(inv: any) {
    this.selectedInvoice.set(inv);
    this.showInvoiceModal.set(true);
  }

  printInvoice() {
    window.print();
  }

  formatMonthLabel(mStr: string): string {
    if (!mStr || !mStr.includes('-')) return mStr;
    const [y, m] = mStr.split('-').map(Number);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[m - 1]} ${y}`;
  }

  // Audience reach calculation using real subscriber count
  getReachEstimate(): number {
    const eligible = this.subscriberDevices().filter(d => d.notificationEnabled === true);
    if (eligible.length === 0) return this.optedInDevicesCount() || 0;
    
    let filtered = eligible;
    if (this.campaignForm.targetPlatform === 'desktop') {
      filtered = filtered.filter(d => {
        const os = (d.os || '').toLowerCase();
        return os.includes('windows') || os.includes('mac') || os.includes('linux');
      });
    } else if (this.campaignForm.targetPlatform === 'mobile') {
      filtered = filtered.filter(d => {
        const os = (d.os || '').toLowerCase();
        return os.includes('android') || os.includes('ios');
      });
    }
    return filtered.length || this.optedInDevicesCount();
  }

  refreshAudienceEstimate() {
    this.loadSubscriberDevices();
    this.toast.info('Recipients count updated from live device records.');
  }

  // Product Search UX with Debouncing & Fallback Placeholder
  onProductSearchInput() {
    if (this.productSearchTimer) clearTimeout(this.productSearchTimer);
    this.productSearchTimer = setTimeout(() => {
      this.searchProducts();
    }, 300);
  }

  searchProducts() {
    const q = this.productSearchQuery.trim();
    if (!q) {
      this.searchResults.set([]);
      return;
    }
    this.isSearchingProducts.set(true);
    this.api.get<any>('/admin/push/products/search', { q }).subscribe({
      next: (res) => {
        this.isSearchingProducts.set(false);
        if (res && res.success && Array.isArray(res.data)) {
          this.searchResults.set(res.data);
        } else {
          this.searchResults.set([]);
        }
      },
      error: () => {
        this.isSearchingProducts.set(false);
        this.searchResults.set([]);
      }
    });
  }

  clearProductSearch() {
    this.productSearchQuery = '';
    this.searchResults.set([]);
  }

  selectProduct(p: any) {
    this.selectedProduct.set(p);
    const price = p.salePrice || p.basePrice || 0;
    const origPrice = p.basePrice || price;
    this.campaignForm.name = `Promo: ${p.name}`;
    this.campaignForm.title = `🔥 Price Drop: ${p.name}`;
    this.campaignForm.body = p.discountPercent && p.discountPercent > 0
      ? `Get ${p.discountPercent}% OFF! Now at ₹${price} (was ₹${origPrice}). Limited stock available!`
      : `Special Deal on ${p.name} at ₹${price}. Order now with fast shipping!`;
    this.campaignForm.image = p.image || '';
    this.campaignForm.actionUrl = p.productUrl || `/product/${p.sku || p.id}`;
    this.campaignForm.actionBtn1Text = 'Order Now';
    this.campaignForm.actionBtn1Url = p.productUrl || `/product/${p.sku || p.id}`;
    this.searchResults.set([]);
    this.productSearchQuery = '';
    this.toast.success(`Loaded product "${p.name}" into campaign builder.`);
  }

  clearSelectedProduct() {
    this.selectedProduct.set(null);
  }

  onProductImgError(event: any) {
    event.target.src = this.fallbackProductImage;
  }

  // Wizard navigation
  getWizardStepName(step: number): string {
    switch (step) {
      case 1: return 'Campaign Details';
      case 2: return 'Target Audience';
      case 3: return 'Push Content & Preview';
      case 4: return 'Review & Billing Impact';
      case 5: return 'Review & Launch';
      default: return '';
    }
  }

  goToNextWizardStep() {
    if (this.wizardStep() === 1 && !this.campaignForm.name) {
      this.toast.error('Campaign Name is required.');
      return;
    }
    if (this.wizardStep() === 3 && (!this.campaignForm.title || !this.campaignForm.body)) {
      this.toast.error('Notification Title and Body are required.');
      return;
    }
    this.wizardStep.set(this.wizardStep() + 1);
  }

  openCreateCampaignWizard() {
    this.clearCampaignForm();
    this.activeSubTab.set('campaigns');
    this.campaignManagerMode.set('wizard');
    this.wizardStep.set(1);
  }

  clearCampaignForm() {
    this.campaignForm = {
      name: '',
      objective: 'Promotional',
      category: 'Flash Sale',
      description: '',
      targetType: 'everyone',
      targetPlatform: 'all',
      title: '',
      body: '',
      image: '',
      icon: '/assets/icon.png',
      badge: '/assets/badge.png',
      actionUrl: '/',
      actionBtn1Text: 'Shop Now',
      actionBtn1Url: '/',
      actionBtn2Text: 'View Deals',
      actionBtn2Url: '/deals',
      priority: 'Normal',
      requireInteraction: false,
      tag: '',
      scheduleMode: 'now',
      utmCampaign: ''
    };
    this.selectedProduct.set(null);
  }

  resetPreview() {
    this.campaignForm.title = "🔥 3D Galaxy Flash Sale: 20% OFF ABS";
    this.campaignForm.body = "Upgrade your prints with genuine Elegoo & Bambu supplies. Limited stock available.";
    this.campaignForm.image = "https://storage.googleapis.com/ajr3dgalaxy.firebasestorage.app/product-import/1784443970788-192528383.webp";
    this.campaignForm.actionUrl = "/category/filaments";
    this.campaignForm.actionBtn1Text = "Shop Now";
    this.campaignForm.actionBtn1Url = "/category/filaments";
    this.campaignForm.actionBtn2Text = "Explore Deals";
    this.campaignForm.actionBtn2Url = "/deals";
    this.toast.info('Preview reset to sample state.');
  }

  simulateActionClick(btnText: string, url: string) {
    this.toast.info(`[Simulation] Action Clicked: "${btnText}" -> Navigates to ${url || '/'}. No real notification sent.`);
  }

  submitCampaign() {
    if (!this.campaignForm.title || !this.campaignForm.body) {
      this.toast.error('Notification title and message body are required.');
      return;
    }

    if (this.isSubmittingCampaign()) return; // Idempotency guard

    this.isSubmittingCampaign.set(true);

    const payload = {
      name: this.campaignForm.name || `Push: ${this.campaignForm.title}`,
      type: this.campaignForm.category || 'Promotional',
      title: this.campaignForm.title,
      body: this.campaignForm.body,
      image: this.campaignForm.image || null,
      icon: this.campaignForm.icon || '/assets/icon.png',
      badge: this.campaignForm.badge || '/assets/badge.png',
      actionUrl: this.campaignForm.actionUrl || '/',
      ctaText: this.campaignForm.actionBtn1Text || 'Open',
      priority: this.campaignForm.priority || 'Normal',
      requireInteraction: !!this.campaignForm.requireInteraction,
      tag: this.campaignForm.tag || undefined,
      targetType: this.campaignForm.targetType || 'everyone',
      status: 'Draft'
    };

    this.api.post<any>('/admin/push/campaign', payload).subscribe({
      next: (createRes) => {
        if (createRes && createRes.success) {
          const campaignId = createRes.data.id;

          if (this.campaignForm.scheduleMode === 'now') {
            this.api.post<any>('/admin/push/send', { campaignId }).subscribe({
              next: (sendRes) => {
                this.isSubmittingCampaign.set(false);
                this.toast.success(sendRes.message || 'Push broadcast queued for immediate dispatch!');
                this.refreshAllHubData();
                setTimeout(() => this.refreshAllHubData(), 1200);
                setTimeout(() => this.refreshAllHubData(), 3000);
                this.campaignManagerMode.set('list');
              },
              error: (err) => {
                this.isSubmittingCampaign.set(false);
                this.toast.error('Dispatch error: ' + (err.error?.message || err.message));
                this.loadCampaigns();
              }
            });
          } else {
            this.isSubmittingCampaign.set(false);
            this.toast.success('Campaign draft saved successfully.');
            this.refreshAllHubData();
            this.campaignManagerMode.set('list');
          }
        }
      },
      error: (err) => {
        this.isSubmittingCampaign.set(false);
        this.toast.error('Failed to create campaign: ' + (err.error?.message || err.message));
      }
    });
  }

  useCampaignAsTemplate(camp: any) {
    this.campaignForm.name = `Copy of ${camp.name}`;
    this.campaignForm.title = camp.title || '';
    this.campaignForm.body = camp.body || '';
    this.campaignForm.image = camp.image || '';
    this.campaignForm.actionUrl = camp.actionUrl || '/';
    this.campaignForm.priority = camp.priority || 'Normal';
    this.campaignForm.category = camp.type || 'Promotional';
    this.activeSubTab.set('campaigns');
    this.campaignManagerMode.set('wizard');
    this.wizardStep.set(1);
    this.toast.info('Campaign loaded into composer.');
  }

  duplicateCampaign(camp: any) {
    const dupe = {
      ...camp,
      id: 'camp-' + Math.random().toString(36).substr(2, 9),
      name: `${camp.name} (Copy)`,
      status: 'Draft',
      sentCount: 0,
      deliveredCount: 0,
      clickedCount: 0,
      ctr: 0
    };
    this.allCampaigns.update(c => [dupe, ...c]);
    this.toast.success('Campaign duplicated as draft.');
  }

  exportCampaign(camp: any) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(camp, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${camp.name.replace(/\s+/g, '_')}_campaign.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.toast.success('Campaign JSON structure exported.');
  }

  openCampaignAnalytics(campaign: any) {
    this.selectedCampaignForAnalytics.set(campaign);
    this.api.get<any>(`/admin/push/analytics?campaignId=${campaign.id}`).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          const an = res.data;
          const sent = Number(an.sentCount || 0);
          const delivered = Number(an.deliveredCount || 0);
          const opened = Number(an.openedCount || 0);
          const clicked = Number(an.clickedCount || 0);
          const conversions = Number(an.conversionCount || 0);
          const revenue = Number(an.revenueGenerated || 0);
          const deliveryRate = sent > 0 ? Number(((delivered / sent) * 100).toFixed(1)) : 0;
          const openRate = delivered > 0 ? Number(((opened / delivered) * 100).toFixed(1)) : (sent > 0 ? Number(((opened / sent) * 100).toFixed(1)) : 0);
          const ctr = sent > 0 ? Number(((clicked / sent) * 100).toFixed(1)) : 0;
          const convRate = clicked > 0 ? Number(((conversions / clicked) * 100).toFixed(1)) : 0;

          this.selectedCampaignForAnalytics.update(c => ({
            ...c,
            sentCount: sent,
            deliveredCount: delivered,
            deliveryRate,
            openedCount: opened,
            openRate,
            clickedCount: clicked,
            ctr,
            conversionCount: conversions,
            conversionRate: convRate,
            revenueGenerated: revenue
          }));
        }
      }
    });
  }

  closeCampaignAnalytics() {
    this.selectedCampaignForAnalytics.set(null);
  }

  simulateCampaignInteraction(campaignId: string, event: 'open' | 'click' | 'conversion', revenue?: number) {
    this.isSimulatingCampaignEvent.set(true);
    this.api.post<any>(`/admin/push/campaign/${campaignId}/simulate-event`, { event, revenue }).subscribe({
      next: (res) => {
        this.isSimulatingCampaignEvent.set(false);
        this.toast.success(`Tracked 1 ${event.toUpperCase()} for campaign!`);
        this.loadCampaigns();
        this.loadAnalytics();
        this.loadMonthlyBilling();
        if (this.selectedCampaignForAnalytics()?.id === campaignId) {
          const an = res.data?.analytics?.[0] || res.data?.analytics;
          if (an) {
            const sent = Number(an.sentCount || 0);
            const delivered = Number(an.deliveredCount || 0);
            const opened = Number(an.openedCount || 0);
            const clicked = Number(an.clickedCount || 0);
            const conversions = Number(an.conversionCount || 0);
            const revenueVal = Number(an.revenueGenerated || 0);
            const deliveryRate = sent > 0 ? Number(((delivered / sent) * 100).toFixed(1)) : 0;
            const openRate = delivered > 0 ? Number(((opened / delivered) * 100).toFixed(1)) : (sent > 0 ? Number(((opened / sent) * 100).toFixed(1)) : 0);
            const ctr = sent > 0 ? Number(((clicked / sent) * 100).toFixed(1)) : 0;
            const convRate = clicked > 0 ? Number(((conversions / clicked) * 100).toFixed(1)) : 0;

            this.selectedCampaignForAnalytics.update(c => ({
              ...c,
              sentCount: sent,
              deliveredCount: delivered,
              deliveryRate,
              openedCount: opened,
              openRate,
              clickedCount: clicked,
              ctr,
              conversionCount: conversions,
              conversionRate: convRate,
              revenueGenerated: revenueVal
            }));
          }
        }
      },
      error: (err) => {
        this.isSimulatingCampaignEvent.set(false);
        this.toast.error('Simulation error: ' + (err.error?.message || err.message));
      }
    });
  }

  copyAttributedUrl(url: string, campaignId: string) {
    let fullUrl = url || '/';
    if (!fullUrl.includes('utm_campaign=')) {
      const sep = fullUrl.includes('?') ? '&' : '?';
      fullUrl = `${fullUrl}${sep}utm_campaign=${encodeURIComponent(campaignId)}&utm_source=webpush&utm_medium=push`;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const absolute = fullUrl.startsWith('http') ? fullUrl : `${origin}${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`;
    navigator.clipboard.writeText(absolute);
    this.toast.success('Attributed destination link copied to clipboard!');
  }

  openAttributedUrlInNewTab(url: string, campaignId: string) {
    let fullUrl = url || '/';
    if (!fullUrl.includes('utm_campaign=')) {
      const sep = fullUrl.includes('?') ? '&' : '?';
      fullUrl = `${fullUrl}${sep}utm_campaign=${encodeURIComponent(campaignId)}&utm_source=webpush&utm_medium=push`;
    }
    window.open(fullUrl, '_blank');
  }

  // Subscriber Devices Helpers
  loadSubscriberDevices() {
    this.loadingDevices.set(true);
    this.api.get<any>('/admin/notifications/devices').subscribe({
      next: (res) => {
        this.loadingDevices.set(false);
        if (res && res.success && Array.isArray(res.data)) {
          this.subscriberDevices.set(res.data);
        }
      },
      error: () => this.loadingDevices.set(false)
    });
  }

  sendDirectTestPush(dev: any) {
    if (!dev || !dev.fcmToken) {
      this.toast.error('No valid FCM token on this device.');
      return;
    }
    this.toast.info('Sending test notification to device...');
    this.api.post<any>('/admin/push/test', {
      fcmToken: dev.fcmToken,
      title: '⚡ 3D Galaxy Web Push Test',
      body: `Live test ping sent to ${dev.browser || 'Browser'} on ${dev.os || 'Device'}`,
      actionUrl: '/'
    }).subscribe({
      next: () => this.toast.success('Test notification delivered to device!'),
      error: (err) => this.toast.error('Failed to deliver test: ' + (err.message || 'Error'))
    });
  }

  exportDevicesCsv() {
    const devices = this.filteredDevices();
    if (devices.length === 0) {
      this.toast.info('No devices to export.');
      return;
    }
    const headers = ['ID', 'Status', 'User / Guest', 'Browser', 'OS', 'Device Type', 'Environment', 'Country', 'Last Active', 'FCM Token'];
    const rows = devices.map(d => [
      `"${d.id || ''}"`,
      `"${d.notificationEnabled ? 'Opted In' : 'Opted Out'}"`,
      `"${d.user?.email || d.guestId || 'Anonymous'}"`,
      `"${d.browser || ''}"`,
      `"${d.os || ''}"`,
      `"${d.device || ''}"`,
      `"${d.environment || ''}"`,
      `"${d.country || ''}"`,
      `"${d.lastActive || d.createdAt || ''}"`,
      `"${d.fcmToken || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `3dgalaxy_push_devices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toast.success(`Exported ${devices.length} devices to CSV.`);
  }

  formatDeviceDate(dateStr: any): string {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(dateStr);
    }
  }

  // Logs & Audit
  loadAuditLogs() {
    this.api.get<any>('/admin/fcm/logs').subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.data)) {
          this.auditLogs.set(res.data);
        }
      }
    });
  }

  // FCM Config & Test
  loadFCMConfig() {
    this.api.get<any>('/admin/push/config').subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.fcmConfig = { ...this.fcmConfig, ...res.data };
        }
      }
    });
  }

  saveFCMConfig(event: Event) {
    event.preventDefault();
    this.api.post<any>('/admin/push/config', this.fcmConfig).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Firebase configuration saved successfully!');
        }
      },
      error: (err) => this.toast.error('Failed to save config: ' + err.message)
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
      title: '🔥 Live Push Connection Test Success!',
      body: 'Your Web Push integration is fully active and delivering notifications.',
      actionUrl: '/'
    }).subscribe({
      next: (res) => {
        if (res.success) this.toast.success('Test notification sent successfully!');
      },
      error: (err) => this.toast.error('Failed to send test push: ' + err.message)
    });
  }

  // Popup Designer
  loadPopupConfig() {
    this.api.get<any>('/admin/push/popup-config').subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.popupConfig = { ...this.popupConfig, ...res.data };
        }
      }
    });
  }

  savePopupConfig(event: Event) {
    event.preventDefault();
    this.api.post<any>('/admin/push/popup-config', this.popupConfig).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Popup styling saved successfully!');
        }
      },
      error: (err) => this.toast.error('Failed to save popup styling: ' + err.message)
    });
  }

  triggerLivePreview() {
    this.notif.testTriggerPopup();
    this.toast.info('Live notification popup preview triggered in browser!');
  }

  getPreviewBgColor(): string {
    if (this.popupConfig.backgroundColor === 'theme' || !this.popupConfig.backgroundColor) {
      return this.ds.theme() === 'dark' ? '#18181b' : '#ffffff';
    }
    return this.popupConfig.backgroundColor;
  }

  getPreviewTextColor(): string {
    if (this.popupConfig.textColor === 'theme' || !this.popupConfig.textColor) {
      return this.ds.theme() === 'dark' ? '#f8fafc' : '#09090b';
    }
    return this.popupConfig.textColor;
  }

  getPreviewLogoUrl(): string {
    return this.popupConfig.logoUrl?.trim() || '/3d-logo.png';
  }

  // Chart Helpers
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
