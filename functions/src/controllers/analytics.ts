import { Request, Response } from 'express';
import prisma from '../config/database';
import { sysCache } from '../config/cache';

interface AnalyticsQueryParams {
  preset?: string;
  from?: string;
  to?: string;
  categoryId?: string;
  subcategoryId?: string;
  productId?: string;
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

/**
 * Helper to calculate start and end dates based on preset or custom range
 */
function resolveDateRange(preset?: string, fromStr?: string, toStr?: string) {
  const now = new Date();
  let to = new Date(now);
  let from = new Date(now);

  switch (preset) {
    case 'today':
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;

    case 'this_week': {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1 - day);
      from.setDate(now.getDate() + diffToMonday);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    }

    case 'current_month':
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;

    case 'last_3_months':
      from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate(), 0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;

    case 'last_6_months':
      from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate(), 0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;

    case 'last_12_months':
      from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;

    case 'custom':
      if (fromStr) from = new Date(fromStr);
      if (toStr) to = new Date(toStr);
      if (isNaN(from.getTime())) from = new Date(now.getFullYear(), now.getMonth(), 1);
      if (isNaN(to.getTime())) to = new Date(now);
      if (from > to) {
        const temp = from;
        from = to;
        to = temp;
      }
      break;

    default:
      // Default to current month
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
  }

  return { from, to };
}

/**
 * Determine default time granularity based on duration in days
 */
function resolveGranularity(from: Date, to: Date, explicit?: string): 'hourly' | 'daily' | 'weekly' | 'monthly' {
  if (explicit && ['hourly', 'daily', 'weekly', 'monthly'].includes(explicit)) {
    return explicit as any;
  }

  const durationDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);

  if (durationDays <= 1) return 'hourly';
  if (durationDays <= 31) return 'daily';
  if (durationDays <= 180) return 'weekly';
  return 'monthly';
}

/**
 * Format bucket labels based on granularity
 */
function formatBucketKey(date: Date, granularity: string): string {
  if (granularity === 'hourly') {
    const hours = date.getHours().toString().padStart(2, '0');
    return `${hours}:00`;
  }
  if (granularity === 'daily') {
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${day} ${month}`;
  }
  if (granularity === 'weekly') {
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate().toString().padStart(2, '0');
    return `Wk ${day} ${month}`;
  }
  // monthly
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${month} '${year}`;
}

/**
 * Main Controller: GET /api/admin/analytics/sales
 */
export const getSalesAnalytics = async (req: Request, res: Response) => {
  try {
    const {
      preset,
      from: fromQuery,
      to: toQuery,
      categoryId,
      subcategoryId,
      productId,
      granularity: granularityQuery
    } = req.query as AnalyticsQueryParams;

    const { from, to } = resolveDateRange(preset, fromQuery, toQuery);
    const granularity = resolveGranularity(from, to, granularityQuery);

    const cacheKey = `analytics:sales:${from.toISOString()}:${to.toISOString()}:${categoryId || ''}:${subcategoryId || ''}:${productId || ''}:${granularity}`;
    const cachedData = sysCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // Equivalent previous period comparison
    const durationMs = Math.max(to.getTime() - from.getTime(), 3600000);
    const prevTo = new Date(from.getTime());
    const prevFrom = new Date(from.getTime() - durationMs);

    // Resolve target product IDs if category / subcategory filtering is active
    let targetProductIds: string[] | null = null;

    const activeCatId = subcategoryId || categoryId;
    if (activeCatId) {
      // Find all categories matching or descendant
      const categories = await prisma.category.findMany({
        where: { deletedAt: null },
        select: { id: true, parentId: true }
      });

      const getDescendantIds = (parentIds: string[]): string[] => {
        const children = categories.filter(c => c.parentId && parentIds.includes(c.parentId)).map(c => c.id);
        if (children.length === 0) return parentIds;
        return [...parentIds, ...getDescendantIds(children)];
      };

      const allCatIds = getDescendantIds([activeCatId]);

      // Fetch products in these categories
      const prods = await prisma.product.findMany({
        where: {
          deletedAt: null,
          OR: [
            { categoryId: { in: allCatIds } },
            { productCategories: { some: { categoryId: { in: allCatIds } } } }
          ]
        },
        select: { id: true }
      });
      targetProductIds = prods.map(p => p.id);
    }

    if (productId) {
      targetProductIds = targetProductIds ? targetProductIds.filter(id => id === productId) : [productId];
    }

    // Build Prisma order item filter
    const orderItemWhere: any = {};
    if (targetProductIds !== null) {
      orderItemWhere.productId = { in: targetProductIds };
    }

    // Exclude cancelled/failed orders
    const invalidStatuses = ['CANCELLED', 'REJECTED', 'FAILED', 'cancelled', 'rejected', 'failed'];
    const invalidPaymentStatuses = ['FAILED', 'REFUNDED', 'failed', 'refunded'];

    const baseOrderWhere: any = {
      deletedAt: null,
      status: { notIn: invalidStatuses },
      OR: [
        { paymentStatus: null },
        { paymentStatus: { notIn: invalidPaymentStatuses } }
      ]
    };

    if (targetProductIds !== null) {
      baseOrderWhere.items = {
        some: {
          productId: { in: targetProductIds }
        }
      };
    }

    // Fetch current period orders & items
    const currentOrders = await prisma.order.findMany({
      where: {
        ...baseOrderWhere,
        createdAt: { gte: from, lte: to }
      },
      include: {
        items: {
          where: orderItemWhere,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                categoryId: true,
                category: { select: { id: true, name: true } },
                productCategories: { select: { categoryId: true, isPrimary: true, category: { select: { id: true, name: true } } } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Fetch previous period orders & items
    const previousOrders = await prisma.order.findMany({
      where: {
        ...baseOrderWhere,
        createdAt: { gte: prevFrom, lte: prevTo }
      },
      include: {
        items: {
          where: orderItemWhere
        }
      }
    });

    // Calculate Summary Metrics
    const currentRevenue = currentOrders.reduce((acc, o) => {
      if (targetProductIds !== null) {
        return acc + o.items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
      }
      return acc + Number(o.totalAmount || 0);
    }, 0);

    const previousRevenue = previousOrders.reduce((acc, o) => {
      if (targetProductIds !== null) {
        return acc + o.items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
      }
      return acc + Number(o.totalAmount || 0);
    }, 0);

    const currentProductsSold = currentOrders.reduce((acc, o) => {
      return acc + o.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    }, 0);

    const previousProductsSold = previousOrders.reduce((acc, o) => {
      return acc + o.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    }, 0);

    const currentOrdersCount = currentOrders.length;
    const previousOrdersCount = previousOrders.length;

    const currentAOV = currentOrdersCount > 0 ? Math.round(currentRevenue / currentOrdersCount) : 0;
    const previousAOV = previousOrdersCount > 0 ? Math.round(previousRevenue / previousOrdersCount) : 0;

    const calcChangePct = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    const summary = {
      revenue: Math.round(currentRevenue),
      previousRevenue: Math.round(previousRevenue),
      revenueChangePct: calcChangePct(currentRevenue, previousRevenue),

      productsSold: currentProductsSold,
      previousProductsSold,
      productsSoldChangePct: calcChangePct(currentProductsSold, previousProductsSold),

      orders: currentOrdersCount,
      previousOrders: previousOrdersCount,
      ordersChangePct: calcChangePct(currentOrdersCount, previousOrdersCount),

      averageOrderValue: currentAOV,
      previousAverageOrderValue: previousAOV,
      aovChangePct: calcChangePct(currentAOV, previousAOV)
    };

    // Construct Timeline Data Buckets
    const timelineBuckets: Map<string, {
      label: string;
      timestamp: Date;
      revenue: number;
      productsSold: number;
      ordersSet: Set<string>;
      categoryRevMap: Map<string, number>;
      productRevMap: Map<string, number>;
    }> = new Map();

    // Initialize time buckets to ensure smooth graph with no gaps
    const tempDate = new Date(from);
    while (tempDate <= to) {
      const label = formatBucketKey(tempDate, granularity);
      if (!timelineBuckets.has(label)) {
        timelineBuckets.set(label, {
          label,
          timestamp: new Date(tempDate),
          revenue: 0,
          productsSold: 0,
          ordersSet: new Set(),
          categoryRevMap: new Map(),
          productRevMap: new Map()
        });
      }

      // Step increment
      if (granularity === 'hourly') {
        tempDate.setHours(tempDate.getHours() + 1);
      } else if (granularity === 'daily') {
        tempDate.setDate(tempDate.getDate() + 1);
      } else if (granularity === 'weekly') {
        tempDate.setDate(tempDate.getDate() + 7);
      } else {
        tempDate.setMonth(tempDate.getMonth() + 1);
      }
    }

    // Populate timeline buckets with order data
    currentOrders.forEach(o => {
      const orderDate = new Date(o.createdAt);
      const label = formatBucketKey(orderDate, granularity);
      let bucket = timelineBuckets.get(label);

      if (!bucket) {
        bucket = {
          label,
          timestamp: orderDate,
          revenue: 0,
          productsSold: 0,
          ordersSet: new Set(),
          categoryRevMap: new Map(),
          productRevMap: new Map()
        };
        timelineBuckets.set(label, bucket);
      }

      const orderRev = targetProductIds !== null
        ? o.items.reduce((sum, i) => sum + Number(i.totalPrice || 0), 0)
        : Number(o.totalAmount || 0);

      bucket.revenue += orderRev;
      bucket.ordersSet.add(o.id);

      o.items.forEach(item => {
        const qty = Number(item.quantity || 0);
        const itemRev = Number(item.totalPrice || 0);
        bucket!.productsSold += qty;

        const prodName = item.product?.name || 'Unknown Product';
        const primaryCat = item.product?.category?.name ||
          item.product?.productCategories?.find(pc => pc.isPrimary)?.category?.name ||
          item.product?.productCategories?.[0]?.category?.name ||
          'Uncategorized';

        bucket!.productRevMap.set(prodName, (bucket!.productRevMap.get(prodName) || 0) + itemRev);
        bucket!.categoryRevMap.set(primaryCat, (bucket!.categoryRevMap.get(primaryCat) || 0) + itemRev);
      });
    });

    const timeline = Array.from(timelineBuckets.values()).map(b => {
      let topCategory = 'N/A';
      let topCategoryMax = -1;
      b.categoryRevMap.forEach((val, cat) => {
        if (val > topCategoryMax) {
          topCategoryMax = val;
          topCategory = cat;
        }
      });

      let topProduct = 'N/A';
      let topProductMax = -1;
      b.productRevMap.forEach((val, prod) => {
        if (val > topProductMax) {
          topProductMax = val;
          topProduct = prod;
        }
      });

      const ordersCount = b.ordersSet.size;
      return {
        label: b.label,
        timestamp: b.timestamp.toISOString(),
        revenue: Math.round(b.revenue),
        productsSold: b.productsSold,
        orders: ordersCount,
        averageOrderValue: ordersCount > 0 ? Math.round(b.revenue / ordersCount) : 0,
        topCategory,
        topProduct
      };
    });

    // Category Performance Attribution (Deterministic Primary Category to avoid double-counting)
    const categoryStatsMap: Map<string, {
      id: string;
      name: string;
      revenue: number;
      unitsSold: number;
      ordersSet: Set<string>;
    }> = new Map();

    currentOrders.forEach(o => {
      o.items.forEach(item => {
        const qty = Number(item.quantity || 0);
        const rev = Number(item.totalPrice || 0);
        const catId = item.product?.category?.id ||
          item.product?.productCategories?.find(pc => pc.isPrimary)?.categoryId ||
          item.product?.productCategories?.[0]?.categoryId ||
          'uncategorized';

        const catName = item.product?.category?.name ||
          item.product?.productCategories?.find(pc => pc.isPrimary)?.category?.name ||
          item.product?.productCategories?.[0]?.category?.name ||
          'General / Uncategorized';

        let stat = categoryStatsMap.get(catId);
        if (!stat) {
          stat = {
            id: catId,
            name: catName,
            revenue: 0,
            unitsSold: 0,
            ordersSet: new Set()
          };
          categoryStatsMap.set(catId, stat);
        }

        stat.revenue += rev;
        stat.unitsSold += qty;
        stat.ordersSet.add(o.id);
      });
    });

    const categoryList = Array.from(categoryStatsMap.values())
      .map(c => ({
        id: c.id,
        name: c.name,
        revenue: Math.round(c.revenue),
        unitsSold: c.unitsSold,
        ordersCount: c.ordersSet.size
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Top Products Ranking
    const productStatsMap: Map<string, {
      id: string;
      name: string;
      categoryName: string;
      unitsSold: number;
      revenue: number;
      prevRevenue: number;
    }> = new Map();

    currentOrders.forEach(o => {
      o.items.forEach(item => {
        if (!item.productId) return;
        const qty = Number(item.quantity || 0);
        const rev = Number(item.totalPrice || 0);
        const prodId = item.productId;
        const prodName = item.product?.name || 'Product';
        const catName = item.product?.category?.name || 'General';

        let stat = productStatsMap.get(prodId);
        if (!stat) {
          stat = {
            id: prodId,
            name: prodName,
            categoryName: catName,
            unitsSold: 0,
            revenue: 0,
            prevRevenue: 0
          };
          productStatsMap.set(prodId, stat);
        }

        stat.unitsSold += qty;
        stat.revenue += rev;
      });
    });

    // Populate previous period product revenues to compute product growth %
    previousOrders.forEach(o => {
      o.items.forEach(item => {
        if (!item.productId) return;
        const rev = Number(item.totalPrice || 0);
        const stat = productStatsMap.get(item.productId);
        if (stat) {
          stat.prevRevenue += rev;
        }
      });
    });

    const topProducts = Array.from(productStatsMap.values())
      .map(p => ({
        id: p.id,
        name: p.name,
        categoryName: p.categoryName,
        unitsSold: p.unitsSold,
        revenue: Math.round(p.revenue),
        avgSellingPrice: p.unitsSold > 0 ? Math.round(p.revenue / p.unitsSold) : 0,
        growthPct: calcChangePct(p.revenue, p.prevRevenue)
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((p, idx) => ({
        rank: (idx + 1).toString().padStart(2, '0'),
        ...p
      }));

    const responsePayload = {
      preset: preset || 'current_month',
      from: from.toISOString(),
      to: to.toISOString(),
      granularity,
      summary,
      timeline,
      categories: categoryList,
      topProducts,
      lastUpdated: new Date().toISOString()
    };

    // Store in cache for 30s
    sysCache.set(cacheKey, responsePayload, 30);

    return res.status(200).json({
      success: true,
      data: responsePayload,
      cached: false
    });

  } catch (error: any) {
    console.error('Error fetching sales analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to compute sales analytics.',
      details: error.message
    });
  }
};

/**
 * Controller: GET /api/admin/analytics/filters (Categories & Products list for frontend dropdowns)
 */
export const getAnalyticsFilterOptions = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'analytics:filter_options';
    const cached = sysCache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    const categories = await prisma.category.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        parentId: true,
        slug: true
      },
      orderBy: { sortOrder: 'asc' }
    });

    const products = await prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        categoryId: true,
        basePrice: true,
        salePrice: true
      },
      orderBy: { name: 'asc' }
    });

    const payload = { categories, products };
    sysCache.set(cacheKey, payload, 60);

    return res.status(200).json({
      success: true,
      data: payload
    });
  } catch (error: any) {
    console.error('Error fetching analytics filter options:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to load analytics filter options.'
    });
  }
};

/**
 * Real-time SSE Stream: GET /api/admin/analytics/sales/stream
 */
export const salesAnalyticsStream = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Initial heartbeat event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // Stream periodic updates / heartbeat every 20s
  const intervalId = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
  }, 20000);

  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
};
