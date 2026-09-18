import axios from 'axios';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { WhatsAppConversationService } from './whatsappConversationService';
import { getWhatsappSettings } from '../controllers/whatsapp';
import {
  WhatsAppRuleEngine,
  AutoReplyConfig,
  AutoReplyRule,
  DEFAULT_CONFIG,
  DEFAULT_RULES
} from './whatsappRuleEngine';

export { AutoReplyConfig, AutoReplyRule } from './whatsappRuleEngine';

export interface QuickReplyItem {
  id: string;
  shortcut: string; // e.g. "/order"
  title: string;
  message: string;
  category?: string;
  isActive: boolean;
}

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
    message: 'Please share your 3D CAD/STL file here or upload directly at https://3dgalaxy.co.in/services along with your preferred material.',
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
   * Ensures default greeting and default keyword rules are enabled by default.
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

        // Extract or migrate rules
        let rules: AutoReplyRule[] = Array.isArray(parsed.rules) && parsed.rules.length > 0
          ? parsed.rules
          : DEFAULT_RULES;

        return {
          defaultGreetingEnabled: parsed.defaultGreetingEnabled !== undefined ? !!parsed.defaultGreetingEnabled : true,
          greetingMessage: parsed.greetingMessage || parsed.replyMessage || DEFAULT_CONFIG.greetingMessage,
          keywordRepliesEnabled: parsed.keywordRepliesEnabled !== undefined ? !!parsed.keywordRepliesEnabled : true,
          rules,
          fallbackEnabled: parsed.fallbackEnabled !== undefined ? !!parsed.fallbackEnabled : true,
          fallbackMessage: parsed.fallbackMessage || DEFAULT_CONFIG.fallbackMessage,
          humanTakeoverGlobal: !!parsed.humanTakeoverGlobal
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
  public static async saveConfig(config: Partial<AutoReplyConfig>): Promise<AutoReplyConfig> {
    const current = await this.getConfig();
    const payloadToSave: AutoReplyConfig = {
      defaultGreetingEnabled: config.defaultGreetingEnabled !== undefined ? !!config.defaultGreetingEnabled : current.defaultGreetingEnabled,
      greetingMessage: config.greetingMessage || current.greetingMessage,
      keywordRepliesEnabled: config.keywordRepliesEnabled !== undefined ? !!config.keywordRepliesEnabled : current.keywordRepliesEnabled,
      rules: Array.isArray(config.rules) && config.rules.length > 0 ? config.rules : current.rules,
      fallbackEnabled: config.fallbackEnabled !== undefined ? !!config.fallbackEnabled : current.fallbackEnabled,
      fallbackMessage: config.fallbackMessage || current.fallbackMessage,
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
   * Primary Entry Point: Evaluates incoming customer message using Deterministic Rule Engine.
   *
   * Flow:
   * 1. Global / Conversation Human Takeover check
   * 2. Inbound Message ID idempotency check (prevent duplicate replies)
   * 3. Initial interaction check -> Default Greeting (only sent once on first contact)
   * 4. Priority Keyword matching -> Deterministic Response (with live order status if applicable)
   * 5. Fallback Response (if enabled and no keyword matched)
   *
   * ZERO AI / LLM dependencies.
   */
  public static async processCustomerMessage(
    conversationId: string,
    inboundText: string,
    isNewConversation: boolean = false,
    inboundMessageId?: string
  ): Promise<{ replied: boolean; ruleName?: string; replyText?: string; reason?: string }> {
    try {
      const config = await this.getConfig();

      // Check 1: Global human takeover
      if (config.humanTakeoverGlobal) {
        logger.info(`[WhatsAppAutomation] Global human takeover is active. Auto-reply skipped.`);
        return { replied: false, reason: 'GLOBAL_HUMAN_TAKEOVER_ACTIVE' };
      }

      // Fetch conversation with customer and previous messages
      const conv = await prisma.whatsappConversation.findUnique({
        where: { id: conversationId },
        include: {
          customer: {
            include: {
              user: true,
              orders: {
                take: 3,
                orderBy: { createdAt: 'desc' },
                include: {
                  items: {
                    include: { product: { select: { name: true } } }
                  }
                }
              }
            }
          }
        }
      });

      if (!conv) {
        return { replied: false, reason: 'CONVERSATION_NOT_FOUND' };
      }

      // Check 2: Conversation-level Human Takeover mode
      if (conv.aiMode === 'HUMAN') {
        logger.info(`[WhatsAppAutomation] Conversation ${conversationId} is in HUMAN mode. Auto-reply skipped.`);
        return { replied: false, reason: 'CONVERSATION_HUMAN_MODE' };
      }

      // Check 3: Idempotency Protection (prevent duplicate reply execution for the same inbound message)
      if (inboundMessageId) {
        const alreadyReplied = await prisma.whatsappMessage.findFirst({
          where: {
            conversationId,
            direction: 'OUTBOUND',
            metadata: {
              path: ['inboundMessageId'],
              equals: inboundMessageId
            }
          }
        });
        if (alreadyReplied) {
          logger.info(`[WhatsAppAutomation] Inbound message ${inboundMessageId} has already been replied to. Skipping.`);
          return { replied: false, reason: 'ALREADY_REPLIED_TO_MESSAGE' };
        }
      }

      const rawText = (inboundText || '').trim();
      const customer = conv.customer;
      const customerName = customer?.user
        ? `${customer.user.firstName || ''} ${customer.user.lastName || ''}`.trim()
        : (conv.customerName || 'Customer');

      // Check 4: Determine if this is the customer's initial interaction in this conversation
      const priorOutboundCount = await prisma.whatsappMessage.count({
        where: {
          conversationId,
          direction: 'OUTBOUND'
        }
      });
      const isFirstInteraction = isNewConversation || priorOutboundCount === 0;

      let selectedRuleId = 'rule_default';
      let selectedRuleName = '';
      let replyContent = '';
      let matchType: 'GREETING' | 'KEYWORD' | 'ORDER_LOOKUP' | 'FALLBACK' = 'KEYWORD';

      // --- STEP A: First Interaction -> Default Greeting ---
      if (isFirstInteraction && config.defaultGreetingEnabled) {
        selectedRuleId = 'rule_greeting';
        selectedRuleName = 'Default Initial Greeting';
        matchType = 'GREETING';
        replyContent = (config.greetingMessage || DEFAULT_CONFIG.greetingMessage)
          .replace(/{customerName}/g, customerName);
      } else {
        // --- STEP B: Priority Keyword Rule Matching ---
        let keywordResult = null;
        if (config.keywordRepliesEnabled && config.rules && config.rules.length > 0) {
          keywordResult = await WhatsAppRuleEngine.evaluateKeywords(
            rawText,
            config.rules,
            customer?.orders || []
          );
        }

        if (keywordResult && keywordResult.matched) {
          selectedRuleId = keywordResult.ruleId || 'rule_keyword';
          selectedRuleName = keywordResult.ruleName || 'Keyword Rule';
          matchType = keywordResult.matchType || 'KEYWORD';
          replyContent = keywordResult.replyText;
        } else if (config.fallbackEnabled && config.fallbackMessage) {
          // --- STEP C: Fallback Response (with cooldown) ---
          // Prevent spamming fallback repeatedly if customer sends multiple unrecognized messages within 1 hour
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const recentFallback = await prisma.whatsappMessage.findFirst({
            where: {
              conversationId,
              direction: 'OUTBOUND',
              senderType: 'AUTO',
              createdAt: { gte: oneHourAgo },
              metadata: {
                path: ['ruleId'],
                equals: 'rule_fallback'
              }
            }
          });

          if (!recentFallback) {
            selectedRuleId = 'rule_fallback';
            selectedRuleName = 'Default Fallback';
            matchType = 'FALLBACK';
            replyContent = config.fallbackMessage;
          } else {
            logger.info(`[WhatsAppAutomation] Fallback response throttled (cooldown active) for conversation ${conversationId}`);
            return { replied: false, reason: 'FALLBACK_COOLDOWN' };
          }
        } else {
          logger.info(`[WhatsAppAutomation] No keyword match and fallback is disabled for message '${rawText}'`);
          return { replied: false, reason: 'NO_MATCHING_RULE' };
        }
      }

      if (!replyContent || !replyContent.trim()) {
        return { replied: false, reason: 'EMPTY_REPLY_MESSAGE' };
      }

      // --- DISPATCH OUTBOUND MESSAGE ---
      // 1. Stage 1: Store outgoing message with status 'SENDING'
      const outgoingMsg = await WhatsAppConversationService.recordOutboundMessage({
        conversationId,
        customerId: conv.customerId,
        whatsappMessageId: null,
        senderType: 'AUTO',
        messageType: 'TEXT',
        messageText: replyContent,
        status: 'SENDING',
        errorMessage: null,
        metadata: {
          automated: true,
          inboundMessageId: inboundMessageId || null,
          ruleId: selectedRuleId,
          ruleName: selectedRuleName,
          matchType
        }
      });

      // Natural pause (600ms) before dispatching to Meta API
      await new Promise(r => setTimeout(r, 600));

      // 2. Stage 2: Dispatch through Meta WhatsApp Cloud API
      const settings = await getWhatsappSettings();
      const phoneNumberId = settings.phoneNumberId || settings.apiUrl?.match(/\/(\d+)\/messages/)?.[1] || '1228371843697142';
      const apiUrl = settings.apiUrl || `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;
      const accessToken = settings.apiKey || settings.accessToken;

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
        } catch (apiErr: any) {
          finalStatus = 'FAILED';
          const errMsg = apiErr.response?.data?.error?.message || apiErr.message || 'Meta API call failed';
          errorReason = errMsg;
          logger.error(`[WhatsAppAutomation] Meta WhatsApp API call failed: ${errMsg}`);
        }
      } else {
        // Sandbox mock dispatch
        whatsappMessageId = 'sim_auto_' + Math.random().toString(36).substring(7);
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

      // 4. Stage 4: Broadcast STATUS_CHANGED real-time event to Admin UI
      const { ConversationEventService } = await import('./conversationEventService');
      ConversationEventService.broadcast({
        type: 'STATUS_CHANGED',
        conversationId,
        message: updatedMsg,
        timestamp: new Date().toISOString()
      });

      // 5. Stage 5: Structured Audit Log
      logger.info(
        `[WhatsAppAutomation] Customer: ${customerName} (${conv.phone}) | MsgID: ${inboundMessageId || 'N/A'} | Rule: ${selectedRuleName} | Type: ${matchType} | Status: ${finalStatus}`
      );

      return {
        replied: finalStatus === 'SENT',
        ruleName: selectedRuleName,
        replyText: replyContent
      };
    } catch (err: any) {
      logger.error('[WhatsAppAutoReply] Critical error processing auto-reply:', err.message);
      return { replied: false, reason: err.message };
    }
  }
}
