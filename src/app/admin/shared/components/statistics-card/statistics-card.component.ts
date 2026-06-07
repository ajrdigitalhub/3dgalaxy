import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-statistics-card',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './statistics-card.component.html',
  styleUrl: './statistics-card.component.scss'
})
export class StatisticsCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = '';
  @Input() subtext: string = '';
  @Input() icon: string = 'analytics';
  @Input() trend: 'up' | 'down' | 'none' = 'none';
  @Input() trendValue: string = '';
}
