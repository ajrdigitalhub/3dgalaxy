import { Request, Response } from 'express';
import prisma, { withDbRetry } from '../config/database';
import { clearCache } from '../middleware/cache';
import { sysCache } from '../config/cache';
import { encodeDays } from '../utils/delivery';

// Helper to construct recursively nested tree paths
interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string | null;
  parentId: string | null;
  children: CategoryNode[];
}

const buildCategoryTree = (
  categories: any[],
  parentId: string | null = null
): CategoryNode[] => {
  return categories
    .filter(cat => cat.parentId === parentId)
    .map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image,
      description: cat.description,
      parentId: cat.parentId,
      children: buildCategoryTree(categories, cat.id),
    }));
};

import { invalidateHeaderMenuCache } from './headerMenu';

export const clearCategoryCache = () => {
  sysCache.del('categories_tree');
  sysCache.del('categories_flat');
  sysCache.clearPattern('breadcrumbs_');
  sysCache.clearPattern('category_children_');
  sysCache.clearPattern('category_slug_');
  sysCache.clearPattern('category_id_');
  invalidateHeaderMenuCache();
  clearCache();
};

export const getCategoriesTree = async (req: Request, res: Response) => {
  try {
    let tree = sysCache.get('categories_tree') as CategoryNode[];
    if (!tree) {
      const all = await withDbRetry(() => prisma.category.findMany({
        orderBy: { name: 'asc' },
      }));
      tree = buildCategoryTree(all, null);
      sysCache.set('categories_tree', tree, 1800); // 30 minutes cache
    }
    return res.status(200).json(tree);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to build category tree', details: error.message });
  }
};

export const getCategoryBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const cacheKey = `category_slug_${slug}`;
  try {
    let category = sysCache.get(cacheKey);
    if (!category) {
      const cat = await prisma.category.findUnique({
        where: { slug },
        include: {
          children: {
            where: { isActive: true, deletedAt: null },
            orderBy: { name: 'asc' }
          }
        }
      });
      if (!cat) return res.status(404).json({ error: 'Category not found' });

      // Fetch distinct brands & product count for category catalog
      const productMatches = await prisma.product.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [
            { categoryId: cat.id },
            { productCategories: { some: { categoryId: cat.id } } }
          ]
        },
        select: {
          id: true,
          brand: {
            select: { id: true, name: true, slug: true, logo: true }
          }
        }
      });

      const productCount = productMatches.length;
      const brandMap = new Map<string, any>();
      productMatches.forEach(p => {
        if (p.brand && !brandMap.has(p.brand.id)) {
          brandMap.set(p.brand.id, p.brand);
        }
      });
      const brands = Array.from(brandMap.values());

      category = {
        ...cat,
        productCount,
        brands,
        subcategories: cat.children || []
      };

      sysCache.set(cacheKey, category, 1800);
    }
    return res.status(200).json(category);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch category', details: error.message });
  }
};

export const getBreadcrumbsBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const cacheKey = `breadcrumbs_slug_${slug}`;
  try {
    let breadcrumbs = sysCache.get(cacheKey);
    if (breadcrumbs) return res.status(200).json(breadcrumbs);

    breadcrumbs = [];
    const leafCategory = await prisma.category.findUnique({ where: { slug } });
    if (!leafCategory) return res.status(404).json({ error: 'Category not found' });

    let currentId: string | null = leafCategory.id;

    while (currentId) {
      const cat: any = await prisma.category.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, slug: true, parentId: true },
      });

      if (!cat) break;

      breadcrumbs.unshift({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
      });

      currentId = cat.parentId;
    }

    sysCache.set(cacheKey, breadcrumbs, 1800);
    return res.status(200).json(breadcrumbs);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to trace breadcrumbs pathway', details: error.message });
  }
};

export const getBreadcrumbs = async (req: Request, res: Response) => {
  const { id } = req.params;
  const cacheKey = `breadcrumbs_id_${id}`;
  try {
    let breadcrumbs = sysCache.get(cacheKey);
    if (breadcrumbs) return res.status(200).json(breadcrumbs);

    breadcrumbs = [];
    let currentId: string | null = id;

    while (currentId) {
      const cat: any = await prisma.category.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, slug: true, parentId: true },
      });

      if (!cat) break;

      breadcrumbs.unshift({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
      });

      currentId = cat.parentId;
    }

    sysCache.set(cacheKey, breadcrumbs, 1800);
    return res.status(200).json(breadcrumbs);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to trace breadcrumbs pathway', details: error.message });
  }
};

export const getDirectChildren = async (req: Request, res: Response) => {
  const { parentId } = req.params;
  const targetParentId = parentId === 'root' ? null : parentId;
  const cacheKey = `category_children_${targetParentId || 'root'}`;
  try {
    let list = sysCache.get(cacheKey);
    if (!list) {
      list = await withDbRetry(() => prisma.category.findMany({
        where: { parentId: targetParentId },
        orderBy: { name: 'asc' },
      }));
      sysCache.set(cacheKey, list, 1800);
    }
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch child subcategories', details: error.message });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    let list = sysCache.get('categories_flat');
    if (!list) {
      list = await withDbRetry(() => prisma.category.findMany({
        orderBy: { createdAt: 'desc' },
      }));
      sysCache.set('categories_flat', list, 1800);
    }
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to access flatter category listing', details: error.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  const { name, slug, parentId, description, image, banner, icon, sortOrder, isActive, isFeatured, seoTitle, seoDescription, shippingCharge, estimatedDeliveryDays, freeShippingEligible, shippingRegion, shippingMode, shippingRules, freeShippingThreshold } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'Category name and slug represent mandatory specifications' });
  }

  try {
    const createData: any = {
      name,
      slug,
      description,
      image,
      banner,
      icon,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
      isActive: isActive !== undefined ? !!isActive : undefined,
      isFeatured: isFeatured !== undefined ? !!isFeatured : undefined,
      seoTitle,
      seoDescription,
      shippingCharge: shippingCharge !== undefined && shippingCharge !== null && shippingCharge !== '' ? Number(shippingCharge) : null,
      estimatedDeliveryDays: estimatedDeliveryDays !== undefined && estimatedDeliveryDays !== null && estimatedDeliveryDays !== '' ? encodeDays(estimatedDeliveryDays) : undefined,
      freeShippingEligible: freeShippingEligible !== undefined ? !!freeShippingEligible : undefined,
      shippingRegion: shippingRegion || null,
      shippingMode: shippingMode || 'default',
      shippingRules: Array.isArray(shippingRules) ? shippingRules : typeof shippingRules === 'string' ? JSON.parse(shippingRules) : [],
      freeShippingThreshold: freeShippingThreshold !== undefined && freeShippingThreshold !== null && freeShippingThreshold !== '' ? Number(freeShippingThreshold) : null,
    };

    if (parentId && parentId !== 'null') {
      createData.parent = { connect: { id: parentId } };
    }

    const created = await (prisma.category as any).create({
      data: createData,
    });
    clearCategoryCache();
    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ error: 'Category creation stalled', details: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, slug, parentId, description, image, banner, icon, sortOrder, isActive, isFeatured, seoTitle, seoDescription, shippingCharge, estimatedDeliveryDays, freeShippingEligible, shippingRegion, shippingMode, shippingRules, freeShippingThreshold } = req.body;

  try {
    const updateData: any = {
      name,
      slug,
      description,
      image,
      banner,
      icon,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
      isActive: isActive !== undefined ? !!isActive : undefined,
      isFeatured: isFeatured !== undefined ? !!isFeatured : undefined,
      seoTitle,
      seoDescription,
      shippingCharge: shippingCharge !== undefined && shippingCharge !== null && shippingCharge !== '' ? Number(shippingCharge) : null,
      estimatedDeliveryDays: estimatedDeliveryDays !== undefined && estimatedDeliveryDays !== null && estimatedDeliveryDays !== '' ? encodeDays(estimatedDeliveryDays) : undefined,
      freeShippingEligible: freeShippingEligible !== undefined ? !!freeShippingEligible : undefined,
      shippingRegion: shippingRegion || null,
    };

    if (parentId !== undefined) {
      if (parentId && parentId !== 'null') {
        updateData.parent = { connect: { id: parentId } };
      } else {
        updateData.parent = { disconnect: true };
      }
    }

    const rawMode = shippingMode || req.body.shipping_mode;
    if (rawMode !== undefined) {
      updateData.shippingMode = rawMode;
    }

    const rawRules = shippingRules !== undefined ? shippingRules : (req.body.shipping_rules || req.body.weightRules || req.body.weight_rules);
    if (rawRules !== undefined) {
      let parsedRules = Array.isArray(rawRules) ? rawRules : (typeof rawRules === 'string' && rawRules.trim() ? JSON.parse(rawRules) : []);
      if (!Array.isArray(parsedRules)) parsedRules = [];
      updateData.shippingRules = parsedRules.map((r: any) => ({
        fromGrams: Number(r.fromGrams !== undefined ? r.fromGrams : (r.from_grams !== undefined ? r.from_grams : r.from)) || 0,
        toGrams: Number(r.toGrams !== undefined ? r.toGrams : (r.to_grams !== undefined ? r.to_grams : r.to)) || 0,
        charge: Number(r.charge !== undefined ? r.charge : r.fee) || 0
      }));
    }
    if (freeShippingThreshold !== undefined) {
      updateData.freeShippingThreshold = freeShippingThreshold !== null && freeShippingThreshold !== '' ? Number(freeShippingThreshold) : null;
    }

    const updated = await (prisma.category as any).update({
      where: { id },
      data: updateData,
    });
    clearCategoryCache();
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Category modification failed', details: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.category.delete({ where: { id } });
    clearCategoryCache();
    return res.status(200).json({ message: 'Category structure permanently purged' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Category purge command failed', details: error.message });
  }
};
