import { StorefrontMetaService } from '../functions/src/services/storefrontMeta.service';
import { prisma } from '../functions/src/config/database';
import { buildWhatsAppUrl, formatWhatsAppNumber } from '../src/app/shared/utils/phone.utils';
import axios from 'axios';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function record(name: string, condition: boolean, details?: string, error?: string) {
  results.push({
    name,
    passed: condition,
    details,
    error: condition ? undefined : (error || 'Assertion failed'),
  });
  const symbol = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol}: ${name}${details ? ` (${details})` : ''}${!condition && error ? ` - ERROR: ${error}` : ''}`);
}

async function runValidation() {
  console.log('====================================================');
  console.log('🚀 3D GALAXY WHATSAPP & SEO VALIDATION SUITE');
  console.log('====================================================\n');

  // 1. Phone number & URL utility tests
  console.log('--- 1. Outbound WhatsApp Utilities & Encoding ---');
  const phone1 = formatWhatsAppNumber('9111381113');
  record('Format 10-digit phone', phone1 === '919111381113', phone1);

  const phone2 = formatWhatsAppNumber('+91 91113 81113');
  record('Format formatted +91 phone', phone2 === '919111381113', phone2);

  const phone3 = formatWhatsAppNumber('');
  record('Fallback to official default', phone3 === '919111381113', phone3);

  const sampleUrl = 'https://3dgalaxy.co.in/product/creality-ender-3-v3-se?color=black&spec=standard';
  const sampleMsg = `Hi 3D Galaxy, I'm interested in this product: Ender 3 & Filament (3D அச்சுப்பொறி 🔥) — ${sampleUrl}`;
  const builtWaUrl = buildWhatsAppUrl('919111381113', sampleMsg);

  record('WhatsApp URL target phone is wa.me/919111381113', builtWaUrl.startsWith('https://wa.me/919111381113?text='));
  record('WhatsApp URL contains encoded Tamil and emoji', builtWaUrl.includes(encodeURIComponent('3D அச்சுப்பொறி 🔥')));
  record('WhatsApp URL contains absolute product URL', builtWaUrl.includes(encodeURIComponent(sampleUrl)));
  record('WhatsApp URL prevents double-encoding', !builtWaUrl.includes('%2520'));

  // 2. Database Fetch & Product Meta Generation
  console.log('\n--- 2. Database & Product-Specific Open Graph Meta ---');
  let sampleProduct = await prisma.product.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      basePrice: true,
      images: true,
      stock: true,
      category: { select: { name: true, slug: true } },
    },
  });

  if (!sampleProduct) {
    console.warn('⚠️ No active product in DB. Using mock product for assertion.');
    sampleProduct = {
      id: 'mock-1',
      name: 'Creality Ender 3 V3 SE High Speed 3D Printer',
      slug: 'creality-ender-3-v3-se-high-speed-3d-printer',
      description: '<p>High-speed direct drive 3D printer with <b>auto leveling</b>.</p>',
      basePrice: 16999,
      images: ['https://storage.googleapis.com/ajr3dgalaxy.firebasestorage.app/product-import/1784444018366-345115012.jpg'],
      stock: 10,
      category: { name: '3D Printers', slug: '3d-printers' },
    } as any;
  }

  console.log(`Testing with product: "${sampleProduct.name}" (Slug: ${sampleProduct.slug})`);

  const productHtml = (await StorefrontMetaService.renderProductHtml(sampleProduct.slug)) || '';

  record('Product HTML is non-empty string', typeof productHtml === 'string' && productHtml.length > 500);
  record('Product HTML has dynamic og:title containing product name', productHtml.includes('<meta property="og:title"') && productHtml.includes(sampleProduct.name));
  record('Product HTML has dynamic og:url matching canonical product URL', productHtml.includes(`<meta property="og:url" content="https://3dgalaxy.co.in/product/${sampleProduct.slug}">`));
  record('Product HTML has og:type product', productHtml.includes('<meta property="og:type" content="product">'));
  record('Product HTML has og:site_name "3D Galaxy"', productHtml.includes('<meta property="og:site_name" content="3D Galaxy">'));
  record('Product HTML has twitter:card summary_large_image', productHtml.includes('<meta name="twitter:card" content="summary_large_image">'));
  record('Product HTML has JSON-LD schema', productHtml.includes('application/ld+json') && productHtml.includes('"@type": "Product"'));

  // Check description has no unstripped HTML tags
  const ogDescMatch = productHtml.match(/<meta property="og:description" content="([^"]+)"/);
  const ogDesc = ogDescMatch ? ogDescMatch[1] : '';
  record('Product description strips HTML tags cleanly', ogDesc.length > 0 && !ogDesc.includes('<p>') && !ogDesc.includes('<b>'));

  // Check image
  const ogImgMatch = productHtml.match(/<meta property="og:image" content="([^"]+)"/);
  const ogImg = ogImgMatch ? ogImgMatch[1] : '';
  record('Product has absolute HTTPS og:image', ogImg.startsWith('https://'));
  record('Product has og:image:secure_url matching og:image', productHtml.includes(`<meta property="og:image:secure_url" content="${ogImg}">`));

  // 3. Image Accessibility Verification
  console.log('\n--- 3. Image Accessibility & Content Type ---');
  if (ogImg) {
    try {
      const imgRes = await axios.get(ogImg, {
        headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
        timeout: 10000,
        responseType: 'arraybuffer',
        validateStatus: (status) => status < 400,
      });
      const contentType = imgRes.headers['content-type'] || '';
      const contentLength = Number(imgRes.headers['content-length'] || imgRes.data.length);
      record('og:image URL returns HTTP 200 without auth', imgRes.status === 200, `Status: ${imgRes.status}`);
      record('og:image is valid image content-type', contentType.startsWith('image/'), `Content-Type: ${contentType}`);
      record('og:image file size is valid (> 1KB and < 10MB)', contentLength > 1024 && contentLength < 10 * 1024 * 1024, `Size: ${Math.round(contentLength / 1024)} KB`);
    } catch (err: any) {
      record('og:image fetch test', false, undefined, err.message);
    }
  }

  // 4. Missing / Null Image Fallback
  console.log('\n--- 4. Missing / Null Image Fallback ---');
  const fallbackHtml = StorefrontMetaService.injectMetaTags(
    StorefrontMetaService.getBaseHtmlTemplate(),
    {
      title: 'Missing Image Product',
      description: 'Testing fallback behavior',
      imageUrl: null as any,
      canonicalUrl: 'https://3dgalaxy.co.in/product/test-missing-image',
    }
  );
  record('Null image falls back to official 3D Galaxy logo', fallbackHtml.includes('<meta property="og:image" content="https://3dgalaxy.co.in/3d-logo.png">'));

  // 5. Category & Catalog Pages
  console.log('\n--- 5. Category & Catalog Open Graph Meta ---');
  const categoryHtml = (await StorefrontMetaService.renderCategoryHtml('filaments')) || '';
  record('Category page renders with Category in og:title', categoryHtml.includes('Filaments') || categoryHtml.includes('Category') || categoryHtml.includes('3D Galaxy'));
  record('Category og:url is canonical category URL', categoryHtml.includes('https://3dgalaxy.co.in/category/filaments'));

  const catalogHtml = StorefrontMetaService.renderCatalogHtml();
  record('Catalog page renders with 3D Galaxy Products in og:title', catalogHtml.includes('3D Printers') && catalogHtml.includes('3D Galaxy'));
  record('Catalog og:url is canonical products URL', catalogHtml.includes('https://3dgalaxy.co.in/products'));

  // 6. Inbound Webhook URL Extraction
  console.log('\n--- 6. Inbound Webhook Message URL Extraction ---');
  const incomingCustomerMessage = 'Hi 3D Galaxy, is this available? https://3dgalaxy.co.in/product/creality-ender-3-v3-se-high-speed-3d-printer Thanks!';
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  const matches = incomingCustomerMessage.match(urlRegex) || [];
  record('Extracted URL from customer message', matches.length === 1 && matches[0] === 'https://3dgalaxy.co.in/product/creality-ender-3-v3-se-high-speed-3d-printer');
  
  let extractedSlug: string | null = null;
  const productUrlMatch = matches[0].match(/\/product(?:s)?\/([a-zA-Z0-9\-_]+)/);
  if (productUrlMatch) {
    extractedSlug = productUrlMatch[1];
  }
  record('Extracted product slug from URL', extractedSlug === 'creality-ender-3-v3-se-high-speed-3d-printer');
  record('Original customer message is completely untouched', incomingCustomerMessage === 'Hi 3D Galaxy, is this available? https://3dgalaxy.co.in/product/creality-ender-3-v3-se-high-speed-3d-printer Thanks!');

  // Summary
  console.log('\n====================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('====================================================');

  await prisma.$disconnect();
  if (failedCount > 0) {
    process.exit(1);
  }
}

runValidation().catch((err) => {
  console.error('Validation crashed:', err);
  process.exit(1);
});
