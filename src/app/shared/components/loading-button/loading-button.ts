import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-loading-button',
  imports: [CommonModule, MatIconModule],
  templateUrl: './loading-button.html',
  styleUrls: ['./loading-button.scss']
})
export class LoadingButton {
  @Input() loading: boolean = false;
  @Input() disabled: boolean = false;
  @Input() text: string = '';
  @Input() loadingText: string = 'Processing...';
  @Input() btnClass: string = 'flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer border-none disabled:opacity-50 disabled:pointer-events-none';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() icon: string = '';
  @Input() loadingIcon: string = 'hourglass_empty';

  @Output() btnClick = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent) {
    if (this.loading || this.disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.btnClick.emit(event);
  }
}
