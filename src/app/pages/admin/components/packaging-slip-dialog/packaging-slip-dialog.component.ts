import { Component, ChangeDetectionStrategy, inject, signal, Input, Output, EventEmitter, OnInit, OnDestroy, computed, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PackagingSlipService } from '../../../../services/packaging-slip.service';
import { LOGO_DATA_URL } from '../../../../shared/constants/logo.constant';

export interface SlipLineItem {
  qty: number;
  sku: string;
  description: string;
  price: number;
  extPrice: number;
}

@Component({
  selector: 'app-packaging-slip-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      z-index: 9999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      pointer-events: auto !important;
    }
  `],
  template: `
    <!-- Darkened Full-Screen Backdrop -->
    <div class="fixed inset-0 top-0 left-0 w-full h-full bg-black/80 backdrop-blur-md z-[9999998]" (click)="cancel.emit()"></div>

    <!-- Centered Fixed Modal Box -->
    <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-6xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden z-[9999999] font-sans animate-fadeIn">
        
        <!-- MODAL HEADER BAR -->
        <div class="px-3 sm:px-6 py-3 sm:py-4 bg-zinc-900 text-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 border-b border-zinc-800">
          <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div class="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <mat-icon class="text-base sm:text-lg">assignment</mat-icon>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-xs sm:text-sm font-black uppercase tracking-tight flex items-center gap-1.5 truncate">
                Packing Slip Live Editor & Preview
              </h2>
              <p class="text-[9px] sm:text-[10px] text-zinc-400 font-mono truncate">Order #{{ orderNumber() }} &middot; Dispatch Document</p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            <button
              (click)="resetToDefaults()"
              class="px-2.5 sm:px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer border border-zinc-700"
              title="Reset fields to original order data"
            >
              <mat-icon class="text-xs">refresh</mat-icon> <span class="hidden sm:inline">Reset</span>
            </button>
            <button
              (click)="printSlip()"
              class="px-2.5 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer border-none shadow-sm"
              title="Print thermal or A4 document"
            >
              <mat-icon class="text-xs">print</mat-icon> <span class="hidden sm:inline">Print</span>
            </button>
            <button
              (click)="downloadPdf()"
              class="px-2.5 sm:px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase transition-colors flex items-center gap-1 cursor-pointer border-none shadow-sm"
            >
              <mat-icon class="text-xs">file_download</mat-icon> <span class="hidden sm:inline">Download PDF</span><span class="sm:hidden">PDF</span>
            </button>
            <button
              (click)="cancel.emit()"
              class="w-7 sm:w-8 h-7 sm:h-8 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center border-none bg-transparent cursor-pointer transition-colors ml-1 sm:ml-2"
            >
              <mat-icon class="text-base">close</mat-icon>
            </button>
          </div>
        </div>

        <!-- MAIN SPLIT CONTENT -->
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden bg-zinc-100 dark:bg-zinc-950">
          
          <!-- LEFT PANEL: EDITABLE CONTROLS (5 COLS) -->
          <div class="lg:col-span-5 bg-white dark:bg-zinc-900 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-5 text-xs">
            
            <!-- SECTION 1: HEADER & IDENTIFIERS -->
            <div class="space-y-3 p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-850">
              <h3 class="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1">
                <mat-icon class="text-xs">badge</mat-icon> Header & Identifiers
              </h3>
              
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">EASYID / Barcode Text</label>
                  <input
                    type="text"
                    [(ngModel)]="easyId"
                    class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Order #</label>
                  <input
                    type="text"
                    [(ngModel)]="orderNumber"
                    class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Slip Date</label>
                  <input
                    type="text"
                    [(ngModel)]="dateStr"
                    class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-[9px] font-bold text-zinc-500 uppercase">Tracking Number</label>
                    @if (isShipped()) {
                      <span class="text-[8px] font-extrabold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                        <mat-icon class="scale-50 text-[12px] -mr-1">lock</mat-icon> Locked (Shipped)
                      </span>
                    }
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="trackingNumber"
                    [readonly]="isShipped()"
                    [disabled]="isShipped()"
                    [class.opacity-60]="isShipped()"
                    [class.cursor-not-allowed]="isShipped()"
                    class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold text-blue-600 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-500"
                  />
                </div>
              </div>
            </div>

            <!-- SECTION 2: SHIP TO ADDRESS & EMAIL -->
            <div class="space-y-3 p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-850">
              <h3 class="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1">
                <mat-icon class="text-xs">place</mat-icon> Ship To & Destination
              </h3>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Recipient Name</label>
                  <input
                    type="text"
                    [(ngModel)]="shipToName"
                    class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    [(ngModel)]="shipToPhone"
                    class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Street Address</label>
                  <input
                    type="text"
                    [(ngModel)]="shipToStreet"
                    class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">City, State, Zip</label>
                  <input
                    type="text"
                    [(ngModel)]="shipToCityStateZip"
                    class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Country</label>
                  <input
                    type="text"
                    [(ngModel)]="shipToCountry"
                    class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Email Address</label>
                  <input
                    type="text"
                    [(ngModel)]="email"
                    class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Return Address (Sender)</label>
                <textarea
                  rows="2"
                  [(ngModel)]="returnAddress"
                  class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs resize-none"
                ></textarea>
              </div>
            </div>

            <!-- SECTION 3: LINE ITEMS & PRICING OPTION -->
            <div class="space-y-3 p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-850">
              <div class="flex items-center justify-between">
                <h3 class="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1">
                  <mat-icon class="text-xs">shopping_bag</mat-icon> Manifest Line Items
                </h3>
                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                    <input type="checkbox" [(ngModel)]="showPricing" class="rounded accent-amber-500 cursor-pointer" />
                    <span>Show Prices</span>
                  </label>
                  <select
                    [value]="currencySymbol()"
                    (change)="onCurrencyChange($any($event.target).value)"
                    class="px-2 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-[10px] font-bold"
                  >
                    <option value="₹">₹ (INR)</option>
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                  </select>
                </div>
              </div>

              <div class="space-y-2">
                @for (item of items(); track $index) {
                  <div class="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5 relative">
                    <div class="grid grid-cols-12 gap-2 items-center">
                      <div class="col-span-2">
                        <label class="block text-[8px] font-bold text-zinc-400 uppercase">Qty</label>
                        <input
                          type="number"
                          min="1"
                          [(ngModel)]="item.qty"
                          (ngModelChange)="recalculateItemTotal(item)"
                          class="w-full px-1.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-center text-xs font-bold"
                        />
                      </div>
                      <div class="col-span-3">
                        <label class="block text-[8px] font-bold text-zinc-400 uppercase">SKU</label>
                        <input
                          type="text"
                          [(ngModel)]="item.sku"
                          class="w-full px-1.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono font-bold"
                        />
                      </div>
                      <div class="col-span-6">
                        <label class="block text-[8px] font-bold text-zinc-400 uppercase">Description</label>
                        <input
                          type="text"
                          [(ngModel)]="item.description"
                          class="w-full px-1.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-xs"
                        />
                      </div>
                      <div class="col-span-1 text-right pt-3">
                        <button
                          (click)="removeItem($index)"
                          class="text-rose-500 hover:text-rose-700 bg-transparent border-none cursor-pointer"
                          title="Remove item"
                        >
                          <mat-icon class="text-sm scale-90">delete</mat-icon>
                        </button>
                      </div>
                    </div>

                    @if (showPricing()) {
                      <div class="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <div>
                          <label class="block text-[8px] font-bold text-zinc-400 uppercase">Unit Price ({{ currencySymbol() }})</label>
                          <input
                            type="number"
                            step="0.01"
                            [(ngModel)]="item.price"
                            (ngModelChange)="recalculateItemTotal(item)"
                            class="w-full px-1.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label class="block text-[8px] font-bold text-zinc-400 uppercase">Ext. Price ({{ currencySymbol() }})</label>
                          <input
                            type="number"
                            step="0.01"
                            [(ngModel)]="item.extPrice"
                            class="w-full px-1.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-bold text-emerald-600"
                          />
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="flex items-center justify-between pt-1">
                <button
                  (click)="addItem()"
                  class="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer border-none"
                >
                  <mat-icon class="text-xs">add</mat-icon> Add Line Item
                </button>
                @if (showPricing()) {
                  <div class="flex items-center gap-2 flex-wrap">
                    <div class="flex items-center gap-1">
                      <span class="text-[9px] font-bold text-zinc-500 uppercase">Ship:</span>
                      <input
                        type="number"
                        step="0.01"
                        [(ngModel)]="shippingCost"
                        class="w-16 px-1.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-bold"
                      />
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase">COD:</span>
                      <input
                        type="number"
                        step="0.01"
                        [(ngModel)]="codCharge"
                        class="w-16 px-1.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-bold"
                      />
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="text-[9px] font-bold text-emerald-600 uppercase">Disc:</span>
                      <input
                        type="number"
                        step="0.01"
                        [(ngModel)]="discountAmount"
                        class="w-16 px-1.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-bold"
                      />
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- SECTION 4: NOTES -->
            <div class="space-y-3 p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-850">
              <h3 class="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1">
                <mat-icon class="text-xs">sticky_note_2</mat-icon> Notes & Remarks
              </h3>

              <div>
                <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Notes from Sender</label>
                <textarea
                  rows="2"
                  [(ngModel)]="notesFromSender"
                  class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs resize-none"
                ></textarea>
              </div>

              <div>
                <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Notes from LisShipment</label>
                <textarea
                  rows="2"
                  [(ngModel)]="notesFromShipping"
                  class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs resize-none"
                ></textarea>
              </div>
            </div>

          </div>

          <!-- RIGHT PANEL: LIVE HIGH-FIDELITY PREVIEW (7 COLS) -->
          <div class="lg:col-span-7 bg-zinc-200 dark:bg-zinc-950 overflow-y-auto p-2.5 sm:p-6 flex flex-col items-center justify-start max-w-full">
            
            <!-- PRINTABLE A4 PACKING SLIP SHEET -->
            <div id="printable-packing-slip-sheet" class="bg-white text-black p-4 sm:p-8 rounded-none shadow-xl w-full max-w-[650px] font-sans border border-zinc-300 min-h-[auto] sm:min-h-[920px] flex flex-col justify-between overflow-hidden">
              
              <div class="space-y-4 sm:space-y-5">
                <!-- 1. HEADER ROW -->
                <div class="flex items-center justify-between pb-3 border-b-2 border-black">
                  <div>
                    <span class="block text-[10px] sm:text-[11px] font-bold text-zinc-600 uppercase tracking-wider">EASYID</span>
                    <h1 class="text-xl sm:text-2xl font-black text-black tracking-tight mt-0.5 font-mono uppercase leading-none">
                      {{ easyId() }}
                    </h1>
                  </div>
                  <div class="flex items-center justify-end">
                    <img [src]="logoUrl" alt="3D Galaxy Logo" class="h-8 sm:h-10 w-auto object-contain" />
                  </div>
                </div>

                <div class="text-center py-1">
                  <h2 class="text-lg sm:text-xl font-bold text-black tracking-tight">Packing Slip</h2>
                </div>

                <!-- 2. ORDER META & ADDRESS GRID -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 text-xs text-black leading-relaxed">
                  <div class="space-y-2">
                    <div class="flex items-center">
                      <span class="font-bold w-16 sm:w-20 shrink-0">Date:</span>
                      <span>{{ dateStr() }}</span>
                    </div>
                    <div class="flex items-start">
                      <span class="font-bold w-16 sm:w-20 shrink-0">Ship To:</span>
                      <div class="whitespace-pre-line text-zinc-900">
                        <div class="font-bold">{{ shipToName() }}</div>
                        @if (shipToPhone()) {
                          <div class="text-zinc-700 font-medium">Contact: {{ shipToPhone() }}</div>
                        }
                        <div>{{ shipToStreet() }}</div>
                        <div>{{ shipToCityStateZip() }}</div>
                        <div>{{ shipToCountry() }}</div>
                      </div>
                    </div>
                    <div class="flex items-center">
                      <span class="font-bold w-16 sm:w-20 shrink-0">Email:</span>
                      <span class="break-all font-medium text-zinc-800">{{ email() }}</span>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <div class="flex items-center">
                      <span class="font-bold w-16 sm:w-24 shrink-0">Tracking:</span>
                      <span class="font-mono break-all">{{ trackingNumber() }}</span>
                    </div>
                    <div class="flex items-start">
                      <span class="font-bold w-16 sm:w-24 shrink-0 leading-tight">Return<br class="hidden sm:inline"/> Address:</span>
                      <div class="whitespace-pre-line text-zinc-800">
                        {{ returnAddress() }}
                      </div>
                    </div>
                    <div class="flex items-center">
                      <span class="font-bold w-16 sm:w-24 shrink-0">Order:</span>
                      <span class="font-bold font-mono">{{ orderNumber() }}</span>
                    </div>
                  </div>
                </div>

                <!-- 3. LINE ITEMS TABLE -->
                <div class="pt-2">
                  <div class="w-full max-w-full overflow-x-auto pb-1 no-scrollbar">
                    <table class="w-full border-collapse border border-black text-xs text-black">
                    <thead>
                      <tr class="border-b border-black bg-zinc-50">
                        <th class="py-1.5 px-2 text-center font-bold w-12 border-r border-black">Qty</th>
                        <th class="py-1.5 px-2 text-left font-bold w-28 border-r border-black">SKU</th>
                        <th class="py-1.5 px-2 text-left font-bold border-r border-black">Description</th>
                        @if (showPricing()) {
                          <th class="py-1.5 px-2 text-right font-bold w-24 border-r border-black">Price</th>
                          <th class="py-1.5 px-2 text-right font-bold w-24">Ext. Price</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of items(); track $index) {
                        <tr class="border-b border-black">
                          <td class="py-2.5 px-2 text-center border-r border-black align-top font-bold">{{ item.qty }}</td>
                          <td class="py-2.5 px-2 text-left font-mono border-r border-black align-top break-all max-w-[110px] text-[11px]">{{ item.sku }}</td>
                          <td class="py-2.5 px-2 text-left border-r border-black align-top leading-tight">{{ item.description }}</td>
                          @if (showPricing()) {
                            <td class="py-2.5 px-2 text-right border-r border-black align-top">{{ currencySymbol() }}{{ item.price | number:"1.2-2" }}</td>
                            <td class="py-2.5 px-2 text-right align-top font-bold">{{ currencySymbol() }}{{ item.extPrice | number:"1.2-2" }}</td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                  </div>

                  <!-- Table Totals Row -->
                  <div class="pt-3 flex items-start justify-between text-xs text-black font-semibold">
                    <div>
                      <span class="font-bold">Qty Total: {{ qtyTotal() }}</span>
                    </div>

                    @if (showPricing()) {
                      <div class="text-right space-y-1 w-64">
                        <div class="flex justify-between">
                          <span>Sub Total</span>
                          <span class="font-bold">{{ currencyCode() }} {{ subTotal() | number:"1.2-2" }}</span>
                        </div>
                        @if (shippingCost() > 0 || (codCharge() === 0 && taxAmount() === 0 && discountAmount() === 0)) {
                          <div class="flex justify-between">
                            <span>Shipping Cost</span>
                            <span class="font-bold">{{ currencyCode() }} {{ shippingCost() | number:"1.2-2" }}</span>
                          </div>
                        }
                        @if (codCharge() > 0) {
                          <div class="flex justify-between text-amber-800">
                            <span>COD Handling Charge</span>
                            <span class="font-bold">{{ currencyCode() }} {{ codCharge() | number:"1.2-2" }}</span>
                          </div>
                        }
                        @if (taxAmount() > 0) {
                          <div class="flex justify-between">
                            <span>Tax</span>
                            <span class="font-bold">{{ currencyCode() }} {{ taxAmount() | number:"1.2-2" }}</span>
                          </div>
                        }
                        @if (discountAmount() > 0) {
                          <div class="flex justify-between text-emerald-800">
                            <span>Discount</span>
                            <span class="font-bold">-{{ currencyCode() }} {{ discountAmount() | number:"1.2-2" }}</span>
                          </div>
                        }
                        <div class="flex justify-between text-sm font-bold border-t border-black pt-1">
                          <span>Total</span>
                          <span>{{ currencyCode() }} {{ grandTotal() | number:"1.2-2" }}</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <!-- FOOTER SECTION (PUSHED TO BOTTOM) -->
              <div class="mt-auto pt-6 space-y-3">
                <!-- Top Divider before Notes -->
                <div class="border-b-2 border-black w-full"></div>

                <!-- 4. NOTES FROM SENDER -->
                @if (notesFromSender()) {
                  <div class="flex items-start gap-6 text-xs text-black">
                    <span class="font-bold w-32 shrink-0 leading-tight">Notes from the<br/>Sender:</span>
                    <div class="whitespace-pre-line flex-1 leading-normal">
                      {{ notesFromSender() }}
                    </div>
                  </div>
                }

                @if (notesFromSender() && notesFromShipping()) {
                  <div class="border-b border-zinc-400 border-dotted w-full"></div>
                }

                <!-- 5. NOTES FROM LISSHIPMENT -->
                @if (notesFromShipping()) {
                  <div class="flex items-start gap-6 text-xs text-black">
                    <span class="font-bold w-32 shrink-0 leading-tight">Notes from<br/>LisShipment:</span>
                    <div class="whitespace-pre-line flex-1 leading-normal">
                      {{ notesFromShipping() }}
                    </div>
                  </div>
                }
              </div>

            </div>

          </div>

        </div>

      </div>
  `
})
export class PackagingSlipDialogComponent implements OnInit, OnDestroy {
  @Input({ required: true }) order: any;
  @Output() cancel = new EventEmitter<void>();

  logoUrl = LOGO_DATA_URL;
  private packagingSlipService = inject(PackagingSlipService);

  // Form State Signals
  easyId = signal('ESUS2026217234');
  orderNumber = signal('#ORD-2026-217234');
  dateStr = signal('August 7, 2026');
  trackingNumber = signal('LZ92738101');

  shipToName = signal('admin123 R');
  shipToPhone = signal('8870107785');
  shipToStreet = signal('office | 8 8 8, Mettu Street, pathirapuliyur village');
  shipToCityStateZip = signal('tindivanam, Tamil Nadu - 604304');
  shipToCountry = signal('India');
  email = signal('admin123@gmail.com');
  returnAddress = signal('3D Galaxy Labs India\n123 Tech Park, Electronic City\nBangalore, KA 560100, India');

  currencySymbol = signal('₹');
  currencyCode = signal('INR');

  showPricing = signal(true);
  shippingCost = signal(1.00);
  codCharge = signal(0);
  taxAmount = signal(0);
  discountAmount = signal(0);

  items = signal<SlipLineItem[]>([
    { qty: 1, sku: 'anycubic-water-wash-resin-2-0-1kg-clear', description: 'Anycubic Water-Wash Resin 2.0 1kg (clear)', price: 1999.00, extPrice: 1999.00 },
  ]);

  notesFromSender = signal('Thank you for your order with 3D Galaxy!');
  notesFromShipping = signal('Thanks for ordering our famous boxes!');

  // Computed Totals
  isShipped = computed(() => {
    const status = (this.order?.status || '').toLowerCase();
    const hasShipment = !!(this.order?.shipments && this.order.shipments.length > 0 && this.order.shipments[0]?.trackingNumber);
    const hasShipmentObj = !!(this.order?.shipment && this.order.shipment?.trackingNumber);
    return status === 'shipped' || status === 'delivered' || status === 'out for delivery' || hasShipment || hasShipmentObj;
  });

  qtyTotal = computed(() => {
    return this.items().reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  });

  subTotal = computed(() => {
    return this.items().reduce((sum, item) => sum + (Number(item.extPrice) || 0), 0);
  });

  grandTotal = computed(() => {
    const sub = this.subTotal();
    const ship = Number(this.shippingCost()) || 0;
    const cod = Number(this.codCharge()) || 0;
    const tax = Number(this.taxAmount()) || 0;
    const disc = Number(this.discountAmount()) || 0;
    return Math.max(0, sub + ship + cod + tax - disc);
  });


  private elRef = inject(ElementRef);

  ngOnInit() {
    if (typeof document !== 'undefined' && this.elRef?.nativeElement) {
      if (this.elRef.nativeElement.parentNode !== document.body) {
        document.body.appendChild(this.elRef.nativeElement);
      }
      document.body.classList.add('overflow-hidden');
    }
    this.resetToDefaults();
  }

  ngOnDestroy() {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('overflow-hidden');
      if (this.elRef?.nativeElement && this.elRef.nativeElement.parentNode === document.body) {
        document.body.removeChild(this.elRef.nativeElement);
      }
    }
  }

  onCurrencyChange(symbol: string) {
    this.currencySymbol.set(symbol);
    if (symbol === '₹') this.currencyCode.set('INR');
    else if (symbol === '$') this.currencyCode.set('USD');
    else if (symbol === '€') this.currencyCode.set('EUR');
    else if (symbol === '£') this.currencyCode.set('GBP');
  }

  resetToDefaults() {
    if (!this.order) return;

    const ord = this.order;
    const ordNum = ord.orderNumber || ord.id || '2026-217234';
    this.orderNumber.set(`#${ordNum.replace(/^#/, '')}`);

    const digitsOnly = ordNum.replace(/[^0-9]/g, '');
    this.easyId.set(`ESUS${digitsOnly || '2026217234'}`);

    if (ord.createdAt) {
      this.dateStr.set(new Date(ord.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
    } else {
      this.dateStr.set(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
    }

    let addr: any = ord.shippingAddress || {};
    if (typeof ord.shippingAddress === 'string') {
      try { addr = JSON.parse(ord.shippingAddress); } catch (e) {}
    }

    this.shipToName.set(addr.name || [ord.customer?.user?.firstName, ord.customer?.user?.lastName].filter(Boolean).join(' ') || ord.customerName || 'Valued Customer');
    this.shipToPhone.set(addr.phone || ord.customer?.phone || ord.customer?.user?.mobile || '');
    this.shipToStreet.set([addr.addressLine1 || addr.street, addr.addressLine2, addr.landmark].filter(Boolean).join(', ') || 'office | 8 8 8, Mettu Street');
    this.shipToCityStateZip.set([addr.city, addr.state, addr.postalCode || addr.pincode].filter(Boolean).join(', ') || 'tindivanam, Tamil Nadu - 604304');
    this.shipToCountry.set(addr.country || 'India');
    this.email.set(addr.email || ord.customer?.user?.email || ord.customerEmail || 'customer@example.com');

    const shipmentObj = (ord.shipments && ord.shipments.length > 0) ? ord.shipments[0] : (typeof ord.shipment === 'object' ? ord.shipment : null);
    this.trackingNumber.set(shipmentObj?.trackingNumber || ord.trackingNumber || (this.isShipped() ? 'N/A' : ''));
    
    const shipAmt = ord.shippingAmount !== undefined && ord.shippingAmount !== null ? Number(ord.shippingAmount) : 0;
    this.shippingCost.set(shipAmt);

    let cod = 0;
    if (ord.codCharge !== undefined && ord.codCharge !== null && Number(ord.codCharge) > 0) {
      cod = Number(ord.codCharge);
    } else if (ord.paymentMethod === 'COD' || ord.paymentMethod === 'cash_on_delivery') {
      cod = 100;
    }
    this.codCharge.set(cod);

    this.taxAmount.set(Number(ord.taxAmount || 0));
    this.discountAmount.set(Number(ord.discountAmount || 0));

    if (ord.items && ord.items.length > 0) {
      const parsedItems: SlipLineItem[] = ord.items.map((i: any) => {
        const qty = Number(i.quantity || 1);
        const price = Number(i.unitPrice || i.price || 1999.00);
        let varText = i.variant?.name ? ` (${i.variant.name})` : '';
        return {
          qty,
          sku: i.variant?.sku || i.product?.sku || 'anycubic-water-wash-resin-2-0-1kg-clear',
          description: `${i.product?.name || i.name || 'Item'}${varText}`,
          price,
          extPrice: Number(i.totalPrice || (price * qty)),
        };
      });
      this.items.set(parsedItems);
    } else {
      this.items.set([
        { qty: 1, sku: 'anycubic-water-wash-resin-2-0-1kg-clear', description: 'Anycubic Water-Wash Resin 2.0 1kg (clear)', price: 1999.00, extPrice: 1999.00 },
      ]);
    }

    this.notesFromSender.set(ord.notes ? `Note: "${ord.notes}"` : 'Thank you for your order with 3D Galaxy!');
    this.notesFromShipping.set(shipmentObj?.shippingNotes ? shipmentObj.shippingNotes : 'Thanks for ordering our famous boxes!');
  }

  recalculateItemTotal(item: SlipLineItem) {
    item.extPrice = Number((Number(item.qty || 1) * Number(item.price || 0)).toFixed(2));
    this.items.set([...this.items()]);
  }

  addItem() {
    this.items.update(list => [
      ...list,
      { qty: 1, sku: `SKU-00${list.length + 1}`, description: 'New Product Item', price: 999.00, extPrice: 999.00 }
    ]);
  }

  removeItem(index: number) {
    this.items.update(list => list.filter((_, i) => i !== index));
  }

  buildPayload() {
    return {
      easyId: this.easyId(),
      orderNumber: this.orderNumber(),
      dateStr: this.dateStr(),
      trackingNumber: this.trackingNumber(),
      shipToName: this.shipToName(),
      shipToPhone: this.shipToPhone(),
      shipToStreet: this.shipToStreet(),
      shipToCityStateZip: this.shipToCityStateZip(),
      shipToCountry: this.shipToCountry(),
      email: this.email(),
      returnAddress: this.returnAddress(),
      currencySymbol: this.currencySymbol(),
      currencyCode: this.currencyCode(),
      showPricing: this.showPricing(),
      shippingCost: this.shippingCost(),
      codCharge: this.codCharge(),
      taxAmount: this.taxAmount(),
      discountAmount: this.discountAmount(),
      grandTotal: this.grandTotal(),
      items: this.items(),
      notesFromSender: this.notesFromSender(),
      notesFromShipping: this.notesFromShipping(),
    };
  }

  async downloadPdf() {
    const payload = this.buildPayload();
    const targetId = this.order?.id || this.orderNumber()?.replace('#', '') || 'slip';
    const printElement = document.getElementById('printable-packing-slip-sheet');
    
    if (printElement) {
      try {
        if (typeof (window as any).html2pdf === 'undefined') {
          await this.loadHtml2PdfScript();
        }
        if (typeof (window as any).html2pdf !== 'undefined') {
          const filename = `PackingSlip-${this.orderNumber().replace('#', '')}.pdf`;
          const opt = {
            margin: [6, 6, 6, 6],
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          await (window as any).html2pdf().set(opt).from(printElement).save();
          return;
        }
      } catch (err) {
        console.warn('[PackagingSlip] Client HTML2PDF generation failed, falling back to server backend:', err);
      }
    }

    // Fallback: Backend PDF generation service
    this.packagingSlipService.downloadCustomPackagingSlip(targetId, payload, this.orderNumber()?.replace('#', ''));
  }

  private loadHtml2PdfScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).html2pdf) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }

  printSlip() {
    const printElement = document.getElementById('printable-packing-slip-sheet');
    if (!printElement) return;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Packing Slip - ${this.orderNumber()}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 0; background: #fff; }
              #printable-packing-slip-sheet { border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 20px !important; }
            }
          </style>
        </head>
        <body class="bg-white p-6">
          ${printElement.outerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
