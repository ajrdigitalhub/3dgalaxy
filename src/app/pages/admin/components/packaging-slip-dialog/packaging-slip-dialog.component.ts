import { Component, ChangeDetectionStrategy, inject, signal, Input, Output, EventEmitter, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PackagingSlipService } from '../../../../services/packaging-slip.service';

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
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 md:p-6 animate-fadeIn font-sans">
      <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        
        <!-- MODAL HEADER BAR -->
        <div class="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between shrink-0 border-b border-zinc-800">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <mat-icon class="text-lg">assignment</mat-icon>
            </div>
            <div>
              <h2 class="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                Packing Slip Live Editor & Preview
              </h2>
              <p class="text-[10px] text-zinc-400 font-mono">Order #{{ orderNumber() }} &middot; Real-time Customization & Dispatch Document</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              (click)="resetToDefaults()"
              class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer border border-zinc-700"
              title="Reset fields to original order data"
            >
              <mat-icon class="text-xs">refresh</mat-icon> Reset
            </button>
            <button
              (click)="printSlip()"
              class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
              title="Print thermal or A4 document"
            >
              <mat-icon class="text-xs">print</mat-icon> Print
            </button>
            <button
              (click)="downloadPdf()"
              class="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase transition-colors flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
            >
              <mat-icon class="text-xs">file_download</mat-icon> Download PDF
            </button>
            <button
              (click)="cancel.emit()"
              class="w-8 h-8 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center border-none bg-transparent cursor-pointer transition-colors ml-2"
            >
              <mat-icon class="text-base">close</mat-icon>
            </button>
          </div>
        </div>

        <!-- MAIN SPLIT CONTENT -->
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-zinc-100 dark:bg-zinc-950">
          
          <!-- LEFT PANEL: EDITABLE CONTROLS (5 COLS) -->
          <div class="lg:col-span-5 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto p-5 space-y-5 text-xs">
            
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
                  <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Tracking Number</label>
                  <input
                    type="text"
                    [(ngModel)]="trackingNumber"
                    class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold text-blue-600"
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
                  <div class="flex items-center gap-2">
                    <span class="text-[9px] font-bold text-zinc-500 uppercase">Shipping ({{ currencySymbol() }}):</span>
                    <input
                      type="number"
                      step="0.01"
                      [(ngModel)]="shippingCost"
                      class="w-20 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-bold"
                    />
                  </div>
                }
              </div>
            </div>

            <!-- SECTION 4: NOTES FROM SENDER & WAREHOUSE -->
            <div class="space-y-3 p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-850">
              <h3 class="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1">
                <mat-icon class="text-xs">notes</mat-icon> Dispatch Notes & Gift Message
              </h3>

              <div>
                <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Notes from the Sender</label>
                <textarea
                  rows="2"
                  [(ngModel)]="notesFromSender"
                  placeholder="e.g. Thank you for your order with 3D Galaxy!"
                  class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs resize-none"
                ></textarea>
              </div>

              <div>
                <label class="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Notes from LisShipment / Warehouse</label>
                <textarea
                  rows="2"
                  [(ngModel)]="notesFromShipping"
                  placeholder="e.g. Fragile 3D printed items. Handle with care."
                  class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs resize-none"
                ></textarea>
              </div>
            </div>

          </div>

          <!-- RIGHT PANEL: LIVE SHEET PREVIEW (7 COLS) -->
          <div class="lg:col-span-7 p-6 overflow-y-auto flex items-start justify-center bg-zinc-200/70 dark:bg-zinc-950/80">
            
            <!-- LIVE SHEET PREVIEW CONTAINER (Matching reference design with zero text overlaps) -->
            <div id="printable-packing-slip-sheet" class="bg-white text-black p-8 shadow-2xl rounded-sm w-full max-w-[650px] font-sans border border-zinc-300 min-h-[750px] space-y-5">
              
              <!-- 1. TOP HEADER BANNER -->
              <div class="flex items-start justify-between">
                <div>
                  <span class="block text-[11px] font-medium text-zinc-600 tracking-wide">EASYID</span>
                  <h1 class="text-2xl font-black text-black tracking-tight leading-none mt-1 font-mono uppercase">
                    {{ easyId() }}
                  </h1>
                </div>

                <!-- Right Brand Logo -->
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 bg-amber-400 rotate-12 rounded-lg flex items-center justify-center shadow-xs">
                    <span class="text-white font-black text-lg -rotate-12">3D</span>
                  </div>
                  <span class="text-lg font-black text-amber-500 tracking-tighter">3D Galaxy</span>
                </div>
              </div>

              <!-- Top Divider -->
              <div class="border-b border-black w-full"></div>

              <!-- Centered Title -->
              <div class="text-center">
                <h2 class="text-xl font-bold text-black tracking-tight">Packing Slip</h2>
              </div>

              <!-- 2. METADATA GRID SECTION (Flexbox layout to prevent address/email overlap) -->
              <div class="grid grid-cols-2 gap-x-6 text-xs text-black leading-snug">
                <!-- Left Grid Block -->
                <div class="flex flex-col gap-2.5">
                  <div class="flex">
                    <span class="font-bold w-16 shrink-0">Date:</span>
                    <span>{{ dateStr() }}</span>
                  </div>
                  <div class="flex items-start">
                    <span class="font-bold w-16 shrink-0">Ship To:</span>
                    <div class="flex-1 font-normal leading-normal text-zinc-900 whitespace-pre-line">
                      <div class="font-bold">{{ shipToName() }}</div>
                      @if (shipToPhone()) {
                        <div class="text-zinc-700 font-medium">Contact: {{ shipToPhone() }}</div>
                      }
                      <div>{{ shipToStreet() }}</div>
                      <div>{{ shipToCityStateZip() }}</div>
                      <div>{{ shipToCountry() }}</div>
                    </div>
                  </div>
                  <div class="flex items-center mt-1">
                    <span class="font-bold w-16 shrink-0">Email:</span>
                    <span class="break-all font-medium text-zinc-800">{{ email() }}</span>
                  </div>
                </div>

                <!-- Right Grid Block -->
                <div class="flex flex-col gap-2.5">
                  <div class="flex">
                    <span class="font-bold w-20 shrink-0">Tracking</span>
                    <span class="font-mono">{{ trackingNumber() }}</span>
                  </div>
                  <div class="flex items-start">
                    <span class="font-bold w-20 shrink-0 leading-tight">Return<br/>Address:</span>
                    <div class="flex-1 whitespace-pre-line text-zinc-800">
                      {{ returnAddress() }}
                    </div>
                  </div>
                  <div class="flex items-center mt-1">
                    <span class="font-bold w-20 shrink-0">Order:</span>
                    <span class="font-bold font-mono">#{{ orderNumber().replace('#', '') }}</span>
                  </div>
                </div>
              </div>

              <!-- 3. LINE ITEMS TABLE (Dynamic heights preventing row/footer overlap) -->
              <div class="pt-2">
                <table class="w-full border-collapse border-y border-black text-xs text-black">
                  <thead>
                    <tr class="border-b border-black">
                      <th class="py-1.5 px-2 text-center font-bold w-12 border-r border-black">Qty</th>
                      <th class="py-1.5 px-2 text-left font-bold w-28 border-r border-black">SKU</th>
                      <th class="py-1.5 px-2 text-left font-bold">Description</th>
                      @if (showPricing()) {
                        <th class="py-1.5 px-2 text-right font-bold w-24 border-l border-black">Price</th>
                        <th class="py-1.5 px-2 text-right font-bold w-24 border-l border-black">Ext. Price</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of items(); track $index) {
                      <tr class="border-b border-dotted border-zinc-400">
                        <td class="py-2.5 px-2 text-center border-r border-black align-top font-bold">{{ item.qty }}</td>
                        <td class="py-2.5 px-2 text-left font-mono border-r border-black align-top break-all max-w-[110px] text-[11px]">{{ item.sku }}</td>
                        <td class="py-2.5 px-2 text-left align-top leading-tight">{{ item.description }}</td>
                        @if (showPricing()) {
                          <td class="py-2.5 px-2 text-right border-l border-black align-top">{{ currencySymbol() }}{{ item.price | number:"1.2-2" }}</td>
                          <td class="py-2.5 px-2 text-right border-l border-black align-top font-bold">{{ currencySymbol() }}{{ item.extPrice | number:"1.2-2" }}</td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>

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
                      <div class="flex justify-between">
                        <span>Shipping Cost</span>
                        <span class="font-bold">{{ currencyCode() }} {{ shippingCost() | number:"1.2-2" }}</span>
                      </div>
                      <div class="flex justify-between text-sm font-bold border-t border-black pt-1">
                        <span>Total</span>
                        <span>{{ currencyCode() }} {{ grandTotal() | number:"1.2-2" }}</span>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Top Divider before Notes -->
              <div class="border-b border-black w-full pt-3"></div>

              <!-- 4. NOTES FROM SENDER -->
              @if (notesFromSender()) {
                <div class="flex items-start gap-6 text-xs text-black">
                  <span class="font-bold w-32 shrink-0 leading-tight">Notes from the<br/>Sender:</span>
                  <div class="whitespace-pre-line flex-1 leading-normal">
                    {{ notesFromSender() }}
                  </div>
                </div>
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
export class PackagingSlipDialogComponent implements OnInit {
  @Input({ required: true }) order: any;
  @Output() cancel = new EventEmitter<void>();

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

  items = signal<SlipLineItem[]>([
    { qty: 1, sku: 'anycubic-water-wash-resin-2-0-1kg-clear', description: 'Anycubic Water-Wash Resin 2.0 1kg (clear)', price: 1999.00, extPrice: 1999.00 },
  ]);

  notesFromSender = signal('Thank you for your order with 3D Galaxy!');
  notesFromShipping = signal('Thanks for ordering our famous boxes!');

  // Computed Totals
  qtyTotal = computed(() => {
    return this.items().reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  });

  subTotal = computed(() => {
    return this.items().reduce((sum, item) => sum + (Number(item.extPrice) || 0), 0);
  });

  grandTotal = computed(() => {
    return this.subTotal() + (Number(this.shippingCost()) || 0);
  });

  ngOnInit() {
    this.resetToDefaults();
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
    this.trackingNumber.set(shipmentObj?.trackingNumber || 'LZ92738101');
    this.shippingCost.set(Number(ord.shippingAmount !== undefined ? ord.shippingAmount : 1.00));

    if (ord.items && ord.items.length > 0) {
      const parsedItems: SlipLineItem[] = ord.items.map((i: any) => {
        const qty = Number(i.quantity || 1);
        const price = Number(i.unitPrice || 1999.00);
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
      items: this.items(),
      notesFromSender: this.notesFromSender(),
      notesFromShipping: this.notesFromShipping(),
    };
  }

  downloadPdf() {
    const payload = this.buildPayload();
    this.packagingSlipService.downloadCustomPackagingSlip(this.order.id, payload, this.orderNumber().replace('#', ''));
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
