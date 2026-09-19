const fs = require('fs');

const cust = fs.readFileSync('src/app/pages/admin/components/customers-tab.ts', 'utf8');
const custIdx = cust.indexOf("admin.activeTab() === 'customer-analytics'");
console.log('--- CUSTOMER ANALYTICS ---');
console.log(cust.substring(custIdx, custIdx + 1500));

const push = fs.readFileSync('src/app/pages/admin/components/push-settings-tab.ts', 'utf8');
console.log('--- PUSH SETTINGS TAB ---');
console.log(push.substring(0, 1500));
