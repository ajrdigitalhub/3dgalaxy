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
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData
      });
    }

    // 1. Calculate active product counts per category
    const categoryGroupCounts = await prisma.product.groupBy({
      by: ['categoryId'],
      where: {
        isActive: true,
        deletedAt: null
      },
      _count: { id: true }
    });

    const directCategoryCountMap = new Map<string, number>();
    categoryGroupCounts.forEach(item => {
      if (item.categoryId) {
        directCategoryCountMap.set(item.categoryId, item._count.id);
      }
    });

    // 2. Calculate active product counts per brand
    const brandGroupCounts = await prisma.product.groupBy({
      by: ['brandId'],
      where: {
        isActive: true,
        deletedAt: null
      },
      _count: { id: true }
    });

    const brandCountMap = new Map<string, number>();
    brandGroupCounts.forEach(item => {
      if (item.brandId) {
        brandCountMap.set(item.brandId, item._count.id);
      }
    });

    // 3. Fetch All Categories
    const allCategories = await prisma.category.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
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
    });

    // Recursive tree building & count aggregation
    const buildCategoryNode = (cat: any): any => {
      const childrenRaw = allCategories.filter(c => c.parentId === cat.id);
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

    const rootCategoriesRaw = allCategories.filter(c => !c.parentId);
    const categoryTree = rootCategoriesRaw.map(cat => buildCategoryNode(cat));

    // 4. Fetch Active Brands
    const brandsRaw = await prisma.brand.findMany({
      where: {
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        description: true
      },
      orderBy: { name: 'asc' }
    });

    const brands = brandsRaw.map(b => ({
      id: b.id,
      name: b.name,
      slug: b.slug || b.id,
      logo: b.logo || null,
      description: b.description || null,
      isFeatured: false,
      productCount: brandCountMap.get(b.id) || 0
    })).sort((a, b) => b.productCount - a.productCount);

    // 5. Fetch Best Sellers / Featured Products
    const bestSellers = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        slug: true,
        images: true,
        basePrice: true,
        salePrice: true,
        stock: true,
        categoryId: true
      },
      take: 6,
      orderBy: { createdAt: 'desc' }
    });

    // 6. Fetch Admin Configuration Settings
    const settingRecord = await prisma.setting.findUnique({
      where: { settingKey: 'header_menu_config' }
    });

    const config = settingRecord ? { ...DEFAULT_MENU_CONFIG, ...(settingRecord.settingData as object) } : DEFAULT_MENU_CONFIG;

    const payload = {
      categories: categoryTree,
      brands,
      featuredCategories: categoryTree.filter((c: any) => c.productCount > 0).slice(0, 4),
      bestSellers: bestSellers.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug || p.id,
        image: Array.isArray(p.images) && p.images.length > 0 ? (p.images as string[])[0] : null,
        basePrice: Number(p.basePrice),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        rating: (p as any).rating ? Number((p as any).rating) : 4.8,
        inStock: p.stock > 0,
        categoryId: p.categoryId
      })),
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
