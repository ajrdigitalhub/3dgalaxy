import { Request, Response } from 'express';
import prisma from '../config/database';
import { sysCache } from '../config/cache';

const DEFAULT_MENU_CONFIG = {
  showProductCount: true,
  showBrandCount: true,
  showBestSellers: true,
  showNewArrivals: true,
  hideEmptyCategories: false,
  promotionalBanner: {
    title: 'Summer 3D Printing Sale',
    subtitle: 'Up to 25% OFF Bambu Lab & Creality Printers',
    ctaText: 'Shop Printers Now',
    link: '/category/3d-printers',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=800&auto=format&fit=crop'
  }
};

export const invalidateHeaderMenuCache = () => {
  sysCache.del('header_menu_data');
};

/**
 * Single Optimized Endpoint for Header Mega Menu
 * GET /api/header-menu
 */
export const getHeaderMenuData = async (req: Request, res: Response) => {
  try {
    const cachedData = sysCache.get('header_menu_data');
    if (cachedData && req.query.refresh !== 'true') {
      return res.json({
        success: true,
        data: cachedData
      });
    }

    // 1. Fetch core entities concurrently
    const [
      categoryGroupCounts,
      brandGroupCounts,
      allCategories,
      brandsRaw,
      settingRecord
    ] = await Promise.all([
      prisma.product.groupBy({
        by: ['categoryId'],
        where: { isActive: true, deletedAt: null },
        _count: { id: true }
      }),
      prisma.product.groupBy({
        by: ['brandId'],
        where: { isActive: true, deletedAt: null },
        _count: { id: true }
      }),
      prisma.category.findMany({
        where: { isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          banner: true,
          icon: true,
          parentId: true,
          description: true,
          isFeatured: true,
          sortOrder: true
        },
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.brand.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          description: true
        },
        orderBy: { name: 'asc' }
      }),
      prisma.setting.findUnique({
        where: { settingKey: 'header_menu_config' }
      })
    ]);

    const directCategoryCountMap = new Map<string, number>();
    categoryGroupCounts.forEach(item => {
      if (item.categoryId) {
        directCategoryCountMap.set(item.categoryId, item._count.id);
      }
    });

    const brandCountMap = new Map<string, number>();
    brandGroupCounts.forEach(item => {
      if (item.brandId) {
        brandCountMap.set(item.brandId, item._count.id);
      }
    });

    // Recursive tree building & count aggregation
    const buildCategoryNode = (cat: any): any => {
      const childrenRaw = allCategories.filter(c => c.parentId === cat.id).sort((a, b) => (Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)));
      const children = childrenRaw.map(child => buildCategoryNode(child));
      
      const directCount = directCategoryCountMap.get(cat.id) || 0;
      const childrenCountSum = children.reduce((sum, child) => sum + child.productCount, 0);
      const totalProductCount = directCount + childrenCountSum;

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug || cat.id,
        image: cat.image || null,
        banner: cat.banner || null,
        icon: cat.icon || 'category',
        description: cat.description || null,
        isFeatured: Boolean(cat.isFeatured),
        productCount: totalProductCount,
        children
      };
    };

    const rootCategoriesRaw = allCategories.filter(c => !c.parentId).sort((a, b) => (Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)));
    const categoryTree = rootCategoriesRaw.map(cat => buildCategoryNode(cat));

    const brands = brandsRaw.map(b => ({
      id: b.id,
      name: b.name,
      slug: b.slug || b.id,
      logo: b.logo || null,
      description: b.description || null,
      isFeatured: false,
      productCount: brandCountMap.get(b.id) || 0
    })).sort((a, b) => b.productCount - a.productCount);

    // Build category descendant IDs map for BFS traversal
    const childrenMap = new Map<string | null, string[]>();
    for (const cat of allCategories) {
      const key = cat.parentId ?? null;
      if (!childrenMap.has(key)) childrenMap.set(key, []);
      childrenMap.get(key)!.push(cat.id);
    }

    const getDescendantIds = (rootId: string): string[] => {
      const ids: string[] = [rootId];
      const queue: string[] = [rootId];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const childId of childrenMap.get(curr) || []) {
          ids.push(childId);
          queue.push(childId);
        }
      }
      return ids;
    };

    // Parallel fetch: top 6 products per root category + top 4 products per top 8 brands
    const [catTopResults, brandTopResults] = await Promise.all([
      Promise.all(
        rootCategoriesRaw.map(async (rootCat) => {
          const descendantIds = getDescendantIds(rootCat.id);
          const prods = await prisma.product.findMany({
            where: {
              isActive: true,
              deletedAt: null,
              OR: [
                { categoryId: { in: descendantIds } },
                { productCategories: { some: { categoryId: { in: descendantIds } } } }
              ]
            },
            include: {
              variants: { where: { isActive: true } },
              productCategories: { select: { categoryId: true } },
              brand: { select: { id: true, name: true } }
            },
            orderBy: [
              { isFeatured: 'desc' },
              { createdAt: 'desc' }
            ],
            take: 6
          });
          return { rootId: rootCat.id, prods };
        })
      ),
      Promise.all(
        brandsRaw.slice(0, 8).map(async (brand) => {
          const prods = await prisma.product.findMany({
            where: {
              isActive: true,
              deletedAt: null,
              brandId: brand.id
            },
            include: {
              variants: { where: { isActive: true } },
              productCategories: { select: { categoryId: true } },
              brand: { select: { id: true, name: true } }
            },
            orderBy: [
              { isFeatured: 'desc' },
              { createdAt: 'desc' }
            ],
            take: 4
          });
          return { brandId: brand.id, prods };
        })
      )
    ]);

    // Deduplicate unique products across all results to fetch reviews
    const uniqueProductsMap = new Map<string, any>();
    for (const r of catTopResults) {
      for (const p of r.prods) {
        if (!uniqueProductsMap.has(p.id)) uniqueProductsMap.set(p.id, p);
      }
    }
    for (const r of brandTopResults) {
      for (const p of r.prods) {
        if (!uniqueProductsMap.has(p.id)) uniqueProductsMap.set(p.id, p);
      }
    }
    const uniqueProductIds = Array.from(uniqueProductsMap.keys());

    // Fetch customer reviews strictly for the featured products
    const targetedReviews = uniqueProductIds.length > 0
      ? await prisma.customerReview.findMany({
          where: { productId: { in: uniqueProductIds } },
          select: { productId: true, rating: true, reviewText: true }
        })
      : [];

    const reviewsMap = new Map<string, number[]>();
    for (const cr of targetedReviews) {
      if (cr.reviewText && cr.reviewText.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(cr.reviewText);
          if (parsed.status && parsed.status.toUpperCase() !== 'APPROVED') continue;
        } catch (e) {}
      }
      if (!reviewsMap.has(cr.productId)) reviewsMap.set(cr.productId, []);
      reviewsMap.get(cr.productId)!.push(Number(cr.rating || 5));
    }

    const formatProductPreview = (p: any, rootCategoryId?: string): any => {
      const allRatings = reviewsMap.get(p.id) || [];
      let rating: number | null = null;
      let totalReviews = allRatings.length;
      if (allRatings.length > 0) {
        const sum = allRatings.reduce((a, b) => a + b, 0);
        rating = Number((sum / allRatings.length).toFixed(1));
      }

      let primaryImage = null;
      if (p.images) {
        try {
          const imgs = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
          if (Array.isArray(imgs) && imgs.length > 0) {
            const first = imgs[0];
            primaryImage = typeof first === 'string' ? first : first.url;
          }
        } catch (e) {}
      }

      const catIdSet = new Set<string>();
      if (p.categoryId) catIdSet.add(p.categoryId);
      if (rootCategoryId) catIdSet.add(rootCategoryId);
      if (Array.isArray(p.productCategories)) {
        p.productCategories.forEach((pc: any) => {
          if (pc.categoryId) catIdSet.add(pc.categoryId);
        });
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug || p.id,
        image: primaryImage || `https://picsum.photos/seed/${p.slug || p.id}/300/300`,
        basePrice: Number(p.basePrice),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        rating,
        totalReviews,
        inStock: p.stock > 0,
        categoryId: p.categoryId,
        categoryIds: Array.from(catIdSet),
        rootCategoryId: rootCategoryId || p.categoryId,
        brandId: p.brandId || null,
        brandName: p.brand?.name || null,
        hasVariants: Boolean(p.variants && p.variants.length > 0),
        variants: p.variants || []
      };
    };

    const categoryTopPicks: Record<string, any[]> = {};
    catTopResults.forEach(r => {
      categoryTopPicks[r.rootId] = r.prods.map(p => formatProductPreview(p, r.rootId));
    });

    const brandTopPicks: Record<string, any[]> = {};
    brandTopResults.forEach(r => {
      brandTopPicks[r.brandId] = r.prods.map(p => formatProductPreview(p));
    });

    // Populate bestSellers for backwards compatibility
    const bestSellers = Array.from(uniqueProductsMap.values()).map(p => {
      const matchCat = catTopResults.find(r => r.prods.some(cp => cp.id === p.id));
      return formatProductPreview(p, matchCat?.rootId);
    });

    const config = settingRecord ? { ...DEFAULT_MENU_CONFIG, ...(settingRecord.settingData as object) } : DEFAULT_MENU_CONFIG;

    const payload = {
      categories: categoryTree,
      brands,
      featuredCategories: categoryTree.filter((c: any) => c.productCount > 0).slice(0, 4),
      bestSellers,
      categoryTopPicks,
      brandTopPicks,
      config
    };

    // Store in memory cache for 15 minutes
    sysCache.set('header_menu_data', payload, 900);

    return res.json({
      success: true,
      data: payload
    });
  } catch (error: any) {
    console.error('Error fetching header menu data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve header menu data',
      error: error.message
    });
  }
};

/**
 * Get Admin Header Menu Settings
 * GET /api/admin/header-menu/settings
 */
export const getHeaderMenuSettings = async (req: Request, res: Response) => {
  try {
    const settingRecord = await prisma.setting.findUnique({
      where: { settingKey: 'header_menu_config' }
    });
    const config = settingRecord ? { ...DEFAULT_MENU_CONFIG, ...(settingRecord.settingData as object) } : DEFAULT_MENU_CONFIG;
    return res.json({ success: true, data: config });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update Admin Header Menu Settings
 * PUT /api/admin/header-menu/settings
 */
export const updateHeaderMenuSettings = async (req: Request, res: Response) => {
  try {
    const newConfig = req.body;
    const setting = await prisma.setting.upsert({
      where: { settingKey: 'header_menu_config' },
      update: { settingData: newConfig },
      create: {
        settingKey: 'header_menu_config',
        settingData: newConfig
      }
    });
    invalidateHeaderMenuCache();
    return res.json({
      success: true,
      message: 'Header menu settings updated successfully',
      data: setting.settingData
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
