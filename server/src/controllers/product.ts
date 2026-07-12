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

    const total = await prisma.products.count({ where: filters });
    const items = await prisma.products.findMany({
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
        reviews: {
          include: { customer: true },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Product slug does not exist' });
    }

    return res.status(200).json(item);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to read individual product by slug', details: error.message });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const {
    name,
    slug,
    sku,
    description,
    mrp,
    salePrice,
    dealerPrice,
    sale_price,
    dealer_price,
    stock,
    categoryId,
    brandId,
    is360Supported,
    seoTitle,
    seoDescription,
    seoKeywords,
    variants, // Array: [{name, price, stock, sku}]
    images,   // Array: [{url, isPrimary}]
    isFeatured,
    codAvailable,
    baseShippingCharge,
    estimatedDeliveryDays,
    freeShippingEligible,
    bundleProducts,
    recommendedFilaments,
    status
  } = req.body;

  if (!name || !slug || !sku || !categoryId || !brandId) {
    return res.status(400).json({ error: 'Missing core mandatory parameters for SKU launch' });
  }

  try {
    const resolvedSalePrice = salePrice !== undefined ? salePrice : sale_price;
    const resolvedDealerPrice = dealerPrice !== undefined ? dealerPrice : dealer_price;

    const created = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        description,
        mrp: parseFloat(mrp),
        salePrice: parseFloat(resolvedSalePrice),
        dealerPrice: parseFloat(resolvedDealerPrice),
        stock: parseInt(stock, 10),
        categoryId,
        brandId,
        is360Supported: !!is360Supported,
        seoTitle,
        seoDescription,
        seoKeywords,
        isActive: status !== undefined ? status === 'active' : true,
        isFeatured: !!isFeatured,
        codAvailable: codAvailable !== false,
        baseShippingCharge: baseShippingCharge ? parseFloat(baseShippingCharge) : 0,
        estimatedDeliveryDays: estimatedDeliveryDays ? parseInt(estimatedDeliveryDays, 10) : 3,
        freeShippingEligible: freeShippingEligible !== false,
        bundleProducts: bundleProducts ? (typeof bundleProducts === 'string' ? JSON.parse(bundleProducts) : bundleProducts) : [],
        recommendedFilaments: recommendedFilaments ? (typeof recommendedFilaments === 'string' ? JSON.parse(recommendedFilaments) : recommendedFilaments) : [],
        variants: {
          create: (variants || []).map((v: any) => ({
            name: v.name,
            price: parseFloat(v.price),
            stock: parseInt(v.stock, 10),
            sku: v.sku,
          })),
        },
        images: {
          create: (images || []).map((img: any) => ({
            url: img.url,
            isPrimary: !img.isPrimary,
          })),
        },
      },
      include: {
        variants: true,
        images: true,
      },
    });

    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to record Product SKU', details: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    slug,
    sku,
    description,
    mrp,
    salePrice,
    dealerPrice,
    sale_price,
    dealer_price,
    stock,
    categoryId,
    brandId,
    is360Supported,
    seoTitle,
    seoDescription,
    seoKeywords,
    variants,
    images,
    isFeatured,
    codAvailable,
    baseShippingCharge,
    estimatedDeliveryDays,
    freeShippingEligible,
    bundleProducts,
    recommendedFilaments,
    status
  } = req.body;

  try {
    const resolvedSalePrice = salePrice !== undefined ? salePrice : sale_price;
    const resolvedDealerPrice = dealerPrice !== undefined ? dealerPrice : dealer_price;

    // Delete existing child relations before updates to prevent dangling keys
    if (variants) {
      await prisma.productVariant.deleteMany({ where: { productId: id } });
    }
    if (images) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        sku,
        description,
        mrp: mrp ? parseFloat(mrp) : undefined,
        salePrice: resolvedSalePrice ? parseFloat(resolvedSalePrice) : undefined,
        dealerPrice: resolvedDealerPrice ? parseFloat(resolvedDealerPrice) : undefined,
        stock: stock ? parseInt(stock, 10) : undefined,
        categoryId,
        brandId,
        is360Supported: is360Supported !== undefined ? !!is360Supported : undefined,
        seoTitle,
        seoDescription,
        seoKeywords,
        isActive: status !== undefined ? status === 'active' : undefined,
        isFeatured: isFeatured !== undefined ? !!isFeatured : undefined,
        codAvailable: codAvailable !== undefined ? !!codAvailable : undefined,
        baseShippingCharge: baseShippingCharge !== undefined ? parseFloat(baseShippingCharge) : undefined,
        estimatedDeliveryDays: estimatedDeliveryDays !== undefined ? parseInt(estimatedDeliveryDays, 10) : undefined,
        freeShippingEligible: freeShippingEligible !== undefined ? !!freeShippingEligible : undefined,
        bundleProducts: bundleProducts !== undefined ? (typeof bundleProducts === 'string' ? JSON.parse(bundleProducts) : bundleProducts) : undefined,
        recommendedFilaments: recommendedFilaments !== undefined ? (typeof recommendedFilaments === 'string' ? JSON.parse(recommendedFilaments) : recommendedFilaments) : undefined,
        variants: variants ? {
          create: (variants || []).map((v: any) => ({
            name: v.name,
            price: parseFloat(v.price),
            stock: parseInt(v.stock, 10),
            sku: v.sku,
          })),
        } : undefined,
        images: images ? {
          create: (images || []).map((i: any) => ({
            url: i.url,
            isPrimary: !!i.isPrimary,
          })),
        } : undefined,
      },
      include: {
        variants: true,
        images: true,
      },
    });

    return res.status(200).json(updated);
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
        data: { stock: 0 },
      });
      return res.status(200).json({ message: 'Soft deleted (inventory zeroed out)', data: softDeleted });
    }

    // Hard delete deletes deep references automatically due to Cascade onDelete models
    await prisma.product.delete({ where: { id } });
    return res.status(200).json({ message: 'Product SKU permanently deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: 'SKU deletion command failed', details: error.message });
  }
};
