import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService, CartItem, Product } from '../../services/datastore';
import { ToastService } from '../../shared/components/toast/toast.service';

@Component({
  selector: 'app-recover-cart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="min-h-[70vh] flex flex-col items-center justify-center px-4 bg-neutral-50 dark:bg-neutral-950 font-sans">
      <div class="max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 rounded-3xl shadow-xl text-center space-y-6 relative overflow-hidden">
        
        <!-- Animated glow circles -->
        <div class="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

        @if (status() === 'loading') {
          <div class="space-y-6 py-6 animate-pulse relative z-10">
            <div class="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <mat-icon class="scale-125">restore</mat-icon>
            </div>
            <div class="space-y-2">
              <h2 class="text-xl font-black uppercase tracking-tight text-neutral-900 dark:text-white">Restoring Your Checkout...</h2>
              <p class="text-xs text-neutral-500">Retrieving saved cart items, variants, and coupon choices.</p>
            </div>
            <div class="flex justify-center gap-1.5">
              <div class="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce"></div>
              <div class="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div class="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        }

        @if (status() === 'success') {
          <div class="space-y-6 py-6 relative z-10">
            <div class="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <mat-icon class="scale-125">check_circle</mat-icon>
            </div>
            <div class="space-y-2">
              <h2 class="text-xl font-black uppercase tracking-tight text-neutral-900 dark:text-white">Cart Restored!</h2>
              <p class="text-xs text-neutral-500">Your details have been recovered. Redirecting to checkout page...</p>
            </div>
          </div>
        }

        @if (status() === 'error') {
          <div class="space-y-6 py-6 relative z-10">
            <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <mat-icon class="scale-125">error_outline</mat-icon>
            </div>
            <div class="space-y-2">
              <h2 class="text-xl font-black uppercase tracking-tight text-neutral-900 dark:text-white">Recovery Failed</h2>
              <p class="text-xs text-red-500 border border-red-500/10 p-2.5 bg-red-500/5 rounded-xl font-semibold">{{ errorMsg() }}</p>
            </div>
            <button (click)="router.navigate(['/'])" class="w-full bg-neutral-900 hover:bg-neutral-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-widest cursor-pointer border-none shadow-md">
              Return To Shop
            </button>
          </div>
        }

      </div>
    </div>
  `
})
export class RecoverCartComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  ds = inject(DatastoreService);
  toast = inject(ToastService);

  status = signal<'loading' | 'success' | 'error'>('loading');
  errorMsg = signal('');

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.status.set('error');
      this.errorMsg.set('Invalid recovery link token.');
      return;
    }

    this.ds.api.get<any>(`/recover-cart/${token}`).subscribe({
      next: (res: any) => {
        if (!res || !res.cartItems) {
          this.status.set('error');
          this.errorMsg.set('Checkout recovery details not found.');
          return;
        }

        // Hydrate checkout items
        const rawItems = res.cartItems || [];
        const products = this.ds.products();

        const cartItems: CartItem[] = rawItems.map((item: any) => {
          // Resolve actual product object
          const p = products.find(x => x.id === item.productId) || {
            id: item.productId,
            name: item.productName || 'Recovered Item',
            slug: item.slug,
            sale_price: Number(item.price),
            mrp: Number(item.price),
            images: [],
            specs: [],
            reviews: [],
            qnas: [],
            tags: []
          } as unknown as Product;

          return {
            product: p,
            quantity: item.quantity,
            selectedPriceType: 'sale'
          } as CartItem;
        });

        // Hydrate Cart
        this.ds.cart.set(cartItems);

        // Prepopulate guest metadata if available
        if (res.email) localStorage.setItem('guest_email', res.email);
        if (res.mobile) localStorage.setItem('guest_mobile', res.mobile);
        if (res.customerName) localStorage.setItem('guest_name', res.customerName);

        if (res.checkoutData) {
          const d = res.checkoutData;
          if (d.addressLine1) localStorage.setItem('checkout_restored_addr1', d.addressLine1);
          if (d.addressLine2) localStorage.setItem('checkout_restored_addr2', d.addressLine2);
          if (d.city) localStorage.setItem('checkout_restored_city', d.city);
          if (d.state) localStorage.setItem('checkout_restored_state', d.state);
          if (d.pincode) localStorage.setItem('checkout_restored_pin', d.pincode);
          if (d.paymentMethod) localStorage.setItem('checkout_restored_pay', d.paymentMethod);
        }

        this.status.set('success');
        this.toast.success('Your cart has been successfully restored!');
        
        setTimeout(() => {
          this.router.navigate(['/checkout']);
        }, 1500);
      },
      error: (err) => {
        this.status.set('error');
        this.errorMsg.set(err.error?.error || 'Failed to fetch recovery cart payload.');
      }
    });
  }
}
