import {ChangeDetectionStrategy, Component, inject, OnInit, signal, AfterViewInit, ChangeDetectorRef} from '@angular/core';
import {CommonModule, Location} from '@angular/common';
import {RouterModule, Router, ActivatedRoute} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService} from '../../services/datastore';
import {ApiService} from '../../services/api.service';
import {firstValueFrom} from 'rxjs';

@Component({
  selector: 'app-order-success',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <!-- Confetti Canvas -->
    <canvas #confettiCanvas class="fixed inset-0 pointer-events-none z-50" [class.hidden]="!showConfetti()"></canvas>

    <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-12 px-4">
      <div class="max-w-2xl mx-auto space-y-8">

        <!-- Success Hero Card -->
        <div class="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-10 text-center shadow-xl overflow-hidden">
          <!-- Background Glow -->
          <div class="absolute -top-32 -right-32 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl"></div>
          <div class="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>

          <div class="relative z-10">
            <!-- Animated Checkmark -->
            <div class="w-24 h-24 mx-auto mb-6 relative">
              <div class="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full animate-ping opacity-30"></div>
              <div class="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <mat-icon class="scale-[2]">check</mat-icon>
              </div>
            </div>

            <h1 class="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white uppercase tracking-tight leading-tight mb-2">
              Order Placed<br>Successfully!
            </h1>
            <p class="text-sm font-medium text-neutral-500 mb-2">Thank you for shopping with 3D Galaxy.</p>
            @if (order) {
              <p class="text-xs font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 inline-block px-3 py-1 rounded-full">Order #{{ order.orderNumber || order.id }}</p>
            }
          </div>
        </div>

        <!-- Order Details Card -->
        @if (order) {
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm overflow-hidden">
          <div class="p-6 sm:p-8 space-y-5">
            <h2 class="text-xs font-black text-neutral-400 uppercase tracking-[0.15em]">Order Details</h2>

            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <p class="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Customer</p>
                <p class="text-sm font-bold text-neutral-900 dark:text-white">{{ customerName }}</p>
              </div>
              <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <p class="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total</p>
                <p class="text-sm font-black text-[#d65108]">{{ order.totalAmount | currency:'INR':'symbol':'1.0-2' }}</p>
              </div>
              <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <p class="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Payment</p>
                <p class="text-sm font-bold text-neutral-900 dark:text-white">{{ order.paymentMethod || 'Online' }}</p>
              </div>
              <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <p class="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Est. Delivery</p>
                <p class="text-sm font-bold text-neutral-900 dark:text-white">3-5 Business Days</p>
              </div>
            </div>
          </div>

          <!-- Order Timeline -->
          <div class="px-6 sm:px-8 pb-6 sm:pb-8">
            <h3 class="text-xs font-black text-neutral-400 uppercase tracking-[0.15em] mb-5">Order Progress</h3>
            <div class="flex items-start justify-between relative">
              <!-- Progress Line -->
              <div class="absolute top-4 left-4 right-4 h-0.5 bg-neutral-200 dark:bg-neutral-800"></div>
              <div class="absolute top-4 left-4 h-0.5 bg-emerald-400 transition-all duration-1000" [style.width]="'15%'"></div>

              @for (step of timelineSteps; track step.label; let i = $index) {
              <div class="relative z-10 flex flex-col items-center gap-2 w-20 text-center">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm transition-all"
                  [class]="i === 0
                    ? 'bg-emerald-500 text-white shadow-emerald-400/30'
                    : 'bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-700 text-neutral-400'">
                  @if (i === 0) {
                    <mat-icon class="scale-75">check</mat-icon>
                  } @else {
                    {{ i + 1 }}
                  }
                </div>
                <span class="text-[9px] font-bold uppercase tracking-wider leading-tight"
                  [class]="i === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'">{{ step.label }}</span>
              </div>
              }
            </div>
          </div>
        </div>
        }

        <!-- Guest Registration CTA -->
        @if (isGuest && order) {
        <div class="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 border border-indigo-200 dark:border-indigo-900 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
            <mat-icon>person_add</mat-icon>
          </div>
          <h3 class="font-black text-sm uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Save Time On Your Next Order</h3>
          <p class="text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
            Register an account with address synchronization. We'll automatically link this order (<strong>{{ order.guestEmail }}</strong>) for tracking!
          </p>
          <button (click)="navigateToRegister()" class="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg">
            <mat-icon class="text-sm">person_add</mat-icon> Create Account
          </button>
        </div>
        }

        <!-- Action Buttons -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          @if (!isGuest) {
            <a routerLink="/orders"
              class="flex items-center justify-center gap-2 py-4 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-black text-xs tracking-[0.2em] uppercase rounded-xl transition-all shadow-lg cursor-pointer">
              <mat-icon class="text-sm">local_shipping</mat-icon> Track Order
            </a>
          } @else {
            <a routerLink="/order-tracking"
              class="flex items-center justify-center gap-2 py-4 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-black text-xs tracking-[0.2em] uppercase rounded-xl transition-all shadow-lg cursor-pointer">
              <mat-icon class="text-sm">local_shipping</mat-icon> Track Guest Order
            </a>
          }
          <a routerLink="/"
            class="flex items-center justify-center gap-2 py-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-black text-xs tracking-[0.2em] uppercase rounded-xl transition-all cursor-pointer">
            <mat-icon class="text-sm">storefront</mat-icon> Continue Shopping
          </a>
        </div>

        <!-- Trust Footer -->
        <div class="flex flex-wrap gap-6 justify-center pb-8">
          <div class="flex items-center gap-2 text-neutral-400">
            <mat-icon class="scale-[0.65] text-emerald-500">verified_user</mat-icon>
            <span class="text-[10px] font-semibold">100% Secure Payment</span>
          </div>
          <div class="flex items-center gap-2 text-neutral-400">
            <mat-icon class="scale-[0.65] text-blue-500">support_agent</mat-icon>
            <span class="text-[10px] font-semibold">Dedicated Support</span>
          </div>
          <div class="flex items-center gap-2 text-neutral-400">
            <mat-icon class="scale-[0.65] text-[#d65108]">assignment_return</mat-icon>
            <span class="text-[10px] font-semibold">7-Day Easy Returns</span>
          </div>
        </div>

      </div>
    </div>
  `
})
export class OrderSuccessComponent implements AfterViewInit {
  location = inject(Location);
  router = inject(Router);
  route = inject(ActivatedRoute);
  ds = inject(DatastoreService);
  api = inject(ApiService);
  cdr = inject(ChangeDetectorRef);

  order: any;
  customerName = '';
  isGuest = false;
  showConfetti = signal(true);
  isLoading = signal(false);

  timelineSteps = [
    { label: 'Confirmed', icon: 'check_circle' },
    { label: 'Preparing', icon: 'inventory_2' },
    { label: 'Packed', icon: 'package_2' },
    { label: 'Shipped', icon: 'local_shipping' },
    { label: 'Delivered', icon: 'home' }
  ];

  constructor() {
    const state = this.location.getState() as any;
    if (state && state.order) {
      this.order = state.order[0] || state.order;
      this.resolveCustomerName();
    } else {
      // Check for orderId query parameter (used by finishOrder and Cashfree redirect)
      const orderId = this.route.snapshot.queryParamMap.get('orderId') || this.route.snapshot.queryParamMap.get('order_id');
      if (orderId) {
        this.loadOrderFromApi(orderId);
      } else {
        this.router.navigate(['/']);
      }
    }
  }

  private async loadOrderFromApi(orderId: string) {
    this.isLoading.set(true);
    try {
      const res: any = await firstValueFrom(this.api.get<any>(`/orders/${orderId}`));
      this.order = res?.data || res;
      this.resolveCustomerName();
    } catch (err) {
      console.error('Failed to load order:', err);
      this.router.navigate(['/']);
    } finally {
      this.isLoading.set(false);
      this.cdr.detectChanges();
    }
  }

  private resolveCustomerName() {
    const u = this.ds.activeUser();
    if (u) {
      this.customerName = (u as any).firstName ? `${(u as any).firstName} ${(u as any).lastName || ''}` : u.name;
    } else if (this.order) {
      this.customerName = this.order.guestName || this.order.customerName || 'Guest Customer';
      this.isGuest = true;
    }
  }

  ngAfterViewInit() {
    // Simple confetti effect using CSS particles
    setTimeout(() => this.showConfetti.set(false), 5000);
  }

  navigateToRegister() {
    this.router.navigate(['/register'], { queryParams: { email: this.order?.guestEmail } });
  }
}
