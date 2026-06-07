import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminPanel } from '../admin';

@Component({
  selector: 'app-admin-catalog-tab',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300">
      
      <!-- ========================= TAB: PRODUCTS CATALOG ========================= -->
      @if (admin.activeTab() === 'products') {
        <div class="space-y-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-xl font-black tracking-tight uppercase">Catalog Registry</h1>
              <p class="text-xs text-zinc-500">Program and configure inventory assets, dealer overrides, and specifications.</p>
            </div>
            @if (!admin.editingProduct()) {
              <button (click)="admin.startProductEdit({ id: 'new', name: '', slug: '', barcode: '', sku: '', brand: '3D Galaxy', category_id: '', mrp: 1499, sale_price: 1199, dealer_price: 999, stock: 50, reserved: 0, description: '', images: [], specs: [], reviews: [], qnas: [], featured: false, is360Supported: false, tags: [] })" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-xl transition-colors cursor-pointer">Register SKU</button>
            } @else {
              <button (click)="admin.cancelProductEdit()" class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-xs font-black uppercase rounded-xl transition-colors cursor-pointer">Back to Hub</button>
            }
          </div>

          @if (admin.editingProduct()) {
            <!-- PRODUCT CREATION/EDITING TABS VIEW -->
            <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-hidden shadow-xs">
              <div class="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center">
                <h3 class="text-sm font-black uppercase text-zinc-950 dark:text-white">
                  {{ admin.editingProduct()?.id === 'new' ? 'Publish New Catalog Asset' : 'Edit Catalog SKU: ' + admin.editingProduct()?.name }}
                </h3>
                <div class="flex gap-2">
                  <button (click)="admin.cancelProductEdit()" class="px-3 py-1.5 text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-600 cursor-pointer font-bold">Cancel</button>
                  <button (click)="admin.saveProduct()" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer">Save Asset</button>
                </div>
              </div>

              <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Basic Group -->
                <div class="space-y-1">
                  <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Product Title *</span>
                  <input type="text" [value]="admin.pName()" (input)="admin.pName.set($any($event.target).value)" placeholder="e.g. Bambu Lab P1S" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white">
                </div>
                <div class="space-y-1">
                  <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">SKU Barcode / Part Number</span>
                  <input type="text" [value]="admin.pSku()" (input)="admin.pSku.set($any($event.target).value)" placeholder="e.g. GLX-PLA-BLU" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono uppercase font-black outline-none text-zinc-900 dark:text-white">
                </div>

                <div class="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                  <div class="space-y-1">
                    <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Linked Category *</span>
                    <select [value]="admin.pCatId()" (change)="admin.pCatId.set($any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none font-bold text-zinc-900 dark:text-white">
                      <option value="">Select segment...</option>
                      @for (c of admin.ds.categories(); track c.id) {
                        <option [value]="c.id">
                          @if (c.parent_id) { ↳ } {{ c.name }}
                        </option>
                      }
                    </select>
                  </div>
                  <div class="space-y-1">
                    <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Brand Manufacturer alliance</span>
                    <select [value]="admin.pBrand()" (change)="admin.pBrand.set($any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none font-bold text-zinc-900 dark:text-white">
                      <option value="3D Galaxy">3D Galaxy (Default)</option>
                      @for (br of admin.ds.brands(); track br.id) {
                        <option [value]="br.name">{{ br.name }}</option>
                      }
                    </select>
                  </div>
                </div>

                <!-- Prices -->
                <div class="grid grid-cols-3 gap-3 col-span-1 md:col-span-2 text-zinc-900 dark:text-white">
                  <div class="space-y-1">
                    <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">MRP Price (INR)</span>
                    <input type="number" [value]="admin.pMrp()" (input)="admin.pMrp.set(+$any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white">
                  </div>
                  <div class="space-y-1">
                    <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Retail Sale (INR)</span>
                    <input type="number" [value]="admin.pSale()" (input)="admin.pSale.set(+$any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono text-blue-500 font-bold outline-none">
                  </div>
                  <div class="space-y-1">
                    <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Authorized Dealer (INR)</span>
                    <input type="number" [value]="admin.pDealer()" (input)="admin.pDealer.set(+$any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono text-emerald-500 font-bold outline-none">
                  </div>
                </div>

                <!-- Stock, Status -->
                <div class="grid grid-cols-2 gap-4 col-span-1 md:col-span-2 text-zinc-900 dark:text-white">
                  <div class="space-y-1">
                    <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Physical Stock Inventory</span>
                    <input type="number" [value]="admin.pStock()" (input)="admin.pStock.set(+$any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono font-black outline-none text-zinc-900 dark:text-white">
                  </div>
                  <div class="space-y-1">
                    <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Status Policy</span>
                    <select [value]="admin.pStatus()" (change)="admin.pStatus.set($any($event.target).value)" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white font-bold">
                      <option value="active">Active Storefront</option>
                      <option value="draft">Draft (Admin Only)</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </div>
                </div>

                <!-- Image List Block -->
                <div class="space-y-1 md:col-span-2">
                  <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Media Images (One Absolute URL link per line)</span>
                  <textarea rows="3" [value]="admin.pImages()" (input)="admin.pImages.set($any($event.target).value)" placeholder="https://store.bambulab.com/image1.png&#15;https://store.bambulab.com/image2.png" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white"></textarea>
                </div>

                <!-- Specifications & Full Rich Description -->
                <div class="space-y-1">
                  <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Quick Bullet Highlight Specs</span>
                  <textarea rows="4" [value]="admin.pDesc()" (input)="admin.pDesc.set($any($event.target).value)" placeholder="Enter technical bullet highlights..." class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"></textarea>
                </div>
                <div class="space-y-1">
                  <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Long description / Overview page</span>
                  <textarea rows="4" [value]="admin.pLongDesc()" (input)="admin.pLongDesc.set($any($event.target).value)" placeholder="Enter detailed comprehensive description paragraph..." class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"></textarea>
                </div>

                <!-- Product Variants JSON -->
                <div class="space-y-1 md:col-span-2">
                  <div class="flex justify-between items-center pr-1">
                    <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Product Variants (JSON specifications)</span>
                    <span class="text-[9px] text-zinc-500 font-mono">Form: [&#123;&quot;name&quot;: &quot;With AMS Combo&quot;, &quot;price&quot;: 48000&#125;]</span>
                  </div>
                  <textarea rows="2" [value]="admin.pVariants()" (input)="admin.pVariants.set($any($event.target).value)" placeholder='[{"name": "Standard Bundle", "price": 21499, "stock": 12}, {"name": "With AMS Combo", "price": 38499, "stock": 8}]' class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white"></textarea>
                </div>

                <!-- Search Optimization Meta Data -->
                <div class="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-900 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="col-span-1 md:col-span-2 pb-1 border-b dark:border-zinc-900">
                    <span class="text-[9px] font-black uppercase text-blue-500 tracking-wider">Storefront Meta SEO tags (Shopify standard)</span>
                  </div>
                  <div class="space-y-1">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">SEO Page Title</span>
                    <input type="text" [value]="admin.pSeoTitle()" (input)="admin.pSeoTitle.set($any($event.target).value)" placeholder="Leave blank to use title page name" class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white">
                  </div>
                  <div class="space-y-1">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">SEO Description keywords</span>
                    <input type="text" [value]="admin.pSeoDescription()" (input)="admin.pSeoDescription.set($any($event.target).value)" placeholder="Describe target search terms..." class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white">
                  </div>
                </div>

              </div>
            </div>
          } @else {
            <!-- PRODUCT LOOKUP SEARCH AND TABLE GRID -->
            <div class="space-y-4 font-sans">
              <div class="flex bg-white dark:bg-zinc-900 p-2.5 border border-zinc-200 dark:border-zinc-900 rounded-xl">
                <div class="flex-1 relative">
                  <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">search</mat-icon>
                  <input type="text" [value]="admin.searchQueryProducts()" (input)="admin.searchQueryProducts.set($any($event.target).value)" placeholder="Search catalog by name, sku..." class="w-full pl-9 pr-4 py-2 bg-transparent text-xs font-bold border-none outline-none">
                </div>
              </div>

              <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-x-auto no-scrollbar">
                <table class="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr class="text-[10px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800">
                      <th class="py-3">Asset Item</th>
                      <th class="py-3">Category</th>
                      <th class="py-3">SKU barcode</th>
                      <th class="py-3">Stock remaining</th>
                      <th class="py-3">Retail Cost</th>
                      <th class="py-3">Dealer Pricing</th>
                      <th class="py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                    @for (p of admin.ds.products(); track p.id) {
                      @if (!admin.searchQueryProducts() || p.name.toLowerCase().includes(admin.searchQueryProducts().toLowerCase()) || p.sku.toLowerCase().includes(admin.searchQueryProducts().toLowerCase())) {
                        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 font-semibold text-zinc-900 dark:text-zinc-100">
                          <td class="py-4">
                            <div class="flex items-center gap-3">
                              <img [src]="p.images?.[0] || 'https://picsum.photos/100/100'" alt="Product thumbnail" class="h-8 w-8 object-contain bg-zinc-50 dark:bg-zinc-950 rounded border dark:border-zinc-800" referrerpolicy="no-referrer">
                              <div>
                                <p class="font-black uppercase text-zinc-900 dark:text-white">{{ p.name }}</p>
                                <p class="text-[9px] text-zinc-400 font-mono tracking-wide uppercase">{{ p.brand }} alliance</p>
                              </div>
                            </div>
                          </td>
                          <td class="py-4 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] font-bold">{{ p.category_id }}</td>
                          <td class="py-4 font-mono text-zinc-500 text-[10px] uppercase">{{ p.sku }}</td>
                          <td class="py-4">
                            <span [class]="p.stock > 10 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'" class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase">
                              {{ p.stock }} units
                            </span>
                          </td>
                          <td class="py-4 font-mono font-bold">₹{{ p.sale_price | number }}</td>
                          <td class="py-4 font-mono text-emerald-500 font-bold">₹{{ p.dealer_price | number }}</td>
                          <td class="py-4 text-right">
                            <div class="inline-flex gap-2">
                              <button (click)="admin.startProductEdit(p)" class="p-1 text-blue-500 hover:text-blue-700 cursor-pointer">
                                <mat-icon class="text-base">edit</mat-icon>
                              </button>
                              <button (click)="admin.ds.deleteProduct(p.id)" class="text-red-400 hover:text-red-600 p-1 cursor-pointer">
                                <mat-icon class="text-base">delete_outline</mat-icon>
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- ========================= TAB: CATEGORIES ========================= -->
      @if (admin.activeTab() === 'categories') {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase font-sans">Taxonomy Tree</h1>
            <p class="text-xs text-zinc-500">Manage structure taxonomy, recursive parent mappings, SEO attributes, and media.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- TREE GRAPH DIAL -->
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4 shadow-xs font-sans">
              <div class="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
                <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Tree Nodes (Infinite Depth Display)</p>
                <span class="text-[9px] font-mono text-blue-500 font-bold">{{ admin.ds.categories().length }} Categories</span>
              </div>
              
              <div class="space-y-3 max-h-[600px] overflow-y-auto no-scrollbar pr-1">
                <!-- Level 1 Root Nodes -->
                @for (c of admin.ds.categories(); track c.id) {
                  @if (!c.parent_id && !c.parentId) {
                    <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-2">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-black text-zinc-900 dark:text-white uppercase flex items-center gap-2">
                          <mat-icon class="text-blue-500 text-sm font-black">folder_open</mat-icon> {{ c.name }}
                        </span>
                        <div class="flex gap-1.5">
                          <button (click)="admin.startCategoryEdit(c)" class="p-1 text-blue-500 hover:text-blue-700 cursor-pointer">
                            <mat-icon class="text-sm font-bold">edit</mat-icon>
                          </button>
                          <button (click)="admin.deleteCategory(c.id)" class="p-1 text-red-400 hover:text-red-600 cursor-pointer">
                            <mat-icon class="text-sm font-bold">close</mat-icon>
                          </button>
                        </div>
                      </div>

                      @if (c.description) {
                        <p class="text-[10px] text-zinc-400 pl-6 leading-relaxed">{{ c.description }}</p>
                      }
                      
                      <!-- Level-2 Sub-nesting loop -->
                      <div class="pl-5 border-l border-zinc-200 dark:border-zinc-800 space-y-2 mt-2">
                        @for (sub of admin.ds.categories(); track sub.id) {
                          @if (sub.parent_id === c.id || sub.parentId === c.id) {
                            <div class="space-y-1.5 p-2 bg-blue-500/5 rounded-lg border dark:border-white/5">
                              <div class="flex justify-between items-center text-[11px] font-black text-zinc-900 dark:text-zinc-100">
                                <span class="flex items-center gap-1">↳ <mat-icon class="text-xs text-blue-400">subdirectory_arrow_right</mat-icon> {{ sub.name }}</span>
                                <div class="flex gap-1">
                                  <button (click)="admin.startCategoryEdit(sub)" class="text-blue-500 text-[10px] hover:text-blue-600 cursor-pointer">Edit</button>
                                  <button (click)="admin.deleteCategory(sub.id)" class="text-red-400 text-[10px] hover:text-red-500 cursor-pointer">Del</button>
                                </div>
                              </div>
                              
                              <!-- Level-3 Sub-nesting loop -->
                              <div class="pl-4 border-l border-blue-500/20 space-y-1">
                                @for (nest of admin.ds.categories(); track nest.id) {
                                  @if (nest.parent_id === sub.id || nest.parentId === sub.id) {
                                    <div class="space-y-1 p-1 bg-emerald-500/5 rounded">
                                      <div class="flex justify-between text-[10px] font-black text-zinc-600 dark:text-zinc-300">
                                        <span class="flex items-center gap-1">↳ <mat-icon class="text-[10px] text-emerald-400 h-3 w-3">commit</mat-icon> {{ nest.name }}</span>
                                        <div class="flex gap-1">
                                          <button (click)="admin.startCategoryEdit(nest)" class="text-blue-400 text-[9px] hover:text-blue-500 cursor-pointer">Edit</button>
                                          <button (click)="admin.deleteCategory(nest.id)" class="text-red-400 text-[9px] hover:text-red-500 cursor-pointer">Del</button>
                                        </div>
                                      </div>
                                      
                                      <!-- Level-4 Sub-nesting loop -->
                                      <div class="pl-4 border-l border-emerald-500/20">
                                        @for (deep of admin.ds.categories(); track deep.id) {
                                          @if (deep.parent_id === nest.id || deep.parentId === nest.id) {
                                            <div class="flex justify-between text-[9px] font-black text-zinc-400 pl-2">
                                              <span>↳ {{ deep.name }}</span>
                                              <div class="flex gap-1">
                                                <button (click)="admin.startCategoryEdit(deep)" class="text-blue-400 text-[8px] hover:text-blue-500 cursor-pointer">Edit</button>
                                                <button (click)="admin.deleteCategory(deep.id)" class="text-red-400 text-[8px] hover:text-red-500 cursor-pointer">Del</button>
                                              </div>
                                            </div>
                                          }
                                        }
                                      </div>
                                    </div>
                                  }
                                }
                              </div>
                            </div>
                          }
                        }
                      </div>
                    </div>
                  }
                }
              </div>
            </div>

            <!-- ROOT ADDITION MODULE -->
            <div class="p-6 bg-linear-to-b from-fuchsia-600 via-purple-600 to-cyan-500 text-white rounded-2xl space-y-6 shadow-xl relative overflow-hidden font-sans">
              <div class="absolute -right-20 -top-20 opacity-10 text-white"><mat-icon class="text-[12rem] h-auto w-auto">account_tree</mat-icon></div>
              <div class="relative space-y-4 font-sans">
                <div class="flex justify-between items-center">
                  <h3 class="text-sm font-black uppercase text-white leading-none">
                    {{ admin.editingCategory() ? 'Update Segment Node' : 'Initialize Segment Node' }}
                  </h3>
                  @if (admin.editingCategory()) {
                    <button (click)="admin.cancelCategoryEdit()" class="text-[9px] font-black uppercase tracking-wider bg-white/10 px-2 py-1 rounded text-white hover:bg-white/20">New Segment</button>
                  }
                </div>
                
                <div class="space-y-3 text-zinc-900">
                  <div class="space-y-1">
                    <span class="block text-[10px] font-black text-white/75 uppercase pl-1">Name / Label *</span>
                    <input type="text" [value]="admin.newCatName()" (input)="admin.newCatName.set($any($event.target).value)" placeholder="e.g. FDM Accessories" class="w-full px-4 py-2 bg-white text-zinc-950 rounded-xl text-xs font-bold outline-none border-none">
                  </div>
                  
                  <div class="space-y-1">
                    <span class="block text-[10px] font-black text-white/75 uppercase pl-1">Parent Segment Node (Leave empty if root)</span>
                    <select [value]="admin.newCatParentId()" (change)="admin.newCatParentId.set($any($event.target).value)" class="w-full px-4 py-2 bg-white text-zinc-950 rounded-xl text-xs font-bold outline-none cursor-pointer">
                      <option value="">None (Top-Level Category)</option>
                      @for (c of admin.ds.categories(); track c.id) {
                        @if (c.id !== admin.editingCategory()?.id) {
                          <option [value]="c.id">
                            @if (c.parent_id) { ↳ } {{ c.name }}
                          </option>
                        }
                      }
                    </select>
                  </div>

                  <div class="space-y-1">
                    <span class="block text-[10px] font-black text-white/75 uppercase pl-1">Segment Description</span>
                    <input type="text" [value]="admin.newCatDesc()" (input)="admin.newCatDesc.set($any($event.target).value)" placeholder="Short explanatory copy..." class="w-full px-4 py-2 bg-white text-zinc-900 rounded-xl text-xs outline-none">
                  </div>

                  <!-- Extra Shopify Layout details -->
                  <div class="grid grid-cols-2 gap-2 text-zinc-900">
                    <div class="space-y-1">
                      <span class="block text-[9px] font-black text-white/75 uppercase">Image Grid URL</span>
                      <input type="text" [value]="admin.catImage()" (input)="admin.catImage.set($any($event.target).value)" placeholder="https://..." class="w-full px-3 py-1.5 bg-white rounded-lg text-xs outline-none">
                    </div>
                    <div class="space-y-1">
                      <span class="block text-[9px] font-black text-white/75 uppercase">Banner Overlay URL</span>
                      <input type="text" [value]="admin.catBanner()" (input)="admin.catBanner.set($any($event.target).value)" placeholder="https://..." class="w-full px-3 py-1.5 bg-white rounded-lg text-xs outline-none">
                    </div>
                  </div>

                  <div class="grid grid-cols-3 gap-2">
                    <div class="space-y-1 col-span-1">
                      <span class="block text-[9px] font-black text-white/75 uppercase">Grid Icon</span>
                      <input type="text" [value]="admin.catIcon()" (input)="admin.catIcon.set($any($event.target).value)" placeholder="folder" class="w-full px-3 py-1.5 bg-white rounded-lg text-xs outline-none">
                    </div>
                    <div class="flex items-center gap-1.5 pt-4">
                      <input type="checkbox" [checked]="admin.catIsActive()" (change)="admin.catIsActive.set($any($event.target).checked)" class="rounded text-blue-600">
                      <span class="text-[9px] font-black text-white/80">Active</span>
                    </div>
                    <div class="flex items-center gap-1.5 pt-4">
                      <input type="checkbox" [checked]="admin.catIsFeatured()" (change)="admin.catIsFeatured.set($any($event.target).checked)" class="rounded text-blue-600">
                      <span class="text-[9px] font-black text-white/80">Featured</span>
                    </div>
                  </div>

                  <!-- Category SEO tags -->
                  <div class="p-3 bg-white/10 rounded-xl border border-white/10 space-y-1.5 mt-2 col-span-1">
                    <span class="text-[9px] font-black uppercase text-white/85 tracking-wide block">Taxonomy Meta Tags (Shopify Standard)</span>
                    <div class="grid grid-cols-2 gap-2">
                      <input type="text" [value]="admin.catSeoTitle()" (input)="admin.catSeoTitle.set($any($event.target).value)" placeholder="SEO Meta Title" class="w-full px-2 py-1 bg-white/20 rounded text-[10px] text-zinc-950 outline-none placeholder:text-zinc-600">
                      <input type="text" [value]="admin.catSeoDescription()" (input)="admin.catSeoDescription.set($any($event.target).value)" placeholder="SEO Meta Desc" class="w-full px-2 py-1 bg-white/20 rounded text-[10px] text-zinc-950 outline-none placeholder:text-zinc-600">
                    </div>
                  </div>
                </div>

                <div class="pt-2">
                  <button (click)="admin.saveCategory()" class="w-full py-3.5 bg-white text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg hover:bg-zinc-50 transition-colors cursor-pointer border-none">
                    {{ admin.editingCategory() ? 'Publish Node Update' : 'Program Node Segment' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ========================= TAB: COLLECTIONS ========================= -->
      @if (admin.activeTab() === 'collections') {
        <div class="space-y-8 font-sans">
          <div>
            <h1 class="text-xl font-black uppercase">Thematic Collections</h1>
            <p class="text-xs text-zinc-500">Group catalog spools, filaments, and printers into user-facing collections.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- LIST -->
            <div class="lg:col-span-2 space-y-4">
              @for (col of admin.collectionsList(); track col.id) {
                <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-xl flex justify-between items-center hover:border-blue-500/20 transition-all shadow-xs">
                  <div>
                    <div class="flex items-center gap-2">
                      <h4 class="text-xs font-black uppercase text-zinc-900 dark:text-white">{{ col.name }}</h4>
                      <span [class]="col.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500'" class="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase">
                        {{ col.active ? 'ACTIVE' : 'DRAFT' }}
                      </span>
                    </div>
                    <p class="text-[11px] text-zinc-400 mt-1">{{ col.description }}</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <button (click)="admin.toggleCollection(col.id)" class="px-2.5 py-1 text-[9px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 rounded-md cursor-pointer hover:bg-blue-600 hover:text-white transition-colors border-none">Toggle</button>
                    <button (click)="admin.deleteCollection(col.id)" class="text-red-400 hover:text-red-500 cursor-pointer"><mat-icon class="text-base">delete_outline</mat-icon></button>
                  </div>
                </div>
              }
            </div>

            <!-- ADD -->
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4 shadow-xs">
              <h3 class="text-xs font-black uppercase">Register Collection</h3>
              <div class="space-y-1">
                <span class="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Label</span>
                <input type="text" [value]="admin.newColName()" (input)="admin.newColName.set($any($event.target).value)" placeholder="e.g. PLA Professional Filament" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white">
              </div>
              <div class="space-y-1">
                <span class="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Brief Description</span>
                <input type="text" [value]="admin.newColDesc()" (input)="admin.newColDesc.set($any($event.target).value)" placeholder="Short descriptive caption..." class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white">
              </div>
              <button (click)="admin.createCollection()" class="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer hover:bg-blue-500 border-none">Program Collection</button>
            </div>
          </div>
        </div>
      }

      <!-- ========================= TAB: BRANDS ========================= -->
      @if (admin.activeTab() === 'brands') {
        <div class="space-y-8 font-sans">
          <div>
            <h1 class="text-xl font-black uppercase">Brand Alliances</h1>
            <p class="text-xs text-zinc-500">Coordinate and verify global SLA printing manufacturers. Add logos, descriptions, and territories.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Lists of Brands -->
            <div class="lg:col-span-2 space-y-3">
              @for (br of admin.ds.brands(); track br.id) {
                <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl flex justify-between items-center hover:border-blue-500/20 transition-all shadow-xs">
                  <div class="flex items-center gap-4">
                    <img [src]="br.logo || 'https://picsum.photos/seed/logo/100/100'" alt="Brand alliance logo" class="h-10 w-16 object-contain bg-zinc-50 dark:bg-zinc-950 rounded border dark:border-zinc-800 pr-1 shrink-0" referrerpolicy="no-referrer">
                    <div>
                      <h4 class="text-xs font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2">
                        {{ br.name }}
                        @if (br.active) {
                          <span class="bg-blue-500/15 text-blue-500 px-1 py-0.5 rounded text-[8px] font-black">ACTIVE</span>
                        } @else {
                          <span class="bg-zinc-250 dark:bg-zinc-850 text-zinc-500 px-1 py-0.5 rounded text-[8px] font-black">INACTIVE</span>
                        }
                      </h4>
                      <p class="text-[9px] text-zinc-400 uppercase font-mono tracking-wide pt-0.5">TERRITORY: {{ br.country || 'Global' }}</p>
                      @if (br.description) {
                        <p class="text-[10px] text-zinc-500 mt-1 line-clamp-1 dark:text-zinc-400">{{ br.description }}</p>
                      }
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button (click)="admin.startBrandEdit(br)" class="p-1 px-2 hover:bg-blue-600/10 text-blue-500 rounded text-[10px] uppercase font-black cursor-pointer bg-none border-none">Edit</button>
                    <button (click)="admin.deleteBrand(br.id)" class="text-red-400 hover:text-red-500 cursor-pointer p-1"><mat-icon class="text-base font-black">delete_outline</mat-icon></button>
                  </div>
                </div>
              } @empty {
                <div class="py-10 text-center text-zinc-400 border border-dashed rounded-2xl">
                  <mat-icon class="text-xl mb-1 font-black">label</mat-icon>
                  <p class="text-xs font-bold uppercase">No brands seeded or registered. Add your first client partner!</p>
                </div>
              }
            </div>

            <!-- Add / Edit Form -->
            <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4 shadow-xs">
              <div class="flex justify-between items-center pb-2 border-b dark:border-zinc-800">
                <h3 class="text-xs font-black uppercase text-zinc-900 dark:text-white leading-none">
                  {{ admin.editingBrand() ? 'Edit Verified Alliance' : 'Register Brand Alliance' }}
                </h3>
                @if (admin.editingBrand()) {
                  <button (click)="admin.cancelBrandEdit()" class="text-[9px] font-black uppercase px-2 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded text-zinc-500 cursor-pointer">New</button>
                }
              </div>

              <div class="space-y-3">
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Brand Name *</span>
                  <input type="text" [value]="admin.brandName()" (input)="admin.brandName.set($any($event.target).value)" placeholder="e.g. Creality Inc." class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white">
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Alliance Slug Identification</span>
                  <input type="text" [value]="admin.brandSlug()" (input)="admin.brandSlug.set($any($event.target).value)" placeholder="creality-inc" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none text-zinc-900 dark:text-white">
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Manufacturing Territory (Country)</span>
                  <input type="text" [value]="admin.brandCountry()" (input)="admin.brandCountry.set($any($event.target).value)" placeholder="e.g. Shenzhen HQ" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white">
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Logo URL (PNG/SVG)</span>
                  <input type="text" [value]="admin.brandLogo()" (input)="admin.brandLogo.set($any($event.target).value)" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white">
                </div>
                <div class="space-y-1">
                  <span class="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Alliance Banner Description</span>
                  <textarea rows="2" [value]="admin.brandDesc()" (input)="admin.brandDesc.set($any($event.target).value)" placeholder="Exquisite summaries of machinery tools..." class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"></textarea>
                </div>
                
                <div class="flex items-center gap-1.5 pt-2">
                  <input type="checkbox" [checked]="admin.brandActive()" (change)="admin.brandActive.set($any($event.target).checked)" class="rounded text-blue-600">
                  <span class="text-[10px] font-black text-zinc-550 uppercase">Active Verified status</span>
                </div>
              </div>

              <div class="pt-2">
                <button (click)="admin.saveBrand()" class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all border-none">
                  {{ admin.editingBrand() ? 'Save brand modifications' : 'Register alliance' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ========================= TAB: INVENTORY ========================= -->
      @if (admin.activeTab() === 'inventory') {
        <div class="space-y-8 font-sans">
          <div>
            <h1 class="text-xl font-black uppercase">Logistics & SKU Depot</h1>
            <p class="text-xs text-zinc-500">Real-time stock adjustments synced in real time with the active warehouse network.</p>
          </div>

          <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-x-auto no-scrollbar font-sans shadow-xs">
            <table class="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr class="text-[10px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800">
                  <th class="py-3">Asset Item</th>
                  <th class="py-3">SKU barcode</th>
                  <th class="py-3">Current buffer</th>
                  <th class="py-3 text-right">Physical adjustment tuning</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                @for (p of admin.ds.products(); track p.id) {
                  <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-950 dark:text-zinc-150">
                    <td class="py-4 font-black text-zinc-900 dark:text-white uppercase font-sans">{{ p.name }}</td>
                    <td class="py-4 text-zinc-550">{{ p.sku }}</td>
                    <td class="py-4 font-bold" [class.text-red-500]="p.stock < 10">{{ p.stock }} Unit(s)</td>
                    <td class="py-4 text-right">
                      <div class="inline-flex gap-1">
                        <button (click)="admin.adjustStock(p.id, -10)" class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-[10px] font-black rounded-lg cursor-pointer border-none">-10</button>
                        <button (click)="admin.adjustStock(p.id, -1)" class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-[10px] font-black rounded-lg cursor-pointer border-none">-1</button>
                        <button (click)="admin.adjustStock(p.id, 1)" class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-[10px] font-black rounded-lg cursor-pointer text-emerald-500 border-none">+1</button>
                        <button (click)="admin.adjustStock(p.id, 10)" class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-[10px] font-black rounded-lg cursor-pointer text-emerald-500 border-none">+10</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminCatalogTab {
  @Input({ required: true }) admin!: AdminPanel;
}
