import { Component, ChangeDetectionStrategy, inject, signal, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-support-request-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] font-sans">
        
        <!-- Header -->
        <div class="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <mat-icon class="text-xl">support_agent</mat-icon>
            </div>
            <div>
              <h2 class="text-base font-black uppercase tracking-tight flex items-center gap-2">
                Need Help With Your Order?
              </h2>
              <p class="text-[10px] text-blue-100 font-medium">Order #{{ order?.orderNumber }} &middot; Support Dialog</p>
            </div>
          </div>
          <button (click)="close.emit()" class="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center border-none bg-transparent text-white cursor-pointer transition-colors">
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>

        <!-- Body Form -->
        <div class="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-left">
          
          <!-- Support Type * -->
          <div class="space-y-1">
            <label class="block text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400">
              Support Type <span class="text-rose-500">*</span>
            </label>
            <select
              [(ngModel)]="selectedSupportType"
              class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="Return">Return</option>
              <option value="Refund">Refund</option>
              <option value="Exchange">Exchange</option>
              <option value="Damaged">Damaged</option>
              <option value="Wrong Product">Wrong Product</option>
              <option value="Missing Items">Missing Items</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <!-- Reason * -->
          <div class="space-y-1">
            <label class="block text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400">
              Reason <span class="text-rose-500">*</span>
            </label>
            <select
              [(ngModel)]="selectedReason"
              class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="Changed Mind">Changed Mind</option>
              <option value="Product Damaged">Product Damaged</option>
              <option value="Defective Product">Defective Product</option>
              <option value="Wrong Item">Wrong Item</option>
              <option value="Missing Parts">Missing Parts</option>
              <option value="Received Different Variant">Received Different Variant</option>
              <option value="Packaging Damaged">Packaging Damaged</option>
              <option value="Quality Issue">Quality Issue</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <!-- Additional Comments -->
          <div class="space-y-1">
            <div class="flex justify-between items-center">
              <label class="block text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400">
                Additional Comments
              </label>
              <span class="text-[9px] text-zinc-450 font-bold font-mono">
                {{ comments().length }}/1000
              </span>
            </div>
            <textarea
              rows="3"
              [value]="comments()"
              (input)="updateComments($any($event.target).value)"
              placeholder="Provide context or explanation here..."
              class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-medium text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-all"
            ></textarea>
          </div>

          <!-- Preferred Contact Method -->
          <div class="space-y-2">
            <label class="block text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400">
              Preferred Contact Method
            </label>
            <div class="flex items-center gap-6 mt-1">
              <label class="flex items-center gap-2 cursor-pointer font-bold text-zinc-800 dark:text-zinc-200">
                <input type="radio" name="contactMethod" value="WhatsApp" [(ngModel)]="preferredContactMethod" class="w-4 h-4 accent-blue-600 cursor-pointer">
                <span>WhatsApp</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer font-bold text-zinc-800 dark:text-zinc-200">
                <input type="radio" name="contactMethod" value="Email" [(ngModel)]="preferredContactMethod" class="w-4 h-4 accent-blue-600 cursor-pointer">
                <span>Email</span>
              </label>
            </div>
          </div>

          <!-- Attachments (Optional) -->
          <div class="space-y-2">
            <label class="block text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400">
              Attachment (Optional)
            </label>
            
            <div class="flex items-center gap-3">
              <button
                type="button"
                (click)="fileInput.click()"
                [disabled]="uploading()"
                class="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5 border-none"
              >
                <mat-icon class="text-sm">attach_file</mat-icon>
                <span>{{ uploading() ? 'Uploading...' : 'Choose File' }}</span>
              </button>
              <span class="text-[10px] text-zinc-400 font-medium">Images, PDF, or Video (Max 10MB)</span>
            </div>

            <input
              type="file"
              #fileInput
              (change)="onFileSelected($event)"
              accept="image/*,application/pdf,video/*"
              class="hidden"
            />

            <!-- Attachment List -->
            @if (attachmentsList().length > 0) {
              <div class="space-y-2 mt-2">
                @for (file of attachmentsList(); track file.url; let i = $index) {
                  <div class="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <div class="flex items-center gap-2 overflow-hidden">
                      <mat-icon class="text-zinc-400 text-base shrink-0">
                        {{ file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'movie' : 'picture_as_pdf' }}
                      </mat-icon>
                      <span class="font-bold truncate text-[11px] text-zinc-700 dark:text-zinc-300">
                        {{ file.name }}
                      </span>
                    </div>
                    <button
                      type="button"
                      (click)="removeAttachment(i)"
                      class="text-red-500 hover:bg-red-550 dark:hover:bg-red-950/20 p-1 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                    >
                      <mat-icon class="text-sm">delete</mat-icon>
                    </button>
                  </div>
                }
              </div>
            }
          </div>

        </div>

        <!-- Footer -->
        <div class="p-6 border-t dark:border-zinc-800 flex items-center justify-end gap-3 shrink-0 bg-zinc-50 dark:bg-zinc-900/50">
          <button
            (click)="close.emit()"
            [disabled]="submitting()"
            class="px-5 py-2.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition-all cursor-pointer border-none"
          >
            Cancel
          </button>
          
          <button
            (click)="onSubmit()"
            [disabled]="submitting() || uploading()"
            class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 border-none flex items-center gap-1.5"
          >
            @if (submitting()) {
              <div class="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Submitting...</span>
            } @else {
              <mat-icon class="text-sm">send</mat-icon>
              <span>Submit Request</span>
            }
          </button>
        </div>

      </div>
    </div>
  `,
})
export class SupportRequestDialogComponent implements OnInit {
  @Input() order: any = null;
  @Input() supportType: string = 'Return';
  @Output() close = new EventEmitter<void>();

  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private settingsService = inject(SettingsService);

  selectedSupportType = 'Return';
  selectedReason = 'Changed Mind';
  comments = signal('');
  preferredContactMethod = 'WhatsApp';
  attachmentsList = signal<Array<{url: string, name: string, type: string}>>([]);

  uploading = signal(false);
  submitting = signal(false);

  ngOnInit() {
    if (this.supportType) {
      this.selectedSupportType = this.supportType;
      // Pre-select reasonable default reason based on support type
      if (this.supportType === 'Damaged') {
        this.selectedReason = 'Product Damaged';
      } else if (this.supportType === 'Wrong Product') {
        this.selectedReason = 'Wrong Item';
      } else if (this.supportType === 'Missing Items') {
        this.selectedReason = 'Missing Parts';
      } else {
        this.selectedReason = 'Changed Mind';
      }
    }
  }

  updateComments(val: string) {
    if (val.length <= 1000) {
      this.comments.set(val);
    } else {
      this.comments.set(val.substring(0, 1000));
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check size limit: configurable max size in settings, or default 10MB
    const limitMb = this.settingsService.supportSettings()?.maxAttachmentSizeMb || 10;
    const limitBytes = limitMb * 1024 * 1024;
    if (file.size > limitBytes) {
      this.toastService.error(`File size exceeds limit of ${limitMb}MB.`);
      event.target.value = '';
      return;
    }

    this.uploading.set(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res: any = await firstValueFrom(
        this.http.post<any>('/api/support/upload', formData)
      );
      if (res && res.success && res.data) {
        this.attachmentsList.update(list => [...list, res.data]);
        this.toastService.success('File uploaded successfully.');
      } else {
        throw new Error('Upload failed');
      }
    } catch (err: any) {
      console.error(err);
      this.toastService.error(err.error?.error || 'Failed to upload attachment.');
    } finally {
      this.uploading.set(false);
      event.target.value = '';
    }
  }

  removeAttachment(index: number) {
    this.attachmentsList.update(list => list.filter((_, i) => i !== index));
  }

  async onSubmit() {
    this.submitting.set(true);

    try {
      const payload = {
        orderId: this.order.id,
        supportType: this.selectedSupportType,
        reason: this.selectedReason,
        comments: this.comments(),
        preferredContactMethod: this.preferredContactMethod,
        attachments: this.attachmentsList()
      };

      const res: any = await firstValueFrom(
        this.http.post<any>('/api/support/request', payload)
      );

      if (res && res.success) {
        this.toastService.success('Support request logged successfully.');
        
        // Open preferred client
        if (this.preferredContactMethod === 'WhatsApp' && res.data.whatsappUrl) {
          window.open(res.data.whatsappUrl, '_blank');
        } else if (this.preferredContactMethod === 'Email' && res.data.emailUrl) {
          window.location.href = res.data.emailUrl;
        }
        
        this.close.emit();
      } else {
        throw new Error('Request creation failed');
      }
    } catch (err: any) {
      console.error(err);
      this.toastService.error(err.error?.error || 'Failed to submit support request.');
    } finally {
      this.submitting.set(false);
    }
  }
}
