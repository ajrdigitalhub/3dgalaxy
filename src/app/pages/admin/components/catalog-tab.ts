import {
  Component,
  Input,
  ChangeDetectionStrategy,
  signal,
  inject,
  computed,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { HttpClient } from "@angular/common/http";
import { ApiService } from "../../../services/api.service";
import { firstValueFrom } from "rxjs";
import { AdminPanel } from "../admin";
import { ToastService } from "../../../shared/components/toast/toast.service";
import { RichTextEditorComponent } from "../../../shared/components/rich-text-editor/rich-text-editor.component";
import { ProductImportComponent } from "../../../admin/products/product-import/product-import.component";

import { ImagePickerComponent } from "../../../shared/components/image-picker/image-picker.component";
import { AppButton } from "../../../shared/components/app-button/app-button";
import { AdminVariantGroupConfigComponent } from "./admin-variant-group-config/admin-variant-group-config.component";
import { CategoryMultiSelectComponent } from "../../../shared/components/category-multi-select/category-multi-select.component";
import { VariantTourGuideComponent } from "../../../shared/components/variant-tour-guide/variant-tour-guide.component";
import { VariantTourService } from "../../../core/services/variant-tour.service";

@Component({
  selector: "app-admin-catalog-tab",
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    RichTextEditorComponent,
    ImagePickerComponent,
    AppButton,
    ProductImportComponent,
    AdminVariantGroupConfigComponent,
    CategoryMultiSelectComponent,
    VariantTourGuideComponent,
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
            <div class="flex items-center gap-2">
              @if (!admin.editingProduct()) {
                <button
                  (click)="exportProductsCsv()"
                  class="h-9 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <mat-icon class="text-sm">download</mat-icon>
                  <span>Export CSV</span>
                </button>
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
                    <div class="flex items-center gap-1 mb-1">
                      <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Product Title *</span>
                      <div class="group relative flex items-center cursor-help">
                        <mat-icon class="scale-75 text-zinc-400 group-hover:text-blue-500 transition-colors">info</mat-icon>
                        <div class="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-60 p-2.5 bg-zinc-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none border border-zinc-700">
                          Main product name displayed in store catalog, search results, and checkout invoices.
                        </div>
                      </div>
                    </div>
                    <input
                      type="text"
                      [value]="admin.pName()"
                      (input)="
                        admin.updateProductName($any($event.target).value)
                      "
                      placeholder="e.g. Bambu Lab P1S"
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div class="space-y-1">
                    <div class="flex items-center gap-1 mb-1">
                      <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">URL Slug Customization</span>
                      <div class="group relative flex items-center cursor-help">
                        <mat-icon class="scale-75 text-zinc-400 group-hover:text-blue-500 transition-colors">info</mat-icon>
                        <div class="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-60 p-2.5 bg-zinc-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none border border-zinc-700">
                          Web URL path identifier (e.g. /product/bambu-lab-p1s).
                        </div>
                      </div>
                    </div>
                    <input
                      type="text"
                      [value]="admin.pSlug()"
                      (input)="admin.pSlug.set($any($event.target).value)"
                      placeholder="bambu-lab-p1s"
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold outline-none text-blue-500 dark:text-blue-400"
                    />
                  </div>
                  <div class="space-y-1">
                    <div class="flex items-center gap-1 mb-1">
                      <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">SKU Barcode / Part Number</span>
                      <div class="group relative flex items-center cursor-help">
                        <mat-icon class="scale-75 text-zinc-400 group-hover:text-blue-500 transition-colors">info</mat-icon>
                        <div class="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-60 p-2.5 bg-zinc-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none border border-zinc-700">
                          Unique Stock Keeping Unit barcode code used for inventory management.
                        </div>
                      </div>
                    </div>
                    <input
                      type="text"
                      [value]="admin.pSku()"
                      (input)="admin.pSku.set($any($event.target).value)"
                      placeholder="e.g. GLX-PLA-BLU"
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono uppercase font-black outline-none text-zinc-900 dark:text-white"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                    <div class="space-y-1 col-span-1 md:col-span-2">
                      <div class="flex items-center gap-1 mb-1">
                        <span class="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Categories Architecture (Multi-Category Tagging) *</span>
                        <div class="group relative flex items-center cursor-help">
                          <mat-icon class="scale-75 text-zinc-400 group-hover:text-blue-500 transition-colors">info</mat-icon>
                          <div class="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2.5 bg-zinc-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none border border-zinc-700">
                            Select all applicable categories for storefront navigation. Assign one Primary tag for breadcrumbs.
                          </div>
                        </div>
                      </div>
                      <app-category-multi-select
                        [categories]="admin.ds.categories()"
                        [selectedCategoryIds]="admin.pCategoryIds()"
                        [primaryCategoryId]="admin.pCatId()"
                        (selectionChange)="onCategorySelectionChange($event)" />
                    </div>

                    <div class="space-y-1">
                      <div class="flex items-center gap-1 mb-1">
                        <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Brand Manufacturer Alliance</span>
                        <div class="group relative flex items-center cursor-help">
                          <mat-icon class="scale-75 text-zinc-400 group-hover:text-blue-500 transition-colors">info</mat-icon>
                          <div class="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-60 p-2.5 bg-zinc-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none border border-zinc-700">
                            Associates product with brand pages and warranty badges.
                          </div>
                        </div>
                      </div>
                      <select
                        [value]="admin.pBrand()"
                        (change)="admin.pBrand.set($any($event.target).value)"
                        class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none font-bold text-zinc-900 dark:text-white"
                      >
                        <option value="">Select Brand...</option>
                        @for (br of admin.ds.brands(); track br.id) {
                          <option [value]="br.id">{{ br.name }}</option>
                        }
                      </select>
                    </div>
                  </div>

                  <!-- Prices -->
                  <div
                    class="grid grid-cols-3 gap-3 col-span-1 md:col-span-2 text-zinc-900 dark:text-white"
                  >
                    <div class="space-y-1">
                      <div class="flex items-center gap-1 mb-1">
                        <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">MRP Price (INR)</span>
                        <div class="group relative flex items-center cursor-help">
                          <mat-icon class="scale-75 text-zinc-400">info</mat-icon>
                          <div class="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-zinc-900 text-white text-[10px] rounded shadow-xl z-50 pointer-events-none">
                            Strikethrough reference retail price.
                          </div>
                        </div>
                      </div>
                      <input
                        type="number"
                        [value]="admin.pMrp()"
                        (input)="admin.pMrp.set(+$any($event.target).value)"
                        class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div class="space-y-1">
                      <div class="flex items-center gap-1 mb-1">
                        <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Retail Sale (INR)</span>
                        <div class="group relative flex items-center cursor-help">
                          <mat-icon class="scale-75 text-zinc-400">info</mat-icon>
                          <div class="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-zinc-900 text-white text-[10px] rounded shadow-xl z-50 pointer-events-none">
                            Actual price charged to standard customer orders.
                          </div>
                        </div>
                      </div>
                      <input
                        type="number"
                        [value]="admin.pSale()"
                        (input)="admin.pSale.set(+$any($event.target).value)"
                        class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-blue-500 font-bold outline-none"
                      />
                    </div>
                    <div class="space-y-1">
                      <div class="flex items-center gap-1 mb-1">
                        <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Authorized Dealer (INR)</span>
                        <div class="group relative flex items-center cursor-help">
                          <mat-icon class="scale-75 text-zinc-400">info</mat-icon>
                          <div class="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-zinc-900 text-white text-[10px] rounded shadow-xl z-50 pointer-events-none">
                            Exclusive wholesale rate for verified dealer accounts.
                          </div>
                        </div>
                      </div>
                      <input
                        type="number"
                        [value]="admin.pDealer()"
                        (input)="admin.pDealer.set(+$any($event.target).value)"
                        class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-emerald-500 font-bold outline-none"
                      />
                    </div>
                  </div>

                  <!-- Stock, Status -->
                  <div
                    class="grid grid-cols-2 gap-4 col-span-1 md:col-span-2 text-zinc-900 dark:text-white"
                  >
                    <div class="space-y-1">
                      <div class="flex items-center gap-1 mb-1">
                        <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Physical Stock Inventory</span>
                        <div class="group relative flex items-center cursor-help">
                          <mat-icon class="scale-75 text-zinc-400">info</mat-icon>
                          <div class="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-56 p-2 bg-zinc-900 text-white text-[10px] rounded shadow-xl z-50 pointer-events-none">
                            Total stock quantity if product has no variant breakdown.
                          </div>
                        </div>
                      </div>
                      <input
                        type="number"
                        [value]="admin.pStock()"
                        (input)="admin.pStock.set(+$any($event.target).value)"
                        class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-black outline-none text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div class="space-y-1">
                      <div class="flex items-center gap-1 mb-1">
                        <span class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Status Policy</span>
                        <div class="group relative flex items-center cursor-help">
                          <mat-icon class="scale-75 text-zinc-400">info</mat-icon>
                          <div class="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-56 p-2 bg-zinc-900 text-white text-[10px] rounded shadow-xl z-50 pointer-events-none">
                            Controls whether product is visible to public website visitors.
                          </div>
                        </div>
                      </div>
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
                  <!-- TOUR TRIGGER HEADER BAR -->
                  <div class="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/5 dark:from-blue-950/40 dark:to-purple-950/40 rounded-xl border border-blue-500/20 shadow-xs flex-wrap gap-2">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-blue-600 dark:text-blue-400">school</mat-icon>
                      <div>
                        <span class="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">Variant Setup Guide & Onboarding</span>
                        <p class="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium m-0">Step-by-step interactive walkthrough for options, pricing, stock, images, and live previews.</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <button 
                        type="button" 
                        (click)="tourService.startTour()"
                        class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black uppercase tracking-wider cursor-pointer border-none shadow-xs flex items-center gap-1.5 transition-all">
                        <mat-icon class="scale-75">play_arrow</mat-icon> Take Variant Configuration Tour
                      </button>
                      <button
                        type="button"
                        (click)="tourService.startTour()"
                        class="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-[11px] font-bold cursor-pointer border border-zinc-200 dark:border-zinc-700 flex items-center gap-1">
                        <span>Help</span>
                        <mat-icon class="scale-75">help_outline</mat-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Options Management -->
                  <div class="space-y-4">
                    <!-- Advanced Variant Group & Bundle Architecture Editor with Live Preview -->
                    <app-admin-variant-group-config
                      [variantGroups]="admin.pOptions()"
                      [availableVariants]="admin.pVariants()"
                      [basePrice]="admin.pSale() || admin.pMrp() || 756"
                      (groupsChanged)="admin.pOptions.set($event)" />

                    <div
                      data-tour="variant-options"
                      class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mt-6"
                    >
                      <div class="flex items-center gap-1.5">
                        <h4
                          class="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <span>Option Keys & Values Mapping</span>
                        </h4>
                        <div class="group relative flex items-center cursor-help">
                          <mat-icon class="scale-75 text-zinc-400 group-hover:text-blue-500 transition-colors">info</mat-icon>
                          <div class="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2.5 bg-zinc-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none border border-zinc-700">
                            Define customer selection options (e.g. Color, Size, Filament Type). Comma-separated values generate variant combinations.
                          </div>
                        </div>
                      </div>
                      <div class="flex gap-2">
                        <button
                          (click)="admin.addOption()"
                          class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] uppercase font-black tracking-wider rounded border-none cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          <mat-icon class="scale-75 text-sm">add</mat-icon> Add Option
                        </button>
                        <button
                          (click)="addCustomVariant()"
                          class="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-black tracking-wider rounded border border-emerald-500/30 cursor-pointer flex items-center gap-1"
                        >
                          <mat-icon class="scale-75 text-sm">post_add</mat-icon> Add Single Variant
                        </button>
                      </div>
                    </div>

                    @if (admin.pOptions().length === 0) {
                      <div
                        class="p-8 text-center text-zinc-400 font-bold text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl"
                      >
                        No options configured. Click "Add Option" above to create Color, Size, or Style variations.
                      </div>
                    } @else {
                      <div class="space-y-4">
                        @for (
                          opt of admin.pOptions();
                          track opt.id || opt.name || i;
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
                                (input)="
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
                        <div class="pt-2 flex justify-end">
                          <button
                            (click)="admin.generateVariants()"
                            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase cursor-pointer border-none flex items-center gap-2 shadow-md transition-all"
                          >
                            <mat-icon class="scale-75">auto_awesome</mat-icon> Generate Combination Matrix
                          </button>
                        </div>
                      </div>
                    }
                  </div>

                  <!-- ========================================== -->
                  <!-- LIVE STOREFRONT CUSTOMER PREVIEW WIDGET    -->
                  <!-- ========================================== -->
                  @if (admin.pVariants().length > 0) {
                    <div data-tour="variant-preview" class="space-y-4 p-5 bg-gradient-to-br from-blue-900/10 via-zinc-900/5 to-purple-900/10 dark:from-blue-950/40 dark:to-zinc-900/80 rounded-2xl border border-blue-500/20 dark:border-blue-500/30 shadow-xs">
                      <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 flex-wrap gap-2">
                        <div class="flex items-center gap-2.5">
                          <div class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                            <mat-icon class="scale-75">preview</mat-icon>
                          </div>
                          <div>
                            <h5 class="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">Live Storefront Customer Variant Switcher Preview</h5>
                            <p class="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Verify customer selection experience, pricing changes, and stock badges before saving.</p>
                          </div>
                        </div>
                        <span class="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded-full border border-emerald-500/20">
                          Interactive Simulation
                        </span>
                      </div>

                      @let currentPreview = getMatchedPreviewVariant();
                      <div class="space-y-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <!-- Direct Variant Selector Dropdown -->
                        <div class="flex items-center gap-2 p-2 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/30 flex-wrap">
                          <label class="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <mat-icon class="scale-75">touch_app</mat-icon> Direct Variant Select Dropdown:
                          </label>
                          <select 
                            [value]="currentPreview?.id || currentPreview?.sku || ''"
                            (change)="selectPreviewVariantById($any($event.target).value)"
                            class="flex-1 min-w-[200px] px-3 py-1.5 bg-white dark:bg-zinc-950 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer">
                            @for (v of admin.pVariants(); track v.id || v.sku || $index) {
                              <option [value]="v.id || v.sku">
                                {{ v.name || ('Variant ' + ($index + 1)) }} (SKU: {{ v.sku || 'N/A' }}) - ₹{{ v.salePrice || v.price }} {{ v.stock <= 0 ? '[OUT OF STOCK]' : '[In Stock: ' + v.stock + ']' }}
                              </option>
                            }
                          </select>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                          <!-- Thumbnail Image Preview -->
                          <div class="col-span-1 flex flex-col items-center justify-center p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <div class="w-28 h-28 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center relative">
                              @if (getFirstVariantImageUrl(currentPreview)) {
                                <img [src]="getFirstVariantImageUrl(currentPreview)" alt="Variant Thumbnail" class="w-full h-full object-contain">
                              } @else {
                                <div class="text-center p-2">
                                  <mat-icon class="text-zinc-400 scale-110">image</mat-icon>
                                  <span class="block text-[8px] text-zinc-400 font-mono mt-0.5">No Image URL</span>
                                </div>
                              }
                              @if (currentPreview?.isDefault) {
                                <span class="absolute top-1 left-1 px-1 py-0.5 bg-blue-600 text-white text-[7px] font-black uppercase rounded">Default</span>
                              }
                            </div>
                            <span class="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 mt-1.5 truncate max-w-[160px]">
                              SKU: {{ currentPreview?.sku || admin.pSku() }}
                            </span>
                          </div>

                          <!-- Customer Pickers & Pricing -->
                          <div class="col-span-1 md:col-span-2 space-y-3">
                            <div>
                              <h6 class="text-xs font-black text-zinc-900 dark:text-white truncate">{{ admin.pName() || 'Product Name' }}</h6>
                              <div class="flex items-center gap-2.5 mt-0.5 flex-wrap">
                                <span class="text-base font-black font-mono text-blue-600 dark:text-blue-400">
                                  ₹{{ currentPreview?.salePrice || currentPreview?.price || admin.pSale() || admin.pMrp() }}
                                </span>
                                @if (currentPreview?.price && currentPreview?.salePrice && currentPreview?.price > currentPreview?.salePrice) {
                                  <span class="text-xs font-mono line-through text-zinc-400">
                                    ₹{{ currentPreview.price }}
                                  </span>
                                  <span class="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-bold rounded">
                                    SAVE ₹{{ currentPreview.price - currentPreview.salePrice }}
                                  </span>
                                }

                                <!-- Stock Status Badge -->
                                @if (currentPreview?.isActive === false) {
                                  <span class="px-2 py-0.5 bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-[9px] font-black uppercase rounded-md">
                                    Disabled / Draft
                                  </span>
                                } @else if ((currentPreview?.stock || 0) > 0) {
                                  <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded-md flex items-center gap-1">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    In Stock ({{ currentPreview.stock }} available)
                                  </span>
                                } @else {
                                  <span class="px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-black uppercase rounded-md">
                                    Out of Stock
                                  </span>
                                }
                              </div>
                            </div>

                            <!-- Interactive Option Pickers & Dropdowns -->
                            @if (admin.pOptions().length > 0) {
                              <div class="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                @for (opt of admin.pOptions(); track opt.name || $index; let idx = $index) {
                                  @let optLabel = opt.name || ('Option #' + (idx + 1));
                                  @let valList = admin.getOptionValuesString(opt);
                                  @if (valList) {
                                    <div class="space-y-1">
                                      <div class="flex items-center justify-between gap-2">
                                        <span class="block text-[9px] font-black text-zinc-400 uppercase tracking-wider">
                                          Select {{ optLabel }}: 
                                          <span class="text-zinc-900 dark:text-white font-bold">{{ selectedPreviewOptionValues()[optLabel] || selectedPreviewOptionValues()[opt.name] || 'None' }}</span>
                                        </span>
                                        <select
                                          [value]="selectedPreviewOptionValues()[optLabel] || selectedPreviewOptionValues()[opt.name] || ''"
                                          (change)="selectPreviewOption(optLabel, $any($event.target).value)"
                                          class="px-2 py-0.5 text-[10px] font-bold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-md outline-none text-zinc-800 dark:text-zinc-200 focus:border-blue-500 cursor-pointer">
                                          <option value="">Choose {{ optLabel }}...</option>
                                          @for (val of valList.split(','); track val) {
                                            @let cleanVal = val.trim();
                                            @if (cleanVal) {
                                              <option [value]="cleanVal">{{ cleanVal }}</option>
                                            }
                                          }
                                        </select>
                                      </div>

                                      <div class="flex flex-wrap gap-1.5">
                                        @for (val of valList.split(','); track val) {
                                          @let cleanVal = val.trim();
                                          @if (cleanVal) {
                                            <button 
                                              type="button"
                                              (click)="selectPreviewOption(optLabel, cleanVal)"
                                              [class.bg-blue-600]="selectedPreviewOptionValues()[optLabel] === cleanVal || selectedPreviewOptionValues()[opt.name] === cleanVal"
                                              [class.text-white]="selectedPreviewOptionValues()[optLabel] === cleanVal || selectedPreviewOptionValues()[opt.name] === cleanVal"
                                              [class.border-blue-600]="selectedPreviewOptionValues()[optLabel] === cleanVal || selectedPreviewOptionValues()[opt.name] === cleanVal"
                                              [class.bg-zinc-100]="selectedPreviewOptionValues()[optLabel] !== cleanVal && selectedPreviewOptionValues()[opt.name] !== cleanVal"
                                              [class.dark:bg-zinc-800]="selectedPreviewOptionValues()[optLabel] !== cleanVal && selectedPreviewOptionValues()[opt.name] !== cleanVal"
                                              [class.text-zinc-800]="selectedPreviewOptionValues()[optLabel] !== cleanVal && selectedPreviewOptionValues()[opt.name] !== cleanVal"
                                              [class.dark:text-zinc-200]="selectedPreviewOptionValues()[optLabel] !== cleanVal && selectedPreviewOptionValues()[opt.name] !== cleanVal"
                                              class="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-all">
                                              {{ cleanVal }}
                                            </button>
                                          }
                                        }
                                      </div>
                                    </div>
                                  }
                                }
                              </div>
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  }

                  <!-- Variants Matrix Grid -->
                  <div
                    class="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5">
                        <h4
                          class="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider"
                        >
                          Combinations Matrix ({{ admin.pVariants().length }})
                        </h4>
                        <div class="group relative flex items-center cursor-help">
                          <mat-icon class="scale-75 text-zinc-400 group-hover:text-blue-500 transition-colors">info</mat-icon>
                          <div class="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2.5 bg-zinc-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none border border-zinc-700">
                            Preloaded SKU variant table. Click star to set default storefront variant. Toggle active status or edit prices directly.
                          </div>
                        </div>
                      </div>
                      <button type="button" (click)="addCustomVariant()" class="px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-500 rounded-lg text-[10px] font-black uppercase cursor-pointer border-none flex items-center gap-1 shadow-xs">
                        <mat-icon class="scale-75">add</mat-icon> Add Variant Row
                      </button>
                    </div>

                    @if (admin.pVariants().length === 0) {
                      <div
                        class="p-8 text-center text-zinc-400 font-bold text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl"
                      >
                        No variants generated yet.
                      </div>
                    } @else {
                      <div class="overflow-x-auto max-h-[500px] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
                        <table
                          class="w-full text-left border-collapse text-xs whitespace-nowrap"
                        >
                          <thead
                            class="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-black tracking-widest uppercase sticky top-0 z-10 text-[9px]"
                          >
                            <tr>
                              <th class="p-3 w-28">Status / Default</th>
                              <th class="p-3">Variant Name</th>
                              <th class="p-3 w-32">SKU Barcode</th>
                              <th class="p-3 w-24" data-tour="variant-pricing">MRP (₹)</th>
                              <th class="p-3 w-24">Sale (₹)</th>
                              <th class="p-3 w-20" data-tour="variant-stock">Stock</th>
                              <th class="p-3 w-16 text-center">Action</th>
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
                              <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors" [class.opacity-60]="variant.isActive === false">
                                <td class="p-3">
                                  <div class="flex items-center gap-1.5">
                                    <button 
                                      type="button" 
                                      (click)="setDefaultVariant(vIdx)" 
                                      [title]="variant.isDefault ? 'Default Variant' : 'Click to set as default variant'"
                                      class="p-1 rounded-lg border cursor-pointer transition-colors"
                                      [class.bg-blue-600]="variant.isDefault"
                                      [class.text-white]="variant.isDefault"
                                      [class.border-blue-600]="variant.isDefault"
                                      [class.bg-zinc-100]="!variant.isDefault"
                                      [class.dark:bg-zinc-800]="!variant.isDefault"
                                      [class.text-zinc-400]="!variant.isDefault"
                                      [class.border-zinc-300]="!variant.isDefault"
                                      [class.dark:border-zinc-700]="!variant.isDefault">
                                      <mat-icon class="scale-75">star</mat-icon>
                                    </button>
                                    <button 
                                      type="button" 
                                      (click)="toggleVariantStatus(vIdx)" 
                                      [title]="variant.isActive !== false ? 'Active (Click to Disable)' : 'Inactive (Click to Enable)'"
                                      class="px-2 py-0.5 text-[9px] font-black uppercase rounded-md border cursor-pointer transition-colors"
                                      [class.bg-emerald-600]="variant.isActive !== false"
                                      [class.text-white]="variant.isActive !== false"
                                      [class.border-emerald-600]="variant.isActive !== false"
                                      [class.bg-zinc-200]="variant.isActive === false"
                                      [class.text-zinc-600]="variant.isActive === false"
                                      [class.dark:bg-zinc-800]="variant.isActive === false"
                                      [class.dark:text-zinc-400]="variant.isActive === false"
                                      [class.border-zinc-300]="variant.isActive === false">
                                      {{ variant.isActive !== false ? 'Active' : 'Off' }}
                                    </button>
                                  </div>
                                </td>
                                <td
                                  class="p-3 font-bold text-zinc-900 dark:text-white"
                                >
                                  {{ variant.name }}
                                </td>
                                <td class="p-2">
                                  <input
                                    type="text"
                                    [(ngModel)]="variant.sku"
                                    (ngModelChange)="admin.updateVariants()"
                                    class="w-full px-2 py-1 text-xs font-mono border border-zinc-200 dark:border-zinc-800 bg-transparent rounded outline-none focus:ring-1 ring-blue-500"
                                  />
                                </td>
                                <td class="p-2">
                                  <input
                                    type="number"
                                    [(ngModel)]="variant.price"
                                    (ngModelChange)="admin.updateVariants()"
                                    class="w-full px-2 py-1 text-xs font-mono border border-zinc-200 dark:border-zinc-800 bg-transparent rounded outline-none focus:ring-1 ring-blue-500"
                                  />
                                </td>
                                <td class="p-2">
                                  <input
                                    type="number"
                                    [(ngModel)]="variant.salePrice"
                                    (ngModelChange)="admin.updateVariants()"
                                    class="w-full px-2 py-1 text-xs font-mono border border-zinc-200 dark:border-zinc-800 bg-transparent rounded outline-none focus:ring-1 ring-blue-500"
                                  />
                                </td>
                                <td class="p-2">
                                  <input
                                    type="number"
                                    [(ngModel)]="variant.stock"
                                    (ngModelChange)="admin.updateVariants()"
                                    class="w-full px-2 py-1 text-xs font-mono border border-zinc-200 dark:border-zinc-800 bg-transparent rounded outline-none focus:ring-1 ring-blue-500"
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
                                      (click)="removeVariant(vIdx)"
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
                    <div class="flex items-center gap-2">
                      <input #headerDocUpload type="file" multiple class="hidden" (change)="handleDocumentUploadForRow($event)" />
                      <button
                        (click)="headerDocUpload.click()"
                        class="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                      >
                        <mat-icon class="scale-75">cloud_upload</mat-icon> Upload Document
                      </button>
                      <button
                        (click)="admin.addDownload()"
                        class="text-[10px] bg-blue-500 hover:bg-blue-600 text-white font-bold uppercase px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                      >
                        <mat-icon class="scale-75">add</mat-icon> Add Row
                      </button>
                    </div>
                  </div>
                  @if (admin.pDownloads().length === 0) {
                    <div
                      (click)="headerDocUpload.click()"
                      class="p-8 text-center text-zinc-400 font-bold text-xs border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl cursor-pointer bg-zinc-50/50 dark:bg-zinc-950/50 transition-all flex flex-col items-center justify-center gap-2"
                    >
                      <mat-icon class="text-3xl text-zinc-400">cloud_upload</mat-icon>
                      <div>
                        <p class="text-zinc-700 dark:text-zinc-300 font-semibold">No downloads or manuals added yet.</p>
                        <p class="text-[11px] text-zinc-400 font-normal mt-0.5">Click here to upload PDF, DOCX, ZIP, or 3D files (Max 25MB)</p>
                      </div>
                    </div>
                  } @else {
                    <div class="space-y-3">
                      @for (
                        dl of admin.pDownloads();
                        track $index;
                        let i = $index
                      ) {
                        <div class="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
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
                            class="w-1/3 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
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
                            placeholder="File URL (https://... or uploaded file)"
                            class="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-zinc-900 dark:text-white"
                          />
                          <input #rowDocUpload type="file" class="hidden" (change)="handleDocumentUploadForRow($event, i)" />
                          <button
                            (click)="rowDocUpload.click()"
                            class="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-indigo-200 dark:border-indigo-800/50"
                            title="Upload Document File"
                          >
                            <mat-icon class="text-sm">cloud_upload</mat-icon>
                            <span>Upload</span>
                          </button>
                          <button
                            (click)="admin.removeDownload(i)"
                            class="text-red-400 hover:text-red-500 p-2 cursor-pointer bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded-lg shrink-0 border border-red-100 dark:border-red-900/40"
                            title="Remove Document"
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
                  class="space-y-5 animate-fadeIn"
                >
                  <div class="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-5">
                    <!-- Product Weight (g) -->
                    <div class="space-y-2 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-amber-200/80 dark:border-amber-900/50 shadow-xs">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <mat-icon class="text-sm text-amber-500">scale</mat-icon> Product Weight
                        </span>
                        <span class="text-[10px] font-mono text-zinc-400 uppercase font-bold">Internal Unit: Grams (g)</span>
                      </div>
                      <div class="relative">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          [value]="admin.pWeightInGrams()"
                          (input)="admin.pWeightInGrams.set(+$any($event.target).value)"
                          placeholder="Enter weight in grams (e.g. 750)"
                          class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono font-black text-zinc-900 dark:text-white outline-none focus:border-amber-500 pr-12"
                        />
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-amber-500">g</span>
                      </div>
                      <div class="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
                        <span>Weight is used for dynamic category/default weight-range shipping calculations.</span>
                        <span class="font-bold text-zinc-600 dark:text-zinc-300">
                          Display: {{ admin.pWeightInGrams() >= 1000 ? (admin.pWeightInGrams() / 1000).toFixed(2) + ' kg' : admin.pWeightInGrams() + ' g' }}
                        </span>
                      </div>
                    </div>

                    <!-- Shipping Mode Hierarchy Selector -->
                    <div class="space-y-2">
                      <label class="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Shipping Configuration Mode</label>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                          type="button"
                          (click)="admin.pShippingMode.set('product_specific')"
                          [class]="admin.pShippingMode() === 'product_specific' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'"
                          class="p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1"
                        >
                          <span class="text-xs font-black flex items-center gap-1">
                            <mat-icon class="text-sm">local_shipping</mat-icon> Product Specific
                          </span>
                          <span class="text-[9px] opacity-80">Priority 1: Explicit fee or Free for this item</span>
                        </button>

                        <button
                          type="button"
                          (click)="admin.pShippingMode.set('category_based')"
                          [class]="admin.pShippingMode() === 'category_based' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'"
                          class="p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1"
                        >
                          <span class="text-xs font-black flex items-center gap-1">
                            <mat-icon class="text-sm">category</mat-icon> Category Based
                          </span>
                          <span class="text-[9px] opacity-80">Priority 2: Apply category weight/flat rules</span>
                        </button>

                        <button
                          type="button"
                          (click)="admin.pShippingMode.set('default')"
                          [class]="admin.pShippingMode() === 'default' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'"
                          class="p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1"
                        >
                          <span class="text-xs font-black flex items-center gap-1">
                            <mat-icon class="text-sm">settings</mat-icon> Default Shipping
                          </span>
                          <span class="text-[9px] opacity-80">Priority 3: Fallback to global settings</span>
                        </button>
                      </div>
                    </div>

                    <!-- Product-Specific Fields -->
                    @if (admin.pShippingMode() === 'product_specific') {
                      <div class="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-4 animate-fadeIn">
                        <div class="flex items-center justify-between">
                          <span class="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                            <mat-icon class="text-sm">tune</mat-icon> Product-Specific Shipping Settings
                          </span>
                          <label class="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              [checked]="admin.pFreeShippingEligible()"
                              (change)="admin.pFreeShippingEligible.set($any($event.target).checked)"
                              class="rounded text-blue-500 h-4 w-4"
                            />
                            <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">Free Shipping Eligible</span>
                          </label>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div class="space-y-1">
                            <span class="block text-[9px] font-black text-zinc-400 uppercase">Product Shipping Charge (₹)</span>
                            <input
                              type="number"
                              [value]="admin.pBaseShippingCharge()"
                              (input)="admin.pBaseShippingCharge.set(+$any($event.target).value)"
                              placeholder="e.g. 200"
                              class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                            />
                          </div>

                          <div class="space-y-1">
                            <span class="block text-[9px] font-black text-zinc-400 uppercase">Estimated Delivery Days</span>
                            <input
                              type="text"
                              [value]="admin.pEstimatedDeliveryDaysInput()"
                              (input)="admin.pEstimatedDeliveryDaysInput.set($any($event.target).value)"
                              placeholder="Default: 3"
                              class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    }

                    <!-- Dynamic Live Shipping Engine Preview Box -->
                    <div class="p-4 bg-linear-to-r from-blue-50/60 to-purple-50/60 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl border border-blue-200/80 dark:border-blue-900/40 space-y-2">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                          <mat-icon class="text-sm text-blue-500 animate-pulse">visibility</mat-icon> Live Shipping Engine Preview
                        </span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                          {{ admin.productShippingPreview().source }}
                        </span>
                      </div>

                      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                        <div class="p-2.5 bg-white/80 dark:bg-zinc-900/80 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
                          <span class="block text-[9px] text-zinc-400 font-bold uppercase">Weight</span>
                          <span class="font-mono font-black text-zinc-900 dark:text-white">
                            {{ admin.pWeightInGrams() >= 1000 ? (admin.pWeightInGrams() / 1000).toFixed(2) + ' kg' : admin.pWeightInGrams() + ' g' }}
                          </span>
                        </div>

                        <div class="p-2.5 bg-white/80 dark:bg-zinc-900/80 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
                          <span class="block text-[9px] text-zinc-400 font-bold uppercase">Applied Rule</span>
                          <span class="font-bold text-zinc-900 dark:text-white truncate block" [title]="admin.productShippingPreview().appliedRule.name || ''">
                            {{ admin.productShippingPreview().appliedRule.name || 'Default' }}
                          </span>
                        </div>

                        <div class="p-2.5 bg-white/80 dark:bg-zinc-900/80 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
                          <span class="block text-[9px] text-zinc-400 font-bold uppercase">Effective Charge</span>
                          <span class="font-black" [class.text-emerald-500]="admin.productShippingPreview().charge === 0" [class.text-zinc-900]="admin.productShippingPreview().charge > 0" [class.dark:text-white]="admin.productShippingPreview().charge > 0">
                            {{ admin.productShippingPreview().charge === 0 ? 'FREE' : '₹' + admin.productShippingPreview().charge }}
                          </span>
                        </div>

                        <div class="p-2.5 bg-white/80 dark:bg-zinc-900/80 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
                          <span class="block text-[9px] text-zinc-400 font-bold uppercase">Estimated Delivery</span>
                          <span class="font-bold text-zinc-900 dark:text-white">
                            {{ admin.productShippingPreview().estimatedDays }} Days
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- General Delivery & COD Settings -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div class="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                        <input
                          type="checkbox"
                          id="codAvailable"
                          [checked]="admin.pCodAvailable()"
                          (change)="admin.pCodAvailable.set($any($event.target).checked)"
                          class="w-4 h-4 text-blue-500 rounded border-zinc-300 dark:border-zinc-800 cursor-pointer"
                        />
                        <label for="codAvailable" class="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                          Cash on Delivery (COD) Available
                        </label>
                      </div>

                      <div class="space-y-1">
                        <span class="block text-[9px] font-black text-zinc-400 uppercase">Shipping Regions</span>
                        <input
                          type="text"
                          [value]="admin.pShipping().shippingRegions || 'Pan India'"
                          (input)="admin.updateShippingRegions($any($event.target).value)"
                          placeholder="e.g. Pan India / Selected Zones"
                          class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
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
                class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-x-auto no-scrollbar shadow-xs"
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
                    @for (p of paginatedProducts(); track p.id) {
                      <tr
                        class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 font-semibold text-zinc-900 dark:text-zinc-100 transition-colors"
                      >
                        <td class="py-4">
                          <div class="flex items-center gap-3">
                            <div class="relative shrink-0">
                              <img
                                [src]="
                                  (p.images && p.images[0]?.url) ||
                                  (p.images && p.images[0]) ||
                                  'https://picsum.photos/100/100'
                                "
                                alt="Product thumbnail"
                                class="h-10 w-10 object-contain bg-zinc-50 dark:bg-zinc-950 rounded-xl border dark:border-zinc-800"
                                referrerpolicy="no-referrer"
                              />
                              @if (p.stock === 0) {
                                <span class="absolute -top-1 -right-1 bg-red-600 text-white text-[7px] font-black uppercase px-1 rounded shadow">OUT</span>
                              }
                            </div>
                            <div class="min-w-0">
                              <p
                                class="font-black uppercase text-zinc-900 dark:text-white truncate max-w-[240px] block"
                                [title]="p.name"
                              >
                                {{ p.name }}
                              </p>
                              <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span class="text-[9px] text-zinc-400 dark:text-zinc-550 font-mono tracking-wide uppercase">
                                  {{ p.brand }}
                                </span>
                                <!-- Offers Badges & Tags -->
                                @if (getOfferDiscountPercent(p) > 0) {
                                  <span class="px-1.5 py-0.2 bg-red-500/10 text-red-500 border border-red-500/20 text-[8px] font-black rounded uppercase">
                                    {{ getOfferDiscountPercent(p) }}% OFF
                                  </span>
                                }
                                @if (getOfferSavings(p) >= 100) {
                                  <span class="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[8px] font-black rounded uppercase">
                                    SAVE ₹{{ getOfferSavings(p) }}
                                  </span>
                                }
                                @if (p.freeShippingEligible) {
                                  <span class="px-1.5 py-0.2 bg-teal-500/10 text-teal-500 border border-teal-500/20 text-[8px] font-black rounded uppercase">
                                    FREE SHIP
                                  </span>
                                }
                                @if (p.codAvailable) {
                                  <span class="px-1.5 py-0.2 bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[8px] font-black rounded uppercase">
                                    COD
                                  </span>
                                }
                                @if (p.featured || p.isFeatured) {
                                  <span class="px-1.5 py-0.2 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-black rounded uppercase">
                                    FEATURED
                                  </span>
                                }
                                @if (p.isExclusive) {
                                  <span class="px-1.5 py-0.2 bg-purple-500/10 text-purple-500 border border-purple-500/20 text-[8px] font-black rounded uppercase">
                                    EXCLUSIVE
                                  </span>
                                }
                                @if (p.stock === 0) {
                                  <span class="px-1.5 py-0.2 bg-rose-600 text-white text-[8px] font-black rounded uppercase">
                                    OUT OF STOCK
                                  </span>
                                }
                              </div>
                              <!-- Variant Accordion Badge Indicator -->
                              @if (getProductVariantsCount(p) > 0) {
                                <button
                                  type="button"
                                  (click)="toggleExpandVariants(p)"
                                  class="mt-1 px-2 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-md text-[9px] font-mono font-black uppercase inline-flex items-center gap-1 transition-colors border-none cursor-pointer"
                                  [title]="'View ' + getProductVariantsCount(p) + ' Variants'"
                                >
                                  <span>{{ getProductVariantsCount(p) }} VARIANTS</span>
                                  <mat-icon class="text-xs w-3 h-3 flex items-center justify-center transition-transform" [class.rotate-180]="expandedProductIds().has(p.id)">
                                    expand_more
                                  </mat-icon>
                                </button>
                              }
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

                        <!-- STOCK REMAINING (Inline Edit vs Display) -->
                        <td class="py-4">
                          @if (quickEditingProductId() === p.id) {
                            <div class="relative w-24">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                [value]="quickEditForm().stock"
                                (input)="updateQuickEditFormField('stock', $any($event.target).value)"
                                class="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-blue-500 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none"
                                placeholder="Qty"
                              />
                            </div>
                          } @else {
                            @if (p.stock === 0) {
                              <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1.5 bg-rose-500/15 text-rose-600 border border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400">
                                <span class="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                OUT OF STOCK (0 units)
                              </span>
                            } @else if (p.stock <= 10) {
                              <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-600 border border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400">
                                <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                LOW STOCK ({{ p.stock }} units)
                              </span>
                            } @else {
                              <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400">
                                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                IN STOCK ({{ p.stock }} units)
                              </span>
                            }
                          }
                        </td>

                        <!-- RETAIL COST (Inline Edit vs Display) -->
                        <td class="py-4 font-mono font-bold">
                          @if (quickEditingProductId() === p.id) {
                            <div class="relative w-28">
                              <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-zinc-400">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                [value]="quickEditForm().salePrice"
                                (input)="updateQuickEditFormField('salePrice', $any($event.target).value)"
                                class="w-full pl-6 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-blue-500 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none"
                              />
                            </div>
                          } @else {
                            ₹{{ (p.sale_price || p.salePrice || 0) | number }}
                          }
                        </td>

                        <!-- DEALER PRICING (Inline Edit vs Display) -->
                        <td class="py-4 font-mono text-emerald-500 font-bold">
                          @if (quickEditingProductId() === p.id) {
                            <div class="relative w-28">
                              <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-zinc-400">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                [value]="quickEditForm().dealerPrice"
                                (input)="updateQuickEditFormField('dealerPrice', $any($event.target).value)"
                                class="w-full pl-6 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-blue-500 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none"
                              />
                            </div>
                          } @else {
                            ₹{{ (p.dealer_price || p.dealerPrice || 0) | number }}
                          }
                        </td>

                        <!-- ACTIONS COLUMN -->
                        <td class="py-4 text-right">
                          @if (quickEditingProductId() === p.id) {
                            <div class="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                (click)="saveQuickEditProduct(p)"
                                [disabled]="isQuickSavingProduct()"
                                class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase transition-all border-none cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                                title="Save Changes"
                              >
                                <mat-icon class="text-xs w-3.5 h-3.5 flex items-center justify-center">done</mat-icon>
                                <span>{{ isQuickSavingProduct() ? 'Saving...' : 'Save' }}</span>
                              </button>
                              <button
                                type="button"
                                (click)="cancelQuickEditProduct()"
                                [disabled]="isQuickSavingProduct()"
                                class="px-2.5 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold uppercase transition-all border-none cursor-pointer flex items-center gap-1"
                                title="Cancel Changes"
                              >
                                <mat-icon class="text-xs w-3.5 h-3.5 flex items-center justify-center">close</mat-icon>
                                <span>Cancel</span>
                              </button>
                            </div>
                          } @else {
                            <div class="inline-flex gap-1.5">
                              <button
                                (click)="startQuickEditProduct(p)"
                                class="h-8 w-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors inline-flex items-center justify-center cursor-pointer border-none bg-transparent"
                                [title]="getProductVariantsCount(p) > 0 ? 'Quick Edit Variants in Popup' : 'Quick Edit Price & Stock'"
                              >
                                <mat-icon class="text-[18px] w-[18px] h-[18px] flex items-center justify-center">bolt</mat-icon>
                              </button>
                              <button
                                (click)="admin.startProductEdit(p)"
                                class="h-8 w-8 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-955 transition-colors inline-flex items-center justify-center cursor-pointer border-none bg-transparent"
                                title="Edit Product Details"
                              >
                                <mat-icon class="text-[18px] w-[18px] h-[18px] flex items-center justify-center">edit</mat-icon>
                              </button>
                              <button
                                (click)="admin.deleteProduct(p.id)"
                                [disabled]="admin.isDeletingProduct()"
                                class="h-8 w-8 rounded-lg text-red-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-955 transition-colors inline-flex items-center justify-center cursor-pointer border-none bg-transparent disabled:opacity-40"
                                title="Delete SKU"
                              >
                                <mat-icon class="text-[18px] w-[18px] h-[18px] flex items-center justify-center">delete_outline</mat-icon>
                              </button>
                            </div>
                          }
                        </td>
                      </tr>

                      <!-- EXPANDABLE VARIANT ACCORDION ROW -->
                      @if (expandedProductIds().has(p.id)) {
                        <tr class="bg-zinc-50/70 dark:bg-zinc-950/70 animate-fadeIn">
                          <td colspan="7" class="p-4 sm:p-6">
                            <div class="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-xs">
                              <div class="flex items-center justify-between border-b dark:border-zinc-800 pb-2.5">
                                <div class="flex items-center gap-2">
                                  <mat-icon class="text-blue-500 text-sm">view_module</mat-icon>
                                  <span class="text-xs font-black uppercase text-zinc-900 dark:text-white tracking-wider">
                                    Variants for {{ p.name }} ({{ getProductVariantsList(p).length }})
                                  </span>
                                </div>
                                <span class="text-[10px] font-mono text-zinc-400 font-medium">Click ✏️ on any variant row to quick edit price & stock</span>
                              </div>

                              @if (loadingVariantsProductIds().has(p.id)) {
                                <div class="py-6 text-center text-xs text-zinc-400 font-mono animate-pulse">
                                  Loading variants data...
                                </div>
                              } @else if (getProductVariantsList(p).length === 0) {
                                <div class="py-6 text-center text-xs text-zinc-400 font-medium">
                                  No variants configured for this product.
                                </div>
                              } @else {
                                <div class="overflow-x-auto">
                                  <table class="w-full text-left text-xs whitespace-nowrap">
                                    <thead>
                                      <tr class="text-[9px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800">
                                        <th class="py-2.5 px-3">Variant</th>
                                        <th class="py-2.5 px-3">SKU</th>
                                        <th class="py-2.5 px-3">Price</th>
                                        <th class="py-2.5 px-3">Stock</th>
                                        <th class="py-2.5 px-3">Status</th>
                                        <th class="py-2.5 px-3 text-right">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                                      @for (v of getProductVariantsList(p); track (v.id || v.sku)) {
                                        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                                          <td class="py-3 px-3 font-sans font-bold text-zinc-900 dark:text-white">
                                            {{ getVariantDisplayName(v) }}
                                          </td>
                                          <td class="py-3 px-3 text-zinc-500 text-[10px]">
                                            {{ v.sku || 'N/A' }}
                                          </td>
                                          <td class="py-3 px-3 font-bold">
                                            @if (quickEditingVariantId() === v.id) {
                                              <div class="relative w-24">
                                                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  step="0.01"
                                                  [value]="quickEditVariantForm().price"
                                                  (input)="updateQuickEditVariantFormField('price', $any($event.target).value)"
                                                  class="w-full pl-6 pr-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-blue-500 rounded-md text-xs font-mono font-bold outline-none text-zinc-900 dark:text-white"
                                                />
                                              </div>
                                            } @else {
                                              ₹{{ (v.price || v.salePrice || 0) | number }}
                                            }
                                          </td>
                                          <td class="py-3 px-3">
                                            @if (quickEditingVariantId() === v.id) {
                                              <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                [value]="quickEditVariantForm().stock"
                                                (input)="updateQuickEditVariantFormField('stock', $any($event.target).value)"
                                                class="w-20 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-blue-500 rounded-md text-xs font-mono font-bold outline-none text-zinc-900 dark:text-white"
                                              />
                                            } @else {
                                              <span>{{ v.stock || 0 }}</span>
                                            }
                                          </td>
                                          <td class="py-3 px-3">
                                            @if (v.stock === 0) {
                                              <span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">OUT OF STOCK</span>
                                            } @else if (v.stock <= 5) {
                                              <span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">LOW STOCK ({{ v.stock }})</span>
                                            } @else {
                                              <span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">IN STOCK ({{ v.stock }})</span>
                                            }
                                          </td>
                                          <td class="py-3 px-3 text-right">
                                            @if (quickEditingVariantId() === v.id) {
                                              <div class="inline-flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  (click)="saveQuickEditVariant(p, v)"
                                                  [disabled]="isQuickSavingVariant()"
                                                  class="px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[10px] font-black uppercase cursor-pointer border-none"
                                                  title="Save Variant"
                                                >
                                                  {{ isQuickSavingVariant() ? '...' : '✓ Save' }}
                                                </button>
                                                <button
                                                  type="button"
                                                  (click)="cancelQuickEditVariant()"
                                                  [disabled]="isQuickSavingVariant()"
                                                  class="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md text-[10px] font-black uppercase cursor-pointer border-none"
                                                  title="Cancel"
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                            } @else {
                                              <button
                                                type="button"
                                                (click)="startQuickEditVariant(v)"
                                                class="h-7 w-7 rounded-md text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 inline-flex items-center justify-center cursor-pointer border-none bg-transparent"
                                                title="Edit Variant Price & Stock"
                                              >
                                                <mat-icon class="text-sm">edit</mat-icon>
                                              </button>
                                            }
                                          </td>
                                        </tr>
                                      }
                                    </tbody>
                                  </table>
                                </div>
                              }
                            </div>
                          </td>
                        </tr>
                      }
                    } @empty {
                      <tr>
                        <td
                          colspan="7"
                          class="py-8 text-center text-zinc-400 font-sans font-medium uppercase tracking-wide"
                        >
                          No matches found in catalog.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>

                <!-- Pagination Footer -->
                <div
                  class="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-6 mt-4 flex-wrap gap-4"
                >
                  <div class="flex items-center gap-4 flex-wrap">
                    <p class="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Showing
                      <span class="font-semibold text-zinc-900 dark:text-white">{{
                        paginatedProducts().length
                          ? (currentPageValid() - 1) * itemsPerPage() + 1
                          : 0
                      }}</span>
                      to
                      <span class="font-semibold text-zinc-900 dark:text-white">{{
                        (currentPageValid() - 1) * itemsPerPage() + paginatedProducts().length
                      }}</span>
                      of
                      <span class="font-semibold text-zinc-900 dark:text-white">{{
                        filteredProducts().length
                      }}</span>
                      products
                    </p>
                    
                    <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block"></div>

                    <div class="flex items-center gap-2">
                      <span class="text-xs text-zinc-550 dark:text-zinc-450 font-medium">Per page</span>
                      <select
                        [value]="itemsPerPage()"
                        (change)="
                          itemsPerPage.set(Number($any($event.target).value));
                          currentPage.set(1)
                        "
                        class="text-xs font-semibold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                      >
                        @for (option of itemsPerPageOptions; track option) {
                          <option [value]="option">{{ option }}</option>
                        }
                      </select>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <button
                      (click)="setPage(currentPageValid() - 1)"
                      [disabled]="currentPageValid() === 1"
                      class="h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center justify-center bg-transparent"
                      title="Previous Page"
                    >
                      <mat-icon class="text-lg">chevron_left</mat-icon>
                    </button>

                    @for (page of visiblePages(); track $index) {
                      @if (page === '...') {
                        <span class="h-9 w-9 flex items-center justify-center text-zinc-400 font-medium text-xs select-none">
                          ...
                        </span>
                      } @else {
                        <button
                          (click)="setPage($any(page))"
                          [class]="
                            page === currentPageValid()
                              ? 'h-9 w-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 cursor-pointer border-none'
                              : 'h-9 w-9 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-xs font-medium transition cursor-pointer bg-transparent border-none'
                          "
                        >
                          {{ page }}
                        </button>
                      }
                    }

                    <button
                      (click)="setPage(currentPageValid() + 1)"
                      [disabled]="currentPageValid() === totalPages()"
                      class="h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center justify-center bg-transparent"
                      title="Next Page"
                    >
                      <mat-icon class="text-lg">chevron_right</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- ========================= TAB: CATEGORIES (SHOPIFY COLLECTION STYLE) ========================= -->
      @if (admin.activeTab() === "categories") {
        <div class="space-y-6 font-sans">
          
          <!-- TOP ACTION BAR -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs">
            <div>
              <div class="flex items-center gap-2.5">
                <h1 class="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white font-display">
                  Taxonomy & Collection Manager
                </h1>
                <span class="px-3 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-mono font-black rounded-full border border-orange-500/20">
                  {{ admin.ds.categories().length }} Collections
                </span>
              </div>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Explore taxonomy hierarchy, view linked collection products, manage SEO metadata and product assignments.
              </p>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <button
                (click)="openCreateCategoryModal()"
                class="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none shadow-md shadow-orange-500/20 active:scale-95"
              >
                <mat-icon class="text-sm">add_circle</mat-icon>
                <span>New Category</span>
              </button>

              <button
                (click)="exportCategoriesCsv()"
                class="px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none shadow-xs"
              >
                <mat-icon class="text-sm">download</mat-icon>
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <!-- MAIN 2-COLUMN LAYOUT: 30% LEFT TREE, 70% RIGHT COLLECTION DETAIL -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

            <!-- LEFT PANEL (30% -> lg:col-span-4): TAXONOMY EXPLORER TREE -->
            <div class="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xs">
              <div class="flex items-center justify-between border-b dark:border-zinc-800 pb-3">
                <div>
                  <h3 class="text-xs font-mono font-black text-zinc-400 uppercase tracking-widest">
                    Taxonomy Tree
                  </h3>
                  <span class="text-[11px] font-bold text-zinc-500">
                    {{ sortedCategories().length }} Categories
                  </span>
                </div>
                <button
                  (click)="openCreateCategoryModal()"
                  class="text-xs font-bold text-orange-500 hover:underline cursor-pointer flex items-center gap-1 border-none bg-transparent"
                >
                  <mat-icon class="text-xs">add</mat-icon>
                  <span>Add New</span>
                </button>
              </div>

              <!-- Search input -->
              <div class="relative">
                <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">search</mat-icon>
                <input
                  type="text"
                  [value]="categorySearchQuery()"
                  (input)="categorySearchQuery.set($any($event.target).value)"
                  placeholder="Search taxonomy..."
                  class="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                />
                @if (categorySearchQuery()) {
                  <button (click)="categorySearchQuery.set('')" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 border-none bg-transparent cursor-pointer">
                    <mat-icon class="text-sm">close</mat-icon>
                  </button>
                }
              </div>

              <!-- Category List Tree -->
              <div class="max-h-[650px] overflow-y-auto pr-1 space-y-1.5 no-scrollbar">
                @for (c of sortedCategories(); track c.id) {
                  <div
                    (click)="selectCategory(c.id)"
                    (dragover)="onCategoryDragOver($event, c.id)"
                    (dragleave)="onCategoryDragLeave($event, c.id)"
                    (drop)="onCategoryDrop($event, c)"
                    class="group p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 relative"
                    [ngClass]="{
                      'border-2 border-dashed border-orange-500 bg-orange-500/20 text-orange-600 dark:text-orange-400 scale-[1.02] shadow-lg z-10': (draggedOverCategoryId() === c.id),
                      'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400 shadow-xs font-black': (selectedCategory()?.id === c.id && draggedOverCategoryId() !== c.id),
                      'bg-zinc-50/50 dark:bg-zinc-950/40 border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200': (selectedCategory()?.id !== c.id && draggedOverCategoryId() !== c.id)
                    }"
                    [style.padding-left.px]="10 + (c.level * 14)"
                  >
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                      @if (c.level > 0) {
                        <span class="text-zinc-400 font-mono text-[10px] shrink-0">└─</span>
                      }
                      <div class="h-7 w-7 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center">
                        @if (c.image) {
                          <img [src]="c.image" [alt]="c.name" class="h-full w-full object-contain" />
                        } @else {
                          <mat-icon class="text-xs text-orange-500">{{ c.icon || 'folder' }}</mat-icon>
                        }
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-extrabold truncate uppercase font-display leading-tight">
                          {{ c.name }}
                        </p>
                        @if (c.level > 1) {
                          <p class="text-[9px] text-zinc-400 truncate font-mono">{{ c.path }}</p>
                        }
                      </div>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">
                      @if (draggedOverCategoryId() === c.id) {
                        <span class="px-2 py-0.5 bg-orange-500 text-white font-mono text-[9px] font-black rounded-full shadow-md animate-pulse">
                          Drop to Move
                        </span>
                      } @else {
                        <span class="px-2 py-0.5 bg-zinc-200/60 dark:bg-zinc-800 font-mono text-[10px] font-black rounded-full text-zinc-600 dark:text-zinc-400">
                          {{ getProductCount(c.id) }}
                        </span>

                        <span
                          [class]="c.isActive !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500'"
                          class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
                        >
                          {{ c.isActive !== false ? 'ACT' : 'DFT' }}
                        </span>
                      }

                      <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          (click)="$event.stopPropagation(); openEditCategoryModal(c)"
                          title="Edit Category Details"
                          class="p-1 hover:bg-blue-500/10 text-blue-500 rounded-lg border-none bg-transparent cursor-pointer"
                        >
                          <mat-icon class="text-xs">edit</mat-icon>
                        </button>
                        <button
                          (click)="$event.stopPropagation(); admin.deleteCategory(c.id)"
                          title="Delete Category"
                          class="p-1 hover:bg-rose-500/10 text-rose-500 rounded-lg border-none bg-transparent cursor-pointer"
                        >
                          <mat-icon class="text-xs">delete</mat-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                }
                @if (sortedCategories().length === 0) {
                  <div class="py-8 text-center text-zinc-400 text-xs font-bold">
                    No categories found.
                  </div>
                }
              </div>
            </div>

            <!-- RIGHT PANEL (70% -> lg:col-span-8): SHOPIFY COLLECTION VIEW -->
            <div class="lg:col-span-8 space-y-6">

              @if (selectedCategory(); as cat) {
                <!-- CATEGORY SUMMARY CARD -->
                <div class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 shadow-xs">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b dark:border-zinc-800 pb-4">
                    <div class="flex items-center gap-4">
                      <div class="h-16 w-16 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-hidden flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                        @if (cat.image) {
                          <img [src]="cat.image" [alt]="cat.name" class="h-full w-full object-contain" />
                        } @else {
                          <mat-icon class="text-2xl text-orange-500">{{ cat.icon || 'folder' }}</mat-icon>
                        }
                      </div>
                      <div>
                        <div class="flex items-center gap-2 flex-wrap">
                          <h2 class="text-xl font-black uppercase text-zinc-900 dark:text-white font-display tracking-tight">
                            {{ cat.name }}
                          </h2>
                          <span
                            [class]="cat.isActive !== false ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'"
                            class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border"
                          >
                            {{ cat.isActive !== false ? 'Active Collection' : 'Draft' }}
                          </span>
                          @if (cat.isFeatured) {
                            <span class="px-2.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[9px] font-black uppercase">
                              ★ Featured
                            </span>
                          }
                        </div>
                        <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                          Slug: /category/{{ cat.slug }} &middot; Path: {{ getCategoryPath(cat.id) }}
                        </p>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2">
                      <button
                        (click)="openEditCategoryModal(cat)"
                        class="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
                      >
                        <mat-icon class="text-sm">tune</mat-icon>
                        <span>Edit Settings</span>
                      </button>

                      <button
                        (click)="isAssignProductsModalOpen.set(true)"
                        class="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
                      >
                        <mat-icon class="text-sm">add_link</mat-icon>
                        <span>Assign Products</span>
                      </button>
                    </div>
                  </div>

                  @if (cat.description) {
                    <div class="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-2" [innerHTML]="cat.description"></div>
                  }
                </div>

                <!-- COLLECTION METRICS CARDS -->
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div class="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center shadow-xs">
                    <span class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Total Products</span>
                    <span class="text-base font-black text-zinc-900 dark:text-white font-mono">{{ collectionMetrics().total }}</span>
                  </div>
                  <div class="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center shadow-xs">
                    <span class="text-[9px] font-bold text-emerald-500 uppercase tracking-wider block">Active</span>
                    <span class="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">{{ collectionMetrics().active }}</span>
                  </div>
                  <div class="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center shadow-xs">
                    <span class="text-[9px] font-bold text-amber-500 uppercase tracking-wider block">Out of Stock</span>
                    <span class="text-base font-black text-amber-600 dark:text-amber-400 font-mono">{{ collectionMetrics().outOfStock }}</span>
                  </div>
                  <div class="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center shadow-xs">
                    <span class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Draft</span>
                    <span class="text-base font-black text-zinc-500 font-mono">{{ collectionMetrics().draft }}</span>
                  </div>
                  <div class="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center shadow-xs">
                    <span class="text-[9px] font-bold text-purple-500 uppercase tracking-wider block">Featured</span>
                    <span class="text-base font-black text-purple-600 dark:text-purple-400 font-mono">{{ collectionMetrics().featured }}</span>
                  </div>
                  <div class="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center shadow-xs">
                    <span class="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">Avg Rating</span>
                    <span class="text-base font-black text-amber-500 font-mono">{{ collectionMetrics().avgRating }} ★</span>
                  </div>
                </div>

                <!-- COLLECTION PRODUCTS CATALOG TABLE -->
                <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xs">
                  <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-b dark:border-zinc-800 pb-3">
                    <div>
                      <h3 class="text-xs font-mono font-black text-zinc-400 uppercase tracking-widest">
                        Products in Category ({{ productsInSelectedCategory().length }})
                      </h3>
                      <span class="text-[11px] text-zinc-500">Live products belonging to {{ cat.name }}</span>
                    </div>

                    <div class="flex items-center gap-2 w-full sm:w-auto">
                      <div class="relative flex-1 sm:w-64">
                        <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">search</mat-icon>
                        <input
                          type="text"
                          [value]="productSearchQueryInCollection()"
                          (input)="productSearchQueryInCollection.set($any($event.target).value)"
                          placeholder="Search in collection..."
                          class="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                        />
                      </div>
                      <button
                        (click)="isAssignProductsModalOpen.set(true)"
                        class="px-3.5 py-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 rounded-xl text-xs font-bold uppercase transition-colors border-none cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <mat-icon class="text-sm">add</mat-icon>
                        <span>Assign</span>
                      </button>
                    </div>
                  </div>

                  <!-- PRODUCTS TABLE -->
                  <div class="overflow-x-auto no-scrollbar max-h-[500px] overflow-y-auto">
                    <table class="w-full text-left text-xs whitespace-nowrap">
                      <thead>
                        <tr class="text-[9px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800">
                          <th class="py-2.5 px-3">Product</th>
                          <th class="py-2.5">Brand</th>
                          <th class="py-2.5">SKU</th>
                          <th class="py-2.5">Price</th>
                          <th class="py-2.5 text-center">Stock</th>
                          <th class="py-2.5 text-center">Status</th>
                          <th class="py-2.5 text-right pr-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                        @for (p of productsInSelectedCategory(); track p.id) {
                          <tr
                            draggable="true"
                            (dragstart)="onProductDragStart($event, p)"
                            (dragend)="onProductDragEnd($event)"
                            class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-grab active:cursor-grabbing group"
                            [class.opacity-40]="draggedProduct()?.id === p.id"
                          >
                            <td class="py-3 px-3">
                              <div class="flex items-center gap-2.5">
                                <mat-icon class="text-zinc-300 group-hover:text-orange-500 text-sm cursor-grab shrink-0 transition-colors" title="Drag & drop product onto a category in taxonomy tree">drag_indicator</mat-icon>
                                <img
                                  [src]="p.primaryImage || p.thumbnail || p.images[0] || 'https://picsum.photos/100/100'"
                                  [alt]="p.name"
                                  class="h-10 w-10 rounded-xl object-contain border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0"
                                />
                                <div>
                                  <a [href]="'/product/' + p.slug" target="_blank" class="font-extrabold text-zinc-900 dark:text-white hover:text-orange-500 transition-colors">
                                    {{ p.name }}
                                  </a>
                                  @if (p.variants && p.variants.length > 0) {
                                    <span class="text-[9px] font-mono text-zinc-400 block">{{ p.variants.length }} Variants</span>
                                  }
                                </div>
                              </div>
                            </td>

                            <td class="py-3 font-semibold text-zinc-600 dark:text-zinc-400">
                              {{ p.brand || '3D Galaxy' }}
                            </td>

                            <td class="py-3 font-mono text-[10px] text-zinc-400">
                              {{ p.sku || 'N/A' }}
                            </td>

                            <td class="py-3 font-mono font-black text-zinc-900 dark:text-white">
                              ₹{{ (p.sale_price || p.salePrice || p.mrp || 0) | number:'1.0-0' }}
                              @if (p.mrp > (p.sale_price || p.salePrice || 0)) {
                                <span class="text-[10px] text-zinc-400 line-through font-normal ml-1">₹{{ p.mrp | number:'1.0-0' }}</span>
                              }
                            </td>

                            <td class="py-3 text-center">
                              <span
                                [class]="p.stock === 0 ? 'bg-rose-500/10 text-rose-500' : (p.stock <= 5 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500')"
                                class="px-2 py-0.5 rounded-full text-[9px] font-black font-mono"
                              >
                                {{ p.stock === 0 ? 'Out of Stock' : p.stock + ' left' }}
                              </span>
                            </td>

                            <td class="py-3 text-center">
                              <span
                                [class]="p.isActive !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500'"
                                class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
                              >
                                {{ p.isActive !== false ? 'ACTIVE' : 'DRAFT' }}
                              </span>
                            </td>

                            <td class="py-3 text-right pr-3">
                              <div class="inline-flex items-center gap-1">
                                <button
                                  (click)="admin.startProductEdit(p)"
                                  title="Edit Product Details"
                                  class="p-1.5 hover:bg-blue-500/10 text-blue-500 rounded-lg border-none bg-transparent cursor-pointer"
                                >
                                  <mat-icon class="text-xs">edit</mat-icon>
                                </button>
                                <button
                                  (click)="removeProductFromCategory(p)"
                                  title="Remove from Collection"
                                  class="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg border-none bg-transparent cursor-pointer"
                                >
                                  <mat-icon class="text-xs">link_off</mat-icon>
                                </button>
                              </div>
                            </td>
                          </tr>
                        }
                        @if (productsInSelectedCategory().length === 0) {
                          <tr>
                            <td colspan="7" class="py-12 text-center text-zinc-400 font-bold text-xs space-y-2">
                              <mat-icon class="text-2xl text-zinc-300">inventory_2</mat-icon>
                              <p class="block">No products currently assigned to this category.</p>
                              <button
                                (click)="isAssignProductsModalOpen.set(true)"
                                class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase transition-colors border-none cursor-pointer"
                              >
                                Assign Products Now
                              </button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }
            </div>

          </div>

          <!-- CATEGORY EDIT MODAL POPUP -->
          @if (isCategoryModalOpen()) {
            <div class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div class="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn my-auto">
                
                <!-- Modal Header -->
                <div class="flex items-center justify-between px-6 py-4 border-b dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                      <mat-icon>{{ admin.editingCategory() ? 'edit' : 'add_circle' }}</mat-icon>
                    </div>
                    <div>
                      <h2 class="text-base font-black uppercase text-zinc-900 dark:text-white font-display">
                        {{ admin.editingCategory() ? 'Edit Category Settings' : 'Create New Category' }}
                      </h2>
                      <p class="text-[10px] text-zinc-400 font-mono">Configure details, SEO tags, media, and rules</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      (click)="admin.saveCategory(); isCategoryModalOpen.set(false)"
                      [disabled]="admin.isSavingCategory()"
                      class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border-none cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <mat-icon class="text-sm">check</mat-icon>
                      <span>Save Changes</span>
                    </button>
                    <button
                      (click)="isCategoryModalOpen.set(false); admin.cancelCategoryEdit()"
                      class="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center cursor-pointer border-none"
                    >
                      <mat-icon class="text-sm">close</mat-icon>
                    </button>
                  </div>
                </div>

                <!-- Modal Tabs Bar -->
                <div class="flex items-center gap-2 px-6 py-2 bg-zinc-100/80 dark:bg-zinc-800/80 border-b dark:border-zinc-800 overflow-x-auto no-scrollbar">
                  <button
                    (click)="categoryModalTab.set('general')"
                    [class]="categoryModalTab() === 'general' ? 'bg-white dark:bg-zinc-900 text-orange-500 font-black shadow-xs' : 'text-zinc-600 dark:text-zinc-400 font-bold'"
                    class="px-4 py-2 rounded-xl text-xs uppercase transition-all cursor-pointer border-none flex items-center gap-1.5"
                  >
                    <mat-icon class="text-sm">tune</mat-icon>
                    <span>General</span>
                  </button>

                  <button
                    (click)="categoryModalTab.set('description')"
                    [class]="categoryModalTab() === 'description' ? 'bg-white dark:bg-zinc-900 text-orange-500 font-black shadow-xs' : 'text-zinc-600 dark:text-zinc-400 font-bold'"
                    class="px-4 py-2 rounded-xl text-xs uppercase transition-all cursor-pointer border-none flex items-center gap-1.5"
                  >
                    <mat-icon class="text-sm">description</mat-icon>
                    <span>Description</span>
                  </button>

                  <button
                    (click)="categoryModalTab.set('media')"
                    [class]="categoryModalTab() === 'media' ? 'bg-white dark:bg-zinc-900 text-orange-500 font-black shadow-xs' : 'text-zinc-600 dark:text-zinc-400 font-bold'"
                    class="px-4 py-2 rounded-xl text-xs uppercase transition-all cursor-pointer border-none flex items-center gap-1.5"
                  >
                    <mat-icon class="text-sm">image</mat-icon>
                    <span>Media & Banner</span>
                  </button>

                  <button
                    (click)="categoryModalTab.set('seo')"
                    [class]="categoryModalTab() === 'seo' ? 'bg-white dark:bg-zinc-900 text-orange-500 font-black shadow-xs' : 'text-zinc-600 dark:text-zinc-400 font-bold'"
                    class="px-4 py-2 rounded-xl text-xs uppercase transition-all cursor-pointer border-none flex items-center gap-1.5"
                  >
                    <mat-icon class="text-sm">travel_explore</mat-icon>
                    <span>SEO Meta</span>
                  </button>

                  <button
                    (click)="categoryModalTab.set('products')"
                    [class]="categoryModalTab() === 'products' ? 'bg-white dark:bg-zinc-900 text-orange-500 font-black shadow-xs' : 'text-zinc-600 dark:text-zinc-400 font-bold'"
                    class="px-4 py-2 rounded-xl text-xs uppercase transition-all cursor-pointer border-none flex items-center gap-1.5"
                  >
                    <mat-icon class="text-sm">inventory_2</mat-icon>
                    <span>Products ({{ productsInSelectedCategory().length }})</span>
                  </button>

                  <button
                    (click)="categoryModalTab.set('advanced')"
                    [class]="categoryModalTab() === 'advanced' ? 'bg-white dark:bg-zinc-900 text-orange-500 font-black shadow-xs' : 'text-zinc-600 dark:text-zinc-400 font-bold'"
                    class="px-4 py-2 rounded-xl text-xs uppercase transition-all cursor-pointer border-none flex items-center gap-1.5"
                  >
                    <mat-icon class="text-sm">settings</mat-icon>
                    <span>Advanced</span>
                  </button>
                </div>

                <!-- Modal Content Body -->
                <div class="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  <!-- TAB 1: GENERAL -->
                  @if (categoryModalTab() === 'general') {
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div class="space-y-1">
                        <label class="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Category Name *</label>
                        <input
                          type="text"
                          [value]="admin.newCatName()"
                          (input)="admin.newCatName.set($any($event.target).value)"
                          placeholder="e.g. 3D Printers"
                          class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                        />
                      </div>

                      <div class="space-y-1">
                        <label class="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Parent Category</label>
                        <select
                          [value]="admin.newCatParentId()"
                          (change)="admin.newCatParentId.set($any($event.target).value)"
                          class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                        >
                          <option value="">None (Top-Level Category)</option>
                          @for (c of admin.ds.categories(); track c.id) {
                            @if (c.id !== admin.editingCategory()?.id) {
                              <option [value]="c.id">{{ c.name }}</option>
                            }
                          }
                        </select>
                      </div>

                      <div class="space-y-1">
                        <label class="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Grid Icon (Material Icon)</label>
                        <input
                          type="text"
                          [value]="admin.catIcon()"
                          (input)="admin.catIcon.set($any($event.target).value)"
                          placeholder="folder"
                          class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                        />
                      </div>

                      <div class="flex items-center gap-6 pt-6">
                        <label class="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            [checked]="admin.catIsActive()"
                            (change)="admin.catIsActive.set($any($event.target).checked)"
                            class="rounded text-orange-500 h-4 w-4"
                          />
                          <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">Active Status</span>
                        </label>

                        <label class="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            [checked]="admin.catIsFeatured()"
                            (change)="admin.catIsFeatured.set($any($event.target).checked)"
                            class="rounded text-orange-500 h-4 w-4"
                          />
                          <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">Featured Collection</span>
                        </label>
                      </div>
                    </div>
                  }

                  <!-- TAB 2: DESCRIPTION -->
                  @if (categoryModalTab() === 'description') {
                    <div class="space-y-4">
                      <app-rich-text-editor
                        label="Collection Description"
                        placeholder="Write a descriptive summary for this category..."
                        [value]="admin.newCatDesc()"
                        (valueChange)="admin.newCatDesc.set($event)"
                      ></app-rich-text-editor>
                    </div>
                  }

                  <!-- TAB 3: MEDIA -->
                  @if (categoryModalTab() === 'media') {
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <app-image-picker
                        label="Category Thumbnail / Image Grid"
                        [value]="admin.catImage()"
                        (valueChange)="admin.catImage.set($event)"
                      ></app-image-picker>

                      <app-image-picker
                        label="Banner Overlay Image"
                        [value]="admin.catBanner()"
                        (valueChange)="admin.catBanner.set($event)"
                      ></app-image-picker>
                    </div>
                  }

                  <!-- TAB 4: SEO META -->
                  @if (categoryModalTab() === 'seo') {
                    <div class="space-y-4">
                      <div class="space-y-1">
                        <label class="text-[10px] font-black uppercase text-zinc-400 tracking-wider">SEO Meta Title</label>
                        <input
                          type="text"
                          [value]="admin.catSeoTitle()"
                          (input)="admin.catSeoTitle.set($any($event.target).value)"
                          placeholder="e.g. Best 3D Printers & Accessories | 3D Galaxy"
                          class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                        />
                      </div>

                      <div class="space-y-1">
                        <label class="text-[10px] font-black uppercase text-zinc-400 tracking-wider">SEO Meta Description</label>
                        <textarea
                          [value]="admin.catSeoDescription()"
                          (input)="admin.catSeoDescription.set($any($event.target).value)"
                          rows="3"
                          placeholder="Summary for search engines..."
                          class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-sans"
                        ></textarea>
                      </div>
                    </div>
                  }

                  <!-- TAB 5: PRODUCTS LIST IN MODAL -->
                  @if (categoryModalTab() === 'products') {
                    <div class="space-y-4">
                      <div class="flex items-center justify-between">
                        <h4 class="text-xs font-black uppercase text-zinc-900 dark:text-white">Assigned Products ({{ productsInSelectedCategory().length }})</h4>
                        <button (click)="isAssignProductsModalOpen.set(true)" class="px-3 py-1.5 bg-orange-500 text-white rounded-xl text-xs font-bold uppercase border-none cursor-pointer">
                          + Assign Products
                        </button>
                      </div>

                      <div class="space-y-2 max-h-60 overflow-y-auto no-scrollbar border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3">
                        @for (p of productsInSelectedCategory(); track p.id) {
                          <div class="flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <span class="text-xs font-bold text-zinc-900 dark:text-white">{{ p.name }}</span>
                            <button (click)="removeProductFromCategory(p)" class="text-xs text-rose-500 font-bold border-none bg-transparent cursor-pointer">Remove</button>
                          </div>
                        }
                        @if (productsInSelectedCategory().length === 0) {
                          <p class="text-xs text-zinc-400 text-center py-4">No products in this category yet.</p>
                        }
                      </div>
                    </div>
                  }

                  <!-- TAB 6: ADVANCED / SHIPPING -->
                  @if (categoryModalTab() === 'advanced') {
                    <div class="space-y-5">
                      <!-- Category Shipping Mode Selector -->
                      <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Category Shipping Mode</label>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <button
                            type="button"
                            (click)="admin.catShippingMode.set('default')"
                            [class]="admin.catShippingMode() === 'default' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'"
                            class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer"
                          >
                            Default
                          </button>
                          <button
                            type="button"
                            (click)="admin.catShippingMode.set('flat')"
                            [class]="admin.catShippingMode() === 'flat' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'"
                            class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer"
                          >
                            Flat Rate
                          </button>
                          <button
                            type="button"
                            (click)="admin.catShippingMode.set('weight_based')"
                            [class]="admin.catShippingMode() === 'weight_based' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'"
                            class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer"
                          >
                            Weight Based
                          </button>
                          <button
                            type="button"
                            (click)="admin.catShippingMode.set('free')"
                            [class]="admin.catShippingMode() === 'free' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'"
                            class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer"
                          >
                            Free Shipping
                          </button>
                        </div>
                      </div>

                      <!-- Flat Rate Configuration -->
                      @if (admin.catShippingMode() === 'flat') {
                        <div class="grid grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-fadeIn">
                          <div class="space-y-1">
                            <label class="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Flat Shipping Charge (₹)</label>
                            <input
                              type="number"
                              [value]="admin.catShippingCharge() ?? ''"
                              (input)="admin.catShippingCharge.set($any($event.target).value !== '' ? Number($any($event.target).value) : null)"
                              placeholder="e.g. 100"
                              class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                            />
                          </div>

                          <div class="space-y-1">
                            <label class="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Shipping Region</label>
                            <input
                              type="text"
                              [value]="admin.catShippingRegion()"
                              (input)="admin.catShippingRegion.set($any($event.target).value)"
                              placeholder="e.g. All India"
                              class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                            />
                          </div>
                        </div>
                      }

                      <!-- Weight-Based Configuration -->
                      @if (admin.catShippingMode() === 'weight_based') {
                        <div class="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-fadeIn">
                          <div class="flex items-center justify-between">
                            <span class="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                              <mat-icon class="text-emerald-500 text-sm">scale</mat-icon> Category Weight Range Rules
                            </span>
                            <span class="text-[9px] text-zinc-400 font-bold">Stored in grams (g)</span>
                          </div>

                          <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs">
                              <thead>
                                <tr class="border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-black tracking-wider text-zinc-400">
                                  <th class="pb-2">From (g)</th>
                                  <th class="pb-2">To (g)</th>
                                  <th class="pb-2">Charge (₹)</th>
                                  <th class="pb-2 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                                @for (rule of admin.catShippingRules(); track $index) {
                                  <tr>
                                    <td class="py-2 pr-2">
                                      <div class="flex items-center gap-1">
                                        <input
                                          type="number"
                                          [value]="rule.fromGrams"
                                          (input)="admin.updateCatWeightRule($index, 'fromGrams', +$any($event.target).value)"
                                          placeholder="0"
                                          class="w-20 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono"
                                        />
                                        <span class="text-[10px] text-zinc-400 font-bold">g</span>
                                      </div>
                                    </td>
                                    <td class="py-2 pr-2">
                                      <div class="flex items-center gap-1">
                                        <input
                                          type="number"
                                          [value]="rule.toGrams"
                                          (input)="admin.updateCatWeightRule($index, 'toGrams', +$any($event.target).value)"
                                          placeholder="500"
                                          class="w-20 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono"
                                        />
                                        <span class="text-[10px] text-zinc-400 font-bold">g</span>
                                      </div>
                                    </td>
                                    <td class="py-2 pr-2">
                                      <div class="flex items-center gap-1">
                                        <span class="text-xs font-bold text-zinc-400">₹</span>
                                        <input
                                          type="number"
                                          [value]="rule.charge"
                                          (input)="admin.updateCatWeightRule($index, 'charge', +$any($event.target).value)"
                                          placeholder="50"
                                          class="w-20 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold"
                                        />
                                      </div>
                                    </td>
                                    <td class="py-2 text-right">
                                      <button
                                        type="button"
                                        (click)="admin.removeCatWeightRule($index)"
                                        class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                                      >
                                        <mat-icon class="text-sm">delete</mat-icon>
                                      </button>
                                    </td>
                                  </tr>
                                } @empty {
                                  <tr>
                                    <td colspan="4" class="py-3 text-center text-xs text-zinc-400 italic">
                                      No weight rules added. Click below to add tier (e.g. 0-500g → ₹50).
                                    </td>
                                  </tr>
                                }
                              </tbody>
                            </table>
                          </div>

                          <button
                            type="button"
                            (click)="admin.addCatWeightRule()"
                            class="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <mat-icon class="text-sm">add</mat-icon>
                            <span>Add Weight Tier</span>
                          </button>
                        </div>
                      }

                      <!-- Free Shipping & Threshold Options -->
                      <div class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                        <label class="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            [checked]="admin.catFreeShippingEligible()"
                            (change)="admin.catFreeShippingEligible.set($any($event.target).checked)"
                            class="rounded text-blue-500 h-4 w-4"
                          />
                          <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">Free Shipping Eligible for this Category</span>
                        </label>

                        <div class="space-y-1 pt-1">
                          <label class="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Free Shipping Min Order Threshold (₹)</label>
                          <input
                            type="number"
                            [value]="admin.catFreeShippingThreshold() ?? ''"
                            (input)="admin.catFreeShippingThreshold.set($any($event.target).value !== '' ? Number($any($event.target).value) : null)"
                            placeholder="e.g. 999 (Leave empty for unconditional free shipping)"
                            class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  }

                </div>

                <!-- Modal Footer -->
                <div class="flex items-center justify-between px-6 py-4 border-t dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  <button (click)="isCategoryModalOpen.set(false); admin.cancelCategoryEdit()" class="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 uppercase border-none bg-transparent cursor-pointer">
                    Cancel
                  </button>
                  <button
                    (click)="admin.saveCategory(); isCategoryModalOpen.set(false)"
                    [disabled]="admin.isSavingCategory()"
                    class="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer shadow-md disabled:opacity-50"
                  >
                    Save Collection
                  </button>
                </div>

              </div>
            </div>
          }

          <!-- PRODUCT ASSIGNMENT PICKER MODAL -->
          @if (isAssignProductsModalOpen()) {
            <div class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div class="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn my-auto">
                
                <div class="flex items-center justify-between px-6 py-4 border-b dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  <div>
                    <h3 class="text-sm font-black uppercase text-zinc-900 dark:text-white">
                      Assign Products to {{ selectedCategory()?.name }}
                    </h3>
                    <p class="text-[10px] text-zinc-400 font-mono">Select products from catalog to link to this category</p>
                  </div>
                  <button (click)="isAssignProductsModalOpen.set(false)" class="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 flex items-center justify-center cursor-pointer border-none">
                    <mat-icon class="text-sm">close</mat-icon>
                  </button>
                </div>

                <div class="p-4 border-b dark:border-zinc-800">
                  <div class="relative">
                    <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">search</mat-icon>
                    <input
                      type="text"
                      [value]="productSearchQueryForAssign()"
                      (input)="productSearchQueryForAssign.set($any($event.target).value)"
                      placeholder="Search unassigned products by name, SKU..."
                      class="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                <div class="flex-1 overflow-y-auto p-4 space-y-2 max-h-[400px] no-scrollbar">
                  @for (p of productsNotInSelectedCategory(); track p.id) {
                    <label
                      class="flex items-center justify-between p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                      [ngClass]="selectedAssignProductIds().has(p.id) ? 'bg-orange-500/5 border-orange-500/30' : ''"
                    >
                      <div class="flex items-center gap-3">
                        <input
                          type="checkbox"
                          [checked]="selectedAssignProductIds().has(p.id)"
                          (change)="toggleAssignProductSelection(p.id)"
                          class="rounded text-orange-500 h-4 w-4"
                        />
                        <img
                          [src]="p.primaryImage || p.thumbnail || p.images[0] || 'https://picsum.photos/100/100'"
                          [alt]="p.name"
                          class="h-9 w-9 rounded-xl object-contain border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0"
                        />
                        <div>
                          <p class="text-xs font-extrabold text-zinc-900 dark:text-white leading-tight">{{ p.name }}</p>
                          <span class="text-[10px] text-zinc-400 font-mono">{{ p.sku || 'No SKU' }} &middot; ₹{{ p.sale_price || p.salePrice || p.mrp }}</span>
                        </div>
                      </div>

                      <span class="text-[10px] font-mono font-bold text-zinc-400">
                        {{ p.stock }} in stock
                      </span>
                    </label>
                  }
                  @if (productsNotInSelectedCategory().length === 0) {
                    <div class="py-8 text-center text-zinc-400 text-xs font-bold">
                      All products in store are already assigned to this category!
                    </div>
                  }
                </div>

                <div class="flex items-center justify-between px-6 py-4 border-t dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  <span class="text-xs font-mono font-bold text-zinc-500">
                    {{ selectedAssignProductIds().size }} product(s) selected
                  </span>
                  <button
                    (click)="assignSelectedProductsToCategory()"
                    [disabled]="selectedAssignProductIds().size === 0"
                    class="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer shadow-md disabled:opacity-50"
                  >
                    Assign Selected Products
                  </button>
                </div>

              </div>
            </div>
          }

          <!-- ========================= VARIANT QUICK EDIT POPUP / MODAL ========================= -->
          @if (isVariantEditModalOpen() && variantEditModalProduct()) {
            <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
              <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] font-sans animate-fadeIn my-auto">
                <!-- Modal Header -->
                <div class="px-6 py-4 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white flex items-center justify-between shrink-0 border-b border-zinc-700/50">
                  <div class="flex items-center gap-3 min-w-0">
                    <img
                      [src]="variantEditModalProduct().primaryImage || variantEditModalProduct().thumbnail || (variantEditModalProduct().images && variantEditModalProduct().images[0]) || 'https://picsum.photos/100/100'"
                      [alt]="variantEditModalProduct().name"
                      class="h-10 w-10 rounded-xl object-contain bg-white/10 p-1 border border-white/20 shrink-0"
                    />
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-orange-500 text-white font-mono">VARIANTS POPUP</span>
                        <h3 class="text-sm font-black uppercase tracking-wide truncate max-w-xs sm:max-w-md">
                          {{ variantEditModalProduct().name }}
                        </h3>
                      </div>
                      <p class="text-[10px] text-zinc-300 font-mono">
                        SKU: {{ variantEditModalProduct().sku || 'N/A' }} &middot; {{ getProductVariantsList(variantEditModalProduct()).length }} Variant(s) Configured
                      </p>
                    </div>
                  </div>
                  <button
                    (click)="isVariantEditModalOpen.set(false)"
                    class="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer border-none transition-colors"
                    title="Close"
                  >
                    <mat-icon class="text-base">close</mat-icon>
                  </button>
                </div>

                <!-- Modal Content Body -->
                <div class="p-6 overflow-y-auto flex-1 space-y-5">
                  <!-- Info Box -->
                  <div class="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 text-xs text-blue-600 dark:text-blue-400">
                    <mat-icon class="text-lg shrink-0">info</mat-icon>
                    <span>Edit individual variant prices (₹), dealer pricing (₹), stock count, and active status below. Click <strong>Save All Changes</strong> when finished.</span>
                  </div>

                  @if (loadingVariantsProductIds().has(variantEditModalProduct().id)) {
                    <div class="py-12 text-center text-xs text-zinc-400 font-mono animate-pulse">
                      Loading variants details...
                    </div>
                  } @else if (getProductVariantsList(variantEditModalProduct()).length === 0) {
                    <div class="py-12 text-center text-xs text-zinc-400 font-medium">
                      No variants found for this product.
                    </div>
                  } @else {
                    <div class="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xs">
                      <table class="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                          <tr class="bg-zinc-50 dark:bg-zinc-950 text-[10px] font-black text-zinc-400 uppercase border-b dark:border-zinc-800">
                            <th class="py-3 px-4">Variant Options</th>
                            <th class="py-3 px-3">SKU Barcode</th>
                            <th class="py-3 px-3">Retail Price (₹)</th>
                            <th class="py-3 px-3">Dealer Price (₹)</th>
                            <th class="py-3 px-3">Stock Units</th>
                            <th class="py-3 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                          @for (v of getProductVariantsList(variantEditModalProduct()); track (v.id || v.sku)) {
                            <tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                              <!-- Variant Name -->
                              <td class="py-3 px-4 font-sans font-bold text-zinc-900 dark:text-white">
                                {{ getVariantDisplayName(v) }}
                              </td>

                              <!-- Variant SKU -->
                              <td class="py-3 px-3 text-zinc-500 text-[10px]">
                                {{ v.sku || 'N/A' }}
                              </td>

                              <!-- Retail Price -->
                              <td class="py-3 px-3">
                                <div class="relative w-28">
                                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    [value]="variantEditFormMap()[v.id]?.price ?? 0"
                                    (input)="updateVariantModalFormField(v.id, 'price', $any($event.target).value)"
                                    class="w-full pl-6 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </td>

                              <!-- Dealer Price -->
                              <td class="py-3 px-3">
                                <div class="relative w-28">
                                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    [value]="variantEditFormMap()[v.id]?.dealerPrice ?? 0"
                                    (input)="updateVariantModalFormField(v.id, 'dealerPrice', $any($event.target).value)"
                                    class="w-full pl-6 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </td>

                              <!-- Stock Units -->
                              <td class="py-3 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  [value]="variantEditFormMap()[v.id]?.stock ?? 0"
                                  (input)="updateVariantModalFormField(v.id, 'stock', $any($event.target).value)"
                                  class="w-20 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>

                              <!-- Status -->
                              <td class="py-3 px-3">
                                @let st = variantEditFormMap()[v.id]?.stock ?? v.stock ?? 0;
                                @if (st === 0) {
                                  <span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">OUT OF STOCK</span>
                                } @else if (st <= 5) {
                                  <span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">LOW STOCK ({{ st }})</span>
                                } @else {
                                  <span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">IN STOCK ({{ st }})</span>
                                }
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>

                <!-- Modal Footer -->
                <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    (click)="isVariantEditModalOpen.set(false)"
                    [disabled]="isSavingVariantModal()"
                    class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold uppercase transition-all border-none cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    (click)="saveAllModalVariants()"
                    [disabled]="isSavingVariantModal() || loadingVariantsProductIds().has(variantEditModalProduct()?.id)"
                    class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 border-none cursor-pointer flex items-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    <mat-icon class="text-sm">done_all</mat-icon>
                    <span>{{ isSavingVariantModal() ? 'Saving Variants...' : 'Save All Changes' }}</span>
                  </button>
                </div>
              </div>
            </div>
          }

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
                  class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
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
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-xl font-black uppercase">Brand Alliances</h1>
              <p class="text-xs text-zinc-500">
                Coordinate and verify global SLA printing manufacturers. Add
                logos, descriptions, and territories.
              </p>
            </div>
            <button
              (click)="exportBrandsCsv()"
              class="h-9 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <mat-icon class="text-sm">download</mat-icon>
              <span>Export CSV</span>
            </button>
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
                            class="bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-1 py-0.5 rounded text-[8px] font-black"
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
                    class="text-[9px] font-black uppercase px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500 cursor-pointer"
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
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
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
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"
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
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
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
                    class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-950 dark:text-zinc-100"
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
      <app-variant-tour-guide></app-variant-tour-guide>
    </div>
  `,
})
export class AdminCatalogTab {
  toastService = inject(ToastService);
  http = inject(HttpClient);
  api = inject(ApiService);
  tourService = inject(VariantTourService);
  @Input({ required: true }) admin!: AdminPanel;

  // --- INLINE QUICK EDIT SIGNALS ---
  quickEditingProductId = signal<string | null>(null);
  quickEditForm = signal<{ salePrice: number | string; dealerPrice: number | string; stock: number | string; isActive: boolean }>({
    salePrice: 0,
    dealerPrice: 0,
    stock: 0,
    isActive: true,
  });
  isQuickSavingProduct = signal<boolean>(false);

  // Variant Expansion & Quick Edit Signals
  expandedProductIds = signal<Set<string>>(new Set());
  productVariantsMap = signal<Record<string, any[]>>({});
  loadingVariantsProductIds = signal<Set<string>>(new Set());
  quickEditingVariantId = signal<string | null>(null);
  quickEditVariantForm = signal<{ price: number | string; stock: number | string; isActive: boolean }>({
    price: 0,
    stock: 0,
    isActive: true,
  });
  isQuickSavingVariant = signal<boolean>(false);

  // Variant Edit Modal / Popup Signals
  isVariantEditModalOpen = signal<boolean>(false);
  variantEditModalProduct = signal<any | null>(null);
  variantEditFormMap = signal<Record<string, { price: number | string; dealerPrice: number | string; stock: number | string; isActive: boolean }>>({});
  isSavingVariantModal = signal<boolean>(false);

  async openVariantEditModal(product: any) {
    this.variantEditModalProduct.set(product);
    this.isVariantEditModalOpen.set(true);

    let vars = this.productVariantsMap()[product.id];
    if (!vars || vars.length === 0) {
      if (Array.isArray(product.variants) && product.variants.length > 0) {
        vars = product.variants;
        this.productVariantsMap.update(m => ({ ...m, [product.id]: vars }));
      } else {
        this.loadingVariantsProductIds.update(s => new Set(s).add(product.id));
        try {
          const res: any = await firstValueFrom(this.api.get(`/admin/products/${product.id}/variants`));
          vars = res?.data || res || [];
          this.productVariantsMap.update(m => ({ ...m, [product.id]: Array.isArray(vars) ? vars : [] }));
        } catch (err) {
          console.warn('Failed to load variants for modal:', err);
          vars = [];
          this.productVariantsMap.update(m => ({ ...m, [product.id]: [] }));
        } finally {
          this.loadingVariantsProductIds.update(s => {
            const next = new Set(s);
            next.delete(product.id);
            return next;
          });
        }
      }
    }

    const initialMap: Record<string, any> = {};
    (vars || []).forEach((v: any) => {
      initialMap[v.id] = {
        price: v.price !== undefined ? v.price : (v.salePrice || 0),
        dealerPrice: v.dealerPrice !== undefined ? v.dealerPrice : (v.dealer_price || 0),
        stock: v.stock !== undefined ? v.stock : 0,
        isActive: v.isActive !== false,
      };
    });
    this.variantEditFormMap.set(initialMap);
  }

  updateVariantModalFormField(variantId: string, field: string, value: any) {
    this.variantEditFormMap.update(m => ({
      ...m,
      [variantId]: {
        ...(m[variantId] || {}),
        [field]: value,
      }
    }));
  }

  async saveAllModalVariants() {
    const product = this.variantEditModalProduct();
    if (!product) return;

    const vars = this.productVariantsMap()[product.id] || [];
    const formMap = this.variantEditFormMap();

    this.isSavingVariantModal.set(true);
    let updatedCount = 0;

    try {
      for (const v of vars) {
        const form = formMap[v.id];
        if (!form) continue;

        const price = parseFloat(String(form.price));
        const dealerPrice = parseFloat(String(form.dealerPrice || 0));
        const stock = parseInt(String(form.stock), 10);

        if (isNaN(price) || price < 0 || isNaN(stock) || stock < 0) continue;

        const payload = {
          price,
          salePrice: price,
          dealerPrice,
          stockQuantity: stock,
          stock,
          isActive: form.isActive !== false,
        };

        const res: any = await firstValueFrom(
          this.api.patch(`/admin/products/${product.id}/variants/${v.id}/quick-update`, payload)
        );

        if (res && (res.success || res.data)) {
          updatedCount++;
          v.price = price;
          v.salePrice = price;
          v.dealerPrice = dealerPrice;
          v.stock = stock;
          v.isActive = form.isActive !== false;
        }
      }

      const nextVars = [...vars];
      this.productVariantsMap.update(m => ({ ...m, [product.id]: nextVars }));
      const totalStock = nextVars.reduce((sum, v) => sum + (v.stock || 0), 0);
      this.admin.ds.products.update(list =>
        list.map(p => (p.id === product.id ? { ...p, stock: totalStock } : p))
      );

      this.toastService.success(`Updated ${updatedCount} variant(s) successfully.`);
      this.isVariantEditModalOpen.set(false);
    } catch (err: any) {
      console.error('[SaveModalVariants] Error:', err);
      this.toastService.error(err?.error?.message || 'Failed to update variants.');
    } finally {
      this.isSavingVariantModal.set(false);
    }
  }

  startQuickEditProduct(product: any) {
    if (this.getProductVariantsCount(product) > 0) {
      this.openVariantEditModal(product);
      return;
    }
    this.quickEditingProductId.set(product.id);
    this.quickEditForm.set({
      salePrice: product.sale_price !== undefined ? product.sale_price : (product.salePrice !== undefined ? product.salePrice : (product.price || 0)),
      dealerPrice: product.dealer_price !== undefined ? product.dealer_price : (product.dealerPrice || 0),
      stock: product.stock !== undefined ? product.stock : (product.stockQuantity || 0),
      isActive: product.isActive !== false,
    });
  }

  cancelQuickEditProduct() {
    this.quickEditingProductId.set(null);
  }

  updateQuickEditFormField(field: string, value: any) {
    this.quickEditForm.update(curr => ({ ...curr, [field]: value }));
  }

  async saveQuickEditProduct(product: any) {
    const form = this.quickEditForm();
    const salePrice = parseFloat(String(form.salePrice));
    const dealerPrice = parseFloat(String(form.dealerPrice));
    const stock = parseInt(String(form.stock), 10);

    if (isNaN(salePrice) || salePrice < 0) {
      this.toastService.warning('Please enter a valid retail price (>= 0).');
      return;
    }
    if (isNaN(dealerPrice) || dealerPrice < 0) {
      this.toastService.warning('Please enter a valid dealer price (>= 0).');
      return;
    }
    if (isNaN(stock) || stock < 0) {
      this.toastService.warning('Please enter a valid non-negative integer for stock.');
      return;
    }

    this.isQuickSavingProduct.set(true);

    try {
      const payload = {
        salePrice,
        price: salePrice,
        dealerPrice,
        stockQuantity: stock,
        stock,
        isActive: form.isActive,
      };

      const res: any = await firstValueFrom(
        this.api.patch(`/admin/products/${product.id}/quick-update`, payload)
      );

      if (res && (res.success || res.data)) {
        // Update product locally in ds.products signal
        this.admin.ds.products.update(list =>
          list.map(p => {
            if (p.id === product.id) {
              return {
                ...p,
                sale_price: salePrice,
                salePrice: salePrice,
                price: salePrice,
                dealer_price: dealerPrice,
                dealerPrice: dealerPrice,
                stock: stock,
                isActive: form.isActive,
              };
            }
            return p;
          })
        );
        this.toastService.success('Product updated successfully.');
        this.quickEditingProductId.set(null);
      } else {
        throw new Error(res?.error || 'Update failed');
      }
    } catch (err: any) {
      console.error('[QuickEditProduct] Error:', err);
      this.toastService.error(err?.error?.message || err?.message || 'Unable to update product. Please try again.');
    } finally {
      this.isQuickSavingProduct.set(false);
    }
  }

  // Variant Helpers & Accordion
  getProductVariantsCount(product: any): number {
    if (this.productVariantsMap()[product.id]) {
      return this.productVariantsMap()[product.id].length;
    }
    if (Array.isArray(product.variants)) {
      return product.variants.length;
    }
    return 0;
  }

  getProductVariantsList(product: any): any[] {
    if (this.productVariantsMap()[product.id]) {
      return this.productVariantsMap()[product.id];
    }
    if (Array.isArray(product.variants)) {
      return product.variants;
    }
    return [];
  }

  getVariantDisplayName(v: any): string {
    if (v.name) return v.name;
    if (v.optionValues && typeof v.optionValues === 'object') {
      const parts = Object.entries(v.optionValues).map(([k, val]) => `${k}: ${val}`);
      if (parts.length > 0) return parts.join(', ');
    }
    return v.sku || 'Variant';
  }

  async toggleExpandVariants(product: any) {
    const current = new Set(this.expandedProductIds());
    if (current.has(product.id)) {
      current.delete(product.id);
      this.expandedProductIds.set(current);
    } else {
      current.add(product.id);
      this.expandedProductIds.set(current);

      // Lazy load variants if not present
      if (!this.productVariantsMap()[product.id]) {
        if (Array.isArray(product.variants) && product.variants.length > 0) {
          this.productVariantsMap.update(m => ({ ...m, [product.id]: product.variants }));
        } else {
          this.loadingVariantsProductIds.update(s => new Set(s).add(product.id));
          try {
            const res: any = await firstValueFrom(this.api.get(`/admin/products/${product.id}/variants`));
            const vars = res?.data || res || [];
            this.productVariantsMap.update(m => ({ ...m, [product.id]: Array.isArray(vars) ? vars : [] }));
          } catch (err) {
            console.warn('Failed to load variants:', err);
            this.productVariantsMap.update(m => ({ ...m, [product.id]: [] }));
          } finally {
            this.loadingVariantsProductIds.update(s => {
              const next = new Set(s);
              next.delete(product.id);
              return next;
            });
          }
        }
      }
    }
  }

  startQuickEditVariant(variant: any) {
    this.quickEditingVariantId.set(variant.id);
    this.quickEditVariantForm.set({
      price: variant.price !== undefined ? variant.price : (variant.salePrice || 0),
      stock: variant.stock !== undefined ? variant.stock : 0,
      isActive: variant.isActive !== false,
    });
  }

  cancelQuickEditVariant() {
    this.quickEditingVariantId.set(null);
  }

  updateQuickEditVariantFormField(field: string, value: any) {
    this.quickEditVariantForm.update(curr => ({ ...curr, [field]: value }));
  }

  async saveQuickEditVariant(product: any, variant: any) {
    const form = this.quickEditVariantForm();
    const price = parseFloat(String(form.price));
    const stock = parseInt(String(form.stock), 10);

    if (isNaN(price) || price < 0) {
      this.toastService.warning('Please enter a valid price (>= 0).');
      return;
    }
    if (isNaN(stock) || stock < 0) {
      this.toastService.warning('Please enter a valid non-negative integer for stock.');
      return;
    }

    this.isQuickSavingVariant.set(true);

    try {
      const payload = {
        price,
        salePrice: price,
        stockQuantity: stock,
        stock,
        isActive: form.isActive,
      };

      const res: any = await firstValueFrom(
        this.api.patch(`/admin/products/${product.id}/variants/${variant.id}/quick-update`, payload)
      );

      if (res && (res.success || res.data)) {
        // Update variant in productVariantsMap
        const updatedVar = {
          ...variant,
          price,
          salePrice: price,
          stock,
          isActive: form.isActive,
        };
        const currentVars = this.productVariantsMap()[product.id] || [];
        const nextVars = currentVars.map(v => (v.id === variant.id ? updatedVar : v));
        this.productVariantsMap.update(m => ({ ...m, [product.id]: nextVars }));

        // Update total product stock in ds.products
        const totalStock = nextVars.reduce((sum, v) => sum + (v.stock || 0), 0);
        this.admin.ds.products.update(list =>
          list.map(p => (p.id === product.id ? { ...p, stock: totalStock } : p))
        );

        this.toastService.success('Variant updated successfully.');
        this.quickEditingVariantId.set(null);
      } else {
        throw new Error(res?.error || 'Variant update failed');
      }
    } catch (err: any) {
      console.error('[QuickEditVariant] Error:', err);
      this.toastService.error(err?.error?.message || err?.message || 'Unable to update variant. Please try again.');
    } finally {
      this.isQuickSavingVariant.set(false);
    }
  }

  // --- SHOPIFY COLLECTION MANAGEMENT SIGNALS & HELPERS ---
  draggedProduct = signal<any | null>(null);
  draggedOverCategoryId = signal<string | null>(null);

  selectedCategoryId = signal<string | null>(null);
  isCategoryModalOpen = signal<boolean>(false);
  categoryModalTab = signal<'general' | 'description' | 'media' | 'seo' | 'products' | 'advanced'>('general');
  isAssignProductsModalOpen = signal<boolean>(false);

  productSearchQueryInCollection = signal<string>('');
  productSearchQueryForAssign = signal<string>('');
  selectedAssignProductIds = signal<Set<string>>(new Set());

  // Drag and Drop Event Handlers
  onProductDragStart(event: DragEvent, product: any) {
    this.draggedProduct.set(product);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', product.id);
    }
  }

  onProductDragEnd(event: DragEvent) {
    this.draggedProduct.set(null);
    this.draggedOverCategoryId.set(null);
  }

  onCategoryDragOver(event: DragEvent, categoryId: string) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (this.draggedOverCategoryId() !== categoryId) {
      this.draggedOverCategoryId.set(categoryId);
    }
  }

  onCategoryDragLeave(event: DragEvent, categoryId: string) {
    event.preventDefault();
    if (this.draggedOverCategoryId() === categoryId) {
      this.draggedOverCategoryId.set(null);
    }
  }

  async onCategoryDrop(event: DragEvent, targetCategory: any) {
    event.preventDefault();
    this.draggedOverCategoryId.set(null);
    const p = this.draggedProduct();
    if (!p || !targetCategory) return;

    const currentCatId = p.categoryId || p.category_id;
    if (currentCatId === targetCategory.id) {
      this.toastService.info(`"${p.name}" is already in "${targetCategory.name}".`);
      this.draggedProduct.set(null);
      return;
    }

    try {
      await firstValueFrom(
        this.api.put(`/products/${p.id}`, {
          categoryId: targetCategory.id,
          category_id: targetCategory.id,
          images: p.images || (p.primaryImage ? [p.primaryImage] : undefined),
        })
      );
      this.admin.ds.products.update((list) =>
        list.map((item) => (item.id === p.id ? ({ ...item, categoryId: targetCategory.id, category_id: targetCategory.id } as any) : item))
      );
      this.toastService.success(`Moved "${p.name}" to "${targetCategory.name}" collection!`);
    } catch (err: any) {
      console.error('[DragDropCategory] Error:', err);
      this.toastService.error(err?.error?.message || 'Failed to update product category.');
    } finally {
      this.draggedProduct.set(null);
    }
  }

  categorySearchQuery = signal<string>('');
  editorCatDropdownOpen = signal<boolean>(false);
  editorCatSearchQuery = signal<string>('');

  selectedCategory = computed(() => {
    const cats = this.admin.ds.categories();
    if (cats.length === 0) return null;
    const currentId = this.selectedCategoryId();
    if (currentId) {
      const match = cats.find((c) => c.id === currentId);
      if (match) return match;
    }
    return cats[0] || null;
  });

  selectCategory(catId: string) {
    this.selectedCategoryId.set(catId);
    this.productSearchQueryInCollection.set('');
  }

  openCreateCategoryModal() {
    this.admin.cancelCategoryEdit();
    this.categoryModalTab.set('general');
    this.isCategoryModalOpen.set(true);
  }

  openEditCategoryModal(cat: any) {
    this.admin.startCategoryEdit(cat);
    this.selectedCategoryId.set(cat.id);
    this.categoryModalTab.set('general');
    this.isCategoryModalOpen.set(true);
  }

  productsInSelectedCategory = computed(() => {
    const cat = this.selectedCategory();
    if (!cat) return [];
    const catId = cat.id;

    const allProds = this.admin.ds.products();
    const q = this.productSearchQueryInCollection().toLowerCase().trim();

    let list = allProds.filter((p) => {
      const pCatId = p.categoryId || p.category_id || p.category?.id || p.primaryCategory?.id;
      const inPrimary = pCatId === catId;
      const inCategories = p.categories?.some((c: any) => c.id === catId);
      return inPrimary || inCategories;
    });

    if (q) {
      list = list.filter((p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.brand && typeof p.brand === 'string' && p.brand.toLowerCase().includes(q))
      );
    }

    return list;
  });

  collectionMetrics = computed(() => {
    const prods = this.productsInSelectedCategory();
    const total = prods.length;
    const active = prods.filter((p) => p.isActive !== false).length;
    const outOfStock = prods.filter((p) => p.stock === 0 || (p as any).stockStatus === 'OUT_OF_STOCK').length;
    const draft = prods.filter((p) => p.isActive === false).length;
    const featured = prods.filter((p) => p.featured || p.isFeatured).length;

    let totalRating = 0;
    let ratingCount = 0;
    for (const p of prods) {
      const r = Number(p.avgRating || p.averageRating || p.rating || 0);
      if (r > 0) {
        totalRating += r;
        ratingCount++;
      }
    }
    const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : '5.0';

    return { total, active, outOfStock, draft, featured, avgRating };
  });

  productsNotInSelectedCategory = computed(() => {
    const cat = this.selectedCategory();
    if (!cat) return [];
    const catId = cat.id;

    const allProds = this.admin.ds.products();
    const q = this.productSearchQueryForAssign().toLowerCase().trim();

    let list = allProds.filter((p) => {
      const pCatId = p.categoryId || p.category_id || p.category?.id || p.primaryCategory?.id;
      const inPrimary = pCatId === catId;
      const inCategories = p.categories?.some((c: any) => c.id === catId);
      return !inPrimary && !inCategories;
    });

    if (q) {
      list = list.filter((p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.brand && typeof p.brand === 'string' && p.brand.toLowerCase().includes(q))
      );
    }

    return list;
  });

  toggleAssignProductSelection(productId: string) {
    const set = new Set(this.selectedAssignProductIds());
    if (set.has(productId)) {
      set.delete(productId);
    } else {
      set.add(productId);
    }
    this.selectedAssignProductIds.set(set);
  }

  async assignSelectedProductsToCategory() {
    const cat = this.selectedCategory();
    if (!cat) return;
    const catId = cat.id;

    const productIds = Array.from(this.selectedAssignProductIds());
    if (productIds.length === 0) {
      this.toastService.warning('Please select at least one product to assign.');
      return;
    }

    try {
      for (const pId of productIds) {
        await firstValueFrom(this.api.put(`/products/${pId}`, { categoryId: catId, category_id: catId }));
        this.admin.ds.products.update((list) =>
          list.map((p) => (p.id === pId ? { ...p, categoryId: catId, category_id: catId } : p))
        );
      }
      this.toastService.success(`Assigned ${productIds.length} product(s) to "${cat.name}" successfully!`);
      this.selectedAssignProductIds.set(new Set());
      this.isAssignProductsModalOpen.set(false);
    } catch (err: any) {
      console.error('[AssignProducts] Error:', err);
      this.toastService.error(err?.error?.message || 'Failed to assign products to category');
    }
  }

  async removeProductFromCategory(product: any) {
    const cat = this.selectedCategory();
    if (!cat) return;

    if (!confirm(`Remove "${product.name}" from "${cat.name}" collection?`)) return;

    try {
      await firstValueFrom(this.api.put(`/products/${product.id}`, { categoryId: '', category_id: '' }));
      this.admin.ds.products.update((list) =>
        list.map((p) => (p.id === product.id ? ({ ...p, categoryId: '', category_id: '' } as any) : p))
      );
      this.toastService.info(`Removed "${product.name}" from category.`);
    } catch (err: any) {
      console.error('[RemoveProductCategory] Error:', err);
      this.toastService.error(err?.error?.message || 'Failed to remove product from category');
    }
  }

  sortedCategories = computed(() => {
    const cats = this.admin.ds.categories();
    const q = this.categorySearchQuery().toLowerCase().trim();

    const buildTree = (parentId: string | null = null, level = 0, path = ''): any[] => {
      let result: any[] = [];
      const children = cats.filter((c) => (c.parent_id || c.parentId || null) === parentId);

      for (const child of children) {
        const currentPath = path ? `${path} > ${child.name}` : child.name;
        const matchesSearch = !q || child.name.toLowerCase().includes(q) || currentPath.toLowerCase().includes(q);

        const subChildren = buildTree(child.id, level + 1, currentPath);

        if (matchesSearch || subChildren.length > 0) {
          result.push({
            ...child,
            level,
            path: currentPath,
            hasChildren: subChildren.length > 0,
          });
          result = result.concat(subChildren);
        }
      }
      return result;
    };

    return buildTree();
  });

  getProductCount(categoryId: string): number {
    return (this.admin.ds.products() || []).filter(
      (p) => p.category_id === categoryId || p.categoryId === categoryId,
    ).length;
  }

  getCategoryPath(categoryId: string | null): string {
    if (!categoryId) return "";
    const cats = this.admin.ds.categories();
    let current = cats.find((c) => c.id === categoryId);
    if (!current) return "";

    const path: string[] = [current.name];
    while (current?.parent_id || current?.parentId) {
      const parentId: string | null = current.parent_id || current.parentId || null;
      current = cats.find((c) => c.id === parentId);
      if (current) path.unshift(current.name);
      else break;
    }
    return path.join(" > ");
  }

  onCategorySelectionChange(event: { categoryIds: string[]; primaryCategoryId: string | null }) {
    this.admin.pCategoryIds.set(event.categoryIds);
    if (event.primaryCategoryId) {
      this.admin.pCatId.set(event.primaryCategoryId);
    } else if (event.categoryIds.length > 0) {
      this.admin.pCatId.set(event.categoryIds[0]);
    } else {
      this.admin.pCatId.set('');
    }
  }

  async handleDocumentUploadForRow(event: Event, index?: number) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];
      if (file.size > 25 * 1024 * 1024) {
        this.toastService.error(`File ${file.name} exceeds 25MB limit.`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("document", file);
        formData.append("image", file);

        let res: any = null;
        try {
          res = await firstValueFrom(this.http.post<any>("/api/admin/upload-document", formData));
        } catch (err) {
          res = await firstValueFrom(this.http.post<any>("/api/admin/upload-image", formData));
        }

        if (res && (res.success || res.url)) {
          const fileUrl = res.url;
          const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
          const formattedTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

          if (index !== undefined && index >= 0 && index < this.admin.pDownloads().length) {
            this.admin.updateDownload(index, "fileUrl", fileUrl);
            if (!this.admin.pDownloads()[index].title) {
              this.admin.updateDownload(index, "title", formattedTitle);
            }
          } else {
            this.admin.pDownloads.update((list) => [...list, { title: formattedTitle, fileUrl }]);
          }

          this.toastService.success(`Uploaded "${file.name}" successfully.`);
        } else {
          this.toastService.error("Document upload failed.");
        }
      } catch (e) {
        console.error("Failed to upload document file:", e);
        this.toastService.error("Document upload failed.");
      }
    }
    input.value = "";
  }

  uploadProgress = 0;

  activeVariantForImages = signal<number | null>(null);

  // Search signals for product
  pCatSearchQuery = signal<string>("");
  pCatDropdownOpen = signal<boolean>(false);

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

  selectedPreviewOptionValues = signal<Record<string, string>>({});
  selectedPreviewVariantId = signal<string>('');

  selectPreviewOption(optName: string, value: string) {
    this.selectedPreviewVariantId.set('');
    this.selectedPreviewOptionValues.update((current) => ({
      ...current,
      [optName]: value,
    }));
  }

  selectPreviewVariantById(idOrSku: string) {
    this.selectedPreviewVariantId.set(idOrSku);
    const variants = this.admin.pVariants();
    const matched = variants.find((v: any) => (v.id && String(v.id) === String(idOrSku)) || (v.sku && String(v.sku) === String(idOrSku)));
    if (matched && matched.optionValues) {
      this.selectedPreviewOptionValues.set({ ...matched.optionValues });
    }
  }

  getMatchedPreviewVariant(): any {
    const variants = this.admin.pVariants();
    if (!variants || variants.length === 0) return null;

    const selId = this.selectedPreviewVariantId();
    if (selId) {
      const explicit = variants.find((v: any) => String(v.id) === String(selId) || String(v.sku) === String(selId));
      if (explicit) return explicit;
    }

    const selected = this.selectedPreviewOptionValues();
    const activeKeys = Object.keys(selected);

    if (activeKeys.length > 0) {
      const match = variants.find((v: any) => {
        const optVals = v.optionValues || {};
        const optKeys = Object.keys(optVals);
        return activeKeys.every((k) => {
          const targetVal = String(selected[k]).trim().toLowerCase();
          if (!targetVal) return true;
          if (optVals[k] !== undefined) {
            return String(optVals[k]).trim().toLowerCase() === targetVal;
          }
          return optKeys.some(ok => String(optVals[ok]).trim().toLowerCase() === targetVal);
        });
      });
      if (match) return match;
    }

    return variants.find((v: any) => v.isDefault) || variants[0];
  }

  getFirstVariantImageUrl(variant: any): string {
    if (variant) {
      const imgs = variant.variantImages || variant.images || [];
      if (Array.isArray(imgs) && imgs.length > 0) {
        const first = imgs[0];
        const url = typeof first === 'string' ? first : (first?.url || '');
        if (url && url.trim().length > 0) return url;
      }
    }
    const productImgs = this.admin.pImages() || [];
    if (productImgs.length > 0) {
      const pFirst = productImgs[0];
      return typeof pFirst === 'string' ? pFirst : (pFirst?.url || '');
    }
    return '';
  }

  toggleVariantStatus(index: number) {
    const list = [...this.admin.pVariants()];
    if (list[index]) {
      list[index].isActive = list[index].isActive === false ? true : false;
      this.admin.pVariants.set(list);
    }
  }

  setDefaultVariant(index: number) {
    const list = this.admin.pVariants().map((v: any, i: number) => ({
      ...v,
      isDefault: i === index,
    }));
    this.admin.pVariants.set(list);
  }

  addCustomVariant() {
    const list = [...this.admin.pVariants()];
    const defaultSku = (this.admin.pSku() || 'SKU') + '-VAR-' + (list.length + 1);
    list.push({
      id: Date.now().toString(),
      name: 'Custom Variant ' + (list.length + 1),
      sku: defaultSku,
      price: this.admin.pMrp() || 0,
      salePrice: this.admin.pSale() || 0,
      stock: this.admin.pStock() || 10,
      weight: 0,
      variantImages: [],
      optionValues: {},
      isActive: true,
      isDefault: list.length === 0,
    });
    this.admin.pVariants.set(list);
  }

  removeVariant(index: number) {
    const list = [...this.admin.pVariants()];
    list.splice(index, 1);
    this.admin.pVariants.set(list);
  }

  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10);
  itemsPerPageOptions = [10, 20, 50, 100];
  Math = Math;
  Number = Number;

  getOfferDiscountPercent(p: any): number {
    if (!p) return 0;
    const mrp = Number(p.mrp || p.basePrice || 0);
    const sale = Number(p.sale_price || p.salePrice || mrp);
    if (!mrp || mrp <= sale) return 0;
    return Math.round(((mrp - sale) / mrp) * 100);
  }

  getOfferSavings(p: any): number {
    if (!p) return 0;
    const mrp = Number(p.mrp || p.basePrice || 0);
    const sale = Number(p.sale_price || p.salePrice || mrp);
    if (!mrp || mrp <= sale) return 0;
    return Math.round(mrp - sale);
  }

  private searchDebounceTimer: any = null;

  filteredProducts = computed(() => {
    return this.admin.ds.products() || [];
  });

  paginatedProducts = computed(() => {
    const items = this.filteredProducts();
    const page = this.currentPageValid();
    const start = (page - 1) * this.itemsPerPage();
    return items.slice(start, start + this.itemsPerPage());
  });

  totalPages = computed(() => {
    return Math.max(
      1,
      Math.ceil(this.filteredProducts().length / this.itemsPerPage())
    );
  });

  currentPageValid = computed(() => {
    const page = this.currentPage();
    const total = this.totalPages();
    return Math.min(Math.max(1, page), total);
  });

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPageValid();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (current > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (current < total - 2) {
        pages.push('...');
      }
      
      pages.push(total);
    }
    return pages;
  });

  setPage(page: number) {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  constructor() {
    effect(() => {
      const query = this.admin.searchQueryProducts();
      this.currentPage.set(1);
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }
      this.searchDebounceTimer = setTimeout(() => {
        this.admin.ds.reloadProducts(false, true, 500, query);
      }, 300);
    }, { allowSignalWrites: true });
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

  exportCategoriesCsv() {
    const dataToExport = this.admin.ds.categories() || [];
    if (dataToExport.length === 0) {
      this.toastService.warning('No category records to export.');
      return;
    }

    const headers = ['Category ID', 'Name', 'Slug', 'Parent ID', 'Path', 'Sort Order', 'Is Featured', 'Is Active', 'Description'];
    const rows = dataToExport.map(c => [
      `"${c.id}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.slug || ''}"`,
      `"${c.parent_id || c.parentId || ''}"`,
      `"${this.getCategoryPath(c.id).replace(/"/g, '""')}"`,
      c.sortOrder || 0,
      !!c.isFeatured,
      !!(c.isActive !== false),
      `"${(c.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `categories_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastService.success(`Exported ${dataToExport.length} categories.`);
  }

  exportProductsCsv() {
    const dataToExport = this.admin.ds.products() || [];
    if (dataToExport.length === 0) {
      this.toastService.warning('No product records to export.');
      return;
    }

    const headers = ['Product ID', 'Name', 'SKU', 'Barcode', 'Category ID', 'Brand', 'MRP', 'Sale Price', 'Dealer Price', 'Stock', 'Reserved', 'Is Featured', 'Is Exclusive', 'COD Available', 'Description'];
    const rows = dataToExport.map(p => [
      `"${p.id}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      `"${p.barcode || ''}"`,
      `"${p.category_id || p.categoryId || ''}"`,
      `"${(p.brand || '').replace(/"/g, '""')}"`,
      p.mrp || p.basePrice || 0,
      p.sale_price || p.salePrice || 0,
      p.dealer_price || p.dealerPrice || 0,
      p.stock || 0,
      p.reserved || 0,
      !!(p.featured || p.isFeatured),
      !!p.isExclusive,
      !!p.codAvailable,
      `"${(p.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `products_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastService.success(`Exported ${dataToExport.length} products.`);
  }

  exportBrandsCsv() {
    const dataToExport = this.admin.ds.brands() || [];
    if (dataToExport.length === 0) {
      this.toastService.warning('No brand records to export.');
      return;
    }

    const headers = ['Brand ID', 'Name', 'Slug', 'Active', 'Logo URL', 'Description'];
    const rows = dataToExport.map(br => [
      `"${br.id}"`,
      `"${br.name.replace(/"/g, '""')}"`,
      `"${br.slug || ''}"`,
      !!(br.active !== false),
      `"${br.logo || ''}"`,
      `"${(br.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brands_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastService.success(`Exported ${dataToExport.length} brands.`);
  }
}
