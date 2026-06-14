import {Component, ChangeDetectionStrategy, inject, signal, computed, effect} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {doc, setDoc} from 'firebase/firestore';
import {db} from '../../firebase';
import {
  DatastoreService,
  Advertisement,
  Product,
  Category,
  UserProfile,
  Campaign,
  Order
} from '../../services/datastore';

import {LoadingService} from '../../core/services/loading.service';
import {SkeletonPageComponent} from '../../shared/components/skeleton/skeleton-page/skeleton-page.component';

// Subcomponents
import {AdminDashboardTab} from './components/dashboard-tab';
import {AdminCatalogTab} from './components/catalog-tab';
import {AdminSalesTab} from './components/sales-tab';
import {AdminCustomersTab} from './components/customers-tab';
import {AdminContentTab} from './components/content-tab';
import {AdminMarketingTab} from './components/marketing-tab';
import {AdminAnalyticsTab} from './components/analytics-tab';
import {AdminSettingsTab} from './components/settings-tab';
import { ToastService } from '../../shared/components/toast/toast.service';

export type AdminTab =
  | 'dashboard'
  | 'products' | 'categories' | 'collections' | 'brands' | 'inventory'
  | 'orders' | 'draft-orders' | 'abandoned-carts' | 'quotes'
  | 'customer-list' | 'customer-groups' | 'reviews'
  | 'pages' | 'blogs' | 'faqs' | 'banners' | 'homepage-builder' | 'menu-builder'
  | 'coupons' | 'promotions' | 'email-campaigns' | 'push-notifications'
  | 'sales-reports' | 'product-reports' | 'customer-reports'
  | 'store-settings' | 'theme-settings' | 'payment-settings' | 'shipping-settings' | 'tax-settings' | 'user-management' | 'roles-permissions';

@Component({
  selector: 'app-admin-panel',
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
    AdminSettingsTab
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class AdminPanel {
  toastService = inject(ToastService);
  ds = inject(DatastoreService);
  loadingService = inject(LoadingService);

  loading = computed(() => {
    if (this.loadingService.isLoading()) return true;
    if (this.ds.productsLoading()) return true;
    return false;
  });

  activeTab = signal<AdminTab>('dashboard');

  // Sidebar Group Collapsed state
  collapsedGroups = signal<Record<string, boolean>>({
    'Overview': false,
    'Catalog': false,
    'Sales': false,
    'Customers': false,
    'Content': true,
    'Marketing': true,
    'Analytics': true,
    'Settings': true
  });

  sidebarMenu = [
    {
      group: 'Overview',
      items: [
        { id: 'dashboard' as const, label: 'Dashboard', icon: 'grid_view' }
      ]
    },
    {
      group: 'Catalog',
      items: [
        { id: 'products' as const, label: 'Products', icon: 'inventory_2' },
        { id: 'categories' as const, label: 'Categories', icon: 'account_tree' },
        { id: 'collections' as const, label: 'Collections', icon: 'layers' },
        { id: 'brands' as const, label: 'Brands', icon: 'label' },
        { id: 'inventory' as const, label: 'Inventory', icon: 'shelves' }
      ]
    },
    {
      group: 'Sales',
      items: [
        { id: 'orders' as const, label: 'Orders', icon: 'shopping_bag' },
        { id: 'draft-orders' as const, label: 'Draft Orders', icon: 'note_add' },
        { id: 'abandoned-carts' as const, label: 'Abandoned Carts', icon: 'remove_shopping_cart' },
        { id: 'quotes' as const, label: 'Service Inquiries', icon: 'precision_manufacturing' }
      ]
    },
    {
      group: 'Customers',
      items: [
        { id: 'customer-list' as const, label: 'Customer List', icon: 'people' },
        { id: 'customer-groups' as const, label: 'Customer Groups', icon: 'groups' },
        { id: 'reviews' as const, label: 'Reviews', icon: 'reviews' }
      ]
    },
    {
      group: 'Content',
      items: [
        { id: 'pages' as const, label: 'Pages', icon: 'article' },
        { id: 'blogs' as const, label: 'Blogs', icon: 'feed' },
        { id: 'faqs' as const, label: 'FAQs', icon: 'quiz' },
        { id: 'banners' as const, label: 'Banners', icon: 'view_carousel' },
        { id: 'menu-builder' as const, label: 'Menu Builder', icon: 'menu' },
        { id: 'homepage-builder' as const, label: 'Homepage Builder', icon: 'design_services' }
      ]
    },
    {
      group: 'Marketing',
      items: [
        { id: 'coupons' as const, label: 'Coupons', icon: 'local_offer' },
        { id: 'promotions' as const, label: 'Promotions', icon: 'ads_click' },
        { id: 'email-campaigns' as const, label: 'Email Campaigns', icon: 'email' },
        { id: 'push-notifications' as const, label: 'Push Notifications', icon: 'notifications_active' }
      ]
    },
    {
      group: 'Analytics',
      items: [
        { id: 'sales-reports' as const, label: 'Sales Reports', icon: 'analytics' },
        { id: 'product-reports' as const, label: 'Product Reports', icon: 'equalizer' },
        { id: 'customer-reports' as const, label: 'Customer Reports', icon: 'trending_up' }
      ]
    },
    {
      group: 'Settings',
      items: [
        { id: 'store-settings' as const, label: 'Store Settings', icon: 'store' },
        { id: 'theme-settings' as const, label: 'Theme Settings', icon: 'brush' },
        { id: 'payment-settings' as const, label: 'Payment Settings', icon: 'payment' },
        { id: 'shipping-settings' as const, label: 'Shipping Settings', icon: 'local_shipping' },
        { id: 'tax-settings' as const, label: 'Tax Settings', icon: 'percent' },
        { id: 'user-management' as const, label: 'User Management', icon: 'badge' },
        { id: 'roles-permissions' as const, label: 'Roles & Permissions', icon: 'gavel' }
      ]
    }
  ];

  // Helper arrays for backward compatibility on tabGroups loop in template
  get tabs() {
    return this.sidebarMenu.flatMap(g => g.items.map(i => ({ ...i, group: g.group })));
  }

  tabGroups = computed(() => {
    return this.sidebarMenu.map(g => g.group);
  });

  toggleGroup(group: string) {
    this.collapsedGroups.update(cur => ({ ...cur, [group]: !cur[group] }));
  }

  // Search keyword filters
  searchQueryProducts = signal('');
  searchQueryOrders = signal('');
  searchQueryCustomers = signal('');

  // Product Editor State
  activeProductTab = signal<'general' | 'images' | 'pricing' | 'inventory' | 'seo' | 'variants'>('general');
  editingProduct = signal<Product | null>(null);

  // Theme Settings signals
  primaryColor = signal('#2563eb');
  secondaryColor = signal('#4f46e5');
  accentColor = signal('#10b981');
  borderRadius = signal(20);
  fontFamily = signal('Inter');
  shadowLevel = signal('soft');
  stickyHeader = signal(true);
  searchVisibility = signal(true);
  megaMenuEnabled = signal(true);
  announcementBar = signal('⚡ Free Delivery on orders above ₹999!');

  // Dashboard signals
  revenueTrend = signal([10, 15, 8, 25, 30, 22, 35, 40]);
  inventoryAlerts = computed(() => this.ds.products().filter(p => p.stock < 10).length);

  // User Management Personnel
  users = signal<UserProfile[]>([]);

  // System Configuration parameters
  storeName = signal('3D Galaxy India');
  storeSupportEmail = signal('support@3dgalaxy.co.in');
  taxRate = signal(18);
  serviceFeeRate = signal(150);
  isSaving = signal(false);
  saveStatus = signal<'idle' | 'success' | 'error'>('idle');

  // Auth UI state
  loginLoading = signal(false);
  loginError = signal<string | null>(null);

  // Category drafts state
  newCatName = signal<string>('');
  newCatParentId = signal<string>('');
  newCatDesc = signal<string>('');
  
  editingCategory = signal<any | null>(null);
  catImage = signal<string>('');
  catBanner = signal<string>('');
  catIcon = signal<string>('folder');
  catIsActive = signal<boolean>(true);
  catIsFeatured = signal<boolean>(false);
  catSeoTitle = signal<string>('');
  catSeoDescription = signal<string>('');

  // Branding states
  editingBrand = signal<any | null>(null);
  brandName = signal<string>('');
  brandSlug = signal<string>('');
  brandLogo = signal<string>('https://picsum.photos/seed/logo/200/100');
  brandCountry = signal<string>('Global HQ');
  brandBanner = signal<string>('https://picsum.photos/seed/brand/800/200');
  brandDesc = signal<string>('');
  brandActive = signal<boolean>(true);

  // Menu states
  menuLabel = signal<string>('');
  menuUrl = signal<string>('');
  menuParentId = signal<string | null>(null);
  menuCategoryId = signal<string | null>(null);
  menuSortOrder = signal<number>(1);
  editingMenuItem = signal<any | null>(null);

  // Product drafting state
  pName = signal<string>('');
  pSlug = signal<string>('');
  pBrand = signal<string>('3D Galaxy');
  pCatId = signal<string>('');
  pSku = signal<string>('');
  pMrp = signal<number>(1499);
  pSale = signal<number>(1199);
  pDealer = signal<number>(999);
  pStock = signal<number>(50);
  pDesc = signal<string>('');
  
  // Extended product fields
  pLongDesc = signal<string>('');
  pSeoTitle = signal<string>('');
  pSeoDescription = signal<string>('');
  pImages = signal<{url: string, isPrimary: boolean}[]>([]);
  pVariants = signal<string>('[]');
  pStatus = signal<'active' | 'draft' | 'out_of_stock'>('active');

  // Marketing campaign drafts
  newCampTitle = signal<string>('');
  newCampType = signal<'email' | 'whatsapp' | 'push'>('push');
  newCampMsg = signal<string>('');

  // Banner carousels campaigns
  bannerCampaigns = signal([
    { id: 'b1', name: 'Summer Hot Deals 3D Filament', type: 'Hero Slider', status: 'Published', device: 'Desktop & Mobile', activeHours: '24 Hours', cta: 'Shop Sale' },
    { id: 'b2', name: 'Authorized Creality Launch Promo', type: 'Category Banner', status: 'Published', device: 'Desktop Only', activeHours: 'Scheduled', cta: 'Explore' },
    { id: 'b3', name: 'Free Brass Nozzle Pack on orders over ₹3000', type: 'Sticky Banner', status: 'Draft', device: 'All Platforms', activeHours: 'Manual Override', cta: 'Grab Code' }
  ]);

  // Collections state
  collectionsList = signal([
    { id: 'pla', name: 'PLA Filaments Spec', description: 'Premium polylactic biodegradable spools', count: 5, active: true },
    { id: 'bambu-machines', name: 'Bambu Lab Hardware', description: 'Extreme-speed multi-color printing units', count: 3, active: true },
    { id: 'scanners', name: 'Precision Digitizers', description: 'Metrology scanners and hardware calibration tools', count: 1, active: true },
    { id: 'clearance', name: 'Overstock Clearance', description: 'Clearance inventory and refurbished units', count: 2, active: false }
  ]);
  newColName = signal('');
  newColDesc = signal('');

  // Brands list presets
  brandsList = signal([
    { id: 'bambu-lab', name: 'Bambu Lab', country: 'Global HQ', active: true },
    { id: 'creality', name: 'Creality', country: 'Global HQ', active: true },
    { id: 'anycubic', name: 'Anycubic', country: 'Global HQ', active: true },
    { id: '3d-galaxy', name: '3D Galaxy Spools', country: 'India Hub', active: true }
  ]);
  newBrandName = signal('');
  newBrandCountry = signal('India Hub');

  // Customer List CRM data
  customersList = signal([
    { id: 'c1', name: 'Rajesh Kumar', email: 'rajesh.kumar@gmail.com', phone: '+91 98765 43210', spent: 58499, orders: 3, points: 580, tier: 'B2B Dealer', date: '2026-05-18' },
    { id: 'c2', name: 'Priya Sharma', email: 'priya.sharma@yahoo.com', phone: '+91 98123 45678', spent: 21499, orders: 1, points: 210, tier: 'Retail Creator', date: '2026-06-02' },
    { id: 'c3', name: 'Amit Patel', email: 'amit.patel@design-craft.in', phone: '+91 90011 22334', spent: 145200, orders: 5, points: 1450, tier: 'B2B Dealer', date: '2026-04-20' },
    { id: 'c4', name: 'Vikram Singh', email: 'v.singh@panchkulamakers.org', phone: '+91 80543 21098', spent: 38499, orders: 1, points: 385, tracking_number_placeholder: '123' },
    { id: 'c5', name: 'Sneha Reddy', email: 'sneha.r@gmail.com', phone: '+91 78901 23456', spent: 1250, orders: 1, points: 12, tier: 'Standard Guest', date: '2026-06-04' }
  ]);

  customerGroupsList = signal([
    { id: 'g1', name: 'B2B Dealers', discount: 'Dealer wholesale rates', members: 12 },
    { id: 'g2', name: 'Standard Retail Guests', discount: 'Standard catalog rates', members: 45 },
    { id: 'g3', name: 'VVIP Creators', discount: 'Additional 10% off checkout', members: 8 }
  ]);

  // Reviews Moderation Feed
  reviewsList = signal([
    { id: 'r1', productName: 'Bambu Lab A1 Mini', userName: 'Rajesh K.', rating: 5, comment: 'Phenomenal speed! Best printer for desktop prototypes.', date: '2026-05-20', status: 'Approved', response: '' },
    { id: 'r2', productName: 'Carbon Fiber PLA Core Filament', userName: 'Vikram S.', rating: 4, comment: 'Extremely rigid and strong print quality. Make sure to use hardened steel nozzle.', date: '2026-05-28', status: 'Pending', response: '' },
    { id: 'r3', productName: 'Creality Ender 3 V3 KE', userName: 'Amit P.', rating: 2, comment: 'Extruder clogged on day 3. Fine after clearance but frustrating.', date: '2026-06-01', status: 'Pending', response: '' }
  ]);
  tempResponseText = signal<Record<string, string>>({});

  // Draft Orders Builder signals
  draftQuery = signal('');
  draftItemSelectorOpen = signal(false);
  draftCustomerName = signal('');
  draftCustomerEmail = signal('');
  draftCustomerPhone = signal('');
  draftAddress = signal('');
  draftSelectedItemsList = signal<{ product: Product; qty: number }[]>([]);
  draftDiscountPercent = signal(0);

  // FAQ moderation state
  faqsList = signal([
    { id: 'f1', question: 'How do I claim B2B dealer rates?', answer: 'Register your account with GST identifier and submit validation keys under workspace profiles.', category: 'Pricing & B2B' },
    { id: 'f2', question: 'What is the physical build limit of the Brahma cloud cluster?', answer: 'The individual cluster units support FDM parameters up to 256x256x256mm and custom resin volume matrices.', category: 'Brahma 3D Farm' },
    { id: 'f3', question: 'Is Cash on Delivery available for high-end industrial systems?', answer: 'No, COD is restricted to a maximum basket value of ₹30,000. Enterprise units require electronic clearance.', category: 'Shipping & Billing' }
  ]);
  newFaqQuestion = signal('');
  newFaqAnswer = signal('');
  newFaqCategory = signal('Pricing & B2B');

  // Coupon drafting fields
  newCouponCode = signal('');
  newCouponDiscount = signal(15);
  newCouponMinSpent = signal(1000);

  // Blog drafting fields
  newBlogTitle = signal('');
  newBlogExcerpt = signal('');
  newBlogContent = signal('');
  newBlogImage = signal('https://picsum.photos/seed/tech/800/500');
  newBlogAuthor = signal('Galaxy Admin');
  newBlogTags = signal('3D Printing, Technology');

  // Payment settings state
  paymentGateways = signal([
    { id: 'razorpay', name: 'Razorpay PG', enabled: true, mode: 'sandbox' },
    { id: 'stripe', name: 'Stripe Global', enabled: true, mode: 'live' },
    { id: 'paypal', name: 'PayPal Express', enabled: false, mode: 'sandbox' },
    { id: 'cod', name: 'Cash on Delivery', enabled: true, limit: 30000 }
  ]);

  // Shipping logistical configs
  shippingZones = signal([
    { id: 'sz1', zone: 'Domestic (All India Enclave)', courier: 'BlueDart Cluster', baseRate: 80, freeThreshold: 999 },
    { id: 'sz2', zone: 'International Express', courier: 'DHL Logistics', baseRate: 1500, freeThreshold: 20000 }
  ]);
  newShippingZoneName = signal('');
  newShippingCourier = signal('BlueDart Cluster');
  newShippingBaseRate = signal(80);

  // Administrative Clearance Permission array
  systemPersonnel = signal([
    { uid: 'u1', name: 'Anil Gupta', email: 'anil@3dgalaxy.co.in', role: 'super-admin', active: true },
    { uid: 'u2', name: 'Rahul Dev', email: 'rahul.dev@3dgalaxy.co.in', role: 'admin', active: true },
    { uid: 'u3', name: 'Megha Sen', email: 'megha@3dgalaxy.co.in', role: 'editor', active: false }
  ]);

  // Simulated live printer telemetry cluster
  printerTelemetry = [
    { id: 'P01', model: 'Galaxy Brahma-4X', material: 'PLA Blue', nozzleTemp: 215, bedTemp: 60, progress: 67, status: 'Printing' },
    { id: 'P02', model: 'Galaxy Brahma-4X', material: 'ABS Red', nozzleTemp: 255, bedTemp: 100, progress: 14, status: 'Printing' },
    { id: 'P03', model: 'Galaxy Apex-Resin', material: 'Liquid Resin', nozzleTemp: 0, bedTemp: 0, progress: 0, status: 'Idle' },
    { id: 'P04', model: 'Galaxy Brahma-2X', material: 'PETG Grey', nozzleTemp: 235, bedTemp: 80, progress: 98, status: 'Printing' }
  ];

  // Mock indicators / charts
  monthlySalesChart = [
    { month: 'Jan', val: 120000, height: 40 },
    { month: 'Feb', val: 185000, height: 60 },
    { month: 'Mar', val: 240000, height: 80 },
    { month: 'Apr', val: 195000, height: 65 },
    { month: 'May', val: 320000, height: 110 },
    { month: 'Jun', val: 410000, height: 140 }
  ];

  kpi = computed(() => this.ds.analyticsKPI());
  rootCategories = computed(() => this.ds.categories().filter(c => c.parent_id === null));

  subCategories(parentId: string) {
    return this.ds.categories().filter(c => c.parent_id === parentId);
  }

  activeAdClicks() {
    return this.ds.advertisements().reduce((sum, ad) => sum + (ad.clicks || 0), 0);
  }

  constructor() {
    // Sync local signals with database settings
    effect(() => {
      const s = this.ds.settings();
      if (s) {
        this.storeName.set(s.appName || '3D Galaxy Industrial');
        this.primaryColor.set(s.primaryColor || '#2563eb');
        this.secondaryColor.set(s.secondaryColor || '#4f46e5');
        this.accentColor.set(s.accentColor || '#10b981');
        this.borderRadius.set(s.borderRadius ?? 20);
        this.fontFamily.set(s.fontFamily || 'Inter');
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
    this.activeTab.set('dashboard');
  }

  refreshUsers() {
    // Initial static list is used as fallback. We can also fetch if required.
  }

  setActiveTab(tab: AdminTab) {
    this.activeTab.set(tab);
  }

  setActiveProductTab(tab: string) {
    this.activeProductTab.set(tab as 'general' | 'images' | 'pricing' | 'inventory' | 'seo' | 'variants');
  }

  createNewProductDraft() {
    this.editingProduct.set({ id: 'new' } as Product);
    this.pName.set('');
    this.pSku.set('');
    this.pDesc.set('');
    this.pBrand.set('3D Galaxy');
    this.pMrp.set(1499);
    this.pSale.set(1199);
    this.pDealer.set(999);
    this.pStock.set(50);
  }

  getQuoteStatusClass(status: string) {
    switch (status) {
      case 'submitted': return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/15';
      case 'estimated': return 'bg-blue-500/10 text-blue-500 border border-blue-500/15';
      case 'approved_by_customer': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15';
      case 'completed': return 'bg-purple-500/10 text-purple-500 border border-purple-500/15';
      default: return 'bg-neutral-500/10 text-neutral-500 border border-neutral-500/15';
    }
  }

  getStatusStyle(status: string) {
    switch (status) {
      case 'delivered': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15';
      case 'processing': return 'bg-blue-600/10 text-blue-400 border border-blue-500/15';
      case 'shipped': return 'bg-purple-500/10 text-purple-400 border border-purple-500/15';
      case 'pending': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/15';
      default: return 'bg-red-500/10 text-red-400 border border-red-500/15';
    }
  }

  getCampaignTypeClass(type: string) {
    switch (type) {
      case 'email': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15';
      case 'whatsapp': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15';
      default: return 'bg-blue-500/10 text-blue-400 border border-blue-500/15';
    }
  }

  calculateCTR(ad: Advertisement): string {
    if (!ad || ad.impressions === 0) return '0';
    return ((ad.clicks / ad.impressions) * 100).toFixed(1);
  }

  async updateOrderStatus(orderId: string, nextStatus: string) {
    const order = this.ds.orders().find(o => o.id === orderId);
    if (!order) return;

    let trackingNumber = order.trackingNumber;
    if (nextStatus === 'shipped' && !trackingNumber) {
      trackingNumber = 'TRACK-' + Math.floor(100000 + Math.random() * 900000);
    }

    try {
      await this.ds.updateOrderStatus(orderId, nextStatus, trackingNumber);
    } catch {
      this.toastService.error('FAILED to update order status: Access Denied or Network Error.');
    }
  }

  // --- HIERARCHY TREE LOGICS ---
  startCategoryEdit(cat: Category) {
    this.editingCategory.set(cat);
    this.newCatName.set(cat.name);
    this.newCatParentId.set(cat.parent_id || '');
    this.newCatDesc.set(cat.description || '');
    this.catImage.set(cat.image || '');
    this.catBanner.set(cat.banner || '');
    this.catIcon.set(cat.icon || 'folder');
    this.catIsActive.set(cat.isActive !== false);
    this.catIsFeatured.set(cat.isFeatured || false);
    this.catSeoTitle.set(cat.seoTitle || '');
    this.catSeoDescription.set(cat.seoDescription || '');
  }

  cancelCategoryEdit() {
    this.editingCategory.set(null);
    this.newCatName.set('');
    this.newCatParentId.set('');
    this.newCatDesc.set('');
    this.catImage.set('');
    this.catBanner.set('');
    this.catIcon.set('folder');
    this.catIsActive.set(true);
    this.catIsFeatured.set(false);
    this.catSeoTitle.set('');
    this.catSeoDescription.set('');
  }

  async saveCategory() {
    const name = this.newCatName().trim();
    if (!name) return this.toastService.error('Category Name is required.');
    
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
      slug: (this.editingCategory()?.slug) || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      display_order: finalOrder,
      sortOrder: finalOrder,
      description: this.newCatDesc().trim(),
      image: this.catImage().trim(),
      banner: this.catBanner().trim(),
      icon: this.catIcon().trim(),
      isActive: this.catIsActive(),
      isFeatured: this.catIsFeatured(),
      seoTitle: this.catSeoTitle().trim(),
      seoDescription: this.catSeoDescription().trim()
    };

    try {
      if (this.editingCategory()) {
        await this.ds.editCategory(this.editingCategory()!.id, catData);
        this.toastService.info('Category updated securely!');
      } else {
        await this.ds.addCategory(catData);
        this.toastService.success('Category added successfully!');
      }
      this.cancelCategoryEdit();
    } catch {
      this.toastService.error('Access Denied: You do not have permission to modify categories.');
    }
  }

  async deleteCategory(id: string) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await this.ds.deleteCategory(id);
    } catch {
      this.toastService.error('Access Denied: Action restricted.');
    }
  }

  // --- BRAND CRUD LOGICS ---
  startBrandEdit(brand: any) {
    this.editingBrand.set(brand);
    this.brandName.set(brand.name);
    this.brandSlug.set(brand.slug);
    this.brandLogo.set(brand.logo);
    this.brandCountry.set(brand.country || 'Global HQ');
    this.brandBanner.set(brand.banner || '');
    this.brandDesc.set(brand.description || '');
    this.brandActive.set(brand.active !== false);
  }

  cancelBrandEdit() {
    this.editingBrand.set(null);
    this.brandName.set('');
    this.brandSlug.set('');
    this.brandLogo.set('https://picsum.photos/seed/logo/200/100');
    this.brandCountry.set('Global HQ');
    this.brandBanner.set('https://picsum.photos/seed/brand/800/200');
    this.brandDesc.set('');
    this.brandActive.set(true);
  }

  async saveBrand() {
    const name = this.brandName().trim();
    if (!name) return this.toastService.error('Brand name is required.');
    const slug = this.brandSlug().trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const brandData: any = {
      name,
      slug,
      logo: this.brandLogo().trim(),
      country: this.brandCountry().trim(),
      banner: this.brandBanner().trim(),
      description: this.brandDesc().trim(),
      active: this.brandActive()
    };

    try {
      if (this.editingBrand()) {
        await this.ds.editBrand(this.editingBrand().id, brandData);
        this.toastService.success('Brand updated successfully!');
      } else {
        await this.ds.addBrand(brandData);
        this.toastService.success('Brand added successfully!');
      }
      this.cancelBrandEdit();
    } catch {
      this.toastService.error('Access Denied: Brand-level authentication token is missing or expired.');
    }
  }

  async deleteBrand(id: string) {
    if (!confirm('Are you sure you want to delete this Brand?')) return;
    try {
      await this.ds.deleteBrand(id);
      this.toastService.success('Brand deleted successfully.');
    } catch {
      this.toastService.error('Access Denied: Delete Brand operation failed.');
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
    this.menuLabel.set('');
    this.menuUrl.set('');
    this.menuParentId.set(null);
    this.menuCategoryId.set(null);
    this.menuSortOrder.set(1);
  }

  async saveMenuItem() {
    const label = this.menuLabel().trim();
    if (!label) return this.toastService.error('Menu Label is required.');

    const itemData: any = {
      label,
      url: this.menuUrl().trim(),
      parentId: this.menuParentId() || null,
      categoryId: this.menuCategoryId() || null,
      sortOrder: Number(this.menuSortOrder() || 1)
    };

    try {
      if (this.editingMenuItem()) {
        await this.ds.editMenuItem(this.editingMenuItem().id, itemData);
        this.toastService.success('Menu Item updated successfully!');
      } else {
        await this.ds.addMenuItem(itemData);
        this.toastService.success('Menu Item created successfully!');
      }
      this.cancelMenuItemEdit();
    } catch {
      this.toastService.error('Access Denied: Menu builder option failed.');
    }
  }

  async deleteMenuItem(id: string) {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await this.ds.deleteMenuItem(id);
      this.toastService.success('Menu Item deleted successfully.');
    } catch {
      this.toastService.error('Access Denied: Action failed.');
    }
  }

  // --- PRODUCT MANAGEMENT LOGICS ---
  startProductEdit(p: Product) {
    this.editingProduct.set(p);
    this.pName.set(p.name);
    this.pSku.set(p.sku || '');
    this.pDesc.set(p.description || '');
    this.pLongDesc.set(p.long_description || '');
    this.pBrand.set(p.brand || '3D Galaxy');
    this.pCatId.set(p.category_id || '');
    this.pMrp.set(p.mrp || 0);
    this.pSale.set(p.sale_price || 0);
    this.pDealer.set(p.dealer_price || 0);
    this.pStock.set(p.stock || 0);
    this.pImages.set(p.images && p.images.length ? p.images.map((img: string, i: number) => ({ url: img, isPrimary: i === 0 })) : []);
    this.pVariants.set(p.variants ? JSON.stringify(p.variants, null, 2) : '[]');
    this.pSeoTitle.set(p.seoTitle || '');
    this.pSeoDescription.set(p.seoDescription || '');
    this.pStatus.set(p.status || 'active');
  }

  cancelProductEdit() {
    this.editingProduct.set(null);
    this.pName.set('');
    this.pSku.set('');
    this.pDesc.set('');
    this.pLongDesc.set('');
    this.pBrand.set('3D Galaxy');
    this.pMrp.set(1499);
    this.pSale.set(1199);
    this.pDealer.set(999);
    this.pStock.set(50);
    this.pImages.set([]);
    this.pVariants.set('[]');
    this.pSeoTitle.set('');
    this.pSeoDescription.set('');
    this.pStatus.set('active');
  }

  updateProductName(name: string) {
    this.pName.set(name);
    // Auto-generate slug if we are creating a new product or if slug matches the old generated slug.
    if (!this.editingProduct() || this.editingProduct()?.id === 'new') {
      this.pSlug.set(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  }

  // Image management
  setPrimaryImage(index: number) {
    const imgs = [...this.pImages()];
    imgs.forEach(i => i.isPrimary = false);
    imgs[index].isPrimary = true;
    this.pImages.set(imgs);
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
    const name = this.pName().trim();
    if (!name) return this.toastService.error('Name is required.');

    const isEdit = this.editingProduct() && this.editingProduct()?.id !== 'new';
    
    // Parse images array
    let imagesArr = ['https://picsum.photos/seed/' + Date.now() + '/800/800'];
    const currentImgs = this.pImages();
    if (currentImgs && currentImgs.length > 0) {
      imagesArr = currentImgs.map(i => i.url);
    } else if (isEdit && this.editingProduct()?.images) {
      imagesArr = this.editingProduct()!.images;
    }

    // Parse variants from JSON block
    let variantsArr = [];
    try {
      const vText = this.pVariants().trim();
      if (vText) {
        variantsArr = JSON.parse(vText);
      }
    } catch {
      this.toastService.error('Invalid Variants JSON. Correct or empty this field.');
      return;
    }

    const pData: any = {
      name,
      slug: this.pSlug() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      brand: this.pBrand() || '3D Galaxy',
      category_id: this.pCatId() || 'materials',
      sku: this.pSku() || 'GLX-SKU-' + Math.floor(1000 + Math.random() * 9000),
      barcode: isEdit ? (this.editingProduct()?.barcode || Date.now().toString()) : Date.now().toString(),
      mrp: this.pMrp(),
      sale_price: this.pSale(),
      dealer_price: this.pDealer(),
      stock: this.pStock(),
      description: this.pDesc(),
      long_description: this.pLongDesc(),
      images: imagesArr,
      variants: variantsArr,
      status: this.pStatus(),
      seoTitle: this.pSeoTitle(),
      seoDescription: this.pSeoDescription(),
      featured: isEdit ? (this.editingProduct()?.featured || false) : false,
      is360Supported: isEdit ? (this.editingProduct()?.is360Supported || false) : false,
      tags: [this.pBrand() || '3D Galaxy'],
      specs: isEdit ? (this.editingProduct()?.specs || []) : [],
      reviews: isEdit ? (this.editingProduct()?.reviews || []) : [],
      qnas: isEdit ? (this.editingProduct()?.qnas || []) : []
    };

    try {
      if (isEdit) {
        await this.ds.editProduct(this.editingProduct()!.id, pData);
        this.toastService.success('Product updated successfully!');
      } else {
        await this.ds.addProduct(pData);
        this.toastService.success('Product created successfully!');
      }
      this.cancelProductEdit();
    } catch {
      this.toastService.error('Save failed: Verify administrator privileges.');
    }
  }

  async adjustStock(productId: string, adjustment: number) {
    const p = this.ds.products().find(item => item.id === productId);
    if (!p) return;
    try {
      await this.ds.updateProductStock(productId, Math.max(0, p.stock + adjustment));
    } catch {
      this.toastService.error('Access Denied.');
    }
  }

  async saveGlobalConfig() {
    this.isSaving.set(true);
    try {
      await this.ds.updateSettings({
        appName: this.storeName(),
        primaryColor: this.primaryColor(),
        secondaryColor: this.secondaryColor(),
        accentColor: this.accentColor(),
        borderRadius: this.borderRadius(),
        fontFamily: this.fontFamily()
      });
      this.saveStatus.set('success');
    } catch {
      this.saveStatus.set('error');
    } finally {
      this.isSaving.set(false);
      setTimeout(() => this.saveStatus.set('idle'), 3000);
    }
  }

  // --- PRINTING QUOTES/INQUIRIES ---
  async updateQuoteStatus(quoteId: string, status: string) {
    try {
      await this.ds.updateQuoteStatus(quoteId, status);
    } catch {
      this.toastService.error('Access Denied.');
    }
  }

  overrideQuotePrice(quoteId: string, event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.ds.quotes.update(all => all.map(q => q.id === quoteId ? { ...q, estimatedCost: val } : q));
    }
  }

  async approveEstimate(quoteId: string) {
    try {
      await this.ds.updateQuoteStatus(quoteId, 'estimated');
      this.toastService.info('Estimate published to customer console.');
    } catch {
      this.toastService.error('Error publishing estimate.');
    }
  }

  async completeQuoteFab(quoteId: string) {
    try {
      await this.ds.updateQuoteStatus(quoteId, 'completed');
      this.toastService.info('Job marked as completed.');
    } catch {
      this.toastService.error('Error updating job status.');
    }
  }

  // --- MARKETING ENGINE CONTROLS ---
  onCampTypeChange(event: Event) {
    this.newCampType.set((event.target as HTMLSelectElement).value as 'email' | 'whatsapp' | 'push');
  }

  triggerCampaign() {
    const title = this.newCampTitle().trim();
    const msg = this.newCampMsg().trim();
    if (!title || !msg) {
      this.toastService.warning('WARNING: Title and message content cannot be blank.');
      return;
    }

    const type = this.newCampType();

    const newCamp: Campaign = {
      id: 'camp-' + Date.now(),
      title,
      type,
      message: msg,
      sentCount: Math.floor(65 + Math.random() * 400),
      clickedCount: Math.floor(10 + Math.random() * 50),
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'sent'
    };

    this.ds.notifications.update(all => [newCamp, ...all]);

    // If channel is WhatsApp, trigger real REST notification!
    if (type === 'whatsapp') {
      const recipient = prompt('Enter recipient phone number to test live WhatsApp / Kall Me template dispatch:', '9876543210');
      if (recipient) {
        fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientNumber: recipient,
            templateName: 'CAMPAIGN_BROADCAST',
            parameters: { Title: title, Message: msg }
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            this.toastService.success(`WHATSAPP LIVE DISPATCH SUCCESS:\nContent: "${data.content}"\nStatus: ${data.status}\nLogged securely to Firestore database.`);
          } else {
            this.toastService.error(`WHATSAPP DISPATCH ERROR:\nStatus: ${data.status}\nReason: ${data.reason}`);
          }
        })
        .catch(err => {
          console.error(err);
          this.toastService.error('Network connection error dispatching WhatsApp message payload.');
        });
      }
    } else {
      this.toastService.success(`SUCCESS: Campaign broadcast completed on type "${type}".`);
    }

    // Reset drafts
    this.newCampTitle.set('');
    this.newCampMsg.set('');
  }

  // --- COLLECTIONS & BRANDS MANAGEMENT ---
  createCollection() {
    const name = this.newColName().trim();
    if (!name) return this.toastService.error('Collection Name is required.');
    this.collectionsList.update(all => [...all, {
      id: 'col-' + Date.now(),
      name,
      description: this.newColDesc().trim() || 'No description provided',
      count: 0,
      active: true
    }]);
    this.newColName.set('');
    this.newColDesc.set('');
    this.toastService.info('Collection preset created!');
  }

  toggleCollection(id: string) {
    this.collectionsList.update(all => all.map(c => c.id === id ? { ...c, active: !c.active } : c));
  }

  deleteCollection(id: string) {
    this.collectionsList.update(all => all.filter(c => c.id !== id));
  }

  createBrand() {
    const name = this.newBrandName().trim();
    if (!name) return this.toastService.error('Brand Name of manufacturer is required.');
    this.brandsList.update(all => [...all, {
      id: 'brand-' + Date.now(),
      name,
      country: this.newBrandCountry(),
      active: true
    }]);
    this.newBrandName.set('');
    this.toastService.info('Manufacturer brand registered!');
  }

  toggleBrand(id: string) {
    this.brandsList.update(all => all.map(b => b.id === id ? { ...b, active: !b.active } : b));
  }

  // --- REVIEWS MODERATION ---
  approveReview(id: string) {
    this.reviewsList.update(all => all.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
  }

  rejectReview(id: string) {
    this.reviewsList.update(all => all.map(r => r.id === id ? { ...r, status: 'Spam/Rejected' } : r));
  }

  saveReviewResponse(id: string, text: string) {
    if (!text.trim()) return;
    this.reviewsList.update(all => all.map(r => r.id === id ? { ...r, response: text } : r));
    this.tempResponseText.update(cur => ({ ...cur, [id]: '' }));
    this.toastService.info('Response saved and published.');
  }

  // --- REWARD POINTS CUSTOMIZER ---
  awardPoints(id: string, points: number) {
    this.customersList.update(all => all.map(c => c.id === id ? { ...c, points: Math.max(0, c.points + points) } : c));
  }

  // --- DRAFT ORDERS BUILDER ---
  selectDraftItem(p: Product) {
    this.addDraftItem(p);
  }

  addDraftItem(p: Product) {
    this.draftSelectedItemsList.update(items => {
      const exists = items.find(i => i.product.id === p.id);
      if (exists) {
        return items.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...items, { product: p, qty: 1 }];
    });
  }

  removeDraftItem(productId: string) {
    this.draftSelectedItemsList.update(items => items.filter(i => i.product.id !== productId));
  }

  updateDraftItemQty(productId: string, val: string) {
    const parsed = parseInt(val, 10);
    const qty = isNaN(parsed) ? 1 : Math.max(1, parsed);
    this.draftSelectedItemsList.update(items => items.map(i => i.product.id === productId ? { ...i, qty } : i));
  }

  draftSubtotal = computed(() => {
    return this.draftSelectedItemsList().reduce((sum, item) => sum + (item.product.sale_price * item.qty), 0);
  });

  draftTax = computed(() => Math.round(this.draftSubtotal() * (this.taxRate() / 100)));
  draftGrandTotal = computed(() => this.draftSubtotal() + this.draftTax() - this.draftDiscountPercent());

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
      await setDoc(doc(db, 'orders', randomId), newOrder);
      this.toastService.success(`Manual Order ${orderNum} generated successfully on network database!`);
      // Reset state
      this.draftCustomerName.set('');
      this.draftCustomerEmail.set('');
      this.draftCustomerPhone.set('');
      this.draftAddress.set('');
      this.draftSelectedItemsList.set([]);
      this.draftDiscountPercent.set(0);
      this.setActiveTab('orders');
    } catch {
      this.toastService.error('Failed: Write permission error. Please authenticate as Super Admin.');
    }
  }

  // --- ABANDONED CARTS CLUSTER Blasts ---
  abandonedCartsList = signal([
    { id: 'ab1', email: 'vicky.sharma@outlook.com', phone: '+91 99120 44556', items: 'Bambu Lab A1 Mini (1), Core Filament Spool (2)', cartValue: 24500, date: '2026-06-05', customer: 'Vicky Sharma', recovered: false },
    { id: 'ab2', email: 'pankaj.mehta@mfg-hub.in', phone: '+91 88990 11223', items: 'Articulated PLA Toy (10)', cartValue: 7990, date: '2026-06-04', customer: 'Pankaj Mehta', recovered: false },
    { id: 'ab3', email: 'shubham_maker@gmail.com', phone: '+91 70123 99887', items: 'Creality Ender 3 V3 (1)', cartValue: 19999, date: '2026-06-02', customer: 'Shubham Singh', recovered: true }
  ]);

  sendRecoveryBlast(id: string) {
    this.abandonedCartsList.update(all => all.map(c => c.id === id ? { ...c, recovered: true } : c));
    this.toastService.success('SUCCESS: Recovery coupon code dispatched to customer inbox client.');
  }

  // --- COUPONS CRUD CONTROLS ---
  async addCouponCustom() {
    const code = this.newCouponCode().trim().toUpperCase();
    if (!code) return this.toastService.info('Coupon identifier string cannot be blank.');
    try {
      await this.ds.addCoupon({
        code,
        discountPercent: this.newCouponDiscount(),
        minSpent: this.newCouponMinSpent()
      });
      this.newCouponCode.set('');
      this.toastService.info(`Coupon ${code} configured on network database!`);
    } catch {
      this.toastService.error('Error creating coupon.');
    }
  }

  async deleteCouponCustom(code: string) {
    if (!confirm(`Are you sure you want to delete coupon "${code}"?`)) return;
    try {
      await this.ds.deleteCoupon(code);
      this.toastService.info(`Coupon ${code} removed.`);
    } catch {
      this.toastService.error('Error deleting coupon.');
    }
  }

  // --- CONTENT PAGES AND BLOGS ---
  async publishBlogPost() {
    const title = this.newBlogTitle().trim();
    const content = this.newBlogContent().trim();
    if (!title || !content) return this.toastService.info('Title and Content body cannot be blank.');
    const blog = {
      title,
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      excerpt: this.newBlogExcerpt().trim() || title,
      content,
      imageUrl: this.newBlogImage().trim(),
      author: this.newBlogAuthor().trim(),
      date: new Date().toISOString().slice(0, 10),
      tags: this.newBlogTags().split(',').map(t => t.trim())
    };
    try {
      await this.ds.addBlogPost(blog);
      this.toastService.info('Blog post published!');
      this.newBlogTitle.set('');
      this.newBlogExcerpt.set('');
      this.newBlogContent.set('');
    } catch {
      this.toastService.error('Error writing blog entry.');
    }
  }

  async deleteBlog(id: string) {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    try {
      await this.ds.deleteBlogPost(id);
      this.toastService.info('Blog destroyed.');
    } catch {
      this.toastService.error('Error deleting entry.');
    }
  }

  createFaq() {
    const q = this.newFaqQuestion().trim();
    const a = this.newFaqAnswer().trim();
    if (!q || !a) return this.toastService.error('Question and Answer are required.');
    this.faqsList.update(all => [...all, {
      id: 'faq-' + Date.now(),
      question: q,
      answer: a,
      category: this.newFaqCategory()
    }]);
    this.newFaqQuestion.set('');
    this.newFaqAnswer.set('');
    this.toastService.info('FAQ added.');
  }

  deleteFaq(faqId: string) {
    this.faqsList.update(all => all.filter(f => f.id !== faqId));
  }

  // --- SHIPPING SETTINGS ---
  createShippingZone() {
    const zone = this.newShippingZoneName().trim();
    if (!zone) return this.toastService.error('Zone label required.');
    this.shippingZones.update(all => [...all, {
      id: 'sz-' + Date.now(),
      zone,
      courier: this.newShippingCourier(),
      baseRate: this.newShippingBaseRate(),
      freeThreshold: 999
    }]);
    this.newShippingZoneName.set('');
    this.toastService.info('Shipping zone programmed.');
  }

  deleteShippingZone(id: string) {
    this.shippingZones.update(all => all.filter(z => z.id !== id));
  }

  // --- HOME PAGE LAYOUT ARCHITECTURE CONTROLS ---
  async moveLayoutSection(index: number, direction: 'up' | 'down') {
    const layout = [...this.ds.homeLayout()];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= layout.length) return;

    // Swap segments
    const temp = layout[index];
    layout[index] = layout[targetIndex];
    layout[targetIndex] = temp;

    try {
      await this.ds.updateHomeLayout(layout);
    } catch (err) {
      console.error('Failed to update home layout order:', err);
      this.toastService.error('Access Denied: You do not have permission to modify system layouts.');
    }
  }

  async toggleLayoutSectionVisibility(index: number) {
    const layout = [...this.ds.homeLayout()];
    layout[index] = {
      ...layout[index],
      visible: !layout[index].visible
    };

    try {
      await this.ds.updateHomeLayout(layout);
    } catch (err) {
      console.error('Failed to toggle home layout section:', err);
      this.toastService.error('Access Denied: You do not have permission to modify system layouts.');
    }
  }
}
