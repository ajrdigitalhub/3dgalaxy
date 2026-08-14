import {
  Component,
  Input,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminPanel } from '../admin';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

export interface CustomerListItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  customerType: string;
  registrationDate: string;
  totalOrders: number;
  totalSpend: number;
  lastOrderDate: string | null;
  status: 'Active' | 'Blocked';
  profileImage: string;
}

export interface CustomerDetailProfile {
  id: string;
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage: string;
  registrationDate: string;
  customerType: string;
  status: 'Active' | 'Blocked';
  lastLogin: string | null;
  rewardPoints: number;
  gender: string;
  dateOfBirth: string | null;
  stats: {
    totalOrders: number;
    totalSpend: number;
    averageOrderValue: number;
  };
  addresses: any[];
}

@Component({
  selector: 'app-admin-customers-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300 font-sans">
      
      <!-- ========================================================================= -->
      <!-- VIEW 1: CUSTOMER LIST PAGE                                               -->
      <!-- ========================================================================= -->
      @if (admin.activeTab() === 'customer-list') {
        <div class="space-y-6">
          
          <!-- Page Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white font-display">Customer Directory</h1>
                <span class="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono font-bold rounded-full border border-blue-500/20">
                  {{ totalCustomers() }} Records
                </span>
              </div>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Manage registered buyers, guest order profiles, and segmentation tiers.
              </p>
            </div>
            
            <div class="flex flex-wrap items-center gap-2">
              <button
                (click)="admin.setActiveTab('customer-analytics')"
                class="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none shadow-xs"
              >
                <mat-icon class="text-sm text-purple-500">insights</mat-icon>
                <span>Analytics</span>
              </button>

              <button
                (click)="exportToCsv()"
                class="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none shadow-xs"
              >
                <mat-icon class="text-sm text-emerald-500">download</mat-icon>
                <span>Export CSV</span>
              </button>

              <button
                (click)="openCreateModal()"
                class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none shadow-md shadow-blue-600/20 active:scale-95"
              >
                <mat-icon class="text-sm">person_add</mat-icon>
                <span>Add Customer</span>
              </button>
            </div>
          </div>

          <!-- Quick Metrics Bar -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3">
              <div class="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <mat-icon>group</mat-icon>
              </div>
              <div>
                <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Total Directory</span>
                <span class="text-lg font-black text-zinc-900 dark:text-white">{{ totalCustomers() }}</span>
              </div>
            </div>

            <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3">
              <div class="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <mat-icon>verified_user</mat-icon>
              </div>
              <div>
                <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Active Profiles</span>
                <span class="text-lg font-black text-emerald-600 dark:text-emerald-400">{{ activeCount() }}</span>
              </div>
            </div>

            <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3">
              <div class="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <mat-icon>shopping_bag</mat-icon>
              </div>
              <div>
                <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Repeat Buyers</span>
                <span class="text-lg font-black text-zinc-900 dark:text-white">{{ repeatBuyersCount() }}</span>
              </div>
            </div>

            <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center gap-3">
              <div class="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <mat-icon>block</mat-icon>
              </div>
              <div>
                <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Blocked Users</span>
                <span class="text-lg font-black text-rose-600 dark:text-rose-400">{{ blockedCount() }}</span>
              </div>
            </div>
          </div>

          <!-- Controls & Filters Bar -->
          <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <!-- Search Input -->
              <div class="relative flex-1 max-w-md">
                <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">search</mat-icon>
                <input
                  type="text"
                  [ngModel]="searchTerm()"
                  (ngModelChange)="onSearchChange($event)"
                  placeholder="Search name, email, mobile..."
                  class="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-blue-500 transition-colors"
                />
                @if (searchTerm()) {
                  <button (click)="onSearchChange('')" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 bg-transparent border-none cursor-pointer">
                    <mat-icon class="text-xs">close</mat-icon>
                  </button>
                }
              </div>

              <!-- Multi-column Filters -->
              <div class="flex flex-wrap items-center gap-2">
                <!-- Customer Type Filter -->
                <select
                  [ngModel]="filterType()"
                  (ngModelChange)="filterType.set($event); fetchCustomersList()"
                  class="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="">All Types (Guest & Registered)</option>
                  <option value="retail">Retail Buyers</option>
                  <option value="dealer">Wholesale Dealers</option>
                  <option value="guest">Guest Buyers</option>
                </select>

                <!-- Status Filter -->
                <select
                  [ngModel]="filterStatus()"
                  (ngModelChange)="filterStatus.set($event); fetchCustomersList()"
                  class="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active Accounts</option>
                  <option value="blocked">Blocked Accounts</option>
                </select>

                <!-- Sort Field -->
                <select
                  [ngModel]="sortField()"
                  (ngModelChange)="sortField.set($event); fetchCustomersList()"
                  class="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="createdAt">Sort: Registration Date</option>
                  <option value="name">Sort: Name</option>
                  <option value="email">Sort: Email</option>
                  <option value="status">Sort: Account Status</option>
                </select>

                <button
                  (click)="toggleSortOrder()"
                  class="p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                  [title]="'Order: ' + sortOrder().toUpperCase()"
                >
                  <mat-icon class="text-sm">{{ sortOrder() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                </button>
              </div>
            </div>

            <!-- Bulk Selection Action Bar -->
            @if (selectedCustomerIds().size > 0) {
              <div class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between gap-4 animate-fadeIn">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-blue-500 text-sm">check_circle</mat-icon>
                  <span class="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {{ selectedCustomerIds().size }} customer(s) selected
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button (click)="bulkBlockSelected()" class="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold transition-all border-none cursor-pointer">
                    Block Selected
                  </button>
                  <button (click)="bulkUnblockSelected()" class="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold transition-all border-none cursor-pointer">
                    Unblock Selected
                  </button>
                  <button (click)="exportToCsv(true)" class="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold transition-all border-none cursor-pointer">
                    Export Selected
                  </button>
                  <button (click)="clearSelection()" class="px-2 py-1 text-zinc-400 hover:text-zinc-600 text-xs bg-transparent border-none cursor-pointer">
                    Clear
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Customer Data Table & Mobile Cards -->
          <div class="p-3 sm:p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl max-w-full overflow-hidden shadow-xs">
            @if (isLoading()) {
              <!-- Skeleton Loading Grid -->
              <div class="space-y-3 py-4">
                @for (i of [1,2,3,4,5]; track $index) {
                  <div class="h-12 w-full bg-zinc-100 dark:bg-zinc-800/60 rounded-xl animate-pulse"></div>
                }
              </div>
            } @else {
              <!-- DESKTOP TABLE VIEW (hidden on mobile, visible on md and up) -->
              <div class="hidden md:block w-full max-w-full overflow-x-auto no-scrollbar">
                <table class="w-full text-left text-xs whitespace-nowrap min-w-[850px]">
                  <thead>
                    <tr class="text-[10px] font-black text-zinc-400 uppercase border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <th class="py-3 px-2 w-8">
                        <input
                          type="checkbox"
                          [checked]="isAllSelected()"
                          (change)="toggleSelectAll()"
                          class="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th class="py-3 px-2">Customer Profile</th>
                      <th class="py-3 px-2">Contact Details</th>
                      <th class="py-3 px-2">Type</th>
                      <th class="py-3 px-2">Reg. Date</th>
                      <th class="py-3 px-2 text-center">Orders</th>
                      <th class="py-3 px-2 text-right">Total Spend</th>
                      <th class="py-3 px-2">Last Order</th>
                      <th class="py-3 px-2">Status</th>
                      <th class="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    @for (c of customers(); track c.id) {
                      <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <!-- Selection Checkbox -->
                        <td class="py-3.5 px-2">
                          <input
                            type="checkbox"
                            [checked]="selectedCustomerIds().has(c.id)"
                            (change)="toggleSelectCustomer(c.id)"
                            class="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        <!-- Customer Profile Cell -->
                        <td class="py-3.5 px-2">
                          <div class="flex items-center gap-3">
                            <div class="h-9 w-9 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs uppercase overflow-hidden shrink-0">
                              @if (c.profileImage) {
                                <img [src]="c.profileImage" class="w-full h-full object-cover" alt="avatar" />
                              } @else {
                                {{ getInitials(c.name) }}
                              }
                            </div>
                            <div>
                              <button
                                (click)="viewCustomerProfile(c.id)"
                                class="font-black text-zinc-900 dark:text-white uppercase hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-none bg-transparent cursor-pointer text-left text-xs p-0"
                              >
                                {{ c.name }}
                              </button>
                              <span class="text-[10px] text-zinc-400 font-mono block">ID: {{ c.id.slice(0, 8) }}</span>
                            </div>
                          </div>
                        </td>

                        <!-- Contact Details -->
                        <td class="py-3.5 px-2 font-mono text-[11px]">
                          <div class="space-y-0.5">
                            <p class="text-zinc-700 dark:text-zinc-300 font-medium">{{ c.email || 'N/A' }}</p>
                            <p class="text-zinc-400 text-[10px]">{{ c.phone || 'No Phone' }}</p>
                          </div>
                        </td>

                        <!-- Customer Type -->
                        <td class="py-3.5 px-2">
                          <span
                            [class]="c.customerType === 'dealer' 
                              ? 'px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' 
                              : c.customerType === 'guest' 
                              ? 'px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' 
                              : 'px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'"
                            class="text-[10px] font-black uppercase rounded-md tracking-wider inline-block"
                          >
                            {{ c.customerType || 'RETAIL' }}
                          </span>
                        </td>

                        <!-- Registration Date -->
                        <td class="py-3.5 px-2 text-zinc-500 font-mono text-[10px]">
                          {{ c.registrationDate ? (c.registrationDate | date:'mediumDate') : 'N/A' }}
                        </td>

                        <!-- Total Orders Count -->
                        <td class="py-3.5 px-2 text-center font-bold font-mono">
                          {{ c.totalOrders ?? 0 }}
                        </td>

                        <!-- Total Spend -->
                        <td class="py-3.5 px-2 text-right font-black font-mono text-zinc-900 dark:text-white">
                          ₹{{ (c.totalSpend || 0) | number }}
                        </td>

                        <!-- Last Order Date -->
                        <td class="py-3.5 px-2 text-zinc-400 font-mono text-[10px]">
                          {{ c.lastOrderDate ? (c.lastOrderDate | date:'shortDate') : 'Never' }}
                        </td>

                        <!-- Account Status -->
                        <td class="py-3.5 px-2">
                          <span
                            [class]="c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'"
                            class="px-2.5 py-1 text-[10px] font-black uppercase rounded-md border tracking-wider inline-flex items-center gap-1"
                          >
                            <span class="h-1.5 w-1.5 rounded-full" [class]="c.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                            {{ c.status }}
                          </span>
                        </td>

                        <!-- Actions Column -->
                        <td class="py-3.5 px-2 text-right">
                          <div class="flex items-center justify-end gap-1">
                            <!-- Quick Profile View -->
                            <button
                              (click)="viewCustomerProfile(c.id)"
                              class="p-1.5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                              title="View Customer Profile"
                            >
                              <mat-icon class="text-sm">visibility</mat-icon>
                            </button>

                            <!-- Edit Profile -->
                            <button
                              (click)="openEditModal(c)"
                              class="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                              title="Edit Details"
                            >
                              <mat-icon class="text-sm">edit</mat-icon>
                            </button>

                            <!-- WhatsApp Link -->
                            @if (c.phone) {
                              <button
                                (click)="openWhatsApp(c.phone, c.name)"
                                class="p-1.5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                                title="Chat on WhatsApp"
                              >
                                <mat-icon class="text-sm">chat</mat-icon>
                              </button>
                            }

                            <!-- Block / Unblock -->
                            <button
                              (click)="toggleBlockStatus(c)"
                              [class]="c.status === 'Active' ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'"
                              class="p-1.5 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                              [title]="c.status === 'Active' ? 'Block Account' : 'Unblock Account'"
                            >
                              <mat-icon class="text-sm">{{ c.status === 'Active' ? 'block' : 'check_circle' }}</mat-icon>
                            </button>

                            <!-- Soft Delete -->
                            <button
                              (click)="confirmDeleteCustomer(c)"
                              class="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                              title="Delete Customer Profile"
                            >
                              <mat-icon class="text-sm">delete_outline</mat-icon>
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="10" class="py-16 text-center">
                          <div class="flex flex-col items-center justify-center space-y-3">
                            <div class="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
                              <mat-icon class="text-xl">people_outline</mat-icon>
                            </div>
                            <h4 class="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Customers Found</h4>
                            <p class="text-xs text-zinc-500 max-w-sm">
                              No customer records match your current search query or filter parameters.
                            </p>
                            <button (click)="resetFilters()" class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer border-none shadow-sm">
                              Clear Filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- MOBILE CARD VIEW (visible on mobile < md, hidden on md and up) -->
              <div class="block md:hidden space-y-3">
                @for (c of customers(); track c.id) {
                  <div class="p-3.5 bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3 shadow-2xs">
                    <!-- Top Row: Checkbox, Avatar, Name & Type/Status Badges -->
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          [checked]="selectedCustomerIds().has(c.id)"
                          (change)="toggleSelectCustomer(c.id)"
                          class="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <div class="h-8.5 w-8.5 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs uppercase overflow-hidden shrink-0">
                          @if (c.profileImage) {
                            <img [src]="c.profileImage" class="w-full h-full object-cover" alt="avatar" />
                          } @else {
                            {{ getInitials(c.name) }}
                          }
                        </div>
                        <div class="min-w-0 flex-1">
                          <button
                            (click)="viewCustomerProfile(c.id)"
                            class="font-black text-zinc-900 dark:text-white uppercase truncate border-none bg-transparent cursor-pointer text-left text-xs p-0 block max-w-[130px]"
                          >
                            {{ c.name }}
                          </button>
                          <span class="text-[9px] text-zinc-400 font-mono block">ID: {{ c.id.slice(0, 8) }}</span>
                        </div>
                      </div>

                      <div class="flex items-center gap-1 shrink-0">
                        <span
                          [class]="c.customerType === 'dealer' 
                            ? 'px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' 
                            : c.customerType === 'guest' 
                            ? 'px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' 
                            : 'px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'"
                          class="text-[8px] font-black uppercase rounded tracking-wider"
                        >
                          {{ c.customerType || 'RETAIL' }}
                        </span>

                        <span
                          [class]="c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'"
                          class="px-2 py-0.5 text-[8px] font-black uppercase rounded border tracking-wider flex items-center gap-1"
                        >
                          <span class="h-1.5 w-1.5 rounded-full" [class]="c.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                          {{ c.status }}
                        </span>
                      </div>
                    </div>

                    <!-- Contact Details & Metrics Grid -->
                    <div class="grid grid-cols-2 gap-2 p-2.5 bg-white dark:bg-zinc-900 rounded-xl text-xs border border-zinc-100 dark:border-zinc-800/80">
                      <div>
                        <span class="text-[9px] text-zinc-400 font-bold uppercase block">Contact Info</span>
                        <p class="font-mono font-medium text-zinc-700 dark:text-zinc-300 text-[11px] truncate">{{ c.email || 'N/A' }}</p>
                        <p class="font-mono text-zinc-400 text-[10px]">{{ c.phone || 'No Phone' }}</p>
                      </div>

                      <div class="text-right">
                        <span class="text-[9px] text-zinc-400 font-bold uppercase block">Reg. Date</span>
                        <p class="font-mono font-bold text-zinc-700 dark:text-zinc-300 text-[11px]">
                          {{ c.registrationDate ? (c.registrationDate | date:'mediumDate') : 'N/A' }}
                        </p>
                      </div>

                      <div class="pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                        <span class="text-[9px] text-zinc-400 font-bold uppercase block">Total Orders</span>
                        <p class="font-mono font-black text-zinc-900 dark:text-white text-xs">{{ c.totalOrders ?? 0 }} orders</p>
                      </div>

                      <div class="pt-1.5 border-t border-zinc-100 dark:border-zinc-800 text-right">
                        <span class="text-[9px] text-zinc-400 font-bold uppercase block">Total Spend</span>
                        <p class="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">₹{{ (c.totalSpend || 0) | number }}</p>
                      </div>
                    </div>

                    <!-- Bottom Actions Bar -->
                    <div class="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                      <span class="text-[9px] text-zinc-400 font-mono">Last Order: {{ c.lastOrderDate ? (c.lastOrderDate | date:'shortDate') : 'Never' }}</span>
                      
                      <div class="flex items-center gap-1">
                        <button (click)="viewCustomerProfile(c.id)" class="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors border-none cursor-pointer" title="View Profile">
                          <mat-icon class="text-sm">visibility</mat-icon>
                        </button>
                        <button (click)="openEditModal(c)" class="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 transition-colors border-none cursor-pointer" title="Edit Customer">
                          <mat-icon class="text-sm">edit</mat-icon>
                        </button>
                        @if (c.phone) {
                          <button (click)="openWhatsApp(c.phone, c.name)" class="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors border-none cursor-pointer" title="WhatsApp">
                            <mat-icon class="text-sm">chat</mat-icon>
                          </button>
                        }
                        <button (click)="toggleBlockStatus(c)" class="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors border-none cursor-pointer" [title]="c.status === 'Active' ? 'Block' : 'Unblock'">
                          <mat-icon class="text-sm">{{ c.status === 'Active' ? 'block' : 'check_circle' }}</mat-icon>
                        </button>
                        <button (click)="confirmDeleteCustomer(c)" class="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors border-none cursor-pointer" title="Delete">
                          <mat-icon class="text-sm">delete_outline</mat-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="p-8 text-center text-zinc-400 text-xs">
                    No customers found matching filters.
                  </div>
                }
              </div>
            }
          </div>

            <!-- Server-Side Pagination Bar -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div class="text-xs text-zinc-500 font-mono">
                Showing <span class="font-bold text-zinc-900 dark:text-white">{{ getPaginationStart() }}</span> - 
                <span class="font-bold text-zinc-900 dark:text-white">{{ getPaginationEnd() }}</span> of 
                <span class="font-bold text-zinc-900 dark:text-white">{{ totalCustomers() }}</span> customers
              </div>

              <div class="flex items-center gap-2">
                <button
                  (click)="changePage(currentPage() - 1)"
                  [disabled]="currentPage() <= 1"
                  class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1"
                >
                  <mat-icon class="text-xs">chevron_left</mat-icon> Prev
                </button>

                <span class="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400 px-2">
                  Page {{ currentPage() }} / {{ totalPages() }}
                </span>

                <button
                  (click)="changePage(currentPage() + 1)"
                  [disabled]="currentPage() >= totalPages()"
                  class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1"
                >
                  Next <mat-icon class="text-xs">chevron_right</mat-icon>
                </button>
              </div>
            </div>
          </div>
        }

      <!-- ========================================================================= -->
      <!-- VIEW 2: CUSTOMER DETAIL PROFILE PAGE                                     -->
      <!-- ========================================================================= -->
      @if (admin.activeTab() === 'customer-details') {
        <div class="space-y-6">
          
          <!-- Back Button & Header -->
          <div class="flex items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <button
              (click)="admin.setActiveTab('customer-list')"
              class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-none cursor-pointer"
            >
              <mat-icon class="text-sm">arrow_back</mat-icon>
              <span>Back to Customer Directory</span>
            </button>

            <div class="flex items-center gap-2">
              @if (activeCustomer(); as cust) {
                <button
                  (click)="openEditModal(cust)"
                  class="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5"
                >
                  <mat-icon class="text-sm">edit</mat-icon> Edit Profile
                </button>

                <button
                  (click)="openPushModal()"
                  class="px-3.5 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5"
                >
                  <mat-icon class="text-sm">notifications_active</mat-icon> Send Push
                </button>

                <button
                  (click)="sendEmail(cust.email)"
                  class="px-3.5 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5"
                >
                  <mat-icon class="text-sm">email</mat-icon> Email
                </button>

                @if (cust.phone) {
                  <button
                    (click)="openWhatsApp(cust.phone, cust.name)"
                    class="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5"
                  >
                    <mat-icon class="text-sm">chat</mat-icon> WhatsApp
                  </button>
                }
              }
            </div>
          </div>

          @if (isDetailLoading()) {
            <div class="p-12 text-center space-y-3">
              <mat-icon class="text-blue-500 text-3xl animate-spin">sync</mat-icon>
              <p class="text-xs text-zinc-500 font-bold">Fetching Customer Profile Data...</p>
            </div>
          } @else if (activeCustomer()) {
            @let cust = activeCustomer()!;

            <!-- Profile Overview Header Card -->
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-6 shadow-sm">
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <!-- Avatar & Identity -->
                <div class="flex items-center gap-4">
                  <div class="h-16 w-16 rounded-2xl bg-linear-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-xl flex items-center justify-center shadow-md uppercase overflow-hidden shrink-0">
                    @if (cust.profileImage) {
                      <img [src]="cust.profileImage" class="w-full h-full object-cover" alt="avatar" />
                    } @else {
                      {{ getInitials(cust.name) }}
                    }
                  </div>

                  <div class="space-y-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h2 class="text-xl font-black uppercase text-zinc-900 dark:text-white font-display">{{ cust.name }}</h2>
                      <span
                        [class]="cust.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'"
                        class="px-2.5 py-0.5 text-[9px] font-black uppercase rounded-md border tracking-wider inline-flex items-center gap-1"
                      >
                        {{ cust.status }}
                      </span>
                      <span class="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase rounded-md border border-blue-500/20">
                        {{ cust.customerType || 'RETAIL' }}
                      </span>
                    </div>

                    <p class="text-xs text-zinc-500 font-mono">ID: {{ cust.id }}</p>
                    <div class="flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-300 font-mono flex-wrap pt-0.5">
                      <span>📧 {{ cust.email }}</span>
                      <span>📱 {{ cust.phone || 'No Phone' }}</span>
                      <span>📅 Member since {{ cust.registrationDate | date:'mediumDate' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Quick Action Buttons -->
                <div class="flex items-center gap-2 self-start md:self-auto">
                  <button
                    (click)="toggleBlockStatus(cust)"
                    [class]="cust.status === 'Active' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
                    class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer"
                  >
                    {{ cust.status === 'Active' ? 'Block Account' : 'Unblock Account' }}
                  </button>
                </div>
              </div>

              <!-- Metric Pills Row -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div class="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl space-y-0.5">
                  <span class="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Total Orders</span>
                  <p class="text-base font-black text-zinc-900 dark:text-white font-mono">{{ cust.stats.totalOrders }}</p>
                </div>

                <div class="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl space-y-0.5">
                  <span class="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Total Spend</span>
                  <p class="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">₹{{ cust.stats.totalSpend | number }}</p>
                </div>

                <div class="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl space-y-0.5">
                  <span class="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Avg Order Value (AOV)</span>
                  <p class="text-base font-black text-blue-600 dark:text-blue-400 font-mono">₹{{ cust.stats.averageOrderValue | number:'1.0-0' }}</p>
                </div>

                <div class="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl space-y-0.5">
                  <span class="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Last Activity</span>
                  <p class="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                    {{ cust.lastLogin ? (cust.lastLogin | date:'shortDate') : 'Registered' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Profile Detail Sub-Tabs -->
            <div class="space-y-6">
              <div class="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar pb-1">
                @for (tab of detailTabs; track tab.key) {
                  <button
                    (click)="setDetailTab(tab.key)"
                    [class]="detailTab() === tab.key 
                      ? 'px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm' 
                      : 'px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-none cursor-pointer bg-transparent'"
                  >
                    <mat-icon class="text-xs align-middle -mt-0.5 mr-1">{{ tab.icon }}</mat-icon>
                    <span>{{ tab.label }}</span>
                  </button>
                }
              </div>

              <!-- TAB 1: OVERVIEW -->
              @if (detailTab() === 'overview') {
                <div class="space-y-6 animate-fadeIn">
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Summary Card -->
                    <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4">
                      <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Account Summary</h3>
                      <div class="space-y-2 text-xs font-mono">
                        <div class="flex justify-between py-1 border-b dark:border-zinc-800">
                          <span class="text-zinc-500">First Name</span>
                          <span class="font-bold text-zinc-900 dark:text-white">{{ cust.firstName || 'N/A' }}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b dark:border-zinc-800">
                          <span class="text-zinc-500">Last Name</span>
                          <span class="font-bold text-zinc-900 dark:text-white">{{ cust.lastName || 'N/A' }}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b dark:border-zinc-800">
                          <span class="text-zinc-500">Gender</span>
                          <span class="font-bold text-zinc-900 dark:text-white uppercase">{{ cust.gender || 'Not specified' }}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b dark:border-zinc-800">
                          <span class="text-zinc-500">Reward Points</span>
                          <span class="font-bold text-amber-500">{{ cust.rewardPoints || 0 }} pts</span>
                        </div>
                      </div>
                    </div>

                    <!-- Orders Quick Status Breakdown -->
                    <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4 md:col-span-2">
                      <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Order Fulfillment Distribution</h3>
                      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div class="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-center">
                          <span class="text-[9px] text-zinc-400 font-bold uppercase block">Total Placed</span>
                          <span class="text-lg font-black text-zinc-900 dark:text-white">{{ customerOrders().length }}</span>
                        </div>
                        <div class="p-3 bg-emerald-500/10 rounded-xl text-center">
                          <span class="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">Delivered</span>
                          <span class="text-lg font-black text-emerald-600 dark:text-emerald-400">{{ getDeliveredOrdersCount() }}</span>
                        </div>
                        <div class="p-3 bg-amber-500/10 rounded-xl text-center">
                          <span class="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase block">Pending</span>
                          <span class="text-lg font-black text-amber-600 dark:text-amber-400">{{ getPendingOrdersCount() }}</span>
                        </div>
                        <div class="p-3 bg-rose-500/10 rounded-xl text-center">
                          <span class="text-[9px] text-rose-600 dark:text-rose-400 font-bold uppercase block">Cancelled</span>
                          <span class="text-lg font-black text-rose-600 dark:text-rose-400">{{ getCancelledOrdersCount() }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- TAB 2: ORDERS -->
              @if (detailTab() === 'orders') {
                <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4 animate-fadeIn">
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Order History ({{ customerOrders().length }})</h3>
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs whitespace-nowrap">
                      <thead>
                        <tr class="text-[10px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800 pb-2">
                          <th class="py-2">Order #</th>
                          <th class="py-2">Date</th>
                          <th class="py-2">Items</th>
                          <th class="py-2 text-right">Amount</th>
                          <th class="py-2">Payment</th>
                          <th class="py-2">Status</th>
                          <th class="py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                        @for (o of customerOrders(); track o.orderId) {
                          <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40" [class.line-through]="(o.deliveryStatus || '').toLowerCase() === 'cancelled'" [class.opacity-60]="(o.deliveryStatus || '').toLowerCase() === 'cancelled'">
                            <td class="py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                              #{{ o.orderNumber || o.orderId.slice(0,8) }}
                            </td>
                            <td class="py-3 font-mono text-[10px] text-zinc-500">
                              {{ o.orderDate | date:'mediumDate' }}
                            </td>
                            <td class="py-3">
                              <span class="font-medium text-zinc-900 dark:text-white">
                                {{ o.items?.length || 1 }} item(s)
                              </span>
                            </td>
                            <td class="py-3 text-right font-black font-mono">
                              ₹{{ o.totalAmount | number }}
                            </td>
                            <td class="py-3">
                              <span class="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-zinc-100 dark:bg-zinc-800">
                                {{ o.paymentMethod }} ({{ o.paymentStatus }})
                              </span>
                            </td>
                            <td class="py-3">
                              <span class="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-emerald-500/10 text-emerald-500">
                                {{ o.deliveryStatus }}
                              </span>
                            </td>
                            <td class="py-3 text-right">
                              <button
                                (click)="viewOrderDetails(o.orderId)"
                                class="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold cursor-pointer border-none"
                              >
                                View Order
                              </button>
                            </td>
                          </tr>
                        } @empty {
                          <tr>
                            <td colspan="7" class="py-8 text-center text-zinc-400">
                              No order history found for this customer.
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }

              <!-- TAB 3: ADDRESSES -->
              @if (detailTab() === 'addresses') {
                <div class="space-y-4 animate-fadeIn">
                  <div class="flex items-center justify-between">
                    <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Saved Delivery Addresses</h3>
                    <button
                      (click)="openAddressModal()"
                      class="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer border-none flex items-center gap-1"
                    >
                      <mat-icon class="text-xs">add</mat-icon> Add Address
                    </button>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    @for (addr of customerAddresses(); track addr.id) {
                      <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3 relative">
                        @if (addr.isDefault) {
                          <span class="absolute top-4 right-4 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase rounded-md border border-emerald-500/20">
                            Default Address
                          </span>
                        }

                        <div class="space-y-1">
                          <p class="font-bold text-xs text-zinc-900 dark:text-white">{{ addr.addressLine1 }}</p>
                          @if (addr.addressLine2) {
                            <p class="text-xs text-zinc-500">{{ addr.addressLine2 }}</p>
                          }
                          <p class="text-xs text-zinc-600 dark:text-zinc-300 font-mono">
                            {{ addr.city }}, {{ addr.state }} - {{ addr.postalCode }} ({{ addr.country }})
                          </p>
                        </div>

                        <div class="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                          <button
                            (click)="openAddressModal(addr)"
                            class="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-[10px] font-bold border-none cursor-pointer"
                          >
                            Edit
                          </button>
                          @if (!addr.isDefault) {
                            <button
                              (click)="setDefaultAddress(addr.id)"
                              class="px-3 py-1 bg-blue-500/10 text-blue-600 text-[10px] font-bold border-none cursor-pointer rounded-lg"
                            >
                              Set Default
                            </button>
                          }
                          <button
                            (click)="deleteAddress(addr.id)"
                            class="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-bold border-none cursor-pointer ml-auto"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    } @empty {
                      <div class="col-span-2 p-8 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-center text-zinc-400 text-xs">
                        No saved delivery addresses. Click "Add Address" to create one.
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- TAB 4: WISHLIST -->
              @if (detailTab() === 'wishlist') {
                <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4 animate-fadeIn">
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Wishlist Saved Products ({{ customerWishlist().length }})</h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    @for (w of customerWishlist(); track w.productId) {
                      <div class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl flex items-center gap-3 border border-zinc-100 dark:border-zinc-800">
                        <div class="h-12 w-12 rounded-lg bg-white dark:bg-zinc-900 p-1 shrink-0 overflow-hidden border">
                          <img [src]="w.image || 'assets/images/user-placeholder.png'" class="w-full h-full object-contain" alt="prod" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <h4 class="text-xs font-bold text-zinc-900 dark:text-white truncate">{{ w.name }}</h4>
                          <span class="text-[10px] text-zinc-400 uppercase font-mono block">{{ w.category }}</span>
                          <span class="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">₹{{ w.price | number }}</span>
                        </div>
                      </div>
                    } @empty {
                      <div class="col-span-3 p-8 text-center text-zinc-400 text-xs">
                        Wishlist is currently empty.
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- TAB 5: REVIEWS -->
              @if (detailTab() === 'reviews') {
                <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4 animate-fadeIn">
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Customer Product Reviews ({{ customerReviews().length }})</h3>
                  <div class="space-y-4">
                    @for (r of customerReviews(); track r.id) {
                      <div class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl space-y-2 border border-zinc-100 dark:border-zinc-800">
                        <div class="flex items-center justify-between">
                          <h4 class="text-xs font-bold text-zinc-900 dark:text-white">{{ r.product?.name }}</h4>
                          <div class="flex items-center text-amber-500 font-bold text-xs">
                            <mat-icon class="text-sm">star</mat-icon> {{ r.rating }} / 5
                          </div>
                        </div>
                        <p class="text-xs italic text-zinc-600 dark:text-zinc-300">"{{ r.comment }}"</p>
                        <span class="text-[9px] text-zinc-400 font-mono block">{{ r.createdAt | date:'mediumDate' }}</span>
                      </div>
                    } @empty {
                      <div class="p-8 text-center text-zinc-400 text-xs">
                        No product reviews submitted yet.
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- TAB 6: ACTIVITY TIMELINE -->
              @if (detailTab() === 'activity') {
                <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4 animate-fadeIn">
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Audit Activity Timeline</h3>
                  <div class="space-y-4 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800">
                    @for (act of customerActivity(); track act.id) {
                      <div class="relative pl-6 space-y-0.5">
                        <div class="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-blue-600 border-2 border-white dark:border-zinc-900"></div>
                        <p class="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{{ act.action }}</p>
                        <p class="text-xs text-zinc-500">{{ act.details }}</p>
                        <span class="text-[9px] text-zinc-400 font-mono block">{{ act.createdAt | date:'medium' }}</span>
                      </div>
                    } @empty {
                      <div class="p-4 text-zinc-400 text-xs">
                        No activity log recorded yet.
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- TAB 7: ADMIN NOTES -->
              @if (detailTab() === 'notes') {
                <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4 animate-fadeIn">
                  <div class="flex items-center justify-between">
                    <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Internal Admin Notes</h3>
                  </div>

                  <!-- Add Note Input -->
                  <div class="space-y-2">
                    <textarea
                      [(ngModel)]="newNoteText"
                      rows="2"
                      placeholder="Add an internal note visible only to administrators..."
                      class="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-blue-500 transition-colors"
                    ></textarea>
                    <div class="flex items-center justify-between">
                      <label class="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                        <input type="checkbox" [(ngModel)]="newNotePinned" class="rounded text-blue-600" />
                        <span>Pin to top</span>
                      </label>
                      <button
                        (click)="submitNote()"
                        class="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer border-none shadow-sm"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>

                  <!-- Notes List -->
                  <div class="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    @for (n of customerNotes(); track n.id) {
                      <div class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-2 relative">
                        <div class="flex items-center justify-between">
                          <span class="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                            Added by {{ n.author }} &middot; {{ n.createdAt | date:'short' }}
                          </span>
                          <div class="flex items-center gap-2">
                            <button (click)="togglePinNote(n)" class="text-zinc-400 hover:text-amber-500 border-none bg-transparent cursor-pointer">
                              <mat-icon class="text-xs">{{ n.isPinned ? 'push_pin' : 'outlined_flag' }}</mat-icon>
                            </button>
                            <button (click)="deleteNote(n.id)" class="text-zinc-400 hover:text-rose-500 border-none bg-transparent cursor-pointer">
                              <mat-icon class="text-xs">delete</mat-icon>
                            </button>
                          </div>
                        </div>
                        <p class="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">{{ n.note }}</p>
                      </div>
                    } @empty {
                      <p class="text-xs text-zinc-400 text-center py-4">No internal admin notes added yet.</p>
                    }
                  </div>
                </div>
              }

            </div>
          }
        </div>
      }

      <!-- ========================================================================= -->
      <!-- VIEW 3: CUSTOMER ANALYTICS PAGE                                           -->
      <!-- ========================================================================= -->
      @if (admin.activeTab() === 'customer-analytics') {
        <div class="space-y-6 animate-fadeIn">
          
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white font-display">Customer Intelligence & Analytics</h1>
              <p class="text-xs text-zinc-500">Real-time metrics, cohort retention, and top customer leaderboards.</p>
            </div>
            <button
              (click)="fetchCustomerAnalytics()"
              class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer border-none shadow-sm flex items-center gap-1.5"
            >
              <mat-icon class="text-xs">sync</mat-icon> Refresh Data
            </button>
          </div>

          @if (isAnalyticsLoading()) {
            <div class="p-12 text-center text-xs text-zinc-400">Loading customer analytics data...</div>
          } @else if (analyticsData()) {
            @let stats = analyticsData()!.summary;
            @let boards = analyticsData()!.leaderboards;

            <!-- 6 KPI Dashboard Cards -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-1">
                <span class="text-[9px] text-zinc-400 font-bold uppercase block">Total Accounts</span>
                <span class="text-xl font-black text-zinc-900 dark:text-white font-mono">{{ stats.totalCustomers }}</span>
              </div>

              <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-1">
                <span class="text-[9px] text-blue-500 font-bold uppercase block">New (Last 30d)</span>
                <span class="text-xl font-black text-blue-600 font-mono">+{{ stats.newCustomers }}</span>
              </div>

              <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-1">
                <span class="text-[9px] text-emerald-500 font-bold uppercase block">Active Accounts</span>
                <span class="text-xl font-black text-emerald-600 font-mono">{{ stats.activeCustomers }}</span>
              </div>

              <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-1">
                <span class="text-[9px] text-purple-500 font-bold uppercase block">Registered Members</span>
                <span class="text-xl font-black text-purple-600 font-mono">{{ stats.registeredCustomers }}</span>
              </div>

              <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-1">
                <span class="text-[9px] text-amber-500 font-bold uppercase block">Guest Checkout</span>
                <span class="text-xl font-black text-amber-600 font-mono">{{ stats.guestCustomers }}</span>
              </div>

              <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-1">
                <span class="text-[9px] text-indigo-500 font-bold uppercase block">Returning Buyers</span>
                <span class="text-xl font-black text-indigo-600 font-mono">{{ stats.returningCustomers }}</span>
              </div>
            </div>

            <!-- Top Customer Leaderboards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- Leaderboard 1: Top Spend -->
              <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-amber-500 text-sm">emoji_events</mat-icon>
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Top 10 Spenders</h3>
                </div>
                <div class="space-y-2">
                  @for (c of boards.bySpend; track c.id; let idx = $index) {
                    <div class="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-xs">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-[10px] font-mono font-bold text-zinc-400 w-4">#{{ idx + 1 }}</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200 truncate">{{ c.name }}</span>
                      </div>
                      <span class="font-black text-emerald-600 font-mono">₹{{ c.value | number }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Leaderboard 2: Top Orders -->
              <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-blue-500 text-sm">shopping_bag</mat-icon>
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Top 10 Order Count</h3>
                </div>
                <div class="space-y-2">
                  @for (c of boards.byOrders; track c.id; let idx = $index) {
                    <div class="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-xs">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-[10px] font-mono font-bold text-zinc-400 w-4">#{{ idx + 1 }}</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200 truncate">{{ c.name }}</span>
                      </div>
                      <span class="font-black text-blue-600 font-mono">{{ c.value }} orders</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Leaderboard 3: Top Reviews -->
              <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-purple-500 text-sm">rate_review</mat-icon>
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Top 10 Reviewers</h3>
                </div>
                <div class="space-y-2">
                  @for (c of boards.byReviews; track c.id; let idx = $index) {
                    <div class="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-xs">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-[10px] font-mono font-bold text-zinc-400 w-4">#{{ idx + 1 }}</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200 truncate">{{ c.name }}</span>
                      </div>
                      <span class="font-black text-purple-600 font-mono">{{ c.value }} reviews</span>
                    </div>
                  }
                </div>
              </div>
            </div>

          }
        </div>
      }

    <!-- ========================================================================= -->
    <!-- MODALS SECTION                                                             -->
    <!-- ========================================================================= -->

    <!-- CREATE CUSTOMER MODAL -->
    @if (showCreateModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-md animate-fadeIn">
        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b dark:border-zinc-800">
            <h3 class="text-sm font-black uppercase tracking-wider">Create Customer Profile</h3>
            <button (click)="showCreateModal.set(false)" class="text-zinc-400 hover:text-zinc-600 border-none bg-transparent cursor-pointer">
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Full Name</label>
              <input type="text" [(ngModel)]="createForm.name" placeholder="John Doe" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none" />
            </div>

            <div>
              <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Email Address</label>
              <input type="email" [(ngModel)]="createForm.email" placeholder="john@example.com" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none" />
            </div>

            <div>
              <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Mobile Phone</label>
              <input type="text" [(ngModel)]="createForm.phone" placeholder="+91 9876543210" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none" />
            </div>

            <div>
              <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Password</label>
              <input type="password" [(ngModel)]="createForm.password" placeholder="Defaults to 12345678 if empty" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none" />
            </div>

            <div>
              <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Customer Type</label>
              <select [(ngModel)]="createForm.customerType" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                <option value="retail">Retail Buyer</option>
                <option value="dealer">Wholesale Dealer</option>
                <option value="guest">Guest Buyer</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t dark:border-zinc-800">
            <button (click)="showCreateModal.set(false)" class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold border-none cursor-pointer">
              Cancel
            </button>
            <button (click)="submitCreateCustomer()" class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold border-none cursor-pointer">
              Save Customer
            </button>
          </div>
        </div>
      </div>
    }

    <!-- EDIT CUSTOMER MODAL -->
    @if (showEditModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-md animate-fadeIn">
        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b dark:border-zinc-800">
            <h3 class="text-sm font-black uppercase tracking-wider">Edit Customer Profile</h3>
            <button (click)="showEditModal.set(false)" class="text-zinc-400 hover:text-zinc-600 border-none bg-transparent cursor-pointer">
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Full Name</label>
              <input type="text" [(ngModel)]="editForm.name" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none" />
            </div>

            <div>
              <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Email Address</label>
              <input type="email" [(ngModel)]="editForm.email" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none" />
            </div>

            <div>
              <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Mobile Phone</label>
              <input type="text" [(ngModel)]="editForm.phone" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none" />
            </div>

            <div>
              <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Customer Type</label>
              <select [(ngModel)]="editForm.customerType" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                <option value="retail">Retail Buyer</option>
                <option value="dealer">Wholesale Dealer</option>
                <option value="guest">Guest Buyer</option>
              </select>
            </div>

            <div>
              <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Account Status</label>
              <select [(ngModel)]="editForm.status" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer">
                <option value="Active">Active</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t dark:border-zinc-800">
            <button (click)="showEditModal.set(false)" class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold border-none cursor-pointer">
              Cancel
            </button>
            <button (click)="submitEditCustomer()" class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold border-none cursor-pointer">
              Update Profile
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ADDRESS MODAL -->
    @if (showAddressModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-md animate-fadeIn">
        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b dark:border-zinc-800">
            <h3 class="text-sm font-black uppercase tracking-wider">
              {{ editingAddress() ? 'Edit Address' : 'Add Delivery Address' }}
            </h3>
            <button (click)="showAddressModal.set(false)" class="text-zinc-400 hover:text-zinc-600 border-none bg-transparent cursor-pointer">
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Address Line 1</label>
              <input type="text" [(ngModel)]="addressForm.addressLine1" placeholder="House / Flat No., Street" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none" />
            </div>

            <div>
              <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Address Line 2 (Optional)</label>
              <input type="text" [(ngModel)]="addressForm.addressLine2" placeholder="Landmark, Area" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">City</label>
                <input type="text" [(ngModel)]="addressForm.city" placeholder="City" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none" />
              </div>
              <div>
                <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">State</label>
                <input type="text" [(ngModel)]="addressForm.state" placeholder="State" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Pincode</label>
                <input type="text" [(ngModel)]="addressForm.postalCode" placeholder="600001" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none" />
              </div>
              <div>
                <label class="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Country</label>
                <input type="text" [(ngModel)]="addressForm.country" placeholder="India" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none" />
              </div>
            </div>

            <label class="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer pt-1">
              <input type="checkbox" [(ngModel)]="addressForm.isDefault" class="rounded text-blue-600" />
              <span>Set as Default Address</span>
            </label>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t dark:border-zinc-800">
            <button (click)="showAddressModal.set(false)" class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold border-none cursor-pointer">
              Cancel
            </button>
            <button (click)="submitAddressForm()" class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold border-none cursor-pointer">
              Save Address
            </button>
          </div>
        </div>
      </div>
    }

  </div>
  `
})
export class AdminCustomersTab implements OnInit {
  @Input({ required: true }) admin!: AdminPanel;

  api = inject(ApiService);
  toast = inject(ToastService);

  // List signals
  customers = signal<CustomerListItem[]>([]);
  totalCustomers = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  isLoading = signal<boolean>(false);
  searchTerm = signal<string>('');
  filterType = signal<string>('');
  filterStatus = signal<string>('');
  sortField = signal<string>('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');
  selectedCustomerIds = signal<Set<string>>(new Set());
  directoryStats = signal<any | null>(null);

  // Metrics
  activeCount = computed(() => this.directoryStats()?.totalActive ?? this.customers().filter(c => c.status === 'Active').length);
  blockedCount = computed(() => this.directoryStats()?.totalBlocked ?? this.customers().filter(c => c.status === 'Blocked').length);
  repeatBuyersCount = computed(() => this.directoryStats()?.repeatBuyers ?? this.customers().filter(c => c.totalOrders >= 2).length);
  totalDirectorySpend = computed(() => this.directoryStats()?.totalDirectorySpend ?? this.customers().reduce((sum, c) => sum + (c.totalSpend || 0), 0));


  // Detail signals
  activeCustomer = signal<CustomerDetailProfile | null>(null);
  detailTab = signal<'overview' | 'orders' | 'addresses' | 'wishlist' | 'reviews' | 'activity' | 'notes'>('overview');
  customerOrders = signal<any[]>([]);
  customerAddresses = signal<any[]>([]);
  customerWishlist = signal<any[]>([]);
  customerReviews = signal<any[]>([]);
  customerActivity = signal<any[]>([]);
  customerNotes = signal<any[]>([]);
  isDetailLoading = signal<boolean>(false);

  // Analytics signals
  analyticsData = signal<any | null>(null);
  isAnalyticsLoading = signal<boolean>(false);

  // Modals state
  showCreateModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  showAddressModal = signal<boolean>(false);
  showSendPushModal = signal<boolean>(false);
  editingAddress = signal<any | null>(null);
  selectedOrderForView = signal<string | null>(null);

  // Forms
  createForm = {
    name: '',
    email: '',
    phone: '',
    password: '',
    customerType: 'retail',
  };

  editForm = {
    id: '',
    name: '',
    email: '',
    phone: '',
    customerType: 'retail',
    status: 'Active',
  };

  addressForm = {
    id: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: false,
  };

  newNoteText = '';
  newNotePinned = false;

  detailTabs = [
    { key: 'overview' as const, label: 'Overview', icon: 'dashboard' },
    { key: 'orders' as const, label: 'Orders', icon: 'shopping_bag' },
    { key: 'addresses' as const, label: 'Addresses', icon: 'location_on' },
    { key: 'wishlist' as const, label: 'Wishlist', icon: 'favorite' },
    { key: 'reviews' as const, label: 'Reviews', icon: 'rate_review' },
    { key: 'activity' as const, label: 'Activity Log', icon: 'history' },
    { key: 'notes' as const, label: 'Admin Notes', icon: 'sticky_note_2' },
  ];

  private searchDebounceTimer: any = null;

  constructor() {
    effect(() => {
      const tab = this.admin.activeTab();
      const selectedId = this.admin.selectedCustomerId();
      if (tab === 'customer-list') {
        this.fetchCustomersList();
      } else if (tab === 'customer-details' && selectedId) {
        this.fetchCustomerProfile(selectedId);
      } else if (tab === 'customer-analytics') {
        this.fetchCustomerAnalytics();
      }
    });
  }

  ngOnInit() {
    if (this.admin.activeTab() === 'customer-list') {
      this.fetchCustomersList();
    }
  }

  // --- CUSTOMER LIST FETCHING ---
  fetchCustomersList() {
    this.isLoading.set(true);
    const params: any = {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchTerm(),
      customerType: this.filterType(),
      status: this.filterStatus(),
      sortField: this.sortField(),
      sortOrder: this.sortOrder(),
    };

    this.api.get<any>('/admin/customers', params).subscribe({
      next: (res: any) => {
        if (res?.success && Array.isArray(res.data)) {
          this.customers.set(res.data);
          this.totalCustomers.set(res.meta?.total || res.data.length);
          this.totalPages.set(res.meta?.totalPages || 1);
          if (res.stats) {
            this.directoryStats.set(res.stats);
          }
        } else {
          this.customers.set([]);
          this.totalCustomers.set(0);
          this.totalPages.set(1);
        }
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.toast.error('Failed to fetch customer directory.');
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(term: string) {
    this.searchTerm.set(term);
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage.set(1);
      this.fetchCustomersList();
    }, 300);
  }

  toggleSortOrder() {
    this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    this.fetchCustomersList();
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchCustomersList();
  }

  resetFilters() {
    this.searchTerm.set('');
    this.filterType.set('');
    this.filterStatus.set('');
    this.currentPage.set(1);
    this.fetchCustomersList();
  }

  // --- SELECTION & BULK ACTIONS ---
  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectedCustomerIds.set(new Set());
    } else {
      const allIds = new Set(this.customers().map(c => c.id));
      this.selectedCustomerIds.set(allIds);
    }
  }

  isAllSelected(): boolean {
    const list = this.customers();
    if (list.length === 0) return false;
    return list.every(c => this.selectedCustomerIds().has(c.id));
  }

  toggleSelectCustomer(id: string) {
    const set = new Set(this.selectedCustomerIds());
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    this.selectedCustomerIds.set(set);
  }

  clearSelection() {
    this.selectedCustomerIds.set(new Set());
  }

  bulkBlockSelected() {
    const ids = Array.from(this.selectedCustomerIds());
    if (ids.length === 0) return;
    let done = 0;
    ids.forEach(id => {
      this.api.patch(`/admin/customers/${id}/block`, {}).subscribe({
        next: () => {
          done++;
          if (done === ids.length) {
            this.toast.success(`Blocked ${done} customers.`);
            this.clearSelection();
            this.fetchCustomersList();
          }
        }
      });
    });
  }

  bulkUnblockSelected() {
    const ids = Array.from(this.selectedCustomerIds());
    if (ids.length === 0) return;
    let done = 0;
    ids.forEach(id => {
      this.api.patch(`/admin/customers/${id}/unblock`, {}).subscribe({
        next: () => {
          done++;
          if (done === ids.length) {
            this.toast.success(`Unblocked ${done} customers.`);
            this.clearSelection();
            this.fetchCustomersList();
          }
        }
      });
    });
  }

  exportToCsv(onlySelected = false) {
    const dataToExport = onlySelected 
      ? this.customers().filter(c => this.selectedCustomerIds().has(c.id))
      : this.customers();

    if (dataToExport.length === 0) {
      this.toast.warning('No customer records to export.');
      return;
    }

    const headers = ['Customer ID', 'Name', 'Email', 'Phone', 'Type', 'Registration Date', 'Total Orders', 'Total Spend (INR)', 'Last Order Date', 'Status'];
    const rows = dataToExport.map(c => [
      `"${c.id}"`,
      `"${c.name}"`,
      `"${c.email}"`,
      `"${c.phone}"`,
      `"${c.customerType}"`,
      `"${c.registrationDate}"`,
      c.totalOrders,
      c.totalSpend,
      `"${c.lastOrderDate || ''}"`,
      `"${c.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_directory_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toast.success(`Exported ${dataToExport.length} customer records.`);
  }

  // --- SINGLE CUSTOMER PROFILE DETAILS ---
  viewCustomerProfile(id: string) {
    this.admin.openCustomerDetails(id);
  }

  fetchCustomerProfile(id: string) {
    this.isDetailLoading.set(true);
    this.api.get<any>(`/admin/customers/${id}`).subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          this.activeCustomer.set(res.data);
          this.fetchCustomerOrders(id);
          this.fetchCustomerAddresses(id);
          this.fetchCustomerWishlist(id);
          this.fetchCustomerReviews(id);
          this.fetchCustomerActivity(id);
          this.fetchCustomerNotes(id);
        } else {
          this.toast.error('Customer profile not found.');
          this.admin.setActiveTab('customer-list');
        }
        this.isDetailLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load customer profile details.');
        this.isDetailLoading.set(false);
      }
    });
  }

  setDetailTab(tabKey: any) {
    this.detailTab.set(tabKey);
  }

  // --- SUB-RESOURCES ---
  fetchCustomerOrders(id: string) {
    this.api.get<any>(`/admin/customers/${id}/orders`).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          this.customerOrders.set(res.data);
        }
      }
    });
  }

  fetchCustomerAddresses(id: string) {
    this.api.get<any>(`/admin/customers/${id}/addresses`).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          this.customerAddresses.set(res.data);
        }
      }
    });
  }

  fetchCustomerWishlist(id: string) {
    this.api.get<any>(`/admin/customers/${id}/wishlist`).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          this.customerWishlist.set(res.data);
        }
      }
    });
  }

  fetchCustomerReviews(id: string) {
    this.api.get<any>(`/admin/customers/${id}/reviews`).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          this.customerReviews.set(res.data);
        }
      }
    });
  }

  fetchCustomerActivity(id: string) {
    this.api.get<any>(`/admin/customers/${id}/activity`).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          this.customerActivity.set(res.data);
        }
      }
    });
  }

  fetchCustomerNotes(id: string) {
    this.api.get<any>(`/admin/customers/${id}/notes`).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          this.customerNotes.set(res.data);
        }
      }
    });
  }

  // --- ANALYTICS DASHBOARD ---
  fetchCustomerAnalytics() {
    this.isAnalyticsLoading.set(true);
    this.api.get<any>('/admin/customers/analytics').subscribe({
      next: (res) => {
        if (res?.success && res.data) {
          this.analyticsData.set(res.data);
        }
        this.isAnalyticsLoading.set(false);
      },
      error: () => {
        this.isAnalyticsLoading.set(false);
      }
    });
  }

  // --- CRUD ACTIONS ---
  openCreateModal() {
    this.createForm = { name: '', email: '', phone: '', password: '', customerType: 'retail' };
    this.showCreateModal.set(true);
  }

  submitCreateCustomer() {
    if (!this.createForm.name || !this.createForm.email) {
      this.toast.warning('Name and email address are required.');
      return;
    }
    this.api.post<any>('/admin/customers', this.createForm).subscribe({
      next: (res) => {
        if (res?.success) {
          this.toast.success('Customer profile created successfully.');
          this.showCreateModal.set(false);
          this.fetchCustomersList();
        } else {
          this.toast.error(res?.error || 'Failed to create customer.');
        }
      },
      error: (err) => {
        this.toast.error(err?.error?.error || 'Failed to create customer profile.');
      }
    });
  }

  openEditModal(customer: any) {
    this.editForm = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      customerType: customer.customerType || 'retail',
      status: customer.status || 'Active',
    };
    this.showEditModal.set(true);
  }

  submitEditCustomer() {
    this.api.put<any>(`/admin/customers/${this.editForm.id}`, this.editForm).subscribe({
      next: (res) => {
        if (res?.success) {
          this.toast.success('Customer profile updated successfully.');
          this.showEditModal.set(false);
          if (this.admin.activeTab() === 'customer-details') {
            this.fetchCustomerProfile(this.editForm.id);
          } else {
            this.fetchCustomersList();
          }
        } else {
          this.toast.error(res?.error || 'Failed to update customer.');
        }
      },
      error: (err) => {
        this.toast.error(err?.error?.error || 'Failed to update customer profile.');
      }
    });
  }

  toggleBlockStatus(customer: any) {
    const action = customer.status === 'Active' ? 'block' : 'unblock';
    this.api.patch<any>(`/admin/customers/${customer.id}/${action}`, {}).subscribe({
      next: (res) => {
        if (res?.success) {
          this.toast.success(`Customer ${action === 'block' ? 'blocked' : 'unblocked'} successfully.`);
          if (this.admin.activeTab() === 'customer-details') {
            this.fetchCustomerProfile(customer.id);
          } else {
            this.fetchCustomersList();
          }
        }
      }
    });
  }

  confirmDeleteCustomer(customer: any) {
    if (confirm(`Are you sure you want to soft-delete customer profile "${customer.name}"?`)) {
      this.api.delete<any>(`/admin/customers/${customer.id}`).subscribe({
        next: (res) => {
          if (res?.success) {
            this.toast.success('Customer profile soft-deleted successfully.');
            if (this.admin.activeTab() === 'customer-details') {
              this.admin.setActiveTab('customer-list');
            } else {
              this.fetchCustomersList();
            }
          } else {
            this.toast.error(res?.error || 'Cannot delete customer profile.');
          }
        },
        error: (err) => {
          this.toast.error(err?.error?.error || 'Failed to delete customer profile.');
        }
      });
    }
  }

  // --- ADDRESS ACTIONS ---
  openAddressModal(addr: any = null) {
    if (addr) {
      this.editingAddress.set(addr);
      this.addressForm = { ...addr };
    } else {
      this.editingAddress.set(null);
      this.addressForm = {
        id: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
        isDefault: false,
      };
    }
    this.showAddressModal.set(true);
  }

  submitAddressForm() {
    const custId = this.activeCustomer()?.id;
    if (!custId) return;

    if (this.editingAddress()) {
      this.api.put(`/admin/customers/${custId}/addresses/${this.addressForm.id}`, this.addressForm).subscribe({
        next: () => {
          this.toast.success('Address updated.');
          this.showAddressModal.set(false);
          this.fetchCustomerAddresses(custId);
        }
      });
    } else {
      this.api.post(`/admin/customers/${custId}/addresses`, this.addressForm).subscribe({
        next: () => {
          this.toast.success('Address added.');
          this.showAddressModal.set(false);
          this.fetchCustomerAddresses(custId);
        }
      });
    }
  }

  deleteAddress(addressId: string) {
    const custId = this.activeCustomer()?.id;
    if (!custId) return;
    this.api.delete(`/admin/customers/${custId}/addresses/${addressId}`).subscribe({
      next: () => {
        this.toast.success('Address deleted.');
        this.fetchCustomerAddresses(custId);
      }
    });
  }

  setDefaultAddress(addressId: string) {
    const custId = this.activeCustomer()?.id;
    if (!custId) return;
    this.api.patch(`/admin/customers/${custId}/addresses/${addressId}/default`, {}).subscribe({
      next: () => {
        this.toast.success('Default address updated.');
        this.fetchCustomerAddresses(custId);
      }
    });
  }

  // --- ADMIN NOTES ---
  submitNote() {
    const custId = this.activeCustomer()?.id;
    if (!custId || !this.newNoteText.trim()) return;

    this.api.post(`/admin/customers/${custId}/notes`, {
      note: this.newNoteText,
      isPinned: this.newNotePinned,
    }).subscribe({
      next: () => {
        this.toast.success('Admin note saved.');
        this.newNoteText = '';
        this.newNotePinned = false;
        this.fetchCustomerNotes(custId);
      }
    });
  }

  togglePinNote(note: any) {
    const custId = this.activeCustomer()?.id;
    if (!custId) return;
    this.api.patch(`/admin/customers/${custId}/notes/${note.id}/pin`, {
      isPinned: !note.isPinned,
    }).subscribe({
      next: () => {
        this.fetchCustomerNotes(custId);
      }
    });
  }

  deleteNote(noteId: string) {
    const custId = this.activeCustomer()?.id;
    if (!custId) return;
    this.api.delete(`/admin/customers/${custId}/notes/${noteId}`).subscribe({
      next: () => {
        this.toast.success('Note deleted.');
        this.fetchCustomerNotes(custId);
      }
    });
  }

  // --- UTILS & HELPERS ---
  getInitials(name: string): string {
    if (!name) return 'CU';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  getPaginationStart(): number {
    if (this.totalCustomers() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  getPaginationEnd(): number {
    return Math.min(this.currentPage() * this.pageSize(), this.totalCustomers());
  }

  getDeliveredOrdersCount(): number {
    return this.customerOrders().filter(o => o.deliveryStatus === 'DELIVERED').length;
  }

  getPendingOrdersCount(): number {
    return this.customerOrders().filter(o => ['PENDING', 'PROCESSING', 'SHIPPED'].includes(o.deliveryStatus)).length;
  }

  getCancelledOrdersCount(): number {
    return this.customerOrders().filter(o => o.deliveryStatus === 'CANCELLED').length;
  }

  viewOrderDetails(orderId: string) {
    this.selectedOrderForView.set(orderId);
  }

  openWhatsApp(phone?: string, name?: string) {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const url = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(`Hi ${name || 'Customer'}, reaching out regarding your account at 3D Galaxy.`)}`;
    window.open(url, '_blank');
  }

  sendEmail(email?: string) {
    if (email) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent('Update regarding your 3D Galaxy Account')}`;
    }
  }

  openPushModal() {
    this.toast.info('Sending test push notification to customer...');
  }
}
