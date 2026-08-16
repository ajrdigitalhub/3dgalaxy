import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { DatastoreService, UserProfile } from "../../services/datastore";
import { ToastService } from "../../shared/components/toast/toast.service";
import { ApiService } from "../../services/api.service";
import { NotificationService } from "../../services/notification.service";
import { ServiceEnquiryService } from "../../core/services/service-enquiry.service";
import { environment } from "../../../environments/environment";
import { AccountProductCardComponent, AccountProduct } from "./components/account-product-card.component";
import { AccountOrderCardComponent, AccountOrder } from "./components/account-order-card.component";
import { AccountReviewsComponent } from "./components/account-reviews.component";
import { AccountAddressesComponent } from "./components/account-addresses.component";

@Component({
  selector: "app-account",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    RouterModule,
    AccountProductCardComponent,
    AccountOrderCardComponent,
    AccountReviewsComponent,
    AccountAddressesComponent,
  ],
  templateUrl: "./account.html",
})
export class Account {
  toastService = inject(ToastService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  ds = inject(DatastoreService);
  fb = inject(FormBuilder);
  enquiryService = inject(ServiceEnquiryService);

  api = inject(ApiService);
  ns = inject(NotificationService);

  profile = this.ds.userProfile;
  myOrders = signal<any[]>([]);
  myServiceRequests = this.enquiryService.myEnquiries;
  wishlist = signal<any[]>([]);
  savedForLater = signal<any[]>([]);
  recentlyViewedItems = signal<any[]>([]);
  isOrdersLoading = signal(true);
  isWishlistLoading = signal(true);
  isProfileSaving = signal(false);

  // Wishlist Toolbar Signals
  wishlistSearch = signal<string>("");
  wishlistSort = signal<string>("newest");

  // Computed Filtered & Sorted Wishlist
  filteredWishlist = computed(() => {
    let items = [...this.wishlist()];
    const query = this.wishlistSearch().trim().toLowerCase();

    if (query) {
      items = items.filter((item) => {
        const name = (item.product?.name || "").toLowerCase();
        const brand = (item.product?.brand || "").toLowerCase();
        return name.includes(query) || brand.includes(query);
      });
    }

    const sortBy = this.wishlistSort();
    if (sortBy === "price-asc") {
      items.sort((a, b) => (a.product?.salePrice || a.product?.price || 0) - (b.product?.salePrice || b.product?.price || 0));
    } else if (sortBy === "price-desc") {
      items.sort((a, b) => (b.product?.salePrice || b.product?.price || 0) - (a.product?.salePrice || a.product?.price || 0));
    } else if (sortBy === "rating") {
      items.sort((a, b) => (b.product?.rating || 4.8) - (a.product?.rating || 4.8));
    }

    return items;
  });

  totalWishlistCount = computed(() => this.wishlist().length);
  totalOrdersCount = computed(() => this.myOrders().length);
  totalSpentAmount = computed(() => this.myOrders().reduce((sum, o) => sum + (o.grandTotal || 0), 0));
  formattedTotalSpent = computed(() => this.totalSpentAmount().toLocaleString('en-IN'));
  activeOrdersCount = computed(() => this.myOrders().filter(o => ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out for delivery'].includes(o.status.toLowerCase())).length);
  myReviewsCount = signal<number>(0);

  greetingMessage = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning ☀️';
    if (hour < 17) return 'Good Afternoon 🌤️';
    return 'Good Evening 🌙';
  });

  customerName = computed(() => this.profile()?.name || 'Valued Customer');
  customerEmail = computed(() => this.profile()?.email || '');
  customerInitials = computed(() => {
    const name = this.customerName();
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name[0] || 'U').toUpperCase();
  });

  profileCompletion = computed(() => {
    const p = this.profile();
    if (!p) return 20;
    let score = 20;
    if (p.name) score += 20;
    if (p.email) score += 20;
    if (p.phone) score += 20;
    if (p.profileImage) score += 20;
    return Math.min(100, score);
  });

  activeTab = signal("dashboard");

  tabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "dashboard",
      path: "/account",
    },
    {
      id: "orders",
      label: "My Orders",
      icon: "local_shipping",
      path: "/account/orders",
    },
    {
      id: "service-requests",
      label: "My Service Requests",
      icon: "layers",
      path: "/account/service-requests",
    },
    {
      id: "wishlist",
      label: "Wishlist",
      icon: "favorite",
      path: "/account/wishlist",
    },
    // {
    //   id: "saved",
    //   label: "Saved For Later",
    //   icon: "bookmark",
    //   path: "/account/saved",
    // },
    {
      id: "addresses",
      label: "Addresses",
      icon: "location_on",
      path: "/account/addresses",
    },
    // {
    //   id: "notifications",
    //   label: "Notifications",
    //   icon: "notifications",
    //   path: "/account/notifications",
    // },
    { id: "reviews", label: "Reviews", icon: "star", path: "/account/reviews" },
    {
      id: "profile",
      label: "Profile Settings",
      icon: "person",
      path: "/account/profile",
    },
    {
      id: "security",
      label: "Security",
      icon: "lock",
      path: "/account/security",
    },
  ];

  profileForm: FormGroup;
  passwordForm: FormGroup;

  constructor() {
    this.profileForm = this.fb.group({
      firstName: ["", Validators.required],
      lastName: [""],
      email: ["", [Validators.required, Validators.email]],
      phone: [""],
      gender: [""],
      dateOfBirth: [""],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ["", Validators.required],
      newPassword: ["", [Validators.required, Validators.minLength(8)]],
      confirmPassword: ["", Validators.required],
    });

    effect(() => {
      const u = this.profile();
      if (!u && this.ds.authReady() && !this.ds.currentUser()) {
        this.router.navigate(["/login"]);
      } else if (u) {
        const parts = u.name ? u.name.split(" ") : [];
        this.profileForm.patchValue({
          firstName: parts[0] || "",
          lastName: parts.slice(1).join(" ") || "",
          email: u.email || "",
          phone: u.phone || "",
        });
        this.fetchMyOrders();
        this.fetchWishlist();
        this.loadSavedForLater();
        this.loadRecentlyViewed();
      }
    });
  }

  ngOnInit() {
    this.route.url.subscribe((url) => {
      const path = url.length > 0 ? url[url.length - 1].path : "dashboard";
      if (this.tabs.some((t) => t.id === path)) {
        this.activeTab.set(path);
      } else if (path === "account") {
        this.activeTab.set("dashboard");
      }
    });
  }

  async fetchMyOrders() {
    this.isOrdersLoading.set(true);
    try {
      const resp = await this.api.get<any>("/orders/my-orders").toPromise();
      const orders = Array.isArray(resp)
        ? resp
        : resp && Array.isArray(resp.data)
          ? resp.data
          : [];
      this.myOrders.set(
        orders.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          date: new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          status: o.status ? o.status.toLowerCase() : "pending",
          items: (o.items || []).map((i: any) => ({
            productId: i.productId,
            name: i.product?.name || "3D Printing Product",
            quantity: i.quantity,
            price: i.unitPrice || i.price,
            image: i.product?.primaryImage || i.product?.images?.[0]?.url || i.product?.images?.[0] || null,
          })),
          grandTotal: Number(o.totalAmount) || 0,
          subtotal:
            (Number(o.totalAmount) || 0) -
            (Number(o.taxAmount) || 0) -
            (Number(o.shippingAmount) || 0) +
            (Number(o.discountAmount) || 0),
          tax: Number(o.taxAmount) || 0,
          shippingFee: Number(o.shippingAmount) || 0,
          discount: Number(o.discountAmount) || 0,
          trackingNumber: null,
          paymentMethod:
            o.payments && o.payments.length > 0
              ? o.payments[0].paymentMethod
              : "Unknown",
          shippingAddress: "See order details",
        })),
      );
    } catch (e) {
      this.myOrders.set([]);
      this.toastService.warning("We couldn’t load your orders right now.");
    } finally {
      this.isOrdersLoading.set(false);
    }
  }

  async fetchWishlist() {
    this.isWishlistLoading.set(true);
    if (this.ds.userRole() === "guest") {
      this.wishlist.set([]);
      this.isWishlistLoading.set(false);
      return;
    }

    try {
      const resp: any = await this.api.get("/wishlist").toPromise();
      if (resp?.success) {
        this.wishlist.set(resp.data || []);
      } else {
        this.wishlist.set([]);
      }
    } catch (e) {
      this.wishlist.set([]);
      this.toastService.warning("Failed to load wishlist");
    } finally {
      this.isWishlistLoading.set(false);
    }
  }

  async removeFromWishlist(productId: string) {
    if (this.ds.userRole() === "guest") {
      this.toastService.info("Please log in to manage your wishlist");
      this.router.navigate(["/login"]);
      return;
    }

    try {
      const resp: any = await this.api
        .delete(`/wishlist/${productId}`)
        .toPromise();
      if (resp?.success) {
        this.toastService.success("Removed from wishlist");
        this.wishlist.update((items) =>
          items.filter((i) => i.productId !== productId),
        );
      }
    } catch (e) {
      this.toastService.error("Failed to remove from wishlist");
    }
  }

  addToCartFromWishlist(item: any) {
    const prod = item.product || item;
    const productId = item.productId || prod.id;
    this.ds.addToCart(prod);
    if (productId) {
      this.removeFromWishlist(productId);
    }
    this.toastService.success(`Added ${prod.name || 'product'} to cart`);
  }

  async moveAllWishlistToCart() {
    const items = this.filteredWishlist();
    if (items.length === 0) {
      this.toastService.info("No items in wishlist to move");
      return;
    }

    for (const item of items) {
      if (item.product) {
        this.ds.addToCart(item.product);
        if (item.productId) {
          await this.removeFromWishlist(item.productId);
        }
      }
    }
    this.toastService.success(`Moved ${items.length} item(s) to cart`);
    this.router.navigate(["/cart"]);
  }

  async clearWishlist() {
    const items = [...this.wishlist()];
    if (items.length === 0) return;

    for (const item of items) {
      if (item.productId) {
        await this.removeFromWishlist(item.productId);
      }
    }
    this.wishlist.set([]);
    this.toastService.success("Wishlist cleared");
  }

  // Saved for Later helpers
  loadSavedForLater() {
    try {
      const stored = localStorage.getItem("account_saved_items");
      if (stored) {
        this.savedForLater.set(JSON.parse(stored));
      }
    } catch (e) {
      this.savedForLater.set([]);
    }
  }

  saveForLater(product: any) {
    const current = this.savedForLater();
    if (!current.some((i) => (i.id || i.productId) === (product.id || product.productId))) {
      const updated = [...current, product];
      this.savedForLater.set(updated);
      localStorage.setItem("account_saved_items", JSON.stringify(updated));
      this.toastService.success("Saved for later");
    }
  }

  removeFromSaved(productId: string) {
    const updated = this.savedForLater().filter((i) => (i.id || i.productId) !== productId);
    this.savedForLater.set(updated);
    localStorage.setItem("account_saved_items", JSON.stringify(updated));
    this.toastService.info("Removed from saved items");
  }

  moveToCartFromSaved(product: any) {
    this.ds.addToCart(product);
    this.removeFromSaved(product.id || product.productId);
    this.toastService.success(`Moved ${product.name} to cart`);
  }

  // Recently Viewed helpers
  loadRecentlyViewed() {
    try {
      const stored = localStorage.getItem("account_recently_viewed");
      if (stored) {
        this.recentlyViewedItems.set(JSON.parse(stored));
      } else {
        // Fallback default sample items if empty
        const sampleProducts = (this.ds.products() || []).slice(0, 6);
        this.recentlyViewedItems.set(sampleProducts);
      }
    } catch (e) {
      this.recentlyViewedItems.set([]);
    }
  }

  // Reorder Order Items
  reorder(order: any) {
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        const weightConfig = (item.selectedWeightValue || item.weightInGrams) ? {
          selectedWeightValue: item.selectedWeightValue || (item.weightInGrams ? item.weightInGrams / 1000 : 1),
          selectedWeightUnit: item.selectedWeightUnit || 'kg',
          isCustomWeight: Boolean(item.isCustomWeight),
          customWeightValue: item.customWeightValue || item.selectedWeightValue,
          weightInGrams: item.weightInGrams,
          unitPricePerWeight: item.unitPricePerWeight || item.price,
          calculatedPrice: item.price
        } : undefined;

        this.ds.addToCart({
          id: item.productId || 'prod-reorder',
          name: item.name,
          mrp: item.price * 1.2,
          sale_price: item.price,
          stock: 50,
          brand: '3D GALAXY',
          slug: 'product',
          sku: 'SKU-' + (item.productId || 'REORDER'),
          barcode: 'BC-' + (item.productId || 'REORDER'),
          category_id: 'reorder',
          description: item.name,
          dealer_price: item.price,
          reserved: 0,
          images: item.image ? [item.image] : [],
          specs: [],
          reviews: [],
          qnas: [],
          featured: false,
          is360Supported: false,
          tags: []
        }, item.quantity || 1, item.variant || undefined, weightConfig);
      }
      this.toastService.success(`Items from order #${order.orderNumber || order.id} added to cart with preserved weight configurations!`);
      this.router.navigate(["/cart"]);
    }
  }

  addToCart(product: any) {
    this.ds.addToCart(product);
    this.toastService.success(`Added ${product.name || 'Product'} to cart!`);
  }

  trackTabId(index: number, tab: { id: string }) {
    return tab?.id || index;
  }

  trackProductId(index: number, item: any) {
    return item?.productId || item?.id || index;
  }

  trackOrderId(index: number, item: any) {
    return item?.orderNumber || item?.id || index;
  }

  fetchMyServiceRequests() {
    const p = this.profile();
    this.enquiryService.getMyEnquiries(p?.email, p?.id).subscribe();
  }

  acceptServiceQuote(id: string) {
    this.enquiryService.customerAction(id, "accept_quote").subscribe({
      next: () => this.toastService.success("Quotation accepted! Proceeding to payment."),
      error: () => this.toastService.error("Failed to accept quotation."),
    });
  }

  rejectServiceQuote(id: string) {
    this.enquiryService.customerAction(id, "reject_quote").subscribe({
      next: () => this.toastService.info("Quotation declined."),
      error: () => this.toastService.error("Failed to decline quotation."),
    });
  }

  switchTab(tabId: string) {
    this.activeTab.set(tabId);
    if (tabId === "service-requests") {
      this.fetchMyServiceRequests();
    }
    if (tabId === "dashboard") {
      this.router.navigate(["/account"]);
    } else {
      this.router.navigate([`/account/${tabId}`]);
    }
  }

  logout() {
    this.ds.logout();
    this.router.navigate(["/"]);
  }

  async saveProfile() {
    if (this.profileForm.valid) {
      this.isProfileSaving.set(true);
      const { firstName, lastName, phone } = this.profileForm.value;
      const currentPic = this.profile()?.profileImage || "";
      try {
        await this.ds.updateProfileDetails(
          firstName,
          lastName,
          phone,
          currentPic,
        );
        this.toastService.success("Profile details updated successfully!");
      } catch (err: any) {
        this.toastService.error(
          `Failed to update profile: ${err.message || err}`,
        );
      } finally {
        this.isProfileSaving.set(false);
      }
    }
  }

  async changePassword() {
    if (this.passwordForm.valid) {
      const { currentPassword, newPassword, confirmPassword } =
        this.passwordForm.value;
      if (newPassword !== confirmPassword) {
        this.toastService.info("New passwords do not match");
        return;
      }
      try {
        await this.ds.changeUserPassword(currentPassword, newPassword);
        this.toastService.success("Password changed successfully!");
        this.passwordForm.reset();
      } catch (err: any) {
        this.toastService.error(
          `Failed to change password: ${err.message || err}`,
        );
      }
    }
  }

  async uploadImage(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("access_token");

      const res = await fetch(`${environment.apiUrl}/profile/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      if (data.url) {
        this.ds.userProfile.update((profile) =>
          profile ? { ...profile, profileImage: data.url } : null,
        );
        this.toastService.success("Profile image uploaded successfully.");
      }
    } catch (e: any) {
      this.toastService.error(`Error uploading image: ${e.message}`);
    }
  }

  // --- Notification Center Helpers ---
  get notifications() {
    return this.ns.inbox();
  }

  get notificationPermission() {
    return this.ns.permission();
  }

  markNotificationRead(id: string) {
    this.ns.markAsRead(id);
  }

  markAllNotificationsRead() {
    this.ns.markAsRead();
  }

  deleteNotification(id: string) {
    this.ns.deleteNotification(id);
  }

  enableNotifications() {
    this.ns.requestPermission().then((success) => {
      if (success) {
        this.toastService.success("Push notifications successfully enabled!");
      } else {
        this.toastService.warning(
          "Failed to enable push notifications. Check browser settings.",
        );
      }
    });
  }
}
