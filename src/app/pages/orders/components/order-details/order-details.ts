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
import { of } from "rxjs";

@Component({
  selector: "app-customer-order-details",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./order-details.html",
})
export class CustomerOrderDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  public location = inject(Location);
  private router = inject(Router);
  private toastService = inject(ToastService);

  order = signal<any>(null);
  loading = signal(true);
  error = signal("");

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

  shippingAddressObj = computed(() => {
    const ord = this.order();
    if (!ord) return null;
    if (ord.shippingAddress) return ord.shippingAddress;
    if (ord.guestAddress) {
      try {
        const parsed =
          typeof ord.guestAddress === "string"
            ? JSON.parse(ord.guestAddress)
            : ord.guestAddress;
        return {
          fullName: ord.guestName || "Guest User",
          addressLine1: parsed.addressLine1 || parsed.address || "",
          addressLine2: parsed.addressLine2 || "",
          city: parsed.city || "",
          state: parsed.state || "",
          postalCode: parsed.postalCode || parsed.pincode || "",
          country: parsed.country || "India",
          phone: ord.guestPhone || "Not provided",
        };
      } catch (e) {
        return {
          fullName: ord.guestName || "Guest User",
          addressLine1: ord.guestAddress,
          phone: ord.guestPhone || "Not provided",
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

  // Support ticket inputs
  ticketCat = signal<string>("Logistics inquiry");
  ticketSub = signal<string>("");
  ticketDesc = signal<string>("");
  ticketSubmitting = signal(false);

  supportWhatsAppUrl = computed(() => {
    const ord = this.order();
    if (!ord) return "";
    const name = this.customerName();
    const orderNo = ord.orderNumber;
    const itemsText =
      ord.items
        ?.map((i: any) => `${i.product?.name} (Qty: ${i.quantity})`)
        .join(", ") || "";
    const text = `Hi 3D Galaxy Team! I need support with my Order ID: ${orderNo}.\nCustomer: ${name}\nItems: ${itemsText}\nIssue category: ${this.ticketCat()}\nSubject: ${this.ticketSub()}\nDetails: ${this.ticketDesc()}`;
    return `https://wa.me/919876543210?text=${encodeURIComponent(text)}`;
  });

  supportEmailUrl = computed(() => {
    const ord = this.order();
    if (!ord) return "";
    const name = this.customerName();
    const orderNo = ord.orderNumber;
    const itemsText =
      ord.items
        ?.map((i: any) => `${i.product?.name} (Qty: ${i.quantity})`)
        .join(", ") || "";
    const subject = `Support Inquiry for Order: ${orderNo} - ${this.ticketCat()}`;
    const body = `Hi 3D Galaxy Team,\n\nI need support with my Order ID: ${orderNo}.\nCustomer: ${name}\nItems: ${itemsText}\n\nSubject: ${this.ticketSub()}\nDetails: ${this.ticketDesc()}\n\nPlease advise. Thanks!`;
    return `mailto:support@3dgalaxy.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  // Define order tracking lifecycle steps
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
    this.http
      .get<any>(`/api/orders/${id}`, this.getHeaders())
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

  getCurrentStepIndex(): number {
    const currentStatus = this.order()?.status || "Pending";
    const searchStatus = currentStatus.toLowerCase();

    if (["cancelled", "returned", "refunded"].includes(searchStatus)) {
      return -1;
    }

    if (searchStatus === "confirmed" || searchStatus === "processing") {
      return 1;
    }

    if (searchStatus === "packed") {
      return 2;
    }

    if (searchStatus === "shipped") {
      return 3;
    }

    if (searchStatus === "out for delivery") {
      return 4;
    }

    if (searchStatus === "delivered") {
      return 5;
    }

    return 0;
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

  printInvoice() {
    window.print();
  }

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

  submitSupportTicket() {
    const sub = this.ticketSub().trim();
    const desc = this.ticketDesc().trim();
    const currentOrder = this.order();

    if (!sub || !desc) {
      this.toastService.warning(
        "Kindly input both subject and description parameters to alert our systems.",
      );
      return;
    }

    this.ticketSubmitting.set(true);

    // Simulate submission with 1s latency
    setTimeout(() => {
      this.toastService.success(
        `SUPPORT DISPATCH SUCCESS!\n\nReference Ticket Code: #TICK-ORD-${currentOrder?.orderNumber?.replace("ORD-", "") || "HELP"}\n\nOur specialized 3D workshop and logistics crew will troubleshoot this and update you at your account email inside 4-6 hours.`,
      );
      this.ticketSub.set("");
      this.ticketDesc.set("");
      this.ticketSubmitting.set(false);
    }, 1000);
  }
}
