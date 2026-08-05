import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface VariantOptionGroup {
  name: string;
  values: string[];
  displayType?: string;
}

@Component({
  selector: 'app-variant-chip-selector',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './variant-chip-selector.html',
  styleUrl: './variant-chip-selector.scss',
})
export class VariantChipSelectorComponent {
  /** Array of option groups to render as chip rows */
  @Input() optionGroups: VariantOptionGroup[] = [];

  /** Currently selected option value per group name */
  @Input() selectedOptions: Record<string, string> = {};

  /** Callback to check if a specific option value is out of stock */
  @Input() isOptionOutOfStock: (groupName: string, value: string) => boolean = () => false;

  /** Callback to resolve a color name to a hex code (for color dot rendering) */
  @Input() getColorCode: (colorName: string) => string = () => '#e2e8f0';

  /** Optional callback to resolve image for an option value */
  @Input() getOptionImage: (groupName: string, value: string) => string | null = () => null;

  /** Emits when a chip is selected */
  @Output() optionSelected = new EventEmitter<{ optionName: string; value: string }>();

  isColorGroup(groupName: string): boolean {
    const name = (groupName || '').toLowerCase().trim();
    return name === 'color' || name === 'colour' || name === 'colors' || name === 'colours';
  }

  getGroupDisplayType(group: VariantOptionGroup): string {
    if (group.displayType) return group.displayType;
    if (this.isColorGroup(group.name)) return 'color-chips';
    return 'chip';
  }

  isSelected(groupName: string, value: string): boolean {
    return this.selectedOptions[groupName] === value;
  }

  isOutOfStock(groupName: string, value: string): boolean {
    return this.isOptionOutOfStock(groupName, value);
  }

  onChipClick(groupName: string, value: string): void {
    if (this.isOutOfStock(groupName, value)) return;
    this.optionSelected.emit({ optionName: groupName, value });
  }

  onDropdownChange(groupName: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.onChipClick(groupName, target.value);
    }
  }

  onKeydown(event: KeyboardEvent, groupName: string, value: string, values: string[]): void {
    const currentIndex = values.indexOf(value);
    let targetIndex = -1;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      targetIndex = currentIndex + 1 < values.length ? currentIndex + 1 : 0;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      targetIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : values.length - 1;
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onChipClick(groupName, value);
      return;
    }

    if (targetIndex !== -1) {
      const targetValue = values[targetIndex];
      const container = (event.target as HTMLElement).closest('[role="radiogroup"]');
      if (container) {
        const chips = container.querySelectorAll('[role="radio"]');
        const targetChip = chips[targetIndex] as HTMLElement;
        if (targetChip) {
          targetChip.focus();
          if (!this.isOutOfStock(groupName, targetValue)) {
            this.onChipClick(groupName, targetValue);
          }
        }
      }
    }
  }

  trackByGroup(index: number, group: VariantOptionGroup): string {
    return group.name;
  }

  trackByValue(index: number, value: string): string {
    return value;
  }
}
