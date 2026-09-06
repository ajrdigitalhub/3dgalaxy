import { Response } from 'express';
import { logger } from '../utils/logger';

export interface ConversationEvent {
  type: 'MESSAGE_RECEIVED' | 'MESSAGE_SENT' | 'CONVERSATION_UPDATED' | 'STATUS_CHANGED';
  conversationId: string;
  message?: any;
  conversation?: any;
  timestamp: string;
}

export class ConversationEventService {
  private static clients: Map<string, Response> = new Map();
  private static heartbeatInterval: NodeJS.Timeout | null = null;

  public static addClient(clientId: string, res: Response) {
    this.clients.set(clientId, res);
    logger.info(`[ConversationEventService] Client connected: ${clientId}. Total clients: ${this.clients.size}`);

    // Start heartbeat if not already running
    if (!this.heartbeatInterval) {
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeat();
      }, 25000);
    }
  }

  public static removeClient(clientId: string) {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      logger.info(`[ConversationEventService] Client disconnected: ${clientId}. Total clients: ${this.clients.size}`);
    }

    if (this.clients.size === 0 && this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public static broadcast(event: ConversationEvent) {
    if (this.clients.size === 0) return;

    const payload = `data: ${JSON.stringify(event)}\n\n`;
    const deadClients: string[] = [];

    this.clients.forEach((res, clientId) => {
      try {
        res.write(payload);
      } catch (err) {
        deadClients.push(clientId);
      }
    });

    for (const deadId of deadClients) {
      this.removeClient(deadId);
    }
  }

  private static sendHeartbeat() {
    const payload = `: heartbeat ${Date.now()}\n\n`;
    const deadClients: string[] = [];

    this.clients.forEach((res, clientId) => {
      try {
        res.write(payload);
      } catch (err) {
        deadClients.push(clientId);
      }
    });

    for (const deadId of deadClients) {
      this.removeClient(deadId);
    }
  }
}
