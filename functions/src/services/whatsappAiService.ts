import axios from 'axios';
import prisma from '../config/database';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { WhatsAppConversationService } from './whatsappConversationService';
import { getWhatsappSettings } from '../controllers/whatsapp';

export class WhatsAppAiService {
  /**
   * Generates a context-aware fallback response when Gemini API key is missing or unavailable.
   */
  private static generateRuleBasedReply(
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
          `Hello *${customerName}*! 👋\n\n` +
          `Your recent order *#${latest.orderNumber}* is currently *${latest.status}*.\n` +
          `📦 *Items:* ${latest.items}\n` +
          `💰 *Total:* ${latest.totalAmount} (${latest.paymentMethod || 'Prepaid'})\n` +
          `🚚 *Estimated Delivery:* ${latest.estimatedDelivery}\n\n` +
          `Need tracking details or order changes? Reply here and our team will assist you!`
        );
      }
      return (
        `Hello *${customerName}*! 👋\n\n` +
        `We could not find an active order linked to this phone number. ` +
        `Could you please share your *Order ID* (e.g. *3DX0012*)? We will look it up immediately!`
      );
    }

    // 2. Greetings
    const isGreeting = /^(hi|hello|hey|good\s*morning|good\s*afternoon|good\s*evening|vanakkam|namaste|start|hola)\b/i.test(text);
    if (isGreeting) {
      return (
        `Hello *${customerName}*! 👋 Welcome to *3D Galaxy* – India's premier 3D Printing & Filament Hub! 🚀\n\n` +
        `How can we assist you today?\n` +
        `1️⃣ *Track an Order* (Reply "order")\n` +
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
        `🧵 Desired material (PLA, ABS, PETG, TPU, or 8K Resin)\n` +
        `🎯 Required quantity & infill percentage\n\n` +
        `Our engineering team will inspect the geometry and send you a quote promptly!`
      );
    }

    // 4. Products, Filaments, Accessories
    const isProductQuery = /filament|pla|petg|abs|tpu|resin|printer|nozzle|bed|accessories|spares/i.test(text);
    if (isProductQuery) {
      return (
        `Looking for high-grade 3D printing supplies? 🛒\n\n` +
        `We stock:\n` +
        `✨ Premium PLA, Silk PLA, Tough PETG & Flexible TPU filaments\n` +
        `✨ Standard & Water-Washable 8K Photopolymer Resins\n` +
        `✨ High-temp nozzles, PEI magnetic sheets & upgrade kits\n\n` +
        `Explore our full catalog at https://3dgalaxy.in or let us know what model you need!`
      );
    }

    // 5. Cancellation, Return, Complaint, Human handoff
    const isSupportHandoff = /cancel|return|refund|damage|defect|broken|wrong|human|agent|admin|executive|help/i.test(text);
    if (isSupportHandoff) {
      return (
        `We understand! ⚠️ We have alerted our customer care desk. ` +
        `A support executive will review your chat history and connect with you directly. ` +
        `Working hours: Mon–Sat, 9:30 AM to 7:00 PM IST.`
      );
    }

    // 6. Generic intelligent fallback
    return (
      `Thank you for reaching out to *3D Galaxy*! 🚀\n\n` +
      `We have received your message: _"${inboundText.length > 50 ? inboundText.substring(0, 50) + '...' : inboundText}"_.\n\n` +
      `If you have an order question, please mention your *Order ID*. For custom quotes, send your *.STL* file. Our team will assist you shortly!`
    );
  }

  /**
   * Evaluates incoming message and generates an automated AI reply if AI mode is active.
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

      if (!conv || conv.aiMode === 'HUMAN') {
        logger.info(`[WhatsAppAiService] Conversation ${conversationId} is in HUMAN mode or not found. AI auto-reply skipped.`);
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
        totalAmount: `₹${ord.totalAmount}`,
        paymentMethod: ord.paymentMethod,
        paymentStatus: ord.paymentStatus || (ord.payments?.[0]?.status ?? 'Pending'),
        createdAt: new Date(ord.createdAt).toLocaleDateString('en-IN'),
        estimatedDelivery: ord.estimatedDelivery || '3-5 business days',
        items: ord.items?.map((it: any) => `${it.product?.name || 'Product'} (${it.variant?.name || 'Standard'}) x${it.quantity}`).join(', ') || 'N/A'
      }));

      let replyText: string = '';

      // Check for Gemini API Key
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const history = (conv.messages || []).reverse().map((m: any) => ({
            role: m.direction === 'INBOUND' ? 'Customer' : 'Store Assistant',
            text: m.messageText
          }));

          const systemPrompt = `
You are the official AI Customer Support Assistant for "3D Galaxy" (3D Galaxy Labs) – India's premier 3D printer, specialized filament, resin, accessories, and OEM parts e-commerce store.
Store Website: https://3dgalaxy.in

Customer Profile:
- Name: ${customerName}
- Phone: ${conv.phone}

Customer Recent Orders:
${orderSummaries.length > 0 ? JSON.stringify(orderSummaries, null, 2) : 'No recent orders found on record.'}

Store Policies & General Knowledge:
- Shipping: Free delivery across India on orders above ₹3,500. Standard delivery time is 3 to 5 business days.
- Cash on Delivery (COD): Available on select products for order totals ₹2,500 or below (₹100 COD handling fee applies).
- Products: FDM 3D Printers, SLA/Resin Printers, PLA/PETG/ABS/TPU filaments, 3D pens, nozzles, magnetic PEI build plates, accessories, custom 3D printing on-demand service.
- Return Policy: 7-day replacement or refund for damaged/defective products on delivery.
- Support Working Hours: Mon-Sat, 9:30 AM to 7:00 PM IST.

Guidelines:
1. Always be polite, professional, concise, and helpful. Format nicely for WhatsApp (use *bold* for order numbers or key dates, bullet points where appropriate).
2. If the customer asks about order status or shipment: check orders above and mention latest order number, current status, and estimated delivery clearly.
3. Keep response under 160 words so it is easy to read on mobile WhatsApp.
4. Return plain text response ONLY (do NOT wrap in markdown code blocks).
`;

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
          const response = await axios.post(
            geminiUrl,
            {
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: systemPrompt },
                    { text: `Conversation History:\n${history.map(h => `${h.role}: ${h.text}`).join('\n')}\n\nLatest Customer Message:\n${inboundText}` }
                  ]
                }
              ]
            },
            { timeout: 7000 }
          );

          const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate && candidate.trim()) {
            replyText = candidate.trim();
          }
        } catch (geminiErr: any) {
          logger.warn(`[WhatsAppAiService] Gemini API call failed (${geminiErr.message}), falling back to intelligent rule responder.`);
        }
      }

      // If Gemini wasn't available or didn't return text, use intelligent rule responder
      if (!replyText) {
        replyText = this.generateRuleBasedReply(inboundText, customerName, orderSummaries);
      }

      if (!replyText || !replyText.trim()) {
        return { replied: false };
      }

      // Dispatch AI reply through Meta WhatsApp API service
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
          logger.error('[WhatsAppAiService] Failed to dispatch AI message via Meta API:', apiErr.response?.data || apiErr.message);
          status = 'FAILED';
          errorMessage = apiErr.response?.data?.error?.message || apiErr.message;
        }
      } else {
        // Sandbox mode
        whatsappMessageId = 'sim_ai_' + Math.random().toString(36).substring(7);
      }

      // Record outbound AI message in database
      await WhatsAppConversationService.recordOutboundMessage({
        conversationId,
        customerId: conv.customerId,
        whatsappMessageId,
        senderType: 'AI',
        messageText: replyText,
        status,
        errorMessage
      });

      logger.info(`[WhatsAppAiService] Dispatched AI auto-reply for conversation ${conversationId}`);
      return { replied: true, replyText };
    } catch (err: any) {
      logger.error('[WhatsAppAiService] Error generating AI response:', err.message);
      return { replied: false };
    }
  }
}
