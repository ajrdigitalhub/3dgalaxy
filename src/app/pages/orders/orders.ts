import {Component, ChangeDetectionStrategy, inject, signal, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {HttpClient} from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import {DatastoreService, Order} from '../../services/datastore';
import { ToastService } from '../../shared/components/toast/toast.service';

@Component({
  selector: 'app-orders-tracking',
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders.html',
  styleUrl: './orders.scss'
})
export class OrdersTracking {
  toastService = inject(ToastService);
  ds = inject(DatastoreService);

  searchPhoneQuery = signal<string>('');
  activeInvoice = signal<Order | null>(null);

  // Ticket inputs
  ticketCat = signal<string>('Nozzle Clog');
  ticketSub = signal<string>('');
  ticketDesc = signal<string>('');

  memberOrders = signal<any[]>([]);

  tracedOrders = computed(() => {
    const phone = this.searchPhoneQuery().trim();
    if (phone.length < 10) return [];
    return this.ds.orders().filter(o => o.customerPhone.includes(phone));
  });

  http = inject(HttpClient);
  api = inject(ApiService);

  constructor() {
    // If registered role preexists, default values
    const r = this.ds.userRole();
    if (r !== 'guest') {
      this.searchPhoneQuery.set(this.ds.activeUser()?.phone || '');
      this.fetchMyOrders();
    }
  }

  async fetchMyOrders() {
    try {
      const orders = await this.api.get<any[]>('/orders/my-orders').toPromise();
      if (orders) {
         this.memberOrders.set(orders.map(o => ({
           id: o.id,
           orderNumber: o.orderNumber,
           date: new Date(o.createdAt).toLocaleDateString(),
           status: o.status ? o.status.toLowerCase() : 'pending',
           items: o.items.map((i: any) => ({
              productId: i.productId,
              name: i.product?.name || 'Product',
              quantity: i.quantity,
              price: i.price
           })),
           grandTotal: o.totalAmount,
           trackingNumber: null,
           paymentMethod: o.payments && o.payments.length > 0 ? o.payments[0].method : 'Unknown'
         })));
      }
    } catch (e) {
      console.error('Error fetching orders', e);
    }
  }

  getStatusStyle(status: string) {
    switch (status) {
      case 'delivered': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15';
      case 'processing': return 'bg-blue-500/10 text-blue-500 border border-blue-500/15';
      case 'shipped': return 'bg-purple-500/10 text-purple-500 border border-purple-500/15';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/15';
      default: return 'bg-red-500/10 text-red-500 border border-red-500/15';
    }
  }

  onPhoneInput(event: Event) {
    this.searchPhoneQuery.set((event.target as HTMLInputElement).value);
  }

  openInvoiceSimulation(ord: Order) {
    this.activeInvoice.set(ord);
  }

  triggerPrintInvoice(ord: Order) {
    const pdfData = `
3D GALAXY PRINTING LABS - OFFICIAL SALES TAX INVOICE
===================================================
Invoice Number: ${ord.orderNumber}
Issued To: ${ord.customerName} (Email: ${ord.customerEmail}, Phone: ${ord.customerPhone})
Date of Invoice: ${ord.date}
GSTIN Registration Type: Taxable Business Supply B2C / B2B

Particular Component list:
${ord.items.map(i => `- ${i.name} (x${i.quantity}) @ ₹${i.price} each.`).join('\n')}

Subtotal Net: ₹${ord.subtotal}
Loyalty Code Rebates: -₹${ord.discount}
Secured Logistics Shipping Run: ₹${ord.shippingFee}
Gross Included GST Taxes (18%): ₹${ord.tax}
---------------------------------------------------
Grand Net Payable (INR): ₹${ord.grandTotal} (Paid via ${ord.paymentMethod})
===================================================
Thank you for building the future with 3D Galaxy!
    `;
    this.toastService.info(pdfData);
  }

  simulateDownload(name: string) {
    this.toastService.info(`DOWNLOAD STARTED: Curating download libraries for "${name}" safely inside your browser. Checkout your notifications!`);
  }

  submitTicket() {
    const sub = this.ticketSub().trim();
    const desc = this.ticketDesc().trim();
    if (!sub || !desc) {
      this.toastService.warning('WARNING: Kindly input subject and description details for helpdesk analysis.');
      return;
    }

    this.toastService.success(`SUPPORT TICKET SUBMITTED SUCCESS!\n\nReference Ticket ID: #TICK-${Math.floor(1000 + Math.random() * 9000)}\n\n3D Galaxy tech labs team will analyze your retraction profile and reply on your email: ${this.ds.activeUser().email} inside 6 hours.`);
    this.ticketSub.set('');
    this.ticketDesc.set('');
  }
}
