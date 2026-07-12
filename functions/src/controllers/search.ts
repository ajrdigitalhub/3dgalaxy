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
    
    // Log search query async if setting enabled (skip for <3 chars?)
    // In this basic version we will just log in the `search` endpoint, not everywhere in suggestions to avoid spam.

    const [products, categories, brands] = await Promise.all([
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: searchStr } },
            { description: { contains: searchStr } }
          ],
          isActive: true
        },
        take: 5
      }),
      prisma.category.findMany({
        where: { name: { contains: searchStr } },
        take: 5
      }),
      prisma.brand.findMany({
        where: { name: { contains: searchStr } },
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
    const formattedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.basePrice,
      salePrice: p.salePrice,
      image: safeParseArray(p.images)[0]?.url || null,
      type: 'Product'
    }));

    return res.status(200).json({
      success: true,
      data: {
        products: formattedProducts,
        categories: categories.map(c => ({ id: c.id, name: c.name, slug: c.slug, type: 'Category' })),
        brands: brands.map(b => ({ id: b.id, name: b.name, slug: b.slug, type: 'Brand' })),
        services: [] // No separate service model
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch suggestions', details: error.message });
  }
};

export const getSearchResults = async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string || '';
    const userId = (req as any).user?.id || null;

    let products: any[] = [];
    let categories: any[] = [];
    let brands: any[] = [];

    if (q.length > 0) {
      const searchStr = q.toLowerCase();

      [products, categories, brands] = await Promise.all([
        prisma.product.findMany({
          where: {
            OR: [
              { name: { contains: searchStr } },
              { description: { contains: searchStr } },
              { sku: { contains: searchStr } }
            ],
            isActive: true
          },
          include: { category: true, brand: true }
        }),
        prisma.category.findMany({
          where: { name: { contains: searchStr } }
        }),
        prisma.brand.findMany({
          where: { name: { contains: searchStr } }
        })
      ]);
      
      // Sort products based on ranking criteria:
      // 1. Exact Name match
      // 2. Starts with search term
      // 3. Category match
      // 4. Brand match (handled implicit by product name starts with brand in our DB, or relation)
      // 5. Description match
      
      products.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          
          if (aName === searchStr) return -1;
          if (bName === searchStr) return 1;
          
          if (aName.startsWith(searchStr)) return -1;
          if (bName.startsWith(searchStr)) return 1;
          
          return 0; // fallback to default order
      });
      
      // Log search query (SearchLog model is not in schema)
      /*
      const resultCount = products.length + categories.length + brands.length;
      await prisma.searchLog.create({
          data: {
              userId,
              searchTerm: q,
              resultCount
          }
      });
      */
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
