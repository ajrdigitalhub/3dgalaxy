import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  effect,
} from "@angular/core";
import { CommonModule, NgFor } from "@angular/common";
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
import { environment } from "../../../environments/environment";

@Component({
  selector: "app-account",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    RouterModule,
    NgFor,
  ],
  templateUrl: "./account.html",
})
export class Account {
  toastService = inject(ToastService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  ds = inject(DatastoreService);
  fb = inject(FormBuilder);

  api = inject(ApiService);
  ns = inject(NotificationService);

  profile = this.ds.userProfile;
  myOrders = signal<any[]>([]);
  wishlist = signal<any[]>([]);
  isOrdersLoading = signal(true);
  isWishlistLoading = signal(true);
  isProfileSaving = signal(false);

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
      id: "wishlist",
      label: "Wishlist",
      icon: "favorite",
      path: "/account/wishlist",
    },
    {
      id: "addresses",
      label: "Addresses",
      icon: "location_on",
      path: "/account/addresses",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "notifications",
      path: "/account/notifications",
    },
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
  activeInvoice = signal<any>(null);

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
          date: new Date(o.createdAt).toLocaleDateString(),
          status: o.status ? o.status.toLowerCase() : "pending",
          items: (o.items || []).map((i: any) => ({
            productId: i.productId,
            name: i.product?.name || "Product",
            quantity: i.quantity,
            price: i.unitPrice || i.price,
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
          shippingAddress: "See details in actual invoice",
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
    this.ds.addToCart(item.product);
    this.removeFromWishlist(item.productId);
    this.router.navigate(["/cart"]);
  }

  trackTabId(index: number, tab: { id: string }) {
    return tab?.id || index;
  }

  switchTab(tabId: string) {
    this.activeTab.set(tabId);
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
