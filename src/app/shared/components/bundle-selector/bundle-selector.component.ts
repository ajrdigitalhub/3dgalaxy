import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BundleTier } from '../../../core/models/variant-engine.model';

@Component({
  selector: 'app-bundle-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bundle-selector.component.html',
  styleUrl: './bundle-selector.component.scss'
})
export class BundleSelectorComponent {
  @Input() bundleTiers: BundleTier[] = [];
  @Input() selectedTier: BundleTier | null = null;
  @Input() basePrice: number = 756;
  @Input() availableVariants: any[] = [];
  @Input() availableOptions: any[] = [];
  @Input() isStandalone: boolean = true;

  @Output() tierSelected = new EventEmitter<BundleTier>();
  @Output() slotSelectionChanged = new EventEmitter<{ slotIndex: number; value: any }>();
  @Output() addToCart = new EventEmitter<void>();

  slotSelections = signal<Record<number, string>>({});
  brokenImages = signal<Set<number>>(new Set());

  onSelect(tier: BundleTier) {
    this.selectedTier = tier;
    this.tierSelected.emit(tier);
  }

  isTierSelected(tier: BundleTier): boolean {
    const active = this.selectedTier || (this.bundleTiers.length > 0 ? this.bundleTiers[0] : null);
    return active?.id === tier.id || active?.count === tier.count;
  }

  getSlotsArray(count: number): number[] {
    return Array.from({ length: Math.max(0, count || 0) }, (_, i) => i);
  }

  getOptionChoices(): { name: string; image?: string | null; color?: string }[] {
    if (this.availableVariants && this.availableVariants.length > 0) {
      return this.availableVariants.map(v => {
        let img: string | null = null;
        if (Array.isArray(v.variantImages) && v.variantImages.length > 0 && v.variantImages[0]) {
          img = v.variantImages[0];
        } else if (Array.isArray(v.images) && v.images.length > 0 && v.images[0]) {
          img = v.images[0];
        } else if (v.image && typeof v.image === 'string') {
          img = v.image;
        }

        const name = v.name || v.displayName || v.sku || 'Variant';
        return {
          name,
          image: img,
          color: this.getColorCode(name)
        };
      });
    }

    if (this.availableOptions && this.availableOptions.length > 0) {
      const first = this.availableOptions[0];
      let vals: string[] = [];
      if (Array.isArray(first.values)) {
        vals = first.values.map((v: any) => typeof v === 'string' ? v : (v.name || v.value || ''));
      } else if (typeof first.values === 'string') {
        vals = first.values.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (typeof first.valuesString === 'string') {
        vals = first.valuesString.split(',').map((s: string) => s.trim()).filter(Boolean);
      }

      if (vals.length > 0) {
        return vals.map((val: string) => ({
          name: val,
          image: null,
          color: this.getColorCode(val)
        }));
      }
    }

    return [
      { name: 'Red', image: null, color: '#ef4444' },
      { name: 'Blue', image: null, color: '#3b82f6' },
      { name: 'Green', image: null, color: '#22c55e' },
      { name: 'Black', image: null, color: '#09090b' }
    ];
  }

  getSlotSelectedValue(slotIdx: number): string {
    const choices = this.getOptionChoices();
    if (this.slotSelections()[slotIdx]) return this.slotSelections()[slotIdx];
    return choices[slotIdx % choices.length]?.name || choices[0]?.name || 'Option';
  }

  onSlotChange(slotIdx: number, val: string) {
    this.slotSelections.update(prev => ({ ...prev, [slotIdx]: val }));
    this.slotSelectionChanged.emit({ slotIndex: slotIdx, value: val });
  }

  getSlotImage(slotIdx: number): string | null {
    if (this.brokenImages().has(slotIdx)) return null;
    const valName = this.getSlotSelectedValue(slotIdx);
    const choices = this.getOptionChoices();
    const match = choices.find(c => c.name === valName);
    return match?.image || null;
  }

  getSlotColor(slotIdx: number): string {
    const valName = this.getSlotSelectedValue(slotIdx);
    const choices = this.getOptionChoices();
    const match = choices.find(c => c.name === valName);
    return match?.color || this.getColorCode(valName);
  }

  onImgError(event: Event, slotIdx: number) {
    this.brokenImages.update(set => {
      const next = new Set(set);
      next.add(slotIdx);
      return next;
    });
  }

  getDisplayPrice(tier: BundleTier): string {
    if (tier.savingsText) return tier.savingsText;
    if (tier.priceType === 'per_variant' || tier.customPricePerItem) {
      const price = tier.priceValue || tier.customPricePerItem;
      return `Rs. ${price}.00 / each`;
    }
    if (tier.priceType === 'fixed') {
      return `Rs. ${tier.priceValue}.00`;
    }
    return `Rs. ${tier.priceValue}.00`;
  }

  getOriginalPrice(tier: BundleTier): string | null {
    if (tier.count <= 1 || !this.basePrice) return null;
    return `Rs. ${this.basePrice}.00 / each`;
  }

  calculateSubtotal(): number {
    const active = this.selectedTier || (this.bundleTiers.length > 0 ? this.bundleTiers[0] : null);
    if (!active) return this.basePrice;
    if (active.priceType === 'per_variant' || active.customPricePerItem) {
      return (active.priceValue || active.customPricePerItem || this.basePrice) * active.count;
    }
    return active.priceValue || (this.basePrice * active.count);
  }

  getColorCode(name: string): string {
    const c = (name || '').toLowerCase();
    if (c.includes('black') || c.includes('dark')) return '#09090b';
    if (c.includes('white')) return '#ffffff';
    if (c.includes('grey') || c.includes('gray') || c.includes('silver')) return '#94a3b8';
    if (c.includes('blue') || c.includes('navy') || c.includes('cyan')) return '#3b82f6';
    if (c.includes('green') || c.includes('emerald') || c.includes('mint')) return '#22c55e';
    if (c.includes('red') || c.includes('crimson') || c.includes('ruby')) return '#ef4444';
    if (c.includes('yellow') || c.includes('gold')) return '#eab308';
    if (c.includes('orange') || c.includes('copper')) return '#f97316';
    if (c.includes('purple') || c.includes('violet')) return '#8b5cf6';
    if (c.includes('pink') || c.includes('rose')) return '#ec4899';
    return '#6366f1';
  }

  onAddToCartClick() {
    this.addToCart.emit();
  }

  trackByTier(index: number, tier: BundleTier): string {
    return tier.id || tier.name;
  }
}
