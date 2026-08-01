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
import { ShippingService } from "../../core/services/shipping.service";
import { firstValueFrom } from "rxjs";

export interface CustomerAddress {
  id: string;
  fullName?: string;
  phone?: string;
  addressType?: 'home' | 'office' | 'other' | string;
  houseNo?: string;
  street?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
}

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
  shippingService = inject(ShippingService);

  isSubmitting = signal(false);
  showAuthModal = signal(false);
  showTermsModal = signal(false);

  // Address Selection & Management Signals
  savedAddresses = signal<CustomerAddress[]>([]);
  selectedAddressId = signal<string | null>(null);
  addressMode = signal<'saved' | 'new'>('saved');
  saveAddressToAccount = signal<boolean>(true);
  isLoadingAddresses = signal<boolean>(false);

  // New Address Form Signals
  addressType = signal<'home' | 'office' | 'other'>('home');
  houseNo = signal("");
  street = signal("");
  landmark = signal("");

  openTermsModal(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.showTermsModal.set(true);
  }

  closeTermsModal() {
    this.showTermsModal.set(false);
  }

  acceptTermsFromModal() {
    this.termsAccepted.set(true);
    this.showTermsModal.set(false);
  }

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

  // Shipping Address Fields
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
  groupedCheckoutItems = computed(() => this.ds.activeCheckoutItems() || []);

  isGstValid = computed(() => {
    if (!this.isBusinessPurchase()) return true;
    const gst = this.gstNumber().trim().toUpperCase();
    const company = this.companyName().trim();
    if (!gst || !company) return false;
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
      gst,
    );
  });

  subtotal = computed(() => {
    const items = this.groupedCheckoutItems();
    return items.reduce((acc: number, item: any) => {
      if (item.isFree) return acc;
      const price = this.ds.getItemPrice(item);
      return acc + (Number(price) * (item.quantity || 1));
    }, 0);
  });

  shippingDetails = computed(() => {
    const items = this.groupedCheckoutItems();
    return this.shippingService.calculateCartShipping(items);
  });

  shipping = computed(() => this.shippingDetails().shippingCharge);

  tax = computed(() => 0);

  // COD checks
  codError = computed(() => {
    if (!this.ds.areAllProductsCodAvailable()) {
      return "One or more products in your cart do not support Cash on Delivery.";
    }
    if (this.subtotal() > 2500) {
      return "Cash on Delivery is available only for orders of ₹2,500 or below.";
    }

    return null;
  });

  isCodAllowed = computed(() => this.codError() === null);

  codSurcharge = computed(() => {
    if (this.paymentMethod() !== "COD") return 0;
    const globalSettings = this.settingsService.shippingSettings() || {};
    const charge = globalSettings.codHandlingCharge !== undefined ? Number(globalSettings.codHandlingCharge) : 100;
    return charge > 0 ? charge : 100;
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
    if (this.isLoggedIn()) {
      this.fetchSavedAddresses();
    } else {
      this.addressMode.set('new');
    }
  }

  constructor() {
    // If guest and not logged in, show auth modal
    effect(
      () => {
        if (!this.isLoggedIn() && !localStorage.getItem("guest_name")) {
          this.showAuthModal.set(true);
        } else if (this.isLoggedIn()) {
          this.fetchSavedAddresses();
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

  // --- Saved Address Logic ---
  fetchSavedAddresses() {
    this.isLoadingAddresses.set(true);
    this.api.get<any>("/customer/addresses").subscribe({
      next: (res) => {
        this.isLoadingAddresses.set(false);
        const data = Array.isArray(res) ? res : res?.data || [];
        this.savedAddresses.set(data);

        if (data.length > 0) {
          this.addressMode.set('saved');
          const defaultAddr = data.find((a: any) => a.isDefault) || data[0];
          this.selectSavedAddress(defaultAddr);
        } else {
          this.addressMode.set('new');
        }
      },
      error: () => {
        this.isLoadingAddresses.set(false);
        this.savedAddresses.set([]);
        this.addressMode.set('new');
      },
    });
  }

  selectSavedAddress(addr: CustomerAddress) {
    if (!addr) return;
    this.selectedAddressId.set(addr.id);

    let parsedName = addr.fullName;
    let parsedPhone = addr.phone;
    let street = addr.addressLine1 || '';

    if (street && street.includes('|')) {
      const parts = street.split('|').map((p) => p.trim());
      if (parts.length >= 4) {
        if (!parsedName || parsedName === 'Customer' || parsedName === 'Valued Customer') {
          if (parts[0] && parts[0] !== 'Customer' && parts[0] !== 'Valued Customer') {
            parsedName = parts[0];
          }
        }
        if (!parsedPhone) {
          if (/^\+?\d{8,15}$/.test(parts[1].replace(/[\s-]/g, ''))) {
            parsedPhone = parts[1];
          }
        }
        street = parts.slice(3).join(' | ');
      }
    }

    if (addr.houseNo || addr.street) {
      const houseStreet = `${addr.houseNo || ''} ${addr.street || ''}`.trim();
      if (houseStreet) street = houseStreet;
    }

    const u = this.ds.activeUser() || {};
    const displayName = (parsedName && parsedName !== 'Customer' && parsedName !== 'Valued Customer')
      ? parsedName
      : (u.name || (this.name() && this.name() !== 'Valued Customer' ? this.name() : 'Valued Customer'));
    const displayPhone = parsedPhone || u.phone || this.phone() || '';

    this.name.set(displayName);
    this.phone.set(displayPhone);
    this.accAddr1.set(street || addr.addressLine1);
    this.accAddr2.set(addr.addressLine2 || '');
    this.accCity.set(addr.city || '');
    this.accState.set(addr.state || '');
    this.accPin.set(addr.pincode || addr.postalCode || '');
    this.accCountry.set(addr.country || 'India');
  }

  switchToNewAddress() {
    this.addressMode.set('new');
    this.selectedAddressId.set(null);
  }

  onPincodeInput(pin: string) {
    const cleanPin = (pin || '').trim();
    this.accPin.set(cleanPin);

    if (cleanPin.length === 6) {
      if (cleanPin.startsWith('60') || cleanPin.startsWith('61') || cleanPin.startsWith('62') || cleanPin.startsWith('63')) {
        this.accCity.set('Chennai');
        this.accState.set('Tamil Nadu');
      } else if (cleanPin.startsWith('56') || cleanPin.startsWith('57')) {
        this.accCity.set('Bengaluru');
        this.accState.set('Karnataka');
      } else if (cleanPin.startsWith('40') || cleanPin.startsWith('41')) {
        this.accCity.set('Mumbai');
        this.accState.set('Maharashtra');
      } else if (cleanPin.startsWith('11')) {
        this.accCity.set('New Delhi');
        this.accState.set('Delhi');
      } else if (cleanPin.startsWith('50')) {
        this.accCity.set('Hyderabad');
        this.accState.set('Telangana');
      }
    }
  }

  getAddressTypeIcon(type?: string) {
    const t = (type || '').toLowerCase();
    if (t === 'home') return 'home';
    if (t === 'office' || t === 'work') return 'business';
    return 'location_on';
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
    if (step < this.activeStep()) {
      this.activeStep.set(step);
      this.saveDraftState();
      return;
    }
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

    // If new address entered and user checked "Save this address to My Account"
    if (this.isLoggedIn() && this.addressMode() === 'new' && this.saveAddressToAccount()) {
      try {
        await firstValueFrom(
          this.api.post("/customer/address", {
            fullName: this.name(),
            phone: this.phone(),
            addressType: this.addressType(),
            houseNo: this.houseNo(),
            street: this.street() || this.accAddr1(),
            addressLine1: `${this.name()} | ${this.phone()} | ${this.addressType()} | ${this.accAddr1()}`,
            addressLine2: this.accAddr2(),
            city: this.accCity(),
            state: this.accState(),
            pincode: this.accPin(),
            country: this.accCountry(),
            isDefault: this.savedAddresses().length === 0,
          })
        );
      } catch (err) {
        // Continue even if background save fails
      }
    }

    const payload = {
      items: this.groupedCheckoutItems().map((item: any) => ({
        productId: item.product.id,
        variantId: item.variant?.id || null,
        quantity: item.quantity,
        price: this.getPrice(item),
      })),
      shippingAddress: `${this.accAddr1()} ${this.accAddr2()}, ${this.accCity()}, ${this.accState()} - ${this.accPin()}`,
      shippingAddressSnapshot: {
        fullName: this.name(),
        phone: this.phone(),
        addressLine1: this.accAddr1(),
        addressLine2: this.accAddr2(),
        city: this.accCity(),
        state: this.accState(),
        pincode: this.accPin(),
        country: this.accCountry(),
      },
      contactDetails: {
        name: this.name(),
        email: this.email(),
        phone: this.phone(),
      },
      paymentMethod: this.paymentMethod(),
      couponCode: this.ds.activeCouponCode() || null,
      notes: this.orderNotes(),
      businessPurchase: this.isBusinessPurchase() ? {
        gstNumber: this.gstNumber(),
        companyName: this.companyName()
      } : null,
      subtotalAmount: this.subtotal(),
      totalAmount: this.grandTotal(),
      shippingAmount: this.shipping(),
      codCharge: this.codSurcharge(),
      discountAmount: this.discount(),
      shippingSource: this.shippingDetails().source,
      estimatedDelivery: `${this.shippingDetails().estimatedDays} Days`,
      shippingMethod: "Standard Delivery",
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
        const orderData = res?.data?.order || res?.data;
        const orderId = res?.data?.id || res?.data?.orderId || orderData?.id;
        this.finishOrder(orderId, orderData);
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
    const expectedPaise = Math.round(this.grandTotal() * 100);
    const amountInPaise = (orderData && typeof orderData.amount === 'number' && orderData.amount >= expectedPaise)
      ? orderData.amount
      : expectedPaise;

    const options: any = {
      key:
        orderData?.keyId ||
        orderData?.key ||
        this.settingsService.paymentGatewaySettings()?.paymentMethods?.razorpay
          ?.keyId || "rzp_test_mock",
      amount: amountInPaise,
      currency: "INR",
      name: "3D Galaxy",
      description: "Purchase Order",
      handler: async (response: any) => {
        try {
          this.loading.startLoading();
          const verifyRes: any = await firstValueFrom(
            this.api.post<any>("/payment/verify-payment", {
              razorpay_order_id: response.razorpay_order_id || orderData.id || orderData.dbOrderId,
              razorpay_payment_id: response.razorpay_payment_id || "pay_mock_" + Date.now(),
              razorpay_signature: response.razorpay_signature || "mock_signature",
            }),
          );
          const finalOrderId = verifyRes?.data?.orderId || orderData.dbOrderId || orderData.id;
          this.finishOrder(finalOrderId, verifyRes?.data?.order);
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
          this.toast.error("Your payment was not completed. Please try again.");
          this.isSubmitting.set(false);
          this.loading.stopLoading();
        },
      },
    };

    if (orderData.isRealOrder && orderData.id) {
      options.order_id = orderData.id;
    }

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        console.warn('Razorpay Payment Error:', resp);
        this.toast.error("Your payment was not completed. Please try again.");
        this.isSubmitting.set(false);
        this.loading.stopLoading();
      });
      rzp.open();
    } catch (sdkErr: any) {
      console.error('Razorpay SDK error:', sdkErr);
      this.toast.error('Could not initialize Razorpay modal. Please check your API Key.');
      this.isSubmitting.set(false);
      this.loading.stopLoading();
    }
  }

  openCashfree(orderData: any) {
    if (!orderData) {
      this.toast.error("Invalid payment order response.");
      this.isSubmitting.set(false);
      this.loading.stopLoading();
      return;
    }

    const sessionId = (
      orderData.paymentSessionId ||
      orderData.payment_session_id ||
      orderData.sessionId ||
      ""
    )
      .toString()
      .trim();

    if (!sessionId) {
      this.toast.error("Payment session token missing.");
      this.isSubmitting.set(false);
      this.loading.stopLoading();
      return;
    }

    const cfSettings =
      this.settingsService.paymentGatewaySettings()?.paymentMethods?.cashfree;
    const isSandbox =
      orderData.sandbox !== undefined
        ? Boolean(orderData.sandbox)
        : cfSettings?.sandbox !== false;

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

      const returnUrl = `${window.location.origin}/order-success?orderId=${
        orderData.orderId || orderData.checkoutId
      }`;

      cashfree.checkout({
        paymentSessionId: sessionId,
        returnUrl: returnUrl,
      });
    } catch (err: any) {
      console.error("Cashfree checkout error:", err);
      this.toast.error("Cashfree initialization failed.");
      this.isSubmitting.set(false);
      this.loading.stopLoading();
    }
  }

  finishOrder(orderId: string, orderObj?: any) {
    this.ds.clearBuyNowItem();
    this.ds.cart.set([]);
    this.ds.activeCouponCode.set("");
    this.ds.couponDiscountAmount.set(0);
    this.loading.stopLoading();
    this.isSubmitting.set(false);

    // Clear storage
    sessionStorage.removeItem("checkout_active_step");
    localStorage.removeItem("checkout_restored_addr1");
    localStorage.removeItem("checkout_restored_pay");

    this.router.navigate(["/order-success"], {
      queryParams: { orderId },
      state: { order: orderObj || { id: orderId } }
    });
  }
}
