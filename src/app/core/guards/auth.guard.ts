import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { DatastoreService } from '../../services/datastore';

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

  // Redirect to login page cleanly using UrlTree
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const roleGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const ds = inject(DatastoreService);

  await waitForAuthReady(ds);

  const profile = ds.userProfile();
  const role = ds.userRole();

  if (!profile) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const allowedRoles = (route.data && route.data['roles']) as string[] | undefined;

  if (allowedRoles) {
    // Map internal lowercase role names to requested format if needed
    // or just check if it matches.
    const normalizedRole = role === 'super-admin' ? 'Super Admin' : (role.charAt(0).toUpperCase() + role.slice(1));
    
    // Super Admin has all access
    if (normalizedRole === 'Super Admin' || allowedRoles.includes(normalizedRole) || allowedRoles.includes(role)) {
      return true;
    }

    return router.createUrlTree(['/']);
  }

  return true; // No roles defined, so it's unrestricted after auth
};
