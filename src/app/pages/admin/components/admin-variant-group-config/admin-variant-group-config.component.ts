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
  BundlePricingType
} from '../../../../core/models/variant-engine.model';
import { BundleSelectorComponent } from '../../../../shared/components/bundle-selector/bundle-selector.component';
import { VariantSlotComponent } from '../../../../shared/components/variant-slot/variant-slot.component';
import { BundleSummaryComponent } from '../../../../shared/components/bundle-summary/bundle-summary.component';
import { VariantChipSelectorComponent } from '../../../../shared/components/variant-selector/variant-chip-selector';

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
    VariantChipSelectorComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-variant-group-config.component.html',
  styleUrl: './admin-variant-group-config.component.scss'
})
export class AdminVariantGroupConfigComponent {
  @Input() set variantGroups(val: any[]) {
    this.groups.set(val && val.length > 0 ? JSON.parse(JSON.stringify(val)) : [this.createDefaultGroup()]);
  }
  @Input() availableVariants: any[] = [];
  @Input() basePrice: number = 756;

  @Output() groupsChanged = new EventEmitter<any[]>();

  groups = signal<VariantGroupConfig[]>([]);
  activeGroupIndex = signal<number>(0);

  displayTypes: { value: VariantDisplayType; label: string }[] = [
    { value: 'bundle-builder', label: 'Bundle Builder (Radio Cards + Slots)' },
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

  // Mock variants for live preview if no real variants passed
  previewVariants = computed(() => {
    if (this.availableVariants && this.availableVariants.length > 0) return this.availableVariants;
    return [
      { id: 'v-1', name: 'Black', sku: 'PLA-BLK', stock: 100, optionValues: { color: 'Black' }, variantImages: ['https://store.bambulab.com/cdn/shop/files/A1_Combo_600x600.png'] },
      { id: 'v-2', name: 'White', sku: 'PLA-WHT', stock: 50, optionValues: { color: 'White' }, variantImages: ['https://store.bambulab.com/cdn/shop/files/A1_Combo_600x600.png'] },
      { id: 'v-3', name: 'Grey', sku: 'PLA-GRY', stock: 25, optionValues: { color: 'Grey' }, variantImages: ['https://store.bambulab.com/cdn/shop/files/A1_Combo_600x600.png'] },
      { id: 'v-4', name: 'Blue', sku: 'PLA-BLU', stock: 15, optionValues: { color: 'Blue' }, variantImages: ['https://store.bambulab.com/cdn/shop/files/A1_Combo_600x600.png'] },
      { id: 'v-5', name: 'Green', sku: 'PLA-GRN', stock: 0, optionValues: { color: 'Green' }, variantImages: ['https://store.bambulab.com/cdn/shop/files/A1_Combo_600x600.png'] }
    ];
  });

  // Live preview selected bundle tier
  previewSelectedTier = signal<BundleTier | null>(null);

  constructor() {
    effect(() => {
      const grp = this.currentGroup();
      if (grp && grp.bundleTiers && grp.bundleTiers.length > 0) {
        this.previewSelectedTier.set(grp.bundleTiers[0]);
      }
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
      variantName: 'Bundle Options',
      displayName: 'Bundle & Save',
      displayOrder: 0,
      required: true,
      active: true,
      displayType: 'bundle-builder',
      selectionMode: 'bundle',
      allowDuplicates: true,
      bundleTiers: [
        { id: 't-1', name: 'Buy 1', count: 1, priceType: 'fixed', priceValue: 756 },
        { id: 't-3', name: 'Buy 3', count: 3, priceType: 'per_variant', priceValue: 720, isPopular: true, savingsText: 'Rs. 720.00 / each' },
        { id: 't-5', name: 'Buy 5', count: 5, priceType: 'per_variant', priceValue: 693, badgeText: 'Best Value', savingsText: 'Rs. 693.00 / each' },
        { id: 't-10', name: 'Buy 10', count: 10, priceType: 'per_variant', priceValue: 648, savingsText: 'Rs. 648.00 / each' }
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

  addTier(group: VariantGroupConfig) {
    if (!group.bundleTiers) group.bundleTiers = [];
    const count = (group.bundleTiers.length + 1) * 2;
    group.bundleTiers.push({
      id: `tier-${Date.now()}`,
      name: `Buy ${count}`,
      count,
      priceType: 'per_variant',
      priceValue: Math.round(this.basePrice * 0.9)
    });
    this.updateCurrentGroup(group);
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
    if (c.includes('black')) return '#000000';
    if (c.includes('white')) return '#ffffff';
    if (c.includes('grey') || c.includes('gray')) return '#808080';
    if (c.includes('blue')) return '#3b82f6';
    if (c.includes('green')) return '#22c55e';
    if (c.includes('red')) return '#ef4444';
    return '#cbd5e1';
  }
}
