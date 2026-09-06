import axios from 'axios';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { WhatsAppConversationService } from './whatsappConversationService';
import { getWhatsappSettings } from '../controllers/whatsapp';

export class WhatsAppAutoReplyService {
  /**
   * Generates deterministic, business-aligned auto-replies for WhatsApp customers.
   * Eliminates unpredictable AI/LLM hallucinations while ensuring instant support responses.
   */
  public static generateAutoReply(
    inboundText: string,
    customerName: string,
    orderSummaries: any[]
  ): string {
    const text = (inboundText || '').trim().toLowerCase();

    // 1. Order tracking & status queries
    const isOrderQuery = /order|status|track|dispatch|delivery|where.*my|shipped|courier|tracking/i.test(text);
    if (isOrderQuery) {
      if (orderSummaries.length > 0) {
        const latest = orderSummaries[0];
        return (
          `Hello ${customerName}! 👋\n\n` +
          `Your recent order *#${latest.orderNumber}* is currently *${latest.status}*.\n` +
          `📦 *Items:* ${latest.items}\n` +
          `💳 *Total:* ₹${latest.totalAmount} (${latest.paymentStatus})\n` +
          `🚚 *Estimated Delivery:* ${latest.estimatedDelivery}\n\n` +
          `Need tracking details or order changes? Reply here and our team will assist you!`
        );
      }
      return (
        `Hello ${customerName}! 👋\n\n` +
        `We could not find an active order linked to this phone number.\n` +
        `Could you please share your *Order ID* (e.g. *3DX0012*)? We will look it up immediately!`
      );
    }

    // 2. Greetings
    const isGreeting = /^(hi|hello|hey|good\s*morning|good\s*afternoon|good\s*evening|vanakkam|namaste|start|hola)\b/i.test(text);
    if (isGreeting) {
      return (
        `Hello ${customerName}! 👋 Welcome to *3D Galaxy* — India's premier 3D Printing & Filament Hub! ✨\n\n` +
        `How can we assist you today?\n` +
        `1️⃣ *Track an Order* (Reply order)\n` +
        `2️⃣ *Custom 3D Printing Quote* (Send your .STL file)\n` +
        `3️⃣ *Filaments & Spares Advice* (PLA, PETG, TPU, Resin)\n` +
        `4️⃣ *Talk to Support Executive*`
      );
    }

    // 3. Custom 3D Printing / Service / STL quote inquiries
    const isPrintingService = /print|stl|obj|quote|custom|service|make|fabricat|cost|rate|price/i.test(text);
    if (isPrintingService) {
      return (
        `Great to connect with you! 🛠️ At *3D Galaxy*, we provide rapid high-accuracy FDM and SLA Resin custom printing services.\n\n` +
        `To get a quick custom quote, please share:\n` +
        `📁 Your 3D file (*.STL, *.OBJ, or STEP format)\n` +
        `🎨 Desired material (PLA, ABS, PETG, TPU, or 8K Resin)\n` +
        `⚙️ Required quantity & infill percentage\n\n` +
        `Our engineering team will inspect the geometry and send you a quote promptly!`
      );
    }

    // 4. Products, Filaments, Accessories
    const isProductQuery = /filament|pla|petg|abs|tpu|resin|printer|nozzle|bed|accessories|spares/i.test(text);
    if (isProductQuery) {
      return (
        `Looking for high-grade 3D printing supplies? 🎯\n\n` +
        `We stock:\n` +
        `• Premium PLA, Silk PLA, Tough PETG & Flexible TPU filaments\n` +
        `• Standard & Water-Washable 8K Photopolymer Resins\n` +
        `• High-temp nozzles, PEI magnetic sheets & upgrade kits\n\n` +
        `Explore our full catalog at https://3dgalaxy.in or let us know what model you need!`
      );
    }

    // 5. Cancellation, Return, Complaint, Human handoff
    const isSupportHandoff = /cancel|return|refund|damage|defect|broken|wrong|human|agent|admin|executive|help/i.test(text);
    if (isSupportHandoff) {
      return (
        `We understand! 🙏 We have alerted our customer care desk.\n` +
        `A support executive will review your chat history and connect with you directly.\n` +
        `Working hours: Mon–Sat, 9:30 AM to 7:00 PM IST.`
      );
    }

    // 6. Generic intelligent auto-reply
    return (
      `Thank you for reaching out to *3D Galaxy*! ✨\n\n` +
      `We have received your message: _"${inboundText}"_.\n\n` +
      `If you have an order question, please mention your *Order ID*. For custom quotes, send your *.STL* file. Our team will assist you shortly!`
    );
  }

  /**
   * Evaluates incoming message and triggers automated response if auto-reply is active.
   */
  public static async processCustomerMessage(
    conversationId: string,
    inboundText: string
  ): Promise<{ replied: boolean; replyText?: string }> {
    try {
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
            take: 6
          }
        }
      });

      // If conversation is in HUMAN mode or not found, do not auto-reply
      if (!conv || conv.aiMode === 'HUMAN') {
        logger.info(`[WhatsAppAutoReply] Conversation ${conversationId} is in HUMAN mode. Auto-reply skipped.`);
        return { replied: false };
      }

      // Build customer and order context
      const customer = conv.customer;
      const customerName = customer?.user
        ? `${customer.user.firstName || ''} ${customer.user.lastName || ''}`.trim()
        : (conv.customerName || 'Valued Customer');

      const recentOrders = customer?.orders || [];
      const orderSummaries = recentOrders.map((ord: any) => ({
        orderNumber: ord.orderNumber,
        status: ord.status,
        totalAmount: ord.totalAmount,
        paymentMethod: ord.paymentMethod,
        paymentStatus: ord.paymentStatus || (ord.payments?.[0]?.status ?? 'Pending'),
        createdAt: new Date(ord.createdAt).toLocaleDateString('en-IN'),
        estimatedDelivery: ord.estimatedDelivery || '3-5 business days',
        items: ord.items?.map((it: any) => `${it.product?.name || 'Product'} x ${it.quantity}`).join(', ') || 'N/A'
      }));

      // Generate deterministic auto-reply
      const replyText = this.generateAutoReply(inboundText, customerName, orderSummaries);

      if (!replyText || !replyText.trim()) {
        return { replied: false };
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
              text: { preview_url: false, body: replyText }
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
        // Local sandbox simulation
        whatsappMessageId = 'sim_auto_' + Math.random().toString(36).substring(7);
      }

      // Record outbound AUTO message in database
      await WhatsAppConversationService.recordOutboundMessage({
        conversationId,
        customerId: conv.customerId,
        whatsappMessageId,
        senderType: 'AUTO',
        messageText: replyText,
        status,
        errorMessage
      });

      logger.info(`[WhatsAppAutoReply] Dispatched auto-reply for conversation ${conversationId}`);
      return { replied: true, replyText };
    } catch (err: any) {
      logger.error('[WhatsAppAutoReply] Error handling auto-reply:', err.message);
      return { replied: false };
    }
  }
}

// Backward compatibility alias for any existing imports
export const WhatsAppAiService = WhatsAppAutoReplyService;
