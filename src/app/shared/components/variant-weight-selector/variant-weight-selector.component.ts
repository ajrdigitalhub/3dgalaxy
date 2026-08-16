import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  WeightVariantOption,
  ProductWeightConfig
} from '../../../core/models/variant-engine.model';
import {
  WeightUnit,
  convertToGrams,
  convertFromGrams,
  formatWeight,
  formatWeightWithUnit,
  validateWeightInput
} from '../../utils/weight.utils';

export interface WeightSelectionEvent {
  weightValue: number;
  weightUnit: WeightUnit;
  isCustom: boolean;
  weightInGrams: number;
  effectiveWeightGrams: number;
  unitPrice: number;
  totalPrice: number;
  label: string;
  discountPercentage?: number;
  isValid: boolean;
  validationError?: string;
}

@Component({
  selector: 'app-variant-weight-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './variant-weight-selector.component.html',
  styleUrl: './variant-weight-selector.component.scss'
})
export class VariantWeightSelectorComponent implements OnInit, OnChanges {
  @Input() weightConfig?: ProductWeightConfig;
  @Input() weightVariants: WeightVariantOption[] = [];
  @Input() baseUnitPrice: number = 0; // Price per unit weight (e.g., ₹756 / kg)
  @Input() initialWeightValue?: number;
  @Input() initialWeightUnit: WeightUnit = 'kg';
  @Input() allowCustomWeight: boolean = true;
  @Input() minWeight: number = 0.1;
  @Input() maxWeight: number = 50;
  @Input() quantity: number = 1;
  @Input() compact: boolean = false;

  @Output() weightChange = new EventEmitter<WeightSelectionEvent>();

  // Available Weight Units
  readonly availableUnits: WeightUnit[] = ['kg', 'g', 'lb', 'oz'];

  // Signals
  readonly activeVariants = signal<WeightVariantOption[]>([]);
  readonly selectedOption = signal<WeightVariantOption | null>(null);
  readonly isCustom = signal<boolean>(false);
  readonly customValue = signal<number>(1);
  readonly customUnit = signal<WeightUnit>('kg');
  readonly validationError = signal<string | null>(null);

  // Computeds
  readonly effectiveWeightGrams = computed(() => {
    if (this.isCustom()) {
      return convertToGrams(this.customValue(), this.customUnit());
    }
    const opt = this.selectedOption();
    if (opt) {
      return opt.weightInGrams || convertToGrams(opt.weightValue, opt.weightUnit);
    }
    return convertToGrams(1, 'kg');
  });

  readonly effectiveWeightValue = computed(() => {
    if (this.isCustom()) {
      return this.customValue();
    }
    return this.selectedOption()?.weightValue || 1;
  });

  readonly effectiveWeightUnit = computed<WeightUnit>(() => {
    if (this.isCustom()) {
      return this.customUnit();
    }
    return (this.selectedOption()?.weightUnit || 'kg') as WeightUnit;
  });

  readonly effectiveUnitPrice = computed(() => {
    if (!this.isCustom() && this.selectedOption()?.pricePerUnit) {
      return this.selectedOption()!.pricePerUnit!;
    }
    return this.baseUnitPrice || 0;
  });

  readonly lineTotalPrice = computed(() => {
    const qty = Math.max(1, this.quantity || 1);
    if (!this.isCustom() && this.selectedOption()?.totalPrice) {
      return this.selectedOption()!.totalPrice! * qty;
    }

    const val = this.effectiveWeightValue();
    const unitPrice = this.effectiveUnitPrice();
    const discount = (!this.isCustom() ? this.selectedOption()?.discountPercentage : 0) || 0;
    const subtotal = unitPrice * val;
    const discounted = discount > 0 ? subtotal * (1 - discount / 100) : subtotal;
    return Math.round(discounted * qty);
  });

  readonly totalWeightDisplay = computed(() => {
    const totalGrams = this.effectiveWeightGrams() * Math.max(1, this.quantity || 1);
    return formatWeight(totalGrams);
  });

  readonly unitPriceLabel = computed(() => {
    const unit = this.effectiveWeightUnit();
    const price = this.effectiveUnitPrice();
    return `₹${price.toLocaleString('en-IN')}/${unit}`;
  });

  ngOnInit(): void {
    this.setupVariants();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['weightVariants'] || changes['weightConfig'] || changes['baseUnitPrice']) {
      this.setupVariants();
    } else if (changes['quantity']) {
      this.emitSelection();
    }
  }

  private setupVariants(): void {
    let variants = this.weightVariants;
    if ((!variants || variants.length === 0) && this.weightConfig?.weightVariants) {
      variants = this.weightConfig.weightVariants;
    }

    // Default variants if none configured: Buy 1 (1 kg), Buy 3 (3 kg), Buy 5 (5 kg)
    if (!variants || variants.length === 0) {
      const base = this.baseUnitPrice > 0 ? this.baseUnitPrice : 756;
      variants = [
        {
          id: 'w-1',
          label: 'Buy 1 (1 kg)',
          weightValue: 1,
          weightUnit: 'kg',
          weightInGrams: 1000,
          pricePerUnit: base,
          totalPrice: base,
          discountPercentage: 0,
          isDefault: true
        },
        {
          id: 'w-3',
          label: 'Buy 3 (3 kg)',
          weightValue: 3,
          weightUnit: 'kg',
          weightInGrams: 3000,
          pricePerUnit: Math.round(base * 0.95),
          totalPrice: Math.round(base * 0.95 * 3),
          discountPercentage: 5,
          badgeText: '5% OFF',
          savingsText: 'Save 5%',
          isPopular: true
        },
        {
          id: 'w-5',
          label: 'Buy 5 (5 kg)',
          weightValue: 5,
          weightUnit: 'kg',
          weightInGrams: 5000,
          pricePerUnit: Math.round(base * 0.916),
          totalPrice: Math.round(base * 0.916 * 5),
          discountPercentage: 8.4,
          badgeText: 'Best Value',
          savingsText: 'Save 8.4%'
        }
      ];
    }

    this.activeVariants.set(variants);

    // Initial selection logic
    if (this.initialWeightValue) {
      const match = variants.find(
        v => v.weightValue === this.initialWeightValue && v.weightUnit === this.initialWeightUnit
      );
      if (match) {
        this.selectedOption.set(match);
        this.isCustom.set(false);
      } else {
        this.isCustom.set(true);
        this.customValue.set(this.initialWeightValue);
        this.customUnit.set(this.initialWeightUnit);
      }
    } else {
      const defaultVar = variants.find(v => v.isDefault || v.isPopular) || variants[0];
      this.selectedOption.set(defaultVar);
      this.isCustom.set(false);
    }

    this.validateAndEmit();
  }

  selectOption(opt: WeightVariantOption): void {
    this.isCustom.set(false);
    this.selectedOption.set(opt);
    this.validationError.set(null);
    this.emitSelection();
  }

  toggleCustom(): void {
    this.isCustom.set(true);
    this.selectedOption.set(null);
    this.validateAndEmit();
  }

  onCustomValueChange(val: number): void {
    this.customValue.set(val);
    this.validateAndEmit();
  }

  onCustomUnitChange(unit: WeightUnit): void {
    this.customUnit.set(unit);
    this.validateAndEmit();
  }

  private validateAndEmit(): void {
    if (this.isCustom()) {
      const val = this.customValue();
      const unit = this.customUnit();
      const check = validateWeightInput(val, unit, this.minWeight, this.maxWeight);

      if (!check.isValid) {
        this.validationError.set(check.error || 'Invalid weight value');
      } else {
        this.validationError.set(null);
      }
    } else {
      this.validationError.set(null);
    }

    this.emitSelection();
  }

  private emitSelection(): void {
    const isCust = this.isCustom();
    const opt = this.selectedOption();
    const val = isCust ? this.customValue() : (opt?.weightValue || 1);
    const unit = isCust ? this.customUnit() : ((opt?.weightUnit || 'kg') as WeightUnit);
    const err = this.validationError();
    const isValid = !err && val > 0;
    const grams = convertToGrams(val, unit);
    const totalGrams = grams * Math.max(1, this.quantity || 1);

    const eventPayload: WeightSelectionEvent = {
      weightValue: val,
      weightUnit: unit,
      isCustom: isCust,
      weightInGrams: grams,
      effectiveWeightGrams: totalGrams,
      unitPrice: this.effectiveUnitPrice(),
      totalPrice: this.lineTotalPrice(),
      label: isCust ? `Custom Weight (${val} ${unit})` : (opt?.label || formatWeightWithUnit(val, unit)),
      discountPercentage: !isCust ? opt?.discountPercentage : undefined,
      isValid,
      validationError: err || undefined
    };

    this.weightChange.emit(eventPayload);
  }
}
