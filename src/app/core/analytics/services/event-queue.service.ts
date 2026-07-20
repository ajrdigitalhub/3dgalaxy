import { Injectable, signal } from '@angular/core';
import { QueuedEvent } from '../analytics.types';

@Injectable({
  providedIn: 'root'
})
export class EventQueueService {
  private queue: QueuedEvent[] = [];
  private queueLengthSignal = signal<number>(0);
  public readonly queueLength = this.queueLengthSignal.asReadonly();

  private readonly MAX_EVENT_AGE_MS = 30 * 60 * 1000; // 30 minutes max buffer age

  public enqueue(event: Omit<QueuedEvent, 'id' | 'timestamp'>): void {
    const queuedEvent: QueuedEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now()
    };

    this.queue.push(queuedEvent);
    this.queueLengthSignal.set(this.queue.length);
  }

  /**
   * Attempts to process all buffered events through a provider handler.
   * Retains events that fail or are not yet processable.
   */
  public flush(handler: (event: QueuedEvent) => boolean): void {
    if (this.queue.length === 0) return;

    const now = Date.now();
    const remaining: QueuedEvent[] = [];

    for (const event of this.queue) {
      if (now - event.timestamp > this.MAX_EVENT_AGE_MS) {
        // Discard expired event
        continue;
      }

      const success = handler(event);
      if (!success) {
        remaining.push(event);
      }
    }

    this.queue = remaining;
    this.queueLengthSignal.set(this.queue.length);
  }

  public getQueue(): ReadonlyArray<QueuedEvent> {
    return [...this.queue];
  }

  public clear(): void {
    this.queue = [];
    this.queueLengthSignal.set(0);
  }

  private generateEventId(): string {
    return 'q_evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }
}
