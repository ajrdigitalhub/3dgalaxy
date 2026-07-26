import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-order-tracking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  template: `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
      <!-- Back Arrow -->
      <div class="mb-6 cursor-pointer w-max flex items-center gap-1.5 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors" (click)="router.navigate(['/'])">
        <mat-icon class="text-lg">arrow_back</mat-icon>
        <span class="font-bold text-xs uppercase tracking-wider">Back to home</span>
      </div>

      <!-- Heading -->
      <div class="text-center mb-8 sm:mb-10">
        <h1 class="text-3xl sm:text-4xl font-black uppercase tracking-tight text-neutral-900 dark:text-white flex items-center justify-center gap-2">
          <mat-icon class="text-[#d65108] scale-125">local_shipping</mat-icon>
          Track Order
        </h1>
        <p class="text-xs sm:text-sm font-semibold text-neutral-500 mt-2">
          Experience our real-time logistics sync. Enter credentials below to locate your order.
        </p>
      </div>

      <!-- MAIN TRUCK WORKSPACE -->
      <div class="truck-workspace select-none relative overflow-hidden w-full min-h-[500px] sm:min-h-[620px] flex flex-col items-center justify-center rounded-[2.5rem] sm:rounded-[3rem] border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-100 dark:bg-neutral-900/30 p-3 sm:p-10 shadow-inner">
        
        <!-- Background elements (clouds, hills, road) -->
        <div class="road-background absolute inset-0 -z-10 flex flex-col justify-end overflow-hidden rounded-[2.5rem] sm:rounded-[3rem]">
          <!-- Clouds -->
          <div class="cloud-1 absolute top-6 left-[12%] w-16 sm:w-20 h-5 sm:h-7 bg-white dark:bg-neutral-800/20 rounded-full opacity-60 blur-[1px] animate-cloud"></div>
          <div class="cloud-2 absolute top-20 right-[18%] w-20 sm:w-28 h-6 sm:h-9 bg-white dark:bg-neutral-800/20 rounded-full opacity-60 blur-[1px] animate-cloud-slow"></div>
          <div class="cloud-3 absolute top-10 left-[55%] w-12 sm:w-16 h-4 sm:h-6 bg-white dark:bg-neutral-800/20 rounded-full opacity-40 blur-[1px] animate-cloud-medium"></div>
          
          <!-- Hills outline -->
          <div class="hills absolute bottom-16 sm:bottom-20 inset-x-0 h-16 border-b-2 border-dashed border-neutral-200/80 dark:border-neutral-800 opacity-20"></div>
          
          <!-- Road -->
          <div class="road w-full h-20 sm:h-24 bg-neutral-350 dark:bg-neutral-900 border-t-4 border-neutral-400/40 dark:border-neutral-850 relative">
            <!-- Road dashed line -->
            <div class="road-line absolute top-1/2 left-0 right-0 h-1.5" 
                 [class.moving]="currentState() === 'searching'">
            </div>
          </div>
        </div>

        <!-- THE TRUCK WRAPPER -->
        <div class="truck-container relative w-full flex flex-col items-center justify-center transition-all duration-700" 
             [class.entering]="isEntering()" 
             [class.parked]="isParked()"
             [class.searching]="currentState() === 'searching'">
          
          <!-- Orange neon chassis underglow to highlight the truck in dark mode -->
          <div class="absolute bottom-0 inset-x-8 sm:inset-x-12 h-6 bg-[#d65108]/20 dark:bg-[#d65108]/40 blur-xl rounded-full opacity-60"></div>
          
          <!-- Truck body container (Rear + Cargo + Cab) -->
          <div class="truck-body-wrapper flex items-end justify-center w-full max-w-[850px] relative transition-transform duration-300"
               [class.suspension-bounce]="isEntering() || currentState() === 'searching'"
               [class.idle-float]="isParked() && currentState() !== 'searching'">
            
            <!-- HORN WAVE INDICATOR -->
            <div class="horn-indicator absolute top-[-30px] right-[40px] sm:right-[60px] z-20 pointer-events-none" *ngIf="showHorn()">
              <div class="horn-ring ring-1"></div>
              <div class="horn-ring ring-2"></div>
              <mat-icon class="text-yellow-500 scale-110 sm:scale-125">volume_up</mat-icon>
            </div>

            <!-- 1. TRUCK REAR (Left) - Hidden on Mobile -->
            <div class="truck-rear hidden sm:flex w-12 h-44 bg-neutral-700 dark:bg-neutral-800 rounded-l-2xl border border-neutral-600 dark:border-neutral-700 flex flex-col justify-between py-4 shadow-lg shrink-0 z-10">
              <div class="flex flex-col gap-1 px-1">
                <div class="w-full h-2 bg-red-600 rounded-sm"></div>
                <div class="w-full h-2 bg-yellow-500 rounded-sm"></div>
              </div>
              <!-- Mudguard / Bumper detail -->
              <div class="w-4 h-12 bg-neutral-900 rounded-r-md ml-auto mt-auto flex items-end justify-center pb-2">
                <div class="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
              </div>
            </div>

            <!-- 2. CARGO / TRACKING CONTAINER (Center) - Takes full width on mobile -->
            <div class="truck-cargo w-full sm:flex-1 bg-white dark:bg-neutral-900 border-2 sm:border-4 border-neutral-800 dark:border-neutral-700 shadow-2xl relative transition-all duration-500 rounded-2xl sm:rounded-md"
                 [class.shake-anim]="currentState() === 'failure'">
              
              <!-- Container Grooves (Industrial look) -->
              <div class="absolute inset-0 container-grooves opacity-[0.06] dark:opacity-[0.03] pointer-events-none"></div>

              <!-- LASER SCANNING EFFECT -->
              <div class="laser-scanner" *ngIf="currentState() === 'searching'"></div>

              <!-- CARGO DOOR SYSTEM (Reveals tracking details on success/failure) - Industrial Blue Doors -->
              <div class="cargo-doors absolute inset-0 z-20 flex pointer-events-none" 
                   [class.doors-closed]="currentState() === 'searching'"
                   [class.doors-open]="currentState() !== 'searching'">
                <!-- Left Door -->
                <div class="cargo-door cargo-door-left w-1/2 h-full bg-blue-600 dark:bg-blue-800 border-r border-blue-700 dark:border-blue-900 flex items-center justify-end pr-2 sm:pr-4 text-neutral-300 relative">
                  <!-- Stencil marking -->
                  <div class="absolute top-3 sm:top-6 left-3 sm:left-6 text-blue-255 dark:text-blue-350/60 font-mono text-[6px] sm:text-[9px] uppercase font-bold select-none text-left tracking-wider leading-tight">
                    GALAXY HUB<br>TRACKING
                  </div>
                  <!-- Steel lock rod -->
                  <div class="absolute right-3 sm:right-6 inset-y-2 w-1 sm:w-1.5 bg-zinc-300 dark:bg-zinc-650 shadow-inner rounded-sm border-r border-zinc-400 dark:border-zinc-800"></div>
                  <!-- Locking handle -->
                  <div class="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 w-2.5 sm:w-4 h-5 sm:h-8 bg-zinc-400 dark:bg-zinc-800 rounded-xs sm:rounded-sm border border-zinc-500 flex items-center justify-center">
                    <div class="w-0.5 sm:w-1 h-2 sm:h-4 bg-zinc-600 dark:bg-zinc-700 rounded-xs"></div>
                  </div>
                </div>
                <!-- Right Door -->
                <div class="cargo-door cargo-door-right w-1/2 h-full bg-blue-600 dark:bg-blue-800 border-l border-blue-700 dark:border-blue-900 flex items-center justify-start pl-2 sm:pl-4 text-neutral-300 relative">
                  <!-- Steel lock rod -->
                  <div class="absolute left-3 sm:left-6 inset-y-2 w-1 sm:w-1.5 bg-zinc-300 dark:bg-zinc-650 shadow-inner rounded-sm border-l border-zinc-400 dark:border-zinc-800"></div>
                  <!-- Locking handle -->
                  <div class="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 w-2.5 sm:w-4 h-5 sm:h-8 bg-zinc-400 dark:bg-zinc-800 rounded-xs sm:rounded-sm border border-zinc-500 flex items-center justify-center">
                    <div class="w-0.5 sm:w-1 h-2 sm:h-4 bg-zinc-600 dark:bg-zinc-700 rounded-xs"></div>
                  </div>
                </div>
              </div>

              <!-- CONTAINER CONTENT AREA -->
              <div class="relative z-10 p-4 sm:p-8 min-h-[170px] sm:min-h-[280px] flex flex-col justify-center text-neutral-800 dark:text-neutral-100">

                <!-- STATE A: IDLE / FORM ENTRY -->
                <div class="space-y-4 sm:space-y-6" *ngIf="currentState() === 'idle'">
                  <div class="border-b border-neutral-200/60 dark:border-neutral-800 pb-2 sm:pb-3 flex items-center gap-2">
                    <span class="text-base sm:text-xl">📦</span>
                    <div>
                      <h2 class="text-sm sm:text-base font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-100">Track Order</h2>
                      <p class="text-[9px] sm:text-xs text-neutral-400 dark:text-neutral-500 font-medium">Verify your order credentials below</p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div class="space-y-1">
                      <label class="text-[9px] sm:text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Order ID *</label>
                      <div class="relative">
                        <mat-icon class="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 text-xs sm:text-sm">confirmation_number</mat-icon>
                        <input 
                          type="text" 
                          [(ngModel)]="orderNumber" 
                          placeholder="e.g. ORD-2026-123456" 
                          class="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg sm:rounded-xl pl-8 sm:pl-9 pr-3 py-2 text-[11px] sm:text-sm focus:ring-2 focus:ring-[#d65108] focus:border-[#d65108] outline-none font-semibold text-neutral-850 dark:text-neutral-100 transition-all"
                        >
                      </div>
                    </div>

                    <div class="space-y-1">
                      <label class="text-[9px] sm:text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Email Address *</label>
                      <div class="relative">
                        <mat-icon class="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 text-xs sm:text-sm">mail_outline</mat-icon>
                        <input 
                          type="email" 
                          [(ngModel)]="email" 
                          placeholder="Checkout email address" 
                          class="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg sm:rounded-xl pl-8 sm:pl-9 pr-3 py-2 text-[11px] sm:text-sm focus:ring-2 focus:ring-[#d65108] focus:border-[#d65108] outline-none font-semibold text-neutral-850 dark:text-neutral-100 transition-all"
                        >
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-1 sm:pt-2">
                    <span class="text-[9px] sm:text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <mat-icon class="text-2xs">help_outline</mat-icon>
                      Need Help? <a [routerLink]="['/about']" class="text-blue-500 hover:underline">Contact Hub</a>
                    </span>
                    <button
                      (click)="performTrack()"
                      (mouseenter)="isButtonHovered.set(true)"
                      (mouseleave)="isButtonHovered.set(false)"
                      class="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-[#d65108] hover:bg-[#b83200] active:scale-95 text-white text-[10px] sm:text-xs font-black uppercase rounded-lg sm:rounded-xl tracking-wider shadow-md shadow-[#d65108]/30 transition-all flex items-center justify-center gap-2 group shrink-0"
                    >
                      <span>Track Order</span>
                      <mat-icon class="text-sm transition-transform duration-300 group-hover:translate-x-1">local_shipping</mat-icon>
                    </button>
                  </div>
                </div>

                <!-- STATE B: SEARCHING / LOADING -->
                <div class="flex flex-col items-center justify-center text-center py-4 sm:py-6 space-y-3 sm:space-y-4" *ngIf="currentState() === 'searching'">
                  <div class="flex items-center justify-center gap-2">
                    <!-- Package bouncing animation -->
                    <div class="package-bounce p-2 sm:p-3 bg-[#d65108]/10 rounded-full text-xl sm:text-2xl border border-[#d65108]/20 animate-bounce">📦</div>
                    <div class="package-bounce p-2 sm:p-3 bg-blue-500/10 rounded-full text-xl sm:text-2xl border border-blue-500/20 animate-bounce-delayed">🚚</div>
                  </div>
                  <div class="space-y-1">
                    <h3 class="text-xs sm:text-sm font-black uppercase tracking-widest text-neutral-700 dark:text-neutral-300">Locating Order</h3>
                    <p class="text-[10px] sm:text-xs text-neutral-400 font-semibold animate-pulse">Syncing satellite telemetry database...</p>
                  </div>
                  <!-- Progress Bar -->
                  <div class="w-full max-w-xs h-1 sm:h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div class="progress-bar-fill h-full bg-[#d65108]"></div>
                  </div>
                </div>

                <!-- STATE C: SUCCESS / TIMELINE -->
                <div class="space-y-5 sm:space-y-6" *ngIf="currentState() === 'success' && order()">
                  <div class="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-2 sm:pb-3">
                    <div>
                      <span class="text-[9px] sm:text-[10px] text-neutral-400 dark:text-neutral-500 font-black uppercase tracking-widest">Order Located</span>
                      <h3 class="text-xs sm:text-base font-black text-neutral-900 dark:text-white uppercase flex items-center gap-1.5">
                        {{order().orderNumber}}
                        <span class="px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider" [class]="getStatusBadgeClass(order().status)">
                          {{order().status}}
                        </span>
                      </h3>
                    </div>
                    <!-- Reset Button to track another -->
                    <button 
                      (click)="resetPortal()"
                      class="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-md transition-colors flex items-center gap-1"
                    >
                      <mat-icon class="text-xs">restart_alt</mat-icon>
                      Track Another
                    </button>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
                    
                    <!-- Vertical Timeline (Left Column) -->
                    <div class="md:col-span-7 space-y-4">
                      <span class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block mb-1">Order Status</span>
                      
                      <!-- Vertical timeline wrapper -->
                      <div class="relative pl-5 border-l-2 border-neutral-200 dark:border-neutral-800 space-y-5 sm:space-y-6">
                        @for (step of getTimelineSteps(); track step.key; let last = $last) {
                          <div class="relative timeline-item animate-fade-in-up">
                            
                            <!-- Node Bullet indicator -->
                            <span 
                              class="absolute -left-[30px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-neutral-900 flex items-center justify-center transition-all duration-300"
                              [class]="step.state === 'completed' ? 'bg-green-500 scale-110' : (step.state === 'current' ? 'bg-[#d65108] scale-125 ring-4 ring-[#d65108]/20 animate-pulse' : 'bg-neutral-300 dark:bg-neutral-700')"
                            >
                              <mat-icon class="text-[9px] text-white flex items-center justify-center font-bold" *ngIf="step.state === 'completed'">check</mat-icon>
                            </span>
                            
                            <div class="space-y-0.5">
                              <div class="flex items-center gap-2">
                                <span class="text-[11px] sm:text-xs font-black uppercase tracking-wider"
                                      [class.text-green-600]="step.state === 'completed'"
                                      [class.text-[#d65108]]="step.state === 'current'"
                                      [class.text-neutral-400]="step.state === 'upcoming'">
                                  {{step.label}}
                                </span>
                              </div>
                              <p class="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold leading-normal">
                                {{step.description}}
                              </p>
                            </div>
                          </div>
                        }
                      </div>
                    </div>

                    <!-- Order Metrics/Address (Right Column) -->
                    <div class="md:col-span-5 bg-neutral-50 dark:bg-neutral-950/40 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-neutral-200/60 dark:border-neutral-800 space-y-3.5">
                      
                      <div>
                        <span class="text-[9px] sm:text-[10px] text-neutral-400 dark:text-neutral-500 block font-black uppercase tracking-wider">Shipping Details</span>
                        <p class="text-[11px] sm:text-xs font-bold text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed">
                          {{getShippingAddressText()}}
                        </p>
                      </div>

                      <div class="border-t border-neutral-200/60 dark:border-neutral-800 pt-2.5">
                        <span class="text-[9px] sm:text-[10px] text-neutral-400 dark:text-neutral-500 block font-black uppercase tracking-wider">Order Value</span>
                        <span class="text-xs sm:text-sm font-black text-[#d65108] mt-0.5 block">
                          {{order().totalAmount | currency:'INR':'symbol':'1.0-2'}}
                        </span>
                      </div>

                      <div class="border-t border-neutral-200/60 dark:border-neutral-800 pt-2.5 space-y-1.5">
                        <span class="text-[9px] sm:text-[10px] text-neutral-400 dark:text-neutral-500 block font-black uppercase tracking-wider">Items summary</span>
                        <div class="max-h-[100px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                          @for (item of order().items; track item.id) {
                            <div class="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                              <span class="truncate max-w-[120px]">{{item.product?.name}}</span>
                              <span>x{{item.quantity}}</span>
                            </div>
                          }
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                <!-- STATE D: FAILURE / ERROR -->
                <div class="flex flex-col items-center justify-center text-center py-4 sm:py-6 space-y-4 sm:space-y-5" *ngIf="currentState() === 'failure'">
                  <div class="w-10 sm:w-14 h-10 sm:h-14 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center border border-red-200/80 dark:border-red-900/60">
                    <mat-icon class="scale-110 sm:scale-125">error_outline</mat-icon>
                  </div>
                  <div class="space-y-1">
                    <h3 class="font-black text-neutral-900 dark:text-white uppercase tracking-wider text-sm sm:text-base">Order Not Found</h3>
                    <p class="text-[10px] sm:text-xs text-neutral-400 font-semibold max-w-sm mx-auto">
                      {{error() || 'Please check your Order Number reference and Email credentials. Verify you entered the exact credentials used during checkout.'}}
                    </p>
                  </div>
                  <button 
                    (click)="resetPortal()"
                    class="px-4 py-2 bg-neutral-850 hover:bg-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg sm:rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <mat-icon class="text-xs">restart_alt</mat-icon>
                    Modify Query
                  </button>
                </div>

              </div>
            </div>

            <!-- 3. TRUCK CABIN (Right) - safety orange body with window gradient & headlights - Hidden on Mobile -->
            <div class="truck-cab hidden sm:flex w-32 h-44 bg-[#d65108] rounded-r-[2rem] border border-neutral-700/50 dark:border-neutral-700/80 relative shadow-lg shrink-0 flex flex-col justify-between p-4">
              <!-- Aerodynamic Cabin spoiler -->
              <div class="absolute -top-3 left-0 w-16 h-4 bg-[#b83200] rounded-t-lg border-b border-neutral-900/40"></div>
              
              <!-- Windshield / Window -->
              <div class="windshield absolute top-4 left-2 right-4 h-16 bg-gradient-to-br from-sky-400/40 to-sky-200/5 border border-sky-400/40 rounded-tr-xl flex items-center justify-center overflow-hidden">
                <!-- Driver silhouette -->
                <div class="w-6 h-8 bg-neutral-900/40 rounded-full mt-4 mr-2"></div>
              </div>
              
              <!-- Front Grill / Chrome bumper details -->
              <div class="absolute bottom-2 right-0 w-3 h-10 bg-neutral-400 dark:bg-neutral-600 rounded-l-md border border-neutral-500 dark:border-neutral-700 flex flex-col gap-1 p-1">
                <div class="w-full h-1 bg-neutral-800"></div>
                <div class="w-full h-1 bg-neutral-800"></div>
              </div>

              <!-- Side mirror -->
              <div class="absolute top-10 left-[-4px] w-2 h-7 bg-neutral-950 rounded-sm border border-neutral-700"></div>
              
              <!-- Headlight -->
              <div class="headlight absolute bottom-6 right-0 w-2.5 h-6 bg-yellow-300 rounded-l-md border-y border-l border-yellow-400" 
                   [class.glow]="isParked() || currentState() === 'searching'">
              </div>
            </div>
            
          </div>
          
          <!-- 4. PREMIUM TRUCK WHEELS (Mobile Position: Under Cargo Container) -->
          <div class="truck-wheels flex sm:hidden absolute bottom-[-14px] inset-x-0 justify-between px-8 pointer-events-none">
            <!-- Rear Wheel -->
            <div class="wheel w-10 h-10 bg-neutral-800 dark:bg-neutral-900 rounded-full border-[4px] border-neutral-900 dark:border-neutral-955 flex items-center justify-center shadow-md relative"
                 [class.rotating]="isEntering() || currentState() === 'searching'">
              <div class="w-5 h-5 rounded-full bg-neutral-300 dark:bg-neutral-700 border border-neutral-400 dark:border-neutral-600 flex items-center justify-center relative">
                <div class="w-1.5 h-1.5 rounded-full bg-neutral-800 dark:bg-neutral-900"></div>
                <div class="spoke w-full h-[1px] bg-neutral-500 absolute"></div>
                <div class="spoke w-[1px] h-full bg-neutral-500 absolute"></div>
              </div>
            </div>
            <!-- Front Wheel -->
            <div class="wheel w-10 h-10 bg-neutral-800 dark:bg-neutral-900 rounded-full border-[4px] border-neutral-900 dark:border-neutral-955 flex items-center justify-center shadow-md relative"
                 [class.rotating]="isEntering() || currentState() === 'searching'">
              <div class="w-5 h-5 rounded-full bg-neutral-300 dark:bg-neutral-700 border border-neutral-400 dark:border-neutral-600 flex items-center justify-center relative">
                <div class="w-1.5 h-1.5 rounded-full bg-neutral-800 dark:bg-neutral-900"></div>
                <div class="spoke w-full h-[1px] bg-neutral-500 absolute"></div>
                <div class="spoke w-[1px] h-full bg-neutral-500 absolute"></div>
              </div>
            </div>
          </div>

          <!-- 5. PREMIUM TRUCK WHEELS (Desktop Position: Under Bumper & Cab) -->
          <div class="truck-wheels hidden sm:flex absolute bottom-[-22px] inset-x-0 justify-between px-14 pointer-events-none">
            <!-- Front Wheel -->
            <div class="wheel w-14 h-14 bg-neutral-800 dark:bg-neutral-900 rounded-full border-[6px] border-neutral-900 dark:border-neutral-950 flex items-center justify-center shadow-md relative"
                 [class.rotating]="isEntering() || currentState() === 'searching'">
              <div class="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-700 border-2 border-neutral-400 dark:border-neutral-600 flex items-center justify-center relative">
                <div class="w-2.5 h-2.5 rounded-full bg-neutral-800 dark:bg-neutral-900"></div>
                <div class="spoke w-full h-[1.5px] bg-neutral-500 dark:bg-neutral-550 absolute"></div>
                <div class="spoke w-[1.5px] h-full bg-neutral-500 dark:bg-neutral-550 absolute"></div>
              </div>
            </div>
            <!-- Dual Rear Wheels -->
            <div class="flex gap-2">
              <div class="wheel w-14 h-14 bg-neutral-800 dark:bg-neutral-900 rounded-full border-[6px] border-neutral-900 dark:border-neutral-950 flex items-center justify-center shadow-md relative"
                   [class.rotating]="isEntering() || currentState() === 'searching'">
                <div class="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-700 border-2 border-neutral-400 dark:border-neutral-600 flex items-center justify-center relative">
                  <div class="w-2.5 h-2.5 rounded-full bg-neutral-850 dark:bg-neutral-900"></div>
                  <div class="spoke w-full h-[1.5px] bg-neutral-500 dark:bg-neutral-550 absolute"></div>
                  <div class="spoke w-[1.5px] h-full bg-neutral-500 dark:bg-neutral-550 absolute"></div>
                </div>
              </div>
              <div class="wheel w-14 h-14 bg-neutral-800 dark:bg-neutral-900 rounded-full border-[6px] border-neutral-900 dark:border-neutral-955 flex items-center justify-center shadow-md relative"
                   [class.rotating]="isEntering() || currentState() === 'searching'">
                <div class="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-700 border-2 border-neutral-400 dark:border-neutral-600 flex items-center justify-center relative">
                  <div class="w-2.5 h-2.5 rounded-full bg-neutral-850 dark:bg-neutral-900"></div>
                  <div class="spoke w-full h-[1.5px] bg-neutral-500 dark:bg-neutral-550 absolute"></div>
                  <div class="spoke w-[1.5px] h-full bg-neutral-500 dark:bg-neutral-550 absolute"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Smoke / Dust particles -->
          <div class="absolute bottom-[-10px] left-[-20px] pointer-events-none flex flex-col gap-1" *ngIf="isEntering() || currentState() === 'searching'">
            <div class="smoke-puff puff-1"></div>
            <div class="smoke-puff puff-2"></div>
          </div>

        </div>

      </div>
    </div>
  `,
  styles: [`
    /* TRUCK ENTRY & DRIVE ANIMATIONS */
    .truck-container.entering {
      animation: drive-in 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }

    @keyframes drive-in {
      0% {
        transform: translateX(-105vw);
      }
      70% {
        transform: translateX(5vw); /* Over-shoot */
      }
      100% {
        transform: translateX(0);
      }
    }

    /* WHEEL ROTATION */
    .wheel.rotating {
      animation: rotate-wheels 0.8s linear infinite;
    }
    
    .truck-container.searching .wheel.rotating {
      animation: rotate-wheels 0.4s linear infinite; /* Faster spinning when scanning */
    }

    @keyframes rotate-wheels {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* IDLE FLOATING SUSPENSION */
    .idle-float {
      animation: float-idle 3s ease-in-out infinite;
    }

    @keyframes float-idle {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    /* SEARCHING BOUNCE SUSPENSION */
    .suspension-bounce {
      animation: bounce-suspension 0.25s linear infinite;
    }

    @keyframes bounce-suspension {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    /* HEADLIGHTS GLOW */
    .headlight.glow {
      animation: headlight-glow 1.5s ease-in-out infinite;
    }

    @keyframes headlight-glow {
      0%, 100% {
        box-shadow: 10px 0 15px rgba(250, 204, 21, 0.5), 30px 0 35px rgba(250, 204, 21, 0.2);
      }
      50% {
        box-shadow: 25px 0 30px rgba(250, 204, 21, 0.8), 60px 0 70px rgba(250, 204, 21, 0.4);
      }
    }

    /* DUST SMOKE PUFFS */
    .smoke-puff {
      width: 12px;
      height: 12px;
      background: rgba(163, 163, 163, 0.4);
      border-radius: 90px;
      opacity: 0;
    }
    .smoke-puff.puff-1 { animation: puff-anim 1.2s ease-out infinite; }
    .smoke-puff.puff-2 { animation: puff-anim 1.2s ease-out infinite 0.6s; }

    @keyframes puff-anim {
      0% {
        transform: translate(0, 0) scale(0.6);
        opacity: 0.8;
      }
      50% {
        transform: translate(-30px, -8px) scale(1.4);
        opacity: 0.4;
      }
      100% {
        transform: translate(-60px, -15px) scale(1.8);
        opacity: 0;
      }
    }

    /* ROAD dashed line background */
    .road-line {
      background-image: linear-gradient(to right, transparent 50%, white 50%);
      background-size: 50px 100%;
    }
    
    .road-line.moving {
      animation: road-scroll 0.25s linear infinite;
    }

    @keyframes road-scroll {
      0% { background-position: 0 0; }
      100% { background-position: -50px 0; }
    }

    /* CLOUD FLOATING */
    .animate-cloud { animation: cloud-drift 20s linear infinite; }
    .animate-cloud-slow { animation: cloud-drift 32s linear infinite; }
    .animate-cloud-medium { animation: cloud-drift 26s linear infinite; }

    @keyframes cloud-drift {
      0% { transform: translateX(-120px); }
      100% { transform: translateX(120px); }
    }

    /* CARGO GROOVES BACKGROUND */
    .container-grooves {
      background: repeating-linear-gradient(
        90deg,
        transparent,
        transparent 15px,
        rgba(0, 0, 0, 0.08) 15px,
        rgba(0, 0, 0, 0.08) 30px
      );
    }
    
    /* SCANNING LASER EFFECT */
    .laser-scanner {
      position: absolute;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(to bottom, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.8), rgba(239, 68, 68, 0.1));
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);
      z-index: 15;
      animation: laser-sweep 2s ease-in-out infinite;
    }

    @keyframes laser-sweep {
      0%, 100% { top: 0%; }
      50% { top: 100%; }
    }

    /* SHAKE ANIMATION ON FAILURE */
    .shake-anim {
      animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both;
    }

    @keyframes shake {
      10%, 90% { transform: translate3d(-2px, 0, 0); }
      20%, 80% { transform: translate3d(4px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
      40%, 60% { transform: translate3d(6px, 0, 0); }
    }

    /* CARGO DOORS (3D FLAPPING EFFECT) */
    .cargo-doors {
      perspective: 1200px;
    }
    
    .cargo-door {
      transition: transform 1.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .cargo-door-left {
      transform-origin: left center;
      transform: rotateY(0deg);
    }
    
    .cargo-door-right {
      transform-origin: right center;
      transform: rotateY(0deg);
    }

    /* Closed state during searching */
    .cargo-doors.doors-closed .cargo-door-left {
      transform: rotateY(0deg) !important;
    }
    .cargo-doors.doors-closed .cargo-door-right {
      transform: rotateY(0deg) !important;
    }

    /* Open state on success/failure/idle */
    .cargo-doors.doors-open .cargo-door-left {
      transform: rotateY(-130deg);
    }
    .cargo-doors.doors-open .cargo-door-right {
      transform: rotateY(130deg);
    }

    /* HORN WAVE RINGS */
    .horn-ring {
      position: absolute;
      border: 2px solid rgba(234, 179, 8, 0.4);
      border-radius: 999px;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      transform-origin: center;
    }
    
    .horn-ring.ring-1 {
      animation: horn-wave-anim 1s ease-out infinite;
    }
    .horn-ring.ring-2 {
      animation: horn-wave-anim 1s ease-out infinite 0.5s;
    }

    @keyframes horn-wave-anim {
      0% {
        transform: scale(0.5);
        opacity: 1;
      }
      100% {
        transform: scale(2.2);
        opacity: 0;
      }
    }

    /* PROGRESS BAR SEARCHING */
    .progress-bar-fill {
      width: 0%;
      animation: progress-fill-anim 2.5s ease-in-out infinite;
    }

    @keyframes progress-fill-anim {
      0% { width: 0%; }
      50% { width: 80%; }
      100% { width: 100%; }
    }

    /* TIMELINE ITEM ENTRY */
    .timeline-item {
      opacity: 0;
      transform: translateY(15px);
      animation: fade-in-up-anim 0.5s ease-out forwards;
    }
    
    .timeline-item:nth-child(1) { animation-delay: 0.1s; }
    .timeline-item:nth-child(2) { animation-delay: 0.2s; }
    .timeline-item:nth-child(3) { animation-delay: 0.3s; }
    .timeline-item:nth-child(4) { animation-delay: 0.4s; }
    .timeline-item:nth-child(5) { animation-delay: 0.5s; }

    @keyframes fade-in-up-anim {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* NO SCROLLBAR HELPER */
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    /* RESPONSIVE SCALING & ADAPTABILITY */
    @media (max-width: 680px) {
      .truck-workspace {
        padding: 12px !important;
        min-height: 480px !important;
        border-radius: 1.5rem !important;
      }
    }
  `]
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
  router = inject(Router);
  api = inject(ApiService);
  toast = inject(ToastService);
  loading = inject(LoadingService);

  orderNumber = '';
  email = '';

  isEntering = signal(true);
  isParked = signal(false);
  showHorn = signal(false);
  isButtonHovered = signal(false);

  searching = signal(false);
  order = signal<any | null>(null);
  error = signal<string | null>(null);
  currentState = signal<'idle' | 'searching' | 'success' | 'failure'>('idle');

  private enterTimeout: any;

  ngOnInit() {
    // Start truck entry animation
    this.isEntering.set(true);
    this.isParked.set(false);

    this.enterTimeout = setTimeout(() => {
      this.isEntering.set(false);
      this.isParked.set(true);
      // Brief horn animation on arrival
      this.triggerHorn();
    }, 2500);
  }

  ngOnDestroy() {
    if (this.enterTimeout) {
      clearTimeout(this.enterTimeout);
    }
  }

  triggerHorn() {
    this.showHorn.set(true);
    setTimeout(() => {
      this.showHorn.set(false);
    }, 1800);
  }

  resetPortal() {
    this.orderNumber = '';
    this.email = '';
    this.currentState.set('idle');
    this.order.set(null);
    this.error.set(null);
    this.isEntering.set(false);
    this.isParked.set(true);
  }

  async performTrack() {
    const num = this.orderNumber.trim();
    const mail = this.email.trim();

    if (!num || !mail) {
      this.toast.error('Both order reference number and checkout credentials are required.');
      return;
    }

    // Set state to searching (triggers doors closed + laser scan + moving truck animation)
    this.currentState.set('searching');
    this.searching.set(true);
    this.error.set(null);
    this.order.set(null);
    this.loading.startLoading();

    // Brief delay to appreciate the doors slam shut and moving truck loading states
    await new Promise(resolve => setTimeout(resolve, 2500));

    try {
      const res = await this.api.post<any>('/orders/track', { orderNumber: num, email: mail }).toPromise();
      const fetchedOrder = res[1] || res;
      
      this.order.set(fetchedOrder);
      this.currentState.set('success');
      this.triggerHorn();
      this.toast.success('Shipment located successfully!');
    } catch (e: any) {
      console.error(e);
      this.error.set(e?.error?.error || e?.message || 'Access Denied or order reference not found.');
      this.currentState.set('failure');
      this.toast.error('Could not locate cargo reference.');
    } finally {
      this.searching.set(false);
      this.loading.stopLoading();
    }
  }

  getTimelineSteps() {
    const o = this.order();
    if (!o) return [];

    const status = (o.status || '').toLowerCase();
    
    const steps = [
      { key: 'confirmed', label: 'Order Confirmed', description: 'Your order has been verified and accepted.' },
      { key: 'packed', label: 'Packed', description: 'Order items have been boxed and are ready for transit.' },
      { key: 'shipped', label: 'Shipped', description: 'Package is in transit with logistics carrier.' },
      { key: 'out_for_delivery', label: 'Out For Delivery', description: 'Local courier is executing delivery run today.' },
      { key: 'delivered', label: 'Delivered', description: 'Package successfully dropped off at destination address.' }
    ];

    let activeIdx = 0;
    if (status === 'pending') activeIdx = 0;
    else if (status === 'processing') activeIdx = 1;
    else if (status === 'shipped') activeIdx = 2;
    else if (status === 'delivered') activeIdx = 4;
    else activeIdx = 1; // Default processing

    return steps.map((s, idx) => {
      let state: 'completed' | 'current' | 'upcoming' = 'upcoming';
      if (idx < activeIdx) {
        state = 'completed';
      } else if (idx === activeIdx) {
        state = 'current';
      } else {
        state = 'upcoming';
      }
      return { ...s, state };
    });
  }

  getStatusBadgeClass(status: string): string {
    const baseStyle = 'border ';
    switch ((status || '').toLowerCase()) {
      case 'pending':
        return baseStyle + 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'processing':
        return baseStyle + 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'shipped':
        return baseStyle + 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30';
      case 'delivered':
        return baseStyle + 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'cancelled':
        return baseStyle + 'bg-red-500/10 text-red-500 border-red-500/30';
      default:
        return baseStyle + 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
    }
  }

  getShippingAddressText(): string {
    const o = this.order();
    if (!o) return 'N/A';
    
    if (o.guestAddress) {
      try {
        const parsed = JSON.parse(o.guestAddress);
        return [
          parsed.addressLine1 || parsed.address,
          parsed.addressLine2,
          parsed.city,
          parsed.state,
          parsed.postalCode || parsed.pincode,
          parsed.country
        ].filter(Boolean).join(', ');
      } catch {
        return o.guestAddress;
      }
    }

    if (o.shippingAddress) {
      const s = o.shippingAddress;
      return [
        s.addressLine1,
        s.addressLine2,
        s.city,
        s.state,
        s.postalCode,
        s.country
      ].filter(Boolean).join(', ');
    }

    return 'N/A';
  }
}
