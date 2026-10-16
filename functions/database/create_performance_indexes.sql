-- ==============================================================================
-- 3D GALAXY — DATABASE HIGH-PERFORMANCE INDEXING SCRIPT
-- ==============================================================================
-- Non-destructive optimization: creates targeted composite and B-tree indexes
-- on active high-frequency tables without dropping data or affecting working logic.

-- 1. Product Queries & Catalog Navigation
CREATE INDEX IF NOT EXISTS idx_products_is_active_is_featured ON products (is_active, is_featured) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products (brand_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_created_at_desc ON products (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);

-- 2. Product Variants (Cart, Pricing & Stock Lookups)
CREATE INDEX IF NOT EXISTS idx_product_variants_product_active ON product_variants (product_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants (sku);

-- 3. Categories (Tree Navigation & Header Menus)
CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON categories (is_active, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);

-- 4. Customer Reviews (Product Detail Rating Aggregation)
CREATE INDEX IF NOT EXISTS idx_customer_reviews_product_id ON customer_reviews (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_customer_id ON customer_reviews (customer_id);

-- 5. Orders & Checkout Critical Path
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders (customer_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);

-- 6. Order Items (Packaging Slip & Order Details)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);

-- 7. Payments & Webhooks
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments (transaction_id);

-- 8. Customer Addresses (Shipping & Billing Resolution)
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_default ON customer_addresses (customer_id, is_default);

-- 9. Inventory Lookups
CREATE INDEX IF NOT EXISTS idx_inventory_product_variant ON inventory (product_id, variant_id);

-- 10. Settings Table
CREATE INDEX IF NOT EXISTS idx_settings_setting_key ON settings (setting_key);

-- Run ANALYZE to immediately update PostgreSQL query planner statistics
ANALYZE products;
ANALYZE product_variants;
ANALYZE categories;
ANALYZE customer_reviews;
ANALYZE orders;
ANALYZE order_items;
ANALYZE payments;
ANALYZE customer_addresses;
ANALYZE inventory;
ANALYZE settings;
