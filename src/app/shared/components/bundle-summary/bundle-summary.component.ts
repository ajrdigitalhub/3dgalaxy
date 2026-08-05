import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BundleSelectionResult } from '../../../core/models/variant-engine.model';

@Component({
  selector: 'app-bundle-summary',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bundle-summary.component.html',
  styleUrl: './bundle-summary.component.scss'
})
export class BundleSummaryComponent {
  @Input() result!: BundleSelectionResult;
  @Input() isAddingToCart: boolean = false;
  @Input() getColorCode: (colorName: string) => string = () => '#cbd5e1';

  @Output() addToCart = new EventEmitter<void>();

  onAddToCartClick() {
    if (!this.result.isComplete || this.isAddingToCart) return;
    this.addToCart.emit();
  }

  getSelectedColors(): string[] {
    if (!this.result || !this.result.slots) return [];
    return this.result.slots.map(s => {
      const v = s.selectedVariant;
      if (!v) return 'Unselected';
      return v.optionValues?.color || v.optionValues?.Color || v.name || 'Color';
    });
  }

  trackByColor(index: number, color: string): string {
    return `${index}-${color}`;
  }
}
