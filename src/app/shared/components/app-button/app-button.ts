import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-button',
  imports: [CommonModule, MatIconModule],
  templateUrl: './app-button.html',
  // styleUrls: ['./app-button.scss']
})
export class AppButton {
  @Input() loading: boolean = false;
  @Input() disabled: boolean = false;
  @Input() text: string = '';
  @Input() loadingText: string = 'Processing...';
  
  // Theme variants
  @Input() variant: 'primary' | 'secondary' | 'outline' | 'danger' = 'primary';
  
  // Sizing
  @Input() isFullWidth: boolean = false;
  
  @Input() btnClass: string = '';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() icon: string = '';

  @Output() btnClick = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent) {
    if (this.loading || this.disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.btnClick.emit(event);
  }

  get computedClasses(): string {
    if (this.btnClass) return this.btnClass;

    const base = 'flex items-center justify-center gap-2 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer border-none disabled:opacity-50 disabled:pointer-events-none md:h-12 h-11';
    
    const width = this.isFullWidth ? 'w-full' : 'w-auto px-8';

    let theme = '';
    switch (this.variant) {
      case 'primary':
        theme = 'bg-theme-gradient text-white hover:opacity-90 shadow-lg shadow-blue-500/20 active:scale-[0.98]';
        break;
      case 'secondary':
        theme = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.98]';
        break;
      case 'outline':
        theme = 'bg-transparent border-2 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-[0.98]';
        break;
      case 'danger':
        theme = 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 active:scale-[0.98]';
        break;
    }

    return `${base} ${width} ${theme}`;
  }
}

