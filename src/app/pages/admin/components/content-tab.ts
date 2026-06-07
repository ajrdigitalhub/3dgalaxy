import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminPanel } from '../admin';

@Component({
  selector: 'app-admin-content-tab',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300 font-sans">
      
      <!-- ========================= TAB: CMS PAGES ========================= -->
      @if (admin.activeTab() === 'pages') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase">Content Architecture pages</h1>
            <p class="text-xs text-zinc-500">Formulate informational pages, legal terms, and support disclosures.</p>
          </div>

          <div class="space-y-3">
            @for (p of ['Home Store Front', 'About 3D Galaxy Labs', 'Delivery & Assembly SLA', 'Terms of Fabrication Support', 'Brahma Cloud Policies']; track p) {
              <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-xl flex justify-between items-center transition-all hover:border-blue-500/20 shadow-xs">
                <div class="flex items-center gap-4">
                  <div class="h-10 w-10 bg-zinc-50 dark:bg-zinc-950 rounded-xl border dark:border-zinc-850 flex items-center justify-center text-zinc-400"><mat-icon>article</mat-icon></div>
                  <div>
                    <h4 class="text-xs font-black uppercase text-zinc-900 dark:text-white">{{ p }}</h4>
                    <p class="text-[9px] text-zinc-400 uppercase font-mono mt-0.5 font-bold">SEO Status: Programmed &middot; Index: Public</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[8px] font-black tracking-widest">LIVE</span>
                  <mat-icon class="text-zinc-400">chevron_right</mat-icon>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ========================= TAB: CMS BLOGS ========================= -->
      @if (admin.activeTab() === 'blogs') {
        <div class="space-y-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-xl font-black uppercase">Blog publishing Platform</h1>
              <p class="text-xs text-zinc-500">Draft, program, and index blog posts and technology news.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4">
              <h3 class="text-xs font-black uppercase border-b dark:border-zinc-800 pb-2">Broadcast Article</h3>
              <div class="space-y-3 text-zinc-900 dark:text-white">
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Article Title</span>
                  <input type="text" [value]="admin.newBlogTitle()" (input)="admin.newBlogTitle.set($any($event.target).value)" placeholder="e.g. Master Carbon Fiber PLA" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white">
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Article Excerpt</span>
                  <input type="text" [value]="admin.newBlogExcerpt()" (input)="admin.newBlogExcerpt.set($any($event.target).value)" placeholder="Short newsletter hook..." class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-semibold outline-none text-zinc-900 dark:text-white">
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Article Content</span>
                  <textarea rows="4" [value]="admin.newBlogContent()" (input)="admin.newBlogContent.set($any($event.target).value)" placeholder="Markdown supported details..." class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"></textarea>
                </div>
                <button (click)="admin.publishBlogPost()" class="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-black tracking-wider rounded-xl transition-colors cursor-pointer shadow-md shadow-blue-500/10 border-none">Register Entry</button>
              </div>
            </div>

            <!-- BLOG LISTING -->
            <div class="lg:col-span-2 space-y-4">
              @for (b of admin.ds.blogs(); track b.id) {
                <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-xl flex gap-4">
                  <div class="h-16 w-24 shrink-0 bg-zinc-100 dark:bg-zinc-950 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                    <img [src]="b.imageUrl" alt="Blog cover" class="w-full h-full object-cover">
                  </div>
                  <div class="flex-1 min-w-0 space-y-1">
                    <div class="flex justify-between items-start font-bold">
                      <h4 class="text-xs font-black uppercase text-zinc-900 dark:text-white truncate">{{ b.title }}</h4>
                      <button (click)="admin.deleteBlog(b.id)" class="text-red-400 hover:text-red-500 cursor-pointer"><mat-icon class="text-base">delete_outline</mat-icon></button>
                    </div>
                    <p class="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{{ b.excerpt }}</p>
                    <div class="flex justify-between text-[8px] font-mono text-zinc-550 uppercase tracking-widest pt-1.5 border-t dark:border-zinc-800">
                      <span>By {{ b.author }}</span>
                      <span>Published: {{ b.date }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ========================= TAB: CMS FAQS ========================= -->
      @if (admin.activeTab() === 'faqs') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase">FAQ Matrix Management</h1>
            <p class="text-xs text-zinc-500">Compose informational question nodes and troubleshooting responses.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-4">
              @for (f of admin.faqsList(); track f.id) {
                <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-xl space-y-2 relative group max-w-3xl">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] font-black text-blue-500 uppercase tracking-wider">{{ f.category }}</span>
                    <button (click)="admin.deleteFaq(f.id)" class="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><mat-icon class="text-base">delete_outline</mat-icon></button>
                  </div>
                  <h4 class="text-xs font-black text-zinc-950 dark:text-white">Q: {{ f.question }}</h4>
                  <p class="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-350">A: {{ f.answer }}</p>
                </div>
              }
            </div>

            <!-- CREATE FAQ -->
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4 text-zinc-900 dark:text-white">
              <h3 class="text-xs font-black uppercase pb-2 border-b dark:border-zinc-800">Add FAQ Item</h3>
              <div class="space-y-1">
                <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Category Group</span>
                <select [value]="admin.newFaqCategory()" (change)="admin.newFaqCategory.set($any($event.target).value)" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none font-bold text-zinc-900 dark:text-white">
                  <option value="Pricing & B2B">Pricing & B2B</option>
                  <option value="Brahma 3D Farm">Brahma 3D Farm</option>
                  <option value="Shipping & Billing">Shipping & Billing</option>
                </select>
              </div>
              <div class="space-y-1">
                <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Question Description</span>
                <input type="text" [value]="admin.newFaqQuestion()" (input)="admin.newFaqQuestion.set($any($event.target).value)" placeholder="e.g. Lead delivery time?" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white">
              </div>
              <div class="space-y-1">
                <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1">Technical Answer Description</span>
                <textarea rows="3" [value]="admin.newFaqAnswer()" (input)="admin.newFaqAnswer.set($any($event.target).value)" placeholder="Enter responses details..." class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"></textarea>
              </div>
              <button (click)="admin.createFaq()" class="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer hover:bg-blue-500 border-none">Program FAQ</button>
            </div>
          </div>
        </div>
      }

      <!-- ========================= TAB: BANNERS ========================= -->
      @if (admin.activeTab() === 'banners') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase">Hero carousels Scheduler</h1>
            <p class="text-xs text-zinc-500">Arrange and prioritize homepage carousels and promotional popups.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @for (b of admin.bannerCampaigns(); track b.id) {
              <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl flex flex-col justify-between h-44 shadow-xs relative">
                <div>
                  <div class="flex justify-between items-center text-[8px] font-black text-blue-500 uppercase tracking-widest">
                    <span>{{ b.type }}</span>
                    <span [class]="b.status === 'Published' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-450'" class="px-1.5 py-0.5 rounded-md">{{ b.status }}</span>
                  </div>
                  <h4 class="text-xs font-black uppercase text-zinc-950 dark:text-white mt-1.5 leading-snug">{{ b.name }}</h4>
                  <p class="text-[9px] font-mono text-zinc-4 w-full mt-1 uppercase font-bold text-zinc-400">Target: {{ b.device }} &middot; Time: {{ b.activeHours }}</p>
                </div>
                <div class="flex items-center justify-between pt-3 border-t dark:border-zinc-800">
                  <span class="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1">CTA Action: {{ b.cta }}</span>
                  <mat-icon class="text-zinc-400 text-base">arrow_forward</mat-icon>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ========================= TAB: HOMEPAGE BUILDER ========================= -->
      @if (admin.activeTab() === 'homepage-builder') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase">Homepage Section Assembler</h1>
            <p class="text-xs text-zinc-500">Drag to arrange structure sections, or toggle visibility in real time.</p>
          </div>

          <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl max-w-3xl space-y-4 shadow-xs">
            <div class="flex items-center justify-between pb-3 border-b dark:border-zinc-800">
              <span class="text-xs font-black uppercase text-zinc-450">Active Sections Assembly Order</span>
              <button (click)="admin.saveGlobalConfig()" class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer shadow-sm shadow-blue-500/10 transition-colors border-none">Publish Layout</button>
            </div>

            <div class="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              @for (sec of admin.ds.homeLayout(); track sec.id; let idx = $index) {
                <div class="flex justify-between items-center p-3.5 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                  <div class="flex items-center gap-4">
                    <!-- Reorder dials -->
                    <div class="flex flex-col gap-0.5">
                      <button (click)="admin.moveLayoutSection(idx, 'up')" [disabled]="idx === 0" class="h-6 w-6 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:pointer-events-none"><mat-icon class="text-xs">keyboard_arrow_up</mat-icon></button>
                      <button (click)="admin.moveLayoutSection(idx, 'down')" [disabled]="idx === admin.ds.homeLayout().length - 1" class="h-6 w-6 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:pointer-events-none"><mat-icon class="text-xs">keyboard_arrow_down</mat-icon></button>
                    </div>
                    <div>
                      <div class="flex items-center gap-2 font-bold">
                        <span class="text-xs font-black text-zinc-900 dark:text-white uppercase">{{ sec.name }}</span>
                        <span [class]="sec.visible ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800'" class="text-[8px] font-black px-1 rounded uppercase tracking-widest">
                          {{ sec.visible ? 'LIVE' : 'HIDDEN' }}
                        </span>
                      </div>
                      <p class="text-[9px] font-mono text-zinc-400 mt-0.5">ID: {{ sec.id }}</p>
                    </div>
                  </div>
                  <button (click)="admin.toggleLayoutSectionVisibility(idx)" [class]="sec.visible ? 'text-orange-500' : 'text-emerald-500'" class="px-3 py-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg text-[9px] font-black uppercase cursor-pointer border-none">
                    {{ sec.visible ? 'Hide' : 'Show' }}
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ========================= TAB: NAVIGATION MENU BUILDER ========================= -->
      @if (admin.activeTab() === 'menu-builder') {
        <div class="space-y-8 font-sans">
          <div>
            <h1 class="text-xl font-black uppercase">Storefront Navigation Menu bar</h1>
            <p class="text-xs text-zinc-500">Configure multi-level navigation dropdown header menus, redirection slugs, and live collections.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Navigation Links visual tree -->
            <div class="lg:col-span-2 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4 shadow-xs">
              <div class="flex justify-between items-center pb-2 border-b dark:border-zinc-800">
                <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Header Hierarchy Links</p>
                <span class="text-[9px] font-mono text-blue-500 font-bold">{{ admin.ds.menuItems().length }} Linked Nodes</span>
              </div>

              <div class="space-y-3 max-h-[500px] overflow-y-auto no-scrollbar pr-1">
                <!-- Top level headers -->
                @for (item of admin.ds.menuItems(); track item.id) {
                  @if (!item.parentId) {
                    <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-2">
                      <div class="flex justify-between items-center">
                        <span class="text-xs font-black uppercase text-zinc-950 dark:text-white flex items-center gap-2">
                          <mat-icon class="text-blue-500 text-sm">link</mat-icon>
                          {{ item.label }}
                        </span>
                        
                        <div class="flex gap-2">
                          <button (click)="admin.startMenuItemEdit(item)" class="text-blue-500 text-[10px] uppercase font-black cursor-pointer bg-none border-none">Edit</button>
                          <button (click)="admin.deleteMenuItem(item.id)" class="text-red-400 text-[10px] uppercase font-black cursor-pointer bg-none border-none">Del</button>
                        </div>
                      </div>

                      <div class="flex gap-4 text-[9px] font-mono text-zinc-400 uppercase tracking-wide">
                        <span>REDIRECTS TO: <strong class="text-zinc-650 dark:text-zinc-300 font-bold p-0.5">{{ item.url || '/' }}</strong></span>
                        @if (item.categoryId) {
                          <span class="text-teal-500 font-black">CAT: {{ item.categoryId }}</span>
                        }
                        <span>ORDER: {{ item.sortOrder || 1 }}</span>
                      </div>

                      <!-- Level 2 children inside this menu -->
                      <div class="pl-5 border-l border-zinc-200 dark:border-zinc-850 space-y-2.5 pt-1">
                        @for (sub of admin.ds.menuItems(); track sub.id) {
                          @if (sub.parentId === item.id) {
                            <div class="p-2.5 bg-blue-500/5 hover:bg-blue-500/10 rounded-lg border dark:border-white/5 space-y-1">
                              <div class="flex justify-between items-center">
                                <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                                  ↳ <mat-icon class="text-[12px] text-zinc-400">subdirectory_arrow_right</mat-icon>
                                  {{ sub.label }}
                                </span>
                                <div class="flex gap-1.5">
                                  <button (click)="admin.startMenuItemEdit(sub)" class="text-blue-400 text-[9px] uppercase hover:text-blue-500 cursor-pointer bg-none border-none">Edit</button>
                                  <button (click)="admin.deleteMenuItem(sub.id)" class="text-red-400 text-[9px] uppercase hover:text-red-500 cursor-pointer bg-none border-none">Del</button>
                                </div>
                              </div>
                              <div class="text-[9px] font-mono text-zinc-500 flex gap-3 pl-4">
                                <span>URL: {{ sub.url }}</span>
                                <span>SORT: {{ sub.sortOrder }}</span>
                              </div>
                            </div>
                          }
                        }
                      </div>

                    </div>
                  }
                } @empty {
                  <div class="py-12 text-center text-zinc-400 border border-dashed rounded-xl">
                    <mat-icon class="text-2xl mb-1">map</mat-icon>
                    <p class="text-xs font-black uppercase">No menu items programmed inside Firestore. Add headers below!</p>
                  </div>
                }
              </div>
            </div>

            <!-- Program/Edit Menu link Node -->
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4 shadow-xs">
              <div class="flex justify-between items-center pb-2 border-b dark:border-zinc-800">
                <h3 class="text-xs font-black uppercase text-zinc-950 dark:text-white leading-none">
                  {{ admin.editingMenuItem() ? 'Edit Menu Link' : 'Register Menu Link' }}
                </h3>
                @if (admin.editingMenuItem()) {
                  <button (click)="admin.cancelMenuItemEdit()" class="text-[9px] font-black uppercase px-2 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded text-zinc-500 cursor-pointer border-none">New</button>
                }
              </div>

              <div class="space-y-3 text-zinc-900 dark:text-white">
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1 font-bold">Menu Display label Title *</span>
                  <input type="text" [value]="admin.menuLabel()" (input)="admin.menuLabel.set($any($event.target).value)" placeholder="e.g. Creality Spools" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white">
                </div>

                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1 font-bold">Redirection URL link (Standard path)</span>
                  <input type="text" [value]="admin.menuUrl()" (input)="admin.menuUrl.set($any($event.target).value)" placeholder="/categories/pla-filaments" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white">
                </div>

                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1 font-bold">Nesting parent Link (Choose null for Root header)</span>
                  <select [value]="admin.menuParentId() || ''" (change)="admin.menuParentId.set($any($event.target).value || null)" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold cursor-pointer">
                    <option value="">Top-Level Main link (Root)</option>
                    @for (m of admin.ds.menuItems(); track m.id) {
                      @if (!m.parentId && m.id !== admin.editingMenuItem()?.id) {
                        <option [value]="m.id">{{ m.label }}</option>
                      }
                    }
                  </select>
                </div>

                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1 font-bold">Bind directly to dynamic Catalog Category</span>
                  <select [value]="admin.menuCategoryId() || ''" (change)="admin.menuCategoryId.set($any($event.target).value || null)" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold cursor-pointer">
                    <option value="">No Catalog Link constraints</option>
                    @for (c of admin.ds.categories(); track c.id) {
                      <option [value]="c.id">{{ c.name }}</option>
                    }
                  </select>
                </div>

                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase pl-1 font-bold">Redirection weighting sortOrder (1-100)</span>
                  <input type="number" [value]="admin.menuSortOrder()" (input)="admin.menuSortOrder.set(+$any($event.target).value)" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none text-zinc-900 dark:text-white">
                </div>
              </div>

              <div class="pt-2">
                <button (click)="admin.saveMenuItem()" class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all border-none">
                  {{ admin.editingMenuItem() ? 'Publish Link modifications' : 'Register Link' }}
                </button>
              </div>
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class AdminContentTab {
  @Input({ required: true }) admin!: AdminPanel;
}
