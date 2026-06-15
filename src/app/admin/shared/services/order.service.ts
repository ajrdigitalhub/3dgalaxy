import { Injectable, inject, signal } from '@angular/core';
import { DatastoreService, Order, QuoteRequest } from '../../../services/datastore';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../services/api.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private ds = inject(DatastoreService);
  private http = inject(HttpClient);
  private api = inject(ApiService);

  orders = signal<any[]>([]);
  quotes = this.ds.quotes;

  constructor() {
    this.fetchOrders();
  }

  async fetchOrders() {
    try {
      const resp = await this.api.get<any[]>('/orders').toPromise();
      if (resp) {
        this.orders.set(resp.map(o => ({
          ...o,
          customerName: o.customer?.user?.name || o.customer?.user?.firstName || 'Guest',
          customerPhone: o.customer?.user?.phone || 'N/A',
          status: o.status ? o.status.toLowerCase() : 'pending',
          grandTotal: o.totalAmount,
        })));
      }
    } catch(e) {
      console.error(e);
    }
  }

  updateOrderStatus(orderId: string, status: string, trackingNumber?: string) {
    return this.api.put(`/orders/${orderId}/status`, { status, trackingNumber }).toPromise().then(() => this.fetchOrders());
  }

  updateQuoteStatus(quoteId: string, status: string) {
    return this.ds.updateQuoteStatus(quoteId, status);
  }
}
