import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AdminPanel } from '../admin';

@Component({
  selector: 'app-admin-sales-tab',
  imports: [CommonModule, MatIconModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300">
      
      <!-- ========================= TAB: ORDERS MANAGEMENT ========================= -->
      @if (admin.activeTab() === 'orders') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase tracking-tight">Active Fulfillment Logs</h1>
            <p class="text-xs text-zinc-500">Monitor active orders, track clearance status, and dispatch logistical courier details.</p>
          </div>

          <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-x-auto no-scrollbar font-sans">
            <table class="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr class="text-[10px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800">
                  <th class="py-3">Order Code</th>
                  <th class="py-3">Customer</th>
                  <th class="py-3">Financial status</th>
                  <th class="py-3">Product count</th>
                  <th class="py-3">Total Invoice</th>
                  <th class="py-3 text-right">Logistics action Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                @for (o of admin.ds.orders(); track o.id) {
                  <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td class="py-4">
                      <span class="px-2 py-0.5 bg-zinc-50 dark:bg-zinc-950 font-mono text-[9px] font-black rounded-md text-zinc-500 border dark:border-zinc-850 uppercase">{{ o.orderNumber }}</span>
                    </td>
                    <td class="py-4">
                      <p class="font-black text-zinc-900 dark:text-white uppercase flex items-center gap-2">
                        {{ o.guestName || o.customerName }}
                        @if (o.customerType === 'GUEST') {
                          <span class="px-1.5 py-0.5 bg-orange-500 text-white text-[7px] font-black rounded tracking-wider leading-none">GUEST</span>
                        } @else {
                          <span class="px-1.5 py-0.5 bg-blue-500 text-white text-[7px] font-black rounded tracking-wider leading-none">REG</span>
                        }
                      </p>
                      <span class="text-[10px] text-zinc-400 font-mono">{{ o.guestPhone || o.customerPhone }}</span>
                    </td>
                    <td class="py-4">
                      <span [class]="admin.getStatusStyle(o.status)" class="px-2 py-0.5 text-[9px] font-black uppercase rounded-md tracking-wider border">
                        {{ o.status }}
                      </span>
                    </td>
                    <td class="py-4 font-mono font-medium">{{ o.items.length }} SKU(s)</td>
                    <td class="py-4 font-mono font-black text-zinc-800 dark:text-white">₹{{ o.grandTotal | number }}</td>
                    <td class="py-4 text-right">
                      <div class="inline-flex gap-1.5 align-middle items-center">
                        <a [routerLink]="['/admin/orders', o.orderNumber]" class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase transition-colors mr-2">
                          <mat-icon class="text-[14px] leading-none">visibility</mat-icon> Details
                        </a>
                        <a [routerLink]="['/admin/orders', o.orderNumber]" class="flex items-center justify-center h-7 w-7 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-colors" title="Invoice">
                          <mat-icon class="scale-75">receipt_long</mat-icon>
                        </a>
                        <a [routerLink]="['/admin/orders', o.orderNumber]" class="flex items-center justify-center h-7 w-7 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-colors mr-2" title="Shipment">
                          <mat-icon class="scale-75">local_shipping</mat-icon>
                        </a>
                        <select [value]="o.status" (change)="admin.updateOrderStatus(o.orderNumber, $any($event.target).value)" class="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-[9px] font-black uppercase outline-none cursor-pointer">
                          <option value="Pending">Pending Auth</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Processing">Processing Job</option>
                          <option value="Packed">Packed</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ========================= TAB: DRAFT ORDERS INVOICER ========================= -->
      @if (admin.activeTab() === 'draft-orders') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase">Manual Invoicing Console</h1>
            <p class="text-xs text-zinc-500">Draft customized direct invoices and register individual cash bookings offline.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl p-6 space-y-6">
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pb-2">Manual Ticket Line Items</h3>
              
              <!-- SEARCH SKU -->
              <div class="space-y-1 relative">
                <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Attach Catalog Product</span>
                <div class="flex gap-2">
                  <div class="flex-1 relative">
                    <input type="text" [value]="admin.draftQuery()" (input)="admin.draftQuery.set($any($event.target).value)" (focus)="admin.draftItemSelectorOpen.set(true)" placeholder="Search catalog by name or sku code..." class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-xl text-xs outline-none font-bold">
                    @if (admin.draftItemSelectorOpen() && admin.draftQuery().length > 0) {
                      <div class="absolute z-30 left-0 right-0 top-11 p-2 bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-xl space-y-1 shadow-2xl max-h-50 overflow-y-auto">
                        @for (p of admin.ds.products(); track p.id) {
                          @if (p.name.toLowerCase().includes(admin.draftQuery().toLowerCase()) || p.sku.toLowerCase().includes(admin.draftQuery().toLowerCase())) {
                            <button (click)="admin.selectDraftItem(p); admin.draftItemSelectorOpen.set(false)" class="w-full flex justify-between p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-xs font-bold text-left">
                              <span class="uppercase text-zinc-900 dark:text-white">{{ p.name }}</span>
                              <span class="font-mono text-zinc-400">₹{{ p.sale_price }}</span>
                            </button>
                          }
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>

              <!-- SELECTED ITEMS -->
              @if (admin.draftSelectedItemsList().length > 0) {
                <div class="space-y-3">
                  <p class="text-[10px] font-black text-zinc-400 uppercase">Selected Items</p>
                  <div class="space-y-2 border border-zinc-200 dark:border-zinc-855 p-3 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40">
                    @for (item of admin.draftSelectedItemsList(); track item.product.id) {
                      <div class="flex items-center justify-between text-xs">
                        <span class="font-black text-zinc-900 dark:text-white uppercase truncate max-w-sm">{{ item.product.name }}</span>
                        <div class="flex items-center gap-3">
                          <input type="number" [value]="item.qty" (change)="admin.updateDraftItemQty(item.product.id, $any($event.target).value)" class="w-12 px-2 py-1 bg-zinc-100 dark:bg-zinc-950 border dark:border-zinc-850 rounded-md font-bold font-mono text-center">
                          <button (click)="admin.removeDraftItem(item.product.id)" class="text-red-400 cursor-pointer hover:text-red-600 transition-colors">
                            <mat-icon class="text-base">close</mat-icon>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- RECEIPT METRICS -->
            <div class="p-6 bg-zinc-900 text-white rounded-2xl space-y-6 shadow-2xl relative overflow-hidden">
              <h3 class="text-xs font-black uppercase text-blue-400 border-b border-white/5 pb-2">Manual Ticket Summary</h3>
              <div class="space-y-2.5 text-xs font-mono">
                <div class="flex justify-between">
                  <span class="text-zinc-400">Inventory Subtotal:</span>
                  <span>₹{{ admin.draftSubtotal() | number }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-400">GST/VAT Tax ({{ admin.taxRate() }}%):</span>
                  <span>₹{{ admin.draftTax() | number }}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-t border-b border-white/5 font-black text-white">
                  <span class="text-zinc-300">Grand Invoice Total:</span>
                  <span class="text-emerald-400">₹{{ admin.draftGrandTotal() | number }}</span>
                </div>
              </div>
              <button (click)="admin.submitDraftOrder()" class="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-blue-500/10">Authorize Sales Ticket</button>
            </div>
          </div>
        </div>
      }

      <!-- ========================= TAB: ABANDONED CARTS ========================= -->
      @if (admin.activeTab() === 'abandoned-carts') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase">Abandoned Checkouts</h1>
            <p class="text-xs text-zinc-500">Audit uncompleted basket sessions and deploy automated recovery notification vouchers.</p>
          </div>

          <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-x-auto no-scrollbar font-sans">
            <table class="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr class="text-[10px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800">
                  <th class="py-3">Session Profile</th>
                  <th class="py-3">Pending Basket Items</th>
                  <th class="py-3">Cart values</th>
                  <th class="py-3">Stamp time</th>
                  <th class="py-3 text-right">Recovery Blast</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                @for (c of admin.abandonedCartsList(); track c.id) {
                  <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td class="py-4 font-semibold">
                      <p class="font-black text-zinc-900 dark:text-white uppercase">{{ c.customer }}</p>
                      <span class="text-[10px] font-mono text-zinc-400">{{ c.email }}</span>
                    </td>
                    <td class="py-4 text-zinc-500 group max-w-xs truncate font-medium">{{ c.items }}</td>
                    <td class="py-4 font-mono font-black text-zinc-800 dark:text-white">₹{{ c.cartValue | number }}</td>
                    <td class="py-4 font-mono text-zinc-400">{{ c.date }}</td>
                    <td class="py-4 text-right">
                      @if (!c.recovered) {
                        <button (click)="admin.sendRecoveryBlast(c.id)" class="px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-600 hover:text-black rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer">Dispatch recoveries</button>
                      } @else {
                        <span class="text-[9px] font-black text-emerald-500 uppercase tracking-wider">Coupon Recovered</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="py-12 text-center">
                      <div class="flex flex-col items-center justify-center space-y-2 py-4">
                        <mat-icon class="text-zinc-300 dark:text-zinc-700 text-3xl">shopping_cart</mat-icon>
                        <h4 class="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Data Available</h4>
                        <p class="text-[10px] text-zinc-500">There are no abandoned baskets waiting for recovery blasts.</p>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ========================= TAB: SERVICE QUOTES ========================= -->
      @if (admin.activeTab() === 'quotes') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase">Service Evaluation Console</h1>
            <p class="text-xs text-zinc-500">Examine 3D slicing requests, manually override material pricing parameters, and direct fabrication jobs.</p>
          </div>

          <div class="space-y-4">
            @for (q of admin.ds.quotes(); track q.id) {
              <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4 shadow-xs">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 bg-zinc-50 dark:bg-zinc-950 font-mono text-[9px] font-black rounded-md text-zinc-500 uppercase border dark:border-zinc-800">{{ q.quoteNumber }}</span>
                      <h4 class="text-xs font-black text-zinc-950 dark:text-white uppercase font-sans">{{ q.fileName }} ({{ q.fileSize }})</h4>
                    </div>
                    <p class="text-[10px] text-zinc-400 mt-1 uppercase font-bold">Client: {{ q.customerName }} &middot; {{ q.customerPhone }}</p>
                  </div>
                  <span [class]="'px-2.5 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider border ' + admin.getQuoteStatusClass(q.status)">
                    {{ q.status }}
                  </span>
                </div>

                <!-- METROLOGY METRICS -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl text-zinc-550 dark:text-zinc-400 font-mono text-[10px]">
                  <div>
                    <span class="text-[9px] block text-zinc-400 font-black uppercase tracking-wider mb-0.5">Specifications</span>
                    <span class="font-black text-zinc-900 dark:text-white font-sans">{{ q.volumeCm3 }}cm³ Vol | {{ q.weightGrams }}g Mass</span>
                  </div>
                  <div>
                    <span class="text-[9px] block text-zinc-400 font-black uppercase tracking-wider mb-0.5 font-sans">Polymer / Hue</span>
                    <span class="font-black text-blue-500 uppercase">{{ q.materialType }} ({{ q.color }})</span>
                  </div>
                  <div>
                    <span class="text-[9px] block text-zinc-400 font-black uppercase tracking-wider mb-0.5">Layer Height</span>
                    <span class="font-black text-zinc-900 dark:text-white">{{ q.layerHeight }}mm</span>
                  </div>
                  <div>
                    <span class="text-[9px] block text-zinc-400 font-black uppercase tracking-wider mb-0.5 font-sans">Infill Percentage</span>
                    <span class="font-black text-zinc-900 dark:text-white font-sans">{{ q.infill }}% Grid</span>
                  </div>
                </div>

                @if (q.notes) {
                  <div class="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl leading-relaxed text-[11px]">
                    <span class="text-amber-500 uppercase font-black italic">Client Instruction:</span> "{{ q.notes }}"
                  </div>
                }

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
                  <div class="space-y-1">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Modify Manual Cost Override (INR)</span>
                    <input type="number" [value]="q.estimatedCost" (change)="admin.overrideQuotePrice(q.id, $event)" class="w-40 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-xl text-xs font-mono font-black outline-none font-bold">
                  </div>

                  <div class="flex items-center gap-2">
                    @if (q.status === 'submitted') {
                      <button (click)="admin.approveEstimate(q.id)" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer">Dispatch official Quote</button>
                    } @else if (q.status === 'approved_by_customer') {
                      <button (click)="admin.completeQuoteFab(q.id)" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase animate-pulse cursor-pointer">Initiate Lab Cluster Fab</button>
                    } @else {
                      <div class="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border dark:border-zinc-800 text-[10px]">
                        <mat-icon class="text-emerald-500 text-sm">verified</mat-icon>
                        <span class="text-zinc-400 font-black uppercase">Cleared</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class AdminSalesTab {
  @Input({ required: true }) admin!: AdminPanel;
}
