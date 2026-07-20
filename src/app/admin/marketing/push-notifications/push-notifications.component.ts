import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-push-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .scrollbar-none::-webkit-scrollbar { display: none; }
    .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
    .active-tab-orange { background-color: rgba(245, 79, 0, 0.1) !important; color: #f54f00 !important; }
    .border-active-orange { border-color: #f54f00 !important; }
    .bg-active-orange { background-color: rgba(245, 79, 0, 0.05) !important; }
  `],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      
      <!-- Premium Breadcrumb Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-neutral-400">
            <span>Marketing</span>
            <mat-icon class="scale-50">chevron_right</mat-icon>
            <span class="text-[#f54f00]">Push Campaign Center</span>
          </div>
          <h1 class="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Push Notification Campaigns</h1>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="activeSubTab.set('create'); resetWizard()" class="h-10 px-5 bg-[#f54f00] hover:bg-orange-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02] flex items-center gap-2 cursor-pointer border-none shadow-sm">
            <mat-icon class="text-sm">add_circle</mat-icon>
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      <!-- Main Layout Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Left Submenus Sidebar (3 Cols) -->
        <div class="lg:col-span-3 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-3 lg:pb-0 gap-2 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 lg:pr-6 whitespace-nowrap scrollbar-none">
          <button *ngFor="let tab of submenuItems" 
                  (click)="selectSubmenu(tab.id)"
                  [ngClass]="{'active-tab-orange': activeSubTab() === tab.id, 'text-neutral-500 dark:text-neutral-400': activeSubTab() !== tab.id}"
                  class="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border-none bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/50 w-full text-left">
            <mat-icon class="text-base">{{ tab.icon }}</mat-icon>
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <!-- Right Content Area (9 Cols) -->
        <div class="lg:col-span-9 space-y-6">

          <!-- 1. DASHBOARD TAB -->
          <div *ngIf="activeSubTab() === 'dashboard'" class="space-y-6">
            @if (analyticsLoading()) {
              <div class="py-12 text-center text-neutral-400 uppercase tracking-widest font-black">
                Loading dashboard data...
              </div>
            } @else {
              <!-- KPI Cards Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div *ngFor="let card of kpiCards" class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <span class="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{{ card.label }}</span>
                  <h2 class="text-2xl font-black text-neutral-900 dark:text-white mt-3">{{ card.value }}</h2>
                  <span class="text-[9px] font-bold block mt-1" [ngClass]="card.trendClass || 'text-neutral-400'">{{ card.subtext }}</span>
                </div>
              </div>

              <!-- SVG Charts Row -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <!-- Daily Sends and Opens Chart -->
                <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 shadow-xs">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider">Daily Campaign Sends & Clicks</h3>
                    <span class="text-[9px] font-bold text-neutral-400">Last 15 Days</span>
                  </div>
                  <div class="relative h-48 w-full flex items-end justify-between px-2 pt-4 border-b border-l border-neutral-100 dark:border-neutral-800">
                    <div *ngFor="let day of dailyTrends()" class="flex-1 flex flex-col items-center group relative h-full justify-end">
                      <!-- Bar Tooltip -->
                      <div class="absolute bottom-full mb-1 scale-0 group-hover:scale-100 bg-neutral-900 text-white text-[9px] font-bold py-1 px-2 rounded-md transition-all shadow-md z-10 whitespace-nowrap">
                        Sends: {{ day.sends }} | Clicks: {{ day.clicks }}
                      </div>
                      <!-- Click Bar (Accent Orange) -->
                      <div class="bg-[#f54f00] w-2 rounded-t-xs" [style.height.%]="getPercent(day.clicks, maxSendsValue() || 1)"></div>
                      <!-- Send Bar (Light Orange) -->
                      <div class="bg-[#f54f00]/30 w-2 rounded-t-xs mt-0.5" [style.height.%]="getPercent(day.sends - day.clicks, maxSendsValue() || 1)"></div>
                      <span class="text-[8px] text-neutral-400 font-mono mt-2 scale-75">{{ formatDateLabel(day.date) }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-4 mt-3 text-[9px] font-bold text-neutral-450 uppercase tracking-wider justify-center">
                    <div class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-[#f54f00]"></span> Clicks</div>
                    <div class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-[#f54f00]/30"></span> Total Sends</div>
                  </div>
                </div>

                <!-- OS & Browser Split -->
                <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 shadow-xs">
                  <h3 class="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider mb-4">Device split</h3>
                  <div class="space-y-4 pt-2">
                    <div class="space-y-1">
                      <div class="flex items-center justify-between text-xs font-black uppercase tracking-wider text-neutral-500">
                        <span>Android</span>
                        <span class="text-neutral-900 dark:text-white">64%</span>
                      </div>
                      <div class="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                        <div class="bg-[#f54f00] h-2 rounded-full" style="width: 64%"></div>
                      </div>
                    </div>
                    <div class="space-y-1">
                      <div class="flex items-center justify-between text-xs font-black uppercase tracking-wider text-neutral-500">
                        <span>Chrome (Desktop/Mobile)</span>
                        <span class="text-neutral-900 dark:text-white">23%</span>
                      </div>
                      <div class="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                        <div class="bg-blue-500 h-2 rounded-full" style="width: 23%"></div>
                      </div>
                    </div>
                    <div class="space-y-1">
                      <div class="flex items-center justify-between text-xs font-black uppercase tracking-wider text-neutral-500">
                        <span>Safari & iOS</span>
                        <span class="text-neutral-900 dark:text-white">13%</span>
                      </div>
                      <div class="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                        <div class="bg-emerald-500 h-2 rounded-full" style="width: 13%"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- 2. CAMPAIGNS TAB -->
          <div *ngIf="activeSubTab() === 'campaigns'" class="space-y-6">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 p-4 rounded-2xl">
              <div class="w-full sm:w-72 relative">
                <input type="text" 
                       [(ngModel)]="searchQuery" 
                       (input)="loadCampaigns()"
                       placeholder="Search campaigns..." 
                       class="w-full h-10 pl-9 pr-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
                <mat-icon class="absolute left-3 top-2.5 scale-75 text-neutral-400">search</mat-icon>
              </div>
              <div class="flex items-center gap-3 w-full sm:w-auto">
                <select [(ngModel)]="filterType" 
                        (change)="loadCampaigns()"
                        class="h-10 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none cursor-pointer">
                  <option value="">All Types</option>
                  <option *ngFor="let t of campaignTypes" [value]="t">{{ t }}</option>
                </select>
                <select [(ngModel)]="filterStatus" 
                        (change)="loadCampaigns()"
                        class="h-10 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none cursor-pointer">
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Sending">Sending</option>
                  <option value="Sent">Sent</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
            </div>

            <!-- Campaigns Table -->
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl overflow-hidden shadow-xs">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-neutral-50 dark:bg-neutral-800/40 text-[10px] font-black uppercase tracking-wider text-neutral-450 border-b border-neutral-150 dark:border-neutral-800">
                    <th class="p-4">Campaign Name</th>
                    <th class="p-4">Type</th>
                    <th class="p-4">Status</th>
                    <th class="p-4">Delivery Performance (Sent / Opens / Clicks)</th>
                    <th class="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-100 dark:divide-neutral-850 text-xs font-bold text-neutral-750 dark:text-neutral-300">
                  <tr *ngFor="let camp of campaigns()" class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                    <td class="p-4">
                      <span class="block text-neutral-900 dark:text-white">{{ camp.name }}</span>
                      <span class="block text-[10px] text-neutral-400 font-medium mt-0.5">{{ camp.title }}</span>
                    </td>
                    <td class="p-4">
                      <span class="px-2 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-600 dark:text-neutral-400">{{ camp.type }}</span>
                    </td>
                    <td class="p-4">
                      <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border"
                            [ngClass]="{
                              'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15': camp.status === 'Sent',
                              'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/15': camp.status === 'Scheduled',
                              'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/15': camp.status === 'Sending',
                              'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/15': camp.status === 'Failed',
                              'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-505/15': camp.status === 'Draft'
                            }">
                        {{ camp.status }}
                      </span>
                    </td>
                    <td class="p-4">
                      @if (camp.analytics && camp.analytics[0]) {
                        <div class="flex items-center gap-3 font-mono">
                          <span>Sends: {{ camp.analytics[0].sentCount }}</span>
                          <span class="text-neutral-400">|</span>
                          <span class="text-blue-500">Opens: {{ camp.analytics[0].openedCount }}</span>
                          <span class="text-neutral-400">|</span>
                          <span class="text-emerald-500">Clicks: {{ camp.analytics[0].clickedCount }}</span>
                        </div>
                      } @else {
                        <span class="text-neutral-400 font-medium">No analytics available</span>
                      }
                    </td>
                    <td class="p-4 text-center">
                      <div class="flex items-center justify-center gap-2">
                        <button *ngIf="camp.status === 'Draft' || camp.status === 'Failed'" 
                                (click)="sendCampaignNow(camp.id)"
                                title="Send Immediately"
                                class="p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-[#f54f00] rounded-lg cursor-pointer border-none">
                          <mat-icon class="text-sm">send</mat-icon>
                        </button>
                        <button (click)="deleteCampaign(camp.id)" 
                                title="Delete"
                                class="p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-red-500 rounded-lg cursor-pointer border-none">
                          <mat-icon class="text-sm">delete</mat-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="campaigns().length === 0">
                    <td colspan="5" class="p-8 text-center text-neutral-400">No campaigns found. Create your first campaign.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 3. CREATE CAMPAIGN WIZARD -->
          <div *ngIf="activeSubTab() === 'create'" class="space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              <!-- Form Block (7 Cols) -->
              <div class="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                
                <!-- Steps Indicators -->
                <div class="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-850">
                  <div class="flex items-center gap-3">
                    <span [class.bg-[#f54f00]]="wizardStep() >= 1" class="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-black">1</span>
                    <span class="text-[10px] font-black uppercase tracking-wider text-neutral-400">Setup</span>
                  </div>
                  <div class="h-[1px] flex-1 mx-3 bg-neutral-200 dark:bg-neutral-800"></div>
                  <div class="flex items-center gap-3">
                    <span [class.bg-[#f54f00]]="wizardStep() >= 2" [class.bg-neutral-200]="wizardStep() < 2" class="h-6 w-6 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-400 text-[10px] font-black">2</span>
                    <span class="text-[10px] font-black uppercase tracking-wider text-neutral-400">Creative</span>
                  </div>
                  <div class="h-[1px] flex-1 mx-3 bg-neutral-200 dark:bg-neutral-800"></div>
                  <div class="flex items-center gap-3">
                    <span [class.bg-[#f54f00]]="wizardStep() >= 3" [class.bg-neutral-200]="wizardStep() < 3" class="h-6 w-6 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-400 text-[10px] font-black">3</span>
                    <span class="text-[10px] font-black uppercase tracking-wider text-neutral-400">Target</span>
                  </div>
                </div>

                <form [formGroup]="campaignForm" class="space-y-5">
                  
                  <!-- STEP 1: CAMPAIGN CONFIG -->
                  <div *ngIf="wizardStep() === 1" class="space-y-4">
                    <div class="space-y-1.5">
                      <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Campaign Name *</label>
                      <input type="text" formControlName="name" placeholder="e.g. Weekend Mega Sale Print mela" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div class="space-y-1.5">
                        <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Campaign Type *</label>
                        <select formControlName="type" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
                          <option *ngFor="let t of campaignTypes" [value]="t">{{ t }}</option>
                        </select>
                      </div>
                      <div class="space-y-1.5">
                        <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Priority</label>
                        <select formControlName="priority" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                    </div>

                    <div class="space-y-1.5 pt-2">
                      <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Select Template Helper (Optional)</label>
                      <select (change)="applyTemplate($event)" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
                        <option value="">No Template (Custom)</option>
                        <option *ngFor="let tmpl of templates()" [value]="tmpl.id">{{ tmpl.name }} ({{ tmpl.category }})</option>
                      </select>
                    </div>
                  </div>

                  <!-- STEP 2: CREATIVE & AI ASSISTANT -->
                  <div *ngIf="wizardStep() === 2" class="space-y-4">
                    
                    <!-- AI Content Generator Panel -->
                    <div class="bg-neutral-50 dark:bg-neutral-950 p-5 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 space-y-3">
                      <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#f54f00]">
                        <mat-icon class="scale-90">auto_awesome</mat-icon>
                        <span>AI Copywriter (Google Gemini)</span>
                      </div>
                      <p class="text-[10px] text-neutral-450 font-medium">Generate high-converting, personalized notification titles and messages instantly.</p>
                      
                      <div class="grid grid-cols-2 gap-3 pt-2">
                        <div class="space-y-1">
                          <label class="text-[9px] font-black uppercase tracking-wider text-neutral-500">Marketing Tone</label>
                          <select [(ngModel)]="aiTone" [ngModelOptions]="{standalone: true}" class="w-full h-9 px-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[10px] font-bold outline-none">
                            <option value="Urgent">Urgent / Flash</option>
                            <option value="Exciting">Exciting / Offer</option>
                            <option value="Friendly">Friendly / Friendly</option>
                            <option value="Professional">Professional</option>
                          </select>
                        </div>
                        <div class="space-y-1">
                          <label class="text-[9px] font-black uppercase tracking-wider text-neutral-500">Language</label>
                          <select [(ngModel)]="aiLang" [ngModelOptions]="{standalone: true}" class="w-full h-9 px-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[10px] font-bold outline-none">
                            <option value="English">English</option>
                            <option value="Tanglish">Tanglish</option>
                          </select>
                        </div>
                      </div>

                      <button (click)="generateAICopy()" [disabled]="aiGenerating()" class="w-full h-9 mt-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-[10px] font-black uppercase tracking-widest transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-none">
                        <mat-icon class="text-xs">{{ aiGenerating() ? 'sync' : 'auto_awesome' }}</mat-icon>
                        <span>{{ aiGenerating() ? 'Generating Copy...' : 'Generate Marketing Copy' }}</span>
                      </button>
                    </div>

                    <!-- Fields -->
                    <div class="space-y-1.5">
                      <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Notification Title *</label>
                      <input type="text" formControlName="title" placeholder="e.g. Weekend Mega Sale! 💥" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
                    </div>

                    <div class="space-y-1.5">
                      <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Notification Body *</label>
                      <textarea formControlName="body" rows="3" [placeholder]="'Write your message here. You can use placeholders like {{customerName}} or {{productName}}.'" class="w-full p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors"></textarea>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div class="space-y-1.5">
                        <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Hero Image URL (Optional)</label>
                        <input type="text" formControlName="image" placeholder="https://domain.com/hero.png" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
                      </div>
                      <div class="space-y-1.5">
                        <label class="text-xs font-black uppercase tracking-wider text-neutral-500">CTA Button Text (Optional)</label>
                        <input type="text" formControlName="ctaText" placeholder="e.g. Shop Now" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
                      </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div class="space-y-1.5">
                        <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Landing Page URL / Action</label>
                        <input type="text" formControlName="actionUrl" placeholder="e.g. /products/bambu-lab-p1s" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
                      </div>
                      <div class="space-y-1.5">
                        <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Deep Link Target</label>
                        <input type="text" formControlName="deepLink" placeholder="e.g. ajrmart://product/uuid" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
                      </div>
                    </div>
                  </div>

                  <!-- STEP 3: AUDIENCE & PRODUCT RECOMMENDATION & SCHEDULER -->
                  <div *ngIf="wizardStep() === 3" class="space-y-5">
                    
                    <!-- Segment Selection -->
                    <div class="space-y-1.5">
                      <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Target Audience Segment</label>
                      <select formControlName="audienceId" class="w-full h-11 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-[#f54f00] rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none transition-colors">
                        <option value="">Broadcast (All Active Devices)</option>
                        <option *ngFor="let aud of audiences()" [value]="aud.id">{{ aud.name }}</option>
                      </select>
                    </div>

                    <!-- Dynamic Product Recommendation -->
                    <div class="bg-neutral-50 dark:bg-neutral-950 p-5 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 space-y-3">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-500">
                          <mat-icon class="scale-90">shopping_bag</mat-icon>
                          <span>Smart Product Recommendations</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <input type="checkbox" [(ngModel)]="includeProductRecommendation" [ngModelOptions]="{standalone: true}" id="chkProduct" class="rounded-sm border-neutral-300 dark:border-neutral-700 text-[#f54f00] focus:ring-[#f54f00] h-4.5 w-4.5 cursor-pointer">
                          <label for="chkProduct" class="text-[10px] font-black uppercase text-neutral-500 select-none cursor-pointer">Enable</label>
                        </div>
                      </div>

                      <div *ngIf="includeProductRecommendation" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div class="space-y-1">
                          <label class="text-[9px] font-black uppercase tracking-wider text-neutral-500">Selection Mode</label>
                          <select [(ngModel)]="recommendMode" [ngModelOptions]="{standalone: true}" class="w-full h-9 px-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[10px] font-bold outline-none">
                            <option value="Best Sellers">Best Sellers</option>
                            <option value="Trending">Trending Products</option>
                            <option value="New Arrivals">New Arrivals</option>
                            <option value="Featured Products">Featured Products</option>
                            <option value="Random Products">Random Products</option>
                          </select>
                        </div>
                        <div class="space-y-1">
                          <label class="text-[9px] font-black uppercase tracking-wider text-neutral-500">Exclusions</label>
                          <div class="flex flex-col gap-1.5 pt-1">
                            <label class="flex items-center gap-2 text-[9px] font-bold text-neutral-600 dark:text-neutral-400">
                              <input type="checkbox" [(ngModel)]="excludeOutOfStock" [ngModelOptions]="{standalone: true}"> Exclude Out of Stock
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Scheduler Options -->
                    <div class="space-y-3">
                      <label class="text-xs font-black uppercase tracking-wider text-neutral-500">Execution Schedule</label>
                      <div class="grid grid-cols-2 gap-4">
                        <label (click)="scheduleType.set('Now')" [ngClass]="{'border-active-orange bg-active-orange': scheduleType() === 'Now'}" class="flex flex-col items-center justify-center p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl cursor-pointer text-center select-none hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                          <mat-icon class="text-lg mb-1">flash_on</mat-icon>
                          <span class="text-[10px] font-black uppercase tracking-wider">Send Now</span>
                        </label>
                        <label (click)="scheduleType.set('Later')" [ngClass]="{'border-active-orange bg-active-orange': scheduleType() === 'Later'}" class="flex flex-col items-center justify-center p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl cursor-pointer text-center select-none hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                          <mat-icon class="text-lg mb-1">schedule</mat-icon>
                          <span class="text-[10px] font-black uppercase tracking-wider">Schedule Later</span>
                        </label>
                      </div>

                      <div *ngIf="scheduleType() === 'Later'" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div class="space-y-1">
                          <label class="text-[9px] font-black uppercase tracking-wider text-neutral-500">Scheduled Date & Time *</label>
                          <input type="datetime-local" formControlName="scheduledAt" class="w-full h-9 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-[10px] font-bold outline-none">
                        </div>
                        <div class="space-y-1">
                          <label class="text-[9px] font-black uppercase tracking-wider text-neutral-500">Target Timezone</label>
                          <select formControlName="timezone" class="w-full h-9 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-[10px] font-bold outline-none">
                            <option value="Asia/Kolkata">IST (Asia/Kolkata)</option>
                            <option value="UTC">UTC (Universal Time)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Navigation Buttons -->
                  <div class="pt-5 border-t border-neutral-100 dark:border-neutral-850 flex items-center justify-between gap-4">
                    <button type="button" 
                            *ngIf="wizardStep() > 1" 
                            (click)="wizardStep.set(wizardStep() - 1)" 
                            class="h-11 px-6 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer bg-transparent">
                      Back
                    </button>
                    <button type="button" 
                            *ngIf="wizardStep() < 3" 
                            (click)="wizardStep.set(wizardStep() + 1)"
                            [disabled]="isStep1Invalid() || isStep2Invalid()"
                            class="h-11 px-8 bg-[#f54f00] hover:bg-orange-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer ml-auto border-none disabled:opacity-50">
                      Next Step
                    </button>
                    <button type="button" 
                            *ngIf="wizardStep() === 3" 
                            (click)="submitCampaign()"
                            [disabled]="submittingCampaign() || campaignForm.invalid"
                            class="h-11 px-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer ml-auto border-none disabled:opacity-50 flex items-center gap-2">
                      <mat-icon class="text-sm">check_circle</mat-icon>
                      <span>{{ submittingCampaign() ? 'Processing...' : (scheduleType() === 'Now' ? 'Broadcast Campaign' : 'Schedule Campaign') }}</span>
                    </button>
                  </div>
                </form>
              </div>

              <!-- Real-Time Mockup Phone Preview (5 Cols) -->
              <div class="lg:col-span-5 space-y-6">
                <!-- Platform selector -->
                <div class="flex items-center justify-center gap-3">
                  <button (click)="previewPlatform.set('android')" [class.bg-neutral-200]="previewPlatform() === 'android'" [class.dark:bg-neutral-800]="previewPlatform() === 'android'" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-none bg-transparent cursor-pointer">Android</button>
                  <button (click)="previewPlatform.set('web')" [class.bg-neutral-200]="previewPlatform() === 'web'" [class.dark:bg-neutral-800]="previewPlatform() === 'web'" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-none bg-transparent cursor-pointer">Web Push</button>
                </div>

                <div class="bg-neutral-100 dark:bg-neutral-950 rounded-[3rem] p-6 border-8 border-neutral-350 dark:border-neutral-800 shadow-xl max-w-sm mx-auto relative overflow-hidden aspect-[9/18] flex flex-col justify-start">
                  <!-- Notch -->
                  <div class="w-24 h-4 bg-black dark:bg-neutral-800 rounded-full mx-auto absolute top-2 left-1/2 -translate-x-1/2"></div>
                  <div class="flex items-center justify-between text-[9px] text-neutral-450 dark:text-neutral-500 font-bold mb-8 select-none">
                    <span>9:41</span>
                    <div class="flex items-center gap-1">
                      <mat-icon class="scale-50">signal_cellular_4_bar</mat-icon>
                      <mat-icon class="scale-50">battery_full</mat-icon>
                    </div>
                  </div>

                  <!-- Push Block -->
                  <div class="bg-white/90 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200/40 dark:border-neutral-800/40 rounded-3xl p-4 shadow-lg space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5">
                        <img src="/favicon.ico" class="w-4 h-4 rounded-xs">
                        <span class="text-[9px] font-black uppercase tracking-wider text-neutral-400">3D GALAXY HUB</span>
                      </div>
                      <span class="text-[8px] text-neutral-400">now</span>
                    </div>
                    
                    <div class="space-y-1">
                      <h4 class="text-xs font-black text-neutral-950 dark:text-white leading-tight">
                        {{ campaignForm.get('title')?.value || 'Title Preview' }}
                      </h4>
                      <p class="text-[10px] text-neutral-500 leading-snug">
                        {{ campaignForm.get('body')?.value || 'Enter a notification title and body message on the left to see this preview render details.' }}
                      </p>
                    </div>

                    <!-- Dynamic Product recommendation render inside Preview -->
                    <div *ngIf="includeProductRecommendation" class="flex items-center gap-3 p-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/50 dark:border-neutral-850/50 rounded-2xl">
                      <div class="h-10 w-10 bg-neutral-200 dark:bg-neutral-850 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                        <mat-icon class="text-neutral-400">image</mat-icon>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-[9px] font-black text-neutral-800 dark:text-neutral-250 truncate">Bambu Lab P1S 3D Printer</p>
                        <p class="text-[8px] font-bold text-neutral-450 mt-0.5">Sale Price: ₹84,999</p>
                      </div>
                    </div>

                    <!-- Hero image -->
                    <div *ngIf="campaignForm.get('image')?.value" class="w-full h-24 rounded-2xl overflow-hidden mt-2 bg-neutral-200 dark:bg-neutral-850">
                      <img [src]="campaignForm.get('image')?.value" alt="Hero Image" class="w-full h-full object-cover">
                    </div>

                    <!-- CTA Buttons -->
                    <div *ngIf="campaignForm.get('ctaText')?.value" class="flex gap-2 pt-1">
                      <div class="flex-1 py-2 bg-[#f54f00] text-white text-center rounded-xl text-[9px] font-black uppercase tracking-wider">
                        {{ campaignForm.get('ctaText')?.value }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- 4. TEMPLATES TAB -->
          <div *ngIf="activeSubTab() === 'templates'" class="space-y-6">
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 p-6 rounded-3xl space-y-4">
              <h3 class="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider pb-3 border-b border-neutral-100 dark:border-neutral-850">Create New Template</h3>
              <form [formGroup]="templateForm" (ngSubmit)="saveTemplate()" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-wider text-neutral-500">Template Name *</label>
                  <input type="text" formControlName="name" placeholder="e.g. Welcoming New Signup" class="w-full h-10 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none">
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-wider text-neutral-500">Category *</label>
                  <select formControlName="category" class="w-full h-10 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none">
                    <option value="Offers">Offers</option>
                    <option value="Flash Sales">Flash Sales</option>
                    <option value="Product Launch">Product Launch</option>
                    <option value="Festival">Festival</option>
                    <option value="Reminder">Reminder</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div class="sm:col-span-2 space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-wider text-neutral-500">Notification Title *</label>
                  <input type="text" formControlName="title" [placeholder]="'e.g. Welcome {{customerName}}!'" class="w-full h-10 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none">
                </div>
                <div class="sm:col-span-2 space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-wider text-neutral-500">Notification Body *</label>
                  <textarea formControlName="body" rows="2" [placeholder]="'e.g. Hi {{customerName}}, check out our bestseller {{productName}} for only {{price}}!'" class="w-full p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none"></textarea>
                </div>
                <!-- Variable helpers -->
                <div class="sm:col-span-2 flex flex-wrap gap-2 text-[10px] font-bold text-neutral-500 pt-1">
                  <span>Click to insert placeholder:</span>
                  <button type="button" (click)="insertPlaceholder('{{customerName}}')" class="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-md cursor-pointer border-none text-inherit font-semibold">{{ '{{customerName}}' }}</button>
                  <button type="button" (click)="insertPlaceholder('{{productName}}')" class="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-md cursor-pointer border-none text-inherit font-semibold">{{ '{{productName}}' }}</button>
                  <button type="button" (click)="insertPlaceholder('{{price}}')" class="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-md cursor-pointer border-none text-inherit font-semibold">{{ '{{price}}' }}</button>
                  <button type="button" (click)="insertPlaceholder('{{couponCode}}')" class="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-md cursor-pointer border-none text-inherit font-semibold">{{ '{{couponCode}}' }}</button>
                </div>
                <div class="sm:col-span-2 pt-2 flex justify-end gap-3">
                  <button type="submit" [disabled]="templateForm.invalid" class="h-10 px-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border-none">Save Template</button>
                </div>
              </form>
            </div>

            <!-- Templates List -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div *ngFor="let tmpl of templates()" class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-5 space-y-3 relative group">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-[10px] font-black uppercase text-neutral-500">{{ tmpl.category }}</span>
                  <button (click)="deleteTemplate(tmpl.id)" class="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-red-500 rounded border-none bg-transparent cursor-pointer">
                    <mat-icon class="text-sm">delete</mat-icon>
                  </button>
                </div>
                <h4 class="text-xs font-black text-neutral-950 dark:text-white">{{ tmpl.name }}</h4>
                <div class="p-3 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200/40 dark:border-neutral-850/40">
                  <p class="text-[10px] font-bold text-neutral-850 dark:text-neutral-200">{{ tmpl.title }}</p>
                  <p class="text-[9px] text-neutral-450 font-medium mt-1 leading-relaxed">{{ tmpl.body }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 5. AUDIENCE TAB -->
          <div *ngIf="activeSubTab() === 'audience'" class="space-y-6">
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 p-6 rounded-3xl space-y-4">
              <h3 class="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider pb-3 border-b border-neutral-100 dark:border-neutral-850">Audience Segment Builder</h3>
              <form [formGroup]="audienceForm" (ngSubmit)="saveAudience()" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-wider text-neutral-500">Segment Name *</label>
                  <input type="text" formControlName="name" placeholder="e.g. Active Cart Abandoners" class="w-full h-10 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none">
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-wider text-neutral-500">Description</label>
                  <input type="text" formControlName="description" placeholder="Short summary of segment rules" class="w-full h-10 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none">
                </div>
                <!-- Rules block -->
                <div class="sm:col-span-2 bg-neutral-50 dark:bg-neutral-950 p-5 rounded-2xl border border-neutral-200/50 dark:border-neutral-850/50 space-y-4">
                  <span class="text-[10px] font-black uppercase tracking-wider text-neutral-500 block">Segment Criteria Rules</span>
                  
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="space-y-1">
                      <label class="text-[9px] font-black uppercase text-neutral-450">Base Target Segment</label>
                      <select (change)="updateAudienceCount()" [(ngModel)]="audTargetType" [ngModelOptions]="{standalone: true}" class="w-full h-9 px-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-lg text-[10px] font-bold outline-none">
                        <option value="all">All Devices</option>
                        <option value="registered">Registered Users Only</option>
                        <option value="guests">Guest Devices Only</option>
                        <option value="cart_abandoners">Cart Abandoners</option>
                        <option value="wishlist">Wishlist Watchers</option>
                        <option value="new_customers">New Customers (Last 7 Days)</option>
                        <option value="returning_customers">Returning Customers</option>
                      </select>
                    </div>
                    <div class="space-y-1">
                      <label class="text-[9px] font-black uppercase text-neutral-450">Device OS Filter</label>
                      <select (change)="updateAudienceCount()" [(ngModel)]="audOs" [ngModelOptions]="{standalone: true}" class="w-full h-9 px-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-lg text-[10px] font-bold outline-none">
                        <option value="">Any OS</option>
                        <option value="Android">Android</option>
                        <option value="Windows">Windows</option>
                        <option value="macOS">macOS</option>
                        <option value="iOS">iOS</option>
                      </select>
                    </div>
                    <div class="space-y-1">
                      <label class="text-[9px] font-black uppercase text-neutral-450">Language</label>
                      <select (change)="updateAudienceCount()" [(ngModel)]="audLang" [ngModelOptions]="{standalone: true}" class="w-full h-9 px-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-lg text-[10px] font-bold outline-none">
                        <option value="">Any Language</option>
                        <option value="en">English (en)</option>
                        <option value="ta">Tamil (ta)</option>
                      </select>
                    </div>
                  </div>

                  <div class="flex items-center justify-between pt-2 border-t border-neutral-200/50 dark:border-neutral-850/50">
                    <span class="text-[10px] font-bold text-neutral-500">Estimated Reach: <span class="font-black text-neutral-900 dark:text-white">{{ audienceReachCount() }} devices</span></span>
                  </div>
                </div>

                <div class="sm:col-span-2 pt-2 flex justify-end gap-3">
                  <button type="submit" [disabled]="audienceForm.invalid" class="h-10 px-6 bg-[#f54f00] hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm">Save Segment</button>
                </div>
              </form>
            </div>

            <!-- Audience List -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div *ngFor="let aud of audiences()" class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-5 space-y-2">
                <h4 class="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider">{{ aud.name }}</h4>
                <p class="text-[10px] text-neutral-450 font-medium">{{ aud.description || 'No description provided' }}</p>
                <div class="p-3 bg-neutral-50 dark:bg-neutral-950 rounded-xl text-[9px] font-mono text-neutral-500 space-y-1">
                  <div>Type: {{ aud.rules?.targetType }}</div>
                  <div>OS: {{ aud.rules?.os || 'Any' }} | Lang: {{ aud.rules?.language || 'Any' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 6. AUTOMATION TAB -->
          <div *ngIf="activeSubTab() === 'automation'" class="space-y-6">
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 p-6 rounded-3xl space-y-6">
              <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-850">
                <h3 class="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">Automated Notification Workflows</h3>
                <span class="px-2 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">Active Engine</span>
              </div>

              <!-- Workflows List (Mocked/Pre-configured interactive triggers) -->
              <div class="space-y-6">
                <div *ngFor="let wf of automations" class="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-[#f54f00] scale-90">{{ wf.icon }}</mat-icon>
                      <h4 class="text-xs font-black text-neutral-950 dark:text-white uppercase tracking-wider">{{ wf.name }}</h4>
                    </div>
                    <!-- Switch toggle -->
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" [(ngModel)]="wf.enabled" class="sr-only peer">
                      <div class="w-9 h-5 bg-neutral-200 peer-focus:outline-none dark:bg-neutral-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-[#f54f00]"></div>
                    </label>
                  </div>
                  <p class="text-[10px] text-neutral-450 font-medium leading-relaxed">{{ wf.description }}</p>
                  
                  <!-- Flow visual representation -->
                  <div class="flex items-center gap-2 overflow-x-auto py-1">
                    <div class="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-950 rounded-lg text-[9px] font-black uppercase tracking-wider text-neutral-500 border border-neutral-200/50 dark:border-neutral-850/50">
                      Trigger Event
                    </div>
                    <mat-icon class="text-neutral-300 scale-75">arrow_forward</mat-icon>
                    <div class="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-950 rounded-lg text-[9px] font-black uppercase tracking-wider text-neutral-500 border border-neutral-200/50 dark:border-neutral-850/50 flex items-center gap-1">
                      <mat-icon class="scale-75 text-neutral-400">schedule</mat-icon>
                      <span>Delay: {{ wf.delay }}</span>
                    </div>
                    <mat-icon class="text-neutral-300 scale-75">arrow_forward</mat-icon>
                    <div class="px-3 py-1.5 bg-[#f54f00]/10 text-[#f54f00] rounded-lg text-[9px] font-black uppercase tracking-wider border border-[#f54f00]/20 flex items-center gap-1">
                      <mat-icon class="scale-75">notifications_active</mat-icon>
                      <span>FCM Send</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 7. SETTINGS TAB -->
          <div *ngIf="activeSubTab() === 'settings'" class="space-y-6">
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 p-6 rounded-3xl space-y-6">
              <h3 class="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider pb-3 border-b border-neutral-100 dark:border-neutral-850">Global Push Notification Config</h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-wider text-neutral-500">Default Notification Icon URL</label>
                  <input type="text" [(ngModel)]="defaultIconUrl" placeholder="https://domain.com/icon.png" class="w-full h-10 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none">
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-wider text-neutral-500">Default Topic Subscription</label>
                  <input type="text" [(ngModel)]="defaultTopicName" placeholder="e.g. Broadcast_Mela" class="w-full h-10 px-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none">
                </div>
              </div>

              <!-- Test Sender section -->
              <div class="p-5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850/50 space-y-4">
                <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#f54f00]">
                  <mat-icon class="scale-90">send</mat-icon>
                  <span>Direct Test FCM Sender</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div class="sm:col-span-3 space-y-1.5">
                    <label class="text-[9px] font-black uppercase text-neutral-500">FCM Registration Token</label>
                    <input type="text" [(ngModel)]="testFcmToken" placeholder="fcm_token_value_here" class="w-full h-9 px-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-lg text-[10px] font-bold outline-none">
                  </div>
                  <div class="space-y-1">
                    <label class="text-[9px] font-black uppercase text-neutral-500">Test Title</label>
                    <input type="text" [(ngModel)]="testTitle" class="w-full h-9 px-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-lg text-[10px] font-bold outline-none">
                  </div>
                  <div class="sm:col-span-2 space-y-1">
                    <label class="text-[9px] font-black uppercase text-neutral-500">Test Body</label>
                    <input type="text" [(ngModel)]="testBody" class="w-full h-9 px-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-lg text-[10px] font-bold outline-none">
                  </div>
                </div>
                <button type="button" (click)="sendTestPush()" [disabled]="!testFcmToken || testingPush()" class="h-9 px-5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-[10px] font-black uppercase tracking-widest rounded-lg border-none cursor-pointer flex items-center justify-center gap-2">
                  <mat-icon class="text-xs">bug_report</mat-icon>
                  <span>{{ testingPush() ? 'Sending Test...' : 'Send Test Notification' }}</span>
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  `
})
export class PushNotificationsComponent implements OnInit {
  private api = inject(ApiService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  // Submenu configuration
  submenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'campaigns', label: 'Campaigns', icon: 'campaign' },
    { id: 'create', label: 'Create Campaign', icon: 'add_circle' },
    { id: 'templates', label: 'Templates', icon: 'description' },
    { id: 'audience', label: 'Audience Builder', icon: 'groups' },
    { id: 'automation', label: 'Automation', icon: 'bolt' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  activeSubTab = signal<string>('dashboard');
  wizardStep = signal<number>(1);
  previewPlatform = signal<string>('android');

  // Loaders
  analyticsLoading = signal(false);
  campaignsLoading = signal(false);
  templatesLoading = signal(false);
  audiencesLoading = signal(false);

  // Data signals
  campaigns = signal<any[]>([]);
  templates = signal<any[]>([]);
  audiences = signal<any[]>([]);
  dailyTrends = signal<any[]>([]);

  // Search & Filter
  searchQuery = '';
  filterType = '';
  filterStatus = '';

  // KPI States
  kpiCards: { label: string; value: string; subtext: string; trendClass?: string }[] = [];
  maxSendsValue = signal<number>(1);

  // AI copywriting states
  aiGenerating = signal(false);
  aiTone = 'Exciting';
  aiLang = 'English';

  // Product Recommendation states
  includeProductRecommendation = false;
  recommendMode = 'Best Sellers';
  excludeOutOfStock = true;

  // Schedule states
  scheduleType = signal<string>('Now');
  submittingCampaign = signal(false);

  // Audience counts
  audTargetType = 'all';
  audOs = '';
  audLang = '';
  audienceReachCount = signal<number>(0);

  // Templates
  templateForm!: FormGroup;

  // Audiences
  audienceForm!: FormGroup;

  // Settings
  defaultIconUrl = '/assets/icon.png';
  defaultTopicName = 'Offers';
  testFcmToken = '';
  testTitle = '⚡ Test Push Alert';
  testBody = 'This is a test notification compiled from the developer console.';
  testingPush = signal(false);

  // Campaign builder Form
  campaignForm!: FormGroup;

  // Pre-configured Automation workflows
  automations = [
    { id: 'welcome', name: 'Welcome Notification', description: 'Triggered when a guest registers their device token.', delay: 'Instant', icon: 'child_care', enabled: true },
    { id: 'cart', name: 'Abandoned Cart Recovery', description: 'Triggered 1 hour after a customer abandons their checkout step.', delay: '1 Hour', icon: 'shopping_cart', enabled: true },
    { id: 'birthday', name: 'Birthday wishes & Offers', description: 'Triggered on user\'s date of birth in their local timezone.', delay: '9:00 AM', icon: 'cake', enabled: false },
    { id: 'back_stock', name: 'Product Back in Stock', description: 'Alert customers automatically when watched items have stock > 0.', delay: '10 Min', icon: 'storefront', enabled: true }
  ];

  campaignTypes = [
    'Promotional',
    'Flash Sale',
    'New Product',
    'Back In Stock',
    'Price Drop',
    'Bundle Offer',
    'Festival Offer',
    'Cart Reminder',
    'Wishlist Reminder',
    'Order Update',
    'Custom'
  ];

  ngOnInit() {
    this.initForms();
    this.loadAllData();
  }

  initForms() {
    this.campaignForm = this.fb.group({
      name: ['', Validators.required],
      type: ['Promotional', Validators.required],
      title: ['', Validators.required],
      body: ['', Validators.required],
      image: [''],
      ctaText: [''],
      actionUrl: [''],
      deepLink: [''],
      priority: ['Normal'],
      audienceId: [''],
      scheduledAt: [''],
      timezone: ['Asia/Kolkata']
    });

    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      category: ['Offers', Validators.required],
      title: ['', Validators.required],
      body: ['', Validators.required]
    });

    this.audienceForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  loadAllData() {
    this.loadAnalytics();
    this.loadCampaigns();
    this.loadTemplates();
    this.loadAudiences();
    this.updateAudienceCount();
  }

  selectSubmenu(id: string) {
    this.activeSubTab.set(id);
    if (id === 'dashboard') {
      this.loadAnalytics();
    } else if (id === 'campaigns') {
      this.loadCampaigns();
    } else if (id === 'templates') {
      this.loadTemplates();
    } else if (id === 'audience') {
      this.loadAudiences();
      this.updateAudienceCount();
    }
  }

  loadAnalytics() {
    this.analyticsLoading.set(true);
    this.api.get<any>('/admin/push/analytics').subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (data) {
          const sum = data.summary || {};
          this.kpiCards = [
            { label: 'Total Campaigns', value: String(sum.totalCampaigns || 0), subtext: 'Created overall' },
            { label: 'Active Runs', value: String(sum.activeCampaigns || 0), subtext: 'In processing stage', trendClass: 'text-blue-500' },
            { label: 'Sends Count', value: String(sum.notificationsSent || 0), subtext: 'Overall dispatches' },
            { label: 'Delivered', value: String(sum.delivered || 0), subtext: 'Total delivered successfully', trendClass: 'text-emerald-500' },
            { label: 'CTR (Clicks)', value: `${sum.ctr || 0}%`, subtext: `${sum.opened || 0} Clicked responses`, trendClass: 'text-orange-500' },
            { label: 'Revenue Generated', value: `₹${Number(sum.revenueGenerated || 0).toLocaleString()}`, subtext: 'From campaign attribution', trendClass: 'text-emerald-500 font-black' },
            { label: 'Opt-in Devices', value: String(sum.totalDevices || 0), subtext: 'Subscribed client tokens' },
            { label: 'Bounce Rate', value: `${sum.failedDeliveries || 0} failed`, subtext: 'FCM expired/revoked token cleanups', trendClass: 'text-red-500' }
          ];

          if (data.dailyTrends && Array.isArray(data.dailyTrends)) {
            this.dailyTrends.set(data.dailyTrends);
            const maxVal = Math.max(...data.dailyTrends.map((t: any) => t.sends), 1);
            this.maxSendsValue.set(maxVal);
          }
        }
      },
      error: (err: any) => this.toastService.error('Failed to load dashboard metrics.'),
      finalize: () => this.analyticsLoading.set(false)
    } as any);
  }

  loadCampaigns() {
    this.campaignsLoading.set(true);
    let url = `/admin/push/campaigns?page=1&limit=20`;
    if (this.searchQuery) url += `&search=${encodeURIComponent(this.searchQuery)}`;
    if (this.filterType) url += `&type=${encodeURIComponent(this.filterType)}`;
    if (this.filterStatus) url += `&status=${encodeURIComponent(this.filterStatus)}`;

    this.api.get<any>(url).subscribe({
      next: (res: any) => {
        if (res?.data?.list) {
          this.campaigns.set(res.data.list);
        }
      },
      error: () => this.toastService.error('Failed to fetch campaigns list.'),
      finalize: () => this.campaignsLoading.set(false)
    } as any);
  }

  loadTemplates() {
    this.templatesLoading.set(true);
    this.api.get<any>('/admin/push/templates').subscribe({
      next: (res: any) => {
        if (res?.data) this.templates.set(res.data);
      },
      finalize: () => this.templatesLoading.set(false)
    } as any);
  }

  loadAudiences() {
    this.audiencesLoading.set(true);
    this.api.get<any>('/admin/push/audience').subscribe({
      next: (res: any) => {
        if (res?.data) this.audiences.set(res.data);
      },
      finalize: () => this.audiencesLoading.set(false)
    } as any);
  }

  resetWizard() {
    this.wizardStep.set(1);
    this.campaignForm.reset({
      type: 'Promotional',
      priority: 'Normal',
      timezone: 'Asia/Kolkata'
    });
    this.includeProductRecommendation = false;
    this.recommendMode = 'Best Sellers';
    this.scheduleType.set('Now');
  }

  isStep1Invalid(): boolean {
    return !this.campaignForm.get('name')?.value || !this.campaignForm.get('type')?.value;
  }

  isStep2Invalid(): boolean {
    return !this.campaignForm.get('title')?.value || !this.campaignForm.get('body')?.value;
  }

  applyTemplate(event: any) {
    const id = event.target.value;
    if (!id) return;
    const tmpl = this.templates().find(t => t.id === id);
    if (tmpl) {
      this.campaignForm.patchValue({
        title: tmpl.title,
        body: tmpl.body,
        actionUrl: tmpl.actionUrl || ''
      });
      this.toastService.success(`Applied template "${tmpl.name}"`);
    }
  }

  generateAICopy() {
    this.aiGenerating.set(true);
    const type = this.campaignForm.get('type')?.value;
    const body = {
      campaignType: type,
      marketingTone: this.aiTone,
      language: this.aiLang
    };

    this.api.post<any>('/admin/push/ai-generate', body).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.campaignForm.patchValue({
            title: res.data.title,
            body: res.data.body,
            ctaText: res.data.ctaText || ''
          });
          this.toastService.success('AI Marketing copy generated successfully.');
        }
      },
      error: () => this.toastService.error('AI Generation service currently offline.'),
      finalize: () => this.aiGenerating.set(false)
    } as any);
  }

  submitCampaign() {
    this.submittingCampaign.set(true);
    const formVals = this.campaignForm.value;

    const body: any = {
      ...formVals,
      aiGenerated: this.campaignForm.get('title')?.dirty || false,
      status: this.scheduleType() === 'Now' ? 'Draft' : 'Scheduled',
      productsConfig: this.includeProductRecommendation ? {
        mode: this.recommendMode,
        limit: 3,
        excludeOutOfStock: this.excludeOutOfStock
      } : { mode: 'None' }
    };

    this.api.post<any>('/admin/push/campaign', body).subscribe({
      next: (res: any) => {
        const campaignId = res?.data?.id;
        if (campaignId) {
          if (this.scheduleType() === 'Now') {
            // Trigger instant queue & dispatch
            this.sendCampaignNow(campaignId);
          } else {
            // Trigger schedule endpoint to establish Cron/Schedule
            const scheduleBody = {
              campaignId,
              scheduledAt: formVals.scheduledAt,
              timezone: formVals.timezone,
              scheduleType: 'Specific Date & Time'
            };
            this.api.post<any>('/admin/push/schedule', scheduleBody).subscribe({
              next: () => {
                this.toastService.success('Campaign scheduled successfully.');
                this.selectSubmenu('campaigns');
              },
              error: (err: any) => this.toastService.error(`Failed to register schedule: ${err.message}`)
            } as any);
          }
        }
      },
      error: (err: any) => {
        this.toastService.error(`Failed to create campaign: ${err.message}`);
        this.submittingCampaign.set(false);
      }
    } as any);
  }

  sendCampaignNow(campaignId: string) {
    this.api.post<any>('/admin/push/send', { campaignId }).subscribe({
      next: () => {
        this.toastService.success('Notification campaign compiled and broadcasting!');
        this.loadCampaigns();
        this.selectSubmenu('campaigns');
      },
      error: (err: any) => this.toastService.error(`Broadcast failed: ${err.message}`),
      finalize: () => this.submittingCampaign.set(false)
    } as any);
  }

  deleteCampaign(id: string) {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    this.api.delete<any>(`/admin/push/campaign/${id}`).subscribe({
      next: () => {
        this.toastService.success('Campaign deleted.');
        this.loadCampaigns();
      }
    } as any);
  }

  // Templates
  saveTemplate() {
    const vals = this.templateForm.value;
    this.api.post<any>('/admin/push/templates', vals).subscribe({
      next: () => {
        this.toastService.success('Template saved.');
        this.templateForm.reset({ category: 'Offers' });
        this.loadTemplates();
      }
    } as any);
  }

  deleteTemplate(id: string) {
    this.api.delete<any>(`/admin/push/templates/${id}`).subscribe({
      next: () => {
        this.toastService.success('Template deleted.');
        this.loadTemplates();
      }
    } as any);
  }

  insertPlaceholder(variable: string) {
    const bodyCtrl = this.templateForm.get('body');
    if (bodyCtrl) {
      bodyCtrl.setValue(bodyCtrl.value + ' ' + variable);
    }
  }

  // Audiences
  updateAudienceCount() {
    const rules = {
      targetType: this.audTargetType,
      os: this.audOs || null,
      language: this.audLang || null
    };

    this.api.post<any>('/admin/push/audience/count', { rules }).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.audienceReachCount.set(res.data.count);
        }
      }
    } as any);
  }

  saveAudience() {
    const vals = this.audienceForm.value;
    const body = {
      ...vals,
      rules: {
        targetType: this.audTargetType,
        os: this.audOs || null,
        language: this.audLang || null
      }
    };

    this.api.post<any>('/admin/push/audience', body).subscribe({
      next: () => {
        this.toastService.success('Segment created.');
        this.audienceForm.reset();
        this.loadAudiences();
      }
    } as any);
  }

  // Test Push
  sendTestPush() {
    this.testingPush.set(true);
    const body = {
      fcmToken: this.testFcmToken,
      title: this.testTitle,
      body: this.testBody,
      actionUrl: '/'
    };

    this.api.post<any>('/admin/push/test', body).subscribe({
      next: () => {
        this.toastService.success('Test notification delivered successfully!');
      },
      error: (err: any) => this.toastService.error(`Test failed: ${err.message}`),
      finalize: () => this.testingPush.set(false)
    } as any);
  }

  // Formatting helpers
  getPercent(val: number, total: number): number {
    if (!total) return 0;
    return Math.round((val / total) * 100);
  }

  formatDateLabel(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : dateStr;
  }
}
