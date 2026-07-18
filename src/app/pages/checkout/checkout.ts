import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  HostListener,
  OnInit,
} from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { DatastoreService } from "../../services/datastore";
import { LoadingService } from "../../core/services/loading.service";
import { ToastService } from "../../shared/components/toast/toast.service";
import { HttpClient } from "@angular/common/http";
import { ApiService } from "../../services/api.service";
import { AppButton } from "../../shared/components/app-button/app-button";
import { SettingsService } from "../../core/services/settings.service";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "app-checkout",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, FormsModule, AppButton, RouterModule],
  templateUrl: "./checkout.html",
})
export class CheckoutComponent implements OnInit {
  router = inject(Router);
  location = inject(Location);
  ds = inject(DatastoreService);
  loading = inject(LoadingService);
  toast = inject(ToastService);
  http = inject(HttpClient);
  api = inject(ApiService);
  settingsService = inject(SettingsService);

  isSubmitting = signal(false);
  showAuthModal = signal(false);

  @HostListener("window:beforeunload", ["$event"])
  unloadNotification($event: any): string | undefined {
    if (this.isSubmitting()) {
      $event.returnValue =
        "Operation is in progress. Are you sure you want to leave?";
      return "Operation is in progress. Are you sure you want to leave?";
    }
    return undefined;
  }

  // Multi-step Checkout State
  activeStep = signal<1 | 2 | 3 | 4>(1);

  checkoutItems = signal<any[]>([]);

  // Customer Information
  name = signal("");
  email = signal("");
  phone = signal("");

  // Shipping Address
  accAddr1 = signal("");
  accAddr2 = signal("");
  accCity = signal("");
  accState = signal("");
  accPin = signal("");
  accCountry = signal("India");
  orderNotes = signal("");

  // Payment State
  availableGateways = signal<any[]>([]);
  paymentMethod = signal<string>("RAZORPAY");
  termsAccepted = signal(false);

  // Business / GST
  isBusinessPurchase = signal(false);
  gstNumber = signal("");
  companyName = signal("");

  // Coupon
  discount = computed(() => this.ds.couponDiscountAmount());
  couponCode = signal("");
  couponApplied = signal(false);

  // Computed Values
  isLoggedIn = computed(() => !!this.ds.userProfile());
  groupedCheckoutItems = computed(() => this.ds.groupedCartItems() || []);

  isGstValid = computed(() => {
    if (!this.isBusinessPurchase()) return true;
    const gst = this.gstNumber().trim().toUpperCase();
    const company = this.companyName().trim();
    if (!gst || !company) return false;
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
      gst,
    );
  });

  subtotal = computed(() => this.ds.cartSubtotal());

  shipping = computed(() => this.ds.cartShipping());

  tax = computed(() => this.ds.cartTax());

  // COD checks
  codError = computed(() => {
    const paySettings = this.settingsService.paymentGatewaySettings();
    const codConfig = paySettings?.paymentMethods?.cod || {};
    const globalSettings = this.settingsService.shippingSettings() || {};

    const hasNonCodProduct = this.groupedCheckoutItems().some(
      (item: any) => item.product.codAvailable === false,
    );
    if (hasNonCodProduct)
      return "One or more products are not eligible for Cash on Delivery.";

    const maxCodVal =
      globalSettings.codMaximumOrderValue !== undefined
        ? Number(globalSettings.codMaximumOrderValue)
        : 2500;
    if (this.subtotal() > maxCodVal)
      return `Cash on Delivery is not available for orders above ₹${maxCodVal}.`;

    return null;
  });

  isCodAllowed = computed(() => this.codError() === null);

  codSurcharge = computed(() => {
    if (this.paymentMethod() !== "COD") return 0;
    const globalSettings = this.settingsService.shippingSettings() || {};
    return globalSettings.codHandlingCharge !== undefined
      ? Number(globalSettings.codHandlingCharge)
      : 100;
  });

  grandTotal = computed(
    () =>
      this.subtotal() +
      this.shipping() +
      this.tax() +
      this.codSurcharge() -
      this.discount(),
  );

  isValid = computed(() => {
    const gstVal = this.isGstValid();
    return (
      this.name().trim().length > 0 &&
      this.email().trim().includes("@") &&
      this.phone().trim().length >= 10 &&
      this.accAddr1().trim().length > 0 &&
      this.accCity().trim().length > 0 &&
      this.accState().trim().length > 0 &&
      this.accPin().trim().length === 6 &&
      this.termsAccepted() &&
      gstVal &&
      !(this.paymentMethod() === "COD" && !this.isCodAllowed())
    );
  });

  ngOnInit() {
    this.restoreDraftState();
    this.ds.reloadProducts(false);
  }

  constructor() {
    // If guest and not logged in, show auth modal
    effect(
      () => {
        if (!this.isLoggedIn() && !localStorage.getItem("guest_name")) {
          this.showAuthModal.set(true);
        }
      },
      { allowSignalWrites: true },
    );

    // Auto-select gateways
    effect(
      () => {
        const paySettings = this.settingsService.paymentGatewaySettings() || {};
        const methods = paySettings.paymentMethods || {};
        const actives: any[] = [];

        const isRazorpayEnabled =
          methods.razorpay?.enabled || paySettings.razorpayEnabled;
        const isCashfreeEnabled = methods.cashfree?.enabled;
        const isCodEnabled = methods.cod?.enabled || paySettings.codEnabled;

        if (isRazorpayEnabled)
          actives.push({
            gatewayCode: "RAZORPAY",
            displayName: "Razorpay",
            icon: "credit_card",
            description: "Cards, Netbanking, UPI",
          });
        if (isCashfreeEnabled)
          actives.push({
            gatewayCode: "CASHFREE",
            displayName: "Cashfree",
            icon: "account_balance",
            description: "Cards, UPI, Wallets",
          });
        if (isCodEnabled)
          actives.push({
            gatewayCode: "COD",
            displayName: "Cash on Delivery",
            icon: "payments",
            description: "Pay At Handover",
          });

        this.availableGateways.set(actives);

        if (
          !this.paymentMethod() ||
          !actives.find((a) => a.gatewayCode === this.paymentMethod())
        ) {
          if (actives.length > 0) {
            const hasRazorpay = actives.find(
              (a) => a.gatewayCode === "RAZORPAY",
            );
            this.paymentMethod.set(
              hasRazorpay ? "RAZORPAY" : actives[0].gatewayCode,
            );
          }
        }
      },
      { allowSignalWrites: true },
    );

    // Auto-switch away from COD if not allowed
    effect(
      () => {
        if (this.paymentMethod() === "COD" && !this.isCodAllowed()) {
          const online = this.availableGateways().find(
            (g) => g.gatewayCode !== "COD",
          );
          if (online) this.paymentMethod.set(online.gatewayCode);
        }
      },
      { allowSignalWrites: true },
    );
  }

  restoreDraftState() {
    if (this.isLoggedIn()) {
      const u = this.ds.activeUser();
      this.name.set(u.name);
      this.email.set(u.email);
      this.phone.set(u.phone || "");
    } else {
      this.name.set(localStorage.getItem("guest_name") || "");
      this.email.set(localStorage.getItem("guest_email") || "");
      this.phone.set(localStorage.getItem("guest_mobile") || "");
    }

    const addr = localStorage.getItem("checkout_restored_addr1");
    if (addr) this.accAddr1.set(addr);

    const pay = localStorage.getItem("checkout_restored_pay");
    if (pay) this.paymentMethod.set(pay);

    const activeStep = sessionStorage.getItem("checkout_active_step");
    if (activeStep) this.activeStep.set(Number(activeStep) as any);
  }

  saveDraftState() {
    sessionStorage.setItem(
      "checkout_active_step",
      this.activeStep().toString(),
    );
    localStorage.setItem("guest_name", this.name());
    localStorage.setItem("guest_email", this.email());
    localStorage.setItem("guest_mobile", this.phone());
    localStorage.setItem("checkout_restored_addr1", this.accAddr1());
    localStorage.setItem("checkout_restored_pay", this.paymentMethod());
  }

  goToStep(step: 1 | 2 | 3 | 4) {
    // Allow going backwards without validation
    if (step < this.activeStep()) {
      this.activeStep.set(step);
      this.saveDraftState();
      return;
    }
    // Validate before moving forward
    if (step > 1 && !this.validateStep1()) return;
    if (step > 2 && !this.validateStep2()) return;
    if (step > 3 && !this.validateStep3()) return;

    this.activeStep.set(step);
    this.saveDraftState();
  }

  validateStep1(): boolean {
    if (
      !this.name().trim() ||
      !this.email().trim().includes("@") ||
      this.phone().trim().length < 10
    ) {
      this.toast.error("Please fill in all contact details with valid values.");
      return false;
    }
    return true;
  }

  validateStep2(): boolean {
    if (
      !this.accAddr1().trim() ||
      !this.accCity().trim() ||
      !this.accState().trim() ||
      this.accPin().trim().length !== 6
    ) {
      this.toast.error(
        "Please fill in all mandatory address fields with a valid 6-digit PIN.",
      );
      return false;
    }
    return true;
  }

  validateStep3(): boolean {
    if (!this.paymentMethod()) {
      this.toast.error("Please select a payment method.");
      return false;
    }
    return true;
  }

  getPrice(item: any) {
    return this.ds.getItemPrice(item);
  }

  continueAsGuest() {
    this.showAuthModal.set(false);
  }

  async placeOrder() {
    if (!this.isValid()) {
      this.toast.error("Please fill in all required fields and accept terms.");
      return;
    }

    this.isSubmitting.set(true);
    this.loading.startLoading();

    const payload = {
      items: this.groupedCheckoutItems().map((item: any) => ({
        productId: item.product.id,
        variantId: item.variant?.id || null,
        quantity: item.quantity,
        price: this.getPrice(item),
      })),
      shippingAddress: `${this.accAddr1()} ${this.accAddr2()}, ${this.accCity()}, ${this.accState()} - ${this.accPin()}`,
      contactDetails: {
        name: this.name(),
        email: this.email(),
        phone: this.phone(),
      },
      paymentMethod: this.paymentMethod(),
      couponCode: this.ds.activeCouponCode() || null,
      notes: this.orderNotes(),
      businessPurchase: null,
      totalAmount: this.grandTotal(),
    };

    try {
      const res: any = await firstValueFrom(
        this.api.post<any>("/payment/create-order", payload),
      );

      if (this.paymentMethod() === "RAZORPAY") {
        this.openRazorpay(res.data);
      } else if (this.paymentMethod() === "CASHFREE") {
        this.openCashfree(res.data);
      } else if (this.paymentMethod() === "COD") {
        this.finishOrder(res.data.id || res.data.orderId);
      }
    } catch (e: any) {
      console.error(e);
      this.toast.error(
        e?.response?.data?.message ||
          e?.error?.message ||
          "Failed to create order. Please try again.",
      );
      this.isSubmitting.set(false);
      this.loading.stopLoading();
    }
  }

  openRazorpay(orderData: any) {
    const options = {
      key:
        this.settingsService.paymentGatewaySettings()?.paymentMethods?.razorpay
          ?.keyId || "YOUR_KEY_ID",
      amount: orderData.amount,
      currency: "INR",
      name: "3D Galaxy",
      description: "Purchase Order",
      order_id: orderData.id,
      handler: async (response: any) => {
        try {
          this.loading.startLoading();
          await firstValueFrom(
            this.api.post<any>("/payment/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          );
          this.finishOrder(orderData.dbOrderId || orderData.id);
        } catch (err: any) {
          console.error(err);
          this.toast.error(
            "Payment verification failed. If amount was deducted, it will be refunded.",
          );
          this.isSubmitting.set(false);
          this.loading.stopLoading();
        }
      },
      prefill: {
        name: this.name(),
        email: this.email(),
        contact: this.phone(),
      },
      theme: {
        color: "#d65108",
      },
      modal: {
        ondismiss: () => {
          this.isSubmitting.set(false);
          this.loading.stopLoading();
        },
      },
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  openCashfree(orderData: any) {
    const isSandbox =
      this.settingsService.paymentGatewaySettings()?.paymentMethods?.cashfree
        ?.sandbox !== false;

    if (!(window as any).Cashfree) {
      this.toast.error(
        "Cashfree SDK not loaded. Please refresh and try again.",
      );
      this.isSubmitting.set(false);
      this.loading.stopLoading();
      return;
    }

    try {
      const cashfree = new (window as any).Cashfree({
        mode: isSandbox ? "sandbox" : "production",
      });
      this.loading.stopLoading();

      cashfree.checkout({
        paymentSessionId: orderData.paymentSessionId,
        returnUrl: `${window.location.origin}/order-success?orderId=${orderData.orderId}`,
      });
    } catch (err: any) {
      console.error(err);
      this.toast.error("Cashfree initialization failed.");
      this.isSubmitting.set(false);
      this.loading.stopLoading();
    }
  }

  finishOrder(orderId: string) {
    this.ds.cart.set([]);
    this.ds.activeCouponCode.set("");
    this.ds.couponDiscountAmount.set(0);
    this.loading.stopLoading();
    this.isSubmitting.set(false);

    // Clear storage
    sessionStorage.removeItem("checkout_active_step");
    localStorage.removeItem("checkout_restored_addr1");
    localStorage.removeItem("checkout_restored_pay");

    this.router.navigate(["/order-success"], { queryParams: { orderId } });
  }
}
