import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminPanel } from '../admin';

@Component({
  selector: 'app-admin-customers-tab',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300">
      
      <!-- ========================= TAB: CUSTOMER CRM LIST ========================= -->
      @if (admin.activeTab() === 'customer-list') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase">Client Matrix Management</h1>
            <p class="text-xs text-zinc-500">Monitor client lifetime value and segment tiers.</p>
          </div>

          <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-x-auto no-scrollbar font-sans">
            <table class="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr class="text-[10px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800">
                  <th class="py-3">Profile</th>
                  <th class="py-3">Segment Tier</th>
                  <th class="py-3">Accumulated Spent (INR)</th>
                  <th class="py-3 text-right">Fulfillment count</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                @for (c of admin.customersList(); track c.id) {
                  <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td class="py-4">
                      <p class="font-black text-zinc-900 dark:text-white uppercase">{{ c.name }}</p>
                      <div class="flex flex-col text-[10px] text-zinc-400 font-mono leading-tight">
                        <span>{{ c.email }}</span>
                        @if (c.mobile && c.mobile !== 'N/A') {
                          <span class="text-[9px] text-zinc-500 font-sans flex items-center gap-0.5 mt-0.5">
                            <mat-icon class="scale-[0.6] origin-left text-emerald-500 -my-1">phone</mat-icon>{{ c.mobile }}
                          </span>
                        }
                      </div>
                    </td>
                    <td class="py-4 font-bold">{{ c.tier }}</td>
                    <td class="py-4 font-mono font-medium">₹{{ c.spent | number }}</td>
                    <td class="py-4 font-mono text-zinc-500 text-right">{{ c.orders }} order(s)</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="py-12 text-center">
                      <div class="flex flex-col items-center justify-center space-y-2">
                        <mat-icon class="text-zinc-300 dark:text-zinc-700 text-3xl">people_outline</mat-icon>
                        <h4 class="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Data Available</h4>
                        <p class="text-[10px] text-zinc-500">There are no active customer profiles registered in your system yet.</p>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ========================= TAB: CUSTOMER GROUPS TIERS ========================= -->
      @if (admin.activeTab() === 'customer-groups') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase">Segmentation Tiers</h1>
            <p class="text-xs text-zinc-500">Configure catalog discount criteria for wholesale dealers and elite programmers.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @for (g of admin.customerGroupsList(); track g.id) {
              <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl relative overflow-hidden flex flex-col justify-between h-40">
                <div>
                  <h3 class="text-xs font-black uppercase text-zinc-900 dark:text-white">{{ g.name }}</h3>
                  <p class="text-[11px] text-blue-500 font-mono mt-1 font-bold">{{ g.discount }}</p>
                </div>
                <div class="flex justify-between items-center text-[10px]">
                  <span class="text-zinc-400 font-bold uppercase tracking-wider">{{ g.members }} Members active</span>
                  <mat-icon class="text-blue-500">group</mat-icon>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ========================= TAB: REVIEWS FEED ========================= -->
      @if (admin.activeTab() === 'reviews') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase font-black uppercase">Moderation Feed & reviews</h1>
            <p class="text-xs text-zinc-500">Audit product ratings, toggle public visibility approvals, and formulate direct staff responses.</p>
          </div>

          <div class="space-y-4">
            @for (r of admin.reviewsList(); track r.id) {
              <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-3">
                <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
                  <div>
                    <h4 class="text-xs font-black uppercase text-zinc-900 dark:text-white">{{ r.productName }}</h4>
                    <p class="text-[10px] text-zinc-400 mt-0.5 font-bold">Submitted by {{ r.userName }} on {{ r.date }}</p>
                  </div>
                  <span [class]="r.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'" class="px-2 py-0.5 text-[8px] font-black uppercase rounded-md tracking-wider">
                    {{ r.status }}
                  </span>
                </div>

                <!-- stars and quote -->
                <div class="space-y-1">
                  <div class="flex text-amber-500 font-black text-xs gap-0.5 items-center"><mat-icon class="text-sm">star</mat-icon> {{ r.rating }} / 5</div>
                  <p class="text-xs italic text-zinc-650 dark:text-zinc-350">"{{ r.comment }}"</p>
                </div>

                @if (r.response) {
                  <div class="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-[11px] border-l-2 border-l-blue-600 leading-relaxed">
                    <span class="text-blue-500 uppercase font-black text-[9px] block mb-0.5">Galaxy Admin Response</span>
                    "{{ r.response }}"
                  </div>
                }

                <div class="flex items-stretch sm:items-center justify-between gap-4 pt-1">
                  <div class="flex-1 max-w-md relative">
                    <input type="text" #respInput placeholder="Write response feedback..." class="w-full pl-3 pr-16 py-2 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-xl text-xs outline-none">
                    <button (click)="admin.saveReviewResponse(r.id, respInput.value); respInput.value = ''" class="absolute right-1 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-[9px] px-2.5 py-1 font-black uppercase rounded-lg cursor-pointer hover:bg-blue-500 transition-colors">Post</button>
                  </div>
                  <div class="flex gap-1.5 self-end">
                    <button (click)="admin.approveReview(r.id)" class="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[9px] font-black uppercase cursor-pointer hover:bg-emerald-500 hover:text-white transition-colors">Approve</button>
                    <button (click)="admin.rejectReview(r.id)" class="px-2.5 py-1 bg-red-500/10 text-red-500 rounded-lg text-[9px] font-black uppercase cursor-pointer hover:bg-red-500 hover:text-white transition-colors">Reject</button>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="p-8 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-850 rounded-2xl text-center space-y-2">
                <div class="flex flex-col items-center justify-center space-y-2 py-6">
                  <mat-icon class="text-zinc-300 dark:text-zinc-700 text-3xl">rate_review</mat-icon>
                  <h4 class="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Data Available</h4>
                  <p class="text-[10px] text-zinc-500">There are no feedback submissions or system ratings awaiting moderation.</p>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class AdminCustomersTab {
  @Input({ required: true }) admin!: AdminPanel;
}
