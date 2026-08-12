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

// Client-side helper to clean and extract title, comment, and images if stringified JSON is passed
function cleanReviewPayload(item: AdminReviewItem): AdminReviewItem {
  let title = item.title || 'Verified Review';
  let comment = item.comment || '';
  let images: string[] = Array.isArray(item.images) ? [...item.images] : [];
  const finalStatus: 'APPROVED' | 'PENDING' | 'REJECTED' = ((item.status as string) || 'PENDING').toUpperCase() as any;

  const rawComment = (item.comment || '').trim();
  const rawTitle = (item.title || '').trim();

  // Helper to parse JSON string
  const parseJsonStr = (str: string) => {
    if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
      try {
        return JSON.parse(str);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  // 1. Try parsing comment
  let p = parseJsonStr(rawComment) || parseJsonStr(rawTitle);
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    if (p.title && typeof p.title === 'string') title = p.title;
    if (p.comment || p.review || p.text || p.message) {
      comment = p.comment || p.review || p.text || p.message;
    }
    if (Array.isArray(p.images) && p.images.length > 0) {
      images = p.images.filter((img: any) => typeof img === 'string' && img.length > 0);
    }
  }

  // 2. If comment is still a JSON string, try 2nd level extraction
  if (comment && (comment.trim().startsWith('{') || comment.trim().startsWith('['))) {
    const p2 = parseJsonStr(comment.trim());
    if (p2 && typeof p2 === 'object') {
      if (p2.comment || p2.review || p2.text) {
        comment = p2.comment || p2.review || p2.text;
      }
      if (p2.title && typeof p2.title === 'string') title = p2.title;
      if (Array.isArray(p2.images) && p2.images.length > 0 && images.length === 0) {
        images = p2.images;
      }
    }
  }

  // Fallback if comment is stringified JSON containing regex key
  if (comment.includes('"comment"')) {
    const match = comment.match(/"comment"\s*:\s*"([^"]+)"/);
    if (match && match[1]) {
      comment = match[1];
    }
  }

  return {
    ...item,
    title: title || 'Verified Review',
    comment: comment || 'No comment text provided.',
    images: images.filter((img) => typeof img === 'string' && img.trim().length > 0),
    status: finalStatus,
  };
}

@Component({
  selector: 'app-admin-reviews-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fadeIn animate-duration-300 font-sans pb-12">
      
      <!-- PAGE HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
        <div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <h1 class="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white font-display">
              Customer Reviews
            </h1>
            <span class="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono font-bold rounded-full border border-blue-500/20">
              {{ reviews().length }} Total
            </span>
            @if (pendingCount() > 0) {
              <span class="px-3 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold rounded-full border border-amber-500/30 animate-pulse flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                {{ pendingCount() }} Action Required
              </span>
            }
          </div>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Review, moderate, and approve customer ratings and submitted product feedback across your store.
          </p>
        </div>

        <div class="flex items-center gap-2.5">
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

      <!-- SUMMARY METRIC CARDS -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <!-- Total Reviews -->
        <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3.5 shadow-xs">
          <div class="h-11 w-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <mat-icon class="scale-110">rate_review</mat-icon>
          </div>
          <div>
            <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Total Reviews</span>
            <span class="text-xl font-black text-zinc-900 dark:text-white font-mono">{{ reviews().length }}</span>
          </div>
        </div>

        <!-- Pending Moderation -->
        <div class="p-4 bg-white dark:bg-zinc-900 border border-amber-500/30 dark:border-amber-500/30 bg-amber-500/5 rounded-2xl flex items-center gap-3.5 shadow-xs relative overflow-hidden">
          @if (pendingCount() > 0) {
            <div class="absolute top-0 right-0 h-2 w-2 bg-amber-500 rounded-full animate-ping m-2"></div>
          }
          <div class="h-11 w-11 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <mat-icon class="scale-110">hourglass_empty</mat-icon>
          </div>
          <div>
            <span class="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block">Pending Approval</span>
            <span class="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">{{ pendingCount() }}</span>
          </div>
        </div>

        <!-- Approved -->
        <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3.5 shadow-xs">
          <div class="h-11 w-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <mat-icon class="scale-110">check_circle</mat-icon>
          </div>
          <div>
            <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Approved & Live</span>
            <span class="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{{ approvedCount() }}</span>
          </div>
        </div>

        <!-- Rejected -->
        <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3.5 shadow-xs">
          <div class="h-11 w-11 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <mat-icon class="scale-110">cancel</mat-icon>
          </div>
          <div>
            <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Rejected</span>
            <span class="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">{{ rejectedCount() }}</span>
          </div>
        </div>
      </div>

      <!-- FILTER & SEARCH TOOLBAR -->
      <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4 shadow-xs">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          
          <!-- Status Tabs -->
          <div class="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
            <button
              type="button"
              (click)="selectedStatusFilter.set('ALL')"
              [class]="selectedStatusFilter() === 'ALL'
                ? 'px-3.5 py-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg text-xs font-black uppercase shadow-xs'
                : 'px-3.5 py-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-bold uppercase cursor-pointer'"
            >
              All ({{ reviews().length }})
            </button>
            <button
              type="button"
              (click)="selectedStatusFilter.set('PENDING')"
              [class]="selectedStatusFilter() === 'PENDING'
                ? 'px-3.5 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-black uppercase shadow-xs flex items-center gap-1.5'
                : 'px-3.5 py-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer'"
            >
              <span>Pending</span>
              @if (pendingCount() > 0) {
                <span class="px-1.5 py-0.2 bg-amber-700 text-white text-[9px] font-black rounded-full font-mono">{{ pendingCount() }}</span>
              }
            </button>
            <button
              type="button"
              (click)="selectedStatusFilter.set('APPROVED')"
              [class]="selectedStatusFilter() === 'APPROVED'
                ? 'px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase shadow-xs'
                : 'px-3.5 py-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-bold uppercase cursor-pointer'"
            >
              Approved ({{ approvedCount() }})
            </button>
            <button
              type="button"
              (click)="selectedStatusFilter.set('REJECTED')"
              [class]="selectedStatusFilter() === 'REJECTED'
                ? 'px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-black uppercase shadow-xs'
                : 'px-3.5 py-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-bold uppercase cursor-pointer'"
            >
              Rejected ({{ rejectedCount() }})
            </button>
          </div>

          <!-- Search & Rating Dropdowns -->
          <div class="flex items-center gap-3 w-full md:w-auto">
            <!-- Search Box -->
            <div class="relative flex-1 md:w-64">
              <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">search</mat-icon>
              <input
                type="text"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                placeholder="Search product, customer, title..."
                class="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-500 transition-colors"
              />
              @if (searchQuery()) {
                <button
                  (click)="searchQuery.set('')"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <mat-icon class="text-sm">close</mat-icon>
                </button>
              }
            </div>

            <!-- Star Rating Dropdown Filter -->
            <select
              [ngModel]="ratingFilter()"
              (ngModelChange)="ratingFilter.set($event)"
              class="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-700 dark:text-zinc-300 cursor-pointer"
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

      <!-- REVIEWS LISTING -->
      @if (loading()) {
        <div class="p-16 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-3 shadow-xs">
          <div class="h-9 w-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading Customer Feedback...</p>
        </div>
      } @else if (filteredReviews().length === 0) {
        <div class="p-16 text-center bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-4 shadow-xs">
          <div class="h-16 w-16 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl flex items-center justify-center mx-auto text-zinc-400">
            <mat-icon class="text-3xl">rate_review</mat-icon>
          </div>
          <div>
            <h3 class="text-base font-black uppercase text-zinc-900 dark:text-white">No Reviews Found</h3>
            <p class="text-xs text-zinc-400 mt-1 max-w-md mx-auto">No customer reviews match your active filter criteria.</p>
          </div>
          @if (searchQuery() || selectedStatusFilter() !== 'ALL' || ratingFilter() !== 'ALL') {
            <button
              (click)="searchQuery.set(''); selectedStatusFilter.set('ALL'); ratingFilter.set('ALL')"
              class="px-4 py-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 rounded-xl text-xs font-bold uppercase transition-colors border-none cursor-pointer"
            >
              Reset All Filters
            </button>
          }
        </div>
      } @else {
        <div class="space-y-4">
          @for (review of filteredReviews(); track review.id) {
            <div
              class="p-5 bg-white dark:bg-zinc-900 border rounded-3xl space-y-4 transition-all shadow-xs hover:shadow-md"
              [ngClass]="{
                'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/5': review.status === 'PENDING',
                'border-zinc-200/80 dark:border-zinc-800': review.status !== 'PENDING'
              }"
            >
              <!-- 1. TOP HEADER ROW: Product Info & Status Badge -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                
                <!-- Product Details -->
                <div class="flex items-center gap-3">
                  <div class="h-12 w-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-hidden shrink-0 flex items-center justify-center p-1">
                    <img
                      [src]="review.productImage"
                      [alt]="review.productName"
                      class="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-white font-display">
                        {{ review.productName }}
                      </h3>
                      @if (review.productSlug) {
                        <a
                          [href]="'/product/' + review.productSlug"
                          target="_blank"
                          class="text-zinc-400 hover:text-orange-500 transition-colors flex items-center"
                          title="View Product Page"
                        >
                          <mat-icon class="text-xs">open_in_new</mat-icon>
                        </a>
                      }
                    </div>
                    <span class="text-[10px] text-zinc-400 font-mono">Product ID: {{ review.productId }}</span>
                  </div>
                </div>

                <!-- Review Status Badge & Date -->
                <div class="flex items-center gap-2.5">
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

              <!-- 2. CUSTOMER INFO & STAR RATING ROW -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                
                <!-- Reviewer User Profile -->
                <div class="flex items-center gap-3">
                  <div class="h-9 w-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center text-xs font-black uppercase shadow-xs shrink-0 font-mono">
                    {{ review.userName.slice(0, 2) }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-black text-zinc-900 dark:text-white">{{ review.userName }}</span>
                      <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold rounded-md flex items-center gap-1 border border-emerald-500/20">
                        <mat-icon class="text-[10px] w-2.5 h-2.5 flex items-center justify-center">verified</mat-icon>
                        Verified Purchaser
                      </span>
                    </div>
                    <div class="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                      @if (review.userEmail) { <span>{{ review.userEmail }}</span> }
                      @if (review.userMobile) { <span>• {{ review.userMobile }}</span> }
                    </div>
                  </div>
                </div>

                <!-- Star Rating Display -->
                <div class="flex items-center gap-1 bg-amber-500/5 dark:bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                  <div class="flex items-center text-amber-400">
                    @for (star of [1, 2, 3, 4, 5]; track star) {
                      <mat-icon
                        class="text-sm scale-90"
                        [class.text-amber-400]="star <= review.rating"
                        [class.text-zinc-200]="star > review.rating"
                        [class.dark:text-zinc-800]="star > review.rating"
                      >
                        {{ star <= review.rating ? 'star' : 'star_border' }}
                      </mat-icon>
                    }
                  </div>
                  <span class="text-xs font-black text-amber-600 dark:text-amber-400 ml-1 font-mono">{{ review.rating }}.0</span>
                </div>
              </div>

              <!-- 3. CLEAN REVIEW TITLE & COMMENT BODY BOX -->
              <div class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
                @if (review.title && review.title !== 'Verified Review') {
                  <h4 class="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wide">
                    {{ review.title }}
                  </h4>
                }
                <p class="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {{ review.comment }}
                </p>

                <!-- Attached Photos Gallery -->
                @if (review.images && review.images.length > 0) {
                  <div class="pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-1.5">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Customer Customer Attachments ({{ review.images.length }}):
                    </span>
                    <div class="flex items-center gap-2.5 flex-wrap">
                      @for (img of review.images; track $index) {
                        <div
                          (click)="lightboxImage.set(img)"
                          class="relative group h-16 w-16 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer shadow-xs hover:shadow-md transition-all duration-200"
                        >
                          <img
                            [src]="img"
                            alt="Customer Attachment"
                            class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <mat-icon class="text-sm">zoom_in</mat-icon>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- 4. ACTION BUTTONS: APPROVE, REJECT, DELETE -->
              <div class="flex items-center justify-end gap-2.5 pt-1">
                @if (review.status === 'PENDING') {
                  <button
                    type="button"
                    (click)="approveReview(review)"
                    [disabled]="processingId() === review.id"
                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                  >
                    <mat-icon class="text-sm">check_circle</mat-icon>
                    <span>Approve Review</span>
                  </button>

                  <button
                    type="button"
                    (click)="rejectReview(review)"
                    [disabled]="processingId() === review.id"
                    class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none shadow-md shadow-amber-600/20 active:scale-95 disabled:opacity-50"
                  >
                    <mat-icon class="text-sm">cancel</mat-icon>
                    <span>Reject Review</span>
                  </button>
                } @else if (review.status === 'APPROVED') {
                  <button
                    type="button"
                    (click)="rejectReview(review)"
                    [disabled]="processingId() === review.id"
                    class="px-3 py-1.5 bg-zinc-100 hover:bg-rose-500/10 text-zinc-600 hover:text-rose-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:text-rose-400 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-200 dark:border-zinc-700 active:scale-95 disabled:opacity-50"
                    title="Change status to Rejected"
                  >
                    <mat-icon class="text-sm">block</mat-icon>
                    <span>Reject</span>
                  </button>
                } @else if (review.status === 'REJECTED') {
                  <button
                    type="button"
                    (click)="approveReview(review)"
                    [disabled]="processingId() === review.id"
                    class="px-3 py-1.5 bg-zinc-100 hover:bg-emerald-500/10 text-zinc-600 hover:text-emerald-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:text-emerald-400 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-200 dark:border-zinc-700 active:scale-95 disabled:opacity-50"
                    title="Change status to Approved"
                  >
                    <mat-icon class="text-sm">check_circle</mat-icon>
                    <span>Approve</span>
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

      <!-- LIGHTBOX MODAL FOR ATTACHED REVIEW IMAGES -->
      @if (lightboxImage()) {
        <div
          class="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          (click)="lightboxImage.set(null)"
        >
          <div
            class="relative max-w-3xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden p-2 shadow-2xl space-y-2"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
              <span class="text-xs font-bold text-zinc-300">Customer Submitted Attachment</span>
              <button
                (click)="lightboxImage.set(null)"
                class="h-7 w-7 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer border-none"
              >
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            </div>
            <img
              [src]="lightboxImage()"
              alt="Full Preview"
              class="max-h-[75vh] w-auto mx-auto object-contain rounded-2xl"
            />
          </div>
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
  lightboxImage = signal<string | null>(null);

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
          const cleaned = res.data.map((item) => cleanReviewPayload(item));
          this.reviews.set(cleaned);
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
