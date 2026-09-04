import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AdminWhatsAppService, WhatsAppConversation, WhatsAppMessage } from '../../../../core/services/admin-whatsapp.service';

@Component({
  selector: 'app-admin-whatsapp-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './admin-whatsapp-inbox.component.html'
})
export class AdminWhatsappInboxComponent implements OnInit, OnDestroy {
  public waService = inject(AdminWhatsAppService);

  // Local UI State
  replyText = signal<string>('');
  mediaUrlInput = signal<string>('');
  showMediaInput = signal<boolean>(false);
  selectedImagePreview = signal<string | null>(null);

  // Quick canned reply templates
  readonly quickReplies = [
    'Hello! Thank you for reaching out to 3D Galaxy. How can we assist you today?',
    'Your order is packed and scheduled for dispatch today. Tracking details will follow shortly.',
    'We are checking this with our logistics partner and will update you in a few minutes.',
    'Could you please share your Order Number so we can check the status for you?',
    'Thank you for shopping with 3D Galaxy! Let us know if you need any further assistance.'
  ];

  private pollTimer: any = null;

  ngOnInit() {
    this.waService.loadConversations();

    // Poll for new messages every 8 seconds
    this.pollTimer = setInterval(() => {
      this.waService.loadConversations(true);
    }, 8000);
  }

  ngOnDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  selectConversation(conv: WhatsAppConversation) {
    this.waService.selectConversation(conv.id);
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

  async sendReply() {
    const text = this.replyText().trim();
    const media = this.mediaUrlInput().trim() || undefined;

    if (!text && !media) return;

    const success = await this.waService.sendAdminReply(text, media);
    if (success) {
      this.replyText.set('');
      this.mediaUrlInput.set('');
      this.showMediaInput.set(false);
    }
  }

  insertQuickReply(text: string) {
    this.replyText.set(text);
  }

  async toggleAiMode() {
    const active = this.waService.activeConversation();
    if (!active) return;
    const nextMode = active.aiMode === 'AI' ? 'HUMAN' : 'AI';
    await this.waService.toggleAiMode(nextMode);
  }

  async updateStatus(status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED') {
    await this.waService.updateConversationStatus(status);
  }

  openWhatsAppWeb(phone: string) {
    const cleanDigits = phone.replace(/[^\d]/g, '');
    window.open(`https://wa.me/${cleanDigits}`, '_blank');
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
