import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Category } from '../../../services/datastore';

import { normalizeCategoryId, extractNormalizedCategoryIds } from './category-selection.utils';
export { normalizeCategoryId, extractNormalizedCategoryIds };


@Component({
  selector: 'app-category-multi-select',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-multi-select.component.html',
  styleUrl: './category-multi-select.component.scss'
})
export class CategoryMultiSelectComponent {
  private _rawIncomingSelectedIds: any[] = [];
  private _rawIncomingPrimaryId: any = null;

  @Input() set categories(val: Category[]) {
    this.allCategories.set(val || []);
    // Reconcile pending selected IDs once categories become available (race condition safe)
    this.syncSelectionWithCategories();
  }
  @Input() set selectedCategoryIds(val: any[]) {
    this._rawIncomingSelectedIds = val || [];
    this.syncSelectionWithCategories();
  }
  @Input() set primaryCategoryId(val: any) {
    this._rawIncomingPrimaryId = val;
    const nid = normalizeCategoryId(val);
    this.primaryId.set(nid || null);
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
    return cats.filter(c => (c.name && c.name.toLowerCase().includes(q)) || (c.slug && c.slug.toLowerCase().includes(q)));
  });

  // Selected Category Objects derived from isSelected matching
  selectedCategoryObjects = computed(() => {
    const cats = this.allCategories();
    return cats.filter(c => this.isSelected(c.id));
  });

  private syncSelectionWithCategories() {
    const rawList = this._rawIncomingSelectedIds || [];
    const available = this.allCategories();
    const normalized = extractNormalizedCategoryIds(rawList, available);
    const newSet = new Set<string>(normalized.categoryIds);

    if (newSet.size === 0 && (!rawList || rawList.length === 0)) {
      if (this.selectedIds().size > 0) {
        this.selectedIds.set(new Set());
        this.primaryId.set(null);
      }
      return;
    }

    // Compare with current set to avoid re-writing identical state
    const current = this.selectedIds();
    let hasDiff = current.size !== newSet.size;
    if (!hasDiff) {
      for (const id of newSet) {
        if (!current.has(id)) {
          hasDiff = true;
          break;
        }
      }
    }

    if (hasDiff) {
      this.selectedIds.set(newSet);
      const incomingPrimaryNorm = normalizeCategoryId(this._rawIncomingPrimaryId);
      const primaryToSet = (incomingPrimaryNorm && newSet.has(incomingPrimaryNorm))
        ? incomingPrimaryNorm
        : (normalized.primaryCategoryId || Array.from(newSet)[0] || null);
      this.primaryId.set(primaryToSet);
    }
  }

  isSelected(catId: any): boolean {
    const nid = normalizeCategoryId(catId);
    if (!nid) return false;
    const current = this.selectedIds();
    if (current.has(nid)) return true;

    const nidLower = nid.toLowerCase();
    for (const id of current) {
      if (id.toLowerCase() === nidLower) return true;
    }

    const cat = this.allCategories().find(c => c.id === nid || c.id?.toLowerCase() === nidLower);
    if (cat) {
      if (cat.slug && (current.has(cat.slug) || current.has(cat.slug.toLowerCase()))) return true;
      if (cat.name && (current.has(cat.name) || current.has(cat.name.toLowerCase()))) return true;
    }
    return false;
  }

  isPrimary(catId: any): boolean {
    const currentPrimary = this.primaryId();
    if (!currentPrimary) return false;
    const nid = normalizeCategoryId(catId);
    if (currentPrimary === nid || currentPrimary.toLowerCase() === nid.toLowerCase()) return true;
    const cat = this.allCategories().find(c => c.id === nid || c.id?.toLowerCase() === nid.toLowerCase());
    if (cat) {
      if (cat.slug && currentPrimary.toLowerCase() === cat.slug.toLowerCase()) return true;
      if (cat.name && currentPrimary.toLowerCase() === cat.name.toLowerCase()) return true;
    }
    return false;
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

  toggleCategory(catId: any) {
    const nid = normalizeCategoryId(catId);
    if (!nid) return;
    const cat = this.allCategories().find(c => c.id === nid || c.id?.toLowerCase() === nid.toLowerCase());
    const canonicalId = cat ? cat.id : nid;

    const current = new Set(this.selectedIds());
    if (this.isSelected(canonicalId)) {
      current.delete(canonicalId);
      current.delete(nid);
      for (const id of Array.from(current)) {
        if (id.toLowerCase() === canonicalId.toLowerCase()) {
          current.delete(id);
        }
      }
      if (this.isPrimary(canonicalId)) {
        const remaining = Array.from(current);
        this.primaryId.set(remaining.length > 0 ? remaining[0] : null);
      }
    } else {
      current.add(canonicalId);
      if (!this.primaryId()) {
        this.primaryId.set(canonicalId);
      }
    }
    this.selectedIds.set(current);
    this.emitChange();
  }

  setPrimary(catId: any, event?: Event) {
    if (event) event.stopPropagation();
    const nid = normalizeCategoryId(catId);
    if (!nid) return;
    const cat = this.allCategories().find(c => c.id === nid || c.id?.toLowerCase() === nid.toLowerCase());
    const canonicalId = cat ? cat.id : nid;

    const current = new Set(this.selectedIds());
    if (!this.isSelected(canonicalId)) {
      current.add(canonicalId);
      this.selectedIds.set(current);
    }
    this.primaryId.set(canonicalId);
    this.emitChange();
  }

  removeCategory(catId: any, event?: Event) {
    if (event) event.stopPropagation();
    const nid = normalizeCategoryId(catId);
    if (!nid) return;
    const cat = this.allCategories().find(c => c.id === nid || c.id?.toLowerCase() === nid.toLowerCase());
    const canonicalId = cat ? cat.id : nid;

    const current = new Set(this.selectedIds());
    current.delete(canonicalId);
    current.delete(nid);
    for (const id of Array.from(current)) {
      if (id.toLowerCase() === canonicalId.toLowerCase()) {
        current.delete(id);
      }
    }
    if (this.isPrimary(canonicalId)) {
      const remaining = Array.from(current);
      this.primaryId.set(remaining.length > 0 ? remaining[0] : null);
    }
    this.selectedIds.set(current);
    this.emitChange();
  }

  selectAll() {
    const all = this.filteredCategories();
    const current = new Set(this.selectedIds());
    all.forEach(c => {
      const nid = normalizeCategoryId(c.id);
      if (nid) current.add(nid);
    });
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

