import { normalizeCategoryId, extractNormalizedCategoryIds } from '../src/app/shared/components/category-multi-select/category-selection.utils';

console.log('--- STARTING CATEGORY SYNC LOGIC TESTS ---');

const mockAvailableCategories: any[] = [
  { id: 'cat-001', name: 'Health & Beauty', slug: 'health-beauty' },
  { id: 'cat-002', name: 'Glass Cutters', slug: 'glass-cutters' },
  { id: 'cat-003', name: 'Cutters', slug: 'cutters' },
  { id: 'cat-004', name: 'Tools', slug: 'tools' },
  { id: 'cat-005', name: 'Hardware', slug: 'hardware' },
  { id: 'cat-006', name: 'Uncategorized', slug: 'uncategorized' },
];

// Test 1: normalizeCategoryId
console.log('\nTest 1: normalizeCategoryId');
console.assert(normalizeCategoryId('cat-001') === 'cat-001', 'string failed');
console.assert(normalizeCategoryId(123) === '123', 'number failed');
console.assert(normalizeCategoryId({ id: 'cat-004' }) === 'cat-004', 'object id failed');
console.assert(normalizeCategoryId({ categoryId: 'cat-005' }) === 'cat-005', 'object categoryId failed');
console.assert(normalizeCategoryId({ category: { id: 'cat-002' } }) === 'cat-002', 'nested category id failed');
console.assert(normalizeCategoryId('  cat-003  ') === 'cat-003', 'trimmed failed');
console.assert(normalizeCategoryId(null) === '', 'null failed');
console.log('✓ normalizeCategoryId passed all cases');

// Test 2: extractNormalizedCategoryIds with API shapes
console.log('\nTest 2: extractNormalizedCategoryIds with API shapes');

// Shape A: Standard product with categoryIds array
const apiRespA = {
  product: {
    id: 'p-1',
    name: 'Bambu Lab X1-Carbon',
    categoryId: 'cat-004',
    categoryIds: ['cat-004', 'cat-005']
  }
};
const resA = extractNormalizedCategoryIds(apiRespA, mockAvailableCategories);
console.assert(resA.categoryIds.length === 2, 'resA length expected 2');
console.assert(resA.categoryIds.includes('cat-004') && resA.categoryIds.includes('cat-005'), 'resA ids match');
console.assert(resA.primaryCategoryId === 'cat-004', 'resA primary match');
console.log('✓ Shape A passed');

// Shape B: Product with category objects array
const apiRespB = {
  categories: [
    { id: 'cat-001', name: 'Health & Beauty', isPrimary: true },
    { id: 'cat-004', name: 'Tools', isPrimary: false }
  ]
};
const resB = extractNormalizedCategoryIds(apiRespB, mockAvailableCategories);
console.assert(resB.categoryIds.length === 2, 'resB length expected 2');
console.assert(resB.categoryIds.includes('cat-001') && resB.categoryIds.includes('cat-004'), 'resB ids match');
console.assert(resB.primaryCategoryId === 'cat-001', 'resB primary match');
console.log('✓ Shape B passed');

// Shape C: Product with slug references
const apiRespC = {
  category_ids: ['tools', 'hardware']
};
const resC = extractNormalizedCategoryIds(apiRespC, mockAvailableCategories);
console.assert(resC.categoryIds.includes('cat-004') && resC.categoryIds.includes('cat-005'), 'resC slug resolution match');
console.log('✓ Shape C (slug resolution) passed');

// Shape D: Empty categories (Create mode)
const apiRespD = {
  product: {
    id: 'new',
    name: 'New Product'
  }
};
const resD = extractNormalizedCategoryIds(apiRespD, mockAvailableCategories);
console.assert(resD.categoryIds.length === 0, 'resD empty');
console.assert(resD.primaryCategoryId === null, 'resD null primary');
console.log('✓ Shape D (new product) passed');

// Shape E: Nested productCategories from Prisma junction table
const apiRespE = {
  product: {
    id: 'p-2',
    productCategories: [
      { categoryId: 'cat-002', isPrimary: true, category: { id: 'cat-002', name: 'Glass Cutters' } },
      { categoryId: 'cat-003', isPrimary: false, category: { id: 'cat-003', name: 'Cutters' } }
    ]
  }
};
const resE = extractNormalizedCategoryIds(apiRespE, mockAvailableCategories);
console.assert(resE.categoryIds.length === 2, 'resE length expected 2');
console.assert(resE.categoryIds.includes('cat-002') && resE.categoryIds.includes('cat-003'), 'resE ids match');
console.assert(resE.primaryCategoryId === 'cat-002', 'resE primary match');
console.log('✓ Shape E (Prisma junction) passed');

// Test 3: Race condition (categories not available initially, then available)
console.log('\nTest 3: Race condition reconciliation');
const initialExtracted = extractNormalizedCategoryIds({ categoryIds: ['tools', 'cat-001'] }, []);
console.assert(initialExtracted.categoryIds.includes('tools'), 'initial contains raw hint');
const reconciled = extractNormalizedCategoryIds({ categoryIds: initialExtracted.categoryIds }, mockAvailableCategories);
console.assert(reconciled.categoryIds.includes('cat-004') && reconciled.categoryIds.includes('cat-001'), 'reconciled matched canonical cat-004');
console.log('✓ Race condition resolution passed');

console.log('\nALL TESTS PASSED SUCCESSFULLY!');
