import { Component, Input, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminPanel } from '../admin';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';

import { ImagePickerComponent } from '../../../shared/components/image-picker/image-picker.component';

@Component({
  selector: 'app-admin-catalog-tab',
  imports: [CommonModule, FormsModule, MatIconModule, RichTextEditorComponent, ImagePickerComponent],
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
              <button (click)="startEditNew()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-xl transition-colors cursor-pointer">Register SKU</button>
            } @else {
              <button (click)="cancelEdit()" class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-xs font-black uppercase rounded-xl transition-colors cursor-pointer">Back to Hub</button>
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
                  <button (click)="cancelEdit()" class="px-3 py-1.5 text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-600 cursor-pointer font-bold">Cancel</button>
                  <button (click)="admin.saveProduct()" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer">Save Asset</button>
                </div>
              </div>

              <!-- Editor Tabs Navigation -->
              <div class="flex items-center gap-6 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 overflow-x-auto hide-scroll pt-4">
                @for (t of editTabs; track t.id) {
                  <button (click)="activeEditTab.set(t.id)"
                    class="shrink-0 pb-3 transition-colors text-[10px] font-black uppercase tracking-widest relative"
                    [class]="activeEditTab() === t.id ? 'text-blue-500 dark:text-blue-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'">
                    {{ t.label }}
                    @if(activeEditTab() === t.id) {
                      <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400 animate-fadeIn"></div>
                    }
                  </button>
                }
              </div>

              <!-- Tab Contents -->
              <div class="p-6">
                <!-- General Tab -->
                <div [class.hidden]="activeEditTab() !== 'general'" class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                  <!-- Basic Group -->
                  <div class="space-y-1">
                    <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Product Title *</span>
                    <input type="text" [value]="admin.pName()" (input)="admin.updateProductName($any($event.target).value)" placeholder="e.g. Bambu Lab P1S" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white">
                  </div>
                  <div class="space-y-1">
                    <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">URL Slug Customization</span>
                    <input type="text" [value]="admin.pSlug()" (input)="admin.pSlug.set($any($event.target).value)" placeholder="bambu-lab-p1s" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono font-bold outline-none text-blue-500 dark:text-blue-400">
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
                  
                  <div class="space-y-1 col-span-1 md:col-span-2">
                    <app-rich-text-editor label="Quick Bullet Highlight Specs" placeholder="Enter technical bullet highlights..." [value]="admin.pDesc()" (valueChange)="admin.pDesc.set($event)"></app-rich-text-editor>
                  </div>
                  <div class="space-y-1 col-span-1 md:col-span-2">
                    <app-rich-text-editor label="Long description / Overview page" placeholder="Enter detailed comprehensive description paragraph..." [value]="admin.pLongDesc()" (valueChange)="admin.pLongDesc.set($event)"></app-rich-text-editor>
                  </div>
                </div>

                <!-- Images Tab -->
                <div [class.hidden]="activeEditTab() !== 'images'" class="space-y-4 animate-fadeIn">
                  <!-- Image List Block -->
                  <div class="space-y-3 bg-zinc-50 dark:bg-zinc-950 p-6 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-blue-500 scale-90">collections</mat-icon>
                        <h4 class="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">Product Gallery</h4>
                      </div>
                      <span class="text-[10px] font-bold text-zinc-500">Supports JPG, PNG, WEBP. Max 2MB per file.</span>
                    </div>
                    
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <!-- Images Loop -->
                      @for (img of admin.pImages(); track img.url; let i = $index) {
                        <div class="relative group aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                          <img [src]="img.url" class="w-full h-full object-contain" />
                          
                          <!-- Hover Actions -->
                          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                             <div class="flex items-center justify-between w-full">
                                <button (click)="admin.setPrimaryImage(i)" title="Make Primary" [class]="img.isPrimary ? 'text-amber-400' : 'text-white hover:text-amber-400'"><mat-icon class="scale-75">star</mat-icon></button>
                                <button (click)="admin.removeImage(i)" title="Remove" class="text-white hover:text-red-500"><mat-icon class="scale-75">delete</mat-icon></button>
                             </div>
                             <div class="flex items-center justify-center gap-2">
                                <button *ngIf="i > 0" (click)="admin.moveImage(i, -1)" class="w-6 h-6 rounded bg-white/20 text-white flex items-center justify-center hover:bg-white/40"><mat-icon class="scale-75 -ml-[3px] -mt-[3px]">chevron_left</mat-icon></button>
                                <button *ngIf="i < admin.pImages().length - 1" (click)="admin.moveImage(i, 1)" class="w-6 h-6 rounded bg-white/20 text-white flex items-center justify-center hover:bg-white/40"><mat-icon class="scale-75 -ml-[3px] -mt-[3px]">chevron_right</mat-icon></button>
                             </div>
                          </div>
                          
                          <!-- Primary Badge -->
                          @if (img.isPrimary) {
                             <div class="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-bl-lg shadow-sm">Primary</div>
                          }
                        </div>
                      }

                      <!-- Drag & Drop / File Input Box -->
                      <label class="aspect-square rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors group">
                        <mat-icon class="text-zinc-400 group-hover:text-blue-500 mb-2">add_photo_alternate</mat-icon>
                        <span class="text-[10px] font-bold text-zinc-500 text-center px-2 leading-tight">Drag &amp; Drop<br>or Click</span>
                        <input type="file" multiple accept="image/jpeg, image/png, image/webp" class="hidden" (change)="handleImageUpload($event)">
                      </label>
                    </div>
                    @if (uploadProgress > 0 && uploadProgress < 100) {
                       <div class="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1 mt-4 overflow-hidden">
                         <div class="bg-blue-500 h-full rounded-full transition-all duration-300" [style.width]="uploadProgress + '%'"></div>
                       </div>
                    }
                  </div>
                </div>

                <!-- Variants Tab -->
                <div [class.hidden]="activeEditTab() !== 'variants'" class="space-y-6 animate-fadeIn">
                  <!-- Options Management -->
                  <div class="space-y-4">
                    <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                       <h4 class="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">Product Options</h4>
                       <button (click)="admin.addOption()" class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] uppercase font-black tracking-wider rounded border-none cursor-pointer flex items-center gap-1"><mat-icon class="scale-75 text-sm">add</mat-icon> Add Option</button>
                    </div>
                    
                    @if (admin.pOptions().length === 0) {
                        <div class="p-8 text-center text-zinc-400 font-bold text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">No options configured. Add options like Size, Color, or Material to generate variants.</div>
                    } @else {
                        <div class="space-y-4">
                          @for (opt of admin.pOptions(); track opt.id; let i = $index) {
                            <div class="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3 relative">
                               <button (click)="admin.removeOption(i)" class="absolute top-3 right-3 text-red-500 hover:text-red-600 bg-none border-none cursor-pointer"><mat-icon class="scale-75">close</mat-icon></button>
                               <div class="w-1/2">
                                  <label class="text-[9px] font-black tracking-widest uppercase text-zinc-400">Option Name</label>
                                  <input type="text" [(ngModel)]="opt.name" (ngModelChange)="admin.updateOption()" placeholder="e.g. Color, Size" class="w-full px-3 py-2 text-xs font-bold font-mono bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded outline-none">
                               </div>
                               <div>
                                  <label class="text-[9px] font-black tracking-widest uppercase text-zinc-400">Values (Comma-separated)</label>
                                  <input type="text" [value]="admin.getOptionValuesString(opt)" (blur)="admin.setOptionValuesString(opt, $any($event.target).value)" placeholder="e.g. Red, Blue, Green / 1kg, 3kg" class="w-full px-3 py-2 text-xs font-bold font-mono bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded outline-none">
                               </div>
                            </div>
                          }
                          <div class="pt-4 flex justify-end gap-3">
                             <button (click)="admin.generateVariants()" class="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-black uppercase text-xs tracking-wider rounded-lg border-none cursor-pointer">Generate Variant Combinations</button>
                          </div>
                        </div>
                    }
                  </div>

                  <!-- Variants Grid -->
                  <div class="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div class="flex items-center justify-between">
                       <h4 class="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">Combinations ({{ admin.pVariants().length }})</h4>
                    </div>

                    @if (admin.pVariants().length === 0) {
                        <div class="p-8 text-center text-zinc-400 font-bold text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">No variants generated yet.</div>
                    } @else {
                        <div class="overflow-x-auto max-h-[500px]">
                           <table class="w-full text-left border-collapse text-xs whitespace-nowrap">
                              <thead class="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-black tracking-widest uppercase sticky top-0 z-10">
                                 <tr>
                                    <th class="p-3">Variant</th>
                                    <th class="p-3 w-32">SKU</th>
                                    <th class="p-3 w-24">Price</th>
                                    <th class="p-3 w-24">Stock</th>
                                    <th class="p-3 w-24">Weight</th>
                                    <th class="p-3 w-16">Action</th>
                                 </tr>
                              </thead>
                              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                 @for (variant of admin.pVariants(); track variant.id || $index; let vIdx = $index) {
                                    <tr>
                                       <td class="p-3 font-bold text-zinc-900 dark:text-white">{{ variant.name }}</td>
                                       <td class="p-2">
                                          <input type="text" [(ngModel)]="variant.sku" class="w-full px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-800 bg-transparent rounded outline-none focus:ring-1 ring-blue-500">
                                       </td>
                                       <td class="p-2">
                                          <input type="number" [(ngModel)]="variant.price" class="w-full px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-800 bg-transparent rounded outline-none focus:ring-1 ring-blue-500">
                                       </td>
                                       <td class="p-2">
                                          <input type="number" [(ngModel)]="variant.stock" class="w-full px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-800 bg-transparent rounded outline-none focus:ring-1 ring-blue-500">
                                       </td>
                                       <td class="p-2">
                                          <input type="number" [(ngModel)]="variant.weight" class="w-full px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-800 bg-transparent rounded outline-none focus:ring-1 ring-blue-500">
                                       </td>
                                       <td class="p-2 text-center">
                                          <div class="flex items-center justify-center gap-2">
                                             <button (click)="openVariantImageModal(vIdx)" class="flex items-center text-[10px] font-bold text-blue-500 hover:text-blue-600 bg-transparent border-none cursor-pointer"><mat-icon class="scale-75 mr-1">image</mat-icon> Manage</button>
                                             <button (click)="admin.removeVariant(vIdx)" class="text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer"><mat-icon class="scale-75">delete</mat-icon></button>
                                          </div>
                                       </td>
                                    </tr>
                                 }
                              </tbody>
                           </table>
                        </div>
                    }
                  </div>
                </div>

                <!-- Specifications Tab (JSON Array) -->
                <div [class.hidden]="activeEditTab() !== 'specifications'" class="space-y-4 animate-fadeIn">
                   <div class="space-y-1">
                    <div class="flex justify-between items-center pr-1">
                      <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Specifications (JSON Array)</span>
                      <span class="text-[9px] text-zinc-500 font-mono">Form: [&#123;&quot;name&quot;: &quot;Build Volume&quot;, &quot;value&quot;: &quot;256 x 256&quot;&#125;]</span>
                    </div>
                    <textarea rows="10" [value]="getJsonValue('specs')" (input)="setJsonValue('specs', $any($event.target).value)" class="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white" placeholder='[{"name": "Layer Resolution", "value": "0.1mm"}]'></textarea>
                  </div>
                </div>

                <!-- Features Tab (JSON Array) -->
                <div [class.hidden]="activeEditTab() !== 'features'" class="space-y-4 animate-fadeIn">
                   <div class="space-y-1">
                    <div class="flex justify-between items-center pr-1">
                      <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Features (JSON Array)</span>
                      <span class="text-[9px] text-zinc-500 font-mono">Form: [&#123;&quot;title&quot;: &quot;Auto Leveling&quot;, &quot;description&quot;: &quot;...&quot;&#125;]</span>
                    </div>
                    <textarea rows="10" [value]="getJsonValue('features')" (input)="setJsonValue('features', $any($event.target).value)" class="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white" placeholder='[{"title": "CoreXY Speed", "description": "Up to 500mm/s"}]'></textarea>
                  </div>
                </div>

                <!-- FAQs Tab (JSON Array) -->
                <div [class.hidden]="activeEditTab() !== 'faqs'" class="space-y-4 animate-fadeIn">
                   <div class="space-y-1">
                    <div class="flex justify-between items-center pr-1">
                      <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">FAQs (JSON Array)</span>
                      <span class="text-[9px] text-zinc-500 font-mono">Form: [&#123;&quot;question&quot;: &quot;Does it support PLA?&quot;, &quot;answer&quot;: &quot;Yes&quot;&#125;]</span>
                    </div>
                    <textarea rows="10" [value]="getJsonValue('faqs')" (input)="setJsonValue('faqs', $any($event.target).value)" class="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white" placeholder='[{"question": "Warranty?", "answer": "1 Year"}]'></textarea>
                  </div>
                </div>

                <!-- Downloads Tab (JSON Array) -->
                <div [class.hidden]="activeEditTab() !== 'downloads'" class="space-y-4 animate-fadeIn">
                   <div class="space-y-1">
                    <div class="flex justify-between items-center pr-1">
                      <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Downloads (JSON Array)</span>
                      <span class="text-[9px] text-zinc-500 font-mono">Form: [&#123;&quot;title&quot;: &quot;Manual&quot;, &quot;fileUrl&quot;: &quot;...&quot;, &quot;type&quot;: &quot;pdf&quot;&#125;]</span>
                    </div>
                    <textarea rows="10" [value]="getJsonValue('downloads')" (input)="setJsonValue('downloads', $any($event.target).value)" class="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white" placeholder='[{"title": "User Manual PDF", "fileUrl": "#", "type": "pdf"}]'></textarea>
                  </div>
                </div>

                <!-- Related Products Tab (JSON string/array edit) -->
                <div [class.hidden]="activeEditTab() !== 'related_products'" class="space-y-4 animate-fadeIn">
                   <div class="space-y-1">
                    <div class="flex justify-between items-center pr-1">
                      <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Related Products (JSON Array of Slugs)</span>
                      <span class="text-[9px] text-zinc-500 font-mono">Form: [&quot;product-1-slug&quot;, &quot;product-2-slug&quot;]</span>
                    </div>
                    <!-- Right now it's just raw JSON editing for speed, full relational UI can be implemented if required -->
                    <textarea rows="5" [value]="getJsonValue('relatedProducts')" (input)="setJsonValue('relatedProducts', $any($event.target).value)" class="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white" placeholder='["pla-basic", "petg-tough"]'></textarea>
                  </div>
                </div>

                <!-- SEO Tab -->
                <div [class.hidden]="activeEditTab() !== 'seo'" class="space-y-4 animate-fadeIn">
                  <!-- Search Optimization Meta Data -->
                  <div class="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-900 grid grid-cols-1 gap-4">
                    <div class="pb-1 border-b dark:border-zinc-900">
                      <span class="text-[9px] font-black uppercase text-blue-500 tracking-wider">Storefront Meta SEO tags (Shopify standard)</span>
                    </div>
                    <div class="space-y-1">
                      <span class="block text-[9px] font-black text-zinc-400 uppercase">SEO Page Title</span>
                      <input type="text" [value]="admin.pSeoTitle()" (input)="admin.pSeoTitle.set($any($event.target).value)" placeholder="Leave blank to use title page name" class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white">
                    </div>
                    <div class="space-y-1">
                      <span class="block text-[9px] font-black text-zinc-400 uppercase">SEO Description keywords (Long description excerpt)</span>
                      <textarea rows="3" [value]="admin.pSeoDescription()" (input)="admin.pSeoDescription.set($any($event.target).value)" placeholder="Describe target search terms..." class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"></textarea>
                    </div>
                  </div>
                  <!-- Product Variants JSON (Can stay here or move) -->
                  <div class="space-y-1 pt-4">
                    <div class="flex justify-between items-center pr-1">
                      <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Product Variants (JSON array)</span>
                      <span class="text-[9px] text-zinc-500 font-mono">Form: [&#123;&quot;name&quot;: &quot;With AMS Combo&quot;, &quot;price&quot;: 48000&#125;]</span>
                    </div>
                    <textarea rows="4" [value]="admin.pVariants()" (input)="admin.pVariants.set($any($event.target).value)" placeholder='[{"name": "Standard Bundle", "price": 21499, "stock": 12}, {"name": "With AMS Combo", "price": 38499, "stock": 8}]' class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white"></textarea>
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
                              <img [src]="p.images && p.images[0]?.url || p.images && p.images[0] || 'https://picsum.photos/100/100'" alt="Product thumbnail" class="h-8 w-8 object-contain bg-zinc-50 dark:bg-zinc-950 rounded border dark:border-zinc-800" referrerpolicy="no-referrer">
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
                    <app-rich-text-editor label="Segment Description" placeholder="Short explanatory copy..." [value]="admin.newCatDesc()" (valueChange)="admin.newCatDesc.set($event)"></app-rich-text-editor>
                  </div>

                  <!-- Extra Shopify Layout details -->
                  <div class="grid grid-cols-2 gap-2 text-zinc-900">
                    <div class="space-y-1">
                      <app-image-picker label="Image Grid" [value]="admin.catImage()" (valueChange)="admin.catImage.set($event)"></app-image-picker>
                    </div>
                    <div class="space-y-1">
                      <app-image-picker label="Banner Overlay" [value]="admin.catBanner()" (valueChange)="admin.catBanner.set($event)"></app-image-picker>
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
                <div class="space-y-1 border-b dark:border-zinc-800 pb-2">
                  <app-image-picker label="Logo Branding" [value]="admin.brandLogo()" (valueChange)="admin.brandLogo.set($event)"></app-image-picker>
                </div>
                <div class="space-y-1">
                  <app-rich-text-editor label="Alliance Banner Description" placeholder="Exquisite summaries of machinery tools..." [value]="admin.brandDesc()" (valueChange)="admin.brandDesc.set($event)"></app-rich-text-editor>
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
      
      <!-- Variant Image Management Modal -->
      @if (activeVariantForImages() !== null) {
        <div class="fixed inset-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-4">
           <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div class="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                 <div>
                    <h3 class="text-lg font-black uppercase tracking-tight">Variant Images</h3>
                    <p class="text-xs text-zinc-500 font-mono mt-1">Editing images for {{ admin.pVariants()[activeVariantForImages()!]?.name }}</p>
                 </div>
                 <button (click)="activeVariantForImages.set(null)" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 bg-transparent border-none cursor-pointer"><mat-icon>close</mat-icon></button>
              </div>
              
              <div class="p-6 overflow-y-auto space-y-6">
                 <div>
                    <label class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Upload Image</label>
                    <div class="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center relative hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group">
                        <input type="file" multiple accept="image/jpeg, image/png, image/webp" class="absolute inset-0 opacity-0 cursor-pointer" (change)="handleVariantImageUpload($event)">
                        <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0 mb-3 group-hover:scale-110 transition-transform">
                          <mat-icon>cloud_upload</mat-icon>
                        </div>
                        <div class="text-xs font-bold text-zinc-900 dark:text-white uppercase">Drop photos here or click to browse</div>
                        <div class="text-[10px] text-zinc-500 mt-1">JPEG, PNG, WebP up to 2MB</div>
                        @if (uploadProgress > 0) {
                          <div class="absolute inset-x-4 bottom-4 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                             <div class="h-full bg-blue-500 transition-all duration-300" [style.width.%]="uploadProgress"></div>
                          </div>
                        }
                    </div>
                 </div>

                 @if ((admin.pVariants()[activeVariantForImages()!]?.images || []).length > 0) {
                     <div class="space-y-2">
                        <label class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Current Images</label>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                           @for (img of admin.pVariants()[activeVariantForImages()!]?.images || []; track $index; let imgIdx = $index) {
                              <div class="relative group border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden aspect-square bg-zinc-50 dark:bg-zinc-900">
                                 <img [src]="img.url" class="absolute inset-0 w-full h-full object-cover">
                                 <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button (click)="removeVariantImage(imgIdx)" class="h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center border-none cursor-pointer"><mat-icon class="scale-75">delete</mat-icon></button>
                                 </div>
                                 @if (imgIdx === 0) {
                                     <div class="absolute top-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black uppercase rounded shadow-sm">Primary</div>
                                 }
                              </div>
                           }
                        </div>
                     </div>
                 } @else {
                     <div class="text-center p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 text-xs font-bold">No images uploaded for this variant yet.</div>
                 }
              </div>
              <div class="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end">
                 <button (click)="activeVariantForImages.set(null)" class="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest border-none cursor-pointer">Done</button>
              </div>
           </div>
        </div>
      }
    </div>
  `
})
export class AdminCatalogTab {
  toastService = inject(ToastService);
  http = inject(HttpClient);
  @Input({ required: true }) admin!: AdminPanel;

  uploadProgress = 0;
  
  activeVariantForImages = signal<number | null>(null);

  openVariantImageModal(variantIdx: number) {
      this.activeVariantForImages.set(variantIdx);
  }

  removeVariantImage(imgIdx: number) {
      const vIdx = this.activeVariantForImages();
      if (vIdx === null) return;
      const variants = [...this.admin.pVariants()];
      const variant = variants[vIdx];
      if (variant && variant.images) {
          variant.images.splice(imgIdx, 1);
          this.admin.pVariants.set(variants);
      }
  }

  async handleVariantImageUpload(event: Event) {
      const input = event.target as HTMLInputElement;
      if (!input.files || input.files.length === 0) return;

      const vIdx = this.activeVariantForImages();
      if (vIdx === null) return;
      
      this.uploadProgress = 10;
      
      const variants = [...this.admin.pVariants()];
      const variant = variants[vIdx];
      if (!variant.images) variant.images = [];
      
      for (let i = 0; i < input.files.length; i++) {
          const file = input.files[i];
          if (file.size > 10 * 1024 * 1024) {
               this.toastService.error(`File ${file.name} exceeds 10MB limit.`);
               continue;
          }
          
          try {
              const formData = new FormData();
              formData.append('image', file);
              const res = await firstValueFrom(this.http.post<any>('/api/admin/upload-image', formData));
              if (res && res.success && res.url) {
                  variant.images.push({ 
                      url: res.url, 
                      isPrimary: variant.images.length === 0
                  });
                  this.toastService.success('Variant Image Uploaded Successfully');
              } else {
                  this.toastService.error('Upload Failed');
              }
          } catch (e) {
              console.error('Failed to upload file:', e);
              this.toastService.error('Upload Failed');
          }
          
          this.uploadProgress = Math.floor(10 + ((i + 1) / input.files.length) * 90);
      }
      
      this.admin.pVariants.set(variants);
      this.uploadProgress = 100;
      setTimeout(() => this.uploadProgress = 0, 1000);
      input.value = ''; // Reset input
  }

  activeEditTab = signal('general');

  editTabs = [
    { id: 'general', label: 'General' },
    { id: 'variants', label: 'Variants' },
    { id: 'images', label: 'Images' },
    { id: 'specifications', label: 'Specifications' },
    { id: 'downloads', label: 'Downloads' },
    { id: 'features', label: 'Features' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'related_products', label: 'Related Products' },
    { id: 'seo', label: 'SEO' },
  ];

  startEditNew() {
    this.activeEditTab.set('general');
    this.admin.startProductEdit({ id: 'new', name: '', slug: '', barcode: '', sku: '', brand: '3D Galaxy', category_id: '', mrp: 1499, sale_price: 1199, dealer_price: 999, stock: 50, reserved: 0, description: '', images: [], specs: [], reviews: [], qnas: [], featured: false, is360Supported: false, tags: [], downloads: [], features: [], faqs: [], relatedProducts: [] });
  }

  cancelEdit() {
    this.admin.cancelProductEdit();
    this.activeEditTab.set('general');
  }

  getJsonValue(key: 'specs' | 'features' | 'faqs' | 'downloads' | 'relatedProducts'): string {
    const val = this.admin.editingProduct()?.[key];
    if (!val) return '';
    if (typeof val === 'string') return val;
    return JSON.stringify(val, null, 2);
  }

  setJsonValue(key: 'specs' | 'features' | 'faqs' | 'downloads' | 'relatedProducts', valStr: string) {
    if (!this.admin.editingProduct()) return;
    try {
      if (valStr.trim() === '') {
        (this.admin.editingProduct() as any)[key] = [];
      } else {
        const parsed = JSON.parse(valStr);
        (this.admin.editingProduct() as any)[key] = parsed;
      }
    } catch(e) {
      // Just store string if invalid JSON during typing
      (this.admin.editingProduct() as any)[key] = valStr;
    }
  }

  async handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.uploadProgress = 10;
    
    let images = [...this.admin.pImages()];
    
    for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.size > 10 * 1024 * 1024) {
             this.toastService.error(`File ${file.name} exceeds 10MB limit.`);
             continue;
        }
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await firstValueFrom(this.http.post<any>('/api/admin/upload-image', formData));
            if (res && res.success && res.url) {
                images.push({ 
                    url: res.url, 
                    isPrimary: images.length === 0
                });
                this.toastService.success('Image Uploaded Successfully');
            } else {
                this.toastService.error('Upload Failed');
            }
        } catch (e) {
            console.error('Failed to upload file:', e);
            this.toastService.error('Upload Failed');
        }
        
        this.uploadProgress = Math.floor(10 + ((i + 1) / input.files.length) * 90);
    }
    
    this.admin.pImages.set(images);
    this.uploadProgress = 100;
    setTimeout(() => this.uploadProgress = 0, 1000);
    input.value = ''; // Reset input
  }

  private readAsBase64(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
  }
}
