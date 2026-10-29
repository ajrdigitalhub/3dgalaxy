import { Request, Response } from 'express';
import { StorefrontMetaService } from '../services/storefrontMeta.service';
import { logger } from '../utils/logger';

/**
 * Controller for serving server-rendered Open Graph metadata and dynamic SEO HTML
 * for WhatsApp, Facebook, Twitter, search engines, and browser direct visits.
 */

export const handleProductStorefront = async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const html = await StorefrontMetaService.renderProductHtml(slug);

    if (html) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
      return res.status(200).send(html);
    }

    // Product not found in database: serve fallback shell so Angular client can display 404
    logger.info(`[StorefrontMeta] Product slug not found: ${slug}, serving fallback shell`);
    const fallbackHtml = StorefrontMetaService.renderFallbackHtml(req.path);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml);
  } catch (error: any) {
    logger.error(`[StorefrontMeta] Error rendering product HTML for ${slug}:`, error);
    const fallbackHtml = StorefrontMetaService.renderFallbackHtml(req.path);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml);
  }
};

export const handleProductsLegacyStorefront = async (req: Request, res: Response) => {
  const { slug } = req.params;

  if (!slug) {
    // /products catalog view
    try {
      const html = StorefrontMetaService.renderCatalogHtml();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
      return res.status(200).send(html);
    } catch {
      const fallbackHtml = StorefrontMetaService.renderFallbackHtml('/products');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(fallbackHtml);
    }
  }

  // Legacy /products/:slug (Shopify style) -> 301 Permanent Redirect to canonical /product/:slug
  const targetUrl = `/product/${encodeURIComponent(slug)}`;
  logger.info(`[StorefrontMeta] 301 Redirecting legacy Shopify product URL: /products/${slug} -> ${targetUrl}`);
  res.setHeader('Location', targetUrl);
  return res.redirect(301, targetUrl);
};

export const handleProductsCatalogStorefront = async (_req: Request, res: Response) => {
  try {
    const html = StorefrontMetaService.renderCatalogHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    return res.status(200).send(html);
  } catch {
    const fallbackHtml = StorefrontMetaService.renderFallbackHtml('/products');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml);
  }
};

export const handleCategoryStorefront = async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const html = await StorefrontMetaService.renderCategoryHtml(slug);

    if (html) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
      return res.status(200).send(html);
    }

    const fallbackHtml = StorefrontMetaService.renderFallbackHtml(req.path);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml);
  } catch (error: any) {
    logger.error(`[StorefrontMeta] Error rendering category HTML for ${slug}:`, error);
    const fallbackHtml = StorefrontMetaService.renderFallbackHtml(req.path);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml);
  }
};

export const handleBrandStorefront = async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const html = await StorefrontMetaService.renderBrandHtml(slug);

    if (html) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
      return res.status(200).send(html);
    }

    const fallbackHtml = StorefrontMetaService.renderFallbackHtml(req.path);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml);
  } catch (error: any) {
    logger.error(`[StorefrontMeta] Error rendering brand HTML for ${slug}:`, error);
    const fallbackHtml = StorefrontMetaService.renderFallbackHtml(req.path);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml);
  }
};

