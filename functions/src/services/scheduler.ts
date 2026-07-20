import prisma from '../config/database';
import { getFirebaseAdmin } from '../config/firebase';

const getMessaging = () => {
  try {
    const admin = getFirebaseAdmin();
    if (admin) return admin.messaging();
  } catch (error) {
    console.error("Firebase Admin Messaging not initialized:", error);
  }
  return null;
};

// Queue runner interval state
let schedulerIntervalId: NodeJS.Timeout | null = null;
let isProcessingQueue = false;
let isProcessingCampaigns = false;

/**
 * Fetch dynamic product recommendations based on campaign configuration
 */
export const getRecommendedProducts = async (config: {
  mode: string;
  limit: number;
  excludeOutOfStock?: boolean;
  excludeHidden?: boolean;
  categoryId?: string;
  brandId?: string;
}) => {
  const { mode, limit = 3, excludeOutOfStock = true, excludeHidden = true, categoryId, brandId } = config;

  const where: any = {
    deletedAt: null
  };

  if (excludeOutOfStock) {
    where.stock = { gt: 0 };
  }
  if (excludeHidden) {
    where.isActive = true;
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (brandId) {
    where.brandId = brandId;
  }

  try {
    switch (mode) {
      case 'Best Sellers': {
        // Get products with most order items
        const topSold = await prisma.orderItem.groupBy({
          by: ['productId'],
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: limit
        });
        const productIds = topSold.map(item => item.productId);
        return await prisma.product.findMany({
          where: { ...where, id: { in: productIds } },
          take: limit
        });
      }
      case 'Trending':
      case 'Highest Rated': {
        // Get highest rated reviews
        const topRated = await prisma.productReview.groupBy({
          by: ['productId'],
          _avg: { rating: true },
          orderBy: { _avg: { rating: 'desc' } },
          take: limit
        });
        const productIds = topRated.map(item => item.productId);
        return await prisma.product.findMany({
          where: { ...where, id: { in: productIds } },
          take: limit
        });
      }
      case 'New Arrivals':
      case 'Recently Added':
        return await prisma.product.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit
        });
      case 'Featured Products':
        return await prisma.product.findMany({
          where: { ...where, isFeatured: true },
          take: limit
        });
      case 'Random Products':
      default: {
        const count = await prisma.product.count({ where });
        const skip = Math.max(0, Math.floor(Math.random() * (count - limit)));
        return await prisma.product.findMany({
          where,
          skip,
          take: limit
        });
      }
    }
  } catch (error) {
    console.error('Error fetching recommended products:', error);
    return [];
  }
};

/**
 * Fetch FCM target tokens based on segmentation rules
 */
export const getAudienceTokens = async (audienceId: string | null, customRules?: any) => {
  let rules = customRules;

  if (audienceId) {
    const audience = await prisma.pushAudience.findUnique({
      where: { id: audienceId }
    });
    if (audience && audience.rules) {
      rules = audience.rules;
    }
  }

  if (!rules) {
    // Default to all active device opt-ins
    return await prisma.notificationDevice.findMany({
      where: { notificationEnabled: true },
      include: { user: true }
    });
  }

  const { targetType, os, browser, language, includeTags, excludeTags } = rules;

  const whereClause: any = {
    notificationEnabled: true
  };

  if (targetType === 'registered') {
    whereClause.userId = { not: null };
  } else if (targetType === 'guests') {
    whereClause.userId = null;
  }

  if (os) {
    whereClause.os = { equals: os, mode: 'insensitive' };
  }
  if (browser) {
    whereClause.browser = { equals: browser, mode: 'insensitive' };
  }
  if (language) {
    whereClause.language = { equals: language, mode: 'insensitive' };
  }

  let matchedDevices = await prisma.notificationDevice.findMany({
    where: whereClause,
    include: { user: true }
  });

  // Additional rule-based custom filters
  if (targetType === 'cart_abandoners') {
    const activeCheckouts = await prisma.abandonedCheckout.findMany({
      where: { recoveryStatus: 'Active' },
      select: {
        customerId: true,
        guestId: true
      }
    });
    const customerIds = activeCheckouts.map(c => c.customerId).filter(Boolean) as string[];
    const guestIds = activeCheckouts.map(c => c.guestId).filter(Boolean) as string[];

    let userIds: string[] = [];
    if (customerIds.length > 0) {
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { userId: true }
      });
      userIds = customers.map(c => c.userId).filter(Boolean) as string[];
    }

    matchedDevices = matchedDevices.filter(d => 
      (d.userId && userIds.includes(d.userId)) || 
      (d.guestId && guestIds.includes(d.guestId))
    );
  } else if (targetType === 'wishlist') {
    const wishlistEntries = await prisma.customerWishlist.findMany({
      select: { customer: { select: { userId: true } } }
    });
    const userIds = wishlistEntries.map(w => w.customer.userId);
    matchedDevices = matchedDevices.filter(d => d.userId && userIds.includes(d.userId));
  } else if (targetType === 'new_customers') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    matchedDevices = matchedDevices.filter(d => d.user && new Date(d.user.createdAt) >= sevenDaysAgo);
  } else if (targetType === 'returning_customers') {
    const returningUsers = await prisma.order.findMany({
      where: { status: { in: ['COMPLETED', 'DELIVERED', 'SHIPPED'] } },
      select: { customer: { select: { userId: true } } }
    });
    const userIds = returningUsers.map(o => o.customer?.userId).filter(Boolean) as string[];
    matchedDevices = matchedDevices.filter(d => d.userId && userIds.includes(d.userId));
  }

  return matchedDevices;
};

/**
 * Replace placeholders inside template text
 */
export const personalizeText = (
  text: string,
  variables: {
    customerName?: string;
    productName?: string;
    price?: string;
    discount?: string;
    category?: string;
    couponCode?: string;
    storeName?: string;
  }
) => {
  let result = text;
  Object.entries(variables).forEach(([key, val]) => {
    if (val !== undefined) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    }
  });
  // Replace remaining placeholders with blank or default value
  result = result.replace(/\{\{\w+\}\}/g, '');
  return result;
};

/**
 * Compile and queue notification messages for a campaign run
 */
export const queueCampaignMessages = async (campaignId: string) => {
  const campaign = await prisma.pushCampaign.findUnique({
    where: { id: campaignId },
    include: { audience: true }
  });

  if (!campaign) {
    throw new Error('Campaign not found.');
  }

  // Update status to Sending
  await prisma.pushCampaign.update({
    where: { id: campaignId },
    data: { status: 'Sending' }
  });

  try {
    // 1. Get recipients
    const devices = await getAudienceTokens(campaign.audienceId, campaign.audience?.rules);
    if (devices.length === 0) {
      await prisma.pushCampaign.update({
        where: { id: campaignId },
        data: { status: 'Sent' }
      });
      // Setup empty analytics
      await prisma.pushAnalytics.upsert({
        where: { campaignId },
        update: {},
        create: { campaignId }
      });
      return;
    }

    // 2. Fetch recommended products if configured
    let recommended: any[] = [];
    if (campaign.productsConfig) {
      const cfg = campaign.productsConfig as any;
      if (cfg.mode && cfg.mode !== 'None') {
        recommended = await getRecommendedProducts(cfg);
      }
    }

    const recProduct = recommended[0];

    // 3. Queue payloads
    const queueData: any[] = [];
    for (const device of devices) {
      const customerName = device.user ? `${device.user.firstName || ''} ${device.user.lastName || ''}`.trim() : 'Guest';
      const variables = {
        customerName: customerName || 'Valued Customer',
        productName: recProduct?.name || 'industrial printer',
        price: recProduct ? `₹${Number(recProduct.salePrice || recProduct.basePrice)}` : '',
        discount: recProduct?.salePrice ? 'Special Discount' : '',
        category: recProduct?.categoryId || '',
        couponCode: 'WELCOME10',
        storeName: '3D Galaxy Hub'
      };

      const title = personalizeText(campaign.title, variables);
      const body = personalizeText(campaign.body, variables);
      const actionUrl = personalizeText(campaign.actionUrl || '/', variables);

      const payload = {
        title,
        body,
        image: campaign.image || recProduct?.images?.[0] || '',
        icon: campaign.icon || '/assets/icon.png',
        data: {
          campaignId: campaign.id,
          click_action: actionUrl,
          deepLink: campaign.deepLink || '',
          ctaText: campaign.ctaText || 'Open'
        }
      };

      queueData.push({
        campaignId: campaign.id,
        fcmToken: device.fcmToken,
        payload,
        priority: campaign.priority,
        status: 'Pending',
        scheduledAt: new Date()
      });
    }

    // Insert into Queue in batches
    const batchSize = 100;
    for (let i = 0; i < queueData.length; i += batchSize) {
      const chunk = queueData.slice(i, i + batchSize);
      await prisma.notificationQueue.createMany({ data: chunk });
    }

    // Initialize/Create Analytics record if not exists
    await prisma.pushAnalytics.upsert({
      where: { campaignId },
      update: {},
      create: { campaignId }
    });

    await prisma.pushCampaign.update({
      where: { id: campaignId },
      data: { status: 'Sent' }
    });
  } catch (error: any) {
    console.error(`Failed to execute campaign ${campaignId}:`, error);
    await prisma.pushCampaign.update({
      where: { id: campaignId },
      data: { status: 'Failed' }
    });
  }
};

/**
 * Process pending notifications in NotificationQueue
 */
export const processNotificationQueue = async () => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    const pendingItems = await prisma.notificationQueue.findMany({
      where: {
        status: 'Pending',
        scheduledAt: { lte: new Date() }
      },
      take: 1000 // Process in batches of 1000 total per tick
    });

    if (pendingItems.length === 0) {
      isProcessingQueue = false;
      return;
    }

    const messaging = getMessaging();
    if (!messaging) {
      console.error('FCM messaging client is not initialized. Skipping queue dispatch.');
      isProcessingQueue = false;
      return;
    }

    // Group queue items by campaign or payloads to batch multicasts
    // Since payloads can differ slightly due to personalization, we can group items by identical payload content to batch them
    const payloadGroups: Record<string, { payload: any; campaignId: string | null; items: typeof pendingItems }> = {};

    pendingItems.forEach(item => {
      const payloadStr = JSON.stringify(item.payload);
      if (!payloadGroups[payloadStr]) {
        payloadGroups[payloadStr] = {
          payload: item.payload,
          campaignId: item.campaignId,
          items: []
        };
      }
      payloadGroups[payloadStr].items.push(item);
    });

    for (const groupKey of Object.keys(payloadGroups)) {
      const group = payloadGroups[groupKey];
      const tokens = group.items.map(item => item.fcmToken);
      const campaignId = group.campaignId;

      // Update item status to Processing
      const itemIds = group.items.map(item => item.id);
      await prisma.notificationQueue.updateMany({
        where: { id: { in: itemIds } },
        data: { status: 'Processing' }
      });

      // FCM Multicast allows up to 500 tokens
      const fcmBatchSize = 500;
      for (let i = 0; i < tokens.length; i += fcmBatchSize) {
        const tokenChunk = tokens.slice(i, i + fcmBatchSize);
        const itemChunk = group.items.slice(i, i + fcmBatchSize);

        const message = {
          tokens: tokenChunk,
          notification: {
            title: group.payload.title,
            body: group.payload.body,
            imageUrl: group.payload.image || undefined
          },
          data: {
            ...group.payload.data,
            title: group.payload.title,
            body: group.payload.body,
            image: group.payload.image || '',
            icon: group.payload.icon || ''
          }
        };

        try {
          const response = await messaging.sendEachForMulticast(message);
          let successCount = response.successCount;
          let failureCount = response.failureCount;

          // Track results
          const logsToCreate: any[] = [];
          const tokensToDelete: string[] = [];

          response.responses.forEach((resp, idx) => {
            const queueItem = itemChunk[idx];
            const token = tokenChunk[idx];

            if (resp.success) {
              logsToCreate.push({
                campaignId,
                fcmToken: token,
                status: 'SENT',
                deviceInfo: {},
                deliveredAt: new Date()
              });
            } else {
              const errMessage = resp.error?.message || 'Unknown FCM delivery failure';
              logsToCreate.push({
                campaignId,
                fcmToken: token,
                status: 'FAILED',
                errorMessage: errMessage,
                deviceInfo: {}
              });

              // Check if token is invalid/expired and should be removed
              const errCode = resp.error?.code;
              if (
                errCode === 'messaging/invalid-registration-token' ||
                errCode === 'messaging/registration-token-not-registered'
              ) {
                tokensToDelete.push(token);
              }
            }
          });

          // Write logs
          if (logsToCreate.length > 0) {
            await prisma.pushLog.createMany({ data: logsToCreate });
          }

          // Clean up invalid tokens
          if (tokensToDelete.length > 0) {
            await prisma.notificationDevice.deleteMany({
              where: { fcmToken: { in: tokensToDelete } }
            }).catch(e => console.error('Error cleaning up invalid tokens:', e));
          }

          // Update Queue Items
          const processedIds = itemChunk.map(item => item.id);
          await prisma.notificationQueue.deleteMany({
            where: { id: { in: processedIds } } // Remove sent items to keep queue small
          });

          // Update Campaign Analytics
          if (campaignId) {
            await prisma.pushAnalytics.update({
              where: { campaignId },
              data: {
                sentCount: { increment: successCount + failureCount },
                deliveredCount: { increment: successCount },
                failedCount: { increment: failureCount }
              }
            });
          }
        } catch (fcmError: any) {
          console.error('FCM Multicast error:', fcmError);
          // Set these queue items to Failed
          const processedIds = itemChunk.map(item => item.id);
          await prisma.notificationQueue.updateMany({
            where: { id: { in: processedIds } },
            data: {
              status: 'Failed',
              errorMessage: fcmError.message || 'FCM Multicast exception'
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error processing notification queue:', error);
  } finally {
    isProcessingQueue = false;
  }
};

/**
 * Scan and compile campaigns that are scheduled and ready to be sent
 */
export const checkScheduledCampaigns = async () => {
  if (isProcessingCampaigns) return;
  isProcessingCampaigns = true;

  try {
    const campaigns = await prisma.pushCampaign.findMany({
      where: {
        status: 'Scheduled',
        scheduledAt: { lte: new Date() }
      }
    });

    for (const campaign of campaigns) {
      await queueCampaignMessages(campaign.id);
    }
  } catch (error) {
    console.error('Error checking scheduled campaigns:', error);
  } finally {
    isProcessingCampaigns = false;
  }
};

/**
 * Initialize background scheduler daemon
 */
export const startScheduler = () => {
  if (schedulerIntervalId) return;

  console.log('⚡ Push Notification Campaign Scheduler initialized.');
  
  // Run every 20 seconds
  schedulerIntervalId = setInterval(async () => {
    await checkScheduledCampaigns();
    await processNotificationQueue();
  }, 20000);
};

/**
 * Stop background scheduler daemon
 */
export const stopScheduler = () => {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
    console.log('Push Campaign Scheduler stopped.');
  }
};
