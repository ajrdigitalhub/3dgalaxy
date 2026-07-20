import { Injectable, inject, PLATFORM_ID, RendererFactory2, Renderer2 } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

export type ScriptLoadingState = 'unloaded' | 'loading' | 'loaded' | 'error';

@Injectable({
  providedIn: 'root'
})
export class ScriptLoaderService {
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);
  private rendererFactory = inject(RendererFactory2);
  private renderer: Renderer2 = this.rendererFactory.createRenderer(null, null);

  private loadedScripts = new Map<string, ScriptLoadingState>();
  private loadingPromises = new Map<string, Promise<boolean>>();

  /**
   * SSR-safe script injection using Renderer2 & DOCUMENT
   */
  public loadScript(
    url: string,
    attributes: Record<string, string> = {},
    maxRetries: number = 2
  ): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve(false);
    }

    if (this.loadedScripts.get(url) === 'loaded') {
      return Promise.resolve(true);
    }

    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const loadPromise = this.attemptLoadScript(url, attributes, maxRetries, 0);
    this.loadingPromises.set(url, loadPromise);

    return loadPromise;
  }

  private attemptLoadScript(
    url: string,
    attributes: Record<string, string>,
    maxRetries: number,
    currentRetry: number
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.loadedScripts.set(url, 'loading');

      const script = this.renderer.createElement('script') as HTMLScriptElement;
      script.type = 'text/javascript';
      script.src = url;
      script.async = true;

      Object.keys(attributes).forEach((attr) => {
        this.renderer.setAttribute(script, attr, attributes[attr]);
      });

      script.onload = () => {
        this.loadedScripts.set(url, 'loaded');
        this.loadingPromises.delete(url);
        resolve(true);
      };

      script.onerror = () => {
        this.renderer.removeChild(this.document.head, script);

        if (currentRetry < maxRetries) {
          const retryDelay = Math.pow(2, currentRetry) * 1000;
          setTimeout(() => {
            this.attemptLoadScript(url, attributes, maxRetries, currentRetry + 1).then(resolve);
          }, retryDelay);
        } else {
          this.loadedScripts.set(url, 'error');
          this.loadingPromises.delete(url);
          console.warn(`[ScriptLoaderService] Failed to load script after ${maxRetries + 1} attempts: ${url}`);
          resolve(false);
        }
      };

      this.renderer.appendChild(this.document.head, script);
    });
  }

  /**
   * SSR-safe inline script execution
   */
  public loadInlineScript(content: string, scriptId: string): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (this.document.getElementById(scriptId)) {
      return true;
    }

    try {
      const script = this.renderer.createElement('script') as HTMLScriptElement;
      script.id = scriptId;
      script.type = 'text/javascript';
      script.text = content;
      this.renderer.appendChild(this.document.head, script);
      this.loadedScripts.set(scriptId, 'loaded');
      return true;
    } catch (err) {
      console.error(`[ScriptLoaderService] Failed to execute inline script ${scriptId}`, err);
      return false;
    }
  }

  public getScriptState(urlOrId: string): ScriptLoadingState {
    return this.loadedScripts.get(urlOrId) || 'unloaded';
  }

  public isScriptLoaded(urlOrId: string): boolean {
    return this.getScriptState(urlOrId) === 'loaded';
  }
}
