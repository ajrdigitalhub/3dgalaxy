-- ==============================================================================
-- 3D GALAXY — PRODUCTION DATABASE PRUNING & OPTIMIZATION SCRIPT
-- ==============================================================================
-- CODE AUDIT DATE: October 2026
--
-- SUMMARY OF CODE AUDIT:
-- Total Tables Audited: 38
-- Safe to Drop Immediately (Phase 1): 27 Tables (0 code dependencies)
-- Blocked / Requires Code Refactoring (Phase 2): 9 Tables (Active backend calls)
--
-- PRE-REQUISITES BEFORE RUNNING:
--   1. Database snapshot/backup: pg_dump -U postgres -d galaxy3d_db -f pre_prune_backup.sql
--   2. Verify low traffic / maintenance window.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- PHASE 1: SAFE IMMEDIATE PRUNING (27 TABLES — ZERO ACTIVE CODE CALLS)
-- ==============================================================================

-- 1. OVER-NORMALIZED PRODUCT SATELLITE TABLES (18 TABLES)
-- VERIFIED: All product attributes, specs, options, variants, downloads, FAQs,
-- and tags are stored directly inside JSONB columns in 'products' and 'product_variants'.
-- (functions/src/controllers/product.ts lines 1563-1635)
DROP TABLE IF EXISTS product_variant_options CASCADE;
DROP TABLE IF EXISTS product_variant_images CASCADE;
DROP TABLE IF EXISTS product_option_values CASCADE;
DROP TABLE IF EXISTS product_options CASCADE;
DROP TABLE IF EXISTS product_attribute_values CASCADE;
DROP TABLE IF EXISTS product_attributes CASCADE;
DROP TABLE IF EXISTS product_specifications CASCADE;
DROP TABLE IF EXISTS product_features CASCADE;
DROP TABLE IF EXISTS product_downloads CASCADE;
DROP TABLE IF EXISTS product_faqs CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS product_included_items CASCADE;
DROP TABLE IF EXISTS product_related_products CASCADE;
DROP TABLE IF EXISTS product_seo CASCADE;
DROP TABLE IF EXISTS product_shipping CASCADE;
DROP TABLE IF EXISTS product_warranty CASCADE;
DROP TABLE IF EXISTS product_tag_mapping CASCADE;
DROP TABLE IF EXISTS product_tags CASCADE;

-- 2. DEAD / ORPHAN / SUPERSEDED TABLES (9 TABLES)
-- VERIFIED: 0 backend queries, 0 Prisma models active, 0 frontend calls.
DROP TABLE IF EXISTS customer_sessions CASCADE;        -- Auth is stateless JWT
DROP TABLE IF EXISTS customer_notifications CASCADE;   -- FCM uses 'notifications' & 'notification_devices'
DROP TABLE IF EXISTS search_logs CASCADE;              -- Telemetry/analytics handled externally
DROP TABLE IF EXISTS search_settings CASCADE;          -- Consolidated into 'settings' JSON
DROP TABLE IF EXISTS payment_gateways CASCADE;          -- Gateways configured via settings/env
DROP TABLE IF EXISTS coupon_usage CASCADE;             -- Coupons tracked on order records directly
DROP TABLE IF EXISTS page_sections CASCADE;            -- Replaced by 'homepage_sections'
DROP TABLE IF EXISTS blog_categories CASCADE;          -- Blogs use direct category strings
DROP TABLE IF EXISTS notification_templates CASCADE;   -- Replaced by inline FCM templates
DROP TABLE IF EXISTS contact_requests CASCADE;         -- 0 backend or frontend references

COMMIT;


-- ==============================================================================
-- PHASE 2: DEFERRED TABLES (BLOCKED BY BACKEND CODE — DO NOT RUN YET)
-- ==============================================================================
-- The following tables are identified for removal in the architectural target state,
-- BUT CANNOT BE DROPPED UNTIL THE CORRESPONDING BACKEND CODE IS REFACTORED.
-- Dropping these prematurely will cause runtime exceptions (HTTP 500) during
-- checkout, payment processing, user registration, and homepage rendering.
--
-- UNCOMMENT ONLY AFTER REFACTORING:
--
-- ------------------------------------------------------------------------------
-- BLOCKER 1: WAREHOUSES & INVENTORY TRANSACTIONS
-- Code Dependencies:
--   - functions/src/controllers/payment.ts:31  -> tx.warehouse.findFirst()
--   - functions/src/controllers/payment.ts:55  -> tx.inventoryTransaction.create()
--   - functions/src/controllers/order.ts:879   -> tx.warehouse.findFirst()
--   - functions/src/controllers/order.ts:901   -> tx.inventoryTransaction.create()
-- Refactoring Required:
--   Update deductInventory() in payment.ts and order.ts to decrement Product.stock
--   directly without querying tx.warehouse or writing tx.inventoryTransaction.
--
-- BEGIN;
-- ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_warehouse_id_fkey;
-- DROP TABLE IF EXISTS warehouses CASCADE;
-- DROP TABLE IF EXISTS inventory_transactions CASCADE;
-- COMMIT;
-- ------------------------------------------------------------------------------
--
-- ------------------------------------------------------------------------------
-- BLOCKER 2: HOMEPAGE SECTION ITEMS
-- Code Dependencies:
--   - functions/src/modules/settings/settings.service.ts:440 -> prisma.homepageSection.findMany({ include: { items: ... } })
--   - functions/src/modules/settings/settings.service.ts:670 -> tx.homepageSectionItem.createMany()
--   - functions/src/controllers/category.ts:446            -> tx.homepageSectionItem.deleteMany()
-- Refactoring Required:
--   Migrate homepage section item lists directly into a JSONB array inside homepage_sections.items.
--
-- BEGIN;
-- DROP TABLE IF EXISTS homepage_section_items CASCADE;
-- COMMIT;
-- ------------------------------------------------------------------------------
--
-- ------------------------------------------------------------------------------
-- BLOCKER 3: THEME SETTINGS
-- Code Dependencies:
--   - functions/src/modules/settings/settings.service.ts:555 -> prisma.themeSetting.upsert()
--   - functions/src/controllers/settings.ts:23-157          -> prisma.themeSetting.*
-- Refactoring Required:
--   Store theme directly in prisma.setting ('app_settings'). Remove themeSetting.upsert calls.
--
-- BEGIN;
-- DROP TABLE IF EXISTS theme_settings CASCADE;
-- COMMIT;
-- ------------------------------------------------------------------------------
--
-- ------------------------------------------------------------------------------
-- BLOCKER 4: PRODUCT REVIEWS DUPLICATION
-- Code Dependencies:
--   - functions/src/services/reviewAggregation.ts:74, 312   -> prisma.productReview.findMany()
-- Refactoring Required:
--   Remove productReview queries in reviewAggregation.ts (keep only customerReview).
--
-- BEGIN;
-- DROP TABLE IF EXISTS product_reviews CASCADE;
-- COMMIT;
-- ------------------------------------------------------------------------------
--
-- ------------------------------------------------------------------------------
-- BLOCKER 5: ORDER STATUS HISTORY
-- Code Dependencies:
--   - functions/src/controllers/order.ts:1260 -> prisma.orderStatusHistory.create() (addOrderNotes)
-- Refactoring Required:
--   Store admin order notes in orders.metadata JSONB column.
--
-- BEGIN;
-- DROP TABLE IF EXISTS order_status_history CASCADE;
-- COMMIT;
-- ------------------------------------------------------------------------------
--
-- ------------------------------------------------------------------------------
-- BLOCKER 6: RBAC OVER-ENGINEERING (roles, user_roles, permissions, role_permissions)
-- Code Dependencies:
--   - functions/src/controllers/auth.ts:78-105     -> prisma.role.findUnique(), user.roles.create()
--   - functions/src/controllers/order.ts:561       -> prisma.role.findFirst({ where: { name: 'Guest' } })
--   - functions/src/controllers/payment.ts:1376    -> prisma.role.findFirst({ where: { name: 'Guest' } })
--   - functions/src/controllers/user.ts:119        -> prisma.role.findMany()
-- Refactoring Required:
--   Add users.role column; update auth and checkout to write role = 'Customer' / 'Guest' directly.
--
-- BEGIN;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'Customer';
-- DROP TABLE IF EXISTS role_permissions CASCADE;
-- DROP TABLE IF EXISTS user_roles CASCADE;
-- DROP TABLE IF EXISTS permissions CASCADE;
-- DROP TABLE IF EXISTS roles CASCADE;
-- COMMIT;
-- ------------------------------------------------------------------------------


-- ==============================================================================
-- DISK SPACE RECLAMATION & QUERY PLANNER RECALIBRATION
-- ==============================================================================
-- Run outside of a transaction block after executing Phase 1:
-- VACUUM FULL ANALYZE;
-- REINDEX DATABASE current_database();
