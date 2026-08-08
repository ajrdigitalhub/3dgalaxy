import { Component, Input, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminPanel } from '../admin';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ShipmentDialogComponent, ShipmentDetailsPayload } from './shipment-dialog/shipment-dialog.component';
import { PackagingSlipService } from '../../../services/packaging-slip.service';
import { PackagingSlipDialogComponent } from './packaging-slip-dialog/packaging-slip-dialog.component';

@Component({
  selector: 'app-admin-sales-tab',
  imports: [CommonModule, MatIconModule, RouterModule, FormsModule, ShipmentDialogComponent, PackagingSlipDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300">
      
      <!-- ========================= TAB: ORDERS MANAGEMENT ========================= -->
      @if (admin.activeTab() === 'orders') {
        <div class="space-y-8">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 class="text-xl font-black uppercase tracking-tight">Active Fulfillment Logs</h1>
              <p class="text-xs text-zinc-500">Monitor active orders, track clearance status, and dispatch logistical courier details.</p>
            </div>
            <button
              (click)="exportOrdersCsv()"
              class="h-9 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs border-none"
            >
              <mat-icon class="text-sm">download</mat-icon>
              <span>Export CSV</span>
            </button>
          </div>

          <!-- Advanced Search & Filter Controls -->
          <div class="space-y-4">
            <div class="flex flex-col sm:flex-row gap-3">
              <!-- Search Input Bar -->
              <div class="flex-1 flex items-center gap-3 bg-white dark:bg-zinc-900 px-4 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                <mat-icon class="text-zinc-400">search</mat-icon>
                <input type="text"
                       [value]="searchQuery()"
                       (input)="onSearchChange($any($event.target).value)"
                       placeholder="Search by Order ID, Customer Name, Email, Phone, Tracking Number..."
                       class="flex-1 bg-transparent border-none outline-none text-xs text-zinc-900 dark:text-white placeholder-zinc-400 font-medium">
                @if (searchQuery()) {
                  <button (click)="resetSearch()" class="h-5 w-5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center border-none bg-transparent cursor-pointer text-zinc-400">
                    <mat-icon class="text-xs">close</mat-icon>
                  </button>
                }
              </div>

              <!-- Action buttons -->
              <div class="flex items-center gap-2">
                <button (click)="showFilters.set(!showFilters())"
                        [class]="showFilters() ? 'bg-blue-650 text-blue-100 bg-blue-600' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800'"
                        class="h-9 px-4 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border-none">
                  <mat-icon class="text-sm">tune</mat-icon>
                  <span>Advanced Filters</span>
                </button>

                @if (hasActiveFilters()) {
                  <button (click)="resetFilters()"
                          class="h-9 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border-none">
                    <mat-icon class="text-sm">filter_alt_off</mat-icon>
                    <span>Clear</span>
                  </button>
                }
              </div>
            </div>

            <!-- Collapsible Filters Drawer -->
            @if (showFilters()) {
              <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
                <!-- Status Filter -->
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase">Fulfillment Status</span>
                  <select [value]="statusFilter()"
                          (change)="onStatusChange($any($event.target).value)"
                          class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending Auth</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Processing">Processing</option>
                    <option value="Packed">Packed</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <!-- Customer Type Filter -->
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase">Customer Type</span>
                  <select [value]="customerTypeFilter()"
                          (change)="onCustomerTypeChange($any($event.target).value)"
                          class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                    <option value="">All Types</option>
                    <option value="REG">Registered</option>
                    <option value="GUEST">Guest</option>
                  </select>
                </div>

                <!-- Price Range (Min/Max) -->
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase">Grand Total (Min - Max)</span>
                  <div class="flex gap-2">
                    <input type="number"
                           [value]="minAmount() === null ? '' : minAmount()"
                           (input)="setMinAmt($event)"
                           placeholder="Min"
                           class="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                    <input type="number"
                           [value]="maxAmount() === null ? '' : maxAmount()"
                           (input)="setMaxAmt($event)"
                           placeholder="Max"
                           class="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                  </div>
                </div>

                <!-- Date Range (From/To) -->
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase">Created Date (From - To)</span>
                  <div class="flex gap-2">
                    <input type="date"
                           [value]="dateFrom()"
                           (input)="onDateFromChange($any($event.target).value)"
                           class="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                    <input type="date"
                           [value]="dateTo()"
                           (input)="onDateToChange($any($event.target).value)"
                           class="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none">
                  </div>
                </div>
              </div>
            }

            <!-- Match stats counter -->
            <div class="flex justify-between items-center text-[10px] font-black uppercase text-zinc-400 pl-1">
              <span>Showing {{ filteredOrders().length }} of {{ admin.ds.ordersTotal() }} total orders</span>
            </div>
          </div>

          <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl font-sans relative overflow-visible">
            <!-- Loading Indicator Spinner Overlay -->
            @if (admin.ds.ordersLoading()) {
              <div class="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xs z-10 flex items-center justify-center animate-fadeIn rounded-2xl">
                <div class="flex flex-col items-center gap-3">
                  <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span class="text-[10px] font-black uppercase text-blue-500 tracking-wider">Syncing Fulfillment logs...</span>
                </div>
              </div>
            }

            <table class="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr class="text-[10px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800">
                  <th class="py-3.5 px-3">Order Code</th>
                  <th class="py-3.5 px-3">Customer</th>
                  <th class="py-3.5 px-3">Order Status</th>
                  <th class="py-3.5 px-3">Total Amount</th>
                  <th class="py-3.5 px-3 text-right">Logistics & Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                @for (o of filteredOrders(); track o.id) {
                  <tr class="transition-colors" [ngClass]="getOrderRowBgClass(o.status)">
                    <!-- Order Code -->
                    <td class="py-3.5 px-3">
                      <span 
                        class="px-3 py-1.5 font-mono text-xs sm:text-sm font-black rounded-lg tracking-wider shadow-2xs inline-block"
                        [ngClass]="isCancelled(o.status) ? 
                          'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 line-through decoration-red-600 decoration-2' : 
                          'bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700'"
                      >
                        {{ o.orderNumber }}
                      </span>
                    </td>

                    <!-- Customer -->
                    <td class="py-3.5 px-3">
                      <p 
                        class="font-black text-zinc-900 dark:text-white uppercase flex items-center gap-2"
                        [class.line-through]="isCancelled(o.status)"
                        [class.decoration-red-600]="isCancelled(o.status)"
                        [class.decoration-2]="isCancelled(o.status)"
                      >
                        {{ o.guestName || o.customerName }}
                        @if (o.customerType?.toUpperCase() === 'GUEST') {
                          <span class="px-1.5 py-0.5 bg-orange-500 text-white text-[7px] font-black rounded tracking-wider leading-none no-underline">GUEST</span>
                        } @else {
                          <span class="px-1.5 py-0.5 bg-blue-500 text-white text-[7px] font-black rounded tracking-wider leading-none no-underline">REG</span>
                        }
                      </p>
                      <span class="text-[10px] text-zinc-400 font-mono">{{ o.guestPhone || o.customerPhone }}</span>
                    </td>

                    <!-- Order Status -->
                    <td class="py-3.5 px-3">
                      @if (isCancelled(o.status)) {
                        <span class="px-2.5 py-1 bg-red-600 text-white text-[10px] font-black uppercase rounded-md tracking-wider border border-red-700 shadow-xs inline-flex items-center gap-1">
                          <mat-icon class="text-xs scale-75">cancel</mat-icon>
                          CANCELLED
                        </span>
                      } @else {
                        <span [class]="admin.getStatusStyle(o.status)" class="px-2.5 py-1 text-[10px] font-black uppercase rounded-md tracking-wider border">
                          {{ o.status }}
                        </span>
                      }
                    </td>

                    <!-- Total Amount -->
                    <td 
                      class="py-3.5 px-3 font-mono font-black text-zinc-800 dark:text-white text-sm"
                      [class.line-through]="isCancelled(o.status)"
                      [class.decoration-red-600]="isCancelled(o.status)"
                      [class.decoration-2]="isCancelled(o.status)"
                    >
                      ₹{{ o.grandTotal | number }}
                    </td>

                    <!-- Logistics & Actions -->
                    <td class="py-3.5 px-3 text-right">
                      <div class="inline-flex gap-2 align-middle items-center justify-end">
                        
                        <!-- DETAILS BUTTON -->
                        <a [routerLink]="['/admin/orders', o.orderNumber]" class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase transition-colors">
                          <mat-icon class="text-[14px] leading-none">visibility</mat-icon> Details
                        </a>

                        <!-- PACKAGING SLIP BUTTON -->
                        <button
                          (click)="openPackagingSlipModal(o)"
                          class="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 rounded-lg text-[9px] font-black uppercase transition-colors cursor-pointer"
                          title="Preview & Edit Packaging Slip"
                        >
                          <mat-icon class="text-[14px] leading-none">assignment</mat-icon>
                          <span>Packaging Slip</span>
                        </button>

                        <!-- SHIPPING ICON BUTTON WITH UN-CROPPED HOVER POPOVER -->
                        <div class="relative group/ship inline-block">
                          <button
                            (click)="openShipmentModalForOrder(o)"
                            class="relative flex items-center justify-center h-7.5 w-7.5 rounded-lg transition-all border cursor-pointer"
                            [ngClass]="(o.shipment?.trackingNumber || o.shipment?.courierPartner) ? 
                              'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 shadow-sm' : 
                              'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'"
                            title="Shipping Logistics Details"
                          >
                            <mat-icon class="text-sm scale-85">local_shipping</mat-icon>
                            @if (o.shipment?.trackingNumber || o.shipment?.courierPartner) {
                              <span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-zinc-900"></span>
                            }
                          </button>

                          <!-- Left Floating Shipping Popover (never cropped by top/bottom container) -->
                          <div class="group-hover/ship:opacity-100 group-hover/ship:visible opacity-0 invisible transition-all duration-200 pointer-events-none group-hover/ship:pointer-events-auto absolute right-full top-1/2 -translate-y-1/2 mr-3 w-72 bg-zinc-900 text-white rounded-2xl p-4 shadow-2xl border border-zinc-700 z-50 text-left space-y-3 font-sans">
                            <div class="flex items-center justify-between pb-2 border-b border-zinc-800">
                              <span class="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                                <mat-icon class="text-xs">local_shipping</mat-icon>
                                Shipment Details
                              </span>
                              @if (o.shipment?.courierPartner || o.shipment?.courierDisplayName) {
                                <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-black rounded uppercase">
                                  {{ o.shipment.courierDisplayName || o.shipment.courierPartner }}
                                </span>
                              }
                            </div>

                            @if (o.shipment?.trackingNumber || o.shipment?.courierPartner) {
                              <div class="space-y-2 text-xs">
                                @if (o.shipment?.trackingNumber) {
                                  <div class="flex items-center justify-between bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                                    <div>
                                      <span class="block text-[8px] font-black text-zinc-400 uppercase">Tracking AWB</span>
                                      <span class="font-mono font-bold text-white text-xs">{{ o.shipment.trackingNumber }}</span>
                                    </div>
                                    <button
                                      (click)="copyTrackingId(o.shipment.trackingNumber)"
                                      class="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
                                      title="Copy Tracking ID"
                                    >
                                      <mat-icon class="text-xs">content_copy</mat-icon>
                                    </button>
                                  </div>
                                }

                                @if (o.shipment?.shipmentDate) {
                                  <div class="flex justify-between text-[11px]">
                                    <span class="text-zinc-400">Shipped Date:</span>
                                    <span class="font-mono font-semibold text-zinc-200">{{ o.shipment.shipmentDate | date:'dd MMM yyyy' }}</span>
                                  </div>
                                }

                                @if (o.shipment?.estimatedDelivery || o.estimatedDelivery) {
                                  <div class="flex justify-between text-[11px]">
                                    <span class="text-zinc-400">Est. Delivery:</span>
                                    <span class="font-mono font-bold text-emerald-400">{{ o.shipment?.estimatedDelivery || o.estimatedDelivery }}</span>
                                  </div>
                                }

                                @if (o.shipment?.trackingUrl) {
                                  <div class="pt-1">
                                    <button
                                      (click)="trackShipment(o.shipment.trackingUrl)"
                                      class="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md border-none"
                                    >
                                      <mat-icon class="text-xs">open_in_new</mat-icon>
                                      Track Live Shipment
                                    </button>
                                  </div>
                                }
                              </div>
                            } @else {
                              <div class="py-1 text-center space-y-1">
                                <p class="text-xs font-medium text-zinc-400">No dispatch details configured yet.</p>
                                <p class="text-[9px] text-zinc-500">Click icon to assign courier & tracking AWB.</p>
                              </div>
                            }
                          </div>
                        </div>

                        <!-- STATUS SELECTOR -->
                        <select
                          #statusSelect
                          [value]="o.status"
                          (change)="handleStatusSelect(o, $any($event.target).value, statusSelect)"
                          class="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[9px] font-black uppercase outline-none cursor-pointer"
                        >
                          <option value="Pending" [selected]="isSameStatus(o.status, 'Pending')">Pending Auth</option>
                          <option value="Confirmed" [selected]="isSameStatus(o.status, 'Confirmed')">Confirmed</option>
                          <option value="Processing" [selected]="isSameStatus(o.status, 'Processing')">Processing Job</option>
                          <option value="Packed" [selected]="isSameStatus(o.status, 'Packed')">Packed</option>
                          <option value="Shipped" [selected]="isSameStatus(o.status, 'Shipped')">Shipped</option>
                          <option value="Delivered" [selected]="isSameStatus(o.status, 'Delivered')">Delivered</option>
                          <option value="Cancelled" [selected]="isSameStatus(o.status, 'Cancelled')">Cancelled</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Server-side Pagination Panel -->
          <div class="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs text-xs font-sans">
            <div class="flex items-center gap-2">
              <span class="text-zinc-500">Show</span>
              <select [value]="pageSize()"
                      (change)="onPageSizeChange($any($event.target).value)"
                      class="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer outline-none font-bold">
                <option [value]="10">10</option>
                <option [value]="20">20</option>
                <option [value]="50">50</option>
                <option [value]="100">100</option>
              </select>
              <span class="text-zinc-500">orders per page</span>
            </div>

            <!-- Page Selection Controls -->
            <div class="flex items-center gap-3">
              <button [disabled]="currentPage() === 1 || admin.ds.ordersLoading()"
                      (click)="goToPage(currentPage() - 1)"
                      class="h-8 w-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-950 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <mat-icon class="text-sm">chevron_left</mat-icon>
              </button>

              <span class="font-bold text-zinc-800 dark:text-zinc-200">
                Page {{ currentPage() }} of {{ totalPages() }}
              </span>

              <button [disabled]="currentPage() === totalPages() || admin.ds.ordersLoading()"
                      (click)="goToPage(currentPage() + 1)"
                      class="h-8 w-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-950 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <mat-icon class="text-sm">chevron_right</mat-icon>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- SHIPMENT DETAILS DIALOG POPUP -->
      @if (showShipmentModal() && selectedOrderForShipment()) {
        <app-shipment-dialog
          [orderNumber]="selectedOrderForShipment().orderNumber"
          [orderItems]="selectedOrderForShipment().items || []"
          (saveShipment)="onSaveShipmentPayload($event)"
          (cancel)="showShipmentModal.set(false)"
        ></app-shipment-dialog>
      }

      <!-- INTERACTIVE PACKAGING SLIP EDIT & PREVIEW DIALOG -->
      @if (showSlipModal() && selectedOrderForSlip()) {
        <app-packaging-slip-dialog
          [order]="selectedOrderForSlip()"
          (cancel)="showSlipModal.set(false)"
        ></app-packaging-slip-dialog>
      }

      <!-- ========================= TAB: DRAFT ORDERS CONSOLE ========================= -->
      @if (admin.activeTab() === 'draft-orders') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase">Manual Order Console</h1>
            <p class="text-xs text-zinc-500">Register individual cash bookings and direct offline sales.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl p-6 space-y-6">
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pb-2">Manual Ticket Line Items</h3>
              
              <!-- SEARCH SKU -->
              <div class="space-y-1 relative">
                <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Attach Catalog Product</span>
                <div class="flex gap-2">
                  <div class="flex-1 relative">
                    <input type="text" [value]="admin.draftQuery()" (input)="admin.draftQuery.set($any($event.target).value)" (focus)="admin.draftItemSelectorOpen.set(true)" placeholder="Search catalog by name or sku code..." class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 rounded-xl text-xs outline-none font-bold">
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
                          <input type="number" [value]="item.qty" (change)="admin.updateDraftItemQty(item.product.id, $any($event.target).value)" class="w-12 px-2 py-1 bg-zinc-100 dark:bg-zinc-950 border dark:border-zinc-800 rounded-md font-bold font-mono text-center">
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

                <div class="flex justify-between items-center py-2 border-t border-b border-white/5 font-black text-white">
                  <span class="text-zinc-300">Grand Total:</span>
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
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl text-zinc-550 dark:text-zinc-400 font-mono text-[10px]">
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
                    <input type="number" [value]="q.estimatedCost" (change)="admin.overrideQuotePrice(q.id, $event)" class="w-40 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 rounded-xl text-xs font-mono font-black outline-none font-bold">
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
  private toastService = inject(ToastService);
  private packagingSlipService = inject(PackagingSlipService);

  showSlipModal = signal(false);
  selectedOrderForSlip = signal<any>(null);

  openPackagingSlipModal(order: any) {
    this.selectedOrderForSlip.set(order);
    this.showSlipModal.set(true);
  }

  downloadPackagingSlip(orderId: string, orderNumber?: string) {
    this.packagingSlipService.downloadPackagingSlip(orderId, orderNumber);
  }

  // Advanced Search & Filters signals
  searchQuery = signal('');
  statusFilter = signal('');
  customerTypeFilter = signal('');
  minAmount = signal<number | null>(null);
  maxAmount = signal<number | null>(null);
  dateFrom = signal('');
  dateTo = signal('');
  showFilters = signal(false);

  // Pagination signals
  currentPage = signal(1);
  pageSize = signal(20);
  private searchTimeout: any;

  totalPages = computed(() => {
    const total = this.admin.ds.ordersTotal();
    const limit = this.pageSize();
    return Math.ceil(total / limit) || 1;
  });

  hasActiveFilters = computed(() => {
    return !!this.searchQuery().trim() ||
           !!this.statusFilter() ||
           !!this.customerTypeFilter() ||
           this.minAmount() !== null ||
           this.maxAmount() !== null ||
           !!this.dateFrom() ||
           !!this.dateTo();
  });

  constructor() {
    // Watch filters and reload orders from server
    effect(() => {
      const page = this.currentPage();
      const limit = this.pageSize();
      const search = this.searchQuery();
      const status = this.statusFilter();
      const customerType = this.customerTypeFilter();
      const minAmt = this.minAmount();
      const maxAmt = this.maxAmount();
      const fromDate = this.dateFrom();
      const toDate = this.dateTo();

      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      this.searchTimeout = setTimeout(() => {
        this.admin.ds.reloadOrders(page, limit, {
          search,
          status,
          customerType,
          minAmount: minAmt,
          maxAmount: maxAmt,
          dateFrom: fromDate,
          dateTo: toDate
        });
      }, 300);
    });
  }

  // Filter setters that reset pagination to page 1
  onSearchChange(val: string) {
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onStatusChange(val: string) {
    this.statusFilter.set(val);
    this.currentPage.set(1);
  }

  onCustomerTypeChange(val: string) {
    this.customerTypeFilter.set(val);
    this.currentPage.set(1);
  }

  setMinAmt(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.minAmount.set(val === '' ? null : Number(val));
    this.currentPage.set(1);
  }

  setMaxAmt(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.maxAmount.set(val === '' ? null : Number(val));
    this.currentPage.set(1);
  }

  onDateFromChange(val: string) {
    this.dateFrom.set(val);
    this.currentPage.set(1);
  }

  onDateToChange(val: string) {
    this.dateTo.set(val);
    this.currentPage.set(1);
  }

  resetSearch() {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  resetFilters() {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.customerTypeFilter.set('');
    this.minAmount.set(null);
    this.maxAmount.set(null);
    this.dateFrom.set('');
    this.dateTo.set('');
    this.currentPage.set(1);
  }

  // Pagination navigation helpers
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(size: string) {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
  }

  filteredOrders = computed(() => {
    return this.admin.ds.orders() || [];
  });

  isSameStatus(a: string | undefined, b: string): boolean {
    if (!a || !b) return false;
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }

  private http = inject(HttpClient);

  // Shipment Dialog Modal signals
  showShipmentModal = signal(false);
  selectedOrderForShipment = signal<any>(null);

  handleStatusSelect(order: any, newStatus: string, selectEl: HTMLSelectElement) {
    if (!newStatus) return;
    if (newStatus.toLowerCase() === 'shipped') {
      // Intercept transition to Shipped -> Require Shipment Details Dialog first
      selectEl.value = order.status || 'Confirmed';
      this.openShipmentModalForOrder(order);
    } else {
      this.admin.updateOrderStatus(order.orderNumber, newStatus);
    }
  }

  openShipmentModalForOrder(order: any) {
    this.selectedOrderForShipment.set(order);
    this.showShipmentModal.set(true);
  }

  onSaveShipmentPayload(payload: ShipmentDetailsPayload) {
    const targetOrder = this.selectedOrderForShipment();
    if (!targetOrder) return;

    let headers = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) headers = { headers: { 'Authorization': `Bearer ${token}` } };
    }

    this.http.put(`/api/orders/${targetOrder.id}/status`, {
      status: 'Shipped',
      ...payload
    }, headers).subscribe({
      next: (res: any) => {
        this.toastService.success(`Order ${targetOrder.orderNumber} successfully shipped via ${payload.courierDisplayName}!`);
        this.showShipmentModal.set(false);
        this.selectedOrderForShipment.set(null);
        this.admin.ds.reloadOrders(this.currentPage(), this.pageSize(), {
          search: this.searchQuery(),
          status: this.statusFilter(),
          customerType: this.customerTypeFilter(),
          minAmount: this.minAmount(),
          maxAmount: this.maxAmount(),
          dateFrom: this.dateFrom(),
          dateTo: this.dateTo()
        });
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.error || 'Failed to save shipment details.');
      }
    });
  }

  copyTrackingId(trackingNum: string) {
    if (!trackingNum) return;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(trackingNum);
      this.toastService.success(`Copied Tracking ID: ${trackingNum}`);
    } else {
      this.toastService.info(`Tracking ID: ${trackingNum}`);
    }
  }

  trackShipment(url: string) {
    if (!url) return;
    window.open(url, '_blank');
  }

  isCancelled(status?: string): boolean {
    if (!status) return false;
    return status.toLowerCase().trim() === 'cancelled';
  }

  getOrderRowBgClass(status: string): string {
    if (!status) return '';
    const s = status.toLowerCase().trim();
    if (s === 'delivered') {
      return 'bg-emerald-500/10 dark:bg-emerald-950/30 hover:bg-emerald-500/15 border-l-4 border-l-emerald-500';
    }
    if (s === 'shipped') {
      return 'bg-teal-500/10 dark:bg-teal-950/30 hover:bg-teal-500/15 border-l-4 border-l-teal-500';
    }
    if (s === 'packed') {
      return 'bg-purple-500/10 dark:bg-purple-950/30 hover:bg-purple-500/15 border-l-4 border-l-purple-500';
    }
    if (s === 'processing') {
      return 'bg-blue-500/10 dark:bg-blue-950/30 hover:bg-blue-500/15 border-l-4 border-l-blue-500';
    }
    if (s === 'confirmed') {
      return 'bg-indigo-500/10 dark:bg-indigo-950/30 hover:bg-indigo-500/15 border-l-4 border-l-indigo-500';
    }
    if (s === 'pending') {
      return 'bg-amber-500/10 dark:bg-amber-950/30 hover:bg-amber-500/15 border-l-4 border-l-amber-500';
    }
    if (s === 'cancelled') {
      return 'bg-red-50/70 dark:bg-red-950/30 border-l-4 border-l-red-500 opacity-60 grayscale-[30%] hover:opacity-85 transition-all';
    }
    return '';
  }

  exportOrdersCsv() {
    const dataToExport = this.filteredOrders() || [];
    if (dataToExport.length === 0) {
      this.toastService.warning('No matching order records to export.');
      return;
    }

    const headers = ['Order ID', 'Order Number', 'Customer Name', 'Customer Phone', 'Type', 'Financial Status', 'Courier', 'Tracking Number', 'Shipment Date', 'Estimated Delivery', 'Items Count', 'Grand Total (INR)', 'Created At'];
    const rows = dataToExport.map(o => [
      `"${o.id}"`,
      `"${o.orderNumber}"`,
      `"${(o.guestName || o.customerName || '').replace(/"/g, '""')}"`,
      `"${o.guestPhone || o.customerPhone || ''}"`,
      `"${o.customerType || 'REG'}"`,
      `"${o.status}"`,
      `"${o.shipment?.courierDisplayName || o.shipment?.courierPartner || ''}"`,
      `"${o.shipment?.trackingNumber || ''}"`,
      `"${o.shipment?.shipmentDate || ''}"`,
      `"${o.shipment?.estimatedDelivery || o.estimatedDelivery || ''}"`,
      o.items?.length || 0,
      o.grandTotal || 0,
      `"${o.date || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastService.success(`Exported ${dataToExport.length} filtered orders.`);
  }
}
