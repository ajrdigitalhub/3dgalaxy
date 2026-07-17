import { Injectable, inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import {
  NavigationEnd,
  NavigationStart,
  Router,
  Scroll,
} from "@angular/router";
import { ViewportScroller } from "@angular/common";
import { filter } from "rxjs/operators";

@Injectable({ providedIn: "root" })
export class ScrollRestorationService {
  private router = inject(Router);
  private viewport = inject(ViewportScroller);
  private platformId = inject(PLATFORM_ID);

  private scrollPositions = new Map<string, [number, number]>();
  private navigationTrigger: "imperative" | "popstate" | "hashchange" | null =
    null;
  private pendingRestoreUrl: string | null = null;

  init(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationStart ||
            event instanceof NavigationEnd ||
            event instanceof Scroll,
        ),
      )
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.saveCurrentPosition();
          this.navigationTrigger = event.navigationTrigger ?? "imperative";
          if (this.navigationTrigger === "popstate") {
            this.pendingRestoreUrl = this.normalizeUrl(event.url);
          } else {
            this.pendingRestoreUrl = null;
          }
          return;
        }

        if (event instanceof NavigationEnd) {
          const url = this.normalizeUrl(event.urlAfterRedirects);

          if (this.navigationTrigger === "popstate") {
            this.restorePosition(url);
          } else {
            this.scrollToTop();
          }

          this.navigationTrigger = null;
          this.pendingRestoreUrl = null;
          return;
        }

        if (event instanceof Scroll) {
          if (event.anchor) {
            requestAnimationFrame(() => this.scrollToAnchor(event.anchor!));
          }
        }
      });
  }

  scrollToTop(behavior: ScrollBehavior = "auto"): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.scrollTo({ top: 0, left: 0, behavior });
    this.viewport.scrollToPosition([0, 0]);
  }

  scrollToAnchor(anchor: string, behavior: ScrollBehavior = "smooth"): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const target = document.getElementById(anchor);
    if (!target) return;
    const top =
      target.getBoundingClientRect().top + window.scrollY - this.headerOffset();
    window.scrollTo({ top, behavior });
  }

  private saveCurrentPosition(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const url = this.normalizeUrl(this.router.url);
    this.scrollPositions.set(url, [window.scrollY, window.scrollX]);
  }

  private restorePosition(url: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const position =
      this.scrollPositions.get(url) ??
      (this.pendingRestoreUrl === url
        ? this.scrollPositions.get(this.pendingRestoreUrl)
        : undefined);

    requestAnimationFrame(() => {
      if (position) {
        window.scrollTo({ top: position[0], left: position[1], behavior: "auto" });
        this.viewport.scrollToPosition(position);
      } else {
        this.scrollToTop();
      }
    });
  }

  private normalizeUrl(url: string): string {
    const [path, query = ""] = url.split("?");
    const params = new URLSearchParams(query);
    params.delete("variant");
    const normalizedQuery = params.toString();
    return normalizedQuery ? `${path}?${normalizedQuery}` : path;
  }

  private headerOffset(): number {
    return window.innerWidth < 768 ? 80 : 96;
  }
}
