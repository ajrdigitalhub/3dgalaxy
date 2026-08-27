import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { HttpClient } from "@angular/common/http";
import { ApiService } from "../../services/api.service";
import { DatastoreService, Order } from "../../services/datastore";
import { ToastService } from "../../shared/components/toast/toast.service";

@Component({
  selector: "app-orders-tracking",
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./orders.html",
  styleUrl: "./orders.scss",
})
export class OrdersTracking {
  toastService = inject(ToastService);
  ds = inject(DatastoreService);
  router = inject(Router);

  searchPhoneQuery = signal<string>("");

  // Ticket inputs
  ticketCat = signal<string>("Nozzle Clog");
  ticketSub = signal<string>("");
  ticketDesc = signal<string>("");

  memberOrders = signal<any[]>([]);
  isLoading = signal(true);
  error = signal<string>("");
  searchTerm = signal("");
  selectedStatus = signal("all");
  sortOrder = signal<"newest" | "oldest">("newest");

  tracedOrders = computed(() => {
    const phone = this.searchPhoneQuery().trim();
    if (phone.length < 10) return [];
    return this.ds.orders().filter((o) => o.customerPhone.includes(phone));
  });

  http = inject(HttpClient);
  api = inject(ApiService);

  constructor() {
    effect(() => {
      const r = this.ds.userRole();
      const u = this.ds.activeUser();
      if (r !== "guest" && u) {
        this.searchPhoneQuery.set(u.phone || "");
        this.fetchMyOrders();
      }
    });
  }

  async fetchMyOrders() {
    this.isLoading.set(true);
    this.error.set("");
    try {
      const resp = await this.api.get<any>("/orders/my-orders").toPromise();
      const orders = Array.isArray(resp)
        ? resp
        : resp && Array.isArray(resp.data)
          ? resp.data
          : [];
      this.memberOrders.set(
        orders.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          date: new Date(o.createdAt).toLocaleDateString(),
          createdAt: o.createdAt || o.created_at || new Date().toISOString(),
          status: o.status ? o.status.toLowerCase() : "pending",
          items: (o.items || []).map((i: any) => ({
            productId: i.productId,
            name: i.product?.name || "Product",
            quantity: i.quantity,
            price: i.price,
          })),
          grandTotal: Number(o.totalAmount) || 0,
          trackingNumber: null,
          paymentMethod:
            o.payments && o.payments.length > 0
              ? o.payments[0].method
              : "Unknown",
        })),
      );
    } catch (e) {
      this.memberOrders.set([]);
      this.error.set(
        "We couldn't fetch your orders right now. Please retry in a moment.",
      );
      console.error("Error fetching orders", e);
    } finally {
      this.isLoading.set(false);
    }
  }

  filteredOrders = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const selected = this.selectedStatus();
    const orders = [...this.memberOrders()].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date).getTime();
      const dateB = new Date(b.createdAt || b.date).getTime();
      return this.sortOrder() === "newest" ? dateB - dateA : dateA - dateB;
    });

    return orders.filter((order) => {
      const matchesStatus = selected === "all" || order.status === selected;
      const haystack =
        `${order.orderNumber} ${order.status} ${order.items.map((item: any) => item.name).join(" ")}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      return matchesStatus && matchesSearch;
    });
  });

  groupedOrders = computed(() => {
    const groups: Record<string, any[]> = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      "Older Orders": [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const order of this.filteredOrders()) {
      const orderDate = new Date(order.createdAt || order.date);
      const normalized = new Date(
        orderDate.getFullYear(),
        orderDate.getMonth(),
        orderDate.getDate(),
      );
      if (normalized.getTime() === today.getTime()) {
        groups["Today"].push(order);
      } else if (normalized.getTime() === yesterday.getTime()) {
        groups["Yesterday"].push(order);
      } else if (normalized >= weekAgo) {
        groups["This Week"].push(order);
      } else {
        groups["Older Orders"].push(order);
      }
    }

    return Object.entries(groups).filter(([, items]) => items.length > 0);
  });

  getStatusStyle(status: string) {
    switch (status) {
      case "delivered":
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/15";
      case "processing":
        return "bg-blue-500/10 text-blue-500 border border-blue-500/15";
      case "shipped":
        return "bg-purple-500/10 text-purple-500 border border-purple-500/15";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/15";
      default:
        return "bg-red-500/10 text-red-500 border border-red-500/15";
    }
  }

  onPhoneInput(event: Event) {
    this.searchPhoneQuery.set((event.target as HTMLInputElement).value);
  }

  setSearch(value: string) {
    this.searchTerm.set(value);
  }

  setStatus(value: string) {
    this.selectedStatus.set(value);
  }

  setSort(value: "newest" | "oldest") {
    this.sortOrder.set(value);
  }



  simulateDownload(name: string) {
    this.toastService.info(
      `DOWNLOAD STARTED: Curating download libraries for "${name}" safely inside your browser. Checkout your notifications!`,
    );
  }

  submitTicket() {
    const sub = this.ticketSub().trim();
    const desc = this.ticketDesc().trim();
    if (!sub || !desc) {
      this.toastService.warning(
        "WARNING: Kindly input subject and description details for helpdesk analysis.",
      );
      return;
    }

    this.toastService.success(
      `SUPPORT TICKET SUBMITTED SUCCESS!\n\nReference Ticket ID: #TICK-${Math.floor(1000 + Math.random() * 9000)}\n\n3D Galaxy tech labs team will analyze your retraction profile and reply on your email: ${this.ds.activeUser()?.email || ''} inside 6 hours.`,
    );
    this.ticketSub.set("");
    this.ticketDesc.set("");
  }

  reorder(order: any) {
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        this.ds.addToCart({
          id: item.productId || 'prod-reorder',
          name: item.name,
          mrp: (item.price || 0) * 1.2,
          sale_price: item.price || 0,
          stock: 50,
          brand: '3D GALAXY',
          slug: 'product',
          sku: 'SKU-' + (item.productId || 'REORDER'),
          barcode: 'BC-' + (item.productId || 'REORDER'),
          category_id: 'reorder',
          description: item.name,
          dealer_price: item.price || 0,
          reserved: 0,
          images: item.image ? [item.image] : [],
          specs: [],
          reviews: [],
          qnas: [],
          featured: false,
          is360Supported: false,
          tags: []
        }, 1, item.variant || undefined);
      }
      this.toastService.success(`Items added to cart!`);
      this.router.navigate(["/cart"]);
    }
  }
}
