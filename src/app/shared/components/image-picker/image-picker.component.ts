import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType, HttpEvent } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-image-picker',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3 font-sans" [id]="id">
      @if (label) {
        <span class="block text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">{{ label }}</span>
      }

      <!-- Select Mode Tab Buttons -->
      <div class="flex items-center space-x-4 bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-xl w-fit">
        <button 
          type="button"
          (click)="setMode('upload')"
          [class]="mode() === 'upload' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-650'"
          class="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all duration-200 cursor-pointer border-none flex items-center gap-1.5"
        >
          <mat-icon class="scale-75">cloud_upload</mat-icon>
          Upload File
        </button>
        <button 
          type="button"
          (click)="setMode('url')"
          [class]="mode() === 'url' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-650'"
          class="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all duration-200 cursor-pointer border-none flex items-center gap-1.5"
        >
          <mat-icon class="scale-75">link</mat-icon>
          Image URL
        </button>
      </div>

      <!-- MAIN AREA -->

      <!-- MODE 1: FILE UPLOAD -->
      @if (mode() === 'upload') {
        <div class="space-y-4">
          @if (!value) {
            <!-- Drop & Click Zone -->
            <div 
              class="relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all min-h-32 bg-zinc-50/50 dark:bg-zinc-950/20"
              [class]="isDragging() ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-200 dark:border-zinc-800'"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave()"
              (drop)="onDrop($event)"
              (click)="fileInput.click()"
            >
              <input 
                type="file" 
                #fileInput 
                [accept]="allowedTypes" 
                (change)="onFileChange($event)" 
                class="hidden"
              >
              
              @if (isUploading()) {
                <div class="flex flex-col items-center space-y-2 py-4">
                  <div class="relative w-12 h-12 flex items-center justify-center">
                    <!-- Loading ring -->
                    <div class="absolute inset-0 border-4 border-zinc-100 dark:border-zinc-900 rounded-full"></div>
                    <div class="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                    <span class="text-[10px] font-black text-blue-500">{{ progress() }}%</span>
                  </div>
                  <span class="text-[10px] font-black uppercase text-blue-500 animate-pulse">Uploading to Firebase Storage ({{ progress() }}%)</span>
                </div>
              } @else {
                <div class="h-10 w-10 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-blue-500 transition-colors mb-3">
                  <mat-icon>cloud_upload</mat-icon>
                </div>
                <span class="text-[11px] font-black uppercase text-zinc-900 dark:text-white leading-none">Choose File or Slide Inside</span>
                <p class="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1 uppercase font-semibold tracking-wide">JPG, JPEG, PNG, WEBP, SVG (Max 10MB)</p>
              }
            </div>
          } @else {
            <!-- Upload Success Preview Box -->
            <div class="relative group rounded-2xl overflow-hidden border border-zinc-150 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-3 w-fit min-w-40 min-h-32">
              <img 
                [src]="value" 
                alt="Uploaded media preview" 
                class="max-h-40 rounded-xl object-contain shadow-sm bg-white dark:bg-zinc-900"
                referrerpolicy="no-referrer"
              >
              
              <!-- Floating Controls overlay on hover -->
              <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
                <a [href]="value" target="_blank" class="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-all border-none">
                  <mat-icon class="scale-90">open_in_new</mat-icon>
                </a>
                <button type="button" (click)="deleteUploadedFile()" class="w-8 h-8 rounded-xl bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center cursor-pointer transition-all border-none">
                  <mat-icon class="scale-90">delete_forever</mat-icon>
                </button>
              </div>

              <!-- Firebase Status badge -->
              <div class="absolute top-2 right-2 bg-emerald-500/90 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                <div class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                Firebase Storage Ready
              </div>
            </div>
          }
        </div>
      }

      <!-- MODE 2: DIRECT IMAGE URL -->
      @if (mode() === 'url') {
        <div class="space-y-4">
          <div class="flex items-center space-x-2">
            <div class="relative flex-1">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <mat-icon class="scale-75">link</mat-icon>
              </span>
              <input 
                type="text" 
                [value]="value || ''" 
                (input)="onUrlInput($any($event.target).value)"
                placeholder="https://example.com/media/hero.jpg" 
                class="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none font-medium text-zinc-900 dark:text-white"
              >
            </div>
            @if (value) {
              <button 
                type="button" 
                (click)="clearUrl()"
                class="px-3.5 py-2 whitespace-nowrap text-[9px] font-black uppercase text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-xl hover:bg-red-100 border-none cursor-pointer"
              >
                Clear
              </button>
            }
          </div>

          @if (value) {
            <!-- URL Source Preview Container -->
            <div class="relative group rounded-2xl overflow-hidden border border-zinc-150 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-3 w-fit min-w-40 min-h-32">
              <img 
                [src]="value" 
                alt="URL resource preview" 
                class="max-h-40 rounded-xl object-contain shadow-sm bg-white dark:bg-zinc-900" 
                (error)="onUrlImageError()"
                referrerpolicy="no-referrer"
              >
              
              <!-- Validation badge -->
              @if (isUrlValid()) {
                <div class="absolute top-2 right-2 bg-blue-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                  <mat-icon class="scale-75 !h-3 !w-3 text-white">verified</mat-icon>
                  Valid Link
                </div>
              } @else {
                <div class="absolute top-2 right-2 bg-red-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                  <mat-icon class="scale-75 !h-3 !w-3 text-white">warning</mat-icon>
                  Invalid Image URL
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [],
})
export class ImagePickerComponent {
  @Input() id: string = 'image-picker-' + Math.round(Math.random() * 1e5);
  @Input() label: string = '';
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();

  private http = inject(HttpClient);
  private toast = inject(ToastService);

  allowedTypes = 'image/jpeg,image/jpg,image/png,image/webp,image/svg+xml';
  maxSizeBytes = 10 * 1024 * 1024; // 10MB

  mode = signal<'upload' | 'url'>('upload');
  isDragging = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  progress = signal<number>(0);
  isUrlValid = signal<boolean>(true);

  constructor() {
    // Determine initial mode based on whether an external URL exists or not
    effect(() => {
      if (this.value) {
        if (this.value.includes('firebasestorage.googleapis.com') || this.value.includes('storage.googleapis.com')) {
          this.mode.set('upload');
        } else if (this.value.startsWith('http://') || this.value.startsWith('https://')) {
          this.mode.set('url');
        }
      }
    });
  }

  setMode(mode: 'upload' | 'url') {
    this.mode.set(mode);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (!this.isUploading()) {
      this.isDragging.set(true);
    }
  }

  onDragLeave() {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (this.isUploading()) return;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.processAndUploadFile(file);
    }
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.processAndUploadFile(file);
    }
  }

  private processAndUploadFile(file: File) {
    // Type validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      this.toast.error('Allowed types: JPG, JPEG, PNG, WEBP, SVG');
      return;
    }

    // Size validation
    if (file.size > this.maxSizeBytes) {
      this.toast.error('Maximum allowed size is 10 MB');
      return;
    }

    // Initiate Upload
    this.isUploading.set(true);
    this.progress.set(10);

    const formData = new FormData();
    formData.append('image', file);

    this.http.post<any>('/api/admin/upload-image', formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const rawPercentage = Math.round((event.loaded / event.total) * 100);
          // Scale from 10 to 95 for client feedback, final answer gives 100
          this.progress.set(Math.max(10, Math.min(95, rawPercentage)));
        } else if (event.type === HttpEventType.Response) {
          const response = event.body;
          if (response && response.success && response.url) {
            this.progress.set(100);
            setTimeout(() => {
              this.value = response.url;
              this.valueChange.emit(this.value);
              this.isUploading.set(false);
              this.toast.success('Image Uploaded Successfully');
            }, 300);
          } else {
            this.handleUploadError();
          }
        }
      },
      error: (err: any) => {
        console.error('File Upload Pipeline Error:', err);
        this.handleUploadError();
      }
    });
  }

  private handleUploadError() {
    this.isUploading.set(false);
    this.progress.set(0);
    this.toast.error('Upload Failed');
  }

  deleteUploadedFile() {
    const oldUrl = this.value;
    // Optimistic Clear
    this.value = '';
    this.valueChange.emit('');

    if (oldUrl) {
      this.http.post<any>('/api/admin/delete-image', { url: oldUrl }).subscribe({
        next: (res: any) => {
          if (res && res.success) {
            this.toast.success('Image Deleted Successfully');
          }
        },
        error: (err: any) => {
          console.error('Failed to command remote delete on storage:', err);
        }
      });
    }
  }

  onUrlInput(url: string) {
    this.value = url.trim();
    this.isUrlValid.set(true); // reset state
    this.valueChange.emit(this.value);
  }

  clearUrl() {
    this.value = '';
    this.valueChange.emit('');
  }

  onUrlImageError() {
    this.isUrlValid.set(false);
  }
}
