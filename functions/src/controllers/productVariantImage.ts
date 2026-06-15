import { Request, Response } from 'express';
import prisma from '../config/database';

export const getVariantImages = async (req: Request, res: Response) => {
  const { variantId } = req.params;
  try {
    const images = await prisma.productVariantImage.findMany({
      where: { variantId },
      orderBy: { sortOrder: 'asc' },
    });
    return res.status(200).json({ success: true, data: images });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch variant images', details: error.message });
  }
};

export const uploadVariantImages = async (req: Request, res: Response) => {
  const { variantId } = req.params;
  const { images } = req.body; 
  if (!images || !images.length) {
    return res.status(400).json({ error: 'No images provided' });
  }

  try {
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    const createdImages = [];
    for (const img of images) {
      const created = await prisma.productVariantImage.create({
        data: {
          variantId,
          imageUrl: img.imageUrl,
          isPrimary: !!img.isPrimary,
          sortOrder: img.sortOrder || 0,
        }
      });
      createdImages.push(created);
    }
    return res.status(201).json({ success: true, data: createdImages });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to upload variant images', details: error.message });
  }
};

export const deleteVariantImage = async (req: Request, res: Response) => {
  const { imageId } = req.params;
  try {
    await prisma.productVariantImage.delete({ where: { id: imageId } });
    return res.status(200).json({ success: true, message: 'Image deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete variant image', details: error.message });
  }
};

export const setPrimaryVariantImage = async (req: Request, res: Response) => {
  const { imageId } = req.params;
  try {
    const img = await prisma.productVariantImage.findUnique({ where: { id: imageId } });
    if (!img) return res.status(404).json({ error: 'Image not found' });

    await prisma.$transaction([
      prisma.productVariantImage.updateMany({
        where: { variantId: img.variantId },
        data: { isPrimary: false }
      }),
      prisma.productVariantImage.update({
        where: { id: imageId },
        data: { isPrimary: true }
      })
    ]);
    return res.status(200).json({ success: true, message: 'Primary set' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to set primary', details: error.message });
  }
};
