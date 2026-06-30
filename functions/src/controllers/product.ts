import { Request, Response } from 'express';
import prisma from '../config/database';
import { sysCache } from '../config/cache';

export const clearProductCache = () => {
  sysCache.clearPattern('products_list_');
  sysCache.clearPattern('products_slug_');
  sysCache.clearPattern('products_id_');
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

export const getProducts = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'products_list_' + JSON.stringify(req.query);
    const cachedResponse = sysCache.get(cacheKey);
    if (cachedResponse) {
      return res.status(200).json(cachedResponse);
    }

    const {
      page = '1',
      limit = '12',
      search,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const filters: any = {};

    if (search) {
      filters.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      filters.categoryId = categoryId as string;
    }

    if (brandId) {
      filters.brandId = brandId as string;
    }

    if (minPrice || maxPrice) {
      filters.salePrice = {};
      if (minPrice) {
        filters.salePrice.gte = parseFloat(minPrice as string);
      }
      if (maxPrice) {
        filters.salePrice.lte = parseFloat(maxPrice as string);
      }
    }

    const order: any = {};
    if (sortBy === 'price') {
      order.salePrice = sortOrder as string;
    } else {
      order[sortBy as string] = sortOrder as string;
    }

    const total = await prisma.product.count({ where: filters });
    const items = await prisma.product.findMany({
      where: filters,
      include: {
        brand: true,
        category: true,
        reviews: true,
      },
      orderBy: order,
      skip,
      take: limitNum,
    });

    const mappedData = items.map(p => {
      let thumbnail = '';
      const imgs = safeParseArray(p.images);
      if (imgs.length > 0) {
        const primaryImg = imgs.find((img: any) => img?.isPrimary) || imgs[0];
        thumbnail = primaryImg?.url || '';
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
        basePrice: p.basePrice,
        salePrice: p.salePrice,
        dealerPrice: p.dealerPrice,
        stock: p.stock,
        isActive: p.isActive,
        isExclusive: p.isExclusive,
        images: imgs,
        specifications: safeParseArray(p.specifications),
        brand: p.brand,
        category: p.category,
        reviews: p.reviews,
        price: p.basePrice,
        thumbnail
      };
    });

    const finalResponse = {
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: mappedData,
    };

    sysCache.set(cacheKey, finalResponse, 300);
    return res.status(200).json(finalResponse);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to find products in catalog', details: error.message });
  }
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

    const masterData = {
      images: safeParseArray(item.images),
      specifications: safeParseArray(item.specifications),
      downloads: safeParseArray(item.downloads),
      features: safeParseArray(item.features),
      faqs: safeParseArray(item.faqs),
      seo: safeParseObject(item.seo) || {},
      shipping: safeParseObject(item.shipping) || {},
      warranty: safeParseObject(item.warranty) || {},
      relatedProducts: safeParseArray(item.relatedProducts)
    };

    const finalResponse = {
      product: item,
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
      relatedProducts: masterData.relatedProducts,
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

    const masterData = {
      images: safeParseArray(item.images),
      specifications: safeParseArray(item.specifications),
      downloads: safeParseArray(item.downloads),
      features: safeParseArray(item.features),
      faqs: safeParseArray(item.faqs),
      seo: safeParseObject(item.seo) || {},
      shipping: safeParseObject(item.shipping) || {},
      warranty: safeParseObject(item.warranty) || {},
      relatedProducts: safeParseArray(item.relatedProducts)
    };

    const finalResponse = {
      product: item,
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
      relatedProducts: masterData.relatedProducts,
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
    name, slug, sku, description, short_description, mrp, price, salePrice, dealerPrice, stock,
    categoryId, brandId, seoTitle, seoDescription, seoKeywords,
    variants, options, images, specifications, downloads, features, faqs, warranty, shipping, relatedProducts, included_items, attributes
  } = req.body;

  if (!name || !slug || !sku) {
    return res.status(400).json({ error: 'Missing core mandatory parameters' });
  }

  try {
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
          salePrice: parseFloat(salePrice) || null,
          dealerPrice: parseFloat(dealerPrice) || null,
          stock: parseInt(stock, 10) || 0,
          categoryId: resolvedCategoryId || null,
          brandId: resolvedBrandId || null,

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

    clearProductCache();
    return res.status(201).json({ success: true, message: 'Success', data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to record Product', message: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name, slug, sku, description, short_description, mrp, price, salePrice, dealerPrice, stock,
    categoryId, brandId, seoTitle, seoDescription, seoKeywords,
    variants, options, images, specifications, downloads, features, faqs, warranty, shipping, relatedProducts, included_items, attributes
  } = req.body;

  try {
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
          salePrice: salePrice !== undefined ? parseFloat(salePrice) : undefined,
          dealerPrice: dealerPrice !== undefined ? parseFloat(dealerPrice) : undefined,
          stock: stock !== undefined ? parseInt(stock, 10) : undefined,
          categoryId: resolvedCategoryId !== undefined ? resolvedCategoryId : undefined,
          brandId: resolvedBrandId !== undefined ? resolvedBrandId : undefined,

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
