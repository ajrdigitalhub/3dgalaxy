import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  let url = req.url;
  let headers = req.headers;

  if (url.startsWith('/api/')) {
    url = url.replace('/api/', `${environment.apiUrl}/`);
    
    // Auto-inject authorization if available in localStorage and not already set
    if (typeof window !== 'undefined' && !headers.has('Authorization')) {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    
    const cloned = req.clone({ url, headers });
    return next(cloned);
  }

  return next(req);
};
