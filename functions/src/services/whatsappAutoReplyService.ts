import axios from 'axios';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { WhatsAppConversationService } from './whatsappConversationService';
import { getWhatsappSettings } from '../controllers/whatsapp';

export interface AutoReplyRule {
  id: string;
  name: string;
  priority: number;
  triggerType: 'BUSINESS_HOURS' | 'ORDER_STATUS' | 'KEYWORD' | 'WELCOME' | 'DEFAULT';
  conditions?: {
    keywords: string[];
    matchType?: 'CONTAINS_ANY' | 'CONTAINS_ALL' | 'EXACT';
  };
  actionType: 'ORDER_STATUS_LOOKUP' | 'TEXT';
  responseText: string;
  delayMs?: number;
  isActive: boolean;
}

export interface AutoReplyConfig {
  enabled: boolean;
  humanTakeoverGlobal: boolean;
  businessHours: {
    enabled: boolean;
    days: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    start: string; // "09:30"
    end: string;   // "19:00"
    timezone: string; // "Asia/Kolkata"
    offlineMessage: string;
  };
  defaultReply: string;
  rules: AutoReplyRule[];
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
  humanTakeoverGlobal: false,
  businessHours: {
    enabled: true,
    days: [1, 2, 3, 4, 5, 6], // Mon - Sat
    start: '09:30',
    end: '19:00',
    timezone: 'Asia/Kolkata',
    offlineMessage:
      'Thank you for contacting 3D Galaxy! 🌙 Our customer support team is currently offline.\n' +
      'Our business hours are Monday to Saturday, 9:30 AM to 7:00 PM IST. We will respond promptly as soon as we are back online!'
  },
  defaultReply:
    'Thank you for reaching out to *3D Galaxy*! ✨\n' +
    'We have received your message and an executive will assist you shortly. If this is regarding an order, please provide your Order ID (e.g., #3DX0012).',
  rules: [
    {
      id: 'rule_biz_hours',
      name: 'Outside Business Hours',
      priority: 2,
      triggerType: 'BUSINESS_HOURS',
      actionType: 'TEXT',
      responseText:
        'Thank you for contacting 3D Galaxy! 🌙 Our customer support team is currently offline.\n' +
        'Our business hours are Monday to Saturday, 9:30 AM to 7:00 PM IST. We will respond promptly as soon as we open!',
      delayMs: 1000,
      isActive: true
    },
    {
      id: 'rule_order_status',
      name: 'Order Tracking & Status',
      priority: 3,
      triggerType: 'ORDER_STATUS',
      conditions: {
        keywords: ['order', 'tracking', 'track', 'status', 'where is my order', 'delivery', 'dispatch', 'shipment', 'awb'],
        matchType: 'CONTAINS_ANY'
      },
      actionType: 'ORDER_STATUS_LOOKUP',
      responseText: '', // dynamically synthesized
      delayMs: 1000,
      isActive: true
    },
    {
      id: 'rule_printing_service',
      name: '3D Printing & Custom Quote',
      priority: 4,
      triggerType: 'KEYWORD',
      conditions: {
        keywords: ['print', 'printing', 'stl', 'obj', 'quote', 'custom', 'service', 'fabricat', 'resin', 'fdm'],
        matchType: 'CONTAINS_ANY'
      },
      actionType: 'TEXT',
      responseText:
        'Great to connect with you! 🛠️ At *3D Galaxy*, we provide rapid high-accuracy FDM and SLA Resin custom printing services.\n\n' +
        'To get an instant custom quote, please share:\n' +
        '📁 Your 3D file (*.STL, *.OBJ, or STEP format)\n' +
        '🎨 Desired material (PLA, ABS, PETG, TPU, or 8K Resin)\n' +
        '⚙️ Required quantity & infill percentage\n\n' +
        'You can also upload directly at https://3dgalaxy.co.in/printing-service. Our engineering team will review it right away!',
      delayMs: 1000,
      isActive: true
    },
    {
      id: 'rule_filaments_catalog',
      name: 'Filaments, Materials & Spares',
      priority: 5,
      triggerType: 'KEYWORD',
      conditions: {
        keywords: ['filament', 'pla', 'petg', 'abs', 'tpu', 'spool', 'nozzle', 'bed', 'spares', 'stock', 'available'],
        matchType: 'CONTAINS_ANY'
      },
      actionType: 'TEXT',
      responseText:
        'Looking for high-grade 3D printing supplies? 🎯\n\n' +
        'We stock:\n' +
        '• Premium PLA, Silk PLA, Tough PETG & Flexible TPU filaments\n' +
        '• Standard & Water-Washable 8K Photopolymer Resins\n' +
        '• High-temp nozzles, PEI magnetic sheets & upgrade kits\n\n' +
        'Explore our catalog at https://3dgalaxy.co.in or let us know what specific item you need!',
      delayMs: 1000,
      isActive: true
    },
    {
      id: 'rule_welcome',
      name: 'Welcome Greeting',
      priority: 6,
      triggerType: 'WELCOME',
      conditions: {
        keywords: ['hi', 'hello', 'hey', 'start', 'vanakkam', 'namaste', 'greetings'],
        matchType: 'CONTAINS_ANY'
      },
      actionType: 'TEXT',
      responseText:
        'Hello 👋 Welcome to *3D Galaxy* — India\'s premier 3D Printing & Filament Hub! ✨\n\n' +
        'How can we assist you today?\n' +
        '1️⃣ *Track an Order* (Reply order)\n' +
        '2️⃣ *Custom 3D Printing Quote* (Send your .STL file)\n' +
        '3️⃣ *Filaments & Spares Advice* (PLA, PETG, TPU, Resin)\n' +
        '4️⃣ *Talk to Support Executive*',
      delayMs: 1000,
      isActive: true
    }
  ]
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
        return { ...DEFAULT_CONFIG, ...parsed };
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
    const updated = await prisma.setting.upsert({
      where: { settingKey: 'whatsapp-auto-reply-settings' },
      update: { settingData: config as any, updatedAt: new Date() },
      create: { settingKey: 'whatsapp-auto-reply-settings', settingData: config as any }
    });
    return typeof updated.settingData === 'string' ? JSON.parse(updated.settingData) : (updated.settingData as any);
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
   * Checks whether the current time in the given timezone (default IST) is outside business hours.
   */
  public static isOutsideBusinessHours(bh: AutoReplyConfig['businessHours']): boolean {
    if (!bh || !bh.enabled) return false;

    try {
      // Get current date/time in the target timezone (default Asia/Kolkata)
      const now = new Date();
      const tz = bh.timezone || 'Asia/Kolkata';

      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      const parts = formatter.formatToParts(now);
      const weekdayStr = parts.find(p => p.type === 'weekday')?.value || 'Mon';
      const hourStr = parts.find(p => p.type === 'hour')?.value || '00';
      const minuteStr = parts.find(p => p.type === 'minute')?.value || '00';

      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const currentDay = dayMap[weekdayStr] ?? 1;

      // Check if current day is an active business day
      if (Array.isArray(bh.days) && bh.days.length > 0 && !bh.days.includes(currentDay)) {
        return true;
      }

      // Check time range
      const [startHour, startMin] = bh.start.split(':').map(Number);
      const [endHour, endMin] = bh.end.split(':').map(Number);

      const currentMinutes = Number(hourStr) * 60 + Number(minuteStr);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
        return true;
      }

      return false;
    } catch (e: any) {
      logger.warn('[WhatsAppAutoReplyService] Business hours check error:', e.message);
      return false;
    }
  }

  /**
   * Matches keyword conditions against incoming customer text.
   */
  private static matchesKeywords(
    text: string,
    keywords: string[],
    matchType: 'CONTAINS_ANY' | 'CONTAINS_ALL' | 'EXACT' = 'CONTAINS_ANY'
  ): boolean {
    const normalized = text.toLowerCase().trim();
    if (!keywords || keywords.length === 0) return false;

    const lowerKeywords = keywords.map(k => k.toLowerCase().trim()).filter(Boolean);

    if (matchType === 'EXACT') {
      return lowerKeywords.some(k => normalized === k);
    }

    if (matchType === 'CONTAINS_ALL') {
      return lowerKeywords.every(k => normalized.includes(k));
    }

    // Default: CONTAINS_ANY
    return lowerKeywords.some(k => {
      // Match word boundaries or substring
      const regex = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      return regex.test(normalized) || normalized.includes(k);
    });
  }

  /**
   * Primary entry point: Evaluates incoming customer message through rule engine and sends automated reply without AI.
   */
  public static async processCustomerMessage(
    conversationId: string,
    inboundText: string
  ): Promise<{ replied: boolean; ruleName?: string; replyText?: string; reason?: string }> {
    try {
      const config = await this.getConfig();

      // Check 1: Global auto-reply master toggle
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
            include: {
              user: true,
              orders: {
                orderBy: { createdAt: 'desc' },
                take: 3,
                include: {
                  items: {
                    include: {
                      product: { select: { name: true, sku: true } },
                      variant: { select: { name: true, sku: true } }
                    }
                  },
                  payments: true
                }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10
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

      const text = (inboundText || '').trim();
      const customer = conv.customer;
      const customerName = customer?.user
        ? `${customer.user.firstName || ''} ${customer.user.lastName || ''}`.trim()
        : (conv.customerName || 'Customer');

      // Sort rules by priority ascending (1 is highest priority)
      const sortedRules = [...(config.rules || [])]
        .filter(r => r.isActive)
        .sort((a, b) => (a.priority || 99) - (b.priority || 99));

      let matchedRule: AutoReplyRule | null = null;
      let replyContent = '';

      for (const rule of sortedRules) {
        // Evaluate rule by triggerType
        if (rule.triggerType === 'BUSINESS_HOURS') {
          if (this.isOutsideBusinessHours(config.businessHours)) {
            matchedRule = rule;
            replyContent = rule.responseText || config.businessHours.offlineMessage;
            break;
          }
        } else if (rule.triggerType === 'ORDER_STATUS') {
          const kw = rule.conditions?.keywords || ['order', 'tracking', 'track', 'status', 'where is my order'];
          if (this.matchesKeywords(text, kw, rule.conditions?.matchType)) {
            matchedRule = rule;

            // Dynamically construct order response using customer's actual latest order
            const recentOrders = customer?.orders || [];
            if (recentOrders.length > 0) {
              const ord = recentOrders[0];
              const orderNum = ord.orderNumber;
              const ordStatus = ord.status;
              const ordTotal = ord.totalAmount;
              const delivery = ord.estimatedDelivery || '3-5 business days';
              const itemsList = ord.items?.map((it: any) => `${it.product?.name || 'Item'} (x${it.quantity})`).join(', ') || '';

              replyContent =
                `Hello ${customerName}! 👋\n\n` +
                `Here is the latest update on your order:\n` +
                `📦 *Order:* #${orderNum}\n` +
                `📊 *Status:* *${ordStatus}*\n` +
                `💳 *Total:* ₹${ordTotal}\n` +
                (itemsList ? `🛍️ *Items:* ${itemsList}\n` : '') +
                `🚚 *Estimated Delivery:* ${delivery}\n\n` +
                `Reply here if you need additional assistance, and our support team will assist you!`;
            } else {
              // Try finding order by matching phone number in database
              const cleanPhone = conv.phone.replace(/[^\d]/g, '').slice(-10);
              const foundByPhone = await prisma.order.findFirst({
                where: {
                  OR: [
                    { customer: { user: { mobile: { contains: cleanPhone } } } },
                    { notes: { contains: cleanPhone } }
                  ]
                },
                orderBy: { createdAt: 'desc' }
              });

              if (foundByPhone) {
                replyContent =
                  `Hello ${customerName}! 👋\n\n` +
                  `We located your recent order *#${foundByPhone.orderNumber}*!\n` +
                  `📊 *Status:* *${foundByPhone.status}*\n` +
                  `💳 *Total:* ₹${foundByPhone.totalAmount}\n` +
                  `🚚 *Estimated Delivery:* ${foundByPhone.estimatedDelivery || '3-5 business days'}\n\n` +
                  `Reply here if you'd like tracking details!`;
              } else {
                replyContent =
                  `Hello ${customerName}! 👋\n\n` +
                  `We could not locate an active order linked to your phone number.\n` +
                  `Please share your *Order ID* (e.g. *#3DX0012*) and we will gladly check the status for you!`;
              }
            }
            break;
          }
        } else if (rule.triggerType === 'WELCOME') {
          // Check if conversation is new or first customer message
          const customerMsgCount = (conv.messages || []).filter(m => m.direction === 'INBOUND').length;
          const isFirstMessage = customerMsgCount <= 1;
          const kw = rule.conditions?.keywords || ['hi', 'hello', 'hey'];

          if (isFirstMessage || this.matchesKeywords(text, kw, rule.conditions?.matchType)) {
            matchedRule = rule;
            replyContent = rule.responseText.replace(/{customerName}/g, customerName);
            break;
          }
        } else if (rule.triggerType === 'KEYWORD') {
          if (rule.conditions && this.matchesKeywords(text, rule.conditions.keywords, rule.conditions.matchType)) {
            matchedRule = rule;
            replyContent = rule.responseText.replace(/{customerName}/g, customerName);
            break;
          }
        } else if (rule.triggerType === 'DEFAULT') {
          matchedRule = rule;
          replyContent = rule.responseText.replace(/{customerName}/g, customerName);
          break;
        }
      }

      // If no rule matched, check if default reply should be sent
      if (!matchedRule && config.defaultReply && config.defaultReply.trim()) {
        // Only if message is not empty and no other rule handled it
        matchedRule = {
          id: 'rule_default_fallback',
          name: 'Default Reply',
          priority: 99,
          triggerType: 'DEFAULT',
          actionType: 'TEXT',
          responseText: config.defaultReply,
          isActive: true
        };
        replyContent = config.defaultReply.replace(/{customerName}/g, customerName);
      }

      if (!matchedRule || !replyContent || !replyContent.trim()) {
        return { replied: false, reason: 'NO_RULE_MATCHED' };
      }

      logger.info(`[WhatsAppAutoReply] AUTO_REPLY_MATCHED: Rule '${matchedRule.name}' matched for conversation ${conversationId}`);

      // Apply delay if configured
      const delay = matchedRule.delayMs || 0;
      if (delay > 0 && delay <= 5000) {
        await new Promise(r => setTimeout(r, delay));
      }

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

      logger.info(`[WhatsAppAutoReply] AUTO_REPLY_SENT: Dispatched rule '${matchedRule.name}' to ${conv.phone}`);
      return {
        replied: true,
        ruleName: matchedRule.name,
        replyText: replyContent
      };
    } catch (err: any) {
      logger.error('[WhatsAppAutoReply] Critical error processing auto-reply:', err.message);
      return { replied: false, reason: err.message };
    }
  }
}
