import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../../environments/environment';

export interface SalesAnalyticsSummary {
  revenue: number;
  previousRevenue: number;
  revenueChangePct: number;
  productsSold: number;
  previousProductsSold: number;
  productsSoldChangePct: number;
  orders: number;
  previousOrders: number;
  ordersChangePct: number;
  averageOrderValue: number;
  previousAverageOrderValue: number;
  aovChangePct: number;
}

export interface SalesAnalyticsTimelinePoint {
  label: string;
  timestamp: string;
  revenue: number;
  productsSold: number;
  orders: number;
  averageOrderValue: number;
  topCategory: string;
  topProduct: string;
}

export interface CategoryPerformanceItem {
  id: string;
  name: string;
  revenue: number;
  unitsSold: number;
  ordersCount: number;
}

export interface TopProductItem {
  rank: string;
  id: string;
  name: string;
  categoryName: string;
  unitsSold: number;
  revenue: number;
  avgSellingPrice: number;
  growthPct: number;
}

export interface SalesAnalyticsData {
  preset: string;
  from: string;
  to: string;
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  summary: SalesAnalyticsSummary;
  timeline: SalesAnalyticsTimelinePoint[];
  categories: CategoryPerformanceItem[];
  topProducts: TopProductItem[];
  lastUpdated: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  parentId?: string | null;
  slug?: string;
}

export interface ProductOption {
  id: string;
  name: string;
  sku?: string;
  categoryId?: string | null;
}

@Component({
  selector: 'app-sales-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sales-analytics.component.html'
})
export class SalesAnalyticsComponent implements OnInit, OnDestroy {
  public Math = Math;
  private http = inject(HttpClient);
  private apiBase = environment.apiUrl || '/api';

  // State Signals
  public analyticsData = signal<SalesAnalyticsData | null>(null);
  public isLoading = signal<boolean>(true);
  public isRefreshing = signal<boolean>(false);
  public hasError = signal<boolean>(false);
  public errorMessage = signal<string>('');
  public isLive = signal<boolean>(true);
  public dataUpdatedBadge = signal<boolean>(false);
  public lastUpdatedText = signal<string>('');

  // Dropdown Options Signals
  public categories = signal<CategoryOption[]>([]);
  public products = signal<ProductOption[]>([]);

  // Filter Signals
  public selectedPreset = signal<string>('current_month');
  public customFromDate = signal<string>('');
  public customToDate = signal<string>('');
  public selectedCategory = signal<string>('');
  public selectedSubcategory = signal<string>('');
  public selectedProduct = signal<string>('');
  public productSearchQuery = signal<string>('');
  public showProductDropdown = signal<boolean>(false);

  // Granularity Override Signal
  public selectedGranularity = signal<string>('auto');

  // Interactive Chart Mode Signals
  public chartMetricMode = signal<'revenue' | 'products' | 'orders'>('revenue');
  public chartVisualType = signal<'combo' | 'bar' | 'line' | 'donut'>('combo');
  public categoryMetricMode = signal<'revenue' | 'units' | 'orders'>('revenue');
  public hoveredTimelineIndex = signal<number | null>(null);

  // Polling Configuration Signal (in ms)
  public pollingIntervalMs = signal<number>(30000); // Default 30s
  private pollingTimer: any = null;
  private sseSource: EventSource | null = null;
  private debounceTimer: any = null;

  // Filtered Subcategories computed signal
  public subcategories = computed(() => {
    const parentId = this.selectedCategory();
    if (!parentId) return [];
    return this.categories().filter(c => c.parentId === parentId);
  });

  // Filtered Top-Level Categories
  public parentCategories = computed(() => {
    return this.categories().filter(c => !c.parentId);
  });

  // Filtered Products Search computed signal
  public filteredProductsList = computed(() => {
    const query = this.productSearchQuery().toLowerCase().trim();
    const catId = this.selectedSubcategory() || this.selectedCategory();
    let list = this.products();

    if (catId) {
      list = list.filter(p => p.categoryId === catId);
    }
    if (query) {
      list = list.filter(p => p.name.toLowerCase().includes(query) || (p.sku && p.sku.toLowerCase().includes(query)));
    }
    return list.slice(0, 15);
  });

  // Selected Product Detail Signal
  public selectedProductDetail = computed(() => {
    const pId = this.selectedProduct();
    if (!pId) return null;
    return this.products().find(p => p.id === pId) || null;
  });

  // Chart Max Values for SVG Scaling
  public chartMaxRevenue = computed(() => {
    const timeline = this.analyticsData()?.timeline || [];
    const max = Math.max(...timeline.map(t => t.revenue), 1000);
    return Math.ceil(max * 1.15);
  });

  public chartMaxProducts = computed(() => {
    const timeline = this.analyticsData()?.timeline || [];
    const max = Math.max(...timeline.map(t => t.productsSold), 10);
    return Math.ceil(max * 1.15);
  });

  public chartMaxOrders = computed(() => {
    const timeline = this.analyticsData()?.timeline || [];
    const max = Math.max(...timeline.map(t => t.orders), 5);
    return Math.ceil(max * 1.15);
  });

  // SVG Line & Area Path Coordinates Generator
  public svgLinePoints = computed(() => {
    const timeline = this.analyticsData()?.timeline || [];
    if (timeline.length === 0) return [];

    const mode = this.chartMetricMode();
    const width = 680;
    const height = 200;
    const paddingX = 40;
    const availableWidth = width - (paddingX * 2);
    const step = timeline.length > 1 ? availableWidth / (timeline.length - 1) : 0;

    let maxVal = this.chartMaxRevenue();
    if (mode === 'products') maxVal = this.chartMaxProducts();
    if (mode === 'orders') maxVal = this.chartMaxOrders();

    return timeline.map((pt, idx) => {
      const x = paddingX + idx * step;
      let val = pt.revenue;
      if (mode === 'products') val = pt.productsSold;
      if (mode === 'orders') val = pt.orders;

      const y = (height - 25) - (val / (maxVal || 1)) * (height - 50);
      return { x, y, pt, index: idx };
    });
  });

  public svgLinePath = computed(() => {
    const pts = this.svgLinePoints();
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const ctrlX = (curr.x + next.x) / 2;
      path += ` C ${ctrlX},${curr.y} ${ctrlX},${next.y} ${next.x},${next.y}`;
    }
    return path;
  });

  public svgAreaPath = computed(() => {
    const linePath = this.svgLinePath();
    if (!linePath) return '';
    const pts = this.svgLinePoints();
    const lastPt = pts[pts.length - 1];
    const firstPt = pts[0];
    const bottomY = 175;
    return `${linePath} L ${lastPt.x},${bottomY} L ${firstPt.x},${bottomY} Z`;
  });

  // Category Donut Slices generator
  public categoryDonutSlices = computed(() => {
    const categories = this.analyticsData()?.categories || [];
    if (categories.length === 0) return [];

    const totalRev = categories.reduce((acc, c) => acc + c.revenue, 0) || 1;
    const colors = ['#2563eb', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

    let cumulativePct = 0;
    return categories.slice(0, 6).map((cat, idx) => {
      const pct = (cat.revenue / totalRev) * 100;
      const startAngle = cumulativePct * 3.6;
      cumulativePct += pct;
      const endAngle = cumulativePct * 3.6;

      return {
        ...cat,
        color: colors[idx % colors.length],
        percentage: Math.round(pct * 10) / 10,
        startAngle,
        endAngle
      };
    });
  });

  ngOnInit(): void {
    this.initDefaultDates();
    this.fetchFilterOptions();
    this.fetchSalesAnalytics(true);
    this.setupPolling();
    this.initRealtimeStream();
  }

  ngOnDestroy(): void {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    if (this.sseSource) this.sseSource.close();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  private initDefaultDates(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    this.customFromDate.set(this.formatDateInput(firstDay));
    this.customToDate.set(this.formatDateInput(now));
  }

  private formatDateInput(d: Date): string {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private fetchFilterOptions(): void {
    this.http.get<{ success: boolean; data: { categories: CategoryOption[]; products: ProductOption[] } }>(
      `${this.apiBase}/admin/analytics/filters`
    ).subscribe({
      next: (res) => {
        if (res?.success && res.data) {
          this.categories.set(res.data.categories || []);
          this.products.set(res.data.products || []);
        }
      },
      error: (err) => console.warn('Could not load analytics filter options:', err)
    });
  }

  public fetchSalesAnalytics(initialLoad = false): void {
    if (initialLoad) {
      this.isLoading.set(true);
    } else {
      this.isRefreshing.set(true);
    }

    let params = new HttpParams().set('preset', this.selectedPreset());

    if (this.selectedPreset() === 'custom') {
      if (this.customFromDate()) params = params.set('from', this.customFromDate());
      if (this.customToDate()) params = params.set('to', this.customToDate());
    }

    if (this.selectedCategory()) params = params.set('categoryId', this.selectedCategory());
    if (this.selectedSubcategory()) params = params.set('subcategoryId', this.selectedSubcategory());
    if (this.selectedProduct()) params = params.set('productId', this.selectedProduct());
    if (this.selectedGranularity() !== 'auto') params = params.set('granularity', this.selectedGranularity());

    this.http.get<{ success: boolean; data: SalesAnalyticsData }>(
      `${this.apiBase}/admin/analytics/sales`,
      { params }
    ).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.isRefreshing.set(false);
        this.hasError.set(false);
        this.isLive.set(true);

        if (res?.success && res.data) {
          const prevData = this.analyticsData();
          const newData = res.data;

          // Check if sales numbers updated for real-time visual alert
          if (!initialLoad && prevData && (
            prevData.summary.revenue !== newData.summary.revenue ||
            prevData.summary.orders !== newData.summary.orders
          )) {
            this.triggerDataUpdatedBadge();
          }

          this.analyticsData.set(newData);
          this.updateLastUpdatedDisplay(newData.lastUpdated);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.isRefreshing.set(false);
        this.isLive.set(false);
        this.errorMessage.set('Unable to load sales analytics. Showing last available data.');
        this.hasError.set(true);
      }
    });
  }

  private updateLastUpdatedDisplay(isoStr?: string): void {
    const date = isoStr ? new Date(isoStr) : new Date();
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    this.lastUpdatedText.set(`${dateStr}, ${timeStr}`);
  }

  private triggerDataUpdatedBadge(): void {
    this.dataUpdatedBadge.set(true);
    setTimeout(() => this.dataUpdatedBadge.set(false), 4000);
  }

  // Filter Change Handlers with Debounce
  public onPresetChange(preset: string): void {
    this.selectedPreset.set(preset);
    this.debouncedFetch();
  }

  public onCustomDateChange(): void {
    if (this.selectedPreset() === 'custom') {
      this.debouncedFetch();
    }
  }

  public onCategoryChange(catId: string): void {
    this.selectedCategory.set(catId);
    this.selectedSubcategory.set('');
    this.selectedProduct.set('');
    this.productSearchQuery.set('');
    this.debouncedFetch();
  }

  public onSubcategoryChange(subId: string): void {
    this.selectedSubcategory.set(subId);
    this.selectedProduct.set('');
    this.productSearchQuery.set('');
    this.debouncedFetch();
  }

  public selectProduct(product: ProductOption | null): void {
    if (product) {
      this.selectedProduct.set(product.id);
      this.productSearchQuery.set(product.name);
    } else {
      this.selectedProduct.set('');
      this.productSearchQuery.set('');
    }
    this.showProductDropdown.set(false);
    this.debouncedFetch();
  }

  public clearFilters(): void {
    this.selectedPreset.set('current_month');
    this.selectedCategory.set('');
    this.selectedSubcategory.set('');
    this.selectedProduct.set('');
    this.productSearchQuery.set('');
    this.selectedGranularity.set('auto');
    this.debouncedFetch();
  }

  private debouncedFetch(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.fetchSalesAnalytics();
    }, 300);
  }

  // Polling Config Handler
  public onPollingIntervalChange(ms: number): void {
    this.pollingIntervalMs.set(ms);
    this.setupPolling();
  }

  private setupPolling(): void {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    const ms = this.pollingIntervalMs();
    if (ms > 0) {
      this.pollingTimer = setInterval(() => {
        this.fetchSalesAnalytics(false);
      }, ms);
    }
  }

  private initRealtimeStream(): void {
    if (typeof window === 'undefined' || !window.EventSource) return;
    try {
      this.sseSource = new EventSource(`${this.apiBase}/admin/analytics/sales/stream`);
      this.sseSource.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload?.type === 'sales_update') {
            this.fetchSalesAnalytics(false);
          }
          this.isLive.set(true);
        } catch (e) {
          // ignore
        }
      };
      this.sseSource.onerror = () => {
        this.isLive.set(false);
      };
    } catch (e) {
      this.isLive.set(false);
    }
  }

  // Visual View Switching Helpers
  public setChartMetricMode(mode: 'revenue' | 'products' | 'orders'): void {
    this.chartMetricMode.set(mode);
  }

  public setChartVisualType(type: 'combo' | 'bar' | 'line' | 'donut'): void {
    this.chartVisualType.set(type);
  }

  public setCategoryMetricMode(mode: 'revenue' | 'units' | 'orders'): void {
    this.categoryMetricMode.set(mode);
  }

  public maxCategoryMetricVal(): number {
    const categories = this.analyticsData()?.categories || [];
    const mode = this.categoryMetricMode();
    if (categories.length === 0) return 1;

    if (mode === 'units') return Math.max(...categories.map(c => c.unitsSold), 1);
    if (mode === 'orders') return Math.max(...categories.map(c => c.ordersCount), 1);
    return Math.max(...categories.map(c => c.revenue), 1);
  }
}
