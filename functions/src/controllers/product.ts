import { Request, Response } from 'express';
import prisma from '../config/database';
import { sysCache } from '../config/cache';
import { sendPushNotificationInternal } from './notification';
import { clearCache } from '../middleware/cache';
import { getSettingsService } from '../modules/settings/settings.service';
import { encodeDays } from '../utils/delivery';

let pendingMappedProductsPromise: Promise<any[]> | null = null;
let pendingCategoriesPromise: Promise<any[]> | null = null;

export const clearProductCache = () => {
  pendingMappedProductsPromise = null;
  pendingCategoriesPromise = null;
  sysCache.del('all_mapped_products');
  sysCache.del('all_db_categories');
  sysCache.clearPattern('category_path_');
  sysCache.clearPattern('products_list_');
  sysCache.clearPattern('products_slug_');
  sysCache.clearPattern('products_id_');
  sysCache.del('consolidated_home_payload');
  sysCache.del('featured_products_payload');
  sysCache.del('header_menu_data');
  clearCache(); // Flushes route cache for /api/home and other routes
};
clearProductCache();

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const resolveBrandId = async (input: any): Promise<string | null | undefined> => {
  if (input === undefined) return undefined;
  if (input === null || input === '' || input === 'null' || input === 'undefined') return null;

  let val: string = '';
  if (typeof input === 'object') {
    val = String(input.id || input.slug || input.name || '').trim();
  } else {
    val = String(input).trim();
  }
  if (!val) return null;

  const validUuid = isUuid(val);
  if (validUuid) {
    const exists = await prisma.brand.findUnique({ where: { id: val } });
    if (exists) return exists.id;
  }

  const br = await prisma.brand.findFirst({
    where: {
      OR: [
        ...(validUuid ? [{ id: val }] : []),
        { slug: val },
        { name: { equals: val, mode: 'insensitive' } }
      ]
    }
  });
  return br ? br.id : null;
};

export const resolveCategoryId = async (input: any): Promise<string | null | undefined> => {
  if (input === undefined) return undefined;
  if (input === null || input === '' || input === 'null' || input === 'undefined') return null;

  let val: string = '';
  if (typeof input === 'object') {
    val = String(input.id || input.slug || input.name || '').trim();
  } else {
    val = String(input).trim();
  }
  if (!val) return null;

  const validUuid = isUuid(val);
  if (validUuid) {
    const exists = await prisma.category.findUnique({ where: { id: val } });
    if (exists) return exists.id;
  }

  const cat = await prisma.category.findFirst({
    where: {
      OR: [
        ...(validUuid ? [{ id: val }] : []),
        { slug: val },
        { name: { equals: val, mode: 'insensitive' } }
      ]
    }
  });
  return cat ? cat.id : null;
};

export const resolveCategoryIds = async (body: any): Promise<Array<{ id: string; isPrimary: boolean }>> => {
  let items: any[] = [];
  if (Array.isArray(body.categoryIds)) {
    items = body.categoryIds;
  } else if (Array.isArray(body.categories)) {
    items = body.categories;
  } else if (body.categoryId || body.category_id || body.category) {
    items = [body.categoryId || body.category_id || body.category];
  }

  const result: Array<{ id: string; isPrimary: boolean }> = [];
  const seen = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    const catId = await resolveCategoryId(raw);
    if (catId && !seen.has(catId)) {
      seen.add(catId);
      const isPrimary = typeof raw === 'object' && raw !== null && 'isPrimary' in raw ? !!raw.isPrimary : i === 0;
      result.push({ id: catId, isPrimary });
    }
  }

  if (result.length > 0 && !result.some(r => r.isPrimary)) {
    result[0].isPrimary = true;
  }

  return result;
};

export async function getAllMappedProductsCached(): Promise<any[]> {
  const cached = sysCache.get('all_mapped_products') as any[];
  if (cached && cached.length > 0) {
    return cached;
  }

  if (pendingMappedProductsPromise) {
    return pendingMappedProductsPromise;
  }

  pendingMappedProductsPromise = (async () => {
    try {
      const [items, allCustomerReviews] = await Promise.all([
        prisma.product.findMany({
          where: { deletedAt: null, isActive: true },
          include: {
            brand: true,
            category: true,
            productCategories: {
              include: { category: true }
            },
            variants: {
              where: { isActive: true }
            },
            reviews: {
              include: { user: true }
            },
          }
        }),
        prisma.customerReview.findMany({
          include: {
            customer: {
              include: { user: true }
            }
          }
        })
      ]);

      const customerReviewsByProduct = new Map<string, any[]>();
      for (const cr of allCustomerReviews) {
        if (!customerReviewsByProduct.has(cr.productId)) {
          customerReviewsByProduct.set(cr.productId, []);
        }
        customerReviewsByProduct.get(cr.productId)!.push(cr);
      }

      const getSpecsArray = (specsJson: any): any[] => {
        if (!specsJson) return [];
        if (Array.isArray(specsJson)) return specsJson;
        if (specsJson && typeof specsJson === 'object' && Array.isArray((specsJson as any).create)) {
          return (specsJson as any).create;
        }
        return [];
      };

      const allMapped = items.map(p => {
        const specs = getSpecsArray(p.specifications);
        const prodCustReviews = customerReviewsByProduct.get(p.id) || [];
        const combinedRawReviews = [...(p.reviews || []), ...prodCustReviews];

        const mappedReviews = combinedRawReviews.map((review: any) => {
          const user = review.user || review.customer?.user;
          let parsedTitle = "Verified Review";
          let parsedComment = review.reviewText || "";
          let parsedImages: string[] = [];
          let parsedRecommended = true;
          let status = "APPROVED";

          if (review.reviewText && review.reviewText.trim().startsWith("{")) {
            try {
              const parsed = JSON.parse(review.reviewText);
              parsedTitle = parsed.title || parsedTitle;
              parsedComment = parsed.comment || parsed.review || parsedComment;
              parsedImages = Array.isArray(parsed.images) ? parsed.images : [];
              if (typeof parsed.recommended === "boolean") {
                parsedRecommended = parsed.recommended;
              }
              if (parsed.status) status = parsed.status;
            } catch (e) {}
          }

          return {
            id: review.id,
            productId: review.productId,
            userName: user
              ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
              : "Customer",
            rating: Number(review.rating || 5),
            title: parsedTitle,
            comment: parsedComment,
            date: review.createdAt ? new Date(review.createdAt).toISOString() : new Date().toISOString(),
            verified: true,
            images: parsedImages,
            recommended: parsedRecommended,
            status,
            helpfulCount: 0,
            sellerReply: null,
          };
        }).filter(r => (r.status || '').toUpperCase() === 'APPROVED');

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

        // Calculate rating strictly from real approved reviews
        let avgRating = 0;
        let ratingCount = 0;
        if (p.reviews && p.reviews.length > 0) {
          const approved = p.reviews.filter((r: any) => r.isApproved !== false);
          if (approved.length > 0) {
            const sum = approved.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
            avgRating = Math.round((sum / approved.length) * 10) / 10;
            ratingCount = approved.length;
          }
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

        // Extract Categories & Primary Category
        const rawPCS = (p as any).productCategories || [];
        let categoriesList: any[] = rawPCS.map((pc: any) => ({
          id: pc.category?.id || pc.categoryId,
          name: pc.category?.name || '',
          slug: pc.category?.slug || '',
          image: pc.category?.image || null,
          isPrimary: !!pc.isPrimary,
          sortOrder: pc.sortOrder || 0
        })).filter((c: any) => c.id);

        if (categoriesList.length === 0 && p.category) {
          categoriesList = [{
            id: p.category.id,
            name: p.category.name,
            slug: p.category.slug,
            image: p.category.image || null,
            isPrimary: true,
            sortOrder: 0
          }];
        }

        const primaryCategory = categoriesList.find((c: any) => c.isPrimary) || categoriesList[0] || p.category || null;
        const primaryCategoryId = primaryCategory?.id || p.categoryId || null;

        return mapProductFields({
          id: p.id,
          brandId: p.brandId,
          categoryId: primaryCategoryId,
          categories: categoriesList,
          primaryCategory,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          description: p.description,
          shortDescription: p.shortDescription,
          basePrice: basePriceNum,
          salePrice: p.salePrice ? parseFloat(p.salePrice.toString()) : null,
          dealerPrice: p.dealerPrice ? parseFloat(p.dealerPrice.toString()) : null,
          stock: p.stock,
          weightInGrams: p.weightInGrams !== undefined && p.weightInGrams !== null ? parseFloat(p.weightInGrams.toString()) : 0,
          weightUnit: p.weightUnit || 'g',
          isActive: p.isActive,
          isExclusive: p.isExclusive,
          codAvailable: p.codAvailable,
          isCodAvailable: p.codAvailable !== false,
          images: p.images,
          specifications: specs,
          brand: p.brand,
          category: primaryCategory || p.category,
          variants: p.variants,
          hasVariants: p.variants && p.variants.length > 0,
          reviews: mappedReviews,
          activePrice,
          colors,
          materials,
          technology,
          printerType,
          compatibility,
          avgRating,
          ratingCount,
          stockStatus,
          isFeatured: p.isFeatured,
          isBestseller,
          isTrending,
          isNewArrival,
          isOnSale
        });
      });

      sysCache.set('all_mapped_products', allMapped, 1800); // 30 minutes cache
      return allMapped;
    } catch (err: any) {
      console.warn('[PRODUCT_CACHE_WARN] Database query error, returning stale/empty cache:', err?.message || err);
      const stale = sysCache.get('all_mapped_products') as any[];
      return stale || [];
    } finally {
      pendingMappedProductsPromise = null;
    }
  })();

  return pendingMappedProductsPromise;
}

export async function getAllDbCategoriesCached(): Promise<any[]> {
  const cached = sysCache.get('all_db_categories') as any[];
  if (cached && cached.length > 0) {
    return cached;
  }

  if (pendingCategoriesPromise) {
    return pendingCategoriesPromise;
  }

  pendingCategoriesPromise = (async () => {
    try {
      const cats = await prisma.category.findMany({
        where: { isActive: true, deletedAt: null }
      });
      sysCache.set('all_db_categories', cats, 1800);
      return cats;
    } catch (err: any) {
      console.warn('[CATEGORY_CACHE_WARN] Database query error, returning stale/empty cache:', err?.message || err);
      const stale = sysCache.get('all_db_categories') as any[];
      return stale || [];
    } finally {
      pendingCategoriesPromise = null;
    }
  })();

  return pendingCategoriesPromise;
}

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

export const mapProductFields = (p: any): any => {
  if (!p) return p;

  const imgs = safeParseArray(p.images).map((img: any) => {
    if (!img) return null;
    if (typeof img === 'string') {
      return { url: img, isPrimary: false, isSecondary: false, sortOrder: 0 };
    }
    return {
      url: img.url || img.imageUrl || '',
      isPrimary: !!img.isPrimary,
      isSecondary: !!img.isSecondary,
      sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : 0
    };
  }).filter((img: any) => img && img.url.trim().length > 0);

  // Calculate product primary and secondary images
  let primaryImage = '';
  let secondaryImage = '';

  const primaryObj = imgs.find((img: any) => img.isPrimary) || imgs[0];
  primaryImage = primaryObj?.url || '';

  // Secondary Image: isSecondary flag, or first image that is not the primary image, fallback to primary image
  const secondaryObj = imgs.find((img: any) => img.isSecondary) || imgs.find((img: any) => img.url !== primaryImage) || imgs[0];
  secondaryImage = secondaryObj?.url || primaryImage;

  const galleryImages = imgs.map((img: any) => img.url).filter(Boolean);

  // Map variants if they exist
  let mappedVariants = p.variants;
  let variantImages: string[] = [];
  let variantSecondaryImages: string[] = [];

  if (p.variants && Array.isArray(p.variants)) {
    mappedVariants = p.variants.map((v: any) => {
      const vImgs = safeParseArray(v.variantImages || v.images || []).map((img: any) => {
        if (!img) return null;
        if (typeof img === 'string') {
          return { url: img, isPrimary: false, isSecondary: false, sortOrder: 0 };
        }
        return {
          url: img.url || img.imageUrl || '',
          isPrimary: !!img.isPrimary,
          isSecondary: !!img.isSecondary,
          sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : 0
        };
      }).filter((img: any) => img && img.url.trim().length > 0);

      let vPrimary = '';
      let vSecondary = '';

      const vPrimaryObj = vImgs.find((img: any) => img.isPrimary) || vImgs[0];
      // Priority for variant: Selected Variant Primary Image -> Selected Variant Secondary Image -> Product Primary
      vPrimary = vPrimaryObj?.url || primaryImage;

      const vSecondaryObj = vImgs.find((img: any) => img.isSecondary) || vImgs.find((img: any) => img.url !== vPrimary) || vImgs[0];
      // Priority: Variant Secondary -> Variant Primary -> Product Secondary -> Product Primary
      vSecondary = vSecondaryObj?.url || vPrimary || secondaryImage;

      if (vPrimary) variantImages.push(vPrimary);
      if (vSecondary) variantSecondaryImages.push(vSecondary);

      return {
        ...v,
        images: vImgs,
        variantImages: vImgs,
        primaryImage: vPrimary,
        secondaryImage: vSecondary,
        galleryImages: vImgs.map((img: any) => img.url).filter(Boolean)
      };
    });
  }

  // Remove duplicates
  variantImages = Array.from(new Set(variantImages));
  variantSecondaryImages = Array.from(new Set(variantSecondaryImages));

  const rawReviews = Array.isArray(p.reviews) ? p.reviews : (Array.isArray(p.customerReviews) ? p.customerReviews : []);
  
  const approvedReviews = rawReviews.filter((r: any) => {
    if (r.isApproved === false) return false;
    if (r.reviewText && typeof r.reviewText === 'string' && r.reviewText.startsWith('{')) {
      try {
        const parsed = JSON.parse(r.reviewText);
        if (parsed.status && parsed.status.toUpperCase() !== 'APPROVED') return false;
      } catch (e) {}
    }
    return true;
  });

  let avgRating = 0;
  let ratingCount = approvedReviews.length;
  let r1 = 0, r2 = 0, r3 = 0, r4 = 0, r5 = 0;
  let latestReviewObj = null;

  if (ratingCount > 0) {
    let sum = 0;
    for (const r of approvedReviews) {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating || r.stars) || 5)));
      sum += star;
      if (star === 1) r1++;
      else if (star === 2) r2++;
      else if (star === 3) r3++;
      else if (star === 4) r4++;
      else if (star === 5) r5++;
    }
    avgRating = Number((sum / ratingCount).toFixed(1));
    const latest = approvedReviews[0];
    if (latest) {
      latestReviewObj = {
        id: latest.id,
        rating: Number(latest.rating) || 5,
        title: latest.title || 'Verified Review',
        comment: latest.comment || latest.reviewText || '',
        createdAt: latest.createdAt,
      };
    }
  } else if (typeof p.averageRating === 'number' && p.averageRating > 0) {
    avgRating = p.averageRating;
    ratingCount = p.totalReviews || p.ratingCount || p.reviewCount || 0;
  } else if (typeof p.avgRating === 'number' && p.avgRating > 0) {
    avgRating = p.avgRating;
    ratingCount = p.ratingCount || p.reviewCount || 0;
  }

  const ratingDist = p.ratingDistribution || { '5': r5, '4': r4, '3': r3, '2': r2, '1': r1 };

  const codVal = p.codAvailable !== undefined && p.codAvailable !== null
    ? Boolean(p.codAvailable)
    : (p.isCodAvailable !== undefined && p.isCodAvailable !== null
      ? Boolean(p.isCodAvailable)
      : (p.is_cod_available !== undefined && p.is_cod_available !== null
        ? Boolean(p.is_cod_available)
        : true));

    const weightInGrams = p.weightInGrams !== undefined && p.weightInGrams !== null
    ? Number(p.weightInGrams)
    : (p.weight !== undefined && p.weight !== null ? Number(p.weight) : 0);
  const weightUnit = p.weightUnit || 'g';

  const rawPCS = (p as any).productCategories || [];
  let categoriesList: any[] = (p as any).categories || [];
  if ((!categoriesList || categoriesList.length === 0) && rawPCS.length > 0) {
    categoriesList = rawPCS.map((pc: any) => ({
      id: pc.category?.id || pc.categoryId,
      parentId: pc.category?.parentId || null,
      name: pc.category?.name || '',
      slug: pc.category?.slug || '',
      description: pc.category?.description || '',
      icon: pc.category?.icon || null,
      image: pc.category?.image || null,
      banner: pc.category?.banner || null,
      sortOrder: pc.sortOrder || 0,
      isActive: pc.category?.isActive ?? true,
      isFeatured: pc.category?.isFeatured ?? false,
      seoTitle: pc.category?.seoTitle || null,
      seoDescription: pc.category?.seoDescription || null,
      isPrimary: !!pc.isPrimary
    })).filter((c: any) => c.id);
  }

  if (categoriesList.length === 0 && p.category) {
    categoriesList = [{ ...p.category, isPrimary: true }];
  }

  const primaryCategory = p.primaryCategory || categoriesList.find((c: any) => c.isPrimary) || categoriesList[0] || p.category || null;
  const primaryCategoryId = primaryCategory?.id || p.categoryId || null;
  const categoryIds = categoriesList.map((c: any) => c.id);

  return {
    ...p,
    categoryId: primaryCategoryId,
    categoryIds,
    categories: categoriesList,
    primaryCategory,
    weightInGrams,
    weightUnit,
    reviews: approvedReviews,
    images: imgs,
    primaryImage,
    secondaryImage,
    galleryImages,
    variants: mappedVariants,
    hasVariants: Array.isArray(mappedVariants) && mappedVariants.length > 0,
    variantImages,
    variantSecondaryImages,
    thumbnail: primaryImage,
    averageRating: avgRating,
    rating: avgRating,
    avgRating: avgRating,
    totalReviews: ratingCount,
    reviewCount: ratingCount,
    ratingCount: ratingCount,
    ratingDistribution: ratingDist,
    latestReview: latestReviewObj || p.latestReview || null,
    codAvailable: codVal,
    isCodAvailable: codVal,
    is_cod_available: codVal,
  };
};


const getCategoryPath = async (categoryId: string | null): Promise<string[]> => {
  if (!categoryId) return [];
  const cacheKey = `category_path_${categoryId}`;
  const cached = sysCache.get(cacheKey);
  if (cached) return cached;

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
  sysCache.set(cacheKey, path, 1800); // Cache category path for 30 minutes
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

    // Load and map all active products & categories from single-flight memory cache
    const allMapped = await getAllMappedProductsCached();
    const allDbCategories = await getAllDbCategoriesCached();

    // Helper to check if a category belongs to a parent (by ID or slug)
    const isCategoryChildOf = (cat: any, parentSlugOrId: string): boolean => {
      if (!cat) return false;
      const catId = cat.id;
      const catSlug = cat.slug;
      if (catId === parentSlugOrId || catSlug === parentSlugOrId) return true;

      const targetCat = allDbCategories.find(c => c.id === parentSlugOrId || c.slug === parentSlugOrId);
      if (!targetCat) return false;

      const getDescendantIds = (parentId: string): string[] => {
        const children = allDbCategories.filter(c => c.parentId === parentId);
        let ids: string[] = [parentId];
        for (const child of children) {
          ids = ids.concat(getDescendantIds(child.id));
        }
        return ids;
      };

      const validIds = getDescendantIds(targetCat.id);
      return validIds.includes(catId);
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
        const prodCats = Array.isArray(p.categories) && p.categories.length > 0 ? p.categories : (p.category ? [p.category] : []);
        return catsArray.some(cVal => prodCats.some((cItem: any) => isCategoryChildOf(cItem, cVal)));
      });
    }

    if (subcategory) {
      const subcatsArray = (subcategory as string).split(',').map(s => s.trim()).filter(Boolean);
      filtered = filtered.filter(p => {
        const prodCats = Array.isArray(p.categories) && p.categories.length > 0 ? p.categories : (p.category ? [p.category] : []);
        return subcatsArray.some(sVal =>
          p.categoryId === sVal ||
          p.category?.slug === sVal ||
          prodCats.some((cItem: any) => cItem.id === sVal || cItem.slug === sVal)
        );
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
        return p.colors.some((c: string) => colorsArray.includes(c.toLowerCase()));
      });
    }

    // Material filter
    if (material) {
      const materialsArray = (material as string).split(',').map(s => s.toLowerCase().trim()).filter(Boolean);
      filtered = filtered.filter(p => {
        return p.materials.some((m: string) => materialsArray.includes(m.toLowerCase()));
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
        return p.compatibility.some((c: string) => compArray.includes(c.toLowerCase()));
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
      p.colors.forEach((c: string) => {
        aggColorsMap[c] = (aggColorsMap[c] || 0) + 1;
      });

      // Materials
      p.materials.forEach((m: string) => {
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
      p.compatibility.forEach((c: string) => {
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
    bundleIds.length > 0 ? prisma.product.findMany({ where: { id: { in: bundleIds }, deletedAt: null }, include: { brand: true, category: true, variants: { where: { isActive: true } } } }) : Promise.resolve([]),
    filamentIds.length > 0 ? prisma.product.findMany({ where: { id: { in: filamentIds }, deletedAt: null }, include: { brand: true, category: true, variants: { where: { isActive: true } } } }) : Promise.resolve([]),
    relatedIds.length > 0 ? prisma.product.findMany({ where: { id: { in: relatedIds }, deletedAt: null }, include: { brand: true, category: true, variants: { where: { isActive: true } } } }) : Promise.resolve([])
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
          orderBy: { createdAt: "desc" },
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
        include: { brand: true, category: true, variants: { where: { isActive: true } } },
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

    const mappedReviews = (item.reviews || []).map((review: any) => {
      const user = review.user || review.customer?.user;
      let parsedTitle = "Verified Review";
      let parsedComment = review.reviewText || "";
      let parsedImages: string[] = [];
      let parsedRecommended = true;

      if (review.reviewText && review.reviewText.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(review.reviewText);
          parsedTitle = parsed.title || parsedTitle;
          parsedComment = parsed.comment || parsed.review || parsedComment;
          parsedImages = Array.isArray(parsed.images) ? parsed.images : [];
          if (typeof parsed.recommended === "boolean") {
            parsedRecommended = parsed.recommended;
          }
        } catch (e) {
          // Keep text fallback
        }
      }

      return {
        id: review.id,
        productId: review.productId,
        userName: user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
          : "Customer",
        rating: Number(review.rating || 5),
        title: parsedTitle,
        comment: parsedComment,
        date: review.createdAt ? review.createdAt.toISOString() : new Date().toISOString(),
        verified: true,
        images: parsedImages,
        recommended: parsedRecommended,
        helpfulCount: 0,
        sellerReply: null,
      };
    });

    const catPath = await getCategoryPath(item.categoryId);
    const mappedProduct = mapProductFields({
      ...item,
      reviews: mappedReviews,
      categoryPath: catPath,
      bundleProducts: relations.bundleProducts.map(p => mapProductFields(p)),
      recommendedFilaments: relations.recommendedFilaments.map(p => mapProductFields(p)),
      relatedProducts: relations.relatedProducts.map(p => mapProductFields(p))
    });

    const finalResponse = {
      isCodAvailable: mappedProduct.isCodAvailable,
      codAvailable: mappedProduct.codAvailable,
      is_cod_available: mappedProduct.is_cod_available,
      categoryPath: catPath,
      variantImages: (mappedProduct.variants || []).map((v: any) => ({
        variantId: v.id,
        imageIds: v.variantImages || []
      })),
      product: mappedProduct,
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
      variants: mappedProduct.variants || [],
      reviews: mappedReviews,
      // Keep backward compatibility lists
      images: mappedProduct.images,
      specifications: mappedProduct.specifications,
      downloads: mappedProduct.downloads,
      features: mappedProduct.features,
      faqs: mappedProduct.faqs,
      warranty: mappedProduct.warranty,
      shipping: {
        ...(safeParseObject(item.shipping) || {}),
        isCodAvailable: mappedProduct.isCodAvailable,
        codAvailable: mappedProduct.codAvailable
      },
      seo: mappedProduct.seo,
      relatedProducts: mappedProduct.relatedProducts,
      bundleProducts: mappedProduct.bundleProducts,
      complimentaryProducts: mappedProduct.bundleProducts,
      recommendedFilaments: mappedProduct.recommendedFilaments,
      assets: safeParseArray(item.attributes),
      masterData: {
        ...masterData,
        images: mappedProduct.images,
        relatedProducts: mappedProduct.relatedProducts,
        isCodAvailable: mappedProduct.isCodAvailable,
        codAvailable: mappedProduct.codAvailable
      }
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
        productCategories: {
          include: { category: true }
        },
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
    const mappedProduct = mapProductFields({
      ...item,
      categoryPath: catPath,
      bundleProducts: relations.bundleProducts.map(p => mapProductFields(p)),
      recommendedFilaments: relations.recommendedFilaments.map(p => mapProductFields(p)),
      relatedProducts: relations.relatedProducts.map(p => mapProductFields(p))
    });

    const finalResponse = {
      isCodAvailable: mappedProduct.isCodAvailable,
      codAvailable: mappedProduct.codAvailable,
      is_cod_available: mappedProduct.is_cod_available,
      categoryPath: catPath,
      variantImages: (mappedProduct.variants || []).map((v: any) => ({
        variantId: v.id,
        imageIds: v.variantImages || []
      })),
      product: mappedProduct,
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
      variants: mappedProduct.variants || [],
      reviews: item.reviews || [],
      // Keep backward compatibility lists
      images: mappedProduct.images,
      specifications: mappedProduct.specifications,
      downloads: mappedProduct.downloads,
      features: mappedProduct.features,
      faqs: mappedProduct.faqs,
      warranty: mappedProduct.warranty,
      shipping: {
        ...(safeParseObject(item.shipping) || {}),
        isCodAvailable: mappedProduct.isCodAvailable,
        codAvailable: mappedProduct.codAvailable
      },
      seo: mappedProduct.seo,
      relatedProducts: mappedProduct.relatedProducts,
      bundleProducts: mappedProduct.bundleProducts,
      complimentaryProducts: mappedProduct.bundleProducts,
      recommendedFilaments: mappedProduct.recommendedFilaments,
      assets: safeParseArray(item.attributes),
      masterData: {
        ...masterData,
        images: mappedProduct.images,
        relatedProducts: mappedProduct.relatedProducts,
        isCodAvailable: mappedProduct.isCodAvailable,
        codAvailable: mappedProduct.codAvailable
      }
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
    categoryId, brandId, category_id, brand_id, brand, category, seoTitle, seoDescription, seoKeywords,
    variants, options, images, specifications, downloads, features, faqs, warranty, shipping, relatedProducts, included_items, attributes,
    isFeatured, featured, codAvailable, baseShippingCharge, estimatedDeliveryDays, freeShippingEligible, bundleProducts, recommendedFilaments,
    weightInGrams, weight_in_grams, weightUnit, weight_unit,
    status
  } = req.body;

  if (!name || !slug || !sku) {
    return res.status(400).json({ error: 'Missing core mandatory parameters' });
  }

  try {
    const resolvedSalePrice = salePrice !== undefined ? salePrice : sale_price;
    const resolvedDealerPrice = dealerPrice !== undefined ? dealerPrice : dealer_price;
    const rawWeight = weightInGrams !== undefined ? weightInGrams : weight_in_grams;
    const resolvedWeightInGrams = rawWeight !== undefined && rawWeight !== null ? parseFloat(rawWeight) : 0;
    const resolvedWeightUnit = weightUnit || weight_unit || 'g';

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

    const rawBrand = brandId !== undefined ? brandId : (brand_id !== undefined ? brand_id : brand);
    const rawCategory = categoryId !== undefined ? categoryId : (category_id !== undefined ? category_id : category);

    const resolvedBrandId = await resolveBrandId(rawBrand);
    const resolvedCategoryList = await resolveCategoryIds(req.body);
    const primaryCatItem = resolvedCategoryList.find(c => c.isPrimary) || resolvedCategoryList[0];
    const resolvedCategoryId = primaryCatItem ? primaryCatItem.id : await resolveCategoryId(rawCategory);

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
          estimatedDeliveryDays: estimatedDeliveryDays !== undefined ? encodeDays(estimatedDeliveryDays) : 3,
          freeShippingEligible: freeShippingEligible !== undefined ? !!freeShippingEligible : true,
          weightInGrams: isNaN(resolvedWeightInGrams) ? 0 : resolvedWeightInGrams,
          weightUnit: resolvedWeightUnit,
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

      if (resolvedCategoryList.length > 0) {
        for (let i = 0; i < resolvedCategoryList.length; i++) {
          const catItem = resolvedCategoryList[i];
          await tx.productCategory.create({
            data: {
              productId: p.id,
              categoryId: catItem.id,
              isPrimary: catItem.isPrimary,
              sortOrder: i
            }
          });
        }
      }

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
          productCategories: {
            include: { category: true }
          },
          brand: true,
          reviews: {
            include: { user: true }
          }
        }
      });
    }, { maxWait: 15000, timeout: 30000 });

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
    categoryId, brandId, category_id, brand_id, brand, category, seoTitle, seoDescription, seoKeywords,
    variants, options, images, specifications, downloads, features, faqs, warranty, shipping, relatedProducts, included_items, attributes,
    isFeatured, featured, codAvailable, baseShippingCharge, estimatedDeliveryDays, freeShippingEligible, bundleProducts, recommendedFilaments,
    weightInGrams, weight_in_grams, weightUnit, weight_unit,
    status
  } = req.body;

  try {
    const resolvedSalePrice = salePrice !== undefined ? salePrice : sale_price;
    const resolvedDealerPrice = dealerPrice !== undefined ? dealerPrice : dealer_price;
    const rawWeight = weightInGrams !== undefined ? weightInGrams : weight_in_grams;
    const resolvedWeightInGrams = rawWeight !== undefined && rawWeight !== null ? parseFloat(rawWeight) : undefined;
    const resolvedWeightUnit = weightUnit || weight_unit;

    const parsedImages = images !== undefined ? safeParseArray(images).map((img: any) => {
      if (!img) return null;
      if (typeof img === 'string') {
        return { url: img, isPrimary: false, sortOrder: 0 };
      }
      return {
        url: img.url || img.imageUrl || '',
        isPrimary: !!img.isPrimary,
        sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : 0
      };
    }).filter((img: any) => img && img.url.trim().length > 0) : undefined;

    const parsedSpecs = specifications !== undefined ? safeParseArray(specifications).filter((s: any) => s?.name && s?.value) : undefined;
    const parsedDownloads = downloads !== undefined ? safeParseArray(downloads).filter((d: any) => d?.title || d?.name) : undefined;
    const parsedFeatures = features !== undefined ? safeParseArray(features) : undefined;
    const parsedFaqs = faqs !== undefined ? safeParseArray(faqs).filter((f: any) => f?.question && f?.answer) : undefined;
    const parsedVariants = variants !== undefined ? safeParseArray(variants).filter((v: any) => v?.name && v?.sku) : undefined;
    const parsedOptions = options !== undefined ? safeParseArray(options) : undefined;
    const parsedAttributes = attributes !== undefined ? safeParseArray(attributes) : undefined;
    const parsedWarranty = warranty !== undefined ? safeParseObject(warranty) : undefined;
    const parsedShipping = shipping !== undefined ? safeParseObject(shipping) : undefined;
    const parsedRelatedProducts = relatedProducts !== undefined ? safeParseArray(relatedProducts) : undefined;
    const parsedIncludedItems = included_items !== undefined ? safeParseArray(included_items) : undefined;
    const parsedBundleProducts = bundleProducts !== undefined ? safeParseArray(bundleProducts) : undefined;
    const parsedRecommendedFilaments = recommendedFilaments !== undefined ? safeParseArray(recommendedFilaments) : undefined;

    const rawBrand = brandId !== undefined ? brandId : (brand_id !== undefined ? brand_id : brand);
    const rawCategory = categoryId !== undefined ? categoryId : (category_id !== undefined ? category_id : category);

    const resolvedBrandId = await resolveBrandId(rawBrand);
    const hasCategoryPayload = req.body.categoryIds !== undefined || req.body.categories !== undefined || req.body.categoryId !== undefined || req.body.category_id !== undefined || req.body.category !== undefined;
    const resolvedCategoryList = hasCategoryPayload ? await resolveCategoryIds(req.body) : [];
    const primaryCatItem = resolvedCategoryList.find(c => c.isPrimary) || resolvedCategoryList[0];
    const resolvedCategoryId = hasCategoryPayload ? (primaryCatItem ? primaryCatItem.id : await resolveCategoryId(rawCategory)) : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      // Clear previously set variants ONLY if variants array was explicitly passed
      if (parsedVariants !== undefined) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
      }

      // Sync multi-categories in ProductCategory table IF category payload was sent
      if (hasCategoryPayload && resolvedCategoryList.length > 0) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        for (let i = 0; i < resolvedCategoryList.length; i++) {
          const catItem = resolvedCategoryList[i];
          await tx.productCategory.create({
            data: {
              productId: id,
              categoryId: catItem.id,
              isPrimary: catItem.isPrimary,
              sortOrder: i
            }
          });
        }
      }

      const p = await tx.product.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          slug: slug !== undefined ? slug : undefined,
          sku: sku !== undefined ? sku : undefined,
          description: description !== undefined ? description : undefined,
          shortDescription: short_description !== undefined ? short_description : undefined,
          basePrice: mrp ? parseFloat(mrp) : (price ? parseFloat(price) : undefined),
          salePrice: resolvedSalePrice !== undefined && resolvedSalePrice !== null ? parseFloat(resolvedSalePrice) : undefined,
          dealerPrice: resolvedDealerPrice !== undefined && resolvedDealerPrice !== null ? parseFloat(resolvedDealerPrice) : undefined,
          stock: stock !== undefined ? parseInt(stock, 10) : undefined,
          categoryId: resolvedCategoryId !== undefined ? resolvedCategoryId : (categoryId !== undefined ? categoryId : undefined),
          brandId: resolvedBrandId !== undefined ? resolvedBrandId : (brandId !== undefined ? brandId : undefined),
          isActive: status !== undefined ? status === 'active' : undefined,
          isFeatured: isFeatured !== undefined ? !!isFeatured : (featured !== undefined ? !!featured : undefined),
          codAvailable: codAvailable !== undefined ? !!codAvailable : undefined,
          baseShippingCharge: baseShippingCharge !== undefined ? parseFloat(baseShippingCharge) : undefined,
          estimatedDeliveryDays: estimatedDeliveryDays !== undefined ? encodeDays(estimatedDeliveryDays) : undefined,
          freeShippingEligible: freeShippingEligible !== undefined ? !!freeShippingEligible : undefined,
          weightInGrams: resolvedWeightInGrams !== undefined && !isNaN(resolvedWeightInGrams) ? resolvedWeightInGrams : undefined,
          weightUnit: resolvedWeightUnit !== undefined ? resolvedWeightUnit : undefined,
          bundleProducts: parsedBundleProducts !== undefined ? parsedBundleProducts : undefined,
          recommendedFilaments: parsedRecommendedFilaments !== undefined ? parsedRecommendedFilaments : undefined,

          // Store inside JSON fields only if provided
          images: parsedImages !== undefined ? parsedImages : undefined,
          specifications: parsedSpecs !== undefined ? parsedSpecs : undefined,
          downloads: parsedDownloads !== undefined ? parsedDownloads : undefined,
          features: parsedFeatures !== undefined ? parsedFeatures : undefined,
          faqs: parsedFaqs !== undefined ? parsedFaqs : undefined,
          seo: (seoTitle !== undefined || seoDescription !== undefined || seoKeywords !== undefined) ? {
            title: seoTitle || null,
            description: seoDescription || null,
            keywords: seoKeywords || []
          } : undefined,
          shipping: parsedShipping !== undefined ? parsedShipping : undefined,
          warranty: parsedWarranty !== undefined ? parsedWarranty : undefined,
          relatedProducts: parsedRelatedProducts !== undefined ? parsedRelatedProducts : undefined,
          includedItems: parsedIncludedItems !== undefined ? parsedIncludedItems : undefined,
          attributes: parsedAttributes !== undefined ? parsedAttributes : undefined,
          options: parsedOptions !== undefined ? parsedOptions : undefined
        }
      });

      if (parsedVariants && parsedVariants.length > 0) {
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
          productCategories: {
            include: { category: true }
          },
          brand: true,
          reviews: {
            include: { user: true }
          }
        }
      });
    }, { maxWait: 15000, timeout: 30000 });

    clearProductCache();
    return res.status(200).json({ success: true, message: 'Success', data: mapProductFields(updated) });
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

export const quickUpdateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const productId = id || req.params.productId;
  const { price, salePrice, dealerPrice, basePrice, stockQuantity, stock, isActive } = req.body;

  try {
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const updateData: any = {};

    // Price updates
    if (price !== undefined || salePrice !== undefined) {
      const pVal = parseFloat(salePrice !== undefined ? salePrice : price);
      if (isNaN(pVal) || pVal < 0) {
        return res.status(400).json({ success: false, error: 'Invalid price value. Price must be a non-negative number.' });
      }
      updateData.salePrice = pVal;
    }

    if (dealerPrice !== undefined) {
      const dVal = parseFloat(dealerPrice);
      if (isNaN(dVal) || dVal < 0) {
        return res.status(400).json({ success: false, error: 'Invalid dealer price value.' });
      }
      updateData.dealerPrice = dVal;
    }

    if (basePrice !== undefined) {
      const bVal = parseFloat(basePrice);
      if (!isNaN(bVal) && bVal >= 0) {
        updateData.basePrice = bVal;
      }
    }

    // Stock updates
    if (stockQuantity !== undefined || stock !== undefined) {
      const sVal = parseInt(stockQuantity !== undefined ? stockQuantity : stock, 10);
      if (isNaN(sVal) || sVal < 0) {
        return res.status(400).json({ success: false, error: 'Invalid stock quantity. Stock must be an integer >= 0.' });
      }
      updateData.stock = sVal;
    }

    // Active status
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    updateData.updatedAt = new Date();

    const updated = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: true,
        brand: true,
        variants: true
      }
    });

    clearProductCache();

    // Audit Log
    try {
      const user = (req as any).user;
      if (user) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'PRODUCT_QUICK_UPDATE',
            entityType: 'Product',
            entityId: productId,
            newData: updateData
          }
        });
      }
    } catch (auditErr) {
      // non-blocking
    }

    return res.status(200).json({
      success: true,
      message: 'Product quick updated successfully',
      data: updated
    });
  } catch (err: any) {
    console.error('Failed to quick update product:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error updating product' });
  }
};

export const quickUpdateVariant = async (req: Request, res: Response) => {
  const { productId, variantId, id } = req.params;
  const targetVariantId = variantId || id;

  const { price, salePrice, stockQuantity, stock, isActive } = req.body;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetVariantId);
    let existing = isUuid
      ? await prisma.productVariant.findUnique({ where: { id: targetVariantId } })
      : await prisma.productVariant.findFirst({ where: { sku: targetVariantId } });

    if (!existing && !isUuid) {
      existing = await prisma.productVariant.findFirst({ where: { sku: targetVariantId } });
    }

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product variant not found' });
    }

    const updateData: any = {};

    if (price !== undefined || salePrice !== undefined) {
      if (price !== undefined) {
        const pVal = parseFloat(price);
        if (!isNaN(pVal) && pVal >= 0) {
          updateData.price = pVal;
        }
      }
      if (salePrice !== undefined) {
        const sVal = parseFloat(salePrice);
        if (!isNaN(sVal) && sVal >= 0) {
          updateData.salePrice = sVal;
        }
      }
      if (updateData.price === undefined && updateData.salePrice !== undefined) {
        updateData.price = updateData.salePrice;
      } else if (updateData.salePrice === undefined && updateData.price !== undefined) {
        updateData.salePrice = updateData.price;
      }
    }

    if (stockQuantity !== undefined || stock !== undefined) {
      const sVal = parseInt(stockQuantity !== undefined ? stockQuantity : stock, 10);
      if (isNaN(sVal) || sVal < 0) {
        return res.status(400).json({ success: false, error: 'Invalid stock quantity. Stock must be an integer >= 0.' });
      }
      updateData.stock = sVal;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    updateData.updatedAt = new Date();

    const updatedVariant = await prisma.productVariant.update({
      where: { id: existing.id },
      data: updateData
    });

    const parentProductId = productId || existing.productId;
    if (parentProductId) {
      const allVars = await prisma.productVariant.findMany({ where: { productId: parentProductId } });
      const totalStock = allVars.reduce((sum, v) => sum + (v.stock || 0), 0);
      await prisma.product.update({
        where: { id: parentProductId },
        data: { stock: totalStock, updatedAt: new Date() }
      });
    }

    clearProductCache();

    // Audit Log
    try {
      const user = (req as any).user;
      if (user) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'VARIANT_QUICK_UPDATE',
            entityType: 'ProductVariant',
            entityId: existing.id,
            newData: updateData
          }
        });
      }
    } catch (auditErr) {
      // non-blocking
    }

    return res.status(200).json({
      success: true,
      message: 'Variant quick updated successfully',
      data: updatedVariant
    });
  } catch (err: any) {
    console.error('Failed to quick update variant:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error updating variant' });
  }
};

export const getProductVariants = async (req: Request, res: Response) => {
  const productId = req.params.productId || req.params.id;
  try {
    const variants = await prisma.productVariant.findMany({
      where: { productId: productId },
      orderBy: { createdAt: 'asc' }
    });
    return res.status(200).json({ success: true, data: variants });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getAdminProducts = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      search = '',
      q = '',
      category = '',
      brand = '',
      sort = 'createdAt',
      order = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;
    const searchTerm = String(search || q || '').trim();

    const whereCondition: any = {
      deletedAt: null,
    };

    if (searchTerm) {
      whereCondition.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
        { brand: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
        {
          variants: {
            some: {
              OR: [
                { sku: { contains: searchTerm, mode: 'insensitive' } },
                { name: { contains: searchTerm, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    if (category) {
      whereCondition.OR = [
        ...(whereCondition.OR || []),
        { categoryId: String(category) },
        { category: { slug: String(category) } },
      ];
    }

    if (brand) {
      whereCondition.brandId = String(brand);
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where: whereCondition }),
      prisma.product.findMany({
        where: whereCondition,
        skip,
        take: limitNum,
        orderBy: {
          [sort === 'name' ? 'name' : sort === 'sku' ? 'sku' : sort === 'stock' ? 'stock' : 'createdAt']: order === 'asc' ? 'asc' : 'desc',
        },
        include: {
          brand: true,
          category: true,
          productCategories: {
            include: { category: true }
          },
          variants: true,
          reviews: true
        }
      })
    ]);

    const mapped = products.map(p => mapProductFields(p));

    return res.status(200).json({
      success: true,
      products: mapped,
      data: mapped,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err: any) {
    console.error('Error fetching admin products:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


