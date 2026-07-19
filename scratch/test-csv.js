const fs = require('fs');

const csvPath = "d:\\Web Dev\\3DGalaxy-Hub\\3dgalaxy\\src\\app\\shared\\formatted_products_export - Copy.csv";
const csvText = fs.readFileSync(csvPath, 'utf8');

const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
const headers = lines[0].split(',');

const compareAtPriceIdx = headers.findIndex(h => h.includes('Variant Compare At Price'));
const variantPriceIdx = headers.findIndex(h => h.includes('Variant Price'));
const handleIdx = headers.findIndex(h => h === 'Handle');

let countWithCompare = 0;
const samples = [];

function parseCsvLine(text) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i]);
  const compareVal = row[compareAtPriceIdx] || '';
  const priceVal = row[variantPriceIdx] || '';
  const handle = row[handleIdx] || '';

  if (compareVal.trim()) {
    countWithCompare++;
    if (samples.length < 5) {
      samples.push({ handle, priceVal, compareVal });
    }
  }
}

console.log('Total rows with Variant Compare At Price:', countWithCompare);
console.log('Samples:', samples);
