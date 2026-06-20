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
    COALESCE(
        (SELECT SUM(quantity - reserved_quantity) FROM inventory i WHERE i.product_id = p.id),
        0
    ) AS available_quantity
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.deleted_at IS NULL;

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
