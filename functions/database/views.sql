-- Category Tree View (Flat visualization)
CREATE OR REPLACE VIEW category_tree_view AS
SELECT 
    c1.name AS level_1,
    c2.name AS level_2,
    c3.name AS level_3,
    c1.id AS level_1_id,
    c2.id AS level_2_id,
    c3.id AS level_3_id
FROM categories c1
LEFT JOIN categories c2 ON c2.parent_id = c1.id
LEFT JOIN categories c3 ON c3.parent_id = c2.id
WHERE c1.parent_id IS NULL;

-- Dashboard Summary View
CREATE OR REPLACE VIEW dashboard_summary_view AS
SELECT
    (SELECT COUNT(*) FROM orders WHERE status != 'CANCELLED') AS total_orders,
    (SELECT SUM(total_amount) FROM orders WHERE status = 'DELIVERED') AS total_revenue,
    (SELECT COUNT(*) FROM products WHERE is_active = TRUE) AS active_products,
    (SELECT COUNT(*) FROM customers) AS total_customers;

-- Top Products View
CREATE OR REPLACE VIEW top_products_view AS
SELECT p.id, p.name, p.sku, SUM(oi.quantity) AS total_sold, SUM(oi.total_price) AS total_revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status != 'CANCELLED'
GROUP BY p.id, p.name, p.sku
ORDER BY total_sold DESC;

-- Sales Summary View
CREATE OR REPLACE VIEW sales_summary_view AS
SELECT 
    DATE_TRUNC('day', created_at) AS sale_date,
    COUNT(id) AS order_count,
    SUM(total_amount) AS total_revenue
FROM orders
WHERE status != 'CANCELLED'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY sale_date DESC;
