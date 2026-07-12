import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {CommonModule, Location} from '@angular/common';
import {RouterModule, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService} from '../../services/datastore';

@Component({
  selector: 'app-order-success',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div class="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[2rem] p-8 text-center shadow-2xl">
        <div class="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <mat-icon class="scale-150">verified</mat-icon>
        </div>
        
        <h1 class="text-3xl font-black text-neutral-900 dark:text-white mb-2 uppercase tracking-tight">Order Placed<br>Successfully</h1>
        <p class="text-sm font-medium text-neutral-500 mb-8">Thank you for shopping with 3D Galaxy.</p>

        @if (order) {
          <div class="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 text-left space-y-3 mb-8">
            <div class="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <span class="text-xs font-bold text-neutral-500 uppercase">Customer Name</span>
              <span class="text-sm font-black text-neutral-900 dark:text-white">{{customerName}}</span>
            </div>
            <div class="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <span class="text-xs font-bold text-neutral-500 uppercase">Order Number</span>
              <span class="text-sm font-black text-neutral-900 dark:text-white">{{order.orderNumber}}</span>
            </div>
            <div class="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <span class="text-xs font-bold text-neutral-500 uppercase">Total Amount</span>
              <span class="text-sm font-black text-[#d65108]">{{order.totalAmount | currency:'INR':'symbol':'1.0-2'}}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-neutral-500 uppercase">Est. Delivery</span>
              <span class="text-sm font-black text-neutral-900 dark:text-white">3-5 Business Days</span>
            </div>
          </div>

          <!-- Register options for Guests -->
          @if (isGuest) {
            <div class="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-6 text-center space-y-3 mb-8">
              <h3 class="font-black text-sm uppercase tracking-wider text-indigo-700 dark:text-indigo-400">⚡ Save Time On Your Next Order</h3>
              <p class="text-xs text-neutral-600 dark:text-neutral-400">
                Register an account with address synchronization. We will automatically link this order (<strong>{{order.guestEmail}}</strong>) for tracking!
              </p>
              <button (click)="navigateToRegister()" class="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md">
                <mat-icon class="text-sm">person_add</mat-icon> Create Account
              </button>
            </div>
          }
        }

        <div class="flex flex-col gap-3">
          @if (!isGuest) {
            <a routerLink="/orders" class="w-full py-4 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-black text-xs tracking-[0.2em] uppercase rounded-xl transition-all shadow-xl block cursor-pointer">
              Track Order
            </a>
          } @else {
            <a routerLink="/order-tracking" class="w-full py-4 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-black text-xs tracking-[0.2em] uppercase rounded-xl transition-all shadow-xl block cursor-pointer">
              Track Guest Order
            </a>
          }
          <a routerLink="/" class="w-full py-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-black text-xs tracking-[0.2em] uppercase rounded-xl transition-all block cursor-pointer">
            Continue Shopping
          </a>
        </div>
      </div>
    </div>
  `
})
export class OrderSuccessComponent {
  location = inject(Location);
  router = inject(Router);
  ds = inject(DatastoreService);
  order: any;
  customerName = '';
  isGuest = false;

  constructor() {
    const state = this.location.getState() as any;
    if (state && state.order) {
      this.order = state.order[0] || state.order;
    } else {
      this.router.navigate(['/']);
    }
    
    const u = this.ds.activeUser();
    if (u) {
      this.customerName = (u as any).firstName ? `${(u as any).firstName} ${(u as any).lastName || ''}` : u.name;
    } else if (this.order) {
      this.customerName = this.order.guestName || this.order.customerName || 'Guest Customer';
      this.isGuest = true;
    }
  }

  navigateToRegister() {
    this.router.navigate(['/register'], { queryParams: { email: this.order?.guestEmail } });
  }
}
