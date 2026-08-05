import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BundleSlotSelection } from '../../../core/models/variant-engine.model';

@Component({
  selector: 'app-variant-slot',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './variant-slot.component.html',
  styleUrl: './variant-slot.component.scss'
})
export class VariantSlotComponent {
  @Input() slot!: BundleSlotSelection;
  @Input() availableVariants: any[] = [];
  @Input() allowDuplicates: boolean = true;
  @Input() alreadySelectedIds: Set<string> = new Set();
  @Input() getColorCode: (colorName: string) => string = () => '#cbd5e1';

  @Output() selectionChanged = new EventEmitter<{ slotIndex: number; variantId: string }>();

  isOpen = signal<boolean>(false);
  searchQuery = signal<string>('');

  filteredVariants = computed(() => {
    const list = this.availableVariants || [];
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter(v => 
      (v.name || '').toLowerCase().includes(q) ||
      (v.sku || '').toLowerCase().includes(q) ||
      (v.optionValues?.color || v.optionValues?.Color || '').toLowerCase().includes(q)
    );
  });

  toggleDropdown() {
    this.isOpen.update(val => !val);
    if (this.isOpen()) {
      this.searchQuery.set('');
    }
  }

  closeDropdown() {
    this.isOpen.set(false);
  }

  selectVariant(variant: any) {
    if (this.isOutOfStock(variant) || this.isDuplicateForbidden(variant)) return;
    this.selectionChanged.emit({
      slotIndex: this.slot.slotIndex,
      variantId: variant.id
    });
    this.isOpen.set(false);
  }

  isOutOfStock(variant: any): boolean {
    const stock = Number(variant?.stock ?? variant?.quantity ?? 0);
    return stock <= 0;
  }

  isDuplicateForbidden(variant: any): boolean {
    if (this.allowDuplicates) return false;
    if (this.slot.selectedVariantId === variant.id) return false; // Current slot already has it
    return this.alreadySelectedIds.has(variant.id);
  }

  getVariantImage(variant: any): string {
    if (!variant) return 'assets/images/placeholder.svg';
    if (Array.isArray(variant.variantImages) && variant.variantImages[0]) return variant.variantImages[0];
    if (Array.isArray(variant.images) && variant.images[0]) return variant.images[0];
    if (typeof variant.variantImages === 'string') return variant.variantImages;
    return 'assets/images/placeholder.svg';
  }

  getVariantColor(variant: any): string {
    if (!variant) return 'Grey';
    return variant.optionValues?.color || variant.optionValues?.Color || variant.name || 'Default';
  }

  trackByVariant(index: number, v: any): string {
    return v.id || v.sku || index.toString();
  }
}
