const fs = require('fs');
const { parseCsv, parseCsvLine } = require('./src/utils/csv-import');
const raw = fs.readFileSync('c:/Users/Admin/Downloads/products_export_1 (3).csv','utf8');
const rawRows=[];
let current='';
let inQuotes=false;
for (let i=0;i<raw.length;i++){
  const ch=raw[i];
  const next=raw[i+1];
  if(ch==='"'){
    if(inQuotes && next==='"'){
      current+='"';
      i++;
    } else {
      inQuotes=!inQuotes;
    }
    continue;
  }
  if(ch==='\r') continue;
  if(ch==='\n' && !inQuotes){
    rawRows.push(current);
    current='';
    continue;
  }
  current+=ch;
}
if(current.length>0) rawRows.push(current);
console.log('rawRows', rawRows.length);
console.log('headerFields', parseCsvLine(rawRows[0]).length);
const idx = 54;
console.log('row idx', idx, 'len', rawRows[idx].length);
console.log('starts', rawRows[idx].slice(0,260));
const fields = parseCsvLine(rawRows[idx]);
console.log('field count', fields.length);
fields.slice(0,20).forEach((f,i)=>{
  console.log(i, f.slice(0,80));
});
const p = parseCsv(raw);
console.log('parsed rows', p.rows.length);
console.log('parsed row 54 variant_sku', p.rows[54].variant_sku, 'title', p.rows[54].title);
