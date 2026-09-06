-- Performance Composite Indexes for High-Frequency Queries
CREATE INDEX IF NOT EXISTS "idx_product_variants_prod_active" ON "product_variants" ("product_id", "is_active");
CREATE INDEX IF NOT EXISTS "idx_orders_cust_status" ON "orders" ("customer_id", "status");
CREATE INDEX IF NOT EXISTS "idx_carts_cust_status" ON "carts" ("customer_id", "status");
CREATE INDEX IF NOT EXISTS "idx_carts_sess_status" ON "carts" ("session_id", "status");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_msg_conv_created" ON "whatsapp_messages" ("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications" ("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_guest_read" ON "notifications" ("guest_id", "is_read");
