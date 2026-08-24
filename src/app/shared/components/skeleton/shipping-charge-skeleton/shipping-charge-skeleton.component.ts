import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-shipping-charge-skeleton',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <ng-container [ngSwitch]="mode">
      <!-- Card Mode: Full Shipping Card (Product Details / Package Summary) -->
      <div *ngSwitchCase="'card'" class="p-4 sm:p-5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/40 animate-pulse flex items-center justify-between gap-4 my-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
            <mat-icon class="text-neutral-400 dark:text-neutral-500 text-xl">local_shipping</mat-icon>
          </div>
          <div class="space-y-2">
            <div class="h-3 w-28 bg-neutral-200 dark:bg-neutral-700 rounded-md"></div>
            <div class="h-2.5 w-36 bg-neutral-200 dark:bg-neutral-700 rounded-md"></div>
          </div>
        </div>
        <div class="text-right shrink-0 space-y-1.5">
          <div class="h-2.5 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-md ml-auto"></div>
          <div class="h-4 w-20 bg-neutral-300 dark:bg-neutral-600 rounded-md ml-auto"></div>
        </div>
      </div>

      <!-- Compact Mode: For Summary Boxes (Cart / Checkout Order Summary) -->
      <div *ngSwitchCase="'compact'" class="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 animate-pulse space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <mat-icon class="text-amber-500/40 text-sm">local_shipping</mat-icon>
            <div class="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          </div>
          <div class="h-3.5 w-14 bg-neutral-300 dark:bg-neutral-600 rounded"></div>
        </div>
      </div>

      <!-- Inline Mode: Default inline row skeleton for Price Details tables -->
      <div *ngSwitchDefault class="inline-flex items-center gap-2 animate-pulse" [style.height]="height">
        <span *ngIf="showIcon" class="text-neutral-400 dark:text-neutral-500 text-sm font-medium">🚚</span>
        <div 
          class="bg-neutral-200 dark:bg-neutral-700 rounded-md shrink-0 inline-block overflow-hidden relative"
          [style.width]="width"
          [style.height]="height">
          <div class="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-neutral-600/40 to-transparent"></div>
        </div>
        <span *ngIf="showText" class="text-[10px] text-neutral-400 font-medium">Calculating...</span>
      </div>
    </ng-container>
  `,
  styles: [`
    @keyframes shimmer {
      100% {
        transform: translateX(100%);
      }
    }
  `]
})
export class ShippingChargeSkeletonComponent {
  @Input() mode: 'inline' | 'card' | 'compact' = 'inline';
  @Input() width: string = '4.5rem';
  @Input() height: string = '1.15rem';
  @Input() showIcon: boolean = false;
  @Input() showText: boolean = false;
}
