import { Request, Response } from 'express';
import prisma from '../config/database';

export const getHomepageSections = async (req: Request, res: Response) => {
  try {
    const sections = await prisma.homepageSection.findMany({
      orderBy: { sequence: 'asc' },
    });
    return res.status(200).json(sections);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to access homepage layout configurations', details: error.message });
  }
};

export const getFrontendLayout = async (req: Request, res: Response) => {
  try {
    const list = await prisma.homepageSection.findMany({
      where: { isVisible: true },
      orderBy: { sequence: 'asc' },
    });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to compile public storefront layout', details: error.message });
  }
};

export const createHomepageSection = async (req: Request, res: Response) => {
  const { name, type, sequence, isVisible, content } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and structural type are required parameters' });
  }

  try {
    const created = await prisma.homepageSection.create({
      data: {
        name,
        type,
        sequence: parseInt(sequence || '0', 10),
        isVisible: isVisible !== undefined ? !!isVisible : true,
        content: content || {},
      },
    });
    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to record layout section', details: error.message });
  }
};

export const updateHomepageSection = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, type, sequence, isVisible, content } = req.body;

  try {
    const updated = await prisma.homepageSection.update({
      where: { id },
      data: {
        name,
        type,
        sequence: sequence !== undefined ? parseInt(sequence, 10) : undefined,
        isVisible: isVisible !== undefined ? !!isVisible : undefined,
        content: content || undefined,
      },
    });
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to alter layout section details', details: error.message });
  }
};

export const deleteHomepageSection = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.homepageSection.delete({ where: { id } });
    return res.status(200).json({ message: 'Homepage layout section successfully deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: 'layout section deletion command halted', details: error.message });
  }
};
