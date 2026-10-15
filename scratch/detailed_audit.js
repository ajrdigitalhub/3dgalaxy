const fs = require('fs');
const path = require('path');

const tables = [
  // 18 product satellites
  'product_variant_options', 'product_variant_images', 'product_option_values', 'product_options',
  'product_attribute_values', 'product_attributes', 'product_specifications', 'product_features',
  'product_downloads', 'product_faqs', 'product_images', 'product_included_items',
  'product_related_products', 'product_seo', 'product_shipping', 'product_warranty',
  'product_tag_mapping', 'product_tags',
  // Dead tables
  'customer_sessions', 'customer_notifications', 'search_logs', 'coupon_usage',
  'page_sections', 'blog_categories', 'notification_templates', 'inventory_transactions',
  'contact_requests', 'order_status_history',
  // Config & CMS
  'search_settings', 'payment_gateways', 'theme_settings', 'homepage_section_items',
  // Reviews
  'product_reviews',
  // RBAC
  'role_permissions', 'user_roles', 'permissions', 'roles',
  // Warehouse
  'warehouses'
];

function getAllFiles(dir) {
  let res = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (!full.includes('node_modules') && !full.includes('.git') && !full.includes('dist') && !full.includes('.angular')) {
          res = res.concat(getAllFiles(full));
        }
      } else if (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.html')) {
        res.push(full);
      }
    });
  } catch (e) {}
  return res;
}

const backendFiles = getAllFiles('functions/src');
const frontendFiles = getAllFiles('src/app');

// Also load prisma schema
const prismaContent = fs.readFileSync('functions/prisma/schema.prisma', 'utf8');

const tableToModel = {
  roles: 'role',
  permissions: 'permission',
  role_permissions: 'rolePermission',
  user_roles: 'userRole',
  warehouses: 'warehouse',
  inventory_transactions: 'inventoryTransaction',
  coupon_usage: 'couponUsage',
  page_sections: 'pageSection',
  blog_categories: 'blogCategory',
  notification_templates: 'notificationTemplate',
  contact_requests: 'contactRequest',
  order_status_history: 'orderStatusHistory',
  theme_settings: 'themeSetting',
  homepage_section_items: 'homepageSectionItem',
  product_reviews: 'productReview'
};

const detailedAudit = [];

tables.forEach(table => {
  const model = tableToModel[table];
  const inPrisma = prismaContent.includes(`"${table}"`);

  const backendHits = [];
  const frontendHits = [];

  backendFiles.forEach(file => {
    const rel = path.relative('.', file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const cleanLine = line.trim();
      
      // Check exact table name reference (SQL or string)
      const tblRegex = new RegExp(`['"\`]${table}['"\`]|FROM\\s+${table}\\b|JOIN\\s+${table}\\b|INTO\\s+${table}\\b|UPDATE\\s+${table}\\b`, 'i');
      if (tblRegex.test(cleanLine)) {
        backendHits.push({ file: rel, line: lineNum, text: cleanLine, type: 'TABLE_NAME' });
      } else if (model) {
        const modelRegex = new RegExp(`\\b(prisma|tx)\\.${model}\\b`);
        if (modelRegex.test(cleanLine)) {
          backendHits.push({ file: rel, line: lineNum, text: cleanLine, type: 'PRISMA_MODEL' });
        }
      }
    });
  });

  frontendFiles.forEach(file => {
    const rel = path.relative('.', file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const cleanLine = line.trim();
      const tblRegex = new RegExp(`['"\`]${table}['"\`]`, 'i');
      if (tblRegex.test(cleanLine)) {
        frontendHits.push({ file: rel, line: lineNum, text: cleanLine });
      }
    });
  });

  detailedAudit.push({
    table,
    model: model || null,
    inPrisma,
    backendHits,
    frontendHits
  });
});

fs.writeFileSync('scratch/detailed_audit.json', JSON.stringify(detailedAudit, null, 2));

console.log('=== DETAILED AUDIT RESULTS ===');
detailedAudit.forEach(item => {
  const status = (item.backendHits.length > 0 || item.frontendHits.length > 0) ? '⚠️ IN USE' : '✅ UNUSED';
  console.log(`${item.table.padEnd(28)} | ${status.padEnd(10)} | Prisma: ${String(item.inPrisma).padEnd(5)} | Backend Hits: ${item.backendHits.length} | Frontend: ${item.frontendHits.length}`);
});
