import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  VariantGroupConfig,
  VariantDisplayType,
  VariantSelectionMode,
  BundleTier,
  BundlePricingType,
  WeightVariantOption
} from '../../../../core/models/variant-engine.model';
import { convertToGrams } from '../../../../shared/utils/weight.utils';
import { BundleSelectorComponent } from '../../../../shared/components/bundle-selector/bundle-selector.component';
import { VariantSlotComponent } from '../../../../shared/components/variant-slot/variant-slot.component';
import { BundleSummaryComponent } from '../../../../shared/components/bundle-summary/bundle-summary.component';
import { VariantChipSelectorComponent } from '../../../../shared/components/variant-selector/variant-chip-selector';
import { VariantWeightSelectorComponent } from '../../../../shared/components/variant-weight-selector/variant-weight-selector.component';

@Component({
  selector: 'app-admin-variant-group-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    BundleSelectorComponent,
    VariantSlotComponent,
    BundleSummaryComponent,
    VariantChipSelectorComponent,
    VariantWeightSelectorComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-variant-group-config.component.html',
  styleUrl: './admin-variant-group-config.component.scss'
})
export class AdminVariantGroupConfigComponent {
  private _availableVariants = signal<any[]>([]);

  @Input() set variantGroups(val: any[]) {
    if (!val || val.length === 0) {
      if (this.groups().length === 0) {
        this.groups.set([this.createDefaultGroup()]);
      }
      return;
    }

    const normalized = val.map((g: any, i: number) => {
      const vName = g.variantName || g.name || g.displayName || `Group #${i + 1}`;
      const dName = g.displayName || g.name || g.variantName || `Select ${vName}`;
      const dType = g.displayType || g.display_type || 'chip';
      const sMode = g.selectionMode || g.selection_mode || 'single';

      let vals: string[] = [];
      if (Array.isArray(g.values)) {
        vals = g.values.map((v: any) => typeof v === 'string' ? v : (v.name || v.value || ''));
      } else if (typeof g.values === 'string') {
        vals = g.values.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (typeof g.valuesString === 'string') {
        vals = g.valuesString.split(',').map((s: string) => s.trim()).filter(Boolean);
      }

      return {
        id: g.id || `grp-${i + 1}`,
        variantName: vName,
        displayName: dName,
        displayOrder: g.displayOrder !== undefined ? g.displayOrder : i,
        required: g.required !== false,
        active: g.active !== false,
        displayType: dType,
        selectionMode: sMode,
        allowDuplicates: !!g.allowDuplicates,
        values: vals,
        bundleTiers: Array.isArray(g.bundleTiers) && g.bundleTiers.length > 0 
          ? g.bundleTiers.map((t: any) => ({
              ...t,
              weightValue: t.weightValue !== undefined ? t.weightValue : (t.count || null),
              weightUnit: t.weightUnit || 'kg'
            }))
          : (dType === 'bundle-builder' ? this.createDefaultGroup().bundleTiers : [])
      };
    });

    const currentJson = JSON.stringify(this.groups());
    const incomingJson = JSON.stringify(normalized);
    if (currentJson !== incomingJson) {
      this.groups.set(normalized);
    }
  }

  @Input() set availableVariants(val: any[]) {
    this._availableVariants.set(val || []);
  }
  @Input() basePrice: number = 756;

  @Output() groupsChanged = new EventEmitter<any[]>();

  groups = signal<VariantGroupConfig[]>([]);
  activeGroupIndex = signal<number>(0);
  selectedPreviewVariantId = signal<string>('');
  previewQuantities = signal<Record<string, number>>({});

  displayTypes: { value: VariantDisplayType; label: string }[] = [
    { value: 'bundle-builder', label: 'Bundle Builder (Radio Cards + Slots)' },
    { value: 'weight-selector', label: 'Weight Selector (Presets + Custom Weight)' },
    { value: 'chip', label: 'Chip Selector (Pills)' },
    { value: 'dropdown', label: 'Dropdown Menu' },
    { value: 'image', label: 'Image Selector' },
    { value: 'card', label: 'Card Selector' },
    { value: 'radio-chips', label: 'Radio Chips' },
    { value: 'color-chips', label: 'Color Chips' },
    { value: 'button-group', label: 'Button Group' },
    { value: 'quantity-selector', label: 'Quantity Selector' },
    { value: 'grid-cards', label: 'Grid Cards' }
  ];

  selectionModes: { value: VariantSelectionMode; label: string }[] = [
    { value: 'single', label: 'Single Selection (Choose 1)' },
    { value: 'bundle', label: 'Bundle Selection (Buy N -> Slots)' },
    { value: 'weight', label: 'Weight Based (kg / g Variants)' },
    { value: 'multiple', label: 'Multiple Selection (Choose up to N)' },
    { value: 'quantity', label: 'Quantity Based Variant' },
    { value: 'pack', label: 'Package / Starter Kit Builder' }
  ];

  pricingTypes: { value: BundlePricingType; label: string }[] = [
    { value: 'per_variant', label: 'Per Variant Price (e.g. ₹699 each)' },
    { value: 'fixed', label: 'Fixed Bundle Price (e.g. ₹3,495 total)' },
    { value: 'percentage', label: 'Percentage Discount (e.g. 10% off)' },
    { value: 'custom', label: 'Custom Tier Price' }
  ];

  // Current active group signal
  currentGroup = computed(() => {
    const list = this.groups();
    const idx = this.activeGroupIndex();
    return list[idx] || list[0] || null;
  });

  // Dynamic variants preview computed from availableVariants or currentGroup option values
  previewVariants = computed(() => {
    const grp = this.currentGroup();
    const real = this._availableVariants();

    if (real && real.length > 0) {
      return real.map((v, i) => {
        let displayName = v.name;
        if (!displayName || displayName === 'Variant' || displayName === 'Default Variant') {
          if (v.optionValues) {
            const vals = Object.values(v.optionValues).filter(Boolean);
            if (vals.length > 0) displayName = vals.join(' / ');
          }
        }
        if (!displayName) displayName = `Variant #${i + 1}`;

        return {
          id: v.id || `v-real-${i}`,
          name: displayName,
          sku: v.sku || '',
          price: Number(v.price) || this.basePrice,
          stock: v.stock !== undefined ? Number(v.stock) : 10,
          weight: v.weight || 0,
          image: Array.isArray(v.variantImages) && v.variantImages.length > 0 
            ? v.variantImages[0] 
            : (Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : (v.image || null))
        };
      });
    }

    if (grp) {
      const vals: string[] = (grp as any).values || [];
      if (vals && vals.length > 0) {
        return vals.map((val: string, idx: number) => ({
          id: `v-opt-${idx}`,
          name: val,
          sku: `SKU-${val.toUpperCase().replace(/\s+/g, '-')}`,
          price: this.basePrice,
          stock: idx === 3 ? 0 : 25 - idx * 5,
          weight: 0,
          image: null
        }));
      }
    }

    return [
      { id: 'v-1', name: 'Standard Pack', sku: 'SKU-STD', price: this.basePrice, stock: 100, weight: 0, image: null },
      { id: 'v-2', name: 'Large Pack', sku: 'SKU-LRG', price: this.basePrice, stock: 50, weight: 0, image: null },
      { id: 'v-3', name: 'Combo Pack', sku: 'SKU-CMB', price: this.basePrice, stock: 25, weight: 0, image: null }
    ];
  });

  selectedPreviewVariant = computed(() => {
    const list = this.previewVariants();
    const id = this.selectedPreviewVariantId();
    return list.find(v => v.id === id) || list[0] || null;
  });

  // Live preview selected bundle tier
  previewSelectedTier = signal<BundleTier | null>(null);

  constructor() {
    effect(() => {
      const list = this.previewVariants();
      if (list.length > 0 && !list.some(v => v.id === this.selectedPreviewVariantId())) {
        const firstInStock = list.find(v => v.stock > 0) || list[0];
        this.selectedPreviewVariantId.set(firstInStock.id);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const grp = this.currentGroup();
      if (grp && grp.bundleTiers && grp.bundleTiers.length > 0) {
        this.previewSelectedTier.set(grp.bundleTiers[0]);
      }
    }, { allowSignalWrites: true });
  }

  getPreviewWeightOptions(bundleTiers?: BundleTier[]): WeightVariantOption[] {
    if (!bundleTiers || !Array.isArray(bundleTiers)) return [];
    return bundleTiers.map((t: any, i: number) => {
      const val = Number(t.weightValue ?? t.count ?? 1);
      const unit = (t.weightUnit || 'kg') as 'kg' | 'g' | 'lb' | 'oz';
      const grams = convertToGrams(val, unit);
      return {
        id: t.id || `tier-${i}`,
        label: t.name || `${val} ${unit}`,
        weightValue: val,
        weightUnit: unit,
        weightInGrams: grams,
        totalPrice: Number(t.priceValue) || (this.basePrice * val),
        badgeText: t.badgeText || '',
        savingsText: t.savingsText || '',
        isPopular: !!t.isPopular
      };
    });
  }

  getSlotsArray(count: number): number[] {
    return Array.from({ length: Math.max(0, count || 0) }, (_, i) => i);
  }

  trackByIndex(index: number): number {
    return index;
  }

  createDefaultGroup(): VariantGroupConfig {
    return {
      id: `grp-${Date.now()}`,
      variantName: 'Variant Options',
      displayName: 'Choose Options',
      displayOrder: 0,
      required: true,
      active: true,
      displayType: 'chip',
      selectionMode: 'single',
      allowDuplicates: true,
      bundleTiers: [
        { id: 't-1', name: 'Buy 1', count: 1, priceType: 'fixed', priceValue: this.basePrice },
        { id: 't-3', name: 'Buy 3', count: 3, priceType: 'per_variant', priceValue: Math.round(this.basePrice * 0.95), isPopular: true, savingsText: `Rs. ${Math.round(this.basePrice * 0.95)}.00 / each` },
        { id: 't-5', name: 'Buy 5', count: 5, priceType: 'per_variant', priceValue: Math.round(this.basePrice * 0.9), badgeText: 'Best Value', savingsText: `Rs. ${Math.round(this.basePrice * 0.9)}.00 / each` },
        { id: 't-10', name: 'Buy 10', count: 10, priceType: 'per_variant', priceValue: Math.round(this.basePrice * 0.85), savingsText: `Rs. ${Math.round(this.basePrice * 0.85)}.00 / each` }
      ]
    };
  }

  addGroup() {
    const list = [...this.groups()];
    const newGrp = this.createDefaultGroup();
    newGrp.variantName = `Option Group #${list.length + 1}`;
    newGrp.displayName = `Choose Options #${list.length + 1}`;
    newGrp.displayOrder = list.length;
    list.push(newGrp);
    this.groups.set(list);
    this.activeGroupIndex.set(list.length - 1);
    this.emitChange();
  }

  removeGroup(index: number) {
    const list = [...this.groups()];
    if (list.length <= 1) return;
    list.splice(index, 1);
    this.groups.set(list);
    this.activeGroupIndex.set(Math.max(0, index - 1));
    this.emitChange();
  }

  addTier(grp: VariantGroupConfig) {
    if (!grp.bundleTiers) grp.bundleTiers = [];
    const count = grp.bundleTiers.length === 0 ? 1 : (grp.bundleTiers.length === 1 ? 3 : 5);
    grp.bundleTiers.push({
      id: `tier-${Date.now()}`,
      name: `Buy ${count}`,
      count,
      priceType: 'per_variant',
      priceValue: this.basePrice,
      savingsText: count > 1 ? `Save ${count * 5}%` : '',
      badgeText: count === 3 ? 'Popular' : (count === 5 ? 'Best Value' : ''),
      weightValue: count,
      weightUnit: 'kg',
      isPopular: count === 3
    });
    this.updateCurrentGroup(grp);
  }

  addQuickPreset(grp: VariantGroupConfig, type: 'buy1' | 'buy3' | 'buy5' | 'weight_pack') {
    if (!grp.bundleTiers) grp.bundleTiers = [];
    if (type === 'buy1') {
      grp.bundleTiers.push({
        id: `tier-${Date.now()}`,
        name: 'Buy 1',
        count: 1,
        priceType: 'per_variant',
        priceValue: this.basePrice,
        savingsText: '',
        badgeText: '',
        weightValue: 1,
        weightUnit: 'kg',
        isPopular: false
      });
    } else if (type === 'buy3') {
      grp.bundleTiers.push({
        id: `tier-${Date.now()}`,
        name: 'Buy 3',
        count: 3,
        priceType: 'per_variant',
        priceValue: Math.round(this.basePrice * 0.85),
        savingsText: 'Save 15%',
        badgeText: 'Most Popular',
        weightValue: 3,
        weightUnit: 'kg',
        isPopular: true
      });
    } else if (type === 'buy5') {
      grp.bundleTiers.push({
        id: `tier-${Date.now()}`,
        name: 'Buy 5',
        count: 5,
        priceType: 'fixed',
        priceValue: Math.round(this.basePrice * 4),
        savingsText: 'Save 20%',
        badgeText: 'Best Value',
        weightValue: 5,
        weightUnit: 'kg',
        isPopular: false
      });
    } else if (type === 'weight_pack') {
      grp.bundleTiers.push({
        id: `tier-${Date.now()}`,
        name: '10 kg Mega Pack',
        count: 10,
        priceType: 'fixed',
        priceValue: Math.round(this.basePrice * 7.5),
        savingsText: 'Save 25%',
        badgeText: 'Bulk Special',
        weightValue: 10,
        weightUnit: 'kg',
        isPopular: false
      });
    }
    this.updateCurrentGroup(grp);
  }

  removeTier(group: VariantGroupConfig, tierIndex: number) {
    if (!group.bundleTiers) return;
    group.bundleTiers.splice(tierIndex, 1);
    this.updateCurrentGroup(group);
  }

  updateCurrentGroup(updated: VariantGroupConfig) {
    const list = [...this.groups()];
    const idx = this.activeGroupIndex();
    list[idx] = { ...updated };
    this.groups.set(list);
    this.emitChange();
  }

  onDisplayTypeChange(type: VariantDisplayType) {
    const grp = { ...this.currentGroup()! };
    grp.displayType = type;
    if (type === 'bundle-builder') {
      grp.selectionMode = 'bundle';
      if (!grp.bundleTiers || grp.bundleTiers.length === 0) {
        grp.bundleTiers = this.createDefaultGroup().bundleTiers;
      }
    }
    this.updateCurrentGroup(grp);
  }

  emitChange() {
    this.groupsChanged.emit(this.groups());
  }

  getColorCode(color: string): string {
    const c = (color || '').toLowerCase();
    if (c.includes('black') || c.includes('dark')) return '#09090b';
    if (c.includes('white')) return '#ffffff';
    if (c.includes('grey') || c.includes('gray') || c.includes('silver')) return '#94a3b8';
    if (c.includes('blue') || c.includes('navy')) return '#3b82f6';
    if (c.includes('green') || c.includes('emerald') || c.includes('mint')) return '#22c55e';
    if (c.includes('red') || c.includes('crimson') || c.includes('ruby')) return '#ef4444';
    if (c.includes('yellow') || c.includes('gold')) return '#eab308';
    if (c.includes('orange') || c.includes('copper')) return '#f97316';
    if (c.includes('purple') || c.includes('violet')) return '#a855f7';
    if (c.includes('pink') || c.includes('rose')) return '#ec4899';
    if (c.includes('cyan') || c.includes('teal')) return '#14b8a6';
    if (c.includes('brown') || c.includes('chocolate')) return '#854d0e';
    return '#cbd5e1';
  }

  getVariantImage(v: any): string {
    if (v.image) return v.image;
    return 'https://store.bambulab.com/cdn/shop/files/A1_Combo_600x600.png';
  }

  getPreviewQty(id: string): number {
    return this.previewQuantities()[id] || 0;
  }

  adjustPreviewQty(id: string, delta: number) {
    const current = this.getPreviewQty(id);
    const updated = Math.max(0, current + delta);
    this.previewQuantities.set({
      ...this.previewQuantities(),
      [id]: updated
    });
  }

  getTotalPreviewQtyPrice(): number {
    const qMap = this.previewQuantities();
    const list = this.previewVariants();
    let total = 0;
    list.forEach(v => {
      const q = qMap[v.id] || 0;
      total += q * (v.price || this.basePrice);
    });
    return total;
  }

  activeConfigName(): string {
    const grp = this.currentGroup();
    if (grp?.displayType === 'bundle-builder' || grp?.selectionMode === 'bundle') {
      return this.previewSelectedTier()?.name || 'Selected Bundle';
    }
    return this.selectedPreviewVariant()?.name || 'Single Option';
  }

  activeUnitPrice(): number {
    const grp = this.currentGroup();
    if (grp?.displayType === 'bundle-builder' || grp?.selectionMode === 'bundle') {
      const tier = this.previewSelectedTier();
      if (!tier) return this.basePrice;
      if (tier.priceType === 'per_variant') return Number(tier.priceValue || this.basePrice);
      if (tier.priceType === 'fixed') return Math.round(Number(tier.priceValue) / (tier.count || 1));
      if (tier.priceType === 'percentage') return Math.round(this.basePrice * (1 - (Number(tier.priceValue) || 0) / 100));
      return Number(tier.priceValue) || this.basePrice;
    }
    return Number(this.selectedPreviewVariant()?.price || this.basePrice);
  }

  activeEffectivePrice(): number {
    const grp = this.currentGroup();
    if (grp?.displayType === 'bundle-builder' || grp?.selectionMode === 'bundle') {
      const tier = this.previewSelectedTier();
      if (!tier) return this.basePrice;
      const count = Number(tier.count) || 1;
      if (tier.priceType === 'per_variant') return (Number(tier.priceValue) || this.basePrice) * count;
      if (tier.priceType === 'fixed') return Number(tier.priceValue);
      if (tier.priceType === 'percentage') return Math.round(this.basePrice * count * (1 - (Number(tier.priceValue) || 0) / 100));
      return Number(tier.priceValue) || (this.basePrice * count);
    }
    if (grp?.displayType === 'quantity-selector') {
      const total = this.getTotalPreviewQtyPrice();
      return total > 0 ? total : this.basePrice;
    }
    return Number(this.selectedPreviewVariant()?.price || this.basePrice);
  }

  isCodEligible(): boolean {
    return this.activeEffectivePrice() <= 2500;
  }
}
