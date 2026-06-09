-- Users & Auth
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Categories & Brands
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_brands_slug ON brands(slug);

-- Products
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);

-- Inventory
CREATE INDEX idx_inventory_product_id ON inventory(product_id);

-- Customers
CREATE INDEX idx_customers_user_id ON customers(user_id);

-- Orders
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Carts
CREATE INDEX idx_carts_customer_id ON carts(customer_id);
CREATE INDEX idx_carts_session_id ON carts(session_id);

-- CMS
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_blogs_slug ON blogs(slug);
