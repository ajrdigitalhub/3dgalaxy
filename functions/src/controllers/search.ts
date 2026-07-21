import { Request, Response } from 'express';
import prisma from '../config/database';
import { mapProductFields } from './product';

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

const computeRelevanceScore = (p: any, query: string, terms: string[]): number => {
  let score = 0;
  const name = (p.name || '').toLowerCase();
  const sku = (p.sku || '').toLowerCase();
  const catName = (p.category?.name || (typeof p.category === 'string' ? p.category : '') || '').toLowerCase();
  const brandName = (p.brand?.name || (typeof p.brand === 'string' ? p.brand : '') || '').toLowerCase();

  // Exact full name match
  if (name === query) score += 100;
  // Name starts with query
  else if (name.startsWith(query)) score += 80;
  // Name contains full query
  else if (name.includes(query)) score += 60;

  // Term matches in Name, SKU, Category, Brand
  terms.forEach(t => {
    if (name.includes(t)) score += 30;
    if (sku.includes(t)) score += 25;
    if (catName.includes(t)) score += 20;
    if (brandName.includes(t)) score += 15;
  });

  return score;
};

const fetchProductsByRelevance = async (terms: string[], limit?: number) => {
  const fullSearchStr = terms.join(' ').toLowerCase();

  // 1. Primary query: Name, SKU, Category Name, or Brand Name
  const primaryWhere: any = {
    isActive: true,
    AND: terms.map(term => ({
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { category: { name: { contains: term, mode: 'insensitive' } } },
        { brand: { name: { contains: term, mode: 'insensitive' } } }
      ]
    }))
  };

  const primaryProducts = await prisma.product.findMany({
    where: primaryWhere,
    include: { category: true, reviews: true, brand: true },
    ...(limit ? { take: limit * 3 } : {})
  });

  let allProducts = [...primaryProducts];

  // 2. Secondary query: Description (only if primary products are fewer than requested limit)
  if (limit && allProducts.length < limit) {
    const existingIds = new Set(allProducts.map(p => p.id));
    const secondaryWhere: any = {
      isActive: true,
      id: { notIn: Array.from(existingIds) },
      AND: terms.map(term => ({
        OR: [
          { description: { contains: term, mode: 'insensitive' } },
          { shortDescription: { contains: term, mode: 'insensitive' } }
        ]
      }))
    };

    const secondaryProducts = await prisma.product.findMany({
      where: secondaryWhere,
      include: { category: true, reviews: true, brand: true },
      take: limit - allProducts.length
    });

    allProducts.push(...secondaryProducts);
  }

  // Sort by relevance score
  allProducts.sort((a, b) => {
    const scoreA = computeRelevanceScore(a, fullSearchStr, terms);
    const scoreB = computeRelevanceScore(b, fullSearchStr, terms);
    return scoreB - scoreA;
  });

  return limit ? allProducts.slice(0, limit) : allProducts;
};

export const getSearchSuggestions = async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) {
      return res.status(200).json({
        success: true,
        data: { products: [], categories: [], brands: [], services: [] }
      });
    }

    const searchStr = q.toLowerCase().trim();
    const terms = searchStr.split(/\s+/).filter(t => t.length > 0);

    let categoryWhere: any = {};
    let brandWhere: any = {};

    if (terms.length > 0) {
      categoryWhere.AND = terms.map(term => ({
        name: { contains: term, mode: 'insensitive' }
      }));

      brandWhere.AND = terms.map(term => ({
        name: { contains: term, mode: 'insensitive' }
      }));
    }

    const [products, categories, brands] = await Promise.all([
      fetchProductsByRelevance(terms, 5),
      prisma.category.findMany({
        where: categoryWhere,
        take: 5
      }),
      prisma.brand.findMany({
        where: brandWhere,
        take: 5
      })
    ]);

    // Format products using mapProductFields
    const formattedProducts = products.map((p) => {
      const mapped = mapProductFields(p);
      let avgRating = 4.5;
      if (p.reviews && p.reviews.length > 0) {
        const sum = p.reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
        avgRating = Math.round((sum / p.reviews.length) * 10) / 10;
      }
      return {
        id: mapped.id,
        name: mapped.name,
        slug: mapped.slug,
        price: Number(mapped.basePrice || mapped.price || 0),
        salePrice: mapped.salePrice ? Number(mapped.salePrice) : null,
        image: mapped.primaryImage || mapped.thumbnail || (mapped.images && mapped.images[0]?.url) || null,
        category: p.category?.name || (typeof p.category === 'string' ? p.category : null),
        categoryId: p.categoryId || null,
        brand: p.brand?.name || (typeof p.brand === 'string' ? p.brand : null),
        stock: mapped.stock,
        shortDescription: mapped.shortDescription || null,
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
    const q = (req.query.q as string || '').trim();

    let products: any[] = [];
    let categories: any[] = [];
    let brands: any[] = [];

    if (q.length > 0) {
      const searchStr = q.toLowerCase();
      const terms = searchStr.split(/\s+/).filter(t => t.length > 0);

      let categoryWhere: any = {};
      let brandWhere: any = {};

      if (terms.length > 0) {
        categoryWhere.AND = terms.map(term => ({
          name: { contains: term, mode: 'insensitive' }
        }));

        brandWhere.AND = terms.map(term => ({
          name: { contains: term, mode: 'insensitive' }
        }));
      }

      [products, categories, brands] = await Promise.all([
        fetchProductsByRelevance(terms),
        prisma.category.findMany({
          where: categoryWhere
        }),
        prisma.brand.findMany({
          where: brandWhere
        })
      ]);
    }

    return res.status(200).json({
      success: true,
      data: {
        products: products.map((p: any) => mapProductFields(p)),
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
