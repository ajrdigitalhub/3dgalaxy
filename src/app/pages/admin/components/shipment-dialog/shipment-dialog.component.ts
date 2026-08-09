import { Component, ChangeDetectionStrategy, inject, signal, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TrackingService, CourierPartnerConfig } from '../../../../core/services/tracking.service';

export interface ShipmentDetailsPayload {
  courierPartner: string;
  courierName?: string;
  courierDisplayName: string;
  trackingNumber: string;
  trackingUrl: string;
  estimatedDelivery: string;
  shipmentDate: string;
  dispatchLocation?: string;
  shippingNotes?: string;
  awbNumber?: string;
}

@Component({
  selector: 'app-shipment-dialog',
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
    <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-lg w-[calc(100%-2rem)] sm:w-full max-h-[85vh] flex flex-col overflow-hidden z-[9999999] font-sans animate-fadeIn">
        
        <!-- Header -->
        <div class="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <mat-icon class="text-xl">local_shipping</mat-icon>
            </div>
            <div>
              <h2 class="text-base font-black uppercase tracking-tight flex items-center gap-2">
                📦 Ship Order
              </h2>
              <p class="text-[10px] text-blue-100 font-medium">Order #{{ orderNumber }} &middot; Logistical Carrier & Tracking Details</p>
            </div>
          </div>
          <button (click)="cancel.emit()" class="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center border-none bg-transparent text-white cursor-pointer transition-colors">
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>

        <!-- Body Form -->
        <div #scrollContainer class="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          <!-- Courier Partner Dropdown -->
          <div class="space-y-1">
            <label class="block text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400">
              Courier Partner <span class="text-rose-500">*</span>
            </label>
            <select
              [value]="selectedCourierId()"
              (change)="onCourierChange($any($event.target).value)"
              class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              @for (c of courierList(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </div>

          <!-- Conditional Courier Name when Courier = Others -->
          @if (isOthersSelected()) {
            <div class="space-y-1 animate-fadeIn">
              <label class="block text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400">
                Courier Name <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                [(ngModel)]="customCourierName"
                (ngModelChange)="updateTrackingUrl()"
                placeholder="Enter custom courier name (e.g., SafeExpress, Local Rider)"
                class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-semibold text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
          }

          <!-- Tracking Number / AWB Number -->
          <div class="space-y-1">
            <label class="block text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400">
              Tracking / AWB Number <span class="text-rose-500">*</span>
            </label>
            <div class="relative">
              <input
                type="text"
                [(ngModel)]="trackingNumber"
                (ngModelChange)="onTrackingNumberChange($event)"
                placeholder="Enter Tracking / AWB Number (e.g. DLV4587458963)"
                class="w-full px-3.5 py-2.5 pl-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-all"
              />
              <mat-icon class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">qr_code_scanner</mat-icon>
            </div>
          </div>

          <!-- Auto-Generated Tracking URL -->
          <div class="space-y-1">
            <div class="flex justify-between items-center">
              <label class="block text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400">
                Tracking URL <span class="text-rose-500">*</span>
              </label>
              <span class="text-[9px] font-bold text-blue-500 uppercase flex items-center gap-1">
                <mat-icon class="text-xs scale-75">auto_awesome</mat-icon> Auto-Generated
              </span>
            </div>
            <div class="relative">
              <input
                type="text"
                [(ngModel)]="trackingUrl"
                [readonly]="!isOthersSelected()"
                placeholder="Tracking URL will generate automatically..."
                class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-[11px] font-semibold text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                [class.bg-zinc-100]="!isOthersSelected()"
                [class.dark:bg-zinc-900]="!isOthersSelected()"
              />
            </div>
          </div>

          <!-- Estimated Delivery & Shipment Date (2 Columns) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Estimated Delivery -->
            <div class="space-y-1">
              <label class="block text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400">
                Estimated Delivery <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                [(ngModel)]="estimatedDelivery"
                placeholder="e.g. 09 Aug 2026 – 10 Aug 2026"
                class="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-semibold text-emerald-600 dark:text-emerald-400 outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <!-- Shipment Date -->
            <div class="space-y-1">
              <label class="block text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400">
                Shipment Date <span class="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                [(ngModel)]="shipmentDate"
                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-semibold text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <!-- Shipping Notes -->
          <div class="space-y-1">
            <label class="block text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400">
              Shipping Notes (Optional)
            </label>
            <textarea
              [(ngModel)]="shippingNotes"
              rows="2"
              placeholder="e.g. Packed carefully. Fragile 3D print model inside."
              class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-medium text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-all resize-none"
            ></textarea>
          </div>

          <!-- Validation Error Banner -->
          @if (validationError()) {
            <div class="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-[11px] font-bold flex items-center gap-2 animate-fadeIn">
              <mat-icon class="text-base">error_outline</mat-icon>
              <span>{{ validationError() }}</span>
            </div>
          }

        </div>

        <!-- Footer Actions -->
        <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-end items-center gap-3 shrink-0">
          <button
            (click)="cancel.emit()"
            class="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            (click)="submitForm()"
            [disabled]="isSubmitting()"
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-[10px] tracking-wider transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            @if (isSubmitting()) {
              <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            } @else {
              <mat-icon class="text-sm">send</mat-icon>
            }
            <span>Save & Ship Order 🚀</span>
          </button>
        </div>

      </div>
  `
})
export class ShipmentDialogComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input({ required: true }) orderNumber!: string;
  @Input() orderItems: any[] = [];
  @Input() customCourierSettings: any[] = [];
  
  @Output() saveShipment = new EventEmitter<ShipmentDetailsPayload>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

  private trackingService = inject(TrackingService);

  courierList = signal<CourierPartnerConfig[]>([]);
  selectedCourierId = signal<string>('delhivery');
  
  customCourierName = '';
  trackingNumber = '';
  trackingUrl = '';
  estimatedDelivery = '';
  shipmentDate = '';
  shippingNotes = '';

  validationError = signal<string>('');
  isSubmitting = signal<boolean>(false);

  private elRef = inject(ElementRef);

  ngOnInit() {
    if (typeof document !== 'undefined' && this.elRef?.nativeElement) {
      if (this.elRef.nativeElement.parentNode !== document.body) {
        document.body.appendChild(this.elRef.nativeElement);
      }
      document.body.classList.add('overflow-hidden');
    }

    const list = this.trackingService.getCourierList(this.customCourierSettings);
    this.courierList.set(list);

    // Set initial shipment date to now (formatted for datetime-local input)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    this.shipmentDate = now.toISOString().slice(0, 16);

    // Auto-calculate estimated delivery from items
    const calc = this.trackingService.calculateEstimatedDelivery(this.orderItems, new Date());
    this.estimatedDelivery = calc.formattedRange;

    // Auto-select Delhivery by default if present
    const delhivery = list.find(c => c.id === 'delhivery');
    if (delhivery) {
      this.selectedCourierId.set('delhivery');
    }
  }

  ngOnDestroy() {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('overflow-hidden');
      if (this.elRef?.nativeElement && this.elRef.nativeElement.parentNode === document.body) {
        document.body.removeChild(this.elRef.nativeElement);
      }
    }
  }

  ngAfterViewInit() {
    if (this.scrollContainer?.nativeElement) {
      this.scrollContainer.nativeElement.scrollTop = 0;
    }
  }

  isOthersSelected(): boolean {
    const selected = this.courierList().find(c => c.id === this.selectedCourierId());
    return selected?.name?.toLowerCase() === 'others' || this.selectedCourierId() === 'others';
  }

  onCourierChange(val: string) {
    this.selectedCourierId.set(val);
    this.updateTrackingUrl();
  }

  onTrackingNumberChange(val: string) {
    this.trackingNumber = val;
    this.updateTrackingUrl();
  }

  updateTrackingUrl() {
    const selected = this.courierList().find(c => c.id === this.selectedCourierId());
    const partnerName = this.isOthersSelected() ? (this.customCourierName || 'Others') : (selected?.name || 'Delhivery Courier');
    
    if (this.isOthersSelected()) {
      if (!this.trackingUrl || this.trackingUrl.includes('delhivery') || this.trackingUrl.includes('bluedart')) {
        this.trackingUrl = this.trackingNumber.startsWith('http') ? this.trackingNumber : `https://www.google.com/search?q=${encodeURIComponent(partnerName + ' tracking ' + this.trackingNumber)}`;
      }
    } else {
      this.trackingUrl = this.trackingService.generateTrackingUrl(partnerName, this.trackingNumber, selected?.urlPattern, this.customCourierSettings);
    }
  }

  submitForm() {
    this.validationError.set('');

    const selected = this.courierList().find(c => c.id === this.selectedCourierId());
    let partnerName = selected?.name || 'Delhivery Courier';
    let displayName = partnerName;

    if (this.isOthersSelected()) {
      partnerName = 'Others';
      displayName = this.customCourierName.trim() || 'Custom Courier';
      if (!this.customCourierName.trim()) {
        this.validationError.set('Please enter the Courier Name when Others is selected.');
        return;
      }
    }

    if (!this.trackingNumber.trim()) {
      this.validationError.set('Tracking / AWB Number is required.');
      return;
    }

    if (!this.trackingUrl.trim()) {
      this.validationError.set('Tracking URL is required.');
      return;
    }

    if (!this.estimatedDelivery.trim()) {
      this.validationError.set('Estimated Delivery date range is required.');
      return;
    }

    this.isSubmitting.set(true);

    const payload: ShipmentDetailsPayload = {
      courierPartner: partnerName,
      courierName: this.customCourierName.trim(),
      courierDisplayName: displayName,
      trackingNumber: this.trackingNumber.trim(),
      trackingUrl: this.trackingUrl.trim(),
      estimatedDelivery: this.estimatedDelivery.trim(),
      shipmentDate: this.shipmentDate ? new Date(this.shipmentDate).toISOString() : new Date().toISOString(),
      shippingNotes: this.shippingNotes.trim(),
      awbNumber: this.trackingNumber.trim()
    };

    this.saveShipment.emit(payload);
  }
}
