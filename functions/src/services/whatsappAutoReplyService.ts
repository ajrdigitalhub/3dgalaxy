import axios from 'axios';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { WhatsAppConversationService } from './whatsappConversationService';
import { getWhatsappSettings } from '../controllers/whatsapp';

export interface AutoReplyConfig {
  enabled: boolean;
  replyMessage: string;
  keywords: string[];
  onlyReplyOnce: boolean;
  humanTakeoverGlobal?: boolean;
}

export interface QuickReplyItem {
  id: string;
  shortcut: string; // e.g. "/order"
  title: string;
  message: string;
  category?: string;
  isActive: boolean;
}

const DEFAULT_CONFIG: AutoReplyConfig = {
  enabled: true,
  replyMessage:
    'Hi! 👋 Thank you for reaching out to AJR Digital HUB. Please tell us your questions about website development, and our team will assist you shortly.',
  keywords: ['hi', 'hello', 'hey', 'start', 'vanakkam', 'namaste', 'greetings', 'website', 'service', 'info', 'information', 'enquiry', 'query'],
  onlyReplyOnce: true,
  humanTakeoverGlobal: false
};

const DEFAULT_QUICK_REPLIES: QuickReplyItem[] = [
  {
    id: 'qr_order',
    shortcut: '/order',
    title: 'Ask for Order ID',
    message: 'Could you please share your Order Number (e.g. #3DX0012) so we can check the latest status for you?',
    category: 'Orders',
    isActive: true
  },
  {
    id: 'qr_shipping',
    shortcut: '/shipping',
    title: 'Check Delivery Pincode',
    message: 'Could you please share your delivery location or PIN code so we can confirm shipping availability and express transit times?',
    category: 'Shipping',
    isActive: true
  },
  {
    id: 'qr_support',
    shortcut: '/support',
    title: 'Executive Connecting',
    message: 'Our support team is reviewing your conversation and will assist you with full details shortly.',
    category: 'Support',
    isActive: true
  },
  {
    id: 'qr_stl',
    shortcut: '/quote',
    title: 'Custom STL Upload Request',
    message: 'Please share your 3D CAD/STL file here or upload directly at https://3dgalaxy.co.in/printing-service along with your preferred material.',
    category: 'Printing',
    isActive: true
  },
  {
    id: 'qr_dispatch',
    shortcut: '/dispatch',
    title: 'Order Dispatched Notice',
    message: 'Great news! Your 3D Galaxy order has been packed and handed over to our courier partner. Tracking link will be active shortly.',
    category: 'Orders',
    isActive: true
  }
];

export class WhatsAppAutoReplyService {
  /**
   * Loads auto-reply configuration from database setting table.
   */
  public static async getConfig(): Promise<AutoReplyConfig> {
    try {
      const record = await prisma.setting.findUnique({
        where: { settingKey: 'whatsapp-auto-reply-settings' }
      });
      if (record && record.settingData) {
        const parsed = typeof record.settingData === 'string'
          ? JSON.parse(record.settingData)
          : record.settingData;

        // Gracefully migrate / extract reply message and keywords from legacy configs if present
        const replyMsg = parsed.replyMessage ||
          parsed.rules?.find((r: any) => r.triggerType === 'WELCOME')?.responseText ||
          parsed.defaultReply ||
          DEFAULT_CONFIG.replyMessage;

        const kw = Array.isArray(parsed.keywords) && parsed.keywords.length > 0
          ? parsed.keywords
          : (parsed.rules?.find((r: any) => r.triggerType === 'WELCOME')?.conditions?.keywords || DEFAULT_CONFIG.keywords);

        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          replyMessage: replyMsg,
          keywords: kw,
          onlyReplyOnce: parsed.onlyReplyOnce !== undefined ? parsed.onlyReplyOnce : true
        };
      }
    } catch (e: any) {
      logger.warn('[WhatsAppAutoReplyService] Could not read settings from DB:', e.message);
    }
    return DEFAULT_CONFIG;
  }

  /**
   * Persists auto-reply configuration to database setting table.
   */
  public static async saveConfig(config: AutoReplyConfig): Promise<AutoReplyConfig> {
    const payloadToSave = {
      enabled: !!config.enabled,
      replyMessage: config.replyMessage || DEFAULT_CONFIG.replyMessage,
      keywords: Array.isArray(config.keywords) && config.keywords.length > 0 ? config.keywords : DEFAULT_CONFIG.keywords,
      onlyReplyOnce: config.onlyReplyOnce !== undefined ? !!config.onlyReplyOnce : true,
      humanTakeoverGlobal: !!config.humanTakeoverGlobal
    };

    const updated = await prisma.setting.upsert({
      where: { settingKey: 'whatsapp-auto-reply-settings' },
      update: { settingData: payloadToSave as any, updatedAt: new Date() },
      create: { settingKey: 'whatsapp-auto-reply-settings', settingData: payloadToSave as any }
    });
    const parsed = typeof updated.settingData === 'string' ? JSON.parse(updated.settingData) : (updated.settingData as any);
    return { ...DEFAULT_CONFIG, ...parsed };
  }

  /**
   * Loads quick replies from database setting table.
   */
  public static async getQuickReplies(): Promise<QuickReplyItem[]> {
    try {
      const record = await prisma.setting.findUnique({
        where: { settingKey: 'whatsapp-quick-replies' }
      });
      if (record && record.settingData) {
        const parsed = typeof record.settingData === 'string'
          ? JSON.parse(record.settingData)
          : record.settingData;
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e: any) {
      logger.warn('[WhatsAppAutoReplyService] Could not read quick replies from DB:', e.message);
    }
    return DEFAULT_QUICK_REPLIES;
  }

  /**
   * Persists quick replies to database setting table.
   */
  public static async saveQuickReplies(items: QuickReplyItem[]): Promise<QuickReplyItem[]> {
    const updated = await prisma.setting.upsert({
      where: { settingKey: 'whatsapp-quick-replies' },
      update: { settingData: items as any, updatedAt: new Date() },
      create: { settingKey: 'whatsapp-quick-replies', settingData: items as any }
    });
    return typeof updated.settingData === 'string' ? JSON.parse(updated.settingData) : (updated.settingData as any);
  }

  /**
   * Matches keyword conditions against incoming customer text.
   */
  public static matchesKeywords(
    text: string,
    keywords: string[]
  ): boolean {
    const normalized = (text || '').toLowerCase().trim();
    if (!normalized || !keywords || keywords.length === 0) return false;

    const lowerKeywords = keywords.map(k => k.toLowerCase().trim()).filter(Boolean);

    return lowerKeywords.some(k => {
      // Check exact match or word boundary (e.g. "hi!", "hello team", "hey")
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\b|\\s)${escaped}(\\b|\\s|[!.,?]|$)`, 'i');
      return regex.test(normalized) || normalized === k;
    });
  }

  /**
   * Primary entry point: Evaluates incoming customer message for automated welcome reply.
   * Trigger conditions:
   * 1. Customer sends their first message in this conversation (initial contact).
   * 2. Or customer sends a greeting / trigger keyword.
   * Outgoing message lifecycle:
   * QUEUED / SENDING -> SENT (or FAILED) -> DELIVERED -> READ.
   */
  public static async processCustomerMessage(
    conversationId: string,
    inboundText: string,
    isNewConversation: boolean = false
  ): Promise<{ replied: boolean; ruleName?: string; replyText?: string; reason?: string }> {
    try {
      const config = await this.getConfig();

      // Check 1: Master auto-reply toggle
      if (!config.enabled) {
        logger.info(`[WhatsAppAutoReply] Auto-reply is disabled globally.`);
        return { replied: false, reason: 'AUTO_REPLY_DISABLED' };
      }

      // Check 2: Global human takeover
      if (config.humanTakeoverGlobal) {
        logger.info(`[WhatsAppAutoReply] Global human takeover is active.`);
        return { replied: false, reason: 'GLOBAL_HUMAN_TAKEOVER_ACTIVE' };
      }

      // Fetch conversation with customer and previous messages
      const conv = await prisma.whatsappConversation.findUnique({
        where: { id: conversationId },
        include: {
          customer: {
            include: { user: true }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 40
          }
        }
      });

      if (!conv) {
        return { replied: false, reason: 'CONVERSATION_NOT_FOUND' };
      }

      // Check 3: Conversation-level Human Takeover mode
      if (conv.aiMode === 'HUMAN') {
        logger.info(`[WhatsAppAutoReply] Conversation ${conversationId} is in HUMAN mode. Auto-reply skipped.`);
        return { replied: false, reason: 'CONVERSATION_HUMAN_MODE' };
      }

      // Check previous messages in this conversation
      const previousMessages = conv.messages || [];
      const inboundMessages = previousMessages.filter(m => m.direction === 'INBOUND');
      
      // Determine if this is a "new session" (either brand new, or last customer message was > 24 hours ago)
      const previousInbound = inboundMessages.length > 1 ? inboundMessages[1] : null;
      let isSessionNew = isNewConversation || inboundMessages.length <= 1;
      
      if (previousInbound) {
        const hoursSinceLastMessage = (new Date().getTime() - previousInbound.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastMessage > 24) {
          isSessionNew = true;
        }
      }
      
      const isInitialCustomerMessage = isSessionNew;

      // Check if we already auto-replied IN THIS SESSION (last 24 hours)
      const recentAutoReplies = previousMessages.filter(m => 
        m.direction === 'OUTBOUND' && 
        m.senderType === 'AUTO' &&
        (new Date().getTime() - m.createdAt.getTime()) / (1000 * 60 * 60) <= 24
      );
      const hasAutoRepliedInSession = recentAutoReplies.length > 0;

      // Greeting match check
      const text = (inboundText || '').trim();
      const keywords = config.keywords && config.keywords.length > 0
        ? config.keywords
        : DEFAULT_CONFIG.keywords;
      const isGreetingMatch = this.matchesKeywords(text, keywords);

      logger.info(`[WHATSAPP WEBHOOK] ↓ Automation trigger evaluated (initial: ${isInitialCustomerMessage}, keywordMatch: ${isGreetingMatch}, alreadyRepliedInSession: ${hasAutoRepliedInSession})`);

      // Trigger condition:
      // Must be initial customer message OR match trigger keywords
      if (!isInitialCustomerMessage && !isGreetingMatch) {
        logger.info(`[WhatsAppAutoReply] Inbound message '${text}' does not match initial contact or greeting keywords.`);
        return { replied: false, reason: 'TRIGGER_NOT_MATCHED' };
      }

      // Only-reply-once check:
      // If customer has already received an auto-reply in this conversation session, do not duplicate
      if (config.onlyReplyOnce !== false && hasAutoRepliedInSession) {
        logger.info(`[WhatsAppAutoReply] Conversation ${conversationId} already received auto-reply recently. Auto-reply restricted.`);
        return { replied: false, reason: 'ALREADY_REPLIED_ONCE' };
      }

      const ruleName = isInitialCustomerMessage ? 'Initial Welcome Automation' : 'Greeting Keyword Auto-Reply';
      logger.info(`[WHATSAPP WEBHOOK] ↓ Automation matched: ${ruleName}`);

      // Resolve customer name for placeholder replacement
      const customer = conv.customer;
      const customerName = customer?.user
        ? `${customer.user.firstName || ''} ${customer.user.lastName || ''}`.trim()
        : (conv.customerName || 'Customer');

      const rawReply = config.replyMessage || DEFAULT_CONFIG.replyMessage;
      const replyContent = rawReply.replace(/{customerName}/g, customerName);

      if (!replyContent || !replyContent.trim()) {
        return { replied: false, reason: 'EMPTY_REPLY_MESSAGE' };
      }

      logger.info(`[WHATSAPP WEBHOOK] ↓ Reply generated`);

      // 1. Stage 1: Store outgoing message with status 'SENDING' (queued/sending) & broadcast to UI immediately
      const outgoingMsg = await WhatsAppConversationService.recordOutboundMessage({
        conversationId,
        customerId: conv.customerId,
        whatsappMessageId: null,
        senderType: 'AUTO',
        messageType: 'TEXT',
        messageText: replyContent,
        status: 'SENDING',
        errorMessage: null
      });

      // Natural delay (800ms) before dispatching to Meta API
      await new Promise(r => setTimeout(r, 800));

      // 2. Stage 2: Dispatch through Meta WhatsApp Cloud API
      const settings = await getWhatsappSettings();
      const phoneNumberId = settings.phoneNumberId || settings.apiUrl?.match(/\/(\d+)\/messages/)?.[1] || '1228371843697142';
      const apiUrl = settings.apiUrl || `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;
      const accessToken = settings.apiKey || settings.accessToken;

      logger.info(`[WHATSAPP WEBHOOK] ↓ WhatsApp API called`);

      let whatsappMessageId: string | null = null;
      let finalStatus: 'SENT' | 'FAILED' = 'SENT';
      let errorReason: string | null = null;

      if (settings.apiEnabled && accessToken) {
        try {
          const rawPhone = conv.phone.replace(/[^\d]/g, '');
          const metaRes = await axios.post(
            apiUrl,
            {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: rawPhone,
              type: 'text',
              text: { preview_url: false, body: replyContent }
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
              },
              timeout: 15000
            }
          );
          whatsappMessageId = metaRes.data?.messages?.[0]?.id || null;
          logger.info(`[WHATSAPP WEBHOOK] ↓ WhatsApp API response received (ID: ${whatsappMessageId})`);
        } catch (apiErr: any) {
          finalStatus = 'FAILED';
          const errMsg = apiErr.response?.data?.error?.message || apiErr.message || 'Meta API call failed';
          errorReason = errMsg;
          logger.error(`[WHATSAPP WEBHOOK] ↓ WhatsApp API call failed: ${errMsg}`);
        }
      } else {
        // Sandbox mock dispatch
        whatsappMessageId = 'sim_auto_' + Math.random().toString(36).substring(7);
        logger.info(`[WHATSAPP WEBHOOK] ↓ WhatsApp API response received (Sandbox ID: ${whatsappMessageId})`);
      }

      // 3. Stage 3: Update message to SENT or FAILED in database
      const updatedMsg = await prisma.whatsappMessage.update({
        where: { id: outgoingMsg.id },
        data: {
          status: finalStatus,
          whatsappMessageId: whatsappMessageId || outgoingMsg.whatsappMessageId,
          errorMessage: errorReason,
          updatedAt: new Date()
        }
      });
      logger.info(`[WHATSAPP WEBHOOK] ↓ Outgoing message saved: ${updatedMsg.id} (status: ${finalStatus})`);

      // 4. Stage 4: Broadcast STATUS_CHANGED real-time event to Admin UI
      const { ConversationEventService } = await import('./conversationEventService');
      ConversationEventService.broadcast({
        type: 'STATUS_CHANGED',
        conversationId,
        message: updatedMsg,
        timestamp: new Date().toISOString()
      });
      logger.info(`[WHATSAPP WEBHOOK] ↓ Realtime event emitted: STATUS_CHANGED (${finalStatus})`);
      logger.info(`[WHATSAPP WEBHOOK] ↓ Frontend conversation updated`);

      return {
        replied: finalStatus === 'SENT',
        ruleName,
        replyText: replyContent
      };
    } catch (err: any) {
      logger.error('[WhatsAppAutoReply] Critical error processing auto-reply:', err.message);
      return { replied: false, reason: err.message };
    }
  }
}
