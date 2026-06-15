import { HttpInterceptorFn } from '@angular/common/http';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // Global loading intercepter disabled to prevent full page re-rendering on background API activities.
  return next(req);
};
