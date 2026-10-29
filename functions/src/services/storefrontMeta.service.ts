import fs from 'node:fs';
import path from 'node:path';
import prisma from '../config/database';
import { ENV } from '../config/env';

export interface MetaPayload {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  imageAlt?: string;
  type?: string;
  price?: number | string;
  availability?: 'in stock' | 'out of stock';
  jsonLd?: Record<string, any>;
}

export class StorefrontMetaService {
  private static cachedTemplate: string | null = null;
  private static lastTemplateCheck: number = 0;
  private static readonly CANONICAL_ORIGIN = (ENV.SITE_URL || 'https://3dgalaxy.co.in').replace(/\/+$/, '');
  private static readonly DEFAULT_IMAGE = `${StorefrontMetaService.CANONICAL_ORIGIN}/3d-logo.png`;
  private static readonly SITE_NAME = '3D Galaxy';

  /**
   * Reads and caches the compiled storefront index.html shell.
   */
  public static getBaseHtmlTemplate(): string {
    const now = Date.now();
    if (this.cachedTemplate && now - this.lastTemplateCheck < 60000) {
      return this.cachedTemplate;
    }

    this.lastTemplateCheck = now;

    const candidatePaths = [
      path.join(__dirname, '../templates/index.html'),
      path.join(__dirname, './templates/index.html'),
      path.join(__dirname, './index.html'),
      path.join(process.cwd(), 'functions/src/templates/index.html'),
      path.join(process.cwd(), 'functions/dist/index.html'),
      path.join(process.cwd(), 'src/templates/index.html'),
      path.join(process.cwd(), 'dist/index.html'),
      path.join(process.cwd(), '../dist/applet/browser/index.html'),
      path.join(process.cwd(), 'dist/applet/browser/index.html'),
    ];

    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p)) {
          this.cachedTemplate = fs.readFileSync(p, 'utf8');
          return this.cachedTemplate;
        }
      } catch {}
    }

    if (this.cachedTemplate) {
      return this.cachedTemplate;
    }

    // Fallback minimal standard HTML shell if build artifact is temporarily unread
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>3D Galaxy | Buy 3D Printers, Filaments & Custom 3D Printing Service Online</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link rel="canonical" href="${this.CANONICAL_ORIGIN}/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${this.SITE_NAME}">
  <meta property="og:title" content="3D Galaxy | Buy 3D Printers, Filaments & 3D Printing Services Online">
  <meta property="og:description" content="Shop 3D printers, filaments, and parts. Get automated slicing quotes for SLA & FDM parts.">
  <meta property="og:image" content="${this.DEFAULT_IMAGE}">
  <meta property="og:url" content="${this.CANONICAL_ORIGIN}/">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="3D Galaxy | Buy 3D Printers, Filaments & 3D Printing Services">
  <meta name="twitter:description" content="Shop 3D printers, filaments, and parts.">
  <meta name="twitter:image" content="${this.DEFAULT_IMAGE}">
</head>
<body>
  <app-root></app-root>
</body>
</html>`;
  }

  /**
   * Safely strips HTML tags and normalizes whitespace.
   */
  public static stripHtml(html: string | null | undefined): string {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Safely escapes HTML special characters for attributes and titles.
   */
  public static escapeHtml(str: string | null | undefined): string {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Resolves the primary absolute image URL for a product from database records.
   */
  public static resolvePrimaryProductImage(product: any): string {
    if (!product) return this.DEFAULT_IMAGE;

    let imagesList: any[] = [];
    if (Array.isArray(product.images)) {
      imagesList = product.images;
    } else if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed)) imagesList = parsed;
        else if (typeof parsed === 'string') imagesList = [parsed];
      } catch {
        if (product.images.startsWith('http')) imagesList = [product.images];
      }
    }

    // 1. Look for marked primary image
    let selectedImage: any = imagesList.find((img: any) => typeof img === 'object' && img !== null && img.isPrimary && (img.url || img.imageUrl || img.src));
    if (!selectedImage && imagesList.length > 0) {
      selectedImage = imagesList[0];
    }

    let rawUrl = '';
    if (typeof selectedImage === 'string') {
      rawUrl = selectedImage;
    } else if (typeof selectedImage === 'object' && selectedImage !== null) {
      rawUrl = selectedImage.url || selectedImage.imageUrl || selectedImage.src || selectedImage.path || '';
    }

    // 2. Fallback to variants if main image is empty
    if (!rawUrl && Array.isArray(product.variants)) {
      for (const v of product.variants) {
        const vList = Array.isArray(v.variantImages) ? v.variantImages : (Array.isArray(v.images) ? v.images : []);
        if (vList.length > 0) {
          const first = vList[0];
          rawUrl = typeof first === 'string' ? first : (first?.url || first?.imageUrl || '');
          if (rawUrl) break;
        }
      }
    }

    rawUrl = (rawUrl || '').trim();
    if (!rawUrl || rawUrl.startsWith('data:') || rawUrl === '[object Object]') {
      return this.DEFAULT_IMAGE;
    }

    if (rawUrl.startsWith('//')) {
      return `https:${rawUrl}`;
    }
    if (rawUrl.startsWith('http://')) {
      return rawUrl.replace(/^http:\/\//i, 'https://');
    }
    if (rawUrl.startsWith('https://')) {
      return rawUrl;
    }

    return `${this.CANONICAL_ORIGIN}/${rawUrl.replace(/^\/+/, '')}`;
  }

  /**
   * Resolves absolute image URL for category, brand, or generic asset.
   */
  public static resolveAbsoluteImageUrl(rawUrl: string | null | undefined): string {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed === '[object Object]') {
      return this.DEFAULT_IMAGE;
    }
    if (trimmed.startsWith('//')) {
      return `https:${trimmed}`;
    }
    if (trimmed.startsWith('http://')) {
      return trimmed.replace(/^http:\/\//i, 'https://');
    }
    if (trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `${this.CANONICAL_ORIGIN}/${trimmed.replace(/^\/+/, '')}`;
  }

  /**
   * Injects dynamic meta tags, canonical URL, and JSON-LD structured data into the HTML shell.
   * Completely removes existing Open Graph and Twitter tags to prevent duplicates.
   */
  public static injectMetaTags(baseHtml: string, meta: MetaPayload): string {
    let result = baseHtml;

    // 1. Replace Title
    const titleTag = `<title>${this.escapeHtml(meta.title)}</title>`;
    if (/<title>[\s\S]*?<\/title>/i.test(result)) {
      result = result.replace(/<title>[\s\S]*?<\/title>/i, titleTag);
    } else {
      result = result.replace(/<head>/i, `<head>\n  ${titleTag}`);
    }

    // 2. Replace Canonical Tag
    const canonicalTag = `<link rel="canonical" id="canonical-link" href="${this.escapeHtml(meta.canonicalUrl)}">`;
    if (/<link[^>]*rel=["']canonical["'][^>]*>/i.test(result)) {
      result = result.replace(/<link[^>]*rel=["']canonical["'][^>]*>/i, canonicalTag);
    } else {
      result = result.replace(/<\/head>/i, `  ${canonicalTag}\n</head>`);
    }

    // 3. Replace Meta Description
    const descTag = `<meta name="description" content="${this.escapeHtml(meta.description)}">`;
    if (/<meta[^>]*name=["']description["'][^>]*>/i.test(result)) {
      result = result.replace(/<meta[^>]*name=["']description["'][^>]*>/i, descTag);
    } else {
      result = result.replace(/<\/head>/i, `  ${descTag}\n</head>`);
    }

    // 4. Clean up any existing Open Graph, Twitter, and Product meta tags to guarantee zero duplicate tags
    result = result.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, '');
    result = result.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '');
    result = result.replace(/<meta\s+property=["']product:[^"']+["'][^>]*>\s*/gi, '');

    // 5. Build Comprehensive Open Graph and Twitter Metadata Block
    const finalImage = this.resolveAbsoluteImageUrl(meta.imageUrl);
    const tags: string[] = [
      `<!-- Open Graph / WhatsApp / Facebook Rich Previews -->`,
      `<meta property="og:type" content="${this.escapeHtml(meta.type || 'website')}">`,
      `<meta property="og:site_name" content="${this.SITE_NAME}">`,
      `<meta property="og:title" content="${this.escapeHtml(meta.title)}">`,
      `<meta property="og:description" content="${this.escapeHtml(meta.description)}">`,
      `<meta property="og:url" content="${this.escapeHtml(meta.canonicalUrl)}">`,
      `<meta property="og:image" content="${this.escapeHtml(finalImage)}">`,
      `<meta property="og:image:secure_url" content="${this.escapeHtml(finalImage)}">`,
      `<meta property="og:image:alt" content="${this.escapeHtml(meta.imageAlt || meta.title)}">`,
    ];

    if (meta.price !== undefined && meta.price !== null) {
      tags.push(`<meta property="product:price:amount" content="${this.escapeHtml(String(meta.price))}">`);
      tags.push(`<meta property="product:price:currency" content="INR">`);
    }

    if (meta.availability) {
      tags.push(`<meta property="product:availability" content="${this.escapeHtml(meta.availability)}">`);
    }

    tags.push(
      `<!-- Twitter Cards -->`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${this.escapeHtml(meta.title)}">`,
      `<meta name="twitter:description" content="${this.escapeHtml(meta.description)}">`,
      `<meta name="twitter:image" content="${this.escapeHtml(finalImage)}">`
    );

    if (meta.jsonLd) {
      tags.push(
        `<!-- Schema.org JSON-LD Structured Data -->`,
        `<script type="application/ld+json">\n${JSON.stringify(meta.jsonLd, null, 2)}\n</script>`
      );
    }

    const tagsBlock = tags.join('\n  ');
    result = result.replace(/<\/head>/i, `  ${tagsBlock}\n</head>`);

    return result;
  }

  /**
   * Fetches product from database and renders full HTML with product-specific Open Graph tags.
   */
  public static async renderProductHtml(slug: string): Promise<string | null> {
    if (!slug) return null;

    const cleanSlug = slug.trim().toLowerCase();

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { slug: cleanSlug },
          { id: cleanSlug.length === 36 ? cleanSlug : undefined }
        ].filter(Boolean) as any,
        deletedAt: null
      },
      include: {
        brand: true,
        category: true,
        variants: {
          where: { isActive: true, deletedAt: null },
          take: 10
        }
      }
    });

    if (!product) {
      return null;
    }

    const brandName = product.brand?.name || (typeof product.brand === 'string' ? product.brand : this.SITE_NAME);
    const categoryName = product.category?.name || (typeof product.category === 'string' ? product.category : '3D Printing');
    const canonicalUrl = `${this.CANONICAL_ORIGIN}/product/${product.slug}`;
    const primaryImage = this.resolvePrimaryProductImage(product);

    // Title: Prefer custom SEO title, else high-CTR storefront pattern
    const seoTitle = (product.seo as any)?.title;
    const title = seoTitle
      ? `${seoTitle} | ${this.SITE_NAME}`
      : `Buy ${product.name} Online at Best Price | ${brandName} - ${this.SITE_NAME}`;

    // Description: Prefer custom SEO description, else clean description text
    const rawDesc = (product.seo as any)?.description || product.shortDescription || product.description;
    const cleanDesc = this.stripHtml(rawDesc);
    const priceNum = product.salePrice ? Number(product.salePrice) : Number(product.basePrice || 0);
    const description = cleanDesc.length > 25
      ? (cleanDesc.length > 180 ? `${cleanDesc.slice(0, 177)}...` : cleanDesc)
      : `Buy genuine ${product.name} by ${brandName} online at 3D Galaxy India for ₹${priceNum.toFixed(0)}. Specifications, warranty, genuine parts & express delivery.`;

    const inStock = (product.stock || 0) > 0 || (product.variants && product.variants.some(v => (v.stock || 0) > 0));

    const jsonLd = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "image": [primaryImage],
      "description": description,
      "sku": product.sku || product.slug,
      "brand": {
        "@type": "Brand",
        "name": brandName
      },
      "category": categoryName,
      "offers": {
        "@type": "Offer",
        "url": canonicalUrl,
        "priceCurrency": "INR",
        "price": String(priceNum.toFixed(2)),
        "itemCondition": "https://schema.org/NewCondition",
        "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
      }
    };

    const baseHtml = this.getBaseHtmlTemplate();
    return this.injectMetaTags(baseHtml, {
      title,
      description,
      canonicalUrl,
      imageUrl: primaryImage,
      imageAlt: product.name,
      type: 'product',
      price: priceNum.toFixed(2),
      availability: inStock ? 'in stock' : 'out of stock',
      jsonLd
    });
  }

  /**
   * Fetches category from database and renders full HTML with category-specific Open Graph tags.
   */
  public static async renderCategoryHtml(categorySlug: string): Promise<string | null> {
    if (!categorySlug) return null;

    const cleanSlug = categorySlug.trim().toLowerCase();

    const category = await prisma.category.findFirst({
      where: {
        slug: cleanSlug,
        deletedAt: null
      }
    });

    if (!category) {
      return null;
    }

    const title = `${category.name} | Buy Online | ${this.SITE_NAME}`;
    const cleanDesc = this.stripHtml(category.description);
    const description = cleanDesc.length > 20
      ? cleanDesc
      : `Shop high-quality ${category.name} online at India's trusted 3D printing store 3D Galaxy. Best prices, warranty & fast pan-India delivery.`;

    const canonicalUrl = `${this.CANONICAL_ORIGIN}/category/${category.slug}`;
    const imageUrl = category.image ? this.resolveAbsoluteImageUrl(category.image) : this.DEFAULT_IMAGE;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": category.name,
      "description": description,
      "url": canonicalUrl,
      "image": imageUrl
    };

    const baseHtml = this.getBaseHtmlTemplate();
    return this.injectMetaTags(baseHtml, {
      title,
      description,
      canonicalUrl,
      imageUrl,
      imageAlt: category.name,
      type: 'website',
      jsonLd
    });
  }

  /**
   * Fetches brand from database and renders full HTML with brand-specific Open Graph tags.
   */
  public static async renderBrandHtml(brandSlug: string): Promise<string | null> {
    if (!brandSlug) return null;

    const cleanSlug = brandSlug.trim().toLowerCase();

    const brand = await prisma.brand.findFirst({
      where: {
        slug: cleanSlug,
        deletedAt: null
      }
    });

    if (!brand) {
      return null;
    }

    const title = `${brand.name} 3D Printers & Filaments | Authorized Store - ${this.SITE_NAME}`;
    const cleanDesc = this.stripHtml(brand.description);
    const description = cleanDesc.length > 20
      ? cleanDesc
      : `Explore official ${brand.name} products at 3D Galaxy India. Buy genuine 3D printers, official spare parts, filaments & upgrade kits.`;

    const canonicalUrl = `${this.CANONICAL_ORIGIN}/brand/${brand.slug}`;
    const imageUrl = brand.logoUrl ? this.resolveAbsoluteImageUrl(brand.logoUrl) : this.DEFAULT_IMAGE;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `${brand.name} Products`,
      "description": description,
      "url": canonicalUrl,
      "image": imageUrl
    };

    const baseHtml = this.getBaseHtmlTemplate();
    return this.injectMetaTags(baseHtml, {
      title,
      description,
      canonicalUrl,
      imageUrl,
      imageAlt: brand.name,
      type: 'website',
      jsonLd
    });
  }

  /**
   * Renders the catalog listing page /products metadata.
   */
  public static renderCatalogHtml(): string {
    const title = `All 3D Printers, Filaments & Accessories | ${this.SITE_NAME}`;
    const description = `Browse 3D Galaxy's complete catalog of Bambu Lab 3D printers, Creality systems, premium PLA, ABS, PETG filaments, resin, and replacement parts with fast pan-India shipping.`;
    const canonicalUrl = `${this.CANONICAL_ORIGIN}/products`;

    const baseHtml = this.getBaseHtmlTemplate();
    return this.injectMetaTags(baseHtml, {
      title,
      description,
      canonicalUrl,
      imageUrl: this.DEFAULT_IMAGE,
      imageAlt: this.SITE_NAME,
      type: 'website'
    });
  }

  /**
   * Renders fallback generic HTML for unknown routes.
   */
  public static renderFallbackHtml(pathname: string = '/'): string {
    const canonicalUrl = `${this.CANONICAL_ORIGIN}${pathname.startsWith('/') ? pathname : '/' + pathname}`;
    const baseHtml = this.getBaseHtmlTemplate();
    return this.injectMetaTags(baseHtml, {
      title: `3D Galaxy | Buy 3D Printers, Filaments & 3D Printing Services Online`,
      description: `India's leading platform for 3D printers & rapid manufacturing. Shop Bambu Lab & Creality systems. Get automated slicing quotes for SLA & FDM parts.`,
      canonicalUrl,
      imageUrl: this.DEFAULT_IMAGE,
      imageAlt: this.SITE_NAME,
      type: 'website'
    });
  }
}
export default StorefrontMetaService;
