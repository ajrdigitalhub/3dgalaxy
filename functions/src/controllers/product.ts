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
          include: { customer: true },
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
          include: { customer: true },
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
    const created = await prisma.product.create({
      data: {
        name, slug, sku, description,
        basePrice: parseFloat(mrp) || 0,
        salePrice: parseFloat(salePrice) || 0,
        dealerPrice: parseFloat(dealerPrice) || 0,
        categoryId: categoryId || null,
        brandId: brandId || null,
        seo: {
          create: { seoTitle, seoDescription, seoKeywords }
        },
        variants: variants ? {
          create: variants.map((v: any) => ({
            name: v.name, price: parseFloat(v.price) || 0, sku: v.sku,
          })),
        } : undefined,
        images: images ? {
          create: images.map((img: any, idx: number) => ({
            url: img.url, isPrimary: !!img.isPrimary, sortOrder: img.sortOrder || idx
          })),
        } : undefined,
        specifications: specifications ? {
          create: specifications.map((s: any, idx: number) => ({
            name: s.name, value: s.value, sortOrder: s.sortOrder || idx
          })),
        } : undefined,
        downloads: downloads ? {
          create: downloads.map((d: any, idx: number) => ({
            title: d.title, fileUrl: d.fileUrl, downloadType: d.downloadType || 'manual', sortOrder: d.sortOrder || idx
          })),
        } : undefined,
        features: features ? {
          create: features.map((f: any, idx: number) => ({
            icon: f.icon, title: f.title, description: f.description, sortOrder: f.sortOrder || idx
          })),
        } : undefined,
        faqs: faqs ? {
          create: faqs.map((f: any, idx: number) => ({
            question: f.question, answer: f.answer, sortOrder: f.sortOrder || idx
          })),
        } : undefined,
        warranty: warranty ? {
          create: {
            warrantyPeriod: warranty.warrantyPeriod,
            warrantyType: warranty.warrantyType,
            warrantyDescription: warranty.warrantyDescription
          }
        } : undefined,
        shipping: shipping ? {
          create: {
            deliveryTime: shipping.deliveryTime,
            shippingCharges: shipping.shippingCharges ? parseFloat(shipping.shippingCharges) : undefined,
            shippingRegions: shipping.shippingRegions
          }
        } : undefined,
      },
      include: {
        variants: true, images: true, specifications: true, downloads: true, features: true, faqs: true, warranty: true, shipping: true
      },
    });

    return res.status(201).json({ success: true, message: 'Success', data: created });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to record Product SKU', details: error.message });
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
    // Delete existing child relations before updates to prevent dangling keys
    if (variants) await prisma.productVariant.deleteMany({ where: { productId: id } });
    if (images) await prisma.productImage.deleteMany({ where: { productId: id } });
    if (specifications) await prisma.productSpecification.deleteMany({ where: { productId: id } });
    if (downloads) await prisma.productDownload.deleteMany({ where: { productId: id } });
    if (features) await prisma.productFeature.deleteMany({ where: { productId: id } });
    if (faqs) await prisma.productFaq.deleteMany({ where: { productId: id } });

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name, slug, sku, description,
        basePrice: mrp ? parseFloat(mrp) : undefined,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        dealerPrice: dealerPrice ? parseFloat(dealerPrice) : undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        seo: {
          upsert: {
            create: { seoTitle, seoDescription, seoKeywords },
            update: { seoTitle, seoDescription, seoKeywords }
          }
        },
        variants: variants ? {
          create: variants.map((v: any) => ({
            name: v.name, price: parseFloat(v.price) || 0, sku: v.sku,
          })),
        } : undefined,
        images: images ? {
          create: images.map((i: any, idx: number) => ({
            url: i.url, isPrimary: !!i.isPrimary, sortOrder: i.sortOrder || idx
          })),
        } : undefined,
        specifications: specifications ? {
          create: specifications.map((s: any, idx: number) => ({
            name: s.name, value: s.value, sortOrder: s.sortOrder || idx
          })),
        } : undefined,
        downloads: downloads ? {
          create: downloads.map((d: any, idx: number) => ({
            title: d.title, fileUrl: d.fileUrl, downloadType: d.downloadType || 'manual', sortOrder: d.sortOrder || idx
          })),
        } : undefined,
        features: features ? {
          create: features.map((f: any, idx: number) => ({
            icon: f.icon, title: f.title, description: f.description, sortOrder: f.sortOrder || idx
          })),
        } : undefined,
        faqs: faqs ? {
          create: faqs.map((f: any, idx: number) => ({
            question: f.question, answer: f.answer, sortOrder: f.sortOrder || idx
          })),
        } : undefined,
        warranty: warranty ? {
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
        } : undefined,
        shipping: shipping ? {
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
        } : undefined,
      },
      include: {
        variants: true, images: true, specifications: true, downloads: true, features: true, faqs: true, warranty: true, shipping: true
      },
    });

    return res.status(200).json({ success: true, message: 'Success', data: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to apply product SKU updates', details: error.message });
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
