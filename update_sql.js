const fs = require('fs');
let sql = fs.readFileSync('server/database/database.sql', 'utf-8');

// We need to drop the old tables and replace them with the single settings table.
// Instead of complex parsing, let's just append the new table and a DROP TABLE script for the old ones to the end,
// or wait, since it's an init script: Let's remove the CREATE TABLE statements for the removed tables.

const tablesToRemove = [
  'banners',
  'homepage_sections',
  'homepage_section_items',
  'theme_settings',
  'search_settings',
  'payment_gateways',
  'footer_general_settings',
  'footer_groups',
  'footer_links',
  'footer_social_links',
  'footer_newsletter_settings',
  'footer_payment_icons',
  'footer_trust_badges'
];

for (const table of tablesToRemove) {
  const regex = new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?\\);\\n?`, 'g');
  sql = sql.replace(regex, '');
}

const settingsTable = `
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
`;

if (!sql.includes('CREATE TABLE IF NOT EXISTS settings')) {
  sql += settingsTable;
}

fs.writeFileSync('server/database/database.sql', sql);
console.log('SQL updated successfully');
