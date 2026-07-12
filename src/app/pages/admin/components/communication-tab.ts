import { Component, Input, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminPanel } from '../admin';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-communication-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="space-y-6 font-sans">
      
      <!-- Top Sub Tabs switcher -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 class="text-lg font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-500 flex items-center justify-center"><mat-icon>chat</mat-icon></span>
            WhatsApp Communication Hub
          </h2>
          <p class="text-xs text-zinc-400 mt-1">Broadcast marketing campaigns, audit message queues, and examine deliverability analytics.</p>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="subTab.set('analytics')" [class]="subTab() === 'analytics' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-350'" class="px-4 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs">Analytics</button>
          <button (click)="subTab.set('logs')" [class]="subTab() === 'logs' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-350'" class="px-4 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs">Logs Queue</button>
          <button (click)="subTab.set('campaigns')" [class]="subTab() === 'campaigns' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-350'" class="px-4 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs">Campaigns</button>
        </div>
      </div>

      <!-- ANALYTICS PANEL -->
      @if (subTab() === 'analytics') {
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
            <span class="text-[9px] font-black uppercase text-zinc-400">Dispatched Today</span>
            <div class="flex items-baseline justify-between">
              <h3 class="text-2xl font-black">{{ stats().sentToday }}</h3>
              <span class="text-[10px] text-emerald-500 font-bold">100% Volume</span>
            </div>
          </div>
          <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
            <span class="text-[9px] font-black uppercase text-emerald-500">Delivered Rate</span>
            <div class="flex items-baseline justify-between">
              <h3 class="text-2xl font-black text-emerald-500">{{ stats().deliveredPercent }}%</h3>
              <span class="text-[10px] text-zinc-400">{{ stats().deliveredCount }} Msg</span>
            </div>
          </div>
          <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
            <span class="text-[9px] font-black uppercase text-blue-500">Read Receipts Rate</span>
            <div class="flex items-baseline justify-between">
              <h3 class="text-2xl font-black text-blue-500">{{ stats().readPercent }}%</h3>
              <span class="text-[10px] text-zinc-400">{{ stats().readCount }} Msg</span>
            </div>
          </div>
          <div class="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
            <span class="text-[9px] font-black uppercase text-red-500">Failed Rate</span>
            <div class="flex items-baseline justify-between">
              <h3 class="text-2xl font-black text-red-500">{{ stats().failedPercent }}%</h3>
              <span class="text-[10px] text-zinc-400">{{ stats().failedCount }} Msg</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Success rate metric chart -->
          <div class="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
            <div class="flex justify-between items-center">
              <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Delivery Success Rate Trend (Monthly)</h3>
              <span class="text-[9px] font-bold text-zinc-400">Updated Hourly</span>
            </div>
            
            <!-- Graphic dynamic HTML bars chart -->
            <div class="h-48 flex items-end gap-3 pt-6 border-b border-zinc-200 dark:border-zinc-800">
              @for (bar of monthlyGraph(); track bar.month) {
                <div class="flex-1 flex flex-col items-center gap-2 group">
                  <div class="w-full bg-zinc-100 dark:bg-zinc-800 rounded-t-lg relative overflow-hidden" style="height: 120px;">
                    <div class="bg-blue-600 absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-500 group-hover:bg-blue-500" [style.height.%]="bar.percent">
                      <div class="absolute inset-0 bg-linear-to-t from-white/0 to-white/20"></div>
                    </div>
                  </div>
                  <span class="text-[9px] font-black uppercase text-zinc-400">{{ bar.month }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Top Templates used -->
          <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
            <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-2 border-b border-zinc-150 dark:border-zinc-800">Top Dispatched Triggers</h3>
            <div class="space-y-4">
              @for (t of topTemplates(); track t.name) {
                <div class="space-y-1">
                  <div class="flex justify-between text-xs">
                    <span class="font-bold text-zinc-850 dark:text-zinc-200 uppercase text-[10px]">{{ t.name }}</span>
                    <span class="font-bold text-zinc-400">{{ t.count }} Sends</span>
                  </div>
                  <div class="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500 rounded-full" [style.width.%]="t.percent"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- LOGS QUEUE PANEL -->
      @if (subTab() === 'logs' && !selectedLog()) {
        <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          
          <!-- Filters -->
          <div class="p-5 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-4 gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div class="space-y-1">
              <span class="block text-[8px] font-black text-zinc-400 uppercase">Search Query</span>
              <input type="text" [(ngModel)]="searchQuery" placeholder="Search phone, template, ID..." class="w-full px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none">
            </div>
            <div class="space-y-1">
              <span class="block text-[8px] font-black text-zinc-400 uppercase">Status</span>
              <select [(ngModel)]="filterStatus" class="w-full px-3 py-1.5 bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none cursor-pointer">
                <option value="">All Statuses</option>
                <option value="Queued">Queued</option>
                <option value="Sent">Sent</option>
                <option value="Delivered">Delivered</option>
                <option value="Read">Read</option>
                <option value="Failed">Failed</option>
                <option value="Retrying">Retrying</option>
              </select>
            </div>
            <div class="space-y-1 flex items-end gap-2">
              <button (click)="loadLogs()" class="flex-1 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-1 border-none cursor-pointer"><mat-icon class="text-sm">refresh</mat-icon> Reload</button>
              <button (click)="exportLogsCsv()" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-1 border-none cursor-pointer"><mat-icon class="text-sm">download</mat-icon> CSV</button>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-zinc-50 dark:bg-zinc-955/40 text-[9px] font-black uppercase text-zinc-400 tracking-wider border-b border-zinc-200 dark:border-zinc-850">
                  <th class="p-4 pl-6">Log ID</th>
                  <th class="p-4">Customer</th>
                  <th class="p-4">Phone</th>
                  <th class="p-4">Template</th>
                  <th class="p-4">Status</th>
                  <th class="p-4">Type</th>
                  <th class="p-4">Retries</th>
                  <th class="p-4">Sent At</th>
                  <th class="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-850">
                @for (log of filteredLogs(); track log.id) {
                  <tr class="text-xs hover:bg-zinc-50 dark:hover:bg-zinc-955/50 transition-colors">
                    <td class="p-4 pl-6 font-mono text-[10px] text-zinc-500">
                      {{ log.id.slice(0, 8) }}...{{ log.id.slice(-6) }}
                    </td>
                    <td class="p-4 font-bold">
                      {{ log.customerId ? log.customerId.slice(0, 8) : 'Guest' }}
                    </td>
                    <td class="p-4 font-mono font-bold">
                      {{ log.phone }}
                    </td>
                    <td class="p-4 uppercase text-[10px] font-black text-blue-500">
                      {{ log.templateName }}
                    </td>
                    <td class="p-4">
                      <span [class]="getStatusClass(log.status)" class="px-2 py-0.5 text-[9px] font-black uppercase rounded-md tracking-wider">
                        {{ log.status }}
                      </span>
                    </td>
                    <td class="p-4 uppercase text-[9px] font-bold text-zinc-400">
                      {{ log.messageType }}
                    </td>
                    <td class="p-4 font-mono font-bold">
                      {{ log.retryCount || 0 }}
                    </td>
                    <td class="p-4 text-zinc-400 text-[11px] font-medium">
                      {{ log.createdAt | date:'MMM d, y, h:mm a' }}
                    </td>
                    <td class="p-4 pr-6 text-right">
                      <button (click)="selectedLog.set(log)" class="px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer">Inspect</button>
                    </td>
                  </tr>
                }
                @if (filteredLogs().length === 0) {
                  <tr>
                    <td colspan="9" class="p-8 text-center text-xs font-bold text-zinc-500">No WhatsApp dispatch history recorded.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- LOG DETAIL INSPECTOR -->
      @if (subTab() === 'logs' && selectedLog(); as log) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <div class="flex justify-between items-center pb-4 border-b border-zinc-150 dark:border-zinc-800">
                <button (click)="selectedLog.set(null)" class="flex items-center gap-1 text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors cursor-pointer border-none bg-transparent">
                  <mat-icon class="text-sm">arrow_back</mat-icon> Back to queue
                </button>
                <span class="text-xs font-mono text-zinc-400">Message ID: {{ log.messageId || 'N/A' }}</span>
              </div>

              <!-- Payloads -->
              <div class="space-y-4">
                <div>
                  <span class="block text-[10px] font-black text-zinc-400 uppercase mb-1">API Dispatch Payload</span>
                  <pre class="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono overflow-auto max-h-48 text-zinc-650 dark:text-zinc-300">{{ log.requestPayload | json }}</pre>
                </div>
                <div>
                  <span class="block text-[10px] font-black text-zinc-400 uppercase mb-1">Meta Response payload</span>
                  <pre class="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono overflow-auto max-h-48 text-zinc-650 dark:text-zinc-300">{{ log.responsePayload | json }}</pre>
                </div>
                @if (log.errorMessage) {
                  <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
                    <span class="block text-[9px] font-black text-red-500 uppercase">Error Logs & Cause</span>
                    <p class="text-xs text-red-600 dark:text-red-400 font-mono">{{ log.errorMessage }}</p>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Metadata & Actions -->
          <div class="space-y-6">
            <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white border-b border-zinc-150 dark:border-zinc-850 pb-3">Log Metadata</h3>
              
              <div class="space-y-3.5 text-xs">
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Recipient Phone</span>
                  <span class="font-bold text-zinc-900 dark:text-white font-mono">{{ log.phone }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Approved Template</span>
                  <span class="font-bold text-zinc-900 dark:text-white uppercase font-mono text-[10px]">{{ log.templateName }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Provider Channel</span>
                  <span class="font-bold text-zinc-900 dark:text-white uppercase">{{ log.provider }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Clearance Status</span>
                  <span [class]="getStatusClass(log.status)" class="px-2 py-0.5 text-[9px] font-black uppercase rounded-md tracking-wider">{{ log.status }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Retry Dispatches</span>
                  <span class="font-bold text-zinc-900 dark:text-white">{{ log.retryCount }} / 3</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Delivered Timestamp</span>
                  <span class="font-medium text-zinc-400">{{ log.deliveredAt ? (log.deliveredAt | date:'medium') : 'Pending' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Read Timestamp</span>
                  <span class="font-medium text-zinc-400">{{ log.readAt ? (log.readAt | date:'medium') : 'Pending' }}</span>
                </div>
              </div>

              <!-- Retrying Trigger actions -->
              @if (log.status === 'Failed' || log.status === 'Retrying') {
                <div class="pt-4 border-t border-zinc-150 dark:border-zinc-800 space-y-3">
                  <h4 class="text-[10px] font-black uppercase text-amber-500">Manual Retry Actions</h4>
                  <button (click)="retryLog(log)" [disabled]="actionLoading()" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs">Re-Queue Message</button>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- CAMPAIGNS PANEL -->
      @if (subTab() === 'campaigns') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          
          <!-- Campaign Builder -->
          <div class="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-5">
            <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-3 border-b border-zinc-150 dark:border-zinc-800">Launch Bulk WhatsApp Campaign</h3>
            
            <div class="space-y-4 text-xs">
              <div class="space-y-1">
                <span class="block text-[9px] font-black text-zinc-400 uppercase">Campaign Title Reference</span>
                <input type="text" [(ngModel)]="campaignTitle" placeholder="e.g. Diwali Festival Wishes 2026" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 font-medium">
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase">Target Audience Segments</span>
                  <select [(ngModel)]="campaignTarget" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none cursor-pointer">
                    <option value="All">All Registered Customers</option>
                    <option value="Recently Purchased">Active Customers (Purchased last 30 days)</option>
                    <option value="Inactive">Inactive Customers (No orders last 90 days)</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase">Select Dispatched Template</span>
                  <select [(ngModel)]="campaignTemplate" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none cursor-pointer">
                    <option value="registration">Welcome Message Template</option>
                    <option value="order_placed">Coupon / Promotion template</option>
                    <option value="delivered">Back in Stock Notification</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase">Scheduling Mode</span>
                  <select [(ngModel)]="campaignScheduleMode" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none cursor-pointer">
                    <option value="immediate">Dispatch Immediately</option>
                    <option value="scheduled">Schedule for Date/Time</option>
                  </select>
                </div>
                @if (campaignScheduleMode === 'scheduled') {
                  <div class="space-y-1">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">Scheduled Dispatch Time</span>
                    <input type="datetime-local" [(ngModel)]="campaignScheduleTime" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none">
                  </div>
                }
              </div>

              <div class="pt-4 flex justify-end">
                <button (click)="launchCampaign()" [disabled]="actionLoading()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs flex items-center gap-1"><mat-icon class="text-sm">campaign</mat-icon> Broadcast Campaign</button>
              </div>
            </div>
          </div>

          <!-- Campaigns History list -->
          <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white pb-3 border-b border-zinc-150 dark:border-zinc-800">Campaigns log</h3>
            
            <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
              @for (c of campaigns(); track c.id) {
                <div class="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl space-y-2">
                  <div class="flex justify-between items-start">
                    <h4 class="text-xs font-bold text-zinc-850 dark:text-zinc-200 truncate pr-2">{{ c.title }}</h4>
                    <span class="px-1.5 py-0.5 text-[7px] font-black uppercase rounded bg-blue-500/10 text-blue-500">{{ c.status }}</span>
                  </div>
                  <div class="grid grid-cols-4 gap-2 text-center text-[9px]">
                    <div class="bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-lg">
                      <span class="block font-black text-zinc-500">Sent</span>
                      <strong class="text-xs font-black">{{ c.sentCount || 0 }}</strong>
                    </div>
                    <div class="bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-lg">
                      <span class="block font-black text-emerald-500">Delv</span>
                      <strong class="text-xs font-black text-emerald-600 dark:text-emerald-400">{{ c.deliveredCount || 0 }}</strong>
                    </div>
                    <div class="bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-lg">
                      <span class="block font-black text-blue-500">Read</span>
                      <strong class="text-xs font-black text-blue-600 dark:text-blue-400">{{ c.readCount || 0 }}</strong>
                    </div>
                    <div class="bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-lg">
                      <span class="block font-black text-red-500">Fail</span>
                      <strong class="text-xs font-black text-red-600 dark:text-red-400">{{ c.failedCount || 0 }}</strong>
                    </div>
                  </div>
                </div>
              }
              @if (campaigns().length === 0) {
                <p class="text-xs text-zinc-400 text-center py-6">No campaigns have been broadcasted yet.</p>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminCommunicationTab {
  @Input({ required: true }) admin!: AdminPanel;
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  subTab = signal<'analytics' | 'logs' | 'campaigns'>('analytics');
  
  // Analytics
  stats = signal<any>({
    sentToday: 184,
    deliveredCount: 172,
    deliveredPercent: 93,
    readCount: 148,
    readPercent: 80,
    failedCount: 4,
    failedPercent: 2
  });
  monthlyGraph = signal<any[]>([
    { month: 'Jan', percent: 85 },
    { month: 'Feb', percent: 89 },
    { month: 'Mar', percent: 92 },
    { month: 'Apr', percent: 91 },
    { month: 'May', percent: 94 },
    { month: 'Jun', percent: 93 }
  ]);
  topTemplates = signal<any[]>([
    { name: 'order_placed', count: 98, percent: 85 },
    { name: 'otp', count: 48, percent: 45 },
    { name: 'delivered', count: 32, percent: 30 }
  ]);

  // Logs List
  logs = signal<any[]>([]);
  selectedLog = signal<any | null>(null);
  searchQuery = '';
  filterStatus = '';

  // Campaign Builder
  campaignTitle = '';
  campaignTarget = 'All';
  campaignTemplate = 'registration';
  campaignScheduleMode = 'immediate';
  campaignScheduleTime = '';
  campaigns = signal<any[]>([]);

  actionLoading = signal(false);

  constructor() {
    effect(() => {
      const active = this.admin.activeTab();
      if (active === 'whatsapp-logs') {
        this.subTab.set('logs');
        this.loadLogs();
      } else if (active === 'whatsapp-campaign') {
        this.subTab.set('campaigns');
        this.loadCampaigns();
      }
    }, { allowSignalWrites: true });
  }

  loadLogs() {
    this.http.get<any[]>('/api/admin/whatsapp/logs').subscribe({
      next: (data) => {
        const list = (data as any).data !== undefined ? (data as any).data : data;
        this.logs.set(list || []);
      },
      error: () => this.toast.error('Failed to load WhatsApp transmission logs'),
    });
  }

  loadCampaigns() {
    // Campaign history mock logs
    this.campaigns.set([
      { id: '1', title: 'Summer Offer Notification', status: 'Completed', sentCount: 184, deliveredCount: 172, readCount: 148, failedCount: 4 },
      { id: '2', title: 'Diwali Wish Broadcast', status: 'Completed', sentCount: 220, deliveredCount: 200, readCount: 180, failedCount: 12 }
    ]);
  }

  filteredLogs = computed(() => {
    return this.logs().filter(log => {
      if (this.filterStatus && log.status !== this.filterStatus) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const idMatch = String(log.id).toLowerCase().includes(q);
        const phoneMatch = String(log.phone).includes(q);
        const templateMatch = String(log.templateName).toLowerCase().includes(q);
        if (!idMatch && !phoneMatch && !templateMatch) return false;
      }
      return true;
    });
  });

  getStatusClass(status: string) {
    if (!status) return 'bg-zinc-500/10 text-zinc-500';
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'read':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15';
      case 'sent':
      case 'queued':
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/15';
      case 'retrying':
        return 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/15';
      default:
        return 'bg-red-500/10 text-red-500 border border-red-500/15';
    }
  }

  retryLog(log: any) {
    this.actionLoading.set(true);
    this.http.post<any>('/api/admin/whatsapp/retry', { logId: log.id }).subscribe({
      next: () => {
        this.toast.success('Message successfully re-queued for delivery!');
        this.actionLoading.set(false);
        this.selectedLog.set(null);
        this.loadLogs();
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Failed to trigger retry');
        this.actionLoading.set(false);
      }
    });
  }

  launchCampaign() {
    if (!this.campaignTitle) {
      this.toast.error('Please enter a campaign title reference');
      return;
    }
    
    this.actionLoading.set(true);
    this.http.post<any>('/api/admin/whatsapp/campaign', {
      title: this.campaignTitle,
      templateName: this.campaignTemplate,
      targetType: this.campaignTarget,
      scheduledAt: this.campaignScheduleMode === 'scheduled' ? this.campaignScheduleTime : null
    }).subscribe({
      next: (res) => {
        this.toast.success(this.campaignScheduleMode === 'scheduled' ? 'Campaign scheduled successfully!' : 'Campaign dispatched successfully!');
        this.campaignTitle = '';
        this.actionLoading.set(false);
        this.loadCampaigns();
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Failed to broadcast campaign');
        this.actionLoading.set(false);
      }
    });
  }

  exportLogsCsv() {
    if (this.logs().length === 0) {
      this.toast.error('No logs available to export');
      return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Log ID,Customer,Phone,Template,Status,Type,Retries,Sent At\n';
    
    this.logs().forEach(log => {
      const row = [
        log.id,
        log.customerId || 'Guest',
        log.phone,
        log.templateName,
        log.status,
        log.messageType,
        log.retryCount || 0,
        new Date(log.createdAt).toISOString()
      ].map(v => `"${v}"`).join(',');
      csvContent += row + '\n';
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `whatsapp_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toast.success('Logs exported successfully as CSV!');
  }
}
