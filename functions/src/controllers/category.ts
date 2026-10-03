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
import { invalidateExploreCache } from './exploreConfig';
import { clearHomepageCache } from './homepage';
import { clearProductCache } from './product';

export const clearCategoryCache = () => {
  sysCache.del('categories_tree');
  sysCache.del('categories_flat');
  sysCache.clearPattern('breadcrumbs_');
  sysCache.clearPattern('category_children_');
  sysCache.clearPattern('category_slug_');
  sysCache.clearPattern('category_id_');
  invalidateHeaderMenuCache();
  invalidateExploreCache();
  clearHomepageCache();
  clearProductCache();
  clearCache();
};

export const getCategoriesTree = async (req: Request, res: Response) => {
  try {
    let tree = sysCache.get('categories_tree') as CategoryNode[];
    if (!tree) {
      const all = await withDbRetry(() => prisma.category.findMany({
        where: { deletedAt: null },
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
        where: { deletedAt: null },
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
  const body = req.body || {};
  const name = body.name ? String(body.name).trim() : '';
  const rawSlug = body.slug ? String(body.slug).trim() : '';
  const slug = rawSlug || (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '');

  if (!name || !slug) {
    return res.status(400).json({ error: 'Category name and slug represent mandatory specifications' });
  }

  const parentId = body.parentId !== undefined ? body.parentId : body.parent_id;
  const description = body.description;
  const image = body.image;
  const banner = body.banner;
  const icon = body.icon;
  const sortOrder = body.sortOrder !== undefined ? body.sortOrder : body.sort_order;
  const isActive = body.isActive !== undefined ? body.isActive : body.is_active;
  const isFeatured = body.isFeatured !== undefined ? body.isFeatured : body.is_featured;
  const seoTitle = body.seoTitle !== undefined ? body.seoTitle : body.seo_title;
  const seoDescription = body.seoDescription !== undefined ? body.seoDescription : body.seo_description;
  const shippingCharge = body.shippingCharge !== undefined ? body.shippingCharge : body.shipping_charge;
  const estimatedDeliveryDays = body.estimatedDeliveryDays !== undefined ? body.estimatedDeliveryDays : body.estimated_delivery_days;
  const freeShippingEligible = body.freeShippingEligible !== undefined ? body.freeShippingEligible : body.free_shipping_eligible;
  const shippingRegion = body.shippingRegion !== undefined ? body.shippingRegion : body.shipping_region;
  const shippingMode = body.shippingMode !== undefined ? body.shippingMode : body.shipping_mode;
  const shippingRules = body.shippingRules !== undefined ? body.shippingRules : (body.shipping_rules || body.weightRules || body.weight_rules);
  const freeShippingThreshold = body.freeShippingThreshold !== undefined ? body.freeShippingThreshold : body.free_shipping_threshold;

  try {
    const createData: any = {
      name,
      slug,
      description: description !== undefined ? description : null,
      image: image !== undefined ? image : null,
      banner: banner !== undefined ? banner : null,
      icon: icon !== undefined ? icon : null,
      sortOrder: sortOrder !== undefined && sortOrder !== null && sortOrder !== '' ? Number(sortOrder) : 0,
      isActive: isActive !== undefined ? !!isActive : true,
      isFeatured: isFeatured !== undefined ? !!isFeatured : false,
      seoTitle: seoTitle !== undefined ? seoTitle : null,
      seoDescription: seoDescription !== undefined ? seoDescription : null,
      shippingCharge: shippingCharge !== undefined && shippingCharge !== null && shippingCharge !== '' ? Number(shippingCharge) : null,
      estimatedDeliveryDays: estimatedDeliveryDays !== undefined && estimatedDeliveryDays !== null && estimatedDeliveryDays !== '' ? encodeDays(estimatedDeliveryDays) : null,
      freeShippingEligible: freeShippingEligible !== undefined ? !!freeShippingEligible : false,
      shippingRegion: shippingRegion || null,
      shippingMode: shippingMode || 'default',
      shippingRules: Array.isArray(shippingRules) ? shippingRules : (typeof shippingRules === 'string' && shippingRules.trim() ? JSON.parse(shippingRules) : []),
      freeShippingThreshold: freeShippingThreshold !== undefined && freeShippingThreshold !== null && freeShippingThreshold !== '' ? Number(freeShippingThreshold) : null,
    };

    if (parentId && parentId !== 'null' && parentId !== 'undefined') {
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
  const body = req.body || {};

  try {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updateData: any = {};

    const name = body.name !== undefined ? String(body.name).trim() : undefined;
    if (name !== undefined && name !== '') {
      updateData.name = name;
    }

    if (body.slug !== undefined) {
      const rawSlug = String(body.slug).trim();
      if (rawSlug !== '') {
        updateData.slug = rawSlug;
      } else {
        const targetName = name || existing.name;
        updateData.slug = targetName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      }
    }

    if (body.description !== undefined) updateData.description = body.description;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.banner !== undefined) updateData.banner = body.banner;
    if (body.icon !== undefined) updateData.icon = body.icon;

    const sortOrder = body.sortOrder !== undefined ? body.sortOrder : body.sort_order;
    if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
      updateData.sortOrder = Number(sortOrder);
    }

    const isActive = body.isActive !== undefined ? body.isActive : body.is_active;
    if (isActive !== undefined) updateData.isActive = !!isActive;

    const isFeatured = body.isFeatured !== undefined ? body.isFeatured : body.is_featured;
    if (isFeatured !== undefined) updateData.isFeatured = !!isFeatured;

    const seoTitle = body.seoTitle !== undefined ? body.seoTitle : body.seo_title;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle;

    const seoDescription = body.seoDescription !== undefined ? body.seoDescription : body.seo_description;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription;

    const parentId = body.parentId !== undefined ? body.parentId : body.parent_id;
    if (parentId !== undefined) {
      if (parentId && parentId !== 'null' && parentId !== 'undefined') {
        updateData.parent = { connect: { id: parentId } };
      } else {
        updateData.parent = { disconnect: true };
      }
    }

    const shippingCharge = body.shippingCharge !== undefined ? body.shippingCharge : body.shipping_charge;
    if (shippingCharge !== undefined) {
      updateData.shippingCharge = shippingCharge !== null && shippingCharge !== '' ? Number(shippingCharge) : null;
    }

    const estimatedDeliveryDays = body.estimatedDeliveryDays !== undefined ? body.estimatedDeliveryDays : body.estimated_delivery_days;
    if (estimatedDeliveryDays !== undefined) {
      updateData.estimatedDeliveryDays = estimatedDeliveryDays !== null && estimatedDeliveryDays !== '' ? encodeDays(estimatedDeliveryDays) : null;
    }

    const freeShippingEligible = body.freeShippingEligible !== undefined ? body.freeShippingEligible : body.free_shipping_eligible;
    if (freeShippingEligible !== undefined) {
      updateData.freeShippingEligible = !!freeShippingEligible;
    }

    const shippingRegion = body.shippingRegion !== undefined ? body.shippingRegion : body.shipping_region;
    if (shippingRegion !== undefined) {
      updateData.shippingRegion = shippingRegion || null;
    }

    const shippingMode = body.shippingMode !== undefined ? body.shippingMode : body.shipping_mode;
    if (shippingMode !== undefined) {
      updateData.shippingMode = shippingMode;
    }

    const rawRules = body.shippingRules !== undefined ? body.shippingRules : (body.shipping_rules || body.weightRules || body.weight_rules);
    if (rawRules !== undefined) {
      let parsedRules = Array.isArray(rawRules) ? rawRules : (typeof rawRules === 'string' && rawRules.trim() ? JSON.parse(rawRules) : []);
      if (!Array.isArray(parsedRules)) parsedRules = [];
      updateData.shippingRules = parsedRules.map((r: any) => ({
        fromGrams: Number(r.fromGrams !== undefined ? r.fromGrams : (r.from_grams !== undefined ? r.from_grams : r.from)) || 0,
        toGrams: Number(r.toGrams !== undefined ? r.toGrams : (r.to_grams !== undefined ? r.to_grams : r.to)) || 0,
        charge: Number(r.charge !== undefined ? r.charge : r.fee) || 0
      }));
    }

    const freeShippingThreshold = body.freeShippingThreshold !== undefined ? body.freeShippingThreshold : body.free_shipping_threshold;
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
  if (!id) {
    return res.status(400).json({ success: false, error: 'Category ID is required' });
  }
  try {
    const existing = await prisma.category.findUnique({
      where: { id },
      include: {
        children: { select: { id: true } }
      }
    });
    if (!existing) {
      clearCategoryCache();
      return res.status(200).json({ success: true, message: 'Category structure permanently purged' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Re-parent direct child subcategories to this category's parent (or root/null)
      await tx.category.updateMany({
        where: { parentId: id },
        data: { parentId: existing.parentId || null }
      });

      // 2. Unlink junction product-categories mappings
      await tx.productCategory.deleteMany({
        where: { categoryId: id }
      });

      // 3. Unlink direct products categoryId
      await tx.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null }
      });

      // 4. Unlink homepage section items
      await tx.homepageSectionItem.deleteMany({
        where: { categoryId: id }
      });

      // 5. Delete category permanently
      await tx.category.delete({
        where: { id }
      });
    });

    clearCategoryCache();
    return res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      clearCategoryCache();
      return res.status(200).json({ success: true, message: 'Category deleted successfully' });
    }
    console.error('[CATEGORY DELETE ERROR]', error);
    return res.status(500).json({ success: false, error: 'Category purge command failed', details: error.message });
  }
};

export const toggleCategoryProductFeatured = async (req: Request, res: Response) => {
  const categoryId = req.params['categoryId'] || req.params['id'];
  const productId = req.params['productId'];
  const body = req.body || {};
  const featured = body.featured !== undefined ? !!body.featured : (body.isFeatured !== undefined ? !!body.isFeatured : true);

  if (!categoryId || !productId) {
    return res.status(400).json({ success: false, error: 'Category ID and Product ID are mandatory' });
  }

  try {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const updatedLink = await (prisma.productCategory as any).upsert({
      where: {
        productId_categoryId: {
          productId,
          categoryId
        }
      },
      update: {
        isFeatured: featured
      },
      create: {
        productId,
        categoryId,
        isFeatured: featured,
        isPrimary: product.categoryId === categoryId
      }
    });

    clearCategoryCache();

    return res.status(200).json({
      success: true,
      categoryId,
      productId,
      featured: updatedLink.isFeatured !== undefined ? updatedLink.isFeatured : featured
    });
  } catch (error: any) {
    console.error('[TOGGLE CATEGORY PRODUCT FEATURED ERROR]', error);
    return res.status(500).json({ success: false, error: 'Failed to update category product featured status', details: error.message });
  }
};

