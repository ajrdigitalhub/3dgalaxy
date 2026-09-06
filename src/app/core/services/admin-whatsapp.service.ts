import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface WhatsAppConversation {
  id: string;
  customerId?: string | null;
  phone: string;
  customerName?: string | null;
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  aiMode: 'AUTO' | 'HUMAN' | 'AI' | 'HYBRID';
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
  senderType: 'CUSTOMER' | 'ADMIN' | 'AUTO' | 'AI' | 'SYSTEM';
  senderId?: string | null;
  sender?: { id: string; firstName?: string; lastName?: string } | null;
  messageType: string;
  messageText?: string | null;
  mediaId?: string | null;
  mediaUrl?: string | null;
  mediaMetadata?: any;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  errorMessage?: string | null;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminWhatsAppService {
  private http = inject(HttpClient);
  private eventSource: EventSource | null = null;

  // State Signals
  readonly conversations = signal<WhatsAppConversation[]>([]);
  readonly activeConversation = signal<WhatsAppConversation | null>(null);
  readonly messages = signal<WhatsAppMessage[]>([]);
  readonly unreadTotal = signal<number>(0);
  readonly totalCount = signal<number>(0);
  readonly isConnected = signal<boolean>(false);
  readonly connectionStatus = signal<'LIVE' | 'RECONNECTING' | 'OFFLINE'>('OFFLINE');
  readonly isLiveSyncing = signal<boolean>(false);
  readonly lastSyncTime = signal<Date | null>(null);
  readonly newMessagesTrigger = signal<number>(0);

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
   * Connects to the real-time SSE stream on Cloud Run backend.
   * Pushes incoming messages, AI replies, admin replies, and status updates instantly.
   */
  connectToRealtimeStream() {
    if (typeof window === 'undefined' || !window.EventSource) return;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
    }

    const streamUrl = `${environment.apiUrl}/admin/whatsapp/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(streamUrl);
    this.eventSource = es;

    es.onopen = () => {
      this.isConnected.set(true);
      this.connectionStatus.set('LIVE');
    };

    es.onmessage = (event) => {
      try {
        if (!event.data) return;
        const data = JSON.parse(event.data);
        this.handleRealtimeEvent(data);
      } catch (e) {
        console.warn('[AdminWhatsAppService] Error parsing SSE event:', e);
      }
    };

    es.onerror = () => {
      this.isConnected.set(false);
      if (this.eventSource && this.eventSource.readyState === 0) {
        this.connectionStatus.set('RECONNECTING');
      } else {
        this.connectionStatus.set('OFFLINE');
      }
    };
  }

  /**
   * Disconnects the real-time SSE stream when tab is hidden or component destroyed.
   */
  disconnectRealtimeStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected.set(false);
    this.connectionStatus.set('OFFLINE');
  }

  /**
   * Incrementally processes incoming real-time events without polling the whole database.
   */
  private handleRealtimeEvent(data: any) {
    if (!data || !data.type) return;

    const { type, conversationId, message, conversation } = data;

    if (type === 'MESSAGE_RECEIVED' || type === 'MESSAGE_SENT') {
      const active = this.activeConversation();

      // 1. If this message is for the currently open active conversation, append it!
      if (active && active.id === conversationId && message) {
        this.messages.update((msgs) => {
          // Deduplicate by ID or external Meta whatsappMessageId
          const exists = msgs.some(
            (m) => m.id === message.id || (message.whatsappMessageId && m.whatsappMessageId === message.whatsappMessageId)
          );
          if (exists) {
            return msgs.map((m) =>
              m.id === message.id || (message.whatsappMessageId && m.whatsappMessageId === message.whatsappMessageId)
                ? { ...m, ...message }
                : m
            );
          }
          return [...msgs, message];
        });

        // Update active conversation preview in header
        this.activeConversation.update((c) =>
          c
            ? {
                ...c,
                lastMessage: message.messageText || c.lastMessage,
                lastMessageAt: message.createdAt || new Date().toISOString(),
                lastDirection: message.direction
              }
            : null
        );
      }

      // 2. Update conversation snippet in the left sidebar list and bump to top
      this.conversations.update((list) => {
        const index = list.findIndex((c) => c.id === conversationId);
        if (index === -1) {
          if (conversation) {
            return [conversation, ...list];
          }
          return list;
        }

        const target = list[index];
        const isCurrentActive = active && active.id === conversationId;
        const updated: WhatsAppConversation = {
          ...target,
          lastMessage: message?.messageText || conversation?.lastMessage || target.lastMessage,
          lastMessageAt: message?.createdAt || conversation?.lastMessageAt || new Date().toISOString(),
          lastDirection: message?.direction || conversation?.lastDirection || target.lastDirection,
          unreadCount:
            type === 'MESSAGE_RECEIVED' && !isCurrentActive
              ? (target.unreadCount || 0) + 1
              : target.unreadCount,
          ...(conversation || {})
        };

        const remaining = list.filter((_, i) => i !== index);
        return [updated, ...remaining];
      });

      if (type === 'MESSAGE_RECEIVED' && (!active || active.id !== conversationId)) {
        this.unreadTotal.update((u) => u + 1);
      }
    } else if (type === 'STATUS_CHANGED' && message) {
      // Update delivery/read status ticks respecting status hierarchy
      const active = this.activeConversation();
      if (active && active.id === conversationId) {
        const rank: Record<string, number> = {
          FAILED: -1,
          PENDING: 0,
          SENT: 1,
          DELIVERED: 2,
          READ: 3
        };

        this.messages.update((msgs) =>
          msgs.map((m) => {
            const isMatch = m.id === message.id || (message.whatsappMessageId && m.whatsappMessageId === message.whatsappMessageId);
            if (!isMatch) return m;

            const existingRank = rank[m.status] ?? 0;
            const newRank = rank[message.status] ?? 0;
            const resolvedStatus = (newRank >= existingRank || message.status === 'FAILED') ? message.status : m.status;

            return {
              ...m,
              status: resolvedStatus,
              errorMessage: message.errorMessage || m.errorMessage
            };
          })
        );
      }
    } else if (type === 'CONVERSATION_UPDATED' && conversation) {
      this.conversations.update((list) =>
        list.map((c) => (c.id === conversationId ? { ...c, ...conversation } : c))
      );
      this.activeConversation.update((c) => (c && c.id === conversationId ? { ...c, ...conversation } : c));
    }
  }

  /**
   * Triggers an explicit one-shot manual sync for the active conversation.
   * Does NOT run any periodic polling interval.
   */
  async syncActiveConversationNow(): Promise<boolean> {
    const active = this.activeConversation();
    if (!active) return false;

    this.isLiveSyncing.set(true);
    try {
      await this.reloadActiveMessages(active.id, false);
      this.loadConversations(true);
      this.lastSyncTime.set(new Date());
      return true;
    } finally {
      this.isLiveSyncing.set(false);
    }
  }

  /**
   * Loads conversations from backend with active filters (initial load or explicit filter change)
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

          const currentActive = this.activeConversation();
          if (currentActive) {
            const updatedActive = (res.conversations || []).find((c: any) => c.id === currentActive.id);
            if (updatedActive) {
              this.activeConversation.update((c) => (c ? { ...c, ...updatedActive } : null));
            }
          } else if ((res.conversations || []).length > 0 && !silent) {
            this.selectConversation(res.conversations[0].id);
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
   * Reloads and merges messages for the active conversation without flicker or losing state.
   * Reconciles message status changes (SENT -> DELIVERED -> READ) in place.
   */
  reloadActiveMessages(conversationId: string, silent = false): Promise<boolean> {
    const url = `${environment.apiUrl}/admin/whatsapp/conversations/${conversationId}/messages?limit=40`;
    return new Promise((resolve) => {
      this.http.get<any>(url, this.getHeaders()).subscribe({
        next: (res) => {
          if (res.success && Array.isArray(res.messages)) {
            const incomingMsgs: WhatsAppMessage[] = res.messages;
            const currentMsgs = this.messages();

            const rank: Record<string, number> = {
              FAILED: -1,
              PENDING: 0,
              SENT: 1,
              DELIVERED: 2,
              READ: 3
            };

            let hasChanges = false;
            let newlyAppended = 0;

            const mergedMap = new Map<string, WhatsAppMessage>();
            for (const m of currentMsgs) {
              const key = m.whatsappMessageId || m.id;
              mergedMap.set(key, m);
            }

            for (const m of incomingMsgs) {
              const key = m.whatsappMessageId || m.id;
              if (mergedMap.has(key)) {
                const existing = mergedMap.get(key)!;
                const existingRank = rank[existing.status] ?? 0;
                const incomingRank = rank[m.status] ?? 0;

                if (existing.status !== m.status || existing.errorMessage !== m.errorMessage) {
                  const resolvedStatus = (incomingRank >= existingRank || m.status === 'FAILED')
                    ? m.status
                    : existing.status;

                  if (resolvedStatus !== existing.status) {
                    hasChanges = true;
                    mergedMap.set(key, { ...existing, ...m, status: resolvedStatus });
                  }
                }
              } else {
                // If it's a newly arrived message (customer inbound or outbound)
                mergedMap.set(key, m);
                hasChanges = true;
                newlyAppended++;
              }
            }

            if (hasChanges || currentMsgs.length !== mergedMap.size) {
              const sorted = Array.from(mergedMap.values()).sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
              this.messages.set(sorted);

              if (newlyAppended > 0) {
                this.newMessagesTrigger.update((n) => n + 1);
              }
            }

            resolve(true);
          } else {
            resolve(false);
          }
        },
        error: (err) => {
          if (!silent) {
            console.warn('[AdminWhatsAppService] Error refreshing messages:', err);
          }
          resolve(false);
        }
      });
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
   * Sends an admin reply to the active customer conversation with instant optimistic bubble.
   */
  sendAdminReply(messageText: string, mediaUrl?: string): Promise<{ success: boolean; error?: string }> {
    const active = this.activeConversation();
    if (!active) return Promise.resolve({ success: false, error: 'No active conversation selected' });

    this.isSending.set(true);

    // Optimistic message with PENDING/SENT status
    const tempId = 'temp_' + Date.now();
    const optimisticMsg: WhatsAppMessage = {
      id: tempId,
      conversationId: active.id,
      direction: 'OUTBOUND',
      senderType: 'ADMIN',
      messageType: mediaUrl ? 'IMAGE' : 'TEXT',
      messageText,
      mediaUrl,
      status: 'SENT',
      createdAt: new Date().toISOString()
    };

    this.messages.update((msgs) => [...msgs, optimisticMsg]);
    this.newMessagesTrigger.update((n) => n + 1);

    const url = `${environment.apiUrl}/admin/whatsapp/conversations/${active.id}/messages`;
    const payload = { messageText, mediaUrl };

    return new Promise((resolve) => {
      this.http.post<any>(url, payload, this.getHeaders()).subscribe({
        next: (res) => {
          this.isSending.set(false);
          if (res.success && res.message) {
            // Replace optimistic message with actual DB record from Meta
            this.messages.update((msgs) =>
              msgs.map((m) => (m.id === tempId ? { ...res.message, status: res.message.status || 'SENT' } : m))
            );

            this.conversations.update((list) =>
              list.map((c) =>
                c.id === active.id
                  ? {
                      ...c,
                      lastMessage: messageText || '[Media Attachment]',
                      lastDirection: 'OUTBOUND',
                      lastMessageAt: new Date().toISOString()
                    }
                  : c
              )
            );

            // Fast follow-up sync to catch immediate delivery receipt
            setTimeout(() => {
              this.reloadActiveMessages(active.id, true);
            }, 1200);

            resolve({ success: true });
          } else {
            this.messages.update((msgs) =>
              msgs.map((m) =>
                m.id === tempId ? { ...m, status: 'FAILED', errorMessage: res.error || 'Failed to send' } : m
              )
            );
            resolve({ success: false, error: res.error || 'Failed to send message via WhatsApp' });
          }
        },
        error: (err) => {
          console.error('[AdminWhatsAppService] Send error:', err);
          this.isSending.set(false);
          const errDetail = err.error?.details || err.error?.error || err.message || 'Failed to communicate with server';
          this.messages.update((msgs) =>
            msgs.map((m) => (m.id === tempId ? { ...m, status: 'FAILED', errorMessage: errDetail } : m))
          );
          resolve({ success: false, error: errDetail });
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
  toggleAiMode(newMode: 'AUTO' | 'HUMAN' | 'AI' | 'HYBRID'): Promise<boolean> {
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

  /**
   * Fetches Auto-Reply settings & rule configuration
   */
  getAutoReplyConfig(): Promise<any> {
    const url = `${environment.apiUrl}/admin/whatsapp/auto-replies`;
    return new Promise((resolve) => {
      this.http.get<any>(url, this.getHeaders()).subscribe({
        next: (res) => resolve(res.config || null),
        error: () => resolve(null)
      });
    });
  }

  /**
   * Saves Auto-Reply settings & rules
   */
  saveAutoReplyConfig(config: any): Promise<boolean> {
    const url = `${environment.apiUrl}/admin/whatsapp/auto-replies`;
    return new Promise((resolve) => {
      this.http.post<any>(url, config, this.getHeaders()).subscribe({
        next: (res) => resolve(res.success || false),
        error: () => resolve(false)
      });
    });
  }

  /**
   * Fetches Quick Replies
   */
  getQuickReplies(): Promise<any[]> {
    const url = `${environment.apiUrl}/admin/whatsapp/quick-replies`;
    return new Promise((resolve) => {
      this.http.get<any>(url, this.getHeaders()).subscribe({
        next: (res) => resolve(res.quickReplies || []),
        error: () => resolve([])
      });
    });
  }

  /**
   * Saves Quick Replies
   */
  saveQuickReplies(quickReplies: any[]): Promise<boolean> {
    const url = `${environment.apiUrl}/admin/whatsapp/quick-replies`;
    return new Promise((resolve) => {
      this.http.post<any>(url, quickReplies, this.getHeaders()).subscribe({
        next: (res) => resolve(res.success || false),
        error: () => resolve(false)
      });
    });
  }
}

