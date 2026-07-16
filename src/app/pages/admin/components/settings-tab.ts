import {
  Component,
  Input,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { AdminPanel } from "../admin";
import { ImagePickerComponent } from "../../../shared/components/image-picker/image-picker.component";
import { ThemeService } from "../../../core/services/theme.service";
import { ToastService } from "../../../shared/components/toast/toast.service";

@Component({
  selector: "app-admin-settings-tab",
  standalone: true,
  imports: [CommonModule, MatIconModule, ImagePickerComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fadeIn animate-duration-300 font-sans">
      <!-- HEADER ROW WITH SAVING CONTROLS -->
      <div
        class="flex flex-col md:flex-row md:items-center justify-between border-b dark:border-zinc-800 pb-5 gap-4"
      >
        <div>
          <h1
            class="text-xl font-black uppercase text-zinc-900 dark:text-zinc-100 flex items-center gap-2"
          >
            <mat-icon class="text-blue-600">admin_panel_settings</mat-icon>
            System Core Configurator
          </h1>
          <p class="text-xs text-zinc-500">
            Formulate and manage gateways, typography, brand assets, and
            services globally.
          </p>
        </div>
        <div class="flex items-center gap-2">
          @if (isSaving()) {
            <span
              class="text-xs text-zinc-400 font-black uppercase tracking-wider flex items-center gap-1.5 leading-none animate-pulse"
            >
              <mat-icon class="animate-spin text-sm text-yellow-500"
                >rotate_right</mat-icon
              >
              Syncing Database...
            </span>
          }
          <button
            (click)="saveAllSettings()"
            [disabled]="isSaving()"
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase transition-all duration-300 cursor-pointer shadow-sm shadow-blue-500/20 disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
            id="save-all-settings-btn"
          >
            <mat-icon class="text-sm">save</mat-icon>
            Save All Configurations
          </button>
        </div>
      </div>

      <!-- TABBED SUB-BOARD LAYOUT -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- SUB-LINKS LEFT (23 DISTINCT DYNAMIC MODULES) -->
        <div
          class="flex flex-col gap-1 lg:border-r lg:border-zinc-200 dark:lg:border-zinc-800 pr-4 max-h-[70vh] overflow-y-auto scrollbar-thin"
        >
          @for (tab of subTabs; track tab.name) {
            <button
              (click)="activeSubTab.set(tab.name)"
              [class.bg-blue-50]="activeSubTab() === tab.name"
              [class.text-blue-600]="activeSubTab() === tab.name"
              [class.dark:bg-zinc-800]="activeSubTab() === tab.name"
              [class.dark:text-blue-400]="activeSubTab() === tab.name"
              [class.border-l-4]="activeSubTab() === tab.name"
              [class.border-blue-600]="activeSubTab() === tab.name"
              class="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded text-[11px] font-black uppercase select-none transition-all cursor-pointer text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <mat-icon class="text-base">{{ tab.icon }}</mat-icon>
              {{ tab.name }}
            </button>
          }
        </div>

        <!-- ACTIVE DETAILS RIGHT CANVAS -->
        <div class="lg:col-span-3 space-y-6">
          <div
            class="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-6"
          >
            <div
              class="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center justify-between"
            >
              <h2
                class="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
              >
                <mat-icon class="text-blue-500 text-lg"
                  >settings_applications</mat-icon
                >
                {{ activeSubTab() }} Settings
              </h2>
              <span
                class="text-[9px] px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-extrabold uppercase rounded-full"
                >ACTIVE PANEL</span
              >
            </div>

            <!-- 1. GENERAL -->
            @if (activeSubTab() === "General") {
              <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Site/Store Name</span
                    >
                    <input
                      type="text"
                      [value]="draft().siteName || ''"
                      (input)="setVal('siteName', $any($event.target).value)"
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Default Store Currency Symbol</span
                    >
                    <input
                      type="text"
                      [value]="draft().currency || '₹'"
                      (input)="setVal('currency', $any($event.target).value)"
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                </div>
                <div class="space-y-1">
                  <span
                    class="block text-[9px] font-black text-zinc-400 uppercase"
                    >System Logo Web Resource</span
                  >
                  <app-image-picker
                    [value]="draft().logoUrl || ''"
                    (valueChange)="setVal('logoUrl', $event)"
                  ></app-image-picker>
                </div>
                <!-- Company Info -->
                <div class="space-y-1">
                  <span
                    class="block text-[9px] font-black text-zinc-400 uppercase"
                    >Company/Store Description</span
                  >
                  <textarea
                    rows="3"
                    [value]="draft().companyInfo?.description || ''"
                    (input)="
                      setNested(
                        'companyInfo',
                        'description',
                        $any($event.target).value
                      )
                    "
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium outline-none"
                  ></textarea>
                </div>
              </div>
            }

            <!-- 2. THEME -->
            @if (activeSubTab() === "Theme") {
              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    class="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                  >
                    <span class="text-[10px] font-black uppercase text-zinc-500"
                      >Primary Color Palette</span
                    >
                    <input
                      type="color"
                      [value]="draft().theme?.primaryColor || '#2563EB'"
                      (input)="
                        setNested(
                          'theme',
                          'primaryColor',
                          $any($event.target).value
                        )
                      "
                      class="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
                    />
                  </div>
                  <div
                    class="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                  >
                    <span class="text-[10px] font-black uppercase text-zinc-500"
                      >Secondary Accent Palette</span
                    >
                    <input
                      type="color"
                      [value]="draft().theme?.secondaryColor || '#7C3AED'"
                      (input)="
                        setNested(
                          'theme',
                          'secondaryColor',
                          $any($event.target).value
                        )
                      "
                      class="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <app-image-picker
                    label="Header Logo"
                    [value]="draft().theme?.logo || ''"
                    (valueChange)="setNested('theme', 'logo', $event)"
                  ></app-image-picker>
                  <app-image-picker
                    label="Store Favicon"
                    [value]="draft().theme?.favicon || ''"
                    (valueChange)="setNested('theme', 'favicon', $event)"
                  ></app-image-picker>
                </div>
              </div>
            }

            <!-- Theme Effects Configuration -->
            @if (activeSubTab() === "Theme Effects") {
              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Global Animation Speed</span
                    >
                    <select
                      [value]="draft().theme?.animationSpeed || '0.5s'"
                      (change)="
                        setNested(
                          'theme',
                          'animationSpeed',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="0.3s">Fast (0.3s)</option>
                      <option value="0.5s">Default (0.5s)</option>
                      <option value="0.8s">Slow (0.8s)</option>
                    </select>
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Global Animation Style (Easing)</span
                    >
                    <select
                      [value]="
                        draft().theme?.animationStyle ||
                        'cubic-bezier(0.16, 1, 0.3, 1)'
                      "
                      (change)="
                        setNested(
                          'theme',
                          'animationStyle',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="cubic-bezier(0.16, 1, 0.3, 1)">
                        Framer Motion Spring (Cubic-Bezier)
                      </option>
                      <option value="ease-in-out">Smooth (Ease-In-Out)</option>
                      <option value="linear">Linear</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Page Transition Effect</span
                    >
                    <select
                      [value]="draft().theme?.pageTransition || 'fade'"
                      (change)="
                        setNested(
                          'theme',
                          'pageTransition',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="fade">Fade In</option>
                      <option value="slide">Slide Up & Fade</option>
                      <option value="zoom">Zoom Scale In</option>
                    </select>
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Card Hover Interaction Style</span
                    >
                    <select
                      [value]="draft().theme?.hoverStyle || 'translateY(-8px)'"
                      (change)="
                        setNested(
                          'theme',
                          'hoverStyle',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="translateY(-8px)">
                        Premium Lift Offset (translateY -8px)
                      </option>
                      <option value="scale(1.04)">
                        Subtle Scale Pop (scale 1.04)
                      </option>
                      <option value="none">Flat (No Offset)</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Dashboard Card Styling</span
                    >
                    <select
                      [value]="draft().theme?.cardStyle || 'glassmorphism'"
                      (change)="
                        setNested(
                          'theme',
                          'cardStyle',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="glassmorphism">
                        Premium Frosted Glassmorphism
                      </option>
                      <option value="rounded-glow">
                        High-End Rounded Glow
                      </option>
                      <option value="flat-modern">
                        Flat Minimalist Border
                      </option>
                    </select>
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Primary Button Layout Shape</span
                    >
                    <select
                      [value]="draft().theme?.buttonStyle || 'rounded-xl'"
                      (change)="
                        setNested(
                          'theme',
                          'buttonStyle',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="rounded-xl">
                        Dynamic Rounded Corner (rounded-xl)
                      </option>
                      <option value="rounded-full">
                        Sleek Capsule Pill (rounded-full)
                      </option>
                      <option value="rounded-none">
                        Square Industrial Brutalist (rounded-none)
                      </option>
                    </select>
                  </div>
                </div>

                <div
                  class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl"
                >
                  <input
                    type="checkbox"
                    [checked]="draft().theme?.parallaxEnabled !== false"
                    (change)="
                      setNested(
                        'theme',
                        'parallaxEnabled',
                        $any($event.target).checked
                      )
                    "
                    class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span
                    class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                    >Enable Depth Scroll Parallax Interactions</span
                  >
                </div>
              </div>
            }

            <!-- 3. TYPOGRAPHY -->
            @if (activeSubTab() === "Typography") {
              <div class="space-y-4">
                <div class="space-y-1">
                  <span
                    class="block text-[9px] font-black text-zinc-400 uppercase"
                    >Primary Typography Family</span
                  >
                  <select
                    [value]="draft().theme?.fontFamily || 'Inter'"
                    (change)="
                      setNested(
                        'theme',
                        'fontFamily',
                        $any($event.target).value
                      )
                    "
                    class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="Inter">Inter (Swiss Modernist Sans)</option>
                    <option value="Space Grotesk">
                      Space Grotesk (Tech Editorial)
                    </option>
                    <option value="JetBrains Mono">
                      JetBrains Mono (Console Brutalist)
                    </option>
                    <option value="Playfair Display">
                      Playfair Display (Premium Editorial)
                    </option>
                  </select>
                </div>
                <div class="space-y-1">
                  <span
                    class="block text-[9px] font-black text-zinc-400 uppercase"
                    >Headings Accent Font</span
                  >
                  <input
                    type="text"
                    [value]="draft().theme?.headingsFont || 'Space Grotesk'"
                    (input)="
                      setNested(
                        'theme',
                        'headingsFont',
                        $any($event.target).value
                      )
                    "
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>
            }

            <!-- 4. FONTS -->
            @if (activeSubTab() === "Fonts") {
              <div class="space-y-4">
                <p class="text-xs text-zinc-500">
                  Define external typography loads to load on application
                  viewport load.
                </p>
                @for (font of draft().managedFonts || []; track $index) {
                  <div class="flex items-center gap-2">
                    <input
                      type="text"
                      [value]="font"
                      (input)="
                        updateArrayItem(
                          'managedFonts',
                          $index,
                          $any($event.target).value
                        )
                      "
                      class="flex-1 px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                    <button
                      (click)="removeArrayItem('managedFonts', $index)"
                      class="p-2 text-red-500 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                    >
                      <mat-icon class="text-sm">delete</mat-icon>
                    </button>
                  </div>
                }
                <button
                  (click)="appendArrayItem('managedFonts', 'Inter')"
                  class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer w-fit"
                >
                  <mat-icon class="text-sm">add</mat-icon> Include Font
                </button>
              </div>
            }

            <!-- 5. COLOR PRESETS -->
            @if (activeSubTab() === "Color Presets") {
              <div class="space-y-4">
                <p class="text-xs text-zinc-500">
                  Maintain custom hex presets list for rapid template rendering
                  alterations.
                </p>
                <div class="grid grid-cols-2 gap-2">
                  @for (preset of draft().colorPresets || []; track $index) {
                    <div
                      class="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl"
                    >
                      <input
                        type="color"
                        [value]="preset"
                        (input)="
                          updateArrayItem(
                            'colorPresets',
                            $index,
                            $any($event.target).value
                          )
                        "
                        class="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                      />
                      <input
                        type="text"
                        [value]="preset"
                        (input)="
                          updateArrayItem(
                            'colorPresets',
                            $index,
                            $any($event.target).value
                          )
                        "
                        class="flex-1 px-2 py-1 bg-transparent border-none text-xs font-mono font-bold outline-none leading-none"
                      />
                      <button
                        (click)="removeArrayItem('colorPresets', $index)"
                        class="p-1 text-red-500 hover:bg-zinc-100 rounded cursor-pointer flex items-center justify-center"
                      >
                        <mat-icon class="text-xs text-[14px]">close</mat-icon>
                      </button>
                    </div>
                  }
                </div>
                <button
                  (click)="appendArrayItem('colorPresets', '#3B82F6')"
                  class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer w-fit"
                >
                  <mat-icon class="text-sm">palette</mat-icon> Add Color Preset
                </button>
              </div>
            }

            <!-- 6. HERO SLIDES -->
            @if (activeSubTab() === "Hero Slides") {
              <div class="space-y-5">
                <p class="text-xs text-zinc-500">
                  Provide high-contrast sliders for your central hero carousel.
                </p>
                <div class="space-y-4">
                  @for (slide of draft().heroSlides || []; track $index) {
                    <div
                      class="p-5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4 relative"
                    >
                      <div class="absolute top-2 right-2">
                        <button
                          (click)="removeArrayItem('heroSlides', $index)"
                          class="text-red-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                        >
                          <mat-icon class="text-base">delete</mat-icon>
                        </button>
                      </div>

                      <!-- Row 1: Title, Subheading, Redirect Link -->
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Slide Title</span
                          >
                          <input
                            type="text"
                            [value]="slide.title"
                            (input)="
                              updateSlideField(
                                $index,
                                'title',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Slide Subheading</span
                          >
                          <input
                            type="text"
                            [value]="slide.subtitle"
                            (input)="
                              updateSlideField(
                                $index,
                                'subtitle',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Target Redirect Link URL</span
                          >
                          <input
                            type="text"
                            [value]="slide.linkUrl"
                            (input)="
                              updateSlideField(
                                $index,
                                'linkUrl',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                      </div>

                      <!-- Row 2: Badge, Badge Icon, Button CTA, Secondary Button Text -->
                      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Badge Label</span
                          >
                          <input
                            type="text"
                            [value]="slide.badge || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'badge',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            placeholder="e.g. Featured"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Badge Icon (Material)</span
                          >
                          <input
                            type="text"
                            [value]="slide.badgeIcon || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'badgeIcon',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            placeholder="e.g. bolt"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Button CTA Text</span
                          >
                          <input
                            type="text"
                            [value]="slide.btnText || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'btnText',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            placeholder="e.g. Buy Now"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Secondary Button Text</span
                          >
                          <input
                            type="text"
                            [value]="slide.secBtnText || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'secBtnText',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            placeholder="e.g. View Details"
                          />
                        </div>
                      </div>

                      <!-- Row 3: Pricing and tags: Price, Old Price, Discount Text, Product Tag -->
                      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Price (Current)</span
                          >
                          <input
                            type="text"
                            [value]="slide.price || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'price',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            placeholder="e.g. 48999"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Old Price (Strike)</span
                          >
                          <input
                            type="text"
                            [value]="slide.oldPrice || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'oldPrice',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            placeholder="e.g. 55000"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Discount Text</span
                          >
                          <input
                            type="text"
                            [value]="slide.discountText || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'discountText',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            placeholder="e.g. 11% OFF"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Product Tag</span
                          >
                          <input
                            type="text"
                            [value]="slide.productTag || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'productTag',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            placeholder="e.g. Hot"
                          />
                        </div>
                      </div>

                      <!-- Row 4: Background Video/Image/Gradient/Color -->
                      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Background Video URL</span
                          >
                          <input
                            type="text"
                            [value]="slide.bgVideoUrl || slide.videoUrl || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'bgVideoUrl',
                                $any($event.target).value
                              );
                              updateSlideField(
                                $index,
                                'videoUrl',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            placeholder="e.g. https://...mp4"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Background Image URL</span
                          >
                          <input
                            type="text"
                            [value]="slide.bgImageUrl || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'bgImageUrl',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            placeholder="e.g. https://...jpg"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Background Gradient</span
                          >
                          <input
                            type="text"
                            [value]="slide.bgGradient || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'bgGradient',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            placeholder="e.g. linear-gradient(...)"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Background Color</span
                          >
                          <div class="flex items-center gap-2">
                            <input
                              type="color"
                              [value]="slide.bgColor || '#09090b'"
                              (input)="
                                updateSlideField(
                                  $index,
                                  'bgColor',
                                  $any($event.target).value
                                )
                              "
                              class="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                            />
                            <input
                              type="text"
                              [value]="slide.bgColor || '#09090b'"
                              (input)="
                                updateSlideField(
                                  $index,
                                  'bgColor',
                                  $any($event.target).value
                                )
                              "
                              class="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <!-- Row 5: Animation, Overlay, Alignment, Button Theme -->
                      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Animation Type</span
                          >
                          <select
                            [value]="slide.animationType || 'fade'"
                            (change)="
                              updateSlideField(
                                $index,
                                'animationType',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          >
                            <option value="fade">Fade</option>
                            <option value="slide-left">Slide Left</option>
                            <option value="slide-right">Slide Right</option>
                            <option value="scale">Scale</option>
                            <option value="zoom">Zoom</option>
                            <option value="blur-reveal">Blur Reveal</option>
                          </select>
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Overlay Opacity (0.0 to 1.0)</span
                          >
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            [value]="slide.overlayOpacity ?? 0.4"
                            (input)="
                              updateSlideField(
                                $index,
                                'overlayOpacity',
                                +$any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Text Alignment</span
                          >
                          <select
                            [value]="slide.textAlignment || 'left'"
                            (change)="
                              updateSlideField(
                                $index,
                                'textAlignment',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Button Theme</span
                          >
                          <select
                            [value]="slide.btnTheme || 'primary'"
                            (change)="
                              updateSlideField(
                                $index,
                                'btnTheme',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          >
                            <option value="primary">
                              Primary (Theme Accent)
                            </option>
                            <option value="secondary">
                              Secondary (Theme Secondary)
                            </option>
                            <option value="accent">
                              Accent (Glassmorphism / Bordered)
                            </option>
                          </select>
                        </div>
                      </div>

                      <!-- Row 6: Duration, Slide Order, Boolean switches -->
                      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Slide Duration (ms)</span
                          >
                          <input
                            type="number"
                            [value]="slide.slideDuration ?? 3000"
                            (input)="
                              updateSlideField(
                                $index,
                                'slideDuration',
                                +$any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Slide Order</span
                          >
                          <input
                            type="number"
                            [value]="slide.slideOrder ?? 0"
                            (input)="
                              updateSlideField(
                                $index,
                                'slideOrder',
                                +$any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div class="flex items-center gap-2 pt-4">
                          <input
                            type="checkbox"
                            [checked]="slide.active ?? true"
                            (change)="
                              updateSlideField(
                                $index,
                                'active',
                                $any($event.target).checked
                              )
                            "
                            class="w-4 h-4 cursor-pointer"
                          />
                          <span
                            class="text-xs text-zinc-700 dark:text-zinc-300 font-bold uppercase select-none"
                            >Active</span
                          >
                        </div>
                        <div class="flex items-center gap-2 pt-4">
                          <input
                            type="checkbox"
                            [checked]="slide.darkOverlay ?? true"
                            (change)="
                              updateSlideField(
                                $index,
                                'darkOverlay',
                                $any($event.target).checked
                              )
                            "
                            class="w-4 h-4 cursor-pointer"
                          />
                          <span
                            class="text-xs text-zinc-700 dark:text-zinc-300 font-bold uppercase select-none"
                            >Dark Overlay</span
                          >
                        </div>
                      </div>

                      <!-- Row 7: Device Visibility switches -->
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div class="flex items-center gap-2">
                          <input
                            type="checkbox"
                            [checked]="slide.hideOnMobile ?? false"
                            (change)="
                              updateSlideField(
                                $index,
                                'hideOnMobile',
                                $any($event.target).checked
                              )
                            "
                            class="w-4 h-4 cursor-pointer"
                          />
                          <span
                            class="text-xs text-zinc-700 dark:text-zinc-300 font-bold uppercase select-none text-[10px]"
                            >Hide on Mobile</span
                          >
                        </div>
                        <div class="flex items-center gap-2">
                          <input
                            type="checkbox"
                            [checked]="slide.hideOnDesktop ?? false"
                            (change)="
                              updateSlideField(
                                $index,
                                'hideOnDesktop',
                                $any($event.target).checked
                              )
                            "
                            class="w-4 h-4 cursor-pointer"
                          />
                          <span
                            class="text-xs text-zinc-700 dark:text-zinc-300 font-bold uppercase select-none text-[10px]"
                            >Hide on Desktop</span
                          >
                        </div>
                      </div>

                      <!-- Row 8: Image Resources -->
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <app-image-picker
                          label="Desktop Image Resource"
                          [value]="slide.imageUrl"
                          (valueChange)="
                            updateSlideField($index, 'imageUrl', $event)
                          "
                        ></app-image-picker>
                        <app-image-picker
                          label="Mobile Image Resource"
                          [value]="slide.mobileImageUrl || ''"
                          (valueChange)="
                            updateSlideField($index, 'mobileImageUrl', $event)
                          "
                        ></app-image-picker>
                      </div>

                      <div class="space-y-1">
                        <span
                          class="block text-[8px] font-black text-zinc-400 uppercase"
                          >Slide Description</span
                        >
                        <textarea
                          rows="2"
                          [value]="slide.desc || ''"
                          (input)="
                            updateSlideField(
                              $index,
                              'desc',
                              $any($event.target).value
                            )
                          "
                          class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          placeholder="Provide slide details paragraph..."
                        ></textarea>
                      </div>
                    </div>
                  }
                </div>
                <button
                  (click)="addHeroSlide()"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase shadow-xs transition-all flex items-center gap-1 cursor-pointer w-fit"
                >
                  <mat-icon class="text-sm">add_to_photos</mat-icon> Insert
                  Slide Frame
                </button>
              </div>
            }

            <!-- HERO CAROUSEL -->
            @if (activeSubTab() === "Hero Carousel") {
              <div class="space-y-4 font-sans">
                <p class="text-xs text-zinc-500">
                  Manage settings for the dynamic Homepage Hero Product
                  Carousel.
                </p>

                <div
                  class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
                >
                  <div>
                    <span
                      class="block text-xs font-black uppercase text-zinc-900 dark:text-white"
                      >Enable Hero Product Carousel</span
                    >
                    <p class="text-[10px] text-zinc-400">
                      Toggle whether the premium featured product carousel
                      displays on the homepage.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    [checked]="draft().heroCarousel?.enabled"
                    (change)="
                      setNested(
                        'heroCarousel',
                        'enabled',
                        $any($event.target).checked
                      )
                    "
                    class="w-5 h-5 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer animate-none"
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <span
                        class="block text-xs font-black uppercase text-zinc-900 dark:text-white"
                        >Auto Play Carousel</span
                      >
                      <p class="text-[10px] text-zinc-400">
                        Enable automatic transitions between slides.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      [checked]="draft().heroCarousel?.autoplay !== false"
                      (change)="
                        setNested(
                          'heroCarousel',
                          'autoplay',
                          $any($event.target).checked
                        )
                      "
                      class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer animate-none"
                    />
                  </div>

                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Transition Speed (Interval ms)</span
                    >
                    <input
                      type="number"
                      [value]="draft().heroCarousel?.interval ?? 5000"
                      (input)="
                        setNested(
                          'heroCarousel',
                          'interval',
                          +$any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Animation Type</span
                    >
                    <select
                      [value]="draft().heroCarousel?.transition || 'fade'"
                      (change)="
                        setNested(
                          'heroCarousel',
                          'transition',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="fade">Fade (Crossfade)</option>
                      <option value="slide">Slide (Horizontal Swipe)</option>
                    </select>
                  </div>

                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Background Style</span
                    >
                    <select
                      [value]="
                        draft().heroCarousel?.backgroundStyle || 'dynamic'
                      "
                      (change)="
                        setNested(
                          'heroCarousel',
                          'backgroundStyle',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="dynamic">
                        Dynamic Color Theme (Brand Palette Gradients)
                      </option>
                      <option value="fixed">Fixed Global Dark Gradients</option>
                    </select>
                  </div>
                </div>

                <div
                  class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4"
                >
                  <h3
                    class="text-xs font-black uppercase tracking-wider text-zinc-400"
                  >
                    Content Visibility Toggles
                  </h3>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="draft().heroCarousel?.showPrice !== false"
                        (change)="
                          setNested(
                            'heroCarousel',
                            'showPrice',
                            $any($event.target).checked
                          )
                        "
                        class="w-4 h-4 text-blue-600 rounded cursor-pointer animate-none"
                      />
                      <span
                        class="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300"
                        >Show Price</span
                      >
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="draft().heroCarousel?.showDiscount !== false"
                        (change)="
                          setNested(
                            'heroCarousel',
                            'showDiscount',
                            $any($event.target).checked
                          )
                        "
                        class="w-4 h-4 text-blue-600 rounded cursor-pointer animate-none"
                      />
                      <span
                        class="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300"
                        >Show Discount</span
                      >
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="draft().heroCarousel?.showBrand !== false"
                        (change)="
                          setNested(
                            'heroCarousel',
                            'showBrand',
                            $any($event.target).checked
                          )
                        "
                        class="w-4 h-4 text-blue-600 rounded cursor-pointer animate-none"
                      />
                      <span
                        class="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300"
                        >Show Brand</span
                      >
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="
                          draft().heroCarousel?.showDescription !== false
                        "
                        (change)="
                          setNested(
                            'heroCarousel',
                            'showDescription',
                            $any($event.target).checked
                          )
                        "
                        class="w-4 h-4 text-blue-600 rounded cursor-pointer animate-none"
                      />
                      <span
                        class="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300"
                        >Show Description</span
                      >
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="draft().heroCarousel?.showCTA !== false"
                        (change)="
                          setNested(
                            'heroCarousel',
                            'showCTA',
                            $any($event.target).checked
                          )
                        "
                        class="w-4 h-4 text-blue-600 rounded cursor-pointer animate-none"
                      />
                      <span
                        class="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300"
                        >Show CTA</span
                      >
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="
                          draft().heroCarousel?.showNavigation !== false
                        "
                        (change)="
                          setNested(
                            'heroCarousel',
                            'showNavigation',
                            $any($event.target).checked
                          )
                        "
                        class="w-4 h-4 text-blue-600 rounded cursor-pointer animate-none"
                      />
                      <span
                        class="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300"
                        >Show Navigation</span
                      >
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="
                          draft().heroCarousel?.showIndicators !== false
                        "
                        (change)="
                          setNested(
                            'heroCarousel',
                            'showIndicators',
                            $any($event.target).checked
                          )
                        "
                        class="w-4 h-4 text-blue-600 rounded cursor-pointer animate-none"
                      />
                      <span
                        class="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300"
                        >Show Indicators</span
                      >
                    </label>
                  </div>
                </div>
              </div>
            }

            <!-- 7. PROMO BANNERS -->
            @if (activeSubTab() === "Promo Banners") {
              <div class="space-y-5">
                <p class="text-xs text-zinc-500">
                  Organize flash promotional banners placed across store
                  sections.
                </p>
                <div class="space-y-4">
                  @for (banner of draft().promoBanners || []; track $index) {
                    <div
                      class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3 relative"
                    >
                      <div class="absolute top-2 right-2">
                        <button
                          (click)="removeArrayItem('promoBanners', $index)"
                          class="text-red-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 p-1.5 rounded-xl cursor-pointer flex items-center justify-center"
                        >
                          <mat-icon class="text-base">delete</mat-icon>
                        </button>
                      </div>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Tagline / Title</span
                          >
                          <input
                            type="text"
                            [value]="banner.title || ''"
                            (input)="
                              updatePromoBannerField(
                                $index,
                                'title',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Discount Markdown</span
                          >
                          <input
                            type="text"
                            [value]="banner.discountText || ''"
                            (input)="
                              updatePromoBannerField(
                                $index,
                                'discountText',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Destination URL</span
                          >
                          <input
                            type="text"
                            [value]="banner.linkUrl || ''"
                            (input)="
                              updatePromoBannerField(
                                $index,
                                'linkUrl',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                      </div>
                      <app-image-picker
                        label="Banner Graphic Wallpaper URL"
                        [value]="banner.imageUrl || ''"
                        (valueChange)="
                          updatePromoBannerField($index, 'imageUrl', $event)
                        "
                      ></app-image-picker>
                    </div>
                  }
                </div>
                <button
                  (click)="addPromoBanner()"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase shadow-xs transition-all flex items-center gap-1 cursor-pointer w-fit"
                >
                  <mat-icon class="text-sm">add</mat-icon> Insert Promo Banner
                </button>
              </div>
            }

            <!-- 8. ADVERTISEMENTS -->
            @if (activeSubTab() === "Advertisements") {
              <div class="space-y-5">
                <p class="text-xs text-zinc-500">
                  Provide third-party/internal advertisements for secondary grid
                  placeholders.
                </p>
                <div class="space-y-4">
                  @for (ad of draft().advertisements || []; track $index) {
                    <div
                      class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3 relative"
                    >
                      <div class="absolute top-2 right-2">
                        <button
                          (click)="removeArrayItem('advertisements', $index)"
                          class="text-red-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 p-1.5 rounded-xl cursor-pointer flex items-center justify-center"
                        >
                          <mat-icon class="text-base">delete</mat-icon>
                        </button>
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Ad Headline</span
                          >
                          <input
                            type="text"
                            [value]="ad.title || ''"
                            (input)="
                              updateAdField(
                                $index,
                                'title',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Ad Clickthrough URL</span
                          >
                          <input
                            type="text"
                            [value]="ad.linkUrl || ''"
                            (input)="
                              updateAdField(
                                $index,
                                'linkUrl',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                      </div>
                      <app-image-picker
                        label="Ad Visual Banner asset"
                        [value]="ad.imageUrl || ''"
                        (valueChange)="
                          updateAdField($index, 'imageUrl', $event)
                        "
                      ></app-image-picker>
                    </div>
                  }
                </div>
                <button
                  (click)="addAd()"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase shadow-xs transition-all flex items-center gap-1 cursor-pointer w-fit"
                >
                  <mat-icon class="text-sm">add</mat-icon> Insert Advertisement
                  frame
                </button>
              </div>
            }

            <!-- 9. HOMEPAGE SECTIONS -->
            @if (activeSubTab() === "Homepage Sections") {
              <div class="space-y-4">
                <p class="text-xs text-zinc-500">
                  Pick catalog item ids to populate featured sections
                  dynamically on the user store index.
                </p>
                <div
                  class="space-y-4 border border-zinc-100 dark:border-zinc-800 p-4 rounded-xl"
                >
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Featured Category slugs (top 5 products will display
                      dynamically per category)</span
                    >
                    <input
                      type="text"
                      [value]="
                        draft().homePageSections?.featuredCategories?.join(
                          ', '
                        ) || ''
                      "
                      (input)="
                        setArrayFromCsv(
                          'homePageSections',
                          'featuredCategories',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Featured Products ID list</span
                    >
                    <input
                      type="text"
                      [value]="
                        draft().homePageSections?.featuredProducts?.join(
                          ', '
                        ) || ''
                      "
                      (input)="
                        setArrayFromCsv(
                          'homePageSections',
                          'featuredProducts',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Best Selling Items ID list</span
                    >
                    <input
                      type="text"
                      [value]="
                        draft().homePageSections?.bestSellers?.join(', ') || ''
                      "
                      (input)="
                        setArrayFromCsv(
                          'homePageSections',
                          'bestSellers',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            }

            <!-- 10. FOOTER -->
            @if (activeSubTab() === "Footer") {
              <div class="space-y-4">
                <div class="space-y-1">
                  <span
                    class="block text-[9px] font-black text-zinc-400 uppercase"
                    >Footer Legal Corporate Copywrite Text</span
                  >
                  <input
                    type="text"
                    [value]="draft().footer?.description || ''"
                    (input)="
                      setNested(
                        'footer',
                        'description',
                        $any($event.target).value
                      )
                    "
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                  />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <app-image-picker
                    label="Footer Branding Logo Icon"
                    [value]="draft().footer?.footerLogoUrl || ''"
                    (valueChange)="setNested('footer', 'footerLogoUrl', $event)"
                  ></app-image-picker>
                  <app-image-picker
                    label="Payment Modes Trust Badge Image"
                    [value]="draft().footer?.paymentIconsUrl || ''"
                    (valueChange)="
                      setNested('footer', 'paymentIconsUrl', $event)
                    "
                  ></app-image-picker>
                </div>
              </div>
            }

            <!-- 11. ABOUT PAGE -->
            @if (activeSubTab() === "About Page") {
              <div class="space-y-4">
                <div class="space-y-1">
                  <span
                    class="block text-[9px] font-black text-zinc-400 uppercase"
                    >Hero Mission Headline</span
                  >
                  <input
                    type="text"
                    [value]="draft().aboutPage?.headline || ''"
                    (input)="
                      setNested(
                        'aboutPage',
                        'headline',
                        $any($event.target).value
                      )
                    "
                    class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div class="space-y-1">
                  <span
                    class="block text-[9px] font-black text-zinc-400 uppercase"
                    >Core Content Story Body</span
                  >
                  <textarea
                    rows="4"
                    [value]="draft().aboutPage?.bodyText || ''"
                    (input)="
                      setNested(
                        'aboutPage',
                        'bodyText',
                        $any($event.target).value
                      )
                    "
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium outline-none"
                  ></textarea>
                </div>
              </div>
            }

            <!-- 12. CONTACT -->
            @if (activeSubTab() === "Contact") {
              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Sales Support Hotline</span
                    >
                    <input
                      type="text"
                      [value]="draft().contact?.phone || ''"
                      (input)="
                        setNested('contact', 'phone', $any($event.target).value)
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Core Escalations Mailbox (Email)</span
                    >
                    <input
                      type="text"
                      [value]="draft().contact?.email || ''"
                      (input)="
                        setNested('contact', 'email', $any($event.target).value)
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                </div>
                <div class="space-y-1">
                  <span
                    class="block text-[9px] font-black text-zinc-400 uppercase"
                    >Central HQ Physical Address Coordinates</span
                  >
                  <input
                    type="text"
                    [value]="draft().contact?.address || ''"
                    (input)="
                      setNested('contact', 'address', $any($event.target).value)
                    "
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>
            }

            <!-- 13. SOCIAL LINKS -->
            @if (activeSubTab() === "Social Links") {
              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Facebook URL</span
                    >
                    <input
                      type="text"
                      [value]="draft().socialLinks?.facebook || ''"
                      (input)="
                        setNested(
                          'socialLinks',
                          'facebook',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Instagram Handles Link</span
                    >
                    <input
                      type="text"
                      [value]="draft().socialLinks?.instagram || ''"
                      (input)="
                        setNested(
                          'socialLinks',
                          'instagram',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div
                    class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-4"
                  >
                    <h3
                      class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                    >
                      Instagram Feed Settings
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div class="space-y-1">
                        <label
                          class="block text-[9px] font-black text-zinc-400 uppercase"
                        >
                          Enable Instagram Feed
                        </label>
                        <input
                          type="checkbox"
                          [checked]="
                            draft().instagramFeedSettings?.enabled || false
                          "
                          (change)="
                            setNested(
                              'instagramFeedSettings',
                              'enabled',
                              $any($event.target).checked
                            )
                          "
                          class="h-4 w-4"
                        />
                      </div>
                      <div class="space-y-1">
                        <label
                          class="block text-[9px] font-black text-zinc-400 uppercase"
                        >
                          Instagram Profile ID
                        </label>
                        <input
                          type="text"
                          [value]="
                            draft().instagramFeedSettings?.profileId || 'me'
                          "
                          (input)="
                            setNested(
                              'instagramFeedSettings',
                              'profileId',
                              $any($event.target).value
                            )
                          "
                          class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                        />
                      </div>
                      <div class="space-y-1">
                        <label
                          class="block text-[9px] font-black text-zinc-400 uppercase"
                        >
                          Instagram Access Token
                        </label>
                        <input
                          type="text"
                          [value]="
                            draft().instagramFeedSettings?.accessToken || ''
                          "
                          (input)="
                            setNested(
                              'instagramFeedSettings',
                              'accessToken',
                              $any($event.target).value
                            )
                          "
                          class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                        />
                      </div>
                      <div class="space-y-1">
                        <label
                          class="block text-[9px] font-black text-zinc-400 uppercase"
                        >
                          Posts To Show
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          [value]="
                            draft().instagramFeedSettings?.postCount || 6
                          "
                          (input)="
                            setNested(
                              'instagramFeedSettings',
                              'postCount',
                              $any($event.target).valueAsNumber || 6
                            )
                          "
                          class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                        />
                      </div>
                      <div class="space-y-1">
                        <label
                          class="block text-[9px] font-black text-zinc-400 uppercase"
                        >
                          Cache Duration (mins)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="120"
                          [value]="
                            draft().instagramFeedSettings?.cacheMinutes || 30
                          "
                          (input)="
                            setNested(
                              'instagramFeedSettings',
                              'cacheMinutes',
                              $any($event.target).valueAsNumber || 30
                            )
                          "
                          class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                        />
                      </div>
                      <div class="space-y-1 sm:col-span-2">
                        <label
                          class="block text-[9px] font-black text-zinc-400 uppercase"
                        >
                          Instagram Profile Name
                        </label>
                        <input
                          type="text"
                          [value]="
                            draft().instagramFeedSettings?.profileName || ''
                          "
                          (input)="
                            setNested(
                              'instagramFeedSettings',
                              'profileName',
                              $any($event.target).value
                            )
                          "
                          class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                        />
                      </div>
                      <div class="space-y-1 sm:col-span-2">
                        <label
                          class="block text-[9px] font-black text-zinc-400 uppercase"
                        >
                          Profile Picture URL
                        </label>
                        <input
                          type="text"
                          [value]="
                            draft().instagramFeedSettings?.profileImageUrl || ''
                          "
                          (input)="
                            setNested(
                              'instagramFeedSettings',
                              'profileImageUrl',
                              $any($event.target).value
                            )
                          "
                          class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                        />
                      </div>
                      <div class="space-y-1 sm:col-span-2">
                        <label
                          class="block text-[9px] font-black text-zinc-400 uppercase"
                        >
                          Profile Bio / Tagline
                        </label>
                        <textarea
                          rows="2"
                          [value]="
                            draft().instagramFeedSettings?.profileBio || ''
                          "
                          (input)="
                            setNested(
                              'instagramFeedSettings',
                              'profileBio',
                              $any($event.target).value
                            )
                          "
                          class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none resize-none"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >LinkedIn Profile</span
                    >
                    <input
                      type="text"
                      [value]="draft().socialLinks?.linkedin || ''"
                      (input)="
                        setNested(
                          'socialLinks',
                          'linkedin',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >YouTube Broadcast Channel</span
                    >
                    <input
                      type="text"
                      [value]="draft().socialLinks?.youtube || ''"
                      (input)="
                        setNested(
                          'socialLinks',
                          'youtube',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            }

            <!-- 14. EMAIL SETTINGS -->
            @if (activeSubTab() === "Email Settings") {
              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >SMTP Outgoing Server</span
                    >
                    <input
                      type="text"
                      [value]="
                        draft().emailSettings?.smtpHost || 'smtp.gmail.com'
                      "
                      (input)="
                        setNested(
                          'emailSettings',
                          'smtpHost',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >SMTP Port (SSL/TLS Default)</span
                    >
                    <input
                      type="number"
                      [value]="draft().emailSettings?.smtpPort || 465"
                      (input)="
                        setNested(
                          'emailSettings',
                          'smtpPort',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >SMTP Username</span
                    >
                    <input
                      type="text"
                      [value]="draft().emailSettings?.smtpUser || ''"
                      (input)="
                        setNested(
                          'emailSettings',
                          'smtpUser',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >SMTP Auth Token/Pass</span
                    >
                    <input
                      type="password"
                      [value]="draft().emailSettings?.smtpPass || ''"
                      (input)="
                        setNested(
                          'emailSettings',
                          'smtpPass',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            }

            <!-- 15. WHATSAPP SETTINGS -->
            @if (activeSubTab() === "WhatsApp Settings") {
              <div class="space-y-6 font-sans">
                <!-- Sub Menu -->
                <div
                  class="flex border-b border-zinc-200 dark:border-zinc-800 gap-4 pb-2"
                >
                  <button
                    (click)="whatsappSubSection.set('config')"
                    [class]="
                      whatsappSubSection() === 'config'
                        ? 'border-b-2 border-blue-600 text-blue-600 font-black'
                        : 'text-zinc-400 font-bold'
                    "
                    class="px-3 py-1.5 text-xs uppercase cursor-pointer bg-transparent border-none"
                  >
                    API Configuration
                  </button>
                  <button
                    (click)="whatsappSubSection.set('templates')"
                    [class]="
                      whatsappSubSection() === 'templates'
                        ? 'border-b-2 border-blue-600 text-blue-600 font-black'
                        : 'text-zinc-400 font-bold'
                    "
                    class="px-3 py-1.5 text-xs uppercase cursor-pointer bg-transparent border-none"
                  >
                    Template Manager
                  </button>
                </div>

                @if (whatsappSubSection() === "config") {
                  <div class="space-y-6">
                    <!-- Global Toggle -->
                    <div
                      class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-250 dark:border-zinc-850 flex items-center justify-between"
                    >
                      <div>
                        <span
                          class="block text-xs font-black uppercase text-zinc-900 dark:text-white"
                          >Enable WhatsApp Engine</span
                        >
                        <p class="text-[10px] text-zinc-400">
                          Enable or disable Meta Cloud API notifications
                          site-wide.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        [checked]="draft().whatsappSettings?.enabled"
                        (change)="
                          setNested(
                            'whatsappSettings',
                            'enabled',
                            $any($event.target).checked
                          )
                        "
                        class="w-5 h-5 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    <!-- Meta API Credentials -->
                    <div
                      class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 shadow-2xs"
                    >
                      <h3
                        class="text-xs font-black uppercase tracking-wider text-zinc-400"
                      >
                        Meta Cloud API Credentials
                      </h3>

                      <div
                        class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-955 rounded-xl border border-zinc-150 dark:border-zinc-800"
                      >
                        <input
                          type="checkbox"
                          [checked]="draft().whatsappSettings?.apiEnabled"
                          (change)="
                            setNested(
                              'whatsappSettings',
                              'apiEnabled',
                              $any($event.target).checked
                            )
                          "
                          class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span
                          class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                          >Enable Live API Endpoint Dispatches (Sends active API
                          calls)</span
                        >
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="space-y-1 col-span-2">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Meta API Base URL</span
                          >
                          <input
                            type="text"
                            [value]="
                              draft().whatsappSettings?.apiUrl ||
                              'https://graph.facebook.com/v19.0'
                            "
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'apiUrl',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                        </div>
                        <div class="space-y-1 col-span-2">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >System Access Token</span
                          >
                          <input
                            type="password"
                            [value]="
                              draft().whatsappSettings?.accessToken || ''
                            "
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'accessToken',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                            placeholder="EAABw..."
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Phone Number ID</span
                          >
                          <input
                            type="text"
                            [value]="
                              draft().whatsappSettings?.phoneNumberId || ''
                            "
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'phoneNumberId',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >WhatsApp Business Account ID</span
                          >
                          <input
                            type="text"
                            [value]="
                              draft().whatsappSettings?.businessAccountId || ''
                            "
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'businessAccountId',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Webhook Verification Token (Verify Token)</span
                          >
                          <input
                            type="text"
                            [value]="
                              draft().whatsappSettings?.verifyToken || ''
                            "
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'verifyToken',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Webhook Signature Secret (HMAC verification)</span
                          >
                          <input
                            type="password"
                            [value]="
                              draft().whatsappSettings?.webhookSecret || ''
                            "
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'webhookSecret',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- Dispatch Rules -->
                    <div
                      class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 shadow-2xs"
                    >
                      <h3
                        class="text-xs font-black uppercase tracking-wider text-zinc-400"
                      >
                        Rules & Retries
                      </h3>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Default Country Prefix</span
                          >
                          <input
                            type="text"
                            [value]="
                              draft().whatsappSettings?.defaultCountryCode ||
                              '+91'
                            "
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'defaultCountryCode',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Administrator Alert Mobile Number</span
                          >
                          <input
                            type="text"
                            [value]="
                              draft().whatsappSettings?.adminPhoneNumber || ''
                            "
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'adminPhoneNumber',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Maximum Send Retry Limit</span
                          >
                          <input
                            type="number"
                            [value]="
                              draft().whatsappSettings?.sendRetryCount || 3
                            "
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'sendRetryCount',
                                +$any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Retry Wait Window Interval (Minutes)</span
                          >
                          <input
                            type="number"
                            [value]="
                              draft().whatsappSettings?.retryInterval || 5
                            "
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'retryInterval',
                                +$any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                        </div>
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div
                          class="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-955 rounded-xl border border-zinc-150 dark:border-zinc-800"
                        >
                          <input
                            type="checkbox"
                            [checked]="
                              draft().whatsappSettings?.sendInvoiceOnDelivered
                            "
                            (change)="
                              setNested(
                                'whatsappSettings',
                                'sendInvoiceOnDelivered',
                                $any($event.target).checked
                              )
                            "
                            class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <span
                            class="text-[10px] font-black uppercase text-zinc-700 dark:text-zinc-300"
                            >Generate invoice on delivery</span
                          >
                        </div>
                        <div
                          class="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-955 rounded-xl border border-zinc-150 dark:border-zinc-800"
                        >
                          <input
                            type="checkbox"
                            [checked]="
                              draft().whatsappSettings?.attachInvoicePdf
                            "
                            (change)="
                              setNested(
                                'whatsappSettings',
                                'attachInvoicePdf',
                                $any($event.target).checked
                              )
                            "
                            class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <span
                            class="text-[10px] font-black uppercase text-zinc-700 dark:text-zinc-300"
                            >Attach Invoice PDF Document</span
                          >
                        </div>
                        <div
                          class="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-955 rounded-xl border border-zinc-150 dark:border-zinc-800"
                        >
                          <input
                            type="checkbox"
                            [checked]="
                              draft().whatsappSettings?.sendAdminNotification
                            "
                            (change)="
                              setNested(
                                'whatsappSettings',
                                'sendAdminNotification',
                                $any($event.target).checked
                              )
                            "
                            class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <span
                            class="text-[10px] font-black uppercase text-zinc-700 dark:text-zinc-300"
                            >Send Admin Alert notifications</span
                          >
                        </div>
                        <div
                          class="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-955 rounded-xl border border-zinc-150 dark:border-zinc-800"
                        >
                          <input
                            type="checkbox"
                            [checked]="draft().whatsappSettings?.enableLogs"
                            (change)="
                              setNested(
                                'whatsappSettings',
                                'enableLogs',
                                $any($event.target).checked
                              )
                            "
                            class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <span
                            class="text-[10px] font-black uppercase text-zinc-700 dark:text-zinc-300"
                            >Log all incoming and outgoing events</span
                          >
                        </div>
                      </div>
                    </div>

                    <!-- Trigger Rules -->
                    <div
                      class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 shadow-2xs"
                    >
                      <h3
                        class="text-xs font-black uppercase tracking-wider text-zinc-400"
                      >
                        Notification Triggers
                      </h3>
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        @for (
                          trig of [
                            { key: "registration", label: "User Registration" },
                            { key: "otp", label: "OTP Verification" },
                            {
                              key: "password_reset",
                              label: "Password Reset Request",
                            },
                            { key: "order_placed", label: "Order Placed" },
                            {
                              key: "payment_success",
                              label: "Payment Successful",
                            },
                            { key: "payment_failed", label: "Payment Failed" },
                            {
                              key: "order_confirmed",
                              label: "Order Confirmed",
                            },
                            {
                              key: "order_processing",
                              label: "Order Processing",
                            },
                            { key: "packed", label: "Packed" },
                            { key: "shipped", label: "Shipped" },
                            {
                              key: "out_for_delivery",
                              label: "Out For Delivery",
                            },
                            { key: "delivered", label: "Delivered" },
                            { key: "cancelled", label: "Cancelled" },
                            {
                              key: "refund_completed",
                              label: "Refund Completed",
                            },
                          ];
                          track trig.key
                        ) {
                          <div
                            class="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl"
                          >
                            <input
                              type="checkbox"
                              [checked]="
                                draft().whatsappSettings?.triggers?.[
                                  trig.key
                                ] !== false
                              "
                              (change)="
                                toggleWhatsappTrigger(
                                  trig.key,
                                  $any($event.target).checked
                                )
                              "
                              class="w-4 h-4 text-blue-600 cursor-pointer"
                            />
                            <span
                              class="text-[10px] font-bold text-zinc-750 dark:text-zinc-300 uppercase truncate"
                              >{{ trig.label }}</span
                            >
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }

                @if (whatsappSubSection() === "templates") {
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Template Selection and Editor -->
                    <div
                      class="lg:col-span-2 space-y-5 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xs"
                    >
                      <!-- Selector -->
                      <div class="space-y-1">
                        <span
                          class="block text-[9px] font-black text-zinc-400 uppercase"
                          >Select Target Trigger</span
                        >
                        <select
                          [value]="activeTemplateKey()"
                          (change)="
                            activeTemplateKey.set($any($event.target).value)
                          "
                          class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="registration">
                            Welcome & Registration
                          </option>
                          <option value="otp">OTP Verification</option>
                          <option value="password_reset">
                            Password Reset Request
                          </option>
                          <option value="order_placed">
                            Order Placed (Checkout Success)
                          </option>
                          <option value="payment_success">
                            Payment Confirmed
                          </option>
                          <option value="payment_failed">Payment Failed</option>
                          <option value="order_confirmed">
                            Order Confirmed
                          </option>
                          <option value="order_processing">
                            Order Processing
                          </option>
                          <option value="packed">Order Packed</option>
                          <option value="shipped">
                            Order Shipped (Tracking Code)
                          </option>
                          <option value="out_for_delivery">
                            Out For Delivery
                          </option>
                          <option value="delivered">
                            Delivered (Completed)
                          </option>
                          <option value="cancelled">Cancelled</option>
                          <option value="refund_completed">
                            Refund Dispatched
                          </option>
                          <option value="admin_new_order">
                            Admin Alert: New Order
                          </option>
                          <option value="admin_payment_received">
                            Admin Alert: Payment Received
                          </option>
                          <option value="admin_order_cancelled">
                            Admin Alert: Order Cancelled
                          </option>
                        </select>
                      </div>

                      <div
                        class="h-[1px] bg-zinc-150 dark:bg-zinc-800 my-4"
                      ></div>

                      <!-- Form editor for activeTemplateKey -->
                      <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-3">
                          <div class="space-y-1">
                            <span
                              class="block text-[9px] font-black text-zinc-400 uppercase"
                              >Meta Approved Template Name</span
                            >
                            <input
                              type="text"
                              [value]="
                                draft().whatsappSettings?.templates?.[
                                  activeTemplateKey()
                                ]?.name || ''
                              "
                              (input)="
                                updateTemplateField(
                                  activeTemplateKey(),
                                  'name',
                                  $any($event.target).value
                                )
                              "
                              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                              placeholder="e.g. order_confirmed_v2"
                            />
                          </div>
                          <div class="space-y-1">
                            <span
                              class="block text-[9px] font-black text-zinc-400 uppercase"
                              >Language Code</span
                            >
                            <input
                              type="text"
                              [value]="
                                draft().whatsappSettings?.templates?.[
                                  activeTemplateKey()
                                ]?.language || 'en'
                              "
                              (input)="
                                updateTemplateField(
                                  activeTemplateKey(),
                                  'language',
                                  $any($event.target).value
                                )
                              "
                              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                            />
                          </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                          <div class="space-y-1">
                            <span
                              class="block text-[9px] font-black text-zinc-400 uppercase"
                              >Header Type</span
                            >
                            <select
                              [value]="
                                draft().whatsappSettings?.templates?.[
                                  activeTemplateKey()
                                ]?.headerType || 'None'
                              "
                              (change)="
                                updateTemplateField(
                                  activeTemplateKey(),
                                  'headerType',
                                  $any($event.target).value
                                )
                              "
                              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer"
                            >
                              <option value="None">None</option>
                              <option value="Text">Text Header</option>
                              <option value="Document">
                                PDF Document Attachment
                              </option>
                              <option value="Image">Image</option>
                            </select>
                          </div>
                          <div class="space-y-1">
                            <span
                              class="block text-[9px] font-black text-zinc-400 uppercase"
                              >Template Header Variable / Text</span
                            >
                            <input
                              type="text"
                              [value]="
                                draft().whatsappSettings?.templates?.[
                                  activeTemplateKey()
                                ]?.headerText || ''
                              "
                              (input)="
                                updateTemplateField(
                                  activeTemplateKey(),
                                  'headerText',
                                  $any($event.target).value
                                )
                              "
                              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                              placeholder="Welcome To 3D Galaxy"
                            />
                          </div>
                        </div>

                        <!-- Body & Variable Picker -->
                        <div class="space-y-1">
                          <div class="flex justify-between items-center">
                            <span
                              class="block text-[9px] font-black text-zinc-400 uppercase"
                              >Message Body Text</span
                            >

                            <!-- Variables Picker Dropdown -->
                            <div class="relative inline-block text-left">
                              <button
                                (click)="showVarPicker.set(!showVarPicker())"
                                class="px-2 py-0.5 bg-blue-600/10 hover:bg-blue-600/15 border border-blue-500/20 text-blue-600 text-[9px] font-black uppercase rounded-md flex items-center gap-1 cursor-pointer"
                              >
                                <mat-icon class="text-[12px] h-3 w-3"
                                  >add_circle</mat-icon
                                >
                                Insert Variable
                              </button>
                              @if (showVarPicker()) {
                                <div
                                  class="absolute right-0 mt-1 w-48 rounded-xl bg-white dark:bg-zinc-950 shadow-lg border border-zinc-150 dark:border-zinc-800 z-50 py-1 grid grid-cols-1 max-h-48 overflow-y-auto"
                                >
                                  @for (
                                    v of [
                                      "customer_name",
                                      "order_id",
                                      "tracking_number",
                                      "courier",
                                      "estimated_delivery",
                                      "payment_status",
                                      "order_total",
                                      "currency",
                                      "invoice_url",
                                      "store_name",
                                      "support_phone",
                                      "support_email",
                                      "site_url",
                                      "order_items",
                                      "shipping_address",
                                      "otp_code",
                                    ];
                                    track v
                                  ) {
                                    <button
                                      (click)="
                                        insertVariableAtCursor(
                                          activeTemplateKey(),
                                          v
                                        )
                                      "
                                      class="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-[10px] font-bold text-zinc-700 dark:text-zinc-350 cursor-pointer border-none bg-transparent"
                                    >
                                      {{ v }}
                                    </button>
                                  }
                                </div>
                              }
                            </div>
                          </div>

                          <textarea
                            id="templateBodyTextarea"
                            rows="5"
                            [value]="
                              draft().whatsappSettings?.templates?.[
                                activeTemplateKey()
                              ]?.body || ''
                            "
                            (input)="
                              updateTemplateField(
                                activeTemplateKey(),
                                'body',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-blue-500 font-medium leading-relaxed"
                            [attr.placeholder]="
                              'Hello {{customer_name}}, your order {{order_id}} was received...'
                            "
                          ></textarea>
                        </div>

                        <!-- Footer -->
                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Footer Text</span
                          >
                          <input
                            type="text"
                            [value]="
                              draft().whatsappSettings?.templates?.[
                                activeTemplateKey()
                              ]?.footer || ''
                            "
                            (input)="
                              updateTemplateField(
                                activeTemplateKey(),
                                'footer',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                            placeholder="Thank you for shopping with 3D Galaxy."
                          />
                        </div>

                        <!-- Buttons -->
                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Action Buttons (Comma Separated)</span
                          >
                          <input
                            type="text"
                            [value]="
                              draft().whatsappSettings?.templates?.[
                                activeTemplateKey()
                              ]?.buttons?.join(', ') || ''
                            "
                            (input)="
                              updateTemplateButtons(
                                activeTemplateKey(),
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                            placeholder="Track Order, Contact Support"
                          />
                        </div>
                      </div>

                      <!-- Test Sender Box -->
                      <div
                        class="mt-6 pt-5 border-t border-zinc-150 dark:border-zinc-800 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 rounded-2xl"
                      >
                        <span
                          class="block text-[10px] font-black uppercase text-blue-500"
                          >Test Send Notification Sandbox</span
                        >
                        <div class="flex gap-2">
                          <input
                            type="text"
                            [(ngModel)]="testNumber"
                            class="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                            placeholder="Test recipient number with prefix (e.g. +919999999999)"
                          />
                          <button
                            (click)="sendTestMessage(activeTemplateKey())"
                            [disabled]="testSendLoading()"
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs"
                          >
                            @if (testSendLoading()) {
                              Sending...
                            } @else {
                              Dispatch Test
                            }
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Live Mobile Preview Frame -->
                    <div class="space-y-4">
                      <span
                        class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center"
                        >Live Preview (Mobile UI)</span
                      >

                      <!-- iOS WhatsApp Chat Screen Mock -->
                      <div
                        class="bg-zinc-900 border-[8px] border-zinc-800 dark:border-zinc-950 rounded-[2.5rem] overflow-hidden aspect-[9/18] w-full max-w-sm mx-auto shadow-2xl relative flex flex-col select-none"
                      >
                        <!-- Top status bar -->
                        <div
                          class="h-10 bg-zinc-900 px-6 flex items-center justify-between text-white text-[10px] font-bold"
                        >
                          <span>9:41</span>
                          <div class="flex items-center gap-1">
                            <mat-icon class="text-xs"
                              >signal_cellular_4_bar</mat-icon
                            >
                            <mat-icon class="text-xs">battery_full</mat-icon>
                          </div>
                        </div>

                        <!-- Chat Header -->
                        <div
                          class="bg-zinc-850 p-3.5 flex items-center gap-2.5 text-white border-b border-white/5"
                        >
                          <div
                            class="w-8 h-8 rounded-full bg-linear-to-tr from-fuchsia-500 via-purple-600 to-cyan-500 flex items-center justify-center font-bold text-xs"
                          >
                            3D
                          </div>
                          <div class="flex-1 min-w-0">
                            <p class="text-xs font-bold truncate">
                              3D Galaxy Hub
                            </p>
                            <span
                              class="text-[8px] text-emerald-400 block leading-none font-medium"
                              >Official Account</span
                            >
                          </div>
                          <mat-icon class="text-zinc-400 text-base"
                            >call</mat-icon
                          >
                        </div>

                        <!-- Messages Canvas -->
                        <div
                          class="flex-1 p-4 bg-zinc-950 overflow-y-auto space-y-3 flex flex-col justify-end"
                          style="background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 16px 16px;"
                        >
                          <!-- Dispatched WhatsApp Bubble -->
                          <div
                            class="bg-zinc-850 max-w-[85%] rounded-2xl rounded-tr-none ml-auto text-zinc-150 p-3 shadow-md space-y-1.5 border border-white/5 relative"
                          >
                            <!-- Header Attachment preview -->
                            @if (
                              draft().whatsappSettings?.templates?.[
                                activeTemplateKey()
                              ]?.headerType === "Document"
                            ) {
                              <div
                                class="p-2.5 bg-zinc-900/60 rounded-xl flex items-center gap-2 border border-white/5 mb-1.5"
                              >
                                <span
                                  class="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center"
                                  ><mat-icon class="text-base"
                                    >description</mat-icon
                                  ></span
                                >
                                <div class="flex-1 min-w-0">
                                  <p
                                    class="text-[9px] font-bold text-white truncate leading-none"
                                  >
                                    Invoice_B3D-4890.pdf
                                  </p>
                                  <span
                                    class="text-[7px] text-zinc-500 leading-none"
                                    >PDF Document • 142 KB</span
                                  >
                                </div>
                              </div>
                            } @else if (
                              draft().whatsappSettings?.templates?.[
                                activeTemplateKey()
                              ]?.headerText
                            ) {
                              <p
                                class="text-[10px] font-bold text-white uppercase tracking-wider leading-none mb-1"
                              >
                                {{
                                  draft().whatsappSettings?.templates?.[
                                    activeTemplateKey()
                                  ]?.headerText
                                }}
                              </p>
                            }

                            <!-- Resolved Preview Body -->
                            <p
                              class="text-[11px] whitespace-pre-line leading-relaxed"
                            >
                              {{
                                getResolvedPreviewText(
                                  draft().whatsappSettings?.templates?.[
                                    activeTemplateKey()
                                  ]?.body
                                )
                              }}
                            </p>

                            <!-- Footer -->
                            @if (
                              draft().whatsappSettings?.templates?.[
                                activeTemplateKey()
                              ]?.footer;
                              as ft
                            ) {
                              <p class="text-[8px] text-zinc-500 leading-none">
                                {{ ft }}
                              </p>
                            }

                            <!-- Timestamp -->
                            <span
                              class="text-[7px] text-zinc-600 block text-right mt-1 font-mono"
                              >9:41 AM ✓✓</span
                            >
                          </div>

                          <!-- Styled buttons attached to bubble -->
                          @if (
                            draft().whatsappSettings?.templates?.[
                              activeTemplateKey()
                            ]?.buttons;
                            as btns
                          ) {
                            @for (btn of btns; track btn) {
                              <div
                                class="w-[85%] ml-auto bg-zinc-850 border-t border-white/5 text-blue-400 text-[10px] font-bold py-2 text-center rounded-xl hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1"
                              >
                                <mat-icon class="text-xs text-[12px]"
                                  >open_in_new</mat-icon
                                >
                                {{ btn }}
                              </div>
                            }
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }

            <!-- 16. SHIPPING -->
            @if (activeSubTab() === "Shipping") {
              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Global Minimum Threshold for Free Delivery (₹)</span
                    >
                    <input
                      type="number"
                      [value]="
                        draft().shippingSettings?.freeShippingMinSpent || 999
                      "
                      (input)="
                        setNested(
                          'shippingSettings',
                          'freeShippingMinSpent',
                          +$any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Base Rate for Express Deliveries</span
                    >
                    <input
                      type="number"
                      [value]="
                        draft().shippingSettings?.fixedCourierRate || 120
                      "
                      (input)="
                        setNested(
                          'shippingSettings',
                          'fixedCourierRate',
                          +$any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            }

            <!-- 17. PAYMENT GATEWAY -->
            @if (activeSubTab() === "Payment Gateway") {
              <div class="space-y-4">
                <!-- Global Config -->
                <div
                  class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-4"
                >
                  <div class="space-y-1 col-span-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Default Gateway</span
                    >
                    <select
                      [value]="
                        draft().paymentGatewaySettings?.defaultGateway ||
                        'razorpay'
                      "
                      (change)="
                        setNested(
                          'paymentGatewaySettings',
                          'defaultGateway',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="razorpay">Razorpay</option>
                      <option value="cashfree">Cashfree</option>
                      <option value="cod">Cash on Delivery</option>
                    </select>
                  </div>
                  <div class="space-y-1 col-span-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Currency Code</span
                    >
                    <input
                      type="text"
                      [value]="
                        draft().paymentGatewaySettings?.currency || 'INR'
                      "
                      (input)="
                        setNested(
                          'paymentGatewaySettings',
                          'currency',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono outline-none"
                    />
                  </div>
                </div>

                <!-- Razorpay -->
                <div
                  class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3"
                >
                  <div
                    class="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-850"
                  >
                    <div class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        [checked]="
                          draft().paymentGatewaySettings?.paymentMethods
                            ?.razorpay?.enabled
                        "
                        (change)="
                          setPgField(
                            'razorpay',
                            'enabled',
                            $any($event.target).checked
                          )
                        "
                        class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer animate-none"
                      />
                      <span
                        class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                        >Enable Razorpay PG</span
                      >
                    </div>
                    <div class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        [checked]="
                          draft().paymentGatewaySettings?.paymentMethods
                            ?.razorpay?.sandbox
                        "
                        (change)="
                          setPgField(
                            'razorpay',
                            'sandbox',
                            $any($event.target).checked
                          )
                        "
                        class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer animate-none"
                      />
                      <span
                        class="text-xs font-black uppercase text-zinc-500 dark:text-zinc-400"
                        >Sandbox Mode</span
                      >
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Key ID</span
                      >
                      <input
                        type="text"
                        [value]="
                          draft().paymentGatewaySettings?.paymentMethods
                            ?.razorpay?.keyId || ''
                        "
                        (input)="
                          setPgField(
                            'razorpay',
                            'keyId',
                            $any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono outline-none"
                      />
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Key Secret</span
                      >
                      <input
                        type="password"
                        [value]="
                          draft().paymentGatewaySettings?.paymentMethods
                            ?.razorpay?.keySecret || ''
                        "
                        (input)="
                          setPgField(
                            'razorpay',
                            'keySecret',
                            $any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono outline-none"
                      />
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Webhook Secret</span
                      >
                      <input
                        type="password"
                        [value]="
                          draft().paymentGatewaySettings?.paymentMethods
                            ?.razorpay?.webhookSecret || ''
                        "
                        (input)="
                          setPgField(
                            'razorpay',
                            'webhookSecret',
                            $any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>

                <!-- Cashfree -->
                <div
                  class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3"
                >
                  <div
                    class="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-850"
                  >
                    <div class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        [checked]="
                          draft().paymentGatewaySettings?.paymentMethods
                            ?.cashfree?.enabled
                        "
                        (change)="
                          setPgField(
                            'cashfree',
                            'enabled',
                            $any($event.target).checked
                          )
                        "
                        class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer animate-none"
                      />
                      <span
                        class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                        >Enable Cashfree PG</span
                      >
                    </div>
                    <div class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        [checked]="
                          draft().paymentGatewaySettings?.paymentMethods
                            ?.cashfree?.sandbox
                        "
                        (change)="
                          setPgField(
                            'cashfree',
                            'sandbox',
                            $any($event.target).checked
                          )
                        "
                        class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer animate-none"
                      />
                      <span
                        class="text-xs font-black uppercase text-zinc-500 dark:text-zinc-400"
                        >Sandbox Mode</span
                      >
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >App ID</span
                      >
                      <input
                        type="text"
                        [value]="
                          draft().paymentGatewaySettings?.paymentMethods
                            ?.cashfree?.appId || ''
                        "
                        (input)="
                          setPgField(
                            'cashfree',
                            'appId',
                            $any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono outline-none"
                      />
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Secret Key</span
                      >
                      <input
                        type="password"
                        [value]="
                          draft().paymentGatewaySettings?.paymentMethods
                            ?.cashfree?.secretKey || ''
                        "
                        (input)="
                          setPgField(
                            'cashfree',
                            'secretKey',
                            $any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono outline-none"
                      />
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Webhook Secret</span
                      >
                      <input
                        type="password"
                        [value]="
                          draft().paymentGatewaySettings?.paymentMethods
                            ?.cashfree?.webhookSecret || ''
                        "
                        (input)="
                          setPgField(
                            'cashfree',
                            'webhookSecret',
                            $any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>

                <!-- COD -->
                <div
                  class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3"
                >
                  <div
                    class="flex items-center gap-2 p-2 bg-white dark:bg-zinc-900 rounded-lg"
                  >
                    <input
                      type="checkbox"
                      [checked]="
                        draft().paymentGatewaySettings?.paymentMethods?.cod
                          ?.enabled
                      "
                      (change)="
                        setCodField('enabled', $any($event.target).checked)
                      "
                      class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer animate-none"
                    />
                    <span
                      class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                      >Enable Cash on Delivery (COD)</span
                    >
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Min Order Amt</span
                      >
                      <input
                        type="number"
                        [value]="
                          draft().paymentGatewaySettings?.paymentMethods?.cod
                            ?.minimumOrderAmount ?? 0
                        "
                        (input)="
                          setCodField(
                            'minimumOrderAmount',
                            +$any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                      />
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Max Order Amt</span
                      >
                      <input
                        type="number"
                        [value]="
                          draft().paymentGatewaySettings?.paymentMethods?.cod
                            ?.maximumOrderAmount ?? 10000
                        "
                        (input)="
                          setCodField(
                            'maximumOrderAmount',
                            +$any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                      />
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >COD Surcharge</span
                      >
                      <input
                        type="number"
                        [value]="
                          draft().paymentGatewaySettings?.paymentMethods?.cod
                            ?.extraCharge ?? 0
                        "
                        (input)="
                          setCodField('extraCharge', +$any($event.target).value)
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                      />
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Allowed PIN Codes (CSV)</span
                      >
                      <input
                        type="text"
                        [value]="
                          draft().paymentGatewaySettings?.paymentMethods?.cod?.allowedPinCodes?.join(
                            ', '
                          ) || ''
                        "
                        (input)="
                          setFourDeepCsv(
                            'paymentGatewaySettings',
                            'paymentMethods',
                            'cod',
                            'allowedPinCodes',
                            $any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono outline-none"
                        placeholder="e.g. 110001, 400001"
                      />
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Blocked PIN Codes (CSV)</span
                      >
                      <input
                        type="text"
                        [value]="
                          draft().paymentGatewaySettings?.paymentMethods?.cod?.blockedPinCodes?.join(
                            ', '
                          ) || ''
                        "
                        (input)="
                          setFourDeepCsv(
                            'paymentGatewaySettings',
                            'paymentMethods',
                            'cod',
                            'blockedPinCodes',
                            $any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-205 dark:border-zinc-800 rounded-lg text-xs font-mono outline-none"
                        placeholder="e.g. 560001, 600001"
                      />
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- 18. NEWSLETTER -->
            @if (activeSubTab() === "Newsletter") {
              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Newsletter Automated Signup Promo Discount Code</span
                    >
                    <input
                      type="text"
                      [value]="
                        draft().newsletterSettings?.welcomePromoCode ||
                        'NEWSLETTER10'
                      "
                      (input)="
                        setNested(
                          'newsletterSettings',
                          'welcomePromoCode',
                          $any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <span
                      class="block text-[9px] font-black text-zinc-400 uppercase"
                      >Discount Code flat Value (INR)</span
                    >
                    <input
                      type="number"
                      [value]="
                        draft().newsletterSettings?.subscriptionDiscount || 150
                      "
                      (input)="
                        setNested(
                          'newsletterSettings',
                          'subscriptionDiscount',
                          +$any($event.target).value
                        )
                      "
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            }

            <!-- 19. CHATBOT -->
            @if (activeSubTab() === "Chatbot") {
              <div class="space-y-4">
                <div
                  class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl"
                >
                  <input
                    type="checkbox"
                    [checked]="draft().chatbotSettings?.chatbotEnabled"
                    (change)="
                      setNested(
                        'chatbotSettings',
                        'chatbotEnabled',
                        $any($event.target).checked
                      )
                    "
                    class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span
                    class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                    >Enable Chatbot Assistant</span
                  >
                </div>
                <div class="space-y-1">
                  <span
                    class="block text-[9px] font-black text-zinc-400 uppercase"
                    >Welcome Greeting Message</span
                  >
                  <input
                    type="text"
                    [value]="
                      draft().chatbotSettings?.welcomeMessage ||
                      'Hello! Warm greetings from 3D Galaxy AI Assistant.'
                    "
                    (input)="
                      setNested(
                        'chatbotSettings',
                        'welcomeMessage',
                        $any($event.target).value
                      )
                    "
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                  />
                </div>
                <div class="space-y-1">
                  <span
                    class="block text-[9px] font-black text-zinc-400 uppercase"
                    >AI System prompt Instructions</span
                  >
                  <textarea
                    rows="4"
                    [value]="draft().chatbotSettings?.systemPrompt || ''"
                    (input)="
                      setNested(
                        'chatbotSettings',
                        'systemPrompt',
                        $any($event.target).value
                      )
                    "
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                  ></textarea>
                </div>
              </div>
            }

            <!-- 20. PRODUCT PAGE -->
            @if (activeSubTab() === "Product Page") {
              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl"
                  >
                    <input
                      type="checkbox"
                      [checked]="draft().productPageSettings?.enableReviews"
                      (change)="
                        setNested(
                          'productPageSettings',
                          'enableReviews',
                          $any($event.target).checked
                        )
                      "
                      class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span
                      class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                      >Enable User review panel</span
                    >
                  </div>
                  <div
                    class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl"
                  >
                    <input
                      type="checkbox"
                      [checked]="
                        draft().productPageSettings?.showInventoryCounter
                      "
                      (change)="
                        setNested(
                          'productPageSettings',
                          'showInventoryCounter',
                          $any($event.target).checked
                        )
                      "
                      class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span
                      class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                      >Display low Stock warning counter</span
                    >
                  </div>
                </div>
              </div>
            }

            <!-- 21. TOUR SETTINGS -->
            @if (activeSubTab() === "Tour Settings") {
              <div class="space-y-4">
                <div
                  class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl"
                >
                  <input
                    type="checkbox"
                    [checked]="draft().tourSettings?.tourEnabled"
                    (change)="
                      setNested(
                        'tourSettings',
                        'tourEnabled',
                        $any($event.target).checked
                      )
                    "
                    class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span
                    class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                    >Activate Walkthrough onboarding Overlay</span
                  >
                </div>
              </div>
            }

            <!-- 22. FAQ -->
            @if (activeSubTab() === "FAQ") {
              <div class="space-y-4">
                <p class="text-xs text-zinc-500">
                  Provide direct Frequently Asked Questions dynamically shown in
                  the customer HELP center.
                </p>
                <div class="space-y-4 max-h-96 overflow-y-auto pr-2">
                  @for (faq of draft().faqs || []; track $index) {
                    <div
                      class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 relative"
                    >
                      <div class="absolute top-2 right-2">
                        <button
                          (click)="removeArrayItem('faqs', $index)"
                          class="text-red-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 p-1 rounded-lg transition-all cursor-pointer"
                        >
                          <mat-icon class="text-sm">delete</mat-icon>
                        </button>
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Question Title</span
                          >
                          <input
                            type="text"
                            [value]="faq.question || ''"
                            (input)="
                              updateFaqField(
                                $index,
                                'question',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Topic Category</span
                          >
                          <input
                            type="text"
                            [value]="faq.category || 'General'"
                            (input)="
                              updateFaqField(
                                $index,
                                'category',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                      </div>
                      <div class="space-y-1 pr-8">
                        <span
                          class="block text-[8px] font-black text-zinc-400 uppercase"
                          >Resolved Answer Text</span
                        >
                        <textarea
                          rows="2"
                          [value]="faq.answer || ''"
                          (input)="
                            updateFaqField(
                              $index,
                              'answer',
                              $any($event.target).value
                            )
                          "
                          class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                        ></textarea>
                      </div>
                    </div>
                  }
                </div>
                <button
                  (click)="addFaq()"
                  class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1 cursor-pointer w-fit"
                >
                  <mat-icon class="text-sm">add_circle</mat-icon> Create FAQ
                  Node
                </button>
              </div>
            }

            <!-- 23. SERVICES -->
            @if (activeSubTab() === "Services") {
              <div class="space-y-4">
                <p class="text-xs text-zinc-500">
                  Formulate high-trust offering badges displayed as marketing
                  blocks on the root checkout viewports.
                </p>
                <div class="space-y-4">
                  @for (srv of draft().services || []; track $index) {
                    <div
                      class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 relative"
                    >
                      <div class="absolute top-2 right-2">
                        <button
                          (click)="removeArrayItem('services', $index)"
                          class="text-red-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 p-1 rounded-lg cursor-pointer"
                        >
                          <mat-icon class="text-sm">delete</mat-icon>
                        </button>
                      </div>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pr-8">
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Service title (Headline)</span
                          >
                          <input
                            type="text"
                            [value]="srv.title || ''"
                            (input)="
                              updateServiceField(
                                $index,
                                'title',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Service Description / Slogan</span
                          >
                          <input
                            type="text"
                            [value]="srv.description || ''"
                            (input)="
                              updateServiceField(
                                $index,
                                'description',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Icon Tag name (Material Icon)</span
                          >
                          <input
                            type="text"
                            [value]="srv.icon || 'star'"
                            (input)="
                              updateServiceField(
                                $index,
                                'icon',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  }
                </div>
                <button
                  (click)="addService()"
                  class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1 cursor-pointer w-fit"
                >
                  <mat-icon class="text-sm">add_box</mat-icon> Insert Offer
                  badge
                </button>
              </div>
            }

            <!-- 3D PRINTING SERVICE -->
            @if (activeSubTab() === "3D Printing Service") {
              <div class="space-y-6">
                <p class="text-xs text-zinc-500">
                  Configure global parameters for the volumetric 3D Printing
                  estimator page (base prices, materials, filament colors,
                  infill standards, qualities).
                </p>

                <!-- Pricing Core -->
                <div
                  class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4"
                >
                  <h3
                    class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                  >
                    Base Rates & Tax Calculations
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Machine Run Fee Per Hour (₹)</span
                      >
                      <input
                        type="number"
                        [value]="
                          draft().printServiceSettings?.machineFeePerHour || 150
                        "
                        (input)="
                          setPrintServiceSettingsField(
                            'machineFeePerHour',
                            +$any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >GST Tax Rate (%)</span
                      >
                      <input
                        type="number"
                        [value]="draft().printServiceSettings?.gstTaxRate || 18"
                        (input)="
                          setPrintServiceSettingsField(
                            'gstTaxRate',
                            +$any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>

                <!-- Filament Materials Table -->
                <div
                  class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4"
                >
                  <div class="flex justify-between items-center">
                    <h3
                      class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                    >
                      Filament Materials & Colorways
                    </h3>
                    <button
                      (click)="addPrintMaterial()"
                      class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <mat-icon class="text-xs">add</mat-icon> Add Material
                    </button>
                  </div>
                  <div class="space-y-4">
                    @for (
                      mat of draft().printServiceSettings?.materials || [];
                      track mat.name;
                      let parentIndex = $index
                    ) {
                      <div
                        class="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-3.5 relative"
                      >
                        <!-- Material Fields -->
                        <div
                          class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center pr-8"
                        >
                          <div>
                            <span
                              class="block text-[8px] font-black text-zinc-400 uppercase"
                              >Material Name</span
                            >
                            <input
                              type="text"
                              [value]="mat.name"
                              (input)="
                                updatePrintMaterialField(
                                  parentIndex,
                                  'name',
                                  $any($event.target).value
                                )
                              "
                              class="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded text-xs outline-none"
                            />
                          </div>
                          <div>
                            <span
                              class="block text-[8px] font-black text-zinc-400 uppercase"
                              >Price per Gram (₹)</span
                            >
                            <input
                              type="number"
                              step="0.1"
                              [value]="mat.pricePerGram"
                              (input)="
                                updatePrintMaterialField(
                                  parentIndex,
                                  'pricePerGram',
                                  +$any($event.target).value
                                )
                              "
                              class="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono outline-none"
                            />
                          </div>
                          <div>
                            <span
                              class="block text-[8px] font-black text-zinc-400 uppercase"
                              >Density (g/cm³)</span
                            >
                            <input
                              type="number"
                              step="0.01"
                              [value]="mat.density"
                              (input)="
                                updatePrintMaterialField(
                                  parentIndex,
                                  'density',
                                  +$any($event.target).value
                                )
                              "
                              class="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono outline-none"
                            />
                          </div>
                          <div class="flex items-center gap-2 pt-3">
                            <input
                              type="checkbox"
                              [checked]="mat.active"
                              (change)="
                                updatePrintMaterialField(
                                  parentIndex,
                                  'active',
                                  $any($event.target).checked
                                )
                              "
                              class="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer animate-none"
                            />
                            <span
                              class="text-[10px] font-bold text-zinc-500 uppercase"
                              >Active</span
                            >
                          </div>
                        </div>

                        <!-- Delete Material Button -->
                        <button
                          (click)="removePrintMaterial(parentIndex)"
                          class="absolute right-2 top-2 text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 rounded-lg"
                        >
                          <mat-icon class="text-sm">delete</mat-icon>
                        </button>

                        <!-- Material Colors -->
                        <div
                          class="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2"
                        >
                          <div class="flex justify-between items-center">
                            <span
                              class="text-[9px] font-black text-zinc-400 uppercase"
                              >Colors configured for {{ mat.name }}</span
                            >
                            <button
                              (click)="addPrintMaterialColor(parentIndex)"
                              class="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-750 rounded text-[9px] font-black uppercase flex items-center gap-0.5 cursor-pointer"
                            >
                              <mat-icon class="text-xs scale-75">add</mat-icon>
                              Add Color
                            </button>
                          </div>

                          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            @for (
                              col of mat.colors || [];
                              track col.name;
                              let childIndex = $index
                            ) {
                              <div
                                class="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-955 p-1.5 rounded-lg border border-zinc-150 dark:border-zinc-850 relative pr-7"
                              >
                                <input
                                  type="color"
                                  [value]="col.hex"
                                  (input)="
                                    updatePrintMaterialColorField(
                                      parentIndex,
                                      childIndex,
                                      'hex',
                                      $any($event.target).value
                                    )
                                  "
                                  class="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                                />
                                <div class="flex-1">
                                  <input
                                    type="text"
                                    [value]="col.name"
                                    placeholder="Name"
                                    (input)="
                                      updatePrintMaterialColorField(
                                        parentIndex,
                                        childIndex,
                                        'name',
                                        $any($event.target).value
                                      )
                                    "
                                    class="w-full px-1.5 py-0.5 border border-zinc-250 dark:border-zinc-800 rounded text-[10px]"
                                  />
                                </div>
                                <button
                                  (click)="
                                    removePrintMaterialColor(
                                      parentIndex,
                                      childIndex
                                    )
                                  "
                                  class="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 p-1 rounded"
                                >
                                  <mat-icon class="text-xs">delete</mat-icon>
                                </button>
                              </div>
                            }
                          </div>
                          @if (!mat.colors?.length) {
                            <div class="text-[9px] text-yellow-600 font-bold">
                              ⚠️ No colorways configured for this material.
                              Users won't be able to print in this polymer.
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Printer Qualities Profile -->
                <div
                  class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4"
                >
                  <div class="flex justify-between items-center">
                    <h3
                      class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                    >
                      Printer Quality Profiles
                    </h3>
                    <button
                      (click)="addPrintQuality()"
                      class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <mat-icon class="text-xs">add</mat-icon> Add Profile
                    </button>
                  </div>
                  <div class="space-y-3">
                    @for (
                      q of draft().printServiceSettings?.qualities || [];
                      track $index
                    ) {
                      <div
                        class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-150 dark:border-zinc-800 relative pr-10"
                      >
                        <div>
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Profile Name</span
                          >
                          <input
                            type="text"
                            [value]="q.name"
                            (input)="
                              updatePrintQualityField(
                                $index,
                                'name',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded text-xs"
                          />
                        </div>
                        <div>
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Layer Thickness (mm)</span
                          >
                          <input
                            type="number"
                            step="0.01"
                            [value]="q.height"
                            (input)="
                              updatePrintQualityField(
                                $index,
                                'height',
                                +$any($event.target).value
                              )
                            "
                            class="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono"
                          />
                        </div>
                        <button
                          (click)="removePrintQuality($index)"
                          class="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 rounded-lg"
                        >
                          <mat-icon class="text-sm">delete</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                </div>

                <!-- Infill Density Standards -->
                <div
                  class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4"
                >
                  <div class="flex justify-between items-center">
                    <h3
                      class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                    >
                      Infill Density Standards
                    </h3>
                    <button
                      (click)="addPrintInfill()"
                      class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <mat-icon class="text-xs">add</mat-icon> Add Infill
                    </button>
                  </div>
                  <div class="space-y-3">
                    @for (
                      inf of draft().printServiceSettings?.infillStandards ||
                        [];
                      track $index
                    ) {
                      <div
                        class="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-150 dark:border-zinc-800 relative pr-10"
                      >
                        <div>
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Name (e.g. 10 - 30%)</span
                          >
                          <input
                            type="text"
                            [value]="inf.name"
                            (input)="
                              updatePrintInfillField(
                                $index,
                                'name',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded text-xs"
                          />
                        </div>
                        <div>
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Description (e.g. Standard)</span
                          >
                          <input
                            type="text"
                            [value]="inf.desc"
                            (input)="
                              updatePrintInfillField(
                                $index,
                                'desc',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded text-xs"
                          />
                        </div>
                        <div>
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Min %</span
                          >
                          <input
                            type="number"
                            [value]="inf.min"
                            (input)="
                              updatePrintInfillField(
                                $index,
                                'min',
                                +$any($event.target).value
                              )
                            "
                            class="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono"
                          />
                        </div>
                        <div>
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Max %</span
                          >
                          <input
                            type="number"
                            [value]="inf.max"
                            (input)="
                              updatePrintInfillField(
                                $index,
                                'max',
                                +$any($event.target).value
                              )
                            "
                            class="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono"
                          />
                        </div>
                        <div>
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Default %</span
                          >
                          <input
                            type="number"
                            [value]="inf.defaultVal"
                            (input)="
                              updatePrintInfillField(
                                $index,
                                'defaultVal',
                                +$any($event.target).value
                              )
                            "
                            class="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono"
                          />
                        </div>
                        <button
                          (click)="removePrintInfill($index)"
                          class="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 rounded-lg"
                        >
                          <mat-icon class="text-sm">delete</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- PUSH NOTIFICATION SETTINGS -->
            @if (activeSubTab() === "Push Settings") {
              <div class="space-y-6">
                <p class="text-xs text-zinc-500">
                  Configure FCM Push Notification rules, templates, and
                  automatic dispatch triggers when catalog changes occur.
                </p>

                <div
                  class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-4"
                >
                  <h3
                    class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                  >
                    Automated Dispatch Triggers
                  </h3>

                  <div
                    class="flex items-center gap-2 p-3 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-xl"
                  >
                    <input
                      type="checkbox"
                      [checked]="
                        draft().pushNotificationSettings?.autoNotifyNewProduct
                      "
                      (change)="
                        setNested(
                          'pushNotificationSettings',
                          'autoNotifyNewProduct',
                          $any($event.target).checked
                        )
                      "
                      class="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <span
                      class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                      >Notify Users Automatically When a New Product is
                      Created</span
                    >
                  </div>

                  <div
                    class="flex items-center gap-2 p-3 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-850 rounded-xl"
                  >
                    <input
                      type="checkbox"
                      [checked]="
                        draft().pushNotificationSettings
                          ?.autoGenerateMarketingContent
                      "
                      (change)="
                        setNested(
                          'pushNotificationSettings',
                          'autoGenerateMarketingContent',
                          $any($event.target).checked
                        )
                      "
                      class="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <span
                      class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                      >Auto-Generate Premium Marketing Copy for
                      Notifications</span
                    >
                  </div>
                </div>

                <div
                  class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-4"
                >
                  <h3
                    class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                  >
                    Default Catalog Notification Templates
                  </h3>

                  <div class="space-y-3">
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Notification Title Template</span
                      >
                      <input
                        type="text"
                        [value]="
                          draft().pushNotificationSettings
                            ?.notifyTitleTemplate ||
                          'New Product Alert: {product_name}'
                        "
                        (input)="
                          setNested(
                            'pushNotificationSettings',
                            'notifyTitleTemplate',
                            $any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
                      />
                      <span class="text-[9px] text-zinc-400"
                        >Variables available:
                        <code>&#123;product_name&#125;</code></span
                      >
                    </div>

                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Notification Body Template</span
                      >
                      <textarea
                        rows="3"
                        [value]="
                          draft().pushNotificationSettings
                            ?.notifyBodyTemplate ||
                          'We just added {product_name} to our catalog for only ₹{price}! Get it now.'
                        "
                        (input)="
                          setNested(
                            'pushNotificationSettings',
                            'notifyBodyTemplate',
                            $any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none resize-none"
                      ></textarea>
                      <span class="text-[9px] text-zinc-400"
                        >Variables available:
                        <code>&#123;product_name&#125;</code>,
                        <code>&#123;price&#125;</code>,
                        <code>&#123;sku&#125;</code></span
                      >
                    </div>
                  </div>
                </div>

                <div
                  class="p-4 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-4"
                >
                  <h3
                    class="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300"
                  >
                    Firebase Cloud Messaging (FCM) Credentials
                  </h3>

                  <div class="space-y-3">
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >FCM VAPID Public Key</span
                      >
                      <input
                        type="text"
                        [value]="
                          draft().pushNotificationSettings?.vapidKey ||
                          'BEl62wpCL7jH7QNSTWmK8t0dIL60VwU5B564U829s29528s0921509215'
                        "
                        (input)="
                          setNested(
                            'pushNotificationSettings',
                            'vapidKey',
                            $any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                      />
                      <span class="text-[9px] text-zinc-400"
                        >Required for web browser push token generation.</span
                      >
                    </div>

                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Active Firebase Web Application Configuration
                        (Read-Only)</span
                      >
                      <div
                        class="p-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                      >
                        <pre
                          class="text-[10px] font-mono text-zinc-650 dark:text-zinc-450 overflow-x-auto whitespace-pre-wrap select-all"
                        >
&#123;
  "projectId": "manifest-replica-3lkqp",
  "appId": "1:13671285845:web:d590ce7b58aadc0dcf00dc",
  "apiKey": "AIzaSyAhMymmsQh5hvLg-hiWtNMqYCwPiZkSWYY",
  "authDomain": "manifest-replica-3lkqp.firebaseapp.com",
  "storageBucket": "manifest-replica-3lkqp.firebasestorage.app",
  "messagingSenderId": "13671285845"
&#125;</pre
                        >
                      </div>
                      <span class="text-[9px] text-zinc-400"
                        >Loaded dynamically from
                        <code>public/firebase-applet-config.json</code>.</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    ".scrollbar-thin::-webkit-scrollbar { width: 4px; }",
    ".scrollbar-thin::-webkit-scrollbar-track { background: transparent; }",
    ".scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.2); border-radius: 2px; }",
  ],
})
export class AdminSettingsTab {
  @Input({ required: true }) admin!: AdminPanel;
  private themeService = inject(ThemeService);
  private toastService = inject(ToastService);

  activeSubTab = signal<string>("General");
  draft = signal<any>({});
  isSaving = signal<boolean>(false);

  // WhatsApp Settings Signals
  whatsappSubSection = signal<"config" | "templates">("config");
  activeTemplateKey = signal<string>("registration");
  showVarPicker = signal<boolean>(false);
  testNumber = "";
  testSendLoading = signal<boolean>(false);

  toggleWhatsappTrigger(triggerKey: string, checked: boolean) {
    this.draft.update((d) => {
      const ws = d.whatsappSettings ? { ...d.whatsappSettings } : {};
      const triggers = ws.triggers ? { ...ws.triggers } : {};
      triggers[triggerKey] = checked;
      ws.triggers = triggers;
      return { ...d, whatsappSettings: ws };
    });
  }

  updateTemplateField(templateKey: string, field: string, value: any) {
    this.draft.update((d) => {
      const ws = d.whatsappSettings ? { ...d.whatsappSettings } : {};
      const templates = ws.templates ? { ...ws.templates } : {};
      const t = templates[templateKey]
        ? { ...templates[templateKey] }
        : {
            name: templateKey,
            language: "en",
            headerType: "Text",
            body: "",
            footer: "",
            buttons: [],
          };
      t[field] = value;
      templates[templateKey] = t;
      ws.templates = templates;
      return { ...d, whatsappSettings: ws };
    });
  }

  updateTemplateButtons(templateKey: string, csv: string) {
    const list = csv
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    this.updateTemplateField(templateKey, "buttons", list);
  }

  insertVariableAtCursor(templateKey: string, variable: string) {
    const textarea = document.getElementById(
      "templateBodyTextarea",
    ) as HTMLTextAreaElement;
    const currentVal =
      this.draft().whatsappSettings?.templates?.[templateKey]?.body || "";
    let newVal = currentVal;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      newVal =
        currentVal.substring(0, start) +
        `{{${variable}}}` +
        currentVal.substring(end);
    } else {
      newVal += ` {{${variable}}}`;
    }

    this.updateTemplateField(templateKey, "body", newVal);
    this.showVarPicker.set(false);
  }

  getResolvedPreviewText(body: string): string {
    if (!body) return "Enter template body text...";

    const mockVals: Record<string, string> = {
      customer_name: "Jayakumar",
      order_id: "B3D-4890",
      tracking_number: "TRK-98319-X",
      courier: "Blue Dart Express",
      estimated_delivery: new Date().toLocaleDateString(),
      payment_status: "PAID",
      order_total: "4,890.00",
      currency: "INR",
      invoice_url: "https://3dgalaxy.com/uploads/invoices/inv_4890.pdf",
      store_name: "3D Galaxy Hub",
      support_phone: "+91 99999 99999",
      support_email: "support@3dgalaxy.com",
      site_url: "https://3dgalaxy.com",
      order_items: "Carbon Fiber PETG x 2, Resin Clear Pro x 1",
      shipping_address: "12/4 East Coast Road, Chennai, Tamil Nadu - 600041",
      otp_code: "482091",
    };

    let text = body;
    Object.keys(mockVals).forEach((k) => {
      text = text.replace(
        new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"),
        mockVals[k],
      );
    });
    return text;
  }

  sendTestMessage(templateKey: string) {
    if (!this.testNumber) {
      this.toastService.error(
        "Please enter a recipient number to dispatch test",
      );
      return;
    }

    this.testSendLoading.set(true);
    const template =
      this.draft().whatsappSettings?.templates?.[templateKey] || {};

    this.admin.http
      .post("/api/admin/whatsapp/send", {
        recipientNumber: this.testNumber,
        templateName: templateKey,
        parameters: {
          customer_name: "Jayakumar",
          order_id: "TEST-100",
          tracking_number: "TRK-TEST",
          courier: "Express Courier",
          order_total: "1200",
        },
      })
      .subscribe({
        next: () => {
          this.toastService.success(
            "Test WhatsApp message queued successfully!",
          );
          this.testSendLoading.set(false);
        },
        error: (err) => {
          this.toastService.error(
            err.error?.error || "Failed to dispatch test WhatsApp message",
          );
          this.testSendLoading.set(false);
        },
      });
  }

  subTabs = [
    { name: "General", icon: "settings" },
    { name: "Theme", icon: "palette" },
    { name: "Theme Effects", icon: "auto_awesome" },
    { name: "Typography", icon: "font_download" },
    { name: "Fonts", icon: "text_format" },
    { name: "Color Presets", icon: "style" },
    { name: "Hero Slides", icon: "slideshow" },
    { name: "Hero Carousel", icon: "view_carousel" },
    { name: "Promo Banners", icon: "campaign" },
    { name: "Advertisements", icon: "ad_units" },
    { name: "Homepage Sections", icon: "view_quilt" },
    { name: "Footer", icon: "vertical_align_bottom" },
    { name: "About Page", icon: "info" },
    { name: "Contact", icon: "contact_mail" },
    { name: "Social Links", icon: "share" },
    { name: "Email Settings", icon: "email" },
    { name: "WhatsApp Settings", icon: "chat" },
    { name: "Push Settings", icon: "notifications" },
    { name: "Shipping", icon: "local_shipping" },
    { name: "Payment Gateway", icon: "payment" },
    { name: "Newsletter", icon: "alternate_email" },
    { name: "Chatbot", icon: "smart_toy" },
    { name: "Product Page", icon: "shopping_bag" },
    { name: "Tour Settings", icon: "assistant" },
    { name: "FAQ", icon: "quiz" },
    { name: "Services", icon: "room_service" },
    { name: "3D Printing Service", icon: "print" },
  ];

  constructor() {
    effect(() => {
      const live = this.admin.settingsService.settingsData();
      if (live && Object.keys(live).length > 0) {
        // Hydrate draft with copy on update
        this.draft.set(JSON.parse(JSON.stringify(live)));
      }
    });

    effect(() => {
      const active = this.admin.activeTab();
      if (active === "print-settings") {
        this.activeSubTab.set("3D Printing Service");
      } else if (active === "theme-settings") {
        this.activeSubTab.set("Theme");
      } else if (active === "store-settings") {
        this.activeSubTab.set("General");
      } else if (active === "payment-settings") {
        this.activeSubTab.set("Payment Gateway");
      } else if (active === "shipping-settings") {
        this.activeSubTab.set("Shipping");
      } else if (active === "push-settings") {
        this.activeSubTab.set("Push Settings");
      }
    });
  }

  setVal(key: string, value: any) {
    this.draft.update((d) => {
      return { ...d, [key]: value };
    });
  }

  setNested(parentKey: string, childKey: string, value: any) {
    this.draft.update((d) => {
      const parent = d[parentKey] ? { ...d[parentKey] } : {};
      parent[childKey] = value;
      return { ...d, [parentKey]: parent };
    });
  }

  setThreeDeep(
    parentKey: string,
    midKey: string,
    childKey: string,
    value: any,
  ) {
    this.draft.update((d) => {
      const parent = d[parentKey] ? { ...d[parentKey] } : {};
      const mid = parent[midKey] ? { ...parent[midKey] } : {};
      mid[childKey] = value;
      parent[midKey] = mid;
      return { ...d, [parentKey]: parent };
    });
  }

  setThreeDeepCsv(
    parentKey: string,
    midKey: string,
    childKey: string,
    csv: string,
  ) {
    const list = csv
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    this.setThreeDeep(parentKey, midKey, childKey, list);
  }

  setFourDeep(
    parentKey: string,
    midKey: string,
    subKey: string,
    childKey: string,
    value: any,
  ) {
    this.draft.update((d) => {
      const parent = d[parentKey] ? { ...d[parentKey] } : {};
      const mid = parent[midKey] ? { ...parent[midKey] } : {};
      const sub = mid[subKey] ? { ...mid[subKey] } : {};
      sub[childKey] = value;
      mid[subKey] = sub;
      parent[midKey] = mid;
      return { ...d, [parentKey]: parent };
    });
  }

  setFourDeepCsv(
    parentKey: string,
    midKey: string,
    subKey: string,
    childKey: string,
    csv: string,
  ) {
    const list = csv
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    this.setFourDeep(parentKey, midKey, subKey, childKey, list);
  }

  setArrayFromCsv(parentKey: string, childKey: string, csv: string) {
    const list = csv
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    this.setNested(parentKey, childKey, list);
  }

  updateArrayItem(arrayKey: string, index: number, value: any) {
    this.draft.update((d) => {
      const list = [...(d[arrayKey] || [])];
      list[index] = value;
      return { ...d, [arrayKey]: list };
    });
  }

  removeArrayItem(arrayKey: string, index: number) {
    this.draft.update((d) => {
      const list = [...(d[arrayKey] || [])];
      list.splice(index, 1);
      return { ...d, [arrayKey]: list };
    });
  }

  appendArrayItem(arrayKey: string, defaultValue: any) {
    this.draft.update((d) => {
      const list = [...(d[arrayKey] || [])];
      list.push(defaultValue);
      return { ...d, [arrayKey]: list };
    });
  }

  // Specialized array helpers
  addHeroSlide() {
    this.appendArrayItem("heroSlides", {
      imageUrl: "",
      title: "",
      subtitle: "",
      linkUrl: "",
      badge: "",
      badgeIcon: "",
      btnText: "",
      videoUrl: "",
      desc: "",
      secBtnText: "View Details",
      mobileImageUrl: "",
      bgImageUrl: "",
      bgVideoUrl: "",
      bgGradient: "",
      bgColor: "#09090b",
      price: "",
      oldPrice: "",
      discountText: "",
      productTag: "",
      animationType: "fade",
      overlayOpacity: 0.4,
      textAlignment: "left",
      darkOverlay: true,
      btnTheme: "primary",
      slideOrder: 0,
      slideDuration: 3000,
      active: true,
      hideOnMobile: false,
      hideOnDesktop: false,
    });
  }

  updateSlideField(index: number, field: string, value: any) {
    this.draft.update((d) => {
      const list = [...(d.heroSlides || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...d, heroSlides: list };
    });
  }

  addPromoBanner() {
    this.appendArrayItem("promoBanners", {
      id: "banner_" + Date.now(),
      title: "",
      discountText: "",
      imageUrl: "",
      linkUrl: "",
    });
  }

  updatePromoBannerField(index: number, field: string, value: any) {
    this.draft.update((d) => {
      const list = [...(d.promoBanners || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...d, promoBanners: list };
    });
  }

  addAd() {
    this.appendArrayItem("advertisements", {
      id: "ad_" + Date.now(),
      title: "",
      imageUrl: "",
      linkUrl: "",
    });
  }

  updateAdField(index: number, field: string, value: any) {
    this.draft.update((d) => {
      const list = [...(d.advertisements || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...d, advertisements: list };
    });
  }

  addFaq() {
    this.appendArrayItem("faqs", {
      question: "",
      answer: "",
      category: "General",
    });
  }

  updateFaqField(index: number, field: string, value: any) {
    this.draft.update((d) => {
      const list = [...(d.faqs || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...d, faqs: list };
    });
  }

  addService() {
    this.appendArrayItem("services", {
      title: "",
      description: "",
      icon: "star",
    });
  }

  updateServiceField(index: number, field: string, value: any) {
    this.draft.update((d) => {
      const list = [...(d.services || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...d, services: list };
    });
  }

  // Print Service Helpers
  setPrintServiceSettingsField(field: string, value: any) {
    this.draft.update((d) => {
      const ps = d.printServiceSettings ? { ...d.printServiceSettings } : {};
      ps[field] = value;
      return { ...d, printServiceSettings: ps };
    });
  }

  addPrintMaterial() {
    this.draft.update((d) => {
      const ps = d.printServiceSettings ? { ...d.printServiceSettings } : {};
      const materials = [...(ps.materials || [])];
      materials.push({
        name: "New Material",
        pricePerGram: 2.0,
        density: 1.2,
        active: true,
        colors: [
          { name: "White", hex: "#FFFFFF" },
          { name: "Black", hex: "#000000" },
        ],
      });
      ps.materials = materials;
      return { ...d, printServiceSettings: ps };
    });
  }

  updatePrintMaterialField(index: number, field: string, value: any) {
    this.draft.update((d) => {
      const ps = d.printServiceSettings ? { ...d.printServiceSettings } : {};
      const materials = [...(ps.materials || [])];
      materials[index] = { ...materials[index], [field]: value };
      ps.materials = materials;
      return { ...d, printServiceSettings: ps };
    });
  }

  removePrintMaterial(index: number) {
    this.draft.update((d) => {
      const ps = d.printServiceSettings ? { ...d.printServiceSettings } : {};
      const materials = [...(ps.materials || [])];
      materials.splice(index, 1);
      ps.materials = materials;
      return { ...d, printServiceSettings: ps };
    });
  }

  addPrintMaterialColor(parentIndex: number) {
    this.draft.update((d) => {
      const ps = d.printServiceSettings ? { ...d.printServiceSettings } : {};
      const materials = [...(ps.materials || [])];
      const mat = { ...materials[parentIndex] };
      const colors = [...(mat.colors || [])];
      colors.push({ name: "New Color", hex: "#000000" });
      mat.colors = colors;
      materials[parentIndex] = mat;
      ps.materials = materials;
      return { ...d, printServiceSettings: ps };
    });
  }

  updatePrintMaterialColorField(
    parentIndex: number,
    childIndex: number,
    field: string,
    value: any,
  ) {
    this.draft.update((d) => {
      const ps = d.printServiceSettings ? { ...d.printServiceSettings } : {};
      const materials = [...(ps.materials || [])];
      const mat = { ...materials[parentIndex] };
      const colors = [...(mat.colors || [])];
      colors[childIndex] = { ...colors[childIndex], [field]: value };
      mat.colors = colors;
      materials[parentIndex] = mat;
      ps.materials = materials;
      return { ...d, printServiceSettings: ps };
    });
  }

  removePrintMaterialColor(parentIndex: number, childIndex: number) {
    this.draft.update((d) => {
      const ps = d.printServiceSettings ? { ...d.printServiceSettings } : {};
      const materials = [...(ps.materials || [])];
      const mat = { ...materials[parentIndex] };
      const colors = [...(mat.colors || [])];
      colors.splice(childIndex, 1);
      mat.colors = colors;
      materials[parentIndex] = mat;
      ps.materials = materials;
      return { ...d, printServiceSettings: ps };
    });
  }

  addPrintQuality() {
    this.draft.update((d) => {
      const ps = d.printServiceSettings ? { ...d.printServiceSettings } : {};
      const qualities = [...(ps.qualities || [])];
      qualities.push({ name: "New Profile", height: 0.2 });
      ps.qualities = qualities;
      return { ...d, printServiceSettings: ps };
    });
  }

  updatePrintQualityField(index: number, field: string, value: any) {
    this.draft.update((d) => {
      const ps = d.printServiceSettings ? { ...d.printServiceSettings } : {};
      const qualities = [...(ps.qualities || [])];
      qualities[index] = { ...qualities[index], [field]: value };
      ps.qualities = qualities;
      return { ...d, printServiceSettings: ps };
    });
  }

  removePrintQuality(index: number) {
    this.draft.update((d) => {
      const ps = d.printServiceSettings ? { ...d.printServiceSettings } : {};
      const qualities = [...(ps.qualities || [])];
      qualities.splice(index, 1);
      ps.qualities = qualities;
      return { ...d, printServiceSettings: ps };
    });
  }

  addPrintInfill() {
    this.draft.update((d) => {
      const ps = d.printServiceSettings ? { ...d.printServiceSettings } : {};
      const infills = [...(ps.infillStandards || [])];
      infills.push({
        name: "New Infill",
        desc: "Standard",
        min: 10,
        max: 20,
        defaultVal: 15,
      });
      ps.infillStandards = infills;
      return { ...d, printServiceSettings: ps };
    });
  }

  updatePrintInfillField(index: number, field: string, value: any) {
    this.draft.update((d) => {
      const ps = d.printServiceSettings ? { ...d.printServiceSettings } : {};
      const infills = [...(ps.infillStandards || [])];
      infills[index] = { ...infills[index], [field]: value };
      ps.infillStandards = infills;
      return { ...d, printServiceSettings: ps };
    });
  }

  removePrintInfill(index: number) {
    this.draft.update((d) => {
      const ps = d.printServiceSettings ? { ...d.printServiceSettings } : {};
      const infills = [...(ps.infillStandards || [])];
      infills.splice(index, 1);
      ps.infillStandards = infills;
      return { ...d, printServiceSettings: ps };
    });
  }

  /** Update a single field on any payment gateway (razorpay | cashfree) */
  setPgField(gateway: "razorpay" | "cashfree", key: string, value: any) {
    this.draft.update((d) => {
      const pgs = d.paymentGatewaySettings
        ? { ...d.paymentGatewaySettings }
        : {};
      const methods = pgs.paymentMethods ? { ...pgs.paymentMethods } : {};
      methods[gateway] = { ...(methods[gateway] || {}), [key]: value };
      pgs.paymentMethods = methods;
      return { ...d, paymentGatewaySettings: pgs };
    });
  }

  /** Update a single field on the COD payment method */
  setCodField(key: string, value: any) {
    this.draft.update((d) => {
      const pgs = d.paymentGatewaySettings
        ? { ...d.paymentGatewaySettings }
        : {};
      const methods = pgs.paymentMethods ? { ...pgs.paymentMethods } : {};
      methods["cod"] = { ...(methods["cod"] || {}), [key]: value };
      pgs.paymentMethods = methods;
      return { ...d, paymentGatewaySettings: pgs };
    });
  }

  async saveAllSettings() {
    this.isSaving.set(true);
    try {
      await this.admin.settingsService.saveSettings(this.draft());
      this.toastService.success(
        "Centralized configuration serialized successfully.",
      );
    } catch (e: any) {
      this.toastService.error(
        e.message || "Error synchronization system schema.",
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
