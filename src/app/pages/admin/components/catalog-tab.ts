import {
  Component,
  Input,
  ChangeDetectionStrategy,
  signal,
  inject,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { AdminPanel } from "../admin";
import { ToastService } from "../../../shared/components/toast/toast.service";
import { RichTextEditorComponent } from "../../../shared/components/rich-text-editor/rich-text-editor.component";
import { ProductImportComponent } from "../../../admin/products/product-import/product-import.component";

import { ImagePickerComponent } from "../../../shared/components/image-picker/image-picker.component";
import { AppButton } from "../../../shared/components/app-button/app-button";

@Component({
  selector: "app-admin-catalog-tab",
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    RichTextEditorComponent,
    ImagePickerComponent,
    AppButton,
    ProductImportComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300">
      <!-- ========================= TAB: PRODUCTS CATALOG ========================= -->
      @if (admin.activeTab() === "bulk-import") {
        <app-admin-product-import></app-admin-product-import>
      } @else if (admin.activeTab() === "products") {
        <div class="space-y-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-xl font-black tracking-tight uppercase">
                Catalog Registry
              </h1>
              <p class="text-xs text-zinc-500">
                Program and configure inventory assets, dealer overrides, and
                specifications.
              </p>
            </div>
            @if (!admin.editingProduct()) {
              <button
                (click)="startEditNew()"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-xl transition-colors cursor-pointer"
              >
                Register SKU
              </button>
            } @else {
              <button
                (click)="cancelEdit()"
                class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-xs font-black uppercase rounded-xl transition-colors cursor-pointer"
              >
                Back to Hub
              </button>
            }
          </div>

          @if (admin.editingProduct()) {
            <!-- PRODUCT CREATION/EDITING TABS VIEW -->
            <div
              class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-hidden shadow-xs"
            >
              <div
                class="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center"
              >
                <h3
                  class="text-sm font-black uppercase text-zinc-950 dark:text-white"
                >
                  {{
                    admin.editingProduct()?.id === "new"
                      ? "Publish New Catalog Asset"
                      : "Edit Catalog SKU: " + admin.editingProduct()?.name
                  }}
                </h3>
                <div class="flex gap-2">
                  <button
                    (click)="cancelEdit()"
                    class="px-3 py-1.5 text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-600 cursor-pointer font-bold"
                  >
                    Cancel
                  </button>
                  <app-button
                    text="Save Asset"
                    loadingText="Saving..."
                    [loading]="admin.isSavingProduct()"
                    variant="primary"
                    (btnClick)="admin.saveProduct()"
                  ></app-button>
                </div>
              </div>

              <!-- Editor Tabs Navigation -->
              <div
                class="flex items-center gap-6 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 overflow-x-auto hide-scroll pt-4"
              >
                @for (t of editTabs; track t.id) {
                  <button
                    (click)="activeEditTab.set(t.id)"
                    class="shrink-0 pb-3 transition-colors text-[10px] font-black uppercase tracking-widest relative"
                    [class]="
                      activeEditTab() === t.id
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                    "
                  >
                    {{ t.label }}
                    @if (activeEditTab() === t.id) {
                      <div
                        class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400 animate-fadeIn"
                      ></div>
                    }
                  </button>
                }
              </div>

              <!-- Tab Contents -->
              <div class="p-6">
                <!-- General Tab -->
                <div
                  [class.hidden]="activeEditTab() !== 'general'"
                  class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn"
                >
                  <!-- Basic Group -->
                  <div class="space-y-1">
                    <span
                      class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                      >Product Title *</span
                    >
                    <input
                      type="text"
                      [value]="admin.pName()"
                      (input)="
                        admin.updateProductName($any($event.target).value)
                      "
                      placeholder="e.g. Bambu Lab P1S"
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                      >URL Slug Customization</span
                    >
                    <input
                      type="text"
                      [value]="admin.pSlug()"
                      (input)="admin.pSlug.set($any($event.target).value)"
                      placeholder="bambu-lab-p1s"
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono font-bold outline-none text-blue-500 dark:text-blue-400"
                    />
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                      >SKU Barcode / Part Number</span
                    >
                    <input
                      type="text"
                      [value]="admin.pSku()"
                      (input)="admin.pSku.set($any($event.target).value)"
                      placeholder="e.g. GLX-PLA-BLU"
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono uppercase font-black outline-none text-zinc-900 dark:text-white"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                    <div class="space-y-1 relative">
                      <span
                        class="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1"
                        >Linked Category *</span
                      >
                      <button
                        type="button"
                        (click)="pCatDropdownOpen.set(!pCatDropdownOpen())"
                        class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold text-left text-zinc-900 dark:text-white flex justify-between items-center cursor-pointer"
                      >
                        <span>{{
                          getCategoryPath(admin.pCatId()) ||
                            "Select category segment..."
                        }}</span>
                        <mat-icon class="text-zinc-400 text-sm"
                          >keyboard_arrow_down</mat-icon
                        >
                      </button>

                      @if (pCatDropdownOpen()) {
                        <div
                          class="absolute z-50 w-full mt-1.5 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl space-y-2 animate-fadeIn max-h-[300px] overflow-hidden flex flex-col"
                        >
                          <div
                            class="relative flex items-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg px-2.5 py-1"
                          >
                            <mat-icon
                              class="text-zinc-400 text-sm shrink-0 mr-1.5"
                              >search</mat-icon
                            >
                            <input
                              type="text"
                              [value]="pCatSearchQuery()"
                              (input)="
                                pCatSearchQuery.set($any($event.target).value)
                              "
                              placeholder="Search categories by name..."
                              class="w-full bg-transparent border-none outline-none text-xs font-bold text-zinc-900 dark:text-white py-1"
                            />
                          </div>

                          <div
                            class="flex-1 overflow-y-auto max-h-[200px] space-y-1 no-scrollbar"
                          >
                            <button
                              type="button"
                              (click)="
                                admin.pCatId.set('');
                                pCatDropdownOpen.set(false);
                                pCatSearchQuery.set('')
                              "
                              class="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-zinc-550 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-none bg-transparent"
                            >
                              None (Clear selection)
                            </button>
                            @for (c of admin.ds.categories(); track c.id) {
                              @if (
                                !pCatSearchQuery() ||
                                getCategoryPath(c.id)
                                  .toLowerCase()
                                  .includes(pCatSearchQuery().toLowerCase())
                              ) {
                                <button
                                  type="button"
                                  (click)="
                                    admin.pCatId.set(c.id);
                                    pCatDropdownOpen.set(false);
                                    pCatSearchQuery.set('')
                                  "
                                  [class.bg-blue-50]="admin.pCatId() === c.id"
                                  [class.text-blue-500]="
                                    admin.pCatId() === c.id
                                  "
                                  class="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex flex-col border-none bg-transparent"
                                >
                                  <span
                                    class="font-black text-zinc-900 dark:text-white"
                                    >{{ c.name }}</span
                                  >
                                  <span
                                    class="text-[9px] text-zinc-450 mt-0.5"
                                    >{{ getCategoryPath(c.id) }}</span
                                  >
                                </button>
                              }
                            }
                          </div>
                        </div>
                      }
                    </div>

                    <div class="space-y-1">
                      <span
                        class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                        >Brand Manufacturer alliance</span
                      >
                      <select
                        [value]="admin.pBrand()"
                        (change)="admin.pBrand.set($any($event.target).value)"
                        class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none font-bold text-zinc-900 dark:text-white"
                      >
                        <option value="3D Galaxy">3D Galaxy (Default)</option>
                        @for (br of admin.ds.brands(); track br.id) {
                          <option [value]="br.name">{{ br.name }}</option>
                        }
                      </select>
                    </div>
                  </div>

                  <!-- Prices -->
                  <div
                    class="grid grid-cols-3 gap-3 col-span-1 md:col-span-2 text-zinc-900 dark:text-white"
                  >
                    <div class="space-y-1">
                      <span
                        class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                        >MRP Price (INR)</span
                      >
                      <input
                        type="number"
                        [value]="admin.pMrp()"
                        (input)="admin.pMrp.set(+$any($event.target).value)"
                        class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                        >Retail Sale (INR)</span
                      >
                      <input
                        type="number"
                        [value]="admin.pSale()"
                        (input)="admin.pSale.set(+$any($event.target).value)"
                        class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono text-blue-500 font-bold outline-none"
                      />
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                        >Authorized Dealer (INR)</span
                      >
                      <input
                        type="number"
                        [value]="admin.pDealer()"
                        (input)="admin.pDealer.set(+$any($event.target).value)"
                        class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono text-emerald-500 font-bold outline-none"
                      />
                    </div>
                  </div>

                  <!-- Stock, Status -->
                  <div
                    class="grid grid-cols-2 gap-4 col-span-1 md:col-span-2 text-zinc-900 dark:text-white"
                  >
                    <div class="space-y-1">
                      <span
                        class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                        >Physical Stock Inventory</span
                      >
                      <input
                        type="number"
                        [value]="admin.pStock()"
                        (input)="admin.pStock.set(+$any($event.target).value)"
                        class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono font-black outline-none text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                        >Status Policy</span
                      >
                      <select
                        [value]="admin.pStatus()"
                        (change)="admin.pStatus.set($any($event.target).value)"
                        class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white font-bold"
                      >
                        <option value="active">Active Storefront</option>
                        <option value="draft">Draft (Admin Only)</option>
                        <option value="out_of_stock">Out of Stock</option>
                      </select>
                    </div>
                  </div>

                  <div class="space-y-1 col-span-1 md:col-span-2">
                    <app-rich-text-editor
                      label="Quick Bullet Highlight Specs"
                      placeholder="Enter technical bullet highlights..."
                      [value]="admin.pDesc()"
                      (valueChange)="admin.pDesc.set($event)"
                    ></app-rich-text-editor>
                  </div>
                  <div class="space-y-1 col-span-1 md:col-span-2">
                    <app-rich-text-editor
                      label="Long description / Overview page"
                      placeholder="Enter detailed comprehensive description paragraph..."
                      [value]="admin.pLongDesc()"
                      (valueChange)="admin.pLongDesc.set($event)"
                    ></app-rich-text-editor>
                  </div>

                  <!-- Featured & Bundles Config -->
                  <div
                    class="col-span-1 md:col-span-2 p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-6"
                  >
                    <div class="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isFeatured"
                        [checked]="admin.pFeatured()"
                        (change)="
                          admin.pFeatured.set($any($event.target).checked)
                        "
                        class="w-4 h-4 text-blue-500 rounded border-zinc-300 dark:border-zinc-800"
                      />
                      <label
                        for="isFeatured"
                        class="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-widest cursor-pointer select-none"
                        >Mark as Featured Product</label
                      >
                    </div>

                    <!-- Bundle Products Selector -->
                    <div class="space-y-2">
                      <span
                        class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                        >Included Bundle Products (Complimentary / FREE
                        Included)</span
                      >
                      <div class="flex gap-2">
                        <select
                          #bundleSelect
                          class="flex-1 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"
                        >
                          <option value="">
                            Select a complimentary product to include for
                            FREE...
                          </option>
                          @for (p of admin.ds.products(); track p.id) {
                            @if (
                              p.id !== admin.editingProduct()?.id &&
                              !isProductInBundle(p.id)
                            ) {
                              <option [value]="p.id">
                                {{ p.name }} ({{ p.sku }})
                              </option>
                            }
                          }
                        </select>
                        <button
                          type="button"
                          (click)="
                            addBundleProduct(bundleSelect.value);
                            bundleSelect.value = ''
                          "
                          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold uppercase rounded-xl border-none cursor-pointer"
                        >
                          Add to Bundle
                        </button>
                      </div>

                      @if (admin.pBundleProducts().length > 0) {
                        <div class="flex flex-wrap gap-2 mt-2">
                          @for (
                            bItem of admin.pBundleProducts();
                            track bItem.id || bItem
                          ) {
                            <span
                              class="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-55/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-150 dark:border-blue-900/40"
                            >
                              {{ getBundleItemName(bItem) }}
                              <button
                                type="button"
                                (click)="removeBundleProduct(bItem.id || bItem)"
                                class="text-red-400 hover:text-red-650 bg-transparent border-none p-0 cursor-pointer flex items-center justify-center"
                              >
                                <mat-icon
                                  class="scale-75 text-xs w-4 h-4 flex items-center justify-center"
                                  >close</mat-icon
                                >
                              </button>
                            </span>
                          }
                        </div>
                      }
                    </div>

                    <!-- Recommended Filaments Selector -->
                    <div class="space-y-2">
                      <span
                        class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                        >Recommended Filaments catalog items</span
                      >
                      <div class="flex gap-2">
                        <select
                          #filamentSelect
                          class="flex-1 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"
                        >
                          <option value="">
                            Select suggested filament for compatible printer...
                          </option>
                          @for (p of admin.ds.products(); track p.id) {
                            @if (
                              p.id !== admin.editingProduct()?.id &&
                              !admin.pRecommendedFilaments().includes(p.id)
                            ) {
                              <option [value]="p.id">
                                {{ p.name }} ({{ p.sku }})
                              </option>
                            }
                          }
                        </select>
                        <button
                          type="button"
                          (click)="
                            addRecommendedFilament(filamentSelect.value);
                            filamentSelect.value = ''
                          "
                          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold uppercase rounded-xl border-none cursor-pointer"
                        >
                          Add Filament
                        </button>
                      </div>

                      @if (admin.pRecommendedFilaments().length > 0) {
                        <div class="flex flex-wrap gap-2 mt-2">
                          @for (
                            fId of admin.pRecommendedFilaments();
                            track fId
                          ) {
                            <span
                              class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-55/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-150 dark:border-emerald-900/40"
                            >
                              {{ getBundleItemName(fId) }}
                              <button
                                type="button"
                                (click)="removeRecommendedFilament(fId)"
                                class="text-red-400 hover:text-red-650 bg-transparent border-none p-0 cursor-pointer flex items-center justify-center"
                              >
                                <mat-icon
                                  class="scale-75 text-xs w-4 h-4 flex items-center justify-center"
                                  >close</mat-icon
                                >
                              </button>
                            </span>
                          }
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <!-- Images Tab -->
                <div
                  [class.hidden]="activeEditTab() !== 'images'"
                  class="space-y-4 animate-fadeIn"
                >
                  <!-- Image List Block -->
                  <div
                    class="space-y-3 bg-zinc-50 dark:bg-zinc-950 p-6 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-blue-500 scale-90"
                          >collections</mat-icon
                        >
                        <h4
                          class="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white"
                        >
                          Product Gallery
                        </h4>
                      </div>
                      <span class="text-[10px] font-bold text-zinc-500"
                        >Supports JPG, PNG, WEBP. Max 2MB per file.</span
                      >
                    </div>

                    <div
                      class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                    >
                      <!-- Images Loop -->
                      @for (
                        img of admin.pImages();
                        track img.url;
                        let i = $index
                      ) {
                        <div
                          class="relative group aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        >
                          <img
                            [src]="img.url"
                            class="w-full h-full object-contain"
                          />

                          <!-- Hover Actions -->
                          <div
                            class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2"
                          >
                            <div
                              class="flex items-center justify-between w-full"
                            >
                              <button
                                (click)="admin.setPrimaryImage(i)"
                                title="Make Primary"
                                [class]="
                                  img.isPrimary
                                    ? 'text-amber-400'
                                    : 'text-white hover:text-amber-400'
                                "
                              >
                                <mat-icon class="scale-75">star</mat-icon>
                              </button>
                              <button
                                (click)="admin.removeImage(i)"
                                title="Remove"
                                class="text-white hover:text-red-500"
                              >
                                <mat-icon class="scale-75">delete</mat-icon>
                              </button>
                            </div>
                            <div class="flex items-center justify-center gap-2">
                              <button
                                *ngIf="i > 0"
                                (click)="admin.moveImage(i, -1)"
                                class="w-6 h-6 rounded bg-white/20 text-white flex items-center justify-center hover:bg-white/40"
                              >
                                <mat-icon class="scale-75 -ml-[3px] -mt-[3px]"
                                  >chevron_left</mat-icon
                                >
                              </button>
                              <button
                                *ngIf="i < admin.pImages().length - 1"
                                (click)="admin.moveImage(i, 1)"
                                class="w-6 h-6 rounded bg-white/20 text-white flex items-center justify-center hover:bg-white/40"
                              >
                                <mat-icon class="scale-75 -ml-[3px] -mt-[3px]"
                                  >chevron_right</mat-icon
                                >
                              </button>
                            </div>
                          </div>

                          <!-- Primary Badge -->
                          @if (img.isPrimary) {
                            <div
                              class="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-bl-lg shadow-sm"
                            >
                              Primary
                            </div>
                          }
                        </div>
                      }

                      <!-- Drag & Drop / File Input Box -->
                      <label
                        class="aspect-square rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors group"
                      >
                        <mat-icon
                          class="text-zinc-400 group-hover:text-blue-500 mb-2"
                          >add_photo_alternate</mat-icon
                        >
                        <span
                          class="text-[10px] font-bold text-zinc-500 text-center px-2 leading-tight"
                          >Drag &amp; Drop<br />or Click</span
                        >
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg, image/png, image/webp"
                          class="hidden"
                          (change)="handleImageUpload($event)"
                        />
                      </label>
                    </div>
                    @if (uploadProgress > 0 && uploadProgress < 100) {
                      <div
                        class="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1 mt-4 overflow-hidden"
                      >
                        <div
                          class="bg-blue-500 h-full rounded-full transition-all duration-300"
                          [style.width]="uploadProgress + '%'"
                        ></div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Variants Tab -->
                <div
                  [class.hidden]="activeEditTab() !== 'variants'"
                  class="space-y-6 animate-fadeIn"
                >
                  <!-- Options Management -->
                  <div class="space-y-4">
                    <div
                      class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2"
                    >
                      <h4
                        class="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider"
                      >
                        Product Options
                      </h4>
                      <button
                        (click)="admin.addOption()"
                        class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] uppercase font-black tracking-wider rounded border-none cursor-pointer flex items-center gap-1"
                      >
                        <mat-icon class="scale-75 text-sm">add</mat-icon> Add
                        Option
                      </button>
                    </div>

                    @if (admin.pOptions().length === 0) {
                      <div
                        class="p-8 text-center text-zinc-400 font-bold text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl"
                      >
                        No options configured. Add options like Size, Color, or
                        Material to generate variants.
                      </div>
                    } @else {
                      <div class="space-y-4">
                        @for (
                          opt of admin.pOptions();
                          track opt.id;
                          let i = $index
                        ) {
                          <div
                            class="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3 relative"
                          >
                            <button
                              (click)="admin.removeOption(i)"
                              class="absolute top-3 right-3 text-red-500 hover:text-red-600 bg-none border-none cursor-pointer"
                            >
                              <mat-icon class="scale-75">close</mat-icon>
                            </button>
                            <div class="w-1/2">
                              <label
                                class="text-[9px] font-black tracking-widest uppercase text-zinc-400"
                                >Option Name</label
                              >
                              <input
                                type="text"
                                [(ngModel)]="opt.name"
                                (ngModelChange)="admin.updateOption()"
                                placeholder="e.g. Color, Size"
                                class="w-full px-3 py-2 text-xs font-bold font-mono bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded outline-none"
                              />
                            </div>
                            <div>
                              <label
                                class="text-[9px] font-black tracking-widest uppercase text-zinc-400"
                                >Values (Comma-separated)</label
                              >
                              <input
                                type="text"
                                [value]="admin.getOptionValuesString(opt)"
                                (blur)="
                                  admin.setOptionValuesString(
                                    opt,
                                    $any($event.target).value
                                  )
                                "
                                placeholder="e.g. Red, Blue, Green / 1kg, 3kg"
                                class="w-full px-3 py-2 text-xs font-bold font-mono bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded outline-none"
                              />
                            </div>
                          </div>
                        }
                        <div class="pt-4 flex justify-end gap-3">
                          <button
                            (click)="admin.generateVariants()"
                            class="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-black uppercase text-xs tracking-wider rounded-lg border-none cursor-pointer"
                          >
                            Generate Variant Combinations
                          </button>
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Variants Grid -->
                  <div
                    class="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <div class="flex items-center justify-between">
                      <h4
                        class="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider"
                      >
                        Combinations ({{ admin.pVariants().length }})
                      </h4>
                    </div>

                    @if (admin.pVariants().length === 0) {
                      <div
                        class="p-8 text-center text-zinc-400 font-bold text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl"
                      >
                        No variants generated yet.
                      </div>
                    } @else {
                      <div class="overflow-x-auto max-h-[500px]">
                        <table
                          class="w-full text-left border-collapse text-xs whitespace-nowrap"
                        >
                          <thead
                            class="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-black tracking-widest uppercase sticky top-0 z-10"
                          >
                            <tr>
                              <th class="p-3">Variant</th>
                              <th class="p-3 w-32">SKU</th>
                              <th class="p-3 w-24">Price</th>
                              <th class="p-3 w-24">Stock</th>
                              <th class="p-3 w-24">Weight</th>
                              <th class="p-3 w-16">Action</th>
                            </tr>
                          </thead>
                          <tbody
                            class="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900"
                          >
                            @for (
                              variant of admin.pVariants();
                              track variant.id || $index;
                              let vIdx = $index
                            ) {
                              <tr>
                                <td
                                  class="p-3 font-bold text-zinc-900 dark:text-white"
                                >
                                  {{ variant.name }}
                                </td>
                                <td class="p-2">
                                  <input
                                    type="text"
                                    [(ngModel)]="variant.sku"
                                    class="w-full px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-800 bg-transparent rounded outline-none focus:ring-1 ring-blue-500"
                                  />
                                </td>
                                <td class="p-2">
                                  <input
                                    type="number"
                                    [(ngModel)]="variant.price"
                                    class="w-full px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-800 bg-transparent rounded outline-none focus:ring-1 ring-blue-500"
                                  />
                                </td>
                                <td class="p-2">
                                  <input
                                    type="number"
                                    [(ngModel)]="variant.stock"
                                    class="w-full px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-800 bg-transparent rounded outline-none focus:ring-1 ring-blue-500"
                                  />
                                </td>
                                <td class="p-2">
                                  <input
                                    type="number"
                                    [(ngModel)]="variant.weight"
                                    class="w-full px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-800 bg-transparent rounded outline-none focus:ring-1 ring-blue-500"
                                  />
                                </td>
                                <td class="p-2 text-center">
                                  <div
                                    class="flex items-center justify-center gap-2"
                                  >
                                    <button
                                      (click)="openVariantImageModal(vIdx)"
                                      class="flex items-center text-[10px] font-bold text-blue-500 hover:text-blue-600 bg-transparent border-none cursor-pointer"
                                    >
                                      <mat-icon class="scale-75 mr-1"
                                        >image</mat-icon
                                      >
                                      Manage
                                    </button>
                                    <button
                                      (click)="admin.removeVariant(vIdx)"
                                      class="text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer"
                                    >
                                      <mat-icon class="scale-75"
                                        >delete</mat-icon
                                      >
                                    </button>
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

                <!-- Specifications Tab -->
                <div
                  [class.hidden]="activeEditTab() !== 'specifications'"
                  class="space-y-4 animate-fadeIn"
                >
                  <div
                    class="flex justify-between items-center pr-1 border-b pb-2 dark:border-zinc-800"
                  >
                    <span
                      class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest"
                      >Specifications</span
                    >
                    <button
                      (click)="admin.addSpec()"
                      class="text-[10px] bg-blue-500 hover:bg-blue-600 text-white font-bold uppercase px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <mat-icon class="scale-75">add</mat-icon> Add Row
                    </button>
                  </div>
                  @if (admin.pSpecs().length === 0) {
                    <div
                      class="p-8 text-center text-zinc-400 font-bold text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl"
                    >
                      No specifications added.
                    </div>
                  } @else {
                    <div class="space-y-2">
                      @for (
                        spec of admin.pSpecs();
                        track $index;
                        let i = $index
                      ) {
                        <div class="flex items-center gap-2">
                          <input
                            type="text"
                            [value]="spec.name"
                            (input)="
                              admin.updateSpec(
                                i,
                                'name',
                                $any($event.target).value
                              )
                            "
                            placeholder="Specification Name (e.g., Build Volume)"
                            class="w-1/3 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"
                          />
                          <input
                            type="text"
                            [value]="spec.value"
                            (input)="
                              admin.updateSpec(
                                i,
                                'value',
                                $any($event.target).value
                              )
                            "
                            placeholder="Value (e.g., 256 x 256)"
                            class="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"
                          />
                          <button
                            (click)="admin.removeSpec(i)"
                            class="text-red-400 hover:text-red-500 p-2 cursor-pointer bg-red-50 dark:bg-red-950 rounded-lg"
                          >
                            <mat-icon class="scale-75">delete</mat-icon>
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- Features Tab -->
                <div
                  [class.hidden]="activeEditTab() !== 'features'"
                  class="space-y-4 animate-fadeIn"
                >
                  <div
                    class="flex justify-between items-center pr-1 border-b pb-2 dark:border-zinc-800"
                  >
                    <span
                      class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest"
                      >Features List</span
                    >
                    <button
                      (click)="admin.addFeature()"
                      class="text-[10px] bg-blue-500 hover:bg-blue-600 text-white font-bold uppercase px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <mat-icon class="scale-75">add</mat-icon> Add Row
                    </button>
                  </div>
                  @if (admin.pFeatures().length === 0) {
                    <div
                      class="p-8 text-center text-zinc-400 font-bold text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl"
                    >
                      No features added.
                    </div>
                  } @else {
                    <div class="space-y-2">
                      @for (
                        feat of admin.pFeatures();
                        track $index;
                        let i = $index
                      ) {
                        <div
                          class="flex items-start gap-2 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800"
                        >
                          <div class="flex-1 space-y-2">
                            <input
                              type="text"
                              [value]="feat.title"
                              (input)="
                                admin.updateFeature(
                                  i,
                                  'title',
                                  $any($event.target).value
                                )
                              "
                              placeholder="Feature Title"
                              class="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold outline-none text-zinc-900 dark:text-white"
                            />
                            <textarea
                              rows="2"
                              [value]="feat.description"
                              (input)="
                                admin.updateFeature(
                                  i,
                                  'description',
                                  $any($event.target).value
                                )
                              "
                              placeholder="Description..."
                              class="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                            ></textarea>
                          </div>
                          <button
                            (click)="admin.removeFeature(i)"
                            class="text-red-400 hover:text-red-500 mt-1 p-2 cursor-pointer bg-red-50 dark:bg-red-950 rounded-lg"
                          >
                            <mat-icon class="scale-75">delete</mat-icon>
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- FAQs Tab -->
                <div
                  [class.hidden]="activeEditTab() !== 'faqs'"
                  class="space-y-4 animate-fadeIn"
                >
                  <div
                    class="flex justify-between items-center pr-1 border-b pb-2 dark:border-zinc-800"
                  >
                    <span
                      class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest"
                      >FAQs</span
                    >
                    <button
                      (click)="admin.addFaq()"
                      class="text-[10px] bg-blue-500 hover:bg-blue-600 text-white font-bold uppercase px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <mat-icon class="scale-75">add</mat-icon> Add Row
                    </button>
                  </div>
                  @if (admin.pFaqs().length === 0) {
                    <div
                      class="p-8 text-center text-zinc-400 font-bold text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl"
                    >
                      No FAQs added.
                    </div>
                  } @else {
                    <div class="space-y-2">
                      @for (
                        faq of admin.pFaqs();
                        track $index;
                        let i = $index
                      ) {
                        <div
                          class="flex items-start gap-2 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800"
                        >
                          <div class="flex-1 space-y-2">
                            <input
                              type="text"
                              [value]="faq.question"
                              (input)="
                                admin.updateFaq(
                                  i,
                                  'question',
                                  $any($event.target).value
                                )
                              "
                              placeholder="Question?"
                              class="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold outline-none text-zinc-900 dark:text-white"
                            />
                            <textarea
                              rows="2"
                              [value]="faq.answer"
                              (input)="
                                admin.updateFaq(
                                  i,
                                  'answer',
                                  $any($event.target).value
                                )
                              "
                              placeholder="Answer..."
                              class="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                            ></textarea>
                          </div>
                          <button
                            (click)="admin.removeFaq(i)"
                            class="text-red-400 hover:text-red-500 mt-1 p-2 cursor-pointer bg-red-50 dark:bg-red-950 rounded-lg"
                          >
                            <mat-icon class="scale-75">delete</mat-icon>
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- Downloads Tab -->
                <div
                  [class.hidden]="activeEditTab() !== 'downloads'"
                  class="space-y-4 animate-fadeIn"
                >
                  <div
                    class="flex justify-between items-center pr-1 border-b pb-2 dark:border-zinc-800"
                  >
                    <span
                      class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest"
                      >Downloads & Manuals</span
                    >
                    <button
                      (click)="admin.addDownload()"
                      class="text-[10px] bg-blue-500 hover:bg-blue-600 text-white font-bold uppercase px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <mat-icon class="scale-75">add</mat-icon> Add Row
                    </button>
                  </div>
                  @if (admin.pDownloads().length === 0) {
                    <div
                      class="p-8 text-center text-zinc-400 font-bold text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl"
                    >
                      No downloads added.
                    </div>
                  } @else {
                    <div class="space-y-2">
                      @for (
                        dl of admin.pDownloads();
                        track $index;
                        let i = $index
                      ) {
                        <div class="flex items-center gap-2">
                          <input
                            type="text"
                            [value]="dl.title"
                            (input)="
                              admin.updateDownload(
                                i,
                                'title',
                                $any($event.target).value
                              )
                            "
                            placeholder="Document Title (e.g. User Manual)"
                            class="w-1/3 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"
                          />
                          <input
                            type="text"
                            [value]="dl.fileUrl"
                            (input)="
                              admin.updateDownload(
                                i,
                                'fileUrl',
                                $any($event.target).value
                              )
                            "
                            placeholder="File URL (https://...)"
                            class="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"
                          />
                          <button
                            (click)="admin.removeDownload(i)"
                            class="text-red-400 hover:text-red-500 p-2 cursor-pointer bg-red-50 dark:bg-red-950 rounded-lg"
                          >
                            <mat-icon class="scale-75">delete</mat-icon>
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- Warranty Tab -->
                <div
                  [class.hidden]="activeEditTab() !== 'warranty'"
                  class="space-y-4 animate-fadeIn"
                >
                  <div
                    class="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-900 grid grid-cols-1 gap-4"
                  >
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Warranty Period</span
                      >
                      <input
                        type="text"
                        [value]="admin.pWarranty().warrantyPeriod"
                        (input)="
                          admin.updateWarrantyPeriod($any($event.target).value)
                        "
                        placeholder="e.g. 1 Year Parts & Service"
                        class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Warranty Description & Terms</span
                      >
                      <textarea
                        rows="4"
                        [value]="admin.pWarranty().warrantyDescription"
                        (input)="
                          admin.updateWarrantyDesc($any($event.target).value)
                        "
                        placeholder="Covers mechanical faults under regular operating conditions..."
                        class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                      ></textarea>
                    </div>
                  </div>
                </div>

                <!-- Shipping Tab -->
                <div
                  [class.hidden]="activeEditTab() !== 'shipping'"
                  class="space-y-4 animate-fadeIn"
                >
                  <div
                    class="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-900 grid grid-cols-1 gap-4"
                  >
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Delivery Time Estimation</span
                      >
                      <input
                        type="text"
                        [value]="admin.pShipping().deliveryTime"
                        (input)="
                          admin.updateShippingTime($any($event.target).value)
                        "
                        placeholder="e.g. Dispatch in 24 hrs, 3-5 transit days"
                        class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-1">
                        <span
                          class="block text-[9px] font-black text-zinc-400 uppercase"
                          >Shipping Charges (₹)</span
                        >
                        <input
                          type="number"
                          [value]="admin.pShipping().shippingCharges"
                          (input)="
                            admin.updateShippingCharges(
                              $any($event.target).value
                            )
                          "
                          placeholder="e.g. 499"
                          class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                        />
                      </div>
                      <div class="space-y-1">
                        <span
                          class="block text-[9px] font-black text-zinc-400 uppercase"
                          >Shipping Regions</span
                        >
                        <input
                          type="text"
                          [value]="admin.pShipping().shippingRegions"
                          (input)="
                            admin.updateShippingRegions(
                              $any($event.target).value
                            )
                          "
                          placeholder="e.g. Pan India / Selected Zones"
                          class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <!-- New Product-Level Shipping Configuration -->
                    <div
                      class="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn"
                    >
                      <div class="space-y-1 flex items-center gap-3 pt-4">
                        <input
                          type="checkbox"
                          id="codAvailable"
                          [checked]="admin.pCodAvailable()"
                          (change)="
                            admin.pCodAvailable.set($any($event.target).checked)
                          "
                          class="w-4 h-4 text-blue-500 rounded border-zinc-300 dark:border-zinc-800"
                        />
                        <label
                          for="codAvailable"
                          class="text-[10px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer select-none"
                          >COD Available</label
                        >
                      </div>

                      <div class="space-y-1 flex items-center gap-3 pt-4">
                        <input
                          type="checkbox"
                          id="freeShippingEligible"
                          [checked]="admin.pFreeShippingEligible()"
                          (change)="
                            admin.pFreeShippingEligible.set(
                              $any($event.target).checked
                            )
                          "
                          class="w-4 h-4 text-blue-500 rounded border-zinc-300 dark:border-zinc-800"
                        />
                        <label
                          for="freeShippingEligible"
                          class="text-[10px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer select-none"
                          >Free Shipping Eligible</label
                        >
                      </div>

                      <div class="space-y-1">
                        <span
                          class="block text-[9px] font-black text-zinc-400 uppercase"
                          >Base Shipping Charge (₹)</span
                        >
                        <input
                          type="number"
                          [value]="admin.pBaseShippingCharge()"
                          (input)="
                            admin.pBaseShippingCharge.set(
                              +$any($event.target).value
                            )
                          "
                          placeholder="Default: 0"
                          class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                        />
                      </div>

                      <div class="space-y-1">
                        <span
                          class="block text-[9px] font-black text-zinc-400 uppercase"
                          >Estimated Delivery Days</span
                        >
                        <input
                          type="number"
                          [value]="admin.pEstimatedDeliveryDays()"
                          (input)="
                            admin.pEstimatedDeliveryDays.set(
                              +$any($event.target).value
                            )
                          "
                          placeholder="Default: 3"
                          class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Related Products Tab -->
                <div
                  [class.hidden]="activeEditTab() !== 'related_products'"
                  class="space-y-4 animate-fadeIn"
                >
                  <div
                    class="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-900 grid grid-cols-1 gap-4"
                  >
                    <div
                      class="pb-1 border-b dark:border-zinc-900 flex justify-between items-center"
                    >
                      <span
                        class="text-[9px] font-black uppercase text-blue-500 tracking-wider"
                        >Related Products</span
                      >
                    </div>
                    <div class="space-y-3">
                      <div class="flex gap-2">
                        <select
                          #newRelatedSelect
                          class="flex-1 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                        >
                          <option value="">
                            Select a product to relate...
                          </option>
                          @for (p of admin.ds.products(); track p.id) {
                            @if (
                              p.id !== admin.editingProduct()?.id &&
                              !admin.pRelatedIds().includes(p.id)
                            ) {
                              <option [value]="p.id">
                                {{ p.name }} ({{ p.sku }})
                              </option>
                            }
                          }
                        </select>
                        <button
                          (click)="
                            admin.addRelatedProduct(newRelatedSelect.value);
                            newRelatedSelect.value = ''
                          "
                          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold uppercase rounded-lg border-none cursor-pointer text-nowrap"
                        >
                          Add Related
                        </button>
                      </div>

                      @if (admin.pRelatedIds().length > 0) {
                        <div class="space-y-2 mt-4">
                          @for (rId of admin.pRelatedIds(); track rId) {
                            <div
                              class="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                            >
                              <span
                                class="text-xs font-bold text-zinc-900 dark:text-white"
                                >{{ getProductName(rId) }}</span
                              >
                              <button
                                (click)="admin.removeRelatedProduct(rId)"
                                class="text-red-400 hover:text-red-600 bg-transparent border-none p-1 cursor-pointer"
                              >
                                <mat-icon class="scale-75">close</mat-icon>
                              </button>
                            </div>
                          }
                        </div>
                      } @else {
                        <div
                          class="p-4 text-center text-zinc-400 font-bold text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl"
                        >
                          No related products.
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <!-- SEO Tab -->
                <div
                  [class.hidden]="activeEditTab() !== 'seo'"
                  class="space-y-4 animate-fadeIn"
                >
                  <!-- Search Optimization Meta Data -->
                  <div
                    class="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-900 grid grid-cols-1 gap-4"
                  >
                    <div class="pb-1 border-b dark:border-zinc-900">
                      <span
                        class="text-[9px] font-black uppercase text-blue-500 tracking-wider"
                        >Storefront Meta SEO tags (Shopify standard)</span
                      >
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >SEO Page Title</span
                      >
                      <input
                        type="text"
                        [value]="admin.pSeoTitle()"
                        (input)="admin.pSeoTitle.set($any($event.target).value)"
                        placeholder="Leave blank to use title page name"
                        class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >SEO Description keywords (Long description
                        excerpt)</span
                      >
                      <textarea
                        rows="3"
                        [value]="admin.pSeoDescription()"
                        (input)="
                          admin.pSeoDescription.set($any($event.target).value)
                        "
                        placeholder="Describe target search terms..."
                        class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                      ></textarea>
                    </div>
                  </div>
                  <!-- Product Variants JSON (Can stay here or move) -->
                  <div class="space-y-1 pt-4 hidden">
                    <div class="flex justify-between items-center pr-1">
                      <span
                        class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest"
                        >Product Variants (JSON array)</span
                      >
                      <span class="text-[9px] text-zinc-500 font-mono"
                        >Form: [&#123;&quot;name&quot;: &quot;With AMS
                        Combo&quot;, &quot;price&quot;: 48000&#125;]</span
                      >
                    </div>
                    <textarea
                      rows="4"
                      [value]="admin.pVariants()"
                      (input)="admin.pVariants.set($any($event.target).value)"
                      placeholder='[{"name": "Standard Bundle", "price": 21499, "stock": 12}, {"name": "With AMS Combo", "price": 38499, "stock": 8}]'
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          } @else {
            <!-- PRODUCT LOOKUP SEARCH AND TABLE GRID -->
            <div class="space-y-4 font-sans">
              <div
                class="flex bg-white dark:bg-zinc-900 p-2.5 border border-zinc-200 dark:border-zinc-900 rounded-xl"
              >
                <div class="flex-1 relative">
                  <mat-icon
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    >search</mat-icon
                  >
                  <input
                    type="text"
                    [value]="admin.searchQueryProducts()"
                    (input)="
                      admin.searchQueryProducts.set($any($event.target).value)
                    "
                    placeholder="Search catalog by name, sku..."
                    class="w-full pl-9 pr-4 py-2 bg-transparent text-xs font-bold border-none outline-none"
                  />
                </div>
              </div>

              <div
                class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-x-auto no-scrollbar"
              >
                <table class="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr
                      class="text-[10px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800"
                    >
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
                      @if (
                        !admin.searchQueryProducts() ||
                        p.name
                          .toLowerCase()
                          .includes(
                            admin.searchQueryProducts().toLowerCase()
                          ) ||
                        p.sku
                          .toLowerCase()
                          .includes(admin.searchQueryProducts().toLowerCase())
                      ) {
                        <tr
                          class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 font-semibold text-zinc-900 dark:text-zinc-100"
                        >
                          <td class="py-4">
                            <div class="flex items-center gap-3">
                              <img
                                [src]="
                                  (p.images && p.images[0]?.url) ||
                                  (p.images && p.images[0]) ||
                                  'https://picsum.photos/100/100'
                                "
                                alt="Product thumbnail"
                                class="h-8 w-8 object-contain bg-zinc-50 dark:bg-zinc-950 rounded border dark:border-zinc-800"
                                referrerpolicy="no-referrer"
                              />
                              <div>
                                <p
                                  class="font-black uppercase text-zinc-900 dark:text-white"
                                >
                                  {{ p.name }}
                                </p>
                                <p
                                  class="text-[9px] text-zinc-400 font-mono tracking-wide uppercase"
                                >
                                  {{ p.brand }} alliance
                                </p>
                              </div>
                            </div>
                          </td>
                          <td
                            class="py-4 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] font-bold"
                          >
                            {{
                              getCategoryPath(p.category_id) || p.category_id
                            }}
                          </td>
                          <td
                            class="py-4 font-mono text-zinc-500 text-[10px] uppercase"
                          >
                            {{ p.sku }}
                          </td>
                          <td class="py-4">
                            <span
                              [class]="
                                p.stock > 10
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-red-500/10 text-red-500'
                              "
                              class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase"
                            >
                              {{ p.stock }} units
                            </span>
                          </td>
                          <td class="py-4 font-mono font-bold">
                            ₹{{ p.sale_price | number }}
                          </td>
                          <td class="py-4 font-mono text-emerald-500 font-bold">
                            ₹{{ p.dealer_price | number }}
                          </td>
                          <td class="py-4 text-right">
                            <div class="inline-flex gap-2">
                              <button
                                (click)="admin.startProductEdit(p)"
                                class="p-1 text-blue-500 hover:text-blue-700 cursor-pointer"
                              >
                                <mat-icon class="text-base">edit</mat-icon>
                              </button>
                              <button
                                (click)="admin.deleteProduct(p.id)"
                                [disabled]="admin.isDeletingProduct()"
                                class="text-red-400 hover:text-red-600 p-1 cursor-pointer disabled:opacity-40"
                              >
                                <mat-icon class="text-base"
                                  >delete_outline</mat-icon
                                >
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
      @if (admin.activeTab() === "categories") {
        <div class="space-y-8">
          <div>
            <h1 class="text-xl font-black uppercase font-sans">
              Taxonomy Tree
            </h1>
            <p class="text-xs text-zinc-500">
              Manage structure taxonomy, parent mappings, SEO attributes, and
              media.
            </p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- TAXONOMY DIRECTORY GRID -->
            <div
              class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-3xl space-y-4 shadow-sm font-sans lg:col-span-1"
            >
              <div
                class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b dark:border-zinc-800 pb-4"
              >
                <div>
                  <h3
                    class="text-xs font-mono font-black text-zinc-400 uppercase tracking-widest"
                  >
                    Active Tree Nodes
                  </h3>
                  <span
                    class="text-[11px] font-bold text-zinc-450 dark:text-zinc-500"
                    >{{ admin.ds.categories().length }} Categories</span
                  >
                </div>
                <div class="relative w-full sm:w-64">
                  <mat-icon
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm"
                    >search</mat-icon
                  >
                  <input
                    type="text"
                    [value]="categorySearchQuery()"
                    (input)="categorySearchQuery.set($any($event.target).value)"
                    placeholder="Search categories..."
                    class="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div
                class="overflow-x-auto no-scrollbar max-h-[600px] overflow-y-auto pr-1"
              >
                <table class="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr
                      class="text-[9px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800"
                    >
                      <th class="py-2.5">Category Name</th>
                      <th class="py-2.5 text-center">Products</th>
                      <th class="py-2.5 text-center">Status</th>
                      <th class="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                    @for (c of sortedCategories(); track c.id) {
                      <tr
                        class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-900 dark:text-zinc-100"
                      >
                        <td class="py-3 font-semibold">
                          <div
                            class="flex items-center gap-2"
                            [style.padding-left.px]="c.level * 16"
                          >
                            @if (c.level > 0) {
                              <span
                                class="text-zinc-350 dark:text-zinc-700 font-mono"
                                >└─</span
                              >
                            } @else {
                              <mat-icon class="text-blue-500 text-base shrink-0"
                                >folder</mat-icon
                              >
                            }
                            <div>
                              <p
                                class="font-extrabold uppercase text-zinc-900 dark:text-white"
                              >
                                {{ c.name }}
                              </p>
                              @if (c.level > 1) {
                                <p
                                  class="text-[8px] text-zinc-400 font-mono tracking-tight"
                                >
                                  {{ c.path }}
                                </p>
                              }
                            </div>
                          </div>
                        </td>
                        <td
                          class="py-3 text-center font-mono font-bold text-zinc-500"
                        >
                          {{ getProductCount(c.id) }}
                        </td>
                        <td class="py-3 text-center">
                          <div class="inline-flex gap-1">
                            <span
                              [class]="
                                c.isActive !== false
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15'
                                  : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500'
                              "
                              class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
                            >
                              {{ c.isActive !== false ? "ACTIVE" : "DRAFT" }}
                            </span>
                            @if (c.isFeatured) {
                              <span
                                class="bg-amber-500/10 text-amber-500 border border-amber-500/15 px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
                              >
                                FEATURED
                              </span>
                            }
                          </div>
                        </td>
                        <td class="py-3 text-right">
                          <div class="inline-flex gap-1.5">
                            <button
                              (click)="admin.startCategoryEdit(c)"
                              class="p-1 text-blue-500 hover:text-blue-700 cursor-pointer bg-transparent border-none"
                            >
                              <mat-icon class="text-sm font-bold"
                                >edit</mat-icon
                              >
                            </button>
                            <button
                              (click)="admin.deleteCategory(c.id)"
                              class="p-1 text-red-400 hover:text-red-600 cursor-pointer bg-transparent border-none"
                            >
                              <mat-icon class="text-sm font-bold"
                                >delete_outline</mat-icon
                              >
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                    @if (sortedCategories().length === 0) {
                      <tr>
                        <td
                          colspan="4"
                          class="py-8 text-center text-zinc-400 font-bold text-xs"
                        >
                          No categories found matching your query.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- ROOT ADDITION MODULE -->
            <div
              class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-3xl space-y-6 shadow-sm relative overflow-hidden font-sans"
            >
              <div class="relative space-y-4 font-sans">
                <div
                  class="flex justify-between items-center pb-2 border-b dark:border-zinc-800"
                >
                  <h3
                    class="text-sm font-black uppercase text-zinc-900 dark:text-white leading-none"
                  >
                    {{
                      admin.editingCategory()
                        ? "Update Segment Node"
                        : "Initialize Segment Node"
                    }}
                  </h3>
                  @if (admin.editingCategory()) {
                    <button
                      (click)="admin.cancelCategoryEdit()"
                      class="text-[9px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-650 dark:text-zinc-350 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      New Segment
                    </button>
                  }
                </div>

                <div class="space-y-4">
                  <div class="space-y-1">
                    <span
                      class="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1"
                      >Name / Label *</span
                    >
                    <input
                      type="text"
                      [value]="admin.newCatName()"
                      (input)="admin.newCatName.set($any($event.target).value)"
                      placeholder="e.g. FDM Accessories"
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                    />
                  </div>

                  <div class="space-y-1 relative">
                    <span
                      class="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1"
                      >Parent Segment Node (Leave empty if root)</span
                    >
                    <button
                      type="button"
                      (click)="
                        editorCatDropdownOpen.set(!editorCatDropdownOpen())
                      "
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold text-left text-zinc-900 dark:text-white flex justify-between items-center cursor-pointer"
                    >
                      <span>{{
                        getCategoryPath(admin.newCatParentId()) ||
                          "None (Top-Level Category)"
                      }}</span>
                      <mat-icon class="text-zinc-400 text-sm"
                        >keyboard_arrow_down</mat-icon
                      >
                    </button>

                    @if (editorCatDropdownOpen()) {
                      <div
                        class="absolute z-50 w-full mt-1.5 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl space-y-2 animate-fadeIn max-h-[300px] overflow-hidden flex flex-col"
                      >
                        <div
                          class="relative flex items-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg px-2.5 py-1"
                        >
                          <mat-icon
                            class="text-zinc-400 text-sm shrink-0 mr-1.5"
                            >search</mat-icon
                          >
                          <input
                            type="text"
                            [value]="editorCatSearchQuery()"
                            (input)="
                              editorCatSearchQuery.set(
                                $any($event.target).value
                              )
                            "
                            placeholder="Search parent by name..."
                            class="w-full bg-transparent border-none outline-none text-xs font-bold text-zinc-900 dark:text-white py-1"
                          />
                        </div>

                        <div
                          class="flex-1 overflow-y-auto max-h-[200px] space-y-1 no-scrollbar"
                        >
                          <button
                            type="button"
                            (click)="
                              admin.newCatParentId.set('');
                              editorCatDropdownOpen.set(false);
                              editorCatSearchQuery.set('')
                            "
                            class="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-zinc-550 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-none bg-transparent"
                          >
                            None (Top-Level Category)
                          </button>
                          @for (c of admin.ds.categories(); track c.id) {
                            @if (c.id !== admin.editingCategory()?.id) {
                              @if (
                                !editorCatSearchQuery() ||
                                getCategoryPath(c.id)
                                  .toLowerCase()
                                  .includes(
                                    editorCatSearchQuery().toLowerCase()
                                  )
                              ) {
                                <button
                                  type="button"
                                  (click)="
                                    admin.newCatParentId.set(c.id);
                                    editorCatDropdownOpen.set(false);
                                    editorCatSearchQuery.set('')
                                  "
                                  [class.bg-blue-50]="
                                    admin.newCatParentId() === c.id
                                  "
                                  [class.text-blue-500]="
                                    admin.newCatParentId() === c.id
                                  "
                                  class="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex flex-col border-none bg-transparent"
                                >
                                  <span
                                    class="font-black text-zinc-900 dark:text-white"
                                    >{{ c.name }}</span
                                  >
                                  <span
                                    class="text-[9px] text-zinc-450 mt-0.5"
                                    >{{ getCategoryPath(c.id) }}</span
                                  >
                                </button>
                              }
                            }
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <div class="space-y-1">
                    <app-rich-text-editor
                      label="Segment Description"
                      placeholder="Short explanatory copy..."
                      [value]="admin.newCatDesc()"
                      (valueChange)="admin.newCatDesc.set($event)"
                    ></app-rich-text-editor>
                  </div>

                  <!-- Extra Shopify Layout details -->
                  <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                      <app-image-picker
                        label="Image Grid"
                        [value]="admin.catImage()"
                        (valueChange)="admin.catImage.set($event)"
                      ></app-image-picker>
                    </div>
                    <div class="space-y-1">
                      <app-image-picker
                        label="Banner Overlay"
                        [value]="admin.catBanner()"
                        (valueChange)="admin.catBanner.set($event)"
                      ></app-image-picker>
                    </div>
                  </div>

                  <div
                    class="grid grid-cols-3 gap-4 text-xs text-zinc-900 dark:text-white"
                  >
                    <div class="space-y-1 col-span-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1"
                        >Grid Icon</span
                      >
                      <input
                        type="text"
                        [value]="admin.catIcon()"
                        (input)="admin.catIcon.set($any($event.target).value)"
                        placeholder="folder"
                        class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-lg text-xs outline-none text-zinc-900 dark:text-white font-bold"
                      />
                    </div>
                    <div class="flex items-center gap-1.5 pt-4">
                      <input
                        type="checkbox"
                        [checked]="admin.catIsActive()"
                        (change)="
                          admin.catIsActive.set($any($event.target).checked)
                        "
                        class="rounded text-blue-600 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-855 h-4 w-4"
                      />
                      <span
                        class="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest"
                        >Active</span
                      >
                    </div>
                    <div class="flex items-center gap-1.5 pt-4">
                      <input
                        type="checkbox"
                        [checked]="admin.catIsFeatured()"
                        (change)="
                          admin.catIsFeatured.set($any($event.target).checked)
                        "
                        class="rounded text-blue-600 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-855 h-4 w-4"
                      />
                      <span
                        class="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest"
                        >Featured</span
                      >
                    </div>
                  </div>

                  <!-- Category SEO tags -->
                  <div
                    class="p-4 bg-zinc-50 dark:bg-zinc-955 rounded-xl border border-zinc-200 dark:border-zinc-850 space-y-2"
                  >
                    <span
                      class="text-[9px] font-black uppercase text-zinc-450 dark:text-zinc-500 tracking-widest block"
                      >Taxonomy Meta Tags (Shopify Standard)</span
                    >
                    <div class="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        [value]="admin.catSeoTitle()"
                        (input)="
                          admin.catSeoTitle.set($any($event.target).value)
                        "
                        placeholder="SEO Meta Title"
                        class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
                      />
                      <input
                        type="text"
                        [value]="admin.catSeoDescription()"
                        (input)="
                          admin.catSeoDescription.set($any($event.target).value)
                        "
                        placeholder="SEO Meta Desc"
                        class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
                      />
                    </div>
                  </div>
                </div>

                <div class="pt-2">
                  <button
                    (click)="admin.saveCategory()"
                    class="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg transition-colors cursor-pointer border-none font-mono"
                  >
                    {{
                      admin.editingCategory()
                        ? "Publish Node Update"
                        : "Program Node Segment"
                    }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ========================= TAB: COLLECTIONS ========================= -->
      @if (admin.activeTab() === "collections") {
        <div class="space-y-8 font-sans">
          <div>
            <h1 class="text-xl font-black uppercase">Thematic Collections</h1>
            <p class="text-xs text-zinc-500">
              Group catalog spools, filaments, and printers into user-facing
              collections.
            </p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- LIST -->
            <div class="lg:col-span-2 space-y-4">
              @for (col of admin.collectionsList(); track col.id) {
                <div
                  class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-xl flex justify-between items-center hover:border-blue-500/20 transition-all shadow-xs"
                >
                  <div>
                    <div class="flex items-center gap-2">
                      <h4
                        class="text-xs font-black uppercase text-zinc-900 dark:text-white"
                      >
                        {{ col.name }}
                      </h4>
                      <span
                        [class]="
                          col.active
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500'
                        "
                        class="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase"
                      >
                        {{ col.active ? "ACTIVE" : "DRAFT" }}
                      </span>
                    </div>
                    <p class="text-[11px] text-zinc-400 mt-1">
                      {{ col.description }}
                    </p>
                  </div>
                  <div class="flex items-center gap-3">
                    <button
                      (click)="admin.toggleCollection(col.id)"
                      class="px-2.5 py-1 text-[9px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 rounded-md cursor-pointer hover:bg-blue-600 hover:text-white transition-colors border-none"
                    >
                      Toggle
                    </button>
                    <button
                      (click)="admin.deleteCollection(col.id)"
                      class="text-red-400 hover:text-red-500 cursor-pointer"
                    >
                      <mat-icon class="text-base">delete_outline</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- ADD -->
            <div
              class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4 shadow-xs"
            >
              <h3 class="text-xs font-black uppercase">Register Collection</h3>
              <div class="space-y-1">
                <span
                  class="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                  >Label</span
                >
                <input
                  type="text"
                  [value]="admin.newColName()"
                  (input)="admin.newColName.set($any($event.target).value)"
                  placeholder="e.g. PLA Professional Filament"
                  class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                />
              </div>
              <div class="space-y-1">
                <span
                  class="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                  >Brief Description</span
                >
                <input
                  type="text"
                  [value]="admin.newColDesc()"
                  (input)="admin.newColDesc.set($any($event.target).value)"
                  placeholder="Short descriptive caption..."
                  class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                />
              </div>
              <button
                (click)="admin.createCollection()"
                class="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer hover:bg-blue-500 border-none"
              >
                Program Collection
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ========================= TAB: BRANDS ========================= -->
      @if (admin.activeTab() === "brands") {
        <div class="space-y-8 font-sans">
          <div>
            <h1 class="text-xl font-black uppercase">Brand Alliances</h1>
            <p class="text-xs text-zinc-500">
              Coordinate and verify global SLA printing manufacturers. Add
              logos, descriptions, and territories.
            </p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Lists of Brands -->
            <div class="lg:col-span-2 space-y-3">
              @for (br of admin.ds.brands(); track br.id) {
                <div
                  class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl flex justify-between items-center hover:border-blue-500/20 transition-all shadow-xs"
                >
                  <div class="flex items-center gap-4">
                    <img
                      [src]="
                        br.logo || 'https://picsum.photos/seed/logo/100/100'
                      "
                      alt="Brand alliance logo"
                      class="h-10 w-16 object-contain bg-zinc-50 dark:bg-zinc-950 rounded border dark:border-zinc-800 pr-1 shrink-0"
                      referrerpolicy="no-referrer"
                    />
                    <div>
                      <h4
                        class="text-xs font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2"
                      >
                        {{ br.name }}
                        @if (br.active) {
                          <span
                            class="bg-blue-500/15 text-blue-500 px-1 py-0.5 rounded text-[8px] font-black"
                            >ACTIVE</span
                          >
                        } @else {
                          <span
                            class="bg-zinc-250 dark:bg-zinc-850 text-zinc-500 px-1 py-0.5 rounded text-[8px] font-black"
                            >INACTIVE</span
                          >
                        }
                      </h4>
                      <p
                        class="text-[9px] text-zinc-400 uppercase font-mono tracking-wide pt-0.5"
                      >
                        TERRITORY: {{ br.country || "Global" }}
                      </p>
                      @if (br.description) {
                        <p
                          class="text-[10px] text-zinc-500 mt-1 line-clamp-1 dark:text-zinc-400"
                        >
                          {{ br.description }}
                        </p>
                      }
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      (click)="admin.startBrandEdit(br)"
                      class="p-1 px-2 hover:bg-blue-600/10 text-blue-500 rounded text-[10px] uppercase font-black cursor-pointer bg-none border-none"
                    >
                      Edit
                    </button>
                    <button
                      (click)="admin.deleteBrand(br.id)"
                      class="text-red-400 hover:text-red-500 cursor-pointer p-1"
                    >
                      <mat-icon class="text-base font-black"
                        >delete_outline</mat-icon
                      >
                    </button>
                  </div>
                </div>
              } @empty {
                <div
                  class="py-10 text-center text-zinc-400 border border-dashed rounded-2xl"
                >
                  <mat-icon class="text-xl mb-1 font-black">label</mat-icon>
                  <p class="text-xs font-bold uppercase">
                    No brands seeded or registered. Add your first client
                    partner!
                  </p>
                </div>
              }
            </div>

            <!-- Add / Edit Form -->
            <div
              class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl space-y-4 shadow-xs"
            >
              <div
                class="flex justify-between items-center pb-2 border-b dark:border-zinc-800"
              >
                <h3
                  class="text-xs font-black uppercase text-zinc-900 dark:text-white leading-none"
                >
                  {{
                    admin.editingBrand()
                      ? "Edit Verified Alliance"
                      : "Register Brand Alliance"
                  }}
                </h3>
                @if (admin.editingBrand()) {
                  <button
                    (click)="admin.cancelBrandEdit()"
                    class="text-[9px] font-black uppercase px-2 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded text-zinc-500 cursor-pointer"
                  >
                    New
                  </button>
                }
              </div>

              <div class="space-y-3">
                <div class="space-y-1">
                  <span
                    class="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                    >Brand Name *</span
                  >
                  <input
                    type="text"
                    [value]="admin.brandName()"
                    (input)="admin.brandName.set($any($event.target).value)"
                    placeholder="e.g. Creality Inc."
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                  />
                </div>
                <div class="space-y-1">
                  <span
                    class="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                    >Alliance Slug Identification</span
                  >
                  <input
                    type="text"
                    [value]="admin.brandSlug()"
                    (input)="admin.brandSlug.set($any($event.target).value)"
                    placeholder="creality-inc"
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"
                  />
                </div>
                <div class="space-y-1">
                  <span
                    class="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1"
                    >Manufacturing Territory (Country)</span
                  >
                  <input
                    type="text"
                    [value]="admin.brandCountry()"
                    (input)="admin.brandCountry.set($any($event.target).value)"
                    placeholder="e.g. Shenzhen HQ"
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                  />
                </div>
                <div class="space-y-1 border-b dark:border-zinc-800 pb-2">
                  <app-image-picker
                    label="Logo Branding"
                    [value]="admin.brandLogo()"
                    (valueChange)="admin.brandLogo.set($event)"
                  ></app-image-picker>
                </div>
                <div class="space-y-1">
                  <app-rich-text-editor
                    label="Alliance Banner Description"
                    placeholder="Exquisite summaries of machinery tools..."
                    [value]="admin.brandDesc()"
                    (valueChange)="admin.brandDesc.set($event)"
                  ></app-rich-text-editor>
                </div>

                <div class="flex items-center gap-1.5 pt-2">
                  <input
                    type="checkbox"
                    [checked]="admin.brandActive()"
                    (change)="
                      admin.brandActive.set($any($event.target).checked)
                    "
                    class="rounded text-blue-600"
                  />
                  <span class="text-[10px] font-black text-zinc-550 uppercase"
                    >Active Verified status</span
                  >
                </div>
              </div>

              <div class="pt-2">
                <button
                  (click)="admin.saveBrand()"
                  class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all border-none"
                >
                  {{
                    admin.editingBrand()
                      ? "Save brand modifications"
                      : "Register alliance"
                  }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ========================= TAB: INVENTORY ========================= -->
      @if (admin.activeTab() === "inventory") {
        <div class="space-y-8 font-sans">
          <div>
            <h1 class="text-xl font-black uppercase">Logistics & SKU Depot</h1>
            <p class="text-xs text-zinc-500">
              Real-time stock adjustments synced in real time with the active
              warehouse network.
            </p>
          </div>

          <div
            class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-x-auto no-scrollbar font-sans shadow-xs"
          >
            <table class="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr
                  class="text-[10px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800"
                >
                  <th class="py-3">Asset Item</th>
                  <th class="py-3">SKU barcode</th>
                  <th class="py-3">Current buffer</th>
                  <th class="py-3 text-right">Physical adjustment tuning</th>
                </tr>
              </thead>
              <tbody
                class="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono"
              >
                @for (p of admin.ds.products(); track p.id) {
                  <tr
                    class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-950 dark:text-zinc-150"
                  >
                    <td
                      class="py-4 font-black text-zinc-900 dark:text-white uppercase font-sans"
                    >
                      {{ p.name }}
                    </td>
                    <td class="py-4 text-zinc-550">{{ p.sku }}</td>
                    <td
                      class="py-4 font-bold"
                      [class.text-red-500]="p.stock < 10"
                    >
                      {{ p.stock }} Unit(s)
                    </td>
                    <td class="py-4 text-right">
                      <div class="inline-flex gap-1">
                        <button
                          (click)="admin.adjustStock(p.id, -10)"
                          class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-[10px] font-black rounded-lg cursor-pointer border-none"
                        >
                          -10
                        </button>
                        <button
                          (click)="admin.adjustStock(p.id, -1)"
                          class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-[10px] font-black rounded-lg cursor-pointer border-none"
                        >
                          -1
                        </button>
                        <button
                          (click)="admin.adjustStock(p.id, 1)"
                          class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-[10px] font-black rounded-lg cursor-pointer text-emerald-500 border-none"
                        >
                          +1
                        </button>
                        <button
                          (click)="admin.adjustStock(p.id, 10)"
                          class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-[10px] font-black rounded-lg cursor-pointer text-emerald-500 border-none"
                        >
                          +10
                        </button>
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
        <div
          class="fixed inset-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div
              class="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center"
            >
              <div>
                <h3 class="text-lg font-black uppercase tracking-tight">
                  Variant Images
                </h3>
                <p class="text-xs text-zinc-500 font-mono mt-1">
                  Editing images for
                  {{ admin.pVariants()[activeVariantForImages()!]?.name }}
                </p>
              </div>
              <button
                (click)="activeVariantForImages.set(null)"
                class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 bg-transparent border-none cursor-pointer"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="p-6 overflow-y-auto space-y-6">
              <div>
                <label
                  class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3"
                  >Upload Image</label
                >
                <div
                  class="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center relative hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                >
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg, image/png, image/webp"
                    class="absolute inset-0 opacity-0 cursor-pointer"
                    (change)="handleVariantImageUpload($event)"
                  />
                  <div
                    class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0 mb-3 group-hover:scale-110 transition-transform"
                  >
                    <mat-icon>cloud_upload</mat-icon>
                  </div>
                  <div
                    class="text-xs font-bold text-zinc-900 dark:text-white uppercase"
                  >
                    Drop photos here or click to browse
                  </div>
                  <div class="text-[10px] text-zinc-500 mt-1">
                    JPEG, PNG, WebP up to 2MB
                  </div>
                  @if (uploadProgress > 0) {
                    <div
                      class="absolute inset-x-4 bottom-4 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"
                    >
                      <div
                        class="h-full bg-blue-500 transition-all duration-300"
                        [style.width.%]="uploadProgress"
                      ></div>
                    </div>
                  }
                </div>
              </div>

              @if (
                (admin.pVariants()[activeVariantForImages()!]?.images || [])
                  .length > 0
              ) {
                <div class="space-y-2">
                  <label
                    class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest"
                    >Current Images</label
                  >
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    @for (
                      img of admin.pVariants()[activeVariantForImages()!]
                        ?.images || [];
                      track $index;
                      let imgIdx = $index
                    ) {
                      <div
                        class="relative group border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden aspect-square bg-zinc-50 dark:bg-zinc-900"
                      >
                        <img
                          [src]="img.url"
                          class="absolute inset-0 w-full h-full object-cover"
                        />
                        <div
                          class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                        >
                          <button
                            (click)="removeVariantImage(imgIdx)"
                            class="h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center border-none cursor-pointer"
                          >
                            <mat-icon class="scale-75">delete</mat-icon>
                          </button>
                        </div>
                        @if (imgIdx === 0) {
                          <div
                            class="absolute top-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black uppercase rounded shadow-sm"
                          >
                            Primary
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <div
                  class="text-center p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 text-xs font-bold"
                >
                  No images uploaded for this variant yet.
                </div>
              }
            </div>
            <div
              class="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end"
            >
              <button
                (click)="activeVariantForImages.set(null)"
                class="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest border-none cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminCatalogTab {
  toastService = inject(ToastService);
  http = inject(HttpClient);
  @Input({ required: true }) admin!: AdminPanel;

  uploadProgress = 0;

  activeVariantForImages = signal<number | null>(null);

  // Search signals for product and categories
  pCatSearchQuery = signal<string>("");
  pCatDropdownOpen = signal<boolean>(false);
  editorCatSearchQuery = signal<string>("");
  editorCatDropdownOpen = signal<boolean>(false);
  categorySearchQuery = signal<string>("");

  sortedCategories = computed(() => {
    const cats = this.admin.ds.categories() || [];
    const query = this.categorySearchQuery().toLowerCase().trim();

    const list = cats.map((c) => ({
      ...c,
      path: this.getCategoryPath(c.id),
      level: this.getCategoryLevel(c.id),
    }));

    const filtered = query
      ? list.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.path.toLowerCase().includes(query),
        )
      : list;

    return filtered.sort((a, b) => a.path.localeCompare(b.path));
  });

  getCategoryLevel(catId: string | null): number {
    if (!catId) return 0;
    const cats = this.admin.ds.categories();
    const cat = cats.find((c) => c.id === catId);
    if (!cat) return 0;
    const parentId = cat.parent_id || cat.parentId;
    return parentId ? 1 + this.getCategoryLevel(parentId) : 0;
  }

  getProductCount(catId: string): number {
    return (this.admin.ds.products() || []).filter(
      (p) => p.category_id === catId || p.categoryId === catId,
    ).length;
  }

  getCategoryPath(catId: string | null): string {
    if (!catId) return "";
    const cats = this.admin.ds.categories();
    const cat = cats.find((c) => c.id === catId);
    if (!cat) return "";
    const parentId = cat.parent_id || cat.parentId;
    if (parentId) {
      return `${this.getCategoryPath(parentId)} > ${cat.name}`;
    }
    return cat.name;
  }

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
        formData.append("image", file);
        const res = await firstValueFrom(
          this.http.post<any>("/api/admin/upload-image", formData),
        );
        if (res && res.success && res.url) {
          variant.images.push({
            url: res.url,
            isPrimary: variant.images.length === 0,
          });
          this.toastService.success("Variant Image Uploaded Successfully");
        } else {
          this.toastService.error("Upload Failed");
        }
      } catch (e) {
        console.error("Failed to upload file:", e);
        this.toastService.error("Upload Failed");
      }

      this.uploadProgress = Math.floor(
        10 + ((i + 1) / input.files.length) * 90,
      );
    }

    this.admin.pVariants.set(variants);
    this.uploadProgress = 100;
    setTimeout(() => (this.uploadProgress = 0), 1000);
    input.value = ""; // Reset input
  }

  activeEditTab = signal("general");

  editTabs = [
    { id: "general", label: "General" },
    { id: "variants", label: "Variants" },
    { id: "images", label: "Images" },
    { id: "specifications", label: "Specifications" },
    { id: "downloads", label: "Downloads" },
    { id: "features", label: "Features" },
    { id: "faqs", label: "FAQs" },
    { id: "warranty", label: "Warranty & Support" },
    { id: "shipping", label: "Shipping & Delivery" },
    { id: "related_products", label: "Related Products" },
    { id: "seo", label: "SEO" },
  ];

  startEditNew() {
    this.activeEditTab.set("general");
    this.admin.startProductEdit({
      id: "new",
      name: "",
      slug: "",
      barcode: "",
      sku: "",
      brand: "3D Galaxy",
      category_id: "",
      mrp: 1499,
      sale_price: 1199,
      dealer_price: 999,
      stock: 50,
      reserved: 0,
      description: "",
      images: [],
      specs: [],
      reviews: [],
      qnas: [],
      featured: false,
      is360Supported: false,
      tags: [],
      downloads: [],
      features: [],
      faqs: [],
      relatedProducts: [],
    });
  }

  isProductInBundle(id: string): boolean {
    const list = this.admin.pBundleProducts();
    return list.some((item: any) => {
      const bId = typeof item === "string" ? item : item.id;
      return bId === id;
    });
  }

  addBundleProduct(id: string) {
    if (!id) return;
    const list = [...this.admin.pBundleProducts()];
    list.push({ id });
    this.admin.pBundleProducts.set(list);
  }

  removeBundleProduct(id: string) {
    const list = this.admin.pBundleProducts().filter((item: any) => {
      const bId = typeof item === "string" ? item : item.id;
      return bId !== id;
    });
    this.admin.pBundleProducts.set(list);
  }

  addRecommendedFilament(id: string) {
    if (!id) return;
    const list = [...this.admin.pRecommendedFilaments()];
    if (!list.includes(id)) {
      list.push(id);
      this.admin.pRecommendedFilaments.set(list);
    }
  }

  removeRecommendedFilament(id: string) {
    const list = this.admin.pRecommendedFilaments().filter((x) => x !== id);
    this.admin.pRecommendedFilaments.set(list);
  }

  getBundleItemName(itemOrId: any): string {
    const id = typeof itemOrId === "string" ? itemOrId : itemOrId.id;
    return this.getProductName(id);
  }

  getProductName(id: string): string {
    return this.admin.ds.products().find((p: any) => p.id === id)?.name || id;
  }

  cancelEdit() {
    this.admin.cancelProductEdit();
    this.activeEditTab.set("general");
  }

  getJsonValue(
    key:
      | "specs"
      | "features"
      | "faqs"
      | "downloads"
      | "relatedProducts"
      | "warranty"
      | "shipping",
  ): string {
    const val = this.admin.editingProduct()?.[key];
    if (!val) return "";
    if (typeof val === "string") return val;
    return JSON.stringify(val, null, 2);
  }

  setJsonValue(
    key:
      | "specs"
      | "features"
      | "faqs"
      | "downloads"
      | "relatedProducts"
      | "warranty"
      | "shipping",
    valStr: string,
  ) {
    if (!this.admin.editingProduct()) return;
    try {
      if (valStr.trim() === "") {
        (this.admin.editingProduct() as any)[key] = null;
      } else {
        const parsed = JSON.parse(valStr);
        (this.admin.editingProduct() as any)[key] = parsed;
      }
    } catch (e) {
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
        formData.append("image", file);
        const res = await firstValueFrom(
          this.http.post<any>("/api/admin/upload-image", formData),
        );
        if (res && res.success && res.url) {
          images.push({
            url: res.url,
            isPrimary: images.length === 0,
          });
          this.toastService.success("Image Uploaded Successfully");
        } else {
          this.toastService.error("Upload Failed");
        }
      } catch (e) {
        console.error("Failed to upload file:", e);
        this.toastService.error("Upload Failed");
      }

      this.uploadProgress = Math.floor(
        10 + ((i + 1) / input.files.length) * 90,
      );
    }

    this.admin.pImages.set(images);
    this.uploadProgress = 100;
    setTimeout(() => (this.uploadProgress = 0), 1000);
    input.value = ""; // Reset input
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
