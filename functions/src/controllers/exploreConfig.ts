import { Request, Response } from 'express';
import prisma from '../config/database';
import { sysCache } from '../config/cache';

export const DEFAULT_EXPLORE_CONFIG = {
  general: {
    enableExplore: true,
    theme: 'auto',
    spacing: 'comfortable',
    animation: 'smooth-slide',
  },
  heroBanners: [
    {
      id: 'hero_1',
      title: 'Next-Gen 3D Printing Ecosystem',
      subtitle: 'Engineered for extreme speed, micron precision, and industrial reliability.',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1600&auto=format&fit=crop',
      videoUrl: '',
      buttonText: 'Explore Printers',
      buttonLink: '/category/3d-printers',
      priority: 1,
      schedule: null,
    },
    {
      id: 'hero_2',
      title: 'High-Speed Filament Spools',
      subtitle: 'Premium PLA+, PETG, Carbon Fiber & Engineering Materials.',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop',
      videoUrl: '',
      buttonText: 'Shop Filaments',
      buttonLink: '/category/filaments',
      priority: 2,
      schedule: null,
    },
  ],
  featuredCategoriesConfig: [
    {
      name: '3D Printers',
      slug: '3d-printers',
      icon: 'precision_manufacturing',
      description: 'High-speed FDM & Resin 3D Printers',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop',
    },
    {
      name: 'Filaments',
      slug: 'filaments',
      icon: 'texture',
      description: 'PLA, PETG, ABS, TPU & Carbon Fiber',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
    },
    {
      name: 'Spare Parts',
      slug: 'spare-parts',
      icon: 'build',
      description: 'Original Nozzles, Hotends & Extruders',
      image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?q=80&w=600&auto=format&fit=crop',
    },
    {
      name: 'Accessories',
      slug: 'accessories',
      icon: 'settings_input_component',
      description: 'Build Plates, Tools & Upgrades',
      image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=600&auto=format&fit=crop',
    },
  ],
  categorySectionsConfig: {
    productsPerCategory: 6,
    layout: 'grid', // 'grid' | 'carousel' | 'list'
  },
  featuredCollections: [
    {
      id: 'col_1',
      name: 'Beginner Starter Kit',
      slug: '3d-printers',
      description: 'Everything you need to launch your 3D printing journey.',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop',
      count: 12,
    },
    {
      id: 'col_2',
      name: 'Professional Printing',
      slug: '3d-printers',
      description: 'Industrial-grade dual extrusion & high-temp enclosures.',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
      count: 24,
    },
    {
      id: 'col_3',
      name: 'Engineering Materials',
      slug: 'filaments',
      description: 'High-strength Carbon Fiber, Nylon & PEEK spools.',
      image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=600&auto=format&fit=crop',
      count: 48,
    },
    {
      id: 'col_4',
      name: 'Resin Printing Essentials',
      slug: 'filaments',
      description: 'Ultra-clear 8K resin, wash & cure stations.',
      image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?q=80&w=600&auto=format&fit=crop',
      count: 18,
    },
  ],
  trendingConfig: {
    mode: 'most-viewed', // 'most-viewed' | 'bestsellers' | 'manual' | 'newest'
    count: 8,
  },
  buyingGuides: [
    {
      id: 'guide_1',
      title: 'Choosing Your First 3D Printer',
      subtitle: 'Complete 2026 Buying Guide for FDM vs Resin Printers',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop',
      link: '/slicer',
      readTime: '5 min read',
    },
    {
      id: 'guide_2',
      title: 'PLA vs PETG vs ABS Filament Guide',
      subtitle: 'Mastering temperature, bed adhesion & mechanical strength',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
      link: '/products?category=filaments',
      readTime: '7 min read',
    },
    {
      id: 'guide_3',
      title: 'Printer Maintenance & Nozzle Cleaning',
      subtitle: 'Prevent clogs, level beds, and maintain peak print quality',
      image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?q=80&w=600&auto=format&fit=crop',
      link: '/products?category=spare-parts',
      readTime: '4 min read',
    },
    {
      id: 'guide_4',
      title: '3D Slicing & Cura / Bambu Studio Tutorial',
      subtitle: 'Optimize infill density, layer height & print speeds',
      image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=600&auto=format&fit=crop',
      link: '/slicer',
      readTime: '8 min read',
    },
  ],
  bottomCta: {
    title: 'Need Help Choosing the Right Printer or Material?',
    subtitle: 'Our senior additive manufacturing engineers are available 24/7 to guide your purchase.',
    primaryButtonText: 'Talk to Our Experts on WhatsApp',
    primaryButtonLink: 'https://wa.me/919876543210',
    secondaryButtonText: 'Explore 3D Slicing Service',
    secondaryButtonLink: '/slicer',
  },
  sectionOrder: [
    'hero',
    'featured-categories',
    'category-sections',
    'collections',
    'trending',
    'new-arrivals',
    'best-sellers',
    'brands',
    'buying-guides',
    'bottom-cta',
  ],
};

export const invalidateExploreCache = () => {
  sysCache.del('explore_navigation_payload');
};

/**
 * Public Endpoint: GET /api/explore-navigation
 */
export const getExploreNavigationData = async (req: Request, res: Response) => {
  try {
    const cachedPayload = sysCache.get('explore_navigation_payload');
    if (cachedPayload) {
      return res.json({ success: true, data: cachedPayload });
    }

    // 1. Fetch DB explore navigation config or default
    const settingRecord = await prisma.setting.findUnique({
      where: { settingKey: 'explore_navigation_config' },
    });

    const config = settingRecord
      ? { ...DEFAULT_EXPLORE_CONFIG, ...(settingRecord.settingData as object) }
      : DEFAULT_EXPLORE_CONFIG;

    // 2. Aggregate active product counts per category
    const categoryGroupCounts = await prisma.product.groupBy({
      by: ['categoryId'],
      where: { isActive: true, deletedAt: null },
      _count: { id: true },
    });

    const categoryCountMap = new Map<string, number>();
    categoryGroupCounts.forEach((item) => {
      if (item.categoryId) categoryCountMap.set(item.categoryId, item._count.id);
    });

    // 3. Fetch all active categories to construct subcategory trees
    const [rootCategories, allDbCategories] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true, deletedAt: null, parentId: null },
        include: { children: { where: { isActive: true, deletedAt: null } } },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.category.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true, parentId: true },
      }),
    ]);

    const getDescendantCategoryIds = (rootId: string): string[] => {
      const ids: string[] = [rootId];
      const queue: string[] = [rootId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = allDbCategories.filter((c) => c.parentId === currentId);
        for (const child of children) {
          ids.push(child.id);
          queue.push(child.id);
        }
      }
      return Array.from(new Set(ids));
    };

    // 4. Aggregate customer reviews for rating calculation
    const allCustomerReviews = await prisma.customerReview.findMany({
      select: { productId: true, rating: true, reviewText: true },
    });
    const reviewsMap = new Map<string, number[]>();
    for (const cr of allCustomerReviews) {
      if (cr.reviewText && cr.reviewText.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(cr.reviewText);
          if (parsed.status && parsed.status.toUpperCase() !== 'APPROVED') continue;
        } catch (e) {}
      }
      if (!reviewsMap.has(cr.productId)) reviewsMap.set(cr.productId, []);
      reviewsMap.get(cr.productId)!.push(Number(cr.rating || 5));
    }

    const formatProduct = (p: any) => {
      const prodReviews = p.reviews ? p.reviews.map((r: any) => Number(r.rating || 5)) : [];
      const custRevRatings = reviewsMap.get(p.id) || [];
      const allRatings = [...prodReviews, ...custRevRatings];

      let rating: number | null = null;
      let totalReviews = allRatings.length;
      if (allRatings.length > 0) {
        const sum = allRatings.reduce((a, b) => a + b, 0);
        rating = Number((sum / allRatings.length).toFixed(1));
      }

      let primaryImage = null;
      let hoverImage = null;
      if (p.images) {
        try {
          const imgs = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
          if (Array.isArray(imgs) && imgs.length > 0) {
            primaryImage = typeof imgs[0] === 'string' ? imgs[0] : imgs[0].url;
            if (imgs.length > 1) {
              hoverImage = typeof imgs[1] === 'string' ? imgs[1] : imgs[1].url;
            }
          }
        } catch (e) {}
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug || p.id,
        brand: p.brand || '3D Galaxy',
        image: primaryImage || `https://picsum.photos/seed/${p.slug || p.id}/400/400`,
        hoverImage: hoverImage || primaryImage,
        basePrice: Number(p.basePrice),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        rating,
        totalReviews,
        stock: p.stock || 0,
        inStock: (p.stock || 0) > 0,
        categoryId: p.categoryId,
        categorySlug: p.category?.slug || '',
        categoryName: p.category?.name || '',
        hasVariants: Array.isArray(p.variants) && p.variants.length > 0,
      };
    };

    // 5. Fetch 6-8 products for EACH Category Section
    const limitPerCategory = (config as any).categorySectionsConfig?.productsPerCategory || 6;
    const categorySections: Array<{
      category: {
        id: string;
        name: string;
        slug: string;
        description?: string | null;
        image?: string | null;
        banner?: string | null;
        productCount: number;
      };
      products: any[];
    }> = [];

    for (const cat of rootCategories) {
      const descendantIds = getDescendantCategoryIds(cat.id);

      const prodsRaw = await prisma.product.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          OR: [
            { categoryId: { in: descendantIds } },
            { productCategories: { some: { categoryId: { in: descendantIds } } } },
          ],
        },
        include: { category: true, reviews: true, variants: { where: { isActive: true } } },
        take: limitPerCategory,
        orderBy: { createdAt: 'desc' },
      });

      // ONLY include category sections that have active products
      if (prodsRaw.length > 0) {
        const totalCount = await prisma.product.count({
          where: {
            isActive: true,
            deletedAt: null,
            OR: [
              { categoryId: { in: descendantIds } },
              { productCategories: { some: { categoryId: { in: descendantIds } } } },
            ],
          },
        });

        categorySections.push({
          category: {
            id: cat.id,
            name: cat.name,
            slug: cat.slug || cat.id,
            description: cat.description || `Explore ${cat.name} catalog`,
            image: cat.image || null,
            banner: cat.banner || null,
            productCount: totalCount,
          },
          products: prodsRaw.map(formatProduct),
        });
      }
    }

    // 6. Fetch Catalog Wide Special Lists (Trending, Best Sellers, New Arrivals)
    const [trendingRaw, bestSellersRaw, newArrivalsRaw, brandsGroup] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, deletedAt: null },
        include: { category: true, reviews: true, variants: { where: { isActive: true } } },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.findMany({
        where: { isActive: true, deletedAt: null, isFeatured: true },
        include: { category: true, reviews: true, variants: { where: { isActive: true } } },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.findMany({
        where: { isActive: true, deletedAt: null },
        include: { category: true, reviews: true, variants: { where: { isActive: true } } },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.brand.findMany({
        where: { deletedAt: null },
        include: {
          _count: {
            select: {
              products: {
                where: { isActive: true, deletedAt: null },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const brands = brandsGroup.map((b) => ({
      name: b.name,
      slug: b.slug,
      productCount: b._count.products,
      logo: b.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=0D1017&color=F97316&size=128`,
    }));

    const payload = {
      config,
      categorySections,
      trendingProducts: trendingRaw.map(formatProduct),
      bestSellers: (bestSellersRaw.length > 0 ? bestSellersRaw : trendingRaw).map(formatProduct),
      newArrivals: newArrivalsRaw.map(formatProduct),
      brands,
    };

    // Cache payload in sysCache for 15 minutes
    sysCache.set('explore_navigation_payload', payload, 900);

    return res.json({ success: true, data: payload });
  } catch (error: any) {
    console.error('Error fetching explore navigation payload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve explore navigation data',
      error: error.message,
    });
  }
};

/**
 * Admin Endpoint: GET /api/admin/explore-navigation
 */
export const getExploreNavigationSettings = async (req: Request, res: Response) => {
  try {
    const settingRecord = await prisma.setting.findUnique({
      where: { settingKey: 'explore_navigation_config' },
    });
    const config = settingRecord
      ? { ...DEFAULT_EXPLORE_CONFIG, ...(settingRecord.settingData as object) }
      : DEFAULT_EXPLORE_CONFIG;
    return res.json({ success: true, data: config });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Admin Endpoint: PUT /api/admin/explore-navigation
 */
export const updateExploreNavigationSettings = async (req: Request, res: Response) => {
  try {
    const newConfig = req.body;
    const setting = await prisma.setting.upsert({
      where: { settingKey: 'explore_navigation_config' },
      update: { settingData: newConfig },
      create: {
        settingKey: 'explore_navigation_config',
        settingData: newConfig,
      },
    });

    invalidateExploreCache();

    return res.json({
      success: true,
      message: 'Explore navigation settings updated successfully',
      data: setting.settingData,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
