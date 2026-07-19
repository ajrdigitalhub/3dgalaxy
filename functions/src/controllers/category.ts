import { Request, Response } from 'express';
import prisma from '../config/database';
import { clearCache } from '../middleware/cache';
import { sysCache } from '../config/cache';

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

export const clearCategoryCache = () => {
  sysCache.del('categories_tree');
  sysCache.del('categories_flat');
  sysCache.clearPattern('breadcrumbs_');
  sysCache.clearPattern('category_children_');
  sysCache.clearPattern('category_slug_');
  sysCache.clearPattern('category_id_');
  clearCache();
};

export const getCategoriesTree = async (req: Request, res: Response) => {
  try {
    let tree = sysCache.get('categories_tree') as CategoryNode[];
    if (!tree) {
      const all = await prisma.category.findMany({
        orderBy: { name: 'asc' },
      });
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
      category = await prisma.category.findUnique({
        where: { slug }
      });
      if (!category) return res.status(404).json({ error: 'Category not found' });
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
      list = await prisma.category.findMany({
        where: { parentId: targetParentId },
        orderBy: { name: 'asc' },
      });
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
      list = await prisma.category.findMany({
        orderBy: { createdAt: 'desc' },
      });
      sysCache.set('categories_flat', list, 1800);
    }
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to access flatter category listing', details: error.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  const { name, slug, parentId, description, image, banner, icon, sortOrder, isActive, isFeatured, seoTitle, seoDescription } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'Category name and slug represent mandatory specifications' });
  }

  try {
    const created = await prisma.category.create({
      data: {
        name,
        slug,
        parentId: parentId || null,
        description,
        image,
        banner,
        icon,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
        isFeatured: isFeatured !== undefined ? !!isFeatured : undefined,
        seoTitle,
        seoDescription,
      },
    });
    clearCategoryCache();
    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ error: 'Category creation stalled', details: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, slug, parentId, description, image, banner, icon, sortOrder, isActive, isFeatured, seoTitle, seoDescription } = req.body;

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        parentId: parentId || null,
        description,
        image,
        banner,
        icon,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
        isFeatured: isFeatured !== undefined ? !!isFeatured : undefined,
        seoTitle,
        seoDescription,
      },
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
