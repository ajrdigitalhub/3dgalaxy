import axios from 'axios';
import prisma from '../config/database';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { WhatsAppConversationService } from './whatsappConversationService';
import { WhatsAppNotificationService } from './whatsappNotificationService';
import { getWhatsappSettings } from '../controllers/whatsapp';

export class WhatsAppAiService {
  /**
   * Evaluates incoming message and generates an automated AI reply if AI mode is active.
   */
  public static async processCustomerMessage(
    conversationId: string,
    inboundText: string
  ): Promise<{ replied: boolean; replyText?: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('[WhatsAppAiService] GEMINI_API_KEY missing. AI auto-reply skipped.');
      return { replied: false };
    }

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

      // Invert messages to chronological order
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

Guidelines for your response:
1. Always be polite, professional, concise, and helpful. Format nicely for WhatsApp (use *bold* for order numbers or key dates, bullet points where appropriate).
2. If the customer asks "Where is my order?" or about their shipment:
   - Check their recent orders above. Mention their latest order number, current status, and estimated delivery clearly.
3. If they ask about product recommendations or filament advice:
   - Provide knowledgeable, friendly recommendations (e.g., PLA for beginners, PETG for durable parts, TPU for flexible parts).
4. If the customer has an urgent issue, wants to cancel an order, or requests human intervention:
   - Reassure them that a support executive will follow up shortly.
5. Keep your response under 160 words so it is easy to read on mobile WhatsApp.
6. Return a plain text response ONLY (do NOT wrap in JSON or code blocks).
`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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
        { timeout: 9000 }
      );

      const candidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText || !candidateText.trim()) {
        return { replied: false };
      }

      const replyText = candidateText.trim();

      // Dispatch AI reply through existing Meta WhatsApp API service
      const settings = await getWhatsappSettings();
      const apiUrl = settings.apiUrl || `https://graph.facebook.com/v19.0/${settings.phoneNumberId}/messages`;
      const accessToken = settings.apiKey || settings.accessToken;

      let whatsappMessageId: string | null = null;
      let status: 'SENT' | 'FAILED' = 'SENT';
      let errorMessage: string | null = null;

      if (settings.apiEnabled && accessToken && settings.phoneNumberId) {
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

      logger.info(`[WhatsAppAiService] Dispatched AI reply for conversation ${conversationId}`);
      return { replied: true, replyText };
    } catch (err: any) {
      logger.error('[WhatsAppAiService] Error generating AI response:', err.message);
      return { replied: false };
    }
  }
}
