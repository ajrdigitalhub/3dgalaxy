import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { DatastoreService } from '../../services/datastore';
import { ToastService } from '../../shared/components/toast/toast.service';

export const checkoutGuard: CanActivateFn = () => {
  const router = inject(Router);
  const ds = inject(DatastoreService);
  const toast = inject(ToastService);

  // Check if there are active items in checkout (buy now item or cart items)
  const items = ds.activeCheckoutItems();
  if (items && items.length > 0) {
    return true;
  }

  // Backup check for browser environment (in case signal state is in process of initializing)
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const storedBuyNow = localStorage.getItem('buyNowSession');
      if (storedBuyNow && JSON.parse(storedBuyNow)?.product) {
        return true;
      }
      const storedCart = localStorage.getItem('3d-galaxy-cart');
      if (storedCart && JSON.parse(storedCart)?.length > 0) {
        return true;
      }
    } catch (e) {}
  }

  toast.info('Your cart is empty. Please add items before proceeding to checkout.');
  return router.createUrlTree(['/cart']);
};
