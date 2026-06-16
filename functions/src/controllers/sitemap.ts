import { Request, Response } from 'express';
import { prisma } from '../config/database';

export const getSitemap = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({ select: { slug: true, updatedAt: true } });
    const categories = await prisma.category.findMany({ select: { slug: true, updatedAt: true } });
    const brands = await prisma.brand.findMany({ select: { slug: true, updatedAt: true } });

    const baseUrl = 'https://3dgalaxy.com';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static pages
    xml += `
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/products</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

    // Categories
    for (const cat of categories) {
      if (cat.slug) {
        xml += `
  <url>
    <loc>${baseUrl}/category/${cat.slug}</loc>
    <lastmod>${cat.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    // Brands
    for (const brand of brands) {
      if (brand.slug) {
        xml += `
  <url>
    <loc>${baseUrl}/brand/${brand.slug}</loc>
    <lastmod>${brand.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    // Products
    for (const prod of products) {
      if (prod.slug) {
        xml += `
  <url>
    <loc>${baseUrl}/product/${prod.slug}</loc>
    <lastmod>${prod.updatedAt.toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
      }
    }

    xml += `\n</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap generation error', error);
    res.status(500).end();
  }
};
