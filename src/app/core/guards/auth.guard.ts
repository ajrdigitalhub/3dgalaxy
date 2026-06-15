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

export const roleGuard: CanActivateFn = async (route, state) => {
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

  const profile = ds.userProfile();
  const role = ds.userRole();

  if (!profile) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
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

    router.navigate(['/']);
    return false;
  }

  return true; // No roles defined, so it's unrestricted after auth
};
