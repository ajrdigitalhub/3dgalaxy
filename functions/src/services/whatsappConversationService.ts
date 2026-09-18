import prisma from '../config/database';
import { logger } from '../utils/logger';
import { ConversationEventService } from './conversationEventService';
import { NotificationService } from './notification.service';

export interface InboundWhatsAppMessageData {
  whatsappMessageId: string;
  fromPhone: string;
  customerName?: string;
  messageType: string;
  messageText?: string;
  mediaId?: string;
  mediaUrl?: string;
  mediaMetadata?: any;
  timestamp: Date;
  rawPayload?: any;
}

export class WhatsAppConversationService {
  /**
   * Normalizes phone number into standard variations for robust matching.
   * e.g. "919876543210", "+919876543210", "+91919876543210", "09876543210"
   * All resolve to canonical e164: "+919876543210", raw10: "9876543210"
   */
  public static normalizePhone(phone: string): { e164: string; raw10: string; meta: string; candidates: string[] } {
    const cleanDigits = (phone || '').replace(/[^\d]/g, '');
    let raw10 = cleanDigits;
    if (cleanDigits.length >= 10) {
      raw10 = cleanDigits.slice(-10);
    }

    const meta = `91${raw10}`;
    const e164 = `+91${raw10}`;

    const candidates = Array.from(
      new Set([
        phone,
        e164,
        raw10,
        meta,
        `0${raw10}`,
        `+9191${raw10}`,
        `9191${raw10}`,
        `+910${raw10}`,
        `0091${raw10}`
      ].filter(Boolean))
    );

    return { e164, raw10, meta, candidates };
  }

  /**
   * Finds existing 3D Galaxy customer or creates a minimal guest profile.
   */
  public static async findOrCreateCustomer(
    phone: string,
    profileName?: string
  ): Promise<{ customer: any; isNew: boolean }> {
    const { e164, raw10, candidates } = this.normalizePhone(phone);

    // 1. Check Customer table by phone candidates
    let customer = await prisma.customer.findFirst({
      where: {
        phone: { in: candidates }
      },
      include: { user: true }
    });

    if (customer) {
      return { customer, isNew: false };
    }

    // 2. Check User table by mobile
    const userWithMobile = await prisma.user.findFirst({
      where: {
        mobile: { in: candidates }
      },
      include: { customers: true }
    });

    if (userWithMobile) {
      if (userWithMobile.customers && userWithMobile.customers.length > 0) {
        const existingCust = userWithMobile.customers[0];
        return { customer: { ...existingCust, user: userWithMobile }, isNew: false };
      }

      // User exists without customer record, link them
      const newCust = await prisma.customer.create({
        data: {
          userId: userWithMobile.id,
          phone: e164,
          customerType: 'retail'
        },
        include: { user: true }
      });
      return { customer: newCust, isNew: false };
    }

    // 3. Check customerAddress if model is available
    if ((prisma as any).customerAddress) {
      const matchingAddress = await (prisma as any).customerAddress.findFirst({
        where: {
          phone: { in: candidates }
        },
        include: { customer: { include: { user: true } } }
      }).catch(() => null);

      if (matchingAddress?.customer) {
        return { customer: matchingAddress.customer, isNew: false };
      }
    }

    // 4. Create minimum guest user and customer profile
    const firstName = (profileName || 'WhatsApp Customer').split(' ')[0] || 'WhatsApp';
    const lastName = (profileName || 'WhatsApp Customer').split(' ').slice(1).join(' ') || 'Customer';
    const guestEmail = `wa-${raw10}@3dgalaxy.customer`;

    let guestUser = await prisma.user.findFirst({ where: { email: guestEmail } });
    if (!guestUser) {
      let guestRole: any = null;
      try {
        guestRole = await prisma.role.findFirst({ where: { name: 'Guest' } });
        if (!guestRole) {
          guestRole = await prisma.role.create({
            data: { name: 'Guest', description: 'Guest customer role' }
          });
        }
      } catch (roleErr: any) {
        logger.warn(`[WhatsAppConversationService] Could not find/create Guest role: ${roleErr.message}`);
      }

      const userData: any = {
        email: guestEmail,
        firstName,
        lastName,
        mobile: e164,
        passwordHash: '',
        isActive: true,
      };

      if (guestRole) {
        userData.roles = { create: { roleId: guestRole.id } };
      }

      guestUser = await prisma.user.create({ data: userData });
    }

    const createdCustomer = await prisma.customer.create({
      data: {
        userId: guestUser.id,
        phone: e164,
        customerType: 'guest'
      },
      include: { user: true }
    });

    logger.info(`[WhatsAppConversationService] Created new minimum customer profile: ${createdCustomer.id} for ${e164}`);
    return { customer: createdCustomer, isNew: true };
  }

  /**
   * Finds an active conversation or reopens an existing conversation for the phone/customer.
   */
  public static async findOrCreateConversation(
    phone: string,
    customer: any,
    profileName?: string
  ): Promise<{ conversation: any; isNew: boolean }> {
    const { e164, candidates } = this.normalizePhone(phone);

    // 1. Find active (OPEN or PENDING) conversation first
    let conversation = await prisma.whatsappConversation.findFirst({
      where: {
        OR: [
          { phone: { in: candidates } },
          ...(customer?.id ? [{ customerId: customer.id }] : [])
        ],
        status: { in: ['OPEN', 'PENDING'] }
      },
      include: {
        customer: { include: { user: true } },
        assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    if (conversation) {
      // Update customer link and phone normalization if needed
      if ((!conversation.customerId && customer?.id) || conversation.phone !== e164) {
        conversation = await prisma.whatsappConversation.update({
          where: { id: conversation.id },
          data: {
            customerId: customer?.id || conversation.customerId,
            phone: e164
          },
          include: {
            customer: { include: { user: true } },
            assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } }
          }
        });
      }
      return { conversation, isNew: false };
    }

    // 2. Check if ANY existing conversation exists (e.g. RESOLVED or CLOSED) and reopen it
    const pastConversation = await prisma.whatsappConversation.findFirst({
      where: {
        OR: [
          { phone: { in: candidates } },
          ...(customer?.id ? [{ customerId: customer.id }] : [])
        ]
      },
      include: {
        customer: { include: { user: true } },
        assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    if (pastConversation) {
      conversation = await prisma.whatsappConversation.update({
        where: { id: pastConversation.id },
        data: {
          status: 'OPEN',
          phone: e164,
          customerId: customer?.id || pastConversation.customerId,
          updatedAt: new Date()
        },
        include: {
          customer: { include: { user: true } },
          assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      });
      logger.info(`[WhatsAppConversationService] Reopened conversation ${conversation.id} for phone ${e164}`);
      return { conversation, isNew: false };
    }

    // 3. Create new conversation if none existed before
    const customerFullName = customer?.user
      ? `${customer.user.firstName || ''} ${customer.user.lastName || ''}`.trim()
      : (profileName || 'WhatsApp Customer');

    const newConversation = await prisma.whatsappConversation.create({
      data: {
        phone: e164,
        customerId: customer?.id || null,
        customerName: customerFullName,
        status: 'OPEN',
        aiMode: 'AUTO',
        unreadCount: 0,
        lastMessage: '',
        lastMessageAt: new Date(),
        lastDirection: 'INBOUND'
      },
      include: {
        customer: { include: { user: true } },
        assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    logger.info(`[WhatsAppConversationService] Created new conversation ${newConversation.id} for phone ${e164}`);
    return { conversation: newConversation, isNew: true };
  }

  private static processingMessageIds = new Set<string>();

  /**
   * Processes and stores an incoming WhatsApp message with deduplication.
   */
  public static async processInboundMessage(
    data: InboundWhatsAppMessageData
  ): Promise<{ message: any; conversation: any; isDuplicate: boolean; isNewConversation?: boolean }> {
    const { whatsappMessageId } = data;

    // 1. Deduplication check by in-memory lock and Meta WhatsApp Message ID
    if (whatsappMessageId) {
      if (this.processingMessageIds.has(whatsappMessageId)) {
        logger.info(`[WHATSAPP WEBHOOK] Duplicate concurrent webhook ignored: ${whatsappMessageId}`);
        return { message: null, conversation: null, isDuplicate: true };
      }

      const existing = await prisma.whatsappMessage.findUnique({
        where: { whatsappMessageId }
      });
      if (existing) {
        logger.info(`[WHATSAPP WEBHOOK] Duplicate webhook message already processed: ${whatsappMessageId}`);
        const conv = await prisma.whatsappConversation.findUnique({
          where: { id: existing.conversationId }
        });
        return { message: existing, conversation: conv, isDuplicate: true };
      }

      this.processingMessageIds.add(whatsappMessageId);
    }

    try {
      // 2. Identify or create customer
      const { customer, isNew: isNewCustomer } = await this.findOrCreateCustomer(data.fromPhone, data.customerName);
      logger.info(`[WHATSAPP INBOUND] Customer lookup result`, {
        customerId: customer.id,
        phone: customer.phone || data.fromPhone,
        isNew: isNewCustomer
      });

      // 3. Find or create active conversation
      const { conversation, isNew: isNewConv } = await this.findOrCreateConversation(data.fromPhone, customer, data.customerName);
      logger.info(`[WHATSAPP INBOUND] Conversation lookup result`, {
        conversationId: conversation.id,
        status: conversation.status,
        unreadCount: conversation.unreadCount,
        isNew: isNewConv
      });

      // 4. Save inbound message with status: 'RECEIVED'
      const message = await prisma.whatsappMessage.create({
        data: {
          conversationId: conversation.id,
          customerId: customer?.id || null,
          whatsappMessageId: data.whatsappMessageId,
          direction: 'INBOUND',
          senderType: 'CUSTOMER',
          messageType: data.messageType.toUpperCase(),
          messageText: data.messageText || '',
          mediaId: data.mediaId || null,
          mediaUrl: data.mediaUrl || null,
          mediaMetadata: data.mediaMetadata || null,
          status: 'RECEIVED',
          rawPayload: data.rawPayload || null,
          createdAt: data.timestamp || new Date()
        }
      });
      logger.info(`[WHATSAPP INBOUND] Database message insert result`, {
        messageId: message.id,
        whatsappMessageId: message.whatsappMessageId,
        conversationId: conversation.id,
        direction: message.direction,
        senderType: message.senderType,
        status: message.status
      });

      // 4b. When customer replies, all preceding outbound messages in this conversation have been seen/read
      await prisma.whatsappMessage.updateMany({
        where: {
          conversationId: conversation.id,
          direction: 'OUTBOUND',
          status: { in: ['SENT', 'DELIVERED'] }
        },
        data: {
          status: 'READ',
          updatedAt: new Date()
        }
      }).catch((err) => {
        logger.warn(`[WhatsAppConversationService] Failed to auto-mark outbound messages as READ: ${err.message}`);
      });

      // 5. Update conversation unread count and latest message preview
      const previewText = data.messageText || `[${data.messageType.toUpperCase()} Message]`;
      const updatedConv = await prisma.whatsappConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: previewText,
          lastMessageAt: data.timestamp || new Date(),
          lastDirection: 'INBOUND',
          unreadCount: { increment: 1 },
          status: 'OPEN'
        },
        include: {
          customer: { include: { user: true } },
          assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      });

      // 6. Broadcast Real-time Server-Sent Event to Admin Inbox
      ConversationEventService.broadcast({
        type: 'MESSAGE_RECEIVED',
        conversationId: conversation.id,
        message,
        conversation: updatedConv,
        timestamp: new Date().toISOString()
      });
      logger.info(`[WHATSAPP WEBHOOK] ↓ Realtime event emitted: MESSAGE_RECEIVED (conv: ${conversation.id})`);

      // 7. Dispatch Push Notification to active admins
      NotificationService.dispatch({
        eventKey: 'WHATSAPP_MESSAGE_RECEIVED',
        title: `WhatsApp from ${updatedConv.customerName || data.fromPhone}`,
        body: previewText,
        deepLink: `/admin?tab=whatsapp-conversations&conversationId=${conversation.id}`,
        metadata: {
          conversationId: conversation.id,
          messageId: message.id,
          phone: updatedConv.phone
        }
      }).catch(err => {
        logger.warn(`[WHATSAPP WEBHOOK] Failed to dispatch admin push notification: ${err.message}`);
      });

      return { message, conversation: updatedConv, isDuplicate: false, isNewConversation: isNew };
    } finally {
      if (whatsappMessageId) {
        this.processingMessageIds.delete(whatsappMessageId);
      }
    }
  }

  /**
   * Processes an inbound WhatsApp message reaction (e.g. 👍, ❤️, or empty string to remove).
   * Matches reactionMessageId to the original message's whatsappMessageId,
   * updates the reactions collection on that exact message, and broadcasts MESSAGE_REACTION via SSE.
   */
  public static async processReaction(data: {
    reactionMessageId: string;
    emoji: string;
    fromPhone: string;
    whatsappMessageId?: string;
    timestamp?: Date;
  }): Promise<{ success: boolean; targetMessage?: any; reactions?: any[] }> {
    const { reactionMessageId, emoji, fromPhone, whatsappMessageId, timestamp = new Date() } = data;

    if (!reactionMessageId) {
      logger.warn('[WHATSAPP REACTION] Received reaction event without reaction.message_id.');
      return { success: false };
    }

    try {
      // 1. Find the exact message that was reacted to
      let target = await prisma.whatsappMessage.findFirst({
        where: { whatsappMessageId: reactionMessageId }
      });

      // Fallback lookup: check ID directly or mediaId
      if (!target) {
        target = await prisma.whatsappMessage.findFirst({
          where: {
            OR: [
              { id: reactionMessageId },
              { mediaId: reactionMessageId }
            ]
          }
        });
      }

      if (!target) {
        logger.warn(`[WHATSAPP REACTION] Target message ${reactionMessageId} not found in database.`);
        return { success: false };
      }

      // 2. Read and parse current reactions from metadata
      const currentMeta: any =
        typeof target.metadata === 'object' && target.metadata !== null
          ? { ...target.metadata }
          : {};

      let reactions: Array<{
        emoji: string;
        from: string;
        senderType: string;
        whatsappMessageId?: string;
        timestamp: string;
      }> = Array.isArray(currentMeta.reactions) ? [...currentMeta.reactions] : [];

      if (!emoji || !emoji.trim()) {
        // Customer removed their reaction
        reactions = reactions.filter((r) => r.from !== fromPhone);
        logger.info(`[WHATSAPP REACTION] Removed reaction from ${fromPhone} on message ${target.id}`);
      } else {
        // Customer added or modified their reaction
        const cleanEmoji = emoji.trim();
        const existingIdx = reactions.findIndex((r) => r.from === fromPhone);
        const newReaction = {
          emoji: cleanEmoji,
          from: fromPhone,
          senderType: 'CUSTOMER',
          whatsappMessageId: whatsappMessageId || undefined,
          timestamp: timestamp.toISOString()
        };

        if (existingIdx >= 0) {
          reactions[existingIdx] = newReaction;
        } else {
          reactions.push(newReaction);
        }
        logger.info(`[WHATSAPP REACTION] Set reaction "${cleanEmoji}" from ${fromPhone} on message ${target.id}`);
      }

      // 3. Save updated reactions list into target message metadata
      currentMeta.reactions = reactions;
      const updatedMessage = await prisma.whatsappMessage.update({
        where: { id: target.id },
        data: {
          metadata: currentMeta,
          updatedAt: new Date()
        }
      });

      // 4. Broadcast Real-time Server-Sent Event to Admin Inbox without creating a new message bubble
      ConversationEventService.broadcast({
        type: 'MESSAGE_REACTION',
        conversationId: target.conversationId,
        messageId: target.id,
        whatsappMessageId: target.whatsappMessageId,
        reactions,
        reaction: {
          emoji,
          from: fromPhone,
          senderType: 'CUSTOMER',
          targetMessageId: target.id
        },
        timestamp: new Date().toISOString()
      });

      return { success: true, targetMessage: updatedMessage, reactions };
    } catch (err: any) {
      logger.error(`[WHATSAPP REACTION] Error processing reaction on ${reactionMessageId}:`, err);
      return { success: false };
    }
  }

  /**
   * Stores an outbound message (from Admin, Quick Reply, Auto-Reply, or AI).
   */
  public static async recordOutboundMessage(params: {
    conversationId: string;
    customerId?: string | null;
    whatsappMessageId?: string | null;
    senderType: 'ADMIN' | 'AUTO' | 'AI' | 'SYSTEM';
    senderId?: string | null;
    messageType?: string;
    messageText: string;
    mediaId?: string | null;
    mediaUrl?: string | null;
    mediaMetadata?: any;
    status?: 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
    errorMessage?: string | null;
  }): Promise<any> {
    const {
      conversationId,
      customerId,
      whatsappMessageId,
      senderType,
      senderId,
      messageType = 'TEXT',
      messageText,
      mediaId,
      mediaUrl,
      mediaMetadata,
      status = 'SENT',
      errorMessage
    } = params;

    // Ensure senderId is a valid UUID and exists in users table, else null
    let validSenderId: string | null = null;
    if (senderId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(senderId)) {
      try {
        const u = await prisma.user.findUnique({ where: { id: senderId }, select: { id: true } });
        if (u) validSenderId = senderId;
      } catch {}
    }

    const message = await prisma.whatsappMessage.create({
      data: {
        conversationId,
        customerId: customerId || null,
        whatsappMessageId: whatsappMessageId || null,
        direction: 'OUTBOUND',
        senderType,
        senderId: validSenderId,
        messageType: messageType.toUpperCase(),
        messageText,
        mediaId: mediaId || null,
        mediaUrl: mediaUrl || null,
        mediaMetadata: mediaMetadata || null,
        status,
        errorMessage: errorMessage || null
      }
    });

    // Update conversation
    const updatedConv = await prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: messageText || `[${messageType.toUpperCase()} Attachment]`,
        lastMessageAt: new Date(),
        lastDirection: 'OUTBOUND'
      }
    });

    logger.info(`[WHATSAPP WEBHOOK] ↓ Outgoing message saved: ${message.id} (status: ${status})`);

    // Broadcast Real-time Server-Sent Event to Admin Inbox
    ConversationEventService.broadcast({
      type: 'MESSAGE_SENT',
      conversationId,
      message,
      conversation: updatedConv,
      timestamp: new Date().toISOString()
    });
    logger.info(`[WHATSAPP WEBHOOK] ↓ Realtime event emitted: MESSAGE_SENT (conv: ${conversationId})`);

    return message;
  }

  /**
   * Updates message delivery and read status from Meta webhook status receipts.
   * Enforces status rank hierarchy to prevent out-of-order webhook regressions.
   */
  public static async updateMessageStatus(
    whatsappMessageId: string,
    statusStr: string,
    timestamp: Date,
    errorMessage?: string
  ): Promise<boolean> {
    if (!whatsappMessageId) return false;

    const normalizedStatus = String(statusStr || '').toLowerCase();
    let dbStatus = 'SENT';
    if (normalizedStatus === 'delivered') dbStatus = 'DELIVERED';
    if (normalizedStatus === 'read') dbStatus = 'READ';
    if (normalizedStatus === 'failed') dbStatus = 'FAILED';

    const msg = await prisma.whatsappMessage.findUnique({
      where: { whatsappMessageId }
    });

    if (!msg) return false;

    // Status precedence hierarchy: FAILED (-1) < QUEUED (0) < SENDING (1) < SENT (2) < DELIVERED (3) < READ (4)
    const rank: Record<string, number> = {
      FAILED: -1,
      QUEUED: 0,
      SENDING: 1,
      PENDING: 1,
      SENT: 2,
      DELIVERED: 3,
      READ: 4
    };

    const currentRank = rank[msg.status] ?? 0;
    const newRank = rank[dbStatus] ?? 0;

    // Never downgrade status if new rank is lower (e.g. out-of-order 'sent' arriving after 'delivered' or 'read')
    if (dbStatus !== 'FAILED' && newRank <= currentRank) {
      return true;
    }

    const updated = await prisma.whatsappMessage.update({
      where: { id: msg.id },
      data: {
        status: dbStatus,
        errorMessage: dbStatus === 'FAILED' ? (errorMessage || 'Delivery failed') : msg.errorMessage,
        updatedAt: timestamp || new Date()
      }
    });

    logger.info(`[WHATSAPP WEBHOOK] ↓ Message ${msg.id} status updated to ${dbStatus} (receipt: ${whatsappMessageId})`);

    ConversationEventService.broadcast({
      type: 'STATUS_CHANGED',
      conversationId: msg.conversationId,
      message: updated,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  /**
   * Reconciles message statuses in a conversation and returns latest messages.
   * If customer has replied, any earlier outbound messages are marked as READ.
   */
  public static async syncConversationMessages(conversationId: string, limit = 100): Promise<any[]> {
    // 1. Check if any inbound customer message exists
    const latestInbound = await prisma.whatsappMessage.findFirst({
      where: {
        conversationId,
        OR: [
          { direction: { in: ['INBOUND', 'inbound'] } },
          { senderType: 'CUSTOMER' }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. If inbound message exists, ensure preceding outbound messages are marked READ
    if (latestInbound) {
      await prisma.whatsappMessage.updateMany({
        where: {
          conversationId,
          direction: { in: ['OUTBOUND', 'outbound'] },
          status: { in: ['SENT', 'DELIVERED'] },
          createdAt: { lte: latestInbound.createdAt }
        },
        data: {
          status: 'READ',
          updatedAt: new Date()
        }
      }).catch(() => {});
    }

    // 3. Fetch latest messages in chronological order
    const messages = await prisma.whatsappMessage.findMany({
      where: { conversationId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    return messages.reverse();
  }
}
