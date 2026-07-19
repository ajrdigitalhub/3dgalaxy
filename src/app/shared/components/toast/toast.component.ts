import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Toast, ToastService } from './toast.service';

@Component({
  selector: 'app-toast-item',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div 
      class="relative flex items-start gap-4 p-4 w-full max-w-sm rounded-xl shadow-lg backdrop-blur-md border pointer-events-auto transition-all duration-300 ease-out transform translate-y-0 opacity-100"
      [ngClass]="{
        'bg-green-50/90 dark:bg-green-950/90 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100': toast.type === 'success',
        'bg-red-50/90 dark:bg-red-950/90 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100': toast.type === 'error',
        'bg-orange-50/90 dark:bg-orange-950/90 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100': toast.type === 'warning',
        'bg-blue-50/90 dark:bg-blue-950/90 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100': toast.type === 'info',
        'translate-y-2 opacity-0': isClosing
      }"
      (mouseenter)="pause()"
      (mouseleave)="resume()"
    >
      <div class="flex-shrink-0 mt-0.5">
        <mat-icon *ngIf="toast.type === 'success'" class="text-green-500">check_circle</mat-icon>
        <mat-icon *ngIf="toast.type === 'error'" class="text-red-500">error</mat-icon>
        <mat-icon *ngIf="toast.type === 'warning'" class="text-orange-500">warning</mat-icon>
        <mat-icon *ngIf="toast.type === 'info'" class="text-blue-500">info</mat-icon>
      </div>

      <div class="flex-1 min-w-0">
        <h4 *ngIf="toast.title" class="font-medium text-sm mb-1">{{ toast.title }}</h4>
        <p class="text-sm opacity-90">{{ toast.message }}</p>
      </div>

      <button 
        (click)="close()" 
        class="flex-shrink-0 ml-2 text-current opacity-50 hover:opacity-100 transition-opacity"
      >
        <mat-icon class="scale-75">close</mat-icon>
      </button>

      <!-- Progress bar -->
      <div class="absolute bottom-0 left-0 h-1 w-full rounded-b-xl overflow-hidden bg-current opacity-10">
        <div 
          class="h-full bg-current transition-all duration-100 ease-linear"
          [style.width.%]="progress"
        ></div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastItemComponent implements OnInit, OnDestroy {
  @Input({ required: true }) toast!: Toast;
  
  toastService = inject(ToastService);
  
  progress = 100;
  isClosing = false;
  
  private timer: any;
  private interval: any;
  private remainingTime = 0;
  private startTime = 0;
  
  ngOnInit() {
    this.remainingTime = this.toast.duration || 5000;
    this.startTimer();
  }
  
  ngOnDestroy() {
    this.clearTimers();
  }
  
  startTimer() {
    this.startTime = Date.now();
    
    this.interval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      this.progress = Math.max(0, 100 - (elapsed / this.remainingTime) * 100);
    }, 100);
    
    this.timer = setTimeout(() => {
      this.close();
    }, this.remainingTime);
  }
  
  clearTimers() {
    clearTimeout(this.timer);
    clearInterval(this.interval);
  }
  
  pause() {
    this.clearTimers();
    const elapsed = Date.now() - this.startTime;
    this.remainingTime = Math.max(0, this.remainingTime - elapsed);
  }
  
  resume() {
    if (this.remainingTime > 0) {
      this.startTimer();
    }
  }
  
  close() {
    this.isClosing = true;
    setTimeout(() => {
      this.toastService.remove(this.toast.id);
    }, 300); // Wait for the transition
  }
}

@Component({
  selector: 'app-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ToastItemComponent],
  template: `
    <div class="fixed bottom-0 left-0 right-0 sm:left-auto sm:bottom-4 sm:right-4 w-full sm:w-auto flex flex-col items-center sm:items-end gap-2 p-4 sm:p-0 z-[9999] pointer-events-none">
      <!-- animate using simple enter animations -->
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="slide-in w-full flex justify-center sm:block">
          <app-toast-item [toast]="toast" class="block w-full sm:w-auto max-w-sm"></app-toast-item>
        </div>
      }
    </div>
  `,
  styles: [`
    .slide-in {
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
