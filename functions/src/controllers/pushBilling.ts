import { Request, Response } from 'express';
import prisma from '../config/database';

export interface BillingTier {
  minVolume: number;
  maxVolume: number;
  rate: number;
  label: string;
  priceLabel: string;
}

export const PUSH_BILLING_TIERS: BillingTier[] = [
  { minVolume: 1, maxVolume: 10000, rate: 0.05, label: '1–10,000', priceLabel: '₹0.05' },
  { minVolume: 10001, maxVolume: 50000, rate: 0.04, label: '10,001–50,000', priceLabel: '₹0.04' },
  { minVolume: 50001, maxVolume: 100000, rate: 0.03, label: '50,001–1,00,000', priceLabel: '₹0.03' },
  { minVolume: 100001, maxVolume: Infinity, rate: 0.02, label: 'Above 1,00,000', priceLabel: '₹0.02' }
];

export const getTierForVolume = (volume: number) => {
  const vol = Math.max(1, volume);
  for (let i = 0; i < PUSH_BILLING_TIERS.length; i++) {
    const t = PUSH_BILLING_TIERS[i];
    if (vol >= t.minVolume && vol <= t.maxVolume) {
      return {
        rate: t.rate,
        tierLabel: t.label,
        priceLabel: t.priceLabel,
        nextTier: PUSH_BILLING_TIERS[i + 1] ? PUSH_BILLING_TIERS[i + 1].label : null,
        nextRate: PUSH_BILLING_TIERS[i + 1] ? PUSH_BILLING_TIERS[i + 1].priceLabel : null
      };
    }
  }
  return {
    rate: 0.05,
    tierLabel: '1–10,000',
    priceLabel: '₹0.05',
    nextTier: '10,001–50,000',
    nextRate: '₹0.04'
  };
};

const DEFAULT_BILLING_CONFIG = {
  enabled: true,
  currency: 'INR',
  pricePerNotification: 0.05,
  monthlyBillingCycle: 'calendar_month',
  minimumMonthlyCharge: 0,
  freeMonthlyAllowance: 0,
  taxPercent: 0,
  taxName: 'None',
  billingStartDate: '2026-01-01',
  invoiceGenerationDay: 1,
  status: 'ACTIVE',
  tiers: PUSH_BILLING_TIERS
};

const getStoredBillingConfig = async () => {
  return DEFAULT_BILLING_CONFIG;
};

export const getPushBillingConfig = async (req: Request, res: Response) => {
  try {
    const config = await getStoredBillingConfig();
    return res.status(200).json({ success: true, data: config });
  } catch (error: any) {
    console.error('Error fetching push billing config:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePushBillingConfig = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      data: DEFAULT_BILLING_CONFIG,
      message: 'Push billing rates follow the authoritative volume tier schedule (non-editable).'
    });
  } catch (error: any) {
    console.error('Error updating push billing config:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMonthDateRange = (monthStr?: string) => {
  const now = new Date();
  let targetYear = now.getUTCFullYear();
  let targetMonth = now.getUTCMonth(); // 0-indexed

  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split('-').map(Number);
    targetYear = y;
    targetMonth = m - 1;
  }

  const startDate = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999));
  const formattedMonth = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

  // Previous month range
  const prevMonthDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
  const prevStartDate = new Date(Date.UTC(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth(), 1, 0, 0, 0, 0));
  const prevEndDate = new Date(Date.UTC(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const prevFormattedMonth = `${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;

  return {
    formattedMonth,
    startDate,
    endDate,
    prevFormattedMonth,
    prevStartDate,
    prevEndDate
  };
};

export const calculateMonthlyUsage = async (monthStr?: string) => {
  const { formattedMonth, startDate, endDate, prevFormattedMonth, prevStartDate, prevEndDate } = getMonthDateRange(monthStr);
  const config = await getStoredBillingConfig();

  // Aggregated real usage for current requested month
  const totalEvents = await prisma.pushLog.count({
    where: { createdAt: { gte: startDate, lte: endDate } }
  });

  const successfulDispatches = await prisma.pushLog.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] }
    }
  });

  const confirmedDelivered = await prisma.pushLog.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: { in: ['DELIVERED', 'OPENED', 'CLICKED'] }
    }
  });

  const failedDispatches = await prisma.pushLog.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: 'FAILED'
    }
  });

  const clicksCount = await prisma.pushLog.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: 'CLICKED'
    }
  });

  // Billable count policy: successfully accepted provider submissions
  const billableCount = successfulDispatches;
  const currentTier = getTierForVolume(billableCount);
  const unitRate = currentTier.rate;
  const usageSubtotal = Number((billableCount * unitRate).toFixed(2));
  const subtotal = usageSubtotal;
  const taxPercent = 0;
  const taxAmount = 0;
  const totalAmount = subtotal;

  // Previous month real data comparison
  const prevDispatches = await prisma.pushLog.count({
    where: {
      createdAt: { gte: prevStartDate, lte: prevEndDate },
      status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] }
    }
  });

  const prevTier = getTierForVolume(prevDispatches);
  const prevUnitRate = prevTier.rate;
  const prevUsageSubtotal = Number((prevDispatches * prevUnitRate).toFixed(2));
  const prevSubtotal = prevUsageSubtotal;
  const prevTaxAmount = 0;
  const prevTotalAmount = prevSubtotal;

  const hasPreviousData = prevDispatches > 0;

  // Check if official invoice was generated for this month
  const invoicesRecord = await prisma.setting.findUnique({
    where: { settingKey: 'push-billing-invoices' }
  });
  const invoicesList = (invoicesRecord?.settingData as any[]) || [];
  const existingInvoice = invoicesList.find((inv: any) => inv.month === formattedMonth);

  // Month label e.g. "October 2026"
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [y, m] = formattedMonth.split('-').map(Number);
  const periodLabel = `${monthNames[m - 1]} ${y}`;

  return {
    billingMonth: formattedMonth,
    billingPeriodLabel: periodLabel,
    config: {
      enabled: true,
      currency: 'INR',
      pricePerNotification: unitRate,
      activeTier: currentTier.tierLabel,
      tierPriceLabel: currentTier.priceLabel,
      tiers: PUSH_BILLING_TIERS,
      freeMonthlyAllowance: 0,
      minimumMonthlyCharge: 0,
      taxPercent: 0,
      taxName: 'None'
    },
    usage: {
      totalEvents,
      billableNotifications: billableCount,
      successfulDispatches,
      confirmedDelivered,
      failedDispatches,
      clicksCount,
      freeAllowanceApplied: 0,
      billableAfterAllowance: billableCount
    },
    financials: {
      currency: 'INR',
      unitRate,
      activeTier: currentTier.tierLabel,
      tierPriceLabel: currentTier.priceLabel,
      tiers: PUSH_BILLING_TIERS,
      usageSubtotal,
      minimumChargeApplied: false,
      subtotal,
      taxPercent: 0,
      taxName: 'None',
      taxAmount: 0,
      totalAmount
    },
    previousMonth: hasPreviousData ? {
      month: prevFormattedMonth,
      billableNotifications: prevDispatches,
      totalAmount: prevTotalAmount,
      tier: prevTier.tierLabel,
      rate: prevUnitRate
    } : null,
    invoice: existingInvoice || {
      invoiceNumber: `EST-${formattedMonth.replace('-', '')}`,
      status: 'Estimated',
      generatedAt: null
    }
  };
};

/**
 * Automatically creates and updates official consolidated invoice records
 * for past and completed calendar months whenever the month changes or billing is accessed.
 */
export const autoGenerateCompletedMonthInvoices = async () => {
  try {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth(); // 0-indexed
    const currentFormattedMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    const record = await prisma.setting.findUnique({
      where: { settingKey: 'push-billing-invoices' }
    });
    let invoices: any[] = (record?.settingData as any[]) || [];
    let modified = false;

    // Check recent 12 calendar months to ensure every past month with dispatches has an official invoice record
    for (let i = 0; i <= 11; i++) {
      const targetDate = new Date(Date.UTC(currentYear, currentMonth - i, 1));
      const targetYear = targetDate.getUTCFullYear();
      const targetM = targetDate.getUTCMonth();
      const targetFormattedMonth = `${targetYear}-${String(targetM + 1).padStart(2, '0')}`;

      const startDate = new Date(Date.UTC(targetYear, targetM, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(targetYear, targetM + 1, 0, 23, 59, 59, 999));

      const successfulDispatches = await prisma.pushLog.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] }
        }
      });

      if (successfulDispatches > 0) {
        const existingIdx = invoices.findIndex((inv: any) => inv.month === targetFormattedMonth);
        const existing = existingIdx >= 0 ? invoices[existingIdx] : null;

        // Auto-create when month is a past completed month (< currentFormattedMonth),
        // OR update if the dispatch count in the existing record does not match the actual current usage count
        const isPastMonth = targetFormattedMonth < currentFormattedMonth;
        const countChanged = existing && existing.billableNotifications !== successfulDispatches;
        const needsCreation = !existing && isPastMonth;

        if (needsCreation || countChanged) {
          const tierInfo = getTierForVolume(successfulDispatches);
          const unitRate = tierInfo.rate;
          const subtotal = Number((successfulDispatches * unitRate).toFixed(2));

          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          const periodLabel = `${monthNames[targetM]} ${targetYear}`;
          const invoiceNumber = `INV-PUSH-${targetFormattedMonth.replace('-', '')}-001`;

          const invoiceObj = {
            id: `inv-${targetFormattedMonth}`,
            invoiceNumber,
            month: targetFormattedMonth,
            billingPeriod: periodLabel,
            periodLabel,
            projectName: '3D Galaxy Storefront',
            projectId: 'ajr3dgalaxy',
            billableNotifications: successfulDispatches,
            unitRate,
            activeTier: tierInfo.tierLabel,
            tierPriceLabel: tierInfo.priceLabel,
            freeAllowanceApplied: 0,
            subtotal,
            taxName: 'None',
            taxPercent: 0,
            taxAmount: 0,
            totalAmount: subtotal,
            currency: 'INR',
            status: 'Generated',
            generatedAt: existing?.generatedAt || new Date().toISOString()
          };

          if (existingIdx >= 0) {
            invoices[existingIdx] = invoiceObj;
          } else {
            invoices.push(invoiceObj);
          }
          modified = true;
        }
      }
    }

    if (modified) {
      invoices.sort((a, b) => b.month.localeCompare(a.month));
      await prisma.setting.upsert({
        where: { settingKey: 'push-billing-invoices' },
        update: { settingData: invoices },
        create: { settingKey: 'push-billing-invoices', settingData: invoices }
      });
      console.log('[PushBilling] Auto-created / updated monthly bill records successfully.');
    }

    return invoices;
  } catch (error) {
    console.error('[PushBilling] Error in autoGenerateCompletedMonthInvoices:', error);
    return [];
  }
};

export const getMonthlyPushBillingUsage = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    await autoGenerateCompletedMonthInvoices();
    const data = await calculateMonthlyUsage(month as string);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error calculating monthly push billing:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPushBillingInvoices = async (req: Request, res: Response) => {
  try {
    await autoGenerateCompletedMonthInvoices();
    const record = await prisma.setting.findUnique({
      where: { settingKey: 'push-billing-invoices' }
    });
    const invoices = (record?.settingData as any[]) || [];
    return res.status(200).json({ success: true, data: invoices });
  } catch (error: any) {
    console.error('Error fetching push billing invoices:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const generateMonthlyPushInvoice = async (req: Request, res: Response) => {
  try {
    const { month } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Valid month in YYYY-MM format required.' });
    }

    const { formattedMonth, startDate, endDate } = getMonthDateRange(month);
    const config = await getStoredBillingConfig();

    const successfulDispatches = await prisma.pushLog.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] }
      }
    });

    const tierInfo = getTierForVolume(successfulDispatches);
    const unitRate = tierInfo.rate;
    const subtotal = Number((successfulDispatches * unitRate).toFixed(2));
    const taxPercent = 0;
    const taxAmount = 0;
    const totalAmount = subtotal;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const [y, m] = formattedMonth.split('-').map(Number);
    const periodLabel = `${monthNames[m - 1]} ${y}`;

    const invoiceNumber = `INV-PUSH-${formattedMonth.replace('-', '')}-001`;

    const newInvoice = {
      id: `inv-${formattedMonth}`,
      invoiceNumber,
      month: formattedMonth,
      billingPeriod: periodLabel,
      periodLabel,
      projectName: '3D Galaxy Storefront',
      projectId: 'ajr3dgalaxy',
      billableNotifications: successfulDispatches,
      unitRate,
      activeTier: tierInfo.tierLabel,
      tierPriceLabel: tierInfo.priceLabel,
      freeAllowanceApplied: 0,
      subtotal,
      taxName: 'None',
      taxPercent: 0,
      taxAmount: 0,
      totalAmount,
      currency: 'INR',
      status: 'Generated',
      generatedAt: new Date().toISOString()
    };

    const record = await prisma.setting.findUnique({
      where: { settingKey: 'push-billing-invoices' }
    });
    const currentInvoices = (record?.settingData as any[]) || [];
    const filtered = currentInvoices.filter((inv: any) => inv.month !== formattedMonth);
    filtered.unshift(newInvoice);

    await prisma.setting.upsert({
      where: { settingKey: 'push-billing-invoices' },
      update: { settingData: filtered },
      create: { settingKey: 'push-billing-invoices', settingData: filtered }
    });

    return res.status(200).json({ success: true, data: newInvoice, message: 'Monthly invoice generated.' });
  } catch (error: any) {
    console.error('Error generating monthly push invoice:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const exportPushBillingUsage = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    const { formattedMonth, startDate, endDate } = getMonthDateRange(month as string);

    const logs = await prisma.pushLog.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: {
        id: true,
        campaignId: true,
        fcmToken: true,
        status: true,
        errorMessage: true,
        deliveredAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });

    let csv = 'Log ID,Campaign ID,Status,Token (Masked),Delivered At,Created At,Error Message\n';
    logs.forEach(l => {
      const maskedToken = l.fcmToken ? `${l.fcmToken.slice(0, 8)}...${l.fcmToken.slice(-6)}` : 'N/A';
      csv += `"${l.id}","${l.campaignId || 'manual'}","${l.status}","${maskedToken}","${l.deliveredAt ? l.deliveredAt.toISOString() : ''}","${l.createdAt.toISOString()}","${(l.errorMessage || '').replace(/"/g, '""')}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="push-billing-${formattedMonth}.csv"`);
    return res.status(200).send(csv);
  } catch (error: any) {
    console.error('Error exporting push billing usage:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
