import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Category } from '../../../services/datastore';

@Component({
  selector: 'app-category-multi-select',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-multi-select.component.html',
  styleUrl: './category-multi-select.component.scss'
})
export class CategoryMultiSelectComponent {
  @Input() set categories(val: Category[]) {
    this.allCategories.set(val || []);
  }
  @Input() set selectedCategoryIds(val: string[]) {
    const set = new Set(val || []);
    this.selectedIds.set(set);
  }
  @Input() set primaryCategoryId(val: string | null) {
    this.primaryId.set(val || null);
  }

  @Output() selectionChange = new EventEmitter<{
    categoryIds: string[];
    primaryCategoryId: string | null;
  }>();

  allCategories = signal<Category[]>([]);
  selectedIds = signal<Set<string>>(new Set());
  primaryId = signal<string | null>(null);
  searchQuery = signal<string>('');

  // Filtered categories based on search query
  filteredCategories = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cats = this.allCategories();
    if (!q) return cats;
    return cats.filter(c => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  });

  // Selected Category Objects
  selectedCategoryObjects = computed(() => {
    const ids = this.selectedIds();
    const cats = this.allCategories();
    return cats.filter(c => ids.has(c.id));
  });

  isSelected(catId: string): boolean {
    return this.selectedIds().has(catId);
  }

  isPrimary(catId: string): boolean {
    return this.primaryId() === catId;
  }

  getChipClass(catId: string): string {
    if (this.isPrimary(catId)) {
      return 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300';
    }
    return 'bg-white border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-200';
  }

  getSetPrimaryBtnClass(catId: string): string {
    if (this.isPrimary(catId)) {
      return 'bg-amber-500 text-white';
    }
    return 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400';
  }

  toggleCategory(catId: string) {
    const current = new Set(this.selectedIds());
    if (current.has(catId)) {
      current.delete(catId);
      // If primary was deleted, clear or fallback primary
      if (this.primaryId() === catId) {
        const remaining = Array.from(current);
        this.primaryId.set(remaining.length > 0 ? remaining[0] : null);
      }
    } else {
      current.add(catId);
      if (!this.primaryId()) {
        this.primaryId.set(catId);
      }
    }
    this.selectedIds.set(current);
    this.emitChange();
  }

  setPrimary(catId: string, event?: Event) {
    if (event) event.stopPropagation();
    // Ensure it's selected
    const current = new Set(this.selectedIds());
    if (!current.has(catId)) {
      current.add(catId);
      this.selectedIds.set(current);
    }
    this.primaryId.set(catId);
    this.emitChange();
  }

  removeCategory(catId: string, event?: Event) {
    if (event) event.stopPropagation();
    const current = new Set(this.selectedIds());
    current.delete(catId);
    if (this.primaryId() === catId) {
      const remaining = Array.from(current);
      this.primaryId.set(remaining.length > 0 ? remaining[0] : null);
    }
    this.selectedIds.set(current);
    this.emitChange();
  }

  selectAll() {
    const all = this.filteredCategories();
    const current = new Set(this.selectedIds());
    all.forEach(c => current.add(c.id));
    this.selectedIds.set(current);
    if (!this.primaryId() && current.size > 0) {
      this.primaryId.set(Array.from(current)[0]);
    }
    this.emitChange();
  }

  clearAll() {
    this.selectedIds.set(new Set());
    this.primaryId.set(null);
    this.emitChange();
  }

  private emitChange() {
    const categoryIds = Array.from(this.selectedIds());
    const primaryId = this.primaryId();
    this.selectionChange.emit({
      categoryIds,
      primaryCategoryId: primaryId || (categoryIds.length > 0 ? categoryIds[0] : null)
    });
  }
}
