import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { DatastoreService } from '../../../services/datastore';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { DEFAULT_HEADER_ANNOUNCEMENTS } from '../../../core/services/settings.service';

export interface AnnouncementModel {
  id: string;
  title: string;
  shortMessage: string;
  description?: string;
  icon?: string;
  iconType?: 'material' | 'emoji' | 'svg';
  bgColor?: string;
  textColor?: string;
  ctaText?: string;
  ctaUrl?: string;
  openInNewTab?: boolean;
  animationType?: 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom' | 'bounce' | 'pulse' | 'glow';
  displayMode?: 'static' | 'marquee' | 'rotating';
  scrollDirection?: 'left' | 'right';
  scrollSpeed?: number;
  priority?: number;
  visiblePages?: string[];
  targetAudience?: 'all' | 'guest' | 'logged_in';
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  isDismissible?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-admin-header-announcements-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn font-sans text-neutral-900 dark:text-neutral-100">
      
      <!-- HEADER BANNER -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 rounded-3xl text-white shadow-xl">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <mat-icon class="scale-110">campaign</mat-icon>
            <h1 class="text-xl sm:text-2xl font-black uppercase tracking-tight">Top Header Announcement Bar Engine</h1>
          </div>
          <p class="text-xs text-orange-100 max-w-2xl">
            Configure premium marketing bars positioned above main navigation. Support scheduled flash sales, coupon vouchers, free shipping alerts, marquee tickers & rich CTA links.
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <button 
            (click)="resetToDefaults()" 
            class="px-4 py-2.5 bg-black/20 hover:bg-black/40 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-1.5"
          >
            <mat-icon class="text-sm">restart_alt</mat-icon>
            <span>Load Templates</span>
          </button>
          <button 
            (click)="openModal()" 
            class="px-5 py-2.5 bg-white text-orange-700 hover:bg-orange-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <mat-icon class="text-sm">add</mat-icon>
            <span>New Announcement</span>
          </button>
        </div>
      </div>

      <!-- STATS OVERVIEW CARDS -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-1">
          <span class="text-[10px] font-black uppercase text-zinc-400">Total Configured</span>
          <div class="text-2xl font-black text-orange-600">{{ announcements().length }}</div>
        </div>
        <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-1">
          <span class="text-[10px] font-black uppercase text-zinc-400">Active Online</span>
          <div class="text-2xl font-black text-emerald-600">{{ activeCount() }}</div>
        </div>
        <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-1">
          <span class="text-[10px] font-black uppercase text-zinc-400">Scheduled</span>
          <div class="text-2xl font-black text-blue-600">{{ scheduledCount() }}</div>
        </div>
        <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-1">
          <span class="text-[10px] font-black uppercase text-zinc-400">Display Modes</span>
          <div class="text-xs font-bold text-zinc-600 dark:text-zinc-300 mt-1">Marquee / Carousel</div>
        </div>
      </div>

      <!-- ANNOUNCEMENTS LIST TABLE / CARDS -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white">Configured Announcements (Priority Order)</h2>
          <span class="text-xs text-zinc-400 font-medium">Drag or edit priority numbers to order</span>
        </div>

        @if (loading()) {
          <div class="p-12 text-center text-zinc-400 text-xs font-bold">Loading announcement configurations...</div>
        } @else if (announcements().length === 0) {
          <div class="p-12 text-center bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl space-y-3">
            <mat-icon class="text-4xl text-zinc-400">campaign</mat-icon>
            <p class="text-xs text-zinc-500 font-medium">No announcements found. Click 'Load Templates' or 'New Announcement' to start.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 gap-4">
            @for (item of announcements(); track item.id; let idx = $index) {
              <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-orange-500/30 transition-all shadow-xs group relative overflow-hidden">
                
                <!-- PRIORITY & STATUS BADGE -->
                <div class="flex items-center gap-3 shrink-0">
                  <span class="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-600 font-black text-xs flex items-center justify-center border border-orange-500/20">
                    #{{ item.priority || (idx + 1) }}
                  </span>
                  <button 
                    (click)="toggleActive(item)" 
                    [class]="item.isActive !== false ? 'px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-black uppercase cursor-pointer' : 'px-2.5 py-1 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[10px] font-black uppercase cursor-pointer'"
                  >
                    {{ item.isActive !== false ? 'Active' : 'Disabled' }}
                  </button>
                </div>

                <!-- PREVIEW PILL BAR -->
                <div class="flex-1 min-w-0 space-y-1">
                  <div 
                    class="px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs"
                    [style.background]="item.bgColor || 'linear-gradient(135deg, #d65108, #b83200)'"
                    [style.color]="item.textColor || '#ffffff'"
                  >
                    <div class="flex items-center gap-2 truncate">
                      @if (item.icon) {
                        @if (item.iconType === 'emoji') {
                          <span>{{ item.icon }}</span>
                        } @else {
                          <mat-icon class="scale-75 text-[14px] leading-none">{{ item.icon }}</mat-icon>
                        }
                      }
                      <span class="truncate font-extrabold">{{ item.shortMessage }}</span>
                    </div>
                    @if (item.ctaText) {
                      <span class="px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-black uppercase tracking-wider shrink-0">
                        {{ item.ctaText }} →
                      </span>
                    }
                  </div>

                  <div class="flex items-center gap-4 text-[10px] text-zinc-400 font-mono pl-1">
                    <span>Mode: <strong class="text-zinc-600 dark:text-zinc-300 uppercase">{{ item.displayMode || 'rotating' }}</strong></span>
                    <span>Animation: <strong class="text-zinc-600 dark:text-zinc-300 uppercase">{{ item.animationType || 'fade' }}</strong></span>
                    <span>Target: <strong class="text-zinc-600 dark:text-zinc-300 uppercase">{{ item.targetAudience || 'all' }}</strong></span>
                    @if (item.startDate) {
                      <span>Start: {{ item.startDate | date:'shortDate' }}</span>
                    }
                    @if (item.endDate) {
                      <span>End: {{ item.endDate | date:'shortDate' }}</span>
                    }
                  </div>
                </div>

                <!-- ACTIONS -->
                <div class="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button (click)="duplicateItem(item)" class="p-2 text-zinc-400 hover:text-orange-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-none bg-transparent" title="Duplicate">
                    <mat-icon class="text-lg">content_copy</mat-icon>
                  </button>
                  <button (click)="editItem(item)" class="p-2 text-zinc-400 hover:text-blue-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-none bg-transparent" title="Edit">
                    <mat-icon class="text-lg">edit</mat-icon>
                  </button>
                  <button (click)="deleteItem(item.id)" class="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-none bg-transparent" title="Delete">
                    <mat-icon class="text-lg">delete_outline</mat-icon>
                  </button>
                </div>

              </div>
            }
          </div>
        }
      </div>

      <!-- EDIT / CREATE ANNOUNCEMENT MODAL -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 p-6 sm:p-8">
            
            <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div>
                <h3 class="text-lg font-black uppercase text-zinc-950 dark:text-white">
                  {{ isEditing() ? 'Edit Header Announcement' : 'Create Header Announcement' }}
                </h3>
                <p class="text-xs text-zinc-400">Configure promotional details, custom colors, links, and timing.</p>
              </div>
              <button (click)="closeModal()" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-white border-none bg-transparent cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- LIVE INTERACTIVE PREVIEW BOX -->
            <div class="space-y-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-orange-600 block">Live Announcement Bar Preview</span>
              <div 
                class="p-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 shadow-md transition-all duration-300"
                [style.background]="form().bgColor || 'linear-gradient(135deg, #d65108, #b83200)'"
                [style.color]="form().textColor || '#ffffff'"
              >
                <div class="flex items-center gap-2 truncate">
                  @if (form().icon) {
                    @if (form().iconType === 'emoji') {
                      <span>{{ form().icon }}</span>
                    } @else {
                      <mat-icon class="scale-75 text-[16px] leading-none">{{ form().icon }}</mat-icon>
                    }
                  }
                  <span class="truncate font-extrabold">{{ form().shortMessage || 'Announcement message text preview...' }}</span>
                </div>
                @if (form().ctaText) {
                  <button class="px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider border-none text-current shrink-0 cursor-pointer">
                    {{ form().ctaText }} →
                  </button>
                }
              </div>
            </div>

            <!-- FORM FIELDS GRID -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              
              <!-- Title -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">Title / Label</label>
                <input type="text" [(ngModel)]="form().title" placeholder="e.g. Free Shipping Alert" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-bold outline-none focus:border-orange-500">
              </div>

              <!-- Short Message -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">Short Announcement Text *</label>
                <input type="text" [(ngModel)]="form().shortMessage" placeholder="e.g. 🚚 Free Shipping on Orders Above ₹999" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-bold outline-none focus:border-orange-500">
              </div>

              <!-- Icon Name/Emoji -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">Icon (Material Icon Name or Emoji)</label>
                <div class="flex gap-2">
                  <select [(ngModel)]="form().iconType" class="px-2 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-bold outline-none">
                    <option value="material">Material</option>
                    <option value="emoji">Emoji</option>
                  </select>
                  <input type="text" [(ngModel)]="form().icon" placeholder="e.g. local_shipping or 🚚" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-bold outline-none focus:border-orange-500">
                </div>
              </div>

              <!-- Priority -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">Display Priority (1 = Highest)</label>
                <input type="number" [(ngModel)]="form().priority" min="1" max="99" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-bold outline-none focus:border-orange-500">
              </div>

              <!-- BG Color -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">Background Color / Gradient CSS</label>
                <input type="text" [(ngModel)]="form().bgColor" placeholder="e.g. #d65108 or linear-gradient(135deg, #d65108, #b83200)" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-mono text-[11px] outline-none focus:border-orange-500">
              </div>

              <!-- Text Color -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">Text Color Hex</label>
                <input type="text" [(ngModel)]="form().textColor" placeholder="#ffffff" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-mono text-[11px] outline-none focus:border-orange-500">
              </div>

              <!-- CTA Text -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">CTA Button Text (Optional)</label>
                <input type="text" [(ngModel)]="form().ctaText" placeholder="e.g. Shop Now" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-bold outline-none focus:border-orange-500">
              </div>

              <!-- CTA URL -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">CTA Target URL</label>
                <input type="text" [(ngModel)]="form().ctaUrl" placeholder="e.g. /products or /slicer" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-bold outline-none focus:border-orange-500">
              </div>

              <!-- Display Mode -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">Display Mode</label>
                <select [(ngModel)]="form().displayMode" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-bold outline-none">
                  <option value="rotating">Auto Rotating Carousel</option>
                  <option value="marquee">Continuous Marquee Ticker</option>
                  <option value="static">Static Banner</option>
                </select>
              </div>

              <!-- Animation Type -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">Animation Effect</label>
                <select [(ngModel)]="form().animationType" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-bold outline-none">
                  <option value="fade">Fade In</option>
                  <option value="slide-left">Slide Left</option>
                  <option value="slide-right">Slide Right</option>
                  <option value="slide-up">Slide Up</option>
                  <option value="slide-down">Slide Down</option>
                  <option value="zoom">Zoom In</option>
                  <option value="bounce">Bounce In</option>
                  <option value="pulse">Pulse Glow</option>
                  <option value="glow">Luminous Glow</option>
                </select>
              </div>

              <!-- Target Audience -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">Target Audience</label>
                <select [(ngModel)]="form().targetAudience" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-bold outline-none">
                  <option value="all">All Visitors</option>
                  <option value="guest">Guest Users Only</option>
                  <option value="logged_in">Logged-in Customers Only</option>
                </select>
              </div>

              <!-- Scroll Speed / Interval -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">Rotation Interval (Sec)</label>
                <input type="number" [(ngModel)]="form().scrollSpeed" min="2" max="60" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-bold outline-none">
              </div>

              <!-- Start Date -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">Schedule Start Date (Optional)</label>
                <input type="date" [(ngModel)]="form().startDate" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-bold outline-none">
              </div>

              <!-- End Date -->
              <div class="space-y-1">
                <label class="block text-[10px] font-black uppercase text-zinc-400">Schedule End Date (Optional)</label>
                <input type="date" [(ngModel)]="form().endDate" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl font-bold outline-none">
              </div>

              <!-- Toggles -->
              <div class="sm:col-span-2 flex flex-wrap items-center gap-6 pt-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form().isActive" class="w-4 h-4 accent-orange-600 rounded">
                  <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Active Online</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form().isDismissible" class="w-4 h-4 accent-orange-600 rounded">
                  <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Allow User to Dismiss (✕)</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form().openInNewTab" class="w-4 h-4 accent-orange-600 rounded">
                  <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Open Link in New Tab</span>
                </label>
              </div>

            </div>

            <!-- MODAL FOOTER BUTTONS -->
            <div class="flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <button (click)="closeModal()" class="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-black uppercase text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border-none cursor-pointer">
                Cancel
              </button>
              <button (click)="saveAnnouncement()" [disabled]="saving()" class="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer border-none">
                {{ saving() ? 'Saving...' : (isEditing() ? 'Update Announcement' : 'Publish Announcement') }}
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class HeaderAnnouncementsTabComponent implements OnInit {
  private api = inject(ApiService);
  private ds = inject(DatastoreService);
  private toast = inject(ToastService);

  loading = signal(false);
  saving = signal(false);
  showModal = signal(false);
  isEditing = signal(false);
  announcements = signal<AnnouncementModel[]>([]);

  form = signal<AnnouncementModel>({
    id: '',
    title: '',
    shortMessage: '',
    icon: 'campaign',
    iconType: 'material',
    bgColor: 'linear-gradient(135deg, #d65108 0%, #b83200 100%)',
    textColor: '#ffffff',
    ctaText: 'Shop Now',
    ctaUrl: '/products',
    animationType: 'fade',
    displayMode: 'rotating',
    scrollSpeed: 4,
    priority: 1,
    visiblePages: ['all'],
    targetAudience: 'all',
    isActive: true,
    isDismissible: true
  });

  activeCount = computed(() => this.announcements().filter(a => a.isActive !== false).length);
  scheduledCount = computed(() => this.announcements().filter(a => a.startDate || a.endDate).length);

  ngOnInit() {
    this.fetchAnnouncements();
  }

  fetchAnnouncements() {
    this.loading.set(true);
    this.api.get<any>('/admin/header-announcements').subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res && res.success && Array.isArray(res.announcements)) {
          this.announcements.set(res.announcements);
        } else {
          this.announcements.set(DEFAULT_HEADER_ANNOUNCEMENTS as AnnouncementModel[]);
        }
      },
      error: () => {
        this.loading.set(false);
        this.announcements.set(DEFAULT_HEADER_ANNOUNCEMENTS as AnnouncementModel[]);
      }
    });
  }

  openModal() {
    this.isEditing.set(false);
    this.form.set({
      id: `ann-${Date.now()}`,
      title: 'New Announcement',
      shortMessage: '🚚 Free Shipping on Orders Above ₹999',
      icon: 'local_shipping',
      iconType: 'material',
      bgColor: 'linear-gradient(135deg, #d65108 0%, #b83200 100%)',
      textColor: '#ffffff',
      ctaText: 'Shop Now',
      ctaUrl: '/products',
      animationType: 'fade',
      displayMode: 'rotating',
      scrollSpeed: 4,
      priority: this.announcements().length + 1,
      visiblePages: ['all'],
      targetAudience: 'all',
      isActive: true,
      isDismissible: true
    });
    this.showModal.set(true);
  }

  editItem(item: AnnouncementModel) {
    this.isEditing.set(true);
    this.form.set({ ...item });
    this.showModal.set(true);
  }

  duplicateItem(item: AnnouncementModel) {
    const copy = {
      ...item,
      id: `ann-${Date.now()}`,
      title: `${item.title} (Copy)`,
      priority: this.announcements().length + 1
    };
    this.api.post<any>('/admin/header-announcements', copy).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.toast.success('Announcement duplicated');
          this.fetchAnnouncements();
          this.ds.settingsService.loadSettings(true);
        }
      }
    });
  }

  closeModal() {
    this.showModal.set(false);
  }

  toggleActive(item: AnnouncementModel) {
    const updated = { ...item, isActive: item.isActive === false ? true : false };
    this.api.put<any>(`/admin/header-announcements/${item.id}`, updated).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.toast.success(`Status updated`);
          this.fetchAnnouncements();
          this.ds.settingsService.loadSettings(true);
        }
      }
    });
  }

  deleteItem(id: string) {
    if (!confirm('Are you sure you want to delete this header announcement?')) return;
    this.api.delete<any>(`/admin/header-announcements/${id}`).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.toast.success('Announcement deleted');
          this.fetchAnnouncements();
          this.ds.settingsService.loadSettings(true);
        }
      }
    });
  }

  resetToDefaults() {
    if (!confirm('Reset header announcements to default templates?')) return;
    this.announcements.set(DEFAULT_HEADER_ANNOUNCEMENTS as AnnouncementModel[]);
    this.api.post<any>('/admin/header-announcements/reorder', { ids: DEFAULT_HEADER_ANNOUNCEMENTS.map(a => a.id) }).subscribe({
      next: () => {
        this.toast.success('Template announcements restored');
        this.fetchAnnouncements();
        this.ds.settingsService.loadSettings(true);
      }
    });
  }

  saveAnnouncement() {
    const data = this.form();
    if (!data.shortMessage) {
      this.toast.error('Short announcement text is required');
      return;
    }

    this.saving.set(true);
    if (this.isEditing()) {
      this.api.put<any>(`/admin/header-announcements/${data.id}`, data).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res && res.success) {
            this.toast.success('Header announcement updated');
            this.closeModal();
            this.fetchAnnouncements();
            this.ds.settingsService.loadSettings(true);
          }
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.api.post<any>('/admin/header-announcements', data).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res && res.success) {
            this.toast.success('Header announcement created');
            this.closeModal();
            this.fetchAnnouncements();
            this.ds.settingsService.loadSettings(true);
          }
        },
        error: () => this.saving.set(false)
      });
    }
  }
}
