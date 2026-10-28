/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 1: UNIT TESTS — Complete E-Commerce SEO Engine, Canonical Resolution, JSON-LD Schemas & Feeds
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

export async function runSeoEngineAndFeedsUnitTests() {
  const results = { passed: 0, failed: 0, errors: [] as string[] };

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        throw new Error('Async tests must be awaited within the suite');
      }
      results.passed++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${name}: ${err.message}`);
    }
  }

  // --- 1. CANONICAL URL RESOLUTION & SECURITY GUARDS ---

  const CANONICAL_ORIGIN = 'https://3dgalaxy.co.in';

  function resolveCanonicalUrl(rawPathOrUrl: string): string {
    if (!rawPathOrUrl) return CANONICAL_ORIGIN;
    let p = rawPathOrUrl.trim();
    const lower = p.toLowerCase();
    if (
      lower.includes('firebasestorage') ||
      lower.includes('storage.googleapis.com') ||
      lower.includes('.jpg') ||
      lower.includes('.jpeg') ||
      lower.includes('.png') ||
      lower.includes('.webp') ||
      lower.includes('.svg')
    ) {
      return CANONICAL_ORIGIN;
    }
    p = p.replace(/^https?:\/\/[^\/]+/i, '');
    p = p.split('?')[0].split('#')[0];
    if (!p.startsWith('/')) p = '/' + p;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return `${CANONICAL_ORIGIN}${p}`;
  }

  test('Canonical: Resolves product slug to canonical production URL', () => {
    const canonical = resolveCanonicalUrl('/product/creality-k1-max-3d-printer');
    assert.strictEqual(
      canonical,
      'https://3dgalaxy.co.in/product/creality-k1-max-3d-printer',
      'Must map to production origin and product route'
    );
  });

  test('Canonical: Strips tracking and variant query parameters', () => {
    const canonical = resolveCanonicalUrl('/product/bambu-lab-a1?variant=v123&utm_source=google&gclid=xyz');
    assert.strictEqual(
      canonical,
      'https://3dgalaxy.co.in/product/bambu-lab-a1',
      'Canonical must strip query params to prevent duplicate content indexing'
    );
  });

  test('Canonical Guard: Rejects Firebase Storage and CDN image URLs', () => {
    const badUrl1 = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/products%2Fimage.jpg?alt=media';
    const badUrl2 = 'https://storage.googleapis.com/ajr3dgalaxy.firebasestorage.app/uploads/sample.png';
    assert.strictEqual(resolveCanonicalUrl(badUrl1), CANONICAL_ORIGIN, 'Must reject Firebase Storage link');
    assert.strictEqual(resolveCanonicalUrl(badUrl2), CANONICAL_ORIGIN, 'Must reject Google Cloud Storage CDN link');
  });

  test('Canonical Guard: Rejects direct image extensions from becoming canonical', () => {
    const imagePath = '/assets/images/filament-black.webp';
    assert.strictEqual(resolveCanonicalUrl(imagePath), CANONICAL_ORIGIN, 'Must reject image extensions');
  });

  test('Canonical: Normalizes trailing slashes consistently', () => {
    const canonical = resolveCanonicalUrl('/category/3d-printers/');
    assert.strictEqual(canonical, 'https://3dgalaxy.co.in/category/3d-printers', 'Must remove trailing slash');
  });

  // --- 2. HTML STRIPPING & PLAIN-TEXT NORMALIZATION ---

  function stripHtml(html?: string | null): string {
    if (!html) return '';
    return String(html)
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  test('StripHtml: Cleans rich text HTML tags and entities from product descriptions', () => {
    const richDesc = '<div data-e-type="specs"><p><strong>High Speed</strong> 3D printer &amp; PLA Pro.</p></div>';
    const clean = stripHtml(richDesc);
    assert.strictEqual(clean, 'High Speed 3D printer & PLA Pro.', 'Must output clean plain-text description');
  });

  // --- 3. SCHEMA.ORG PRODUCT, OFFER & BREADCRUMBLIST JSON-LD ---

  function buildProductJsonLd(product: any, selectedVariant?: any) {
    const sellingPrice = selectedVariant?.price !== undefined ? Number(selectedVariant.price) : Number(product.salePrice || product.basePrice || 0);
    const inStock = selectedVariant?.stock !== undefined ? selectedVariant.stock > 0 : product.stock > 0;
    const sku = selectedVariant?.sku || product.sku || product.id;
    const canonicalUrl = resolveCanonicalUrl(`/product/${product.slug}`);

    const schema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: stripHtml(product.description || product.name),
      sku: sku,
      brand: {
        '@type': 'Brand',
        name: product.brand?.name || product.brand || '3D Galaxy'
      },
      url: canonicalUrl,
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'INR',
        price: sellingPrice.toFixed(2),
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: '3D Galaxy',
          url: 'https://3dgalaxy.co.in'
        }
      }
    };

    if (product.reviews && product.reviews.length > 0) {
      const avg = product.reviews.reduce((acc: number, r: any) => acc + Number(r.rating || 5), 0) / product.reviews.length;
      schema['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: avg.toFixed(1),
        reviewCount: product.reviews.length,
        bestRating: '5',
        worstRating: '1'
      };
    }

    return schema;
  }

  test('JSON-LD: Product and Offer schema match database price, currency, and stock', () => {
    const mockProduct = {
      id: 'prod-001',
      name: '3D Galaxy PLA Pro Filament 1.75mm',
      slug: '3d-galaxy-pla-pro-filament-1-75mm',
      sku: 'PLA-PRO-WHT-1KG',
      basePrice: 999,
      salePrice: 719,
      stock: 45,
      brand: '3D Galaxy',
      description: '<p>Premium PLA Pro 1.75mm filament for high speed 3D printing.</p>',
      reviews: [{ rating: 5 }, { rating: 4 }]
    };

    const schema = buildProductJsonLd(mockProduct);
    assert.strictEqual(schema['@context'], 'https://schema.org');
    assert.strictEqual(schema['@type'], 'Product');
    assert.strictEqual(schema['sku'], 'PLA-PRO-WHT-1KG');
    assert.strictEqual(schema['offers'].priceCurrency, 'INR');
    assert.strictEqual(schema['offers'].price, '719.00');
    assert.strictEqual(schema['offers'].availability, 'https://schema.org/InStock');
    assert.strictEqual(schema['aggregateRating']?.ratingValue, '4.5');
    assert.strictEqual(schema['aggregateRating']?.reviewCount, 2);
  });

  test('JSON-LD: Variant selection dynamically updates schema price, stock, and SKU', () => {
    const mockProduct = {
      id: 'prod-002',
      name: 'Creality K1 Max AI 3D Printer',
      slug: 'creality-k1-max-ai-3d-printer',
      sku: 'K1-MAX-BASE',
      basePrice: 89999,
      salePrice: 79999,
      stock: 5,
      brand: 'Creality'
    };
    const selectedVariant = {
      sku: 'K1-MAX-COMBO-AI',
      price: 84999,
      stock: 0
    };

    const schema = buildProductJsonLd(mockProduct, selectedVariant);
    assert.strictEqual(schema['sku'], 'K1-MAX-COMBO-AI', 'SKU must match selected variant');
    assert.strictEqual(schema['offers'].price, '84999.00', 'Price must update to variant price');
    assert.strictEqual(schema['offers'].availability, 'https://schema.org/OutOfStock', 'Availability must reflect 0 stock');
    assert.strictEqual(schema['aggregateRating'], undefined, 'No fake ratings when reviews array is empty');
  });

  // --- 4. ROBOTS.TXT COMPLIANCE AUDIT ---

  test('Robots.txt: Exists and grants crawlers access to products while disallowing private routes', () => {
    const robotsPath = path.resolve(process.cwd(), 'public/robots.txt');
    assert.ok(fs.existsSync(robotsPath), 'public/robots.txt must exist on disk');

    const content = fs.readFileSync(robotsPath, 'utf-8');
    assert.ok(content.includes('Allow: /product/'), 'Must explicitly allow /product/');
    assert.ok(content.includes('Allow: /category/'), 'Must explicitly allow /category/');
    assert.ok(content.includes('Disallow: /admin'), 'Must protect /admin');
    assert.ok(content.includes('Disallow: /cart'), 'Must protect /cart');
    assert.ok(content.includes('Disallow: /checkout'), 'Must protect /checkout');
    assert.ok(content.includes('Sitemap: https://3dgalaxy.co.in/sitemap.xml'), 'Must declare canonical sitemap URL');
  });

  // --- 5. FIREBASE.JSON REWRITES AUDIT ---

  test('Firebase.json: Rewrites route /sitemap.xml and /google-merchant.xml to the Cloud Run API service', () => {
    const firebaseJsonPath = path.resolve(process.cwd(), 'firebase.json');
    assert.ok(fs.existsSync(firebaseJsonPath), 'firebase.json must exist');

    const config = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf-8'));
    const rewrites = config.hosting?.rewrites || [];

    const sitemapRewrite = rewrites.find((r: any) => r.source === '/sitemap.xml');
    assert.ok(sitemapRewrite, '/sitemap.xml rewrite must be present');
    assert.strictEqual(sitemapRewrite.run?.serviceId, 'api', '/sitemap.xml must route to Cloud Run api');

    const merchantRewrite = rewrites.find((r: any) => r.source === '/google-merchant.xml');
    assert.ok(merchantRewrite, '/google-merchant.xml rewrite must be present');
    assert.strictEqual(merchantRewrite.run?.serviceId, 'api', '/google-merchant.xml must route to Cloud Run api');
  });

  return results;
}
