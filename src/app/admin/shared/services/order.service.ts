import { Injectable, inject } from '@angular/core';
import { DatastoreService, Order, QuoteRequest } from '../../../services/datastore';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private ds = inject(DatastoreService);

  orders = this.ds.orders;
  quotes = this.ds.quotes;

  updateOrderStatus(orderId: string, status: string, trackingNumber?: string) {
    return this.ds.updateOrderStatus(orderId, status, trackingNumber);
  }

  updateQuoteStatus(quoteId: string, status: string) {
    return this.ds.updateQuoteStatus(quoteId, status);
  }
}
