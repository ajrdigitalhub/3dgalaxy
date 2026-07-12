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

export const updateHomepageSection = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, type, sequence, isVisible } = req.body;

  try {
    const updated = await prisma.homepageSection.update({
      where: { id },
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
  try {
    await prisma.homepageSection.delete({ where: { id } });
    return res.status(200).json({ message: 'Homepage layout section successfully deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: 'layout section deletion command halted', details: error.message });
  }
};

export const getConsolidatedHome = async (req: Request, res: Response) => {
  try {
    const [settingRecord, categories, brands, menuItems, products] = await Promise.all([
      prisma.themeSetting.findUnique({
        where: { keyName: 'global-settings' },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.brand.findMany({
        orderBy: { name: 'asc' },
      }),
      prisma.menuItem.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        take: 12,
        include: {
          variants: true,
        }
      })
    ]);

    const settingsData = settingRecord ? (settingRecord.value as any) : {};

    const buildMenuTree = (items: any[], parentId: string | null = null): any[] => {
      return items
        .filter(item => item.parentId === parentId)
        .map(item => ({
          id: item.id,
          label: item.title,
          url: item.url,
          parentId: item.parentId,
          sortOrder: item.sortOrder,
          children: buildMenuTree(items, item.id),
        }));
    };
    const navigationTree = buildMenuTree(menuItems, null);

    return res.status(200).json({
      success: true,
      data: {
        settings: settingsData,
        theme: settingsData.theme || {},
        navigation: navigationTree,
        hero: settingsData.heroSlides || [],
        categories: categories.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          parent_id: c.parentId,
          parentId: c.parentId,
          display_order: c.sortOrder,
          description: c.description || '',
          icon: c.icon || '',
          image: c.image || '',
          banner: c.banner || '',
          isActive: c.isActive,
          isFeatured: c.isFeatured,
          seoTitle: c.seoTitle || '',
          seoDescription: c.seoDescription || '',
        })),
        brands: brands.map(b => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          logo: b.logo || '',
          description: b.description || '',
        })),
        featuredProducts: products.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku || '',
          barcode: p.barcode || '',
          category_id: p.categoryId,
          brand: p.brandId,
          description: p.description || '',
          long_description: p.longDescription || p.description || '',
          mrp: parseFloat(p.basePrice as any) || 0,
          sale_price: parseFloat(p.salePrice as any) || parseFloat(p.basePrice as any) || 0,
          dealer_price: parseFloat(p.dealerPrice as any) || parseFloat(p.salePrice as any) || parseFloat(p.basePrice as any) || 0,
          stock: p.stock || 0,
          images: p.images || [],
          specifications: p.specifications || [],
          variants: p.variants || [],
          isFeatured: p.isFeatured,
          isExclusive: p.isExclusive,
          codAvailable: p.codAvailable,
        })),
        offers: settingsData.promoBanners || [],
        testimonials: settingsData.testimonials || [
          { name: 'Dr. A. Sen', role: 'R&D Director, Aero-Space India', comment: '3D Galaxy revolutionized our design verification cycle.' },
          { name: 'Meera J.', role: 'Lead Product Designer, Nexa Motors', comment: 'Their custom quotation portal is incredibly fast.' },
          { name: 'Prof. Rajesh K.', role: 'Makerspace Admin, IIT Delhi', comment: 'Outstanding post-sales training and customer service.' }
        ]
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to compile consolidated home payload', details: error.message });
  }
};

export const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    let products = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: { brand: true }
    });

    if (products.length === 0) {
      products = await prisma.product.findMany({
        where: { isActive: true },
        take: 8,
        include: { brand: true }
      });
    }

    const mapped = products.map((p: any) => {
      const imagesList = Array.isArray(p.images) ? p.images : [];
      const base = parseFloat(p.basePrice as any) || 0;
      const sale = parseFloat(p.salePrice as any) || base;
      const discount = base > 0 ? Math.round(((base - sale) / base) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        brand: p.brand?.name || '3D Galaxy',
        slug: p.slug,
        sku: p.sku || '',
        description: p.description || '',
        shortDescription: p.shortDescription || p.description || '',
        mrp: base,
        salePrice: sale,
        dealerPrice: parseFloat(p.dealerPrice as any) || sale,
        discountPercent: discount,
        stock: p.stock || 0,
        images: imagesList.map((img: any) => typeof img === 'string' ? img : (img.url || '')),
        isFeatured: p.isFeatured,
        isExclusive: p.isExclusive,
        codAvailable: p.codAvailable,
        freeShippingEligible: p.freeShippingEligible,
        specifications: p.specifications || [],
        features: p.features || [],
      };
    });

    return res.status(200).json({
      products: mapped
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to query featured products', details: error.message });
  }
};


