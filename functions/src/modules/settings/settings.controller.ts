import { Request, Response } from 'express';
import { getSettingsService, updateSettingsService } from './settings.service';
import { clearCache } from '../../middleware/cache';
import { sysCache } from '../../config/cache';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const data = await getSettingsService();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to find settings', details: error.message });
  }
};

export const getSettingsVersion = async (req: Request, res: Response) => {
  try {
    const cached = sysCache.get('app_settings');
    if (cached) {
      return res.status(200).json({
        success: true,
        version: cached.version || 1,
        updatedAt: cached.updatedAt || new Date().toISOString()
      });
    }
    const data = await getSettingsService();
    return res.status(200).json({
      success: true,
      version: data.version || 1,
      updatedAt: data.updatedAt || new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to find settings version', details: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const updated = await updateSettingsService(req.body);
    clearCache(); // Invalidate server-side cache for settings and layout configs
    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update settings', details: error.message });
  }
};

export const getActiveAdvertisements = async (req: Request, res: Response) => {
  try {
    const data = await getSettingsService();
    const rawAds = data?.advertisements || [];
    const now = new Date().getTime();

    const active = rawAds.filter((ad: any) => {
      if (!ad) return false;
      const status = ad.status || 'active';
      if (status === 'draft' || status === 'paused' || status === 'archived') return false;

      if (ad.startDate) {
        const startMs = Date.parse(`${ad.startDate}T${ad.startTime || '00:00'}:00`);
        if (!isNaN(startMs) && now < startMs) return false;
      }
      if (ad.endDate) {
        const endMs = Date.parse(`${ad.endDate}T${ad.endTime || '23:59'}:59`);
        if (!isNaN(endMs) && now > endMs) return false;
      }

      return true;
    }).map((ad: any) => ({
      id: ad.id,
      title: ad.title || ad.headline || ad.name || '',
      headline: ad.headline || ad.title || '',
      subheadline: ad.subheadline || '',
      ctaText: ad.ctaText || 'Shop Now',
      ctaUrl: ad.ctaUrl || ad.linkUrl || ad.targetUrl || '',
      ctaAction: ad.ctaAction || 'open_url',
      openInNewTab: ad.openInNewTab || false,
      imageUrl: ad.imageUrl || ad.mediaUrl || '',
      mobileImageUrl: ad.mobileImageUrl || '',
      type: ad.type || 'banner',
      placement: ad.placement || ad.position || 'homepage',
      priority: ad.priority || 1,
      startDate: ad.startDate || '',
      startTime: ad.startTime || '',
      endDate: ad.endDate || '',
      endTime: ad.endTime || '',
      timezone: ad.timezone || 'Asia/Kolkata',
      enableCountdown: ad.enableCountdown || false,
      countdownType: ad.countdownType || 'campaign_end',
      customEndDate: ad.customEndDate || '',
      customDuration: ad.customDuration || '',
      isPopup: ad.isPopup || ad.type === 'popup' || ad.placement === 'floating_popup',
      popupPosition: ad.popupPosition || 'center',
      popupSize: ad.popupSize || 'medium',
      overlay: ad.overlay || 'dark',
      showCloseButton: ad.showCloseButton !== false,
      allowEscClose: ad.allowEscClose !== false,
      allowOutsideClickClose: ad.allowOutsideClickClose !== false,
      animation: ad.animation || 'zoom',
      trigger: ad.trigger || 'immediate',
      delaySeconds: ad.delaySeconds || 3,
      scrollPercent: ad.scrollPercent || 50,
      pageViewsCount: ad.pageViewsCount || 1,
      frequency: ad.frequency || 'always',
      frequencyHours: ad.frequencyHours || 24,
      frequencyDays: ad.frequencyDays || 1,
      maxImpressionsPerUser: ad.maxImpressionsPerUser || 0,
      audience: ad.audience || 'all',
      pageTargeting: ad.pageTargeting || 'all',
      targetUrlPath: ad.targetUrlPath || '',
      deviceTargeting: ad.deviceTargeting || 'all',
      couponCode: ad.couponCode || '',
      productId: ad.productId || '',
      categoryId: ad.categoryId || '',
      discountText: ad.discountText || '',
      showImageOnly: !!ad.showImageOnly,
      hideHeader: !!ad.hideHeader,
      contentMode: ad.contentMode || (ad.showImageOnly ? 'IMAGE_ONLY' : 'FULL'),
      imageClickAction: ad.imageClickAction || 'no_action'
    }));

    return res.status(200).json({ success: true, data: active, campaigns: active });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch active advertisements', details: error.message });
  }
};
