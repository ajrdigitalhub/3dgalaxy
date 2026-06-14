import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private activeRequests = 0;
  
  // Expose signal for global loading state
  isLoading = signal<boolean>(false);

  startLoading() {
    this.activeRequests++;
    if (this.activeRequests > 0) {
      this.isLoading.set(true);
    }
  }

  stopLoading() {
    this.activeRequests--;
    if (this.activeRequests <= 0) {
      this.activeRequests = 0;
      this.isLoading.set(false);
    }
  }
}
