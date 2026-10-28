import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { DatastoreService } from '../../services/datastore';

const saveReturnUrl = (url: string) => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage && url) {
      sessionStorage.setItem('auth_return_url', url);
    }
  } catch (e) {
    // Non-fatal if sessionStorage is blocked
  }
};

const waitForAuthReady = (ds: DatastoreService, timeoutMs = 2500): Promise<void> => {
  if (ds.authReady()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (ds.authReady() || Date.now() - start >= timeoutMs) {
        clearInterval(timer);
        resolve();
      }
    }, 40);
  });
};

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const ds = inject(DatastoreService);

  await waitForAuthReady(ds);

  if (ds.userProfile()) {
    return true;
  }

  saveReturnUrl(state.url);
  // Redirect to login page cleanly using UrlTree with returnUrl param
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const roleGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const ds = inject(DatastoreService);

  await waitForAuthReady(ds);

  const profile = ds.userProfile();
  const role = ds.userRole();

  if (!profile) {
    saveReturnUrl(state.url);
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const allowedRoles = (route.data && route.data['roles']) as string[] | undefined;

  if (allowedRoles && allowedRoles.length > 0) {
    const rLower = (role || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
    const isSuperAdmin = rLower === 'superadmin';
    const isAllowed = isSuperAdmin || allowedRoles.some(ar => {
      const arLower = ar.trim().toLowerCase().replace(/[\s\-_]/g, '');
      return arLower === rLower;
    });

    if (isAllowed) {
      return true;
    }

    return router.createUrlTree(['/']);
  }

  return true; // No roles defined, so it's unrestricted after auth
};
