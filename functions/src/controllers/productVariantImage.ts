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

    const product = await prisma.product.findUnique({ where: { id: variant.productId } });
    if (!product) return res.status(404).json({ error: 'Parent product not found' });

    const currentProductImages = Array.isArray(product.images) ? [...product.images] : [];
    const currentVariantImages = Array.isArray(variant.variantImages) ? [...variant.variantImages] : [];

    const newMediaItems: any[] = [];
    const newVariantMappings: any[] = [];

    images.forEach((imgInput: any, idx: number) => {
      const url = typeof imgInput === 'string' ? imgInput : (imgInput.url || imgInput.imageUrl || '');
      if (!url) return;

      const mediaId = imgInput.id || `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const fileName = imgInput.fileName || url.split('/').pop()?.split('?')[0] || 'variant-image.jpg';

      const mediaObj = {
        id: mediaId,
        url,
        fileName,
        altText: imgInput.altText || '',
        sortOrder: currentProductImages.length + idx,
        isPrimary: currentProductImages.length === 0,
        createdAt: new Date().toISOString()
      };

      newMediaItems.push(mediaObj);
      newVariantMappings.push({
        mediaId,
        id: mediaId,
        url,
        fileName,
        isPrimary: currentVariantImages.length === 0 && idx === 0,
        sortOrder: currentVariantImages.length + idx
      });
    });

    // Save to product media library and variant
    await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: { images: [...currentProductImages, ...newMediaItems] }
      }),
      prisma.productVariant.update({
        where: { id: variantId },
        data: { variantImages: [...currentVariantImages, ...newVariantMappings] }
      })
    ]);

    return res.status(201).json({ success: true, data: newVariantMappings, mediaItems: newMediaItems });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to upload variant images', details: error.message });
  }
};

export const deleteVariantImage = async (req: Request, res: Response) => {
  const { imageId } = req.params;
  const variantId = (req.query.variantId || req.body?.variantId) as string | undefined;

  try {
    let variants: any[] = [];
    if (variantId) {
      const single = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, variantImages: true }
      });
      if (single) variants = [single];
    } else {
      variants = await prisma.productVariant.findMany({
        take: 200,
        select: { id: true, variantImages: true }
      });
    }

    let foundVariant = null;
    let updatedImages: any[] = [];

    for (const v of variants) {
      const imgs = Array.isArray(v.variantImages) ? v.variantImages : [];
      const hasImage = imgs.some((img: any) => {
        if (typeof img === 'string') return img === imageId;
        return img?.id === imageId || img?.mediaId === imageId || img?.url === imageId || img?.imageUrl === imageId;
      });

      if (hasImage) {
        foundVariant = v;
        updatedImages = imgs.filter((img: any) => {
          if (typeof img === 'string') return img !== imageId;
          return img?.id !== imageId && img?.mediaId !== imageId && img?.url !== imageId && img?.imageUrl !== imageId;
        });
        break;
      }
    }

    if (foundVariant) {
      await prisma.productVariant.update({
        where: { id: foundVariant.id },
        data: { variantImages: updatedImages }
      });
      return res.status(200).json({ success: true, message: 'Variant mapping removed successfully (central media preserved)' });
    }

    return res.status(404).json({ error: 'Image mapping not found in variant' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to remove variant image mapping', details: error.message });
  }
};

export const setPrimaryVariantImage = async (req: Request, res: Response) => {
  const { imageId } = req.params;
  const variantId = (req.query.variantId || req.body?.variantId) as string | undefined;

  if (!variantId) {
    return res.status(400).json({ error: 'variantId is required' });
  }

  try {
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    const currentImages = Array.isArray(variant.variantImages) ? [...variant.variantImages] : [];
    const updatedImages = currentImages.map((img: any) => {
      const isTarget = typeof img === 'string'
        ? img === imageId
        : (img.id === imageId || img.mediaId === imageId || img.url === imageId);
      return typeof img === 'string'
        ? { url: img, isPrimary: isTarget, sortOrder: isTarget ? 0 : 1 }
        : { ...img, isPrimary: isTarget };
    });

    await prisma.productVariant.update({
      where: { id: variantId },
      data: { variantImages: updatedImages }
    });

    return res.status(200).json({ success: true, message: 'Variant primary image updated' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to set primary variant image', details: error.message });
  }
};
