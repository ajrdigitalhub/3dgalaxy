import {Component, ChangeDetectionStrategy, inject, signal, computed, effect} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService, Advertisement, Product, UserProfile, Campaign} from '../../services/datastore';

type AdminTab = 'dashboard' | 'orders' | 'products' | 'categories' | 'banners' | 'marketing' | 'theme' | 'cms' | 'users' | 'settings' | 'quotes';

@Component({
  selector: 'app-admin-panel',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class AdminPanel {
  ds = inject(DatastoreService);

  activeTab = signal<AdminTab>('dashboard');

  tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: 'grid_view', group: 'Overview' },
    { id: 'orders' as const, label: 'Orders', icon: 'shopping_bag', group: 'Sales' },
    { id: 'quotes' as const, label: 'Inquiries', icon: 'precision_manufacturing', group: 'Sales' },
    
    { id: 'products' as const, label: 'Products', icon: 'inventory_2', group: 'Catalog' },
    { id: 'categories' as const, label: 'Categories', icon: 'account_tree', group: 'Catalog' },
    { id: 'banners' as const, label: 'Banners', icon: 'view_carousel', group: 'Content' },
    { id: 'cms' as const, label: 'Pages', icon: 'article', group: 'Content' },

    { id: 'marketing' as const, label: 'Marketing', icon: 'campaign', group: 'Growth' },
    { id: 'users' as const, label: 'Staff', icon: 'badge', group: 'System' },
    { id: 'theme' as const, label: 'Store Theme', icon: 'palette', group: 'System' },
    { id: 'settings' as const, label: 'Settings', icon: 'tune', group: 'System' }
  ];

  tabGroups = computed(() => {
    const groups: string[] = [];
    this.tabs.forEach(t => {
      if (!groups.includes(t.group)) groups.push(t.group);
    });
    return groups;
  });

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

  // Dashboard signals
  revenueTrend = signal([10, 15, 8, 25, 30, 22, 35, 40]);
  inventoryAlerts = computed(() => this.ds.products().filter(p => p.stock < 10).length);

  // User Management
  users = signal<UserProfile[]>([]);

  // System Config signal
  storeName = signal('3D Galaxy India');
  storeSupportEmail = signal('support@3dgalaxy.co.in');
  taxRate = signal(18);
  serviceFeeRate = signal(150);
  isSaving = signal(false);
  saveStatus = signal<'idle' | 'success' | 'error'>('idle');
  
  // Auth state UI
  loginLoading = signal(false);
  loginError = signal<string | null>(null);

  // Category drafts
  newCatName = signal<string>('');
  newCatParentId = signal<string>('');
  newCatDesc = signal<string>('');

  // Product drafts
  pName = signal<string>('');
  pBrand = signal<string>('');
  pCatId = signal<string>('');
  pSku = signal<string>('');
  pMrp = signal<number>(0);
  pSale = signal<number>(0);
  pDealer = signal<number>(0);
  pStock = signal<number>(0);
  pDesc = signal<string>('');

  // Settle Campaign drafts
  newCampTitle = signal<string>('');
  newCampType = signal<'email' | 'whatsapp' | 'push'>('push');
  newCampMsg = signal<string>('');

  // Mock sales SVG reporting values
  monthlySalesChart = [
    { month: 'Jan', val: 120, height: 40 },
    { month: 'Feb', val: 185, height: 60 },
    { month: 'Mar', val: 240, height: 80 },
    { month: 'Apr', val: 195, height: 65 },
    { month: 'May', val: 320, height: 110 },
    { month: 'Jun', val: 410, height: 140 }
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
    // Sync local signals with settings
    effect(() => {
      const s = this.ds.settings();
      this.storeName.set(s.appName);
      this.primaryColor.set(s.primaryColor);
      this.secondaryColor.set(s.secondaryColor);
      this.accentColor.set(s.accentColor);
      this.borderRadius.set(s.borderRadius);
      this.fontFamily.set(s.fontFamily);
    });

    // Pull users list
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

  async refreshUsers() {
    // In a real app we'd trigger a service method to get users
    // For now, let's just use a placeholder or add a method to ds
  }

  setActiveTab(tab: AdminTab) {
    this.activeTab.set(tab);
  }

  setActiveProductTab(tab: string) {
    this.activeProductTab.set(tab as 'general' | 'images' | 'pricing' | 'inventory' | 'seo' | 'variants');
  }

  createNewProductDraft() {
    this.editingProduct.set({ id: 'new' } as Product);
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
      case 'delivered': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15';
      case 'processing': return 'bg-blue-500/10 text-blue-500 border border-blue-500/15';
      case 'shipped': return 'bg-purple-500/10 text-purple-500 border border-purple-500/15';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/15';
      default: return 'bg-red-500/10 text-red-500 border border-red-500/15';
    }
  }

  getCampaignTypeClass(type: string) {
    switch (type) {
      case 'email': return 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/15';
      case 'whatsapp': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15';
      default: return 'bg-blue-500/10 text-blue-500 border border-blue-500/15';
    }
  }

  calculateCTR(ad: Advertisement): string {
    if (ad.impressions === 0) return '0';
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
      alert('FAILED to update order status: Access Denied or Network Error.');
    }
  }

  // --- HIERARCHY TREE LOGICS ---
  async createCategory() {
    const name = this.newCatName().trim();
    const desc = this.newCatDesc().trim();
    if (!name) return alert('Category Name is required.');
    
    const parentId = this.newCatParentId() || null;
    try {
      await this.ds.addCategory({ name, description: desc, parent_id: parentId, slug: name.toLowerCase().replace(/\s+/g, '-'), display_order: this.ds.categories().length + 1 });
      this.newCatName.set('');
      this.newCatDesc.set('');
      this.newCatParentId.set('');
    } catch {
      alert('Access Denied: You do not have permission to modify categories.');
    }
  }

  async deleteCategory(id: string) {
    if (!confirm('Are you sure?')) return;
    try {
      await this.ds.deleteCategory(id);
    } catch {
      alert('Access Denied.');
    }
  }

  // --- PRODUCT MANAGEMENT LOGICS ---
  async createProduct() {
    const name = this.pName().trim();
    if (!name) return alert('Name is required.');

    const p = {
      name,
      brand: this.pBrand(),
      category_id: this.pCatId(),
      sku: this.pSku(),
      barcode: Date.now().toString(),
      mrp: this.pMrp(),
      sale_price: this.pSale(),
      dealer_price: this.pDealer(),
      stock: this.pStock(),
      description: this.pDesc(),
      images: ['https://picsum.photos/seed/' + Date.now() + '/800/800'],
      featured: false,
      is360Supported: false,
      tags: [this.pBrand()],
      specs: [],
      reviews: [],
      qnas: []
    };

    try {
      await this.ds.addProduct(p);
      this.pName.set('');
      this.pBrand.set('');
      this.pSku.set('');
      this.pMrp.set(0);
      this.pSale.set(0);
      this.pDealer.set(0);
      this.pStock.set(0);
      this.pDesc.set('');
    } catch {
      alert('Access Denied: Product creation failed.');
    }
  }

  async adjustStock(productId: string, adjustment: number) {
    const p = this.ds.products().find(item => item.id === productId);
    if (!p) return;
    try {
      await this.ds.updateProductStock(productId, Math.max(0, p.stock + adjustment));
    } catch {
      alert('Access Denied.');
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

  // --- PRINTING QUOTES ---
  async updateQuoteStatus(quoteId: string, status: string) {
    try {
      await this.ds.updateQuoteStatus(quoteId, status);
    } catch {
      alert('Access Denied.');
    }
  }

  // --- MESSAGING FORCE LOGICS ---
  onCampTypeChange(event: Event) {
    this.newCampType.set((event.target as HTMLSelectElement).value as 'email' | 'whatsapp' | 'push');
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
      alert('Estimate published to customer console.');
    } catch {
      alert('Error publishing estimate.');
    }
  }

  async completeQuoteFab(quoteId: string) {
    try {
      await this.ds.updateQuoteStatus(quoteId, 'completed');
      alert('Job marked as completed.');
    } catch {
      alert('Error updating job status.');
    }
  }

  triggerCampaign() {
    const title = this.newCampTitle().trim();
    const msg = this.newCampMsg().trim();
    if (!title || !msg) {
      alert('WARNING: Title and message content cannot be blank.');
      return;
    }

    const newCamp: Campaign = {
      id: 'camp-' + Date.now(),
      title,
      type: this.newCampType(),
      message: msg,
      sentCount: Math.floor(65 + Math.random() * 400),
      clickedCount: Math.floor(10 + Math.random() * 50),
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'sent'
    };

    this.ds.notifications.update(all => [newCamp, ...all]);

    // Reset drafts
    this.newCampTitle.set('');
    this.newCampMsg.set('');
    alert(`SUCCESS: Campaign broadcast completed on type "${newCamp.type}".`);
  }

  async seedDatabase() {
    if (!confirm('Are you sure you want to clear the entire database and reseed it with premium 3D printing products, advertisements, blogs, coupons, and social posts?')) return;
    this.isSaving.set(true);
    try {
      await this.ds.seeder.clearAll();
      await this.ds.seeder.seedAll();
      alert('DATABASE RESET SUCCESSFUL: Premium 3D printing ecosystem data has been seeded successfully!');
    } catch (err: any) {
      alert('Error seeding database: ' + err.message);
    } finally {
      this.isSaving.set(false);
    }
  }
}
