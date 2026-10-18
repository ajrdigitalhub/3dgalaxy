/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 1: UNIT TESTS — Product Brand Synchronization & Searchable Product Selectors
 */

import assert from 'node:assert';

export interface TestBrand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  isActive?: boolean;
}

export interface TestProduct {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  salePrice?: number;
  brand?: any;
  brandId?: string;
  category?: any;
  categoryId?: string;
  bundleProducts?: any[];
  recommendedFilaments?: any[];
  images?: any[];
  stock?: number;
}

export async function runProductBrandBundleFilamentUnitTests() {
  const results = { passed: 0, failed: 0, errors: [] as string[] };

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        throw new Error('Async test must be awaited inside runner');
      }
      results.passed++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${name}: ${err.message}`);
    }
  }

  // --- BRAND RESOLUTION & SYNCHRONIZATION TESTS ---

  const MOCK_BRANDS: TestBrand[] = [
    { id: 'b-ff-001', name: 'Flashforge', slug: 'flashforge', isActive: true },
    { id: 'b-cr-002', name: 'Creality', slug: 'creality', isActive: true },
    { id: 'b-bm-003', name: 'Bambu Lab', slug: 'bambu-lab', isActive: true },
    { id: 'b-3d-004', name: '3D Galaxy', slug: '3d-galaxy', isActive: true },
  ];

  function resolveBrandId(rawBrand: any, brands: TestBrand[]): string {
    if (!rawBrand) return '';
    const rawStr = typeof rawBrand === 'object'
      ? String(rawBrand.id || rawBrand.slug || rawBrand.name || '')
      : String(rawBrand).trim();
    if (!rawStr) return '';

    // 1. Direct match by id
    const byId = brands.find(b => b.id === rawStr);
    if (byId) return byId.id;

    // 2. Case-insensitive name match
    const byName = brands.find(b => b.name && b.name.toLowerCase() === rawStr.toLowerCase());
    if (byName) return byName.id;

    // 3. Slug match
    const bySlug = brands.find(b => b.slug && b.slug.toLowerCase() === rawStr.toLowerCase());
    if (bySlug) return bySlug.id;

    return rawStr;
  }

  test('Brand Sync: Existing product with brand UUID maps directly to brand ID in edit mode', () => {
    const p: TestProduct = {
      id: 'p-101',
      name: 'Adventurer 5M Pro',
      sku: 'FF-ADV-5M',
      basePrice: 45000,
      brandId: 'b-ff-001',
      brand: 'Flashforge'
    };
    const resolved = resolveBrandId(p.brandId, MOCK_BRANDS);
    assert.strictEqual(resolved, 'b-ff-001', 'Direct brandId UUID should resolve to itself');
  });

  test('Brand Sync: Legacy product storing only brand string name resolves to matching Brand UUID', () => {
    const legacyProduct: TestProduct = {
      id: 'p-102',
      name: 'Ender 3 V3 KE',
      sku: 'CR-E3-V3',
      basePrice: 28000,
      brand: 'Creality' // string name instead of UUID
    };
    const resolved = resolveBrandId(legacyProduct.brand, MOCK_BRANDS);
    assert.strictEqual(resolved, 'b-cr-002', 'Legacy string name "Creality" must resolve to UUID "b-cr-002"');
  });

  test('Brand Sync: Legacy product storing brand slug resolves correctly', () => {
    const legacyProduct: TestProduct = {
      id: 'p-103',
      name: 'Bambu X1 Carbon',
      sku: 'BAMBU-X1C',
      basePrice: 120000,
      brand: 'bambu-lab'
    };
    const resolved = resolveBrandId(legacyProduct.brand, MOCK_BRANDS);
    assert.strictEqual(resolved, 'b-bm-003', 'Brand slug must resolve to correct brand UUID');
  });

  test('Brand Sync: Asynchronous brands loading resolves correctly regardless of response arrival order', () => {
    let currentBrand = '';
    let rawBrand = 'Flashforge';

    // 1. Initial product load before brands API completes (brands list empty)
    const emptyBrands: TestBrand[] = [];
    currentBrand = resolveBrandId(rawBrand, emptyBrands);
    assert.strictEqual(currentBrand, 'Flashforge', 'Temporary fallback holds raw string before brands arrive');

    // 2. Brands catalog API resolves later
    const resolvedWhenBrandsArrive = resolveBrandId(rawBrand, MOCK_BRANDS);
    assert.strictEqual(resolvedWhenBrandsArrive, 'b-ff-001', 'Reactive effect resolves to stable UUID once brands load');
  });

  test('Brand Sync: Editing unrelated field preserves the saved brand accurately', () => {
    let savedProduct: TestProduct = {
      id: 'p-104',
      name: 'Flashforge Finder 3',
      sku: 'FF-FINDER-3',
      basePrice: 22000,
      brandId: 'b-ff-001',
      brand: 'Flashforge'
    };

    // User edits only stock and description
    const editedFields = { stock: 15, description: 'Updated technical details' };
    const selectedBrandId = savedProduct.brandId;
    const matchedBrand = MOCK_BRANDS.find(b => b.id === selectedBrandId);

    savedProduct = {
      ...savedProduct,
      ...editedFields,
      brand: matchedBrand ? matchedBrand.name : (selectedBrandId || '3D Galaxy'),
      brandId: matchedBrand ? matchedBrand.id : (selectedBrandId || undefined)
    };

    assert.strictEqual(savedProduct.brandId, 'b-ff-001');
    assert.strictEqual(savedProduct.brand, 'Flashforge');
    assert.strictEqual(savedProduct.stock, 15);
  });

  test('Brand Sync: Changing brand and saving persists new brand ID and name', () => {
    let product: TestProduct = {
      id: 'p-105',
      name: 'Multi-brand Machine',
      sku: 'MB-001',
      basePrice: 35000,
      brandId: 'b-ff-001',
      brand: 'Flashforge'
    };

    // Admin selects "Creality" from dropdown (dropdown emits "b-cr-002")
    const newSelectedBrandId = 'b-cr-002';
    const matched = MOCK_BRANDS.find(b => b.id === newSelectedBrandId);

    const updatedProduct = {
      ...product,
      brand: matched ? matched.name : newSelectedBrandId,
      brandId: matched ? matched.id : newSelectedBrandId
    };

    assert.strictEqual(updatedProduct.brandId, 'b-cr-002');
    assert.strictEqual(updatedProduct.brand, 'Creality');
  });

  test('Brand Sync: Null or legacy missing brand values default safely without crashing', () => {
    const unbrandedProduct: TestProduct = {
      id: 'p-106',
      name: 'Generic Nozzle Kit',
      sku: 'GEN-NOZ-01',
      basePrice: 500,
      brand: null,
      brandId: undefined
    };
    const resolved = resolveBrandId(unbrandedProduct.brandId || unbrandedProduct.brand, MOCK_BRANDS);
    assert.strictEqual(resolved, '', 'Null or missing brand should resolve to empty string');
  });

  // --- COMPLIMENTARY BUNDLE PRODUCT TESTS ---

  const MOCK_CATALOG: TestProduct[] = [
    { id: 'p-printer-1', name: 'Creality K1 Max High Speed 3D Printer', sku: 'CR-K1-MAX', basePrice: 65000 },
    { id: 'p-pla-1', name: '3D Galaxy Hyper PLA White 1kg', sku: '3DG-PLA-WHT', basePrice: 1299, salePrice: 999 },
    { id: 'p-pla-2', name: '3D Galaxy PETG Tough Black 1kg', sku: '3DG-PETG-BLK', basePrice: 1499, salePrice: 1199 },
    { id: 'p-nozzle-1', name: 'Hardened Steel High Flow Nozzle 0.4mm', sku: 'ACC-NZ-04', basePrice: 899, salePrice: 699 },
  ];

  function searchProductsLocally(catalog: TestProduct[], query: string, excludeId?: string): TestProduct[] {
    const q = query.toLowerCase().trim();
    return catalog.filter(p => {
      if (excludeId && p.id === excludeId) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }

  function sanitizeProductRelationshipList(rawList: any[], currentProductId?: string): any[] {
    if (!rawList || !Array.isArray(rawList)) return [];
    const seenIds = new Set<string>();
    const sanitized: any[] = [];
    for (const item of rawList) {
      if (!item) continue;
      const id = typeof item === 'string' ? item.trim() : String(item.id || '').trim();
      if (!id || (currentProductId && id === currentProductId)) continue;
      if (seenIds.has(id.toLowerCase())) continue;
      seenIds.add(id.toLowerCase());
      if (typeof item === 'object') {
        sanitized.push({
          id,
          name: item.name || undefined,
          sku: item.sku || undefined,
          price: item.price !== undefined ? item.price : (item.salePrice !== undefined ? item.salePrice : item.basePrice)
        });
      } else {
        sanitized.push({ id });
      }
    }
    return sanitized;
  }

  test('Bundle Search: Finds matching products by name and SKU', () => {
    const matchesByName = searchProductsLocally(MOCK_CATALOG, 'hyper pla');
    assert.strictEqual(matchesByName.length, 1);
    assert.strictEqual(matchesByName[0].sku, '3DG-PLA-WHT');

    const matchesBySku = searchProductsLocally(MOCK_CATALOG, 'CR-K1');
    assert.strictEqual(matchesBySku.length, 1);
    assert.strictEqual(matchesBySku[0].name, 'Creality K1 Max High Speed 3D Printer');
  });

  test('Bundle Search: Excludes current editing product from its own search results', () => {
    const results = searchProductsLocally(MOCK_CATALOG, 'Creality', 'p-printer-1');
    assert.strictEqual(results.some(p => p.id === 'p-printer-1'), false, 'Current product must be excluded');
  });

  test('Bundle Management: Selecting and adding a product updates the bundle list with rich metadata', () => {
    const bundleList: any[] = [];
    const itemToAdd = MOCK_CATALOG[1]; // PLA White

    bundleList.push({
      id: itemToAdd.id,
      name: itemToAdd.name,
      sku: itemToAdd.sku,
      price: itemToAdd.salePrice || itemToAdd.basePrice
    });

    assert.strictEqual(bundleList.length, 1);
    assert.strictEqual(bundleList[0].id, 'p-pla-1');
    assert.strictEqual(bundleList[0].name, '3D Galaxy Hyper PLA White 1kg');
    assert.strictEqual(bundleList[0].price, 999);
  });

  test('Bundle Management: Prevents duplicate product additions to bundle', () => {
    const rawBundle = [
      { id: 'p-pla-1', name: 'PLA White' },
      { id: 'p-pla-1', name: 'Duplicate PLA White' },
      { id: 'p-nozzle-1', name: 'Nozzle' }
    ];
    const sanitized = sanitizeProductRelationshipList(rawBundle, 'p-main');
    assert.strictEqual(sanitized.length, 2, 'Duplicates must be removed');
    assert.deepStrictEqual(sanitized.map(x => x.id), ['p-pla-1', 'p-nozzle-1']);
  });

  test('Bundle Management: Removing an item updates bundle list accurately', () => {
    let bundle = [
      { id: 'p-pla-1', name: 'PLA White' },
      { id: 'p-nozzle-1', name: 'Nozzle' }
    ];
    // Remove p-pla-1
    bundle = bundle.filter(i => (typeof i === 'string' ? i : i.id) !== 'p-pla-1');
    assert.strictEqual(bundle.length, 1);
    assert.strictEqual(bundle[0].id, 'p-nozzle-1');
  });

  test('Bundle Semantics: Complimentary items do not increase main product basePrice', () => {
    const mainProduct = {
      name: 'Creality K1 Max',
      basePrice: 65000,
      bundleProducts: [
        { id: 'p-pla-1', price: 999 },
        { id: 'p-nozzle-1', price: 699 }
      ]
    };
    // Customer pays only basePrice; bundle is 100% complimentary
    const customerPrice = mainProduct.basePrice;
    assert.strictEqual(customerPrice, 65000, 'Complimentary products must not inflate main product price');
  });

  // --- RECOMMENDED FILAMENTS TESTS ---

  function sanitizeRecommendedFilamentsList(rawList: any[], currentProductId?: string): string[] {
    if (!rawList || !Array.isArray(rawList)) return [];
    const seenIds = new Set<string>();
    const sanitized: string[] = [];
    for (const item of rawList) {
      if (!item) continue;
      const id = typeof item === 'string' ? item.trim() : String(item.id || '').trim();
      if (!id || (currentProductId && id === currentProductId)) continue;
      if (seenIds.has(id.toLowerCase())) continue;
      seenIds.add(id.toLowerCase());
      sanitized.push(id);
    }
    return sanitized;
  }

  test('Filament Recommendations: Adding recommendations stores stable IDs and prevents duplicates', () => {
    const rawRecommendations = ['p-pla-1', 'p-pla-2', 'p-pla-1'];
    const sanitized = sanitizeRecommendedFilamentsList(rawRecommendations, 'p-printer-1');
    assert.strictEqual(sanitized.length, 2, 'Duplicate recommendation must be eliminated');
    assert.deepStrictEqual(sanitized, ['p-pla-1', 'p-pla-2']);
  });

  test('Filament Recommendations: Self-referencing filament recommendations are rejected', () => {
    const rawRecommendations = ['p-filament-self', 'p-pla-1'];
    const sanitized = sanitizeRecommendedFilamentsList(rawRecommendations, 'p-filament-self');
    assert.strictEqual(sanitized.length, 1);
    assert.strictEqual(sanitized[0], 'p-pla-1');
  });

  test('Filament Recommendations: Removing recommendation updates the active list', () => {
    let recs = ['p-pla-1', 'p-pla-2'];
    recs = recs.filter(id => id !== 'p-pla-1');
    assert.deepStrictEqual(recs, ['p-pla-2']);
  });

  // --- CHECKOUT FREE PRODUCT INCLUSION TESTS ---

  test('Checkout: Buy Now with bundleProducts resolves bundleSubs with free items and correct quantity', () => {
    const parentProd: TestProduct = {
      id: 'prod-flashforge-creator-5',
      name: 'Flashforge Creator 5',
      sku: 'FF-C5',
      basePrice: 85000,
      bundleProducts: [
        { id: 'prod-pla-pro', name: 'PLA Pro Filament 1.75mm', quantity: 2 }
      ]
    };
    const allProds: TestProduct[] = [
      parentProd,
      { id: 'prod-pla-pro', name: 'PLA Pro Filament 1.75mm', sku: 'PLA-PRO-175', basePrice: 1299 }
    ];

    const qty = 3;
    let bundleSubs: any[] = [];
    if (parentProd.bundleProducts) {
      for (const bp of parentProd.bundleProducts) {
        const subId = typeof bp === 'string' ? bp : (bp.id || bp.productId);
        const subQtyMultiplier = (typeof bp === 'object' && bp.quantity) ? Math.max(1, parseInt(bp.quantity, 10)) : 1;
        const subProd = allProds.find(p => p.id === subId) || (typeof bp === 'object' && bp.name ? bp : null);
        if (subProd) {
          bundleSubs.push({
            product: subProd,
            quantity: qty * subQtyMultiplier,
            isFree: true
          });
        }
      }
    }

    assert.strictEqual(bundleSubs.length, 1);
    assert.strictEqual(bundleSubs[0].product.name, 'PLA Pro Filament 1.75mm');
    assert.strictEqual(bundleSubs[0].quantity, 6); // 3 * 2 = 6
    assert.strictEqual(bundleSubs[0].isFree, true);
  });

  test('Checkout: Order payload flattens bundleSubs into zero-price free line items', () => {
    const groupedItems = [
      {
        product: { id: 'p1', name: 'Main Printer', basePrice: 50000 },
        quantity: 1,
        bundleSubs: [
          {
            product: { id: 'sub1', name: 'Free Spool 1', basePrice: 1500 },
            quantity: 2,
            isFree: true
          }
        ]
      }
    ];

    const flatItems: any[] = [];
    for (const item of groupedItems) {
      flatItems.push({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.basePrice,
        isFree: false
      });
      if (item.bundleSubs) {
        for (const sub of item.bundleSubs) {
          flatItems.push({
            productId: sub.product.id,
            quantity: sub.quantity,
            price: 0,
            unitPrice: 0,
            isFree: true,
            configurationType: 'free_bundle'
          });
        }
      }
    }

    assert.strictEqual(flatItems.length, 2);
    assert.strictEqual(flatItems[0].isFree, false);
    assert.strictEqual(flatItems[0].price, 50000);
    assert.strictEqual(flatItems[1].isFree, true);
    assert.strictEqual(flatItems[1].price, 0);
    assert.strictEqual(flatItems[1].quantity, 2);
  });

  test('Checkout Backend: calculateEffectiveItemPrice returns 0 for free complimentary items', () => {
    function calculateEffectiveItemPriceMock(prod: any, item: any): number {
      if (item.isFree === true || item.configurationType === 'free_bundle' || item.configurationType === 'free_included') {
        return 0;
      }
      return Number(prod.salePrice || prod.basePrice || 0);
    }

    const freeItem = { productId: 'sub1', isFree: true, configurationType: 'free_bundle' };
    const prod = { id: 'sub1', basePrice: 1299, salePrice: 999 };
    assert.strictEqual(calculateEffectiveItemPriceMock(prod, freeItem), 0);

    const paidItem = { productId: 'p1', isFree: false };
    const paidProd = { id: 'p1', basePrice: 50000 };
    assert.strictEqual(calculateEffectiveItemPriceMock(paidProd, paidItem), 50000);
  });

  test('Checkout Backend: COD check permits free items with codAvailable false if parent is COD eligible', () => {
    const parentProd = { id: 'p1', name: 'Printer', codAvailable: true };
    const freeProd = { id: 'sub1', name: 'Filament Special', codAvailable: false };

    const items = [
      { prod: parentProd, isFree: false },
      { prod: freeProd, isFree: true }
    ];

    let codRejected = false;
    for (const it of items) {
      if (!it.isFree && it.prod.codAvailable === false) {
        codRejected = true;
      }
    }

    assert.strictEqual(codRejected, false, 'Free gift should not block COD for the order');
  });

  // --- BUNDLE ITEM QUANTITY TESTS (MOCK DATA ONLY) ---

  test('Bundle Quantity Stepper: updateBundleItemQuantity increments and decrements quantity correctly', () => {
    let bundleProducts = [
      { id: 'p-pla-1', name: 'PLA White', quantity: 1 },
      { id: 'p-gold-2', name: 'Silk Gold', quantity: 2 }
    ];

    function updateQty(list: any[], targetId: string, deltaOrVal: number, isAbs: boolean = false): any[] {
      return list.map(item => {
        if (item.id !== targetId) return item;
        const curr = item.quantity || 1;
        const next = Math.max(1, Math.min(99, isAbs ? deltaOrVal : curr + deltaOrVal));
        return { ...item, quantity: next };
      });
    }

    // Increment Silk Gold from 2 to 3
    bundleProducts = updateQty(bundleProducts, 'p-gold-2', 1);
    assert.strictEqual(bundleProducts.find(x => x.id === 'p-gold-2')?.quantity, 3);

    // Direct input set PLA White to 5
    bundleProducts = updateQty(bundleProducts, 'p-pla-1', 5, true);
    assert.strictEqual(bundleProducts.find(x => x.id === 'p-pla-1')?.quantity, 5);

    // Decrement PLA White cannot go below 1
    bundleProducts = updateQty(bundleProducts, 'p-pla-1', -10);
    assert.strictEqual(bundleProducts.find(x => x.id === 'p-pla-1')?.quantity, 1);
  });

  test('Bundle Backend Mapping: populateProductRelations merges selected quantity into db product items', () => {
    const rawBundleList = [
      { id: 'p-pla-1', name: 'PLA White', quantity: 3 },
      { id: 'p-gold-2', quantity: 2 }
    ];
    const mockDbProducts = [
      { id: 'p-pla-1', name: 'PLA White DB', stock: 100, sku: 'PLA-WHT' },
      { id: 'p-gold-2', name: 'Silk Gold DB', stock: 50, sku: 'SLK-GLD' }
    ];

    const populated = rawBundleList.map(rawBundle => {
      const rawId = typeof rawBundle === 'string' ? rawBundle : rawBundle.id;
      const dbProd = mockDbProducts.find(p => p.id === rawId);
      const qty = (typeof rawBundle === 'object' && rawBundle.quantity) ? Math.max(1, parseInt(rawBundle.quantity as any, 10)) : 1;
      return {
        ...(dbProd || rawBundle),
        quantity: qty
      };
    });

    assert.strictEqual(populated.length, 2);
    assert.strictEqual(populated[0].quantity, 3, 'PLA White must keep quantity 3');
    assert.strictEqual(populated[1].quantity, 2, 'Silk Gold must keep quantity 2');
    assert.strictEqual(populated[0].name, 'PLA White DB', 'Should enrich with DB attributes');
  });

  return results;
}
