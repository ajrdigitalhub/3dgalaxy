import { Request, Response } from 'express';
import prisma from '../config/database';
import { sysCache } from '../config/cache';
import { sendPushNotificationInternal } from './notification';
import { clearCache } from '../middleware/cache';
import { getSettingsService } from '../modules/settings/settings.service';

export const clearProductCache = () => {
  sysCache.clearPattern('products_list_');
  sysCache.clearPattern('products_slug_');
  sysCache.clearPattern('products_id_');
  clearCache(); // Flushes route cache for /api/home and other routes
};

const safeParseArray = (val: any): any[] => {
  if (!val) return [];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(val) ? val : [];
};

const safeParseObject = (val: any): any => {
  if (!val) return null;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return val;
};

const getCategoryPath = async (categoryId: string | null): Promise<string[]> => {
  if (!categoryId) return [];
  const path: string[] = [];
  let currentId: string | null = categoryId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const cat: any = await prisma.category.findUnique({
      where: { id: currentId },
      select: { name: true, parentId: true },
    });
    if (!cat) break;
    path.unshift(cat.name);
    currentId = cat.parentId;
  }
  return path;
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'products_list_' + JSON.stringify(req.query);
    const cachedResponse = sysCache.get(cacheKey);
    if (cachedResponse) {
      return res.status(200).json(cachedResponse);
    }

    const {
      page = '1',
      limit = '24',
      search,
      category,
      subcategory,
      brand,
      priceMin,
      priceMax,
      rating,
      stock,
      featured,
      material,
      color,
      technology,
      printerType,
      compatibility,
      sort = 'popularity',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Load all active products first
    const items = await prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        brand: true,
        category: true,
        reviews: true,
      }
    });

    const getSpecsArray = (specsJson: any): any[] => {
      if (!specsJson) return [];
      if (Array.isArray(specsJson)) return specsJson;
      if (specsJson && typeof specsJson === 'object' && Array.isArray((specsJson as any).create)) {
        return (specsJson as any).create;
      }
      return [];
    };

    // Parse and map all products with computed features
    const allMapped = items.map(p => {
      const specs = getSpecsArray(p.specifications);

      // Extract Color
      const colorSpec = specs.find(s => ['color', 'colors', 'colour', 'colours'].includes(s.name.toLowerCase()));
      let colors: string[] = [];
      if (colorSpec && colorSpec.value) {
        colors = colorSpec.value.split(/[,/]/).map((c: string) => c.trim()).filter(Boolean);
      }
      if (colors.length === 0) {
        const colorKeywords = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Grey', 'Gray', 'Orange', 'Purple', 'Silver', 'Gold', 'Pink', 'Brown'];
        for (const keyword of colorKeywords) {
          if (p.name.toLowerCase().includes(keyword.toLowerCase())) {
            colors.push(keyword);
          }
        }
      }
      if (colors.length === 0) colors.push('Multicolor');

      // Extract Material
      const materialSpec = specs.find(s => ['material', 'materials'].includes(s.name.toLowerCase()));
      let materials: string[] = [];
      if (materialSpec && materialSpec.value) {
        materials = materialSpec.value.split(/[,/]/).map((m: string) => m.trim()).filter(Boolean);
      }
      if (materials.length === 0 && p.category?.name) {
        const matKeywords = ['PLA', 'PETG', 'ABS', 'TPU', 'Resin', 'Nylon', 'Carbon Fiber', 'Wood', 'Metal'];
        for (const keyword of matKeywords) {
          if (p.category.name.toLowerCase().includes(keyword.toLowerCase()) || p.name.toLowerCase().includes(keyword.toLowerCase())) {
            materials.push(keyword);
          }
        }
      }
      if (materials.length === 0) materials.push('Other');

      // Extract Technology
      const techSpec = specs.find(s => ['technology', 'print technology', 'printing technology'].includes(s.name.toLowerCase()));
      let technology = techSpec?.value || '';
      if (!technology && p.category?.name) {
        if (p.category.name.toLowerCase().includes('resin') || p.name.toLowerCase().includes('resin') || p.category.name.toLowerCase().includes('sla') || p.category.name.toLowerCase().includes('lcd')) {
          technology = 'Resin (SLA/LCD)';
        } else if (p.category.name.toLowerCase().includes('fdm') || p.name.toLowerCase().includes('fdm') || p.name.toLowerCase().includes('printer') || p.category.name.toLowerCase().includes('pla') || p.category.name.toLowerCase().includes('abs') || p.category.name.toLowerCase().includes('petg')) {
          technology = 'FDM';
        }
      }
      if (!technology) technology = 'Other';

      // Extract Printer Type
      const typeSpec = specs.find(s => ['printer type', 'type', 'structure'].includes(s.name.toLowerCase()));
      let printerType = typeSpec?.value || '';
      if (!printerType && p.name.toLowerCase().includes('mini')) {
        printerType = 'Desktop / Compact';
      } else if (!printerType && (p.name.toLowerCase().includes('industrial') || p.name.toLowerCase().includes('brahma'))) {
        printerType = 'Industrial';
      } else if (!printerType) {
        printerType = 'Desktop';
      }

      // Extract Compatibility
      const compSpec = specs.find(s => ['compatibility', 'compatible printers', 'compatible with'].includes(s.name.toLowerCase()));
      let compatibility: string[] = [];
      if (compSpec && compSpec.value) {
        compatibility = compSpec.value.split(/[,/]/).map((c: string) => c.trim()).filter(Boolean);
      }
      const compKeywords = ['A1', 'P1S', 'X1C', 'K1', 'Ender', 'Neptune', 'Saturn', 'Mars'];
      for (const keyword of compKeywords) {
        if (p.name.toLowerCase().includes(keyword.toLowerCase())) {
          compatibility.push(keyword);
        }
      }

      // Calculate rating
      let avgRating = 4.9;
      if (p.reviews && p.reviews.length > 0) {
        const sum = p.reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
        avgRating = Math.round((sum / p.reviews.length) * 10) / 10;
      }

      // Stock status
      let stockStatus = 'IN_STOCK';
      if (p.stock === 0) {
        const checkStr = (p.name + ' ' + (p.description || '')).toLowerCase();
        if (checkStr.includes('pre-order') || checkStr.includes('preorder')) {
          stockStatus = 'PRE_ORDER';
        } else if (checkStr.includes('coming-soon') || checkStr.includes('coming soon')) {
          stockStatus = 'COMING_SOON';
        } else {
          stockStatus = 'OUT_OF_STOCK';
        }
      }

      // Active price
      const basePriceNum = parseFloat(p.basePrice?.toString() || '0');
      const salePriceNum = p.salePrice ? parseFloat(p.salePrice.toString()) : basePriceNum;
      const activePrice = salePriceNum;

      // Featured flags
      const isBestseller = p.isExclusive || p.name.toLowerCase().includes('combo') || p.stock > 100;
      const isTrending = p.isFeatured || p.stock < 10;
      const isNewArrival = new Date(p.createdAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000;
      const isOnSale = p.salePrice && parseFloat(p.salePrice.toString()) < parseFloat(p.basePrice.toString());

      let thumbnail = '';
      const imgs = safeParseArray(p.images);
      if (imgs.length > 0) {
        const primaryImg = imgs.find((img: any) => img?.isPrimary) || imgs[0];
        thumbnail = primaryImg?.url || (typeof primaryImg === 'string' ? primaryImg : '');
      }

      return {
        id: p.id,
        brandId: p.brandId,
        categoryId: p.categoryId,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: p.description,
        shortDescription: p.shortDescription,
        basePrice: basePriceNum,
        salePrice: p.salePrice ? parseFloat(p.salePrice.toString()) : null,
        dealerPrice: p.dealerPrice ? parseFloat(p.dealerPrice.toString()) : null,
        stock: p.stock,
        isActive: p.isActive,
        isExclusive: p.isExclusive,
        images: imgs.map(img => typeof img === 'string' ? { url: img } : img),
        specifications: specs,
        brand: p.brand,
        category: p.category,
        reviews: p.reviews,
        thumbnail,
        activePrice,
        colors,
        materials,
        technology,
        printerType,
        compatibility,
        avgRating,
        stockStatus,
        isFeatured: p.isFeatured,
        isBestseller,
        isTrending,
        isNewArrival,
        isOnSale
      };
    });

    // Helper to check if a category belongs to a parent (by ID or slug)
    const isCategoryChildOf = (cat: any, parentSlugOrId: string): boolean => {
      if (!cat) return false;
      if (cat.id === parentSlugOrId || cat.slug === parentSlugOrId) return true;
      if (cat.parentId) {
        const parent = allMapped.map(x => x.category).find(c => c && c.id === cat.parentId);
        return isCategoryChildOf(parent, parentSlugOrId);
      }
      return false;
    };

    // Filter products
    let filtered = allMapped;

    // Search query filter
    if (search) {
      const term = (search as string).toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.brand?.name || '').toLowerCase().includes(term) ||
        (p.category?.name || '').toLowerCase().includes(term) ||
        (p.sku || '').toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term)
      );
    }

    // Category / Subcategory filter
    if (category) {
      const catsArray = (category as string).split(',').map(s => s.trim()).filter(Boolean);
      filtered = filtered.filter(p => {
        return catsArray.some(cVal => isCategoryChildOf(p.category, cVal));
      });
    }

    if (subcategory) {
      const subcatsArray = (subcategory as string).split(',').map(s => s.trim()).filter(Boolean);
      filtered = filtered.filter(p => {
        return subcatsArray.some(sVal => p.categoryId === sVal || p.category?.slug === sVal);
      });
    }

    // Brand filter
    if (brand) {
      const brandsArray = (brand as string).split(',').map(s => s.toLowerCase().trim()).filter(Boolean);
      filtered = filtered.filter(p => {
        return brandsArray.includes((p.brand?.name || '').toLowerCase()) ||
               brandsArray.includes((p.brand?.slug || '').toLowerCase()) ||
               brandsArray.includes((p.brandId || '').toLowerCase());
      });
    }

    // Price filter
    const minP = priceMin ? parseFloat(priceMin as string) : null;
    const maxP = priceMax ? parseFloat(priceMax as string) : null;
    if (minP !== null) {
      filtered = filtered.filter(p => p.activePrice >= minP);
    }
    if (maxP !== null) {
      filtered = filtered.filter(p => p.activePrice <= maxP);
    }

    // Rating filter
    if (rating) {
      const minRating = parseFloat(rating as string);
      filtered = filtered.filter(p => p.avgRating >= minRating);
    }

    // Stock filter
    if (stock) {
      const stocksArray = (stock as string).split(',').map(s => s.toUpperCase().trim()).filter(Boolean);
      filtered = filtered.filter(p => stocksArray.includes(p.stockStatus));
    }

    // Featured flags filter
    if (featured) {
      const featuredArray = (featured as string).split(',').map(s => s.toLowerCase().trim()).filter(Boolean);
      filtered = filtered.filter(p => {
        return featuredArray.some(f => {
          if (f === 'featured') return p.isFeatured;
          if (f === 'bestseller') return p.isBestseller;
          if (f === 'trending') return p.isTrending;
          if (f === 'new_arrival') return p.isNewArrival;
          if (f === 'on_sale') return p.isOnSale;
          if (f === 'recommended') return p.isFeatured || p.isBestseller;
          return false;
        });
      });
    }

    // Color filter
    if (color) {
      const colorsArray = (color as string).split(',').map(s => s.toLowerCase().trim()).filter(Boolean);
      filtered = filtered.filter(p => {
        return p.colors.some(c => colorsArray.includes(c.toLowerCase()));
      });
    }

    // Material filter
    if (material) {
      const materialsArray = (material as string).split(',').map(s => s.toLowerCase().trim()).filter(Boolean);
      filtered = filtered.filter(p => {
        return p.materials.some(m => materialsArray.includes(m.toLowerCase()));
      });
    }

    // Technology filter
    if (technology) {
      const techArray = (technology as string).split(',').map(s => s.toLowerCase().trim()).filter(Boolean);
      filtered = filtered.filter(p => techArray.includes(p.technology.toLowerCase()));
    }

    // Printer Type filter
    if (printerType) {
      const typesArray = (printerType as string).split(',').map(s => s.toLowerCase().trim()).filter(Boolean);
      filtered = filtered.filter(p => typesArray.includes(p.printerType.toLowerCase()));
    }

    // Compatibility filter
    if (compatibility) {
      const compArray = (compatibility as string).split(',').map(s => s.toLowerCase().trim()).filter(Boolean);
      filtered = filtered.filter(p => {
        return p.compatibility.some(c => compArray.includes(c.toLowerCase()));
      });
    }

    // Aggregation lists compiled from allMapped (unfiltered by sidebar check selections, but filtered by search/category)
    let baseForAgg = allMapped;
    if (search) {
      const term = (search as string).toLowerCase().trim();
      baseForAgg = baseForAgg.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.brand?.name || '').toLowerCase().includes(term) ||
        (p.category?.name || '').toLowerCase().includes(term)
      );
    }
    if (category) {
      const catsArray = (category as string).split(',').map(s => s.trim()).filter(Boolean);
      baseForAgg = baseForAgg.filter(p => {
        return catsArray.some(cVal => isCategoryChildOf(p.category, cVal));
      });
    }

    // Aggregations
    const aggCategoriesMap: Record<string, { id: string; name: string; parentId: string | null; count: number }> = {};
    const aggBrandsMap: Record<string, { id: string; name: string; logo: string; count: number }> = {};
    const aggColorsMap: Record<string, number> = {};
    const aggMaterialsMap: Record<string, number> = {};
    const aggRatingsMap: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const aggStockMap: Record<string, number> = { IN_STOCK: 0, OUT_OF_STOCK: 0, PRE_ORDER: 0, COMING_SOON: 0 };
    const aggFeaturedMap: Record<string, number> = { featured: 0, bestseller: 0, trending: 0, new_arrival: 0, on_sale: 0, recommended: 0 };
    const aggTechMap: Record<string, number> = {};
    const aggPrinterTypeMap: Record<string, number> = {};
    const aggCompatibilityMap: Record<string, number> = {};

    baseForAgg.forEach(p => {
      // Categories
      if (p.category) {
        const cat = p.category;
        if (!aggCategoriesMap[cat.id]) {
          aggCategoriesMap[cat.id] = { id: cat.id, name: cat.name, parentId: cat.parentId, count: 0 };
        }
        aggCategoriesMap[cat.id].count++;
      }

      // Brands
      if (p.brand) {
        const b = p.brand;
        if (!aggBrandsMap[b.id]) {
          aggBrandsMap[b.id] = { id: b.id, name: b.name, logo: b.logo || '', count: 0 };
        }
        aggBrandsMap[b.id].count++;
      }

      // Colors
      p.colors.forEach(c => {
        aggColorsMap[c] = (aggColorsMap[c] || 0) + 1;
      });

      // Materials
      p.materials.forEach(m => {
        aggMaterialsMap[m] = (aggMaterialsMap[m] || 0) + 1;
      });

      // Ratings
      for (let i = 1; i <= 5; i++) {
        if (p.avgRating >= i) {
          aggRatingsMap[i]++;
        }
      }

      // Stock
      aggStockMap[p.stockStatus]++;

      // Featured
      if (p.isFeatured) aggFeaturedMap.featured++;
      if (p.isBestseller) aggFeaturedMap.bestseller++;
      if (p.isTrending) aggFeaturedMap.trending++;
      if (p.isNewArrival) aggFeaturedMap.new_arrival++;
      if (p.isOnSale) aggFeaturedMap.on_sale++;
      if (p.isFeatured || p.isBestseller) aggFeaturedMap.recommended++;

      // Tech
      aggTechMap[p.technology] = (aggTechMap[p.technology] || 0) + 1;

      // Printer Type
      aggPrinterTypeMap[p.printerType] = (aggPrinterTypeMap[p.printerType] || 0) + 1;

      // Compatibility
      p.compatibility.forEach(c => {
        aggCompatibilityMap[c] = (aggCompatibilityMap[c] || 0) + 1;
      });
    });

    // Sorting
    if (sort === 'newest') {
      filtered.sort((a, b) => b.id.localeCompare(a.id));
    } else if (sort === 'price-asc') {
      filtered.sort((a, b) => a.activePrice - b.activePrice);
    } else if (sort === 'price-desc') {
      filtered.sort((a, b) => b.activePrice - a.activePrice);
    } else if (sort === 'rating-desc') {
      filtered.sort((a, b) => b.avgRating - a.avgRating);
    } else if (sort === 'name-asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'bestselling' || sort === 'popularity') {
      filtered.sort((a, b) => (b.reviews?.length || 0) - (a.reviews?.length || 0));
    }

    // Paging
    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limitNum);

    const finalResponse = {
      products: paginated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      availableFilters: {
        categories: Object.values(aggCategoriesMap),
        brands: Object.values(aggBrandsMap),
        colors: Object.entries(aggColorsMap).map(([name, count]) => ({ name, count })),
        materials: Object.entries(aggMaterialsMap).map(([name, count]) => ({ name, count })),
        ratings: Object.entries(aggRatingsMap).map(([rating, count]) => ({ rating: parseInt(rating), count })),
        stock: Object.entries(aggStockMap).map(([status, count]) => ({ status, count })),
        featured: Object.entries(aggFeaturedMap).map(([type, count]) => ({ type, count })),
        technologies: Object.entries(aggTechMap).map(([name, count]) => ({ name, count })),
        printerTypes: Object.entries(aggPrinterTypeMap).map(([name, count]) => ({ name, count })),
        compatibilities: Object.entries(aggCompatibilityMap).map(([name, count]) => ({ name, count }))
      }
    };

    sysCache.set(cacheKey, finalResponse, 300);
    return res.status(200).json(finalResponse);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to find products in catalog', details: error.message });
  }
};

const populateProductRelations = async (item: any) => {
  const bundleList = safeParseArray(item.bundleProducts);
  const bundleIds = bundleList.map((x: any) => typeof x === 'string' ? x : (x?.id || x?.productId)).filter(Boolean);
  
  const filamentList = safeParseArray(item.recommendedFilaments);
  const filamentIds = filamentList.map((x: any) => typeof x === 'string' ? x : (x?.id || x?.productId)).filter(Boolean);
  
  const relatedList = safeParseArray(item.relatedProducts);
  const relatedIds = relatedList.map((x: any) => typeof x === 'string' ? x : (x?.id || x?.productId || x?.relatedToId)).filter(Boolean);

  const [bundleProducts, recommendedFilaments, relatedProducts] = await Promise.all([
    bundleIds.length > 0 ? prisma.product.findMany({ where: { id: { in: bundleIds }, deletedAt: null } }) : Promise.resolve([]),
    filamentIds.length > 0 ? prisma.product.findMany({ where: { id: { in: filamentIds }, deletedAt: null } }) : Promise.resolve([]),
    relatedIds.length > 0 ? prisma.product.findMany({ where: { id: { in: relatedIds }, deletedAt: null } }) : Promise.resolve([])
  ]);

  return {
    bundleProducts,
    recommendedFilaments,
    relatedProducts
  };
};

export const getProductBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  try {
    const cacheKey = 'products_slug_' + slug;
    const cachedResponse = sysCache.get(cacheKey);
    if (cachedResponse) {
      return res.status(200).json(cachedResponse);
    }

    const item = await prisma.product.findUnique({
      where: { slug },
      include: {
        variants: true,
        category: true,
        brand: true,
        reviews: {
          include: { user: true },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const relations = await populateProductRelations(item);

    if (relations.relatedProducts.length === 0 && item.categoryId) {
      relations.relatedProducts = await prisma.product.findMany({
        where: {
          categoryId: item.categoryId,
          id: { not: item.id },
          deletedAt: null,
          isActive: true,
        },
        take: 8,
        include: { brand: true, category: true },
      });
    }

    const masterData = {
      images: safeParseArray(item.images),
      specifications: safeParseArray(item.specifications),
      downloads: safeParseArray(item.downloads),
      features: safeParseArray(item.features),
      faqs: safeParseArray(item.faqs),
      seo: safeParseObject(item.seo) || {},
      shipping: safeParseObject(item.shipping) || {},
      warranty: safeParseObject(item.warranty) || {},
      relatedProducts: relations.relatedProducts
    };

    const catPath = await getCategoryPath(item.categoryId);
    const finalResponse = {
      categoryPath: catPath,
      variantImages: (item.variants || []).map((v: any) => ({
        variantId: v.id,
        imageIds: safeParseArray(v.variantImages || v.images || [])
      })),
      product: {
        ...item,
        categoryPath: catPath,
        bundleProducts: relations.bundleProducts,
        recommendedFilaments: relations.recommendedFilaments,
        relatedProducts: relations.relatedProducts
      },
      pricing: {
        price: item.basePrice,
        salePrice: item.salePrice,
        dealerPrice: item.dealerPrice,
        tax: 18
      },
      inventory: {
        stock: item.stock,
        lowStock: 10,
        backorder: false
      },
      options: safeParseArray(item.options),
      variants: (item.variants || []).map((v: any) => ({
        ...v,
        images: safeParseArray(v.variantImages || v.images || [])
      })),
      reviews: item.reviews || [],
      // Keep backward compatibility lists
      images: masterData.images,
      specifications: masterData.specifications,
      downloads: masterData.downloads,
      features: masterData.features,
      faqs: masterData.faqs,
      warranty: masterData.warranty,
      shipping: masterData.shipping,
      seo: masterData.seo,
      relatedProducts: relations.relatedProducts,
      bundleProducts: relations.bundleProducts,
      complimentaryProducts: relations.bundleProducts,
      recommendedFilaments: relations.recommendedFilaments,
      assets: safeParseArray(item.attributes),
      masterData
    };

    sysCache.set(cacheKey, finalResponse, 300);
    return res.status(200).json(finalResponse);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch product', details: error.message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const cacheKey = 'products_id_' + id + '_' + (req.originalUrl.includes('/details') ? 'admin' : 'cust');
    const cachedResponse = sysCache.get(cacheKey);
    if (cachedResponse) {
      return res.status(200).json(cachedResponse);
    }

    const item = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        category: true,
        brand: true,
        reviews: {
          include: { user: true },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Product does not exist' });
    }

    const relations = await populateProductRelations(item);

    const masterData = {
      images: safeParseArray(item.images),
      specifications: safeParseArray(item.specifications),
      downloads: safeParseArray(item.downloads),
      features: safeParseArray(item.features),
      faqs: safeParseArray(item.faqs),
      seo: safeParseObject(item.seo) || {},
      shipping: safeParseObject(item.shipping) || {},
      warranty: safeParseObject(item.warranty) || {},
      relatedProducts: relations.relatedProducts
    };

    const catPath = await getCategoryPath(item.categoryId);
    const finalResponse = {
      categoryPath: catPath,
      variantImages: (item.variants || []).map((v: any) => ({
        variantId: v.id,
        imageIds: safeParseArray(v.variantImages || v.images || [])
      })),
      product: {
        ...item,
        categoryPath: catPath,
        bundleProducts: relations.bundleProducts,
        recommendedFilaments: relations.recommendedFilaments,
        relatedProducts: relations.relatedProducts
      },
      pricing: {
        price: item.basePrice,
        salePrice: item.salePrice,
        dealerPrice: item.dealerPrice,
        tax: 18
      },
      inventory: {
        stock: item.stock,
        lowStock: 10,
        backorder: false
      },
      options: safeParseArray(item.options),
      variants: (item.variants || []).map((v: any) => ({
        ...v,
        images: safeParseArray(v.variantImages || v.images || [])
      })),
      reviews: item.reviews || [],
      // Keep backward compatibility lists
      images: masterData.images,
      specifications: masterData.specifications,
      downloads: masterData.downloads,
      features: masterData.features,
      faqs: masterData.faqs,
      warranty: masterData.warranty,
      shipping: masterData.shipping,
      seo: masterData.seo,
      relatedProducts: relations.relatedProducts,
      bundleProducts: relations.bundleProducts,
      complimentaryProducts: relations.bundleProducts,
      recommendedFilaments: relations.recommendedFilaments,
      assets: safeParseArray(item.attributes),
      masterData
    };

    sysCache.set(cacheKey, finalResponse, 300);
    return res.status(200).json(finalResponse);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to read individual product', details: error.message });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const {
    name, slug, sku, description, short_description, mrp, price, salePrice, dealerPrice, sale_price, dealer_price, stock,
    categoryId, brandId, seoTitle, seoDescription, seoKeywords,
    variants, options, images, specifications, downloads, features, faqs, warranty, shipping, relatedProducts, included_items, attributes,
    isFeatured, featured, codAvailable, baseShippingCharge, estimatedDeliveryDays, freeShippingEligible, bundleProducts, recommendedFilaments,
    status
  } = req.body;

  if (!name || !slug || !sku) {
    return res.status(400).json({ error: 'Missing core mandatory parameters' });
  }

  try {
    const resolvedSalePrice = salePrice !== undefined ? salePrice : sale_price;
    const resolvedDealerPrice = dealerPrice !== undefined ? dealerPrice : dealer_price;

    const parsedImages = safeParseArray(images).map((img: any) => {
      if (!img) return null;
      if (typeof img === 'string') {
        return { url: img, isPrimary: false, sortOrder: 0 };
      }
      return {
        url: img.url || img.imageUrl || '',
        isPrimary: !!img.isPrimary,
        sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : 0
      };
    }).filter((img: any) => img && img.url.trim().length > 0);

    const parsedSpecs = safeParseArray(specifications).filter((s: any) => s?.name && s?.value);
    const parsedDownloads = safeParseArray(downloads).filter((d: any) => d?.title || d?.name);
    const parsedFeatures = safeParseArray(features);
    const parsedFaqs = safeParseArray(faqs).filter((f: any) => f?.question && f?.answer);
    const parsedVariants = safeParseArray(variants).filter((v: any) => v?.name && v?.sku);
    const parsedOptions = safeParseArray(options);
    const parsedAttributes = safeParseArray(attributes);
    const parsedWarranty = safeParseObject(warranty);
    const parsedShipping = safeParseObject(shipping);
    const parsedRelatedProducts = safeParseArray(relatedProducts);
    const parsedIncludedItems = safeParseArray(included_items);
    const parsedBundleProducts = safeParseArray(bundleProducts);
    const parsedRecommendedFilaments = safeParseArray(recommendedFilaments);

    let resolvedCategoryId = categoryId || null;
    let resolvedBrandId = brandId || null;

    if (resolvedCategoryId && !resolvedCategoryId.includes('-')) {
      const cat = await prisma.category.findFirst({ where: { OR: [{ slug: resolvedCategoryId }, { name: resolvedCategoryId }] } });
      if (cat) resolvedCategoryId = cat.id;
      else resolvedCategoryId = null;
    }

    if (resolvedBrandId && !resolvedBrandId.includes('-')) {
      const br = await prisma.brand.findFirst({ where: { OR: [{ slug: resolvedBrandId }, { name: resolvedBrandId }] } });
      if (br) resolvedBrandId = br.id;
      else resolvedBrandId = null;
    }

    const created = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name,
          slug,
          sku,
          description: description || null,
          shortDescription: short_description || null,
          basePrice: parseFloat(mrp) || parseFloat(price) || 0,
          salePrice: resolvedSalePrice !== undefined && resolvedSalePrice !== null ? parseFloat(resolvedSalePrice) : null,
          dealerPrice: resolvedDealerPrice !== undefined && resolvedDealerPrice !== null ? parseFloat(resolvedDealerPrice) : null,
          stock: parseInt(stock, 10) || 0,
          categoryId: resolvedCategoryId || null,
          brandId: resolvedBrandId || null,
          isActive: status !== undefined ? status === 'active' : true,
          isFeatured: isFeatured !== undefined ? !!isFeatured : (featured !== undefined ? !!featured : false),
          codAvailable: codAvailable !== undefined ? !!codAvailable : true,
          baseShippingCharge: baseShippingCharge !== undefined ? parseFloat(baseShippingCharge) : 0,
          estimatedDeliveryDays: estimatedDeliveryDays !== undefined ? parseInt(estimatedDeliveryDays, 10) : 3,
          freeShippingEligible: freeShippingEligible !== undefined ? !!freeShippingEligible : true,
          bundleProducts: parsedBundleProducts || [],
          recommendedFilaments: parsedRecommendedFilaments || [],

          // Store inside JSON fields
          images: parsedImages,
          specifications: parsedSpecs,
          downloads: parsedDownloads,
          features: parsedFeatures,
          faqs: parsedFaqs,
          seo: {
            title: seoTitle || null,
            description: seoDescription || null,
            keywords: seoKeywords || []
          },
          shipping: parsedShipping || {},
          warranty: parsedWarranty || {},
          relatedProducts: parsedRelatedProducts || [],
          includedItems: parsedIncludedItems || [],
          attributes: parsedAttributes || [],
          options: parsedOptions || []
        }
      });

      if (parsedVariants.length > 0) {
        for (const v of parsedVariants) {
          const optVals: Record<string, string> = {};
          if (v.optionsData && Array.isArray(v.optionsData)) {
            v.optionsData.forEach((od: any) => {
              optVals[od.optionName] = od.valueStr;
            });
          } else if (v.optionValues || v.option_values) {
            Object.assign(optVals, v.optionValues || v.option_values);
          }

          const variantImagesList: string[] = [];
          if (v.images && Array.isArray(v.images)) {
            v.images.forEach((img: any) => {
              if (typeof img === 'string') {
                variantImagesList.push(img);
              } else {
                variantImagesList.push(img.url || img.imageUrl || '');
              }
            });
          } else if (v.variantImages || v.variant_images) {
            variantImagesList.push(...(v.variantImages || v.variant_images));
          }

          await tx.productVariant.create({
            data: {
              productId: p.id,
              name: v.name,
              sku: v.sku,
              price: parseFloat(v.price) || 0,
              salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
              stock: parseInt(v.stock, 10) || 0,
              weight: parseFloat(v.weight) || 0,
              variantImages: variantImagesList,
              optionValues: optVals
            }
          });
        }
      }

      return tx.product.findUnique({
        where: { id: p.id },
        include: {
          variants: true,
          category: true,
          brand: true,
          reviews: {
            include: { user: true }
          }
        }
      });
    });

    // Dispatch automatic push notification if configured
    try {
      const settings = await getSettingsService();
      if (settings) {
        const pushConfig = settings.pushNotificationSettings || {};
        if (pushConfig.autoNotifyNewProduct) {
          let title = pushConfig.notifyTitleTemplate || "New Product Alert: {product_name}";
          title = title.replace(/{product_name}/g, created?.name || name);

          let body = pushConfig.notifyBodyTemplate || "We just added {product_name} to our catalog for only ₹{price}! Get it now.";
          body = body.replace(/{product_name}/g, created?.name || name)
                     .replace(/{price}/g, String(price || mrp || '0'))
                     .replace(/{sku}/g, created?.sku || sku || '');

          if (pushConfig.autoGenerateMarketingContent) {
            // Automatic generation of premium marketing copy
            body = `🔥 New Launch: The premium ${created?.name || name} is now live in our catalog! Special price: ₹${price || mrp || '0'}. Order yours today!`;
          }

          const imagesList = safeParseArray(created?.images);
          const image = imagesList.length > 0 ? imagesList[0] : undefined;

          // Send notification to all active devices/users
          await sendPushNotificationInternal({
            targetType: 'all',
            title,
            body,
            image,
            actionUrl: `/products/${created?.slug || slug}`,
            type: 'New Product'
          });
        }
      }
    } catch (pushErr: any) {
      console.error('Failed to auto-send new product notification:', pushErr);
    }

    clearProductCache();
    return res.status(201).json({ success: true, message: 'Success', data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to record Product', message: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name, slug, sku, description, short_description, mrp, price, salePrice, dealerPrice, sale_price, dealer_price, stock,
    categoryId, brandId, seoTitle, seoDescription, seoKeywords,
    variants, options, images, specifications, downloads, features, faqs, warranty, shipping, relatedProducts, included_items, attributes,
    isFeatured, featured, codAvailable, baseShippingCharge, estimatedDeliveryDays, freeShippingEligible, bundleProducts, recommendedFilaments,
    status
  } = req.body;

  try {
    const resolvedSalePrice = salePrice !== undefined ? salePrice : sale_price;
    const resolvedDealerPrice = dealerPrice !== undefined ? dealerPrice : dealer_price;

    const parsedImages = safeParseArray(images).map((img: any) => {
      if (!img) return null;
      if (typeof img === 'string') {
        return { url: img, isPrimary: false, sortOrder: 0 };
      }
      return {
        url: img.url || img.imageUrl || '',
        isPrimary: !!img.isPrimary,
        sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : 0
      };
    }).filter((img: any) => img && img.url.trim().length > 0);

    const parsedSpecs = safeParseArray(specifications).filter((s: any) => s?.name && s?.value);
    const parsedDownloads = safeParseArray(downloads).filter((d: any) => d?.title || d?.name);
    const parsedFeatures = safeParseArray(features);
    const parsedFaqs = safeParseArray(faqs).filter((f: any) => f?.question && f?.answer);
    const parsedVariants = safeParseArray(variants).filter((v: any) => v?.name && v?.sku);
    const parsedOptions = safeParseArray(options);
    const parsedAttributes = safeParseArray(attributes);
    const parsedWarranty = safeParseObject(warranty);
    const parsedShipping = safeParseObject(shipping);
    const parsedRelatedProducts = safeParseArray(relatedProducts);
    const parsedIncludedItems = safeParseArray(included_items);
    const parsedBundleProducts = safeParseArray(bundleProducts);
    const parsedRecommendedFilaments = safeParseArray(recommendedFilaments);

    let resolvedCategoryId = categoryId || undefined;
    let resolvedBrandId = brandId || undefined;

    if (resolvedCategoryId && !resolvedCategoryId.includes('-')) {
      const cat = await prisma.category.findFirst({ where: { OR: [{ slug: resolvedCategoryId }, { name: resolvedCategoryId }] } });
      if (cat) resolvedCategoryId = cat.id;
      else resolvedCategoryId = undefined;
    }

    if (resolvedBrandId && !resolvedBrandId.includes('-')) {
      const br = await prisma.brand.findFirst({ where: { OR: [{ slug: resolvedBrandId }, { name: resolvedBrandId }] } });
      if (br) resolvedBrandId = br.id;
      else resolvedBrandId = undefined;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Clear previously set variants to prevent duplication/orphans
      await tx.productVariant.deleteMany({ where: { productId: id } });

      const p = await tx.product.update({
        where: { id },
        data: {
          name,
          slug,
          sku,
          description: description !== undefined ? description : undefined,
          shortDescription: short_description !== undefined ? short_description : undefined,
          basePrice: mrp ? parseFloat(mrp) : (price ? parseFloat(price) : undefined),
          salePrice: resolvedSalePrice !== undefined && resolvedSalePrice !== null ? parseFloat(resolvedSalePrice) : undefined,
          dealerPrice: resolvedDealerPrice !== undefined && resolvedDealerPrice !== null ? parseFloat(resolvedDealerPrice) : undefined,
          stock: stock !== undefined ? parseInt(stock, 10) : undefined,
          categoryId: resolvedCategoryId !== undefined ? resolvedCategoryId : undefined,
          brandId: resolvedBrandId !== undefined ? resolvedBrandId : undefined,
          isActive: status !== undefined ? status === 'active' : undefined,
          isFeatured: isFeatured !== undefined ? !!isFeatured : (featured !== undefined ? !!featured : undefined),
          codAvailable: codAvailable !== undefined ? !!codAvailable : undefined,
          baseShippingCharge: baseShippingCharge !== undefined ? parseFloat(baseShippingCharge) : undefined,
          estimatedDeliveryDays: estimatedDeliveryDays !== undefined ? parseInt(estimatedDeliveryDays, 10) : undefined,
          freeShippingEligible: freeShippingEligible !== undefined ? !!freeShippingEligible : undefined,
          bundleProducts: parsedBundleProducts !== undefined ? parsedBundleProducts : undefined,
          recommendedFilaments: parsedRecommendedFilaments !== undefined ? parsedRecommendedFilaments : undefined,

          // Store inside JSON fields
          images: parsedImages,
          specifications: parsedSpecs,
          downloads: parsedDownloads,
          features: parsedFeatures,
          faqs: parsedFaqs,
          seo: {
            title: seoTitle || null,
            description: seoDescription || null,
            keywords: seoKeywords || []
          },
          shipping: parsedShipping || {},
          warranty: parsedWarranty || {},
          relatedProducts: parsedRelatedProducts || [],
          includedItems: parsedIncludedItems || [],
          attributes: parsedAttributes || [],
          options: parsedOptions || []
        }
      });

      if (parsedVariants.length > 0) {
        for (const v of parsedVariants) {
          const optVals: Record<string, string> = {};
          if (v.optionsData && Array.isArray(v.optionsData)) {
            v.optionsData.forEach((od: any) => {
              optVals[od.optionName] = od.valueStr;
            });
          } else if (v.optionValues || v.option_values) {
            Object.assign(optVals, v.optionValues || v.option_values);
          }

          const variantImagesList: string[] = [];
          if (v.images && Array.isArray(v.images)) {
            v.images.forEach((img: any) => {
              if (typeof img === 'string') {
                variantImagesList.push(img);
              } else {
                variantImagesList.push(img.url || img.imageUrl || '');
              }
            });
          } else if (v.variantImages || v.variant_images) {
            variantImagesList.push(...(v.variantImages || v.variant_images));
          }

          await tx.productVariant.create({
            data: {
              productId: p.id,
              name: v.name,
              sku: v.sku,
              price: parseFloat(v.price) || 0,
              salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
              stock: parseInt(v.stock, 10) || 0,
              weight: parseFloat(v.weight) || 0,
              variantImages: variantImagesList,
              optionValues: optVals
            }
          });
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          variants: true,
          category: true,
          brand: true,
          reviews: {
            include: { user: true }
          }
        }
      });
    });

    clearProductCache();
    return res.status(200).json({ success: true, message: 'Success', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to record Product', message: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { mode = 'hard' } = req.query;

  try {
    if (mode === 'soft') {
      const softDeleted = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      clearProductCache();
      return res.status(200).json({ message: 'Soft deleted', data: softDeleted });
    }

    await prisma.product.delete({ where: { id } });
    clearProductCache();
    return res.status(200).json({ message: 'Product SKU permanently deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: 'SKU deletion command failed', details: error.message });
  }
};
