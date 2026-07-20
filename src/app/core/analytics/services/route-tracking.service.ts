import { Injectable, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfigurationService } from './configuration.service';

@Injectable({
  providedIn: 'root'
})
export class RouteTrackingService {
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);
  private router = inject(Router);
  private configService = inject(ConfigurationService);
  private destroyRef = inject(DestroyRef);

  private lastTrackedUrl: string | null = null;
  private onPageViewCallback: ((url: string, title?: string) => void) | null = null;

  public init(onPageView: (url: string, title?: string) => void): void {
    this.onPageViewCallback = onPageView;

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        const targetUrl = event.urlAfterRedirects || event.url;
        this.processRouteNavigation(targetUrl);
      });
  }

  public processRouteNavigation(url: string): void {
    if (this.isIgnoredRoute(url)) {
      return;
    }

    if (this.lastTrackedUrl === url) {
      // Prevent duplicate consecutive page tracking (e.g., hash changes or duplicate events)
      return;
    }

    this.lastTrackedUrl = url;
    const title = this.document ? this.document.title : undefined;

    if (this.onPageViewCallback) {
      this.onPageViewCallback(url, title);
    }
  }

  private isIgnoredRoute(url: string): boolean {
    const config = this.configService.getConfig();
    const ignoredRoutes = config.ignoredRoutes || ['/404', '/admin', '/login', '/checkout/success'];

    return ignoredRoutes.some((pattern) => {
      if (typeof pattern === 'string') {
        return url.toLowerCase().startsWith(pattern.toLowerCase());
      }
      if (pattern instanceof RegExp) {
        return pattern.test(url);
      }
      return false;
    });
  }
}
