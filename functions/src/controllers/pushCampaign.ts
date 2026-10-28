import { Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { generateCampaignContent } from '../services/gemini';
import { getAudienceTokens, queueCampaignMessages, processNotificationQueue, getRecommendedProducts } from '../services/scheduler';
import { getFirebaseAdmin } from '../config/firebase';
import { calculateMonthlyUsage } from './pushBilling';

const getMessaging = () => {
  try {
    const admin = getFirebaseAdmin();
    if (admin) return admin.messaging();
  } catch (error) {
    console.error("Firebase Admin Messaging not initialized:", error);
  }
  return null;
};

// ==========================================
// 1. AI Copy Generation
// ==========================================
export const generateAIContent = async (req: Request, res: Response) => {
  const { campaignType, marketingTone, language, festivalName, customInstructions } = req.body;

  if (!campaignType || !marketingTone || !language) {
    return res.status(400).json({
      status: 'error',
      success: false,
      message: 'campaignType, marketingTone, and language are required.'
    });
  }

  try {
    const result = await generateCampaignContent({
      campaignType,
      marketingTone,
      language,
      festivalName,
      customInstructions
    });
    return res.status(200).json({
      status: 'success',
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      success: false,
      message: error.message || 'AI Content Generation failed.'
    });
  }
};

// ==========================================
// 2. Audience Segment Controllers
// ==========================================
export const getAudienceSegments = async (req: Request, res: Response) => {
  try {
    const audiences = await prisma.pushAudience.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({
      status: 'success',
      success: true,
      data: audiences
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

export const createAudienceSegment = async (req: Request, res: Response) => {
  const { name, description, rules } = req.body;

  if (!name || !rules) {
    return res.status(400).json({ status: 'error', success: false, message: 'Name and rules are required.' });
  }

  try {
    const segment = await prisma.pushAudience.create({
      data: { name, description, rules }
    });
    return res.status(201).json({ status: 'success', success: true, data: segment });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

export const getAudienceCount = async (req: Request, res: Response) => {
  const { rules } = req.body;
  try {
    const tokens = await getAudienceTokens(null, rules);
    return res.status(200).json({
      status: 'success',
      success: true,
      data: { count: tokens.length }
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

// ==========================================
// 3. Templates Controllers
// ==========================================
export const getTemplates = async (req: Request, res: Response) => {
  const { category } = req.query;
  const where: any = {};
  if (category) {
    where.category = String(category);
  }

  try {
    const list = await prisma.pushTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ status: 'success', success: true, data: list });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  const { name, category, title, body, image, actionUrl } = req.body;
  if (!name || !category || !title || !body) {
    return res.status(400).json({ status: 'error', success: false, message: 'Name, category, title, and body are required.' });
  }

  try {
    const tmpl = await prisma.pushTemplate.create({
      data: { name, category, title, body, image, actionUrl }
    });
    return res.status(201).json({ status: 'success', success: true, data: tmpl });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const updated = await prisma.pushTemplate.update({
      where: { id },
      data: req.body
    });
    return res.status(200).json({ status: 'success', success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.pushTemplate.delete({ where: { id } });
    return res.status(200).json({ status: 'success', success: true, message: 'Template deleted.' });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

// ==========================================
// 4. Campaigns CRUD Controllers
// ==========================================
export const getCampaigns = async (req: Request, res: Response) => {
  const { search, type, status, page = 1, limit = 10 } = req.query;
  const pg = Number(page);
  const lim = Number(limit);

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { title: { contains: String(search), mode: 'insensitive' } }
    ];
  }
  if (type) {
    where.type = String(type);
  }
  if (status) {
    where.status = String(status);
  }

  try {
    const total = await prisma.pushCampaign.count({ where });
    const list = await prisma.pushCampaign.findMany({
      where,
      include: {
        audience: true,
        analytics: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (pg - 1) * lim,
      take: lim
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        list,
        total,
        page: pg,
        limit: lim,
        pages: Math.ceil(total / lim)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

export const createCampaign = async (req: Request, res: Response) => {
  const {
    name,
    type,
    title,
    body,
    image,
    icon,
    actionUrl,
    ctaText,
    deepLink,
    priority,
    expiryTime,
    aiGenerated,
    productsConfig,
    audienceId,
    scheduleId,
    status = 'Draft',
    scheduledAt
  } = req.body;

  if (!name || !type || !title || !body) {
    return res.status(400).json({ status: 'error', success: false, message: 'Name, type, title, and body are required.' });
  }

  try {
    const initialStatus = status === 'Scheduled' ? 'Scheduled' : 'Draft';

    const campaign = await prisma.pushCampaign.create({
      data: {
        name,
        type,
        title,
        body,
        image,
        icon: icon || '/assets/icon.png',
        actionUrl,
        ctaText,
        deepLink,
        priority: priority || 'Normal',
        expiryTime: expiryTime ? new Date(expiryTime) : null,
        aiGenerated: !!aiGenerated,
        productsConfig: productsConfig || {},
        audienceId,
        scheduleId,
        status: initialStatus,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null
      }
    });

    // Create placeholder analytics record
    await prisma.pushAnalytics.create({
      data: { campaignId: campaign.id }
    });

    return res.status(201).json({ status: 'success', success: true, data: campaign });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

export const updateCampaign = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = { ...req.body };
  if (data.expiryTime) data.expiryTime = new Date(data.expiryTime);
  if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt);

  try {
    const updated = await prisma.pushCampaign.update({
      where: { id },
      data
    });
    return res.status(200).json({ status: 'success', success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

export const deleteCampaign = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.pushCampaign.delete({ where: { id } });
    return res.status(200).json({ status: 'success', success: true, message: 'Campaign deleted.' });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

// ==========================================
// 5. Send & Schedule Commands
// ==========================================
export const sendCampaignNow = async (req: Request, res: Response) => {
  const { campaignId } = req.body;
  if (!campaignId) {
    return res.status(400).json({ status: 'error', success: false, message: 'Campaign ID is required.' });
  }

  try {
    const campaign = await prisma.pushCampaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      return res.status(404).json({ status: 'error', success: false, message: 'Campaign not found.' });
    }

    // Check if campaign already has active notifications in the queue
    const activeQueueCount = await prisma.notificationQueue.count({
      where: {
        campaignId,
        status: { in: ['Pending', 'Processing', 'QUEUED', 'PROCESSING'] }
      }
    });

    if (activeQueueCount > 0) {
      return res.status(409).json({
        status: 'conflict',
        success: false,
        message: 'Campaign is already actively queued for dispatch. Duplicate dispatch prevented.'
      });
    }

    if (campaign.status === 'Completed') {
      return res.status(409).json({
        status: 'conflict',
        success: false,
        message: 'Campaign has already completed delivery. Use "Re-send" to launch a new broadcast.'
      });
    }

    // Compile and push messages to queue immediately
    await queueCampaignMessages(campaignId);
    // Process queue immediately so delivery completes and analytics are populated
    await processNotificationQueue();

    // Fetch refreshed campaign with analytics
    const refreshed = await prisma.pushCampaign.findUnique({
      where: { id: campaignId },
      include: { analytics: true }
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Campaign compiled and dispatched successfully.',
      data: refreshed
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

export const scheduleCampaign = async (req: Request, res: Response) => {
  const { campaignId, scheduledAt, timezone, scheduleType, cronExpression } = req.body;

  if (!campaignId || !scheduledAt) {
    return res.status(400).json({ status: 'error', success: false, message: 'campaignId and scheduledAt are required.' });
  }

  try {
    const schedule = await prisma.pushSchedule.create({
      data: {
        type: scheduleType || 'Specific Date & Time',
        scheduledAt: new Date(scheduledAt),
        cronExpression,
        timezone: timezone || 'UTC',
        nextRunAt: new Date(scheduledAt)
      }
    });

    await prisma.pushCampaign.update({
      where: { id: campaignId },
      data: {
        scheduleId: schedule.id,
        scheduledAt: new Date(scheduledAt),
        status: 'Scheduled'
      }
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Campaign scheduled successfully.',
      data: schedule
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

// ==========================================
// 6. Test Push Notification
// ==========================================
export const sendTestNotification = async (req: Request, res: Response) => {
  const { fcmToken, title, body, image, actionUrl } = req.body;

  if (!fcmToken || !title || !body) {
    return res.status(400).json({
      status: 'error',
      success: false,
      message: 'fcmToken, title, and body are required.'
    });
  }

  if (fcmToken === 'CRON_TRIGGER_DAILY_OFFER') {
    try {
      const { runDailyOfferJob } = require('../services/scheduler');
      await runDailyOfferJob();
      return res.status(200).json({
        status: 'success',
        success: true,
        message: 'Daily Offer cron job executed successfully!'
      });
    } catch (e: any) {
      return res.status(500).json({
        status: 'error',
        success: false,
        message: 'Failed to run cron job: ' + e.message
      });
    }
  }

  const messaging = getMessaging();
  if (!messaging) {
    return res.status(500).json({ status: 'error', success: false, message: 'FCM Client not initialized.' });
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
        imageUrl: image || undefined
      },
      data: {
        click_action: actionUrl || '/',
        title,
        body,
        image: image || '',
        icon: '/assets/icon.png'
      }
    };

    const response = await messaging.send(message);
    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Test notification sent.',
      data: response
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      success: false,
      message: error.message || 'FCM test send failed.'
    });
  }
};

// ==========================================
// 7. Click & Conversion Tracking
// ==========================================
const isValidUuid = (val: any): boolean => {
  if (typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val.trim());
};

export const trackClick = async (req: Request, res: Response) => {
  const { logId, campaignId, userId, guestId, fcmToken, source } = req.body;
  if (!logId && !campaignId) {
    return res.status(400).json({ status: 'error', success: false, message: 'logId or campaignId required.' });
  }

  try {
    let targetCampaignId = campaignId ? String(campaignId).trim() : undefined;
    const validLogId = isValidUuid(logId) ? String(logId).trim() : undefined;
    const validUserId = isValidUuid(userId) ? String(userId).trim() : undefined;

    if (validLogId) {
      const log = await prisma.pushLog.findUnique({
        where: { id: validLogId }
      });

      if (log) {
        targetCampaignId = targetCampaignId || (log.campaignId || undefined);
        if (log.status !== 'CLICKED') {
          await prisma.pushLog.update({
            where: { id: validLogId },
            data: {
              status: 'CLICKED',
              clickedAt: new Date()
            }
          });
        }
      }
    }

    const isPushCampaignUuid = Boolean(targetCampaignId && isValidUuid(targetCampaignId));

    if (isPushCampaignUuid) {
      const campaignExists = await prisma.pushCampaign.findUnique({
        where: { id: targetCampaignId },
        select: { id: true }
      });

      if (campaignExists) {
        const existingLog = await prisma.pushLog.findFirst({
          where: {
            campaignId: targetCampaignId!,
            status: { not: 'CLICKED' },
            ...(fcmToken ? { fcmToken } : validUserId ? { userId: validUserId } : guestId ? { guestId } : {})
          },
          orderBy: { createdAt: 'desc' }
        });

        if (existingLog) {
          await prisma.pushLog.update({
            where: { id: existingLog.id },
            data: {
              status: 'CLICKED',
              clickedAt: new Date()
            }
          });
        } else {
          await prisma.pushLog.create({
            data: {
              campaignId: targetCampaignId!,
              userId: validUserId || null,
              guestId: guestId || null,
              fcmToken: fcmToken || `click_attr_${source || 'web'}`,
              status: 'CLICKED',
              clickedAt: new Date(),
              deliveredAt: new Date()
            }
          }).catch(() => {});
        }

        await prisma.pushAnalytics.upsert({
          where: { campaignId: targetCampaignId! },
          create: {
            campaignId: targetCampaignId!,
            sentCount: 1,
            deliveredCount: 1,
            openedCount: 1,
            clickedCount: 1
          },
          update: {
            clickedCount: { increment: 1 }
          }
        }).catch(() => {});

        return res.status(200).json({ status: 'success', success: true, message: 'Click tracked.', type: 'push_campaign' });
      }
    }

    // Marketing or organic attribution (non-push UUID, e.g. 'sag_organic', or external campaign)
    logger.info(`Attribution click recorded: campaign=${targetCampaignId || 'none'}, source=${source || 'web_navigation'}`, {
      campaignId: targetCampaignId!,
      source: source || 'web_navigation',
      logId: logId || undefined,
      guestId: guestId || undefined,
      userId: validUserId || undefined
    }, {
      module: 'NOTIFICATION',
      campaignId: targetCampaignId!,
      userId: validUserId
    });

    return res.status(200).json({ status: 'success', success: true, message: 'Click tracked.', type: 'marketing_attribution' });
  } catch (error: any) {
    logger.error('Error tracking push click attribution:', error, {
      body: req.body,
      route: req.originalUrl
    }, {
      module: 'NOTIFICATION',
      errorCode: 'CLICK_TRACKING_FAILED'
    });
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

export const trackOpen = async (req: Request, res: Response) => {
  const { logId, campaignId, userId, guestId, fcmToken, source } = req.body;
  if (!logId && !campaignId) {
    return res.status(400).json({ status: 'error', success: false, message: 'logId or campaignId required.' });
  }

  try {
    let targetCampaignId = campaignId ? String(campaignId).trim() : undefined;
    const validLogId = isValidUuid(logId) ? String(logId).trim() : undefined;
    const validUserId = isValidUuid(userId) ? String(userId).trim() : undefined;

    if (validLogId) {
      const log = await prisma.pushLog.findUnique({
        where: { id: validLogId }
      });

      if (log) {
        targetCampaignId = targetCampaignId || (log.campaignId || undefined);
        if (log.status !== 'CLICKED' && log.status !== 'OPENED') {
          await prisma.pushLog.update({
            where: { id: validLogId },
            data: {
              status: 'OPENED',
              openedAt: new Date()
            }
          });
        }
      }
    }

    const isPushCampaignUuid = Boolean(targetCampaignId && isValidUuid(targetCampaignId));
    if (isPushCampaignUuid) {
      const campaignExists = await prisma.pushCampaign.findUnique({
        where: { id: targetCampaignId },
        select: { id: true }
      });

      if (campaignExists) {
        const existingLog = await prisma.pushLog.findFirst({
          where: {
            campaignId: targetCampaignId!,
            status: { in: ['SENT', 'DELIVERED'] },
            ...(fcmToken ? { fcmToken } : validUserId ? { userId: validUserId } : guestId ? { guestId } : {})
          },
          orderBy: { createdAt: 'desc' }
        });

        if (existingLog) {
          await prisma.pushLog.update({
            where: { id: existingLog.id },
            data: {
              status: 'OPENED',
              openedAt: new Date()
            }
          });
        }

        await prisma.pushAnalytics.upsert({
          where: { campaignId: targetCampaignId! },
          create: {
            campaignId: targetCampaignId!,
            sentCount: 1,
            deliveredCount: 1,
            openedCount: 1
          },
          update: {
            openedCount: { increment: 1 }
          }
        }).catch(() => {});

        return res.status(200).json({ status: 'success', success: true, message: 'Open tracked.', type: 'push_campaign' });
      }
    }

    logger.info(`Attribution open recorded: campaign=${targetCampaignId || 'none'}, source=${source || 'web'}`, {
      campaignId: targetCampaignId!,
      source: source || 'web',
      logId: logId || undefined
    }, {
      module: 'NOTIFICATION',
      campaignId: targetCampaignId
    });

    return res.status(200).json({ status: 'success', success: true, message: 'Open tracked.', type: 'marketing_attribution' });
  } catch (error: any) {
    logger.error('Error tracking push open attribution:', error, { body: req.body }, { module: 'NOTIFICATION', errorCode: 'OPEN_TRACKING_FAILED' });
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

export const trackConversion = async (req: Request, res: Response) => {
  const { logId, campaignId, orderId, revenue } = req.body;
  if (!logId && !campaignId) {
    return res.status(400).json({ status: 'error', success: false, message: 'logId or campaignId required.' });
  }

  try {
    let targetCampaignId = campaignId ? String(campaignId).trim() : undefined;
    const validLogId = isValidUuid(logId) ? String(logId).trim() : undefined;

    if (validLogId) {
      const log = await prisma.pushLog.findUnique({
        where: { id: validLogId }
      });

      if (log) {
        targetCampaignId = targetCampaignId || (log.campaignId || undefined);
        await prisma.pushLog.update({
          where: { id: validLogId },
          data: {
            status: 'CONVERTED',
            convertedAt: new Date()
          }
        });
      }
    }

    const isPushCampaignUuid = Boolean(targetCampaignId && isValidUuid(targetCampaignId));
    if (isPushCampaignUuid) {
      const campaignExists = await prisma.pushCampaign.findUnique({
        where: { id: targetCampaignId },
        select: { id: true }
      });

      if (campaignExists) {
        const rev = Number(revenue || 0);
        await prisma.pushAnalytics.upsert({
          where: { campaignId: targetCampaignId! },
          create: {
            campaignId: targetCampaignId!,
            conversionCount: 1,
            revenueGenerated: rev
          },
          update: {
            conversionCount: { increment: 1 },
            revenueGenerated: { increment: rev }
          }
        }).catch(() => {});

        return res.status(200).json({ status: 'success', success: true, message: 'Conversion tracked.', type: 'push_campaign' });
      }
    }

    logger.info(`Attribution conversion recorded: campaign=${targetCampaignId || 'none'}, orderId=${orderId}, rev=${revenue}`, {
      campaignId: targetCampaignId!,
      orderId,
      revenue
    }, {
      module: 'NOTIFICATION',
      campaignId: targetCampaignId!,
      orderId
    });

    return res.status(200).json({ status: 'success', success: true, message: 'Conversion tracked.', type: 'marketing_attribution' });
  } catch (error: any) {
    logger.error('Error tracking conversion attribution:', error, { body: req.body }, { module: 'NOTIFICATION', errorCode: 'CONVERSION_TRACKING_FAILED' });
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

export const simulateCampaignEvent = async (req: Request, res: Response) => {
  const { id: campaignId } = req.params;
  const { event, revenue = 0 } = req.body;

  try {
    const campaign = await prisma.pushCampaign.findUnique({
      where: { id: campaignId }
    });
    if (!campaign) {
      return res.status(404).json({ status: 'error', success: false, message: 'Campaign not found.' });
    }

    if (event === 'open') {
      await prisma.pushAnalytics.upsert({
        where: { campaignId },
        create: { campaignId, openedCount: 1 },
        update: { openedCount: { increment: 1 } }
      });
      await prisma.pushLog.create({
        data: {
          campaignId,
          status: 'OPENED',
          fcmToken: `simulated_open_${Date.now()}`,
          openedAt: new Date(),
          deliveredAt: new Date()
        }
      });
    } else if (event === 'click') {
      await prisma.pushAnalytics.upsert({
        where: { campaignId },
        create: { campaignId, clickedCount: 1, openedCount: 1 },
        update: {
          clickedCount: { increment: 1 },
          openedCount: { increment: 1 }
        }
      });
      await prisma.pushLog.create({
        data: {
          campaignId,
          status: 'CLICKED',
          fcmToken: `simulated_click_${Date.now()}`,
          clickedAt: new Date(),
          openedAt: new Date(),
          deliveredAt: new Date()
        }
      });
    } else if (event === 'conversion') {
      const revAmount = Number(revenue) || 1299;
      await prisma.pushAnalytics.upsert({
        where: { campaignId },
        create: {
          campaignId,
          conversionCount: 1,
          revenueGenerated: revAmount
        },
        update: {
          conversionCount: { increment: 1 },
          revenueGenerated: { increment: revAmount }
        }
      });
      await prisma.pushLog.create({
        data: {
          campaignId,
          status: 'CONVERTED',
          fcmToken: `simulated_conversion_${Date.now()}`,
          convertedAt: new Date(),
          clickedAt: new Date(),
          deliveredAt: new Date()
        }
      });
    }

    const refreshed = await prisma.pushCampaign.findUnique({
      where: { id: campaignId },
      include: { analytics: true }
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: `Simulated ${event} tracked for campaign.`,
      data: refreshed
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

// ==========================================
// 8. System & Campaign Analytics
// ==========================================
export const getCampaignAnalytics = async (req: Request, res: Response) => {
  const { campaignId } = req.query;

  try {
    if (campaignId) {
      const analytics = await prisma.pushAnalytics.findUnique({
        where: { campaignId: String(campaignId) }
      });
      return res.status(200).json({ status: 'success', success: true, data: analytics });
    }

    // Consolidated Dashboard Analytics
    const totalCampaigns = await prisma.pushCampaign.count();
    const activeCampaigns = await prisma.pushCampaign.count({ where: { status: { in: ['Sending', 'Queued'] } } });
    const scheduledCampaigns = await prisma.pushCampaign.count({ where: { status: 'Scheduled' } });
    const queuedCount = await prisma.notificationQueue.count({ where: { status: { in: ['QUEUED', 'PROCESSING'] } } });
    const optedInDevices = await prisma.notificationDevice.count({ where: { notificationEnabled: true, tokenStatus: 'ACTIVE' } });
    const totalDevices = await prisma.notificationDevice.count();
    const unsubscribedUsers = await prisma.notificationDevice.count({ where: { notificationEnabled: false } });

    // Aggregate values
    const aggregates = await prisma.pushAnalytics.aggregate({
      _sum: {
        sentCount: true,
        deliveredCount: true,
        openedCount: true,
        clickedCount: true,
        conversionCount: true,
        failedCount: true,
        revenueGenerated: true
      }
    });

    const sent = aggregates._sum.sentCount || 0;
    const delivered = aggregates._sum.deliveredCount || 0;
    const opened = aggregates._sum.openedCount || 0;
    const clicked = aggregates._sum.clickedCount || 0;
    const conversions = aggregates._sum.conversionCount || 0;

    const deliveryRate = sent > 0 ? Number(((delivered / sent) * 100).toFixed(1)) : 0;
    const openRate = delivered > 0 ? Number(((opened / delivered) * 100).toFixed(1)) : (sent > 0 ? Number(((opened / sent) * 100).toFixed(1)) : 0);
    const ctr = sent > 0 ? Number(((clicked / sent) * 100).toFixed(2)) : 0;
    const convRate = clicked > 0 ? Number(((conversions / clicked) * 100).toFixed(2)) : 0;

    // Real monthly billing aggregation for current period
    let monthlyBilling: any = null;
    try {
      monthlyBilling = await calculateMonthlyUsage();
    } catch (e) {
      console.error('Error fetching monthly billing in analytics:', e);
    }

    // Daily distribution logs for the last 15 days
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const logs = await prisma.pushLog.findMany({
      where: { createdAt: { gte: fifteenDaysAgo } },
      select: { createdAt: true, status: true }
    });

    const dailySends: Record<string, { sends: number; opens: number; clicks: number }> = {};
    logs.forEach(log => {
      const dateStr = log.createdAt.toISOString().split('T')[0];
      if (!dailySends[dateStr]) {
        dailySends[dateStr] = { sends: 0, opens: 0, clicks: 0 };
      }
      dailySends[dateStr].sends++;
      if (log.status === 'OPENED' || log.status === 'CLICKED') {
        dailySends[dateStr].opens++;
      }
      if (log.status === 'CLICKED') {
        dailySends[dateStr].clicks++;
      }
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        summary: {
          totalCampaigns,
          activeCampaigns,
          scheduledCampaigns,
          optedInDevices,
          notificationsQueued: queuedCount,
          notificationsSent: sent,
          delivered,
          deliveryRate,
          opened,
          openRate,
          clicked,
          ctr,
          conversionRate: convRate,
          failedDeliveries: aggregates._sum.failedCount || 0,
          unsubscribedUsers,
          totalDevices,
          currentMonthBillableUsage: monthlyBilling?.usage?.billableNotifications || 0,
          currentMonthEstimatedCharge: monthlyBilling?.financials?.totalAmount || 0,
          currency: monthlyBilling?.financials?.currency || 'INR',
          billingMonth: monthlyBilling?.billingMonth || '',
          previousMonth: monthlyBilling?.previousMonth || null,
          revenueGenerated: aggregates._sum.revenueGenerated || 0
        },
        dailyTrends: Object.entries(dailySends).map(([date, vals]) => ({
          date,
          ...vals
        })).sort((a,b) => a.date.localeCompare(b.date))
      }
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};
