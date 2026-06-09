-- Auto Update 'updated_at' column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- Get Breadcrumb
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

-- Calculate Order Total
CREATE OR REPLACE FUNCTION calculate_order_total(p_order_id UUID)
RETURNS void AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(total_price), 0) INTO v_total
    FROM order_items
    WHERE order_id = p_order_id;

    UPDATE orders 
    SET total_amount = v_total
    WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Inventory Update on Order
CREATE OR REPLACE FUNCTION update_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Reduce inventory based on order items
    IF NEW.status = 'CONFIRMED' AND OLD.status = 'PENDING' THEN
        UPDATE inventory i
        SET quantity = i.quantity - oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id
        AND i.product_id = oi.product_id;
        
        -- Keep audit transaction
        INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, reference_id, notes)
        SELECT i.id, 'OUT', oi.quantity, NEW.id, 'Order Confirmed'
        FROM order_items oi
        JOIN inventory i ON i.product_id = oi.product_id
        WHERE oi.order_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit Log creation
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (action, entity_type, entity_id, old_data)
        VALUES ('DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (action, entity_type, entity_id, old_data, new_data)
        VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (action, entity_type, entity_id, new_data)
        VALUES ('INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
