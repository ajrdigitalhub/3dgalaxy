import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { MetaCapiPayload, TrackingCustomerData, UtmParams } from '../../models/tracking.model';

@Injectable({
  providedIn: 'root'
})
export class MetaConversionsApiService {
  private api = inject(ApiService);

  public sendCapiEvent(
    eventName: string,
    eventId: string,
    customData: any = {},
    userData: TrackingCustomerData = {},
    utmParams?: UtmParams
  ) {
    const payload: MetaCapiPayload = {
      eventName,
      eventId,
      eventTime: Math.floor(Date.now() / 1000),
      eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
      userData,
      customData,
      utmParams
    };

    return this.api.post('/marketing/meta-capi', payload).subscribe({
      next: () => {},
      error: (err) => {
        console.warn('[Meta CAPI Server Proxy] Event dispatch failed:', err);
      }
    });
  }
}
