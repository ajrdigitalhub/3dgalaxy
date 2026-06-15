import {Component, inject} from '@angular/core';
import {CommonModule, Location} from '@angular/common';
import {RouterModule, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService} from '../../services/datastore';

@Component({
  selector: 'app-order-success',
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
        }

        <div class="flex flex-col gap-3">
          <a routerLink="/orders" class="w-full py-4 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-black text-xs tracking-[0.2em] uppercase rounded-xl transition-all shadow-xl block cursor-pointer">
            Track Order
          </a>
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
    }
  }
}
