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
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  AdminWhatsAppService,
  WhatsAppConversation,
  WhatsAppMessage
} from '../../../../core/services/admin-whatsapp.service';

@Component({
  selector: 'app-admin-whatsapp-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './admin-whatsapp-inbox.component.html',
  styleUrls: ['./admin-whatsapp-inbox.component.css']
})
export class AdminWhatsappInboxComponent implements OnInit, OnDestroy, AfterViewChecked {
  public waService = inject(AdminWhatsAppService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  // Local UI State
  replyText = signal<string>('');
  mediaUrlInput = signal<string>('');
  showMediaInput = signal<boolean>(false);
  showRightDrawer = signal<boolean>(true);
  sendErrorMessage = signal<string | null>(null);

  // Attachment & Media Upload State
  pendingAttachment = signal<{
    file: File;
    previewUrl?: string;
    fileName: string;
    fileSize: number;
    fileType: 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO';
    mimeType: string;
  } | null>(null);
  isUploadingAttachment = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  selectedLightboxUrl = signal<string | null>(null);

  // Rule Test Simulator State
  testRuleInput = signal<string>('');
  testRuleResult = signal<any>(null);
  isTestingRule = signal<boolean>(false);

  // Mobile Responsiveness Pane View ('LIST' or 'CHAT')
  mobileView = signal<'LIST' | 'CHAT'>('LIST');

  // In-Chat Search
  showChatSearch = signal<boolean>(false);
  chatSearchQuery = signal<string>('');

  // Auto-Reply & Configuration Modal State
  showAutoReplyModal = signal<boolean>(false);
  autoReplyTab = signal<'GREETINGS' | 'RULES' | 'QUICK_REPLIES'>('GREETINGS');
  autoReplyConfig = signal<any>(null);
  quickRepliesList = signal<any[]>([]);
  isSavingConfig = signal<boolean>(false);
  saveStatusMsg = signal<string | null>(null);

  hasUnseenNewMessages = signal<boolean>(false);
  private activeSyncInterval: any = null;
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

    // 4. Tab visibility handler & conservative active conversation heartbeat
    // Polls only the active conversation at a conservative 12s interval when tab is visible
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

      this.activeSyncInterval = setInterval(() => {
        if (!document.hidden) {
          const active = this.waService.activeConversation();
          if (active) {
            this.waService.reloadActiveMessages(active.id, true);
          }
        }
      }, 12000);
    }
  }

  ngAfterViewChecked() {
    const el = this.messagesContainer?.nativeElement;
    const isNearBottom = el ? (el.scrollHeight - el.scrollTop - el.clientHeight < 160) : true;
    const currentCount = this.waService.messages().length;

    if (currentCount !== this.lastMessageCount) {
      const isNewMessage = currentCount > this.lastMessageCount;
      this.lastMessageCount = currentCount;

      if (this.shouldScrollToBottom || isNearBottom) {
        this.shouldScrollToBottom = false;
        this.hasUnseenNewMessages.set(false);
        this.scrollToBottom();
      } else if (isNewMessage) {
        this.hasUnseenNewMessages.set(true);
      }
    } else if (this.shouldScrollToBottom) {
      this.shouldScrollToBottom = false;
      this.hasUnseenNewMessages.set(false);
      this.scrollToBottom();
    }
  }

  onMessagesScroll() {
    const el = this.messagesContainer?.nativeElement;
    if (el) {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (isNearBottom && this.hasUnseenNewMessages()) {
        this.hasUnseenNewMessages.set(false);
      }
    }
  }

  scrollToBottomSmooth() {
    try {
      this.hasUnseenNewMessages.set(false);
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTo({
          top: this.messagesContainer.nativeElement.scrollHeight,
          behavior: 'smooth'
        });
      }
    } catch {}
  }

  ngOnDestroy() {
    this.clearPendingAttachment();
    this.waService.disconnectRealtimeStream();
    if (this.activeSyncInterval) {
      clearInterval(this.activeSyncInterval);
      this.activeSyncInterval = null;
    }
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

  openAutoReplySettings(tab: 'GREETINGS' | 'RULES' | 'QUICK_REPLIES' | 'AUTOREPLY' = 'GREETINGS') {
    const targetTab = tab === 'AUTOREPLY' ? 'GREETINGS' : tab;
    this.autoReplyTab.set(targetTab);
    this.saveStatusMsg.set(null);
    this.testRuleResult.set(null);
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
    this.mobileView.set('CHAT');
    this.shouldScrollToBottom = true;
  }

  backToConversationList() {
    this.mobileView.set('LIST');
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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    input.value = ''; // allow re-selecting identical file if needed

    // Security check: Block dangerous executable file extensions
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const dangerous = ['exe', 'bat', 'cmd', 'ps1', 'scr', 'sh', 'msi', 'vbs', 'com', 'pif', 'jar'];
    if (dangerous.includes(ext)) {
      this.sendErrorMessage.set(`Security error: .${ext} files cannot be sent through WhatsApp.`);
      return;
    }

    // Size validation: WhatsApp standard limit 50MB
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      this.sendErrorMessage.set('File is too large to send through WhatsApp (Max allowed: 50MB).');
      return;
    }

    let fileType: 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO' = 'DOCUMENT';
    if (file.type.startsWith('image/')) fileType = 'IMAGE';
    else if (file.type.startsWith('video/')) fileType = 'VIDEO';
    else if (file.type.startsWith('audio/')) fileType = 'AUDIO';

    let previewUrl: string | undefined;
    if (fileType === 'IMAGE') {
      try {
        previewUrl = URL.createObjectURL(file);
      } catch {}
    }

    this.pendingAttachment.set({
      file,
      previewUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType,
      mimeType: file.type
    });
    this.sendErrorMessage.set(null);
  }

  clearPendingAttachment() {
    const att = this.pendingAttachment();
    if (att?.previewUrl) {
      try {
        URL.revokeObjectURL(att.previewUrl);
      } catch {}
    }
    this.pendingAttachment.set(null);
    this.uploadProgress.set(0);
    this.isUploadingAttachment.set(false);
  }

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getReactions(msg: WhatsAppMessage): any[] {
    if (!msg) return [];
    let raw = msg.metadata;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = {};
      }
    }
    if (Array.isArray(raw?.reactions)) {
      return raw.reactions.filter((r: any) => r && r.emoji && r.emoji.trim());
    }
    if (raw?.reactionEmoji) {
      return [{ emoji: raw.reactionEmoji, from: raw.reactionFrom || 'Customer' }];
    }
    return [];
  }

  getReactionTooltip(msg: WhatsAppMessage): string {
    const reactions = this.getReactions(msg);
    if (reactions.length === 0) return '';
    const emojis = reactions.map((r) => r.emoji).join(' ');
    const senders = reactions
      .map((r) => (r.senderType === 'CUSTOMER' ? 'Customer' : r.from || 'User'))
      .join(', ');
    return `Reacted ${emojis} by ${senders}`;
  }

  openLightbox(url?: string | null) {
    if (url) {
      this.selectedLightboxUrl.set(url);
    }
  }

  closeLightbox() {
    this.selectedLightboxUrl.set(null);
  }

  isImageMedia(msg: WhatsAppMessage): boolean {
    if (msg.messageType === 'IMAGE') return true;
    if (msg.mediaMetadata?.mimeType?.startsWith('image/')) return true;
    const url = (msg.mediaUrl || '').toLowerCase();
    return /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url);
  }

  isVideoMedia(msg: WhatsAppMessage): boolean {
    if (msg.messageType === 'VIDEO') return true;
    if (msg.mediaMetadata?.mimeType?.startsWith('video/')) return true;
    const url = (msg.mediaUrl || '').toLowerCase();
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
  }

  isAudioMedia(msg: WhatsAppMessage): boolean {
    if (msg.messageType === 'AUDIO') return true;
    if (msg.mediaMetadata?.mimeType?.startsWith('audio/')) return true;
    const url = (msg.mediaUrl || '').toLowerCase();
    return /\.(mp3|ogg|wav|m4a|aac)(\?.*)?$/i.test(url);
  }

  isDocumentMedia(msg: WhatsAppMessage): boolean {
    if (msg.messageType === 'DOCUMENT') return true;
    if (msg.mediaMetadata?.mimeType?.startsWith('application/')) return true;
    if (msg.mediaUrl && !this.isImageMedia(msg) && !this.isVideoMedia(msg) && !this.isAudioMedia(msg)) return true;
    return false;
  }

  getDocumentFileName(msg: WhatsAppMessage): string {
    if (msg.mediaMetadata?.fileName) return msg.mediaMetadata.fileName;
    if (msg.mediaUrl) {
      try {
        const path = new URL(msg.mediaUrl).pathname;
        const name = path.split('/').pop();
        if (name) return decodeURIComponent(name);
      } catch {}
    }
    return 'document';
  }

  async sendReply() {
    const text = this.replyText().trim();
    const media = this.mediaUrlInput().trim() || undefined;
    const attachment = this.pendingAttachment();

    if (!text && !media && !attachment) return;

    this.sendErrorMessage.set(null);

    // 1. If sending file attachment
    if (attachment) {
      this.isUploadingAttachment.set(true);
      this.uploadProgress.set(0);

      const res = await this.waService.sendAttachment(
        attachment.file,
        text || undefined,
        (percent) => this.uploadProgress.set(percent)
      );

      this.isUploadingAttachment.set(false);

      if (res.success) {
        this.clearPendingAttachment();
        this.replyText.set('');
        this.shouldScrollToBottom = true;
      } else {
        this.sendErrorMessage.set(res.error || 'Failed to send attachment through WhatsApp.');
      }
      return;
    }

    // 2. Normal text or media URL
    const res = await this.waService.sendAdminReply(text, media);

    if (res.success) {
      this.replyText.set('');
      this.mediaUrlInput.set('');
      this.showMediaInput.set(false);
      this.shouldScrollToBottom = true;
    } else {
      this.sendErrorMessage.set(res.error || 'Failed to send message.');
    }
  }

  addNewRule() {
    const cfg = this.autoReplyConfig();
    if (!cfg) return;
    if (!Array.isArray(cfg.rules)) {
      cfg.rules = [];
    }
    const newRule = {
      id: 'rule_' + Date.now(),
      name: 'New Keyword Rule',
      keywords: ['keyword'],
      replyMessage: 'Type automated response here...',
      matchType: 'CONTAINS' as const,
      priority: 50,
      enabled: true,
      isOrderAware: false
    };
    cfg.rules.push(newRule);
    this.autoReplyConfig.set({ ...cfg });
  }

  removeRule(index: number) {
    const cfg = this.autoReplyConfig();
    if (!cfg || !Array.isArray(cfg.rules)) return;
    cfg.rules.splice(index, 1);
    this.autoReplyConfig.set({ ...cfg });
  }

  getRuleKeywordsString(rule: any): string {
    return Array.isArray(rule?.keywords) ? rule.keywords.join(', ') : '';
  }

  updateRuleKeywords(rule: any, val: string) {
    if (!rule) return;
    rule.keywords = (val || '')
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean);
  }

  async runRuleTest() {
    const text = this.testRuleInput().trim();
    if (!text) return;
    this.isTestingRule.set(true);
    this.testRuleResult.set(null);
    try {
      const res = await this.waService.testAutoReplyRule(text);
      if (res.success && res.result) {
        this.testRuleResult.set(res.result);
      } else {
        this.testRuleResult.set({
          matchedRule: 'Error',
          matchType: 'ERROR',
          replyMessage: res.error || 'Failed to evaluate rule test',
          reason: res.error
        });
      }
    } catch (err: any) {
      this.testRuleResult.set({
        matchedRule: 'Error',
        matchType: 'ERROR',
        replyMessage: err.message,
        reason: err.message
      });
    } finally {
      this.isTestingRule.set(false);
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
    const isAuto = active.aiMode !== 'HUMAN';
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

  viewOrder(orderIdOrNumber?: string | null) {
    if (orderIdOrNumber) {
      this.router.navigate(['/admin/orders', orderIdOrNumber]);
    }
  }

  shouldShowDateDivider(currMsg: any, prevMsg: any): boolean {
    if (!prevMsg) return true;
    if (!currMsg?.createdAt || !prevMsg?.createdAt) return false;
    const d1 = new Date(currMsg.createdAt).toDateString();
    const d2 = new Date(prevMsg.createdAt).toDateString();
    return d1 !== d2;
  }

  formatDateDivider(isoString?: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return 'TODAY';
    if (isYesterday) return 'YESTERDAY';
    return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  }

  isTemplateMessage(msg: any): boolean {
    if (!msg) return false;
    if (msg.messageType === 'AUTOMATED_ORDER_NOTIFICATION' || msg.mediaMetadata?.isAutomatedNotification) return true;
    const txt = String(msg.messageText || '');
    return txt.startsWith('Template: ') || txt.startsWith('🔔 ORDER STATUS UPDATE');
  }

  parseTemplateDetails(text?: string | null): { title: string; subtitle?: string; lines: string[] } {
    if (!text) return { title: 'Order Notification', lines: [] };
    const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (rawLines.length === 0) return { title: 'Order Notification', lines: [] };

    let title = 'Order Notification';
    let subtitle: string | undefined;
    const lines: string[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (line.startsWith('Template:')) {
        const parts = line.replace('Template:', '').trim();
        title = parts.replace(/_/g, ' ').toUpperCase();
      } else if (line.includes('|')) {
        // e.g. "undefined | ORD-2026-510311 | Processing | Your order..."
        const segments = line.split('|').map(s => s.trim()).filter(s => s && s !== 'undefined');
        lines.push(...segments);
      } else {
        lines.push(line);
      }
    }

    if (lines.length > 0 && !title) {
      title = lines[0];
    }

    return { title, subtitle, lines };
  }
}
