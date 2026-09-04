import prisma from '../config/database';
import { logger } from '../utils/logger';

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
   * e.g. "919876543210" -> e164: "+919876543210", raw10: "9876543210", meta: "919876543210"
   */
  public static normalizePhone(phone: string): { e164: string; raw10: string; meta: string } {
    const cleanDigits = (phone || '').replace(/[^\d]/g, '');
    let raw10 = cleanDigits;
    if (cleanDigits.length > 10 && cleanDigits.startsWith('91')) {
      raw10 = cleanDigits.slice(2);
    } else if (cleanDigits.length > 10) {
      raw10 = cleanDigits.slice(-10);
    }

    const meta = `91${raw10}`;
    const e164 = `+91${raw10}`;

    return { e164, raw10, meta };
  }

  /**
   * Finds existing 3D Galaxy customer or creates a minimal guest profile.
   */
  public static async findOrCreateCustomer(
    phone: string,
    profileName?: string
  ): Promise<{ customer: any; isNew: boolean }> {
    const { e164, raw10, meta } = this.normalizePhone(phone);
    const phoneCandidates = [phone, e164, raw10, meta, `0${raw10}`];

    // 1. Check Customer table by phone
    let customer = await prisma.customer.findFirst({
      where: {
        phone: { in: phoneCandidates }
      },
      include: { user: true }
    });

    if (customer) {
      return { customer, isNew: false };
    }

    // 2. Check User table by mobile
    const userWithMobile = await prisma.user.findFirst({
      where: {
        mobile: { in: phoneCandidates }
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

    // 3. Check CustomerAddress records matching phone
    const matchingAddress = await prisma.customerAddress.findFirst({
      where: {
        addressLine1: { contains: raw10 }
      },
      include: { customer: { include: { user: true } } }
    });

    if (matchingAddress?.customer) {
      return { customer: matchingAddress.customer, isNew: false };
    }

    // 4. Create minimum guest user and customer profile
    const firstName = (profileName || 'WhatsApp Customer').split(' ')[0] || 'WhatsApp';
    const lastName = (profileName || 'WhatsApp Customer').split(' ').slice(1).join(' ') || 'Customer';
    const guestEmail = `wa-${raw10}@3dgalaxy.customer`;

    let guestUser = await prisma.user.findFirst({ where: { email: guestEmail } });
    if (!guestUser) {
      let guestRole = await prisma.role.findFirst({ where: { name: 'Guest' } });
      if (!guestRole) {
        guestRole = await prisma.role.create({
          data: { name: 'Guest', description: 'Guest customer role' }
        });
      }

      guestUser = await prisma.user.create({
        data: {
          email: guestEmail,
          firstName,
          lastName,
          mobile: e164,
          passwordHash: '',
          isActive: true,
          roles: { create: { roleId: guestRole.id } }
        }
      });
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
   * Finds an active conversation or creates a new conversation for the phone/customer.
   */
  public static async findOrCreateConversation(
    phone: string,
    customer: any,
    profileName?: string
  ): Promise<{ conversation: any; isNew: boolean }> {
    const { e164, raw10, meta } = this.normalizePhone(phone);
    const phoneCandidates = [phone, e164, raw10, meta];

    // Find active (OPEN or PENDING) conversation
    let conversation = await prisma.whatsappConversation.findFirst({
      where: {
        OR: [
          { phone: { in: phoneCandidates } },
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
      // Update customer link if missing
      if (!conversation.customerId && customer?.id) {
        conversation = await prisma.whatsappConversation.update({
          where: { id: conversation.id },
          data: { customerId: customer.id },
          include: {
            customer: { include: { user: true } },
            assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } }
          }
        });
      }
      return { conversation, isNew: false };
    }

    // Create new conversation
    const customerFullName = customer?.user
      ? `${customer.user.firstName || ''} ${customer.user.lastName || ''}`.trim()
      : (profileName || 'WhatsApp Customer');

    const newConversation = await prisma.whatsappConversation.create({
      data: {
        phone: e164,
        customerId: customer?.id || null,
        customerName: customerFullName,
        status: 'OPEN',
        aiMode: 'AI',
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

  /**
   * Processes and stores an incoming WhatsApp message with deduplication.
   */
  public static async processInboundMessage(
    data: InboundWhatsAppMessageData
  ): Promise<{ message: any; conversation: any; isDuplicate: boolean }> {
    const { whatsappMessageId } = data;

    // 1. Deduplication check by Meta WhatsApp Message ID
    if (whatsappMessageId) {
      const existing = await prisma.whatsappMessage.findUnique({
        where: { whatsappMessageId }
      });
      if (existing) {
        logger.info(`[WhatsAppConversationService] Duplicate webhook message ignored: ${whatsappMessageId}`);
        const conv = await prisma.whatsappConversation.findUnique({
          where: { id: existing.conversationId }
        });
        return { message: existing, conversation: conv, isDuplicate: true };
      }
    }

    // 2. Identify or create customer
    const { customer } = await this.findOrCreateCustomer(data.fromPhone, data.customerName);

    // 3. Find or create active conversation
    const { conversation } = await this.findOrCreateConversation(data.fromPhone, customer, data.customerName);

    // 4. Save inbound message
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
        status: 'DELIVERED',
        rawPayload: data.rawPayload || null,
        createdAt: data.timestamp || new Date()
      }
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
        status: conversation.status === 'RESOLVED' || conversation.status === 'CLOSED' ? 'OPEN' : conversation.status
      },
      include: {
        customer: { include: { user: true } },
        assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    return { message, conversation: updatedConv, isDuplicate: false };
  }

  /**
   * Stores an outbound message (from Admin or AI).
   */
  public static async recordOutboundMessage(params: {
    conversationId: string;
    customerId?: string | null;
    whatsappMessageId?: string | null;
    senderType: 'ADMIN' | 'AI' | 'SYSTEM';
    senderId?: string | null;
    messageType?: string;
    messageText: string;
    mediaId?: string | null;
    mediaUrl?: string | null;
    mediaMetadata?: any;
    status?: 'SENT' | 'DELIVERED' | 'FAILED';
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

    const message = await prisma.whatsappMessage.create({
      data: {
        conversationId,
        customerId: customerId || null,
        whatsappMessageId: whatsappMessageId || null,
        direction: 'OUTBOUND',
        senderType,
        senderId: senderId || null,
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
    await prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: messageText || `[${messageType.toUpperCase()} Attachment]`,
        lastMessageAt: new Date(),
        lastDirection: 'OUTBOUND'
      }
    });

    return message;
  }

  /**
   * Updates message delivery and read status from Meta webhook status receipts.
   */
  public static async updateMessageStatus(
    whatsappMessageId: string,
    statusStr: string,
    timestamp: Date,
    errorMessage?: string
  ): Promise<boolean> {
    if (!whatsappMessageId) return false;

    let dbStatus = 'SENT';
    if (statusStr === 'delivered') dbStatus = 'DELIVERED';
    if (statusStr === 'read') dbStatus = 'READ';
    if (statusStr === 'failed') dbStatus = 'FAILED';

    const msg = await prisma.whatsappMessage.findUnique({
      where: { whatsappMessageId }
    });

    if (!msg) return false;

    await prisma.whatsappMessage.update({
      where: { id: msg.id },
      data: {
        status: dbStatus,
        errorMessage: dbStatus === 'FAILED' ? (errorMessage || 'Delivery failed') : msg.errorMessage,
        updatedAt: timestamp || new Date()
      }
    });

    return true;
  }
}
