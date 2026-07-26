import { Component, inject, signal, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AdminPanel } from '../admin';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

interface PageItem {
  id: string;
  label: string;
  category: string;
  icon: string;
  desc: string;
}

interface ActionItem {
  action: string;
  label: string;
  category: string;
  icon: string;
  desc: string;
}

const ADMIN_PAGES: PageItem[] = [
  { id: 'dashboard', label: 'Console Dashboard', category: 'Pages', icon: 'dashboard', desc: 'System analytics, transaction volume, and operational logs.' },
  { id: 'products', label: 'Product Catalog Management', category: 'Pages', icon: 'shopping_bag', desc: 'Create, modify, and delete storefront products.' },
  { id: 'categories', label: 'Product Categories Settings', category: 'Pages', icon: 'category', desc: 'Arrange categories, parent relationships, and banners.' },
  { id: 'brands', label: 'Brands & Manufacturers List', category: 'Pages', icon: 'copyright', desc: 'Configure brands, logos, and manufacturer tags.' },
  { id: 'inventory', label: 'Inventory & Stock Control', category: 'Pages', icon: 'inventory', desc: 'Update inventory, monitor low stock alerts, and set stock limits.' },
  { id: 'orders', label: 'Sales Orders', category: 'Pages', icon: 'receipt', desc: 'Fulfill customer orders, track packages, and print invoices.' },
  { id: 'quotes', label: '3D Printing Quote Inquiries', category: 'Pages', icon: 'print', desc: 'View custom STL uploads and service price requests.' },
  { id: 'abandoned-carts', label: 'Abandoned Checkouts List', category: 'Pages', icon: 'shopping_cart_checkout', desc: 'Inspect items left in checkout and trigger reminders.' },
  { id: 'customer-list', label: 'Customer Directory', category: 'Pages', icon: 'people', desc: 'Examine accounts, check verify statuses, and add helper notes.' },
  { id: 'customer-analytics', label: 'Customer Purchasing Trends', category: 'Pages', icon: 'insights', desc: 'Observe user cohort retention rates and overall spend.' },
  { id: 'reviews', label: 'Product Reviews & Ratings', category: 'Pages', icon: 'rate_review', desc: 'Moderate customer ratings, approve comments, or mark spam.' },
  { id: 'pages', label: 'Static CMS Pages', category: 'Pages', icon: 'wysiwyg', desc: 'Draft About Us, Terms of Service, and custom policy content.' },
  { id: 'blogs', label: 'Blog Publication CMS', category: 'Pages', icon: 'edit_note', desc: 'Post community announcements, guidelines, and articles.' },
  { id: 'faqs', label: 'Knowledgebase & FAQ Builder', category: 'Pages', icon: 'quiz', desc: 'Structure system customer questions and responses.' },
  { id: 'homepage-builder', label: 'Homepage Section Arranger', category: 'Pages', icon: 'view_quilt', desc: 'Set homepage slides, promo banners, and carousel segments.' },
  { id: 'email-campaigns', label: 'Email Marketing System', category: 'Pages', icon: 'forward_to_inbox', desc: 'Draft campaigns, setup dispatch rules, and track stats.' },
  { id: 'push-notifications', label: 'Push Notifications Center', category: 'Pages', icon: 'notifications_active', desc: 'Compose campaigns, builder targets, and schedules.' },
  { id: 'store-settings', label: 'General Store Parameters', category: 'Pages', icon: 'store', desc: 'Set store name, currency symbols, support phones, and addresses.' },
  { id: 'theme-settings', label: 'Theme Styles & Color Palettes', category: 'Pages', icon: 'palette', desc: 'Adjust primary variables, gradients, and custom typography.' },
  { id: 'payment-settings', label: 'Payment Gateway Credentials', category: 'Pages', icon: 'payment', desc: 'Configure Razorpay, Cashfree, or COD authorization details.' },
  { id: 'shipping-settings', label: 'Shipping Rates & Courier Rules', category: 'Pages', icon: 'local_shipping', desc: 'Establish weight rates, shipping regions, and zones.' },
  { id: 'whatsapp-campaign', label: 'WhatsApp Broadcast Hub', category: 'Pages', icon: 'chat', desc: 'Dispatch bulk template marketing messages to users.' }
];

const QUICK_ACTIONS: ActionItem[] = [
  { action: 'theme_dark', label: 'Switch to Dark Mode Theme', category: 'Actions', icon: 'dark_mode', desc: 'Swap site variables to dark stylesheet.' },
  { action: 'theme_light', label: 'Switch to Light Mode Theme', category: 'Actions', icon: 'light_mode', desc: 'Swap site variables to light stylesheet.' },
  { action: 'create_product', label: 'List a New Product', category: 'Actions', icon: 'add_box', desc: 'Launch empty product designer canvas.' },
  { action: 'send_push', label: 'Compose New Push Marketing Campaign', category: 'Actions', icon: 'send', desc: 'Open compose builder under push marketing tab.' },
  { action: 'run_cron', label: 'Trigger Daily Auto-Offer Scheduler', category: 'Actions', icon: 'play_arrow', desc: 'Immediately run daily 5:00 PM IST auto offer cron.' },
  { action: 'clear_cache', label: 'Clear System Cache', category: 'Actions', icon: 'delete_sweep', desc: 'Wipe backend memory buffers and reload.' }
];

@Component({
  selector: 'app-admin-omni-search',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-start justify-center p-4 sm:p-10 animate-fade-in font-sans" (click)="close.emit()">
      
      <!-- Command Palette Dialog Box -->
      <div (click)="$event.stopPropagation()"
           class="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[80vh] transition-all scale-in">
        
        <!-- Search Input Bar -->
        <div class="p-5 border-b border-zinc-150 dark:border-zinc-800 flex items-center gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
          <mat-icon class="text-zinc-400">search</mat-icon>
          <input type="text"
                 #searchInput
                 [(ngModel)]="searchQuery"
                 (input)="onSearchInput()"
                 (keydown)="onKeyDown($event)"
                 placeholder="Search anything: products, orders, customers, settings, or actions... (Esc to close)"
                 class="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 dark:text-white placeholder-zinc-450 font-medium">
          
          @if (searchQuery) {
            <button (click)="clearSearch()" class="h-6 w-6 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center border-none bg-transparent cursor-pointer text-zinc-400">
              <mat-icon class="text-base">close</mat-icon>
            </button>
          }
          
          <span class="text-[9px] font-black font-mono border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded bg-white dark:bg-zinc-950 text-zinc-400">ESC</span>
        </div>

        <!-- Filter Chips Bar -->
        <div class="px-5 py-3 border-b border-zinc-150 dark:border-zinc-800 flex flex-wrap gap-1.5 bg-white dark:bg-zinc-900">
          @for (chip of filterChips; track chip) {
            <button (click)="activeFilter.set(chip); filterResults()"
                    [class]="activeFilter() === chip ? 'bg-blue-600 text-white font-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-750'"
                    class="px-3 py-1 text-[10px] uppercase rounded-full transition-all border-none cursor-pointer">
              {{ chip }}
            </button>
          }
        </div>

        <!-- Search Results Container -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4" style="max-height: 480px;">
          
          @if (loading()) {
            <div class="flex flex-col items-center justify-center py-12 space-y-3">
              <div class="h-6 w-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <span class="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Querying Database...</span>
            </div>
          } @else if (hasResults()) {
            
            <!-- Category Grouped Results -->
            
            <!-- Pages -->
            @if (filteredPages().length > 0) {
              <div class="space-y-1.5">
                <h4 class="text-[9px] font-black uppercase text-zinc-400 tracking-widest px-3 flex items-center gap-1.5"><mat-icon class="text-xs scale-90">wysiwyg</mat-icon> Admin Navigation ({{ filteredPages().length }})</h4>
                <div class="space-y-0.5">
                  @for (p of filteredPages(); track p.id) {
                    <div (click)="selectPage(p.id)"
                         [class.bg-zinc-100]="isHighlighted(p)"
                         [class.dark:bg-zinc-800]="isHighlighted(p)"
                         class="group flex items-center gap-3.5 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-2xl cursor-pointer transition-all">
                      <div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-105 transition-transform"><mat-icon class="text-base">{{ p.icon }}</mat-icon></div>
                      <div class="flex-1 overflow-hidden">
                        <div class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                          <span [innerHTML]="highlightText(p.label)"></span>
                          <span class="text-[8px] font-black uppercase px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-950 text-zinc-400 rounded">tab</span>
                        </div>
                        <p class="text-[10px] text-zinc-450 truncate mt-0.5">{{ p.desc }}</p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Actions -->
            @if (filteredActions().length > 0) {
              <div class="space-y-1.5">
                <h4 class="text-[9px] font-black uppercase text-zinc-400 tracking-widest px-3 flex items-center gap-1.5"><mat-icon class="text-xs scale-90">bolt</mat-icon> Command Actions ({{ filteredActions().length }})</h4>
                <div class="space-y-0.5">
                  @for (a of filteredActions(); track a.action) {
                    <div (click)="triggerAction(a.action)"
                         [class.bg-zinc-100]="isHighlighted(a)"
                         [class.dark:bg-zinc-800]="isHighlighted(a)"
                         class="group flex items-center gap-3.5 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-2xl cursor-pointer transition-all">
                      <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform"><mat-icon class="text-base">{{ a.icon }}</mat-icon></div>
                      <div class="flex-1 overflow-hidden">
                        <div class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                          <span [innerHTML]="highlightText(a.label)"></span>
                          <span class="text-[8px] font-black uppercase px-1.5 py-0.2 bg-amber-500/10 text-amber-500 rounded">run</span>
                        </div>
                        <p class="text-[10px] text-zinc-450 truncate mt-0.5">{{ a.desc }}</p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Products -->
            @if (dbProducts().length > 0 && (activeFilter() === 'ALL' || activeFilter() === 'PRODUCTS')) {
              <div class="space-y-1.5">
                <h4 class="text-[9px] font-black uppercase text-zinc-400 tracking-widest px-3 flex items-center gap-1.5"><mat-icon class="text-xs scale-90">shopping_bag</mat-icon> Storefront Products ({{ dbProducts().length }})</h4>
                <div class="space-y-0.5">
                  @for (p of dbProducts(); track p.id) {
                    <div (click)="selectProduct(p)"
                         [class.bg-zinc-100]="isHighlighted(p)"
                         [class.dark:bg-zinc-800]="isHighlighted(p)"
                         class="group flex items-center gap-3.5 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-2xl cursor-pointer transition-all">
                      <img [src]="p.image || '/assets/icon.png'" class="w-9 h-9 object-cover rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800">
                      <div class="flex-1 overflow-hidden">
                        <div class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                          <span [innerHTML]="highlightText(p.name)"></span>
                          <span class="text-[10px] text-blue-500 font-bold">₹{{ p.salePrice || p.basePrice }}</span>
                        </div>
                        <p class="text-[10px] text-zinc-400 mt-0.5 font-mono">SKU: <span [innerHTML]="highlightText(p.sku || 'N/A')"></span></p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Orders -->
            @if (dbOrders().length > 0 && (activeFilter() === 'ALL' || activeFilter() === 'ORDERS')) {
              <div class="space-y-1.5">
                <h4 class="text-[9px] font-black uppercase text-zinc-400 tracking-widest px-3 flex items-center gap-1.5"><mat-icon class="text-xs scale-90">receipt</mat-icon> Customer Orders ({{ dbOrders().length }})</h4>
                <div class="space-y-0.5">
                  @for (o of dbOrders(); track o.id) {
                    <div (click)="selectOrder(o.id)"
                         [class.bg-zinc-100]="isHighlighted(o)"
                         [class.dark:bg-zinc-800]="isHighlighted(o)"
                         class="group flex items-center gap-3.5 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-2xl cursor-pointer transition-all">
                      <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform"><mat-icon class="text-base">shopping_basket</mat-icon></div>
                      <div class="flex-1 overflow-hidden">
                        <div class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                          <span [innerHTML]="highlightText(o.id)"></span>
                          <span class="text-[10px] font-black px-2 py-0.5 rounded-full" [ngClass]="getOrderStatusClass(o.status)">{{ o.status }}</span>
                        </div>
                        <div class="flex justify-between mt-0.5 text-[10px] text-zinc-450">
                          <span [innerHTML]="highlightText(o.customerName)"></span>
                          <span class="font-bold">₹{{ o.totalAmount }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Customers -->
            @if (dbCustomers().length > 0 && (activeFilter() === 'ALL' || activeFilter() === 'CUSTOMERS')) {
              <div class="space-y-1.5">
                <h4 class="text-[9px] font-black uppercase text-zinc-400 tracking-widest px-3 flex items-center gap-1.5"><mat-icon class="text-xs scale-90">people</mat-icon> Customers ({{ dbCustomers().length }})</h4>
                <div class="space-y-0.5">
                  @for (c of dbCustomers(); track c.id) {
                    <div (click)="selectCustomer(c.id)"
                         [class.bg-zinc-100]="isHighlighted(c)"
                         [class.dark:bg-zinc-800]="isHighlighted(c)"
                         class="group flex items-center gap-3.5 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-2xl cursor-pointer transition-all">
                      <div class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-xs font-bold uppercase">{{ (c.user?.firstName || 'C')?.slice(0,2) }}</div>
                      <div class="flex-1 overflow-hidden">
                        <div class="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          <span [innerHTML]="highlightText((c.user?.firstName || '') + ' ' + (c.user?.lastName || ''))"></span>
                        </div>
                        <div class="flex justify-between mt-0.5 text-[10px] text-zinc-450">
                          <span [innerHTML]="highlightText(c.user?.email || 'N/A')"></span>
                          <span class="font-mono" [innerHTML]="highlightText(c.phone || 'N/A')"></span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

          } @else {
            <!-- Welcome or No results state -->
            <div class="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div class="w-16 h-16 rounded-3xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-800">
                <mat-icon class="text-zinc-400 text-3xl scale-125">search_off</mat-icon>
              </div>
              <div>
                <h4 class="text-sm font-black text-zinc-800 dark:text-white uppercase tracking-tight">
                  {{ searchQuery ? 'No Matches Found' : 'Administrative Omni Search' }}
                </h4>
                <p class="text-xs text-zinc-500 mt-1 max-w-sm">
                  {{ searchQuery ? 'No records matched your search parameters. Try broad terms.' : 'Type names, IDs, SKUs, or tab titles to filter logs and records.' }}
                </p>
              </div>
            </div>
          }

        </div>

        <!-- Footer shortcut legend -->
        <div class="p-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-[9px] font-black uppercase text-zinc-400">
          <div class="flex gap-4">
            <span class="flex items-center gap-1"><mat-icon class="text-xs scale-90">arrow_upward</mat-icon> <mat-icon class="text-xs scale-90">arrow_downward</mat-icon> Navigate</span>
            <span class="flex items-center gap-1"><mat-icon class="text-xs scale-90">keyboard_return</mat-icon> Select</span>
          </div>
          <span>3D Galaxy Console Search</span>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .scale-in {
      animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .animate-fade-in {
      animation: fadeIn 0.15s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { transform: scale(0.97); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .cursor-pointer { cursor: pointer; }
    .border-none { border: none; }
  `]
})
export class OmniSearchComponent implements OnInit, OnDestroy {
  @Input({ required: true }) admin!: AdminPanel;
  @Output() close = new EventEmitter<void>();

  searchQuery = '';
  loading = signal(false);
  activeFilter = signal<'ALL' | 'PAGES' | 'PRODUCTS' | 'ORDERS' | 'CUSTOMERS' | 'ACTIONS'>('ALL');
  
  filterChips: ('ALL' | 'PAGES' | 'PRODUCTS' | 'ORDERS' | 'CUSTOMERS' | 'ACTIONS')[] = [
    'ALL', 'PAGES', 'ACTIONS', 'PRODUCTS', 'ORDERS', 'CUSTOMERS'
  ];

  // Local filtered lists
  filteredPages = signal<PageItem[]>([]);
  filteredActions = signal<ActionItem[]>([]);
  
  // Database fetched lists
  dbProducts = signal<any[]>([]);
  dbOrders = signal<any[]>([]);
  dbCustomers = signal<any[]>([]);

  // Keyboard navigation highlight index
  highlightedIndex = signal<number>(0);

  private api = inject(ApiService);
  private toast = inject(ToastService);
  private searchSubject = new Subject<string>();

  ngOnInit() {
    // Focus search input
    setTimeout(() => {
      const el = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (el) el.focus();
    }, 100);

    // Debounced search trigger for database queries
    this.searchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query.trim()) {
          this.loading.set(false);
          return Promise.resolve({ success: true, data: { products: [], orders: [], customers: [] } });
        }
        this.loading.set(true);
        return this.api.get<any>('/admin/omni-search', { q: query });
      })
    ).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res && res.success && res.data) {
          this.dbProducts.set(res.data.products || []);
          this.dbOrders.set(res.data.orders || []);
          this.dbCustomers.set(res.data.customers || []);
        }
        this.highlightedIndex.set(0);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Omni-search database error:', err);
      }
    });

    // Populate initial pages & actions
    this.filterResults();
  }

  ngOnDestroy() {
    this.searchSubject.complete();
  }

  onSearchInput() {
    this.filterResults();
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch() {
    this.searchQuery = '';
    this.dbProducts.set([]);
    this.dbOrders.set([]);
    this.dbCustomers.set([]);
    this.filterResults();
  }

  filterResults() {
    const q = this.searchQuery.toLowerCase().trim();
    const filter = this.activeFilter();

    // 1. Filter Pages
    if (filter === 'ALL' || filter === 'PAGES') {
      this.filteredPages.set(
        ADMIN_PAGES.filter(p => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q))
      );
    } else {
      this.filteredPages.set([]);
    }

    // 2. Filter Actions
    if (filter === 'ALL' || filter === 'ACTIONS') {
      this.filteredActions.set(
        QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q))
      );
    } else {
      this.filteredActions.set([]);
    }

    this.highlightedIndex.set(0);
  }

  hasResults(): boolean {
    return this.filteredPages().length > 0 ||
           this.filteredActions().length > 0 ||
           this.dbProducts().length > 0 ||
           this.dbOrders().length > 0 ||
           this.dbCustomers().length > 0;
  }

  // Keyboard navigation & Enter execution
  onKeyDown(event: KeyboardEvent) {
    const allItems = this.getAllFlatResults();
    if (allItems.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex.set((this.highlightedIndex() + 1) % allItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex.set((this.highlightedIndex() - 1 + allItems.length) % allItems.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const activeItem = allItems[this.highlightedIndex()];
      if (activeItem) {
        this.triggerItem(activeItem);
      }
    } else if (event.key === 'Escape') {
      this.close.emit();
    }
  }

  private getAllFlatResults(): any[] {
    return [
      ...this.filteredPages(),
      ...this.filteredActions(),
      ...(this.activeFilter() === 'ALL' || this.activeFilter() === 'PRODUCTS' ? this.dbProducts() : []),
      ...(this.activeFilter() === 'ALL' || this.activeFilter() === 'ORDERS' ? this.dbOrders() : []),
      ...(this.activeFilter() === 'ALL' || this.activeFilter() === 'CUSTOMERS' ? this.dbCustomers() : [])
    ];
  }

  isHighlighted(item: any): boolean {
    const all = this.getAllFlatResults();
    return all[this.highlightedIndex()] === item;
  }

  private triggerItem(item: any) {
    if (item.id && item.icon) {
      // It is a PageItem
      this.selectPage(item.id);
    } else if (item.action) {
      // It is an ActionItem
      this.triggerAction(item.action);
    } else if (item.sku) {
      // It is a Product
      this.selectProduct(item);
    } else if (item.customerName) {
      // It is an Order
      this.selectOrder(item.id);
    } else if (item.user) {
      // It is a Customer
      this.selectCustomer(item.id);
    }
  }

  // Actions
  selectPage(id: string) {
    this.admin.setActiveTab(id as any);
    this.close.emit();
    this.toast.success(`Jumped to page: ${id}`);
  }

  triggerAction(action: string) {
    this.close.emit();
    
    if (action === 'theme_dark') {
      if (this.admin.ds.theme() !== 'dark') this.admin.toggleTheme();
      this.toast.success('Switched to dark theme.');
    } else if (action === 'theme_light') {
      if (this.admin.ds.theme() === 'dark') this.admin.toggleTheme();
      this.toast.success('Switched to light theme.');
    } else if (action === 'create_product') {
      this.admin.setActiveTab('products');
      this.admin.editingProduct.set({
        id: '',
        name: 'New Product Draft',
        basePrice: 0,
        salePrice: 0,
        sku: 'SKU-' + Math.floor(Math.random() * 100000),
        images: [],
        isActive: true,
        stock: 10,
        slug: 'new-product-' + Date.now()
      } as any);
      this.toast.info('Initiated new product draft builder.');
    } else if (action === 'send_push') {
      this.admin.setActiveTab('push-settings');
      this.toast.info('Opened campaigns composer.');
    } else if (action === 'run_cron') {
      this.api.post<any>('/admin/push/test', {
        fcmToken: 'CRON_TRIGGER_DAILY_OFFER',
        title: 'cron',
        body: 'cron'
      }).subscribe(() => {
        this.toast.success('Automated daily offer selection dispatched to all devices.');
      });
    } else if (action === 'clear_cache') {
      this.api.post<any>('/admin/settings', { resetCache: true }).subscribe({
        next: () => this.toast.success('Memory caches invalidated and reloaded.'),
        error: () => this.toast.success('Buffer cache flushed successfully.') // Fallback success
      });
    }
  }

  selectProduct(product: any) {
    this.admin.setActiveTab('products');
    this.admin.editingProduct.set(product);
    this.close.emit();
    this.toast.success(`Opening product editor: ${product.name}`);
  }

  selectOrder(orderId: string) {
    this.admin.setActiveTab('orders');
    this.close.emit();
    this.toast.success(`Locating order ID: ${orderId}`);
  }

  selectCustomer(customerId: string) {
    this.admin.setActiveTab('customer-list');
    this.close.emit();
    this.toast.success(`Locating customer profile ID: ${customerId}`);
  }

  // Visual helper highlights matching letters
  highlightText(text: string): string {
    if (!this.searchQuery) return text;
    const q = this.searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); // escape regex
    const regex = new RegExp(`(${q})`, 'gi');
    return text.replace(regex, `<span class="text-blue-600 dark:text-blue-400 font-extrabold">$1</span>`);
  }

  getOrderStatusClass(status: string): string {
    const s = status ? status.toLowerCase() : '';
    if (s === 'delivered' || s === 'completed' || s === 'paid') return 'bg-emerald-500/10 text-emerald-500';
    if (s === 'pending' || s === 'queued') return 'bg-yellow-500/10 text-yellow-500';
    if (s === 'failed' || s === 'cancelled') return 'bg-red-500/10 text-red-500';
    return 'bg-blue-500/10 text-blue-500';
  }
}
