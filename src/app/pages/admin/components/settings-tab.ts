import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminPanel } from '../admin';

@Component({
  selector: 'app-admin-settings-tab',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300 font-sans">
      <div>
        <h1 class="text-xl font-black uppercase">Shopify System configuration</h1>
        <p class="text-xs text-zinc-500">Formulate gateways, tax specifications, border radius styles, and logistics team accounts.</p>
      </div>

      <!-- TABBED SUB-BOARD LAYOUT -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- SUB-LINKS LEFT -->
        <div class="flex flex-col gap-1 inline-flex lg:border-r lg:border-zinc-200 dark:lg:border-zinc-800 pr-4">
          <button (click)="admin.setActiveTab('store-settings')" [class.bg-zinc-100]="admin.activeTab() === 'store-settings'" [class.dark:bg-zinc-800]="admin.activeTab() === 'store-settings'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">store</mat-icon> Store core</button>
          <button (click)="admin.setActiveTab('theme-settings')" [class.bg-zinc-100]="admin.activeTab() === 'theme-settings'" [class.dark:bg-zinc-800]="admin.activeTab() === 'theme-settings'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">palette</mat-icon> Visual Theme</button>
          <button (click)="admin.setActiveTab('payment-settings')" [class.bg-zinc-100]="admin.activeTab() === 'payment-settings'" [class.dark:bg-zinc-800]="admin.activeTab() === 'payment-settings'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">payment</mat-icon> Payment PGs</button>
          <button (click)="admin.setActiveTab('shipping-settings')" [class.bg-zinc-100]="admin.activeTab() === 'shipping-settings'" [class.dark:bg-zinc-800]="admin.activeTab() === 'shipping-settings'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">local_shipping</mat-icon> Logistical rates</button>
          <button (click)="admin.setActiveTab('tax-settings')" [class.bg-zinc-100]="admin.activeTab() === 'tax-settings'" [class.dark:bg-zinc-800]="admin.activeTab() === 'tax-settings'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">percent</mat-icon> Tax codes</button>
          <button (click)="admin.setActiveTab('user-management')" [class.bg-zinc-100]="admin.activeTab() === 'user-management'" [class.dark:bg-zinc-800]="admin.activeTab() === 'user-management'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">badge</mat-icon> Team Staff</button>
          <button (click)="admin.setActiveTab('roles-permissions')" [class.bg-zinc-100]="admin.activeTab() === 'roles-permissions'" [class.dark:bg-zinc-800]="admin.activeTab() === 'roles-permissions'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">gavel</mat-icon> Permissions</button>
        </div>

        <!-- ACTIVE DETAILS RIGHT CARD -->
        <div class="lg:col-span-3 space-y-6">
          <!-- SUB-TAB STORE SETTINGS -->
          @if (admin.activeTab() === 'store-settings') {
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-6 shadow-xs">
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pb-2">Organizational Store Details</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase">Legal Store Brand Name</span>
                  <input type="text" [value]="admin.storeName()" (input)="admin.storeName.set($any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-bold outline-none">
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase">Logistics support Endpoint (Email)</span>
                  <input type="email" [value]="admin.storeSupportEmail()" (input)="admin.storeSupportEmail.set($any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-bold outline-none">
                </div>
              </div>
              <button (click)="admin.saveGlobalConfig()" [disabled]="admin.isSaving()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase transition-colors cursor-pointer shadow-sm shadow-blue-500/10 disabled:opacity-50">Save configurations</button>
            </div>
          }

          <!-- SUB-TAB THEME SETTINGS -->
          @if (admin.activeTab() === 'theme-settings') {
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-6 shadow-xs">
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pb-2">Branding aesthetic Customizer</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <div class="flex justify-between items-center p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl">
                    <span class="text-[10px] font-black uppercase text-zinc-500">Primary Color palette</span>
                    <input type="color" [value]="admin.primaryColor()" (input)="admin.primaryColor.set($any($event.target).value)" class="w-7 h-7 rounded-sm border-none bg-transparent cursor-pointer">
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between items-center p-3.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl">
                    <span class="text-[10px] font-black uppercase text-zinc-500">Secondary Accent Palette</span>
                    <input type="color" [value]="admin.secondaryColor()" (input)="admin.secondaryColor.set($any($event.target).value)" class="w-7 h-7 rounded-sm border-none bg-transparent cursor-pointer">
                  </div>
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Typography</span>
                  <select [value]="admin.fontFamily()" (change)="admin.fontFamily.set($any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none cursor-pointer">
                    <option>Inter</option>
                    <option>Space Grotesk</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Corner border-radius: {{ admin.borderRadius() }}px</span>
                  <input type="range" min="0" max="30" [value]="admin.borderRadius()" (input)="admin.borderRadius.set(+$any($event.target).value)" class="w-full h-1 bg-zinc-200 dark:bg-zinc-800 outline-none accent-blue-600 cursor-pointer">
                </div>
              </div>
              <button (click)="admin.saveGlobalConfig()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase cursor-pointer shadow-sm shadow-blue-500/10">Save aesthetic parameters</button>
            </div>
          }

          <!-- SUB-TAB PAYMENT SETTINGS -->
          @if (admin.activeTab() === 'payment-settings') {
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-6 shadow-xs">
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pb-2">Integrated payment Gateways</h3>
              <div class="space-y-3">
                @for (g of admin.paymentGateways(); track g.id) {
                  <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <h4 class="font-black uppercase text-zinc-900 dark:text-white leading-none">{{ g.name }}</h4>
                      <span class="text-[9px] text-zinc-450 uppercase mt-1 font-mono font-bold">API Mode: {{ g.mode }}</span>
                    </div>
                    <span [class]="g.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-100 Text-zinc-400'" class="px-2 py-0.5 rounded text-[8px] font-black uppercase">
                      {{ g.enabled ? 'READY_LIVE' : 'DISABLED' }}
                    </span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- SUB-TAB SHIPPING SETTINGS -->
          @if (admin.activeTab() === 'shipping-settings') {
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-6 shadow-xs">
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pb-2">Logistics Zoning & delivery rates</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- FORMS -->
                <div class="space-y-3.5">
                  <div class="space-y-1">
                    <span class="block text-[9px] font-black text-zinc-400 pl-1 uppercase">Zone Region</span>
                    <input type="text" [value]="admin.newShippingZoneName()" (input)="admin.newShippingZoneName.set($any($event.target).value)" placeholder="e.g. South Hub Bangalore" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-semibold outline-none">
                  </div>
                  <div class="space-y-1">
                    <span class="block text-[9px] font-black text-zinc-400 pl-1 uppercase">Base rating Courier Cost (INR)</span>
                    <input type="number" [value]="admin.newShippingBaseRate()" (input)="admin.newShippingBaseRate.set(+$any($event.target).value)" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-mono font-black outline-none">
                  </div>
                  <button (click)="admin.createShippingZone()" class="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] uppercase font-black cursor-pointer hover:bg-blue-500">Register Logistics</button>
                </div>

                <!-- LIST -->
                <div class="space-y-2 max-h-50 overflow-y-auto p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  @for (z of admin.shippingZones(); track z.id) {
                    <div class="p-3 bg-zinc-50 dark:bg-zinc-955 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <h4 class="font-black uppercase text-zinc-900 dark:text-white">{{ z.zone }}</h4>
                        <p class="text-[10px] text-zinc-400 tracking-wider">Courier: {{ z.courier }} / Rate: ₹{{ z.baseRate }}</p>
                      </div>
                      <button (click)="admin.deleteShippingZone(z.id)" class="text-red-400 cursor-pointer hover:text-red-500 transition-colors"><mat-icon class="text-sm">close</mat-icon></button>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          <!-- SUB-TAB TAX SETTINGS -->
          @if (admin.activeTab() === 'tax-settings') {
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-6 shadow-xs">
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pb-2">National tax overrides (GST/VAT)</h3>
              <div class="space-y-1.5 max-w-sm">
                <span class="block text-[9px] font-black text-zinc-400 pl-1 uppercase">Standard Global GST override Percentage (%)</span>
                <input type="number" [value]="admin.taxRate()" (input)="admin.taxRate.set(+$any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-mono font-black outline-none">
              </div>
              <button (click)="admin.saveGlobalConfig()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase cursor-pointer">Authorize coding override</button>
            </div>
          }

          <!-- SUB-TAB USER MANAGEMENT -->
          @if (admin.activeTab() === 'user-management') {
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-6 shadow-xs">
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pb-2">Team Logistics Staff directory</h3>
              <div class="space-y-3">
                @for (user of admin.systemPersonnel(); track user.uid) {
                  <div class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl flex justify-between items-center text-xs">
                    <div class="flex items-center gap-3">
                      <div class="h-8 w-8 rounded-full bg-blue-600/10 text-blue-500 flex items-center justify-center font-black text-xs uppercase">{{ user.name.slice(0,2) }}</div>
                      <div>
                        <h4 class="font-black uppercase text-zinc-900 dark:text-white leading-none">{{ user.name }}</h4>
                        <p class="text-[10px] text-zinc-400 mt-1 font-mono font-bold">{{ user.email }}</p>
                      </div>
                    </div>
                    <span class="px-2.5 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/15 rounded text-[8px] font-black uppercase tracking-widest">{{ user.role }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- SUB-TAB ROLES & Clearance PERMISSIONS -->
          @if (admin.activeTab() === 'roles-permissions') {
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-6 shadow-xs">
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pb-2">Clearance Level matrix</h3>
              <div class="space-y-3 text-xs">
                <div class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-2">
                  <h4 class="font-black text-blue-500 uppercase tracking-wider leading-none">Super Administrator clearance</h4>
                  <p class="text-[10px] text-zinc-400 font-medium">Total physical overrides access configured. Full read/write key privileges unlocked.</p>
                </div>
                <div class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-855 rounded-xl space-y-2">
                  <h4 class="font-black text-indigo-500 uppercase tracking-wider leading-none">Editor / Logistics clearances</h4>
                  <p class="text-[10px] text-zinc-400 font-medium">Restricted write privileges. Blocks structural DB catalog deletions and firewall settings.</p>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class AdminSettingsTab {
  @Input({ required: true }) admin!: AdminPanel;
}
