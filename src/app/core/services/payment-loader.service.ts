import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class PaymentLoaderService {
  private platformId = inject(PLATFORM_ID);
  private razorpayPromise: Promise<boolean> | null = null;
  private cashfreePromise: Promise<boolean> | null = null;

  /**
   * Dynamically loads the Razorpay checkout script on-demand
   * Only called when checkout is entered or when paying with Razorpay.
   */
  public loadRazorpay(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve(false);
    }

    if ((window as any).Razorpay) {
      return Promise.resolve(true);
    }

    if (this.razorpayPromise) {
      return this.razorpayPromise;
    }

    this.razorpayPromise = new Promise<boolean>((resolve) => {
      const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existing) {
        if ((window as any).Razorpay) {
          return resolve(true);
        }
        existing.addEventListener('load', () => resolve(true), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        console.error('[PaymentLoader] Failed to load Razorpay SDK');
        this.razorpayPromise = null;
        resolve(false);
      };
      document.head.appendChild(script);
    });

    return this.razorpayPromise;
  }

  /**
   * Dynamically loads the Cashfree SDK on-demand
   * Only called when checkout is entered or when paying with Cashfree.
   */
  public loadCashfree(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve(false);
    }

    if ((window as any).Cashfree) {
      return Promise.resolve(true);
    }

    if (this.cashfreePromise) {
      return this.cashfreePromise;
    }

    this.cashfreePromise = new Promise<boolean>((resolve) => {
      const existing = document.querySelector('script[src*="sdk.cashfree.com"]');
      if (existing) {
        if ((window as any).Cashfree) {
          return resolve(true);
        }
        existing.addEventListener('load', () => resolve(true), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        console.error('[PaymentLoader] Failed to load Cashfree SDK');
        this.cashfreePromise = null;
        resolve(false);
      };
      document.head.appendChild(script);
    });

    return this.cashfreePromise;
  }
}
