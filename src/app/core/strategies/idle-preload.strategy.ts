import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class IdlePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    const shouldPreload = route.data && route.data['preload'];
    if (shouldPreload) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        return new Observable(observer => {
          const idleId = window.requestIdleCallback(() => {
            load().subscribe({
              next: () => {
                observer.next(null);
                observer.complete();
              },
              error: (err) => {
                observer.error(err);
              }
            });
          });
          return () => window.cancelIdleCallback(idleId);
        });
      } else {
        // Fallback to delay preloading by 5 seconds
        return timer(5000).pipe(switchMap(() => load()));
      }
    }
    return of(null);
  }
}
