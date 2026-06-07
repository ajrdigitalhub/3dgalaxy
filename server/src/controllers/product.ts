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

export const createProduct = async (req: Request, res: Response) => {
  const {
    name,
    slug,
    sku,
    description,
    mrp,
    salePrice,
    dealerPrice,
    stock,
    categoryId,
    brandId,
    is360Supported,
    seoTitle,
    seoDescription,
    seoKeywords,
    variants, // Array: [{name, price, stock, sku}]
    images,   // Array: [{url, isPrimary}]
  } = req.body;

  if (!name || !slug || !sku || !categoryId || !brandId) {
    return res.status(400).json({ error: 'Missing core mandatory parameters for SKU launch' });
  }

  try {
    const created = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        description,
        mrp: parseFloat(mrp),
        salePrice: parseFloat(salePrice),
        dealerPrice: parseFloat(dealerPrice),
        stock: parseInt(stock, 10),
        categoryId,
        brandId,
        is360Supported: !!is360Supported,
        seoTitle,
        seoDescription,
        seoKeywords,
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
    stock,
    categoryId,
    brandId,
    is360Supported,
    seoTitle,
    seoDescription,
    seoKeywords,
    variants,
    images,
  } = req.body;

  try {
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
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        dealerPrice: dealerPrice ? parseFloat(dealerPrice) : undefined,
        stock: stock ? parseInt(stock, 10) : undefined,
        categoryId,
        brandId,
        is360Supported: is360Supported !== undefined ? !!is360Supported : undefined,
        seoTitle,
        seoDescription,
        seoKeywords,
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
