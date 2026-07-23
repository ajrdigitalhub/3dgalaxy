import { Injectable, signal } from '@angular/core';
import { getFriendlyErrorMessage } from '../../../core/utils/error-handler.util';

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
    // Standardize the message text
    const cleanMessage = toast.type === 'error' || toast.type === 'warning'
      ? getFriendlyErrorMessage(toast.message)
      : toast.message;

    // Deduplicate: Don't add a toast if an active toast with the same type and message already exists
    const isDuplicate = this.toasts().some(t => t.type === toast.type && t.message === cleanMessage);
    if (isDuplicate) {
      return;
    }

    const id = Math.random().toString(36).substring(2, 9);
    const newToast = {
      ...toast,
      message: cleanMessage,
      id,
      duration: toast.duration || 5000
    };
    this.toasts.update(t => [...t, newToast]);
  }

  success(message: string, title?: string) {
    this.show({ type: 'success', message, title });
  }

  error(message: any, title?: string) {
    this.show({ type: 'error', message, title });
  }

  warning(message: any, title?: string) {
    this.show({ type: 'warning', message, title });
  }

  info(message: string, title?: string) {
    this.show({ type: 'info', message, title });
  }

  remove(id: string) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}

