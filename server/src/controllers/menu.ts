import { Request, Response } from 'express';
import prisma from '../config/database';

interface MenuItemNode {
  id: string;
  label: string;
  url: string | null;
  parentId: string | null;
  categoryId: string | null;
  brandId: string | null;
  sortOrder: number;
  category?: any;
  brand?: any;
  children: MenuItemNode[];
}

const buildMenuTree = (items: any[], parentId: string | null = null): MenuItemNode[] => {
  return items
    .filter(item => item.parentId === parentId)
    .map(item => ({
      id: item.id,
      label: item.label,
      url: item.url,
      parentId: item.parentId,
      categoryId: item.categoryId,
      brandId: item.brandId,
      sortOrder: item.sortOrder,
      category: item.category,
      brand: item.brand,
      children: buildMenuTree(items, item.id),
    }));
};

export const getMegaMenu = async (req: Request, res: Response) => {
  try {
    const all = await prisma.menuItem.findMany({
      include: {
        category: true,
        brand: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    const nested = buildMenuTree(all, null);
    return res.status(200).json(nested);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to build megamenu tree', details: error.message });
  }
};

export const getMenuItemsList = async (req: Request, res: Response) => {
  try {
    const list = await prisma.menuItem.findMany({
      include: {
        category: true,
        brand: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to access flatter menu links list', details: error.message });
  }
};

export const createMenuItem = async (req: Request, res: Response) => {
  const { label, url, parentId, categoryId, brandId, sortOrder } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'Display label Title represents a mandatory parameter' });
  }

  try {
    const created = await prisma.menuItem.create({
      data: {
        label,
        url,
        parentId: parentId || null,
        categoryId: categoryId || null,
        brandId: brandId || null,
        sortOrder: parseInt(sortOrder || '0', 10),
      },
      include: {
        category: true,
        brand: true,
      },
    });
    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to register navbar menu link', details: error.message });
  }
};

export const updateMenuItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { label, url, parentId, categoryId, brandId, sortOrder } = req.body;

  try {
    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        label,
        url,
        parentId: parentId || null,
        categoryId: categoryId || null,
        brandId: brandId || null,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : undefined,
      },
      include: {
        category: true,
        brand: true,
      },
    });
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to edit navbar menu item', details: error.message });
  }
};

export const deleteMenuItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.menuItem.delete({ where: { id } });
    return res.status(200).json({ message: 'Navbar link and its sub-branches successfully purged' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Navbar item purge failed', details: error.message });
  }
};
