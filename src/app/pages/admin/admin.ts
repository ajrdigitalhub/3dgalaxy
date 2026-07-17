import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { MatIconModule } from "@angular/material/icon";
import { environment } from "../../../environments/environment";
import {
  DatastoreService,
  Advertisement,
  Product,
  Category,
  UserProfile,
  Campaign,
  Order,
} from "../../services/datastore";
import { SettingsService } from "../../core/services/settings.service";

import { LoadingService } from "../../core/services/loading.service";
import { SkeletonPageComponent } from "../../shared/components/skeleton/skeleton-page/skeleton-page.component";

// Subcomponents
import { AdminDashboardTab } from "./components/dashboard-tab";
import { AdminCatalogTab } from "./components/catalog-tab";
import { AdminSalesTab } from "./components/sales-tab";
import { AdminCustomersTab } from "./components/customers-tab";
import { AdminContentTab } from "./components/content-tab";
import { AdminMarketingTab } from "./components/marketing-tab";
import { AdminAnalyticsTab } from "./components/analytics-tab";
import { AdminSettingsTab } from "./components/settings-tab";
import { AdminPaymentsTab } from "./components/payments-tab";
import { AdminCommunicationTab } from "./components/communication-tab";
import { AdminAbandonedCheckoutsTab } from "./components/abandoned-checkouts-tab";
import { ToastService } from "../../shared/components/toast/toast.service";

export type AdminTab =
  | "dashboard"
  | "products"
  | "bulk-import"
  | "categories"
  | "collections"
  | "brands"
  | "inventory"
  | "orders"
  | "draft-orders"
  | "abandoned-carts"
  | "quotes"
  | "customer-list"
  | "customer-groups"
  | "reviews"
  | "pages"
  | "blogs"
  | "faqs"
  | "banners"
  | "homepage-builder"
  | "menu-builder"
  | "coupons"
  | "promotions"
  | "email-campaigns"
  | "push-notifications"
  | "sales-reports"
  | "product-reports"
  | "customer-reports"
  | "store-settings"
  | "theme-settings"
  | "seo-settings"
  | "payment-settings"
  | "shipping-settings"
  | "tax-settings"
  | "user-management"
  | "active-sessions"
  | "security-settings"
  | "print-settings"
  | "push-settings"
  | "transactions"
  | "webhook-logs"
  | "whatsapp-logs"
  | "whatsapp-campaign";

@Component({
  selector: "app-admin-panel",
  imports: [
    CommonModule,
    MatIconModule,
    SkeletonPageComponent,
    AdminDashboardTab,
    AdminCatalogTab,
    AdminSalesTab,
    AdminCustomersTab,
    AdminContentTab,
    AdminMarketingTab,
    AdminAnalyticsTab,
    AdminSettingsTab,
    AdminPaymentsTab,
    AdminCommunicationTab,
    AdminAbandonedCheckoutsTab,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./admin.html",
  styleUrl: "./admin.scss",
})
export class AdminPanel {
  toastService = inject(ToastService);
  ds = inject(DatastoreService);
  loadingService = inject(LoadingService);
  http = inject(HttpClient);
  settingsService = inject(SettingsService);

  loading = computed(() => {
    if (this.ds.products().length === 0 && this.ds.productsLoading())
      return true;
    return false;
  });

  activeTab = signal<AdminTab>("dashboard");
  isAdminSidebarOpen = signal(false);

  // Sidebar Group Collapsed state
  collapsedGroups = signal<Record<string, boolean>>({
    Overview: false,
    Catalog: false,
    Sales: false,
    Payments: false,
    Communication: false,
    Customers: false,
    Content: true,
    Marketing: false,
    Analytics: true,
    Settings: true,
  });

  sidebarMenu: Array<{
    group: string;
    items: Array<{ id: AdminTab; label: string; icon: string }>;
  }> = [
    {
      group: "Overview",
      items: [{ id: "dashboard", label: "Dashboard", icon: "grid_view" }],
    },
    {
      group: "Catalog",
      items: [
        { id: "products", label: "Products", icon: "inventory_2" },
        { id: "bulk-import", label: "Bulk Import", icon: "file_upload" },
        { id: "categories", label: "Categories", icon: "account_tree" },
        // { id: 'collections', label: 'Collections', icon: 'layers' },
        { id: "brands", label: "Brands", icon: "label" },
        // { id: 'inventory', label: 'Inventory', icon: 'shelves' }
      ],
    },
    {
      group: "Sales",
      items: [
        { id: "orders", label: "Orders", icon: "shopping_bag" },
        {
          id: "abandoned-carts",
          label: "Abandoned Carts",
          icon: "remove_shopping_cart",
        },
        {
          id: "quotes",
          label: "Service Inquiries",
          icon: "precision_manufacturing",
        },
      ],
    },
    {
      group: "Payments",
      items: [
        { id: "transactions", label: "Transactions", icon: "payments" },
        { id: "webhook-logs", label: "Webhook Logs", icon: "history" },
      ],
    },
    {
      group: "Communication",
      items: [{ id: "whatsapp-logs", label: "WhatsApp Logs", icon: "history" }],
    },
    {
      group: "Customers",
      items: [
        { id: "customer-list", label: "Customer List", icon: "people" },
        // { id: 'customer-groups', label: 'Customer Groups', icon: 'groups' },
        // { id: 'reviews', label: 'Reviews', icon: 'reviews' }
      ],
    },
    {
      group: "Marketing",
      items: [
        { id: "whatsapp-campaign", label: "WhatsApp Campaign", icon: "chat" },
      ],
    },
    // {
    //   group: 'Analytics',
    //   items: [
    //     { id: 'sales-reports', label: 'Sales Reports', icon: 'analytics' },
    //     { id: 'product-reports', label: 'Product Reports', icon: 'equalizer' },
    //     { id: 'customer-reports', label: 'Customer Reports', icon: 'trending_up' }
    //   ]
    // },
    {
      group: "Settings",
      items: [
        { id: "store-settings", label: "Store Settings", icon: "store" },
        { id: "theme-settings", label: "Theme Settings", icon: "brush" },
        { id: "payment-settings", label: "Payment Settings", icon: "payment" },
        // { id: 'shipping-settings', label: 'Shipping Settings', icon: 'local_shipping' },
        // { id: 'tax-settings', label: 'Tax Settings', icon: 'percent' },
        { id: "print-settings", label: "Printing Service", icon: "print" },
        {
          id: "push-settings",
          label: "Push Notification Config",
          icon: "notifications",
        },
        // { id: 'user-management', label: 'User Management', icon: 'badge' },
        // { id: 'active-sessions', label: 'Active Sessions', icon: 'security' },
        // { id: 'security-settings', label: 'Security Settings', icon: 'admin_panel_settings' }
      ],
    },
  ];

  // Helper arrays for backward compatibility on tabGroups loop in template
  get tabs() {
    return this.sidebarMenu.flatMap((g) =>
      g.items.map((i) => ({ ...i, group: g.group })),
    );
  }

  tabGroups = computed(() => {
    return this.sidebarMenu.map((g) => g.group);
  });

  toggleGroup(group: string) {
    this.collapsedGroups.update((cur) => ({ ...cur, [group]: !cur[group] }));
  }

  // Search keyword filters
  searchQueryProducts = signal("");
  searchQueryOrders = signal("");
  searchQueryCustomers = signal("");

  // Product Editor State
  activeProductTab = signal<
    "general" | "images" | "pricing" | "inventory" | "seo" | "variants"
  >("general");
  editingProduct = signal<Product | null>(null);

  // Theme Settings signals
  primaryColor = signal("#2563eb");
  secondaryColor = signal("#4f46e5");
  gradientAngle = signal("135deg");
  accentColor = signal("#10b981");
  borderRadius = signal(20);
  fontFamily = signal("Inter");
  shadowLevel = signal("soft");
  stickyHeader = signal(true);
  searchVisibility = signal(true);
  megaMenuEnabled = signal(true);
  announcementBar = signal("⚡ Free Delivery on orders above ₹999!");

  // Custom branding/image settings signals requested by the user
  logoUrl = signal("https://picsum.photos/seed/logo/200/50");
  faviconUrl = signal("https://picsum.photos/seed/favicon/32/32");
  appIconUrl = signal("https://picsum.photos/seed/icon/512/512");
  loginBgUrl = signal("https://picsum.photos/seed/login/1920/1080");
  adminBgUrl = signal("https://picsum.photos/seed/admin/1920/1080");

  headerLogoUrl = signal("https://picsum.photos/seed/hlogo/200/50");
  footerLogoUrl = signal("https://picsum.photos/seed/flogo/200/50");
  mobileLogoUrl = signal("https://picsum.photos/seed/mlogo/100/50");
  darkModeLogoUrl = signal("https://picsum.photos/seed/dmlogo/200/50");
  loadingLogoUrl = signal("https://picsum.photos/seed/loading/200/200");
  defaultPlaceholderUrl = signal(
    "https://picsum.photos/seed/placeholder/400/400",
  );

  defaultOgImageUrl = signal("https://picsum.photos/seed/og/1200/630");
  defaultSocialShareImageUrl = signal(
    "https://picsum.photos/seed/social/1200/630",
  );

  razorpayLogoUrl = signal("https://picsum.photos/seed/razorpay/200/50");
  paymentMethodIconsUrl = signal("https://picsum.photos/seed/payments/400/100");

  // Security Session Settings
  sessionTimeout = signal<number>(30);
  idleWarningTime = signal<number>(25);
  enableIdleTimeout = signal<boolean>(true);
  enableSessionWarningPopup = signal<boolean>(true);

  // Dashboard signals
  revenueTrend = signal([10, 15, 8, 25, 30, 22, 35, 40]);
  inventoryAlerts = computed(
    () => this.ds.products().filter((p) => p.stock < 10).length,
  );

  // User Management Personnel
  users = signal<UserProfile[]>([]);

  // System Configuration parameters
  storeName = signal("3D Galaxy India");
  storeSupportEmail = signal("support@3dgalaxy.co.in");
  taxRate = signal(18);
  serviceFeeRate = signal(150);
  isSaving = signal(false);
  saveStatus = signal<"idle" | "success" | "error">("idle");

  // Specific Action Protection Loader Signals
  isSavingCategory = signal(false);
  isDeletingCategory = signal(false);
  isSavingBrand = signal(false);
  isDeletingBrand = signal(false);
  isSavingProduct = signal(false);
  isDeletingProduct = signal(false);
  isUpdatingOrderStatus = signal(false);
  isSavingSettings = signal(false);
  isSavingBanner = signal(false);
  isDeletingBanner = signal(false);
  isSavingUser = signal(false);
  isDeletingUser = signal(false);

  // Auth UI state
  loginLoading = signal(false);
  loginError = signal<string | null>(null);

  // Category drafts state
  newCatName = signal<string>("");
  newCatParentId = signal<string>("");
  newCatDesc = signal<string>("");

  editingCategory = signal<any | null>(null);
  catImage = signal<string>("");
  catBanner = signal<string>("");
  catIcon = signal<string>("folder");
  catIsActive = signal<boolean>(true);
  catIsFeatured = signal<boolean>(false);
  catSeoTitle = signal<string>("");
  catSeoDescription = signal<string>("");

  // Branding states
  editingBrand = signal<any | null>(null);
  brandName = signal<string>("");
  brandSlug = signal<string>("");
  brandLogo = signal<string>("https://picsum.photos/seed/logo/200/100");
  brandCountry = signal<string>("Global HQ");
  brandBanner = signal<string>("https://picsum.photos/seed/brand/800/200");
  brandDesc = signal<string>("");
  brandActive = signal<boolean>(true);

  // Menu states
  menuLabel = signal<string>("");
  menuUrl = signal<string>("");
  menuParentId = signal<string | null>(null);
  menuCategoryId = signal<string | null>(null);
  menuSortOrder = signal<number>(1);
  editingMenuItem = signal<any | null>(null);

  // Product drafting state
  pName = signal<string>("");
  pSlug = signal<string>("");
  pBrand = signal<string>("3D Galaxy");
  pCatId = signal<string>("");
  pSku = signal<string>("");
  pMrp = signal<number>(1499);
  pSale = signal<number>(1199);
  pDealer = signal<number>(999);
  pStock = signal<number>(50);
  pDesc = signal<string>("");

  // Extended product fields
  pLongDesc = signal<string>("");
  pSeoTitle = signal<string>("");
  pSeoDescription = signal<string>("");
  pImages = signal<{ url: string; isPrimary: boolean }[]>([]);
  pOptions = signal<{ id?: string; name: string; values: string[] }[]>([]);
  pVariants = signal<any[]>([]);
  pSpecs = signal<{ name: string; value: string }[]>([]);
  pFeatures = signal<{ title: string; description: string }[]>([]);
  pFaqs = signal<{ question: string; answer: string }[]>([]);
  pDownloads = signal<{ title: string; fileUrl: string }[]>([]);
  pWarranty = signal<{ warrantyPeriod: string; warrantyDescription: string }>({
    warrantyPeriod: "",
    warrantyDescription: "",
  });
  pShipping = signal<{
    deliveryTime: string;
    shippingCharges: number;
    shippingRegions: string;
  }>({ deliveryTime: "", shippingCharges: 0, shippingRegions: "" });
  pFeatured = signal<boolean>(false);
  pCodAvailable = signal<boolean>(true);
  pBaseShippingCharge = signal<number>(0);
  pEstimatedDeliveryDays = signal<number>(3);
  pFreeShippingEligible = signal<boolean>(true);
  pBundleProducts = signal<any[]>([]);
  pRecommendedFilaments = signal<string[]>([]);
  pRelatedIds = signal<string[]>([]);
  pStatus = signal<"active" | "draft" | "out_of_stock">("active");

  // Marketing campaign drafts
  newCampTitle = signal<string>("");
  newCampType = signal<"email" | "whatsapp" | "push">("push");
  newCampMsg = signal<string>("");

  newPageTitle = signal("");
  newPageSlug = signal("");
  newPageContent = signal("");

  newBannerTitle = signal("");
  newBannerImageUrl = signal("");
  newBannerLinkUrl = signal("");
  newBannerPosition = signal("Main Carousel");

  // Banner carousels campaigns
  bannerCampaigns = computed(() => this.ds.banners());

  // Collections state
  collectionsList = signal([
    {
      id: "pla",
      name: "PLA Filaments Spec",
      description: "Premium polylactic biodegradable spools",
      count: 5,
      active: true,
    },
    {
      id: "bambu-machines",
      name: "Bambu Lab Hardware",
      description: "Extreme-speed multi-color printing units",
      count: 3,
      active: true,
    },
    {
      id: "scanners",
      name: "Precision Digitizers",
      description: "Metrology scanners and hardware calibration tools",
      count: 1,
      active: true,
    },
    {
      id: "clearance",
      name: "Overstock Clearance",
      description: "Clearance inventory and refurbished units",
      count: 2,
      active: false,
    },
  ]);
  newColName = signal("");
  newColDesc = signal("");

  // Brands list presets
  brandsList = signal([
    { id: "bambu-lab", name: "Bambu Lab", country: "Global HQ", active: true },
    { id: "creality", name: "Creality", country: "Global HQ", active: true },
    { id: "anycubic", name: "Anycubic", country: "Global HQ", active: true },
    {
      id: "3d-galaxy",
      name: "3D Galaxy Spools",
      country: "India Hub",
      active: true,
    },
  ]);
  newBrandName = signal("");
  newBrandCountry = signal("India Hub");

  // Customer List CRM data
  customersList = signal<any[]>([
    {
      id: "c1",
      name: "Rajesh Kumar",
      email: "rajesh.kumar@gmail.com",
      mobile: "+91 98765 43210",
      spent: 58499,
      orders: 3,
      tier: "B2B Dealer",
      date: "2026-05-18",
    },
    {
      id: "c2",
      name: "Priya Sharma",
      email: "priya.sharma@yahoo.com",
      mobile: "+91 98123 45678",
      spent: 21499,
      orders: 1,
      tier: "Retail Creator",
      date: "2026-06-02",
    },
    {
      id: "c3",
      name: "Amit Patel",
      email: "amit.patel@design-craft.in",
      mobile: "+91 90011 22334",
      spent: 145200,
      orders: 5,
      tier: "B2B Dealer",
      date: "2026-04-20",
    },
    {
      id: "c4",
      name: "Vikram Singh",
      email: "v.singh@panchkulamakers.org",
      mobile: "+91 80543 21098",
      spent: 38499,
      orders: 1,
      tracking_number_placeholder: "123",
    },
    {
      id: "c5",
      name: "Sneha Reddy",
      email: "sneha.r@gmail.com",
      mobile: "+91 78901 23456",
      spent: 1250,
      orders: 1,
      tier: "Standard Guest",
      date: "2026-06-04",
    },
  ]);

  customerGroupsList = signal([
    {
      id: "g1",
      name: "B2B Dealers",
      discount: "Dealer wholesale rates",
      members: 12,
    },
    {
      id: "g2",
      name: "Standard Retail Guests",
      discount: "Standard catalog rates",
      members: 45,
    },
    {
      id: "g3",
      name: "VVIP Creators",
      discount: "Additional 10% off checkout",
      members: 8,
    },
  ]);

  // Reviews Moderation Feed
  reviewsList = signal<any[]>([]);
  tempResponseText = signal<Record<string, string>>({});

  // Draft Orders Builder signals
  draftQuery = signal("");
  draftItemSelectorOpen = signal(false);
  draftCustomerName = signal("");
  draftCustomerEmail = signal("");
  draftCustomerPhone = signal("");
  draftAddress = signal("");
  draftSelectedItemsList = signal<{ product: Product; qty: number }[]>([]);
  draftDiscountPercent = signal(0);

  // FAQ moderation state
  faqsList = computed(() => this.ds.faqs());
  newFaqQuestion = signal("");
  newFaqAnswer = signal("");
  newFaqCategory = signal("Pricing & B2B");

  // Coupon drafting fields
  newCouponCode = signal("");
  newCouponDiscount = signal(15);
  newCouponMinSpent = signal(1000);

  // Blog drafting fields
  newBlogTitle = signal("");
  newBlogExcerpt = signal("");
  newBlogContent = signal("");
  newBlogImage = signal("https://picsum.photos/seed/tech/800/500");
  newBlogAuthor = signal("Galaxy Admin");
  newBlogTags = signal("3D Printing, Technology");

  // Payment settings state
  paymentGateways = signal<any[]>([]);

  dashboardStats = signal<any>(null);

  fetchDashboardStats() {
    this.ds.api.get<any>("/admin/dashboard").subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.dashboardStats.set(res.data);
        }
      },
      error: (err: any) => console.error("Dashboard Stats Error:", err),
    });
  }

  fetchCRMLists() {
    this.ds.api.get<any>("/admin/customers").subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.customersList.set(res.data);
        }
      },
      error: (err: any) => console.error("Customers Load Error:", err),
    });

    this.ds.api.get<any>("/admin/abandoned-checkouts").subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res.checkouts || [];
        this.abandonedCartsList.set(list);
      },
      error: (err: any) => console.error("Checkouts Load Error:", err),
    });

    this.ds.api.get<any>("/admin/reviews").subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.reviewsList.set(res.data);
        }
      },
      error: (err: any) => console.error("Reviews Load Error:", err),
    });

    this.ds.api.get<any>("/admin/notifications").subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.ds.notifications.set(res.data);
        }
      },
      error: (err: any) => console.error("Notifications Load Error:", err),
    });
  }

  fetchSecuritySettings() {
    this.settingsService
      .loadSettings()
      .then(() => {
        const res = this.settingsService.security() || {};
        this.sessionTimeout.set(Number(res.sessionTimeout) || 30);
        this.idleWarningTime.set(Number(res.idleWarningTime) || 25);
        this.enableIdleTimeout.set(res.enableIdleTimeout !== false);
        this.enableSessionWarningPopup.set(
          res.enableSessionWarningPopup !== false,
        );
      })
      .catch((err) => console.error("Failed to load security settings", err));
  }

  async saveSecuritySettings() {
    this.isSavingSettings.set(true);
    try {
      await this.settingsService.saveSettings({
        security: {
          sessionTimeout: this.sessionTimeout(),
          idleWarningTime: this.idleWarningTime(),
          enableIdleTimeout: this.enableIdleTimeout(),
          enableSessionWarningPopup: this.enableSessionWarningPopup(),
        },
      });
      this.toastService.success("Security settings saved");
    } catch {
      this.toastService.error("Failed to save security settings");
    } finally {
      this.isSavingSettings.set(false);
    }
  }

  fetchPaymentGateways() {
    this.settingsService
      .loadSettings()
      .then(() => {
        const pgs = this.settingsService.paymentGatewaySettings() || {};
        const methods = pgs.paymentMethods || {};
        const list: any[] = [];
        if (methods.razorpay?.enabled || pgs.razorpayEnabled) {
          list.push({
            id: "razorpay",
            name: "Razorpay",
            enabled: true,
            keyId: methods.razorpay?.keyId || pgs.razorpayKeyId,
          });
        }
        if (methods.cashfree?.enabled) {
          list.push({
            id: "cashfree",
            name: "Cashfree",
            enabled: true,
            appId: methods.cashfree?.appId,
          });
        }
        if (methods.cod?.enabled || pgs.codEnabled) {
          list.push({
            id: "cod",
            name: "Cash on Delivery (COD)",
            enabled: true,
          });
        }
        // Fallback to legacy payment.gateways array if empty
        if (list.length === 0) {
          const legacy = this.settingsService.payment()?.gateways || [];
          list.push(...legacy);
        }
        this.paymentGateways.set(list);
      })
      .catch((err) => console.error("Failed to load payment gateways", err));
  }

  updatePaymentGateway(id: string, updates: any) {
    const pgs = this.settingsService.paymentGatewaySettings()
      ? { ...this.settingsService.paymentGatewaySettings() }
      : {};
    const methods = pgs.paymentMethods ? { ...pgs.paymentMethods } : {};
    methods[id] = { ...(methods[id] || {}), ...updates };
    pgs.paymentMethods = methods;

    this.settingsService
      .saveSettings({
        paymentGatewaySettings: pgs,
      })
      .then(() => {
        this.fetchPaymentGateways();
        this.toastService.success("Payment gateway updated");
      })
      .catch(() => {
        this.toastService.error("Failed to update gateway");
      });
  }

  // Active User Sessions
  activeUserSessions = signal<any[]>([]);

  fetchUserSessions() {
    this.http.get<any>("/api/admin/sessions").subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.activeUserSessions.set(res.sessions || []);
        }
      },
      error: () => {
        this.toastService.error("Failed to grab active sessions");
      },
    });
  }

  terminateUserSession(id: string) {
    this.http.post<any>(`/api/admin/sessions/${id}/terminate`, {}).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.toastService.success("Session terminated successfully");
          this.fetchUserSessions();
        } else {
          this.toastService.error(res.message || "Failed to terminate session");
        }
      },
      error: (err) => {
        this.toastService.error(
          err.error?.message || "Error terminating session",
        );
      },
    });
  }

  // Shipping logistical configs
  shippingZones = signal([
    {
      id: "sz1",
      zone: "Domestic (All India Enclave)",
      courier: "BlueDart Cluster",
      baseRate: 80,
      freeThreshold: 999,
    },
    {
      id: "sz2",
      zone: "International Express",
      courier: "DHL Logistics",
      baseRate: 1500,
      freeThreshold: 20000,
    },
  ]);
  newShippingZoneName = signal("");
  newShippingCourier = signal("BlueDart Cluster");
  newShippingBaseRate = signal(80);

  // Administrative Clearance Permission array
  systemPersonnel = signal([
    {
      uid: "u1",
      name: "Anil Gupta",
      email: "anil@3dgalaxy.co.in",
      role: "super-admin",
      active: true,
    },
    {
      uid: "u2",
      name: "Rahul Dev",
      email: "rahul.dev@3dgalaxy.co.in",
      role: "admin",
      active: true,
    },
    {
      uid: "u3",
      name: "Megha Sen",
      email: "megha@3dgalaxy.co.in",
      role: "editor",
      active: false,
    },
  ]);

  // Simulated live printer telemetry cluster
  printerTelemetry = [
    {
      id: "P01",
      model: "Galaxy Brahma-4X",
      material: "PLA Blue",
      nozzleTemp: 215,
      bedTemp: 60,
      progress: 67,
      status: "Printing",
    },
    {
      id: "P02",
      model: "Galaxy Brahma-4X",
      material: "ABS Red",
      nozzleTemp: 255,
      bedTemp: 100,
      progress: 14,
      status: "Printing",
    },
    {
      id: "P03",
      model: "Galaxy Apex-Resin",
      material: "Liquid Resin",
      nozzleTemp: 0,
      bedTemp: 0,
      progress: 0,
      status: "Idle",
    },
    {
      id: "P04",
      model: "Galaxy Brahma-2X",
      material: "PETG Grey",
      nozzleTemp: 235,
      bedTemp: 80,
      progress: 98,
      status: "Printing",
    },
  ];

  // Mock indicators / charts
  monthlySalesChart = [
    { month: "Jan", val: 120000, height: 40 },
    { month: "Feb", val: 185000, height: 60 },
    { month: "Mar", val: 240000, height: 80 },
    { month: "Apr", val: 195000, height: 65 },
    { month: "May", val: 320000, height: 110 },
    { month: "Jun", val: 410000, height: 140 },
  ];

  kpi = computed(() => this.ds.analyticsKPI());
  rootCategories = computed(() =>
    this.ds.categories().filter((c) => c.parent_id === null),
  );

  subCategories(parentId: string) {
    return this.ds.categories().filter((c) => c.parent_id === parentId);
  }

  activeAdClicks() {
    return this.ds
      .advertisements()
      .reduce((sum, ad) => sum + (ad.clicks || 0), 0);
  }

  constructor() {
    this.ds.reloadProducts(true, true);
    this.ds.reloadCategories(true);
    this.ds.reloadBrands(true);
    this.ds.reloadPages(true);
    this.ds.reloadBlogs(true);
    this.ds.reloadCoupons(true);
    this.ds.reloadSocialPosts(true);
    this.ds.reloadAdvertisements(true);

    this.fetchPaymentGateways();
    this.fetchSecuritySettings();
    this.fetchUserSessions();
    this.fetchDashboardStats();
    this.fetchCRMLists();
    // Sync local signals with database settings
    effect(() => {
      const s = this.ds.settings();
      if (s) {
        this.storeName.set(s.appName || "3D Galaxy Industrial");
        this.primaryColor.set(s.primaryColor || "#2563eb");
        this.secondaryColor.set(s.secondaryColor || "#4f46e5");
        this.gradientAngle.set(s.gradientAngle || "135deg");
        this.accentColor.set(s.accentColor || "#10b981");
        this.borderRadius.set(s.borderRadius ?? 20);
        this.fontFamily.set(s.fontFamily || "Inter");

        // Custom branding/image settings fields
        this.logoUrl.set(s.logoUrl || "https://picsum.photos/seed/logo/200/50");
        this.faviconUrl.set(
          s.faviconUrl || "https://picsum.photos/seed/favicon/32/32",
        );
        this.appIconUrl.set(
          s.appIconUrl || "https://picsum.photos/seed/icon/512/512",
        );
        this.loginBgUrl.set(
          s.loginBgUrl || "https://picsum.photos/seed/login/1920/1080",
        );
        this.adminBgUrl.set(
          s.adminBgUrl || "https://picsum.photos/seed/admin/1920/1080",
        );

        this.headerLogoUrl.set(
          s.headerLogoUrl || "https://picsum.photos/seed/hlogo/200/50",
        );
        this.footerLogoUrl.set(
          s.footerLogoUrl || "https://picsum.photos/seed/flogo/200/50",
        );
        this.mobileLogoUrl.set(
          s.mobileLogoUrl || "https://picsum.photos/seed/mlogo/100/50",
        );
        this.darkModeLogoUrl.set(
          s.darkModeLogoUrl || "https://picsum.photos/seed/dmlogo/200/50",
        );
        this.loadingLogoUrl.set(
          s.loadingLogoUrl || "https://picsum.photos/seed/loading/200/200",
        );
        this.defaultPlaceholderUrl.set(
          s.defaultPlaceholderUrl ||
            "https://picsum.photos/seed/placeholder/400/400",
        );

        this.defaultOgImageUrl.set(
          s.defaultOgImageUrl || "https://picsum.photos/seed/og/1200/630",
        );
        this.defaultSocialShareImageUrl.set(
          s.defaultSocialShareImageUrl ||
            "https://picsum.photos/seed/social/1200/630",
        );

        this.razorpayLogoUrl.set(
          s.razorpayLogoUrl || "https://picsum.photos/seed/razorpay/200/50",
        );
        this.paymentMethodIconsUrl.set(
          s.paymentMethodIconsUrl ||
            "https://picsum.photos/seed/payments/400/100",
        );
      }
    });

    // Auto load users
    this.refreshUsers();
  }

  async login() {
    this.loginLoading.set(true);
    this.loginError.set(null);
    try {
      await this.ds.loginWithGoogle();
    } catch (err: unknown) {
      this.loginError.set((err as Error).message);
    } finally {
      this.loginLoading.set(false);
    }
  }

  async logout() {
    await this.ds.logout();
    this.activeTab.set("dashboard");
  }

  refreshUsers() {
    // Initial static list is used as fallback. We can also fetch if required.
  }

  setActiveTab(tab: AdminTab) {
    this.activeTab.set(tab);
  }

  setActiveProductTab(tab: string) {
    this.activeProductTab.set(
      tab as
        | "general"
        | "images"
        | "pricing"
        | "inventory"
        | "seo"
        | "variants",
    );
  }

  createNewProductDraft() {
    this.editingProduct.set({ id: "new" } as Product);
    this.pName.set("");
    this.pSku.set("");
    this.pDesc.set("");
    this.pBrand.set("3D Galaxy");
    this.pMrp.set(1499);
    this.pSale.set(1199);
    this.pDealer.set(999);
    this.pStock.set(50);
  }

  getQuoteStatusClass(status: string) {
    switch (status) {
      case "submitted":
        return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/15";
      case "estimated":
        return "bg-blue-500/10 text-blue-500 border border-blue-500/15";
      case "approved_by_customer":
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/15";
      case "completed":
        return "bg-purple-500/10 text-purple-500 border border-purple-500/15";
      default:
        return "bg-neutral-500/10 text-neutral-500 border border-neutral-500/15";
    }
  }

  getStatusStyle(status: string) {
    if (!status)
      return "bg-neutral-500/10 text-neutral-400 border border-neutral-500/15";
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-emerald-500/10 text-emerald-400 dark:text-emerald-300 border border-emerald-500/15 dark:border-emerald-500/20";
      case "packed":
      case "processing":
        return "bg-blue-600/10 text-blue-500 dark:text-blue-400 border border-blue-500/15 dark:border-blue-500/20";
      case "shipped":
        return "bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/15 dark:border-purple-500/20";
      case "pending":
      case "confirmed":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/15 dark:border-yellow-500/20";
      default:
        return "bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/15 dark:border-red-500/20";
    }
  }

  getCampaignTypeClass(type: string) {
    switch (type) {
      case "email":
        return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/15";
      case "whatsapp":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15";
      default:
        return "bg-blue-500/10 text-blue-400 border border-blue-500/15";
    }
  }

  calculateCTR(ad: Advertisement): string {
    if (!ad || ad.impressions === 0) return "0";
    return ((ad.clicks / ad.impressions) * 100).toFixed(1);
  }

  async updateOrderStatus(orderId: string, nextStatus: string) {
    if (this.isUpdatingOrderStatus()) return;
    const order = this.ds.orders().find((o) => o.id === orderId);
    if (!order) return;

    let trackingNumber = order.trackingNumber;
    if (nextStatus === "shipped" && !trackingNumber) {
      trackingNumber = "TRACK-" + Math.floor(100000 + Math.random() * 900000);
    }

    this.isUpdatingOrderStatus.set(true);
    try {
      await this.ds.updateOrderStatus(orderId, nextStatus, trackingNumber);
    } catch {
      this.toastService.error(
        "FAILED to update order status: Access Denied or Network Error.",
      );
    } finally {
      this.isUpdatingOrderStatus.set(false);
    }
  }

  // --- HIERARCHY TREE LOGICS ---
  startCategoryEdit(cat: Category) {
    this.editingCategory.set(cat);
    this.newCatName.set(cat.name);
    this.newCatParentId.set(cat.parent_id || "");
    this.newCatDesc.set(cat.description || "");
    this.catImage.set(cat.image || "");
    this.catBanner.set(cat.banner || "");
    this.catIcon.set(cat.icon || "folder");
    this.catIsActive.set(cat.isActive !== false);
    this.catIsFeatured.set(cat.isFeatured || false);
    this.catSeoTitle.set(cat.seoTitle || "");
    this.catSeoDescription.set(cat.seoDescription || "");
  }

  cancelCategoryEdit() {
    this.editingCategory.set(null);
    this.newCatName.set("");
    this.newCatParentId.set("");
    this.newCatDesc.set("");
    this.catImage.set("");
    this.catBanner.set("");
    this.catIcon.set("folder");
    this.catIsActive.set(true);
    this.catIsFeatured.set(false);
    this.catSeoTitle.set("");
    this.catSeoDescription.set("");
  }

  async saveCategory() {
    if (this.isSavingCategory()) return;
    const name = this.newCatName().trim();
    if (!name) return this.toastService.error("Category Name is required.");

    // Calculate display order
    let finalOrder = 1;
    if (this.editingCategory()) {
      finalOrder = this.editingCategory()!.display_order || 1;
    } else {
      finalOrder = this.ds.categories().length + 1;
    }

    const parentId = this.newCatParentId() || null;

    const catData: any = {
      name,
      parent_id: parentId,
      parentId: parentId,
      slug:
        this.editingCategory()?.slug ||
        name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      display_order: finalOrder,
      sortOrder: finalOrder,
      description: this.newCatDesc().trim(),
      image: this.catImage().trim(),
      banner: this.catBanner().trim(),
      icon: this.catIcon().trim(),
      isActive: this.catIsActive(),
      isFeatured: this.catIsFeatured(),
      seoTitle: this.catSeoTitle().trim(),
      seoDescription: this.catSeoDescription().trim(),
    };

    this.isSavingCategory.set(true);
    try {
      if (this.editingCategory()) {
        await this.ds.editCategory(this.editingCategory()!.id, catData);
        this.toastService.info("Category updated securely!");
      } else {
        await this.ds.addCategory(catData);
        this.toastService.success("Category added successfully!");
      }
      this.cancelCategoryEdit();
    } catch {
      this.toastService.error(
        "Access Denied: You do not have permission to modify categories.",
      );
    } finally {
      this.isSavingCategory.set(false);
    }
  }

  async deleteCategory(id: string) {
    if (this.isDeletingCategory()) return;
    if (!confirm("Are you sure you want to delete this category?")) return;
    this.isDeletingCategory.set(true);
    try {
      await this.ds.deleteCategory(id);
    } catch {
      this.toastService.error("Access Denied: Action restricted.");
    } finally {
      this.isDeletingCategory.set(false);
    }
  }

  // --- BRAND CRUD LOGICS ---
  startBrandEdit(brand: any) {
    this.editingBrand.set(brand);
    this.brandName.set(brand.name || "");
    this.brandSlug.set(brand.slug || "");
    this.brandLogo.set(brand.logo || "");
    this.brandCountry.set(brand.country || "Global HQ");
    this.brandBanner.set(brand.banner || "");
    this.brandDesc.set(brand.description || "");
    this.brandActive.set(brand.active !== false);
  }

  cancelBrandEdit() {
    this.editingBrand.set(null);
    this.brandName.set("");
    this.brandSlug.set("");
    this.brandLogo.set("https://picsum.photos/seed/logo/200/100");
    this.brandCountry.set("Global HQ");
    this.brandBanner.set("https://picsum.photos/seed/brand/800/200");
    this.brandDesc.set("");
    this.brandActive.set(true);
  }

  async saveBrand() {
    if (this.isSavingBrand()) return;
    const name = (this.brandName() || "").trim();
    if (!name) return this.toastService.error("Brand name is required.");
    const slug =
      (this.brandSlug() || "").trim() ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const brandData: any = {
      name,
      slug,
      logo: (this.brandLogo() || "").trim(),
      country: (this.brandCountry() || "").trim(),
      banner: (this.brandBanner() || "").trim(),
      description: (this.brandDesc() || "").trim(),
      active: this.brandActive(),
    };

    this.isSavingBrand.set(true);
    try {
      if (this.editingBrand()) {
        await this.ds.editBrand(this.editingBrand().id, brandData);
        this.toastService.success("Brand updated successfully!");
      } else {
        await this.ds.addBrand(brandData);
        this.toastService.success("Brand added successfully!");
      }
      this.cancelBrandEdit();
    } catch {
      this.toastService.error(
        "Access Denied: Brand-level authentication token is missing or expired.",
      );
    } finally {
      this.isSavingBrand.set(false);
    }
  }

  async deleteBrand(id: string) {
    if (this.isDeletingBrand()) return;
    if (!confirm("Are you sure you want to delete this Brand?")) return;
    this.isDeletingBrand.set(true);
    try {
      await this.ds.deleteBrand(id);
      this.toastService.success("Brand deleted successfully.");
    } catch {
      this.toastService.error("Access Denied: Delete Brand operation failed.");
    } finally {
      this.isDeletingBrand.set(false);
    }
  }

  // --- MENU ITEM CRUD LOGICS ---
  startMenuItemEdit(item: any) {
    this.editingMenuItem.set(item);
    this.menuLabel.set(item.label);
    this.menuUrl.set(item.url);
    this.menuParentId.set(item.parentId || null);
    this.menuCategoryId.set(item.categoryId || null);
    this.menuSortOrder.set(item.sortOrder || 1);
  }

  cancelMenuItemEdit() {
    this.editingMenuItem.set(null);
    this.menuLabel.set("");
    this.menuUrl.set("");
    this.menuParentId.set(null);
    this.menuCategoryId.set(null);
    this.menuSortOrder.set(1);
  }

  async saveMenuItem() {
    const label = this.menuLabel().trim();
    if (!label) return this.toastService.error("Menu Label is required.");

    const itemData: any = {
      label,
      url: this.menuUrl().trim(),
      parentId: this.menuParentId() || null,
      categoryId: this.menuCategoryId() || null,
      sortOrder: Number(this.menuSortOrder() || 1),
    };

    try {
      if (this.editingMenuItem()) {
        await this.ds.editMenuItem(this.editingMenuItem().id, itemData);
        this.toastService.success("Menu Item updated successfully!");
      } else {
        await this.ds.addMenuItem(itemData);
        this.toastService.success("Menu Item created successfully!");
      }
      this.cancelMenuItemEdit();
    } catch {
      this.toastService.error("Access Denied: Menu builder option failed.");
    }
  }

  async deleteMenuItem(id: string) {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    try {
      await this.ds.deleteMenuItem(id);
      this.toastService.success("Menu Item deleted successfully.");
    } catch {
      this.toastService.error("Access Denied: Action failed.");
    }
  }

  // --- PRODUCT MANAGEMENT LOGICS ---
  startProductEdit(p: Product) {
    this.editingProduct.set(p);

    // Set immediate basic fields
    this.pName.set(p.name);
    this.pSku.set(p.sku || "");
    this.pDesc.set(p.description || "");
    this.pLongDesc.set(p.long_description || "");
    this.pBrand.set(p.brand || "3D Galaxy");
    this.pCatId.set(p.category_id || "");
    this.pMrp.set(p.mrp || 0);
    this.pSale.set(p.sale_price || 0);
    this.pDealer.set(p.dealer_price || 0);
    this.pStock.set(p.stock || 0);
    this.pImages.set(
      p.images && p.images.length
        ? p.images.map((img: string, i: number) => ({
            url: img,
            isPrimary: i === 0,
          }))
        : [],
    );
    this.pStatus.set(p.status || "active");
    this.pFeatured.set(p.isFeatured || p.featured || false);
    this.pCodAvailable.set(p.codAvailable !== false);
    this.pBaseShippingCharge.set(
      p.baseShippingCharge ? Number(p.baseShippingCharge) : 0,
    );
    this.pEstimatedDeliveryDays.set(p.estimatedDeliveryDays || 3);
    this.pFreeShippingEligible.set(p.freeShippingEligible !== false);
    this.pBundleProducts.set(
      p.bundleProducts
        ? typeof p.bundleProducts === "string"
          ? JSON.parse(p.bundleProducts)
          : p.bundleProducts
        : [],
    );
    this.pRecommendedFilaments.set(
      p.recommendedFilaments
        ? typeof p.recommendedFilaments === "string"
          ? JSON.parse(p.recommendedFilaments)
          : p.recommendedFilaments
        : [],
    );

    // Parse options for the UI (basic default)
    const restoredOptions =
      p.options?.map((o: any) => ({
        id: o.id,
        name: o.name,
        values: o.values ? o.values.map((v: any) => v.value) : [],
      })) || [];
    this.pOptions.set(restoredOptions);
    this.pVariants.set(
      p.variants ? JSON.parse(JSON.stringify(p.variants)) : [],
    );

    this.pSeoTitle.set(p.seo?.seoTitle || p.seoTitle || "");
    this.pSeoDescription.set(p.seo?.seoDescription || p.seoDescription || "");
    this.pSpecs.set(p.specifications || p.specs || []);
    this.pFeatures.set(p.features || []);
    this.pFaqs.set(p.faqs || []);
    this.pDownloads.set(p.downloads || []);
    this.pWarranty.set(
      p.warranty || { warrantyPeriod: "", warrantyDescription: "" },
    );
    this.pShipping.set(
      p.shipping || {
        deliveryTime: "",
        shippingCharges: 0,
        shippingRegions: "",
      },
    );
    this.pRelatedIds.set(
      p.relatedProducts?.map((rp: any) =>
        typeof rp === "string" ? rp : rp.relatedToId,
      ) || [],
    );

    // Asynchronously fetch complete product specifications, options, downloads, etc. from dedicated details endpoint
    this.http.get<any>(`/api/admin/products/${p.id}/details`).subscribe({
      next: (found) => {
        if (found && !found.error) {
          const detail = found.product || found;
          const master = found.masterData || {};

          this.pName.set(detail.name || p.name);
          this.pSku.set(detail.sku || p.sku || "");
          this.pDesc.set(detail.description || p.description || "");
          this.pLongDesc.set(
            detail.long_description || p.long_description || "",
          );
          this.pBrand.set(
            detail.brandId || detail.brand || p.brand || "3D Galaxy",
          );
          this.pCatId.set(
            detail.categoryId || detail.category_id || p.category_id || "",
          );
          this.pMrp.set(detail.mrp || p.mrp || 0);
          this.pSale.set(
            detail.salePrice || detail.sale_price || p.sale_price || 0,
          );
          this.pDealer.set(
            detail.dealerPrice || detail.dealer_price || p.dealer_price || 0,
          );
          this.pStock.set(detail.stock || p.stock || 0);

          const imgs = found.images || detail.images || [];
          this.pImages.set(
            imgs.map((img: any, i: number) => {
              const url = typeof img === "string" ? img : img?.url;
              return { url, isPrimary: i === 0 };
            }),
          );

          const opts = detail.options || [];
          const detailOptions =
            opts.map((o: any) => ({
              id: o.id,
              name: o.name,
              values: o.values ? o.values.map((v: any) => v.value) : [],
            })) || [];
          if (detailOptions.length > 0) {
            this.pOptions.set(detailOptions);
          }
          this.pVariants.set(found.variants || detail.variants || []);

          this.pSeoTitle.set(
            master.seo?.title || master.seo?.seoTitle || detail.seoTitle || "",
          );
          this.pSeoDescription.set(
            master.seo?.description ||
              master.seo?.seoDescription ||
              detail.seoDescription ||
              "",
          );
          this.pSpecs.set(master.specifications || detail.specifications || []);
          this.pFeatures.set(master.features || detail.features || []);
          this.pFaqs.set(master.faqs || detail.faqs || []);
          this.pDownloads.set(master.downloads || detail.downloads || []);
          this.pWarranty.set(
            master.warranty ||
              detail.warranty || {
                warrantyPeriod: "",
                warrantyDescription: "",
              },
          );
          this.pShipping.set(
            master.shipping ||
              detail.shipping || {
                deliveryTime: "",
                shippingCharges: 0,
                shippingRegions: "",
              },
          );
          this.pRelatedIds.set(
            master.relatedProducts?.map((rp: any) =>
              typeof rp === "string" ? rp : rp.relatedToId || rp.id,
            ) || [],
          );
          this.pStatus.set(detail.status || p.status || "active");
          this.pFeatured.set(detail.isFeatured || detail.featured || false);
          this.pCodAvailable.set(detail.codAvailable !== false);
          this.pBaseShippingCharge.set(
            detail.baseShippingCharge ? Number(detail.baseShippingCharge) : 0,
          );
          this.pEstimatedDeliveryDays.set(detail.estimatedDeliveryDays || 3);
          this.pFreeShippingEligible.set(detail.freeShippingEligible !== false);
          this.pBundleProducts.set(
            detail.bundleProducts
              ? typeof detail.bundleProducts === "string"
                ? JSON.parse(detail.bundleProducts)
                : detail.bundleProducts
              : [],
          );
          this.pRecommendedFilaments.set(
            detail.recommendedFilaments
              ? typeof detail.recommendedFilaments === "string"
                ? JSON.parse(detail.recommendedFilaments)
                : detail.recommendedFilaments
              : [],
          );
        }
      },
      error: (err) => {
        console.error("Failed to load detailed specifications", err);
        this.toastService.error("Error fetching complete specifications.");
      },
    });
  }

  cancelProductEdit() {
    this.editingProduct.set(null);
    this.pName.set("");
    this.pSku.set("");
    this.pDesc.set("");
    this.pLongDesc.set("");
    this.pBrand.set("3D Galaxy");
    this.pMrp.set(1499);
    this.pSale.set(1199);
    this.pDealer.set(999);
    this.pStock.set(50);
    this.pImages.set([]);
    this.pOptions.set([]);
    this.pVariants.set([]);
    this.pSeoTitle.set("");
    this.pSeoDescription.set("");
    this.pSpecs.set([]);
    this.pFeatures.set([]);
    this.pFaqs.set([]);
    this.pDownloads.set([]);
    this.pWarranty.set({ warrantyPeriod: "", warrantyDescription: "" });
    this.pShipping.set({
      deliveryTime: "",
      shippingCharges: 0,
      shippingRegions: "",
    });
    this.pRelatedIds.set([]);
    this.pStatus.set("active");
    this.pFeatured.set(false);
    this.pCodAvailable.set(true);
    this.pBaseShippingCharge.set(0);
    this.pEstimatedDeliveryDays.set(3);
    this.pFreeShippingEligible.set(true);
    this.pBundleProducts.set([]);
    this.pRecommendedFilaments.set([]);
  }

  updateProductName(name: string) {
    this.pName.set(name);
    // Auto-generate slug if we are creating a new product or if slug matches the old generated slug.
    if (!this.editingProduct() || this.editingProduct()?.id === "new") {
      this.pSlug.set(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, ""),
      );
    }
  }

  // Array mutators
  addSpec() {
    this.pSpecs.update((x) => [...x, { name: "", value: "" }]);
  }
  removeSpec(idx: number) {
    this.pSpecs.update((x) => {
      const a = [...x];
      a.splice(idx, 1);
      return a;
    });
  }
  updateSpec(idx: number, field: "name" | "value", val: string) {
    this.pSpecs.update((x) => {
      const a = [...x];
      a[idx][field] = val;
      return a;
    });
  }

  addFeature() {
    this.pFeatures.update((x) => [...x, { title: "", description: "" }]);
  }
  removeFeature(idx: number) {
    this.pFeatures.update((x) => {
      const a = [...x];
      a.splice(idx, 1);
      return a;
    });
  }
  updateFeature(idx: number, field: "title" | "description", val: string) {
    this.pFeatures.update((x) => {
      const a = [...x];
      a[idx][field] = val;
      return a;
    });
  }

  addDownload() {
    this.pDownloads.update((x) => [...x, { title: "", fileUrl: "" }]);
  }
  removeDownload(idx: number) {
    this.pDownloads.update((x) => {
      const a = [...x];
      a.splice(idx, 1);
      return a;
    });
  }
  updateDownload(idx: number, field: "title" | "fileUrl", val: string) {
    this.pDownloads.update((x) => {
      const a = [...x];
      a[idx][field] = val;
      return a;
    });
  }

  addFaq() {
    this.pFaqs.update((x) => [...x, { question: "", answer: "" }]);
  }
  removeFaq(idx: number) {
    this.pFaqs.update((x) => {
      const a = [...x];
      a.splice(idx, 1);
      return a;
    });
  }
  updateFaq(idx: number, field: "question" | "answer", val: string) {
    this.pFaqs.update((x) => {
      const a = [...x];
      a[idx][field] = val;
      return a;
    });
  }

  updateWarrantyPeriod(val: string) {
    this.pWarranty.update(
      (w: { warrantyPeriod: string; warrantyDescription: string }) => ({
        ...w,
        warrantyPeriod: val,
      }),
    );
  }
  updateWarrantyDesc(val: string) {
    this.pWarranty.update(
      (w: { warrantyPeriod: string; warrantyDescription: string }) => ({
        ...w,
        warrantyDescription: val,
      }),
    );
  }

  updateShippingTime(val: string) {
    this.pShipping.update((s) => ({ ...s, deliveryTime: val }));
  }
  updateShippingCharges(val: string) {
    this.pShipping.update((s) => ({
      ...s,
      shippingCharges: parseFloat(val) || 0,
    }));
  }
  updateShippingRegions(val: string) {
    this.pShipping.update((s) => ({ ...s, shippingRegions: val }));
  }

  addRelatedProduct(productId: string) {
    if (productId && !this.pRelatedIds().includes(productId)) {
      this.pRelatedIds.update((x) => [...x, productId]);
    }
  }
  removeRelatedProduct(productId: string) {
    this.pRelatedIds.update((x) => x.filter((id) => id !== productId));
  }
  setRelatedIds(val: string) {
    this.pRelatedIds.set(
      val
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s),
    );
  }

  // Image management
  setPrimaryImage(index: number) {
    const imgs = [...this.pImages()];
    imgs.forEach((i) => (i.isPrimary = false));
    imgs[index].isPrimary = true;
    this.pImages.set(imgs);
  }

  // --- OPTIONS & VARIANTS LOGIC ---
  addOption() {
    const opts = [...this.pOptions(), { name: "", values: [] }];
    this.pOptions.set(opts);
  }
  removeOption(index: number) {
    const opts = [...this.pOptions()];
    opts.splice(index, 1);
    this.pOptions.set(opts);
  }
  updateOption() {
    this.pOptions.set([...this.pOptions()]);
  }
  getOptionValuesString(opt: any): string {
    return opt.values ? opt.values.join(", ") : "";
  }
  setOptionValuesString(opt: any, valueStr: string) {
    opt.values = valueStr
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s);
    this.updateOption();
  }
  generateVariants() {
    // Cartesian product logic
    const opts = this.pOptions().filter((o) => o.name && o.values.length > 0);
    if (opts.length === 0) return;

    const cartesian = (a: any[], b: any[]) =>
      [].concat(
        ...(a.map((d: any) => b.map((e: any) => [].concat(d, e))) as any),
      );
    const cartesianProduct = (a: any[], b?: any[], ...c: any[]): any[] => {
      if (!b) return a.map((x) => [x]);
      const d = cartesian(a, b);
      if (c.length === 0) return d;
      return cartesianProduct(d, c[0], ...c.slice(1));
    };

    const valuesArr = opts.map((o) => o.values);
    const combinations: any[] = cartesianProduct(
      valuesArr[0],
      ...valuesArr.slice(1),
    );

    const existingVariants = this.pVariants();
    const newVariants = combinations.map((combo) => {
      const comboStr = Array.isArray(combo) ? combo.join(" - ") : combo;
      const comboArray = Array.isArray(combo) ? combo : [combo];
      // Try to preserve existing variant properties
      const existing = existingVariants.find((v) => v.name === comboStr);
      return (
        existing || {
          id: "new-" + Math.random().toString(36).substring(2, 9),
          name: comboStr,
          sku: this.pSku()
            ? `${this.pSku()}-${comboArray.join("-")}`
                .toUpperCase()
                .replace(/\s+/g, "-")
            : "",
          price: this.pSale(),
          stock: this.pStock(),
          weight: 0,
          optionsData: opts.map((opt, idx) => ({
            optionName: opt.name,
            valueStr: comboArray[idx],
          })), // Tracking mapping
        }
      );
    });
    this.pVariants.set(newVariants);
  }
  removeVariant(index: number) {
    const variants = [...this.pVariants()];
    variants.splice(index, 1);
    this.pVariants.set(variants);
  }

  removeImage(index: number) {
    const imgs = [...this.pImages()];
    const removed = imgs.splice(index, 1)[0];
    if (removed.isPrimary && imgs.length > 0) {
      imgs[0].isPrimary = true;
    }
    this.pImages.set(imgs);
  }

  moveImage(index: number, direction: -1 | 1) {
    const imgs = [...this.pImages()];
    if (index + direction < 0 || index + direction >= imgs.length) return;
    const temp = imgs[index];
    imgs[index] = imgs[index + direction];
    imgs[index + direction] = temp;
    this.pImages.set(imgs);
  }

  async saveProduct() {
    if (this.isSavingProduct()) return;
    const name = this.pName().trim();
    if (!name) return this.toastService.error("Name is required.");

    const isEdit = this.editingProduct() && this.editingProduct()?.id !== "new";

    // Parse images array
    let imagesArr = ["https://picsum.photos/seed/" + Date.now() + "/800/800"];
    const currentImgs = this.pImages();
    if (currentImgs && currentImgs.length > 0) {
      imagesArr = currentImgs.map((i) => i.url);
    } else if (isEdit && this.editingProduct()?.images) {
      imagesArr = this.editingProduct()!.images;
    }

    // Parse variants from JSON block
    let variantsArr = this.pVariants();
    let optionsArr = this.pOptions().map((o: any, idx: number) => ({
      name: o.name,
      sortOrder: idx,
      values: o.values.map((v: string, vidx: number) => ({
        value: v,
        displayValue: v,
        sortOrder: vidx,
      })),
    }));

    const pData: any = {
      name,
      slug:
        this.pSlug() ||
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, ""),
      brand: this.pBrand() || "3D Galaxy",
      category_id: this.pCatId() || "materials",
      sku: this.pSku() || "GLX-SKU-" + Math.floor(1000 + Math.random() * 9000),
      barcode: isEdit
        ? this.editingProduct()?.barcode || Date.now().toString()
        : Date.now().toString(),
      mrp: this.pMrp(),
      sale_price: this.pSale(),
      dealer_price: this.pDealer(),
      stock: this.pStock(),
      description: this.pDesc(),
      long_description: this.pLongDesc(),
      images: imagesArr,
      variants: variantsArr,
      options: optionsArr,
      status: this.pStatus(),
      seoTitle: this.pSeoTitle(),
      seoDescription: this.pSeoDescription(),
      isFeatured: this.pFeatured(),
      featured: this.pFeatured(),
      codAvailable: this.pCodAvailable(),
      baseShippingCharge: this.pBaseShippingCharge(),
      estimatedDeliveryDays: this.pEstimatedDeliveryDays(),
      freeShippingEligible: this.pFreeShippingEligible(),
      bundleProducts: this.pBundleProducts(),
      recommendedFilaments: this.pRecommendedFilaments(),
      is360Supported: isEdit
        ? this.editingProduct()?.is360Supported || false
        : false,
      tags: [this.pBrand() || "3D Galaxy"],
      specs: this.pSpecs(),
      specifications: this.pSpecs(),
      downloads: this.pDownloads(),
      features: this.pFeatures(),
      faqs: this.pFaqs(),
      warranty: this.pWarranty(),
      shipping: this.pShipping(),
      relatedProducts: this.pRelatedIds(),
      reviews: isEdit ? this.editingProduct()?.reviews || [] : [],
      qnas: isEdit ? this.editingProduct()?.qnas || [] : [],
    };

    this.isSavingProduct.set(true);
    try {
      if (isEdit) {
        const res: any = await this.ds.editProduct(
          this.editingProduct()!.id,
          pData,
        );
        this.toastService.success("Product updated successfully!");
        // Reload details using the dedicated API to populate all fields correctly
        this.startProductEdit({ id: this.editingProduct()!.id } as any);
      } else {
        const res: any = await this.ds.addProduct(pData);
        this.toastService.success("Product created successfully!");
        const createdProd = res?.data || res?.product;
        if (createdProd && createdProd.id) {
          // Open the new product in edit mode using details API
          this.startProductEdit({ id: createdProd.id } as any);
        } else {
          this.cancelProductEdit();
        }
      }
    } catch {
      this.toastService.error("Save failed: Verify administrator privileges.");
    } finally {
      this.isSavingProduct.set(false);
    }
  }

  async deleteProduct(id: string) {
    if (this.isDeletingProduct()) return;
    if (!confirm("Are you sure you want to delete this product?")) return;
    this.isDeletingProduct.set(true);
    try {
      await this.ds.deleteProduct(id);
      this.toastService.success("Product deleted successfully.");
    } catch {
      this.toastService.error(
        "Access Denied: Delete Product operation failed.",
      );
    } finally {
      this.isDeletingProduct.set(false);
    }
  }

  async adjustStock(productId: string, adjustment: number) {
    const p = this.ds.products().find((item) => item.id === productId);
    if (!p) return;
    try {
      await this.ds.updateProductStock(
        productId,
        Math.max(0, p.stock + adjustment),
      );
    } catch {
      this.toastService.error("Access Denied.");
    }
  }

  async saveGlobalConfig() {
    if (this.isSaving() || this.isSavingSettings()) return;
    this.isSaving.set(true);
    this.isSavingSettings.set(true);
    try {
      await this.ds.updateSettings({
        appName: this.storeName(),
        primaryColor: this.primaryColor(),
        secondaryColor: this.secondaryColor(),
        gradientAngle: this.gradientAngle(),
        accentColor: this.accentColor(),
        borderRadius: this.borderRadius(),
        fontFamily: this.fontFamily(),

        logoUrl: this.logoUrl(),
        faviconUrl: this.faviconUrl(),
        appIconUrl: this.appIconUrl(),
        loginBgUrl: this.loginBgUrl(),
        adminBgUrl: this.adminBgUrl(),

        headerLogoUrl: this.headerLogoUrl(),
        footerLogoUrl: this.footerLogoUrl(),
        mobileLogoUrl: this.mobileLogoUrl(),
        darkModeLogoUrl: this.darkModeLogoUrl(),
        loadingLogoUrl: this.loadingLogoUrl(),
        defaultPlaceholderUrl: this.defaultPlaceholderUrl(),

        defaultOgImageUrl: this.defaultOgImageUrl(),
        defaultSocialShareImageUrl: this.defaultSocialShareImageUrl(),

        razorpayLogoUrl: this.razorpayLogoUrl(),
        paymentMethodIconsUrl: this.paymentMethodIconsUrl(),
      });
      this.saveStatus.set("success");
    } catch {
      this.saveStatus.set("error");
    } finally {
      this.isSaving.set(false);
      this.isSavingSettings.set(false);
      setTimeout(() => this.saveStatus.set("idle"), 3000);
    }
  }

  // --- PRINTING QUOTES/INQUIRIES ---
  async updateQuoteStatus(quoteId: string, status: string) {
    try {
      await this.ds.updateQuoteStatus(quoteId, status);
    } catch {
      this.toastService.error("Access Denied.");
    }
  }

  overrideQuotePrice(quoteId: string, event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.ds.quotes.update((all) =>
        all.map((q) => (q.id === quoteId ? { ...q, estimatedCost: val } : q)),
      );
    }
  }

  async approveEstimate(quoteId: string) {
    try {
      await this.ds.updateQuoteStatus(quoteId, "estimated");
      this.toastService.info("Estimate published to customer console.");
    } catch {
      this.toastService.error("Error publishing estimate.");
    }
  }

  async completeQuoteFab(quoteId: string) {
    try {
      await this.ds.updateQuoteStatus(quoteId, "completed");
      this.toastService.info("Job marked as completed.");
    } catch {
      this.toastService.error("Error updating job status.");
    }
  }

  // --- MARKETING ENGINE CONTROLS ---
  onCampTypeChange(event: Event) {
    this.newCampType.set(
      (event.target as HTMLSelectElement).value as
        | "email"
        | "whatsapp"
        | "push",
    );
  }

  triggerCampaign() {
    const title = this.newCampTitle().trim();
    const msg = this.newCampMsg().trim();
    if (!title || !msg) {
      this.toastService.warning(
        "WARNING: Title and message content cannot be blank.",
      );
      return;
    }

    const type = this.newCampType();

    const newCamp: Campaign = {
      id: "camp-" + Date.now(),
      title,
      type,
      message: msg,
      sentCount: Math.floor(65 + Math.random() * 400),
      clickedCount: Math.floor(10 + Math.random() * 50),
      date: new Date().toISOString().replace("T", " ").slice(0, 16),
      status: "sent",
    };

    this.ds.notifications.update((all) => [newCamp, ...all]);

    // If channel is WhatsApp, trigger real REST notification!
    if (type === "whatsapp") {
      const recipient = prompt(
        "Enter recipient phone number to test live WhatsApp / Kall Me template dispatch:",
        "9876543210",
      );
      if (recipient) {
        fetch(`${environment.apiUrl}/whatsapp/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientNumber: recipient,
            templateName: "CAMPAIGN_BROADCAST",
            parameters: { Title: title, Message: msg },
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              this.toastService.success(
                `WHATSAPP LIVE DISPATCH SUCCESS:\nContent: "${data.content}"\nStatus: ${data.status}\nLogged securely to Firestore database.`,
              );
            } else {
              this.toastService.error(
                `WHATSAPP DISPATCH ERROR:\nStatus: ${data.status}\nReason: ${data.reason}`,
              );
            }
          })
          .catch((err) => {
            console.error(err);
            this.toastService.error(
              "Network connection error dispatching WhatsApp message payload.",
            );
          });
      }
    } else {
      this.toastService.success(
        `SUCCESS: Campaign broadcast completed on type "${type}".`,
      );
    }

    // Reset drafts
    this.newCampTitle.set("");
    this.newCampMsg.set("");
  }

  // --- COLLECTIONS & BRANDS MANAGEMENT ---
  createCollection() {
    const name = this.newColName().trim();
    if (!name) return this.toastService.error("Collection Name is required.");
    this.collectionsList.update((all) => [
      ...all,
      {
        id: "col-" + Date.now(),
        name,
        description: this.newColDesc().trim() || "No description provided",
        count: 0,
        active: true,
      },
    ]);
    this.newColName.set("");
    this.newColDesc.set("");
    this.toastService.info("Collection preset created!");
  }

  toggleCollection(id: string) {
    this.collectionsList.update((all) =>
      all.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    );
  }

  deleteCollection(id: string) {
    this.collectionsList.update((all) => all.filter((c) => c.id !== id));
  }

  createBrand() {
    const name = this.newBrandName().trim();
    if (!name)
      return this.toastService.error("Brand Name of manufacturer is required.");
    this.brandsList.update((all) => [
      ...all,
      {
        id: "brand-" + Date.now(),
        name,
        country: this.newBrandCountry(),
        active: true,
      },
    ]);
    this.newBrandName.set("");
    this.toastService.info("Manufacturer brand registered!");
  }

  toggleBrand(id: string) {
    this.brandsList.update((all) =>
      all.map((b) => (b.id === id ? { ...b, active: !b.active } : b)),
    );
  }

  // --- REVIEWS MODERATION ---
  approveReview(id: string) {
    this.reviewsList.update((all) =>
      all.map((r) => (r.id === id ? { ...r, status: "Approved" } : r)),
    );
  }

  rejectReview(id: string) {
    this.reviewsList.update((all) =>
      all.map((r) => (r.id === id ? { ...r, status: "Spam/Rejected" } : r)),
    );
  }

  saveReviewResponse(id: string, text: string) {
    if (!text.trim()) return;
    this.reviewsList.update((all) =>
      all.map((r) => (r.id === id ? { ...r, response: text } : r)),
    );
    this.tempResponseText.update((cur) => ({ ...cur, [id]: "" }));
    this.toastService.info("Response saved and published.");
  }

  // --- DRAFT ORDERS BUILDER ---
  selectDraftItem(p: Product) {
    this.addDraftItem(p);
  }

  addDraftItem(p: Product) {
    this.draftSelectedItemsList.update((items) => {
      const exists = items.find((i) => i.product.id === p.id);
      if (exists) {
        return items.map((i) =>
          i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...items, { product: p, qty: 1 }];
    });
  }

  removeDraftItem(productId: string) {
    this.draftSelectedItemsList.update((items) =>
      items.filter((i) => i.product.id !== productId),
    );
  }

  updateDraftItemQty(productId: string, val: string) {
    const parsed = parseInt(val, 10);
    const qty = isNaN(parsed) ? 1 : Math.max(1, parsed);
    this.draftSelectedItemsList.update((items) =>
      items.map((i) => (i.product.id === productId ? { ...i, qty } : i)),
    );
  }

  draftSubtotal = computed(() => {
    return this.draftSelectedItemsList().reduce(
      (sum, item) => sum + item.product.sale_price * item.qty,
      0,
    );
  });

  draftTax = computed(() => 0);
  draftGrandTotal = computed(
    () => this.draftSubtotal() - this.draftDiscountPercent(),
  );

  async submitDraftOrder() {
    const custName = this.draftCustomerName().trim();
    const custEmail = this.draftCustomerEmail().trim();
    if (!custName || !custEmail) {
      this.toastService.info(
        "Customer name and email are mandatory for manual Draft Orders.",
      );
      return;
    }
    if (this.draftSelectedItemsList().length === 0) {
      this.toastService.info(
        "Please add at least one physical SKU to manual draft.",
      );
      return;
    }

    const randomId = "order-" + Date.now();
    const orderNum = "GLX-" + Math.floor(100000 + Math.random() * 900000);
    const items = this.draftSelectedItemsList().map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      quantity: i.qty,
      price: i.product.sale_price,
      mrp: i.product.mrp,
    }));

    const newOrder: Order = {
      id: randomId,
      orderNumber: orderNum,
      customerName: custName,
      customerEmail: custEmail,
      customerPhone: this.draftCustomerPhone().trim() || "+91 99999 99999",
      shippingAddress:
        this.draftAddress().trim() || "Custom Order Warehouse Pickup",
      items,
      subtotal: this.draftSubtotal(),
      discount: this.draftDiscountPercent(),
      shippingFee: 0,
      tax: this.draftTax(),
      grandTotal: this.draftGrandTotal(),
      status: "pending",
      date: new Date().toISOString(),
      paymentMethod: "Manual Draft Pay Link",
      paymentStatus: "unpaid",
    };

    this.ds.api
      .post("/orders", {
        items: this.draftSelectedItemsList().map((i) => ({
          productId: i.product.id,
          variantId: null,
          quantity: i.qty,
        })),
        shippingAddress: {
          addressLine1:
            this.draftAddress().trim() || "Custom Order Warehouse Pickup",
          addressLine2: "",
          city: "City",
          state: "State",
          pincode: "400001",
          country: "India",
        },
        billingAddress: {
          addressLine1:
            this.draftAddress().trim() || "Custom Order Warehouse Pickup",
          addressLine2: "",
          city: "City",
          state: "State",
          pincode: "400001",
          country: "India",
        },
        paymentMethod: "Manual Draft Pay Link",
      })
      .subscribe({
        next: () => {
          this.toastService.success(
            `Manual Order ${orderNum} generated successfully on network database!`,
          );
          this.draftCustomerName.set("");
          this.draftCustomerEmail.set("");
          this.draftCustomerPhone.set("");
          this.draftAddress.set("");
          this.draftSelectedItemsList.set([]);
          this.draftDiscountPercent.set(0);
          this.setActiveTab("orders");
        },
        error: () => {
          this.toastService.error(
            "Failed to generate manual order on backend database.",
          );
        },
      });
  }

  // --- ABANDONED CARTS CLUSTER Blasts ---
  abandonedCartsList = signal<any[]>([]);

  sendRecoveryBlast(id: string) {
    this.abandonedCartsList.update((all) =>
      all.map((c) => (c.id === id ? { ...c, recovered: true } : c)),
    );
    this.toastService.success(
      "SUCCESS: Recovery coupon code dispatched to customer inbox client.",
    );
  }

  // --- COUPONS CRUD CONTROLS ---
  async addCouponCustom() {
    const code = this.newCouponCode().trim().toUpperCase();
    if (!code)
      return this.toastService.info(
        "Coupon identifier string cannot be blank.",
      );
    try {
      await this.ds.addCoupon({
        code,
        discountPercent: this.newCouponDiscount(),
        minSpent: this.newCouponMinSpent(),
      });
      this.newCouponCode.set("");
      this.toastService.info(`Coupon ${code} configured on network database!`);
    } catch {
      this.toastService.error("Error creating coupon.");
    }
  }

  async deleteCouponCustom(code: string) {
    if (!confirm(`Are you sure you want to delete coupon "${code}"?`)) return;
    try {
      await this.ds.deleteCoupon(code);
      this.toastService.info(`Coupon ${code} removed.`);
    } catch {
      this.toastService.error("Error deleting coupon.");
    }
  }

  // --- CONTENT PAGES AND BLOGS ---
  async publishBlogPost() {
    const title = this.newBlogTitle().trim();
    const content = this.newBlogContent().trim();
    if (!title || !content)
      return this.toastService.info("Title and Content body cannot be blank.");
    const blog = {
      title,
      slug: title.toLowerCase().replace(/\s+/g, "-"),
      excerpt: this.newBlogExcerpt().trim() || title,
      content,
      imageUrl: this.newBlogImage().trim(),
      author: this.newBlogAuthor().trim(),
      date: new Date().toISOString().slice(0, 10),
      tags: this.newBlogTags()
        .split(",")
        .map((t) => t.trim()),
    };
    try {
      await this.ds.addBlogPost(blog);
      this.toastService.info("Blog post published!");
      this.newBlogTitle.set("");
      this.newBlogExcerpt.set("");
      this.newBlogContent.set("");
    } catch {
      this.toastService.error("Error writing blog entry.");
    }
  }

  async deleteBlog(id: string) {
    if (!confirm("Are you sure you want to delete this blog post?")) return;
    try {
      await this.ds.deleteBlogPost(id);
      this.toastService.info("Blog destroyed.");
    } catch {
      this.toastService.error("Error deleting entry.");
    }
  }

  async createFaq() {
    const q = this.newFaqQuestion().trim();
    const a = this.newFaqAnswer().trim();
    if (!q || !a)
      return this.toastService.error("Question and Answer are required.");
    try {
      await this.ds.addFaq({
        question: q,
        answer: a,
        category: this.newFaqCategory(),
      });
      this.newFaqQuestion.set("");
      this.newFaqAnswer.set("");
      this.toastService.info("FAQ added.");
    } catch {
      this.toastService.error("Error creating FAQ item.");
    }
  }

  async deleteFaq(faqId: string) {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      await this.ds.deleteFaq(faqId);
      this.toastService.info("FAQ destroyed.");
    } catch {
      this.toastService.error("Failed to delete FAQ.");
    }
  }

  async publishCMSPage() {
    const title = this.newPageTitle().trim();
    const content = this.newPageContent().trim();
    if (!title || !content)
      return this.toastService.error("Title and Content body are required.");
    const slug =
      this.newPageSlug().trim() ||
      title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    try {
      await this.ds.addPage({ title, slug, content, isPublished: true });
      this.newPageTitle.set("");
      this.newPageSlug.set("");
      this.newPageContent.set("");
      this.toastService.info("CMS Page published!");
    } catch {
      this.toastService.error("Error creating CMS page.");
    }
  }

  async deletePage(id: string) {
    if (!confirm("Are you sure you want to delete this page?")) return;
    try {
      await this.ds.deletePage(id);
      this.toastService.info("CMS Page removed.");
    } catch {
      this.toastService.error("Error deleting page.");
    }
  }

  async publishBanner() {
    if (this.isSavingBanner()) return;
    const title = this.newBannerTitle().trim();
    const imageUrl = this.newBannerImageUrl().trim();
    const linkUrl = this.newBannerLinkUrl().trim();
    if (!title)
      return this.toastService.error("Banner campaign title required.");
    this.isSavingBanner.set(true);
    try {
      await this.ds.addBanner({
        title,
        imageUrl,
        linkUrl,
        position: this.newBannerPosition(),
        isActive: true,
      });
      this.newBannerTitle.set("");
      this.newBannerImageUrl.set("");
      this.newBannerLinkUrl.set("");
      this.toastService.info("Banner campaign programmed!");
    } catch {
      this.toastService.error("Failed to schedule campaign banner.");
    } finally {
      this.isSavingBanner.set(false);
    }
  }

  async deleteBanner(id: string) {
    if (this.isDeletingBanner()) return;
    if (!confirm("Are you sure you want to delete this campaign banner?"))
      return;
    this.isDeletingBanner.set(true);
    try {
      await this.ds.deleteBanner(id);
      this.toastService.info("Promo banner decommissioned.");
    } catch {
      this.toastService.error("Error deleting banner.");
    } finally {
      this.isDeletingBanner.set(false);
    }
  }

  async moveBanner(index: number, direction: "up" | "down") {
    const banners = [...this.bannerCampaigns()];
    if (direction === "up" && index > 0) {
      const temp = banners[index];
      banners[index] = banners[index - 1];
      banners[index - 1] = temp;
    } else if (direction === "down" && index < banners.length - 1) {
      const temp = banners[index];
      banners[index] = banners[index + 1];
      banners[index + 1] = temp;
    } else {
      return;
    }

    // Update via settingsService
    try {
      // Create clone with new order
      for (let i = 0; i < banners.length; i++) {
        banners[i].sortOrder = i;
      }
      await this.ds.settingsService.saveSettings({ banners });
      this.toastService.success("Banner order updated.");
    } catch {
      this.toastService.error("Failed to update banner order.");
    }
  }

  async toggleBannerStatus(banner: any) {
    const isActive = !banner.isActive;
    try {
      await this.ds.editBanner(banner.id, { isActive });
      this.toastService.info(isActive ? "Banner published." : "Banner paused.");
    } catch {
      this.toastService.error("Error updating banner status.");
    }
  }

  // --- SHIPPING SETTINGS ---
  createShippingZone() {
    const zone = this.newShippingZoneName().trim();
    if (!zone) return this.toastService.error("Zone label required.");
    this.shippingZones.update((all) => [
      ...all,
      {
        id: "sz-" + Date.now(),
        zone,
        courier: this.newShippingCourier(),
        baseRate: this.newShippingBaseRate(),
        freeThreshold: 999,
      },
    ]);
    this.newShippingZoneName.set("");
    this.toastService.info("Shipping zone programmed.");
  }

  deleteShippingZone(id: string) {
    this.shippingZones.update((all) => all.filter((z) => z.id !== id));
  }

  // --- HOME PAGE LAYOUT ARCHITECTURE CONTROLS ---
  async moveLayoutSection(index: number, direction: "up" | "down") {
    const layout = [...this.ds.homeLayout()];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= layout.length) return;

    // Swap segments
    const temp = layout[index];
    layout[index] = layout[targetIndex];
    layout[targetIndex] = temp;

    try {
      await this.ds.updateHomeLayout(layout);
    } catch (err) {
      console.error("Failed to update home layout order:", err);
      this.toastService.error(
        "Access Denied: You do not have permission to modify system layouts.",
      );
    }
  }

  async toggleLayoutSectionVisibility(index: number) {
    const layout = [...this.ds.homeLayout()];
    layout[index] = {
      ...layout[index],
      visible: !layout[index].visible,
    };

    try {
      await this.ds.updateHomeLayout(layout);
    } catch (err) {
      console.error("Failed to toggle home layout section:", err);
      this.toastService.error(
        "Access Denied: You do not have permission to modify system layouts.",
      );
    }
  }
}
