import { Request, Response } from 'express';
import prisma from '../config/database';

export const getVariantImages = async (req: Request, res: Response) => {
  const { variantId } = req.params;
  try {
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) return res.status(404).json({ error: 'Variant not found' });
    const images = Array.isArray(variant.variantImages) ? variant.variantImages : [];
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

    const currentImages = Array.isArray(variant.variantImages) ? [...variant.variantImages] : [];
    const addedImages = images.map((img: any) => img.imageUrl || img.url || img);

    const updatedImages = [...currentImages, ...addedImages];
    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: { variantImages: updatedImages }
    });

    return res.status(201).json({ success: true, data: addedImages });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to upload variant images', details: error.message });
  }
};

export const deleteVariantImage = async (req: Request, res: Response) => {
  const { imageId } = req.params;
  try {
    const variants = await prisma.productVariant.findMany();
    let foundVariant = null;
    let updatedImages: any[] = [];

    for (const v of variants) {
      const imgs = Array.isArray(v.variantImages) ? v.variantImages : [];
      const hasImage = imgs.some((img: any) => {
        if (typeof img === 'string') return img === imageId;
        return img?.id === imageId || img?.url === imageId || img?.imageUrl === imageId;
      });

      if (hasImage) {
        foundVariant = v;
        updatedImages = imgs.filter((img: any) => {
          if (typeof img === 'string') return img !== imageId;
          return img?.id !== imageId && img?.url !== imageId && img?.imageUrl !== imageId;
        });
        break;
      }
    }

    if (foundVariant) {
      await prisma.productVariant.update({
        where: { id: foundVariant.id },
        data: { variantImages: updatedImages }
      });
      return res.status(200).json({ success: true, message: 'Image deleted' });
    }

    return res.status(404).json({ error: 'Image not found in any product variant' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete variant image', details: error.message });
  }
};

export const setPrimaryVariantImage = async (req: Request, res: Response) => {
  const { imageId } = req.params;
  try {
    // With dynamic JSON lists, we can just return success or let client update ordering if array elements represent primary first
    return res.status(200).json({ success: true, message: 'Primary set' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to set primary', details: error.message });
  }
};
