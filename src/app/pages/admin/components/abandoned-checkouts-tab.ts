import { Component, Input, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { AdminPanel } from '../admin';
import { ToastService } from '../../../shared/components/toast/toast.service';

interface ActivityLog {
  id: string;
  activity: string;
  details: string | null;
  createdAt: string;
}

interface RecoveryNotification {
  id: string;
  channel: string;
  sentAt: string;
  status: string;
}

interface AbandonedCheckout {
  id: string;
  sessionId: string;
  customerName: string | null;
  email: string | null;
  mobile: string | null;
  cartTotal: number;
  checkoutStep: string;
  recoveryStatus: string;
  recoveryToken: string;
  browser: string | null;
  device: string | null;
  createdAt: string;
  updatedAt: string;
  cartItems?: any[];
  activityLogs?: ActivityLog[];
  recoveryNotifications?: RecoveryNotification[];
}

@Component({
  selector: 'app-admin-abandoned-checkouts-tab',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300 font-sans text-zinc-900 dark:text-zinc-150">
      
      <!-- HEADER & MAIN TITLE -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-2xl font-black uppercase tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <span class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <mat-icon class="scale-110">remove_shopping_cart</mat-icon>
            </span>
            Abandoned Checkouts & Recovery
          </h1>
          <p class="text-xs text-zinc-500 mt-1">Audit incomplete checkouts, view chronological customer journeys, and trigger multi-channel recovery reminder vouchers.</p>
        </div>

        <div class="flex items-center gap-2">
          <button (click)="exportCSV()" class="flex items-center gap-1.5 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-xl text-xs font-black uppercase transition-all border-none cursor-pointer">
            <mat-icon class="text-sm">download</mat-icon> Export CSV
          </button>
          <button (click)="loadData()" class="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase transition-all border-none cursor-pointer">
            <mat-icon class="text-sm">refresh</mat-icon> Refresh Logs
          </button>
        </div>
      </div>

      <!-- KPI METRICS SUMMARY -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 p-6 rounded-2xl relative overflow-hidden">
          <div class="absolute right-4 top-4 text-neutral-300 dark:text-zinc-800"><mat-icon class="scale-125">shopping_cart</mat-icon></div>
          <span class="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Abandoned Amount</span>
          <h3 class="text-2xl font-black text-zinc-900 dark:text-white font-mono leading-none">
            ₹{{ analytics().totalAbandonedValue | number }}
          </h3>
          <p class="text-[10px] text-zinc-500 mt-2 font-semibold">Total {{ analytics().totalAbandonedCount }} instances abandoned</p>
        </div>

        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 p-6 rounded-2xl relative overflow-hidden">
          <div class="absolute right-4 top-4 text-emerald-300 dark:text-emerald-950/40"><mat-icon class="scale-125">payments</mat-icon></div>
          <span class="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Recovered Revenue</span>
          <h3 class="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono leading-none">
            ₹{{ analytics().totalRecoveredValue | number }}
          </h3>
          <p class="text-[10px] text-zinc-500 mt-2 font-semibold">{{ analytics().totalRecoveredCount }} checkouts salvaged</p>
        </div>

        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 p-6 rounded-2xl relative overflow-hidden">
          <div class="absolute right-4 top-4 text-blue-300 dark:text-blue-950/40"><mat-icon class="scale-125">trending_up</mat-icon></div>
          <span class="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Recovery Rate</span>
          <h3 class="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono leading-none">
            {{ analytics().recoveryRate | number:'1.1-2' }}%
          </h3>
          <div class="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div class="bg-blue-500 h-full rounded-full" [style.width.%]="analytics().recoveryRate"></div>
          </div>
        </div>

        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 p-6 rounded-2xl relative overflow-hidden">
          <div class="absolute right-4 top-4 text-rose-300 dark:text-rose-950/40"><mat-icon class="scale-125">money_off</mat-icon></div>
          <span class="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-1">Lost Revenue Opportunity</span>
          <h3 class="text-2xl font-black text-rose-600 dark:text-rose-450 font-mono leading-none">
            ₹{{ (analytics().totalAbandonedValue - analytics().totalRecoveredValue) | number }}
          </h3>
          <p class="text-[10px] text-zinc-500 mt-2 font-semibold">Unresolved shopping carts</p>
        </div>
      </div>

      <!-- ANALYTICS CHARTS SECTION (CSS GAUGES) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Device Breakdowns -->
        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 p-6 rounded-2xl space-y-4">
          <div>
            <h4 class="text-xs font-black uppercase text-zinc-900 dark:text-white">Device Breakdown</h4>
            <p class="text-[10px] text-zinc-400">Visitor session metrics parsed via user agents.</p>
          </div>
          <div class="space-y-3">
            @for (dev of analytics().deviceBreakdown; track dev.device) {
              <div class="space-y-1">
                <div class="flex justify-between text-[11px] font-bold">
                  <span class="uppercase tracking-wider">{{ dev.device || 'Desktop' }}</span>
                  <span class="font-mono text-zinc-500">{{ dev.count }} sessions ({{ getPercentage(dev.count, analytics().totalAbandonedCount) }}%)</span>
                </div>
                <div class="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div class="bg-orange-500 h-full rounded-full" [style.width.%]="getPercentage(dev.count, analytics().totalAbandonedCount)"></div>
                </div>
              </div>
            } @empty {
              <p class="text-xs text-zinc-500 text-center py-4">No device session activity records found.</p>
            }
          </div>
        </div>

        <!-- Browser Breakdowns -->
        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 p-6 rounded-2xl space-y-4">
          <div>
            <h4 class="text-xs font-black uppercase text-zinc-900 dark:text-white">Browser Breakdown</h4>
            <p class="text-[10px] text-zinc-400">Most active browsers used during checkouts.</p>
          </div>
          <div class="space-y-3">
            @for (br of analytics().browserBreakdown; track br.browser) {
              <div class="space-y-1">
                <div class="flex justify-between text-[11px] font-bold">
                  <span class="uppercase tracking-wider">{{ br.browser || 'Unknown' }}</span>
                  <span class="font-mono text-zinc-500">{{ br.count }} sessions ({{ getPercentage(br.count, analytics().totalAbandonedCount) }}%)</span>
                </div>
                <div class="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div class="bg-blue-600 h-full rounded-full" [style.width.%]="getPercentage(br.count, analytics().totalAbandonedCount)"></div>
                </div>
              </div>
            } @empty {
              <p class="text-xs text-zinc-500 text-center py-4">No browser session activity records found.</p>
            }
          </div>
        </div>
      </div>

      <!-- FILTER & SEARCH PANEL -->
      <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 p-5 rounded-2xl space-y-4 font-sans">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div class="space-y-1">
            <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Search Customer / Contact</label>
            <div class="relative">
              <input type="text" [(ngModel)]="searchKeyword" (ngModelChange)="loadData()" placeholder="Enter name, email, phone..." class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-blue-500 font-bold transition-all">
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Recovery Status</label>
            <select [(ngModel)]="statusFilter" (change)="loadData()" class="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-blue-500 font-bold cursor-pointer transition-all">
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active (Pending)</option>
              <option value="RECOVERED">Recovered (Converted)</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Min Value (₹)</label>
            <input type="number" [(ngModel)]="minValueFilter" (ngModelChange)="loadData()" placeholder="Minimum Amount" class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-blue-500 font-bold transition-all">
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Max Value (₹)</label>
            <input type="number" [(ngModel)]="maxValueFilter" (ngModelChange)="loadData()" placeholder="Maximum Amount" class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-blue-500 font-bold transition-all">
          </div>
        </div>

        @if (searchKeyword() || statusFilter() || minValueFilter() || maxValueFilter()) {
          <div class="flex justify-end pt-1">
            <button (click)="resetFilters()" class="text-[10px] font-black uppercase text-rose-500 tracking-wider flex items-center gap-1.5 hover:text-rose-600 transition-colors border-none bg-transparent cursor-pointer">
              <mat-icon class="text-sm">clear_all</mat-icon> Clear All Active Filters
            </button>
          </div>
        }
      </div>

      <!-- MAIN LOGS TABLE LIST -->
      <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-hidden font-sans">
        <div class="overflow-x-auto no-scrollbar">
          <table class="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr class="text-[10px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
                <th class="py-3.5 px-6">Customer Details</th>
                <th class="py-3.5 px-6">Cart Items Preview</th>
                <th class="py-3.5 px-6">Basket Total</th>
                <th class="py-3.5 px-6">Last Step Reached</th>
                <th class="py-3.5 px-6">Created On</th>
                <th class="py-3.5 px-6">Recovery Status</th>
                <th class="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
              @for (c of checkouts(); track c.id) {
                <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  
                  <td class="py-4 px-6">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                        {{ (c.customerName || 'Guest Maker').slice(0, 2) }}
                      </div>
                      <div>
                        <p class="font-black text-zinc-900 dark:text-white uppercase flex items-center gap-1.5 leading-none">
                          {{ c.customerName || 'Guest Maker' }}
                          @if (!c.email && !c.mobile) {
                            <span class="px-1.5 py-0.5 bg-neutral-500 text-white text-[7px] font-black rounded tracking-wider leading-none">ANONYMOUS</span>
                          } @else if (!c.customerName) {
                            <span class="px-1.5 py-0.5 bg-amber-500 text-white text-[7px] font-black rounded tracking-wider leading-none">GUEST</span>
                          }
                        </p>
                        <span class="text-[10px] text-zinc-400 block mt-0.5 font-mono">{{ c.email || c.mobile || 'No contact info' }}</span>
                      </div>
                    </div>
                  </td>

                  <td class="py-4 px-6 text-zinc-500 font-medium max-w-xs truncate">
                    @if (c.cartItems && c.cartItems.length > 0) {
                      <span class="font-bold text-zinc-700 dark:text-zinc-300">{{ c.cartItems.length }} Product(s):</span> 
                      {{ getItemsSummary(c.cartItems) }}
                    } @else {
                      <span class="italic text-zinc-400">Empty cart</span>
                    }
                  </td>

                  <td class="py-4 px-6 font-mono font-black text-zinc-800 dark:text-white">
                    ₹{{ c.cartTotal | number }}
                  </td>

                  <td class="py-4 px-6">
                    <span [class]="getStepClass(c.checkoutStep)" class="px-2 py-0.5 text-[8px] font-black uppercase rounded-md tracking-wider border">
                      {{ c.checkoutStep }}
                    </span>
                  </td>

                  <td class="py-4 px-6 text-zinc-400 font-mono text-[10px]">
                    {{ c.createdAt | date:'medium' }}
                  </td>

                  <td class="py-4 px-6">
                    <span [class]="getStatusStyle(c.recoveryStatus)" class="px-2 py-0.5 text-[9px] font-black uppercase rounded-md tracking-wider border">
                      {{ c.recoveryStatus }}
                    </span>
                  </td>

                  <td class="py-4 px-6 text-right space-x-1.5">
                    <button (click)="openDrawer(c)" class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase transition-all hover:bg-blue-100 border-none cursor-pointer">
                      <mat-icon class="text-sm">visibility</mat-icon> Journey Detail
                    </button>

                    @if (c.recoveryStatus !== 'RECOVERED') {
                      <button (click)="triggerResend(c.id, 'WHATSAPP')" class="inline-flex items-center justify-center w-7 h-7 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-lg transition-all border-none cursor-pointer" title="Send WhatsApp Reminder">
                        <mat-icon class="scale-75">chat</mat-icon>
                      </button>
                      <button (click)="triggerResend(c.id, 'EMAIL')" class="inline-flex items-center justify-center w-7 h-7 bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white rounded-lg transition-all border-none cursor-pointer" title="Send Email Reminder">
                        <mat-icon class="scale-75">mail</mat-icon>
                      </button>
                      <button (click)="markAsRecovered(c.id)" class="inline-flex items-center justify-center w-7 h-7 bg-zinc-100 hover:bg-emerald-600 dark:bg-zinc-800 dark:hover:bg-emerald-600 text-zinc-650 hover:text-white rounded-lg transition-all border-none cursor-pointer" title="Mark recovered manually">
                        <mat-icon class="scale-75">check</mat-icon>
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="py-16 text-center">
                    <div class="flex flex-col items-center justify-center space-y-2 py-4">
                      <mat-icon class="text-zinc-300 dark:text-zinc-700 text-4xl">remove_shopping_cart</mat-icon>
                      <h4 class="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Checkouts Logged</h4>
                      <p class="text-[10px] text-zinc-500">There are no checkouts matching the selected filter criteria.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- DETAILS SLIDE-IN SIDEBAR DRAWER OVERLAY -->
      @if (selectedCheckout()) {
        <div class="fixed inset-0 z-50 flex justify-end animate-fadeIn duration-200">
          
          <!-- Backdrop -->
          <div class="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" (click)="closeDrawer()" (keydown.escape)="closeDrawer()" role="button" tabindex="-1"></div>

          <!-- Drawer Panel -->
          <div class="relative w-full max-w-xl bg-white dark:bg-zinc-950 shadow-2xl border-l border-zinc-200 dark:border-zinc-850 h-full flex flex-col z-50 animate-slide-in-right overflow-hidden font-sans">
            
            <!-- Drawer Header -->
            <div class="p-6 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/20">
              <div class="space-y-1">
                <span class="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded-md font-mono text-[8px] font-black uppercase tracking-wider">
                  Session Token: {{ selectedCheckout()?.id?.slice(0, 12) }}...
                </span>
                <h3 class="text-base font-black text-zinc-950 dark:text-white uppercase leading-none mt-1">Journey Log Details</h3>
              </div>
              <button (click)="closeDrawer()" class="h-8.5 w-8.5 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-none bg-transparent cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Drawer Scrollable Body -->
            <div class="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              
              <!-- 1. Customer Context Info Card -->
              <div class="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850/80 p-5 rounded-2xl space-y-4">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <mat-icon class="text-sm">person</mat-icon> Customer Contact Details
                </h4>
                
                <div class="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span class="block text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Name</span>
                    <span class="font-bold text-zinc-900 dark:text-white uppercase">{{ selectedCheckout()?.customerName || 'Guest Maker' }}</span>
                  </div>
                  <div>
                    <span class="block text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Email</span>
                    <span class="font-bold text-zinc-900 dark:text-white font-mono break-all">{{ selectedCheckout()?.email || 'N/A' }}</span>
                  </div>
                  <div>
                    <span class="block text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Mobile Contact</span>
                    <span class="font-bold text-zinc-900 dark:text-white font-mono">{{ selectedCheckout()?.mobile || 'N/A' }}</span>
                  </div>
                  <div>
                    <span class="block text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Device & Browser</span>
                    <span class="font-bold text-blue-500 uppercase">{{ selectedCheckout()?.device || 'Unknown' }} &middot; {{ selectedCheckout()?.browser || 'Unknown' }}</span>
                  </div>
                </div>
              </div>

              <!-- 2. Basket items list -->
              <div class="space-y-3">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <mat-icon class="text-sm">shopping_bag</mat-icon> Pending Cart Products
                </h4>
                <div class="border border-zinc-150 dark:border-zinc-850 rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                  @for (item of drawerCheckoutDetails()?.cartItems || []; track $index) {
                    <div class="p-3.5 flex justify-between items-center bg-zinc-50/20 dark:bg-zinc-950/20 text-xs">
                      <div>
                        <p class="font-black text-zinc-900 dark:text-white uppercase leading-none">{{ item.productName || 'Recovered Item' }}</p>
                        @if (item.variantName) {
                          <span class="text-[9px] text-zinc-400 font-semibold uppercase mt-0.5 block">Variant: {{ item.variantName }}</span>
                        }
                        <span class="text-[10px] text-zinc-500 mt-1 block">Qty: {{ item.quantity }} &times; ₹{{ item.price | number }}</span>
                      </div>
                      <span class="font-bold font-mono text-zinc-900 dark:text-white">₹{{ (item.price * item.quantity) | number }}</span>
                    </div>
                  } @empty {
                    <div class="p-4 text-center text-xs text-zinc-500 italic">No cart items hydration payload found.</div>
                  }
                </div>
              </div>

              <!-- 3. Chronological activity logs journey timeline -->
              <div class="space-y-4">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <mat-icon class="text-sm">history</mat-icon> Chronological Activity Timeline
                </h4>
                
                <div class="relative pl-5 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-6">
                  @for (log of drawerCheckoutDetails()?.activityLogs || []; track log.id) {
                    <div class="relative">
                      <!-- Dot indicator -->
                      <div class="absolute -left-[26px] top-0.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-zinc-950"></div>
                      
                      <div class="text-xs">
                        <span class="text-[9px] font-mono text-zinc-400 block mb-0.5">{{ log.createdAt | date:'mediumTime' }} &middot; {{ log.createdAt | date:'mediumDate' }}</span>
                        <p class="font-black text-zinc-900 dark:text-white uppercase tracking-wide">{{ log.activity }}</p>
                        @if (log.details) {
                          <p class="text-[10px] text-zinc-500 mt-1 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-lg border dark:border-zinc-850/80">{{ log.details }}</p>
                        }
                      </div>
                    </div>
                  } @empty {
                    <div class="text-xs text-zinc-500 italic pl-1">No activities logged for this session yet.</div>
                  }
                </div>
              </div>

              <!-- 4. Recovery link utility & manual reminder -->
              <div class="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850/80 p-5 rounded-2xl space-y-4">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <mat-icon class="text-sm">link</mat-icon> Recovery Action Utilities
                </h4>
                
                <div class="space-y-3 text-xs">
                  <div class="space-y-1">
                    <span class="block text-[8px] font-black text-zinc-400 uppercase tracking-widest pl-0.5">Secure Recovery Link</span>
                    <div class="flex gap-2">
                      <input type="text" readonly [value]="getRecoveryLink(selectedCheckout()?.recoveryToken)" class="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-950 border dark:border-zinc-850 rounded-xl font-mono text-[10px] outline-none">
                      <button (click)="copyLink(selectedCheckout()?.recoveryToken)" class="px-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase transition-all border-none cursor-pointer">
                        Copy
                      </button>
                    </div>
                  </div>

                  <div class="space-y-2 border-t dark:border-zinc-800 pt-3">
                    <span class="block text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1 pl-0.5">Recovery Dispatches (Reminders Log)</span>
                    @for (note of drawerCheckoutDetails()?.recoveryNotifications || []; track note.id) {
                      <div class="flex justify-between items-center text-[10px] bg-white dark:bg-zinc-950 border dark:border-zinc-850 p-2 rounded-xl">
                        <span class="font-bold text-zinc-650 dark:text-zinc-350 uppercase">Channel: {{ note.channel }}</span>
                        <span class="font-mono text-zinc-400">{{ note.sentAt | date:'short' }}</span>
                        <span class="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded font-black text-[8px] uppercase">{{ note.status }}</span>
                      </div>
                    } @empty {
                      <p class="text-[10px] text-zinc-500 italic pl-0.5">No reminder notifications dispatched yet.</p>
                    }
                  </div>
                </div>
              </div>

            </div>

            <!-- Drawer Footer -->
            <div class="p-6 border-t border-zinc-100 dark:border-zinc-900 flex justify-between bg-zinc-50/50 dark:bg-zinc-950/20 gap-3">
              <button (click)="closeDrawer()" class="flex-1 py-3.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-900 dark:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border-none cursor-pointer">
                Close Panel
              </button>
              
              @if (selectedCheckout()?.recoveryStatus !== 'RECOVERED') {
                <button (click)="markAsRecovered(selectedCheckout()!.id)" class="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border-none cursor-pointer">
                  Mark Recovered Manually
                </button>
              }
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class AdminAbandonedCheckoutsTab implements OnInit {
  @Input({ required: true }) admin!: AdminPanel;

  http = inject(HttpClient);
  toast = inject(ToastService);

  checkouts = signal<AbandonedCheckout[]>([]);
  analytics = signal<any>({
    totalAbandonedValue: 0,
    totalRecoveredValue: 0,
    recoveryRate: 0,
    totalAbandonedCount: 0,
    totalRecoveredCount: 0,
    deviceBreakdown: [],
    browserBreakdown: []
  });

  // Filters state
  searchKeyword = signal('');
  statusFilter = signal('');
  minValueFilter = signal<number | null>(null);
  maxValueFilter = signal<number | null>(null);

  // Drawer state
  selectedCheckout = signal<AbandonedCheckout | null>(null);
  drawerCheckoutDetails = signal<any | null>(null);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    let params: any = {};
    if (this.searchKeyword()) params.search = this.searchKeyword();
    if (this.statusFilter()) params.status = this.statusFilter();
    if (this.minValueFilter() !== null) params.minTotal = this.minValueFilter();
    if (this.maxValueFilter() !== null) params.maxTotal = this.maxValueFilter();

    this.admin.ds.api.get<any>('/admin/abandoned-checkouts', params).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res.checkouts || []);
        this.checkouts.set(list);
      },
      error: (err) => console.error('Failed to load checkouts:', err)
    });

    this.admin.ds.api.get<any>('/admin/abandoned-checkouts/analytics').subscribe({
      next: (res: any) => {
        if (res) {
          this.analytics.set({
            totalAbandonedValue: res.totalAbandonedValue || 0,
            totalRecoveredValue: res.totalRecoveredValue || 0,
            recoveryRate: res.recoveryRate || 0,
            totalAbandonedCount: res.totalAbandonedCount || 0,
            totalRecoveredCount: res.totalRecoveredCount || 0,
            deviceBreakdown: res.deviceBreakdown || [],
            browserBreakdown: res.browserBreakdown || []
          });
        }
      },
      error: (err) => console.error('Failed to load analytics:', err)
    });
  }

  resetFilters() {
    this.searchKeyword.set('');
    this.statusFilter.set('');
    this.minValueFilter.set(null);
    this.maxValueFilter.set(null);
    this.loadData();
  }

  getPercentage(count: number, total: number): number {
    if (!total) return 0;
    return Math.round((count / total) * 100);
  }

  getItemsSummary(items: any[]): string {
    return items.map(i => `${i.productName || 'Product'} (x${i.quantity})`).join(', ');
  }

  getStepClass(step: string): string {
    switch (step) {
      case 'COMPLETED':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
      case 'PAYMENT_INITIATED':
        return 'bg-violet-500/10 border-violet-500/20 text-violet-500';
      case 'SHIPPING_ENTERED':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-500';
      case 'DETAILS_ENTERED':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
      default:
        return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500';
    }
  }

  getStatusStyle(status: string): string {
    switch (status) {
      case 'RECOVERED':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
      case 'EXPIRED':
        return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500';
      default:
        return 'bg-orange-500/10 border-orange-500/20 text-orange-500';
    }
  }

  openDrawer(checkout: AbandonedCheckout) {
    this.selectedCheckout.set(checkout);
    this.admin.ds.api.get<any>(`/admin/abandoned-checkouts/${checkout.id}`).subscribe({
      next: (res: any) => {
        this.drawerCheckoutDetails.set(res);
      },
      error: (err) => {
        console.error('Failed to load timeline details:', err);
        this.toast.error('Failed to load chronological timeline.');
      }
    });
  }

  closeDrawer() {
    this.selectedCheckout.set(null);
    this.drawerCheckoutDetails.set(null);
  }

  getRecoveryLink(token: string | undefined): string {
    if (!token) return '';
    return `${window.location.origin}/recover-cart/${token}`;
  }

  copyLink(token: string | undefined) {
    if (!token) return;
    const link = this.getRecoveryLink(token);
    navigator.clipboard.writeText(link);
    this.toast.success('Recovery link copied to clipboard!');
  }

  triggerResend(id: string, channel: 'WHATSAPP' | 'EMAIL') {
    this.admin.ds.api.post<any>('/admin/abandoned-checkouts/resend', { checkoutId: id, channel }).subscribe({
      next: (res: any) => {
        this.toast.success(`Successfully dispatched recovery reminder via ${channel}!`);
        // If drawer is open, refresh detail metrics
        if (this.selectedCheckout() && this.selectedCheckout()?.id === id) {
          this.openDrawer(this.selectedCheckout()!);
        }
        this.loadData();
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Failed to dispatch recovery reminder.');
      }
    });
  }

  markAsRecovered(id: string) {
    this.admin.ds.api.post<any>('/admin/abandoned-checkouts/recover', { checkoutId: id }).subscribe({
      next: () => {
        this.toast.success('Checkout marked as recovered manually.');
        this.closeDrawer();
        this.loadData();
      },
      error: (err) => {
        this.toast.error('Failed to mark recovered.');
      }
    });
  }

  exportCSV() {
    if (this.checkouts().length === 0) {
      this.toast.error('No checkouts available to export.');
      return;
    }

    const headers = ['ID', 'Customer Name', 'Email', 'Mobile', 'Grand Total (INR)', 'Step Reached', 'Recovery Status', 'Created At'];
    const rows = this.checkouts().map(c => [
      c.id,
      c.customerName || 'Guest Maker',
      c.email || '',
      c.mobile || '',
      c.cartTotal,
      c.checkoutStep,
      c.recoveryStatus,
      c.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `abandoned_checkouts_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toast.success('Log Report CSV successfully downloaded!');
  }
}
