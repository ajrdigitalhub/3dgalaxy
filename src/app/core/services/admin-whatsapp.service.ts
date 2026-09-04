import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface WhatsAppConversation {
  id: string;
  customerId?: string | null;
  phone: string;
  customerName?: string | null;
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  aiMode: 'AI' | 'HUMAN' | 'HYBRID';
  unreadCount: number;
  lastMessage?: string | null;
  lastMessageAt: string;
  lastDirection: 'INBOUND' | 'OUTBOUND';
  assignedAdminId?: string | null;
  assignedAdmin?: { id: string; firstName: string; lastName: string; email: string } | null;
  customer?: {
    id: string;
    customerType: string;
    phone?: string;
    user?: { id: string; firstName: string; lastName: string; email: string; mobile?: string };
    addresses?: any[];
    orders?: any[];
  } | null;
  messages?: WhatsAppMessage[];
}

export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  customerId?: string | null;
  whatsappMessageId?: string | null;
  direction: 'INBOUND' | 'OUTBOUND';
  senderType: 'CUSTOMER' | 'ADMIN' | 'AI' | 'SYSTEM';
  senderId?: string | null;
  sender?: { id: string; firstName?: string; lastName?: string } | null;
  messageType: string;
  messageText?: string | null;
  mediaId?: string | null;
  mediaUrl?: string | null;
  mediaMetadata?: any;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  errorMessage?: string | null;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminWhatsAppService {
  private http = inject(HttpClient);

  // State Signals
  readonly conversations = signal<WhatsAppConversation[]>([]);
  readonly activeConversation = signal<WhatsAppConversation | null>(null);
  readonly messages = signal<WhatsAppMessage[]>([]);
  readonly unreadTotal = signal<number>(0);
  readonly totalCount = signal<number>(0);

  // Filter & Search Signals
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('ALL'); // ALL, OPEN, PENDING, RESOLVED, CLOSED
  readonly aiModeFilter = signal<string>('ALL'); // ALL, AI, HUMAN
  readonly unreadOnlyFilter = signal<boolean>(false);

  // UI State Signals
  readonly isLoading = signal<boolean>(false);
  readonly isSending = signal<boolean>(false);
  readonly isUpdatingStatus = signal<boolean>(false);

  // Filtered conversations computed
  readonly filteredConversations = computed(() => {
    const list = this.conversations();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const aiMode = this.aiModeFilter();
    const unreadOnly = this.unreadOnlyFilter();

    return list.filter((conv) => {
      if (status !== 'ALL' && conv.status !== status) return false;
      if (aiMode !== 'ALL' && conv.aiMode !== aiMode) return false;
      if (unreadOnly && conv.unreadCount === 0) return false;

      if (query) {
        const nameMatch = (conv.customerName || '').toLowerCase().includes(query);
        const phoneMatch = (conv.phone || '').toLowerCase().includes(query);
        const msgMatch = (conv.lastMessage || '').toLowerCase().includes(query);
        return nameMatch || phoneMatch || msgMatch;
      }

      return true;
    });
  });

  private getHeaders(): { headers: HttpHeaders } {
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
    }
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      })
    };
  }

  /**
   * Loads conversations from backend with active filters
   */
  loadConversations(silent = false) {
    if (!silent) this.isLoading.set(true);

    const params: any = {
      status: this.statusFilter(),
      aiMode: this.aiModeFilter(),
      unreadOnly: this.unreadOnlyFilter() ? 'true' : 'false',
      searchQuery: this.searchQuery(),
      limit: '50'
    };

    const queryStr = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== '')
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');

    const url = `${environment.apiUrl}/admin/whatsapp/conversations?${queryStr}`;

    this.http.get<any>(url, this.getHeaders()).subscribe({
      next: (res) => {
        if (res.success) {
          this.conversations.set(res.conversations || []);
          this.unreadTotal.set(res.unreadTotal || 0);
          this.totalCount.set(res.total || 0);

          // Update active conversation in-place if already selected
          const currentActive = this.activeConversation();
          if (currentActive) {
            const updatedActive = (res.conversations || []).find((c: any) => c.id === currentActive.id);
            if (updatedActive) {
              this.activeConversation.update((c) => (c ? { ...c, ...updatedActive } : null));
            }
          }
        }
        if (!silent) this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[AdminWhatsAppService] Error fetching conversations:', err);
        if (!silent) this.isLoading.set(false);
      }
    });
  }

  /**
   * Selects a conversation and fetches its complete history & customer context
   */
  selectConversation(conversationId: string) {
    this.isLoading.set(true);
    const url = `${environment.apiUrl}/admin/whatsapp/conversations/${conversationId}`;

    this.http.get<any>(url, this.getHeaders()).subscribe({
      next: (res) => {
        if (res.success && res.conversation) {
          this.activeConversation.set(res.conversation);
          this.messages.set(res.conversation.messages || []);

          // Clear local unread count in conversations array
          this.conversations.update((list) =>
            list.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
          );
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[AdminWhatsAppService] Error fetching conversation detail:', err);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Sends an admin reply to the active customer conversation
   */
  sendAdminReply(messageText: string, mediaUrl?: string): Promise<boolean> {
    const active = this.activeConversation();
    if (!active) return Promise.resolve(false);

    this.isSending.set(true);
    const url = `${environment.apiUrl}/admin/whatsapp/conversations/${active.id}/messages`;
    const payload = { messageText, mediaUrl };

    return new Promise((resolve) => {
      this.http.post<any>(url, payload, this.getHeaders()).subscribe({
        next: (res) => {
          this.isSending.set(false);
          if (res.success && res.message) {
            this.messages.update((msgs) => [...msgs, res.message]);
            // Update last message in list
            this.conversations.update((list) =>
              list.map((c) =>
                c.id === active.id
                  ? { ...c, lastMessage: messageText, lastDirection: 'OUTBOUND', lastMessageAt: new Date().toISOString() }
                  : c
              )
            );
            resolve(true);
          } else {
            resolve(false);
          }
        },
        error: (err) => {
          console.error('[AdminWhatsAppService] Send error:', err);
          this.isSending.set(false);
          resolve(false);
        }
      });
    });
  }

  /**
   * Updates conversation lifecycle status (OPEN, PENDING, RESOLVED, CLOSED)
   */
  updateConversationStatus(status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED'): Promise<boolean> {
    const active = this.activeConversation();
    if (!active) return Promise.resolve(false);

    this.isUpdatingStatus.set(true);
    const url = `${environment.apiUrl}/admin/whatsapp/conversations/${active.id}/status`;

    return new Promise((resolve) => {
      this.http.patch<any>(url, { status }, this.getHeaders()).subscribe({
        next: (res) => {
          this.isUpdatingStatus.set(false);
          if (res.success && res.conversation) {
            this.activeConversation.update((c) => (c ? { ...c, status } : null));
            this.conversations.update((list) =>
              list.map((c) => (c.id === active.id ? { ...c, status } : c))
            );
            resolve(true);
          } else {
            resolve(false);
          }
        },
        error: () => {
          this.isUpdatingStatus.set(false);
          resolve(false);
        }
      });
    });
  }

  /**
   * Toggles AI Mode vs Human Takeover
   */
  toggleAiMode(newMode: 'AI' | 'HUMAN' | 'HYBRID'): Promise<boolean> {
    const active = this.activeConversation();
    if (!active) return Promise.resolve(false);

    const url = `${environment.apiUrl}/admin/whatsapp/conversations/${active.id}/mode`;

    return new Promise((resolve) => {
      this.http.patch<any>(url, { aiMode: newMode }, this.getHeaders()).subscribe({
        next: (res) => {
          if (res.success) {
            this.activeConversation.update((c) => (c ? { ...c, aiMode: newMode } : null));
            this.conversations.update((list) =>
              list.map((c) => (c.id === active.id ? { ...c, aiMode: newMode } : c))
            );
            resolve(true);
          } else {
            resolve(false);
          }
        },
        error: () => resolve(false)
      });
    });
  }

  /**
   * Assigns conversation to an admin
   */
  assignAdmin(adminId?: string): Promise<boolean> {
    const active = this.activeConversation();
    if (!active) return Promise.resolve(false);

    const url = `${environment.apiUrl}/admin/whatsapp/conversations/${active.id}/assign`;

    return new Promise((resolve) => {
      this.http.patch<any>(url, { adminId }, this.getHeaders()).subscribe({
        next: (res) => {
          if (res.success && res.conversation) {
            this.activeConversation.update((c) => (c ? { ...c, assignedAdminId: adminId || null } : null));
            resolve(true);
          } else {
            resolve(false);
          }
        },
        error: () => resolve(false)
      });
    });
  }
}
