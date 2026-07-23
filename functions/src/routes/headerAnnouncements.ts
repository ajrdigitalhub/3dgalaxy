import { Router, Request, Response } from 'express';
import { getSettingsService, updateSettingsService } from '../modules/settings/settings.service';
import { authenticateToken, requireRole } from '../middleware/auth';
import { clearCache } from '../middleware/cache';

const router = Router();

export const DEFAULT_HEADER_ANNOUNCEMENTS = [
  {
    id: "ann-free-shipping",
    title: "Free Shipping",
    shortMessage: "🚚 Free Shipping on Orders Above ₹999",
    description: "Enjoy free standard delivery across India on all eligible cart totals exceeding ₹999.",
    icon: "local_shipping",
    iconType: "material",
    bgColor: "linear-gradient(135deg, #d65108 0%, #b83200 100%)",
    textColor: "#ffffff",
    ctaText: "Shop Now",
    ctaUrl: "/products",
    openInNewTab: false,
    animationType: "fade",
    displayMode: "rotating",
    scrollDirection: "left",
    scrollSpeed: 4,
    priority: 1,
    visiblePages: ["all"],
    targetAudience: "all",
    startDate: null,
    endDate: null,
    isActive: true,
    isDismissible: true,
    sortOrder: 1
  },
  {
    id: "ann-flash-sale",
    title: "Flash Sale",
    shortMessage: "🔥 Flash Sale - Flat 20% OFF 3D Printing Filaments",
    description: "Limited time offer on premium PLA, PETG & ABS filaments.",
    icon: "whatshot",
    iconType: "material",
    bgColor: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
    textColor: "#ffffff",
    ctaText: "Claim Deal",
    ctaUrl: "/products?category=filaments",
    openInNewTab: false,
    animationType: "pulse",
    displayMode: "rotating",
    scrollDirection: "left",
    scrollSpeed: 4,
    priority: 2,
    visiblePages: ["all"],
    targetAudience: "all",
    startDate: null,
    endDate: null,
    isActive: true,
    isDismissible: true,
    sortOrder: 2
  },
  {
    id: "ann-coupon",
    title: "Coupon Code",
    shortMessage: "🎁 Use Coupon AJR100 & Save ₹100 Extra",
    description: "Apply code AJR100 at checkout for instant ₹100 discount.",
    icon: "card_giftcard",
    iconType: "material",
    bgColor: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    textColor: "#ffffff",
    ctaText: "Use Code",
    ctaUrl: "/products",
    openInNewTab: false,
    animationType: "bounce",
    displayMode: "rotating",
    scrollDirection: "left",
    scrollSpeed: 4,
    priority: 3,
    visiblePages: ["all"],
    targetAudience: "all",
    startDate: null,
    endDate: null,
    isActive: true,
    isDismissible: true,
    sortOrder: 3
  },
  {
    id: "ann-stl-slicer",
    title: "Custom Slicing",
    shortMessage: "🖨️ Upload STL Files & Get Instant Online Slicing Quotes",
    description: "Automated FDM & SLA 3D printing price calculator.",
    icon: "print",
    iconType: "material",
    bgColor: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    textColor: "#ffffff",
    ctaText: "Upload STL",
    ctaUrl: "/slicer",
    openInNewTab: false,
    animationType: "slide-left",
    displayMode: "rotating",
    scrollDirection: "left",
    scrollSpeed: 4,
    priority: 4,
    visiblePages: ["all"],
    targetAudience: "all",
    startDate: null,
    endDate: null,
    isActive: true,
    isDismissible: true,
    sortOrder: 4
  }
];

// Helper: Get list of announcements from settings or defaults
async function getAnnouncementsList(): Promise<any[]> {
  const settings = await getSettingsService();
  let list = settings?.headerAnnouncements;
  if (!Array.isArray(list) || list.length === 0) {
    list = DEFAULT_HEADER_ANNOUNCEMENTS;
  }
  return list;
}

// 1. PUBLIC: GET /api/header-announcements
router.get('/header-announcements', async (req: Request, res: Response) => {
  try {
    const list = await getAnnouncementsList();
    const now = new Date();
    const page = String(req.query.page || 'all');
    const audience = String(req.query.audience || 'all');

    const activeList = list.filter((item: any) => {
      if (item.isActive === false) return false;

      // Date Scheduling Check
      if (item.startDate) {
        const start = new Date(item.startDate);
        if (start > now) return false;
      }
      if (item.endDate) {
        const end = new Date(item.endDate);
        if (end < now) return false;
      }

      // Page Targeting Check
      if (Array.isArray(item.visiblePages) && item.visiblePages.length > 0) {
        const hasAll = item.visiblePages.includes('all');
        const matchesPage = item.visiblePages.some((p: string) => {
          if (p === 'homepage' && (page === '/' || page === '')) return true;
          return page.startsWith(p);
        });
        if (!hasAll && !matchesPage) return false;
      }

      // Audience Targeting Check
      if (item.targetAudience && item.targetAudience !== 'all' && audience !== 'all') {
        if (item.targetAudience !== audience) return false;
      }

      return true;
    });

    // Sort by priority (ascending), then sortOrder
    activeList.sort((a: any, b: any) => {
      const pA = a.priority ?? a.sortOrder ?? 10;
      const pB = b.priority ?? b.sortOrder ?? 10;
      return pA - pB;
    });

    return res.status(200).json({ success: true, announcements: activeList });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve header announcements', details: error.message });
  }
});

// 2. ADMIN: GET /api/admin/header-announcements
router.get('/admin/header-announcements', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), async (req: Request, res: Response) => {
  try {
    const list = await getAnnouncementsList();
    return res.status(200).json({ success: true, announcements: list });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve admin header announcements', details: error.message });
  }
});

// 3. ADMIN: POST /api/admin/header-announcements
router.post('/admin/header-announcements', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), async (req: Request, res: Response) => {
  try {
    const currentList = await getAnnouncementsList();
    const payload = req.body;

    const newItem = {
      id: payload.id || `ann-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: payload.title || 'New Announcement',
      shortMessage: payload.shortMessage || 'Promotional message details...',
      description: payload.description || '',
      icon: payload.icon || 'campaign',
      iconType: payload.iconType || 'material',
      svgPath: payload.svgPath || '',
      bgColor: payload.bgColor || '#d65108',
      textColor: payload.textColor || '#ffffff',
      ctaText: payload.ctaText || 'Learn More',
      ctaUrl: payload.ctaUrl || '/products',
      openInNewTab: payload.openInNewTab ?? false,
      animationType: payload.animationType || 'fade',
      displayMode: payload.displayMode || 'rotating',
      scrollDirection: payload.scrollDirection || 'left',
      scrollSpeed: Number(payload.scrollSpeed) || 4,
      priority: Number(payload.priority) || (currentList.length + 1),
      visiblePages: Array.isArray(payload.visiblePages) ? payload.visiblePages : ['all'],
      targetAudience: payload.targetAudience || 'all',
      startDate: payload.startDate || null,
      endDate: payload.endDate || null,
      isActive: payload.isActive ?? true,
      isDismissible: payload.isDismissible ?? true,
      sortOrder: Number(payload.sortOrder) || (currentList.length + 1),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedList = [...currentList, newItem];
    const settings = await getSettingsService();
    const updatedSettings = await updateSettingsService({ ...settings, headerAnnouncements: updatedList });
    clearCache();

    return res.status(201).json({ success: true, announcement: newItem, announcements: updatedList });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to create header announcement', details: error.message });
  }
});

// 4. ADMIN: PUT /api/admin/header-announcements/:id
router.put('/admin/header-announcements/:id', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentList = await getAnnouncementsList();
    const index = currentList.findIndex((item: any) => item.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    const updatedItem = {
      ...currentList[index],
      ...req.body,
      id: id,
      updatedAt: new Date().toISOString()
    };

    currentList[index] = updatedItem;
    const settings = await getSettingsService();
    await updateSettingsService({ ...settings, headerAnnouncements: currentList });
    clearCache();

    return res.status(200).json({ success: true, announcement: updatedItem, announcements: currentList });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update header announcement', details: error.message });
  }
});

// 5. ADMIN: DELETE /api/admin/header-announcements/:id
router.delete('/admin/header-announcements/:id', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentList = await getAnnouncementsList();
    const filteredList = currentList.filter((item: any) => item.id !== id);

    const settings = await getSettingsService();
    await updateSettingsService({ ...settings, headerAnnouncements: filteredList });
    clearCache();

    return res.status(200).json({ success: true, announcements: filteredList });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete header announcement', details: error.message });
  }
});

// 6. ADMIN: POST /api/admin/header-announcements/reorder
router.post('/admin/header-announcements/reorder', authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager']), async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'ids array is required for reordering' });
    }

    const currentList = await getAnnouncementsList();
    const map = new Map(currentList.map((item: any) => [item.id, item]));

    const reordered: any[] = [];
    ids.forEach((id: string, index: number) => {
      const found = map.get(id);
      if (found) {
        reordered.push({ ...found, priority: index + 1, sortOrder: index + 1 });
        map.delete(id);
      }
    });

    // Append any items not included in ids list
    map.forEach((item: any) => {
      reordered.push({ ...item, priority: reordered.length + 1, sortOrder: reordered.length + 1 });
    });

    const settings = await getSettingsService();
    await updateSettingsService({ ...settings, headerAnnouncements: reordered });
    clearCache();

    return res.status(200).json({ success: true, announcements: reordered });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to reorder header announcements', details: error.message });
  }
});

export default router;
