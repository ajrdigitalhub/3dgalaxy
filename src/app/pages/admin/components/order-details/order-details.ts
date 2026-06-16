import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-admin-order-details',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-details.html'
})
export class OrderDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  public location = inject(Location);

  order = signal<any>(null);
  loading = signal(true);
  error = signal('');

  // Previous orders history of this same customer
  previousOrders = signal<any[]>([]);
  loadingHistory = signal(false);

  // Status updates indicators
  statusUpdating = signal(false);
  paymentUpdating = signal(false);
  shipmentUpdating = signal(false);
  noteAdding = signal(false);
  notificationResending = signal(false);

  // Quick list of configurable statuses
  statuses = [
    'Pending',
    'Confirmed',
    'Processing',
    'Packed',
    'Shipped',
    'Out for Delivery',
    'Delivered',
    'Cancelled',
    'Returned',
    'Refunded'
  ];

  // Quick list of payment statuses
  paymentStatuses = [
    'Pending',
    'Paid',
    'Refunded',
    'Failed'
  ];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('orderNumber');
      if (id) {
        this.fetchOrder(id);
      }
    });
  }

  private getHeaders() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        return { headers: { 'Authorization': `Bearer ${token}` } };
      }
    }
    return {};
  }

  fetchOrder(id: string) {
    this.loading.set(true);
    this.http.get<any>(`/api/orders/${id}`, this.getHeaders()).pipe(
      catchError(err => {
        this.error.set(err.error?.error || 'Failed to load order detailed logic.');
        this.loading.set(false);
        return of(null);
      })
    ).subscribe(res => {
      if (res) {
        this.order.set(res);
        if (res.customerId) {
          this.fetchCustomerHistory(res.customerId, res.id);
        }
      }
      this.loading.set(false);
    });
  }

  fetchCustomerHistory(customerId: string, currentOrderId: string) {
    this.loadingHistory.set(true);
    this.http.get<any[]>('/api/orders', this.getHeaders()).pipe(
      catchError(() => of([]))
    ).subscribe(res => {
      if (res && res.length > 0) {
        const filtered = res.filter(o => o.customerId === customerId && o.id !== currentOrderId);
        this.previousOrders.set(filtered);
      }
      this.loadingHistory.set(false);
    });
  }

  updateOrderStatus(status: string) {
    if (!status) return;
    this.statusUpdating.set(true);
    this.http.put(`/api/orders/${this.order().id}/status`, { status }, this.getHeaders()).subscribe({
      next: () => {
        this.fetchOrder(this.order().orderNumber);
        this.statusUpdating.set(false);
      },
      error: () => {
        alert('Failed to update order status');
        this.statusUpdating.set(false);
      }
    });
  }

  updatePaymentStatus(paymentStatus: string) {
    if (!paymentStatus) return;
    this.paymentUpdating.set(true);
    this.http.put(`/api/orders/${this.order().id}/payment`, { paymentStatus }, this.getHeaders()).subscribe({
      next: () => {
        this.fetchOrder(this.order().orderNumber);
        this.paymentUpdating.set(false);
      },
      error: () => {
        alert('Failed to update payment status');
        this.paymentUpdating.set(false);
      }
    });
  }

  updateShipment(carrier: string, trackingNumber: string, trackingUrl: string, estimatedDeliveryDate: string) {
    if (!carrier) return alert('Carrier company name is required');
    this.shipmentUpdating.set(true);
    this.http.put(`/api/orders/${this.order().id}/shipment`, { 
      shipmentCarrier: carrier, 
      trackingNumber,
      trackingUrl,
      estimatedDeliveryDate
    }, this.getHeaders()).subscribe({
      next: () => {
        this.fetchOrder(this.order().orderNumber);
        this.shipmentUpdating.set(false);
      },
      error: () => {
        alert('Failed to update shipping registry');
        this.shipmentUpdating.set(false);
      }
    });
  }

  addNote(notes: string, noteInputEl: HTMLTextAreaElement) {
    if (!notes || !notes.trim()) return;
    this.noteAdding.set(true);
    this.http.post(`/api/orders/${this.order().id}/notes`, { notes }, this.getHeaders()).subscribe({
      next: () => {
        this.fetchOrder(this.order().orderNumber);
        noteInputEl.value = '';
        this.noteAdding.set(false);
      },
      error: () => {
        alert('Failed to add internal admin note');
        this.noteAdding.set(false);
      }
    });
  }

  resendNotification() {
    this.notificationResending.set(true);
    this.http.post(`/api/orders/${this.order().id}/resend-notification`, {}, this.getHeaders()).subscribe({
      next: (res: any) => {
        alert(res.message || 'Customer notification resent successfully');
        this.notificationResending.set(false);
      },
      error: (err) => {
        alert(err.error?.error || 'Failed to dispatch order notification');
        this.notificationResending.set(false);
      }
    });
  }

  cancelOrder() {
    if (confirm('Are you absolutely sure you want to Cancel this order? This will transition status to Cancelled and update records.')) {
      this.updateOrderStatus('Cancelled');
    }
  }

  markAsRefunded() {
    if (confirm('Are you sure you want to mark this transaction as Refunded? This will update the Payment Status log to Refunded.')) {
      this.updatePaymentStatus('Refunded');
    }
  }

  getWarehouseStock(item: any): string {
    const inventories = item.variant?.inventory || item.product?.inventory || [];
    if (inventories.length === 0) {
      return 'No stock records mapping available';
    }
    return inventories.map((inv: any) => 
      `${inv.warehouse?.name || 'Main Warehouse'}: ${inv.quantity} units (Reserved: ${inv.reservedQty || 0})`
    ).join(', ');
  }

  printInvoice() {
    window.print();
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PAID':
      case 'SUCCESS':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'REFUNDED':
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      default:
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
    }
  }
}
