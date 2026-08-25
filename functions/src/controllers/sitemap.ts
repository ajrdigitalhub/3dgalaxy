import { Request, Response } from 'express';
import { prisma } from '../config/database';

export const getSitemap = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({ select: { slug: true, updatedAt: true } });
    const categories = await prisma.category.findMany({ select: { slug: true, updatedAt: true } });
    const brands = await prisma.brand.findMany({ select: { slug: true, updatedAt: true } });

    const protocol = req.protocol || 'https';
    const host = req.get('host') || '3dgalaxy.in';
    const baseUrl = host.includes('localhost') ? `${protocol}://${host}` : 'https://3dgalaxy.in';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static pages
    const staticPages = [
      { path: '', priority: '1.0', changefreq: 'daily' },
      { path: '/products', priority: '0.9', changefreq: 'daily' },
      { path: '/slicer', priority: '0.9', changefreq: 'weekly' },
      { path: '/about', priority: '0.7', changefreq: 'monthly' },
      { path: '/privacy-policy', priority: '0.5', changefreq: 'yearly' },
      { path: '/terms-of-service', priority: '0.5', changefreq: 'yearly' },
      { path: '/refund-policy', priority: '0.5', changefreq: 'yearly' },
      { path: '/return-policy', priority: '0.5', changefreq: 'yearly' },
      { path: '/shipping-policy', priority: '0.5', changefreq: 'yearly' }
    ];

    for (const page of staticPages) {
      xml += `
  <url>
    <loc>${baseUrl}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

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
