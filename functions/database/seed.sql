-- Create Roles
INSERT INTO roles (id, name, description) VALUES 
('e2098679-b788-46cb-b1ec-df0bc79db5d3', 'Super Admin', 'Super Administrator with unrestricted access'),
('e2098679-b788-46cb-b1ec-df0bc79db5d4', 'Admin', 'Administrator with full access'),
('e2098679-b788-46cb-b1ec-df0bc79db5d5', 'Manager', 'Store Manager'),
('e2098679-b788-46cb-b1ec-df0bc79db5d6', 'Customer', 'Regular Customer');

-- Create Permissions
INSERT INTO permissions (id, name, resource, action) VALUES 
('p2098679-b788-46cb-b1ec-df0bc79db5d1', 'manage_all', 'all', 'all');

-- Assign Role Permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES 
('e2098679-b788-46cb-b1ec-df0bc79db5d3', 'p2098679-b788-46cb-b1ec-df0bc79db5d1'),
('e2098679-b788-46cb-b1ec-df0bc79db5d4', 'p2098679-b788-46cb-b1ec-df0bc79db5d1');

-- Admin User
INSERT INTO users (id, email, password_hash, first_name, last_name, is_active) VALUES 
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'admin@3dgalaxy.com', '$2b$10$h9W0g8G1mDqI9y2D8d2v2Oe.x9xOOnS8y9iS0f1gXlZl7U8BvH7gY', 'Super', 'Admin', true);

INSERT INTO user_roles (user_id, role_id) VALUES 
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'e2098679-b788-46cb-b1ec-df0bc79db5d3');

-- Seed Brands
INSERT INTO brands (id, name, slug) VALUES 
('bbbbb10b-58cc-4372-a567-0e02b2c3d471', 'Bambu Lab', 'bambu-lab'),
('bbbbb10b-58cc-4372-a567-0e02b2c3d472', 'Creality', 'creality'),
('bbbbb10b-58cc-4372-a567-0e02b2c3d473', 'Elegoo', 'elegoo'),
('bbbbb10b-58cc-4372-a567-0e02b2c3d474', 'Flashforge', 'flashforge'),
('bbbbb10b-58cc-4372-a567-0e02b2c3d475', 'Uniformation', 'uniformation');

-- Seed Categories (Hierarchical)
-- 1. Printers Root
INSERT INTO categories (id, name, slug, description, sort_order) VALUES 
('c111110b-58cc-4372-a567-0e02b2c3d471', '3D Printers', '3d-printers', 'All 3D Printers', 1);

-- 1.1 FDM vs Resin
INSERT INTO categories (id, parent_id, name, slug, sort_order) VALUES 
('c111110b-58cc-4372-a567-0e02b2c3d472', 'c111110b-58cc-4372-a567-0e02b2c3d471', 'FDM Printers', 'fdm-printers', 1),
('c111110b-58cc-4372-a567-0e02b2c3d473', 'c111110b-58cc-4372-a567-0e02b2c3d471', 'Resin Printers', 'resin-printers', 2),
('c111110b-58cc-4372-a567-0e02b2c3d499', 'c111110b-58cc-4372-a567-0e02b2c3d471', 'Industrial Printers', 'industrial-printers', 3);

-- 1.1.1 FDM Sub-Categories
INSERT INTO categories (id, parent_id, name, slug, sort_order) VALUES 
('c111110b-58cc-4372-a567-0e02b2c3d474', 'c111110b-58cc-4372-a567-0e02b2c3d472', 'Bambu Lab', 'bambu-lab-printers', 1),
('c111110b-58cc-4372-a567-0e02b2c3d475', 'c111110b-58cc-4372-a567-0e02b2c3d472', 'Creality', 'creality-printers', 2),
('c111110b-58cc-4372-a567-0e02b2c3d476', 'c111110b-58cc-4372-a567-0e02b2c3d472', 'Flashforge', 'flashforge-printers', 3);

-- 1.1.1.1 Bambu Lab Sub-Models
INSERT INTO categories (id, parent_id, name, slug, sort_order) VALUES 
('c111110b-58cc-4372-a567-0e02b2c3d481', 'c111110b-58cc-4372-a567-0e02b2c3d474', 'A1', 'bambu-lab-a1', 1),
('c111110b-58cc-4372-a567-0e02b2c3d482', 'c111110b-58cc-4372-a567-0e02b2c3d474', 'A1 Mini', 'bambu-lab-a1-mini', 2),
('c111110b-58cc-4372-a567-0e02b2c3d483', 'c111110b-58cc-4372-a567-0e02b2c3d474', 'P1S', 'bambu-lab-p1s', 3);

-- 1.1.2 Resin Sub-Categories
INSERT INTO categories (id, parent_id, name, slug, sort_order) VALUES 
('c111110b-58cc-4372-a567-0e02b2c3d477', 'c111110b-58cc-4372-a567-0e02b2c3d473', 'Elegoo', 'elegoo-printers', 1),
('c111110b-58cc-4372-a567-0e02b2c3d478', 'c111110b-58cc-4372-a567-0e02b2c3d473', 'Uniformation', 'uniformation-printers', 2);

-- 2. Materials Root
INSERT INTO categories (id, name, slug, description, sort_order) VALUES 
('c222220b-58cc-4372-a567-0e02b2c3d471', 'Materials', 'materials', '3D Printing Materials', 2);

-- 2.1 Materials Sub
INSERT INTO categories (id, parent_id, name, slug, sort_order) VALUES 
('c222220b-58cc-4372-a567-0e02b2c3d472', 'c222220b-58cc-4372-a567-0e02b2c3d471', 'Filaments', 'filaments', 1),
('c222220b-58cc-4372-a567-0e02b2c3d473', 'c222220b-58cc-4372-a567-0e02b2c3d471', 'Resin', 'resin-materials', 2);

-- 2.1.1 Filaments Sub
INSERT INTO categories (id, parent_id, name, slug, sort_order) VALUES 
('c222220b-58cc-4372-a567-0e02b2c3d474', 'c222220b-58cc-4372-a567-0e02b2c3d472', 'PLA', 'pla-filament', 1),
('c222220b-58cc-4372-a567-0e02b2c3d475', 'c222220b-58cc-4372-a567-0e02b2c3d472', 'ABS', 'abs-filament', 2),
('c222220b-58cc-4372-a567-0e02b2c3d476', 'c222220b-58cc-4372-a567-0e02b2c3d472', 'PETG', 'petg-filament', 3),
('c222220b-58cc-4372-a567-0e02b2c3d477', 'c222220b-58cc-4372-a567-0e02b2c3d472', 'TPU', 'tpu-filament', 4);

-- Seed Products
INSERT INTO products (id, brand_id, category_id, name, slug, sku, description, base_price, sale_price, is_exclusive) VALUES 
('p333330b-58cc-4372-a567-0e02b2c3d471', 'bbbbb10b-58cc-4372-a567-0e02b2c3d471', 'c111110b-58cc-4372-a567-0e02b2c3d483', 'Bambu Lab P1S Combo', 'bambu-lab-p1s-combo', 'BAMBU-P1S-COMBO', 'High-speed FDM 3D printer with AMS.', 849.00, 799.00, TRUE),
('p333330b-58cc-4372-a567-0e02b2c3d472', 'bbbbb10b-58cc-4372-a567-0e02b2c3d472', 'c111110b-58cc-4372-a567-0e02b2c3d475', 'Creality Ender 3 V3 KE', 'creality-ender-3-v3-ke', 'ENDER-3-V3-KE', 'Smart FDM Printer', 279.00, NULL, FALSE);

-- Warehouse
INSERT INTO warehouses (id, name, location) VALUES 
('w444440b-58cc-4372-a567-0e02b2c3d471', 'Main Hub - Panchkula', 'Haryana, India');

-- Inventory
INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES 
('p333330b-58cc-4372-a567-0e02b2c3d471', 'w444440b-58cc-4372-a567-0e02b2c3d471', 50),
('p333330b-58cc-4372-a567-0e02b2c3d472', 'w444440b-58cc-4372-a567-0e02b2c3d471', 120);

-- Homepage Builder Seed
INSERT INTO homepage_sections (id, name, type, sort_order) VALUES
('h555550b-58cc-4372-a567-0e02b2c3d471', 'Main Hero Carousel', 'hero', 1),
('h555550b-58cc-4372-a567-0e02b2c3d472', 'Featured Products', 'product_grid', 2);

-- Theme Settings
INSERT INTO theme_settings (key_name, value) VALUES 
('main_colors', '{"primary": "#d65108", "secondary": "#1a1a1a"}'),
('store_info', '{"name": "3D Galaxy", "address": "Panchkula, Haryana", "phone": "+91 999999999"}');
