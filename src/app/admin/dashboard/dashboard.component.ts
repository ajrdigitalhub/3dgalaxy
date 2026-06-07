import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService } from '../../services/datastore';
import { PageHeaderComponent } from '../shared/components/page-header/page-header.component';
import { StatisticsCardComponent } from '../shared/components/statistics-card/statistics-card.component';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, MatIconModule, PageHeaderComponent, StatisticsCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  public ds = inject(DatastoreService);

  kpi = computed(() => this.ds.analyticsKPI());
  inventoryAlerts = computed(() => this.ds.products().filter(p => p.stock < 10).length);

  monthlySalesChart = [
    { month: 'Jan', val: 120000, height: 40 },
    { month: 'Feb', val: 185000, height: 60 },
    { month: 'Mar', val: 240000, height: 80 },
    { month: 'Apr', val: 195000, height: 65 },
    { month: 'May', val: 320000, height: 110 },
    { month: 'Jun', val: 410000, height: 140 }
  ];

  printerTelemetry = [
    { id: 'P01', model: 'Bambu Lab A1 Mini', material: 'PLA Crimson Red', nozzleTemp: 220, bedTemp: 60, progress: 42, status: 'Printing' },
    { id: 'P02', model: 'Galaxy Brahma-3 FDM', material: 'ABS Industrial Black', nozzleTemp: 255, bedTemp: 100, progress: 85, status: 'Printing' },
    { id: 'P03', model: 'Galaxy Apex-Resin', material: 'Liquid Resin', nozzleTemp: 0, bedTemp: 0, progress: 0, status: 'Idle' },
    { id: 'P04', model: 'Galaxy Brahma-2X', material: 'PETG Grey', nozzleTemp: 235, bedTemp: 80, progress: 98, status: 'Printing' }
  ];
}
