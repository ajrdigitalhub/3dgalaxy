import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminPanel } from '../admin';

@Component({
  selector: 'app-admin-dashboard-tab',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">Overview Dashboard</h1>
          <p class="text-xs text-zinc-500">Real-time status analysis of physical telemetry, inventory, and sales streams.</p>
        </div>
        <div class="flex gap-2">
          <button (click)="admin.createNewProductDraft(); admin.setActiveTab('products')" class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-500 shadow-md shadow-blue-500/10 transition-colors flex items-center gap-1.5 cursor-pointer">
            <mat-icon class="text-base">add</mat-icon> Create SKU
          </button>
        </div>
      </div>

      <!-- KPI TELEMETRY CARDS -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl shadow-xs space-y-2">
          <p class="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Gross Sales</p>
          <h3 class="text-xl font-black font-mono text-zinc-900 dark:text-white">₹{{ (admin.dashboardStats()?.totalRevenue || admin.kpi().totalSales) | number }}</h3>
          <span class="text-[8px] text-emerald-500 uppercase font-bold">+18% vs Last Cycle</span>
        </div>
        <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl shadow-xs space-y-2">
          <p class="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Fulfilled Orders</p>
          <h3 class="text-xl font-black font-mono text-zinc-900 dark:text-white">{{ admin.dashboardStats()?.totalOrders ?? admin.ds.orders().length }}</h3>
          <span class="text-[8px] text-blue-400 uppercase font-bold">100% cloud sync</span>
        </div>
        <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl shadow-xs space-y-2">
          <p class="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Total Products</p>
          <h3 class="text-xl font-black font-mono text-zinc-900 dark:text-white">{{ admin.dashboardStats()?.totalProducts ?? admin.ds.products().length }}</h3>
          <span class="text-[8px] text-blue-400 uppercase font-bold">In Local Schema</span>
        </div>
        <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl shadow-xs space-y-2">
          <p class="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Active Customers</p>
          <h3 class="text-xl font-black font-mono text-zinc-900 dark:text-white">{{ admin.dashboardStats()?.totalCustomers ?? admin.customersList().length }}</h3>
          <span class="text-[8px] uppercase font-bold text-zinc-400">Total Registered</span>
        </div>
      </div>

      <!-- SECONDARY KPI STRAPS FOR ACTION ITEMS -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
          <div class="space-y-1">
            <span class="block text-[9px] font-black uppercase text-amber-500 tracking-wider">Active Abandoned Carts</span>
            <span class="block text-lg font-black font-mono text-zinc-900 dark:text-white">{{ admin.dashboardStats()?.abandonedCarts ?? admin.abandonedCartsList().length }} Baskets</span>
          </div>
          <div class="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <mat-icon>remove_shopping_cart</mat-icon>
          </div>
        </div>
        <div class="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-between">
          <div class="space-y-1">
            <span class="block text-[9px] font-black uppercase text-orange-500 tracking-wider">Awaiting Pending Orders</span>
            <span class="block text-lg font-black font-mono text-zinc-900 dark:text-white">{{ admin.dashboardStats()?.pendingOrders ?? getPendingOrdersCount() }} Orders</span>
          </div>
          <div class="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
            <mat-icon>pending_actions</mat-icon>
          </div>
        </div>
        <div class="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-between">
          <div class="space-y-1">
            <span class="block text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">Guest Checkout Sales</span>
            <span class="block text-lg font-black font-mono text-zinc-900 dark:text-white">{{ getGuestOrdersCount() }} Orders (₹{{ getGuestSalesTotal() | number:'1.0-0' }})</span>
          </div>
          <div class="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
            <mat-icon>account_circle</mat-icon>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- BAR GRAPH -->
        <div class="lg:col-span-2 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4">
          <p class="text-xs font-black uppercase tracking-wider text-zinc-400">Commercial Sales Curve (INR)</p>
          <div class="h-44 flex items-end gap-3.5 pt-4">
            @for (data of admin.monthlySalesChart; track data.month) {
              <div class="flex-1 flex flex-col items-center gap-2">
                <div class="w-full bg-blue-600/10 hover:bg-blue-600 rounded-t-lg transition-all relative group cursor-pointer" [style.height.px]="data.height">
                  <div class="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-zinc-950 text-white text-[8px] font-mono px-1.5 py-0.5 rounded-md transition-all">₹{{ data.val/1000 }}K</div>
                </div>
                <span class="text-[9px] font-mono font-bold text-zinc-400 uppercase">{{ data.month }}</span>
              </div>
            }
          </div>
        </div>

        <!-- REAL-TIME LAB PRINTER TELEMETRY (3D Lab OS specific branding!) -->
        <div class="p-6 bg-zinc-900 text-white rounded-2xl border border-white/5 space-y-4 relative overflow-hidden shadow-2xl">
          <div class="absolute -right-12 -bottom-12 opacity-5 text-white"><mat-icon class="text-[10rem] h-auto w-auto">print</mat-icon></div>
          <div class="flex items-center justify-between border-b border-white/5 pb-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-blue-400">LAB PRINTER CLUSTER</span>
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <div class="space-y-3 relative z-10">
            @for (p of admin.printerTelemetry; track p.id) {
              <div class="p-2.5 bg-white/5 border border-white/5 rounded-xl space-y-1">
                <div class="flex justify-between text-[9px] font-mono">
                  <span class="font-black text-zinc-300">#{{ p.id }} {{ p.model }}</span>
                  <span [class]="p.status === 'Printing' ? 'text-emerald-400' : 'text-zinc-500'" class="font-bold uppercase tracking-wider">{{ p.status }} {{ p.status === 'Printing' ? p.progress + '%' : '' }}</span>
                </div>
                @if (p.status === 'Printing') {
                  <div class="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div class="h-full bg-blue-500 rounded-full" [style.width.%]="p.progress"></div>
                  </div>
                  <div class="flex justify-between text-[8px] text-zinc-400 tracking-wider">
                    <span>Material: {{ p.material }}</span>
                    <span>Nozzle: {{ p.nozzleTemp }}° / Bed: {{ p.bedTemp }}°</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardTab {
  @Input({ required: true }) admin!: AdminPanel;

  getPendingOrdersCount(): number {
    return this.admin.ds.orders().filter((o: any) => o.status === 'Pending').length;
  }

  getGuestOrdersCount(): number {
    return this.admin.ds.orders().filter((o: any) => o.customerType === 'GUEST').length;
  }

  getGuestSalesTotal(): number {
    return this.admin.ds.orders()
      .filter((o: any) => o.customerType === 'GUEST')
      .reduce((acc: number, o: any) => acc + (o.grandTotal || o.totalAmount || 0), 0);
  }
}
