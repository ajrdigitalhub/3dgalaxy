import { Request, Response } from 'express';
import prisma from '../config/database';

export const getProducts = async (req: Request, res: Response) => {
  try {
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

    // Filters formulation
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

    // Sorting formulation
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
        variants: true,
        images: true,
        category: true,
        brand: true,
      },
      orderBy: order,
      skip,
      take: limitNum,
    });

    return res.status(200).json({
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: items,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to find products in catalog', details: error.message });
  }
};

export const getProductBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  try {
    const item = await prisma.product.findUnique({
      where: { slug },
      include: {
        variants: true,
        images: true,
        category: true,
        brand: true,
        specifications: true,
        downloads: true,
        features: true,
        faqs: true,
        warranty: true,
        shipping: true,
        seo: true,
        relatedProducts: {
          include: { relatedProduct: true }
        },
        reviews: {
          include: { user: true },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json(item);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch product', details: error.message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const item = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        images: true,
        category: true,
        brand: true,
        specifications: true,
        downloads: true,
        features: true,
        faqs: true,
        warranty: true,
        shipping: true,
        seo: true,
        relatedProducts: {
          include: { relatedProduct: true }
        },
        reviews: {
          include: { user: true },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Product SKU does not exist' });
    }

    return res.status(200).json(item);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to read individual product SKU', details: error.message });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const {
    name, slug, sku, description, mrp, salePrice, dealerPrice, stock,
    categoryId, brandId, is360Supported, seoTitle, seoDescription, seoKeywords,
    variants, images, specifications, downloads, features, faqs, warranty, shipping
  } = req.body;

  if (!name || !slug || !sku) {
    return res.status(400).json({ error: 'Missing core mandatory parameters for SKU launch' });
  }

  try {
    const validImages = (images || []).filter((img: any) => img?.url?.trim());
    const validVariants = (variants || []).filter((v: any) => v?.name && v?.sku);
    const validSpecs = (specifications || []).filter((s: any) => s?.name && s?.value);
    const validDownloads = (downloads || []).filter((d: any) => d?.title && d?.fileUrl);
    const validFeatures = (features || []).filter((f: any) => f?.title);
    const validFaqs = (faqs || []).filter((f: any) => f?.question && f?.answer);

    // Ensure categoryId and brandId are actual UUIDs. If they are not (e.g. they are names or slugs), we should ideally look them up.
    // For now, if they are provided, we will assume they are IDs or handle gracefully if Prisma fails.
    let resolvedCategoryId = categoryId || null;
    let resolvedBrandId = brandId || null;

    if (resolvedCategoryId && !resolvedCategoryId.includes('-')) {
      const cat = await prisma.category.findFirst({ where: { OR: [{ slug: resolvedCategoryId }, { name: resolvedCategoryId }] } });
      if (cat) resolvedCategoryId = cat.id;
    }

    if (resolvedBrandId && !resolvedBrandId.includes('-')) {
      const brand = await prisma.brand.findFirst({ where: { OR: [{ slug: resolvedBrandId }, { name: resolvedBrandId }] } });
      if (brand) resolvedBrandId = brand.id;
    }

    const created = await prisma.$transaction(async (tx) => {
      return tx.product.create({
        data: {
          name, slug, sku, description,
          basePrice: parseFloat(mrp) || 0,
          salePrice: parseFloat(salePrice) || 0,
          dealerPrice: parseFloat(dealerPrice) || 0,
          categoryId: resolvedCategoryId,
          brandId: resolvedBrandId,
          seo: {
            create: { seoTitle, seoDescription, seoKeywords }
          },
          ...(validVariants.length > 0 && {
            variants: {
              create: validVariants.map((v: any) => ({
                name: v.name, price: parseFloat(v.price) || 0, sku: v.sku,
              })),
            }
          }),
          ...(validImages.length > 0 && {
            images: {
              create: validImages.map((img: any, idx: number) => ({
                url: img.url, isPrimary: !!img.isPrimary, sortOrder: img.sortOrder || idx
              })),
            }
          }),
          ...(validSpecs.length > 0 && {
            specifications: {
              create: validSpecs.map((s: any, idx: number) => ({
                name: s.name, value: s.value, sortOrder: s.sortOrder || idx
              })),
            }
          }),
          ...(validDownloads.length > 0 && {
            downloads: {
              create: validDownloads.map((d: any, idx: number) => ({
                title: d.title, fileUrl: d.fileUrl, downloadType: d.downloadType || 'manual', sortOrder: d.sortOrder || idx
              })),
            }
          }),
          ...(validFeatures.length > 0 && {
            features: {
              create: validFeatures.map((f: any, idx: number) => ({
                icon: f.icon, title: f.title, description: f.description, sortOrder: f.sortOrder || idx
              })),
            }
          }),
          ...(validFaqs.length > 0 && {
            faqs: {
              create: validFaqs.map((f: any, idx: number) => ({
                question: f.question, answer: f.answer, sortOrder: f.sortOrder || idx
              })),
            }
          }),
          ...(warranty?.warrantyPeriod && {
            warranty: {
              create: {
                warrantyPeriod: warranty.warrantyPeriod,
                warrantyType: warranty.warrantyType,
                warrantyDescription: warranty.warrantyDescription
              }
            }
          }),
          ...(shipping?.deliveryTime && {
            shipping: {
              create: {
                deliveryTime: shipping.deliveryTime,
                shippingCharges: shipping.shippingCharges ? parseFloat(shipping.shippingCharges) : undefined,
                shippingRegions: shipping.shippingRegions
              }
            }
          }),
        },
        include: {
          variants: true, images: true, specifications: true, downloads: true, features: true, faqs: true, warranty: true, shipping: true
        },
      });
    });

    return res.status(201).json({ success: true, message: 'Success', data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to record Product SKU', message: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name, slug, sku, description, mrp, salePrice, dealerPrice, stock,
    categoryId, brandId, is360Supported, seoTitle, seoDescription, seoKeywords,
    variants, images, specifications, downloads, features, faqs, warranty, shipping
  } = req.body;

  try {
    const validImages = (images || []).filter((img: any) => img?.url?.trim());
    const validVariants = (variants || []).filter((v: any) => v?.name && v?.sku);
    const validSpecs = (specifications || []).filter((s: any) => s?.name && s?.value);
    const validDownloads = (downloads || []).filter((d: any) => d?.title && d?.fileUrl);
    const validFeatures = (features || []).filter((f: any) => f?.title);
    const validFaqs = (faqs || []).filter((f: any) => f?.question && f?.answer);

    let resolvedCategoryId = categoryId || undefined;
    let resolvedBrandId = brandId || undefined;

    if (resolvedCategoryId && !resolvedCategoryId.includes('-')) {
      const cat = await prisma.category.findFirst({ where: { OR: [{ slug: resolvedCategoryId }, { name: resolvedCategoryId }] } });
      if (cat) resolvedCategoryId = cat.id;
    }

    if (resolvedBrandId && !resolvedBrandId.includes('-')) {
      const brand = await prisma.brand.findFirst({ where: { OR: [{ slug: resolvedBrandId }, { name: resolvedBrandId }] } });
      if (brand) resolvedBrandId = brand.id;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing child relations before updates to prevent dangling keys
      if (variants) await tx.productVariant.deleteMany({ where: { productId: id } });
      if (images) await tx.productImage.deleteMany({ where: { productId: id } });
      if (specifications) await tx.productSpecification.deleteMany({ where: { productId: id } });
      if (downloads) await tx.productDownload.deleteMany({ where: { productId: id } });
      if (features) await tx.productFeature.deleteMany({ where: { productId: id } });
      if (faqs) await tx.productFaq.deleteMany({ where: { productId: id } });

      return tx.product.update({
        where: { id },
        data: {
          name, slug, sku, description,
          basePrice: mrp ? parseFloat(mrp) : undefined,
          salePrice: salePrice ? parseFloat(salePrice) : undefined,
          dealerPrice: dealerPrice ? parseFloat(dealerPrice) : undefined,
          categoryId: resolvedCategoryId,
          brandId: resolvedBrandId,
          seo: {
            upsert: {
              create: { seoTitle, seoDescription, seoKeywords },
              update: { seoTitle, seoDescription, seoKeywords }
            }
          },
          ...(validVariants.length > 0 && {
            variants: {
              create: validVariants.map((v: any) => ({
                name: v.name, price: parseFloat(v.price) || 0, sku: v.sku,
              })),
            }
          }),
          ...(validImages.length > 0 && {
            images: {
              create: validImages.map((i: any, idx: number) => ({
                url: i.url, isPrimary: !!i.isPrimary, sortOrder: i.sortOrder || idx
              })),
            }
          }),
          ...(validSpecs.length > 0 && {
            specifications: {
              create: validSpecs.map((s: any, idx: number) => ({
                name: s.name, value: s.value, sortOrder: s.sortOrder || idx
              })),
            }
          }),
          ...(validDownloads.length > 0 && {
            downloads: {
              create: validDownloads.map((d: any, idx: number) => ({
                title: d.title, fileUrl: d.fileUrl, downloadType: d.downloadType || 'manual', sortOrder: d.sortOrder || idx
              })),
            }
          }),
          ...(validFeatures.length > 0 && {
            features: {
              create: validFeatures.map((f: any, idx: number) => ({
                icon: f.icon, title: f.title, description: f.description, sortOrder: f.sortOrder || idx
              })),
            }
          }),
          ...(validFaqs.length > 0 && {
            faqs: {
              create: validFaqs.map((f: any, idx: number) => ({
                question: f.question, answer: f.answer, sortOrder: f.sortOrder || idx
              })),
            }
          }),
          ...(warranty?.warrantyPeriod && {
            warranty: {
              upsert: {
                create: {
                  warrantyPeriod: warranty.warrantyPeriod,
                  warrantyType: warranty.warrantyType,
                  warrantyDescription: warranty.warrantyDescription
                },
                update: {
                  warrantyPeriod: warranty.warrantyPeriod,
                  warrantyType: warranty.warrantyType,
                  warrantyDescription: warranty.warrantyDescription
                }
              }
            }
          }),
          ...(shipping?.deliveryTime && {
            shipping: {
              upsert: {
                create: {
                  deliveryTime: shipping.deliveryTime,
                  shippingCharges: shipping.shippingCharges ? parseFloat(shipping.shippingCharges) : undefined,
                  shippingRegions: shipping.shippingRegions
                },
                update: {
                  deliveryTime: shipping.deliveryTime,
                  shippingCharges: shipping.shippingCharges ? parseFloat(shipping.shippingCharges) : undefined,
                  shippingRegions: shipping.shippingRegions
                }
              }
            }
          }),
        },
        include: {
          variants: true, images: true, specifications: true, downloads: true, features: true, faqs: true, warranty: true, shipping: true
        },
      });
    });

    return res.status(200).json({ success: true, message: 'Success', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to apply product SKU updates', message: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { mode = 'hard' } = req.query; // Support standard and "soft" deletion

  try {
    if (mode === 'soft') {
      // Toggle inventory stock to zero as a soft flag or configure empty visibility
      const softDeleted = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return res.status(200).json({ message: 'Soft deleted', data: softDeleted });
    }

    // Hard delete deletes deep references automatically due to Cascade onDelete models
    await prisma.product.delete({ where: { id } });
    return res.status(200).json({ message: 'Product SKU permanently deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: 'SKU deletion command failed', details: error.message });
  }
};
