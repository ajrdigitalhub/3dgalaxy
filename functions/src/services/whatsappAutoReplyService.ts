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
    'Hello 👋 Welcome to *3D Galaxy*! ✨\n\n' +
    'Thank you for contacting us. How can we assist you today?\n' +
    'Our customer support team has received your message and an executive will assist you shortly.',
  keywords: ['hi', 'hello', 'hey', 'start', 'vanakkam', 'namaste', 'greetings'],
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
   * Primary entry point: Evaluates incoming customer message.
   * RESTRICTION: Sends ONLY ONE auto-reply per conversation, and ONLY IF customer message is a greeting (hi/hello).
   * No other automated messages or complex configurations are evaluated.
   */
  public static async processCustomerMessage(
    conversationId: string,
    inboundText: string
  ): Promise<{ replied: boolean; ruleName?: string; replyText?: string; reason?: string }> {
    try {
      const config = await this.getConfig();

      // Check 1: Master auto-reply toggle
      if (!config.enabled) {
        return { replied: false, reason: 'AUTO_REPLY_DISABLED' };
      }

      // Check 2: Global human takeover
      if (config.humanTakeoverGlobal) {
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
            take: 30
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

      // Check 4: RESTRICTION - "only one message should send"
      // If ANY outbound message has already been sent (AUTO, ADMIN, or AGENT), do NOT send another!
      const previousMessages = conv.messages || [];
      const hasAutoReplied = previousMessages.some(m => m.direction === 'OUTBOUND' && m.senderType === 'AUTO');
      const hasAdminReplied = previousMessages.some(m => m.direction === 'OUTBOUND' && (m.senderType === 'ADMIN' || m.senderType === 'AGENT'));

      if (config.onlyReplyOnce !== false && (hasAutoReplied || hasAdminReplied)) {
        logger.info(`[WhatsAppAutoReply] Conversation ${conversationId} already received a reply. Auto-reply restricted to single reply.`);
        return { replied: false, reason: 'ALREADY_REPLIED_ONCE' };
      }

      // Check 5: RESTRICTION - "if hi or hello then only one message should send not other configuration needed"
      const text = (inboundText || '').trim();
      const keywords = config.keywords && config.keywords.length > 0
        ? config.keywords
        : DEFAULT_CONFIG.keywords;

      const isGreeting = this.matchesKeywords(text, keywords);

      if (!isGreeting) {
        logger.info(`[WhatsAppAutoReply] Inbound message '${text}' is not a greeting (hi/hello). Auto-reply skipped as per restriction.`);
        return { replied: false, reason: 'NOT_A_GREETING' };
      }

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

      logger.info(`[WhatsAppAutoReply] GREETING_MATCHED: Sending single auto-reply to conversation ${conversationId}`);

      // Small delay (1000ms) for natural delivery
      await new Promise(r => setTimeout(r, 1000));

      // Dispatch auto-reply through Meta WhatsApp Cloud API
      const settings = await getWhatsappSettings();
      const phoneNumberId = settings.phoneNumberId || settings.apiUrl?.match(/\/(\d+)\/messages/)?.[1] || '1228371843697142';
      const apiUrl = settings.apiUrl || `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
      const accessToken = settings.apiKey || settings.accessToken;

      let whatsappMessageId: string | null = null;
      let status: 'SENT' | 'FAILED' = 'SENT';
      let errorMessage: string | null = null;

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
              }
            }
          );
          whatsappMessageId = metaRes.data?.messages?.[0]?.id || null;
        } catch (apiErr: any) {
          logger.error('[WhatsAppAutoReply] Failed to dispatch auto-reply via Meta API:', apiErr.response?.data || apiErr.message);
          status = 'FAILED';
          errorMessage = apiErr.response?.data?.error?.message || apiErr.message;
        }
      } else {
        // Sandbox mock
        whatsappMessageId = 'sim_auto_' + Math.random().toString(36).substring(7);
      }

      // Record outbound AUTO message in database & broadcast real-time event
      await WhatsAppConversationService.recordOutboundMessage({
        conversationId,
        customerId: conv.customerId,
        whatsappMessageId,
        senderType: 'AUTO',
        messageText: replyContent,
        status,
        errorMessage
      });

      logger.info(`[WhatsAppAutoReply] AUTO_REPLY_SENT: Dispatched single greeting reply to ${conv.phone}`);
      return {
        replied: true,
        ruleName: 'Single Greeting Auto-Reply',
        replyText: replyContent
      };
    } catch (err: any) {
      logger.error('[WhatsAppAutoReply] Critical error processing auto-reply:', err.message);
      return { replied: false, reason: err.message };
    }
  }
}
