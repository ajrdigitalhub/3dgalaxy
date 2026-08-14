import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPanel } from '../admin';
import { SalesAnalyticsComponent } from './sales-analytics/sales-analytics.component';

@Component({
  selector: 'app-admin-analytics-tab',
  standalone: true,
  imports: [CommonModule, SalesAnalyticsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300 font-sans">
      <app-sales-analytics></app-sales-analytics>
    </div>
  `
})
export class AdminAnalyticsTab {
  @Input({ required: true }) admin!: AdminPanel;
}
