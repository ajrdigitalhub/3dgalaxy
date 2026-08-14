import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  computed,
} from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { ToastService } from "../../../../shared/components/toast/toast.service";
import { catchError } from "rxjs/operators";
import { of, firstValueFrom } from "rxjs";
import { SettingsService } from "../../../../core/services/settings.service";
import { environment } from "../../../../../environments/environment";
import { SupportRequestDialogComponent } from "../support-request-dialog/support-request-dialog.component";
import { OrderSupportMessageService } from "../../../../services/order-support-message.service";

@Component({
  selector: "app-customer-order-details",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, SupportRequestDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./order-details.html",
})
export class CustomerOrderDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  public location = inject(Location);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private settingsService = inject(SettingsService);
  public supportService = inject(OrderSupportMessageService);

  order = signal<any>(null);
  loading = signal(true);
  error = signal("");

  // Support Center Reactive State Signals
  selectedSupportTopic = signal<string>('');
  supportAnswers = signal<Record<string, string>>({});
  supportAdditionalDetails = signal<string>('');

  showSupportDialog = signal(false);
  selectedSupportType = signal('Return');

  availableSupportTopics = computed(() => {
    const status = this.order()?.status;
    return this.supportService.getSupportTopics(status);
  });

  currentTopicQuestions = computed(() => {
    const topic = this.selectedSupportTopic();
    return topic ? this.supportService.getQuestionsForTopic(topic) : [];
  });

  generatedSupportMessage = computed(() => {
    const ord = this.order();
    const topic = this.selectedSupportTopic();
    const answers = this.supportAnswers();
    const details = this.supportAdditionalDetails();
    const custName = this.customerName();
    return this.supportService.generateSupportMessage(ord, topic, answers, details, custName);
  });

  generatedWhatsAppUrl = computed(() => {
    const msg = this.generatedSupportMessage();
    const adminPhone = this.supportService.getAdminWhatsAppNumber();
    return this.supportService.generateWhatsAppUrl(adminPhone, msg);
  });

  generatedEmailUrl = computed(() => {
    const ord = this.order();
    const orderId = ord?.orderNumber || ord?.id || '';
    const msg = this.generatedSupportMessage();
    return this.supportService.generateEmailUrl('3dgalaxy@hotmail.com', orderId, msg);
  });

  onSupportTopicChange(topic: string) {
    this.selectedSupportTopic.set(topic);
    this.supportAnswers.set({});
  }

  onQuestionAnswerChange(questionId: string, value: string) {
    this.supportAnswers.update(curr => ({ ...curr, [questionId]: value }));
  }

  onAdditionalDetailsChange(value: string) {
    this.supportAdditionalDetails.set(value.slice(0, 1000));
  }

  openWhatsAppSupport() {
    const topic = this.selectedSupportTopic();
    if (!topic) {
      this.toastService.warning('Please select a support topic first.');
      return;
    }
    const url = this.generatedWhatsAppUrl();
    window.open(url, '_blank');
  }

  openEmailSupport() {
    const topic = this.selectedSupportTopic();
    if (!topic) {
      this.toastService.warning('Please select a support topic first.');
      return;
    }
    const url = this.generatedEmailUrl();
    window.open(url, '_blank');
  }

  deliveredDate = computed(() => {
    const ord = this.order();
    if (!ord) return null;
    const deliveredLog = ord.statusHistory?.find(
      (h: any) => h.status.toLowerCase() === 'delivered'
    );
    if (deliveredLog) {
      return new Date(deliveredLog.createdAt);
    }
    if (ord.status && ord.status.toLowerCase() === 'delivered') {
      return new Date(ord.updatedAt || ord.createdAt);
    }
    return null;
  });

  isReturnEligible = computed(() => {
    const delDate = this.deliveredDate();
    if (!delDate) return false;
    const windowDays = this.settingsService.supportSettings()?.returnWindowDays || 10;
    const elapsedMs = Date.now() - delDate.getTime();
    return elapsedMs <= windowDays * 24 * 60 * 60 * 1000;
  });

  isRefundEligible = computed(() => {
    const delDate = this.deliveredDate();
    if (!delDate) return false;
    const windowDays = this.settingsService.supportSettings()?.refundWindowDays || 10;
    const elapsedMs = Date.now() - delDate.getTime();
    return elapsedMs <= windowDays * 24 * 60 * 60 * 1000;
  });

  openSupportDialog(type: string) {
    this.selectedSupportType.set(type);
    this.showSupportDialog.set(true);
  }

  customerName = computed(() => {
    const ord = this.order();
    if (!ord) return "";
    if (ord.shippingAddress?.fullName) return ord.shippingAddress.fullName;
    if (ord.guestName) return ord.guestName;
    if (ord.customer?.user) {
      const u = ord.customer.user;
      const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim();
      return fullName || u.name || "Valued Customer";
    }
    return "Valued Customer";
  });

  private cleanAddress(rawAddr: any, ord: any) {
    if (!rawAddr) return null;
    let addr = { ...rawAddr };

    let fullName = addr.fullName || addr.name || '';
    let phone = addr.phone || addr.mobile || addr.contactNumber || '';
    let addressLine1 = addr.addressLine1 || addr.address || '';

    if (addressLine1 && addressLine1.includes('|')) {
      const parts = addressLine1.split('|').map((p: string) => p.trim());
      if (parts.length >= 4) {
        if (!fullName || fullName === 'Customer' || fullName === 'Valued Customer') {
          if (parts[0] && parts[0] !== 'Customer' && parts[0] !== 'Valued Customer') {
            fullName = parts[0];
          }
        }
        if (!phone) {
          if (/^\+?\d{8,15}$/.test(parts[1].replace(/[\s-]/g, ''))) {
            phone = parts[1];
          }
        }
        addressLine1 = parts.slice(3).join(' | ');
      }
    }

    if (!fullName || fullName === 'Customer' || fullName === 'Valued Customer') {
      const u = ord?.customer?.user;
      fullName = 
        ord?.customerName || 
        ord?.contactDetails?.name || 
        (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : null) || 
        ord?.guestName || 
        'Valued Customer';
    }

    if (!phone || phone === 'Not provided') {
      const u = ord?.customer?.user;
      phone = 
        ord?.customerPhone || 
        ord?.contactDetails?.phone || 
        ord?.customer?.phone || 
        u?.mobile || 
        ord?.guestPhone || 
        'Not provided';
    }

    return {
      ...addr,
      fullName,
      phone,
      addressLine1
    };
  }

  shippingAddressObj = computed(() => {
    const ord = this.order();
    if (!ord) return null;
    if (ord.shippingAddress) return this.cleanAddress(ord.shippingAddress, ord);
    if (ord.guestAddress) {
      try {
        const parsed =
          typeof ord.guestAddress === "string"
            ? JSON.parse(ord.guestAddress)
            : ord.guestAddress;
        return this.cleanAddress({
          fullName: ord.guestName || "Guest User",
          addressLine1: parsed.addressLine1 || parsed.address || "",
          addressLine2: parsed.addressLine2 || "",
          city: parsed.city || "",
          state: parsed.state || "",
          postalCode: parsed.postalCode || parsed.pincode || "",
          country: parsed.country || "India",
          phone: ord.guestPhone || "Not provided",
        }, ord);
      } catch (e) {
        return this.cleanAddress({
          fullName: ord.guestName || "Guest User",
          addressLine1: ord.guestAddress,
          phone: ord.guestPhone || "Not provided",
        }, ord);
      }
    }
    return null;
  });

  billingAddressObj = computed(() => {
    const ord = this.order();
    if (!ord) return null;
    if (ord.billingAddress) return this.cleanAddress(ord.billingAddress, ord);
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



  trackingSteps = [
    {
      key: "Pending",
      label: "Order Placed",
      icon: "shopping_bag",
      desc: "Your order was received successfully.",
    },
    {
      key: "Confirmed",
      label: "Confirmed",
      icon: "fact_check",
      desc: "The order was verified and prepared for packing.",
    },
    {
      key: "Processing",
      label: "Packed",
      icon: "inventory_2",
      desc: "Your items are packed and ready for dispatch.",
    },
    {
      key: "Shipped",
      label: "Shipped",
      icon: "local_shipping",
      desc: "The shipment is on its way to your address.",
    },
    {
      key: "Out for Delivery",
      label: "Out for Delivery",
      icon: "moped",
      desc: "The courier is on the final delivery leg.",
    },
    {
      key: "Delivered",
      label: "Delivered",
      icon: "task_alt",
      desc: "Your order was delivered successfully.",
    },
    {
      key: "Cancelled",
      label: "Cancelled",
      icon: "cancel",
      desc: "The order was cancelled before dispatch.",
    },
    {
      key: "Returned",
      label: "Returned",
      icon: "undo",
      desc: "The order was returned and processed.",
    },
  ];

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const orderNumber = params.get("orderNumber");
      if (orderNumber) {
        this.fetchOrder(orderNumber);
      }
    });
  }

  private getHeaders() {
    const headers: any = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const guestId = localStorage.getItem("guest_session_id");
      if (guestId) {
        headers["x-guest-session-id"] = guestId;
      }
    }
    return { headers };
  }

  fetchOrder(id: string) {
    this.loading.set(true);
    const cleanId = String(id || '').trim();
    const url = cleanId.startsWith('http') ? cleanId : `${environment.apiUrl}/orders/${encodeURIComponent(cleanId)}`;
    this.http
      .get<any>(url, this.getHeaders())
      .pipe(
        catchError((err) => {
          this.error.set(
            err.error?.error || "Failed to locate order detail tracking.",
          );
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe((res) => {
        if (res) {
          this.order.set(res);
        }
        this.loading.set(false);
      });
  }

  getVisibleSteps(): any[] {
    const status = (this.order()?.status || "").toLowerCase();
    const baseSteps = [
      { key: "pending", label: "Order Placed", icon: "shopping_bag", desc: "Your order was received successfully." },
      { key: "confirmed", label: "Confirmed", icon: "fact_check", desc: "The order was verified and prepared for packing." },
      { key: "processing", label: "Packed", icon: "inventory_2", desc: "Your items are packed and ready for dispatch." },
      { key: "shipped", label: "Shipped", icon: "local_shipping", desc: "The shipment is on its way to your address." },
      { key: "out for delivery", label: "Out for Delivery", icon: "moped", desc: "The courier is on the final delivery leg." },
      { key: "delivered", label: "Delivered", icon: "task_alt", desc: "Your order was delivered successfully." }
    ];

    if (status === "cancelled") {
      return [
        baseSteps[0],
        baseSteps[1],
        { key: "cancelled", label: "Cancelled", icon: "cancel", desc: "The order was cancelled." }
      ];
    }

    if (status === "returned" || status === "refunded") {
      return [
        ...baseSteps,
        { key: "returned", label: "Returned", icon: "undo", desc: "The order was returned successfully." }
      ];
    }

    return baseSteps;
  }

  getCurrentStepIndex(): number {
    const status = (this.order()?.status || "Pending").toLowerCase();
    if (status === "cancelled") {
      return 2;
    }
    if (status === "returned" || status === "refunded") {
      return 6;
    }
    if (status === "delivered") {
      return 5;
    }
    if (status === "out for delivery") {
      return 4;
    }
    if (status === "shipped") {
      return 3;
    }
    if (status === "packed" || status === "processing") {
      return 2;
    }
    if (status === "confirmed") {
      return 1;
    }
    return 0;
  }

  isStepCompleted(index: number): boolean {
    const currentIndex = this.getCurrentStepIndex();
    const status = (this.order()?.status || "Pending").toLowerCase();
    if (status === "delivered" && index <= 5) {
      return true;
    }
    if (status === "cancelled" && index < 2) {
      return true;
    }
    if ((status === "returned" || status === "refunded") && index < 6) {
      return true;
    }
    return index < currentIndex;
  }

  isStepActive(index: number): boolean {
    const currentIndex = this.getCurrentStepIndex();
    const status = (this.order()?.status || "Pending").toLowerCase();
    if (status === "delivered") {
      return false;
    }
    return index === currentIndex;
  }

  isStepPending(index: number): boolean {
    const currentIndex = this.getCurrentStepIndex();
    const status = (this.order()?.status || "Pending").toLowerCase();
    if (status === "delivered") {
      return false;
    }
    if (status === "cancelled" && index === 2) {
      return false;
    }
    if ((status === "returned" || status === "refunded") && index === 6) {
      return false;
    }
    return index > currentIndex;
  }

  getOverrideState(): string {
    const status = (this.order()?.status || "").toLowerCase();
    if (status === "cancelled") return "cancelled";
    if (status === "returned" || status === "refunded") return "returned";
    return "standard";
  }

  getLineProgressWidth(): number {
    const visibleSteps = this.getVisibleSteps();
    const currentIndex = this.getCurrentStepIndex();
    if (visibleSteps.length <= 1) return 0;
    const status = (this.order()?.status || "").toLowerCase();
    if (status === "delivered") return 100;
    return (currentIndex / (visibleSteps.length - 1)) * 100;
  }

  getStatusBadgeClass(status: string): string {
    const s = (status || "pending").toLowerCase();
    switch (s) {
      case "delivered":
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/15";
      case "shipped":
      case "out for delivery":
        return "bg-blue-500/10 text-blue-500 border border-blue-500/15";
      case "processing":
      case "confirmed":
      case "packed":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/15";
      case "cancelled":
      case "returned":
      case "refunded":
        return "bg-rose-500/10 text-rose-500 border border-rose-500/15";
      default:
        return "bg-neutral-500/10 text-neutral-500 border border-neutral-500/15";
    }
  }

  isDelivered = computed(() => {
    const status = (this.order()?.status || '').toUpperCase();
    return status === 'DELIVERED';
  });



  canReviewOrder(): boolean {
    return (this.order()?.status || "").toLowerCase() === "delivered";
  }

  openProductReview(item: any) {
    const slug = item?.product?.slug;
    if (!slug) return;
    this.router.navigate(["/product", slug], {
      state: { orderId: this.order()?.id || this.order()?.orderNumber || "" },
    });
  }

  getColorCode(colorName: string): string {
    if (!colorName || typeof colorName !== 'string') return '#cbd5e1';
    const c = colorName.toLowerCase().trim();
    if (c.includes('black') || c.includes('dark')) return '#09090b';
    if (c.includes('white')) return '#ffffff';
    if (c.includes('grey') || c.includes('gray') || c.includes('silver')) return '#94a3b8';
    if (c.includes('blue') || c.includes('navy')) return '#3b82f6';
    if (c.includes('green') || c.includes('emerald') || c.includes('mint')) return '#22c55e';
    if (c.includes('red') || c.includes('crimson') || c.includes('ruby')) return '#ef4444';
    if (c.includes('yellow') || c.includes('gold')) return '#eab308';
    if (c.includes('orange') || c.includes('copper')) return '#f97316';
    if (c.includes('purple') || c.includes('violet')) return '#a855f7';
    if (c.includes('pink') || c.includes('rose')) return '#ec4899';
    if (c.includes('cyan') || c.includes('teal')) return '#14b8a6';
    if (c.includes('brown') || c.includes('chocolate')) return '#854d0e';
    return '#cbd5e1';
  }
}
