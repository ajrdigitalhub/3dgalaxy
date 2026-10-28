import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface SeoProductPayload {
  id?: string;
  name: string;
  slug: string;
  sku?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  basePrice?: number | string | null;
  salePrice?: number | string | null;
  price?: number | string | null;
  stock?: number | null;
  images?: any;
  brand?: any;
  category?: any;
  reviews?: any[];
  rating?: number | null;
  totalReviews?: number | null;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string;
    canonicalUrl?: string;
  };
  [key: string]: any;
}

export interface SeoCategoryPayload {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  productCount?: number;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  readonly CANONICAL_ORIGIN = 'https://3dgalaxy.co.in';
  readonly SITE_NAME = '3D Galaxy';
  readonly DEFAULT_LOGO = 'https://3dgalaxy.co.in/3d-logo.png';

  private jsonLdScriptElements: Map<string, HTMLScriptElement> = new Map();

  // Helper: Strip HTML tags and normalize whitespace for descriptions & feeds
  stripHtml(html: string | null | undefined): string {
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

  // Helper: Resolve a safe, validated Canonical URL strictly bound to production domain
  resolveCanonicalUrl(rawPathOrUrl: string): string {
    if (!rawPathOrUrl) return this.CANONICAL_ORIGIN;

    let path = rawPathOrUrl.trim();

    // SECURITY & COMPLIANCE GUARD:
    // If the path accidentally contains a Firebase Storage URL, external CDN, or image file, reject it!
    const lower = path.toLowerCase();
    if (
      lower.includes('firebasestorage') ||
      lower.includes('storage.googleapis.com') ||
      lower.includes('.jpg') ||
      lower.includes('.jpeg') ||
      lower.includes('.png') ||
      lower.includes('.webp') ||
      lower.includes('.svg')
    ) {
      console.warn('[SeoService] Rejected invalid canonical candidate containing image/storage URL:', path);
      return this.CANONICAL_ORIGIN;
    }

    // Strip out protocol and origin if already present
    path = path.replace(/^https?:\/\/[^\/]+/i, '');

    // Strip query parameters and hashes for canonical URLs
    path = path.split('?')[0].split('#')[0];

    // Normalize slashes
    if (!path.startsWith('/')) path = '/' + path;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

    return `${this.CANONICAL_ORIGIN}${path}`;
  }

  // Update or inject link[rel="canonical"]
  setCanonicalUrl(urlOrPath: string): void {
    const canonicalHref = this.resolveCanonicalUrl(urlOrPath);

    try {
      let link: HTMLLinkElement | null = this.document.querySelector("link[rel='canonical']");
      if (!link) {
        link = this.document.createElement('link');
        link.setAttribute('rel', 'canonical');
        this.document.head.appendChild(link);
      }
      link.setAttribute('href', canonicalHref);

      // Clean up any accidental duplicate canonical tags
      const allCanonicalLinks = this.document.querySelectorAll("link[rel='canonical']");
      if (allCanonicalLinks.length > 1) {
        for (let i = 1; i < allCanonicalLinks.length; i++) {
          allCanonicalLinks[i].parentNode?.removeChild(allCanonicalLinks[i]);
        }
      }
    } catch (e) {
      console.error('[SeoService] Error updating canonical link:', e);
    }
  }

  // Extract primary absolute image URL for metadata
  resolveAbsoluteImageUrl(rawImage: any): string {
    if (!rawImage) return this.DEFAULT_LOGO;

    let url = '';
    if (typeof rawImage === 'string') {
      url = rawImage.trim();
    } else if (typeof rawImage === 'object') {
      url = (rawImage.url || rawImage.imageUrl || rawImage.src || rawImage.path || '').trim();
    }

    if (!url || url.startsWith('data:') || url === '[object Object]') {
      return this.DEFAULT_LOGO;
    }

    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Relative path
    return `${this.CANONICAL_ORIGIN}/${url.replace(/^\/+/, '')}`;
  }

  // Sets comprehensive Open Graph & Twitter metadata
  setSocialMetadata(meta: {
    title: string;
    description: string;
    url: string;
    image: string;
    type?: string;
    price?: number | string;
    currency?: string;
  }): void {
    const absUrl = this.resolveCanonicalUrl(meta.url);
    const absImage = this.resolveAbsoluteImageUrl(meta.image);
    const cleanDesc = this.stripHtml(meta.description);

    this.metaService.updateTag({ property: 'og:site_name', content: this.SITE_NAME });
    this.metaService.updateTag({ property: 'og:type', content: meta.type || 'website' });
    this.metaService.updateTag({ property: 'og:title', content: meta.title });
    this.metaService.updateTag({ property: 'og:description', content: cleanDesc });
    this.metaService.updateTag({ property: 'og:url', content: absUrl });
    this.metaService.updateTag({ property: 'og:image', content: absImage });
    this.metaService.updateTag({ property: 'og:image:alt', content: meta.title });

    if (meta.price !== undefined && meta.price !== null) {
      this.metaService.updateTag({ property: 'product:price:amount', content: String(meta.price) });
      this.metaService.updateTag({ property: 'product:price:currency', content: meta.currency || 'INR' });
    }

    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: meta.title });
    this.metaService.updateTag({ name: 'twitter:description', content: cleanDesc });
    this.metaService.updateTag({ name: 'twitter:image', content: absImage });
  }

  // Manage Schema.org JSON-LD scripts
  setJsonLd(schemaId: string, schemaObj: Record<string, any>): void {
    try {
      const scriptId = `jsonld-${schemaId}`;
      let script = this.document.getElementById(scriptId) as HTMLScriptElement;

      if (!script) {
        script = this.document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        this.document.head.appendChild(script);
        this.jsonLdScriptElements.set(schemaId, script);
      }

      script.textContent = JSON.stringify(schemaObj, null, 2);
    } catch (e) {
      console.error('[SeoService] Error injecting JSON-LD schema:', e);
    }
  }

  removeJsonLd(schemaId: string): void {
    try {
      const scriptId = `jsonld-${schemaId}`;
      const script = this.document.getElementById(scriptId);
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      this.jsonLdScriptElements.delete(schemaId);
    } catch (_) {}
  }

  // --------------------------------------------------------------------------
  // 1. PRODUCT LEVEL SEO (Title, Description, Canonical, OG, Twitter, Schema)
  // --------------------------------------------------------------------------
  setProductSeo(product: SeoProductPayload, selectedVariant?: any): void {
    if (!product) return;

    const brandName = product.brand?.name || (typeof product.brand === 'string' ? product.brand : this.SITE_NAME);
    const categoryName = product.category?.name || (typeof product.category === 'string' ? product.category : '3D Printing');
    const slug = product.slug;

    // Pricing calculation matching the storefront checkout logic
    const sellingPrice = selectedVariant?.price !== undefined && selectedVariant?.price !== null
      ? Number(selectedVariant.price)
      : (product.salePrice ? Number(product.salePrice) : Number(product.basePrice || 0));

    const mrpPrice = selectedVariant?.mrp !== undefined && selectedVariant?.mrp !== null
      ? Number(selectedVariant.mrp)
      : Number(product.basePrice || sellingPrice);

    // Stock availability
    const inStock = selectedVariant?.stock !== undefined ? selectedVariant.stock > 0 : (product.stock || 0) > 0;
    const availabilitySchema = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

    // SKU identification
    const sku = selectedVariant?.sku || product.sku || product.id || product.slug;

    // Image resolution
    let imageList: string[] = [];
    if (selectedVariant?.image) {
      imageList.push(this.resolveAbsoluteImageUrl(selectedVariant.image));
    }
    if (Array.isArray(product.images)) {
      product.images.forEach(img => {
        const u = this.resolveAbsoluteImageUrl(img);
        if (!imageList.includes(u)) imageList.push(u);
      });
    } else if (typeof product.images === 'string' && product.images) {
      imageList.push(this.resolveAbsoluteImageUrl(product.images));
    }
    if (imageList.length === 0) imageList.push(this.DEFAULT_LOGO);

    const primaryImage = imageList[0];

    // SEO Title & Description (Prefer database SEO fields, fallback to high-CTR e-commerce pattern)
    const title = product.seo?.title ||
      `Buy ${product.name} Online at Best Price | ${brandName} - ${this.SITE_NAME}`;

    const cleanDesc = this.stripHtml(product.seo?.description || product.shortDescription || product.description);
    const description = cleanDesc.length > 30
      ? cleanDesc
      : `Buy genuine ${product.name} by ${brandName} online in India. Check specifications, reviews, ₹${sellingPrice.toFixed(0)} pricing, and fast delivery at ${this.SITE_NAME}.`;

    // 1. Update Title and standard Meta
    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' });

    // 2. Set strict canonical URL
    const productRoute = `/product/${slug}`;
    this.setCanonicalUrl(productRoute);

    // 3. Set Open Graph & Twitter Cards
    this.setSocialMetadata({
      title,
      description,
      url: productRoute,
      image: primaryImage,
      type: 'product',
      price: sellingPrice.toFixed(2),
      currency: 'INR'
    });

    // 4. Schema.org Product & Offer Structured Data (JSON-LD)
    const productSchema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: imageList,
      description: description,
      sku: sku,
      mpn: sku,
      brand: {
        '@type': 'Brand',
        name: brandName
      },
      category: categoryName,
      url: `${this.CANONICAL_ORIGIN}${productRoute}`,
      offers: {
        '@type': 'Offer',
        url: `${this.CANONICAL_ORIGIN}${productRoute}`,
        priceCurrency: 'INR',
        price: sellingPrice.toFixed(2),
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        itemCondition: 'https://schema.org/NewCondition',
        availability: availabilitySchema,
        seller: {
          '@type': 'Organization',
          name: this.SITE_NAME,
          url: this.CANONICAL_ORIGIN
        },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: '0.00',
            currency: 'INR'
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'IN'
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 0,
              maxValue: 1,
              unitCode: 'DAY'
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 2,
              maxValue: 5,
              unitCode: 'DAY'
            }
          }
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'IN',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 7,
          returnMethod: 'https://schema.org/ReturnByMail',
          returnFees: 'https://schema.org/FreeReturn'
        }
      }
    };

    // Include aggregateRating only when genuine review data exists
    const ratingVal = Number(product.rating || 0);
    const reviewCount = Number(product.totalReviews || (product.reviews ? product.reviews.length : 0));
    if (ratingVal > 0 && reviewCount > 0) {
      productSchema['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: ratingVal.toFixed(1),
        reviewCount: reviewCount,
        bestRating: '5',
        worstRating: '1'
      };
    }

    this.setJsonLd('product', productSchema);

    // 5. BreadcrumbList JSON-LD
    const categorySlug = product.category?.slug || '';
    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Home', url: '/' },
      ...(categoryName && categorySlug ? [{ name: categoryName, url: `/category/${categorySlug}` }] : []),
      { name: product.name, url: productRoute }
    ];
    this.setBreadcrumbsSeo(breadcrumbs);
  }

  // --------------------------------------------------------------------------
  // 2. CATEGORY LEVEL SEO
  // --------------------------------------------------------------------------
  setCategorySeo(category: SeoCategoryPayload): void {
    if (!category) return;

    const catName = category.name;
    const slug = category.slug;
    const catRoute = `/category/${slug}`;

    const title = `${catName} | Buy 3D Printing ${catName} Online in India | ${this.SITE_NAME}`;
    const description = category.description && category.description.length > 20
      ? this.stripHtml(category.description)
      : `Explore the best range of ${catName} at ${this.SITE_NAME}. Certified brands, high precision, verified warranty, and express shipping across India.`;

    const image = this.resolveAbsoluteImageUrl(category.image);

    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large' });

    this.setCanonicalUrl(catRoute);

    this.setSocialMetadata({
      title,
      description,
      url: catRoute,
      image,
      type: 'website'
    });

    this.setBreadcrumbsSeo([
      { name: 'Home', url: '/' },
      { name: 'Categories', url: '/products' },
      { name: catName, url: catRoute }
    ]);
  }

  // --------------------------------------------------------------------------
  // 3. HOMEPAGE & BRAND LEVEL SEO
  // --------------------------------------------------------------------------
  setHomeSeo(): void {
    const title = '3D Galaxy | Buy 3D Printers, Filaments & Custom 3D Printing Service Online';
    const description = "Shop professional 3D printers, high-grade filaments & spare parts at India's lowest prices. Get instant online slicing quotes for custom SLA & FDM 3D printing with express shipping across India.";

    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large' });
    this.setCanonicalUrl('/');

    this.setSocialMetadata({
      title,
      description,
      url: '/',
      image: this.DEFAULT_LOGO,
      type: 'website'
    });

    // Organization Schema
    const orgSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: this.SITE_NAME,
      url: this.CANONICAL_ORIGIN,
      logo: this.DEFAULT_LOGO,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+91-9876543210',
        contactType: 'customer service',
        email: 'support@3dgalaxy.co.in',
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi']
      },
      sameAs: [
        'https://instagram.com/3dgalaxy.co.in',
        'https://facebook.com/3dgalaxy.co.in'
      ]
    };
    this.setJsonLd('organization', orgSchema);

    // WebSite with SearchAction for Sitelinks Search Box
    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.SITE_NAME,
      url: this.CANONICAL_ORIGIN,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.CANONICAL_ORIGIN}/products?search={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };
    this.setJsonLd('website', websiteSchema);
  }

  // --------------------------------------------------------------------------
  // 4. BREADCRUMBLIST SCHEMA
  // --------------------------------------------------------------------------
  setBreadcrumbsSeo(items: BreadcrumbItem[]): void {
    if (!items || items.length === 0) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: item.name,
        item: `${this.CANONICAL_ORIGIN}${item.url.startsWith('/') ? item.url : '/' + item.url}`
      }))
    };

    this.setJsonLd('breadcrumbs', schema);
  }
}
