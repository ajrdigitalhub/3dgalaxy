import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-push-notifications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-7xl mx-auto p-6">
      
      <!-- Premium Breadcrumb Header -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-400">
          <span>Marketing</span>
          <mat-icon class="scale-50">chevron_right</mat-icon>
          <span class="text-[#f54f00]">Campaign Center</span>
        </div>
        <h1 class="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Push Campaigns</h1>
      </div>

      <!-- Segment Tabs -->
      <div class="flex border-b border-neutral-200 dark:border-neutral-800 gap-4 text-sm font-black uppercase tracking-wider">
        <button (click)="activeSubTab.set('wizard')" 
                [class.text-[#f54f00]]="activeSubTab() === 'wizard'"
                [class.border-[#f54f00]]="activeSubTab() === 'wizard'"
                class="pb-3 border-b-2 border-transparent transition-colors cursor-pointer">
          Campaign Wizard
        </button>
        <button (click)="activeSubTab.set('analytics'); loadAnalytics()" 
                [class.text-[#f54f00]]="activeSubTab() === 'analytics'"
                [class.border-[#f54f00]]="activeSubTab() === 'analytics'"
                class="pb-3 border-b-2 border-transparent transition-colors cursor-pointer">
          Analytics
        </button>
        <button (click)="activeSubTab.set('logs'); loadLogs()" 
                [class.text-[#f54f00]]="activeSubTab() === 'logs'"
                [class.border-[#f54f00]]="activeSubTab() === 'logs'"
                class="pb-3 border-b-2 border-transparent transition-colors cursor-pointer">
          Notification Logs
        </button>
        <button (click)="activeSubTab.set('devices'); loadDevices()" 
                [class.text-[#f54f00]]="activeSubTab() === 'devices'"
                [class.border-[#f54f00]]="activeSubTab() === 'devices'"
                class="pb-3 border-b-2 border-transparent transition-colors cursor-pointer">
          Registered Devices
        </button>
      </div>

      <!-- Tab Content Area -->

      <!-- TAB 1: CAMPAIGN WIZARD -->
      @if (activeSubTab() === 'wizard') {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <!-- Wizard Form Left (7 Cols) -->
          <form [formGroup]="wizardForm" (ngSubmit)="send()" class="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <h3 class="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-4 border-b border-neutral-100 dark:border-neutral-850">
              <mat-icon class="text-[#f54f00]">auto_awesome</mat-icon>
              Create Manual Notification
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              <!-- Title -->
              <div class="sm:col-span-2 space-y-1.5">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Campaign Title *</label>
                <input type="text" formControlName="title" placeholder="e.g. Flash Sale Alert! ⚡" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

              <!-- Body Message -->
              <div class="sm:col-span-2 space-y-1.5">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Message Body *</label>
                <textarea formControlName="body" rows="3" placeholder="Enter notification message details..." class="w-full p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors"></textarea>
              </div>

              <!-- Banner Image URL -->
              <div class="sm:col-span-2 space-y-1.5">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Banner Image URL (Optional)</label>
                <input type="text" formControlName="image" placeholder="https://domain.com/image.png" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

              <!-- Click Redirect URL -->
              <div class="sm:col-span-2 space-y-1.5">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Redirect Route / Click Action URL</label>
                <input type="text" formControlName="actionUrl" placeholder="e.g. /products/bambu-lab-p1s" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

              <!-- Target Segment -->
              <div class="space-y-1.5">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Target Audience Segment</label>
                <select formControlName="targetType" (change)="onTargetTypeChange()" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
                  <option value="all">All Devices</option>
                  <option value="guests">Guest Devices Only</option>
                  <option value="users">Registered Users Only</option>
                  <option value="topic">Topic-Based Campaign</option>
                  <option value="device">Specific Device / Token</option>
                </select>
              </div>

              <!-- Segment Value / Topic / Token / userId -->
              <div class="space-y-1.5" *ngIf="wizardForm.get('targetType')?.value === 'topic' || wizardForm.get('targetType')?.value === 'device'">
                <label class="text-xs font-black uppercase tracking-wider text-neutral-500">
                  {{ wizardForm.get('targetType')?.value === 'topic' ? 'Topic Name' : 'Device FCM Token / Value' }}
                </label>
                <input type="text" formControlName="targetValue" [placeholder]="wizardForm.get('targetType')?.value === 'topic' ? 'e.g. Offers' : 'fcm_token_value_here'" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>

            </div>

            <div class="pt-4 border-t border-neutral-100 dark:border-neutral-850 flex gap-4">
              <button type="submit" 
                      [disabled]="wizardForm.invalid || sending()"
                      class="h-12 px-8 bg-[#f54f00] hover:bg-orange-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-transform hover:scale-[1.02] flex-1 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                <mat-icon>send</mat-icon>
                <span>{{ sending() ? 'Sending Notification...' : 'Broadcast Campaign' }}</span>
              </button>
            </div>
          </form>

          <!-- Real-Time Phone Preview Right (5 Cols) -->
          <div class="lg:col-span-5 space-y-6">
            <div class="bg-neutral-100 dark:bg-neutral-950 rounded-[3rem] p-6 border-8 border-neutral-300 dark:border-neutral-800 shadow-xl max-w-sm mx-auto relative overflow-hidden aspect-[9/18] flex flex-col justify-start">
              
              <!-- Status bar Mock -->
              <div class="flex items-center justify-between text-[10px] text-neutral-450 dark:text-neutral-500 font-bold mb-8 select-none">
                <span>9:41</span>
                <div class="w-12 h-4 bg-black dark:bg-neutral-800 rounded-full mx-auto absolute top-2 left-1/2 -translate-x-1/2"></div>
                <div class="flex items-center gap-1.5">
                  <mat-icon class="scale-50">signal_cellular_4_bar</mat-icon>
                  <mat-icon class="scale-50">battery_full</mat-icon>
                </div>
              </div>

              <!-- Push notification block mock -->
              <div class="bg-white/80 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-250/20 dark:border-neutral-850/50 rounded-3xl p-4 shadow-lg space-y-3 animate-slide-up">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <img src="/favicon.ico" class="w-4 h-4 rounded-xs">
                    <span class="text-[9px] font-black uppercase tracking-wider text-neutral-500">3D Galaxy Hub</span>
                  </div>
                  <span class="text-[8px] text-neutral-400">now</span>
                </div>
                
                <div>
                  <h4 class="text-xs font-black text-neutral-950 dark:text-white leading-tight">
                    {{ wizardForm.get('title')?.value || 'Campaign Title Preview' }}
                  </h4>
                  <p class="text-[10px] text-neutral-500 leading-snug mt-1">
                    {{ wizardForm.get('body')?.value || 'Type your message body on the left to see this preview update dynamically in real time.' }}
                  </p>
                </div>

                @if (wizardForm.get('image')?.value) {
                  <div class="w-full h-24 rounded-2xl bg-neutral-200 dark:bg-neutral-800 overflow-hidden mt-2">
                    <img [src]="wizardForm.get('image')?.value" alt="Preview Image" class="w-full h-full object-cover">
                  </div>
                }
              </div>

            </div>
          </div>
        </div>
      }

      <!-- TAB 2: ANALYTICS -->
      @if (activeSubTab() === 'analytics') {
        @if (analyticsLoading()) {
          <div class="py-12 text-center text-neutral-400 uppercase tracking-widest font-bold">
            Loading analytics dashboard...
          </div>
        } @else {
          <!-- Stats Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <span class="text-xs font-black text-neutral-450 uppercase tracking-wider">Total Devices</span>
              <h2 class="text-3xl font-black text-neutral-900 dark:text-white mt-4">{{ analyticsData()?.totalDevices || 0 }}</h2>
              <span class="text-[10px] text-emerald-500 font-bold block mt-2">Active devices: {{ analyticsData()?.activeDevices || 0 }}</span>
            </div>

            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <span class="text-xs font-black text-neutral-450 uppercase tracking-wider">Registered Users</span>
              <h2 class="text-3xl font-black text-neutral-900 dark:text-white mt-4">{{ analyticsData()?.registeredUsers || 0 }}</h2>
              <span class="text-[10px] text-neutral-400 font-bold block mt-2">Guest Devices: {{ analyticsData()?.guestDevices || 0 }}</span>
            </div>

            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <span class="text-xs font-black text-neutral-450 uppercase tracking-wider">Broadcasts Sent</span>
              <h2 class="text-3xl font-black text-neutral-900 dark:text-white mt-4">{{ analyticsData()?.notificationsSent || 0 }}</h2>
              <span class="text-[10px] text-neutral-400 font-bold block mt-2">Delivered: {{ analyticsData()?.delivered || 0 }}</span>
            </div>

            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <span class="text-xs font-black text-neutral-450 uppercase tracking-wider">Avg Delivery Rate</span>
              <h2 class="text-3xl font-black text-neutral-900 dark:text-white mt-4">{{ analyticsData()?.openRate || 0 }}%</h2>
              <span class="text-[10px] text-red-500 font-bold block mt-2">Failed pushes: {{ analyticsData()?.failed || 0 }}</span>
            </div>

          </div>

          <!-- Device distribution grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 shadow-xs">
              <h3 class="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider mb-4">OS Distribution</h3>
              <div class="space-y-3">
                @for (entry of getEntries(analyticsData()?.osDistribution); track entry.key) {
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs font-bold">
                      <span class="text-neutral-750 dark:text-neutral-300">{{ entry.key }}</span>
                      <span class="text-neutral-900 dark:text-white">{{ entry.value }}</span>
                    </div>
                    <div class="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                      <div class="bg-[#f54f00] h-2 rounded-full" [style.width.%]="getPercent(entry.value, analyticsData()?.totalDevices)"></div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 shadow-xs">
              <h3 class="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider mb-4">Browser Distribution</h3>
              <div class="space-y-3">
                @for (entry of getEntries(analyticsData()?.browserDistribution); track entry.key) {
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs font-bold">
                      <span class="text-neutral-750 dark:text-neutral-300">{{ entry.key }}</span>
                      <span class="text-neutral-900 dark:text-white">{{ entry.value }}</span>
                    </div>
                    <div class="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                      <div class="bg-blue-600 h-2 rounded-full" [style.width.%]="getPercent(entry.value, analyticsData()?.totalDevices)"></div>
                    </div>
                  </div>
                }
              </div>
            </div>

          </div>
        }
      }

      <!-- TAB 3: LOGS -->
      @if (activeSubTab() === 'logs') {
        @if (logsLoading()) {
          <div class="py-12 text-center text-neutral-400 uppercase tracking-widest font-bold">
            Loading notification logs...
          </div>
        } @else {
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl overflow-hidden shadow-xs">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-neutral-50 dark:bg-neutral-800/40 text-[10px] font-black uppercase tracking-wider text-neutral-450 border-b border-neutral-150 dark:border-neutral-800">
                  <th class="p-4">Date</th>
                  <th class="p-4">Title</th>
                  <th class="p-4">Message</th>
                  <th class="p-4">Recipient Targeting</th>
                  <th class="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-850 text-xs font-bold text-neutral-750 dark:text-neutral-300">
                @for (log of logs(); track log.id) {
                  <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                    <td class="p-4 text-neutral-400 font-medium">{{ log.createdAt | date:'shortDate' }}</td>
                    <td class="p-4 text-neutral-950 dark:text-white">{{ log.title }}</td>
                    <td class="p-4 max-w-xs truncate font-medium text-neutral-500">{{ log.body }}</td>
                    <td class="p-4">{{ log.sentTo }}</td>
                    <td class="p-4 text-center">
                      <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                            [ngClass]="{
                              'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15': log.status === 'SUCCESS',
                              'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/15': log.status === 'FAILED',
                              'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/15': log.status === 'PARTIAL'
                            }">
                        {{ log.status }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- TAB 4: REGISTERED DEVICES -->
      @if (activeSubTab() === 'devices') {
        @if (devicesLoading()) {
          <div class="py-12 text-center text-neutral-400 uppercase tracking-widest font-bold">
            Loading registered device tokens...
          </div>
        } @else {
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl overflow-hidden shadow-xs">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-neutral-50 dark:bg-neutral-800/40 text-[10px] font-black uppercase tracking-wider text-neutral-450 border-b border-neutral-150 dark:border-neutral-800">
                  <th class="p-4">Owner Type</th>
                  <th class="p-4">Browser</th>
                  <th class="p-4">OS/Device</th>
                  <th class="p-4">Country/Lang</th>
                  <th class="p-4">Last Active</th>
                  <th class="p-4 text-center">Opt-In</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-850 text-xs font-bold text-neutral-750 dark:text-neutral-300">
                @for (d of devices(); track d.id) {
                  <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                    <td class="p-4">
                      @if (d.user) {
                        <span class="block text-neutral-950 dark:text-white uppercase text-[10px] tracking-wider">{{ d.user.firstName }} {{ d.user.lastName }}</span>
                        <span class="block text-[10px] text-neutral-400 font-medium mt-0.5">{{ d.user.email }}</span>
                      } @else {
                        <span class="text-neutral-400 font-medium uppercase text-[10px] tracking-wider">Guest ({{ d.guestId?.substring(0,8) }})</span>
                      }
                    </td>
                    <td class="p-4 font-medium">{{ d.browser }}</td>
                    <td class="p-4 font-medium">{{ d.os }} ({{ d.device }})</td>
                    <td class="p-4 font-mono font-medium">{{ d.country }} ({{ d.language }})</td>
                    <td class="p-4 text-neutral-400 font-medium">{{ d.lastActive | date:'short' }}</td>
                    <td class="p-4 text-center">
                      <mat-icon [class.text-emerald-500]="d.notificationEnabled" 
                                [class.text-neutral-350]="!d.notificationEnabled">
                        {{ d.notificationEnabled ? 'check_circle' : 'cancel' }}
                      </mat-icon>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

    </div>
  `
})
export class PushNotificationsComponent implements OnInit {
  private api = inject(ApiService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  activeSubTab = signal<string>('wizard');
  
  // Tab states
  sending = signal(false);
  analyticsLoading = signal(false);
  logsLoading = signal(false);
  devicesLoading = signal(false);

  // Data signals
  analyticsData = signal<any>(null);
  logs = signal<any[]>([]);
  devices = signal<any[]>([]);

  wizardForm!: FormGroup;

  ngOnInit() {
    this.wizardForm = this.fb.group({
      title: ['', Validators.required],
      body: ['', Validators.required],
      image: [''],
      actionUrl: [''],
      targetType: ['all', Validators.required],
      targetValue: ['']
    });
  }

  onTargetTypeChange() {
    const targetType = this.wizardForm.get('targetType')?.value;
    const valControl = this.wizardForm.get('targetValue');
    if (targetType === 'topic' || targetType === 'device') {
      valControl?.setValidators([Validators.required]);
    } else {
      valControl?.clearValidators();
    }
    valControl?.updateValueAndValidity();
  }

  send() {
    this.sending.set(true);
    const body = this.wizardForm.value;

    this.api.post<any>('/admin/notifications/send', body).subscribe({
      next: (res: any) => {
        this.toastService.success('Notification broadcast completed successfully.');
        this.wizardForm.reset({ targetType: 'all' });
      },
      error: (err: any) => {
        this.toastService.error(`Broadcast failed: ${err.message}`);
      },
      placeholder: () => {},
      finalize: () => this.sending.set(false)
    } as any);
  }

  loadAnalytics() {
    this.analyticsLoading.set(true);
    this.api.get<any>('/admin/notifications/analytics').subscribe({
      next: (res: any) => {
        const isSuccess = res && (res.success || res.status === 'success');
        if (isSuccess) this.analyticsData.set(res.data);
      },
      error: (err: any) => console.error('Failed to load notification analytics:', err),
      placeholder: () => {},
      finalize: () => this.analyticsLoading.set(false)
    } as any);
  }

  loadLogs() {
    this.logsLoading.set(true);
    this.api.get<any>('/admin/notifications/logs').subscribe({
      next: (res: any) => {
        const isSuccess = res && (res.success || res.status === 'success');
        if (isSuccess) this.logs.set(res.data);
      },
      error: (err: any) => console.error('Failed to load notification logs:', err),
      placeholder: () => {},
      finalize: () => this.logsLoading.set(false)
    } as any);
  }

  loadDevices() {
    this.devicesLoading.set(true);
    this.api.get<any>('/admin/notifications/devices').subscribe({
      next: (res: any) => {
        const isSuccess = res && (res.success || res.status === 'success');
        if (isSuccess) this.devices.set(res.data);
      },
      error: (err: any) => console.error('Failed to load registered devices list:', err),
      placeholder: () => {},
      finalize: () => this.devicesLoading.set(false)
    } as any);
  }

  getEntries(obj: any): { key: string; value: number }[] {
    if (!obj) return [];
    return Object.entries(obj).map(([key, value]) => ({ key, value: value as number }));
  }

  getPercent(val: number, total: number): number {
    if (!total) return 0;
    return Math.round((val / total) * 100);
  }
}
