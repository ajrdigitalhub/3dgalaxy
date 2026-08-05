import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BundleTier } from '../../../core/models/variant-engine.model';

@Component({
  selector: 'app-bundle-selector',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bundle-selector.component.html',
  styleUrl: './bundle-selector.component.scss'
})
export class BundleSelectorComponent {
  @Input() bundleTiers: BundleTier[] = [];
  @Input() selectedTier: BundleTier | null = null;
  @Input() basePrice: number = 0;

  @Output() tierSelected = new EventEmitter<BundleTier>();

  onSelect(tier: BundleTier) {
    this.tierSelected.emit(tier);
  }

  isTierSelected(tier: BundleTier): boolean {
    return this.selectedTier?.id === tier.id || this.selectedTier?.count === tier.count;
  }

  getDisplayPrice(tier: BundleTier): string {
    if (tier.savingsText) return tier.savingsText;
    if (tier.priceType === 'per_variant' || tier.customPricePerItem) {
      const price = tier.priceValue || tier.customPricePerItem;
      return `Rs. ${price}.00 / each`;
    }
    if (tier.priceType === 'fixed') {
      return `Rs. ${tier.priceValue}.00 total`;
    }
    return `Rs. ${tier.priceValue}`;
  }

  getOriginalPrice(tier: BundleTier): string | null {
    if (tier.count <= 1 || !this.basePrice) return null;
    return `Rs. ${this.basePrice}.00/each`;
  }

  trackByTier(index: number, tier: BundleTier): string {
    return tier.id || tier.name;
  }
}
