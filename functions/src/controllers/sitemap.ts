import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { ENV } from '../config/env';

const escapeXml = (unsafe?: string | null): string => {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const resolveProductImageUrl = (prod: any, baseUrl: string): string | null => {
  let raw: any = prod.primaryImage;
  if (!raw && prod.images) {
    if (Array.isArray(prod.images) && prod.images.length > 0) {
      raw = prod.images[0];
    } else if (typeof prod.images === 'string') {
      try {
        const parsed = JSON.parse(prod.images);
        if (Array.isArray(parsed) && parsed.length > 0) raw = parsed[0];
        else raw = prod.images;
      } catch {
        raw = prod.images;
      }
    }
  }

  if (!raw) return null;
  let url = '';
  if (typeof raw === 'string') {
    url = raw.trim();
  } else if (typeof raw === 'object') {
    url = (raw.url || raw.imageUrl || raw.src || raw.path || '').trim();
  }

  if (!url || url.startsWith('data:') || url === '[object Object]') return null;
  if (url.toLowerCase().endsWith('.svg') || url.includes('/3d-logo.png')) return null;

  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  return `${baseUrl}/${url.replace(/^\/+/, '')}`;
};

export const getSitemap = async (req: Request, res: Response) => {
  try {
    const host = req.get('host') || '';
    const baseUrl = host.includes('localhost')
      ? `${req.protocol || 'http'}://${host}`
      : (ENV.SITE_URL || 'https://3dgalaxy.co.in').replace(/\/+$/, '');

    // Query active, non-deleted catalog records
    const [products, categories, brands] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: true,
          deletedAt: null
        },
        select: {
          slug: true,
          name: true,
          updatedAt: true,
          images: true
        }
      }),
      prisma.category.findMany({
        where: {
          isActive: true,
          deletedAt: null
        },
        select: {
          slug: true,
          name: true,
          updatedAt: true
        }
      }),
      prisma.brand.findMany({
        where: {
          deletedAt: null
        },
        select: {
          slug: true,
          name: true,
          updatedAt: true
        }
      })
    ]);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // 1. Authoritative Static Pages
    const staticPages = [
      { path: '', priority: '1.0', changefreq: 'daily' },
      { path: '/explore', priority: '0.9', changefreq: 'daily' },
      { path: '/products', priority: '0.9', changefreq: 'daily' },
      { path: '/slicer', priority: '0.9', changefreq: 'weekly' },
      { path: '/about', priority: '0.7', changefreq: 'monthly' },
      { path: '/policies/privacy-policy', priority: '0.5', changefreq: 'yearly' },
      { path: '/policies/terms-of-service', priority: '0.5', changefreq: 'yearly' },
      { path: '/policies/refund-policy', priority: '0.5', changefreq: 'yearly' },
      { path: '/pages/return-policy', priority: '0.5', changefreq: 'yearly' },
      { path: '/policies/shipping-policy', priority: '0.5', changefreq: 'yearly' }
    ];

    for (const page of staticPages) {
      xml += `
  <url>
    <loc>${baseUrl}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    // 2. Active Category Pages
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

    // 3. Active Brand Pages
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

    // 4. Published Products with Google Image Sitemap Tags
    for (const prod of products) {
      if (prod.slug) {
        const imageUrl = resolveProductImageUrl(prod, baseUrl);
        let imageXml = '';
        if (imageUrl) {
          imageXml = `
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:title>${escapeXml(prod.name)}</image:title>
    </image:image>`;
        }

        xml += `
  <url>
    <loc>${baseUrl}/product/${prod.slug}</loc>
    <lastmod>${prod.updatedAt.toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>${imageXml}
  </url>`;
      }
    }

    xml += `\n</urlset>`;

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.send(xml);
  } catch (error) {
    console.error('[Sitemap] Generation error:', error);
    return res.status(500).end();
  }
};
