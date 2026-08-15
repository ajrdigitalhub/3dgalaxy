import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { NotificationService } from "../../../services/notification.service";
import { ToastService } from "../../../shared/components/toast/toast.service";

export interface AdminDevice {
  id: string;
  adminId: string;
  adminName?: string;
  adminEmail?: string;
  adminRole?: string;
  deviceName: string;
  deviceType: string;       // Desktop, Mobile, Tablet
  platform: string;         // Windows 11, macOS, Linux, Android, iOS
  browser: string;          // Chrome 138, Edge, Safari, Firefox
  operatingSystem: string;
  fcmToken: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  isOnline?: boolean;
  notificationEnabled?: boolean;
  notificationPermission?: string;
  lastNotificationSentAt?: string;
  notificationCount?: number;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryLog {
  id: string;
  notificationId?: string;
  adminId?: string;
  adminEmail?: string;
  deviceName?: string;
  fcmToken?: string;
  title: string;
  body: string;
  category?: string;
  tokensSent: number;
  successCount: number;
  failureCount: number;
  failedTokens?: string[];
  status: string;
  failureReason?: string;
  retryCount?: number;
  sentAt: string;
}

@Component({
  selector: "app-admin-devices-tab",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans animate-fadeIn text-left">
      
      <!-- TOP HEADER & ACTION BAR -->
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <mat-icon class="text-2xl">devices</mat-icon>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                Admin Registered Devices
              </h2>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Multi-Admin FCM Active
              </span>
            </div>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Monitor administrator FCM tokens, device telemetry, activity status, and push notification delivery logs.
            </p>
          </div>
        </div>

        <!-- MAIN SUB-TAB SWITCHER & ACTIONS -->
        <div class="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          
          <div class="flex items-center bg-zinc-100 dark:bg-zinc-950 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 shrink-0">
            <button
              (click)="activeMainView.set('devices')"
              [class]="activeMainView() === 'devices' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm font-extrabold' : 'text-zinc-500 dark:text-zinc-400 font-bold hover:text-zinc-900'"
              class="px-3.5 py-1.5 rounded-xl text-xs transition border-none cursor-pointer flex items-center gap-1.5"
            >
              <mat-icon class="text-sm">phonelink</mat-icon>
              <span>Registered Devices</span>
              <span class="ml-1 px-1.5 py-0.2 bg-blue-500/10 text-blue-600 text-[10px] rounded-full font-mono font-bold">{{ totalDevicesCount() }}</span>
            </button>

            <button
              (click)="activeMainView.set('logs')"
              [class]="activeMainView() === 'logs' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm font-extrabold' : 'text-zinc-500 dark:text-zinc-400 font-bold hover:text-zinc-900'"
              class="px-3.5 py-1.5 rounded-xl text-xs transition border-none cursor-pointer flex items-center gap-1.5"
            >
              <mat-icon class="text-sm">history</mat-icon>
              <span>Delivery History</span>
            </button>
          </div>

          <button
            (click)="openBroadcastModal()"
            class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition border-none cursor-pointer flex items-center gap-1.5"
          >
            <mat-icon class="text-sm">campaign</mat-icon>
            <span>Broadcast Push</span>
          </button>

          <button
            (click)="exportCsv()"
            class="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Export CSV / Excel"
          >
            <mat-icon class="text-sm text-emerald-600">download</mat-icon>
            <span class="hidden sm:inline">Export</span>
          </button>

          <button
            (click)="triggerAutoCleanup()"
            [disabled]="cleaning()"
            class="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Run Daily Token Cleanup"
          >
            <mat-icon [class.animate-spin]="cleaning()" class="text-sm text-amber-500">cleaning_services</mat-icon>
          </button>

          <button
            (click)="refreshCurrentView()"
            [disabled]="loading()"
            class="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 transition cursor-pointer"
            title="Refresh Data"
          >
            <mat-icon [class.animate-spin]="loading()" class="text-sm">refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- VIEW 1: REGISTERED DEVICES MANAGEMENT -->
      @if (activeMainView() === 'devices') {
        
        <!-- 6 REQUIRED SUMMARY CARDS -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          
          <!-- Total Admin Users -->
          <div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-[10px] font-black uppercase tracking-wider text-zinc-400">Admin Users</span>
              <div class="text-xl font-black text-zinc-900 dark:text-white">{{ totalAdminUsersCount() }}</div>
            </div>
            <div class="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <mat-icon class="text-base">admin_panel_settings</mat-icon>
            </div>
          </div>

          <!-- Total Registered Devices -->
          <div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Devices</span>
              <div class="text-xl font-black text-zinc-900 dark:text-white">{{ totalDevicesCount() }}</div>
            </div>
            <div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <mat-icon class="text-base">important_devices</mat-icon>
            </div>
          </div>

          <!-- Active Devices -->
          <div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-[10px] font-black uppercase tracking-wider text-emerald-500">Active Devices</span>
              <div class="text-xl font-black text-emerald-600 dark:text-emerald-400">{{ activeDevicesCount() }}</div>
            </div>
            <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <mat-icon class="text-base">phonelink_ring</mat-icon>
            </div>
          </div>

          <!-- Inactive Devices -->
          <div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-[10px] font-black uppercase tracking-wider text-zinc-400">Inactive Devices</span>
              <div class="text-xl font-black text-zinc-500 dark:text-zinc-400">{{ inactiveDevicesCount() }}</div>
            </div>
            <div class="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
              <mat-icon class="text-base">phonelink_off</mat-icon>
            </div>
          </div>

          <!-- Online Devices -->
          <div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-[10px] font-black uppercase tracking-wider text-sky-500">Online Devices</span>
              <div class="text-xl font-black text-sky-600 dark:text-sky-400">{{ onlineDevicesCount() }}</div>
            </div>
            <div class="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <mat-icon class="text-base">sensors</mat-icon>
            </div>
          </div>

          <!-- Offline Devices -->
          <div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-[10px] font-black uppercase tracking-wider text-zinc-400">Offline Devices</span>
              <div class="text-xl font-black text-zinc-400">{{ offlineDevicesCount() }}</div>
            </div>
            <div class="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
              <mat-icon class="text-base">sensors_off</mat-icon>
            </div>
          </div>

        </div>

        <!-- COMPREHENSIVE SEARCH & MULTI-FILTER TOOLBAR -->
        <div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-3">
          
          <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            <!-- Search Field -->
            <div class="relative flex-1">
              <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">search</mat-icon>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onFilterChange()"
                placeholder="Search by Admin Name, Email, Device, Browser, OS, IP, Token..."
                class="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <!-- Quick Status Filters -->
            <div class="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 shrink-0 overflow-x-auto">
              <button
                (click)="setStatusFilter('all')"
                [class]="statusFilter === 'all' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm font-black' : 'text-zinc-500 font-bold hover:text-zinc-900'"
                class="px-3 py-1 rounded-lg text-xs transition border-none cursor-pointer"
              >
                All Status
              </button>
              <button
                (click)="setStatusFilter('active')"
                [class]="statusFilter === 'active' ? 'bg-emerald-500 text-white shadow-sm font-black' : 'text-zinc-500 font-bold hover:text-zinc-900'"
                class="px-3 py-1 rounded-lg text-xs transition border-none cursor-pointer"
              >
                Active
              </button>
              <button
                (click)="setStatusFilter('inactive')"
                [class]="statusFilter === 'inactive' ? 'bg-zinc-600 text-white shadow-sm font-black' : 'text-zinc-500 font-bold hover:text-zinc-900'"
                class="px-3 py-1 rounded-lg text-xs transition border-none cursor-pointer"
              >
                Inactive
              </button>
              <button
                (click)="setOnlineFilter('online')"
                [class]="onlineFilter === 'online' ? 'bg-sky-500 text-white shadow-sm font-black' : 'text-zinc-500 font-bold hover:text-zinc-900'"
                class="px-3 py-1 rounded-lg text-xs transition border-none cursor-pointer"
              >
                Online
              </button>
              <button
                (click)="setOnlineFilter('offline')"
                [class]="onlineFilter === 'offline' ? 'bg-zinc-500 text-white shadow-sm font-black' : 'text-zinc-500 font-bold hover:text-zinc-900'"
                class="px-3 py-1 rounded-lg text-xs transition border-none cursor-pointer"
              >
                Offline
              </button>
            </div>

          </div>

          <!-- ADVANCED FILTER DROPDOWNS -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
            
            <div>
              <label class="block text-[9px] font-black uppercase text-zinc-400 mb-1">Filter by Role</label>
              <select
                [(ngModel)]="roleFilter"
                (change)="onFilterChange()"
                class="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
              </select>
            </div>

            <div>
              <label class="block text-[9px] font-black uppercase text-zinc-400 mb-1">Filter by Platform</label>
              <select
                [(ngModel)]="platformFilter"
                (change)="onFilterChange()"
                class="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">All Platforms</option>
                <option value="Windows">Windows</option>
                <option value="macOS">macOS</option>
                <option value="Linux">Linux</option>
                <option value="Android">Android</option>
                <option value="iOS">iOS</option>
              </select>
            </div>

            <div>
              <label class="block text-[9px] font-black uppercase text-zinc-400 mb-1">Filter by Browser</label>
              <select
                [(ngModel)]="browserFilter"
                (change)="onFilterChange()"
                class="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">All Browsers</option>
                <option value="Chrome">Chrome</option>
                <option value="Edge">Edge</option>
                <option value="Safari">Safari</option>
                <option value="Firefox">Firefox</option>
              </select>
            </div>

            <div>
              <label class="block text-[9px] font-black uppercase text-zinc-400 mb-1">Sort By</label>
              <select
                [(ngModel)]="sortBy"
                (change)="onSortChange()"
                class="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="lastUsedAt_desc">Last Active (Newest)</option>
                <option value="createdAt_desc">Registration Date (Newest)</option>
                <option value="adminName_asc">Admin Name (A-Z)</option>
                <option value="deviceName_asc">Device Name (A-Z)</option>
              </select>
            </div>

          </div>

        </div>

        <!-- REGISTERED DEVICES DATA TABLE -->
        <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
          
          @if (loading()) {
            <!-- LOADING SKELETON -->
            <div class="p-12 text-center text-zinc-400 space-y-3 animate-pulse">
              <mat-icon class="text-4xl text-blue-500 animate-spin">refresh</mat-icon>
              <p class="text-xs font-bold uppercase tracking-wider">Fetching admin registered devices...</p>
            </div>
          } @else if (devices().length === 0) {
            <!-- EMPTY STATE -->
            <div class="p-12 text-center text-zinc-400 space-y-3">
              <mat-icon class="text-5xl text-zinc-300 dark:text-zinc-700">phonelink_off</mat-icon>
              <p class="text-sm font-extrabold text-zinc-700 dark:text-zinc-300">No registered admin devices match your filter.</p>
              <p class="text-xs text-zinc-400 max-w-sm mx-auto">
                Devices automatically register FCM push tokens upon administrator login or when push permissions are enabled.
              </p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr class="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400 font-black sticky top-0 z-10 backdrop-blur-md">
                    <th class="py-3.5 px-4">Administrator</th>
                    <th class="py-3.5 px-4">Device & OS</th>
                    <th class="py-3.5 px-4">Platform & Browser</th>
                    <th class="py-3.5 px-4">FCM Token</th>
                    <th class="py-3.5 px-4">Registration</th>
                    <th class="py-3.5 px-4">Last Active</th>
                    <th class="py-3.5 px-4 text-center">Notification</th>
                    <th class="py-3.5 px-4 text-center">Online</th>
                    <th class="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                  @for (device of devices(); track device.id) {
                    <tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition">
                      
                      <!-- Administrator Info -->
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-2.5">
                          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 uppercase shadow-sm">
                            {{ (device.adminName || device.adminEmail || 'A')[0] }}
                          </div>
                          <div class="min-w-0">
                            <div class="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs truncate">
                              {{ device.adminName || 'Administrator' }}
                            </div>
                            <div class="text-[10px] text-zinc-400 font-mono truncate">
                              {{ device.adminEmail || 'admin@3dgalaxy.com' }}
                            </div>
                            <span class="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                              {{ device.adminRole || 'Super Admin' }}
                            </span>
                          </div>
                        </div>
                      </td>

                      <!-- Device & OS -->
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-2.5">
                          <div [class]="getPlatformBgClass(device.platform || device.operatingSystem)" class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                            <mat-icon class="text-base">{{ getPlatformIcon(device.platform || device.operatingSystem) }}</mat-icon>
                          </div>
                          <div>
                            <div class="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1">
                              {{ device.deviceName || 'Admin Browser' }}
                            </div>
                            <div class="text-[10px] text-zinc-400">
                              {{ device.operatingSystem || 'Windows' }} • <span class="font-semibold">{{ device.deviceType || 'Desktop' }}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- Platform & Browser -->
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-semibold">
                          <mat-icon class="text-sm text-blue-500">{{ getBrowserIcon(device.browser) }}</mat-icon>
                          <span>{{ device.browser || 'Chrome' }}</span>
                        </div>
                        <div class="text-[10px] text-zinc-400 font-mono" [title]="device.userAgent || ''">
                          IP: {{ device.ipAddress || '127.0.0.1' }}
                        </div>
                      </td>

                      <!-- FCM Token (Masked with copy) -->
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 bg-blue-500/5 px-2 py-1 rounded-lg border border-blue-500/10 w-fit">
                          <span>{{ maskToken(device.fcmToken) }}</span>
                          <button
                            (click)="copyToken(device.fcmToken)"
                            class="p-0.5 text-zinc-400 hover:text-blue-600 border-none bg-transparent cursor-pointer"
                            title="Copy FCM Token"
                          >
                            <mat-icon class="text-xs">content_copy</mat-icon>
                          </button>
                        </div>
                      </td>

                      <!-- Registration Date -->
                      <td class="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 text-[11px]">
                        {{ formatDate(device.createdAt) }}
                      </td>

                      <!-- Last Active -->
                      <td class="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 text-[11px]">
                        <div class="font-bold text-zinc-800 dark:text-zinc-200">
                          {{ formatDate(device.lastUsedAt || device.updatedAt) }}
                        </div>
                      </td>

                      <!-- Notification Status -->
                      <td class="py-3.5 px-4 text-center">
                        <button
                          (click)="toggleNotificationPermission(device)"
                          [class]="device.notificationEnabled !== false ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'"
                          class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-flex items-center gap-1 cursor-pointer transition"
                          [title]="device.notificationEnabled !== false ? 'Click to Disable Notifications' : 'Click to Enable Notifications'"
                        >
                          <span [class]="device.notificationEnabled !== false ? 'bg-emerald-500' : 'bg-rose-500'" class="w-1.5 h-1.5 rounded-full"></span>
                          {{ device.notificationEnabled !== false ? 'Active' : 'Disabled' }}
                        </button>
                      </td>

                      <!-- Login / Online Status -->
                      <td class="py-3.5 px-4 text-center">
                        <span
                          [class]="device.isOnline !== false ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'"
                          class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-flex items-center gap-1"
                        >
                          <span [class]="device.isOnline !== false ? 'bg-sky-500' : 'bg-zinc-400'" class="w-1.5 h-1.5 rounded-full"></span>
                          {{ device.isOnline !== false ? 'Online' : 'Offline' }}
                        </span>
                      </td>

                      <!-- Row Actions -->
                      <td class="py-3.5 px-4 text-right">
                        <div class="flex items-center justify-end gap-1">
                          
                          <!-- View Details Dialog -->
                          <button
                            (click)="openDeviceDetails(device)"
                            class="p-1.5 text-zinc-400 hover:text-blue-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border-none bg-transparent cursor-pointer"
                            title="View Device Details"
                          >
                            <mat-icon class="text-sm">visibility</mat-icon>
                          </button>

                          <!-- Force Refresh Token -->
                          <button
                            (click)="forceRefreshToken(device)"
                            class="p-1.5 text-zinc-400 hover:text-amber-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border-none bg-transparent cursor-pointer"
                            title="Force Refresh Token"
                          >
                            <mat-icon class="text-sm">sync</mat-icon>
                          </button>

                          <!-- Send Test Push -->
                          <button
                            (click)="sendTestPush(device)"
                            [disabled]="!device.isActive"
                            class="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition border-none bg-transparent cursor-pointer disabled:opacity-30"
                            title="Send Test Push Alert"
                          >
                            <mat-icon class="text-sm">send</mat-icon>
                          </button>

                          <!-- Deactivate Device -->
                          <button
                            (click)="toggleDeviceActive(device)"
                            class="p-1.5 text-zinc-400 hover:text-amber-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border-none bg-transparent cursor-pointer"
                            [title]="device.isActive ? 'Deactivate Device' : 'Activate Device'"
                          >
                            <mat-icon class="text-sm">{{ device.isActive ? 'power_settings_new' : 'check_circle_outline' }}</mat-icon>
                          </button>

                          <!-- Delete Device Token -->
                          <button
                            (click)="confirmDeleteDevice(device)"
                            class="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition border-none bg-transparent cursor-pointer"
                            title="Unregister & Delete Device"
                          >
                            <mat-icon class="text-sm">delete_outline</mat-icon>
                          </button>

                        </div>
                      </td>

                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- PAGINATION FOOTER -->
          <div class="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
            <div>
              Showing {{ devices().length }} of {{ totalDevicesCount() }} registered admin device(s)
            </div>

            <div class="flex items-center gap-2">
              <button
                (click)="changePage(currentPage - 1)"
                [disabled]="currentPage <= 1"
                class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <span class="font-bold text-zinc-900 dark:text-white">Page {{ currentPage }}</span>
              <button
                (click)="changePage(currentPage + 1)"
                [disabled]="currentPage * limit >= totalDevicesCount()"
                class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>

        </div>

      } @else {
        
        <!-- VIEW 2: NOTIFICATION DELIVERY HISTORY LOGS -->
        <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden p-6 space-y-4">
          
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 class="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <mat-icon class="text-blue-500">receipt_long</mat-icon>
                Notification Delivery History
              </h3>
              <p class="text-xs text-zinc-500">
                Log history of all broadcasted push notifications and multicast delivery responses.
              </p>
            </div>

            <button
              (click)="loadDeliveryLogs()"
              class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition border-none cursor-pointer flex items-center gap-1.5"
            >
              <mat-icon class="text-sm">refresh</mat-icon>
              <span>Refresh History</span>
            </button>
          </div>

          @if (loadingLogs()) {
            <div class="p-12 text-center text-zinc-400 space-y-3">
              <mat-icon class="text-3xl animate-spin text-blue-500">refresh</mat-icon>
              <p class="text-xs font-bold uppercase tracking-wider">Loading delivery history logs...</p>
            </div>
          } @else if (deliveryLogs().length === 0) {
            <div class="p-12 text-center text-zinc-400 space-y-2">
              <mat-icon class="text-4xl text-zinc-300 dark:text-zinc-700">history_toggle_off</mat-icon>
              <p class="text-xs font-bold uppercase tracking-wider text-zinc-500">No notification delivery logs found.</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr class="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400 font-black">
                    <th class="py-3.5 px-4">Notification Alert</th>
                    <th class="py-3.5 px-4">Category</th>
                    <th class="py-3.5 px-4">Target Admin / Device</th>
                    <th class="py-3.5 px-4 text-center">Tokens Sent</th>
                    <th class="py-3.5 px-4 text-center">Delivered</th>
                    <th class="py-3.5 px-4 text-center">Failed</th>
                    <th class="py-3.5 px-4 text-center">Status</th>
                    <th class="py-3.5 px-4">Sent Time</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                  @for (log of deliveryLogs(); track log.id) {
                    <tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                      <td class="py-3.5 px-4">
                        <div class="font-extrabold text-zinc-900 dark:text-zinc-100">{{ log.title }}</div>
                        <div class="text-[11px] text-zinc-500 line-clamp-1">{{ log.body }}</div>
                      </td>
                      <td class="py-3.5 px-4">
                        <span class="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black uppercase">
                          {{ log.category || 'System Alert' }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-zinc-600 dark:text-zinc-300 font-mono text-[10px]">
                        {{ log.adminEmail || log.deviceName || 'All Active Devices' }}
                      </td>
                      <td class="py-3.5 px-4 text-center font-bold text-zinc-800 dark:text-zinc-200">
                        {{ log.tokensSent }}
                      </td>
                      <td class="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {{ log.successCount }}
                      </td>
                      <td class="py-3.5 px-4 text-center font-bold text-rose-500">
                        {{ log.failureCount }}
                      </td>
                      <td class="py-3.5 px-4 text-center">
                        <span
                          [class]="log.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'"
                          class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                        >
                          {{ log.status }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-zinc-400 text-[11px]">
                        {{ formatDate(log.sentAt) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

        </div>

      }

      <!-- DEVICE DETAILS DIALOG MODAL -->
      @if (selectedDeviceForDetails()) {
        <div class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-fadeIn my-auto">
            
            <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div class="flex items-center gap-3">
                <div [class]="getPlatformBgClass(selectedDeviceForDetails()!.platform)" class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <mat-icon class="text-xl">{{ getPlatformIcon(selectedDeviceForDetails()!.platform) }}</mat-icon>
                </div>
                <div>
                  <h3 class="text-base font-black text-zinc-900 dark:text-white">
                    Device Telemetry & FCM Details
                  </h3>
                  <p class="text-xs text-zinc-500">
                    Registered administrator FCM device attributes and notification statistics.
                  </p>
                </div>
              </div>
              <button
                (click)="selectedDeviceForDetails.set(null)"
                class="text-zinc-400 hover:text-zinc-600 rounded-lg p-1 border-none bg-transparent cursor-pointer"
              >
                <mat-icon class="text-xl">close</mat-icon>
              </button>
            </div>

            <div class="space-y-4 text-xs font-sans">
              
              <!-- Section 1: Admin Info -->
              <div class="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-2">
                <h4 class="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Administrator Details</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <span class="text-zinc-400 text-[10px] block">Name:</span>
                    <span class="font-extrabold text-zinc-900 dark:text-white">{{ selectedDeviceForDetails()!.adminName || 'Administrator' }}</span>
                  </div>
                  <div>
                    <span class="text-zinc-400 text-[10px] block">Email:</span>
                    <span class="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{{ selectedDeviceForDetails()!.adminEmail || 'admin@3dgalaxy.com' }}</span>
                  </div>
                  <div>
                    <span class="text-zinc-400 text-[10px] block">Role:</span>
                    <span class="font-bold text-indigo-600 dark:text-indigo-400">{{ selectedDeviceForDetails()!.adminRole || 'Super Admin' }}</span>
                  </div>
                  <div>
                    <span class="text-zinc-400 text-[10px] block">Admin ID:</span>
                    <span class="font-mono text-zinc-700 dark:text-zinc-300 text-[11px]">{{ selectedDeviceForDetails()!.adminId }}</span>
                  </div>
                </div>
              </div>

              <!-- Section 2: Device & System Info -->
              <div class="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-2">
                <h4 class="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Device & Network Hardware</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <span class="text-zinc-400 text-[10px] block">Device Name:</span>
                    <span class="font-bold text-zinc-900 dark:text-white">{{ selectedDeviceForDetails()!.deviceName }}</span>
                  </div>
                  <div>
                    <span class="text-zinc-400 text-[10px] block">Device Type:</span>
                    <span class="font-bold text-zinc-800 dark:text-zinc-200">{{ selectedDeviceForDetails()!.deviceType }}</span>
                  </div>
                  <div>
                    <span class="text-zinc-400 text-[10px] block">Platform / OS:</span>
                    <span class="font-bold text-zinc-800 dark:text-zinc-200">{{ selectedDeviceForDetails()!.operatingSystem }} ({{ selectedDeviceForDetails()!.platform }})</span>
                  </div>
                  <div>
                    <span class="text-zinc-400 text-[10px] block">Browser:</span>
                    <span class="font-bold text-blue-600 dark:text-blue-400">{{ selectedDeviceForDetails()!.browser }}</span>
                  </div>
                  <div class="col-span-2">
                    <span class="text-zinc-400 text-[10px] block">IP Address:</span>
                    <span class="font-mono text-zinc-700 dark:text-zinc-300 text-[11px]">{{ selectedDeviceForDetails()!.ipAddress || '127.0.0.1' }}</span>
                  </div>
                  <div class="col-span-2">
                    <span class="text-zinc-400 text-[10px] block">User Agent:</span>
                    <span class="font-mono text-zinc-500 text-[10px] break-all block max-h-16 overflow-y-auto p-1 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      {{ selectedDeviceForDetails()!.userAgent || 'N/A' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Section 3: FCM Token & Activity Stats -->
              <div class="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-2">
                <h4 class="text-[10px] font-black uppercase text-zinc-400 tracking-wider">FCM Token & Notification Metrics</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <span class="text-zinc-400 text-[10px] block">Token Created (Registration):</span>
                    <span class="font-bold text-zinc-800 dark:text-zinc-200">{{ formatDate(selectedDeviceForDetails()!.createdAt) }}</span>
                  </div>
                  <div>
                    <span class="text-zinc-400 text-[10px] block">Last Active / Updated:</span>
                    <span class="font-bold text-zinc-800 dark:text-zinc-200">{{ formatDate(selectedDeviceForDetails()!.lastUsedAt || selectedDeviceForDetails()!.updatedAt) }}</span>
                  </div>
                  <div>
                    <span class="text-zinc-400 text-[10px] block">Notifications Sent Count:</span>
                    <span class="font-extrabold text-emerald-600 dark:text-emerald-400">{{ selectedDeviceForDetails()!.notificationCount || 0 }} alert(s)</span>
                  </div>
                  <div>
                    <span class="text-zinc-400 text-[10px] block">Last Notification Sent:</span>
                    <span class="font-bold text-zinc-800 dark:text-zinc-200">{{ selectedDeviceForDetails()!.lastNotificationSentAt ? formatDate(selectedDeviceForDetails()!.lastNotificationSentAt!) : 'Never' }}</span>
                  </div>
                </div>

                <div class="pt-2">
                  <span class="text-zinc-400 text-[10px] block mb-1">Full FCM Token:</span>
                  <div class="flex items-center gap-2">
                    <input
                      type="text"
                      readonly
                      [value]="selectedDeviceForDetails()!.fcmToken"
                      class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-mono text-blue-600 dark:text-blue-400 outline-none"
                    />
                    <button
                      (click)="copyToken(selectedDeviceForDetails()!.fcmToken)"
                      class="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-xs border-none cursor-pointer shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <div class="flex items-center justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                (click)="selectedDeviceForDetails.set(null)"
                class="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-200 font-bold rounded-xl text-xs border-none cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      }

      <!-- MULTICAST BROADCAST MODAL -->
      @if (showBroadcastModal()) {
        <div class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fadeIn my-auto">
            
            <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <mat-icon class="text-xl">campaign</mat-icon>
                </div>
                <h3 class="text-base font-black text-zinc-900 dark:text-white">
                  Broadcast Push Notification
                </h3>
              </div>
              <button
                (click)="showBroadcastModal.set(false)"
                class="text-zinc-400 hover:text-zinc-600 rounded-lg p-1 border-none bg-transparent cursor-pointer"
              >
                <mat-icon class="text-xl">close</mat-icon>
              </button>
            </div>

            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              Dispatches a live FCM push notification broadcast to all <strong>{{ activeDevicesCount() }} active admin device(s)</strong> across registered administrators.
            </p>

            <div class="space-y-3 text-xs">
              <div>
                <label class="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 uppercase tracking-wider text-[10px]">
                  Notification Title *
                </label>
                <input
                  type="text"
                  [(ngModel)]="broadcastForm.title"
                  placeholder="e.g. 🚨 New Order Received!"
                  class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 uppercase tracking-wider text-[10px]">
                  Notification Message Body *
                </label>
                <textarea
                  rows="3"
                  [(ngModel)]="broadcastForm.body"
                  placeholder="Enter detailed alert body text..."
                  class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                ></textarea>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 uppercase tracking-wider text-[10px]">
                    Category / Trigger
                  </label>
                  <select
                    [(ngModel)]="broadcastForm.type"
                    class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="system">System Alert</option>
                    <option value="orders">New Order</option>
                    <option value="customers">New Customer</option>
                    <option value="inventory">Low Stock Alert</option>
                    <option value="reviews">New Review</option>
                    <option value="service">Service Request</option>
                    <option value="refund">Refund Request</option>
                    <option value="return">Return Request</option>
                    <option value="newsletter">Newsletter Subscription</option>
                  </select>
                </div>

                <div>
                  <label class="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 uppercase tracking-wider text-[10px]">
                    Target Deep Link
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="broadcastForm.deepLink"
                    placeholder="/admin/orders"
                    class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                (click)="showBroadcastModal.set(false)"
                class="px-4 py-2.5 rounded-xl text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border-none cursor-pointer"
              >
                Cancel
              </button>

              <button
                (click)="sendBroadcast()"
                [disabled]="broadcasting() || !broadcastForm.title || !broadcastForm.body"
                class="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition border-none cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
              >
                <mat-icon [class.animate-spin]="broadcasting()" class="text-sm">send</mat-icon>
                <span>{{ broadcasting() ? 'Broadcasting...' : 'Send Multicast Push' }}</span>
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  `,
})
export class AdminDevicesTab implements OnInit {
  private ns = inject(NotificationService);
  private toastService = inject(ToastService);

  activeMainView = signal<'devices' | 'logs'>('devices');
  devices = signal<AdminDevice[]>([]);
  deliveryLogs = signal<DeliveryLog[]>([]);
  selectedDeviceForDetails = signal<AdminDevice | null>(null);

  loading = signal<boolean>(false);
  loadingLogs = signal<boolean>(false);
  cleaning = signal<boolean>(false);
  broadcasting = signal<boolean>(false);
  showBroadcastModal = signal<boolean>(false);

  // 6 KPI Summary Counters
  totalAdminUsersCount = signal<number>(0);
  totalDevicesCount = signal<number>(0);
  activeDevicesCount = signal<number>(0);
  inactiveDevicesCount = signal<number>(0);
  onlineDevicesCount = signal<number>(0);
  offlineDevicesCount = signal<number>(0);

  // Filters & Pagination State
  searchQuery = "";
  statusFilter = "all";
  onlineFilter = "all";
  roleFilter = "all";
  platformFilter = "all";
  browserFilter = "all";
  sortBy = "lastUsedAt_desc";
  currentPage = 1;
  limit = 20;

  broadcastForm = {
    title: "",
    body: "",
    type: "system",
    deepLink: "/admin",
  };

  ngOnInit() {
    this.loadDevices();
    this.loadDeliveryLogs();
  }

  refreshCurrentView() {
    if (this.activeMainView() === 'devices') {
      this.loadDevices();
    } else {
      this.loadDeliveryLogs();
    }
  }

  loadDevices() {
    this.loading.set(true);
    const params: any = {
      page: this.currentPage,
      limit: this.limit,
    };

    if (this.statusFilter !== "all") params.status = this.statusFilter;
    if (this.onlineFilter !== "all") params.online = this.onlineFilter === "online" ? "true" : "false";
    if (this.roleFilter !== "all") params.role = this.roleFilter;
    if (this.platformFilter !== "all") params.platform = this.platformFilter;
    if (this.browserFilter !== "all") params.browser = this.browserFilter;
    if (this.searchQuery.trim()) params.search = this.searchQuery.trim();

    this.ns.getAdminDevicesList(params).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res && res.data) {
          this.devices.set(res.data);
          this.totalDevicesCount.set(res.totalCount || res.data.length);
          this.activeDevicesCount.set(res.activeCount || res.data.filter((d: any) => d.isActive).length);
          this.inactiveDevicesCount.set(res.inactiveCount || res.data.filter((d: any) => !d.isActive).length);
          this.onlineDevicesCount.set(res.onlineCount || res.data.filter((d: any) => d.isOnline !== false).length);
          this.offlineDevicesCount.set(res.offlineCount || res.data.filter((d: any) => d.isOnline === false).length);
          this.totalAdminUsersCount.set(res.totalAdminUsers || new Set(res.data.map((d: any) => d.adminId)).size);
        }
      },
      error: (err) => {
        this.loading.set(false);
        console.error("Failed to fetch admin devices:", err);
        this.toastService.error("Failed to load registered admin devices.");
      },
    });
  }

  loadDeliveryLogs() {
    this.loadingLogs.set(true);
    this.ns.getDeliveryHistoryLogs({ limit: 50 }).subscribe({
      next: (res) => {
        this.loadingLogs.set(false);
        if (res && res.data) {
          this.deliveryLogs.set(res.data);
        }
      },
      error: (err) => {
        this.loadingLogs.set(false);
        console.error("Failed to fetch delivery logs:", err);
      },
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadDevices();
  }

  onSortChange() {
    this.currentPage = 1;
    this.loadDevices();
  }

  setStatusFilter(status: string) {
    this.statusFilter = status;
    this.currentPage = 1;
    this.loadDevices();
  }

  setOnlineFilter(online: string) {
    this.onlineFilter = online;
    this.currentPage = 1;
    this.loadDevices();
  }

  changePage(page: number) {
    this.currentPage = page;
    this.loadDevices();
  }

  maskToken(token: string): string {
    if (!token) return "No Token";
    if (token.length <= 12) return token;
    return `••••${token.slice(-8)}`;
  }

  copyToken(token: string) {
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
      this.toastService.success("FCM Token copied to clipboard!");
    });
  }

  exportCsv() {
    this.ns.exportDevicesCsv();
    this.toastService.success("Exporting admin registered devices CSV...");
  }

  triggerAutoCleanup() {
    this.cleaning.set(true);
    this.ns.cleanupStaleDevices().subscribe({
      next: (res) => {
        this.cleaning.set(false);
        this.toastService.success(res?.message || "Token cleanup executed successfully.");
        this.loadDevices();
      },
      error: () => {
        this.cleaning.set(false);
        this.toastService.error("Failed to run automated cleanup.");
      },
    });
  }

  openDeviceDetails(device: AdminDevice) {
    this.selectedDeviceForDetails.set(device);
  }

  forceRefreshToken(device: AdminDevice) {
    this.ns.forceRefreshToken({ id: device.id, fcmToken: device.fcmToken }).subscribe({
      next: () => {
        this.toastService.success(`Token status refreshed for "${device.deviceName}".`);
        this.loadDevices();
      },
      error: () => {
        this.toastService.error("Failed to refresh token status.");
      },
    });
  }

  toggleNotificationPermission(device: AdminDevice) {
    const nextStatus = !(device.notificationEnabled !== false);
    this.ns.toggleNotificationStatus({ id: device.id, notificationEnabled: nextStatus }).subscribe({
      next: () => {
        this.toastService.success(`Notifications ${nextStatus ? "enabled" : "disabled"} for device.`);
        this.loadDevices();
      },
      error: () => {
        this.toastService.error("Failed to update notification status.");
      },
    });
  }

  toggleDeviceActive(device: AdminDevice) {
    const updatedStatus = !device.isActive;
    this.ns.updateAdminDevice({ id: device.id, isActive: updatedStatus }).subscribe({
      next: () => {
        this.toastService.success(`Device "${device.deviceName}" ${updatedStatus ? "activated" : "deactivated"}.`);
        this.loadDevices();
      },
      error: () => {
        this.toastService.error("Failed to update device active status.");
      },
    });
  }

  confirmDeleteDevice(device: AdminDevice) {
    if (confirm(`Unregister device "${device.deviceName}" (${device.adminEmail})? It will stop receiving push alerts.`)) {
      this.ns.deleteAdminDevice(device.id).subscribe({
        next: () => {
          this.toastService.success("Admin device unregistered successfully.");
          this.loadDevices();
        },
        error: () => {
          this.toastService.error("Failed to unregister admin device.");
        },
      });
    }
  }

  sendTestPush(device: AdminDevice) {
    this.ns.sendTestNotification(device.fcmToken).subscribe({
      next: () => {
        this.toastService.success(`Test push notification dispatched to "${device.deviceName}"!`);
        this.loadDeliveryLogs();
      },
      error: () => {
        this.toastService.error("Failed to dispatch test push notification.");
      },
    });
  }

  openBroadcastModal() {
    this.broadcastForm = {
      title: "🚨 System Admin Notification",
      body: "Important operational alert for all system administrators.",
      type: "system",
      deepLink: "/admin",
    };
    this.showBroadcastModal.set(true);
  }

  sendBroadcast() {
    if (!this.broadcastForm.title || !this.broadcastForm.body) return;
    this.broadcasting.set(true);

    this.ns.broadcastAdminNotification(this.broadcastForm).subscribe({
      next: (res) => {
        this.broadcasting.set(false);
        this.showBroadcastModal.set(false);
        const count = res?.tokensSent || this.activeDevicesCount();
        this.toastService.success(`Push notification broadcasted to ${count} active admin device(s)!`);
        this.loadDevices();
        this.loadDeliveryLogs();
      },
      error: (err) => {
        this.broadcasting.set(false);
        console.error("Broadcast failed:", err);
        this.toastService.error("Failed to broadcast notification.");
      },
    });
  }

  getPlatformIcon(platform: string): string {
    const p = (platform || "").toLowerCase();
    if (p.includes("win")) return "desktop_windows";
    if (p.includes("mac") || p.includes("ios") || p.includes("apple")) return "apple";
    if (p.includes("android") || p.includes("mobi")) return "phone_android";
    if (p.includes("linux")) return "terminal";
    return "devices";
  }

  getPlatformBgClass(platform: string): string {
    const p = (platform || "").toLowerCase();
    if (p.includes("win")) return "bg-blue-500/10 text-blue-500";
    if (p.includes("mac") || p.includes("ios") || p.includes("apple")) return "bg-zinc-500/10 text-zinc-900 dark:text-white";
    if (p.includes("android")) return "bg-emerald-500/10 text-emerald-500";
    return "bg-indigo-500/10 text-indigo-500";
  }

  getBrowserIcon(browser: string): string {
    const b = (browser || "").toLowerCase();
    if (b.includes("firefox")) return "language";
    if (b.includes("safari")) return "explore";
    if (b.includes("edge")) return "web";
    return "open_in_browser";
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }
}
