const fs = require('fs');

let code = fs.readFileSync('scripts/generate_database_audit_pdf.js', 'utf8');

// 1. Add badge-deferred CSS
const badgeCssOld = '.badge-keep {';
const badgeCssNew = `.badge-deferred {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fcd34d;
    }

    .row-deferred td {
      background-color: rgba(245, 158, 11, 0.04);
    }

    .badge-keep {`;
code = code.replace(badgeCssOld, badgeCssNew);

// 2. Update cover stats
const statsOld = `<div class="cover-stat-val" style="color: #f43f5e;">36</div>
          <div class="cover-stat-lbl">Tables to Prune (~55%)</div>`;
const statsNew = `<div class="cover-stat-val" style="color: #34d399;">27</div>
          <div class="cover-stat-lbl">Safe to Prune (Phase 1)</div>
        </div>
        <div class="cover-stat-card">
          <div class="cover-stat-val" style="color: #f59e0b;">9</div>
          <div class="cover-stat-lbl">Deferred / Blocked (Phase 2)</div>`;
code = code.replace(statsOld, statsNew);

// 3. Update rows
code = code.replace(
  '<tr class="row-remove"><td>18</td><td><code>homepage_section_items</code></td><td><span class="badge badge-remove">DROP</span></td><td>1</td><td>Redundant. Section items are managed as JSONB in <code>homepage_sections</code>.</td></tr>',
  '<tr class="row-deferred"><td>18</td><td><code>homepage_section_items</code></td><td><span class="badge badge-deferred">DEFERRED (PHASE 2)</span></td><td>3</td><td><strong>Blocked by Code:</strong> Active calls in <code>settings.service.ts:440, 670</code> &amp; <code>category.ts:446</code>. Migrate to JSONB array first.</td></tr>'
);

code = code.replace(
  '<tr class="row-remove"><td>21</td><td><code>inventory_transactions</code></td><td><span class="badge badge-remove">DROP</span></td><td>0</td><td>Unused. Ledger table is unpopulated and unqueried.</td></tr>',
  '<tr class="row-deferred"><td>21</td><td><code>inventory_transactions</code></td><td><span class="badge badge-deferred">DEFERRED (PHASE 2)</span></td><td>3</td><td><strong>Blocked by Code:</strong> Active calls in <code>payment.ts:55</code> &amp; <code>order.ts:862, 901</code> during checkout. Refactor <code>deductInventory()</code> first.</td></tr>'
);

code = code.replace(
  '<tr class="row-remove"><td>29</td><td><code>order_status_history</code></td><td><span class="badge badge-remove">DROP</span></td><td>1</td><td>Write-only audit table. Order status is tracked directly on <code>orders</code>.</td></tr>',
  '<tr class="row-deferred"><td>29</td><td><code>order_status_history</code></td><td><span class="badge badge-deferred">DEFERRED (PHASE 2)</span></td><td>1</td><td><strong>Blocked by Code:</strong> Active call in <code>order.ts:1260</code> (addOrderNotes). Migrate notes to <code>orders.metadata</code> first.</td></tr>'
);

code = code.replace(
  '<tr class="row-remove"><td>34</td><td><code>permissions</code></td><td><span class="badge badge-remove">DROP</span></td><td>0</td><td>Over-engineered RBAC. Replaced with single <code>users.role</code> column.</td></tr>',
  '<tr class="row-deferred"><td>34</td><td><code>permissions</code></td><td><span class="badge badge-deferred">DEFERRED (PHASE 2)</span></td><td>0 (FK)</td><td><strong>Blocked by FK:</strong> Foreign key to <code>roles</code>. Drop in Phase 2 together with roles.</td></tr>'
);

code = code.replace(
  '<tr class="row-remove"><td>45</td><td><code>product_reviews</code></td><td><span class="badge badge-consolidate">CONSOLIDATE</span></td><td>4</td><td>Duplicate. Merge data into <code>customer_reviews</code> and drop table.</td></tr>',
  '<tr class="row-deferred"><td>45</td><td><code>product_reviews</code></td><td><span class="badge badge-deferred">DEFERRED (PHASE 2)</span></td><td>3</td><td><strong>Blocked by Code:</strong> Queried in <code>reviewAggregation.ts:74, 312</code>. Decouple dual-query before dropping.</td></tr>'
);

code = code.replace(
  '<tr class="row-remove"><td>57</td><td><code>role_permissions</code></td><td><span class="badge badge-remove">DROP</span></td><td>0</td><td>Over-engineered RBAC. Replaced with single <code>users.role</code> column.</td></tr>',
  '<tr class="row-deferred"><td>57</td><td><code>role_permissions</code></td><td><span class="badge badge-deferred">DEFERRED (PHASE 2)</span></td><td>0 (FK)</td><td><strong>Blocked by FK:</strong> Foreign key to <code>roles</code>. Drop in Phase 2 together with roles.</td></tr>'
);

code = code.replace(
  '<tr class="row-remove"><td>58</td><td><code>roles</code></td><td><span class="badge badge-remove">DROP</span></td><td>0</td><td>Over-engineered RBAC. Replaced with single <code>users.role</code> column.</td></tr>',
  '<tr class="row-deferred"><td>58</td><td><code>roles</code></td><td><span class="badge badge-deferred">DEFERRED (PHASE 2)</span></td><td>11</td><td><strong>Blocked by Code:</strong> Queried in <code>auth.ts:78</code>, <code>order.ts:561</code>, <code>payment.ts:1376</code>, <code>user.ts:119</code>. Add <code>users.role</code> first.</td></tr>'
);

code = code.replace(
  '<tr class="row-remove"><td>62</td><td><code>theme_settings</code></td><td><span class="badge badge-remove">DROP</span></td><td>0</td><td>Consolidated. Replaced by <code>settings.theme</code> (colors, fonts, logo).</td></tr>',
  '<tr class="row-deferred"><td>62</td><td><code>theme_settings</code></td><td><span class="badge badge-deferred">DEFERRED (PHASE 2)</span></td><td>18</td><td><strong>Blocked by Code:</strong> Actively upserted in <code>settings.service.ts:555</code> and <code>settings.ts:23</code>. Decouple admin settings first.</td></tr>'
);

code = code.replace(
  '<tr class="row-remove"><td>63</td><td><code>user_roles</code></td><td><span class="badge badge-remove">DROP</span></td><td>0</td><td>Over-engineered RBAC. Replaced with single <code>users.role</code> column.</td></tr>',
  '<tr class="row-deferred"><td>63</td><td><code>user_roles</code></td><td><span class="badge badge-deferred">DEFERRED (PHASE 2)</span></td><td>Relational</td><td><strong>Blocked by Code:</strong> Linked to <code>User</code> in Prisma and auth controller. Drop in Phase 2.</td></tr>'
);

code = code.replace(
  '<tr class="row-remove"><td>65</td><td><code>warehouses</code></td><td><span class="badge badge-remove">DROP</span></td><td>0</td><td>Single-tenant store. Remove query to save checkout latency.</td></tr>',
  '<tr class="row-deferred"><td>65</td><td><code>warehouses</code></td><td><span class="badge badge-deferred">DEFERRED (PHASE 2)</span></td><td>2</td><td><strong>Blocked by Code:</strong> Queried in <code>payment.ts:31</code> &amp; <code>order.ts:879</code> during checkout. Decouple before dropping.</td></tr>'
);

// 4. Update the SQL migration section
const oldSqlSection = `<pre><span class="code-comment">-- ==============================================================================
-- 3D GALAXY — DATABASE PRUNING &amp; PERFORMANCE OPTIMIZATION SCRIPT
-- ==============================================================================</span>
<span class="code-kw">BEGIN</span>;

<span class="code-comment">-- 1. DROP THE 18 DEAD PRODUCT SATELLITE TABLES (SUPERSEDED BY JSONB)</span>
<span class="code-kw">DROP TABLE IF EXISTS</span> product_variant_options <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_variant_images <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_option_values <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_options <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_attribute_values <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_attributes <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_specifications <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_features <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_downloads <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_faqs <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_images <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_included_items <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_related_products <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_seo <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_shipping <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_warranty <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_tag_mapping <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_tags <span class="code-kw">CASCADE</span>;

<span class="code-comment">-- 2. DROP DEAD / ORPHAN TABLES (0 CODE REFERENCES)</span>
<span class="code-kw">DROP TABLE IF EXISTS</span> customer_sessions <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> customer_notifications <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> search_logs <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> coupon_usage <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> page_sections <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> blog_categories <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> notification_templates <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> inventory_transactions <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> contact_requests <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> order_status_history <span class="code-kw">CASCADE</span>;

<span class="code-comment">-- 3. DROP REDUNDANT CONFIG &amp; CMS TABLES (CONSOLIDATED INTO SETTINGS)</span>
<span class="code-kw">DROP TABLE IF EXISTS</span> search_settings <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> payment_gateways <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> theme_settings <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> homepage_section_items <span class="code-kw">CASCADE</span>;

<span class="code-comment">-- 4. CONSOLIDATE REVIEWS (DROP PRODUCT_REVIEWS DUPLICATE)</span>
<span class="code-kw">DROP TABLE IF EXISTS</span> product_reviews <span class="code-kw">CASCADE</span>;

<span class="code-comment">-- 5. FLATTEN RBAC OVERHEAD</span>
<span class="code-kw">DROP TABLE IF EXISTS</span> role_permissions <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> user_roles <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> permissions <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> roles <span class="code-kw">CASCADE</span>;

<span class="code-comment">-- Add direct role column on users if not present</span>
<span class="code-kw">ALTER TABLE</span> users <span class="code-kw">ADD COLUMN IF NOT EXISTS</span> role <span class="code-kw">VARCHAR</span>(20) <span class="code-kw">DEFAULT</span> <span class="code-str">'Customer'</span>;

<span class="code-comment">-- 6. DROP SINGLE-WAREHOUSE OVERHEAD</span>
<span class="code-kw">ALTER TABLE</span> inventory <span class="code-kw">DROP CONSTRAINT IF EXISTS</span> inventory_warehouse_id_fkey;
<span class="code-kw">DROP TABLE IF EXISTS</span> warehouses <span class="code-kw">CASCADE</span>;

<span class="code-kw">COMMIT</span>;`;

const newSqlSection = `<pre><span class="code-comment">-- ==============================================================================
-- 3D GALAXY — PHASED DATABASE PRUNING SCRIPT
-- ==============================================================================
-- PHASE 1: SAFE IMMEDIATE PRUNING (27 TABLES — 0 CODE DEPENDENCIES)
-- ==============================================================================</span>
<span class="code-kw">BEGIN</span>;

<span class="code-comment">-- 1. OVER-NORMALIZED PRODUCT SATELLITE TABLES (18 TABLES — PRESERVED IN JSONB)</span>
<span class="code-kw">DROP TABLE IF EXISTS</span> product_variant_options <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_variant_images <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_option_values <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_options <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_attribute_values <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_attributes <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_specifications <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_features <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_downloads <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_faqs <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_images <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_included_items <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_related_products <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_seo <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_shipping <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_warranty <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_tag_mapping <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> product_tags <span class="code-kw">CASCADE</span>;

<span class="code-comment">-- 2. DEAD / ORPHAN / SUPERSEDED TABLES (9 TABLES — 0 CODE REFERENCES)</span>
<span class="code-kw">DROP TABLE IF EXISTS</span> customer_sessions <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> customer_notifications <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> search_logs <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> search_settings <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> payment_gateways <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> coupon_usage <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> page_sections <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> blog_categories <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> notification_templates <span class="code-kw">CASCADE</span>;
<span class="code-kw">DROP TABLE IF EXISTS</span> contact_requests <span class="code-kw">CASCADE</span>;

<span class="code-kw">COMMIT</span>;

<span class="code-comment">-- ==============================================================================
-- PHASE 2: DEFERRED (9 TABLES BLOCKED BY CODE — REFACTOR CODE BEFORE DROPPING)
-- ==============================================================================
-- DO NOT UNCOMMENT UNTIL PREREQUISITES ARE MET:
-- 1. Refactor payment.ts:31 & order.ts:879 -> Remove tx.warehouse and tx.inventoryTransaction
-- 2. Refactor settings.service.ts:440 -> Migrate homepageSectionItem to JSONB
-- 3. Refactor settings.service.ts:555 -> Remove themeSetting.upsert()
-- 4. Refactor reviewAggregation.ts:74 -> Remove productReview query (use customerReview)
-- 5. Refactor order.ts:1260 -> Store admin notes in orders.metadata JSONB
-- 6. Refactor auth.ts:78 -> Add users.role column; remove prisma.role & user_roles
--
-- BEGIN;
-- DROP TABLE IF EXISTS warehouses, inventory_transactions CASCADE;
-- DROP TABLE IF EXISTS homepage_section_items CASCADE;
-- DROP TABLE IF EXISTS theme_settings CASCADE;
-- DROP TABLE IF EXISTS product_reviews CASCADE;
-- DROP TABLE IF EXISTS order_status_history CASCADE;
-- DROP TABLE IF EXISTS role_permissions, user_roles, permissions, roles CASCADE;
-- COMMIT;</span>`;

code = code.replace(oldSqlSection, newSqlSection);

fs.writeFileSync('scripts/generate_database_audit_pdf.js', code);
console.log('scripts/generate_database_audit_pdf.js updated successfully!');
