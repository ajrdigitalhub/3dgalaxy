import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { parseCsv, buildShopifyImportGroups } from '../functions/src/utils/csv-import';

const csvPath = "d:\\Web Dev\\3DGalaxy-Hub\\3dgalaxy\\src\\app\\shared\\formatted_products_export - Copy.csv";
const csvText = fs.readFileSync(csvPath, 'utf8');

const parsed = parseCsv(csvText);
console.log('Total parsed rows:', parsed.rows.length);
console.log('Parse errors:', parsed.parseErrors);

let hasVariantCompare = 0;
let hasPrice = 0;

for (const row of parsed.rows) {
  if (row.variant_compare_at_price && row.variant_compare_at_price.trim()) {
    hasVariantCompare++;
  }
  if (row.variant_price && row.variant_price.trim()) {
    hasPrice++;
  }
}

console.log('Rows with variant_price:', hasPrice);
console.log('Rows with variant_compare_at_price:', hasVariantCompare);

const samples = parsed.rows.filter(row => row.variant_compare_at_price && row.variant_compare_at_price.trim());
console.log('\nSample rows with compare-at price (first 5):');
samples.slice(0, 5).forEach(row => {
  console.log({
    handle: row.handle,
    title: row.title,
    option1_value: row.option1_value,
    variant_price: row.variant_price,
    variant_compare_at_price: row.variant_compare_at_price
  });
});
