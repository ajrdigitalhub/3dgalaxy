import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(toast: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id, duration: toast.duration || 5000 };
    this.toasts.update(t => [...t, newToast]);
  }

  success(message: string, title?: string) {
    this.show({ type: 'success', message, title });
  }

  error(message: string, title?: string) {
    this.show({ type: 'error', message, title });
  }

  warning(message: string, title?: string) {
    this.show({ type: 'warning', message, title });
  }

  info(message: string, title?: string) {
    this.show({ type: 'info', message, title });
  }

  remove(id: string) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}
