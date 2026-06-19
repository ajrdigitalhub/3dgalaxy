import { Request, Response } from 'express';
import prisma from '../config/database';

export const getProductImages = async (req: Request, res: Response) => {
  const { productId } = req.params;
  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const images = Array.isArray(product.images) ? product.images : [];
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

    const currentImages = Array.isArray(product.images) ? [...product.images] : [];
    const addedImages = images.map((img: any, idx: number) => ({
      id: img.id || Math.random().toString(36).substring(2, 11),
      url: img.url || img.imageUrl || '',
      isPrimary: !!img.isPrimary,
      sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : (currentImages.length + idx),
      altText: img.altText || '',
    }));

    const updatedImages = [...currentImages, ...addedImages];
    await prisma.product.update({
      where: { id: product.id },
      data: { images: updatedImages }
    });

    return res.status(201).json(addedImages);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to upload product images', details: error.message });
  }
};

export const uploadProductImages = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { images } = req.body;
  
  if (!images || !images.length) {
    return res.status(400).json({ error: 'No images provided' });
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const currentImages = Array.isArray(product.images) ? [...product.images] : [];
    const addedImages = images.map((img: any, idx: number) => ({
      id: img.id || Math.random().toString(36).substring(2, 11),
      url: img.url || img.imageUrl || '',
      isPrimary: !!img.isPrimary,
      sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : (currentImages.length + idx),
      altText: img.altText || '',
    }));

    const updatedImages = [...currentImages, ...addedImages];
    await prisma.product.update({
      where: { id: productId },
      data: { images: updatedImages }
    });

    return res.status(201).json(addedImages);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to upload product images', details: error.message });
  }
};

export const deleteProductImage = async (req: Request, res: Response) => {
  const { imageId } = req.params;
  try {
    // Find any product containing this image id or url
    const products = await prisma.product.findMany();
    let foundProduct = null;
    let updatedImages: any[] = [];
    
    for (const p of products) {
      const imgs = Array.isArray(p.images) ? p.images : [];
      const hasImage = imgs.some((img: any) => img.id === imageId || img.url === imageId);
      if (hasImage) {
        foundProduct = p;
        updatedImages = imgs.filter((img: any) => img.id !== imageId && img.url !== imageId);
        break;
      }
    }

    if (foundProduct) {
      await prisma.product.update({
        where: { id: foundProduct.id },
        data: { images: updatedImages }
      });
      return res.status(200).json({ message: 'Product image deleted' });
    }

    return res.status(404).json({ error: 'Product image not found' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete product image', details: error.message });
  }
};

export const setPrimaryImage = async (req: Request, res: Response) => {
  const { imageId } = req.params;

  try {
    const products = await prisma.product.findMany();
    let foundProduct = null;
    let updatedImages: any[] = [];
    let updatedTarget: any = null;

    for (const p of products) {
      const imgs = Array.isArray(p.images) ? p.images : [];
      const hasImage = imgs.some((img: any) => img.id === imageId || img.url === imageId);
      if (hasImage) {
        foundProduct = p;
        updatedImages = imgs.map((img: any) => {
          const isTarget = img.id === imageId || img.url === imageId;
          const updatedImg = { ...img, isPrimary: isTarget };
          if (isTarget) updatedTarget = updatedImg;
          return updatedImg;
        });
        break;
      }
    }

    if (foundProduct) {
      await prisma.product.update({
        where: { id: foundProduct.id },
        data: { images: updatedImages }
      });
      return res.status(200).json(updatedTarget);
    }

    return res.status(404).json({ error: 'Image not found' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to set primary image', details: error.message });
  }
};

export const reorderImages = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { imageIds } = req.body; // Array of image IDs/URLs in new order

  if (!Array.isArray(imageIds)) {
    return res.status(400).json({ error: 'Invalid payload, expected array of imageIds' });
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const currentImages = Array.isArray(product.images) ? [...product.images] : [];
    
    // Sort current images based on their positions in the imageIds array
    const sortedImages = currentImages.map((img: any) => {
      const idxObj = imageIds.findIndex(id => id === img.id || id === img.url);
      return {
        ...img,
        sortOrder: idxObj !== -1 ? idxObj : 999
      };
    }).sort((a: any, b: any) => a.sortOrder - b.sortOrder);

    await prisma.product.update({
      where: { id: productId },
      data: { images: sortedImages }
    });

    return res.status(200).json({ message: 'Images reordered successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to reorder images', details: error.message });
  }
};
