import { Request, Response } from 'express';
import prisma from '../config/database';

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
        images: {
          orderBy: {
            sortOrder: 'asc'
          }
        },
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
        options: { include: { values: true } },
        variants: { include: { options: true, images: true } },
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
        options: { include: { values: true } },
        variants: { include: { options: true, images: true } },
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
    variants, options, images, specifications, downloads, features, faqs, warranty, shipping
  } = req.body;

  if (!name || !slug || !sku) {
    return res.status(400).json({ error: 'Missing core mandatory parameters for SKU launch' });
  }

  try {
    const parsedImages = safeParseArray(images);
    const parsedVariants = safeParseArray(variants);
    const parsedSpecs = safeParseArray(specifications);
    const parsedDownloads = safeParseArray(downloads);
    const parsedFeatures = safeParseArray(features);
    const parsedFaqs = safeParseArray(faqs);
    const parsedOptions = safeParseArray(options);
    const parsedWarranty = safeParseObject(warranty);
    const parsedShipping = safeParseObject(shipping);

    const validImages = parsedImages.map((img: any) => {
      if (!img) return null;
      if (typeof img === 'string') {
        return { url: img, isPrimary: false, sortOrder: 0 };
      }
      return {
        url: img.url || img.imageUrl || '',
        isPrimary: !!img.isPrimary,
        sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : 0
      };
    }).filter((img: any) => img && img.url.trim().length > 0) as any[];

    const validVariants = parsedVariants.filter((v: any) => v?.name && v?.sku);
    const validSpecs = parsedSpecs.filter((s: any) => s?.name && s?.value);
    const validDownloads = parsedDownloads.filter((d: any) => d?.title && d?.fileUrl);
    const validFeatures = parsedFeatures.filter((f: any) => f?.title);
    const validFaqs = parsedFaqs.filter((f: any) => f?.question && f?.answer);

    // Ensure categoryId and brandId are actual UUIDs. If they are not (e.g. they are names or slugs), we should ideally look them up.
    // For now, if they are provided, we will assume they are IDs or handle gracefully if Prisma fails.
    let resolvedCategoryId = categoryId || null;
    let resolvedBrandId = brandId || null;

    if (resolvedCategoryId && !resolvedCategoryId.includes('-')) {
      const cat = await prisma.category.findFirst({ where: { OR: [{ slug: resolvedCategoryId }, { name: resolvedCategoryId }] } });
      if (cat) resolvedCategoryId = cat.id;
      else resolvedCategoryId = null;
    }

    if (resolvedBrandId && !resolvedBrandId.includes('-')) {
      const brand = await prisma.brand.findFirst({ where: { OR: [{ slug: resolvedBrandId }, { name: resolvedBrandId }] } });
      if (brand) resolvedBrandId = brand.id;
      else resolvedBrandId = null;
    }

    const created = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name, slug, sku, description,
          basePrice: parseFloat(mrp) || 0,
          salePrice: parseFloat(salePrice) || 0,
          dealerPrice: parseFloat(dealerPrice) || 0,
          categoryId: resolvedCategoryId || null,
          brandId: resolvedBrandId || null,
          seo: {
            create: { seoTitle, seoDescription, seoKeywords }
          },
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
          ...(parsedWarranty?.warrantyPeriod && {
            warranty: {
              create: {
                warrantyPeriod: parsedWarranty.warrantyPeriod,
                warrantyType: parsedWarranty.warrantyType,
                warrantyDescription: parsedWarranty.warrantyDescription
              }
            }
          }),
          ...(parsedShipping?.deliveryTime && {
            shipping: {
              create: {
                deliveryTime: parsedShipping.deliveryTime,
                shippingCharges: parsedShipping.shippingCharges ? parseFloat(parsedShipping.shippingCharges) : undefined,
                shippingRegions: parsedShipping.shippingRegions
              }
            }
          }),
        }
      });

      // Handle Options and Variants correctly via deep mappings
      const validOptions = parsedOptions.filter((o: any) => o?.name && o?.values?.length > 0);
      const optionValueMapping: Record<string, string> = {}; // Hash map

      if (validOptions.length > 0) {
          for (const opt of validOptions) {
              const createdOpt = await tx.productOption.create({
                  data: {
                      productId: p.id,
                      name: opt.name,
                      sortOrder: opt.sortOrder || 0,
                      displayType: 'select',
                      values: {
                          create: opt.values.map((v: any, vId: number) => ({
                              value: v.value,
                              displayValue: v.displayValue || v.value,
                              sortOrder: v.sortOrder || vId
                          }))
                      }
                  },
                  include: { values: true }
              });

              for (const v of createdOpt.values) {
                  optionValueMapping[`${opt.name}:${v.value}`] = v.id;
              }
          }
      }

      if (validVariants.length > 0) {
          for (const v of validVariants) {
              const createdVariant = await tx.productVariant.create({
                  data: {
                      productId: p.id,
                      name: v.name,
                      sku: v.sku,
                      price: parseFloat(v.price) || 0,
                      stock: v.stock || 0,
                      weight: v.weight || 0,
                  }
              });

              if (v.optionsData && Array.isArray(v.optionsData)) {
                  for (const od of v.optionsData) {
                      const valId = optionValueMapping[`${od.optionName}:${od.valueStr}`];
                      if (valId) {
                          await tx.productVariantOption.create({
                              data: {
                                  variantId: createdVariant.id,
                                  optionValueId: valId
                              }
                          });
                      }
                  }
              }

              if (v.images && Array.isArray(v.images)) {
                  for (const img of v.images) {
                      await tx.productVariantImage.create({
                          data: {
                              variantId: createdVariant.id,
                              imageUrl: img.url || img.imageUrl,
                              isPrimary: !!img.isPrimary,
                              sortOrder: img.sortOrder || 0
                          }
                      });
                  }
              }
          }
      }

      return tx.product.findUnique({ where: { id: p.id }, include: { variants: { include: { options: true, images: true } }, options: { include: { values: true } }, images: true, specifications: true, downloads: true, features: true, faqs: true, warranty: true, shipping: true }});
    }, {
      timeout: 30000
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
    variants, options, images, specifications, downloads, features, faqs, warranty, shipping
  } = req.body;

  try {
    const parsedImages = safeParseArray(images);
    const parsedVariants = safeParseArray(variants);
    const parsedSpecs = safeParseArray(specifications);
    const parsedDownloads = safeParseArray(downloads);
    const parsedFeatures = safeParseArray(features);
    const parsedFaqs = safeParseArray(faqs);
    const parsedOptions = safeParseArray(options);
    const parsedWarranty = safeParseObject(warranty);
    const parsedShipping = safeParseObject(shipping);

    const validImages = parsedImages.map((img: any) => {
      if (!img) return null;
      if (typeof img === 'string') {
        return { url: img, isPrimary: false, sortOrder: 0 };
      }
      return {
        url: img.url || img.imageUrl || '',
        isPrimary: !!img.isPrimary,
        sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : 0
      };
    }).filter((img: any) => img && img.url.trim().length > 0) as any[];

    const validVariants = parsedVariants.filter((v: any) => v?.name && v?.sku);
    const validSpecs = parsedSpecs.filter((s: any) => s?.name && s?.value);
    const validDownloads = parsedDownloads.filter((d: any) => d?.title && d?.fileUrl);
    const validFeatures = parsedFeatures.filter((f: any) => f?.title);
    const validFaqs = parsedFaqs.filter((f: any) => f?.question && f?.answer);

    let resolvedCategoryId = categoryId || undefined;
    let resolvedBrandId = brandId || undefined;

    if (resolvedCategoryId && !resolvedCategoryId.includes('-')) {
      const cat = await prisma.category.findFirst({ where: { OR: [{ slug: resolvedCategoryId }, { name: resolvedCategoryId }] } });
      if (cat) resolvedCategoryId = cat.id;
      else resolvedCategoryId = undefined;
    }

    if (resolvedBrandId && !resolvedBrandId.includes('-')) {
      const brand = await prisma.brand.findFirst({ where: { OR: [{ slug: resolvedBrandId }, { name: resolvedBrandId }] } });
      if (brand) resolvedBrandId = brand.id;
      else resolvedBrandId = undefined;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing child relations before updates to prevent dangling keys
      if (options) await tx.productOption.deleteMany({ where: { productId: id } }); // this cascades to option values and variant options
      if (variants) await tx.productVariant.deleteMany({ where: { productId: id } });
      if (images) await tx.productImage.deleteMany({ where: { productId: id } });
      if (specifications) await tx.productSpecification.deleteMany({ where: { productId: id } });
      if (downloads) await tx.productDownload.deleteMany({ where: { productId: id } });
      if (features) await tx.productFeature.deleteMany({ where: { productId: id } });
      if (faqs) await tx.productFaq.deleteMany({ where: { productId: id } });

      const p = await tx.product.update({
        where: { id },
        data: {
          name, slug, sku, description,
          basePrice: mrp ? parseFloat(mrp) : undefined,
          salePrice: salePrice ? parseFloat(salePrice) : undefined,
          dealerPrice: dealerPrice ? parseFloat(dealerPrice) : undefined,
          categoryId: resolvedCategoryId || null,
          brandId: resolvedBrandId || null,
          seo: {
            upsert: {
              create: { seoTitle, seoDescription, seoKeywords },
              update: { seoTitle, seoDescription, seoKeywords }
            }
          },
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
          ...(parsedWarranty?.warrantyPeriod && {
            warranty: {
              upsert: {
                create: {
                  warrantyPeriod: parsedWarranty.warrantyPeriod,
                  warrantyType: parsedWarranty.warrantyType,
                  warrantyDescription: parsedWarranty.warrantyDescription
                },
                update: {
                  warrantyPeriod: parsedWarranty.warrantyPeriod,
                  warrantyType: parsedWarranty.warrantyType,
                  warrantyDescription: parsedWarranty.warrantyDescription
                }
              }
            }
          }),
          ...(parsedShipping?.deliveryTime && {
            shipping: {
              upsert: {
                create: {
                  deliveryTime: parsedShipping.deliveryTime,
                  shippingCharges: parsedShipping.shippingCharges ? parseFloat(parsedShipping.shippingCharges) : undefined,
                  shippingRegions: parsedShipping.shippingRegions
                },
                update: {
                  deliveryTime: parsedShipping.deliveryTime,
                  shippingCharges: parsedShipping.shippingCharges ? parseFloat(parsedShipping.shippingCharges) : undefined,
                  shippingRegions: parsedShipping.shippingRegions
                }
              }
            }
          }),
        }
      });

      // Handle Options and Variants correctly via deep mappings
      const validOptions = parsedOptions.filter((o: any) => o?.name && o?.values?.length > 0);
      const optionValueMapping: Record<string, string> = {}; // Hash map

      if (validOptions.length > 0) {
          for (const opt of validOptions) {
              const createdOpt = await tx.productOption.create({
                  data: {
                      productId: id,
                      name: opt.name,
                      sortOrder: opt.sortOrder || 0,
                      displayType: 'select',
                      values: {
                          create: opt.values.map((v: any, vId: number) => ({
                              value: v.value,
                              displayValue: v.displayValue || v.value,
                              sortOrder: v.sortOrder || vId
                          }))
                      }
                  },
                  include: { values: true }
              });

              for (const v of createdOpt.values) {
                  optionValueMapping[`${opt.name}:${v.value}`] = v.id;
              }
          }
      }

      if (validVariants.length > 0) {
          for (const v of validVariants) {
              const createdVariant = await tx.productVariant.create({
                  data: {
                      productId: id,
                      name: v.name,
                      sku: v.sku,
                      price: parseFloat(v.price) || 0,
                      stock: v.stock || 0,
                      weight: v.weight || 0,
                  }
              });

              if (v.optionsData && Array.isArray(v.optionsData)) {
                  for (const od of v.optionsData) {
                      const valId = optionValueMapping[`${od.optionName}:${od.valueStr}`];
                      if (valId) {
                          await tx.productVariantOption.create({
                              data: {
                                  variantId: createdVariant.id,
                                  optionValueId: valId
                              }
                          });
                      }
                  }
              }

              if (v.images && Array.isArray(v.images)) {
                  for (const img of v.images) {
                      await tx.productVariantImage.create({
                          data: {
                              variantId: createdVariant.id,
                              imageUrl: img.url || img.imageUrl,
                              isPrimary: !!img.isPrimary,
                              sortOrder: img.sortOrder || 0
                          }
                      });
                  }
              }
          }
      }

      return tx.product.findUnique({ where: { id }, include: { variants: { include: { options: true, images: true } }, options: { include: { values: true } }, images: true, specifications: true, downloads: true, features: true, faqs: true, warranty: true, shipping: true }});
    }, {
      timeout: 30000
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
