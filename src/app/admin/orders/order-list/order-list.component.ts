import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { OrderService } from '../../shared/services/order.service';
import { ProductService } from '../../shared/services/product.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Order, Product } from '../../../services/datastore';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-order-list',
  imports: [CommonModule, MatIconModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss'
})
export class OrderListComponent {
  toastService = inject(ToastService);
  orderService = inject(OrderService);
  productService = inject(ProductService);

  activeSubTab = signal<'orders' | 'draft-orders' | 'abandoned-carts' | 'quotes'>('orders');

  // Selected Order for Inspect Dialog
  selectedOrder = signal<Order | null>(null);

  // Draft form states
  draftCustomerName = signal<string>('');
  draftCustomerEmail = signal<string>('');
  draftCustomerPhone = signal<string>('');
  draftAddress = signal<string>('');
  draftQuery = signal<string>('');
  draftItemSelectorOpen = signal<boolean>(false);
  draftSelectedItemsList = signal<Array<{ product: Product; qty: number }>>([]);
  taxRate = signal<number>(18);
  draftDiscountPercent = signal<number>(0);

  abandonedCartsList = signal([
    { id: 'ab1', email: 'vicky.sharma@outlook.com', phone: '+91 99120 44556', items: 'Bambu Lab A1 Mini (1), Core Filament Spool (2)', cartValue: 24500, date: '2026-06-05', customer: 'Vicky Sharma', recovered: false },
    { id: 'ab2', email: 'pankaj.mehta@mfg-hub.in', phone: '+91 88990 11223', items: 'Articulated PLA Toy (10)', cartValue: 7990, date: '2026-06-04', customer: 'Pankaj Mehta', recovered: false },
    { id: 'ab3', email: 'shubham_maker@gmail.com', phone: '+91 70123 99887', items: 'Creality Ender 3 V3 (1)', cartValue: 19999, date: '2026-06-02', customer: 'Shubham Singh', recovered: true }
  ]);

  draftSubtotal = computed(() => {
    return this.draftSelectedItemsList().reduce((sum, item) => sum + (item.product.sale_price * item.qty), 0);
  });

  draftTax = computed(() => 0);
  draftGrandTotal = computed(() => this.draftSubtotal() - this.draftDiscountPercent());

  setSubTab(tab: 'orders' | 'draft-orders' | 'abandoned-carts' | 'quotes') {
    this.activeSubTab.set(tab);
  }

  async updateOrderStatus(orderId: string, status: string) {
    try {
      await this.orderService.updateOrderStatus(orderId, status);
      this.toastService.info('Order workflow updated!');
    } catch {
      this.toastService.error('Failed to update status.');
    }
  }

  getStatusStyle(status: string): string {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'shipped': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'processing': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default: return 'bg-zinc-150 text-zinc-500 border-zinc-250 dark:bg-zinc-800 dark:text-zinc-400';
    }
  }

  getQuoteStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'estimated': return 'bg-blue-500/10 text-blue-500 border-blue-500/25';
      case 'approved_by_customer': return 'bg-amber-500/10 text-amber-500 border-amber-500/25 animate-pulse';
      default: return 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-855';
    }
  }

  // --- Invoice draft creator ---
  selectDraftItem(product: Product) {
    const list = this.draftSelectedItemsList();
    const existing = list.find(x => x.product.id === product.id);
    if (existing) {
      this.updateDraftItemQty(product.id, existing.qty + 1);
    } else {
      this.draftSelectedItemsList.set([...list, { product, qty: 1 }]);
    }
    this.draftQuery.set('');
  }

  updateDraftItemQty(productId: string, qtyRaw: any) {
    const qty = Math.max(1, parseInt(qtyRaw) || 1);
    this.draftSelectedItemsList.update(items => items.map(i => i.product.id === productId ? { ...i, qty } : i));
  }

  removeDraftItem(productId: string) {
    this.draftSelectedItemsList.update(items => items.filter(i => i.product.id !== productId));
  }

  async submitDraftOrder() {
    const custName = this.draftCustomerName().trim();
    const custEmail = this.draftCustomerEmail().trim();
    if (!custName || !custEmail) {
      this.toastService.info('Customer name and email are mandatory for manual Draft Orders.');
      return;
    }
    if (this.draftSelectedItemsList().length === 0) {
      this.toastService.info('Please add at least one physical SKU to manual draft.');
      return;
    }

    const randomId = 'order-' + Date.now();
    const orderNum = 'GLX-' + Math.floor(100000 + Math.random() * 900000);
    const items = this.draftSelectedItemsList().map(i => ({
      productId: i.product.id,
      name: i.product.name,
      quantity: i.qty,
      price: i.product.sale_price,
      mrp: i.product.mrp
    }));

    const newOrder: Order = {
      id: randomId,
      orderNumber: orderNum,
      customerName: custName,
      customerEmail: custEmail,
      customerPhone: this.draftCustomerPhone().trim() || '+91 99999 99999',
      shippingAddress: this.draftAddress().trim() || 'Custom Order Warehouse Pickup',
      items,
      subtotal: this.draftSubtotal(),
      discount: this.draftDiscountPercent(),
      shippingFee: 0,
      tax: this.draftTax(),
      grandTotal: this.draftGrandTotal(),
      status: 'pending',
      date: new Date().toISOString(),
      paymentMethod: 'Manual Draft Pay Link',
      paymentStatus: 'unpaid'
    };

    try {
      this.orderService.orders.update(all => [newOrder, ...all]);
      this.toastService.success(`Manual Order ${orderNum} generated successfully!`);
      // Reset state
      this.draftCustomerName.set('');
      this.draftCustomerEmail.set('');
      this.draftCustomerPhone.set('');
      this.draftAddress.set('');
      this.draftSelectedItemsList.set([]);
      this.draftDiscountPercent.set(0);
      this.setSubTab('orders');
    } catch {
      this.toastService.error('Failed: Write permission error. Please authenticate as Super Admin.');
    }
  }

  // --- Recovery Blasts ---
  sendRecoveryBlast(id: string) {
    this.abandonedCartsList.update(all => all.map(c => c.id === id ? { ...c, recovered: true } : c));
    this.toastService.success('Mailing recovery coupon voucher successfully deployed.');
  }

  // --- Quotes Overrides ---
  overrideQuotePrice(quoteId: string, event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.orderService.quotes.update(all => all.map(q => q.id === quoteId ? { ...q, estimatedCost: val } : q));
    }
  }

  async approveEstimate(quoteId: string) {
    try {
      await this.orderService.updateQuoteStatus(quoteId, 'estimated');
      this.toastService.info('Estimate published to customer console.');
    } catch {
      this.toastService.error('Error publishing estimate.');
    }
  }

  async completeQuoteFab(quoteId: string) {
    try {
      await this.orderService.updateQuoteStatus(quoteId, 'completed');
      this.toastService.info('Job marked as completed.');
    } catch {
      this.toastService.error('Error updating job status.');
    }
  }

  inspectOrder(o: Order) {
    this.selectedOrder.set(o);
  }

  closeInspect() {
    this.selectedOrder.set(null);
  }
}
