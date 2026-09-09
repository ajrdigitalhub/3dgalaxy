import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  AdminWhatsAppService,
  WhatsAppConversation
} from '../../../../core/services/admin-whatsapp.service';

@Component({
  selector: 'app-admin-whatsapp-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './admin-whatsapp-inbox.component.html'
})
export class AdminWhatsappInboxComponent implements OnInit, OnDestroy, AfterViewChecked {
  public waService = inject(AdminWhatsAppService);
  private route = inject(ActivatedRoute);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  // Local UI State
  replyText = signal<string>('');
  mediaUrlInput = signal<string>('');
  showMediaInput = signal<boolean>(false);
  showRightDrawer = signal<boolean>(true);
  sendErrorMessage = signal<string | null>(null);

  // Auto-Reply & Configuration Modal State
  showAutoReplyModal = signal<boolean>(false);
  autoReplyTab = signal<'AUTOREPLY' | 'QUICK_REPLIES'>('AUTOREPLY');
  autoReplyConfig = signal<any>(null);
  quickRepliesList = signal<any[]>([]);
  isSavingConfig = signal<boolean>(false);
  saveStatusMsg = signal<string | null>(null);

  private lastMessageCount = 0;
  private shouldScrollToBottom = false;
  private visibilityHandler: (() => void) | null = null;

  ngOnInit() {
    // 1. Initial load of conversations list
    this.waService.loadConversations();

    // 1b. Check for deep linked conversationId
    this.route.queryParams.subscribe(params => {
      if (params['conversationId']) {
        this.waService.selectConversation(params['conversationId']);
      }
    });

    // 2. Connect to real-time Server-Sent Events stream for instant two-way synchronization
    this.waService.connectToRealtimeStream();

    // 3. Load quick replies & auto-reply settings
    this.loadQuickReplies();
    this.loadAutoReplyConfig();

    // 4. Tab visibility handler: when tab regains focus, reconnect SSE stream if disconnected
    // STRICT RULE: No continuous polling setInterval or recursive loops while idle
    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (!document.hidden) {
          if (!this.waService.isConnected()) {
            this.waService.connectToRealtimeStream();
          }
          const active = this.waService.activeConversation();
          if (active) {
            this.waService.reloadActiveMessages(active.id, true);
          }
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  ngAfterViewChecked() {
    const currentCount = this.waService.messages().length;
    if (currentCount !== this.lastMessageCount || this.shouldScrollToBottom) {
      this.lastMessageCount = currentCount;
      this.shouldScrollToBottom = false;
      this.scrollToBottom();
    }
  }

  ngOnDestroy() {
    this.waService.disconnectRealtimeStream();
    if (typeof document !== 'undefined' && this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  async loadQuickReplies() {
    const list = await this.waService.getQuickReplies();
    if (list && list.length > 0) {
      this.quickRepliesList.set(list);
    } else {
      // Fallback defaults
      this.quickRepliesList.set([
        { id: '1', shortcut: '/order', title: 'Order ID', message: 'Could you please share your Order Number (e.g. #3DX0012) so we can check the status for you?', isActive: true },
        { id: '2', shortcut: '/shipping', title: 'Location / Pincode', message: 'Could you please share your location or PIN code so we can confirm delivery availability?', isActive: true },
        { id: '3', shortcut: '/support', title: 'Support Executive', message: 'Our support team is reviewing your message and will assist you shortly.', isActive: true },
        { id: '4', shortcut: '/quote', title: '3D Print Quote', message: 'Please share your 3D model file (.STL or .OBJ) and preferred material (PLA, PETG, Resin) for an instant quote.', isActive: true }
      ]);
    }
  }

  async loadAutoReplyConfig() {
    const config = await this.waService.getAutoReplyConfig();
    if (config) {
      if (!config.replyMessage) {
        config.replyMessage =
          'Hi! 👋 Thank you for reaching out to AJR Digital HUB. Please tell us your questions about website development, and our team will assist you shortly.';
      }
      if (!config.keywords || !config.keywords.length) {
        config.keywords = ['hi', 'hello', 'hey', 'start', 'vanakkam', 'namaste', 'greetings', 'website', 'service', 'info', 'information', 'enquiry', 'query'];
      }
      if (config.onlyReplyOnce === undefined) {
        config.onlyReplyOnce = true;
      }
      this.autoReplyConfig.set(config);
    }
  }

  getKeywordsString(cfg: any): string {
    if (!cfg || !Array.isArray(cfg.keywords)) return 'hi, hello, hey, start, vanakkam, namaste, greetings';
    return cfg.keywords.join(', ');
  }

  updateKeywords(cfg: any, rawKeywords: string) {
    if (!cfg) return;
    cfg.keywords = (rawKeywords || '')
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean);
  }

  openAutoReplySettings(tab: 'AUTOREPLY' | 'QUICK_REPLIES' = 'AUTOREPLY') {
    this.autoReplyTab.set(tab);
    this.saveStatusMsg.set(null);
    this.loadAutoReplyConfig();
    this.loadQuickReplies();
    this.showAutoReplyModal.set(true);
  }

  closeAutoReplySettings() {
    this.showAutoReplyModal.set(false);
    this.saveStatusMsg.set(null);
  }

  async saveAutoReplySettings() {
    const cfg = this.autoReplyConfig();
    if (!cfg) return;

    this.isSavingConfig.set(true);
    this.saveStatusMsg.set(null);

    const success = await this.waService.saveAutoReplyConfig(cfg);
    this.isSavingConfig.set(false);

    if (success) {
      this.saveStatusMsg.set('Auto-reply settings successfully saved!');
      setTimeout(() => this.saveStatusMsg.set(null), 3000);
    } else {
      this.saveStatusMsg.set('Failed to save settings. Please try again.');
    }
  }

  async saveQuickReplies() {
    this.isSavingConfig.set(true);
    this.saveStatusMsg.set(null);

    const success = await this.waService.saveQuickReplies(this.quickRepliesList());
    this.isSavingConfig.set(false);

    if (success) {
      this.saveStatusMsg.set('Quick replies successfully saved!');
      setTimeout(() => this.saveStatusMsg.set(null), 3000);
    } else {
      this.saveStatusMsg.set('Failed to save quick replies.');
    }
  }

  addNewQuickReply() {
    const newItem = {
      id: 'qr_' + Date.now(),
      shortcut: '/new',
      title: 'New Quick Reply',
      message: 'Type response message here...',
      category: 'General',
      isActive: true
    };
    this.quickRepliesList.update(list => [...list, newItem]);
  }

  removeQuickReply(index: number) {
    this.quickRepliesList.update(list => list.filter((_, i) => i !== index));
  }

  async manualSync() {
    await this.waService.syncActiveConversationNow();
    this.shouldScrollToBottom = true;
  }

  selectConversation(conv: WhatsAppConversation) {
    this.sendErrorMessage.set(null);
    this.waService.selectConversation(conv.id);
    this.shouldScrollToBottom = true;
  }

  setFilter(status: string) {
    this.waService.statusFilter.set(status);
    this.waService.loadConversations();
  }

  toggleUnreadOnly() {
    this.waService.unreadOnlyFilter.set(!this.waService.unreadOnlyFilter());
    this.waService.loadConversations();
  }

  setAiModeFilter(mode: string) {
    this.waService.aiModeFilter.set(mode);
    this.waService.loadConversations();
  }

  toggleRightDrawer() {
    this.showRightDrawer.set(!this.showRightDrawer());
  }

  async sendReply() {
    const text = this.replyText().trim();
    const media = this.mediaUrlInput().trim() || undefined;

    if (!text && !media) return;

    this.sendErrorMessage.set(null);
    const res = await this.waService.sendAdminReply(text, media);
    if (res.success) {
      this.replyText.set('');
      this.mediaUrlInput.set('');
      this.showMediaInput.set(false);
      this.shouldScrollToBottom = true;
    } else {
      this.sendErrorMessage.set(res.error || 'Failed to send WhatsApp message.');
    }
  }

  onEnterPress(event: any) {
    if (event.shiftKey) return;
    event.preventDefault();
    this.sendReply();
  }

  insertQuickReply(textOrQr: any) {
    const text = typeof textOrQr === 'string' ? textOrQr : textOrQr?.message;
    if (text) {
      this.replyText.set(text);
    }
  }

  async toggleAiMode() {
    const active = this.waService.activeConversation();
    if (!active) return;
    const isAuto = active.aiMode === 'AUTO' || active.aiMode === 'AI';
    const nextMode = isAuto ? 'HUMAN' : 'AUTO';
    await this.waService.toggleAiMode(nextMode as any);
  }

  async updateStatus(status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED') {
    await this.waService.updateConversationStatus(status);
  }

  openWhatsAppWeb(phone: string) {
    const cleanDigits = phone.replace(/[^\d]/g, '');
    window.open(`https://wa.me/${cleanDigits}`, '_blank');
  }

  scrollToBottom() {
    try {
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  formatTime(isoString?: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  getInitials(name?: string | null): string {
    if (!name) return 'WA';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}
