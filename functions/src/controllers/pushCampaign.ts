import { Request, Response } from 'express';
import prisma from '../config/database';
import { generateCampaignContent } from '../services/gemini';
import { getAudienceTokens, queueCampaignMessages, processNotificationQueue, getRecommendedProducts } from '../services/scheduler';
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
        status,
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
    // Compile and push messages to queue immediately
    await queueCampaignMessages(campaignId);
    // Trigger queue processor asynchronously
    processNotificationQueue().catch(e => console.error('Error starting queue processor:', e));

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Campaign compiled and dispatch queued.'
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
export const trackClick = async (req: Request, res: Response) => {
  const { logId } = req.body;
  if (!logId) {
    return res.status(400).json({ status: 'error', success: false, message: 'logId required.' });
  }

  try {
    const log = await prisma.pushLog.findUnique({
      where: { id: logId }
    });

    if (!log) {
      return res.status(404).json({ status: 'error', success: false, message: 'Log not found.' });
    }

    if (log.status !== 'CLICKED') {
      await prisma.pushLog.update({
        where: { id: logId },
        data: {
          status: 'CLICKED',
          clickedAt: new Date()
        }
      });

      if (log.campaignId) {
        await prisma.pushAnalytics.update({
          where: { campaignId: log.campaignId },
          data: {
            clickedCount: { increment: 1 }
          }
        });
      }
    }

    return res.status(200).json({ status: 'success', success: true, message: 'Click tracked.' });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', success: false, message: error.message });
  }
};

export const trackConversion = async (req: Request, res: Response) => {
  const { logId, orderId, revenue } = req.body;
  if (!logId) {
    return res.status(400).json({ status: 'error', success: false, message: 'logId required.' });
  }

  try {
    const log = await prisma.pushLog.findUnique({
      where: { id: logId }
    });

    if (!log) {
      return res.status(404).json({ status: 'error', success: false, message: 'Log not found.' });
    }

    await prisma.pushLog.update({
      where: { id: logId },
      data: {
        status: 'CONVERTED',
        convertedAt: new Date()
      }
    });

    if (log.campaignId) {
      await prisma.pushAnalytics.update({
        where: { campaignId: log.campaignId },
        data: {
          conversionCount: { increment: 1 },
          revenueGenerated: { increment: Number(revenue || 0) }
        }
      });
    }

    return res.status(200).json({ status: 'success', success: true, message: 'Conversion tracked.' });
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
    const activeCampaigns = await prisma.pushCampaign.count({ where: { status: 'Sending' } });
    const scheduledCampaigns = await prisma.pushCampaign.count({ where: { status: 'Scheduled' } });

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

    const totalDevices = await prisma.notificationDevice.count();
    const unsubscribedUsers = await prisma.notificationDevice.count({ where: { notificationEnabled: false } });

    const sent = aggregates._sum.sentCount || 0;
    const delivered = aggregates._sum.deliveredCount || 0;
    const opened = aggregates._sum.openedCount || 0;
    const clicked = aggregates._sum.clickedCount || 0;
    const conversions = aggregates._sum.conversionCount || 0;

    const ctr = sent > 0 ? Number(((clicked / sent) * 100).toFixed(2)) : 0;
    const convRate = clicked > 0 ? Number(((conversions / clicked) * 100).toFixed(2)) : 0;

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
          notificationsSent: sent,
          delivered,
          opened,
          ctr,
          conversionRate: convRate,
          failedDeliveries: aggregates._sum.failedCount || 0,
          unsubscribedUsers,
          totalDevices,
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
