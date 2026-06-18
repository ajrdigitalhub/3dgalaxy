const fs = require('fs');
let code = fs.readFileSync('server/src/routes/admin.ts', 'utf-8');

// we need to remove lines belonging to '9. CMS BANNERS OPERATIONS'
const bannerRegex = /\/\/ -+\n\/\/ 9\. CMS BANNERS OPERATIONS\n\/\/ -+[\s\S]*?(?=\/\/ -+\n\/\/ 10\.|\module\.exports|export default)/;

code = code.replace(bannerRegex, '');
fs.writeFileSync('server/src/routes/admin.ts', code);
console.log('Removed banners from admin.ts');
