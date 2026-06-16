import { Request, Response } from 'express';
import prisma from '../config/database';

interface MenuItemNode {
  id: string;
  label: string;
  url: string | null;
  parentId: string | null;
  sortOrder: number;
  children: MenuItemNode[];
}

const buildMenuTree = (items: any[], parentId: string | null = null): MenuItemNode[] => {
  return items
    .filter(item => item.parentId === parentId)
    .map(item => ({
      id: item.id,
      label: item.title, // Map Prisma title to frontend label
      url: item.url,
      parentId: item.parentId,
      sortOrder: item.sortOrder,
      children: buildMenuTree(items, item.id),
    }));
};

export const getMegaMenu = async (req: Request, res: Response) => {
  try {
    const all = await prisma.menuItem.findMany({
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
      orderBy: { sortOrder: 'asc' },
    });
    // For frontend list, maybe map title to label too
    const mapped = list.map(item => ({ ...item, label: item.title }));
    return res.status(200).json(mapped);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to access flatter menu links list', details: error.message });
  }
};

export const createMenuItem = async (req: Request, res: Response) => {
  const { label, url, parentId, sortOrder, menuId } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'Display label Title represents a mandatory parameter' });
  }

  try {
    let activeMenuId = menuId;
    if (!activeMenuId) {
      let main = await prisma.menu.findFirst();
      if (!main) {
        main = await prisma.menu.create({
          data: { name: 'Header Main Menu', location: 'HEADER' }
        });
      }
      activeMenuId = main.id;
    }

    const created = await prisma.menuItem.create({
      data: {
        title: label,
        url,
        parentId: parentId || null,
        menuId: activeMenuId,
        sortOrder: parseInt(sortOrder || '0', 10),
      },
    });
    return res.status(201).json({...created, label: created.title});
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to register navbar menu link', details: error.message });
  }
};

export const updateMenuItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { label, url, parentId, sortOrder } = req.body;

  try {
    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        title: label,
        url,
        parentId: parentId || null,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : undefined,
      },
    });
    return res.status(200).json({...updated, label: updated.title});
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

