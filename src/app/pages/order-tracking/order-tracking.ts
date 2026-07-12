import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { AppButton } from '../../shared/components/app-button/app-button';

@Component({
  selector: 'app-order-tracking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, AppButton],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- Back Arrow -->
      <div class="mb-8 cursor-pointer w-max" (click)="router.navigate(['/'])">
        <mat-icon class="align-middle pr-2">arrow_back</mat-icon>
        <span class="font-bold text-sm">Back to home</span>
      </div>

      <!-- Heading -->
      <div class="text-center md:text-left mb-10">
        <h1 class="text-3xl font-black uppercase tracking-tight text-neutral-900 dark:text-white">Order Tracking</h1>
        <p class="text-sm font-semibold text-neutral-500 mt-1">Check the status of your guest or registered galaxy purchase</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Search Controls -->
        <div class="lg:col-span-5 bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-[2rem] border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
          <h2 class="text-sm font-black uppercase tracking-widest text-[#d65108]">Track Order</h2>
          
          <div class="space-y-4">
            <div class="space-y-2">
              <label class="text-xs font-bold text-neutral-500 uppercase">Order Number *</label>
              <input 
                type="text" 
                [(ngModel)]="orderNumber" 
                placeholder="e.g. ORD-2026-123456" 
                class="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#d65108] outline-none"
              >
            </div>

            <div class="space-y-2">
              <label class="text-xs font-bold text-neutral-500 uppercase">Email Address *</label>
              <input 
                type="email" 
                [(ngModel)]="email" 
                placeholder="email used on checkout" 
                class="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#d65108] outline-none"
              >
            </div>
          </div>

          <app-button
            [loading]="searching()"
            text="Query Status"
            loadingText="Searching..."
            icon="search"
            variant="primary"
            class="block text-center"
            [isFullWidth]="true"
            (btnClick)="performTrack()"
          >
          </app-button>
        </div>

        <!-- Tracking Results details -->
        <div class="lg:col-span-7 space-y-6">
          @if (order()) {
            <!-- Main Info Card -->
            <div class="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-[2rem] border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
              <div class="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div>
                  <span class="text-xs font-bold text-neutral-500 uppercase tracking-widest">Order Reference</span>
                  <h3 class="text-lg font-black text-neutral-900 dark:text-white uppercase">{{order().orderNumber}}</h3>
                </div>
                <div [class]="getStatusBadgeClass(order().status)">
                  {{order().status}}
                </div>
              </div>

              <!-- Customer info -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                <div>
                  <span class="text-xs text-neutral-400 block font-normal">Purchased By</span>
                  {{order().guestName || order().customer?.user?.name || 'Customer'}}
                </div>
                <div>
                  <span class="text-xs text-neutral-400 block font-normal">Contact email</span>
                  {{order().guestEmail || order().customer?.user?.email || 'N/A'}}
                </div>
              </div>

              <!-- Address summary -->
              <div class="text-sm font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-950/40 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <span class="text-xs text-neutral-400 block font-normal mb-1">Shipping Details</span>
                <p>{{getShippingAddressText()}}</p>
              </div>

              <!-- Items and summary metrics -->
              <div class="space-y-4">
                <span class="text-xs font-black uppercase tracking-widest text-neutral-400 block">Ordered Products</span>
                <div class="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                  @for (item of order().items; track item.id) {
                    <div class="flex items-center justify-between gap-4 text-sm font-semibold">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden shrink-0">
                          <img [src]="item.product?.images?.[0]?.url || item.product?.images?.[0] || 'https://picsum.photos/seed/galaxy/200/200'" class="w-full h-full object-cover">
                        </div>
                        <div>
                          <span class="text-neutral-900 dark:text-white block truncate max-w-[200px]">{{item.product?.name}}</span>
                          <span class="text-xs text-neutral-400 block font-normal">Qty: {{item.quantity}}</span>
                        </div>
                      </div>
                      <div class="text-neutral-900 dark:text-white">
                        {{(item.unitPrice * item.quantity) | currency:'INR':'symbol':'1.0-0'}}
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="border-t border-neutral-100 dark:border-neutral-800 pt-4 flex items-center justify-between font-black text-sm text-neutral-900 dark:text-white">
                <span class="uppercase tracking-widest text-[#d65108]">Grand Total</span>
                <span class="text-lg">{{order().totalAmount | currency:'INR':'symbol':'1.0-2'}}</span>
              </div>
            </div>

            <!-- Activity history Feed -->
            <div class="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-[2rem] border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
              <h3 class="text-sm font-black uppercase tracking-widest text-neutral-900 dark:text-white">Milestones & History</h3>
              
              <div class="relative pl-6 border-l-2 border-neutral-150 dark:border-neutral-800 space-y-6">
                @for (history of order().statusHistory; track history.id; let first = $first) {
                  <div class="relative">
                    <!-- Bullet -->
                    <span 
                      class="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-neutral-900 flex items-center justify-center transition-all"
                      [class]="first ? 'bg-[#d65108] scale-125' : 'bg-neutral-300'"
                    ></span>
                    
                    <div class="space-y-1">
                      <div class="flex items-center justify-between text-xs font-black uppercase">
                        <span [class.text-[#d65108]]="first">{{history.status}}</span>
                        <span class="text-neutral-400">{{history.createdAt | date:'short'}}</span>
                      </div>
                      <p class="text-sm text-neutral-500 font-semibold leading-relaxed">
                        {{history.comments || 'Order updated successfully.'}}
                      </p>
                    </div>
                  </div>
                }

                @if (!order().statusHistory || order().statusHistory.length === 0) {
                  <p class="text-sm text-neutral-400">No events logged yet.</p>
                }
              </div>
            </div>
          } @else if (error()) {
            <div class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-[2rem] p-8 text-center space-y-4">
              <div class="w-12 h-12 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
                <mat-icon>error_outline</mat-icon>
              </div>
              <h3 class="font-black text-neutral-900 dark:text-white uppercase tracking-tight">Order lookup failed</h3>
              <p class="text-sm text-neutral-500 font-semibold">{{error()}}</p>
            </div>
          } @else {
            <div class="bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 border-dashed rounded-[2rem] p-12 text-center text-neutral-400 font-semibold">
              <mat-icon class="scale-150 mb-3 text-neutral-350">query_stats</mat-icon>
              <br>
              Enter reference details on the left to pull your package tracking status.
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class OrderTrackingComponent {
  router = inject(Router);
  api = inject(ApiService);
  toast = inject(ToastService);
  loading = inject(LoadingService);

  orderNumber = '';
  email = '';

  searching = signal(false);
  order = signal<any | null>(null);
  error = signal<string | null>(null);

  async performTrack() {
    const num = this.orderNumber.trim();
    const mail = this.email.trim();

    if (!num || !mail) {
      this.toast.error('Both order reference number and checkout credentials are required.');
      return;
    }

    this.searching.set(true);
    this.error.set(null);
    this.order.set(null);
    this.loading.startLoading();

    try {
      const res = await this.api.post<any>('/orders/track', { orderNumber: num, email: mail }).toPromise();
      this.order.set(res[1] || res);
      this.toast.success('Status retrieved successfully!');
    } catch (e: any) {
      console.error(e);
      this.error.set(e?.error?.error || e?.message || 'Access Denied or order reference not found.');
      this.toast.error('Could not load package milestones.');
    } finally {
      this.searching.set(false);
      this.loading.stopLoading();
    }
  }

  getStatusBadgeClass(status: string): string {
    const defaultStyle = 'px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ';
    switch ((status || '').toLowerCase()) {
      case 'pending':
        return defaultStyle + 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'processing':
        return defaultStyle + 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'shipped':
        return defaultStyle + 'bg-indigo-100 text-indigo-800 border border-indigo-200';
      case 'delivered':
        return defaultStyle + 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled':
        return defaultStyle + 'bg-red-100 text-red-800 border border-red-200';
      default:
        return defaultStyle + 'bg-neutral-100 text-neutral-800 border border-neutral-200';
    }
  }

  getShippingAddressText(): string {
    const o = this.order();
    if (!o) return 'N/A';
    
    if (o.guestAddress) {
      try {
        const parsed = JSON.parse(o.guestAddress);
        return [
          parsed.addressLine1 || parsed.address,
          parsed.addressLine2,
          parsed.city,
          parsed.state,
          parsed.postalCode || parsed.pincode,
          parsed.country
        ].filter(Boolean).join(', ');
      } catch {
        return o.guestAddress;
      }
    }

    if (o.shippingAddress) {
      const s = o.shippingAddress;
      return [
        s.addressLine1,
        s.addressLine2,
        s.city,
        s.state,
        s.postalCode,
        s.country
      ].filter(Boolean).join(', ');
    }

    return 'N/A';
  }
}
