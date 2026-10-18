import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
  ElementRef,
  HostListener,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { DatastoreService } from '../../../services/datastore';

export interface SearchProductItem {
  id: string;
  name: string;
  sku: string;
  brand?: any;
  brandName?: string;
  price?: number;
  basePrice?: number;
  salePrice?: number;
  stock?: number;
  images?: any[];
  image?: string;
  thumbnail?: string;
  category?: any;
  categoryName?: string;
  isExcluded?: boolean;
}

@Component({
  selector: 'app-product-search-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full" #containerRef>
      <!-- Input and Action Button Row -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <!-- Search / Selection Input Trigger -->
          <div
            (click)="openDropdown()"
            class="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border rounded-xl text-xs cursor-pointer transition-all shadow-xs"
            [ngClass]="{
              'border-blue-500 ring-2 ring-blue-500/20': isOpen(),
              'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700': !isOpen()
            }"
          >
            <!-- Left Icon -->
            <mat-icon class="text-zinc-400 text-sm scale-90 shrink-0">search</mat-icon>

            <!-- Active / Staged Product Preview or Placeholder -->
            @if (stagedProduct(); as staged) {
              <div class="flex items-center gap-2 flex-1 min-w-0">
                @if (getProductImage(staged); as imgUrl) {
                  <img
                    [src]="imgUrl"
                    [alt]="staged.name"
                    class="w-6 h-6 object-cover rounded-md border border-zinc-200 dark:border-zinc-800 shrink-0"
                  />
                } @else {
                  <div class="w-6 h-6 rounded-md bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <mat-icon class="scale-50 text-zinc-500">inventory_2</mat-icon>
                  </div>
                }
                <span class="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {{ staged.name }}
                </span>
                <span class="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 shrink-0">
                  {{ staged.sku || 'NO-SKU' }}
                </span>
                <span class="text-blue-600 dark:text-blue-400 font-bold ml-auto text-[11px] shrink-0">
                  ₹{{ staged.salePrice || staged.basePrice || staged.price || 0 }}
                </span>
              </div>
              <button
                type="button"
                (click)="clearStaged($event)"
                class="p-0.5 text-zinc-400 hover:text-red-500 bg-transparent border-none cursor-pointer flex items-center justify-center transition-colors"
                title="Clear selected product"
              >
                <mat-icon class="scale-75 text-xs">close</mat-icon>
              </button>
            } @else {
              <!-- Text input when searching or placeholder -->
              <input
                #searchInputRef
                type="text"
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchInput($event)"
                (focus)="openDropdown()"
                (keydown)="onKeyDown($event)"
                [placeholder]="placeholder"
                class="w-full bg-transparent border-none outline-none text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
              @if (loading()) {
                <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
              } @else if (searchQuery()) {
                <button
                  type="button"
                  (click)="clearSearch($event)"
                  class="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 bg-transparent border-none cursor-pointer flex items-center justify-center"
                >
                  <mat-icon class="scale-75 text-xs">close</mat-icon>
                </button>
              }
            }

            <!-- Dropdown chevron -->
            <mat-icon class="text-zinc-400 text-xs transition-transform duration-200 shrink-0" [class.rotate-180]="isOpen()">
              expand_more
            </mat-icon>
          </div>
        </div>

        <!-- Add Button -->
        <button
          type="button"
          (click)="onAddClick()"
          [disabled]="!stagedProduct()"
          class="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 shadow-xs border-none cursor-pointer"
          [ngClass]="{
            'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-95': stagedProduct(),
            'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-60': !stagedProduct()
          }"
        >
          <mat-icon class="scale-75 text-xs">add</mat-icon>
          <span>{{ buttonText }}</span>
        </button>
      </div>

      <!-- Live Search Autocomplete Dropdown Panel -->
      @if (isOpen()) {
        <div
          class="absolute left-0 right-16 top-full mt-1.5 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <!-- Floating Search Field when product already staged -->
          @if (stagedProduct()) {
            <div class="p-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center gap-2">
              <mat-icon class="text-zinc-400 text-sm scale-75">search</mat-icon>
              <input
                type="text"
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchInput($event)"
                (keydown)="onKeyDown($event)"
                placeholder="Search other products by name or SKU..."
                class="w-full bg-transparent border-none outline-none text-xs text-zinc-900 dark:text-white"
                autofocus
              />
            </div>
          }

          <!-- Results Scroll Area -->
          <div class="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 p-1">
            @if (loading() && displayResults().length === 0) {
              <!-- Loading Skeleton -->
              <div class="p-4 space-y-2 text-center text-zinc-400 text-xs">
                <div class="flex items-center justify-center gap-2">
                  <div class="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching product catalog...</span>
                </div>
              </div>
            } @else if (error()) {
              <div class="p-4 text-center text-xs text-red-500 space-y-1">
                <mat-icon class="scale-75">error_outline</mat-icon>
                <p>{{ error() }}</p>
                <button
                  type="button"
                  (click)="fetchProducts(searchQuery())"
                  class="text-[11px] underline text-blue-500 hover:text-blue-400 border-none bg-transparent cursor-pointer"
                >
                  Retry Search
                </button>
              </div>
            } @else if (displayResults().length === 0) {
              <!-- Empty state -->
              <div class="p-6 text-center space-y-1 text-zinc-400 dark:text-zinc-500">
                <mat-icon class="scale-90 text-zinc-300 dark:text-zinc-700">search_off</mat-icon>
                <p class="text-xs font-bold text-zinc-600 dark:text-zinc-400">No matching products found</p>
                <p class="text-[10px]">Try searching with a different product name, model number, or SKU.</p>
              </div>
            } @else {
              <!-- Product Results List -->
              @for (prod of displayResults(); track prod.id; let idx = $index) {
                <div
                  (click)="selectCandidate(prod)"
                  class="flex items-center justify-between gap-3 p-2.5 rounded-lg transition-colors cursor-pointer group"
                  [ngClass]="{
                    'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100': activeIndex() === idx,
                    'hover:bg-zinc-50 dark:hover:bg-zinc-850': activeIndex() !== idx && !prod.isExcluded,
                    'opacity-50 cursor-not-allowed bg-zinc-50/30 dark:bg-zinc-900/30': prod.isExcluded
                  }"
                >
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <!-- Thumbnail -->
                    @if (getProductImage(prod); as imgUrl) {
                      <img
                        [src]="imgUrl"
                        [alt]="prod.name"
                        class="w-10 h-10 object-cover rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950"
                      />
                    } @else {
                      <div class="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                        <mat-icon class="scale-75 text-zinc-400">inventory_2</mat-icon>
                      </div>
                    }

                    <!-- Details -->
                    <div class="min-w-0 flex-1 space-y-0.5">
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {{ prod.name }}
                        </span>
                        @if (prod.brandName) {
                          <span class="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase shrink-0">
                            {{ prod.brandName }}
                          </span>
                        }
                      </div>

                      <div class="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                        <span class="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-zinc-600 dark:text-zinc-300">
                          {{ prod.sku || 'NO-SKU' }}
                        </span>
                        <span>•</span>
                        <!-- Stock Status -->
                        @if (prod.stock !== undefined && prod.stock <= 0) {
                          <span class="text-red-500 font-semibold">Out of Stock</span>
                        } @else if (prod.stock !== undefined) {
                          <span class="text-emerald-600 dark:text-emerald-400 font-medium">In Stock ({{ prod.stock }})</span>
                        } @else {
                          <span class="text-emerald-600 dark:text-emerald-400 font-medium">Available</span>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Right Price & Status Badge -->
                  <div class="text-right shrink-0 flex flex-col items-end gap-1">
                    <span class="text-xs font-black text-zinc-900 dark:text-white">
                      ₹{{ prod.salePrice || prod.basePrice || prod.price || 0 }}
                    </span>
                    @if (prod.isExcluded) {
                      <span class="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[9px] font-black uppercase text-zinc-600 dark:text-zinc-400">
                        Already Added
                      </span>
                    } @else if (prod.id === stagedProduct()?.id) {
                      <span class="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[9px] font-black uppercase text-blue-600 dark:text-blue-300 flex items-center gap-1">
                        <mat-icon class="text-[10px] scale-75">check</mat-icon> Selected
                      </span>
                    }
                  </div>
                </div>
              }
            }
          </div>

          <!-- Bottom Footer helper text -->
          <div class="px-3 py-2 bg-zinc-50 dark:bg-zinc-950/80 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 flex items-center justify-between">
            <span>Click product or press <kbd class="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-[9px] font-mono text-zinc-700 dark:text-zinc-300">Enter</kbd> to stage</span>
            <span>{{ displayResults().length }} result(s)</span>
          </div>
        </div>
      }
    </div>
  `
})
export class ProductSearchSelectorComponent implements OnInit, OnDestroy {
  @Input() placeholder: string = 'Select product to include...';
  @Input() buttonText: string = 'Add Product';
  @Input() currentProductId?: string;
  @Input() excludedProductIds: string[] = [];
  @Input() categoryFilter?: string;
  @Input() isFilamentOnly: boolean = false;

  @Output() productAdded = new EventEmitter<any>();

  private http = inject(HttpClient);
  private ds = inject(DatastoreService);
  private elementRef = inject(ElementRef);

  searchQuery = signal<string>('');
  isOpen = signal<boolean>(false);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  rawResults = signal<any[]>([]);
  stagedProduct = signal<any | null>(null);
  activeIndex = signal<number>(-1);

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // ViewChild for search input auto-focus
  searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInputRef');

  ngOnInit() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((term) => this.performSearch(term))
    ).subscribe({
      next: (items) => {
        this.rawResults.set(items);
        this.loading.set(false);
        this.error.set(null);
        this.activeIndex.set(-1);
      },
      error: (err) => {
        this.error.set(err?.message || 'Search failed');
        this.loading.set(false);
      }
    });

    // Initial pre-load of popular products into dropdown
    this.fetchProducts('');
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  openDropdown() {
    this.isOpen.set(true);
    if (this.rawResults().length === 0 && !this.loading()) {
      this.fetchProducts(this.searchQuery());
    }
    setTimeout(() => {
      this.searchInputRef()?.nativeElement?.focus();
    }, 50);
  }

  closeDropdown() {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  onSearchInput(query: string) {
    this.searchQuery.set(query);
    this.loading.set(true);
    this.searchSubject.next(query);
  }

  clearSearch(event: MouseEvent) {
    event.stopPropagation();
    this.searchQuery.set('');
    this.fetchProducts('');
    this.searchInputRef()?.nativeElement?.focus();
  }

  clearStaged(event: MouseEvent) {
    event.stopPropagation();
    this.stagedProduct.set(null);
  }

  fetchProducts(term: string) {
    this.loading.set(true);
    this.searchSubject.next(term);
  }

  private performSearch(term: string) {
    const q = (term || '').trim();
    const params: any = { limit: '20' };

    if (q) {
      params.search = q;
    }

    if (this.isFilamentOnly) {
      params.category = 'filaments';
    } else if (this.categoryFilter) {
      params.category = this.categoryFilter;
    }

    return this.http.get<any>('/api/products', { params }).pipe(
      catchError(() => {
        // Fallback to local products if API has temporary issue
        const local = this.ds.products() || [];
        const filtered = local.filter((p: any) => {
          if (!q) return true;
          const name = (p.name || '').toLowerCase();
          const sku = (p.sku || '').toLowerCase();
          const brand = typeof p.brand === 'string' ? p.brand.toLowerCase() : (p.brand?.name || '').toLowerCase();
          return name.includes(q.toLowerCase()) || sku.includes(q.toLowerCase()) || brand.includes(q.toLowerCase());
        });
        return of({ products: filtered });
      }),
      switchMap((res: any) => {
        let list: any[] = res?.products || res?.data || (Array.isArray(res) ? res : []);

        // Also merge any in-memory products from Datastore if server list is small
        if (list.length < 5 && this.ds.products().length > 0) {
          const dsMatches = this.ds.products().filter((p: any) => {
            if (list.some(existing => existing.id === p.id)) return false;
            if (!q) return true;
            const name = (p.name || '').toLowerCase();
            const sku = (p.sku || '').toLowerCase();
            return name.includes(q.toLowerCase()) || sku.includes(q.toLowerCase());
          });
          list = [...list, ...dsMatches];
        }

        return of(list);
      })
    );
  }

  displayResults() {
    const raw = this.rawResults();
    const excludedSet = new Set(
      (this.excludedProductIds || []).map(id => typeof id === 'object' ? (id as any).id : String(id))
    );

    return raw
      .filter((p: any) => p && p.id !== this.currentProductId)
      .map((p: any) => {
        const brandName = typeof p.brand === 'object' ? p.brand?.name : (p.brand || '');
        const isExcluded = excludedSet.has(p.id);
        return {
          ...p,
          brandName,
          isExcluded
        };
      });
  }

  selectCandidate(prod: any) {
    if (prod.isExcluded) return;
    this.stagedProduct.set(prod);
    this.closeDropdown();
  }

  onAddClick() {
    const staged = this.stagedProduct();
    if (!staged) return;

    this.productAdded.emit(staged);
    this.stagedProduct.set(null);
    this.searchQuery.set('');
  }

  onKeyDown(event: KeyboardEvent) {
    const results = this.displayResults();
    if (!results || results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update(idx => (idx + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update(idx => (idx - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const currentIdx = this.activeIndex();
      if (currentIdx >= 0 && currentIdx < results.length) {
        this.selectCandidate(results[currentIdx]);
      } else if (this.stagedProduct()) {
        this.onAddClick();
      }
    } else if (event.key === 'Escape') {
      this.closeDropdown();
    }
  }

  getProductImage(prod: any): string | null {
    if (!prod) return null;
    if (Array.isArray(prod.images) && prod.images.length > 0) {
      const first = prod.images[0];
      return typeof first === 'string' ? first : (first?.url || null);
    }
    if (prod.image && typeof prod.image === 'string') return prod.image;
    if (prod.thumbnail && typeof prod.thumbnail === 'string') return prod.thumbnail;
    return null;
  }
}
