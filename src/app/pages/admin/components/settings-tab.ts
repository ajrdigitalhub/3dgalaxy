import {
  Component,
  Input,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  OnDestroy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { AdminPanel } from "../admin";
import { ImagePickerComponent } from "../../../shared/components/image-picker/image-picker.component";
import { ThemeService } from "../../../core/services/theme.service";
import { ToastService } from "../../../shared/components/toast/toast.service";
import { PwaSettingsTabComponent } from "./pwa-settings-tab";
import { MarketingTrackingTabComponent } from "./marketing-tracking-tab";
import { AdminDevicesTab } from "./admin-devices-tab";
import { BackupManagementComponent } from "../../../admin/settings/backup-management/backup-management.component";
import { TrackingService, CourierPartnerConfig } from "../../../core/services/tracking.service";
import { environment } from "../../../../environments/environment";


@Component({
  selector: "app-admin-settings-tab",
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    ImagePickerComponent,
    FormsModule,
    PwaSettingsTabComponent,
    MarketingTrackingTabComponent,
    AdminDevicesTab,
    BackupManagementComponent,
  ],
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
          <p class="text-xs text-zinc-500 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Formulate and manage gateways, typography, brand assets, and services globally.</span>
            @if (admin.settingsService.settingsData()?.version) {
              <span class="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 text-[10px] font-bold rounded-md">
                v{{ admin.settingsService.settingsData().version }}
              </span>
            }
            @if (admin.settingsService.settingsData()?.updatedAt) {
              <span class="text-zinc-400 text-[10px] font-semibold">
                (Last synced: {{ admin.settingsService.settingsData().updatedAt | date:'medium' }})
              </span>
            }
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
            (click)="restoreDefaults()"
            [disabled]="isSaving()"
            class="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-black uppercase transition-all duration-300 cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            id="restore-defaults-settings-btn"
          >
            <mat-icon class="text-sm">settings_backup_restore</mat-icon>
            Restore Defaults
          </button>
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
        <div
          class="flex flex-row overflow-x-auto lg:flex-col gap-1 lg:border-r lg:border-zinc-200 dark:lg:border-zinc-800 pr-4 pb-2 lg:pb-0 lg:max-h-[70vh] lg:overflow-y-auto no-scrollbar lg:scrollbar-thin"
        >
          @for (tab of subTabs; track tab.name) {
            <button
              (click)="activeSubTab.set(tab.name)"
              [class.bg-blue-50]="activeSubTab() === tab.name"
              [class.text-blue-600]="activeSubTab() === tab.name"
              [class.dark:bg-zinc-800]="activeSubTab() === tab.name"
              [class.dark:text-blue-400]="activeSubTab() === tab.name"
              [class.border-b-2]="activeSubTab() === tab.name"
              [class.lg:border-b-0]="activeSubTab() === tab.name"
              [class.lg:border-l-4]="activeSubTab() === tab.name"
              [class.border-blue-600]="activeSubTab() === tab.name"
              class="w-auto lg:w-full shrink-0 flex items-center gap-2.5 px-3 py-2 text-left rounded text-[11px] font-black uppercase select-none transition-all cursor-pointer text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <mat-icon class="text-base shrink-0">{{ tab.icon }}</mat-icon>
              <span>{{ tab.name }}</span>
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
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium outline-none"
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
                    class="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
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
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
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
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
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
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
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
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
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
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
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
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
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
                  class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
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
                      class="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
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
                      class="p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4 relative"
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
                            [value]="slide.title || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'title',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Slide Subheading</span
                          >
                          <input
                            type="text"
                            [value]="slide.subtitle || slide.subheading || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'subtitle',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div class="space-y-1">
                          <span
                            class="block text-[8px] font-black text-zinc-400 uppercase"
                            >Target Redirect Link URL</span
                          >
                          <input
                            type="text"
                            [value]="slide.linkUrl || ''"
                            (input)="
                              updateSlideField(
                                $index,
                                'linkUrl',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
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
                    class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
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
                      class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3 relative"
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

            <!-- 8. ADVERTISEMENTS & PROMOTIONAL CAMPAIGNS -->
            @if (activeSubTab() === "Advertisements") {
              <div class="space-y-6">
                <!-- SUB-TAB HEADER -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h2 class="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                      <mat-icon class="text-orange-500">campaign</mat-icon>
                      Advertisement & Promotional Campaign Manager
                    </h2>
                    <p class="text-xs text-zinc-500 mt-0.5">
                      Configure promotional campaigns, flash sale popups, countdown timers, page targeting, device caps, and live performance metrics.
                    </p>
                  </div>

                  @if (editingAdIndex() === null) {
                    <div class="flex items-center gap-2">
                      <button
                        (click)="addAd()"
                        class="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase shadow-md hover:shadow-orange-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <mat-icon class="text-sm">add_circle</mat-icon> Create Campaign
                      </button>
                    </div>
                  } @else {
                    <button
                      (click)="editingAdIndex.set(null)"
                      class="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer w-fit"
                    >
                      <mat-icon class="text-sm">arrow_back</mat-icon> Back to All Campaigns
                    </button>
                  }
                </div>

                <!-- VIEW 1: CAMPAIGN OVERVIEW LIST TABLE -->
                @if (editingAdIndex() === null) {
                  <!-- FILTERS AND SEARCH BAR -->
                  <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <!-- STATUS TABS -->
                    <div (wheel)="onAdTabWheel($event)" class="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 no-scrollbar touch-pan-x">
                      @for (statusOpt of ['all', 'active', 'scheduled', 'paused', 'expired', 'draft']; track statusOpt) {
                        <button
                          (click)="adStatusFilter.set(statusOpt)"
                          [class]="adStatusFilter() === statusOpt
                            ? 'px-3 py-1.5 bg-orange-500 text-white text-[10px] font-black uppercase rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap'
                            : 'px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[10px] font-bold uppercase rounded-xl transition-all cursor-pointer whitespace-nowrap border border-zinc-200 dark:border-zinc-800'"
                        >
                          {{ statusOpt }}
                        </button>
                      }
                    </div>

                    <!-- SEARCH INPUT -->
                    <div class="relative w-full md:w-64">
                      <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">search</mat-icon>
                      <input
                        type="text"
                        [value]="adSearchQuery()"
                        (input)="adSearchQuery.set($any($event.target).value)"
                        placeholder="Search campaign by name..."
                        class="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <!-- CAMPAIGNS TABLE / CARDS LIST -->
                  <div class="space-y-3">
                    @for (ad of advertisementsList; track $index) {
                      @if (
                        (adStatusFilter() === 'all' || calculateCampaignStatus(ad).toLowerCase() === adStatusFilter().toLowerCase()) &&
                        (!adSearchQuery() || (ad.name || ad.title || '').toLowerCase().includes(adSearchQuery().toLowerCase()))
                      ) {
                        <div class="p-5 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs hover:border-orange-500/50 transition-all space-y-4">
                          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <!-- CAMPAIGN TITLE & METADATA -->
                            <div class="flex items-start gap-3">
                              <div class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold shrink-0 mt-0.5">
                                <mat-icon class="text-xl">{{ ad.isPopup || ad.type === 'popup' ? 'picture_in_picture' : 'view_carousel' }}</mat-icon>
                              </div>
                              <div>
                                <div class="flex items-center gap-2 flex-wrap">
                                  <h3 class="text-sm font-black text-zinc-900 dark:text-white">
                                    {{ ad.name || ad.title || 'Untitled Campaign' }}
                                  </h3>

                                  <!-- CALCULATED STATUS BADGE -->
                                  @let calcStatus = calculateCampaignStatus(ad);
                                  <span
                                    [ngClass]="{
                                      'bg-emerald-500/10 text-emerald-600 border-emerald-500/30': calcStatus === 'ACTIVE',
                                      'bg-blue-500/10 text-blue-600 border-blue-500/30': calcStatus === 'SCHEDULED',
                                      'bg-amber-500/10 text-amber-600 border-amber-500/30': calcStatus === 'EXPIRED',
                                      'bg-orange-500/10 text-orange-600 border-orange-500/30': calcStatus === 'PAUSED',
                                      'bg-zinc-500/10 text-zinc-500 border-zinc-500/30': calcStatus === 'DRAFT',
                                      'bg-purple-500/10 text-purple-600 border-purple-500/30': calcStatus === 'ARCHIVED'
                                    }"
                                    class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1"
                                  >
                                    <span
                                      class="w-1.5 h-1.5 rounded-full"
                                      [ngClass]="{
                                        'bg-emerald-500 animate-pulse': calcStatus === 'ACTIVE',
                                        'bg-blue-500': calcStatus === 'SCHEDULED',
                                        'bg-amber-500': calcStatus === 'EXPIRED',
                                        'bg-orange-500': calcStatus === 'PAUSED',
                                        'bg-zinc-400': calcStatus === 'DRAFT',
                                        'bg-purple-500': calcStatus === 'ARCHIVED'
                                      }"
                                    ></span>
                                    {{ calcStatus }}
                                  </span>

                                  <!-- TYPE PILL -->
                                  @if (ad.type) {
                                    <span class="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md text-[9px] font-bold uppercase">
                                      {{ ad.type.replace('_', ' ') }}
                                    </span>
                                  }

                                  <!-- PLACEMENT PILL -->
                                  @if (ad.placement || ad.position) {
                                    <span class="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-md text-[9px] font-mono">
                                      {{ ad.placement || ad.position }}
                                    </span>
                                  }
                                </div>

                                <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                                  {{ ad.headline || ad.subheadline || ad.linkUrl || 'No headline set' }}
                                </p>
                              </div>
                            </div>

                            <!-- QUICK PERFORMANCE STATS -->
                            <div class="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shrink-0">
                              <div class="text-center px-2">
                                <span class="block text-[8px] font-black text-zinc-400 uppercase">Impressions</span>
                                <span class="text-xs font-black font-mono text-zinc-800 dark:text-zinc-200">{{ ad.impressions || 0 }}</span>
                              </div>
                              <div class="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800"></div>
                              <div class="text-center px-2">
                                <span class="block text-[8px] font-black text-zinc-400 uppercase">Clicks</span>
                                <span class="text-xs font-black font-mono text-blue-600 dark:text-blue-400">{{ ad.clicks || 0 }}</span>
                              </div>
                              <div class="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800"></div>
                              <div class="text-center px-2">
                                <span class="block text-[8px] font-black text-zinc-400 uppercase">CTR</span>
                                <span class="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                                  {{ (ad.impressions && ad.impressions > 0) ? ((ad.clicks / ad.impressions) * 100).toFixed(1) + '%' : '0%' }}
                                </span>
                              </div>
                            </div>
                          </div>

                          <!-- SECONDARY ROW: TIMELINE & ACTION BUTTONS -->
                          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
                            <div class="flex items-center gap-4 text-zinc-500 text-[11px]">
                              @if (ad.startDate || ad.endDate) {
                                <div class="flex items-center gap-1 font-mono">
                                  <mat-icon class="text-sm text-zinc-400">schedule</mat-icon>
                                  <span>{{ ad.startDate || 'Immediate' }} {{ ad.startTime }} → {{ ad.endDate || 'No expiration' }} {{ ad.endTime }}</span>
                                </div>
                              } @else {
                                <span class="text-zinc-400 italic">Always Active (No timeline cap)</span>
                              }

                              @if (ad.enableCountdown) {
                                <span class="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded text-[9px] font-black uppercase flex items-center gap-1">
                                  <mat-icon class="text-xs">timer</mat-icon> Countdown Enabled
                                </span>
                              }
                            </div>

                            <!-- ACTION BUTTONS -->
                            <div class="flex items-center gap-2">
                              <button
                                (click)="startEditingAd($index)"
                                class="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <mat-icon class="text-sm">edit</mat-icon> Edit Campaign
                              </button>

                              <button
                                (click)="duplicateCampaign($index)"
                                title="Duplicate Campaign"
                                class="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                              >
                                <mat-icon class="text-base">content_copy</mat-icon>
                              </button>

                              <button
                                (click)="toggleCampaignStatus($index)"
                                [title]="(ad.status || 'active') === 'active' ? 'Pause Campaign' : 'Activate Campaign'"
                                class="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                              >
                                <mat-icon class="text-base">{{ (ad.status || 'active') === 'active' ? 'pause' : 'play_arrow' }}</mat-icon>
                              </button>

                              <button
                                (click)="archiveCampaign($index)"
                                title="Archive Campaign"
                                class="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-amber-500 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                              >
                                <mat-icon class="text-base">archive</mat-icon>
                              </button>

                              <button
                                (click)="deleteCampaign($index)"
                                title="Delete Campaign"
                                class="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                              >
                                <mat-icon class="text-base">delete</mat-icon>
                              </button>
                            </div>
                          </div>
                        </div>
                      }
                    }
                    @if (advertisementsList.length === 0) {
                      <div class="p-8 text-center bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-3">
                        <div class="w-12 h-12 mx-auto rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                          <mat-icon class="text-2xl">campaign</mat-icon>
                        </div>
                        <div>
                          <h4 class="text-xs font-black uppercase text-zinc-800 dark:text-zinc-200">No Advertisement Campaigns Found</h4>
                          <p class="text-[11px] text-zinc-400 mt-0.5">Get started by creating your first promotional banner or popup campaign.</p>
                        </div>
                        <button
                          type="button"
                          (click)="addAd()"
                          class="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <mat-icon class="text-sm">add_circle</mat-icon> Create First Campaign
                        </button>
                      </div>
                    }
                  </div>
                }

                <!-- VIEW 2: CAMPAIGN EDITOR & LIVE PREVIEW PANEL -->
                @if (editingAdIndex() !== null && (draft().advertisements?.[editingAdIndex()!] || advertisementsList[editingAdIndex()!]); as ad) {
                  <!-- READ-ONLY CAMPAIGN SUMMARY CARD -->
                  <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 mb-4">
                    <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <h4 class="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <mat-icon class="text-orange-500 text-sm">summarize</mat-icon> Campaign Live Summary
                      </h4>
                      <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                        {{ calculateCampaignStatus(ad) }}
                      </span>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span class="block text-[9px] font-black text-zinc-400 uppercase">Audience</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200">
                          {{ (ad.audience || 'all') === 'guests_only' ? 'Guest Users Only' : (ad.audience === 'logged_in' ? 'Logged-in Users Only' : (ad.audience === 'new_users_only' ? 'New Users Only' : (ad.audience === 'returning_users_only' ? 'Returning Users Only' : 'Everyone'))) }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-[9px] font-black text-zinc-400 uppercase">Display Mode</span>
                        <span class="font-bold text-orange-600 dark:text-orange-400">
                          {{ isImageOnlyMode(ad) ? 'Image Only' : 'Full Promotional' }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-[9px] font-black text-zinc-400 uppercase">Trigger</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200">
                          {{ ad.trigger === 'delay' ? ('After ' + (ad.delaySeconds || 3) + 's') : (ad.trigger === 'scroll' ? ('Scroll ' + (ad.scrollPercent || 50) + '%') : (ad.trigger === 'exit_intent' ? 'Exit Intent' : 'Immediate')) }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-[9px] font-black text-zinc-400 uppercase">Frequency</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200">
                          {{ ad.frequency === 'session' ? 'Once Per Session' : (ad.frequency === 'daily' ? 'Once Per Day' : (ad.frequency === 'campaign' ? 'Once Per Campaign' : 'Every Time')) }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-[9px] font-black text-zinc-400 uppercase">Schedule</span>
                        <span class="font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
                          {{ ad.startDate || 'Immediate' }} → {{ ad.endDate || 'No expiration' }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-[9px] font-black text-zinc-400 uppercase">Placement</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200 capitalize">
                          {{ ad.placement || 'Homepage' }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-[9px] font-black text-zinc-400 uppercase">Device Target</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200 capitalize">
                          {{ ad.deviceTargeting || 'All Devices' }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-[9px] font-black text-zinc-400 uppercase">Priority</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200">
                          Level {{ ad.priority || 1 }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- STICKY TOP TAB & SCROLL NAVIGATION BAR INTEGRATED WITH SCREEN -->
                  <div class="sticky top-16 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 transition-all">
                    <!-- TABS SCROLLER WITH LEFT/RIGHT CHEVRONS -->
                    <div class="flex items-center gap-1.5 flex-1 min-w-0">
                      <button
                        type="button"
                        (click)="scrollAdTabs('left')"
                        class="h-8 w-8 shrink-0 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-all cursor-pointer border-none"
                        title="Scroll tabs left"
                      >
                        <mat-icon class="text-base">chevron_left</mat-icon>
                      </button>

                      <div
                        id="ad-editor-tabs-container"
                        (wheel)="onAdTabWheel($event)"
                        class="flex items-center gap-1.5 overflow-x-auto p-1 bg-zinc-100/80 dark:bg-zinc-950/60 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 scroll-smooth no-scrollbar touch-pan-x flex-1 min-w-0"
                      >
                        @for (tab of [
                          { id: 'basic', name: 'Basic Info', icon: 'info' },
                          { id: 'content', name: 'Content & Media', icon: 'image' },
                          { id: 'schedule', name: 'Timeline & Timer', icon: 'schedule' },
                          { id: 'popup', name: 'Popup Config', icon: 'picture_in_picture' },
                          { id: 'triggers', name: 'Triggers & Freq', icon: 'bolt' },
                          { id: 'targeting', name: 'Targeting', icon: 'ads_click' },
                          { id: 'promotion', name: 'Promotions', icon: 'local_offer' }
                        ]; track tab.id) {
                          <button
                            type="button"
                            [id]="'ad-tab-btn-' + tab.id"
                            (click)="scrollToAdSection(tab.id)"
                            [class]="adEditorTab() === tab.id
                              ? 'px-3 py-1.5 bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 border border-orange-500/30'
                              : 'px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 hover:bg-white/50 dark:hover:bg-zinc-800/50 rounded-lg'"
                          >
                            <mat-icon class="text-sm shrink-0">{{ tab.icon }}</mat-icon>
                            <span>{{ tab.name }}</span>
                          </button>
                        }
                      </div>

                      <button
                        type="button"
                        (click)="scrollAdTabs('right')"
                        class="h-8 w-8 shrink-0 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-all cursor-pointer border-none"
                        title="Scroll tabs right"
                      >
                        <mat-icon class="text-base">chevron_right</mat-icon>
                      </button>
                    </div>

                    <!-- VIEW MODE & QUICK ACTIONS -->
                    <div class="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      <div class="flex items-center bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[10px]">
                        <button
                          type="button"
                          (click)="adEditorViewMode.set('scroll'); setupAdScrollSpy()"
                          [class]="adEditorViewMode() === 'scroll'
                            ? 'px-2.5 py-1 bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 rounded-lg font-black shadow-xs flex items-center gap-1 cursor-pointer'
                            : 'px-2.5 py-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold flex items-center gap-1 cursor-pointer'"
                          title="Continuous Screen Scroll Mode"
                        >
                          <mat-icon class="text-xs">view_stream</mat-icon> Screen Scroll
                        </button>
                        <button
                          type="button"
                          (click)="adEditorViewMode.set('tab')"
                          [class]="adEditorViewMode() === 'tab'
                            ? 'px-2.5 py-1 bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 rounded-lg font-black shadow-xs flex items-center gap-1 cursor-pointer'
                            : 'px-2.5 py-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold flex items-center gap-1 cursor-pointer'"
                          title="Single Tab Mode"
                        >
                          <mat-icon class="text-xs">tab</mat-icon> Tabbed
                        </button>
                      </div>

                      <button
                        type="button"
                        (click)="saveAllSettings()"
                        [disabled]="isSaving()"
                        class="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase shadow-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                        title="Save Configurations"
                      >
                        <mat-icon class="text-sm">{{ isSaving() ? 'rotate_right' : 'save' }}</mat-icon>
                        <span class="hidden sm:inline">{{ isSaving() ? 'Saving...' : 'Save' }}</span>
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <!-- LEFT COLUMN: EDITOR SECTIONS (7 COLS) -->
                    <div class="lg:col-span-7 space-y-6">
                      <!-- TAB 1: BASIC INFORMATION -->
                      @if (adEditorViewMode() === 'scroll' || adEditorTab() === 'basic') {
                        <div id="ad-sec-basic" class="scroll-mt-36 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 transition-all">
                          <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Basic Information</h3>
                          
                          <div class="space-y-1">
                            <span class="block text-[9px] font-black text-zinc-400 uppercase">Campaign Name (Internal)</span>
                            <input
                              type="text"
                              [value]="ad.name || ad.title || ''"
                              (input)="updateAdField(editingAdIndex()!, 'name', $any($event.target).value)"
                              placeholder="e.g. Diwali Mega Sale Campaign"
                              class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                            />
                          </div>

                          <div class="space-y-1">
                            <span class="block text-[9px] font-black text-zinc-400 uppercase">Internal Description</span>
                            <textarea
                              rows="2"
                              [value]="ad.description || ''"
                              (input)="updateAdField(editingAdIndex()!, 'description', $any($event.target).value)"
                              placeholder="Internal administrative notes or strategy summary..."
                              class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white resize-none"
                            ></textarea>
                          </div>

                          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Campaign Type</span>
                              <select
                                [value]="ad.type || 'banner'"
                                (change)="updateAdField(editingAdIndex()!, 'type', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              >
                                <option value="banner">Banner</option>
                                <option value="popup">Popup</option>
                                <option value="flash_sale">Flash Sale</option>
                                <option value="product">Product Promotion</option>
                                <option value="category">Category Promotion</option>
                                <option value="coupon">Coupon Promotion</option>
                                <option value="announcement">Announcement</option>
                                <option value="seasonal">Seasonal Campaign</option>
                                <option value="new_product">New Product</option>
                                <option value="clearance">Clearance Sale</option>
                              </select>
                            </div>

                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Status</span>
                              <select
                                [value]="ad.status || 'active'"
                                (change)="updateAdField(editingAdIndex()!, 'status', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              >
                                <option value="draft">Draft</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                                <option value="expired">Expired</option>
                                <option value="archived">Archived</option>
                              </select>
                            </div>

                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Display Priority</span>
                              <select
                                [value]="ad.priority || 1"
                                (change)="updateAdField(editingAdIndex()!, 'priority', +$any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              >
                                <option [value]="1">1 - Normal Priority</option>
                                <option [value]="2">2 - Medium Priority</option>
                                <option [value]="3">3 - High Priority</option>
                                <option [value]="4">4 - Urgent Priority</option>
                                <option [value]="5">5 - Max Priority (Exclusive)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      }

                      <!-- TAB 2: CONTENT & MEDIA -->
                      @if (adEditorViewMode() === 'scroll' || adEditorTab() === 'content') {
                        <div id="ad-sec-content" class="scroll-mt-36 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 transition-all">
                          <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Content & Visual Assets</h3>

                          <!-- CONTENT DISPLAY MODE SELECTOR -->
                          <div class="space-y-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                            <span class="block text-[9px] font-black text-zinc-400 uppercase tracking-wider">Content Display Mode</span>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              @for (modeOpt of [
                                { id: 'FULL', label: 'Full Promotional Popup', icon: 'auto_awesome', desc: 'Full shell with headline, text, timer & CTA' },
                                { id: 'IMAGE_ONLY', label: 'Image Only', icon: 'image', desc: 'Graphic image + close button only' },
                                { id: 'IMAGE_CLOSE', label: 'Image + Close Button', icon: 'crop_original', desc: 'Clean graphic image with floating close (X)' }
                              ]; track modeOpt.id) {
                                <button
                                  type="button"
                                  (click)="
                                    updateAdField(editingAdIndex()!, 'contentMode', modeOpt.id);
                                    updateAdField(editingAdIndex()!, 'showImageOnly', modeOpt.id !== 'FULL');
                                  "
                                  class="p-3 rounded-xl border text-left transition-all cursor-pointer"
                                  [class]="(ad.contentMode || (ad.showImageOnly ? 'IMAGE_ONLY' : 'FULL')) === modeOpt.id
                                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-600 dark:text-orange-400 font-bold shadow-xs'
                                    : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'"
                                >
                                  <div class="flex items-center gap-1.5 mb-1">
                                    <mat-icon class="text-base">{{ modeOpt.icon }}</mat-icon>
                                    <span class="text-xs font-black">{{ modeOpt.label }}</span>
                                  </div>
                                  <p class="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug">{{ modeOpt.desc }}</p>
                                </button>
                              }
                            </div>
                          </div>

                          <!-- IMAGE CLICK ACTION SELECTOR -->
                          <div class="space-y-1 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                            <span class="block text-[9px] font-black text-zinc-400 uppercase">Image Click Action</span>
                            <select
                              [value]="ad.imageClickAction || 'no_action'"
                              (change)="updateAdField(editingAdIndex()!, 'imageClickAction', $any($event.target).value)"
                              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                            >
                              <option value="no_action">No Action (Clicking image does nothing)</option>
                              <option value="open_url">Open URL / Route</option>
                              <option value="open_product">Open Product</option>
                              <option value="open_category">Open Category</option>
                            </select>
                          </div>

                          @if (isImageOnlyMode(ad)) {
                            <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                              <mat-icon class="text-amber-500 text-base">info</mat-icon>
                              <span>Image Only mode is active. Headline, secondary text, countdown timer and CTA button containers are hidden from storefront rendering.</span>
                            </div>
                          }

                          <div class="space-y-1" [class.opacity-50]="isImageOnlyMode(ad)">
                            <span class="block text-[9px] font-black text-zinc-400 uppercase">Ad Headline</span>
                            <input
                              type="text"
                              [value]="ad.headline || ad.title || ''"
                              (input)="updateAdField(editingAdIndex()!, 'headline', $any($event.target).value)"
                              placeholder="e.g. FESTIVE DIWALI SALE - UP TO 40% OFF"
                              class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                            />
                          </div>

                          <div class="space-y-1" [class.opacity-50]="isImageOnlyMode(ad)">
                            <span class="block text-[9px] font-black text-zinc-400 uppercase">Ad Subheadline / Secondary Text</span>
                            <input
                              type="text"
                              [value]="ad.subheadline || ''"
                              (input)="updateAdField(editingAdIndex()!, 'subheadline', $any($event.target).value)"
                              placeholder="e.g. Upgrade your 3D printer with premium PLA Pro filaments."
                              class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"
                            />
                          </div>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" [class.opacity-50]="isImageOnlyMode(ad)">
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">CTA Button Text</span>
                              <input
                                type="text"
                                [value]="ad.ctaText || 'Shop Now'"
                                (input)="updateAdField(editingAdIndex()!, 'ctaText', $any($event.target).value)"
                                placeholder="Shop Now"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              />
                            </div>

                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">CTA Action</span>
                              <select
                                [value]="ad.ctaAction || 'open_url'"
                                (change)="updateAdField(editingAdIndex()!, 'ctaAction', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              >
                                <option value="open_url">Open URL / Route</option>
                                <option value="open_product">Open Product</option>
                                <option value="open_category">Open Category</option>
                                <option value="open_coupon">Copy Coupon Code</option>
                                <option value="open_cart">Open Cart</option>
                                <option value="open_whatsapp">Open WhatsApp Support</option>
                              </select>
                            </div>
                          </div>

                          <div class="space-y-1">
                            <span class="block text-[9px] font-black text-zinc-400 uppercase">Ad Clickthrough URL</span>
                            <input
                              type="text"
                              [value]="ad.ctaUrl || ad.linkUrl || ''"
                              (input)="updateAdField(editingAdIndex()!, 'ctaUrl', $any($event.target).value)"
                              placeholder="e.g. /products/pla-pro-filament or https://..."
                              class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none font-mono text-zinc-900 dark:text-white"
                            />
                          </div>

                          <div class="flex items-center gap-2 pt-1">
                            <input
                              type="checkbox"
                              [checked]="ad.openInNewTab"
                              (change)="updateAdField(editingAdIndex()!, 'openInNewTab', $any($event.target).checked)"
                              class="w-4 h-4 text-orange-500 rounded cursor-pointer"
                            />
                            <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Open link in new browser tab</span>
                          </div>

                          <!-- DESKTOP IMAGE PICKER -->
                          <div class="pt-2">
                            <app-image-picker
                              label="Desktop Visual Asset (1200x600 recommended)"
                              [value]="ad.imageUrl || ''"
                              (valueChange)="updateAdField(editingAdIndex()!, 'imageUrl', $event)"
                            ></app-image-picker>
                          </div>

                          <!-- MOBILE IMAGE PICKER -->
                          <div class="pt-2">
                            <app-image-picker
                              label="Mobile Visual Asset (800x1000 recommended)"
                              [value]="ad.mobileImageUrl || ''"
                              (valueChange)="updateAdField(editingAdIndex()!, 'mobileImageUrl', $event)"
                            ></app-image-picker>
                          </div>
                        </div>
                      }

                      <!-- TAB 3: TIMELINE & COUNTDOWN -->
                      @if (adEditorViewMode() === 'scroll' || adEditorTab() === 'schedule') {
                        <div id="ad-sec-schedule" class="scroll-mt-36 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 transition-all">
                          <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Timeline & Scheduling</h3>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Start Date</span>
                              <input
                                type="date"
                                [value]="ad.startDate || ''"
                                (input)="updateAdField(editingAdIndex()!, 'startDate', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              />
                            </div>
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Start Time</span>
                              <input
                                type="time"
                                [value]="ad.startTime || '09:00'"
                                (input)="updateAdField(editingAdIndex()!, 'startTime', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              />
                            </div>
                          </div>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">End Date</span>
                              <input
                                type="date"
                                [value]="ad.endDate || ''"
                                (input)="updateAdField(editingAdIndex()!, 'endDate', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              />
                            </div>
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">End Time</span>
                              <input
                                type="time"
                                [value]="ad.endTime || '23:59'"
                                (input)="updateAdField(editingAdIndex()!, 'endTime', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              />
                            </div>
                          </div>

                          <div class="space-y-1">
                            <span class="block text-[9px] font-black text-zinc-400 uppercase">Schedule Timezone</span>
                            <select
                              [value]="ad.timezone || 'Asia/Kolkata'"
                              (change)="updateAdField(editingAdIndex()!, 'timezone', $any($event.target).value)"
                              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                            >
                              <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                              <option value="UTC">UTC (Coordinated Universal Time)</option>
                              <option value="America/New_York">America/New_York (EST)</option>
                              <option value="Europe/London">Europe/London (GMT)</option>
                            </select>
                          </div>

                          <!-- COUNTDOWN TIMER SECTION -->
                          <div class="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                            <div class="flex items-center justify-between">
                              <div>
                                <span class="text-xs font-black uppercase text-zinc-800 dark:text-zinc-200 block">Enable Countdown Timer</span>
                                <p class="text-[10px] text-zinc-400">Renders a ticking Days/Hours/Mins/Secs timer locally on the client without API polling</p>
                              </div>
                              <input
                                type="checkbox"
                                [checked]="ad.enableCountdown"
                                (change)="updateAdField(editingAdIndex()!, 'enableCountdown', $any($event.target).checked)"
                                class="w-5 h-5 text-orange-500 rounded cursor-pointer"
                              />
                            </div>

                            @if (ad.enableCountdown) {
                              <div class="space-y-2 pt-2">
                                <span class="block text-[9px] font-black text-zinc-400 uppercase">Countdown Target Type</span>
                                <select
                                  [value]="ad.countdownType || 'campaign_end'"
                                  (change)="updateAdField(editingAdIndex()!, 'countdownType', $any($event.target).value)"
                                  class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                                >
                                  <option value="campaign_end">Use Campaign End Timestamp</option>
                                  <option value="custom_end">Custom End Date & Time</option>
                                </select>
                              </div>
                            }
                          </div>
                        </div>
                      }

                      <!-- TAB 4: POPUP CONFIGURATION -->
                      @if (adEditorViewMode() === 'scroll' || adEditorTab() === 'popup') {
                        <div id="ad-sec-popup" class="scroll-mt-36 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 transition-all">
                          <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Popup & Overlay Styling</h3>

                          <div class="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                            <div>
                              <span class="text-xs font-black uppercase text-zinc-800 dark:text-zinc-200 block">Enable Floating Popup Mode</span>
                              <p class="text-[10px] text-zinc-400">Renders ad as a floating popover or modal on the website</p>
                            </div>
                            <input
                              type="checkbox"
                              [checked]="ad.isPopup || ad.type === 'popup'"
                              (change)="updateAdField(editingAdIndex()!, 'isPopup', $any($event.target).checked)"
                              class="w-5 h-5 text-orange-500 rounded cursor-pointer"
                            />
                          </div>

                          <div class="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                            <div>
                              <span class="text-xs font-black uppercase text-orange-600 dark:text-orange-400 block">Show Image Only (Hide Header & Text Content)</span>
                              <p class="text-[10px] text-zinc-400">Displays full graphic image without text padding or title header. Popup resizes dynamically for portrait or landscape orientation.</p>
                            </div>
                            <input
                              type="checkbox"
                              [checked]="ad.showImageOnly"
                              (change)="updateAdField(editingAdIndex()!, 'showImageOnly', $any($event.target).checked)"
                              class="w-5 h-5 text-orange-500 rounded cursor-pointer"
                            />
                          </div>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Placement Target</span>
                              <select
                                [value]="ad.placement || 'homepage'"
                                (change)="updateAdField(editingAdIndex()!, 'placement', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              >
                                <option value="homepage">Homepage</option>
                                <option value="header">Header Banner</option>
                                <option value="hero">Hero Slide Placeholder</option>
                                <option value="category_page">Category Page</option>
                                <option value="product_page">Product Page</option>
                                <option value="cart">Cart Viewport</option>
                                <option value="checkout">Checkout Viewport</option>
                                <option value="floating_popup">Floating Popup</option>
                                <option value="bottom_banner">Bottom Fixed Banner</option>
                              </select>
                            </div>

                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Popup Position</span>
                              <select
                                [value]="ad.popupPosition || 'center'"
                                (change)="updateAdField(editingAdIndex()!, 'popupPosition', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              >
                                <option value="center">Center Modal</option>
                                <option value="bottom_right">Bottom Right Corner</option>
                                <option value="bottom_left">Bottom Left Corner</option>
                                <option value="top_right">Top Right Corner</option>
                                <option value="top_left">Top Left Corner</option>
                                <option value="fullscreen">Full Screen Takeover</option>
                              </select>
                            </div>
                          </div>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Popup Size</span>
                              <select
                                [value]="ad.popupSize || 'auto'"
                                (change)="updateAdField(editingAdIndex()!, 'popupSize', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              >
                                <option value="auto">Dynamic Auto (Fit Image Proportions)</option>
                                <option value="small">Small (320px)</option>
                                <option value="medium">Medium (480px)</option>
                                <option value="large">Large (640px)</option>
                                <option value="full_width">Full Width Banner (800px)</option>
                              </select>
                            </div>

                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Backdrop Overlay</span>
                              <select
                                [value]="ad.overlay || 'dark'"
                                (change)="updateAdField(editingAdIndex()!, 'overlay', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              >
                                <option value="none">None (Transparent)</option>
                                <option value="light">Light Backdrop</option>
                                <option value="dark">Dark Dim Backdrop</option>
                                <option value="blur">Blur Backdrop</option>
                              </select>
                            </div>
                          </div>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Animation Style</span>
                              <select
                                [value]="ad.animation || 'zoom'"
                                (change)="updateAdField(editingAdIndex()!, 'animation', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              >
                                <option value="zoom">Zoom Scale In</option>
                                <option value="fade">Smooth Fade In</option>
                                <option value="slide_up">Slide Up</option>
                                <option value="slide_down">Slide Down</option>
                                <option value="none">No Animation</option>
                              </select>
                            </div>
                          </div>

                          <div class="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <div class="flex items-center gap-2">
                              <input
                                type="checkbox"
                                [checked]="ad.showCloseButton !== false"
                                (change)="updateAdField(editingAdIndex()!, 'showCloseButton', $any($event.target).checked)"
                                class="w-4 h-4 text-orange-500 rounded cursor-pointer"
                              />
                              <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Show Close (X) button in top-right corner</span>
                            </div>

                            <div class="flex items-center gap-2">
                              <input
                                type="checkbox"
                                [checked]="ad.allowEscClose !== false"
                                (change)="updateAdField(editingAdIndex()!, 'allowEscClose', $any($event.target).checked)"
                                class="w-4 h-4 text-orange-500 rounded cursor-pointer"
                              />
                              <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Allow ESC key to close popup</span>
                            </div>

                            <div class="flex items-center gap-2">
                              <input
                                type="checkbox"
                                [checked]="ad.allowOutsideClickClose !== false"
                                (change)="updateAdField(editingAdIndex()!, 'allowOutsideClickClose', $any($event.target).checked)"
                                class="w-4 h-4 text-orange-500 rounded cursor-pointer"
                              />
                              <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Allow clicking outside backdrop to close</span>
                            </div>
                          </div>
                        </div>
                      }

                      <!-- TAB 5: TRIGGERS & FREQUENCY -->
                      @if (adEditorViewMode() === 'scroll' || adEditorTab() === 'triggers') {
                        <div id="ad-sec-triggers" class="scroll-mt-36 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 transition-all">
                          <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Popup Triggers & Frequency Caps</h3>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Trigger Event</span>
                              <select
                                [value]="ad.trigger || 'immediate'"
                                (change)="updateAdField(editingAdIndex()!, 'trigger', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              >
                                <option value="immediate">Immediately on page load</option>
                                <option value="delay">After X seconds delay</option>
                                <option value="scroll">After X% page scroll</option>
                                <option value="exit_intent">Exit Intent (Mouse Leave)</option>
                              </select>
                            </div>

                            @if (ad.trigger === 'delay') {
                              <div class="space-y-1">
                                <span class="block text-[9px] font-black text-zinc-400 uppercase">Delay Seconds</span>
                                <input
                                  type="number"
                                  [value]="ad.delaySeconds || 3"
                                  (input)="updateAdField(editingAdIndex()!, 'delaySeconds', +$any($event.target).value)"
                                  class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                                />
                              </div>
                            }

                            @if (ad.trigger === 'scroll') {
                              <div class="space-y-1">
                                <span class="block text-[9px] font-black text-zinc-400 uppercase">Scroll Percentage (%)</span>
                                <input
                                  type="number"
                                  [value]="ad.scrollPercent || 50"
                                  (input)="updateAdField(editingAdIndex()!, 'scrollPercent', +$any($event.target).value)"
                                  class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                                />
                              </div>
                            }
                          </div>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Display Frequency</span>
                              <select
                                [value]="ad.frequency || 'always'"
                                (change)="updateAdField(editingAdIndex()!, 'frequency', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              >
                                <option value="always">Show Every Time (No cap)</option>
                                <option value="session">Show Once Per Session</option>
                                <option value="daily">Show Once Per Day</option>
                                <option value="campaign">Show Once Per Campaign</option>
                              </select>
                            </div>

                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Max Impressions Per User</span>
                              <input
                                type="number"
                                [value]="ad.maxImpressionsPerUser || 0"
                                (input)="updateAdField(editingAdIndex()!, 'maxImpressionsPerUser', +$any($event.target).value)"
                                placeholder="0 = unlimited"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      }

                      <!-- TAB 6: TARGETING -->
                      @if (adEditorViewMode() === 'scroll' || adEditorTab() === 'targeting') {
                        <div id="ad-sec-targeting" class="scroll-mt-36 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 transition-all">
                          <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Audience & Page Targeting</h3>

                          <!-- AUDIENCE & VISIBILITY SECTION -->
                          <div class="space-y-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                            <span class="block text-[9px] font-black text-zinc-400 uppercase tracking-wider">Display To (Audience Target)</span>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              @for (opt of [
                                { id: 'all', label: 'Everyone', desc: 'Default — Displays to all visitors & users' },
                                { id: 'guests_only', label: 'Guest Users Only', desc: 'Only unauthenticated guest visitors' },
                                { id: 'logged_in', label: 'Logged-in Users Only', desc: 'Only authenticated logged-in accounts' },
                                { id: 'new_users_only', label: 'New Users Only', desc: 'First eligible visit where no returning marker exists' },
                                { id: 'returning_users_only', label: 'Returning Users Only', desc: 'Visitors with existing visit/session history' }
                              ]; track opt.id) {
                                <label
                                  class="flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none"
                                  [class]="(ad.audience || 'all') === opt.id
                                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-600 dark:text-orange-400'
                                    : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'"
                                >
                                  <input
                                    type="radio"
                                    name="adAudience"
                                    [value]="opt.id"
                                    [checked]="(ad.audience || 'all') === opt.id"
                                    (change)="updateAdField(editingAdIndex()!, 'audience', opt.id)"
                                    class="mt-0.5 text-orange-500 focus:ring-orange-500"
                                  />
                                  <div>
                                    <span class="block text-xs font-black">{{ opt.label }}</span>
                                    <span class="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug block">{{ opt.desc }}</span>
                                  </div>
                                </label>
                              }
                            </div>
                          </div>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Device Target</span>
                              <select
                                [value]="ad.deviceTargeting || 'all'"
                                (change)="updateAdField(editingAdIndex()!, 'deviceTargeting', $any($event.target).value)"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                              >
                                <option value="all">All Devices</option>
                                <option value="desktop">Desktop Only</option>
                                <option value="mobile">Mobile Only</option>
                              </select>
                            </div>
                          </div>

                          <div class="space-y-1">
                            <span class="block text-[9px] font-black text-zinc-400 uppercase">Page Targeting</span>
                            <select
                              [value]="ad.pageTargeting || 'all'"
                              (change)="updateAdField(editingAdIndex()!, 'pageTargeting', $any($event.target).value)"
                              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white font-bold"
                            >
                              <option value="all">All Pages</option>
                              <option value="homepage">Homepage Only</option>
                              <option value="product_page">Product Pages</option>
                              <option value="category_page">Category Pages</option>
                              <option value="cart">Cart Page</option>
                              <option value="checkout">Checkout Page</option>
                              <option value="specific_url">Specific Route Path</option>
                            </select>
                          </div>

                          @if (ad.pageTargeting === 'specific_url') {
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Target Route Path</span>
                              <input
                                type="text"
                                [value]="ad.targetUrlPath || ''"
                                (input)="updateAdField(editingAdIndex()!, 'targetUrlPath', $any($event.target).value)"
                                placeholder="e.g. /products/pla-pro-filament"
                                class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white"
                              />
                            </div>
                          }
                        </div>
                      }

                      <!-- TAB 7: PROMOTIONS -->
                      @if (adEditorViewMode() === 'scroll' || adEditorTab() === 'promotion') {
                        <div id="ad-sec-promotion" class="scroll-mt-36 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 transition-all">
                          <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400">Coupon & Product Reference</h3>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Coupon Code Reference</span>
                              <input
                                type="text"
                                [value]="ad.couponCode || ''"
                                (input)="updateAdField(editingAdIndex()!, 'couponCode', $any($event.target).value)"
                                placeholder="e.g. DIWALI3D"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold uppercase outline-none text-zinc-900 dark:text-white"
                              />
                            </div>

                            <div class="space-y-1">
                              <span class="block text-[9px] font-black text-zinc-400 uppercase">Discount Tag Text</span>
                              <input
                                type="text"
                                [value]="ad.discountText || ''"
                                (input)="updateAdField(editingAdIndex()!, 'discountText', $any($event.target).value)"
                                placeholder="e.g. FLAT 20% OFF"
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                              />
                            </div>
                          </div>

                          <div class="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[11px] text-zinc-500 space-y-1">
                            <span class="font-bold text-zinc-700 dark:text-zinc-300 block">Dynamic Content Placeholders:</span>
                            <p>You can use these tags in Headline or Subheadline to resolve dynamically at render time:</p>
                            <div class="flex items-center gap-2 flex-wrap font-mono text-[10px] text-orange-500 pt-1">
                              <span ngNonBindable class="px-2 py-0.5 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800">{{couponCode}}</span>
                              <span ngNonBindable class="px-2 py-0.5 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800">{{discount}}</span>
                              <span ngNonBindable class="px-2 py-0.5 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800">{{endDate}}</span>
                            </div>
                          </div>
                        </div>
                      }
                    </div>

                    <!-- RIGHT COLUMN: INTERACTIVE LIVE PREVIEW PANEL (5 COLS) -->
                    <div class="lg:col-span-5 space-y-4">
                      <div class="p-5 bg-zinc-950 text-white rounded-3xl shadow-xl space-y-4 border border-zinc-800 sticky top-32 self-start max-h-[calc(100vh-9rem)] overflow-y-auto no-scrollbar">
                        <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                          <div class="flex items-center gap-2">
                            <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                            <h3 class="text-xs font-black uppercase tracking-wider text-zinc-200">Live Campaign Preview</h3>
                          </div>

                          <!-- VIEWPORT TOGGLE -->
                          <div class="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                            <button
                              (click)="previewViewport.set('desktop')"
                              [class]="previewViewport() === 'desktop' ? 'p-1 bg-orange-500 text-white rounded-lg' : 'p-1 text-zinc-400 hover:text-white'"
                              title="Desktop View"
                            >
                              <mat-icon class="text-sm">desktop_windows</mat-icon>
                            </button>
                            <button
                              (click)="previewViewport.set('mobile')"
                              [class]="previewViewport() === 'mobile' ? 'p-1 bg-orange-500 text-white rounded-lg' : 'p-1 text-zinc-400 hover:text-white'"
                              title="Mobile View"
                            >
                              <mat-icon class="text-sm">smartphone</mat-icon>
                            </button>
                          </div>
                        </div>

                        <!-- LIVE PREVIEW CANVAS -->
                        <div
                          class="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 overflow-hidden relative"
                          [class.max-w-xs]="previewViewport() === 'mobile'"
                          [class.mx-auto]="previewViewport() === 'mobile'"
                        >
                          <div class="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 text-zinc-900 dark:text-white relative group">
                            @let isImgOnly = isImageOnlyMode(ad);
                            @let imgPath = (previewViewport() === 'mobile' && ad.mobileImageUrl) ? ad.mobileImageUrl : (ad.imageUrl || ad.mediaUrl);

                            @if (isImgOnly) {
                              <!-- IMAGE ONLY LIVE PREVIEW -->
                              <div class="relative w-full overflow-hidden rounded-2xl bg-zinc-950 flex items-center justify-center p-1">
                                @if (imgPath) {
                                  <img [src]="imgPath" alt="Preview" class="max-w-full max-h-[65vh] w-auto h-auto object-contain rounded-xl block shadow-xl" />
                                } @else {
                                  <div class="w-full h-48 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 text-xs font-mono">
                                    [ No Visual Asset Uploaded ]
                                  </div>
                                }
                                @if (ad.showCloseButton !== false) {
                                  <div class="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs backdrop-blur-md border border-white/20">
                                    <mat-icon class="text-sm">close</mat-icon>
                                  </div>
                                }
                              </div>
                            } @else {
                              <!-- FULL PROMOTIONAL LIVE PREVIEW -->
                              @if (ad.showCloseButton !== false) {
                                <div class="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-xs">
                                  <mat-icon class="text-sm">close</mat-icon>
                                </div>
                              }

                              @if (imgPath) {
                                <div class="relative w-full h-36 bg-zinc-900 overflow-hidden">
                                  <img [src]="imgPath" alt="Preview" class="w-full h-full object-cover" />
                                  @if (ad.discountText) {
                                    <div class="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                                      {{ ad.discountText }}
                                    </div>
                                  }
                                </div>
                              }

                              <!-- PREVIEW CONTENT -->
                              <div class="p-4 space-y-3">
                                <div>
                                  <span class="text-[8px] font-black uppercase text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                                    {{ ad.type || 'BANNER' }}
                                  </span>
                                  <h4 class="text-sm font-black mt-1 leading-tight text-zinc-900 dark:text-white">
                                    {{ ad.headline || ad.title || 'Your Campaign Headline Here' }}
                                  </h4>
                                  @if (ad.subheadline) {
                                    <p class="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">{{ ad.subheadline }}</p>
                                  }
                                </div>

                                <!-- PREVIEW TIMER -->
                                @if (ad.enableCountdown) {
                                  <div class="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-800 text-center">
                                    <span class="text-[8px] font-black uppercase text-zinc-400 block mb-1">Offer Ends In</span>
                                    <div class="grid grid-cols-4 gap-1 text-[10px] font-mono font-black">
                                      <div class="bg-white dark:bg-zinc-900 p-1 rounded text-orange-500">02d</div>
                                      <div class="bg-white dark:bg-zinc-900 p-1 rounded">14h</div>
                                      <div class="bg-white dark:bg-zinc-900 p-1 rounded">35m</div>
                                      <div class="bg-white dark:bg-zinc-900 p-1 rounded">42s</div>
                                    </div>
                                  </div>
                                }

                                <!-- PREVIEW COUPON -->
                                @if (ad.couponCode) {
                                  <div class="flex items-center justify-between p-2 bg-orange-500/10 rounded-lg border border-dashed border-orange-500/40 text-[10px]">
                                    <span class="font-mono font-black uppercase text-orange-500">{{ ad.couponCode }}</span>
                                    <span class="text-[8px] font-black uppercase bg-orange-500 text-white px-2 py-0.5 rounded">Copy</span>
                                  </div>
                                }

                                <!-- PREVIEW CTA BUTTON -->
                                <button class="w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[10px] uppercase rounded-xl shadow-md flex items-center justify-center gap-1 cursor-pointer">
                                  <span>{{ ad.ctaText || 'Shop Now' }}</span>
                                  <mat-icon class="text-xs">arrow_forward</mat-icon>
                                </button>
                              </div>
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
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
                    class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none"
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
                    class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium outline-none"
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
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div
                    class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4"
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
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
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
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
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

            <!-- RECENT PURCHASE POPUP SETTINGS -->
            @if (activeSubTab() === "Recent Purchase Settings") {
              <div class="space-y-6 font-sans">
                <div
                  class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
                >
                  <div>
                    <span
                      class="block text-xs font-black uppercase text-zinc-900 dark:text-white"
                      >Enable Recent Purchase Popup</span
                    >
                    <p class="text-[10px] text-zinc-450 dark:text-zinc-500">
                      Enable or disable the interactive popup notification at the bottom-left of the screen.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    [checked]="draft().recentPurchasePopup?.enabled !== false"
                    (change)="
                      setNested(
                        'recentPurchasePopup',
                        'enabled',
                        $any($event.target).checked
                      )
                    "
                    class="w-5 h-5 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div
                  class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 shadow-2xs"
                >
                  <h3
                    class="text-xs font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-500"
                  >
                    Popup Configuration
                  </h3>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Rotation Interval (Milliseconds)</span
                      >
                      <input
                        type="number"
                        [value]="draft().recentPurchasePopup?.interval || 8000"
                        (input)="
                          setNested(
                            'recentPurchasePopup',
                            'interval',
                            +$any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                        placeholder="8000"
                      />
                      <p class="text-[9px] text-zinc-450 dark:text-zinc-500">Time between rotating to the next popup message.</p>
                    </div>

                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Display Duration (Milliseconds)</span
                      >
                      <input
                        type="number"
                        [value]="draft().recentPurchasePopup?.displayDuration || 5000"
                        (input)="
                          setNested(
                            'recentPurchasePopup',
                            'displayDuration',
                            +$any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                        placeholder="5000"
                      />
                      <p class="text-[9px] text-zinc-450 dark:text-zinc-500">Duration each popup remains visible on the screen.</p>
                    </div>

                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Maximum Items to Display</span
                      >
                      <input
                        type="number"
                        [value]="draft().recentPurchasePopup?.maxItems || 20"
                        (input)="
                          setNested(
                            'recentPurchasePopup',
                            'maxItems',
                            +$any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                        placeholder="20"
                      />
                      <p class="text-[9px] text-zinc-450 dark:text-zinc-500">Limits the maximum queue count of recent purchase items.</p>
                    </div>

                    <div class="space-y-1">
                      <span
                        class="block text-[9px] font-black text-zinc-400 uppercase"
                        >Recent Purchases Window (Minutes)</span
                      >
                      <input
                        type="number"
                        [value]="draft().recentPurchasePopup?.recentPurchaseMinutes || 10"
                        (input)="
                          setNested(
                            'recentPurchasePopup',
                            'recentPurchaseMinutes',
                            +$any($event.target).value
                          )
                        "
                        class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                        placeholder="10"
                      />
                      <p class="text-[9px] text-zinc-450 dark:text-zinc-500">Only orders placed in the last N minutes will be fetched (defaults to 10 minutes).</p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div
                      class="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800"
                    >
                      <input
                        type="checkbox"
                        [checked]="draft().recentPurchasePopup?.showLocation !== false"
                        (change)="
                          setNested(
                            'recentPurchasePopup',
                            'showLocation',
                            $any($event.target).checked
                          )
                        "
                        class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <span
                        class="text-[10px] font-black uppercase text-zinc-700 dark:text-zinc-300"
                        >Show Customer Location</span
                      >
                    </div>

                    <div
                      class="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800"
                    >
                      <input
                        type="checkbox"
                        [checked]="draft().recentPurchasePopup?.showTime !== false"
                        (change)="
                          setNested(
                            'recentPurchasePopup',
                            'showTime',
                            $any($event.target).checked
                          )
                        "
                        class="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <span
                        class="text-[10px] font-black uppercase text-zinc-700 dark:text-zinc-300"
                        >Show Time Ago Label</span
                      >
                    </div>
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
                      class="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
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
                        class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800"
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

                    <!-- Message Templates -->
                    <div
                      class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 shadow-2xs"
                    >
                      <h3
                        class="text-xs font-black uppercase tracking-wider text-zinc-400"
                      >
                        Message Templates
                      </h3>

                      <div class="grid grid-cols-1 gap-4">
                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >WhatsApp API URL</span
                          >
                          <input
                            type="text"
                            [value]="draft().whatsappSettings?.apiUrl || ''"
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'apiUrl',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                            placeholder="https://graph.facebook.com/..."
                          />
                        </div>

                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >API Key</span
                          >
                          <input
                            type="password"
                            [value]="draft().whatsappSettings?.apiKey || ''"
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'apiKey',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                            placeholder="API Key / Access Token"
                          />
                        </div>

                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Welcome Message Template Name</span
                          >
                          <input
                            type="text"
                            [value]="draft().whatsappSettings?.welcomeMessageTemplateName || 'welcome_message'"
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'welcomeMessageTemplateName',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                          <p class="text-[9px] text-zinc-400 dark:text-zinc-500">
                            Template for new user signup. Use 1 for customer name, 2 for site link.
                          </p>
                        </div>

                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >COD Order Confirmation Template Name</span
                          >
                          <input
                            type="text"
                            [value]="draft().whatsappSettings?.orderConfirmationCodTemplateName || 'order_confirmation_cod_3dgal'"
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'orderConfirmationCodTemplateName',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                          <p class="text-[9px] text-zinc-400 dark:text-zinc-500">
                            Template sent when a Cash on Delivery (COD) order is placed.
                          </p>
                        </div>

                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Prepaid Order Confirmation Template Name</span
                          >
                          <input
                            type="text"
                            [value]="draft().whatsappSettings?.orderConfirmationPaidTemplateName || 'order_confirmation_paid_3dgal'"
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'orderConfirmationPaidTemplateName',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                          <p class="text-[9px] text-zinc-400 dark:text-zinc-500">
                            Template sent when an Online/Prepaid order is successfully paid.
                          </p>
                        </div>

                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Order Confirmation (Admin) Template Name</span
                          >
                          <input
                            type="text"
                            [value]="draft().whatsappSettings?.orderConfirmationAdminTemplateName || 'order_confirmation_admin'"
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'orderConfirmationAdminTemplateName',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                          <p class="text-[9px] text-zinc-400 dark:text-zinc-500">
                            Template for admin new order notification.
                          </p>
                        </div>

                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Order Status Update Template Name</span
                          >
                          <input
                            type="text"
                            [value]="draft().whatsappSettings?.orderStatusUpdateTemplateName || 'order_status_update'"
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'orderStatusUpdateTemplateName',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                          <p class="text-[9px] text-zinc-400 dark:text-zinc-500">
                            Template for general order status updates (Delivered, Cancelled, etc.).
                          </p>
                        </div>

                        <div class="space-y-1">
                          <span
                            class="block text-[9px] font-black text-zinc-400 uppercase"
                            >Order Shipped Template Name</span
                          >
                          <input
                            type="text"
                            [value]="draft().whatsappSettings?.orderShippedTemplateName || 'order_shipped'"
                            (input)="
                              setNested(
                                'whatsappSettings',
                                'orderShippedTemplateName',
                                $any($event.target).value
                              )
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                          <p class="text-[9px] text-zinc-400 dark:text-zinc-500">
                            Dedicated 11-variable WhatsApp template for order shipped notifications (Default: <code class="text-blue-500 font-mono">order_shipped</code>).
                          </p>
                        </div>
                      </div>
                    </div>

                    <!-- Service Request Templates Config -->
                    <div class="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 shadow-2xs">
                      <div class="flex items-center justify-between">
                        <h3 class="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                          <mat-icon class="text-blue-500 text-sm">print</mat-icon>
                          Service Request Templates
                        </h3>
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        <!-- Customer 3D Print Service Request Template Name -->
                        <div class="space-y-1.5">
                          <span class="block text-[9px] font-black text-zinc-450 uppercase">Customer 3D Print Request Template Name</span>
                          <input
                            type="text"
                            [value]="draft().whatsappSettings?.order3dprintClientTemplateName || draft().whatsappSettings?.serviceRequestCustomerTemplateName || 'order_3dprint_client'"
                            (input)="
                              setNested('whatsappSettings', 'order3dprintClientTemplateName', $any($event.target).value);
                              setNested('whatsappSettings', 'serviceRequestCustomerTemplateName', $any($event.target).value)
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white"
                          />
                          <p class="text-[9px] text-zinc-400 dark:text-zinc-500">
                            Meta WhatsApp template name for 3D Print service request client confirmation (Default: <code class="text-blue-500 font-mono">order_3dprint_client</code>).
                          </p>
                          <div class="flex items-center gap-2 mt-1">
                            <input
                              type="checkbox"
                              [checked]="draft().whatsappSettings?.enableServiceRequestCustomerNotifications !== false"
                              (change)="setNested('whatsappSettings', 'enableServiceRequestCustomerNotifications', $any($event.target).checked)"
                              class="w-3.5 h-3.5 text-blue-600 cursor-pointer"
                            />
                            <span class="text-[9px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Enable Notification</span>
                          </div>
                        </div>

                        <!-- Admin 3D Print Service Request Template Name -->
                        <div class="space-y-1.5">
                          <span class="block text-[9px] font-black text-zinc-450 uppercase">Admin 3D Print Request Template Name</span>
                          <input
                            type="text"
                            [value]="draft().whatsappSettings?.order3dprintAdminTemplateName || draft().whatsappSettings?.serviceRequestAdminTemplateName || 'order_3dprint_admin'"
                            (input)="
                              setNested('whatsappSettings', 'order3dprintAdminTemplateName', $any($event.target).value);
                              setNested('whatsappSettings', 'serviceRequestAdminTemplateName', $any($event.target).value)
                            "
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white"
                          />
                          <p class="text-[9px] text-zinc-400 dark:text-zinc-500">
                            Meta WhatsApp template name for Admin 3D Print request notification (Default: <code class="text-blue-500 font-mono">order_3dprint_admin</code>).
                          </p>
                          <div class="flex items-center gap-2 mt-1">
                            <input
                              type="checkbox"
                              [checked]="draft().whatsappSettings?.enableServiceRequestAdminNotifications !== false"
                              (change)="setNested('whatsappSettings', 'enableServiceRequestAdminNotifications', $any($event.target).checked)"
                              class="w-3.5 h-3.5 text-blue-600 cursor-pointer"
                            />
                            <span class="text-[9px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Enable Notification</span>
                          </div>
                        </div>
                      </div>

                      <!-- Sandbox & Preview Tools -->
                      <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3 text-left">
                        <span class="block text-[10px] font-black uppercase text-blue-500">Preview & Test Send Sandbox</span>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            (click)="previewServiceTemplate('customer')"
                            class="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer border-none shadow-2xs"
                          >
                            Preview Customer Template
                          </button>
                          <button
                            type="button"
                            (click)="previewServiceTemplate('admin')"
                            class="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer border-none shadow-2xs"
                          >
                            Preview Admin Template
                          </button>
                        </div>

                        <div class="flex gap-2 pt-1">
                          <input
                            type="text"
                            [(ngModel)]="testServiceRecipient"
                            class="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-zinc-900 dark:text-white"
                            placeholder="Test recipient number with prefix (e.g. +919999999999)"
                          />
                          <button
                            type="button"
                            (click)="sendTestServiceWhatsApp('customer')"
                            [disabled]="testSendLoading()"
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs disabled:opacity-50"
                          >
                            Test Customer
                          </button>
                          <button
                            type="button"
                            (click)="sendTestServiceWhatsApp('admin')"
                            [disabled]="testSendLoading()"
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer border-none shadow-xs disabled:opacity-50"
                          >
                            Test Admin
                          </button>
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
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
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
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
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
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
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
                            class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                          />
                        </div>
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div
                          class="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800"
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
                          class="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800"
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
                            class="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl"
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
                            activeTemplateKey.set($any($event.target).value);
                            serviceTemplatePreviewActive.set(false);
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
                          <option value="order_3dprint_client">
                            3D Print Request (Client Confirmation)
                          </option>
                          <option value="order_3dprint_admin">
                            3D Print Request (Admin Notification)
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
                        class="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-4"
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
                              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none cursor-pointer"
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
                                  class="absolute right-0 mt-1 w-48 rounded-xl bg-white dark:bg-zinc-950 shadow-lg border border-zinc-100 dark:border-zinc-800 z-50 py-1 grid grid-cols-1 max-h-48 overflow-y-auto"
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
                        class="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 rounded-2xl"
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
                          class="bg-zinc-800 p-3.5 flex items-center gap-2.5 text-white border-b border-white/5"
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
                            class="bg-zinc-800 max-w-[85%] rounded-2xl rounded-tr-none ml-auto text-zinc-100 p-3 shadow-md space-y-1.5 border border-white/5 relative"
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
                                    Order_Summary_B3D-4890.pdf
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
                              @if (serviceTemplatePreviewActive()) {
                                {{ serviceTemplatePreviewText() }}
                              } @else {
                                {{
                                  getResolvedPreviewText(
                                    draft().whatsappSettings?.templates?.[
                                      activeTemplateKey()
                                    ]?.body
                                  )
                                }}
                              }
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
                                class="w-[85%] ml-auto bg-zinc-800 border-t border-white/5 text-blue-400 text-[10px] font-bold py-2 text-center rounded-xl hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1"
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

            <!-- Customer Support -->
            @if (activeSubTab() === "Customer Support") {
              <div class="space-y-4 font-sans text-xs">
                <div>
                  <h3 class="text-sm font-black uppercase text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <mat-icon class="text-blue-500">support_agent</mat-icon>
                    Return / Refund Request support settings
                  </h3>
                  <p class="text-[10px] text-zinc-500 mt-1">Configure parameters for Return/Refund request workflows, customer eligibility windows, and contact methods.</p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- Support WhatsApp Number -->
                  <div class="space-y-1 text-left">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">Support WhatsApp Number</span>
                    <input
                      type="text"
                      [value]="draft().supportSettings?.whatsappNumber || ''"
                      (input)="setNested('supportSettings', 'whatsappNumber', $any($event.target).value)"
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                      placeholder="e.g. +91 9876543210"
                    />
                  </div>

                  <!-- Support Email -->
                  <div class="space-y-1 text-left">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">Support Email Address</span>
                    <input
                      type="email"
                      [value]="draft().supportSettings?.email || ''"
                      (input)="setNested('supportSettings', 'email', $any($event.target).value)"
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                      placeholder="e.g. support@3dgalaxy.com"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- Business Hours -->
                  <div class="space-y-1 text-left">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">Business Hours</span>
                    <input
                      type="text"
                      [value]="draft().supportSettings?.businessHours || ''"
                      (input)="setNested('supportSettings', 'businessHours', $any($event.target).value)"
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                      placeholder="e.g. 9 AM - 6 PM"
                    />
                  </div>

                  <!-- Auto Reply Message -->
                  <div class="space-y-1 text-left">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">Auto Reply Message</span>
                    <input
                      type="text"
                      [value]="draft().supportSettings?.autoReply || ''"
                      (input)="setNested('supportSettings', 'autoReply', $any($event.target).value)"
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                      placeholder="e.g. Thank you for contacting support! We will get back to you shortly."
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- Return Policy URL -->
                  <div class="space-y-1 text-left">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">Return Policy URL</span>
                    <input
                      type="text"
                      [value]="draft().supportSettings?.returnPolicyUrl || ''"
                      (input)="setNested('supportSettings', 'returnPolicyUrl', $any($event.target).value)"
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                      placeholder="e.g. /return-policy"
                    />
                  </div>

                  <!-- Refund Policy URL -->
                  <div class="space-y-1 text-left">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">Refund Policy URL</span>
                    <input
                      type="text"
                      [value]="draft().supportSettings?.refundPolicyUrl || ''"
                      (input)="setNested('supportSettings', 'refundPolicyUrl', $any($event.target).value)"
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                      placeholder="e.g. /refund-policy"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- Return Window (Days) -->
                  <div class="space-y-1 text-left">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">Return Window Eligibility (Days)</span>
                    <input
                      type="number"
                      [value]="draft().supportSettings?.returnWindowDays || 10"
                      (input)="setNested('supportSettings', 'returnWindowDays', $any($event.target).valueAsNumber)"
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                    />
                  </div>

                  <!-- Refund Window (Days) -->
                  <div class="space-y-1 text-left">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">Refund Window Eligibility (Days)</span>
                    <input
                      type="number"
                      [value]="draft().supportSettings?.refundWindowDays || 10"
                      (input)="setNested('supportSettings', 'refundWindowDays', $any($event.target).valueAsNumber)"
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            }

            <!-- 16. SHIPPING -->
            @if (activeSubTab() === "Shipping") {
              <div class="space-y-6">
                <!-- Priority Hierarchy Toggles -->
                <div class="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <h3 class="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <mat-icon class="text-blue-500 text-sm">tune</mat-icon>
                    Shipping Hierarchy Engine Controls
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label class="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="draft().shippingSettings?.enableProductShipping !== false"
                        (change)="setNested('shippingSettings', 'enableProductShipping', $any($event.target).checked)"
                        class="w-4 h-4 text-blue-600 rounded"
                      />
                      <div>
                        <span class="text-xs font-black block text-zinc-900 dark:text-white">Product Shipping (Priority 1)</span>
                        <span class="text-[9px] text-zinc-500 block">Use product level shipping charges</span>
                      </div>
                    </label>

                    <label class="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="draft().shippingSettings?.enableCategoryShipping !== false"
                        (change)="setNested('shippingSettings', 'enableCategoryShipping', $any($event.target).checked)"
                        class="w-4 h-4 text-blue-600 rounded"
                      />
                      <div>
                        <span class="text-xs font-black block text-zinc-900 dark:text-white">Category Shipping (Priority 2)</span>
                        <span class="text-[9px] text-zinc-500 block">Fallback to category level shipping</span>
                      </div>
                    </label>

                    <label class="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="draft().shippingSettings?.enableGlobalShipping !== false"
                        (change)="setNested('shippingSettings', 'enableGlobalShipping', $any($event.target).checked)"
                        class="w-4 h-4 text-blue-600 rounded"
                      />
                      <div>
                        <span class="text-xs font-black block text-zinc-900 dark:text-white">Global Shipping (Priority 3)</span>
                        <span class="text-[9px] text-zinc-500 block">Fallback to system default shipping</span>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Global Rates & Thresholds -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">Default Shipping Charge (₹)</span>
                    <input
                      type="number"
                      [value]="draft().shippingSettings?.defaultShippingCharge ?? 150"
                      (input)="setNested('shippingSettings', 'defaultShippingCharge', +$any($event.target).value)"
                      placeholder="e.g. 150"
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white"
                    />
                  </div>

                  <div class="space-y-1">
                    <span class="block text-[9px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-wider">FREE SHIPPING THRESHOLD (GLOBAL) (₹)</span>
                    <input
                      type="number"
                      [value]="draft().shippingSettings?.freeShippingThreshold ?? 3500"
                      (input)="setNested('shippingSettings', 'freeShippingThreshold', +$any($event.target).value)"
                      placeholder="e.g. 3500"
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white"
                    />
                    <p class="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                      Orders meeting this amount are eligible for free shipping across the application.
                    </p>
                  </div>

                  <div class="space-y-1">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">Shipping Tax Rate (%)</span>
                    <input
                      type="number"
                      [value]="draft().shippingSettings?.shippingTax ?? 0"
                      (input)="setNested('shippingSettings', 'shippingTax', +$any($event.target).value)"
                      placeholder="e.g. 0"
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none text-zinc-900 dark:text-white"
                    />
                  </div>

                  <div class="space-y-1">
                    <span class="block text-[9px] font-black text-zinc-400 uppercase">Shipping Label</span>
                    <input
                      type="text"
                      [value]="draft().shippingSettings?.shippingLabel || 'Delivery Charges'"
                      (input)="setNested('shippingSettings', 'shippingLabel', $any($event.target).value)"
                      placeholder="Delivery Charges"
                      class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                <!-- Default Weight-Based Shipping Rules -->
                <div class="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                        <mat-icon class="text-emerald-500 text-sm">scale</mat-icon>
                        Default Weight-Based Pricing Rules
                      </h3>
                      <p class="text-[10px] text-zinc-400 mt-0.5 font-medium">
                        Used when a product and its category have no explicit shipping rate configured.
                      </p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="draft().shippingSettings?.enableWeightBasedShipping === true"
                        (change)="setNested('shippingSettings', 'enableWeightBasedShipping', $any($event.target).checked)"
                        class="sr-only peer"
                      />
                      <div class="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      <span class="ml-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">Enable</span>
                    </label>
                  </div>

                  @if (draft().shippingSettings?.enableWeightBasedShipping === true) {
                    <div class="space-y-3 pt-2">
                      <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                          <thead>
                            <tr class="border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-black tracking-wider text-zinc-400">
                              <th class="pb-2">Weight From (g)</th>
                              <th class="pb-2">Weight To (g)</th>
                              <th class="pb-2">Shipping Charge (₹)</th>
                              <th class="pb-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                            @for (rule of (draft().shippingSettings?.weightRules || []); track $index) {
                              <tr>
                                <td class="py-2 pr-2">
                                  <div class="flex items-center gap-1">
                                    <input
                                      type="number"
                                      [value]="rule.fromGrams"
                                      (input)="updateDefaultWeightRule($index, 'fromGrams', +$any($event.target).value)"
                                      placeholder="0"
                                      class="w-24 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono"
                                    />
                                    <span class="text-[10px] text-zinc-400 font-bold">g</span>
                                  </div>
                                </td>
                                <td class="py-2 pr-2">
                                  <div class="flex items-center gap-1">
                                    <input
                                      type="number"
                                      [value]="rule.toGrams"
                                      (input)="updateDefaultWeightRule($index, 'toGrams', +$any($event.target).value)"
                                      placeholder="500"
                                      class="w-24 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono"
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
                                      (input)="updateDefaultWeightRule($index, 'charge', +$any($event.target).value)"
                                      placeholder="40"
                                      class="w-24 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold"
                                    />
                                  </div>
                                </td>
                                <td class="py-2 text-right">
                                  <button
                                    type="button"
                                    (click)="removeDefaultWeightRule($index)"
                                    class="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                                    title="Delete rule"
                                  >
                                    <mat-icon class="text-sm">delete</mat-icon>
                                  </button>
                                </td>
                              </tr>
                            } @empty {
                              <tr>
                                <td colspan="4" class="py-4 text-center text-xs text-zinc-400 italic">
                                  No weight rules configured. Click "Add Weight Rule" to create one.
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>

                      <button
                        type="button"
                        (click)="addDefaultWeightRule()"
                        class="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <mat-icon class="text-sm">add</mat-icon>
                        <span>Add Weight Range Rule</span>
                      </button>
                    </div>
                  }
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
                    class="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800"
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
                    class="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800"
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
                        class="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono outline-none"
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
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
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
                      class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            }

            <!-- 19. CHATBOT -->
            @if (activeSubTab() === "Chatbot") {
              <div class="space-y-4">
                <div
                  class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
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
                    class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
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
                    class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
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
                  class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
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
                      class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 relative"
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
                            [value]="faq.category || 'Theme'"
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
                      class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 relative"
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
              <div class="space-y-8">
                <div class="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h2 class="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                      <mat-icon class="text-red-500">print</mat-icon>
                      3D Printing Service Engine Configuration
                    </h2>
                    <p class="text-xs text-zinc-500 mt-0.5">
                      Configure base pricing rates, custom filament materials, colorways, printer quality profiles, and infill density standards.
                    </p>
                  </div>
                  <button
                    (click)="saveAllSettings()"
                    [disabled]="isSaving()"
                    class="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black uppercase shadow-md hover:shadow-red-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <mat-icon class="text-sm">{{ isSaving() ? 'sync' : 'save' }}</mat-icon>
                    {{ isSaving() ? 'Saving...' : 'Save Service Settings' }}
                  </button>
                </div>

                <!-- Pricing Core -->
                <div class="p-5 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm space-y-4">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-sm">
                      <mat-icon class="text-base">payments</mat-icon>
                    </div>
                    <div>
                      <h3 class="text-xs font-black uppercase text-zinc-800 dark:text-zinc-200">
                        Base Rates & Machine Operating Fee
                      </h3>
                      <p class="text-[11px] text-zinc-400">Hourly operating rate charged for 3D printer runtime during volumetric estimation</p>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div class="space-y-1.5">
                      <label class="block text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                        Machine Run Fee Per Hour (₹)
                      </label>
                      <div class="relative">
                        <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">₹</span>
                        <input
                          type="number"
                          [value]="draft().printServiceSettings?.machineFeePerHour || 150"
                          (input)="setPrintServiceSettingsField('machineFeePerHour', +$any($event.target).value)"
                          class="w-full pl-8 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-red-500 rounded-xl text-xs font-bold text-zinc-900 dark:text-white outline-none transition-colors"
                          placeholder="150"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Filament Materials Table -->
                <div class="p-5 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm space-y-5">
                  <div class="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-sm">
                        <mat-icon class="text-base">category</mat-icon>
                      </div>
                      <div>
                        <h3 class="text-xs font-black uppercase text-zinc-800 dark:text-zinc-200">
                          Filament Materials & Colorways
                        </h3>
                        <p class="text-[11px] text-zinc-400">Configure polymer materials, density values, gram prices, and available colors</p>
                      </div>
                    </div>
                    <button
                      (click)="addPrintMaterial()"
                      class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <mat-icon class="text-sm">add</mat-icon> Add Material
                    </button>
                  </div>

                  <div class="space-y-5">
                    @for (
                      mat of draft().printServiceSettings?.materials || [];
                      track parentIndex;
                      let parentIndex = $index
                    ) {
                      <div class="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 relative group">
                        <!-- Header & Actions bar -->
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-black uppercase tracking-wider">
                              Material #{{ parentIndex + 1 }}
                            </span>
                            <span class="text-xs font-bold text-zinc-900 dark:text-white">
                              {{ mat.name || 'Unnamed Material' }}
                            </span>
                          </div>
                          <div class="flex items-center gap-4">
                            <label class="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                [checked]="mat.active"
                                (change)="updatePrintMaterialField(parentIndex, 'active', $any($event.target).checked)"
                                class="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500 cursor-pointer"
                              />
                              <span class="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase">Active</span>
                            </label>
                            <button
                              (click)="removePrintMaterial(parentIndex)"
                              class="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Delete Material"
                            >
                              <mat-icon class="text-base">delete</mat-icon>
                            </button>
                          </div>
                        </div>

                        <!-- Material Fields Grid -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                          <div>
                            <label class="block text-[10px] font-black text-zinc-400 uppercase mb-1">
                              Material Name
                            </label>
                            <input
                              type="text"
                              [value]="mat.name"
                              (input)="updatePrintMaterialField(parentIndex, 'name', $any($event.target).value)"
                              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 rounded-lg text-xs font-bold text-zinc-900 dark:text-white outline-none"
                              placeholder="e.g. PLA, PETG, ABS"
                            />
                          </div>
                          <div>
                            <label class="block text-[10px] font-black text-zinc-400 uppercase mb-1">
                              Price per Gram (₹)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              [value]="mat.pricePerGram"
                              (input)="updatePrintMaterialField(parentIndex, 'pricePerGram', +$any($event.target).value)"
                              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none"
                              placeholder="2.5"
                            />
                          </div>
                          <div>
                            <label class="block text-[10px] font-black text-zinc-400 uppercase mb-1">
                              Density (g/cm³)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              [value]="mat.density"
                              (input)="updatePrintMaterialField(parentIndex, 'density', +$any($event.target).value)"
                              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none"
                              placeholder="1.25"
                            />
                          </div>
                        </div>

                        <!-- Material Colors Section -->
                        <div class="pt-2 space-y-3">
                          <div class="flex justify-between items-center">
                            <span class="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                              <mat-icon class="text-xs text-purple-400">palette</mat-icon>
                              Colors configured for {{ mat.name || 'this material' }} ({{ mat.colors?.length || 0 }})
                            </span>
                            <button
                              (click)="addPrintMaterialColor(parentIndex)"
                              class="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <mat-icon class="text-xs">add</mat-icon>
                              Add Color
                            </button>
                          </div>

                          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            @for (
                              col of mat.colors || [];
                              track childIndex;
                              let childIndex = $index
                            ) {
                              <div class="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 relative pr-8 shadow-2xs">
                                <div class="relative flex items-center justify-center shrink-0">
                                  <input
                                    type="color"
                                    [value]="col.hex || '#000000'"
                                    (input)="updatePrintMaterialColorField(parentIndex, childIndex, 'hex', $any($event.target).value)"
                                    class="w-6 h-6 rounded-lg cursor-pointer border-0 bg-transparent p-0 overflow-hidden"
                                  />
                                </div>
                                <div class="flex-1 min-w-0">
                                  <input
                                    type="text"
                                    [value]="col.name"
                                    placeholder="Color Name"
                                    (input)="updatePrintMaterialColorField(parentIndex, childIndex, 'name', $any($event.target).value)"
                                    class="w-full px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:border-purple-500"
                                  />
                                </div>
                                <button
                                  (click)="removePrintMaterialColor(parentIndex, childIndex)"
                                  class="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
                                  title="Delete Color"
                                >
                                  <mat-icon class="text-sm">close</mat-icon>
                                </button>
                              </div>
                            }
                          </div>
                          @if (!mat.colors?.length) {
                            <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs font-medium flex items-center gap-2">
                              <mat-icon class="text-sm">warning</mat-icon>
                              No colorways configured for this material. Users won't be able to select a color for {{ mat.name }}.
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Printer Qualities Profile -->
                <div class="p-5 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm space-y-4">
                  <div class="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">
                        <mat-icon class="text-base">layers</mat-icon>
                      </div>
                      <div>
                        <h3 class="text-xs font-black uppercase text-zinc-800 dark:text-zinc-200">
                          Printer Quality Profiles
                        </h3>
                        <p class="text-[11px] text-zinc-400">Set layer heights (mm) for print resolution presets (Fine, Standard, Draft)</p>
                      </div>
                    </div>
                    <button
                      (click)="addPrintQuality()"
                      class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <mat-icon class="text-sm">add</mat-icon> Add Profile
                    </button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    @for (
                      q of draft().printServiceSettings?.qualities || [];
                      track $index
                    ) {
                      <div class="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 relative pr-9 space-y-2">
                        <div>
                          <label class="block text-[9px] font-black text-zinc-400 uppercase mb-1">
                            Profile Name
                          </label>
                          <input
                            type="text"
                            [value]="q.name"
                            (input)="updatePrintQualityField($index, 'name', $any($event.target).value)"
                            class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 rounded-lg text-xs font-bold text-zinc-900 dark:text-white outline-none"
                            placeholder="e.g. Standard (0.2mm)"
                          />
                        </div>
                        <div>
                          <label class="block text-[9px] font-black text-zinc-400 uppercase mb-1">
                            Layer Thickness (mm)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            [value]="q.height"
                            (input)="updatePrintQualityField($index, 'height', +$any($event.target).value)"
                            class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none"
                            placeholder="0.2"
                          />
                        </div>
                        <button
                          (click)="removePrintQuality($index)"
                          class="absolute right-2 top-2 text-zinc-400 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Delete Profile"
                        >
                          <mat-icon class="text-base">delete</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                </div>

                <!-- Infill Density Standards -->
                <div class="p-5 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm space-y-4">
                  <div class="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-sm">
                        <mat-icon class="text-base">grid_on</mat-icon>
                      </div>
                      <div>
                        <h3 class="text-xs font-black uppercase text-zinc-800 dark:text-zinc-200">
                          Infill Density Standards
                        </h3>
                        <p class="text-[11px] text-zinc-400">Configure infill percentage ranges and defaults for customer orders</p>
                      </div>
                    </div>
                    <button
                      (click)="addPrintInfill()"
                      class="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <mat-icon class="text-sm">add</mat-icon> Add Infill
                    </button>
                  </div>
                  <div class="space-y-3">
                    @for (
                      inf of draft().printServiceSettings?.infillStandards || [];
                      track $index
                    ) {
                      <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 relative pr-10">
                        <div>
                          <label class="block text-[9px] font-black text-zinc-400 uppercase mb-1">
                            Infill Name
                          </label>
                          <input
                            type="text"
                            [value]="inf.name"
                            (input)="updatePrintInfillField($index, 'name', $any($event.target).value)"
                            class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-orange-500 rounded-lg text-xs font-bold text-zinc-900 dark:text-white outline-none"
                            placeholder="Standard (20%)"
                          />
                        </div>
                        <div>
                          <label class="block text-[9px] font-black text-zinc-400 uppercase mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            [value]="inf.desc"
                            (input)="updatePrintInfillField($index, 'desc', $any($event.target).value)"
                            class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-orange-500 rounded-lg text-xs font-semibold text-zinc-900 dark:text-white outline-none"
                            placeholder="Light weight"
                          />
                        </div>
                        <div>
                          <label class="block text-[9px] font-black text-zinc-400 uppercase mb-1">
                            Min %
                          </label>
                          <input
                            type="number"
                            [value]="inf.min"
                            (input)="updatePrintInfillField($index, 'min', +$any($event.target).value)"
                            class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-orange-500 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none"
                            placeholder="10"
                          />
                        </div>
                        <div>
                          <label class="block text-[9px] font-black text-zinc-400 uppercase mb-1">
                            Max %
                          </label>
                          <input
                            type="number"
                            [value]="inf.max"
                            (input)="updatePrintInfillField($index, 'max', +$any($event.target).value)"
                            class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-orange-500 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none"
                            placeholder="30"
                          />
                        </div>
                        <div>
                          <label class="block text-[9px] font-black text-zinc-400 uppercase mb-1">
                            Default %
                          </label>
                          <input
                            type="number"
                            [value]="inf.defaultVal"
                            (input)="updatePrintInfillField($index, 'defaultVal', +$any($event.target).value)"
                            class="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-orange-500 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none"
                            placeholder="20"
                          />
                        </div>
                        <button
                          (click)="removePrintInfill($index)"
                          class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Delete Infill"
                        >
                          <mat-icon class="text-base">delete</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }



            <!-- PWA SETTINGS -->
            @if (activeSubTab() === "PWA Settings") {
              <app-admin-pwa-settings-tab />
            }

            <!-- MARKETING & TRACKING -->
            @if (activeSubTab() === "Marketing & Tracking") {
              <app-admin-marketing-tracking-tab />
            }

            <!-- ADMIN DEVICES -->
            @if (activeSubTab() === "Admin Devices") {
              <app-admin-devices-tab />
            }

            <!-- SHIPPING & COURIER PARTNERS MANAGEMENT -->
            @if (activeSubTab() === "Shipping") {
              <div class="space-y-6 animate-fadeIn font-sans">
                <div class="p-5 bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent border border-blue-500/20 rounded-2xl flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">Courier Partner Management</h3>
                    <p class="text-xs text-zinc-500 font-medium">Enable or disable courier partners, customize tracking URL formats, and manage custom logistical partners.</p>
                  </div>
                  <button (click)="addCustomCourierPartner()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border-none">
                    <mat-icon class="text-sm">add</mat-icon> Add Custom Courier
                  </button>
                </div>

                <!-- Active Courier Partners Grid -->
                <div class="space-y-4">
                  <h4 class="text-xs font-black uppercase tracking-wider text-zinc-400">Supported Courier Partners & Tracking Patterns</h4>
                  <div class="grid grid-cols-1 gap-4">
                    @for (courier of getCourierSettingsList(); track courier.id; let idx = $index) {
                      <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 relative">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                          <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                              <mat-icon class="text-base scale-90">local_shipping</mat-icon>
                            </div>
                            <div>
                              <h5 class="text-xs font-black text-zinc-900 dark:text-white uppercase">{{ courier.name }}</h5>
                              <span class="text-[9px] font-mono text-zinc-400">ID: {{ courier.id }}</span>
                            </div>
                          </div>

                          <div class="flex items-center gap-4">
                            <!-- Enabled Toggle -->
                            <label class="flex items-center gap-2 cursor-pointer select-none">
                              <span class="text-[10px] font-black uppercase text-zinc-500">{{ courier.enabled !== false ? 'Active' : 'Disabled' }}</span>
                              <input
                                type="checkbox"
                                [checked]="courier.enabled !== false"
                                (change)="updateCourierField(idx, 'enabled', $any($event.target).checked)"
                                class="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                              />
                            </label>

                            <!-- Remove Custom Courier -->
                            @if (courier.isCustom) {
                              <button (click)="removeCustomCourierPartner(idx)" class="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg border-none bg-transparent cursor-pointer" title="Delete Custom Courier">
                                <mat-icon class="text-sm">delete</mat-icon>
                              </button>
                            }
                          </div>
                        </div>

                        <!-- URL Pattern & Sort Order -->
                        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 text-xs">
                          <div class="md:col-span-8 space-y-1">
                            <label class="block text-[9px] font-black uppercase text-zinc-400">Tracking URL Pattern (use {{ '{{' }}trackingNumber{{ '}}' }})</label>
                            <input
                              type="text"
                              [value]="courier.urlPattern || ''"
                              (input)="updateCourierField(idx, 'urlPattern', $any($event.target).value)"
                              [placeholder]="'https://example.com/track?id={{trackingNumber}}'"
                              class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-xs outline-none focus:border-blue-500"
                            />
                          </div>

                          <div class="md:col-span-4 space-y-1">
                            <label class="block text-[9px] font-black uppercase text-zinc-400">Sort Order</label>
                            <input
                              type="number"
                              [value]="courier.sortOrder || (idx + 1)"
                              (input)="updateCourierField(idx, 'sortOrder', +$any($event.target).value)"
                              class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-xs outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- DATABASE BACKUPS -->
            @if (activeSubTab() === "Database Backups") {
              <div class="space-y-6 animate-fadeIn font-sans">
                <app-backup-management />
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
export class AdminSettingsTab implements OnDestroy {
  @Input({ required: true }) admin!: AdminPanel;
  private themeService = inject(ThemeService);
  private toastService = inject(ToastService);
  private trackingService = inject(TrackingService);

  activeSubTab = signal<string>("Theme");
  draft = signal<any>({});
  isSaving = signal<boolean>(false);

  // WhatsApp Settings Signals
  whatsappSubSection = signal<"config" | "templates">("config");
  activeTemplateKey = signal<string>("registration");
  showVarPicker = signal<boolean>(false);
  testNumber = "";
  testSendLoading = signal<boolean>(false);

  serviceTemplatePreviewActive = signal<boolean>(false);
  serviceTemplatePreviewText = signal<string>('');
  testServiceRecipient = "";

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
      store_name: this.admin.storeName() || environment.siteName,
      support_phone: "+91 99999 99999",
      support_email: environment.supportEmail,
      site_url: environment.siteUrl,
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

  previewServiceTemplate(type: 'customer' | 'admin') {
    this.admin.http
      .post<any>("/api/admin/whatsapp/preview-service", {
        templateType: type,
        customerName: "Jayakumar",
        trackingId: "ENQ-748920",
        email: "jayakumar@example.com",
        mobile: "+919876543210",
        city: "Bangalore",
        material: "PLA",
        color: "Black",
        remarks: "Print with high resolution"
      })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            this.serviceTemplatePreviewText.set(res.previewText);
            this.serviceTemplatePreviewActive.set(true);
            this.toastService.success(`Loaded mock preview for ${type} service request template.`);
          }
        },
        error: (err) => {
          this.toastService.error(err.error?.error || "Failed to load service template preview");
        }
      });
  }

  sendTestServiceWhatsApp(type: 'customer' | 'admin') {
    if (!this.testServiceRecipient) {
      this.toastService.error("Please enter a recipient number to dispatch test");
      return;
    }

    this.testSendLoading.set(true);
    const triggerKey = type === 'customer' ? 'service_request_customer' : 'service_request_admin';

    this.admin.http
      .post("/api/admin/whatsapp/send", {
        recipientNumber: this.testServiceRecipient,
        templateName: triggerKey,
        parameters: {
          customerName: "Jayakumar",
          trackingId: "ENQ-748920",
          requestDate: new Date().toLocaleDateString('en-IN'),
          estimatedResponseTime: "24-48 Hours",
          serviceType: "3D Printing Service",
          trackUrl: `${environment.siteUrl}/services/track?trk=TRK-748920`,
          mobile: "+919876543210",
          email: "jayakumar@example.com",
          city: "Bangalore",
          fileCount: "2",
          material: "PLA",
          color: "Black",
          remarks: "Print with high resolution",
          adminPortalUrl: `${environment.adminUrl}/services/ENQ-748920`
        }
      })
      .subscribe({
        next: () => {
          this.toastService.success(`Test Service Request ${type} message queued successfully!`);
          this.testSendLoading.set(false);
        },
        error: (err) => {
          this.toastService.error(err.error?.error || "Failed to dispatch test service message");
          this.testSendLoading.set(false);
        }
      });
  }

  subTabs = [
    // { name: "General", icon: "settings" },
    { name: "Theme", icon: "palette" },
    // { name: "Theme Effects", icon: "auto_awesome" },
    // { name: "Typography", icon: "font_download" },
    // { name: "Fonts", icon: "text_format" },
    // { name: "Color Presets", icon: "style" },
    { name: "Hero Slides", icon: "slideshow" },
    { name: "Hero Carousel", icon: "view_carousel" },
    { name: "Promo Banners", icon: "campaign" },
    { name: "Advertisements", icon: "ad_units" },
    // { name: "Homepage Sections", icon: "view_quilt" },
    { name: "Footer", icon: "vertical_align_bottom" },
    { name: "About Page", icon: "info" },
    { name: "Contact", icon: "contact_mail" },
    { name: "Social Links", icon: "share" },
    { name: "Email Settings", icon: "email" },
    { name: "WhatsApp Settings", icon: "chat" },
    { name: "Customer Support", icon: "support_agent" },
    { name: "Recent Purchase Settings", icon: "add_shopping_cart" },

    { name: "PWA Settings", icon: "install_mobile" },
    { name: "Marketing & Tracking", icon: "insights" },
    { name: "Admin Devices", icon: "devices" },
    { name: "Shipping", icon: "local_shipping" },
    { name: "Payment Gateway", icon: "payment" },
    // { name: "Newsletter", icon: "alternate_email" },
    // { name: "Chatbot", icon: "smart_toy" },
    { name: "Product Page", icon: "shopping_bag" },
    // { name: "Tour Settings", icon: "assistant" },
    // { name: "FAQ", icon: "quiz" },
    { name: "Services", icon: "room_service" },
    { name: "3D Printing Service", icon: "print" },
    { name: "Database Backups", icon: "cloud_sync" },
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
        this.activeSubTab.set("Theme");
      } else if (active === "payment-settings") {
        this.activeSubTab.set("Payment Gateway");
      } else if (active === "shipping-settings") {
        this.activeSubTab.set("Shipping");
      } else if (active === "pwa-settings") {
        this.activeSubTab.set("PWA Settings");
      } else if (active === "marketing-settings") {
        this.activeSubTab.set("Marketing & Tracking");
      } else if ((active as string) === "admin-devices" || (active as string) === "devices") {
        this.activeSubTab.set("Admin Devices");
      } else if (active === "backups") {
        this.activeSubTab.set("Database Backups");
      }
    });

    effect(() => {
      const tab = this.activeSubTab();
      if (tab === "Advertisements") {
        this.admin.ds.reloadAdvertisements(true);
      }
    });

    effect(() => {
      const liveAds = this.admin.ds.advertisements();
      if (liveAds && liveAds.length > 0) {
        this.draft.update(d => {
          if (!d.advertisements || d.advertisements.length === 0) {
            return { ...d, advertisements: JSON.parse(JSON.stringify(liveAds)) };
          }
          return d;
        });
      }
    });

    effect(() => {
      const idx = this.editingAdIndex();
      const mode = this.adEditorViewMode();
      if (idx !== null && mode === 'scroll') {
        this.setupAdScrollSpy();
      } else if (this.adIntersectionObserver) {
        this.adIntersectionObserver.disconnect();
        this.adIntersectionObserver = null;
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
      const updatedItem = { ...list[index], [field]: value };
      if (field === 'subtitle') updatedItem.subheading = value;
      if (field === 'subheading') updatedItem.subtitle = value;
      if (field === 'bgVideoUrl') updatedItem.videoUrl = value;
      if (field === 'videoUrl') updatedItem.bgVideoUrl = value;
      if (field === 'active') updatedItem.isActive = value;
      if (field === 'isActive') updatedItem.active = value;
      list[index] = updatedItem;
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

  // Campaign Manager Signals
  public adSearchQuery = signal<string>('');
  public adStatusFilter = signal<string>('all');
  public editingAdIndex = signal<number | null>(null);
  public adEditorTab = signal<string>('basic');
  public adEditorViewMode = signal<'scroll' | 'tab'>('scroll');
  public previewViewport = signal<string>('desktop');
  private adIntersectionObserver: IntersectionObserver | null = null;

  ngOnDestroy() {
    if (this.adIntersectionObserver) {
      this.adIntersectionObserver.disconnect();
      this.adIntersectionObserver = null;
    }
  }

  scrollToAdSection(sectionId: string) {
    this.adEditorTab.set(sectionId);
    if (this.adEditorViewMode() === 'scroll') {
      const el = document.getElementById('ad-sec-' + sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    setTimeout(() => {
      const tabBtn = document.getElementById('ad-tab-btn-' + sectionId);
      if (tabBtn) {
        tabBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 50);
  }

  onAdTabWheel(event: WheelEvent) {
    const container = event.currentTarget as HTMLElement;
    if (container && event.deltaY !== 0) {
      container.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  }

  scrollAdTabs(direction: 'left' | 'right') {
    const container = document.getElementById('ad-editor-tabs-container');
    if (container) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  setupAdScrollSpy() {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    if (this.adIntersectionObserver) {
      this.adIntersectionObserver.disconnect();
      this.adIntersectionObserver = null;
    }

    setTimeout(() => {
      const sectionIds = ['basic', 'content', 'schedule', 'popup', 'triggers', 'targeting', 'promotion'];
      const targets = sectionIds
        .map(id => document.getElementById('ad-sec-' + id))
        .filter((el): el is HTMLElement => !!el);

      if (!targets.length) return;

      this.adIntersectionObserver = new IntersectionObserver((entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          const id = visible[0].target.id.replace('ad-sec-', '');
          if (id && this.adEditorTab() !== id) {
            this.adEditorTab.set(id);
            const tabBtn = document.getElementById('ad-tab-btn-' + id);
            if (tabBtn) {
              tabBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
          }
        }
      }, {
        rootMargin: '-100px 0px -50% 0px',
        threshold: [0, 0.2]
      });

      targets.forEach(target => this.adIntersectionObserver?.observe(target));
    }, 200);
  }

  isImageOnlyMode(ad: any): boolean {
    if (!ad) return false;
    if (ad.contentMode === 'IMAGE_ONLY' || ad.contentMode === 'IMAGE_CLOSE' || ad.showImageOnly || ad.hideHeader) return true;
    const hasHeadline = !!(ad.headline && String(ad.headline).trim());
    const hasTitle = !!(ad.title && String(ad.title).trim());
    const hasSubheadline = !!(ad.subheadline && String(ad.subheadline).trim());
    return !hasHeadline && !hasTitle && !hasSubheadline;
  }

  ensureDraftAdvertisements(): any[] {
    const d = this.draft();
    if (Array.isArray(d.advertisements) && d.advertisements.length > 0) {
      return d.advertisements;
    }
    const liveAds = this.admin.ds.advertisements() || [];
    if (liveAds.length > 0) {
      const copy = JSON.parse(JSON.stringify(liveAds));
      this.draft.update(curr => ({ ...curr, advertisements: copy }));
      return copy;
    }
    return d.advertisements || [];
  }

  get advertisementsList(): any[] {
    const draftAds = this.draft()?.advertisements;
    if (Array.isArray(draftAds) && draftAds.length > 0) {
      return draftAds;
    }
    const liveAds = this.admin.ds.advertisements() || [];
    if (liveAds.length > 0) {
      this.draft.update(curr => {
        if (!curr.advertisements || curr.advertisements.length === 0) {
          return { ...curr, advertisements: JSON.parse(JSON.stringify(liveAds)) };
        }
        return curr;
      });
      return liveAds;
    }
    return [];
  }

  startEditingAd(index: number) {
    this.ensureDraftAdvertisements();
    this.editingAdIndex.set(index);
  }

  deleteCampaign(index: number) {
    this.ensureDraftAdvertisements();
    this.removeArrayItem('advertisements', index);
  }

  addAd() {
    this.ensureDraftAdvertisements();
    const newId = "ad_" + Date.now();
    this.appendArrayItem("advertisements", {
      id: newId,
      name: "New Promotional Campaign",
      title: "Special Offer Headline",
      headline: "Special Offer Headline",
      subheadline: "Get up to 30% off on all 3D printing filaments and accessories.",
      ctaText: "Shop Now",
      linkUrl: "/products",
      ctaUrl: "/products",
      ctaAction: "open_url",
      openInNewTab: false,
      imageUrl: "",
      mobileImageUrl: "",
      type: "banner",
      status: "active",
      placement: "homepage",
      priority: 1,
      startDate: "",
      startTime: "09:00",
      endDate: "",
      endTime: "23:59",
      timezone: "Asia/Kolkata",
      enableCountdown: false,
      countdownType: "campaign_end",
      customEndDate: "",
      customDuration: "",
      isPopup: false,
      popupPosition: "center",
      popupSize: "medium",
      overlay: "dark",
      showCloseButton: true,
      allowEscClose: true,
      allowOutsideClickClose: true,
      animation: "zoom",
      trigger: "immediate",
      delaySeconds: 3,
      scrollPercent: 50,
      pageViewsCount: 1,
      frequency: "always",
      frequencyHours: 24,
      frequencyDays: 1,
      maxImpressionsPerUser: 0,
      audience: "all",
      pageTargeting: "all",
      targetUrlPath: "",
      deviceTargeting: "all",
      couponCode: "",
      productId: "",
      categoryId: "",
      discountText: "LIMITED TIME",
      impressions: 0,
      clicks: 0
    });
    this.editingAdIndex.set((this.draft().advertisements?.length || 1) - 1);
  }

  updateAdField(index: number, field: string, value: any) {
    this.draft.update((d) => {
      const list = [...(d.advertisements || [])];
      const updated = { ...list[index], [field]: value };
      if (field === 'title') updated.headline = value;
      if (field === 'headline') updated.title = value;
      if (field === 'linkUrl') updated.ctaUrl = value;
      if (field === 'ctaUrl') updated.linkUrl = value;
      if (field === 'imageUrl') updated.mediaUrl = value;
      if (field === 'name') updated.title = updated.title || value;
      list[index] = updated;
      return { ...d, advertisements: list };
    });
  }

  duplicateCampaign(index: number) {
    this.ensureDraftAdvertisements();
    const list = this.draft().advertisements || [];
    const orig = list[index];
    if (!orig) return;
    const copy = JSON.parse(JSON.stringify(orig));
    copy.id = 'ad_' + Date.now();
    copy.name = (copy.name || copy.title || 'Campaign') + ' (Copy)';
    copy.title = copy.name;
    copy.headline = copy.name;
    copy.status = 'draft';
    copy.impressions = 0;
    copy.clicks = 0;
    this.appendArrayItem('advertisements', copy);
    this.editingAdIndex.set((this.draft().advertisements?.length || 1) - 1);
  }

  calculateCampaignStatus(ad: any): string {
    if (!ad) return 'DRAFT';
    const status = (ad.status || 'active').toLowerCase();
    if (status === 'draft') return 'DRAFT';
    if (status === 'paused') return 'PAUSED';
    if (status === 'archived') return 'ARCHIVED';

    const now = new Date().getTime();
    if (ad.startDate) {
      const startMs = Date.parse(`${ad.startDate}T${ad.startTime || '00:00'}:00`);
      if (!isNaN(startMs) && now < startMs) return 'SCHEDULED';
    }
    if (ad.endDate) {
      const endMs = Date.parse(`${ad.endDate}T${ad.endTime || '23:59'}:59`);
      if (!isNaN(endMs) && now > endMs) return 'EXPIRED';
    }
    return 'ACTIVE';
  }

  toggleCampaignStatus(index: number) {
    this.ensureDraftAdvertisements();
    const list = [...(this.draft().advertisements || [])];
    const curr = list[index];
    if (!curr) return;
    const nextStatus = (curr.status || 'active') === 'active' ? 'paused' : 'active';
    this.updateAdField(index, 'status', nextStatus);
  }

  archiveCampaign(index: number) {
    this.ensureDraftAdvertisements();
    this.updateAdField(index, 'status', 'archived');
  }

  addFaq() {
    this.appendArrayItem("faqs", {
      question: "",
      answer: "",
      category: "Theme",
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

  getCourierSettingsList(): CourierPartnerConfig[] {
    const settings = this.draft().courierPartners || [];
    return this.trackingService.getCourierList(settings);
  }

  updateCourierField(index: number, field: string, value: any) {
    this.draft.update((d) => {
      const list = [...(d.courierPartners || [])];
      const currentList = this.getCourierSettingsList();
      const targetCourier = currentList[index];
      if (!targetCourier) return d;

      const existingIdx = list.findIndex((c: any) => c.id === targetCourier.id || c.name === targetCourier.name);
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], [field]: value };
      } else {
        list.push({
          id: targetCourier.id,
          name: targetCourier.name,
          urlPattern: targetCourier.urlPattern,
          enabled: true,
          sortOrder: index + 1,
          [field]: value
        });
      }
      return { ...d, courierPartners: list };
    });
  }

  addCustomCourierPartner() {
    this.draft.update((d) => {
      const list = [...(d.courierPartners || [])];
      const newId = 'custom_' + Date.now();
      list.push({
        id: newId,
        name: 'Custom Express ' + (list.length + 1),
        urlPattern: 'https://www.google.com/search?q={{trackingNumber}}',
        enabled: true,
        isCustom: true,
        sortOrder: list.length + 1
      });
      return { ...d, courierPartners: list };
    });
  }

  removeCustomCourierPartner(index: number) {
    this.draft.update((d) => {
      const currentList = this.getCourierSettingsList();
      const targetCourier = currentList[index];
      if (!targetCourier) return d;
      const list = (d.courierPartners || []).filter((c: any) => c.id !== targetCourier.id && c.name !== targetCourier.name);
      return { ...d, courierPartners: list };
    });
  }

  addDefaultWeightRule() {
    this.draft.update((d) => {
      const ship = d.shippingSettings ? { ...d.shippingSettings } : {};
      const rules = Array.isArray(ship.weightRules) ? [...ship.weightRules] : [];
      const lastRule = rules[rules.length - 1];
      const nextFrom = lastRule ? (Number(lastRule.toGrams) || 0) + 1 : 0;
      const nextTo = nextFrom + 500;
      const nextCharge = lastRule ? (Number(lastRule.charge) || 0) + 30 : 40;
      rules.push({ fromGrams: nextFrom, toGrams: nextTo, charge: nextCharge });
      ship.weightRules = rules;
      return { ...d, shippingSettings: ship };
    });
  }

  updateDefaultWeightRule(index: number, field: 'fromGrams' | 'toGrams' | 'charge', value: number) {
    this.draft.update((d) => {
      const ship = d.shippingSettings ? { ...d.shippingSettings } : {};
      const rules = Array.isArray(ship.weightRules) ? [...ship.weightRules] : [];
      if (rules[index]) {
        rules[index] = { ...rules[index], [field]: value };
      }
      ship.weightRules = rules;
      return { ...d, shippingSettings: ship };
    });
  }

  removeDefaultWeightRule(index: number) {
    this.draft.update((d) => {
      const ship = d.shippingSettings ? { ...d.shippingSettings } : {};
      const rules = Array.isArray(ship.weightRules) ? [...ship.weightRules] : [];
      rules.splice(index, 1);
      ship.weightRules = rules;
      return { ...d, shippingSettings: ship };
    });
  }

  async restoreDefaults() {
    if (!confirm("Are you sure you want to restore all configurations to system defaults? This will overwrite your current settings and cannot be undone.")) {
      return;
    }
    this.isSaving.set(true);
    try {
      await this.admin.settingsService.saveSettings({ resetToDefault: true });
      this.toastService.success("System configurations restored to defaults successfully.");
      // Overwrite local draft copy with new default settings returned by service
      this.draft.set(JSON.parse(JSON.stringify(this.admin.settingsService.settingsData())));
    } catch (e: any) {
      this.toastService.error(e.message || "Error restoring defaults.");
    } finally {
      this.isSaving.set(false);
    }
  }
}
