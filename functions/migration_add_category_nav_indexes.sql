-- ============================================================
-- Navigation Performance: Category Index Migration
-- Apply via: Supabase Dashboard → SQL Editor
-- Or: psql -h db.glaljifokncxzjvajzrg.supabase.co -U postgres -f migration_add_category_nav_indexes.sql
-- ============================================================
--
-- These 3 composite indexes optimize the explore-navigation
-- category queries from a full sequential scan to index scans.
-- CREATE INDEX CONCURRENTLY avoids locking the table during creation.
--

-- Index 1: Primary filter used on every category navigation query
-- WHERE is_active = true AND deleted_at IS NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_is_active_deleted_at
  ON categories (is_active, deleted_at);

-- Index 2: Subcategory BFS descendant lookup
-- WHERE parent_id = $1 AND is_active = true AND deleted_at IS NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_parent_id_is_active_deleted_at
  ON categories (parent_id, is_active, deleted_at);

-- Index 3: Ordered root-category fetch
-- WHERE is_active = true AND deleted_at IS NULL ORDER BY sort_order ASC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_is_active_deleted_at_sort_order
  ON categories (is_active, deleted_at, sort_order);

-- Verify the indexes were created:
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'categories'
  AND indexname LIKE 'idx_categories_%'
ORDER BY indexname;
