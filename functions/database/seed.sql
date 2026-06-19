-- ==============================================================================
-- 3D Galaxy Application Seed Data Script
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
