import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-customer-order-details',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-details.html'
})
export class CustomerOrderDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  public location = inject(Location);
  private toastService = inject(ToastService);

  order = signal<any>(null);
  loading = signal(true);
  error = signal('');

  // Support ticket inputs
  ticketCat = signal<string>('Logistics inquiry');
  ticketSub = signal<string>('');
  ticketDesc = signal<string>('');
  ticketSubmitting = signal(false);

  // Define order tracking lifecycle steps
  trackingSteps = [
    { key: 'Pending', label: 'Order Placed', icon: 'shopping_bag', desc: 'Your order was submitted successfully.' },
    { key: 'Confirmed', label: 'Confirmed', icon: 'gavel', desc: 'The workshop approved and verified your order.' },
    { key: 'Processing', label: 'Processing', icon: 'precision_manufacturing', desc: 'Slicing models and generating toolpath layers.' },
    { key: 'Packed', label: 'Packed', icon: 'inventory_2', desc: 'Your precision 3D parts are safely packed.' },
    { key: 'Shipped', label: 'Shipped', icon: 'local_shipping', desc: 'Package has been dispatched with Delhivery.' },
    { key: 'Out for Delivery', label: 'Out for Delivery', icon: 'moped', desc: 'Courier representative is arriving today.' },
    { key: 'Delivered', label: 'Delivered', icon: 'task_alt', desc: 'Succesfully dropped off at your address!' }
  ];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const orderNumber = params.get('orderNumber');
      if (orderNumber) {
        this.fetchOrder(orderNumber);
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
        this.error.set(err.error?.error || 'Failed to locate order detail tracking.');
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

  getCurrentStepIndex(): number {
    const currentStatus = this.order()?.status || 'Pending';
    
    // Normalize status names for comparison
    const searchStatus = currentStatus.toLowerCase();
    
    // Handle edge statuses like Cancelled, Returned, Refunded
    if (['cancelled', 'returned', 'refunded'].includes(searchStatus)) {
      return -1;
    }

    const stepIndex = this.trackingSteps.findIndex(
      step => step.key.toLowerCase() === searchStatus || 
              (step.key === 'Out for Delivery' && searchStatus === 'out for delivery')
    );

    return stepIndex !== -1 ? stepIndex : 0;
  }

  isStepCompleted(index: number): boolean {
    const currentIndex = this.getCurrentStepIndex();
    if (currentIndex === -1) return false;
    return index < currentIndex;
  }

  isStepActive(index: number): boolean {
    const currentIndex = this.getCurrentStepIndex();
    return index === currentIndex;
  }

  isStepPending(index: number): boolean {
    const currentIndex = this.getCurrentStepIndex();
    if (currentIndex === -1) return true;
    return index > currentIndex;
  }

  getStatusBadgeClass(status: string): string {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'delivered':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15';
      case 'shipped':
      case 'out for delivery':
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/15';
      case 'processing':
      case 'confirmed':
      case 'packed':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/15';
      case 'cancelled':
      case 'returned':
      case 'refunded':
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/15';
      default:
        return 'bg-neutral-500/10 text-neutral-500 border border-neutral-500/15';
    }
  }

  printInvoice() {
    window.print();
  }

  submitSupportTicket() {
    const sub = this.ticketSub().trim();
    const desc = this.ticketDesc().trim();
    const currentOrder = this.order();

    if (!sub || !desc) {
      this.toastService.warning('Kindly input both subject and description parameters to alert our systems.');
      return;
    }

    this.ticketSubmitting.set(true);

    // Simulate submission with 1s latency
    setTimeout(() => {
      this.toastService.success(
        `SUPPORT DISPATCH SUCCESS!\n\nReference Ticket Code: #TICK-ORD-${currentOrder?.orderNumber?.replace('ORD-', '') || 'HELP'}\n\nOur specialized 3D workshop and logistics crew will troubleshoot this and update you at your account email inside 4-6 hours.`
      );
      this.ticketSub.set('');
      this.ticketDesc.set('');
      this.ticketSubmitting.set(false);
    }, 1000);
  }
}
