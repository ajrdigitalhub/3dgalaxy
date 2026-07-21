import { Request, Response } from 'express';
import prisma from '../config/database';
import { getSettingsService } from '../modules/settings/settings.service';

const isValidUuid = (val: any): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

async function getSettings() {
  const settings = await getSettingsService();
  return settings?.abandonedCheckoutSettings || {
    enabled: true,
    timeoutMinutes: 30,
    captureGuestUsers: true,
    captureLoggedUsers: true,
    autoRecovery: true,
    recoverySchedule: [30, 120, 1440],
    sendEmail: true,
    sendWhatsapp: true,
    autoDeleteAfterDays: 90
  };
}

export const logCartActivity = async (req: Request, res: Response) => {
  const {
    sessionId,
    cartItems,
    cartTotal,
    customerId,
    guestId,
    email,
    mobile,
    customerName,
    browser,
    device,
    ipAddress,
    activity,
    details
  } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    const settings = await getSettings();
    if (!settings.enabled) {
      return res.status(200).json({ status: 'disabled' });
    }

    if (customerId && !settings.captureLoggedUsers) {
      return res.status(200).json({ status: 'excluded_logged_user' });
    }
    if (!customerId && !settings.captureGuestUsers) {
      return res.status(200).json({ status: 'excluded_guest_user' });
    }

    let checkout = await prisma.abandonedCheckout.findFirst({
      where: { sessionId, recoveryStatus: 'Active' }
    });

    if (checkout) {
      checkout = await prisma.abandonedCheckout.update({
        where: { id: checkout.id },
        data: {
          cartItems: cartItems || checkout.cartItems,
          cartTotal: cartTotal !== undefined ? cartTotal : checkout.cartTotal,
          customerId: customerId || checkout.customerId,
          guestId: guestId || checkout.guestId,
          email: email || checkout.email,
          mobile: mobile || checkout.mobile,
          customerName: customerName || checkout.customerName,
          lastActivity: new Date(),
          browser: browser || checkout.browser,
          device: device || checkout.device,
          ipAddress: ipAddress || checkout.ipAddress
        }
      });
    } else {
      checkout = await prisma.abandonedCheckout.create({
        data: {
          sessionId,
          cartItems: cartItems || [],
          cartTotal: cartTotal || 0,
          customerId: customerId || null,
          guestId: guestId || null,
          email: email || null,
          mobile: mobile || null,
          customerName: customerName || null,
          checkoutStep: 'CART',
          recoveryStatus: 'Active',
          lastActivity: new Date(),
          browser: browser || null,
          device: device || null,
          ipAddress: ipAddress || null
        }
      });
    }

    await prisma.checkoutActivityLog.create({
      data: {
        abandonedCheckoutId: checkout.id,
        activity: activity || 'Added to Cart',
        details: details || null
      }
    });

    return res.status(200).json({ success: true, checkoutId: checkout.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const startCheckoutTracking = async (req: Request, res: Response) => {
  const {
    sessionId,
    cartItems,
    cartTotal,
    shippingCharge,
    tax,
    discount,
    customerId,
    guestId,
    email,
    mobile,
    customerName,
    checkoutData,
    browser,
    device,
    ipAddress
  } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    const settings = await getSettings();
    if (!settings.enabled) {
      return res.status(200).json({ status: 'disabled' });
    }

    let checkout = await prisma.abandonedCheckout.findFirst({
      where: { sessionId, recoveryStatus: 'Active' }
    });

    if (checkout) {
      checkout = await prisma.abandonedCheckout.update({
        where: { id: checkout.id },
        data: {
          cartItems: cartItems || checkout.cartItems,
          cartTotal: cartTotal !== undefined ? cartTotal : checkout.cartTotal,
          shippingCharge: shippingCharge !== undefined ? shippingCharge : checkout.shippingCharge,
          tax: tax !== undefined ? tax : checkout.tax,
          discount: discount !== undefined ? discount : checkout.discount,
          customerId: customerId || checkout.customerId,
          guestId: guestId || checkout.guestId,
          email: email || checkout.email,
          mobile: mobile || checkout.mobile,
          customerName: customerName || checkout.customerName,
          checkoutData: checkoutData || checkout.checkoutData,
          checkoutStep: 'STARTED',
          lastActivity: new Date(),
          browser: browser || checkout.browser,
          device: device || checkout.device,
          ipAddress: ipAddress || checkout.ipAddress
        }
      });
    } else {
      checkout = await prisma.abandonedCheckout.create({
        data: {
          sessionId,
          cartItems: cartItems || [],
          cartTotal: cartTotal || 0,
          shippingCharge: shippingCharge || 0,
          tax: tax || 0,
          discount: discount || 0,
          customerId: customerId || null,
          guestId: guestId || null,
          email: email || null,
          mobile: mobile || null,
          customerName: customerName || null,
          checkoutData: checkoutData || null,
          checkoutStep: 'STARTED',
          recoveryStatus: 'Active',
          lastActivity: new Date(),
          browser: browser || null,
          device: device || null,
          ipAddress: ipAddress || null
        }
      });
    }

    await prisma.checkoutActivityLog.create({
      data: {
        abandonedCheckoutId: checkout.id,
        activity: 'Checkout Started',
        details: `Customer started checkout with ${Array.isArray(cartItems) ? cartItems.length : 0} items.`
      }
    });

    return res.status(200).json({ success: true, checkoutId: checkout.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const logCheckoutHeartbeat = async (req: Request, res: Response) => {
  const { sessionId, checkoutStep, checkoutData, email, mobile, customerName, abandonmentReason } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    const checkout = await prisma.abandonedCheckout.findFirst({
      where: { sessionId, recoveryStatus: 'Active' }
    });

    if (!checkout) {
      return res.status(404).json({ error: 'Active checkout session not found' });
    }

    const previousStep = checkout.checkoutStep;
    const updated = await prisma.abandonedCheckout.update({
      where: { id: checkout.id },
      data: {
        checkoutStep: checkoutStep || checkout.checkoutStep,
        checkoutData: checkoutData ? { ...(checkout.checkoutData as any), ...checkoutData } : checkout.checkoutData,
        email: email || checkout.email,
        mobile: mobile || checkout.mobile,
        customerName: customerName || checkout.customerName,
        abandonmentReason: abandonmentReason || checkout.abandonmentReason,
        lastActivity: new Date()
      }
    });

    if (checkoutStep && checkoutStep !== previousStep) {
      await prisma.checkoutActivityLog.create({
        data: {
          abandonedCheckoutId: checkout.id,
          activity: `${checkoutStep} Step Reached`,
          details: `Checkout stage updated from ${previousStep} to ${checkoutStep}`
        }
      });
    }

    return res.status(200).json({ success: true, checkoutId: updated.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const recoverCartByToken = async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const checkout = await prisma.abandonedCheckout.findUnique({
      where: { id: token }
    });

    if (!checkout) {
      return res.status(404).json({ error: 'Recovery token is invalid or expired' });
    }

    await prisma.checkoutActivityLog.create({
      data: {
        abandonedCheckoutId: checkout.id,
        activity: 'Recovery Link Opened',
        details: 'Customer clicked the recovered checkout URL link.'
      }
    });

    return res.status(200).json({
      cartItems: checkout.cartItems,
      checkoutData: checkout.checkoutData,
      cartTotal: checkout.cartTotal,
      shippingCharge: checkout.shippingCharge,
      tax: checkout.tax,
      discount: checkout.discount,
      email: checkout.email,
      mobile: checkout.mobile,
      customerName: checkout.customerName
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAdminAbandonedCheckouts = async (req: Request, res: Response) => {
  const { searchQuery, status, isGuest, minVal, maxVal, dateFrom, dateTo } = req.query;

  try {
    const where: any = {};

    if (status) {
      where.recoveryStatus = String(status);
    }

    if (isGuest !== undefined) {
      if (String(isGuest) === 'true') {
        where.customerId = null;
      } else {
        where.customerId = { not: null };
      }
    }

    if (minVal || maxVal) {
      where.cartTotal = {};
      if (minVal) where.cartTotal.gte = Number(minVal);
      if (maxVal) where.cartTotal.lte = Number(maxVal);
    }

    if (dateFrom || dateTo) {
      where.lastActivity = {};
      if (dateFrom) where.lastActivity.gte = new Date(String(dateFrom));
      if (dateTo) where.lastActivity.lte = new Date(String(dateTo));
    }

    if (searchQuery) {
      const q = String(searchQuery);
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { mobile: { contains: q } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { sessionId: { contains: q, mode: 'insensitive' } }
      ];
    }

    const checkouts = await prisma.abandonedCheckout.findMany({
      where,
      orderBy: { lastActivity: 'desc' },
      take: 100
    });

    return res.status(200).json(checkouts);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAdminAbandonedCheckoutDetail = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const checkout = await prisma.abandonedCheckout.findUnique({
      where: { id },
      include: {
        activityLogs: { orderBy: { createdAt: 'asc' } },
        notifications: { orderBy: { sentAt: 'asc' } }
      }
    });

    if (!checkout) {
      return res.status(404).json({ error: 'Abandoned checkout details not found' });
    }

    return res.status(200).json(checkout);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

async function dispatchSimulatedReminder(checkout: any, channel: 'EMAIL' | 'WHATSAPP', reminderStep: number) {
  const link = `http://localhost:4200/recover-cart/${checkout.id}`;
  const customerName = checkout.customerName || 'Customer';
  const text = `Hello ${customerName}, you left items in your cart. Recover here: ${link}`;

  let success = true;
  let errMsg = null;

  if (channel === 'WHATSAPP') {
    try {
      const { triggerWhatsAppNotification } = require('./whatsapp');
      await triggerWhatsAppNotification('cart_recovery', checkout.mobile || '9999999999', null, null, {
        customer_name: customerName,
        recovery_link: link
      });
    } catch (e: any) {
      success = false;
      errMsg = e.message || 'WhatsApp dispatch error';
    }
  } else {
    console.log(`[SIMULATED EMAIL REMINDER ${reminderStep}] Sent to ${checkout.email}: "${text}"`);
  }

  await prisma.recoveryNotification.create({
    data: {
      abandonedCheckoutId: checkout.id,
      channel,
      status: success ? 'SUCCESS' : 'FAILED',
      errorMessage: errMsg,
      reminderStep
    }
  });

  await prisma.checkoutActivityLog.create({
    data: {
      abandonedCheckoutId: checkout.id,
      activity: `Recovery ${channel} Sent`,
      details: success ? `Reminder #${reminderStep} sent successfully.` : `Failed sending reminder: ${errMsg}`
    }
  });
}

export const manualResendReminder = async (req: Request, res: Response) => {
  const id = req.body?.id || req.body?.checkoutId || req.body?.abandonedCheckoutId || req.params?.id;
  const channel = req.body?.channel || 'EMAIL';

  if (!id) {
    return res.status(400).json({ error: 'Abandoned checkout ID is required' });
  }

  try {
    const checkout = await prisma.abandonedCheckout.findUnique({ where: { id } });
    if (!checkout) {
      return res.status(404).json({ error: 'Checkout session not found' });
    }

    await dispatchSimulatedReminder(checkout, channel, 99);
    return res.status(200).json({ success: true, message: 'Recovery reminder triggered successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const manualRecoverCheckout = async (req: Request, res: Response) => {
  const id = req.body?.id || req.body?.checkoutId || req.body?.abandonedCheckoutId || req.params?.id;

  if (!id) {
    return res.status(400).json({ error: 'Abandoned checkout ID is required' });
  }

  try {
    const updated = await prisma.abandonedCheckout.update({
      where: { id },
      data: { recoveryStatus: 'Recovered' }
    });

    await prisma.checkoutActivityLog.create({
      data: {
        abandonedCheckoutId: id,
        activity: 'Manually Recovered',
        details: 'Admin marked this checkout as manually recovered.'
      }
    });

    return res.status(200).json({ success: true, checkout: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAdminAbandonedCheckoutsAnalytics = async (req: Request, res: Response) => {
  try {
    const all = await prisma.abandonedCheckout.findMany();

    const totalAbandoned = all.length;
    const recovered = all.filter(c => c.recoveryStatus === 'Recovered').length;
    const recoveryRate = totalAbandoned > 0 ? (recovered / totalAbandoned) * 100 : 0;

    let lostRevenue = 0;
    let recoveredRevenue = 0;

    all.forEach(c => {
      const val = Number(c.cartTotal || 0);
      if (c.recoveryStatus === 'Recovered') {
        recoveredRevenue += val;
      } else {
        lostRevenue += val;
      }
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayAbandoned = all.filter(c => new Date(c.lastActivity) >= startOfToday).length;
    const weekAbandoned = all.filter(c => new Date(c.lastActivity) >= startOfWeek).length;
    const monthAbandoned = all.filter(c => new Date(c.lastActivity) >= startOfMonth).length;

    const deviceBreakdown: Record<string, number> = {};
    const browserBreakdown: Record<string, number> = {};
    const paymentBreakdown: Record<string, number> = {};
    const productCounts: Record<string, { name: string; count: number }> = {};

    all.forEach(c => {
      const d = c.device || 'Desktop';
      deviceBreakdown[d] = (deviceBreakdown[d] || 0) + 1;

      const b = c.browser || 'Chrome';
      browserBreakdown[b] = (browserBreakdown[b] || 0) + 1;

      const p = c.paymentMethod || 'Razorpay';
      paymentBreakdown[p] = (paymentBreakdown[p] || 0) + 1;

      const items = (c.cartItems as any) || [];
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const key = item.productId || item.id || 'unknown';
          const name = item.productName || item.name || 'Unknown Product';
          if (!productCounts[key]) {
            productCounts[key] = { name, count: 0 };
          }
          productCounts[key].count += item.quantity || 1;
        });
      }
    });

    const mostAbandonedProducts = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const deviceArray = Object.keys(deviceBreakdown).map(device => ({ device, count: deviceBreakdown[device] }));
    const browserArray = Object.keys(browserBreakdown).map(browser => ({ browser, count: browserBreakdown[browser] }));

    return res.status(200).json({
      cards: {
        totalAbandoned,
        recovered,
        recoveryRate,
        lostRevenue,
        recoveredRevenue,
        todayAbandoned,
        weekAbandoned,
        monthAbandoned
      },
      totalAbandonedValue: lostRevenue,
      totalRecoveredValue: recoveredRevenue,
      recoveryRate,
      totalAbandonedCount: totalAbandoned,
      totalRecoveredCount: recovered,
      deviceBreakdown: deviceArray,
      browserBreakdown: browserArray,
      paymentBreakdown,
      mostAbandonedProducts
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
