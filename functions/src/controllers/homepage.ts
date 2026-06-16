import { Request, Response } from 'express';
import prisma from '../config/database';

export const getHomepageSections = async (req: Request, res: Response) => {
  try {
    const sections = await prisma.homepageSection.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return res.status(200).json(sections);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to access homepage layout configurations', details: error.message });
  }
};

export const getFrontendLayout = async (req: Request, res: Response) => {
  try {
    const list = await prisma.homepageSection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to compile public storefront layout', details: error.message });
  }
};

export const createHomepageSection = async (req: Request, res: Response) => {
  const { name, type, sequence, isVisible } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and structural type are required parameters' });
  }

  try {
    const created = await prisma.homepageSection.create({
      data: {
        name,
        type,
        sortOrder: parseInt(sequence || '0', 10),
        isActive: isVisible !== undefined ? !!isVisible : true,
      },
    });
    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to record layout section', details: error.message });
  }
};

function toValidUuid(id: string): string {
  if (!id) return '00000000-0000-0000-0000-000000000000';
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (uuidRegex.test(id)) {
    return id.toLowerCase();
  }
  const idMap: { [key: string]: string } = {
    'hero-1': '11111111-1111-1111-1111-111111111111',
    'cat-2': '22222222-2222-2222-2222-222222222222',
    'feat-3': '33333333-3333-3333-3333-333333333333',
    'best-4': '44444444-4444-4444-4444-444444444444',
    'brands-5': '55555555-5555-5555-5555-555555555555'
  };
  if (idMap[id]) {
    return idMap[id];
  }
  let clean = id.replace(/[^a-fA-F0-9]/g, '');
  if (clean.length < 32) {
    clean = clean.padEnd(32, '0');
  } else {
    clean = clean.slice(0, 32);
  }
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`.toLowerCase();
}

export const updateHomepageSection = async (req: Request, res: Response) => {
  const { id } = req.params;
  const mappedId = toValidUuid(id);
  const { name, type, sequence, isVisible } = req.body;

  try {
    const updated = await prisma.homepageSection.update({
      where: { id: mappedId },
      data: {
        name,
        type,
        sortOrder: sequence !== undefined ? parseInt(sequence, 10) : undefined,
        isActive: isVisible !== undefined ? !!isVisible : undefined,
      },
    });
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to alter layout section details', details: error.message });
  }
};

export const deleteHomepageSection = async (req: Request, res: Response) => {
  const { id } = req.params;
  const mappedId = toValidUuid(id);
  try {
    await prisma.homepageSection.delete({ where: { id: mappedId } });
    return res.status(200).json({ message: 'Homepage layout section successfully deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: 'layout section deletion command halted', details: error.message });
  }
};
