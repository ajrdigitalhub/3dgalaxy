import prisma from '../config/database';
import { logger } from '../utils/logger';

export interface AutoReplyRule {
  id: string;
  name: string;
  keywords: string[];
  replyMessage: string;
  matchType: 'CONTAINS' | 'EXACT';
  priority: number;
  enabled: boolean;
  isOrderAware?: boolean;
}

export interface AutoReplyConfig {
  defaultGreetingEnabled: boolean;
  greetingMessage: string;
  keywordRepliesEnabled: boolean;
  rules: AutoReplyRule[];
  fallbackEnabled: boolean;
  fallbackMessage: string;
  humanTakeoverGlobal?: boolean;
}

export interface RuleMatchResult {
  matched: boolean;
  ruleId?: string;
  ruleName?: string;
  matchType?: 'GREETING' | 'KEYWORD' | 'ORDER_LOOKUP' | 'FALLBACK';
  matchedKeyword?: string;
  replyText: string;
}

export const DEFAULT_RULES: AutoReplyRule[] = [
  {
    id: 'rule_order_status',
    name: 'Order Tracking & Status',
    keywords: ['order', 'status', 'tracking', 'track', 'shipment', 'where is my order'],
    replyMessage: 'Sure! Please share your Order ID, for example #3DX0012, so we can check the latest status.',
    matchType: 'CONTAINS',
    priority: 100,
    enabled: true,
    isOrderAware: true
  },
  {
    id: 'rule_delivery_pincode',
    name: 'Delivery & Pincode',
    keywords: ['delivery', 'pincode', 'shipping', 'transit', 'pin code'],
    replyMessage: 'Please share your Order ID or delivery PIN code so we can check the delivery details.',
    matchType: 'CONTAINS',
    priority: 90,
    enabled: true,
    isOrderAware: false
  },
  {
    id: 'rule_payment',
    name: 'Payment & Invoice',
    keywords: ['payment', 'pay', 'invoice', 'receipt', 'upi', 'bill'],
    replyMessage: 'Please share your Order ID and we will help you with the payment status.',
    matchType: 'CONTAINS',
    priority: 85,
    enabled: true,
    isOrderAware: false
  },
  {
    id: 'rule_refund',
    name: 'Refund & Cancellation',
    keywords: ['refund', 'return', 'cancel', 'cancellation'],
    replyMessage: 'Please share your Order ID so our team can check your refund status.',
    matchType: 'CONTAINS',
    priority: 80,
    enabled: true,
    isOrderAware: false
  },
  {
    id: 'rule_stl_quote',
    name: 'Custom 3D Printing & STL Quote',
    keywords: ['stl', 'obj', 'quote', '3d print', 'cad', 'custom print', 'prototype'],
    replyMessage: 'Please share your 3D CAD/STL file here or upload directly at https://3dgalaxy.co.in/services along with your preferred material for an instant quote! 🖨️',
    matchType: 'CONTAINS',
    priority: 75,
    enabled: true,
    isOrderAware: false
  },
  {
    id: 'rule_filaments',
    name: 'Filaments & Materials Pricing',
    keywords: ['filament', 'pla', 'petg', 'abs', 'resin', 'tpu', 'material', 'spool'],
    replyMessage: 'We stock high-precision PLA (₹2.5/g), PETG (₹3.2/g), ABS (₹3.5/g), TPU Flexible (₹4.8/g), and High-Detail Resin (₹7.5/g). Which material and color are you looking for?',
    matchType: 'CONTAINS',
    priority: 70,
    enabled: true,
    isOrderAware: false
  },
  {
    id: 'rule_support',
    name: 'Customer Support',
    keywords: ['support', 'help', 'executive', 'agent', 'contact'],
    replyMessage: 'Sure. Please describe your issue and our support team will assist you.',
    matchType: 'CONTAINS',
    priority: 60,
    enabled: true,
    isOrderAware: false
  },
  {
    id: 'rule_hello',
    name: 'Hello Greeting',
    keywords: ['hello', 'vanakkam', 'namaste'],
    replyMessage: 'Hello! 👋 Welcome to 3D Galaxy. How can we help you?',
    matchType: 'CONTAINS',
    priority: 50,
    enabled: true,
    isOrderAware: false
  },
  {
    id: 'rule_hi',
    name: 'Hi Greeting',
    keywords: ['hi', 'hey', 'start'],
    replyMessage: 'Hi! 👋 How can we assist you today?',
    matchType: 'CONTAINS',
    priority: 45,
    enabled: true,
    isOrderAware: false
  }
];

export const DEFAULT_CONFIG: AutoReplyConfig = {
  defaultGreetingEnabled: true,
  greetingMessage: 'Hello! Thank you for reaching out to 3D Galaxy. 👋\nHow can we assist you today?',
  keywordRepliesEnabled: true,
  rules: DEFAULT_RULES,
  fallbackEnabled: true,
  fallbackMessage: 'Thank you for contacting 3D Galaxy. Our team will review your message and assist you shortly. 🙏',
  humanTakeoverGlobal: false
};

export class WhatsAppRuleEngine {
  /**
   * Normalizes incoming customer text (case-insensitive and trimmed).
   */
  public static normalizeText(text: string): string {
    return (text || '')
      .toLowerCase()
      .replace(/[\r\n]+/g, ' ')
      .trim();
  }

  /**
   * Extracts potential Order ID from customer message text (e.g. #3DX0012, 3DX0012, ORD-12345).
   */
  public static extractOrderId(text: string): string | null {
    if (!text) return null;
    // Look for explicit 3DX order formats like #3DX0012 or 3DX0012
    const pattern3dx = /(?:#|\b)(3DX[0-9A-Za-z_-]{2,20})\b/i;
    const match3dx = text.match(pattern3dx);
    if (match3dx && match3dx[1]) {
      return match3dx[1].toUpperCase();
    }

    // Look for generic #12345 or #ORD-123
    const patternGeneric = /#([0-9A-Za-z_-]{4,20})\b/;
    const matchGeneric = text.match(patternGeneric);
    if (matchGeneric && matchGeneric[1]) {
      return matchGeneric[1];
    }

    return null;
  }

  /**
   * Evaluates keyword rules in priority order against normalized customer text.
   */
  public static async evaluateKeywords(
    rawText: string,
    rules: AutoReplyRule[],
    customerOrders: any[] = []
  ): Promise<RuleMatchResult | null> {
    const normalized = this.normalizeText(rawText);
    if (!normalized) return null;

    // Filter enabled rules and sort by priority descending
    const sortedRules = (rules || [])
      .filter(r => r.enabled)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Check for detected Order ID in customer text
    const extractedOrderId = this.extractOrderId(rawText);

    for (const rule of sortedRules) {
      const keywords = (rule.keywords || [])
        .map(k => (k || '').toLowerCase().trim())
        .filter(Boolean);

      let matchedKeyword: string | null = null;

      if (rule.matchType === 'EXACT') {
        matchedKeyword = keywords.find(k => normalized === k) || null;
      } else {
        // CONTAINS match: checks word boundaries or direct inclusion
        matchedKeyword = keywords.find(k => {
          if (normalized === k) return true;
          const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(^|\\b|\\s)${escaped}(\\b|\\s|[!.,?]|$)`, 'i');
          return regex.test(normalized) || normalized.includes(k);
        }) || null;
      }

      if (matchedKeyword) {
        // If order-aware rule and an order ID is present, fetch deterministic order status
        if (rule.isOrderAware) {
          const orderReply = await this.resolveDeterministicOrderStatus(extractedOrderId, customerOrders);
          if (orderReply) {
            return {
              matched: true,
              ruleId: rule.id,
              ruleName: rule.name,
              matchType: 'ORDER_LOOKUP',
              matchedKeyword,
              replyText: orderReply
            };
          }
        }

        return {
          matched: true,
          ruleId: rule.id,
          ruleName: rule.name,
          matchType: 'KEYWORD',
          matchedKeyword,
          replyText: rule.replyMessage
        };
      }
    }

    return null;
  }

  /**
   * Deterministically retrieves live order details from database without any AI.
   */
  private static async resolveDeterministicOrderStatus(
    orderIdParam: string | null,
    customerOrders: any[]
  ): Promise<string | null> {
    try {
      let order: any = null;

      if (orderIdParam) {
        order = await prisma.order.findFirst({
          where: {
            OR: [
              { orderNumber: { equals: orderIdParam, mode: 'insensitive' } },
              { id: orderIdParam }
            ]
          },
          include: {
            items: {
              include: {
                product: { select: { name: true } }
              }
            }
          }
        });
      }

      // If specific order not found by ID, check customer's most recent order
      if (!order && customerOrders && customerOrders.length > 0) {
        order = customerOrders[0];
      }

      if (order) {
        const orderNum = order.orderNumber || order.id;
        const status = (order.status || 'Processing').toUpperCase();
        const items = (order.items || [])
          .map((i: any) => i.product?.name)
          .filter(Boolean)
          .slice(0, 2)
          .join(', ');

        const itemsSnippet = items ? ` (Items: ${items})` : '';
        return `Your order #${orderNum} is currently *${status}*${itemsSnippet}. Total: ₹${order.totalAmount || 0}.\nYou can track live shipping status anytime at https://3dgalaxy.co.in/orders.`;
      }
    } catch (err: any) {
      logger.warn('[WhatsAppRuleEngine] Order status lookup error:', err.message);
    }

    return null;
  }

  /**
   * Test evaluation runner: Executes deterministic matching simulation for Admin UI.
   */
  public static async testEvaluate(
    testText: string,
    config: AutoReplyConfig,
    customerName: string = 'Valued Customer'
  ): Promise<{
    matchedRule: string;
    matchType: string;
    matchedKeyword?: string;
    replyMessage: string;
    reason: string;
  }> {
    const raw = (testText || '').trim();
    if (!raw) {
      return {
        matchedRule: 'None',
        matchType: 'NONE',
        replyMessage: '',
        reason: 'Empty test message provided'
      };
    }

    // 1. Keyword rule check
    if (config.keywordRepliesEnabled && config.rules && config.rules.length > 0) {
      const keywordResult = await this.evaluateKeywords(raw, config.rules, []);
      if (keywordResult && keywordResult.matched) {
        return {
          matchedRule: keywordResult.ruleName || 'Keyword Rule',
          matchType: keywordResult.matchType || 'KEYWORD',
          matchedKeyword: keywordResult.matchedKeyword,
          replyMessage: keywordResult.replyText,
          reason: `Matched keyword "${keywordResult.matchedKeyword}" with rule "${keywordResult.ruleName}"`
        };
      }
    }

    // 2. Fallback check
    if (config.fallbackEnabled && config.fallbackMessage) {
      return {
        matchedRule: 'Default Fallback',
        matchType: 'FALLBACK',
        replyMessage: config.fallbackMessage,
        reason: 'No keywords matched; default fallback response selected'
      };
    }

    return {
      matchedRule: 'None',
      matchType: 'NONE',
      replyMessage: '',
      reason: 'No keywords matched and fallback is disabled'
    };
  }
}
