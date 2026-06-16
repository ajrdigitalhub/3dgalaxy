import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminPanel } from '../admin';
import { ImagePickerComponent } from '../../../shared/components/image-picker/image-picker.component';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-admin-settings-tab',
  standalone: true,
  imports: [CommonModule, MatIconModule, ImagePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300 font-sans">
      <div>
        <h1 class="text-xl font-black uppercase">Shopify System configuration</h1>
        <p class="text-xs text-zinc-500">Formulate gateways, brand styling parameters, logos, and security sessions.</p>
      </div>

      <!-- TABBED SUB-BOARD LAYOUT -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- SUB-LINKS LEFT -->
        <div class="flex flex-col gap-1 inline-flex lg:border-r lg:border-zinc-200 dark:lg:border-zinc-800 pr-4">
          <button (click)="admin.setActiveTab('store-settings')" [class.bg-zinc-100]="admin.activeTab() === 'store-settings'" [class.dark:bg-zinc-800]="admin.activeTab() === 'store-settings'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">store</mat-icon> Store core</button>
          <button (click)="admin.setActiveTab('theme-settings')" [class.bg-zinc-100]="admin.activeTab() === 'theme-settings'" [class.dark:bg-zinc-800]="admin.activeTab() === 'theme-settings'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">palette</mat-icon> Visual Theme</button>
          <button (click)="admin.setActiveTab('seo-settings')" [class.bg-zinc-100]="admin.activeTab() === 'seo-settings'" [class.dark:bg-zinc-800]="admin.activeTab() === 'seo-settings'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">travel_explore</mat-icon> SEO Configuration</button>
          <button (click)="admin.setActiveTab('payment-settings')" [class.bg-zinc-100]="admin.activeTab() === 'payment-settings'" [class.dark:bg-zinc-800]="admin.activeTab() === 'payment-settings'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">payment</mat-icon> Payment PGs</button>
          <button (click)="admin.setActiveTab('shipping-settings')" [class.bg-zinc-100]="admin.activeTab() === 'shipping-settings'" [class.dark:bg-zinc-800]="admin.activeTab() === 'shipping-settings'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">local_shipping</mat-icon> Logistical rates</button>
          <button (click)="admin.setActiveTab('tax-settings')" [class.bg-zinc-100]="admin.activeTab() === 'tax-settings'" [class.dark:bg-zinc-800]="admin.activeTab() === 'tax-settings'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">percent</mat-icon> Tax codes</button>
          <button (click)="admin.setActiveTab('user-management')" [class.bg-zinc-100]="admin.activeTab() === 'user-management'" [class.dark:bg-zinc-800]="admin.activeTab() === 'user-management'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">badge</mat-icon> Team Staff</button>
          <button (click)="admin.setActiveTab('active-sessions')" [class.bg-zinc-100]="admin.activeTab() === 'active-sessions'" [class.dark:bg-zinc-800]="admin.activeTab() === 'active-sessions'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">monitor</mat-icon> Active Sessions</button>
          <button (click)="admin.setActiveTab('security-settings')" [class.bg-zinc-100]="admin.activeTab() === 'security-settings'" [class.dark:bg-zinc-800]="admin.activeTab() === 'security-settings'" class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-black uppercase select-none transition-colors cursor-pointer"><mat-icon class="text-base">admin_panel_settings</mat-icon> Security Settings</button>
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

              <!-- General Settings Images requested by the user -->
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pt-4 pb-2">Store General Visual Assets</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                  <app-image-picker label="Store Logo" [value]="admin.logoUrl()" (valueChange)="admin.logoUrl.set($event)"></app-image-picker>
                </div>
                <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                  <app-image-picker label="Store Favicon" [value]="admin.faviconUrl()" (valueChange)="admin.faviconUrl.set($event)"></app-image-picker>
                </div>
                <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                  <app-image-picker label="App Icon" [value]="admin.appIconUrl()" (valueChange)="admin.appIconUrl.set($event)"></app-image-picker>
                </div>
                <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                  <app-image-picker label="Login Background Image" [value]="admin.loginBgUrl()" (valueChange)="admin.loginBgUrl.set($event)"></app-image-picker>
                </div>
                <div class="col-span-1 sm:col-span-2 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                  <app-image-picker label="Admin Portal Background Image" [value]="admin.adminBgUrl()" (valueChange)="admin.adminBgUrl.set($event)"></app-image-picker>
                </div>
              </div>

              <div class="pt-2">
                <button (click)="admin.saveGlobalConfig()" [disabled]="admin.isSaving()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase transition-colors cursor-pointer shadow-sm shadow-blue-500/10 disabled:opacity-50">Save Store configurations</button>
              </div>
            </div>
          }

          <!-- SUB-TAB THEME SETTINGS -->
          @if (admin.activeTab() === 'theme-settings') {
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-6 shadow-xs">
              <div class="pt-4 pb-2 border-b dark:border-zinc-800 flex items-center justify-between">
                <h3 class="text-xs font-black uppercase">Branding aesthetic Customizer</h3>
                <button (click)="previewTheme()" class="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-[9px] font-black uppercase transition-colors cursor-pointer tracking-wider">Live Preview</button>
              </div>
              
              <!-- Aesthetic variables -->
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
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Gradient Pattern Angle (e.g. 135deg, 90deg, to right)</span>
                  <input type="text" [value]="admin.gradientAngle()" (input)="admin.gradientAngle.set($any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono font-bold outline-none uppercase">
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

              <!-- Theme Settings Logos requested by the user -->
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pt-4 pb-2">Visual Theme Branding Images</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                  <app-image-picker label="Header Logo" [value]="admin.headerLogoUrl()" (valueChange)="admin.headerLogoUrl.set($event)"></app-image-picker>
                </div>
                <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                  <app-image-picker label="Footer Logo" [value]="admin.footerLogoUrl()" (valueChange)="admin.footerLogoUrl.set($event)"></app-image-picker>
                </div>
                <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                  <app-image-picker label="Mobile Menu Logo" [value]="admin.mobileLogoUrl()" (valueChange)="admin.mobileLogoUrl.set($event)"></app-image-picker>
                </div>
                <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                  <app-image-picker label="Dark Mode Header Logo" [value]="admin.darkModeLogoUrl()" (valueChange)="admin.darkModeLogoUrl.set($event)"></app-image-picker>
                </div>
                <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                  <app-image-picker label="Loading Spinner/Logo Screen" [value]="admin.loadingLogoUrl()" (valueChange)="admin.loadingLogoUrl.set($event)"></app-image-picker>
                </div>
                <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                  <app-image-picker label="Default Product Image Placeholder" [value]="admin.defaultPlaceholderUrl()" (valueChange)="admin.defaultPlaceholderUrl.set($event)"></app-image-picker>
                </div>
              </div>

              <div class="pt-2">
                <button (click)="admin.saveGlobalConfig()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase cursor-pointer shadow-sm shadow-blue-500/10">Save theme visual parameters</button>
              </div>
            </div>
          }

          <!-- SUB-TAB SEO SETTINGS -->
          @if (admin.activeTab() === 'seo-settings') {
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-6 shadow-xs">
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pb-2">Global SEO Configuration</h3>
              <p class="text-[11px] text-zinc-500 leading-relaxed">Tune fallback metadata and dynamic sharing assets distributed during external link crawls.</p>
              
              <!-- SEO Settings Images requested by the user -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                  <app-image-picker label="Default Open Graph Image (1200x630)" [value]="admin.defaultOgImageUrl()" (valueChange)="admin.defaultOgImageUrl.set($event)"></app-image-picker>
                </div>
                <div class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                  <app-image-picker label="Default Social Share Banner (Web/WhatsApp)" [value]="admin.defaultSocialShareImageUrl()" (valueChange)="admin.defaultSocialShareImageUrl.set($event)"></app-image-picker>
                </div>
              </div>

              <div class="pt-2">
                <button (click)="admin.saveGlobalConfig()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase cursor-pointer shadow-sm shadow-blue-500/10">Synchronize SEO configuration</button>
              </div>
            </div>
          }

          <!-- SUB-TAB PAYMENT SETTINGS -->
          @if (admin.activeTab() === 'payment-settings') {
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-6 shadow-xs">
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pb-2">Integrated payment Gateways</h3>
              
              <!-- Payment Settings Logos requested by the user -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-zinc-100 dark:border-zinc-850 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20">
                <div class="space-y-1">
                  <app-image-picker label="Razorpay Gateway Branding Logo" [value]="admin.razorpayLogoUrl()" (valueChange)="admin.razorpayLogoUrl.set($event)"></app-image-picker>
                </div>
                <div class="space-y-1">
                  <app-image-picker label="Checkout Footer Payment Method Icons" [value]="admin.paymentMethodIconsUrl()" (valueChange)="admin.paymentMethodIconsUrl.set($event)"></app-image-picker>
                </div>
                <div class="col-span-1 sm:col-span-2 pt-2">
                  <button (click)="admin.saveGlobalConfig()" class="px-3.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-[9px] uppercase font-black cursor-pointer shadow-sm">Save payment brand graphics</button>
                </div>
              </div>

              <div class="space-y-6">
                @for (g of admin.paymentGateways(); track g.id) {
                  <div class="p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-4 text-xs">
                    <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-3">
                      <div>
                        <h4 class="font-black uppercase text-zinc-900 dark:text-white leading-none">{{ g.name }}</h4>
                        <span class="text-[9px] text-zinc-400 uppercase mt-1 inline-block">{{ g.description || 'No description' }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <label class="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" [checked]="g.isEnabled" (change)="admin.updatePaymentGateway(g.id, { isEnabled: $any($event.target).checked })" class="rounded text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5 bg-zinc-100 border-zinc-300 dark:border-zinc-600 dark:bg-zinc-700">
                          <span class="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300 select-none">Enabled</span>
                        </label>
                      </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <!-- Test Mode -->
                      <div class="col-span-1 md:col-span-2">
                        <label class="flex items-center gap-1.5 cursor-pointer w-fit p-2 bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
                          <input type="checkbox" [checked]="g.isTestMode" (change)="admin.updatePaymentGateway(g.id, { isTestMode: $any($event.target).checked })" class="rounded text-orange-500 focus:ring-orange-500 cursor-pointer w-3.5 h-3.5 bg-zinc-100 border-zinc-300 dark:border-zinc-600 dark:bg-zinc-700">
                          <span class="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300 select-none">Test Mode</span>
                        </label>
                      </div>
                      <!-- Config Keys -->
                      @if (g.gatewayCode !== 'COD' && g.gatewayCode !== 'BANK_TRANSFER') {
                        <div class="space-y-1">
                          <span class="block text-[9px] font-black text-zinc-400 uppercase">Key ID</span>
                          <input type="text" [value]="g.keyId || ''" #keyIdInput class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono outline-none">
                        </div>
                        <div class="space-y-1">
                          <span class="block text-[9px] font-black text-zinc-400 uppercase">Key Secret</span>
                          <input type="password" [value]="g.keySecret || ''" #keySecInput class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono outline-none">
                        </div>
                        <div class="space-y-1 md:col-span-2">
                          <span class="block text-[9px] font-black text-zinc-400 uppercase">Webhook Secret</span>
                          <input type="password" [value]="g.webhookSecret || ''" #webhookSecInput class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono outline-none">
                        </div>
                        <div class="md:col-span-2 text-right">
                          <button (click)="admin.updatePaymentGateway(g.id, { keyId: keyIdInput.value, keySecret: keySecInput.value, webhookSecret: webhookSecInput.value })" class="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white rounded-lg text-[9px] font-black uppercase cursor-pointer transition-colors shadow-sm">Save config</button>
                        </div>
                      }
                    </div>
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

          <!-- SUB-TAB SECURITY SETTINGS -->
          @if (admin.activeTab() === 'security-settings') {
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-6 shadow-xs">
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pb-2">Session Management & Security</h3>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Idle Timeout Enabled -->
                <div class="md:col-span-2">
                  <label class="flex items-center gap-2 cursor-pointer w-fit p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-850 transition-colors">
                    <input type="checkbox" [checked]="admin.enableIdleTimeout()" (change)="admin.enableIdleTimeout.set($any($event.target).checked)" class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer">
                    <span class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300">Enable Idle Timeout</span>
                  </label>
                </div>

                <!-- Session Timeout -->
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase">Session Timeout (Minutes)</span>
                  <input type="number" [value]="admin.sessionTimeout()" (input)="admin.sessionTimeout.set(+$any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-500">
                </div>

                <!-- Idle Warning Time -->
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase">Idle Warning Time (Minutes)</span>
                  <input type="number" [value]="admin.idleWarningTime()" (input)="admin.idleWarningTime.set(+$any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-500">
                </div>

                <!-- Warning Popup Enabled -->
                <div class="md:col-span-2">
                  <label class="flex items-center gap-2 cursor-pointer w-fit p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-850 transition-colors">
                    <input type="checkbox" [checked]="admin.enableSessionWarningPopup()" (change)="admin.enableSessionWarningPopup.set($any($event.target).checked)" class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer">
                    <span class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300">Enable Session Warning Popup</span>
                  </label>
                </div>
              </div>

              <div class="pt-2">
                <button (click)="admin.saveSecuritySettings()" [disabled]="admin.isSavingSettings()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase transition-colors cursor-pointer shadow-sm shadow-blue-500/10 disabled:opacity-50">
                  Save Security Policies
                </button>
              </div>
            </div>
          }

          <!-- SUB-TAB ACTIVE SESSIONS -->
          @if (admin.activeTab() === 'active-sessions') {
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-xl space-y-6 shadow-xs">
              <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-3">
                <div>
                  <h3 class="text-xs font-black uppercase">Active Security Sessions</h3>
                  <p class="text-[10px] text-zinc-500 mt-1">Monitored active client authentications & device hardware signatures.</p>
                </div>
                <button (click)="admin.fetchUserSessions()" class="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center border-none">
                  <mat-icon class="text-sm">refresh</mat-icon>
                </button>
              </div>

              <div class="space-y-4">
                @if (admin.activeUserSessions().length === 0) {
                  <p class="text-xs text-zinc-500 italic py-4">No active user sessions found.</p>
                } @else {
                  @for (s of admin.activeUserSessions(); track s.id) {
                    <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs transition-all hover:border-zinc-300 dark:hover:border-zinc-705">
                      <div class="flex items-start gap-3">
                        <div class="h-10 w-10 min-w-10 rounded-xl bg-orange-600/10 text-orange-500 flex items-center justify-center font-black text-xs uppercase shadow-xs">
                          <mat-icon>devices</mat-icon>
                        </div>
                        <div class="space-y-1">
                          <div class="flex items-center gap-2">
                            <h4 class="font-black uppercase text-zinc-900 dark:text-white leading-none">
                              {{ s.user?.firstName || 'User' }} {{ s.user?.lastName || '' }}
                            </h4>
                            <span class="text-[9px] font-mono bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400 font-bold">
                              {{ s.ipAddress || 'Unknown IP' }}
                            </span>
                          </div>
                          <p class="text-[10px] text-zinc-400 font-mono font-bold">{{ s.user?.email || 'Unknown Email' }}</p>
                          <div class="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-500">
                            <span class="flex items-center gap-1">
                              <mat-icon class="text-xs text-[12px] h-3 w-3">computer</mat-icon>
                              {{ s.deviceInfo || 'Generic Device/Browser' }}
                            </span>
                            <span class="flex items-center gap-1">
                              <mat-icon class="text-xs text-[12px] h-3 w-3">schedule</mat-icon>
                              Expires: {{ s.expiresAt | date:'short' }}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div class="w-full md:w-auto flex items-center justify-end">
                        <button (click)="admin.terminateUserSession(s.id)" class="w-full md:w-auto px-3.5 py-2 hover:bg-red-600 hover:text-white dark:hover:bg-red-600/20 text-red-500 border border-red-500/15 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5">
                          <mat-icon class="text-sm">logout</mat-icon>
                          Terminate
                        </button>
                      </div>
                    </div>
                  }
                }
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
  private themeService = inject(ThemeService);

  previewTheme() {
    this.themeService.updateLivePreview({
      primaryColor: this.admin.primaryColor(),
      secondaryColor: this.admin.secondaryColor(),
      gradientAngle: this.admin.gradientAngle(),
      radius: this.admin.borderRadius() + 'px'
    });
  }
}
