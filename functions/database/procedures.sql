-- Restock Product Procedure
CREATE OR REPLACE PROCEDURE restock_product(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_amount INTEGER,
    p_notes TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_inventory_id UUID;
BEGIN
    -- Find or create inventory record
    SELECT id INTO v_inventory_id
    FROM inventory
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

    IF v_inventory_id IS NULL THEN
        INSERT INTO inventory (product_id, warehouse_id, quantity)
        VALUES (p_product_id, p_warehouse_id, p_amount)
        RETURNING id INTO v_inventory_id;
    ELSE
        UPDATE inventory
        SET quantity = quantity + p_amount
        WHERE id = v_inventory_id;
    END IF;

    -- Create transaction record
    INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, notes)
    VALUES (v_inventory_id, 'IN', p_amount, p_notes);
    
    COMMIT;
END;
$$;
