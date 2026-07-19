import { Request, Response } from 'express';
import prisma from '../config/database';
import { clearCache } from '../middleware/cache';
import { sysCache } from '../config/cache';

export const clearBrandCache = () => {
  sysCache.del('brands_list');
  sysCache.clearPattern('brand_slug_');
  sysCache.clearPattern('brand_id_');
  clearCache();
};

export const getBrands = async (req: Request, res: Response) => {
  try {
    let list = sysCache.get('brands_list');
    if (!list) {
      list = await prisma.brand.findMany({
        orderBy: { name: 'asc' },
      });
      sysCache.set('brands_list', list, 1800); // 30 minutes cache
    }
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to access brands catalog', details: error.message });
  }
};

export const getBrandBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const cacheKey = `brand_slug_${slug}`;
  try {
    let brand = sysCache.get(cacheKey);
    if (!brand) {
      brand = await prisma.brand.findUnique({ where: { slug } });
      if (!brand) return res.status(404).json({ error: 'Brand not found' });
      sysCache.set(cacheKey, brand, 1800);
    }
    return res.status(200).json(brand);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch brand', details: error.message });
  }
};

export const getBrandById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const cacheKey = `brand_id_${id}`;
  try {
    let brand = sysCache.get(cacheKey);
    if (!brand) {
      brand = await prisma.brand.findUnique({ where: { id } });
      if (!brand) {
        return res.status(404).json({ error: 'Brand logo index missing' });
      }
      sysCache.set(cacheKey, brand, 1800);
    }
    return res.status(200).json(brand);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to read brand index', details: error.message });
  }
};

export const createBrand = async (req: Request, res: Response) => {
  const { name, slug, logo, description } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'Manufacturer name and brand URL slug represent required inputs' });
  }

  try {
    const created = await prisma.brand.create({
      data: {
        name,
        slug,
        logo,
        description,
      },
    });
    clearBrandCache();
    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to record brand node', details: error.message });
  }
};

export const updateBrand = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, slug, logo, description } = req.body;

  try {
    const updated = await prisma.brand.update({
      where: { id },
      data: {
        name,
        slug,
        logo,
        description,
      },
    });
    clearBrandCache();
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update brand metadata', details: error.message });
  }
};

export const deleteBrand = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.brand.delete({ where: { id } });
    clearBrandCache();
    return res.status(200).json({ message: 'Brand registration completely deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Brand deletion operation halted', details: error.message });
  }
};
