import { Component, Input, OnInit, ChangeDetectorRef, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AdminPanel } from '../admin';

export interface LogEntry {
  id?: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  service: string;
  environment: string;
  requestId?: string;
  userId?: string;
  orderId?: string;
  paymentId?: string;
  campaignId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  message: string;
  errorCode?: string;
  errorName?: string;
  errorStack?: string;
  stackTrace?: string;
  module?: string;
  source?: string;
  metadata?: any;
  context?: any;
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
          <!-- Export CSV Button -->
          <button
            (click)="exportCsv()"
            [disabled]="exportingCsv"
            class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50">
            <svg *ngIf="!exportingCsv" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <svg *ngIf="exportingCsv" class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            {{ exportingCsv ? 'Exporting...' : 'Export CSV' }}
          </button>

          <!-- Refresh Telemetry Button -->
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
              (change)="applyFilter()"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none cursor-pointer">
              <option value="">ALL LEVELS</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
              <option value="FATAL">FATAL</option>
            </select>
          </div>

          <!-- Module Filter -->
          <div>
            <label class="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Module</label>
            <select
              [(ngModel)]="selectedModule"
              (change)="applyFilter()"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none cursor-pointer">
              <option value="">ALL MODULES</option>
              <option value="ORDER">ORDER</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="AUTH">AUTH</option>
              <option value="PRODUCT">PRODUCT</option>
              <option value="CART">CART</option>
              <option value="NOTIFICATION">NOTIFICATION</option>
              <option value="WHATSAPP">WHATSAPP</option>
              <option value="SERVICE">SERVICE</option>
              <option value="FRONTEND">FRONTEND</option>
              <option value="HTTP">HTTP</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          <!-- Date Picker -->
          <div>
            <label class="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Date</label>
            <input
              type="date"
              [(ngModel)]="selectedDate"
              (change)="applyFilter()"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none" />
          </div>

          <!-- Search Query -->
          <div class="md:col-span-2">
            <label class="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Search (Req ID, Order ID, Route, Error Code)</label>
            <div class="relative">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (keyup.enter)="applyFilter()"
                placeholder="Search req_2026..., ORD-10023, 500, or keyword..."
                class="w-full pl-3 pr-16 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none" />
              <button
                (click)="applyFilter()"
                class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-lg text-xs font-bold cursor-pointer">
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
                @for (log of logs; track log.id || (log.timestamp + log.message)) {
                  <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer" (click)="openDetail(log)">
                    <!-- Timestamp -->
                    <td class="p-3.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-[11px]">
                      {{ log.timestamp | date:'HH:mm:ss.SSS' }}
                    </td>

                    <!-- Level Badge -->
                    <td class="p-3.5 whitespace-nowrap">
                      <span
                        class="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase"
                        [ngClass]="{
                          'bg-red-500/15 text-red-500 border border-red-500/20': log.level === 'ERROR' || log.level === 'FATAL',
                          'bg-amber-500/15 text-amber-500 border border-amber-500/20': log.level === 'WARN',
                          'bg-blue-500/15 text-blue-500 border border-blue-500/20': log.level === 'INFO',
                          'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20': log.level === 'DEBUG'
                        }">
                        {{ log.level }}
                      </span>
                    </td>

                    <!-- Module Badge -->
                    <td class="p-3.5 font-bold whitespace-nowrap text-[11px]">
                      <span
                        class="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase"
                        [ngClass]="{
                          'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20': log.module === 'ORDER',
                          'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20': log.module === 'PAYMENT',
                          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20': log.module === 'AUTH',
                          'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20': log.module === 'NOTIFICATION' || log.module === 'WHATSAPP',
                          'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20': log.module === 'SERVICE',
                          'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20': log.module === 'HTTP' || log.module === 'SYSTEM'
                        }">
                        {{ log.module || 'SYSTEM' }}
                      </span>
                    </td>

                    <!-- Request ID -->
                    <td class="p-3.5 text-blue-500 dark:text-blue-400 whitespace-nowrap font-mono text-[11px]">
                      {{ getEffectiveRequestId(log) }}
                    </td>

                    <!-- Route / Context -->
                    <td class="p-3.5 text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate text-[11px]">
                      <span *ngIf="log.method" class="mr-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                        [ngClass]="{
                          'bg-blue-500/10 text-blue-500': log.method === 'GET',
                          'bg-emerald-500/10 text-emerald-500': log.method === 'POST',
                          'bg-amber-500/10 text-amber-500': log.method === 'PUT' || log.method === 'PATCH',
                          'bg-red-500/10 text-red-500': log.method === 'DELETE',
                          'bg-purple-500/10 text-purple-400': log.method === 'CLIENT'
                        }">{{ log.method }}</span>
                      <span>{{ getEffectiveRoute(log) }}</span>
                      @if (getEffectiveStatus(log)) {
                        <span class="ml-1 text-[10px] font-bold" [ngClass]="getEffectiveStatus(log)! >= 500 ? 'text-red-500' : getEffectiveStatus(log)! >= 400 ? 'text-amber-500' : 'text-emerald-500'">
                          ({{ getEffectiveStatus(log) }})
                        </span>
                      }
                    </td>

                    <!-- Message / Error -->
                    <td class="p-3.5 text-zinc-900 dark:text-white max-w-[280px] truncate font-sans text-xs">
                      {{ log.message }}
                    </td>

                    <!-- Action -->
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
            <!-- Modal Header -->
            <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div class="flex items-center gap-2">
                <span
                  class="px-2.5 py-1 rounded-lg text-xs font-black uppercase"
                  [ngClass]="{
                    'bg-red-500/15 text-red-500 border border-red-500/20': selectedLog.level === 'ERROR' || selectedLog.level === 'FATAL',
                    'bg-amber-500/15 text-amber-500 border border-amber-500/20': selectedLog.level === 'WARN',
                    'bg-blue-500/15 text-blue-500 border border-blue-500/20': selectedLog.level === 'INFO',
                    'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20': selectedLog.level === 'DEBUG'
                  }">
                  {{ selectedLog.level }}
                </span>
                <h3 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{{ selectedLog.message }}</h3>
              </div>
              <button (click)="selectedLog = null" class="text-zinc-400 hover:text-white text-xl font-bold cursor-pointer p-1">&times;</button>
            </div>

            <!-- Details Matrix -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <!-- Timestamp -->
              <div>
                <span class="block text-[9px] font-bold text-zinc-400 uppercase">Timestamp</span>
                <span class="text-[11px]">{{ selectedLog.timestamp | date:'yyyy-MM-dd HH:mm:ss.SSS' }}</span>
              </div>

              <!-- Request ID with Copy Button -->
              <div>
                <span class="block text-[9px] font-bold text-zinc-400 uppercase">Request ID</span>
                <div class="flex items-center gap-1 mt-0.5">
                  <span class="text-blue-500 font-bold select-all text-[11px] truncate max-w-[120px]">{{ getEffectiveRequestId(selectedLog) }}</span>
                  <button
                    *ngIf="getEffectiveRequestId(selectedLog) !== '-'"
                    (click)="copyToClipboard(getEffectiveRequestId(selectedLog))"
                    class="text-[10px] text-zinc-400 hover:text-blue-500 cursor-pointer p-0.5"
                    [title]="copiedText === getEffectiveRequestId(selectedLog) ? 'Copied!' : 'Copy Request ID'">
                    {{ copiedText === getEffectiveRequestId(selectedLog) ? '✓' : '📋' }}
                  </button>
                </div>
              </div>

              <!-- Module -->
              <div>
                <span class="block text-[9px] font-bold text-zinc-400 uppercase">Module</span>
                <span class="font-bold text-[11px]">{{ selectedLog.module || 'SYSTEM' }}</span>
              </div>

              <!-- Route / Status / Duration -->
              <div>
                <span class="block text-[9px] font-bold text-zinc-400 uppercase">Route / Status</span>
                <span class="text-[11px]">
                  {{ selectedLog.method || '' }} {{ getEffectiveRoute(selectedLog) }}
                  @if (getEffectiveStatus(selectedLog)) {
                    <span class="font-bold ml-0.5" [ngClass]="getEffectiveStatus(selectedLog)! >= 400 ? 'text-red-400' : 'text-emerald-400'">
                      ({{ getEffectiveStatus(selectedLog) }})
                    </span>
                  }
                  @if (selectedLog.durationMs || selectedLog.metadata?.durationMs) {
                    <span class="text-zinc-400 text-[10px] ml-1">[{{ selectedLog.durationMs || selectedLog.metadata?.durationMs }}ms]</span>
                  }
                </span>
              </div>
            </div>

            <!-- Optional Correlation Info Row (Order ID, Payment ID, Campaign ID, User ID) -->
            @if (selectedLog.orderId || selectedLog.paymentId || selectedLog.campaignId || selectedLog.userId || selectedLog.metadata?.orderId || selectedLog.metadata?.paymentId || selectedLog.metadata?.campaignId) {
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-zinc-50/50 dark:bg-zinc-950/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                <div *ngIf="selectedLog.orderId || selectedLog.metadata?.orderId">
                  <span class="block text-[9px] font-bold text-zinc-400 uppercase">Order ID</span>
                  <span class="text-blue-400 font-bold">{{ selectedLog.orderId || selectedLog.metadata?.orderId }}</span>
                </div>
                <div *ngIf="selectedLog.paymentId || selectedLog.metadata?.paymentId">
                  <span class="block text-[9px] font-bold text-zinc-400 uppercase">Payment ID</span>
                  <span class="text-purple-400 font-bold">{{ selectedLog.paymentId || selectedLog.metadata?.paymentId }}</span>
                </div>
                <div *ngIf="selectedLog.campaignId || selectedLog.metadata?.campaignId">
                  <span class="block text-[9px] font-bold text-zinc-400 uppercase">Campaign ID</span>
                  <span class="text-amber-400 font-bold">{{ selectedLog.campaignId || selectedLog.metadata?.campaignId }}</span>
                </div>
                <div *ngIf="selectedLog.userId || selectedLog.metadata?.userId">
                  <span class="block text-[9px] font-bold text-zinc-400 uppercase">User ID</span>
                  <span class="text-zinc-300 font-mono text-[10px] truncate block">{{ selectedLog.userId || selectedLog.metadata?.userId }}</span>
                </div>
              </div>
            }

            <!-- Error Code & Stack Trace -->
            @if (selectedLog.errorStack || selectedLog.stackTrace || selectedLog.errorCode) {
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                    Error Diagnostic {{ selectedLog.errorCode ? '[' + selectedLog.errorCode + ']' : '' }}
                  </span>
                  <button
                    *ngIf="selectedLog.errorStack || selectedLog.stackTrace"
                    (click)="copyToClipboard(selectedLog.errorStack || selectedLog.stackTrace)"
                    class="text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer flex items-center gap-1">
                    {{ copiedText === (selectedLog.errorStack || selectedLog.stackTrace) ? '✓ Copied' : '📋 Copy Stack' }}
                  </button>
                </div>
                <pre *ngIf="selectedLog.errorStack || selectedLog.stackTrace" class="p-4 bg-zinc-950 text-red-400 font-mono text-[11px] rounded-2xl overflow-x-auto border border-red-500/20 max-h-56 leading-relaxed">{{ selectedLog.errorStack || selectedLog.stackTrace }}</pre>
              </div>
            }

            <!-- Metadata JSON Viewer -->
            @if (selectedLog.metadata && getKeys(selectedLog.metadata).length > 0) {
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Log Context & Metadata</span>
                  <button
                    (click)="copyToClipboard(getJsonString(selectedLog.metadata))"
                    class="text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer flex items-center gap-1">
                    {{ copiedText === getJsonString(selectedLog.metadata) ? '✓ Copied' : '📋 Copy JSON' }}
                  </button>
                </div>
                <pre class="p-4 bg-zinc-950 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto border border-zinc-800 max-h-60 leading-relaxed">{{ selectedLog.metadata | json }}</pre>
              </div>
            }

            <!-- Footer Close -->
            <div class="flex justify-end pt-2">
              <button (click)="selectedLog = null" class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold cursor-pointer transition-colors">
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
  public exportingCsv = false;
  public selectedLevel = '';
  public selectedModule = '';
  public selectedDate = new Date().toISOString().split('T')[0];
  public searchQuery = '';

  public currentPage = 1;
  public totalPages = 1;
  public totalLogs = 0;

  public selectedLog: LogEntry | null = null;
  public copiedText = '';

  @HostListener('window:keydown.escape')
  public handleEscape() {
    if (this.selectedLog) {
      this.selectedLog = null;
      this.cdr.markForCheck();
    }
  }

  ngOnInit(): void {
    this.refreshData();
  }

  public getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  public getJsonString(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return '';
    }
  }

  public getEffectiveRequestId(log: LogEntry): string {
    return log.requestId || log.metadata?.requestId || log.context?.requestId || log.metadata?.metadata?.requestId || '-';
  }

  public getEffectiveRoute(log: LogEntry): string {
    return log.route || log.metadata?.route || log.context?.route || log.metadata?.metadata?.route || '-';
  }

  public getEffectiveStatus(log: LogEntry): number | undefined {
    return log.statusCode ?? log.metadata?.statusCode ?? log.context?.statusCode ?? log.metadata?.metadata?.statusCode ?? undefined;
  }

  public copyToClipboard(text?: string) {
    if (!text || text === '-') return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedText = text;
      this.cdr.markForCheck();
      setTimeout(() => {
        if (this.copiedText === text) {
          this.copiedText = '';
          this.cdr.markForCheck();
        }
      }, 2000);
    });
  }

  public openDetail(log: LogEntry) {
    this.selectedLog = log;
  }

  public applyFilter() {
    this.currentPage = 1;
    this.fetchLogs();
  }

  public refreshData() {
    this.fetchStats();
    this.fetchLogs();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('accessToken');
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
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  public exportCsv() {
    this.exportingCsv = true;
    this.cdr.markForCheck();

    const params: any = {};
    if (this.selectedLevel) params.level = this.selectedLevel;
    if (this.selectedModule) params.module = this.selectedModule;
    if (this.selectedDate) params.date = this.selectedDate;
    if (this.searchQuery.trim()) params.search = this.searchQuery.trim();

    const queryStr = new URLSearchParams(params).toString();
    const url = `${environment.apiUrl}/admin/logs/export?${queryStr}`;

    this.http.get(url, {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        this.exportingCsv = false;
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `3dgalaxy-system-logs-${this.selectedDate || 'all'}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.exportingCsv = false;
        console.error('Failed to export CSV:', err);
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
