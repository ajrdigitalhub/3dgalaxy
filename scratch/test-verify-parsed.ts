import * as fs from 'fs';
import { parseCsv, buildShopifyImportGroups } from '../functions/src/utils/csv-import.ts';

const csvPath = "d:\\Web Dev\\3DGalaxy-Hub\\3dgalaxy\\src\\app\\shared\\formatted_products_export - Copy.csv";
const csvText = fs.readFileSync(csvPath, 'utf8');

const parsed = parseCsv(csvText);
console.log('Total parsed rows:', parsed.rows.length);

const { groups, summary } = buildShopifyImportGroups(parsed);

console.log('\n--- Bulk Import Summary ---');
console.log('Total Products:', summary.totalProducts);
console.log('Total Variants:', summary.totalVariants);
console.log('Invalid Rows:', summary.invalidRows);
console.log('Duplicate SKUs:', summary.duplicateSkuCount);

console.log('\n--- Detailed Verification ---');
// Verify the first 3 products
groups.slice(0, 3).forEach((product: any) => {
  console.log(`\nProduct Name: ${product.name}`);
  console.log(`Slug / Handle: ${product.slug}`);
  console.log(`Category: ${product.productCategory || product.productType}`);
  console.log(`Brand/Vendor: ${product.vendor}`);
  console.log(`Total Product Images: ${product.images.length}`);
  console.log(`Product level base price (MRP): ${product.mrp}`);
  console.log(`Product level sale price: ${product.salePrice}`);
  
  console.log(`Variants (${product.variants.length}):`);
  product.variants.forEach((v: any, index: number) => {
    console.log(`  [Variant #${index + 1}]`);
    console.log(`    Name: ${v.name}`);
    console.log(`    SKU: ${v.sku || '-'}`);
    console.log(`    Price: ${v.price}`);
    console.log(`    Sale Price: ${v.salePrice}`);
    console.log(`    Images count: ${v.images.length}`);
    console.log(`    Images:`, v.images);
    console.log(`    OptionValues:`, v.optionValues);
  });
});
