import { Component, Input, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { AdminPanel } from '../admin';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-payments-tab',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="space-y-6 font-sans">
      <!-- Header Options -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 class="text-lg font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-500 flex items-center justify-center"><mat-icon>payments</mat-icon></span>
            Payments & Auditing Console
          </h2>
          <p class="text-xs text-zinc-400 mt-1">Audit transactions, examine gateway webhook payloads, and trigger client refunds.</p>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="subTab.set('transactions')" [class]="subTab() === 'transactions' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-350'" class="px-4 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs">Transactions</button>
          <button (click)="subTab.set('webhooks')" [class]="subTab() === 'webhooks' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-350'" class="px-4 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs">Webhook Logs</button>
        </div>
      </div>

      <!-- Filters & List (Transactions) -->
      @if (subTab() === 'transactions' && !selectedTx()) {
        <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          
          <!-- Filters bar -->
          <div class="p-5 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-4 gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div class="space-y-1">
              <span class="block text-[8px] font-black text-zinc-400 uppercase">Search</span>
              <input type="text" [(ngModel)]="searchQuery" placeholder="Search Tx ID, Customer ID..." class="w-full px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none">
            </div>
            <div class="space-y-1">
              <span class="block text-[8px] font-black text-zinc-400 uppercase">Gateway</span>
              <select [(ngModel)]="filterGateway" class="w-full px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none cursor-pointer">
                <option value="">All Gateways</option>
                <option value="razorpay">Razorpay</option>
                <option value="cashfree">Cashfree</option>
                <option value="cod">COD</option>
              </select>
            </div>
            <div class="space-y-1">
              <span class="block text-[8px] font-black text-zinc-400 uppercase">Status</span>
              <select [(ngModel)]="filterStatus" class="w-full px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none cursor-pointer">
                <option value="">All Statuses</option>
                <option value="Captured">Captured</option>
                <option value="Pending">Pending</option>
                <option value="Initiated">Initiated</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
            <div class="space-y-1 flex items-end">
              <button (click)="loadTransactions()" class="w-full px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-1 border-none cursor-pointer"><mat-icon class="text-sm">refresh</mat-icon> Reload</button>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-zinc-50 dark:bg-zinc-950/40 text-[9px] font-black uppercase text-zinc-400 tracking-wider border-b border-zinc-200 dark:border-zinc-850">
                  <th class="p-4 pl-6">Transaction ID</th>
                  <th class="p-4">Order Ref</th>
                  <th class="p-4">Gateway</th>
                  <th class="p-4">Method</th>
                  <th class="p-4">Amount</th>
                  <th class="p-4">Status</th>
                  <th class="p-4">Created Date</th>
                  <th class="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-850">
                @for (tx of filteredTransactions(); track tx.id) {
                  <tr class="text-xs hover:bg-zinc-50 dark:hover:bg-zinc-955/50 transition-colors">
                    <td class="p-4 pl-6 font-mono text-[10px] font-bold text-zinc-750 dark:text-zinc-300">
                      {{ tx.id.slice(0, 8) }}...{{ tx.id.slice(-6) }}
                    </td>
                    <td class="p-4 font-bold text-zinc-900 dark:text-white">
                      {{ tx.orderId.slice(0, 8) }}
                    </td>
                    <td class="p-4 uppercase text-[10px] font-bold tracking-wider text-zinc-500">
                      {{ tx.gatewayName || 'N/A' }}
                    </td>
                    <td class="p-4 uppercase text-[10px] font-black text-blue-500">
                      {{ tx.paymentMethod }}
                    </td>
                    <td class="p-4 font-black">
                      ₹{{ tx.amount }}
                    </td>
                    <td class="p-4">
                      <span [class]="getStatusClass(tx.status)" class="px-2 py-0.5 text-[9px] font-black uppercase rounded-md tracking-wider">
                        {{ tx.status }}
                      </span>
                    </td>
                    <td class="p-4 text-zinc-400 text-[11px] font-medium">
                      {{ tx.createdAt | date:'MMM d, y, h:mm a' }}
                    </td>
                    <td class="p-4 pr-6 text-right">
                      <button (click)="selectedTx.set(tx)" class="px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer">Inspect</button>
                    </td>
                  </tr>
                }
                @if (filteredTransactions().length === 0) {
                  <tr>
                    <td colspan="8" class="p-8 text-center text-xs font-bold text-zinc-500">No transaction history records recorded.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Detailed transaction view -->
      @if (subTab() === 'transactions' && selectedTx(); as tx) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            
            <!-- Timeline & Details -->
            <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <div class="flex justify-between items-center pb-4 border-b border-zinc-150 dark:border-zinc-800">
                <button (click)="selectedTx.set(null)" class="flex items-center gap-1 text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors cursor-pointer border-none bg-transparent">
                  <mat-icon class="text-sm">arrow_back</mat-icon> Back to list
                </button>
                <span class="text-xs font-mono text-zinc-400">UUID: {{ tx.id }}</span>
              </div>

              <!-- Payment Timeline Visualizer -->
              <div>
                <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400 mb-4">Payment Journey Timeline</h3>
                <div class="flex items-center justify-between relative max-w-lg mx-auto py-2">
                  <div class="absolute h-0.5 bg-zinc-200 dark:bg-zinc-800 left-8 right-8 top-1/2 -translate-y-1/2 z-0"></div>
                  
                  <div class="flex flex-col items-center gap-1 z-10">
                    <div class="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md"><mat-icon class="text-sm">add_shopping_cart</mat-icon></div>
                    <span class="text-[9px] font-black uppercase text-zinc-500">Created</span>
                  </div>

                  <div class="flex flex-col items-center gap-1 z-10">
                    <div [class]="tx.status === 'Initiated' || tx.status === 'Captured' || tx.status === 'Refunded' ? 'bg-blue-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'" class="w-8 h-8 rounded-full flex items-center justify-center shadow-md"><mat-icon class="text-sm">sync</mat-icon></div>
                    <span class="text-[9px] font-black uppercase text-zinc-500">Initiated</span>
                  </div>

                  <div class="flex flex-col items-center gap-1 z-10">
                    <div [class]="tx.status === 'Captured' || tx.status === 'Refunded' ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'" class="w-8 h-8 rounded-full flex items-center justify-center shadow-md"><mat-icon class="text-sm">check_circle</mat-icon></div>
                    <span class="text-[9px] font-black uppercase text-zinc-500">Captured</span>
                  </div>

                  @if (tx.status === 'Refunded') {
                    <div class="flex flex-col items-center gap-1 z-10">
                      <div class="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md"><mat-icon class="text-sm">undo</mat-icon></div>
                      <span class="text-[9px] font-black uppercase text-amber-500">Refunded</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Payload Inspector -->
              <div class="space-y-4">
                <div>
                  <span class="block text-[10px] font-black text-zinc-400 uppercase mb-1">Request Payload</span>
                  <pre class="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono overflow-auto max-h-48 text-zinc-650 dark:text-zinc-300">{{ tx.requestPayload | json }}</pre>
                </div>
                <div>
                  <span class="block text-[10px] font-black text-zinc-400 uppercase mb-1">Gateway Response Payload</span>
                  <pre class="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono overflow-auto max-h-48 text-zinc-650 dark:text-zinc-300">{{ tx.responsePayload | json }}</pre>
                </div>
              </div>
            </div>
          </div>

          <!-- Right sidebar: Action & Details -->
          <div class="space-y-6">
            <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white border-b border-zinc-150 dark:border-zinc-800 pb-3">Transaction Summary</h3>
              
              <div class="space-y-3.5 text-xs">
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Order ID</span>
                  <span class="font-bold text-zinc-900 dark:text-white">{{ tx.orderId }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Customer Ref</span>
                  <span class="font-bold text-zinc-900 dark:text-white">{{ tx.customerId || 'Guest Checkout' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Gateway Method</span>
                  <span class="font-bold text-zinc-900 dark:text-white uppercase">{{ tx.gatewayName || 'COD' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Gateway Order ID</span>
                  <span class="font-mono text-[10px] font-bold text-zinc-900 dark:text-white">{{ tx.gatewayOrderId || 'N/A' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Gateway Payment ID</span>
                  <span class="font-mono text-[10px] font-bold text-zinc-900 dark:text-white">{{ tx.gatewayPaymentId || 'N/A' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Amount Settled</span>
                  <span class="font-black text-zinc-900 dark:text-white text-sm">₹{{ tx.amount }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-400 uppercase font-semibold text-[10px]">Clearance Status</span>
                  <span [class]="getStatusClass(tx.status)" class="px-2 py-0.5 text-[9px] font-black uppercase rounded-md tracking-wider">{{ tx.status }}</span>
                </div>
              </div>

              <!-- Refund Action Launch -->
              @if (tx.status === 'Captured') {
                <div class="pt-4 border-t border-zinc-150 dark:border-zinc-800 space-y-4">
                  <h4 class="text-[10px] font-black uppercase text-amber-500">Refund Action Launcher</h4>
                  <div class="space-y-2">
                    <span class="block text-[8px] font-black text-zinc-400 uppercase">Amount to Refund</span>
                    <div class="flex gap-2">
                      <input type="number" [(ngModel)]="refundAmount" [max]="tx.amount" class="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-amber-500 font-bold" [placeholder]="tx.amount">
                      <button (click)="processRefund(tx)" [disabled]="refundLoading()" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs">Refund</button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Webhook Logs View -->
      @if (subTab() === 'webhooks') {
        <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div class="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
            <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Incoming Webhook Audit Trail</h3>
            <button (click)="loadWebhooks()" class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer border-none"><mat-icon class="text-sm">refresh</mat-icon> Refresh Trail</button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-zinc-50 dark:bg-zinc-950/40 text-[9px] font-black uppercase text-zinc-400 tracking-wider border-b border-zinc-200 dark:border-zinc-850">
                  <th class="p-4 pl-6">Log ID</th>
                  <th class="p-4">Gateway</th>
                  <th class="p-4">Status</th>
                  <th class="p-4">Received At</th>
                  <th class="p-4 pr-6 text-right">Event Name</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-850">
                @for (log of webhooks(); track log.id) {
                  <tr class="text-xs hover:bg-zinc-50 dark:hover:bg-zinc-955/50 transition-colors">
                    <td class="p-4 pl-6 font-mono text-[10px] text-zinc-500">
                      {{ log.id.slice(0, 8) }}...{{ log.id.slice(-6) }}
                    </td>
                    <td class="p-4 uppercase text-[10px] font-black text-zinc-750 dark:text-zinc-300">
                      {{ log.gateway }}
                    </td>
                    <td class="p-4">
                      <span [class]="log.status === 'processed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'" class="px-2 py-0.5 text-[9px] font-black uppercase rounded-md tracking-wider">
                        {{ log.status }}
                      </span>
                    </td>
                    <td class="p-4 text-zinc-400 text-[11px] font-medium">
                      {{ log.receivedAt | date:'MMM d, y, h:mm a' }}
                    </td>
                    <td class="p-4 pr-6 text-right font-semibold text-zinc-750 dark:text-zinc-200 text-xs">
                      {{ log.payload?.event || log.payload?.event_type || 'captured' }}
                    </td>
                  </tr>
                }
                @if (webhooks().length === 0) {
                  <tr>
                    <td colspan="5" class="p-8 text-center text-xs font-bold text-zinc-500">No incoming webhook logs found in registry.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminPaymentsTab {
  @Input({ required: true }) admin!: AdminPanel;
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  subTab = signal<'transactions' | 'webhooks'>('transactions');
  transactions = signal<any[]>([]);
  webhooks = signal<any[]>([]);
  selectedTx = signal<any | null>(null);

  // Filters
  searchQuery = '';
  filterGateway = '';
  filterStatus = '';

  // Refund Launcher
  refundAmount = 0;
  refundLoading = signal(false);

  constructor() {
    effect(() => {
      if (this.admin.activeTab() === 'transactions') {
        this.subTab.set('transactions');
        this.loadTransactions();
      } else if (this.admin.activeTab() === 'webhook-logs') {
        this.subTab.set('webhooks');
        this.loadWebhooks();
      }
    }, { allowSignalWrites: true });
  }

  loadTransactions() {
    this.http.get<any>('/api/admin/transactions').subscribe({
      next: (data) => {
        const list = data.data !== undefined ? data.data : data;
        this.transactions.set(list || []);
      },
      error: () => this.toast.error('Failed to load transaction history'),
    });
  }

  loadWebhooks() {
    this.http.get<any>('/api/admin/webhook-logs').subscribe({
      next: (data) => {
        const list = data.data !== undefined ? data.data : data;
        this.webhooks.set(list || []);
      },
      error: () => this.toast.error('Failed to load webhook audit logs'),
    });
  }

  filteredTransactions = computed(() => {
    return this.transactions().filter((t) => {
      if (this.filterGateway && String(t.gatewayName).toLowerCase() !== this.filterGateway.toLowerCase()) return false;
      if (this.filterStatus && t.status !== this.filterStatus) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const idMatch = String(t.id).toLowerCase().includes(q);
        const orderMatch = String(t.orderId).toLowerCase().includes(q);
        const customerMatch = t.customerId ? String(t.customerId).toLowerCase().includes(q) : false;
        if (!idMatch && !orderMatch && !customerMatch) return false;
      }
      return true;
    });
  });

  getStatusClass(status: string) {
    if (!status) return 'bg-zinc-500/10 text-zinc-500';
    switch (status.toLowerCase()) {
      case 'captured':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15';
      case 'pending':
      case 'initiated':
        return 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/15';
      case 'refunded':
        return 'bg-purple-500/10 text-purple-500 border border-purple-500/15';
      default:
        return 'bg-red-500/10 text-red-500 border border-red-500/15';
    }
  }

  processRefund(tx: any) {
    const amt = this.refundAmount || tx.amount;
    if (amt <= 0 || amt > tx.amount) {
      this.toast.error('Please enter a valid refund amount');
      return;
    }

    if (!confirm(`Are you sure you want to refund ₹${amt} for transaction ${tx.id.slice(0, 8)}?`)) {
      return;
    }

    this.refundLoading.set(true);
    this.http.post<any>('/api/admin/payments/refund', {
      transactionId: tx.id,
      amount: amt
    }).subscribe({
      next: () => {
        this.toast.success('Refund completed successfully');
        this.refundLoading.set(false);
        this.selectedTx.set(null);
        this.loadTransactions();
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Refund operation failed');
        this.refundLoading.set(false);
      }
    });
  }
}
