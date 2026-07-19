const fs = require('fs');

const csvPath = "d:\\Web Dev\\3DGalaxy-Hub\\3dgalaxy\\src\\app\\shared\\formatted_products_export - Copy.csv";
const content = fs.readFileSync(csvPath, 'utf8');

// A simple robust CSV parser state machine
function parseCSV(text) {
  const lines = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Double quote inside quotes is an escaped quote
        field += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      i++;
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') {
        lines.push(row);
      }
      row = [];
      // Handle \r\n
      if (char === '\r' && nextChar === '\n') {
        i += 2;
      } else {
        i++;
      }
    } else {
      field += char;
      i++;
    }
  }
  
  if (row.length > 0 || field !== '') {
    row.push(field);
    lines.push(row);
  }
  
  return lines;
}

console.log('Parsing CSV...');
const allRows = parseCSV(content);
console.log('Total parsed rows (including header):', allRows.length);

const headers = allRows[0].map(h => h.trim());
console.log('Headers count:', headers.length);

const getIdx = (name) => headers.indexOf(name);
const handleIdx = getIdx('Handle');
const titleIdx = getIdx('Title');
const opt1ValIdx = getIdx('Option1 Value');
const variantSkuIdx = getIdx('Variant SKU');
const variantPriceIdx = getIdx('Variant Price');
const variantCompareIdx = getIdx('Variant Compare At Price');
const priceIndiaIdx = getIdx('Price / India');
const priceIntIdx = getIdx('Price / International');
const imageSrcIdx = getIdx('Image Src');
const variantImageIdx = getIdx('Variant Image');

console.log({
  handleIdx,
  titleIdx,
  opt1ValIdx,
  variantSkuIdx,
  variantPriceIdx,
  variantCompareIdx,
  priceIndiaIdx,
  priceIntIdx,
  imageSrcIdx,
  variantImageIdx
});

let stats = {
  hasVariantPrice: 0,
  hasVariantCompare: 0,
  hasPriceIndia: 0,
  hasPriceInt: 0,
  hasVariantImage: 0,
  hasImageSrc: 0,
};

const samplesPriceIndia = [];
const samplesComparePrice = [];

for (let r = 1; r < allRows.length; r++) {
  const row = allRows[r];
  const handle = row[handleIdx] || '';
  const title = row[titleIdx] || '';
  const vSku = row[variantSkuIdx] || '';
  const vPrice = row[variantPriceIdx] || '';
  const vCompare = row[variantCompareIdx] || '';
  const pIndia = row[priceIndiaIdx] || '';
  const pInt = row[priceIntIdx] || '';
  const imgS = row[imageSrcIdx] || '';
  const vImg = row[variantImageIdx] || '';
  
  if (vPrice.trim()) stats.hasVariantPrice++;
  if (vCompare.trim()) stats.hasVariantCompare++;
  if (pIndia.trim()) stats.hasPriceIndia++;
  if (pInt.trim()) stats.hasPriceInt++;
  if (imgS.trim()) stats.hasImageSrc++;
  if (vImg.trim()) stats.hasVariantImage++;
  
  if (pIndia.trim() && samplesPriceIndia.length < 5) {
    samplesPriceIndia.push({ handle, title, vSku, vPrice, pIndia, pInt });
  }
  if (vCompare.trim() && samplesComparePrice.length < 5) {
    samplesComparePrice.push({ handle, title, vSku, vPrice, vCompare });
  }
}

console.log('\nStats:', stats);
console.log('\nSamples with Price / India:', samplesPriceIndia);
console.log('\nSamples with Variant Compare At Price:', samplesComparePrice);
