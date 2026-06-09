# 3D Galaxy - PostgreSQL Database Hub

This directory contains the complete database schema, logic configurations, structured dependencies, and dummy data algorithms for the 3D Galaxy relational architecture.

## Execution Order

To set up the database from scratch on a completely blank PostgreSQL environment, execute the files utilizing `psql` in the exact following chronological order:

```bash
psql -U postgres -d 3dgalaxy -f schema.sql
psql -U postgres -d 3dgalaxy -f indexes.sql
psql -U postgres -d 3dgalaxy -f functions.sql
psql -U postgres -d 3dgalaxy -f triggers.sql
psql -U postgres -d 3dgalaxy -f views.sql
psql -U postgres -d 3dgalaxy -f procedures.sql
psql -U postgres -d 3dgalaxy -f seed.sql
```

## Structure Summary

*   **`schema.sql`**: Contains all base tables with relationships (Foreign Keys), constraints (Unique, NOT NULL), and cascading architecture across Authing, E-Commerce scopes, Inventory, Customers and CMS logic.
*   **`indexes.sql`**: High-performance optimization indexes for common lookup dimensions like Slugs, Foreign Keys, Emails, and SKUs.
*   **`functions.sql`**: Powerful PostgreSQL server-side Pl/pgSQL helper functions. Handles deep categorical recursive trees (`get_category_tree()`), hierarchical breadcrumbs trails (`get_breadcrumb()`), localized audit tracking (`process_audit_log()`), and synchronized calculations.
*   **`triggers.sql`**: Event-driven hooks firing automated procedures (e.g. tracking `updated_at` timestamps natively safely or inventory deduction directly bound to transactional Order completion states).
*   **`views.sql`**: Reporting aggregations and materialized visual states. Provides a flat overview model. Includes `dashboard_summary_view` and `sales_summary_view`.
*   **`procedures.sql`**: Isolated complex procedural transaction structures. Enables strict multi-stage functions like physical restock protocols (`restock_product()`).
*   **`seed.sql`**: Base operational state deployment. Populates Admin users, hierarchy category scaffolding (FDM vs Resin Trees), core Brands (Bambu Lab, Creality), initial warehouses, and Theme global states.
*   **`migrations/`**: Directory established to track future incremental version changes to the DB structure sequentially safely.
