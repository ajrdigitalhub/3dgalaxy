import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPanel } from '../admin';

@Component({
  selector: 'app-admin-analytics-tab',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300 font-sans">
      <div>
        <h1 class="text-xl font-black uppercase">Commerce Reports Analyzer</h1>
        <p class="text-xs text-zinc-500">Review core acquisition logs and transaction graphs.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- SALES SVGS -->
        <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4 shadow-xs">
          <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Yield Progress (INR)</h3>
          <div class="h-44 flex items-end gap-3.5 pt-4">
            @for (data of admin.monthlySalesChart; track data.month) {
              <div class="flex-1 flex flex-col items-center gap-2">
                <div class="w-full bg-blue-600/15 hover:bg-blue-600 rounded-t-lg transition-all relative group cursor-pointer" [style.height.px]="data.height">
                  <div class="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-zinc-950 text-white text-[8px] font-mono px-1.5 py-0.5 rounded-md transition-all">₹{{ data.val / 1000 }}K</div>
                </div>
                <span class="text-[8px] font-mono font-bold text-zinc-400 uppercase">{{ data.month }}</span>
              </div>
            }
          </div>
        </div>

        <!-- OTHER ACQUISITION CHANNELS -->
        <div class="p-6 bg-zinc-900 text-white rounded-2xl border border-white/5 flex flex-col justify-between shadow-2xl">
          <div>
            <h3 class="text-xs font-black uppercase text-blue-400">Simulated Telemetry Metrics</h3>
            <div class="space-y-3.5 mt-4 text-xs font-mono text-zinc-350">
              <div class="flex justify-between border-b border-white/5 pb-1.5">
                <span>Live Session Count:</span>
                <span class="text-white font-bold">148 makers</span>
              </div>
              <div class="flex justify-between border-b border-white/5 pb-1.5">
                <span>Server Node Ping Status:</span>
                <span class="text-emerald-400 font-bold">0.05ms</span>
              </div>
              <div class="flex justify-between">
                <span>Global Cloud Sync:</span>
                <span class="text-emerald-400 font-bold">100% Ok</span>
              </div>
            </div>
          </div>
          <div class="text-[10px] text-zinc-500 leading-relaxed font-semibold pt-4">
            These metrics reflect active live telemetry spooled directly from the Indian Brahma cloud printer network. All nodes optimized.
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminAnalyticsTab {
  @Input({ required: true }) admin!: AdminPanel;
}
