-- ==============================================================================
-- 3D Galaxy Application Database Script
-- ==============================================================================
-- This single file contains:
--  1. Extensions
--  2. Schema / Tables
--  3. Foreign Keys & Constraints
--  4. Indexes
--  5. Functions & Triggers
--  6. Views
--  7. Seed Data

-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ==============================================================================
-- 2. SCHEMA / TABLES
-- ==============================================================================

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    mobile VARCHAR(50),
    profile_image TEXT,
    date_of_birth TIMESTAMP WITH TIME ZONE,
    gender VARCHAR(50),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User-Roles Mapping
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    device_info TEXT,
    ip_address VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    old_data TEXT,
    new_data TEXT,
    ip_address VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    image VARCHAR(255),
    banner VARCHAR(255),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    seo_title VARCHAR(255),
    seo_description TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Brands
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    banner_url TEXT,
    description TEXT,
    country VARCHAR(255) DEFAULT 'Global HQ',
    active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Products (Fully Consolidated Version utilizing JSONB)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    sku VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description TEXT,
    base_price DOUBLE PRECISION NOT NULL,
    sale_price DOUBLE PRECISION,
    dealer_price DOUBLE PRECISION,
    stock INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_exclusive BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Dynamic Master configuration inputs stored as native JSONB
    images JSONB DEFAULT '[]',
    specifications JSONB DEFAULT '[]',
    downloads JSONB DEFAULT '[]',
    features JSONB DEFAULT '[]',
    faqs JSONB DEFAULT '[]',
    seo JSONB DEFAULT '{}',
    shipping JSONB DEFAULT '{}',
    warranty JSONB DEFAULT '{}',
    related_products JSONB DEFAULT '[]',
    included_items JSONB DEFAULT '[]',
    attributes JSONB DEFAULT '[]',
    options JSONB DEFAULT '[]'
);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(255) UNIQUE NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    sale_price DOUBLE PRECISION,
    stock INT NOT NULL DEFAULT 0,
    weight DOUBLE PRECISION,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    variant_slug VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    variant_images JSONB DEFAULT '[]',
    option_values JSONB DEFAULT '{}',
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Product Reviews
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    transaction_type VARCHAR(255) NOT NULL,
    quantity DOUBLE PRECISION NOT NULL,
    reference_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(255),
    reward_points INT NOT NULL DEFAULT 0,
    customer_type VARCHAR(255) NOT NULL DEFAULT 'retail', -- retail, wholesale, dealer
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer Addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(255),
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    postal_code VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer Wishlist
CREATE TABLE IF NOT EXISTS customer_wishlist (
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id, product_id)
);

-- Customer Reviews
CREATE TABLE IF NOT EXISTS customer_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    rating INT NOT NULL,
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer Notifications
CREATE TABLE IF NOT EXISTS customer_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(255) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer Sessions
CREATE TABLE IF NOT EXISTS customer_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    order_number VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(255) NOT NULL DEFAULT 'PENDING',
    total_amount DOUBLE PRECISION NOT NULL,
    tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    shipping_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    shipping_address_id UUID REFERENCES customer_addresses(id),
    billing_address_id UUID REFERENCES customer_addresses(id),
    notes TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    customer_type VARCHAR(255) NOT NULL DEFAULT 'REGISTERED',
    guest_name VARCHAR(255),
    guest_email VARCHAR(255),
    guest_phone VARCHAR(255),
    guest_address JSONB,
    guest_session_id VARCHAR(255)
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    unit_price DOUBLE PRECISION NOT NULL,
    total_price DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Order Status History
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(255) NOT NULL,
    comments TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(255) NOT NULL,
    transaction_id VARCHAR(255),
    gateway_order_id VARCHAR(255),
    gateway_payment_id VARCHAR(255),
    gateway_response TEXT,
    amount DOUBLE PRECISION NOT NULL,
    status VARCHAR(255) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Search Logs
CREATE TABLE IF NOT EXISTS search_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    search_term VARCHAR(255) NOT NULL,
    result_count INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Shipments
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    carrier VARCHAR(255),
    tracking_number VARCHAR(255),
    tracking_url TEXT,
    status VARCHAR(255) NOT NULL,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Carts
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    status VARCHAR(255) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(255) UNIQUE NOT NULL,
    discount_type VARCHAR(255) NOT NULL,
    discount_value DOUBLE PRECISION NOT NULL,
    min_order_amount DOUBLE PRECISION,
    max_discount_amount DOUBLE PRECISION,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    usage_limit INT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Coupon Usage
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    discount_applied DOUBLE PRECISION NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Menus
CREATE TABLE IF NOT EXISTS menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(255),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Pages
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Page Sections
CREATE TABLE IF NOT EXISTS page_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    section_type VARCHAR(255) NOT NULL,
    content TEXT,
    sort_order INT NOT NULL DEFAULT 0
);

-- Blog Categories
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Blogs
CREATE TABLE IF NOT EXISTS blogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255),
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    channel VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    status VARCHAR(255) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Contact Requests
CREATE TABLE IF NOT EXISTS contact_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(255) NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter Subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Advertisements
CREATE TABLE IF NOT EXISTS advertisements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    media_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    status VARCHAR(255) NOT NULL DEFAULT 'active',
    clicks INT NOT NULL DEFAULT 0,
    impressions INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Theme Settings
CREATE TABLE IF NOT EXISTS theme_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_name VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payment Gateways
CREATE TABLE IF NOT EXISTS payment_gateways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    gateway_code VARCHAR(255) UNIQUE NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    is_test_mode BOOLEAN NOT NULL DEFAULT true,
    key_id VARCHAR(255),
    key_secret VARCHAR(255),
    webhook_secret VARCHAR(255),
    display_name VARCHAR(255),
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Banners
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(255) NOT NULL,
    link_url VARCHAR(255),
    type VARCHAR(50) NOT NULL DEFAULT 'HERO',
    position INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Homepage Sections
CREATE TABLE IF NOT EXISTS homepage_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Homepage Section Items
CREATE TABLE IF NOT EXISTS homepage_section_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES homepage_sections(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    image_url VARCHAR(255),
    title VARCHAR(255),
    sub_title VARCHAR(255),
    link_url VARCHAR(255),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ==============================================================================
-- 4. INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_product_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_category_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_brand_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_inventory_product_warehouse ON inventory(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_cart_customer_session ON carts(customer_id, session_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);


-- ==============================================================================
-- 5. FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Function: update_modified_column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for Tables
CREATE TRIGGER update_roles_modtime
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_categories_modtime
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_brands_modtime
BEFORE UPDATE ON brands
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_products_modtime
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_product_variants_modtime
BEFORE UPDATE ON product_variants
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_product_reviews_modtime
BEFORE UPDATE ON product_reviews
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_inventory_modtime
BEFORE UPDATE ON inventory
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_customers_modtime
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_orders_modtime
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_carts_modtime
BEFORE UPDATE ON carts
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_pages_modtime
BEFORE UPDATE ON pages
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_blogs_modtime
BEFORE UPDATE ON blogs
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_settings_modtime
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_advertisements_modtime
BEFORE UPDATE ON advertisements
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_theme_settings_modtime
BEFORE UPDATE ON theme_settings
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_payment_gateways_modtime
BEFORE UPDATE ON payment_gateways
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_banners_modtime
BEFORE UPDATE ON banners
FOR EACH ROW EXECUTE FUNCTION update_modified_column();


-- Recursive Category Tree Function
CREATE OR REPLACE FUNCTION get_category_tree()
RETURNS jsonb AS $$
WITH RECURSIVE category_tree AS (
    SELECT id, parent_id, name, slug, icon, sort_order,
           jsonb '[]' AS children
    FROM categories
    WHERE parent_id IS NULL AND is_active = TRUE

    UNION ALL

    SELECT c.id, c.parent_id, c.name, c.slug, c.icon, c.sort_order,
           jsonb '[]' AS children
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.is_active = TRUE
)
SELECT jsonb_agg(row_to_json(category_tree)) FROM category_tree;
$$ LANGUAGE sql;

-- Get Breadcrumb Function
CREATE OR REPLACE FUNCTION get_breadcrumb(node_id UUID)
RETURNS TABLE(id UUID, name text, slug text, level int) AS $$
WITH RECURSIVE breadcrumb AS (
    SELECT id, parent_id, name, slug, 1 AS level
    FROM categories
    WHERE id = node_id
    UNION ALL
    SELECT c.id, c.parent_id, c.name, c.slug, b.level + 1
    FROM categories c
    JOIN breadcrumb b ON c.id = b.parent_id
)
SELECT id, name::text, slug::text, level
FROM breadcrumb
ORDER BY level DESC;
$$ LANGUAGE sql;


-- ==============================================================================
-- 6. VIEWS
-- ==============================================================================

-- V_PRODUCT_DETAILS View
CREATE OR REPLACE VIEW v_product_details AS
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.slug AS product_slug,
    p.sku AS product_sku,
    p.base_price,
    p.sale_price,
    p.is_active,
    c.name AS category_name,
    b.name AS brand_name,
    COALESCE(p.stock, 0) + COALESCE(
        (SELECT SUM(quantity - reserved_quantity) FROM inventory i WHERE i.product_id = p.id),
        0
    ) AS available_quantity
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.deleted_at IS NULL;

-- V_ORDER_SUMMARY View
CREATE OR REPLACE VIEW v_order_summary AS
SELECT 
    o.id AS order_id,
    o.order_number,
    o.status,
    o.total_amount,
    o.created_at,
    c.id AS customer_id,
    u.email AS customer_email,
    u.first_name,
    u.last_name
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN users u ON c.user_id = u.id
WHERE o.deleted_at IS NULL;


-- ==============================================================================
-- 7. SEED DATA
-- ==============================================================================

-- Roles
INSERT INTO roles (id, name, description) VALUES
('e2098679-b788-46cb-b1ec-df0bc79db5d3', 'Super Admin', 'Super Administrator with unrestricted access'),
('e2098679-b788-46cb-b1ec-df0bc79db5d4', 'Admin', 'Administrator with full access'),
('e2098679-b788-46cb-b1ec-df0bc79db5d5', 'Manager', 'Store Manager'),
('e2098679-b788-46cb-b1ec-df0bc79db5d6', 'Customer', 'Regular Customer')
ON CONFLICT (id) DO NOTHING;

-- Default SuperAdmin User (Password: "password123")
INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, is_verified)
VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
    'admin@3dgalaxy.com', 
    '$2b$10$h9W0g8G1mDqI9y2D8d2v2Oe.x9xOOnS8y9iS0f1gXlZl7U8BvH7gY', 
    'Super', 
    'Admin', 
    true,
    true
)
ON CONFLICT (email) DO NOTHING;

-- Map User to Role
INSERT INTO user_roles (user_id, role_id)
VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'e2098679-b788-46cb-b1ec-df0bc79db5d3')
ON CONFLICT DO NOTHING;

-- Seed Brands
INSERT INTO brands (id, name, slug) VALUES 
('bbbbb10b-58cc-4372-a567-0e02b2c3d471', 'Bambu Lab', 'bambu-lab'),
('bbbbb10b-58cc-4372-a567-0e02b2c3d472', 'Creality', 'creality'),
('bbbbb10b-58cc-4372-a567-0e02b2c3d473', 'Elegoo', 'elegoo'),
('bbbbb10b-58cc-4372-a567-0e02b2c3d474', 'Flashforge', 'flashforge'),
('bbbbb10b-58cc-4372-a567-0e02b2c3d475', 'Uniformation', 'uniformation')
ON CONFLICT (id) DO NOTHING;

-- Seed Categories (Hierarchical Scaffolding)
INSERT INTO categories (id, name, slug, description, sort_order) VALUES 
('c111110b-58cc-4372-a567-0e02b2c3d471', '3D Printers', '3d-printers', 'All 3D Printers', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, parent_id, name, slug, sort_order) VALUES 
('c111110b-58cc-4372-a567-0e02b2c3d472', 'c111110b-58cc-4372-a567-0e02b2c3d471', 'FDM Printers', 'fdm-printers', 1),
('c111110b-58cc-4372-a567-0e02b2c3d473', 'c111110b-58cc-4372-a567-0e02b2c3d471', 'Resin Printers', 'resin-printers', 2),
('c111110b-58cc-4372-a567-0e02b2c3d499', 'c111110b-58cc-4372-a567-0e02b2c3d471', 'Industrial Printers', 'industrial-printers', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, parent_id, name, slug, sort_order) VALUES 
('c111110b-58cc-4372-a567-0e02b2c3d474', 'c111110b-58cc-4372-a567-0e02b2c3d472', 'Bambu Lab', 'bambu-lab-printers', 1),
('c111110b-58cc-4372-a567-0e02b2c3d475', 'c111110b-58cc-4372-a567-0e02b2c3d472', 'Creality', 'creality-printers', 2),
('c111110b-58cc-4372-a567-0e02b2c3d476', 'c111110b-58cc-4372-a567-0e02b2c3d472', 'Flashforge', 'flashforge-printers', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, parent_id, name, slug, sort_order) VALUES 
('c111110b-58cc-4372-a567-0e02b2c3d481', 'c111110b-58cc-4372-a567-0e02b2c3d474', 'A1', 'bambu-lab-a1', 1),
('c111110b-58cc-4372-a567-0e02b2c3d482', 'c111110b-58cc-4372-a567-0e02b2c3d474', 'A1 Mini', 'bambu-lab-a1-mini', 2),
('c111110b-58cc-4372-a567-0e02b2c3d483', 'c111110b-58cc-4372-a567-0e02b2c3d474', 'P1S', 'bambu-lab-p1s', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, parent_id, name, slug, sort_order) VALUES 
('c111110b-58cc-4372-a567-0e02b2c3d477', 'c111110b-58cc-4372-a567-0e02b2c3d473', 'Elegoo', 'elegoo-printers', 1),
('c111110b-58cc-4372-a567-0e02b2c3d478', 'c111110b-58cc-4372-a567-0e02b2c3d473', 'Uniformation', 'uniformation-printers', 2)
ON CONFLICT (id) DO NOTHING;

-- Seed Products with embedded JSONB metadata properties
INSERT INTO products (
    id, brand_id, category_id, name, slug, sku, description, short_description, 
    base_price, sale_price, is_exclusive, stock, images, specifications, downloads, 
    features, faqs, seo, shipping, warranty, included_items
) VALUES 
(
    '11111111-1111-1111-1111-111111111111', 
    'bbbbb10b-58cc-4372-a567-0e02b2c3d471', 
    'c111110b-58cc-4372-a567-0e02b2c3d483', 
    'Bambu Lab P1S Combo', 
    'bambu-lab-p1s-combo', 
    'BAMBU-P1S-COMBO', 
    'High-speed FDM 3D printer with Automatic Material System (AMS).', 
    'High-speed FDM 3D printer with AMS.', 
    849.00, 
    799.00, 
    true, 
    50,
    '[{"url": "https://picsum.photos/seed/a/800/800", "isPrimary": true}, {"url": "https://picsum.photos/seed/b/800/800", "isPrimary": false}]'::jsonb,
    '[{"name": "Build Volume", "value": "256x256x256 mm"}, {"name": "Print Speed", "value": "500 mm/s"}]'::jsonb,
    '[{"title": "Datasheet PDF", "url": "https://example.com/datasheet.pdf", "type": "pdf"}]'::jsonb,
    '[{"title": "High Speed Printing", "description": "Achieve up to 500mm/s.", "icon": "speed"}]'::jsonb,
    '[{"question": "Does it support ABS?", "answer": "Yes, it has an enclosed chamber."}]'::jsonb,
    '{"title": "Bambu Lab P1S Combo", "description": "CoreXY 3D printer"}'::jsonb,
    '{"deliveryTime": "3-5 business days", "shippingCharges": 0}'::jsonb,
    '{"period": "1 Year", "description": "Manufacturer warranty"}'::jsonb,
    '["Power Cord", "AMS Unit", "Tool Kit"]'::jsonb
),
(
    '22222222-2222-2222-2222-222222222222', 
    'bbbbb10b-58cc-4372-a567-0e02b2c3d473', 
    'c111110b-58cc-4372-a567-0e02b2c3d477', 
    'Elegoo Mars 4 9K', 
    'elegoo-mars-4-9k', 
    'EL-M4-01', 
    'Desktop LCD Resin 3D Printer with extreme resolution.', 
    'Desktop Resin 3D Printer.', 
    259.00, 
    249.00, 
    false, 
    120,
    '[{"url": "https://picsum.photos/seed/f/800/800", "isPrimary": true}]'::jsonb,
    '[{"name": "Build Volume", "value": "153x77x165 mm"}, {"name": "Resolution", "value": "9K"}]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    '[]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Seed Sample Warehouse
INSERT INTO warehouses (id, name, location) VALUES 
('w444440b-58cc-4372-a567-0e02b2c3d471', 'Main Hub - Panchkula', 'Haryana, India')
ON CONFLICT (id) DO NOTHING;

-- Seed Inventory Rows
INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES 
('11111111-1111-1111-1111-111111111111', 'w444440b-58cc-4372-a567-0e02b2c3d471', 50),
('22222222-2222-2222-2222-222222222222', 'w444440b-58cc-4372-a567-0e02b2c3d471', 120)
ON CONFLICT DO NOTHING;

-- Seed Settings Table
INSERT INTO settings (id, setting_key, setting_data) VALUES
(uuid_generate_v4(), 'main_colors', '{"primary": "#d65108", "secondary": "#1a1a1a"}'::jsonb),
(uuid_generate_v4(), 'store_info', '{"name": "3D Galaxy", "address": "Panchkula, Haryana", "phone": "+91 999999999"}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
