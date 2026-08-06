import {
  Component,
  Input,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminPanel } from '../admin';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

export interface AdminReviewItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  userName: string;
  userEmail: string;
  userMobile: string;
  adminRemarks?: string | null;
  createdAt: string;
  updatedAt: string;
  helpfulCount?: number;
}

@Component({
  selector: 'app-admin-reviews-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300 font-sans">
      
      <!-- PAGE HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white font-display">
              Review Management
            </h1>
            <span class="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono font-bold rounded-full border border-blue-500/20">
              {{ reviews().length }} Total Reviews
            </span>
            @if (pendingCount() > 0) {
              <span class="px-2.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold rounded-full border border-amber-500/30 animate-pulse flex items-center gap-1">
                <mat-icon class="text-xs">hourglass_top</mat-icon>
                {{ pendingCount() }} Pending Approval
              </span>
            }
          </div>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Moderate customer product feedback. Approve, reject, or delete submitted reviews across the catalog.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="fetchReviews()"
            [disabled]="loading()"
            class="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none shadow-xs disabled:opacity-50"
          >
            <mat-icon class="text-sm" [class.animate-spin]="loading()">refresh</mat-icon>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            (click)="rebuildRatings()"
            class="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none shadow-md shadow-purple-600/20 active:scale-95"
          >
            <mat-icon class="text-sm">autorenew</mat-icon>
            <span>Recalculate Ratings</span>
          </button>
        </div>
      </div>

      <!-- METRICS DASHBOARD SUMMARY CARDS -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <!-- Total Reviews -->
        <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3 shadow-xs">
          <div class="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <mat-icon>rate_review</mat-icon>
          </div>
          <div>
            <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Total Feedback</span>
            <span class="text-lg font-black text-zinc-900 dark:text-white">{{ reviews().length }}</span>
          </div>
        </div>

        <!-- Pending Moderation -->
        <div class="p-4 bg-white dark:bg-zinc-900 border border-amber-500/30 dark:border-amber-500/30 bg-amber-500/5 rounded-2xl flex items-center gap-3 shadow-xs relative overflow-hidden">
          @if (pendingCount() > 0) {
            <div class="absolute top-0 right-0 h-2 w-2 bg-amber-500 rounded-full animate-ping m-2"></div>
          }
          <div class="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <mat-icon>hourglass_empty</mat-icon>
          </div>
          <div>
            <span class="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block">Pending Approval</span>
            <span class="text-lg font-black text-amber-600 dark:text-amber-400">{{ pendingCount() }}</span>
          </div>
        </div>

        <!-- Approved -->
        <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3 shadow-xs">
          <div class="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div>
            <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Approved / Live</span>
            <span class="text-lg font-black text-emerald-600 dark:text-emerald-400">{{ approvedCount() }}</span>
          </div>
        </div>

        <!-- Rejected -->
        <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3 shadow-xs">
          <div class="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <mat-icon>cancel</mat-icon>
          </div>
          <div>
            <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Rejected</span>
            <span class="text-lg font-black text-rose-600 dark:text-rose-400">{{ rejectedCount() }}</span>
          </div>
        </div>
      </div>

      <!-- CONTROLS & FILTER BAR -->
      <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4 shadow-xs">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          
          <!-- Status Tabs -->
          <div class="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
            <button
              type="button"
              (click)="selectedStatusFilter.set('ALL')"
              [class]="selectedStatusFilter() === 'ALL'
                ? 'px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg text-xs font-black uppercase shadow-xs'
                : 'px-3 py-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-bold uppercase'"
            >
              All ({{ reviews().length }})
            </button>
            <button
              type="button"
              (click)="selectedStatusFilter.set('PENDING')"
              [class]="selectedStatusFilter() === 'PENDING'
                ? 'px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-black uppercase shadow-xs'
                : 'px-3 py-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-lg text-xs font-bold uppercase flex items-center gap-1'"
            >
              <span>Pending</span>
              @if (pendingCount() > 0) {
                <span class="px-1.5 py-0.2 bg-amber-700 text-white text-[9px] font-black rounded-full">{{ pendingCount() }}</span>
              }
            </button>
            <button
              type="button"
              (click)="selectedStatusFilter.set('APPROVED')"
              [class]="selectedStatusFilter() === 'APPROVED'
                ? 'px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase shadow-xs'
                : 'px-3 py-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-bold uppercase'"
            >
              Approved ({{ approvedCount() }})
            </button>
            <button
              type="button"
              (click)="selectedStatusFilter.set('REJECTED')"
              [class]="selectedStatusFilter() === 'REJECTED'
                ? 'px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-black uppercase shadow-xs'
                : 'px-3 py-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-bold uppercase'"
            >
              Rejected ({{ rejectedCount() }})
            </button>
          </div>

          <!-- Search & Rating Filters -->
          <div class="flex items-center gap-3 w-full md:w-auto">
            <!-- Search Box -->
            <div class="relative flex-1 md:w-64">
              <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">search</mat-icon>
              <input
                type="text"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                placeholder="Search product, customer, text..."
                class="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-blue-500 transition-colors"
              />
              @if (searchQuery()) {
                <button
                  (click)="searchQuery.set('')"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <mat-icon class="text-sm">close</mat-icon>
                </button>
              }
            </div>

            <!-- Star Rating Dropdown Filter -->
            <select
              [ngModel]="ratingFilter()"
              (ngModelChange)="ratingFilter.set($event)"
              class="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-700 dark:text-zinc-300"
            >
              <option value="ALL">All Ratings</option>
              <option value="5">5 ★ Only</option>
              <option value="4">4 ★ Only</option>
              <option value="3">3 ★ Only</option>
              <option value="2">2 ★ Only</option>
              <option value="1">1 ★ Only</option>
            </select>
          </div>
        </div>
      </div>

      <!-- REVIEWS LISTING TABLE / CARDS VIEW -->
      @if (loading()) {
        <div class="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
          <div class="h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading Customer Reviews...</p>
        </div>
      } @else if (filteredReviews().length === 0) {
        <div class="p-16 text-center bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-4">
          <div class="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-400">
            <mat-icon class="text-3xl">rate_review</mat-icon>
          </div>
          <div>
            <h3 class="text-base font-black uppercase text-zinc-900 dark:text-white">No Reviews Found</h3>
            <p class="text-xs text-zinc-400 mt-1">No customer reviews match your search filter criteria.</p>
          </div>
          @if (searchQuery() || selectedStatusFilter() !== 'ALL' || ratingFilter() !== 'ALL') {
            <button
              (click)="searchQuery.set(''); selectedStatusFilter.set('ALL'); ratingFilter.set('ALL')"
              class="px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-xl text-xs font-bold uppercase transition-colors border-none cursor-pointer"
            >
              Reset Filters
            </button>
          }
        </div>
      } @else {
        <div class="space-y-4">
          @for (review of filteredReviews(); track review.id) {
            <div
              class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-3xl space-y-4 transition-all shadow-xs"
              [ngClass]="{'border-amber-500/40 bg-amber-500/5': review.status === 'PENDING'}"
            >
              <!-- Card Top Row: Product Info & Review Status Badge -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <div class="flex items-center gap-3">
                  <img
                    [src]="review.productImage"
                    [alt]="review.productName"
                    class="h-12 w-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-100 dark:bg-zinc-950"
                  />
                  <div>
                    <h3 class="text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-white font-display">
                      {{ review.productName }}
                    </h3>
                    <p class="text-[10px] text-zinc-400 font-mono">ID: {{ review.productId }}</p>
                  </div>
                </div>

                <!-- Status Badge -->
                <div class="flex items-center gap-2">
                  @if (review.status === 'APPROVED') {
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-500/20">
                      <mat-icon class="text-xs">check_circle</mat-icon>
                      <span>Approved / Live</span>
                    </span>
                  } @else if (review.status === 'PENDING') {
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-amber-500/30 animate-pulse">
                      <mat-icon class="text-xs">hourglass_top</mat-icon>
                      <span>Awaiting Approval</span>
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-rose-500/20">
                      <mat-icon class="text-xs">cancel</mat-icon>
                      <span>Rejected</span>
                    </span>
                  }
                  <span class="text-[10px] text-zinc-400 font-mono">{{ formatDate(review.createdAt) }}</span>
                </div>
              </div>

              <!-- Customer Info & Star Rating -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2.5">
                  <div class="h-8 w-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black uppercase shadow-xs">
                    {{ review.userName.slice(0, 2) }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-black text-zinc-900 dark:text-white">{{ review.userName }}</span>
                      <span class="px-1.5 py-0.2 bg-blue-500/10 text-blue-500 text-[9px] font-mono font-bold rounded-md">Verified Purchaser</span>
                    </div>
                    <div class="flex items-center gap-3 text-[10px] text-zinc-400">
                      @if (review.userEmail) { <span>{{ review.userEmail }}</span> }
                      @if (review.userMobile) { <span>• {{ review.userMobile }}</span> }
                    </div>
                  </div>
                </div>

                <!-- Star Rating Display -->
                <div class="flex items-center gap-1">
                  @for (star of [1, 2, 3, 4, 5]; track star) {
                    <mat-icon
                      class="text-base"
                      [class.text-amber-400]="star <= review.rating"
                      [class.text-zinc-200]="star > review.rating"
                      [class.dark:text-zinc-800]="star > review.rating"
                    >
                      {{ star <= review.rating ? 'star' : 'star_border' }}
                    </mat-icon>
                  }
                  <span class="text-xs font-black text-amber-500 ml-1 font-mono">{{ review.rating }}.0</span>
                </div>
              </div>

              <!-- Review Title & Comment Body -->
              <div class="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 space-y-1.5">
                <h4 class="text-xs font-black text-zinc-900 dark:text-white">{{ review.title }}</h4>
                <p class="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{{ review.comment }}</p>

                <!-- Photo Gallery (if images attached) -->
                @if (review.images && review.images.length > 0) {
                  <div class="flex items-center gap-2 pt-2">
                    @for (img of review.images; track img) {
                      <a [href]="img" target="_blank" rel="noopener">
                        <img
                          [src]="img"
                          alt="Review image"
                          class="h-14 w-14 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800 hover:scale-105 transition-transform"
                        />
                      </a>
                    }
                  </div>
                }
              </div>

              <!-- ACTION BUTTONS: APPROVE, REJECT, DELETE -->
              <div class="flex items-center justify-end gap-2 pt-2">
                @if (review.status !== 'APPROVED') {
                  <button
                    type="button"
                    (click)="approveReview(review)"
                    [disabled]="processingId() === review.id"
                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                  >
                    <mat-icon class="text-sm">check_circle</mat-icon>
                    <span>Approve Review</span>
                  </button>
                }

                @if (review.status !== 'REJECTED') {
                  <button
                    type="button"
                    (click)="rejectReview(review)"
                    [disabled]="processingId() === review.id"
                    class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none shadow-md shadow-amber-600/20 active:scale-95 disabled:opacity-50"
                  >
                    <mat-icon class="text-sm">cancel</mat-icon>
                    <span>Reject Review</span>
                  </button>
                }

                <button
                  type="button"
                  (click)="deleteReview(review)"
                  [disabled]="processingId() === review.id"
                  class="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer border-none active:scale-95 disabled:opacity-50"
                >
                  <mat-icon class="text-sm">delete_forever</mat-icon>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminReviewsTabComponent implements OnInit {
  @Input({ required: true }) admin!: AdminPanel;

  api = inject(ApiService);
  toast = inject(ToastService);

  reviews = signal<AdminReviewItem[]>([]);
  loading = signal(true);
  processingId = signal<string | null>(null);

  selectedStatusFilter = signal<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  ratingFilter = signal<string>('ALL');
  searchQuery = signal<string>('');

  pendingCount = computed(() => this.reviews().filter((r) => r.status === 'PENDING').length);
  approvedCount = computed(() => this.reviews().filter((r) => r.status === 'APPROVED').length);
  rejectedCount = computed(() => this.reviews().filter((r) => r.status === 'REJECTED').length);

  filteredReviews = computed(() => {
    let list = this.reviews();

    // 1. Filter by Status
    const status = this.selectedStatusFilter();
    if (status !== 'ALL') {
      list = list.filter((r) => r.status === status);
    }

    // 2. Filter by Rating
    const rating = this.ratingFilter();
    if (rating !== 'ALL') {
      const numRating = parseInt(rating, 10);
      list = list.filter((r) => r.rating === numRating);
    }

    // 3. Filter by Search Query
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.userName.toLowerCase().includes(q) ||
          r.userEmail.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.comment.toLowerCase().includes(q)
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.fetchReviews();
  }

  fetchReviews(): void {
    this.loading.set(true);
    this.api.get<{ success: boolean; data: AdminReviewItem[] }>('/admin/reviews').subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.reviews.set(res.data);
        } else {
          this.reviews.set([]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[AdminReviewsTab] Failed to load reviews:', err);
        this.toast.error(err.error?.error || 'Failed to load customer reviews');
        this.loading.set(false);
      },
    });
  }

  approveReview(review: AdminReviewItem): void {
    this.processingId.set(review.id);
    this.api.post(`/admin/reviews/${review.id}/approve`, {}).subscribe({
      next: (res: any) => {
        this.toast.success(`Review for "${review.productName}" approved and live!`);
        this.reviews.update((list) =>
          list.map((r) => (r.id === review.id ? { ...r, status: 'APPROVED' } : r))
        );
        this.processingId.set(null);
      },
      error: (err: any) => {
        console.error('[AdminReviewsTab] Approve error:', err);
        this.toast.error(err.error?.error || 'Failed to approve review');
        this.processingId.set(null);
      },
    });
  }

  rejectReview(review: AdminReviewItem): void {
    this.processingId.set(review.id);
    this.api.post(`/admin/reviews/${review.id}/reject`, {}).subscribe({
      next: (res: any) => {
        this.toast.info(`Review for "${review.productName}" rejected.`);
        this.reviews.update((list) =>
          list.map((r) => (r.id === review.id ? { ...r, status: 'REJECTED' } : r))
        );
        this.processingId.set(null);
      },
      error: (err: any) => {
        console.error('[AdminReviewsTab] Reject error:', err);
        this.toast.error(err.error?.error || 'Failed to reject review');
        this.processingId.set(null);
      },
    });
  }

  deleteReview(review: AdminReviewItem): void {
    if (!confirm(`Are you sure you want to permanently delete this review for "${review.productName}"?`)) {
      return;
    }

    this.processingId.set(review.id);
    this.api.delete(`/admin/reviews/${review.id}`).subscribe({
      next: (res: any) => {
        this.toast.success(`Review deleted successfully.`);
        this.reviews.update((list) => list.filter((r) => r.id !== review.id));
        this.processingId.set(null);
      },
      error: (err: any) => {
        console.error('[AdminReviewsTab] Delete error:', err);
        this.toast.error(err.error?.error || 'Failed to delete review');
        this.processingId.set(null);
      },
    });
  }

  rebuildRatings(): void {
    this.api.post('/admin/reviews/rebuild-ratings', {}).subscribe({
      next: (res: any) => {
        this.toast.success(res.message || 'Product ratings recalculated!');
      },
      error: (err: any) => {
        this.toast.error('Failed to recalculate ratings');
      },
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }
}
