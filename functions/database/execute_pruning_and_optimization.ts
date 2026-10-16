import { pool } from './src/config/database';

async function main() {
  const client = await pool.connect();
  try {
    console.log('=====================================================');
    console.log('3D GALAXY — DATABASE PRUNING & OPTIMIZATION EXECUTION');
    console.log('=====================================================');

    // 1. Initial State Check
    const initialRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    const initialTables = initialRes.rows.map(r => r.table_name);
    console.log(`\n[STEP 1] Connected to Supabase DB. Current public tables: ${initialTables.length}`);

    const targetTablesToDrop = [
      'blog_categories',
      'contact_requests',
      'coupon_usage',
      'page_sections',
      'notification_templates',
      'inventory_transactions',
      'order_status_history',
      'product_reviews',
      'theme_settings',
      'warehouses',
      'role_permissions',
      'user_roles',
      'permissions',
      'roles'
    ];

    const existingTargets = targetTablesToDrop.filter(t => initialTables.includes(t));
    console.log(`Found ${existingTargets.length} target unused tables present in DB:`);
    console.log(existingTargets.map(t => `  - ${t}`).join('\n'));

    // 2. Transactional Pruning
    console.log('\n[STEP 2] Executing transactional migration & DROP TABLE cascade...');
    await client.query('BEGIN');

    // Ensure role column exists on public.users and backfill from user_roles if present
    console.log('  -> Ensuring role column on public.users and migrating role assignments...');
    await client.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Customer';
    `);

    if (initialTables.includes('user_roles') && initialTables.includes('roles')) {
      await client.query(`
        UPDATE public.users u
        SET role = r.name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE u.id = ur.user_id AND r.name IS NOT NULL;
      `);
      console.log('  ✓ Backfilled role column from user_roles and roles');
    }

    // Drop FK constraints referencing dead tables
    console.log('  -> Dropping FK constraints referencing dead tables...');
    await client.query(`
      ALTER TABLE IF EXISTS "inventory" DROP CONSTRAINT IF EXISTS "inventory_warehouse_id_fkey";
      ALTER TABLE IF EXISTS "blogs" DROP CONSTRAINT IF EXISTS "blogs_category_id_fkey";
      ALTER TABLE IF EXISTS "system_notifications" DROP CONSTRAINT IF EXISTS "system_notifications_template_id_fkey";
    `);

    // Drop the target tables
    console.log('  -> Dropping target tables with CASCADE...');
    await client.query(`
      DROP TABLE IF EXISTS
        blog_categories,
        contact_requests,
        coupon_usage,
        page_sections,
        notification_templates,
        inventory_transactions,
        order_status_history,
        product_reviews,
        theme_settings,
        warehouses,
        role_permissions,
        user_roles,
        permissions,
        roles
      CASCADE;
    `);

    await client.query('COMMIT');
    console.log('✓ Transaction COMMITTED successfully!');

    // 3. Performance Indexes
    console.log('\n[STEP 3] Applying performance indexes...');
    const indexStatements = [
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);',
      'CREATE INDEX IF NOT EXISTS idx_products_is_active_is_featured ON products (is_active, is_featured) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products (brand_id) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_products_created_at_desc ON products (created_at DESC) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);',
      'CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);',
      'CREATE INDEX IF NOT EXISTS idx_product_variants_product_active ON product_variants (product_id, is_active) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants (sku);',
      'CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON categories (is_active, sort_order) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);',
      'CREATE INDEX IF NOT EXISTS idx_customer_reviews_product_id ON customer_reviews (product_id, created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_customer_reviews_customer_id ON customer_reviews (customer_id);',
      'CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders (customer_id, created_at DESC) WHERE deleted_at IS NULL;',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);',
      'CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);',
      'CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);',
      'CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);',
      'CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);',
      'CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments (transaction_id);',
      'CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_default ON customer_addresses (customer_id, is_default);',
      'CREATE INDEX IF NOT EXISTS idx_inventory_product_variant ON inventory (product_id, variant_id);',
      'CREATE INDEX IF NOT EXISTS idx_settings_setting_key ON settings (setting_key);'
    ];

    for (const sql of indexStatements) {
      await client.query(sql);
    }
    console.log(`✓ Applied ${indexStatements.length} performance indexes successfully!`);

    // 4. Update Query Planner Statistics (ANALYZE)
    console.log('\n[STEP 4] Updating query planner statistics (ANALYZE)...');
    const analyzeTables = [
      'users',
      'products',
      'product_variants',
      'categories',
      'customer_reviews',
      'orders',
      'order_items',
      'payments',
      'customer_addresses',
      'inventory',
      'settings'
    ];

    for (const t of analyzeTables) {
      await client.query(`ANALYZE ${t};`);
    }
    console.log('✓ PostgreSQL statistics analyzed and refreshed!');

    // 5. Final Verification Check
    const finalRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    const finalTables = finalRes.rows.map(r => r.table_name);
    console.log(`\n=====================================================`);
    console.log(`OPTIMIZATION COMPLETE!`);
    console.log(`Tables before: ${initialTables.length}`);
    console.log(`Tables after:  ${finalTables.length} (Dropped: ${initialTables.length - finalTables.length})`);
    console.log(`Verified remaining tables:`);
    console.log(finalTables.join(', '));
    console.log(`=====================================================`);

  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed and rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(() => process.exit(1));
