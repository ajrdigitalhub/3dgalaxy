import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-admin-order-details',
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

  // Status updates
  statusUpdating = signal(false);
  paymentUpdating = signal(false);
  shipmentUpdating = signal(false);
  noteAdding = signal(false);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('orderNumber');
      if (id) {
        this.fetchOrder(id);
      }
    });
  }

  fetchOrder(id: string) {
    this.loading.set(true);
    this.http.get<any>(`/api/orders/${id}`).pipe(
      catchError(err => {
        this.error.set(err.error?.error || 'Failed to load order detailed logic.');
        this.loading.set(false);
        return of(null);
      })
    ).subscribe(res => {
      if (res) {
        this.order.set(res);
      }
      this.loading.set(false);
    });
  }

  updateOrderStatus(status: string) {
    if (!confirm(`Are you sure you want to update status to ${status}?`)) return;
    this.statusUpdating.set(true);
    this.http.put(`/api/orders/${this.order().id}/status`, { status }).subscribe({
      next: () => {
        this.fetchOrder(this.order().orderNumber);
        this.statusUpdating.set(false);
      },
      error: () => {
        alert('Failed to update status');
        this.statusUpdating.set(false);
      }
    });
  }

  updatePaymentStatus(paymentStatus: string) {
    if (!confirm(`Are you sure you want to update payment to ${paymentStatus}?`)) return;
    this.paymentUpdating.set(true);
    this.http.put(`/api/orders/${this.order().id}/payment`, { paymentStatus }).subscribe({
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
    if (!carrier) return alert('Carrier name required');
    this.shipmentUpdating.set(true);
    this.http.put(`/api/orders/${this.order().id}/shipment`, { 
      shipmentCarrier: carrier, 
      trackingNumber,
      trackingUrl,
      estimatedDeliveryDate
    }).subscribe({
      next: () => {
        this.fetchOrder(this.order().orderNumber);
        this.shipmentUpdating.set(false);
      },
      error: () => {
        alert('Failed to confirm shipment profile');
        this.shipmentUpdating.set(false);
      }
    });
  }

  addNote(notes: string) {
    if (!notes) return;
    this.noteAdding.set(true);
    this.http.post(`/api/orders/${this.order().id}/notes`, { notes }).subscribe({
      next: () => {
        this.fetchOrder(this.order().orderNumber);
        this.noteAdding.set(false);
      },
      error: () => {
        alert('Failed to dispatch internal directive note');
        this.noteAdding.set(false);
      }
    });
  }

  printInvoice() {
    window.print();
  }
}
