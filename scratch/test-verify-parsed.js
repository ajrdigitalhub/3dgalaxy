const fs = require('fs');
const { parseCsv, buildShopifyImportGroups } = require('./csv-import.js');

const csvPath = "d:\\Web Dev\\3DGalaxy-Hub\\3dgalaxy\\src\\app\\shared\\formatted_products_export - Copy.csv";
const csvText = fs.readFileSync(csvPath, 'utf8');

const parsed = parseCsv(csvText);
const { groups, summary } = buildShopifyImportGroups(parsed);

console.log('\n--- Discount Pricing Verification ---');
groups.forEach((product) => {
  const hasDiscount = product.variants.some(v => v.salePrice !== null);
  if (!hasDiscount) return;

  const prices = product.variants.map((v) => v.price || 0);
  const mrp = Math.max(...prices, 0);
  const firstVariant = product.variants[0];
  const productPrice = firstVariant ? firstVariant.price : 0;
  const productSalePrice = firstVariant && firstVariant.salePrice !== null && firstVariant.salePrice !== undefined
    ? firstVariant.salePrice
    : null;

  console.log(`\nProduct Name: ${product.name}`);
  console.log(`Product MRP (Base Price): ${mrp}`);
  console.log(`Product Selling Price: ${productPrice}`);
  console.log(`Product Sale Price (discounted): ${productSalePrice !== null ? productSalePrice : 'None'}`);
  console.log(`Variants count: ${product.variants.length}`);
  product.variants.forEach((v, index) => {
    console.log(`  [Variant #${index + 1}] Name: ${v.name}, SKU: ${v.sku || '-'}, Price: ${v.price}, Sale Price: ${v.salePrice !== null ? v.salePrice : 'None'}`);
  });
});
