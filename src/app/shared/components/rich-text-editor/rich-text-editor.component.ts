import { Component, forwardRef, inject, signal, viewChild, ElementRef, OnInit, OnDestroy, HostListener, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true
    }
  ]
})
export class RichTextEditorComponent implements ControlValueAccessor, OnInit, OnDestroy, AfterViewInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  @Input() label: string = 'Content Editor';
  @Input() placeholder: string = 'Write something brilliant...';

  // Support direct two-way signal/value binding
  @Input() set value(val: string) {
    if (val !== undefined && val !== null && val !== this.htmlContent()) {
      this.writeValue(val);
    }
  }

  @Output() valueChange = new EventEmitter<string>();

  // State Management Signals
  htmlContent = signal<string>('');
  isSourceView = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);
  wordCount = signal<number>(0);
  charCount = signal<number>(0);

  // Active formats tracking
  isBold = signal(false);
  isItalic = signal(false);
  isUnderline = signal(false);
  isStrikeThrough = signal(false);

  // Dialog/Dropdown Overlays
  showLinkModal = signal(false);
  linkLabel = signal('');
  linkUrl = signal('');
  
  showVideoModal = signal(false);
  videoUrl = signal('');

  showTableModal = signal(false);
  tableRows = signal(3);
  tableCols = signal(3);

  showColorDropdown = signal(false);
  showBgColorDropdown = signal(false);
  showFontDropdown = signal(false);

  // Image insertion overlay
  showImageModal = signal(false);
  editorImageMode = signal<'upload' | 'url'>('upload');
  editorImageUrl = signal<string>('');
  editorImageUploading = signal<boolean>(false);
  editorImageProgress = signal<number>(0);

  // Element references for direct DOM manipulation
  editorArea = viewChild<ElementRef<HTMLDivElement>>('editorArea');

  // Pre-configured colors for selection UI
  colorPalette = [
    '#000000', '#4b5563', '#dc2626', '#ea580c', '#eab308', '#16a34a', '#2563eb', '#4f46e5', '#9333ea', '#db2777',
    '#ffffff', '#f3f4f6', '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7', '#dbeafe', '#e0e7ff', '#f3e8ff', '#fce7f3'
  ];

  fontSizes = [
    { label: 'Extra Small', value: '1' },
    { label: 'Small', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Medium', value: '4' },
    { label: 'Large', value: '5' },
    { label: 'Extra Large', value: '6' },
    { label: 'Huge', value: '7' }
  ];

  // ControlValueAccessor hooks
  onChange: any = () => {};
  onTouched: any = () => {};
  disabled = false;

  ngOnInit() {
    // Standard initialization if any
  }

  ngOnDestroy() {
    // Cleanup lifecycle
  }

  ngAfterViewInit() {
    const editor = this.editorArea()?.nativeElement;
    if (editor && this.htmlContent()) {
      editor.innerHTML = this.htmlContent();
    }
    this.updateStats();
  }

  // --- COMPONENT VALUE MANAGEMENT ---
  writeValue(value: string): void {
    if (value === null || value === undefined) {
      this.htmlContent.set('');
    } else {
      this.htmlContent.set(value);
    }
    
    // Push updates to editor DOM
    const editor = this.editorArea()?.nativeElement;
    if (editor) {
      if (editor.innerHTML !== this.htmlContent()) {
        editor.innerHTML = this.htmlContent();
      }
    }
    this.updateStats();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // Handle WYSIWYG input event
  onEditorInput(event: Event) {
    const editor = this.editorArea()?.nativeElement;
    if (editor) {
      const content = editor.innerHTML;
      this.htmlContent.set(content);
      this.onChange(content);
      this.valueChange.emit(content);
      this.updateStats();
    }
  }

  // Handle manual HTML source changes
  onSourceChange(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    const content = textarea.value;
    this.htmlContent.set(content);
    
    // Sync to editor area for when we switch back
    const editor = this.editorArea()?.nativeElement;
    if (editor) {
      editor.innerHTML = content;
    }
    this.onChange(content);
    this.valueChange.emit(content);
    this.updateStats();
  }

  // Updates word and character counts from innerTEXT
  updateStats() {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.htmlContent();
    const text = tempDiv.innerText || tempDiv.textContent || '';
    
    // Characters
    this.charCount.set(text.length);

    // Words
    const trimmed = text.trim();
    if (trimmed === '') {
      this.wordCount.set(0);
    } else {
      this.wordCount.set(trimmed.split(/\s+/).length);
    }
  }

  // Selection Change event to highlight format state in toolbar
  onSelectionChange() {
    this.isBold.set(document.queryCommandState('bold'));
    this.isItalic.set(document.queryCommandState('italic'));
    this.isUnderline.set(document.queryCommandState('underline'));
    this.isStrikeThrough.set(document.queryCommandState('strikeThrough'));
  }

  // ExecCommand utility wrapper
  execCommand(command: string, value: string = '') {
    if (this.isSourceView()) return;
    document.execCommand(command, false, value);
    this.onEditorInput(new Event('input'));
    this.onSelectionChange();
  }

  // --- FORMAT ACTIONS ---
  toggleFormat(cmd: string) {
    this.execCommand(cmd);
  }

  changeFontSize(size: string) {
    this.execCommand('fontSize', size);
    this.showFontDropdown.set(false);
  }

  changeColor(color: string) {
    this.execCommand('foreColor', color);
    this.showColorDropdown.set(false);
  }

  changeBgColor(color: string) {
    this.execCommand('hiliteColor', color);
    this.showBgColorDropdown.set(false);
  }

  insertBlockquote() {
    this.execCommand('formatBlock', 'blockquote');
  }

  insertCodeBlock() {
    // Inserts structured block styling
    const selectedText = window.getSelection()?.toString() || 'code block';
    const codeHtml = `<pre class="bg-zinc-900 border border-zinc-850 p-4 rounded-xl text-emerald-400 font-mono text-xs my-3 select-all"><code>${selectedText}</code></pre>`;
    this.execCommand('insertHTML', codeHtml);
  }

  insertHorizontalLine() {
    this.execCommand('insertHorizontalRule');
  }

  // Toggle editor viewing model
  toggleSourceView() {
    this.isSourceView.set(!this.isSourceView());
    if (!this.isSourceView()) {
      // Sync from source back to wysiwyg
      setTimeout(() => {
        const editor = this.editorArea()?.nativeElement;
        if (editor) {
          editor.innerHTML = this.htmlContent();
        }
      }, 50);
    }
  }

  toggleFullscreen() {
    this.isFullscreen.set(!this.isFullscreen());
  }

  // --- WIDGET INSERTS ---
  openLinkModal() {
    const sel = window.getSelection();
    if (sel) {
      this.linkLabel.set(sel.toString());
    } else {
      this.linkLabel.set('');
    }
    this.linkUrl.set('');
    this.showLinkModal.set(true);
  }

  insertLink() {
    if (this.linkUrl().trim()) {
      const url = this.linkUrl().trim();
      const label = this.linkLabel().trim() || url;
      const linkHtml = `<a href="${url}" target="_blank" class="text-blue-500 hover:underline font-bold">${label}</a>`;
      this.execCommand('insertHTML', linkHtml);
    }
    this.showLinkModal.set(false);
  }

  insertVideo() {
    if (this.videoUrl().trim()) {
      let url = this.videoUrl().trim();
      let embedUrl = url;

      // Handle YouTube short, standard, or sharing link conversion to embed format
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
        } else if (url.includes('embed/')) {
          videoId = url.split('embed/')[1].split(/[?#]/)[0];
        } else if (url.includes('v=')) {
          videoId = url.split('v=')[1].split('&')[0];
        } else if (url.includes('shorts/')) {
          videoId = url.split('shorts/')[1].split(/[?#]/)[0];
        }
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (url.includes('vimeo.com')) {
        // Vimeo support conversion
        const parts = url.split('/');
        const videoId = parts[parts.length - 1];
        embedUrl = `https://player.vimeo.com/video/${videoId}`;
      }

      const videoHtml = `
        <div class="relative w-full max-w-2xl mx-auto my-6 aspect-video rounded-2xl overflow-hidden shadow-lg border border-black/5 dark:border-white/5">
          <iframe class="absolute inset-0 w-full h-full" src="${embedUrl}" frameborder="0" allowfullscreen referrerpolicy="no-referrer"></iframe>
        </div>
      `;
      this.execCommand('insertHTML', videoHtml);
    }
    this.showVideoModal.set(false);
    this.videoUrl.set('');
  }

  insertTable() {
    const rows = this.tableRows();
    const cols = this.tableCols();
    
    let tableHtml = `<table class="w-full border-collapse border border-zinc-200 dark:border-zinc-800 my-4 text-xs font-sans"><tbody>`;
    for (let r = 0; r < rows; r++) {
      tableHtml += `<tr>`;
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td class="border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-700 dark:text-zinc-300 min-w-[50px]">${r === 0 ? 'Header' : 'Cell'}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table>`;
    
    this.execCommand('insertHTML', tableHtml);
    this.showTableModal.set(false);
  }

  // --- IMAGE UPLOAD & DRAG & DROP HANDLING ---
  onImageFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadImageFile(input.files[0]);
    }
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.match('image.*')) {
        this.uploadImageFile(file);
      }
    }
  }

  uploadImageFile(file: File) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      this.toast.error('Allowed types: JPG, JPEG, PNG, WEBP, SVG');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('Maximum allowed size is 10 MB');
      return;
    }

    this.editorImageUploading.set(true);
    this.editorImageProgress.set(10);

    const formData = new FormData();
    formData.append('image', file);

    this.http.post<any>('/api/admin/upload-image', formData).subscribe({
      next: (res) => {
        if (res && res.success) {
          const absoluteUrl = res.url;
          this.editorImageProgress.set(100);
          
          setTimeout(() => {
            // Inserts responsive premium styled image with caption wrapper
            const imgHtml = `
              <div class="text-center my-6 group">
                <img src="${absoluteUrl}" alt="Rich Editor Content Image" class="max-w-full h-auto rounded-2xl shadow-md border border-black/5 dark:border-white/5 transition-transform hover:scale-[1.01] max-h-[500px]" referrerpolicy="no-referrer">
                <p class="text-[10px] text-zinc-400 italic mt-2 font-sans">Figure: Uploaded Asset Caption</p>
              </div>
            `;
            this.execCommand('insertHTML', imgHtml);
            this.editorImageUploading.set(false);
            this.showImageModal.set(false);
            this.toast.success('Editor Image Uploaded to Firebase Storage');
          }, 300);
        } else {
          this.editorImageUploading.set(false);
          this.toast.error('Upload failed: ' + (res.error || 'Server error'));
        }
      },
      error: (err) => {
        console.error('Image upload failed', err);
        this.editorImageUploading.set(false);
        this.toast.error('Server upload error pipeline. Check console logs.');
      }
    });
  }

  insertImageUrl() {
    const url = this.editorImageUrl().trim();
    if (!url) {
      this.toast.error('Please enter a valid image URL');
      return;
    }

    const imgHtml = `
      <div class="text-center my-6 group">
        <img src="${url}" alt="Rich Editor Content Image" class="max-w-full h-auto rounded-2xl shadow-md border border-black/5 dark:border-white/5 transition-transform hover:scale-[1.01] max-h-[500px]" referrerpolicy="no-referrer">
        <p class="text-[10px] text-zinc-400 italic mt-2 font-sans">Figure: External Asset Preview</p>
      </div>
    `;
    this.execCommand('insertHTML', imgHtml);
    this.editorImageUrl.set('');
    this.showImageModal.set(false);
    this.toast.success('Image URL Inserted Successfully');
  }

  // Trigger file browser/modal manually
  triggerImageUpload() {
    this.showImageModal.set(true);
    this.editorImageUrl.set('');
    this.editorImageUploading.set(false);
    this.editorImageProgress.set(0);
  }
}
