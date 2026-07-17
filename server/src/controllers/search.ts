import { Request, Response } from 'express';
import prisma from '../config/database';

export const getSearchSuggestions = async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) {
      return res.status(200).json({
        success: true,
        data: { products: [], categories: [], brands: [], services: [] }
      });
    }

    const searchStr = q.toLowerCase();
    const terms = searchStr.split(/\s+/).filter(t => t.length > 0);

    let productWhere: any = { isActive: true };
    let categoryWhere: any = {};
    let brandWhere: any = {};

    if (terms.length > 0) {
      productWhere.AND = terms.map(term => ({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { sku: { contains: term, mode: 'insensitive' } },
          { category: { name: { contains: term, mode: 'insensitive' } } },
          { brand: { name: { contains: term, mode: 'insensitive' } } }
        ]
      }));

      categoryWhere.AND = terms.map(term => ({
        name: { contains: term, mode: 'insensitive' }
      }));

      brandWhere.AND = terms.map(term => ({
        name: { contains: term, mode: 'insensitive' }
      }));
    }

    const [products, categories, brands] = await Promise.all([
      prisma.product.findMany({
        where: productWhere,
        include: {
          category: true,
          reviews: true
        },
        take: 5
      }),
      prisma.category.findMany({
        where: categoryWhere,
        take: 5
      }),
      prisma.brand.findMany({
        where: brandWhere,
        take: 5
      })
    ]);

    const safeParseArray = (val: any): any[] => {
      if (!val) return [];
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return Array.isArray(val) ? val : [];
    };

    // Format products
    const formattedProducts = products.map((p) => {
      let avgRating = 4.5;
      if (p.reviews && p.reviews.length > 0) {
        const sum = p.reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
        avgRating = Math.round((sum / p.reviews.length) * 10) / 10;
      }
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.basePrice,
        salePrice: p.salePrice,
        image: safeParseArray(p.images)[0]?.url || null,
        category: p.category?.name || null,
        rating: avgRating,
        type: 'Product'
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        products: formattedProducts,
        categories: categories.map(c => ({ id: c.id, name: c.name, slug: c.slug, type: 'Category' })),
        brands: brands.map(b => ({ id: b.id, name: b.name, slug: b.slug, type: 'Brand' })),
        services: []
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch suggestions', details: error.message });
  }
};

export const getSearchResults = async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string || '';

    let products: any[] = [];
    let categories: any[] = [];
    let brands: any[] = [];

    if (q.length > 0) {
      const searchStr = q.toLowerCase();
      const terms = searchStr.split(/\s+/).filter(t => t.length > 0);

      let productWhere: any = { isActive: true };
      let categoryWhere: any = {};
      let brandWhere: any = {};

      if (terms.length > 0) {
        productWhere.AND = terms.map(term => ({
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { sku: { contains: term, mode: 'insensitive' } },
            { category: { name: { contains: term, mode: 'insensitive' } } },
            { brand: { name: { contains: term, mode: 'insensitive' } } }
          ]
        }));

        categoryWhere.AND = terms.map(term => ({
          name: { contains: term, mode: 'insensitive' }
        }));

        brandWhere.AND = terms.map(term => ({
          name: { contains: term, mode: 'insensitive' }
        }));
      }

      [products, categories, brands] = await Promise.all([
        prisma.product.findMany({
          where: productWhere,
          include: { category: true, brand: true }
        }),
        prisma.category.findMany({
          where: categoryWhere
        }),
        prisma.brand.findMany({
          where: brandWhere
        })
      ]);
      
      products.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        if (aName === searchStr) return -1;
        if (bName === searchStr) return 1;
        if (aName.startsWith(searchStr)) return -1;
        if (bName.startsWith(searchStr)) return 1;
        return 0;
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        products,
        categories,
        brands,
        services: []
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Search failed', details: error.message });
  }
};

export const getRecentSearches = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({ success: true, data: [] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch recent searches' });
  }
};
