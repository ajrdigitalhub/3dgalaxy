import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { WeightPipe } from '../../../../shared/pipes/weight.pipe';
import { formatWeight } from '../../../../shared/utils/weight.utils';
import { ShipmentDialogComponent, ShipmentDetailsPayload } from '../shipment-dialog/shipment-dialog.component';
import { PackagingSlipService } from '../../../../services/packaging-slip.service';
import { PackagingSlipDialogComponent } from '../packaging-slip-dialog/packaging-slip-dialog.component';

@Component({
  selector: 'app-admin-order-details',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, ShipmentDialogComponent, PackagingSlipDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-details.html'
})
export class OrderDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  public location = inject(Location);
  private packagingSlipService = inject(PackagingSlipService);

  showSlipModal = signal(false);

  openPackagingSlipModal() {
    this.showSlipModal.set(true);
  }

  downloadPackagingSlip() {
    const ord = this.order();
    if (ord) {
      this.packagingSlipService.downloadPackagingSlip(ord.id, ord.orderNumber);
    }
  }

  backToOrders() {
    this.router.navigate(['/admin/orders']);
  }

  order = signal<any>(null);
  loading = signal(true);
  error = signal('');
  showShipmentModal = signal(false);

  displayOrderWeight = computed(() => {
    const ord = this.order();
    if (!ord) return '0 g';
    if (ord.displayWeight) return ord.displayWeight;
    const totalGrams = Number(ord.totalWeightInGrams || 0);
    if (totalGrams > 0) return formatWeight(totalGrams);

    const items = ord.items || [];
    const computedGrams = items.reduce((sum: number, i: any) => {
      const g = Number(i.weightInGrams || i.product?.weightInGrams || (i.product && i.product.weight) || 0);
      return sum + (g * (Number(i.quantity) || 1));
    }, 0);
    return formatWeight(computedGrams);
  });

  customerName = computed(() => {
    const ord = this.order();
    if (!ord) return '';
    if (ord.shippingAddress?.fullName) return ord.shippingAddress.fullName;
    if (ord.guestName) return ord.guestName;
    if (ord.customer?.user) {
      const u = ord.customer.user;
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
      return fullName || u.name || 'Valued Customer';
    }
    return 'Valued Customer';
  });

  shippingAddressObj = computed(() => {
    const ord = this.order();
    if (!ord) return null;
    if (ord.shippingAddress) return ord.shippingAddress;
    if (ord.guestAddress) {
      try {
        const parsed = typeof ord.guestAddress === 'string' ? JSON.parse(ord.guestAddress) : ord.guestAddress;
        return {
          fullName: ord.guestName || 'Guest User',
          addressLine1: parsed.addressLine1 || parsed.address || '',
          addressLine2: parsed.addressLine2 || '',
          city: parsed.city || '',
          state: parsed.state || '',
          postalCode: parsed.postalCode || parsed.pincode || '',
          country: parsed.country || 'India',
          phone: ord.guestPhone || 'Not provided'
        };
      } catch (e) {
        return {
          fullName: ord.guestName || 'Guest User',
          addressLine1: ord.guestAddress,
          phone: ord.guestPhone || 'Not provided'
        };
      }
    }
    return null;
  });

  billingAddressObj = computed(() => {
    const ord = this.order();
    if (!ord) return null;
    if (ord.billingAddress) return ord.billingAddress;
    return this.shippingAddressObj();
  });

  itemsSubtotal = computed(() => {
    const ord = this.order();
    if (!ord) return 0;
    if (Array.isArray(ord.items) && ord.items.length > 0) {
      return ord.items.reduce((sum: number, item: any) => {
        const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
        const qty = Number(item.quantity || 1);
        const itemTotal = item.totalPrice ? Number(item.totalPrice) : unitPrice * qty;
        return sum + itemTotal;
      }, 0);
    }
    const total = Number(ord.totalAmount || 0);
    const shipping = Number(ord.shippingAmount || 0);
    const cod = ord.paymentMethod === 'COD' ? Number(ord.codCharge || 100) : Number(ord.codCharge || 0);
    const tax = Number(ord.taxAmount || 0);
    const discount = Number(ord.discountAmount || 0);
    return Math.max(0, total - shipping - cod - tax + discount);
  });

  orderShipping = computed(() => {
    const ord = this.order();
    if (!ord) return 0;
    return Number(ord.shippingAmount || 0);
  });

  orderDiscount = computed(() => {
    const ord = this.order();
    if (!ord) return 0;
    return Number(ord.discountAmount || 0);
  });

  orderCodCharge = computed(() => {
    const ord = this.order();
    if (!ord) return 0;
    if (ord.codCharge !== undefined && ord.codCharge !== null && Number(ord.codCharge) > 0) {
      return Number(ord.codCharge);
    }
    return ord.paymentMethod === 'COD' ? 100 : 0;
  });

  orderTax = computed(() => {
    const ord = this.order();
    if (!ord) return 0;
    return Number(ord.taxAmount || 0);
  });

  orderTotal = computed(() => {
    const ord = this.order();
    if (!ord) return 0;
    const subtotal = this.itemsSubtotal();
    const shipping = this.orderShipping();
    const discount = this.orderDiscount();
    const cod = this.orderCodCharge();
    const tax = this.orderTax();
    const calculated = subtotal - discount + shipping + cod + tax;
    const dbTotal = Number(ord.totalAmount || 0);
    return dbTotal > 0 ? dbTotal : calculated;
  });

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

  isSameStatus(a: string | undefined, b: string): boolean {
    if (!a || !b) return false;
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }

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
    const cleanId = String(id || '').trim();
    const url = cleanId.startsWith('http') ? cleanId : `${environment.apiUrl}/orders/${encodeURIComponent(cleanId)}`;
    this.http.get<any>(url, this.getHeaders()).pipe(
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
    this.http.get<any[]>(`${environment.apiUrl}/orders`, this.getHeaders()).pipe(
      catchError(() => of([]))
    ).subscribe(res => {
      if (res && res.length > 0) {
        const filtered = res.filter(o => o.customerId === customerId && o.id !== currentOrderId);
        this.previousOrders.set(filtered);
      }
      this.loadingHistory.set(false);
    });
  }

  updateOrderStatus(status: string, selectEl?: HTMLSelectElement) {
    if (!status) return;

    if (status.toLowerCase() === 'shipped') {
      if (selectEl && this.order()) {
        selectEl.value = this.order().status || 'Confirmed';
      }
      this.showShipmentModal.set(true);
      return;
    }

    this.statusUpdating.set(true);
    this.http.put(`${environment.apiUrl}/orders/${this.order().id}/status`, { status }, this.getHeaders()).subscribe({
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

  onSaveShipmentPayload(payload: ShipmentDetailsPayload) {
    const ord = this.order();
    if (!ord) return;

    this.statusUpdating.set(true);
    this.http.put(`${environment.apiUrl}/orders/${ord.id}/status`, {
      status: 'Shipped',
      ...payload
    }, this.getHeaders()).subscribe({
      next: () => {
        this.showShipmentModal.set(false);
        this.fetchOrder(ord.orderNumber);
        this.statusUpdating.set(false);
      },
      error: (err: any) => {
        alert(err?.error?.error || 'Failed to save shipment details.');
        this.statusUpdating.set(false);
      }
    });
  }

  copyTrackingId(trackingNum: string) {
    if (!trackingNum) return;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(trackingNum);
      alert(`Copied Tracking ID: ${trackingNum}`);
    }
  }

  trackShipment(url: string) {
    if (!url) return;
    window.open(url, '_blank');
  }

  updatePaymentStatus(paymentStatus: string) {
    if (!paymentStatus) return;
    this.paymentUpdating.set(true);
    this.http.put(`${environment.apiUrl}/orders/${this.order().id}/payment`, { paymentStatus }, this.getHeaders()).subscribe({
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
    this.http.put(`${environment.apiUrl}/orders/${this.order().id}/shipment`, { 
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
    this.http.post(`${environment.apiUrl}/orders/${this.order().id}/notes`, { notes }, this.getHeaders()).subscribe({
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
    this.http.post(`${environment.apiUrl}/orders/${this.order().id}/resend-notification`, {}, this.getHeaders()).subscribe({
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
