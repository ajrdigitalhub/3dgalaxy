import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

export interface OrderItem {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface AccountOrder {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  grandTotal: number;
  items: OrderItem[];
  paymentMethod?: string;
  shippingAddress?: string;
}

@Component({
  selector: 'app-account-order-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs hover:shadow-md transition-all duration-150"
    >
      <!-- Top Order Bar Header -->
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-950/40 px-4 py-3 text-xs"
      >
        <div class="flex items-center gap-4 flex-wrap">
          <div>
            <span class="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Order Placed</span>
            <span class="font-bold text-neutral-800 dark:text-neutral-200">{{ order().date }}</span>
          </div>

          <div class="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block"></div>

          <div>
            <span class="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Order ID</span>
            <span class="font-mono font-bold text-neutral-900 dark:text-white">#{{ order().orderNumber }}</span>
          </div>

          <div class="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block"></div>

          <div>
            <span class="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total</span>
            <span class="font-mono font-black text-orange-600 dark:text-orange-400">₹{{ order().grandTotal.toLocaleString('en-IN') }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Status Badge -->
          <span
            [ngClass]="statusClass()"
            class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
            {{ order().status }}
          </span>
        </div>
      </div>

      <!-- Compact Items & Actions Row -->
      <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <!-- Products list / preview -->
        <div class="flex items-center gap-3.5 flex-1 min-w-0">
          <div
            class="h-14 w-14 shrink-0 rounded-xl border border-neutral-200/80 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 p-1 flex items-center justify-center overflow-hidden"
          >
            @if (firstItemImage()) {
              <img [src]="firstItemImage()" [alt]="firstItemName()" class="h-full w-full object-contain" />
            } @else {
              <mat-icon class="text-neutral-400 scale-90">inventory_2</mat-icon>
            }
          </div>

          <div class="min-w-0 flex-1">
            <h4 class="text-xs font-bold text-neutral-900 dark:text-white truncate">
              {{ firstItemName() }}
            </h4>
            <p class="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
              @if (order().items.length > 1) {
                <span>+ {{ order().items.length - 1 }} additional item(s)</span>
              } @else {
                <span>Qty: {{ order().items[0]?.quantity || 1 }} × ₹{{ (order().items[0]?.price || 0).toLocaleString('en-IN') }}</span>
              }
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap pt-2 sm:pt-0 border-t border-neutral-100 dark:border-neutral-800/80 sm:border-0">
          <button
            type="button"
            (click)="onReorder.emit(order())"
            aria-label="Reorder items"
            class="flex-1 sm:flex-none h-8 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[11px] font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer border-none"
          >
            <mat-icon class="scale-75 text-[14px]">refresh</mat-icon>
            <span>Reorder</span>
          </button>

          <a
            [routerLink]="['/order-tracking', order().orderNumber]"
            class="flex-1 sm:flex-none h-8 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-[11px] font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 no-underline"
          >
            <mat-icon class="scale-75 text-[14px]">local_shipping</mat-icon>
            <span>Track</span>
          </a>

          <a
            [routerLink]="['/orders', order().orderNumber]"
            class="flex-1 sm:flex-none h-8 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-[11px] font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 no-underline shadow-xs"
          >
            <span>Details</span>
          </a>
        </div>
      </div>
    </article>
  `
})
export class AccountOrderCardComponent {
  order = input.required<AccountOrder>();
  onReorder = output<AccountOrder>();

  firstItemName = computed(() => this.order().items[0]?.name || '3D Printing Item');

  firstItemImage = computed(() => this.order().items[0]?.image || null);

  statusClass = computed(() => {
    const st = (this.order().status || '').toLowerCase();
    if (st === 'delivered') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    if (st === 'processing' || st === 'shipped' || st === 'out for delivery') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    if (st === 'packed' || st === 'confirmed') return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    if (st === 'cancelled') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  });
}
