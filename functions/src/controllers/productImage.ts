import { Request, Response } from 'express';
import prisma from '../config/database';

export const getProductImages = async (req: Request, res: Response) => {
  const { productId } = req.params;
  try {
    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
    return res.status(200).json(images);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch product images', details: error.message });
  }
};

export const uploadProductImagesBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { images } = req.body;
  if (!images || !images.length) {
    return res.status(400).json({ error: 'No images provided' });
  }

  try {
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const createdImages = [];
    for (const img of images) {
      const created = await prisma.productImage.create({
        data: {
          productId: product.id,
          url: img.url,
          isPrimary: !!img.isPrimary,
          sortOrder: img.sortOrder || 0,
          altText: img.altText || '',
        }
      });
      createdImages.push(created);
    }
    return res.status(201).json(createdImages);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to upload product images', details: error.message });
  }
};

export const uploadProductImages = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { images } = req.body; // Array of { url, isPrimary, altText, sortOrder }
  
  if (!images || !images.length) {
    return res.status(400).json({ error: 'No images provided' });
  }

  try {
    const createdImages = [];
    for (const img of images) {
      const created = await prisma.productImage.create({
        data: {
          productId,
          url: img.url,
          isPrimary: !!img.isPrimary,
          sortOrder: img.sortOrder || 0,
          altText: img.altText || '',
        }
      });
      createdImages.push(created);
    }
    return res.status(201).json(createdImages);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to upload product images', details: error.message });
  }
};

export const deleteProductImage = async (req: Request, res: Response) => {
  const { imageId } = req.params;
  try {
    await prisma.productImage.delete({ where: { id: imageId } });
    return res.status(200).json({ message: 'Product image deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete product image', details: error.message });
  }
};

export const setPrimaryImage = async (req: Request, res: Response) => {
  const { imageId } = req.params;

  try {
    const targetImage = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!targetImage) return res.status(404).json({ error: 'Image not found' });

    // Set all other images for this product to not primary
    await prisma.productImage.updateMany({
      where: { productId: targetImage.productId },
      data: { isPrimary: false },
    });

    // Set the target image to primary
    const updated = await prisma.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to set primary image', details: error.message });
  }
};

export const reorderImages = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { imageIds } = req.body; // Array of image IDs in new order

  if (!Array.isArray(imageIds)) {
    return res.status(400).json({ error: 'Invalid payload, expected array of imageIds' });
  }

  try {
    for (let i = 0; i < imageIds.length; i++) {
      await prisma.productImage.update({
        where: { id: imageIds[i], productId }, // Ensure product matches
        data: { sortOrder: i },
      });
    }
    return res.status(200).json({ message: 'Images reordered successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to reorder images', details: error.message });
  }
};
