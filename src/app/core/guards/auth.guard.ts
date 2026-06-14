import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { DatastoreService } from '../../services/datastore';

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const ds = inject(DatastoreService);

  // Wait for authentication init to be ready
  if (!ds.authReady()) {
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (ds.authReady()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  }

  if (ds.userProfile()) {
    return true;
  }

  // Redirect to login page
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const adminGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const ds = inject(DatastoreService);

  // Wait for authentication init to be ready
  if (!ds.authReady()) {
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (ds.authReady()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  }

  const role = ds.userRole();
  if (ds.userProfile() && (role === 'admin' || role === 'super-admin')) {
    return true;
  }

  // Redirect to home page
  router.navigate(['/']);
  return false;
};
