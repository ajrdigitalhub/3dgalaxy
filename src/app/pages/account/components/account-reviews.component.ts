import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

export interface CustomerReviewItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  status: string; // 'APPROVED' | 'PENDING' | 'REJECTED'
  adminRemarks?: string | null;
  verified: boolean;
  orderId?: string | null;
  createdAt: string;
  updatedAt: string;
  helpfulCount: number;
}

@Component({
  selector: 'app-account-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 p-5 sm:p-8 shadow-xs backdrop-blur space-y-6">
      
      <!-- Top Title Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-5">
        <div>
          <div class="flex items-center gap-2">
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Customer Feedback Center</p>
          </div>
          <h2 class="mt-1 text-2xl font-black tracking-tight text-neutral-950 dark:text-white">
            My Reviews & Ratings
          </h2>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage your feedback, track review status, and edit or update your product ratings.
          </p>
        </div>

        <button
          type="button"
          (click)="fetchReviews()"
          class="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer border-none"
        >
          <mat-icon class="scale-75 text-[16px]">refresh</mat-icon>
          <span>Refresh</span>
        </button>
      </div>

      <!-- Summary Statistics Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <!-- Total Reviews -->
        <div class="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40 p-4 flex flex-col justify-between space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-neutral-400">Total Reviews</span>
            <div class="h-7 w-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <mat-icon class="scale-75 text-[16px]">rate_review</mat-icon>
            </div>
          </div>
          <p class="text-2xl font-black text-neutral-950 dark:text-white font-mono">
            {{ totalReviews() }}
          </p>
        </div>

        <!-- Approved -->
        <div class="rounded-2xl border border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col justify-between space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Approved</span>
            <div class="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <mat-icon class="scale-75 text-[16px]">check_circle</mat-icon>
            </div>
          </div>
          <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {{ approvedCount() }}
          </p>
        </div>

        <!-- Under Review / Pending -->
        <div class="rounded-2xl border border-amber-500/20 dark:border-amber-500/30 bg-amber-500/5 p-4 flex flex-col justify-between space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Under Review</span>
            <div class="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <mat-icon class="scale-75 text-[16px]">hourglass_empty</mat-icon>
            </div>
          </div>
          <p class="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {{ pendingCount() }}
          </p>
        </div>

        <!-- Rejected -->
        <div class="rounded-2xl border border-rose-500/20 dark:border-rose-500/30 bg-rose-500/5 p-4 flex flex-col justify-between space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Rejected</span>
            <div class="h-7 w-7 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <mat-icon class="scale-75 text-[16px]">cancel</mat-icon>
            </div>
          </div>
          <p class="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {{ rejectedCount() }}
          </p>
        </div>

        <!-- Avg Rating Given -->
        <div class="col-span-2 sm:col-span-1 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40 p-4 flex flex-col justify-between space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-neutral-400">Avg Rating</span>
            <div class="h-7 w-7 rounded-lg bg-amber-400/20 text-amber-500 flex items-center justify-center">
              <mat-icon class="scale-75 text-[16px]">star</mat-icon>
            </div>
          </div>
          <div class="flex items-baseline gap-1">
            <p class="text-2xl font-black text-neutral-950 dark:text-white font-mono">
              {{ avgRating() }}
            </p>
            <span class="text-xs text-amber-400 font-bold">★</span>
          </div>
        </div>
      </div>

      <!-- Search, Filtering, Sorting Controls -->
      <div class="flex flex-col gap-3 pt-2">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          <!-- Search Input -->
          <div class="relative w-full lg:w-80">
            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 scale-75">search</mat-icon>
            <input
              type="text"
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)"
              placeholder="Search product name, title, or order ID..."
              class="w-full h-10 pl-9 pr-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
          </div>

          <div class="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <!-- Star Filter -->
            <select
              [value]="starFilter()"
              (change)="starFilter.set($any($event.target).value)"
              class="h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="all">All Stars</option>
              <option value="5">5 Stars (★★★★★)</option>
              <option value="4">4 Stars (★★★★☆)</option>
              <option value="3">3 Stars (★★★☆☆)</option>
              <option value="2">2 Stars (★★☆☆☆)</option>
              <option value="1">1 Star (★☆☆☆☆)</option>
            </select>

            <!-- Sort Dropdown -->
            <select
              [value]="sortBy()"
              (change)="sortBy.set($any($event.target).value)"
              class="h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="rating-high">Highest Rating</option>
              <option value="rating-low">Lowest Rating</option>
            </select>

            <!-- Page Size -->
            <select
              [value]="pageSize()"
              (change)="pageSize.set(+$any($event.target).value); currentPage.set(1)"
              class="h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option [value]="10">10 per page</option>
              <option [value]="20">20 per page</option>
              <option [value]="50">50 per page</option>
            </select>
          </div>
        </div>

        <!-- Status Filter Tabs -->
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            (click)="statusFilter.set('all'); currentPage.set(1)"
            [class]="(statusFilter() === 'all' ? 'bg-orange-500 text-white shadow-xs' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700') + ' h-8 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer shrink-0'"
          >
            All Reviews ({{ reviews().length }})
          </button>
          <button
            type="button"
            (click)="statusFilter.set('APPROVED'); currentPage.set(1)"
            [class]="(statusFilter() === 'APPROVED' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700') + ' h-8 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer shrink-0 flex items-center gap-1.5'"
          >
            <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
            Approved ({{ approvedCount() }})
          </button>
          <button
            type="button"
            (click)="statusFilter.set('PENDING'); currentPage.set(1)"
            [class]="(statusFilter() === 'PENDING' ? 'bg-amber-600 text-white shadow-xs' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700') + ' h-8 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer shrink-0 flex items-center gap-1.5'"
          >
            <span class="h-2 w-2 rounded-full bg-amber-400"></span>
            Under Review ({{ pendingCount() }})
          </button>
          <button
            type="button"
            (click)="statusFilter.set('REJECTED'); currentPage.set(1)"
            [class]="(statusFilter() === 'REJECTED' ? 'bg-rose-600 text-white shadow-xs' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700') + ' h-8 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer shrink-0 flex items-center gap-1.5'"
          >
            <span class="h-2 w-2 rounded-full bg-rose-400"></span>
            Rejected ({{ rejectedCount() }})
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="space-y-4 py-2">
          @for (item of [1,2,3]; track item) {
            <div class="h-44 animate-pulse rounded-2xl bg-neutral-200/80 dark:bg-neutral-800"></div>
          }
        </div>
      } @else if (errorMsg()) {
        <!-- Error State -->
        <div class="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center text-rose-600 dark:text-rose-400 space-y-3">
          <mat-icon class="text-4xl">error_outline</mat-icon>
          <p class="font-bold text-sm">{{ errorMsg() }}</p>
          <button (click)="fetchReviews()" class="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold uppercase tracking-wider border-none cursor-pointer">Try Again</button>
        </div>
      } @else if (filteredAndSortedReviews().length === 0) {
        <!-- Empty State -->
        <div class="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950/70 p-12 text-center space-y-4">
          <div class="w-16 h-16 rounded-full bg-orange-500/10 text-orange-500 mx-auto flex items-center justify-center">
            <mat-icon class="text-4xl">rate_review</mat-icon>
          </div>
          <div>
            <h3 class="text-lg font-black text-neutral-950 dark:text-white">
              {{ reviews().length === 0 ? 'No reviews submitted yet' : 'No matching reviews found' }}
            </h3>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              {{ reviews().length === 0 ? 'Share your experience on products you purchased to help other makers!' : 'Try adjusting your search criteria or status filter.' }}
            </p>
          </div>
          @if (reviews().length === 0) {
            <a
              routerLink="/products"
              class="inline-block rounded-xl bg-orange-500 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 no-underline transition-all"
            >
              Browse Shop Products
            </a>
          }
        </div>
      } @else {
        <!-- Review Cards List -->
        <div class="space-y-4">
          @for (review of paginatedReviews(); track review.id) {
            <article class="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-150 relative space-y-4">
              
              <!-- Review Card Header -->
              <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
                <!-- Product Information -->
                <div class="flex items-center gap-3 min-w-0">
                  <a [routerLink]="['/products', review.productSlug]" class="h-14 w-14 shrink-0 rounded-xl border border-neutral-200/80 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 p-1 flex items-center justify-center overflow-hidden group">
                    <img [src]="review.productImage" [alt]="review.productName" class="h-full w-full object-contain group-hover:scale-105 transition-transform duration-150" />
                  </a>

                  <div class="min-w-0">
                    <h3 class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                      <a [routerLink]="['/products', review.productSlug]" class="hover:text-orange-500 transition-colors">
                        {{ review.productName }}
                      </a>
                    </h3>

                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                      <!-- Star Rating -->
                      <div class="flex items-center text-amber-400">
                        @for (star of [1,2,3,4,5]; track star) {
                          <mat-icon class="scale-75 -ml-1 text-[16px] w-4 h-4 flex items-center justify-center">
                            {{ star <= review.rating ? 'star' : 'star_border' }}
                          </mat-icon>
                        }
                        <span class="text-xs font-black text-neutral-800 dark:text-neutral-200 ml-1">{{ review.rating }}.0</span>
                      </div>

                      <!-- Verified Purchase Badge -->
                      @if (review.verified) {
                        <span class="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <mat-icon class="scale-75 text-[12px]">verified</mat-icon>
                          <span>Verified Purchase</span>
                        </span>
                      }

                      <!-- Order ID badge -->
                      @if (review.orderId) {
                        <span class="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                          Order #{{ review.orderId }}
                        </span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Status Badge & Date -->
                <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  <span
                    [ngClass]="getStatusBadgeClass(review.status)"
                    class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
                    <span>{{ getStatusLabel(review.status) }}</span>
                  </span>

                  <span class="text-[10px] font-medium text-neutral-400">
                    {{ formatDate(review.createdAt) }}
                  </span>
                </div>
              </div>

              <!-- Review Body -->
              <div class="space-y-2">
                @if (review.title) {
                  <h4 class="text-xs sm:text-sm font-extrabold text-neutral-900 dark:text-white">
                    "{{ review.title }}"
                  </h4>
                }
                <p class="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                  {{ review.comment }}
                </p>
              </div>

              <!-- Review Images Grid -->
              @if (review.images && review.images.length > 0) {
                <div class="pt-2">
                  <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Attached Photos</p>
                  <div class="flex items-center gap-2 flex-wrap">
                    @for (imgUrl of review.images; track imgUrl; let imgIdx = $index) {
                      <button
                        type="button"
                        (click)="openLightbox(imgUrl)"
                        class="h-14 w-14 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 overflow-hidden relative group cursor-pointer p-0"
                      >
                        <img [src]="imgUrl" [alt]="'Review image ' + (imgIdx + 1)" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-150" />
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <mat-icon class="scale-75">zoom_in</mat-icon>
                        </div>
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- Review Timeline Bar -->
              <div class="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-[10px] font-bold text-neutral-400">
                <span class="text-emerald-500">Submitted {{ formatDate(review.createdAt) }}</span>
                <span>➔</span>
                <span [ngClass]="review.status === 'APPROVED' ? 'text-emerald-500' : review.status === 'REJECTED' ? 'text-rose-500' : 'text-amber-500'">
                  {{ review.status === 'APPROVED' ? 'Approved & Published' : review.status === 'REJECTED' ? 'Rejected' : 'Under Review' }}
                </span>
              </div>

              <!-- Admin / Seller Remarks -->
              @if (review.adminRemarks) {
                <div class="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs space-y-1">
                  <p class="font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <mat-icon class="scale-75 text-[14px]">storefront</mat-icon>
                    <span>Seller Response / Remarks</span>
                  </p>
                  <p class="text-neutral-700 dark:text-neutral-300 italic">{{ review.adminRemarks }}</p>
                </div>
              }

              <!-- Card Action Buttons -->
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                <a
                  [routerLink]="['/products', review.productSlug]"
                  class="h-8 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 no-underline"
                >
                  <mat-icon class="scale-75 text-[14px]">visibility</mat-icon>
                  <span>View Product</span>
                </a>

                <button
                  type="button"
                  (click)="openEditModal(review)"
                  class="h-8 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[11px] font-extrabold uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-1"
                >
                  <mat-icon class="scale-75 text-[14px]">edit</mat-icon>
                  <span>Edit Review</span>
                </button>

                <button
                  type="button"
                  (click)="confirmDelete(review)"
                  class="h-8 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-extrabold uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-1"
                >
                  <mat-icon class="scale-75 text-[14px]">delete</mat-icon>
                  <span>Delete</span>
                </button>
              </div>

            </article>
          }
        </div>

        <!-- Pagination Controls -->
        @if (totalPages() > 1) {
          <div class="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <span class="text-xs text-neutral-500">
              Page {{ currentPage() }} of {{ totalPages() }} ({{ filteredAndSortedReviews().length }} total)
            </span>

            <div class="flex items-center gap-2">
              <button
                type="button"
                [disabled]="currentPage() <= 1"
                (click)="prevPage()"
                class="h-8 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold disabled:opacity-50 border-none cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                [disabled]="currentPage() >= totalPages()"
                (click)="nextPage()"
                class="h-8 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold disabled:opacity-50 border-none cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        }
      }

    </div>

    <!-- Edit Review Modal Dialog -->
    @if (editingReview()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div class="w-full max-w-lg rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 class="text-base font-black text-neutral-950 dark:text-white">Edit Your Review</h3>
            <button (click)="editingReview.set(null)" class="text-neutral-400 hover:text-rose-500 border-none bg-transparent cursor-pointer">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="editForm" (ngSubmit)="saveReviewEdit()" class="space-y-4">
            <!-- Rating Selection -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Rating</label>
              <div class="flex items-center gap-1 text-amber-400 cursor-pointer">
                @for (star of [1,2,3,4,5]; track star) {
                  <mat-icon
                    (click)="editForm.patchValue({ rating: star })"
                    class="scale-110 text-[22px] w-6 h-6 flex items-center justify-center hover:scale-125 transition-transform"
                  >
                    {{ star <= editForm.value.rating ? 'star' : 'star_border' }}
                  </mat-icon>
                }
              </div>
            </div>

            <!-- Title Input -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Review Title</label>
              <input
                type="text"
                formControlName="title"
                class="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <!-- Comment Input -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Review Comments</label>
              <textarea
                formControlName="comment"
                rows="4"
                class="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
              ></textarea>
            </div>

            <!-- Modal Action Buttons -->
            <div class="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                (click)="editingReview.set(null)"
                class="h-9 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold uppercase tracking-wider border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="editForm.invalid || isSubmittingEdit()"
                class="h-9 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/20 border-none cursor-pointer disabled:opacity-50"
              >
                {{ isSubmittingEdit() ? 'Saving...' : 'Update Review' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Image Lightbox Preview Modal -->
    @if (lightboxImage()) {
      <div (click)="lightboxImage.set(null)" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer">
        <div class="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl" (click)="$event.stopPropagation()">
          <img [src]="lightboxImage()" alt="Review Preview" class="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
          <button (click)="lightboxImage.set(null)" class="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center border-none cursor-pointer">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
    }
  `
})
export class AccountReviewsComponent implements OnInit {
  api = inject(ApiService);
  toastService = inject(ToastService);
  fb = inject(FormBuilder);

  onReviewChanged = output<void>();

  reviews = signal<CustomerReviewItem[]>([]);
  isLoading = signal<boolean>(true);
  errorMsg = signal<string | null>(null);

  // Filters and Pagination Signals
  searchQuery = signal<string>('');
  statusFilter = signal<string>('all');
  starFilter = signal<string>('all');
  sortBy = signal<string>('newest');
  pageSize = signal<number>(10);
  currentPage = signal<number>(1);

  // Modal Signals
  editingReview = signal<CustomerReviewItem | null>(null);
  lightboxImage = signal<string | null>(null);
  isSubmittingEdit = signal<boolean>(false);

  editForm: FormGroup = this.fb.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    title: ['', Validators.required],
    comment: ['', Validators.required],
  });

  // Summary Computations
  totalReviews = computed(() => this.reviews().length);

  approvedCount = computed(() =>
    this.reviews().filter((r) => (r.status || '').toUpperCase() === 'APPROVED').length
  );

  pendingCount = computed(() =>
    this.reviews().filter((r) => (r.status || '').toUpperCase() === 'PENDING').length
  );

  rejectedCount = computed(() =>
    this.reviews().filter((r) => (r.status || '').toUpperCase() === 'REJECTED').length
  );

  avgRating = computed(() => {
    const list = this.reviews();
    if (list.length === 0) return '0.0';
    const sum = list.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / list.length).toFixed(1);
  });

  // Computed Filtered & Sorted List
  filteredAndSortedReviews = computed(() => {
    let list = [...this.reviews()];
    const query = this.searchQuery().trim().toLowerCase();

    // 1. Search Query
    if (query) {
      list = list.filter(
        (r) =>
          r.productName.toLowerCase().includes(query) ||
          (r.title && r.title.toLowerCase().includes(query)) ||
          (r.comment && r.comment.toLowerCase().includes(query)) ||
          (r.orderId && r.orderId.toLowerCase().includes(query))
      );
    }

    // 2. Status Filter
    const st = this.statusFilter();
    if (st !== 'all') {
      list = list.filter((r) => (r.status || '').toUpperCase() === st);
    }

    // 3. Star Rating Filter
    const star = this.starFilter();
    if (star !== 'all') {
      const num = parseInt(star, 10);
      list = list.filter((r) => r.rating === num);
    }

    // 4. Sorting
    const sort = this.sortBy();
    if (sort === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sort === 'rating-high') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'rating-low') {
      list.sort((a, b) => a.rating - b.rating);
    }

    return list;
  });

  // Paginated List Computation
  paginatedReviews = computed(() => {
    const list = this.filteredAndSortedReviews();
    const size = this.pageSize();
    const page = this.currentPage();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  totalPages = computed(() => {
    const total = this.filteredAndSortedReviews().length;
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  ngOnInit() {
    this.fetchReviews();
  }

  parseReviewItem(item: any): CustomerReviewItem {
    let title = item.title || 'Verified Review';
    let comment = item.comment || item.reviewText || '';
    let images: string[] = Array.isArray(item.images) ? item.images : [];
    let status = item.status || 'APPROVED';
    let adminRemarks = item.adminRemarks || item.sellerReply || null;

    let textToParse = typeof comment === 'string' ? comment.trim() : '';
    if (!textToParse && typeof item.reviewText === 'string') {
      textToParse = item.reviewText.trim();
    }

    if (textToParse.startsWith('{') || textToParse.startsWith('[')) {
      try {
        const parsed = JSON.parse(textToParse);
        if (parsed && typeof parsed === 'object') {
          title = parsed.title || title;
          if (parsed.comment || parsed.review || parsed.text) {
            comment = parsed.comment || parsed.review || parsed.text;
          }
          if (Array.isArray(parsed.images) && parsed.images.length > 0) {
            images = parsed.images;
          }
          if (parsed.status) status = parsed.status;
          if (parsed.adminRemarks) adminRemarks = parsed.adminRemarks;
        }
      } catch (e) {}
    }

    if (typeof comment === 'string' && comment.trim().startsWith('{')) {
      try {
        const reParsed = JSON.parse(comment.trim());
        if (reParsed && typeof reParsed === 'object') {
          title = reParsed.title || title;
          comment = reParsed.comment || reParsed.review || reParsed.text || 'Nice product!';
          if (Array.isArray(reParsed.images) && reParsed.images.length > 0) {
            images = reParsed.images;
          }
        }
      } catch (e) {}
    }

    let img = item.productImage || item.product_image || item.product?.primaryImage || item.product?.thumbnail;
    if (!img || typeof img !== 'string' || img.includes('undefined') || img.trim().length === 0 || img === 'https://via.placeholder.com/300x300?text=Product') {
      img = 'https://picsum.photos/seed/' + (item.productSlug || item.productId || '3dgalaxy') + '/300/300';
    }

    return {
      ...item,
      title: title || 'Verified Review',
      comment: comment || 'Great product!',
      images: Array.isArray(images) ? images : [],
      productImage: img,
      status: (status || 'APPROVED').toUpperCase(),
      adminRemarks
    };
  }

  fetchReviews() {
    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.api.get<any>('/customer/reviews').subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const data = Array.isArray(res) ? res : res?.data || [];
        const parsed = data.map((item: any) => this.parseReviewItem(item));
        this.reviews.set(parsed);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.reviews.set([]);
        this.errorMsg.set('Failed to load your review history. Please check authentication.');
      },
    });
  }

  openEditModal(review: CustomerReviewItem) {
    this.editingReview.set(review);
    this.editForm.patchValue({
      rating: review.rating || 5,
      title: review.title || '',
      comment: review.comment || '',
    });
  }

  saveReviewEdit() {
    const current = this.editingReview();
    if (!current || this.editForm.invalid) return;

    this.isSubmittingEdit.set(true);
    const { rating, title, comment } = this.editForm.value;

    this.api.put(`/customer/reviews/${current.id}`, { rating, title, comment }).subscribe({
      next: () => {
        this.isSubmittingEdit.set(false);
        this.editingReview.set(null);
        this.toastService.success('Your review has been updated!');
        this.fetchReviews();
        this.onReviewChanged.emit();
      },
      error: () => {
        this.isSubmittingEdit.set(false);
        this.toastService.error('Failed to update review. Please try again.');
      },
    });
  }

  confirmDelete(review: CustomerReviewItem) {
    if (confirm(`Are you sure you want to delete your review for "${review.productName}"?`)) {
      this.api.delete(`/customer/reviews/${review.id}`).subscribe({
        next: () => {
          this.toastService.success('Review deleted.');
          this.fetchReviews();
          this.onReviewChanged.emit();
        },
        error: () => {
          this.toastService.error('Failed to delete review.');
        },
      });
    }
  }

  openLightbox(imgUrl: string) {
    this.lightboxImage.set(imgUrl);
  }

  getStatusBadgeClass(status: string) {
    const st = (status || '').toUpperCase();
    if (st === 'APPROVED') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    if (st === 'REJECTED') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  }

  getStatusLabel(status: string) {
    const st = (status || '').toUpperCase();
    if (st === 'APPROVED') return 'Approved';
    if (st === 'REJECTED') return 'Rejected';
    return 'Under Review';
  }

  formatDate(dateStr: string) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  }
}
