import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminPanel } from '../admin';

@Component({
  selector: 'app-admin-marketing-tab',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300 font-sans">
      
      <!-- ========================= TAB: CAMPAIGN VOUCHERS (COUPONS) ========================= -->
      @if (admin.activeTab() === 'coupons') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase">Promo code Registry</h1>
            <p class="text-xs text-zinc-500">Configure promotional vouchers, discount percentages, and minimum spent limits.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- ADD COUPONS -->
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4 shadow-xs">
              <h3 class="text-xs font-black uppercase">Program Voucher</h3>
              <div class="space-y-3">
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Voucher Code Tag</span>
                  <input type="text" [value]="admin.newCouponCode()" (input)="admin.newCouponCode.set($any($event.target).value)" placeholder="e.g. MAKER15" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-xl text-xs uppercase font-black tracking-widest outline-none">
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Discount percentage (%)</span>
                  <input type="number" [value]="admin.newCouponDiscount()" (input)="admin.newCouponDiscount.set(+$any($event.target).value)" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-855 rounded-xl text-xs font-mono font-black outline-none">
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Min spent limit (INR)</span>
                  <input type="number" [value]="admin.newCouponMinSpent()" (input)="admin.newCouponMinSpent.set(+$any($event.target).value)" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-855 rounded-xl text-xs font-mono font-black outline-none font-bold">
                </div>
                <button (click)="admin.addCouponCustom()" class="w-full py-3.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer hover:bg-blue-500 shadow-md shadow-blue-500/10 transition-colors">Publish Code</button>
              </div>
            </div>

            <!-- VIEW SYSTEM COUPONS -->
            <div class="lg:col-span-2 space-y-3">
              @for (c of admin.ds.coupons(); track c.code) {
                <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-xl flex justify-between items-center hover:border-blue-500/20 transition-all group shadow-xs">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-mono font-black tracking-widest text-blue-500 dark:text-blue-400 uppercase select-all">{{ c.code }}</span>
                      <span class="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[8px] font-black uppercase">{{ c.discountPercent }}% off</span>
                    </div>
                    <p class="text-[10px] text-zinc-400 mt-1 uppercase font-mono font-bold">Minimum spent limit: ₹{{ c.minSpent | number }}</p>
                  </div>
                  <button (click)="admin.deleteCouponCustom(c.code)" class="text-zinc-400 hover:text-red-500 cursor-pointer transition-colors"><mat-icon class="text-base">delete_outline</mat-icon></button>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ========================= TAB: AD-PROMOTIONS ========================= -->
      @if (admin.activeTab() === 'promotions') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase">Ad performance analytics Hub</h1>
            <p class="text-xs text-zinc-500">Monitor click metrics and evaluate click-through rate (CTR%) efficiency.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @for (ad of admin.ds.advertisements(); track ad.id) {
              <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl flex items-center justify-between hover:border-blue-500/20 shadow-xs relative overflow-hidden h-36">
                <div class="space-y-1 max-w-sm">
                  <span class="bg-indigo-500/15 text-indigo-500 border border-indigo-500/20 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest">{{ ad.position }} spot</span>
                  <h4 class="text-xs font-black uppercase text-zinc-950 dark:text-white truncate">{{ ad.title }}</h4>
                  <p class="text-[10px] text-zinc-450 font-mono font-bold">Efficiency: ₹{{ ad.revenuePerClick }} / Click</p>
                </div>
                <div class="grid grid-cols-2 gap-4 text-center border-l border-zinc-200 dark:border-zinc-800 pl-4 shrink-0 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                  <div>
                    <span class="text-[8px] block text-zinc-400 uppercase font-black">Clicks</span>
                    <span class="font-black text-blue-500 text-sm">{{ ad.clicks }}</span>
                  </div>
                  <div>
                    <span class="text-[8px] block text-zinc-400 uppercase font-black">CTR(%)</span>
                    <span class="font-black text-indigo-500 text-sm">{{ admin.calculateCTR(ad) }}%</span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ========================= TAB: EMAIL CAMPAIGNS & SMS ========================= -->
      @if (admin.activeTab() === 'email-campaigns' || admin.activeTab() === 'push-notifications') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase">Broadcast Campaigns Hub</h1>
            <p class="text-xs text-zinc-500">Dispatch immediate notifications via push notification channels, SMTP mail relays, or business SMS connectors.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- CAMPAIGN FORM -->
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4 shadow-xs">
              <h3 class="text-xs font-black uppercase">Formulate Blast</h3>
              <div class="space-y-3">
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 pl-1 uppercase">Campaign Name</span>
                  <input type="text" [value]="admin.newCampTitle()" (input)="admin.newCampTitle.set($any($event.target).value)" placeholder="e.g. Creator PLA Sale Launch" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none">
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 pl-1 uppercase">Dispatch channel relay</span>
                  <select [value]="admin.newCampType()" (change)="admin.onCampTypeChange($event)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none cursor-pointer">
                    <option value="push">Firebase Push Engine</option>
                    <option value="email">SMTP Cloud Email System</option>
                    <option value="whatsapp">Business Whatsapp API Hub</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 pl-1 uppercase">Delivery Message</span>
                  <textarea rows="3" [value]="admin.newCampMsg()" (input)="admin.newCampMsg.set($any($event.target).value)" placeholder="Compose broadcast details here..." class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none resize-none"></textarea>
                </div>
                <button (click)="admin.triggerCampaign()" class="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all shadow-md shadow-blue-500/10">Launch Cloud Blast</button>
              </div>
            </div>

            <!-- REALTIME NOTIFICATION RECORD LOGS -->
            <div class="lg:col-span-2 space-y-3">
              @for (c of admin.ds.notifications(); track c.id) {
                <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-xl flex justify-between items-center group shadow-xs hover:border-blue-500/10 transition-colors">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span [class]="admin.getCampaignTypeClass(c.type)" class="px-1.5 py-0.5 text-[8px] font-black uppercase rounded">{{ c.type }} Relay</span>
                      <h4 class="text-xs font-black uppercase text-zinc-900 dark:text-white leading-none">{{ c.title }}</h4>
                    </div>
                    <p class="text-[11px] text-zinc-400 tracking-wide line-clamp-1 truncate max-w-lg">"{{ c.message }}"</p>
                  </div>
                  <div class="text-right font-mono text-[9px] text-zinc-400 font-bold">
                    <span class="block">Dispatched: {{ c.sentCount }} clients</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminMarketingTab {
  @Input({ required: true }) admin!: AdminPanel;
}
