import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService } from '../../services/datastore';
import { SalesAnalyticsComponent } from '../../pages/admin/components/sales-analytics/sales-analytics.component';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, MatIconModule, SalesAnalyticsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  public ds = inject(DatastoreService);

  kpi = computed(() => this.ds.analyticsKPI());
  inventoryAlerts = computed(() => this.ds.products().filter(p => p.stock < 10).length);

  selectedTimeRange = signal<string>('all_time');
  isSyncing = signal<boolean>(false);

  // Interactive Chart Signals
  chartViewMode = signal<'revenue' | 'channels' | 'orders'>('revenue');
  chartVisualType = signal<'bar' | 'area'>('bar');
  selectedMonthIndex = signal<number | null>(5); // Default selected to latest month (Jun)
  hoveredMonthIndex = signal<number | null>(null);

  monthlySalesChart = [
    { month: 'Jan', fullMonth: 'January 2026', onlineVal: 82000, offlineVal: 38000, val: 120000, ordersCount: 54, avgOrderValue: 2222, growthRate: 8.5, topCategory: 'FDM 3D Printers', statusTag: 'Baseline' },
    { month: 'Feb', fullMonth: 'February 2026', onlineVal: 125000, offlineVal: 60000, val: 185000, ordersCount: 78, avgOrderValue: 2371, growthRate: 54.1, topCategory: 'Resin & Filaments', statusTag: 'Ramping' },
    { month: 'Mar', fullMonth: 'March 2026', onlineVal: 160000, offlineVal: 80000, val: 240000, ordersCount: 96, avgOrderValue: 2500, growthRate: 29.7, topCategory: 'Industrial ABS Material', statusTag: 'High Velocity' },
    { month: 'Apr', fullMonth: 'April 2026', onlineVal: 130000, offlineVal: 65000, val: 195000, ordersCount: 82, avgOrderValue: 2378, growthRate: -18.75, topCategory: '3D Scanners', statusTag: 'Stabilized' },
    { month: 'May', fullMonth: 'May 2026', onlineVal: 215000, offlineVal: 105000, val: 320000, ordersCount: 135, avgOrderValue: 2370, growthRate: 64.1, topCategory: 'Apex High-Precision Resin', statusTag: 'Expansion' },
    { month: 'Jun', fullMonth: 'June 2026', onlineVal: 275000, offlineVal: 135000, val: 410000, ordersCount: 184, avgOrderValue: 2228, growthRate: 28.12, topCategory: 'Brahma-3 Industrial FDM', statusTag: 'Peak Record' }
  ];

  // Chart Y-Axis ceiling limit (₹450K)
  chartMaxVal = 450000;
  chartMaxOrders = 200;

  // Computed Chart Statistics
  chartTotalRevenue = computed(() => this.monthlySalesChart.reduce((acc, m) => acc + m.val, 0));
  chartTotalOnline = computed(() => this.monthlySalesChart.reduce((acc, m) => acc + m.onlineVal, 0));
  chartTotalOffline = computed(() => this.monthlySalesChart.reduce((acc, m) => acc + m.offlineVal, 0));
  chartTotalOrders = computed(() => this.monthlySalesChart.reduce((acc, m) => acc + m.ordersCount, 0));
  
  chartAvgMonthly = computed(() => Math.round(this.chartTotalRevenue() / this.monthlySalesChart.length));
  
  chartOnlineRatio = computed(() => Math.round((this.chartTotalOnline() / this.chartTotalRevenue()) * 100));
  chartOfflineRatio = computed(() => 100 - this.chartOnlineRatio());

  chartPeakMonth = computed(() => {
    return [...this.monthlySalesChart].sort((a, b) => b.val - a.val)[0];
  });

  selectedMonthData = computed(() => {
    const idx = this.selectedMonthIndex();
    if (idx === null || idx < 0 || idx >= this.monthlySalesChart.length) return null;
    return this.monthlySalesChart[idx];
  });

  // SVG Area Curve coordinate generator (viewBox 0 0 600 180)
  svgPoints = computed(() => {
    const data = this.monthlySalesChart;
    const mode = this.chartViewMode();
    const width = 600;
    const height = 180;
    const paddingX = 40;
    const availableWidth = width - (paddingX * 2);
    const step = availableWidth / (data.length - 1);

    return data.map((d, i) => {
      const x = paddingX + i * step;
      let rawVal = d.val;
      let maxVal = this.chartMaxVal;

      if (mode === 'channels') {
        rawVal = d.onlineVal;
      } else if (mode === 'orders') {
        rawVal = d.ordersCount;
        maxVal = this.chartMaxMaxOrders || 200;
      }

      // Invert Y for SVG coordinates (top 15px to bottom 165px)
      const y = (height - 20) - (rawVal / maxVal) * (height - 40);
      return { x, y, data: d, index: i };
    });
  });

  chartMaxMaxOrders = 200;

  svgLinePath = computed(() => {
    const pts = this.svgPoints();
    if (pts.length === 0) return '';
    
    // Cubic bezier curve path construction
    let path = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const current = pts[i];
      const next = pts[i + 1];
      const controlX = (current.x + next.x) / 2;
      path += ` C ${controlX},${current.y} ${controlX},${next.y} ${next.x},${next.y}`;
    }
    return path;
  });

  svgAreaPath = computed(() => {
    const linePath = this.svgLinePath();
    if (!linePath) return '';
    const pts = this.svgPoints();
    const lastPt = pts[pts.length - 1];
    const firstPt = pts[0];
    const bottomY = 165;
    return `${linePath} L ${lastPt.x},${bottomY} L ${firstPt.x},${bottomY} Z`;
  });

  selectMonth(idx: number) {
    if (this.selectedMonthIndex() === idx) {
      this.selectedMonthIndex.set(null); // Toggle off if already selected
    } else {
      this.selectedMonthIndex.set(idx);
    }
  }

  setChartViewMode(mode: 'revenue' | 'channels' | 'orders') {
    this.chartViewMode.set(mode);
  }

  setChartVisualType(type: 'bar' | 'area') {
    this.chartVisualType.set(type);
  }

  printerTelemetry = [
    { id: 'P01', model: 'Bambu Lab A1 Mini', material: 'PLA Crimson Red', nozzleTemp: 220, bedTemp: 60, progress: 42, status: 'Printing' },
    { id: 'P02', model: 'Galaxy Brahma-3 FDM', material: 'ABS Industrial Black', nozzleTemp: 255, bedTemp: 100, progress: 85, status: 'Printing' },
    { id: 'P03', model: 'Galaxy Apex-Resin', material: 'Liquid Resin', nozzleTemp: 0, bedTemp: 0, progress: 0, status: 'Idle' },
    { id: 'P04', model: 'Galaxy Brahma-2X', material: 'PETG Grey', nozzleTemp: 235, bedTemp: 80, progress: 98, status: 'Printing' }
  ];

  // Dynamic calculations from real transactional datastore
  recentOrders = computed(() => {
    return (this.ds.orders() || []).slice(0, 5);
  });

  topProducts = computed(() => {
    const orders = this.ds.orders() || [];
    const products = this.ds.products() || [];
    const salesMap: Record<string, number> = {};

    orders.forEach(o => {
      if (o.items) {
        o.items.forEach((item: any) => {
          salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
        });
      }
    });

    const mapped = products.map(p => {
      const salesCount = salesMap[p.id] || 0;
      return {
        ...p,
        salesCount,
        totalRevenue: salesCount * p.sale_price
      };
    }).filter(p => p.salesCount > 0);

    // Sort by sales count descending
    mapped.sort((a, b) => b.salesCount - a.salesCount);

    if (mapped.length > 0) {
      return mapped.slice(0, 4);
    }

    // High quality mock fallbacks if no transactions exist in data block
    return products.slice(0, 4).map((p, idx) => {
      const mockSales = [45, 32, 28, 19][idx] || 15;
      return {
        ...p,
        salesCount: mockSales,
        totalRevenue: mockSales * p.sale_price
      };
    });
  });

  syncTelemetry() {
    if (this.isSyncing()) return;
    this.isSyncing.set(true);
    setTimeout(() => {
      this.isSyncing.set(false);
    }, 1200);
  }
}
