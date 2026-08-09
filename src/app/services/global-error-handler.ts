import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { LoggerService } from './logger.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    const logger = this.injector.get(LoggerService);

    const message = error?.message ? error.message : String(error || 'Unhandled Angular Error');
    const isChunkFailed = message.includes('Loading chunk') || message.includes('CSS_CHUNK_LOAD_FAILED');

    // Console output for local dev
    console.error('[GlobalErrorHandler] Uncaught Angular Exception:', error);

    logger.reportError(
      isChunkFailed ? 'Application update available or chunk load failed' : `Unhandled UI Error: ${message}`,
      error,
      {
        action: isChunkFailed ? 'CHUNK_LOAD_FAILURE' : 'UNHANDLED_EXCEPTION',
        isChunkFailed,
        url: window.location.href
      },
      'ANGULAR_UI'
    );
  }
}
