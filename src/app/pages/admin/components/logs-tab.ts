import { Component, Input, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AdminPanel } from '../admin';

export interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  service: string;
  environment: string;
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  message: string;
  errorCode?: string;
  errorStack?: string;
  module?: string;
  metadata?: any;
}

export interface LogStats {
  errorsToday: number;
  warningsToday: number;
  apiFailures: number;
  paymentFailures: number;
  orderFailures: number;
  notificationFailures: number;
  serviceRequestFailures: number;
  slowApis: number;
  totalRequestsToday: number;
}

@Component({
  selector: 'app-admin-logs-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fadeIn font-sans text-zinc-900 dark:text-zinc-100">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <span class="inline-block w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            Production Observability & System Logs
          </h1>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time structured application logs, API latency metrics, error tracking, and request correlation history.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            (click)="refreshData()"
            class="px-3.5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer">
            <svg class="w-3.5 h-3.5" [class.animate-spin]="loading" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Refresh Telemetry
          </button>
        </div>
      </div>

      <!-- Summary KPI Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <!-- ERRORS -->
        <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-1">
          <div class="text-[10px] font-bold text-red-500 uppercase tracking-wider">Errors Today</div>
          <div class="text-2xl font-black text-red-600 dark:text-red-400">{{ stats?.errorsToday || 0 }}</div>
        </div>

        <!-- WARNINGS -->
        <div class="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1">
          <div class="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Warnings Today</div>
          <div class="text-2xl font-black text-amber-600 dark:text-amber-400">{{ stats?.warningsToday || 0 }}</div>
        </div>

        <!-- API FAILURES -->
        <div class="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl space-y-1">
          <div class="text-[10px] font-bold text-orange-500 uppercase tracking-wider">API Failures</div>
          <div class="text-2xl font-black text-orange-600 dark:text-orange-400">{{ stats?.apiFailures || 0 }}</div>
        </div>

        <!-- PAYMENT FAILURES -->
        <div class="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl space-y-1">
          <div class="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Payment Errors</div>
          <div class="text-2xl font-black text-purple-600 dark:text-purple-400">{{ stats?.paymentFailures || 0 }}</div>
        </div>

        <!-- ORDER FAILURES -->
        <div class="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-1">
          <div class="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Order Errors</div>
          <div class="text-2xl font-black text-blue-600 dark:text-blue-400">{{ stats?.orderFailures || 0 }}</div>
        </div>

        <!-- SLOW APIS -->
        <div class="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl space-y-1">
          <div class="text-[10px] font-bold text-cyan-500 uppercase tracking-wider">Slow APIs</div>
          <div class="text-2xl font-black text-cyan-600 dark:text-cyan-400">{{ stats?.slowApis || 0 }}</div>
        </div>
      </div>

      <!-- Filters Bar -->
      <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 shadow-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <!-- Level Filter -->
          <div>
            <label class="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Level</label>
            <select
              [(ngModel)]="selectedLevel"
              (change)="fetchLogs()"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none">
              <option value="">ALL LEVELS</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
            </select>
          </div>

          <!-- Module Filter -->
          <div>
            <label class="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Module</label>
            <select
              [(ngModel)]="selectedModule"
              (change)="fetchLogs()"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none">
              <option value="">ALL MODULES</option>
              <option value="ORDER">ORDER</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="AUTH">AUTH</option>
              <option value="HTTP">HTTP</option>
              <option value="SERVICE">SERVICE</option>
              <option value="WHATSAPP">WHATSAPP</option>
              <option value="FRONTEND">FRONTEND</option>
            </select>
          </div>

          <!-- Date Picker -->
          <div>
            <label class="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Date</label>
            <input
              type="date"
              [(ngModel)]="selectedDate"
              (change)="fetchLogs()"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none" />
          </div>

          <!-- Search Query -->
          <div class="md:col-span-2">
            <label class="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Search (Req ID, Order ID, Route, Error Code)</label>
            <div class="relative">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (keyup.enter)="fetchLogs()"
                placeholder="Search req_2026..., ORD-10023, 500, or keyword..."
                class="w-full pl-3 pr-10 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none" />
              <button
                (click)="fetchLogs()"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-500 hover:text-blue-600 cursor-pointer">
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Logs Table -->
      <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <th class="p-3.5">Timestamp</th>
                <th class="p-3.5">Level</th>
                <th class="p-3.5">Module</th>
                <th class="p-3.5">Request ID</th>
                <th class="p-3.5">Route / Context</th>
                <th class="p-3.5">Message / Error</th>
                <th class="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs font-mono">
              @if (loading) {
                <tr>
                  <td colspan="7" class="p-8 text-center text-zinc-400 font-sans">
                    <div class="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p class="text-xs">Fetching system telemetry logs...</p>
                  </td>
                </tr>
              } @else if (logs.length === 0) {
                <tr>
                  <td colspan="7" class="p-8 text-center text-zinc-400 font-sans">
                    No log entries found matching your criteria.
                  </td>
                </tr>
              } @else {
                @for (log of logs; track log.timestamp + log.message) {
                  <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer" (click)="openDetail(log)">
                    <td class="p-3.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-[11px]">
                      {{ log.timestamp | date:'HH:mm:ss.SSS' }}
                    </td>
                    <td class="p-3.5 whitespace-nowrap">
                      <span
                        class="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase"
                        [ngClass]="{
                          'bg-red-500/15 text-red-500 border border-red-500/20': log.level === 'ERROR',
                          'bg-amber-500/15 text-amber-500 border border-amber-500/20': log.level === 'WARN',
                          'bg-blue-500/15 text-blue-500 border border-blue-500/20': log.level === 'INFO',
                          'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20': log.level === 'DEBUG'
                        }">
                        {{ log.level }}
                      </span>
                    </td>
                    <td class="p-3.5 font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap text-[11px]">
                      {{ log.module || log.service || 'SERVER' }}
                    </td>
                    <td class="p-3.5 text-blue-500 dark:text-blue-400 whitespace-nowrap font-mono text-[11px]">
                      {{ log.requestId || '-' }}
                    </td>
                    <td class="p-3.5 text-zinc-600 dark:text-zinc-400 max-w-[180px] truncate text-[11px]">
                      {{ log.method ? log.method + ' ' : '' }}{{ log.route || '-' }}
                      @if (log.statusCode) {
                        <span class="ml-1 text-[10px] font-bold" [ngClass]="log.statusCode >= 400 ? 'text-red-400' : 'text-emerald-400'">
                          ({{ log.statusCode }})
                        </span>
                      }
                    </td>
                    <td class="p-3.5 text-zinc-900 dark:text-white max-w-[280px] truncate font-sans text-xs">
                      {{ log.message }}
                    </td>
                    <td class="p-3.5 text-right whitespace-nowrap">
                      <button (click)="$event.stopPropagation(); openDetail(log)" class="text-blue-500 hover:text-blue-600 font-sans text-xs font-bold cursor-pointer">
                        Inspect →
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between font-sans text-xs">
          <div class="text-zinc-500">
            Showing {{ logs.length }} of {{ totalLogs }} entries (Page {{ currentPage }} of {{ totalPages }})
          </div>
          <div class="flex items-center gap-2">
            <button
              [disabled]="currentPage <= 1"
              (click)="changePage(currentPage - 1)"
              class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer">
              Previous
            </button>
            <button
              [disabled]="currentPage >= totalPages"
              (click)="changePage(currentPage + 1)"
              class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer">
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- Log Inspector Modal/Drawer -->
      @if (selectedLog) {
        <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" (click)="selectedLog = null">
          <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div class="flex items-center gap-2">
                <span
                  class="px-2.5 py-1 rounded-lg text-xs font-black uppercase"
                  [ngClass]="{
                    'bg-red-500/15 text-red-500': selectedLog.level === 'ERROR',
                    'bg-amber-500/15 text-amber-500': selectedLog.level === 'WARN',
                    'bg-blue-500/15 text-blue-500': selectedLog.level === 'INFO',
                    'bg-zinc-500/15 text-zinc-400': selectedLog.level === 'DEBUG'
                  }">
                  {{ selectedLog.level }}
                </span>
                <h3 class="text-base font-bold">{{ selectedLog.message }}</h3>
              </div>
              <button (click)="selectedLog = null" class="text-zinc-400 hover:text-white text-lg font-bold cursor-pointer">&times;</button>
            </div>

            <!-- Details Matrix -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div>
                <span class="block text-[9px] font-bold text-zinc-400 uppercase">Timestamp</span>
                <span>{{ selectedLog.timestamp | date:'yyyy-MM-dd HH:mm:ss.SSS' }}</span>
              </div>
              <div>
                <span class="block text-[9px] font-bold text-zinc-400 uppercase">Request ID</span>
                <span class="text-blue-500 font-bold select-all">{{ selectedLog.requestId || 'N/A' }}</span>
              </div>
              <div>
                <span class="block text-[9px] font-bold text-zinc-400 uppercase">Module</span>
                <span>{{ selectedLog.module || 'SERVER' }}</span>
              </div>
              <div>
                <span class="block text-[9px] font-bold text-zinc-400 uppercase">Route / Status</span>
                <span>{{ selectedLog.method || '' }} {{ selectedLog.route || '-' }} ({{ selectedLog.statusCode || '-' }})</span>
              </div>
            </div>

            <!-- Error Stack (if present) -->
            @if (selectedLog.errorStack) {
              <div class="space-y-1.5">
                <span class="text-[10px] font-bold text-red-500 uppercase tracking-wider">Stack Trace</span>
                <pre class="p-4 bg-zinc-950 text-red-400 font-mono text-[11px] rounded-2xl overflow-x-auto border border-red-500/20 max-h-48 leading-relaxed">{{ selectedLog.errorStack }}</pre>
              </div>
            }

            <!-- Metadata JSON Viewer -->
            @if (selectedLog.metadata && getKeys(selectedLog.metadata).length > 0) {
              <div class="space-y-1.5">
                <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Log Metadata & Context</span>
                <pre class="p-4 bg-zinc-950 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto border border-zinc-800 max-h-60 leading-relaxed">{{ selectedLog.metadata | json }}</pre>
              </div>
            }

            <div class="flex justify-end pt-2">
              <button (click)="selectedLog = null" class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-xl text-xs font-bold cursor-pointer">
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminLogsTab implements OnInit {
  @Input({ required: true }) admin!: AdminPanel;

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  public logs: LogEntry[] = [];
  public stats: LogStats | null = null;

  public loading = false;
  public selectedLevel = '';
  public selectedModule = '';
  public selectedDate = new Date().toISOString().split('T')[0];
  public searchQuery = '';

  public currentPage = 1;
  public totalPages = 1;
  public totalLogs = 0;

  public selectedLog: LogEntry | null = null;

  ngOnInit(): void {
    this.refreshData();
  }

  public getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  public openDetail(log: LogEntry) {
    this.selectedLog = log;
  }

  public refreshData() {
    this.fetchStats();
    this.fetchLogs();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    return new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  public fetchStats() {
    const url = `${environment.apiUrl}/admin/logs/stats`;
    this.http.get<{ success: boolean; stats: LogStats }>(url, { headers: this.getAuthHeaders() }).subscribe({
      next: (res) => {
        if (res?.success) {
          this.stats = res.stats;
          this.cdr.markForCheck();
        }
      },
      error: () => {}
    });
  }

  public fetchLogs() {
    this.loading = true;
    this.cdr.markForCheck();

    const params: any = {
      page: this.currentPage,
      limit: 50
    };
    if (this.selectedLevel) params.level = this.selectedLevel;
    if (this.selectedModule) params.module = this.selectedModule;
    if (this.selectedDate) params.date = this.selectedDate;
    if (this.searchQuery.trim()) params.search = this.searchQuery.trim();

    const queryStr = new URLSearchParams(params).toString();
    const url = `${environment.apiUrl}/admin/logs?${queryStr}`;

    this.http.get<{ success: boolean; logs: LogEntry[]; total: number; totalPages: number }>(url, { headers: this.getAuthHeaders() }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.success) {
          this.logs = res.logs || [];
          this.totalLogs = res.total || 0;
          this.totalPages = res.totalPages || 1;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  public changePage(newPage: number) {
    if (newPage < 1 || newPage > this.totalPages) return;
    this.currentPage = newPage;
    this.fetchLogs();
  }
}
