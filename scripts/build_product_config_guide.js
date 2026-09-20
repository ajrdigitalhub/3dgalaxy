const fs = require('fs');
const path = require('path');

const MD_OUTPUT = path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Master_Guide.md');
const HTML_OUTPUT = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration', 'product_config_print.html');

console.log('Writing Product Configuration Master Guide Markdown...');

const mdContent = `# 3D GALAXY — PRODUCT CONFIGURATION MASTER GUIDE
### Complete Product, Variant, Pricing, Inventory, Shipping & Storefront Configuration Manual
**Document Identifier:** DOC-3DG-PRD-2026-V1.0  
**Delivered By:** AJR Digital Hub Team (Enterprise Digital Solutions)  
**Delivered To:** 3D Galaxy Team (E-Commerce Operations & Store Administration)  
**Release Version:** 1.0 (Production Master) • September 2026  
**Classification:** Commercial in Confidence — Operational Reference Manual  

---

## DOCUMENT CONTROL & GOVERNANCE

| Document Attribute | Specification Details |
| :--- | :--- |
| **Document Title** | 3D Galaxy — Product Configuration Master Guide |
| **Application Platform** | 3D Galaxy Enterprise E-Commerce & Custom Manufacturing Portal |
| **Document Identifier** | DOC-3DG-PRD-2026-V1.0 |
| **Release Version** | 1.0 (Production Master) |
| **Publication Date** | September 2026 |
| **Author / Organization** | **AJR Digital Hub Team** (Platform Architecture & Engineering) |
| **Accepted / Executed By** | **3D Galaxy Team** (Catalog Management & Fulfillment Operations) |
| **Target Audience** | Store Administrators, Catalog Managers, Inventory Officers, Support Leads |
| **Document Scope** | Complete field, variant, template, matrix, pricing, inventory, logistics & storefront reference |

### Document Revision History

| Version | Release Date | Author / Entity | Summary of Operational Scope |
| :--- | :--- | :--- | :--- |
| **0.1** | Sep 18, 2026 | AJR Digital Hub Engineering | Extraction of data models, Angular components, signals, and validation rules. |
| **0.5** | Sep 19, 2026 | AJR Digital Hub Solutions | Variant Cartesian logic, dynamic delivery engine, and shipping mode hierarchy audit. |
| **1.0** | Sep 21, 2026 | AJR Digital Hub Delivery Team | Comprehensive Production Master Guide: 11 tabs, 11 display types, 6 selection modes, 10 templates, 12 test cases, and validation matrix. |

---

## 1. EXECUTIVE SUMMARY

The **Product Configuration Module** in the 3D Galaxy Admin Portal is the central operational engine of the entire e-commerce ecosystem. It governs the entire lifecycle of sellable items—from initial SKU registration, multi-category taxonomy classification, and Cartesian variant permutation generation, to real-time inventory management, shipping tariff assignments, and dynamic delivery date estimation.

In a hybrid retail and custom manufacturing enterprise such as 3D Galaxy, products are not merely static database entries. They represent complex, configurable engineering assets:
- **Physical Retail Catalog:** Standard products (3D printers, replacement parts, accessories, tools) requiring accurate SKU tracking, barcode lookup, MRP/Sale pricing, dealer pricing tiers, and stock deductions.
- **Dynamic Multi-Group Variants:** Multi-dimensional consumables (Filaments: Material × Spool Weight × Color) requiring Cartesian product matrices, individual SKU tagging, individual stock counters, color hex swatches, and automatic image mapping.
- **Custom Additive Manufacturing (STL) Integrations:** Print materials and base rates that integrate with custom 3D model slicing volume calculations, infill percentages, and automated courier weight recovery.

\`\`\`
                                  PRODUCT IDENTITY & CLASSIFICATION
                             (Title, Slug, SKU, Multi-Category, Brand)
                                                ↓
                                   PRICING & INVENTORY POLICIES
                           (MRP, Retail Sale, Dealer Price, Physical Stock)
                                                ↓
                                    VARIANT ENGINE ARCHITECTURE
                      (Groups, Display Types, Selection Modes, Combination Matrix)
                                                ↓
                                      MEDIA & CONTENT ASSETS
                        (Gallery Images, Specs, Downloads, Features, FAQs)
                                                ↓
                                      LOGISTICS & FULFILLMENT
                       (Weight in Grams, Shipping Mode, Delivery Date Engine)
                                                ↓
                                         SEO & DISCOVERABILITY
                                (Meta Tags, Social Previews, URL Slugs)
                                                ↓
                                      LIVE STOREFRONT DISPLAY
                       (Product Card, Detail Page, Customizer, Add-to-Cart)
                                                ↓
                                    CHECKOUT & ORDER FULFILLMENT
                           (GST Calculation, Courier Tariffs, Packing Slip)
\`\`\`

### Operational Significance: The Cost of Misconfiguration
Incorrect or incomplete product configuration introduces immediate downstream operational friction:
1. **Unassigned Categories:** Products disappear from category pages, faceted filters, and main navigation mega-menus.
2. **Missing Variant Weight:** Courier weight brackets default to zero or baseline rates, resulting in undercharged freight fees on heavy multi-spool bundles.
3. **Ambiguous Default Variant:** Storefront PDPs load blank swatches or zero prices, causing checkout abandonment.
4. **Incorrect Delivery Days Format:** Breaks the dynamic IST delivery date algorithm, displaying fallback estimates to customers.
5. **Unlinked Variant Images:** Swatch selection does not update the primary gallery, leading to customer confusion and returns.

---

## 2. PRODUCT CONFIGURATION ARCHITECTURE

The 3D Galaxy product data pipeline translates administrative inputs into reactive customer storefront experiences through a structured, 11-stage architectural pipeline:

\`\`\`
+---------------------------------------------------------------------------------------+
| 1. GENERAL IDENTITY & TAXONOMY                                                       |
|    Title • URL Slug • SKU • Barcode • Multi-Categories (Primary/Secondary) • Brand   |
+-------------------------------------------+-------------------------------------------+
                                            v
+---------------------------------------------------------------------------------------+
| 2. PRICING & INVENTORY ENGINE                                                         |
|    MRP Price • Retail Sale Price • Authorized Dealer Price • Physical Stock Counter   |
+-------------------------------------------+-------------------------------------------+
                                            v
+---------------------------------------------------------------------------------------+
| 3. MULTI-GROUP VARIANT MATRIX                                                         |
|    Variant Groups • 11 Display Types • 6 Selection Modes • Combination Permutations   |
+-------------------------------------------+-------------------------------------------+
                                            v
+---------------------------------------------------------------------------------------+
| 4. MEDIA & GALLERY ASSET BINDING                                                      |
|    Primary Image Designation • Gallery Ordering • Swatch-to-Image Dynamic Mapping     |
+-------------------------------------------+-------------------------------------------+
                                            v
+---------------------------------------------------------------------------------------+
| 5. TECHNICAL SPECIFICATIONS & DOWNLOADS                                               |
|    Structured Key-Value Specs • Datasheets • User Manuals • STL Profiles • Firmware   |
+-------------------------------------------+-------------------------------------------+
                                            v
+---------------------------------------------------------------------------------------+
| 6. VALUE-ADD CUSTOMER CONTENT                                                         |
|    Key Product Features • FAQ Accordions • Warranty Terms & Support Hotline           |
+-------------------------------------------+-------------------------------------------+
                                            v
+---------------------------------------------------------------------------------------+
| 7. LOGISTICS & DYNAMIC SHIPPING CALIBRATION                                           |
|    Unit Weight (g) • Shipping Hierarchy Mode • Delivery Date Range • COD Policy       |
+-------------------------------------------+-------------------------------------------+
                                            v
+---------------------------------------------------------------------------------------+
| 8. MERCHANDISING & SEO METADATA                                                       |
|    Related Products • Complementary Consumables • Meta Titles • OpenGraph Preview     |
+-------------------------------------------+-------------------------------------------+
                                            v
+---------------------------------------------------------------------------------------+
| 9. LIVE STOREFRONT SIMULATOR & VALIDATION                                             |
|    In-Admin Variant Switcher • Price & Stock Check • COD Gating • Pre-Publish Save    |
+---------------------------------------------------------------------------------------+
\`\`\`

Each phase is strictly isolated within dedicated Angular reactive signals in the Admin Portal (\`catalog-tab.ts\`), preventing cross-tab state corruption and guaranteeing deterministic database persistence.

---

## 3. COMPLETE PRODUCT CONFIGURATION TAB MAP

The Product Editor consists of **11 verified tabs**, accessible via the horizontal tab switcher:

| Tab # | Tab Identifier | Tab Label | Primary Purpose | Key Data Fields Controlled |
| :---: | :--- | :--- | :--- | :--- |
| **1** | \`general\` | **General** | Core identity, taxonomy, pricing, inventory, descriptions, and bundle inclusions. | Title, Slug, SKU, Categories, Brand, MRP, Sale, Dealer Price, Stock, Description, Bundles. |
| **2** | \`variants\` | **Variants** | Multi-group variant architecture, combination matrix generator, and bundle builder. | Variant Groups, Display Types, Selection Modes, Values, Cartesian Matrix, Tier Pricing. |
| **3** | \`images\` | **Images** | Product photography gallery, primary hero asset, ordering, and variant image mapping. | Image URLs, Primary Flag, Reorder Up/Down, Variant Image Association. |
| **4** | \`specifications\` | **Specifications** | Structured technical parameters and engineering tolerances. | Key-Value Pairs, Technical Attribute Groups, Display Sequence. |
| **5** | \`downloads\` | **Downloads** | Customer-accessible technical datasheets, user manuals, and slicing files. | File Name, File URL, File Size, Category (Datasheet, STL, Manual, Firmware). |
| **6** | \`features\` | **Features** | Highlighted feature cards and marketing value propositions. | Feature Title, Description, Material Icon, Visual Order. |
| **7** | \`faqs\` | **FAQs** | Product-specific frequently asked questions and troubleshooting guides. | Question, Answer (Markdown supported), Display Order, Active Toggle. |
| **8** | \`warranty\` | **Warranty & Support** | Manufacturer warranty terms, RMA procedures, and support contact details. | Warranty Period (Months/Years), Coverage Terms, Support Hotline, Help Email. |
| **9** | \`shipping\` | **Shipping & Delivery** | Physical weight, shipping mode hierarchy, delivery date estimation, and COD gating. | Weight in Grams, Shipping Mode, Delivery Days Range, Free Shipping Flag, COD Available. |
| **10** | \`related_products\` | **Related Products** | Cross-sell and up-sell associations displayed on the storefront PDP. | Multi-Select Product IDs, Complementary Accessories, Consumables. |
| **11** | \`seo\` | **SEO** | Search engine optimization metadata and social media OpenGraph cards. | Meta Title, Meta Description, Search Keywords, Canonical URL, OG Image. |

---

## 4. GENERAL TAB — COMPLETE FIELD REFERENCE

The General tab establishes baseline product identity, commercial pricing, inventory counters, and catalog classifications. Every field must be configured in compliance with the following operational specifications:

### 1. Product Title
* **Purpose:** Defines the official commercial title displayed across product listings, detail pages, cart, invoices, and Google Search.
* **Input Type:** Single-line Text Input.
* **Required:** **Yes (Mandatory).** The system halts saving if empty.
* **Example:** \`Anycubic Photon Mono 2 - High Resolution Resin 3D Printer\`
* **Validation:** Must be non-empty; trimmed of leading/trailing whitespace. Recommended length: 25–80 characters.
* **Used By:** Storefront Header, Product Grid, Omni-Search Indexer, Cart, Invoices, Meta Titles.
* **Customer Impact:** Primary identifier seen by customers; dictates clarity and search relevance.
* **Admin Impact:** Key label used in Admin Catalog lists, orders console, and stock adjustments.
* **Business Impact:** Directly drives conversion, organic SEO ranking, and brand credibility.

### 2. URL Slug Customization
* **Purpose:** Defines the search-engine friendly URI path for the product page (\`/product/{slug}\`).
* **Input Type:** Single-line Text Input (Lower-case alphanumeric with hyphens).
* **Required:** Optional (Auto-generated from Product Title if left blank).
* **Example:** \`anycubic-photon-mono-2\`
* **Validation:** Auto-sanitized to lower-case alphanumeric characters; spaces converted to hyphens (\`/[^a-z0-9]+/g\`). Leading and trailing hyphens stripped. Must be globally unique across products.
* **Used By:** Angular Router (\`/product/:slug\`), Canonical Links, Sitemap Generator, Social Share URLs.
* **Customer Impact:** Produces clean, readable URLs in browser address bars and marketing links.
* **Admin Impact:** Preserves SEO equity during product renaming when locked manually.
* **Business Impact:** Critical for high-ranking Google indexation; prevents broken links.

### 3. SKU Barcode / Part Number
* **Purpose:** Unique Stock Keeping Unit for inventory auditing, barcode labeling, and warehouse picking.
* **Input Type:** Single-line Alphanumeric Text Input.
* **Required:** Optional (Auto-generates \`GLX-SKU-{RANDOM}\` if omitted).
* **Example:** \`3DG-PRN-AC-PM2\`
* **Validation:** Uppercase alphanumeric; spaces converted to hyphens. Must be unique.
* **Used By:** Inventory Service, Combination Matrix Generator (as base prefix), Orders Console, Packing Slips, Barcode Scanners.
* **Customer Impact:** Visible on order receipts and confirmation emails for customer support inquiries.
* **Admin Impact:** Essential for stock audits, physical warehouse bins, and ERP synchronization.
* **Business Impact:** Prevents warehouse dispatch errors and mispicks.

### 4. Categories Architecture (Multi-Category Tagging)
* **Purpose:** Associates the product with one or more categories in the catalog taxonomy.
* **Input Type:** Multi-Select Tagging Component with Search, "Select All", "Clear All", and Primary Category Radio Selection.
* **Required:** **Yes (Mandatory).** At least one category must be selected.
* **Example:** \`3D Printers\` (Primary), \`Resin Printers\` (Secondary), \`Featured Products\` (Secondary).
* **Validation:** Reconciles selected IDs against active category store; guarantees at least one primary ID.
* **Used By:** Storefront Navigation, Category Landing Pages, Faceted Filters, Breadcrumb Trail.
* **Customer Impact:** Determines where the product appears in navigation menus and category grids.
* **Admin Impact:** Enables flexible multi-category tagging without duplicating product records.
* **Business Impact:** Directly influences discovery; multiple category placements increase storefront impressions by up to 40%.

### 5. Brand Manufacturer Alliance
* **Purpose:** Associates the product with an authorized hardware manufacturer or brand partner.
* **Input Type:** Dropdown Selection Menu.
* **Required:** Optional (Defaults to "3D Galaxy").
* **Example:** \`Anycubic\`, \`Creality\`, \`Bambu Lab\`, \`Elegoo\`, \`Sunlu\`.
* **Validation:** Matches active Brand Master collection.
* **Used By:** Brand Filter Bar, Brand Detail Landing Pages, Warranty Verification, Trust Badges.
* **Customer Impact:** Customers can filter hardware by their preferred manufacturer.
* **Admin Impact:** Enables brand-level sales reporting and manufacturer warranty tracking.
* **Business Impact:** Builds consumer trust through official manufacturer alliances.

### 6. MRP Price (INR)
* **Purpose:** Maximum Retail Price printed on manufacturer packaging (anchor price).
* **Input Type:** Numeric Input (Currency: ₹ INR).
* **Required:** **Yes.** Must be greater than 0.
* **Example:** \`24999\`
* **Validation:** Float/Integer >= 0. Must be greater than or equal to Retail Sale Price to avoid negative discounts.
* **Used By:** Storefront Price Badges, Discount Percentage Calculation (\`((MRP - Sale) / MRP) * 100\`).
* **Customer Impact:** Displayed as strike-through price (\`₹24,999\`) showing customer savings.
* **Admin Impact:** Establishes commercial pricing ceiling.
* **Business Impact:** Promotes psychological discount incentives; displays "Save ₹X (Y%)" badges.

### 7. Retail Sale Price (INR)
* **Purpose:** Actual commercial price charged to retail end-consumers at checkout.
* **Input Type:** Numeric Input (Currency: ₹ INR).
* **Required:** **Yes.** Must be greater than 0.
* **Example:** \`19999\`
* **Validation:** Float/Integer > 0. Must be <= MRP Price.
* **Used By:** Product Detail Page, Cart Engine, Checkout Gateway, GST Invoicing, Base Price for Variants.
* **Customer Impact:** The actual price the customer pays per unit.
* **Admin Impact:** Governs revenue and gross margin calculations.
* **Business Impact:** Direct determinant of retail sales volume and profitability.

### 8. Authorized Dealer Price (INR)
* **Purpose:** Confidential wholesale rate offered to authenticated B2B dealers and institutional partners.
* **Input Type:** Numeric Input (Currency: ₹ INR).
* **Required:** Optional (Defaults to 0 or Retail Sale Price if omitted).
* **Example:** \`16500\`
* **Validation:** Numeric value; typically lower than Retail Sale Price.
* **Used By:** B2B Wholesale Portal, Dealer Order Processing, Offline Sales Invoicing.
* **Customer Impact:** Completely invisible to retail public; visible only to verified B2B accounts.
* **Admin Impact:** Protects wholesale margins while maintaining dual-track retail/B2B pricing.
* **Business Impact:** Automates dealer quoting without requiring separate catalog records.

### 9. Physical Stock Inventory
* **Purpose:** Quantity of ready-to-dispatch physical units available in the central warehouse.
* **Input Type:** Integer Input.
* **Required:** **Yes.**
* **Example:** \`45\`
* **Validation:** Integer >= 0. When set to 0, system marks product as "Out of Stock".
* **Used By:** Cart Stock Gating, Checkout Inventory Validation, "Only X Left" badges, Low Stock Alerts.
* **Customer Impact:** Disables checkout when stock reaches 0; displays urgency badges when stock < 5.
* **Admin Impact:** Central stock counter deducted automatically upon order authorization.
* **Business Impact:** Prevents over-selling and unfulfillable backorders.

### 10. Status Policy
* **Purpose:** Master visibility switch for the product across the entire storefront and API.
* **Input Type:** Dropdown Selection (\`active\` / \`inactive\`).
* **Required:** **Yes.**
* **Example:** \`active\`
* **Validation:** Strictly enum: \`active\` or \`inactive\`.
* **Used By:** Storefront Search Indexer, Category Listing Queries, Direct URL Access Resolver.
* **Customer Impact:** If \`inactive\`, product is hidden from search and returns 404 / "Currently Unavailable".
* **Admin Impact:** Allows drafting and staging new products prior to commercial release.
* **Business Impact:** Facilitates planned product launches without publishing incomplete listings.

### 11. Short Description
* **Purpose:** Concise 1-2 sentence marketing summary displayed beside the image gallery above the fold.
* **Input Type:** Multi-line Plain Text Area (2-3 lines).
* **Required:** Optional but highly recommended.
* **Example:** \`Compact high-precision 4K monochrome resin 3D printer featuring an upgraded LighTurbo matrix light source and 2.8-inch color touchscreen.\`
* **Validation:** Plain text; recommended length 80–200 characters.
* **Used By:** Product Detail Hero Section, Social Media Share Cards, Search Result Snippets.
* **Customer Impact:** Provides immediate elevator pitch without requiring the customer to scroll.
* **Admin Impact:** Key marketing summary used in mobile quick-views.
* **Business Impact:** Crucial for rapid buyer comprehension on mobile devices.

### 12. Comprehensive Overview (Long Description)
* **Purpose:** Exhaustive product narrative, unboxing instructions, technical highlights, and usage notes.
* **Input Type:** Multi-line Rich Text / HTML / Markdown Area.
* **Required:** Optional.
* **Example:** Comprehensive breakdown of machine frame, optical specifications, slicing software compatibility, and resin curing parameters.
* **Validation:** Sanitized HTML / formatted text; supports lists, paragraphs, and headings.
* **Used By:** Product Detail Page "Overview" tab.
* **Customer Impact:** Answers deep technical and functional questions before purchasing.
* **Admin Impact:** Central repository of full product documentation.
* **Business Impact:** Drastically reduces pre-sales customer support tickets and returns.

### 13. Featured Product Flag
* **Purpose:** Designates the product for priority placement in homepage carousels and curated banners.
* **Input Type:** Checkbox Toggle (\`true\` / \`false\`).
* **Required:** Optional (Defaults to \`false\`).
* **Example:** \`true\`
* **Validation:** Boolean.
* **Used By:** Homepage "Featured Products" Grid, Promotional Hero Sliders, Recommendation Engine.
* **Customer Impact:** Showcases high-priority products prominently to incoming store visitors.
* **Admin Impact:** Rapid merchandising control without modifying homepage code.
* **Business Impact:** Drives traffic to high-margin or promotional flagship SKUs.

### 14. Complementary Consumables (Recommended Filaments / Resins)
* **Purpose:** Associates consumable materials (filaments, resins, nozzles) that work with this machine.
* **Input Type:** Multi-Select Dropdown from active catalog SKUs.
* **Required:** Optional.
* **Example:** \`Anycubic Standard UV Resin (Grey)\`, \`Anycubic FEP Film Replacement\`.
* **Validation:** Stored as an array of product IDs (\`recommendedFilaments: string[]\`).
* **Used By:** Storefront "Frequently Bought Together" & "Recommended Consumables" widgets.
* **Customer Impact:** Enables 1-click cart addition of compatible resins or filaments with a printer.
* **Admin Impact:** Merchandising engine linking hardware to ongoing recurring consumable sales.
* **Business Impact:** Increases Average Order Value (AOV) by 18–32% at checkout.

### 15. Bundle Package Inclusions (Bundled Products)
* **Purpose:** Explicitly lists existing catalog SKUs included inside this kit or bundle box.
* **Input Type:** Multi-Select Dropdown from active catalog SKUs.
* **Required:** Optional.
* **Example:** \`Wash & Cure Machine Plus\`, \`Basic Tool Set\`.
* **Validation:** Stored as an array of product IDs (\`bundleProducts: string[]\`).
* **Used By:** Bundle Breakdown UI, Order Packing Slips, Warehouse Inventory Kit Pickers.
* **Customer Impact:** Informs customer exactly what physical items are included in the package.
* **Admin Impact:** Alerts fulfillment teams to pick multiple distinct SKUs for a single bundle order.
* **Business Impact:** Enables high-value starter combo packs without separate manufacturing SKUs.

---

## 5. PRODUCT IDENTITY & IDENTIFIERS

Product identity in 3D Galaxy relies on a three-tier identification model:

\`\`\`
+---------------------------------------------------------------------------------------+
| PRODUCT TITLE: "Creality K1 High-Speed 3D Printer"                                   |
| (Human-readable commercial title for storefront, search, and marketing)              |
+-------------------------------------------+-------------------------------------------+
                                            |
                    +-----------------------+-----------------------+
                    v                                               v
+---------------------------------------+   +---------------------------------------+
| URL SLUG: "creality-k1-high-speed"    |   | BASE SKU: "3DG-PRN-CR-K1"             |
| (SEO route for Angular browser URL)   |   | (Unique inventory root identifier)    |
+---------------------------------------+   +-------------------+-------------------+
                                                                |
                                                                v
                                            +---------------------------------------+
                                            | VARIANT SKU: "3DG-PRN-CR-K1-COMBO-AMS"|
                                            | (Sellable permutation picking SKU)    |
                                            +---------------------------------------+
\`\`\`

### Uniqueness Governance Rules
1. **Base SKU Uniqueness:** Base SKU must be unique across all active and archived catalog products.
2. **Slug Collision Prevention:** If an admin manually enters a slug that already exists, the router disambiguates by appending a numeric counter (e.g. \`creality-k1-1\`).
3. **Barcode Alignment:** The barcode field supports standard EAN-13, UPC-A, or internal Code-128 strings. If omitted, the system generates an internal timestamp-based numeric identifier for thermal barcode label printing.

---

## 6. CATEGORY ARCHITECTURE & SELECTION ENGINE

The 3D Galaxy platform utilizes a multi-category architecture that decouples catalog taxonomy from rigid database hierarchies. A product can reside in multiple categories simultaneously while maintaining a single **Primary Category** for canonical breadcrumb navigation:

\`\`\`
STOREFRONT BREADCRUMB: Home > 3D Printers > FDM Printers > Creality K1
                              [PRIMARY CATEGORY]

COLLECTION TAGS: [FDM Printers] [High-Speed Printers] [Enclosed Printers] [Featured]
                 (Product appears in all 4 collection grids and filter sets)
\`\`\`

### Category Synchronization Workflow (\`category-multi-select.component.ts\`)
When an existing product is loaded into the editor, the category component executes a race-condition safe synchronization:

\`\`\`
1. API Category Response (Asynchronous load from backend datastore)
   ↓
2. Raw Incoming Category IDs ([cId1, cId2, cId3])
   ↓
3. extractNormalizedCategoryIds()
   • Reconciles raw string IDs and object IDs ({ id: 'c1', isPrimary: true })
   • Filters out deleted or deprecated categories
   • Validates primary category designation
   ↓
4. Reactive Signals Update
   • selectedIds.set(new Set(normalizedCategoryIds))
   • primaryId.set(normalizedPrimaryId || firstSelectedId)
   ↓
5. Admin UI Checkbox & Radio States Render
   ↓
6. Save Product Trigger
   • Constructs array: categories = [{ id, isPrimary }]
   • category_id = primaryId
   • categoryIds = [id1, id2, id3]
\`\`\`

### Category Management Controls
* **Search Filter:** Type any string to instantly filter category nodes by name or slug.
* **Select All:** One-click assignment of all categories matching current search filter.
* **Clear All:** Clears all category associations with safety confirmation.
* **Primary Radio Selector:** Clicking the star/radio icon next to any selected category designates it as the canonical breadcrumb parent.

---

## 7. BRAND & MANUFACTURER ALLIANCE

The Brand selection associates hardware and materials with official global manufacturers:
* **Filtering & Facets:** Brand pages (\`/brand/creality\`, \`/brand/bambu-lab\`) automatically aggregate all products with matching \`brandId\`.
* **Trust Badges:** Official authorized dealer badges render automatically beside the product title when an approved alliance brand is selected.
* **Cross-Selling:** Storefront algorithms prioritize accessories from the identical brand alliance (e.g. Creality nozzles on Creality printer PDPs).

---

## 8. PRODUCT PRICING ENGINE

Pricing in 3D Galaxy operates on a three-tier pricing model:

| Price Field | Field Name | Target Customer | Visibility | Calculation Rule |
| :--- | :--- | :--- | :--- | :--- |
| **MRP** | \`pMrp\` | All Shoppers | Public Strike-Through | Anchor reference price. |
| **Retail Sale Price** | \`pSale\` | Retail Consumers | Public Highlighted | Active price paid at cart checkout. |
| **Authorized Dealer** | \`pDealer\` | Verified B2B Accounts | Private (B2B Portal Only) | Wholesale rate for bulk orders. |

### Pricing Pipeline & Discount Formula
\`\`\`
Discount Percentage = Math.round(((MRP - SalePrice) / MRP) * 100)
Savings Amount (₹)   = MRP - SalePrice
\`\`\`
* If \`MRP = 24999\` and \`SalePrice = 19999\`, the storefront displays:
  **₹19,999** ~₹24,999~ <span style="color:#16a34a; font-weight:bold;">Save ₹5,000 (20% OFF)</span>
* **Variant Price Override:** When variant combinations exist, the variant's individual \`salePrice\` overrides the product base price. If a variant's price is set to \`0\`, the system falls back gracefully to the product base sale price.

---

## 9. PRODUCT INVENTORY POLICIES

Inventory is tracked at two distinct levels depending on product configuration:

\`\`\`
+---------------------------------------------------------------------------------------+
| PRODUCT-LEVEL STOCK (Products WITHOUT active variants)                                |
| • Governed by 'Physical Stock Inventory' field on General Tab.                        |
| • Stock counter directly controls Add-to-Cart button availability.                    |
+---------------------------------------------------------------------------------------+
                                           OR
+---------------------------------------------------------------------------------------+
| VARIANT-LEVEL STOCK (Products WITH active variants)                                   |
| • Governed by individual 'Stock' column in the Combination Matrix.                   |
| • Master product stock automatically displays SUM(Variant Stocks).                    |
| • Out-of-stock variants are disabled individually; other variants remain sellable.   |
+---------------------------------------------------------------------------------------+
\`\`\`

### Inventory State Machine
* **Stock > 5:** Displayed as "In Stock" with green badge.
* **1 <= Stock <= 5:** Displayed as "Hurry, Only X Left in Stock!" in orange urgency pill.
* **Stock = 0:** Add-to-cart button disabled; swatch pill displays strikethrough and "Out of Stock" badge; customer prompt displays "Notify When Available".

---

## 10. PRODUCT WEIGHT & FREIGHT RECOVERY

Accurate weight configuration is mandatory for Courier API integrations (Shiprocket, Delhivery, Bluedart):

* **Internal Standard Unit:** All product weights are stored internally in **Grams (g)** as integers (\`weightInGrams\`).
* **Storefront & Admin Display:** Weights >= 1000g automatically format as Kilograms (\`1000g -> 1.00 kg\`).
* **Multiple Quantity Calculation:**
  \`\`\`
  Total Shipment Weight (g) = (Product Unit Weight × Item Quantity) + Packaging Tare Weight
  \`\`\`
* **Freight Recovery Example:**
  - 1 Spool of PLA Filament: Unit Weight = \`1250 g\` (1000g net filament + 250g plastic spool).
  - Customer purchases 4 spools: \`1250 g × 4 = 5000 g (5.0 kg)\`.
  - Courier tariff bracket triggers the 5 kg freight rate (\`₹350\`) instead of the base 1 kg rate (\`₹90\`), eliminating shipping margin loss.

---

## 11. PRODUCT VARIANT CONFIGURATION MASTER GUIDE

The Variant Engine is 3D Galaxy's most powerful catalog feature. It supports multi-group variant architectures, Cartesian permutation generation, slot-based bundles, and dynamic swatch mapping.

### Core Terminology
* **Variant Group:** A dimension of choice (e.g. \`Color\`, \`Spool Weight\`, \`Material\`, \`Nozzle Size\`).
* **Variant Value:** Specific options within a group (e.g. \`Red\`, \`Blue\`, \`1kg\`, \`0.4mm\`).
* **Combination Permutation:** A unique combination of values across all active groups (e.g. \`PLA × 1kg × Red\`).
* **Combination Matrix:** The table storing SKU, price, stock, weight, and status for each permutation.
* **Default Variant:** The specific permutation selected by default when a customer lands on the PDP.

\`\`\`
                                      PRODUCT: PLA Filament
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
       Variant Group: MATERIAL                                       Variant Group: COLOR
       Display: Chip Selector                                        Display: Color Chips
       Values: [PLA, PLA+, PETG]                                     Values: [Red, Blue, Black]
                 │                                                             │
                 └──────────────────────────────┬──────────────────────────────┘
                                                ▼
                                   CARTESIAN COMBINATION MATRIX
                 1. PLA  × 1kg × Red    -> SKU: 3DG-FIL-PLA-RED    -> ₹899 -> Stock: 25
                 2. PLA  × 1kg × Blue   -> SKU: 3DG-FIL-PLA-BLU    -> ₹899 -> Stock: 18
                 3. PLA+ × 1kg × Black  -> SKU: 3DG-FIL-PLAP-BLK   -> ₹999 -> Stock: 12
\`\`\`

---

## 12. VARIANT GROUP CONFIGURATION

Each Variant Group configured in \`admin-variant-group-config.component.ts\` contains the following parameters:

| Field Name | Parameter | Description | Operational Purpose |
| :--- | :--- | :--- | :--- |
| **Variant Name** | \`variantName\` | Internal system key (lower_snake_case). | Used in database option hashing and SKU generation (e.g. \`filament_color\`). |
| **Display Name** | \`displayName\` | Frontend label displayed to customers. | The title shown above swatches on the PDP (e.g. \`Select Spool Color\`). |
| **Display Type** | \`displayType\` | Visual UI component on storefront. | Controls how options render (chips, color pills, dropdown, cards, etc.). |
| **Selection Mode** | \`selectionMode\` | Mathematical selection constraint. | Governs whether customer chooses 1, multiple, bundle slots, or custom weight. |
| **Required** | \`required\` | Mandatory selection flag. | When true, customer cannot add to cart without selecting an option. |
| **Active** | \`active\` | Group activation toggle. | Enables disabling an entire group temporarily without deleting values. |
| **Allow Duplicates** | \`allowDuplicates\` | Slot duplicate permission. | When configuring bundle packs, allows choosing the same color in multiple slots. |

---

## 13. ALL 11 VARIANT DISPLAY TYPES

The system implements **11 specialized storefront display components** (\`VariantDisplayType\`):

### 1. Chip Selector (\`chip\`)
* **Purpose:** Standard rounded pill buttons with text labels.
* **Recommended For:** Sizes (S, M, L, XL), Nozzle Diameters (0.2mm, 0.4mm, 0.6mm), Material Types (PLA, ABS, PETG).
* **Customer UI:** Compact horizontal chips; active chip displays blue fill with white text.
* **Pricing & Stock:** Displays out-of-stock items with diagonal strike-through and reduced opacity.

### 2. Dropdown Menu (\`dropdown\`)
* **Purpose:** Standard HTML \`<select>\` dropdown for long lists (> 10 items).
* **Recommended For:** Spare parts catalogs, replacement screws, printer hardware model compatibility lists.
* **Customer UI:** Native dropdown preserving screen real estate on mobile devices.
* **Pricing & Stock:** Each option label displays inline price offset (e.g. \`+ ₹250\`) and stock status.

### 3. Image Selector (\`image\`)
* **Purpose:** Square thumbnail chips displaying uploaded photography.
* **Recommended For:** Multi-color printed model variants, texture options, finish coatings.
* **Customer UI:** 64x64px photo boxes; active item displays blue outline and checkmark badge.
* **Pricing & Stock:** Clicking image swatch immediately switches primary product gallery hero photo.

### 4. Card Selector (\`card\`)
* **Purpose:** Rich rectangular cards featuring title, subtitle, price tag, and feature bullet.
* **Recommended For:** Printer packages (\`Printer Only\`, \`Combo with AMS\`, \`Enterprise Bundle\`).
* **Customer UI:** Multi-column responsive cards highlighting key package inclusions.
* **Pricing & Stock:** Displays full package pricing and warranty badge.

### 5. Radio Chips (\`radio-chips\`)
* **Purpose:** Pill buttons with embedded circular radio buttons.
* **Recommended For:** Voltage selections (110V vs 220V), warranty extension plans.
* **Customer UI:** High-contrast radio button clearly signifying mutually exclusive choices.

### 6. Color Chips (\`color-chips\`)
* **Purpose:** Authentic circular color swatches with exact hexadecimal color codes and active borders.
* **Recommended For:** 3D printing filaments, resin dyes, colored replacement housings.
* **Customer UI:** Circular 32px color dots (e.g. \`#FF2200\` for Red). Hovering displays tooltip name. Active swatch displays double ring.
* **Pricing & Stock:** Strikethrough line across color chip if stock = 0.

### 7. Button Group (\`button-group\`)
* **Purpose:** Segmented horizontal tab button bar with smooth sliding active background.
* **Recommended For:** Slicing infill presets (20%, 50%, 100%), print quality modes (Draft, Standard, Ultra).
* **Customer UI:** Segmented control ensuring compact single-line footprint.

### 8. Bundle Builder (\`bundle-builder\`)
* **Purpose:** Interactive radio cards for package tiers with modular selection slots below.
* **Recommended For:** "Buy 1, Buy 3, Buy 5" spool bundles where customer picks custom colors per slot.
* **Customer UI:** Top tier selector card + dynamic slot dropdowns/chips for Slot 1, Slot 2, Slot 3.
* **Pricing & Stock:** Automatically applies tier discount formula; validates inventory across all chosen slots.

### 9. Quantity Selector (\`quantity-selector\`)
* **Purpose:** Inline incremental stepper (+ / -) for hardware packages.
* **Recommended For:** Extruder nozzles, pneumatic connectors, stepper motor dampeners.
* **Customer UI:** Numeric stepper with tier volume discount tooltips ("Buy 10+ for 15% off").

### 10. Weight Selector (\`weight-selector\`)
* **Purpose:** Weight pill buttons integrated directly with courier shipping calculations.
* **Recommended For:** Consumable spools (250g sample, 500g, 1kg standard, 2kg, 5kg bulk).
* **Customer UI:** Clean pill chips with badge tags ("Most Popular", "Save 11%").
* **Pricing & Stock:** Updates product weight in real-time, recalculating shipping charges before checkout.

### 11. Grid Cards (\`grid-cards\`)
* **Purpose:** High-impact multi-column card grid with specifications preview.
* **Recommended For:** Major machine variations (Build Volume 220x220 vs 300x300 vs 400x400).
* **Customer UI:** 2-column or 3-column card grid displaying technical comparison matrix.

---

## 14. ALL 6 VARIANT SELECTION MODES

Selection Modes (\`VariantSelectionMode\`) define mathematical and UX constraints:

| Selection Mode | Technical Mode | Operational Constraint | Customer Storefront Behavior | Cart & Pricing Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Single Selection** | \`single\` | Exactly 1 option must be chosen. | Customer clicks 1 pill; previous selection is deselected. | Base price replaced by selected variant price. |
| **Multiple Selection** | \`multiple\` | Customer may choose up to N options. | Checkboxes / multi-select pills for add-ons and accessories. | Cumulatively sums all selected add-on prices. |
| **Bundle Selection** | \`bundle\` | Tier selection unlocks N customizable slots. | Customer picks tier (e.g. Buy 3), then customizes 3 distinct slots. | Fixed bundle rate or per-item discounted rate. |
| **Quantity Based** | \`quantity\` | Pack quantities with tiered pricing. | Stepper controls bulk purchase volume. | Decrements total pack count from central inventory. |
| **Weight Based** | \`weight\` | Spool weight variants (g / kg). | Customer picks weight; shipping engine updates in background. | Directly drives courier shipping bracket calculations. |
| **Pack Builder** | \`pack\` | Multi-step starter kit customizer. | Step 1: Pick Printer -> Step 2: Pick Resin -> Step 3: Pick Wash Station. | Decrements multiple distinct warehouse SKUs on single checkout. |

---

## 15. VARIANT VALUES & COLOR SWATCHES

Variant values are defined per group in the admin editor:
* **Text Values:** Enter comma-separated strings (e.g. \`PLA, PETG, ABS, TPU\`).
* **Hex Color Swatches:** For \`color-chips\`, values support hex codes or standard color names:
  - \`Red (#EF4444)\`, \`Blue (#3B82F6)\`, \`Jet Black (#090D16)\`, \`Galaxy Purple (#7C3AED)\`.
* **Reordering & Deletion:** Values can be dragged or re-ordered; removing a value flags combinations in the matrix for cleanup.
* **Duplicate Protection:** The system prevents adding duplicate values within the same group.

---

## 16. CARTESIAN COMBINATION MATRIX

When multiple variant groups exist, clicking **Generate Combination Matrix** (\`admin.generateVariants()\`) executes an automated Cartesian permutation algorithm:

\`\`\`
Groups:
• Material: [PLA, PETG]
• Spool Weight: [1kg]
• Color: [Red, Blue, Black]

Resulting Cartesian Permutations (2 × 1 × 3 = 6 Combinations):
1. PLA - 1kg - Red    -> SKU: 3DG-FIL-PLA-1KG-RED    -> Sale: ₹899 -> Stock: 20 -> Wt: 1250g
2. PLA - 1kg - Blue   -> SKU: 3DG-FIL-PLA-1KG-BLU    -> Sale: ₹899 -> Stock: 15 -> Wt: 1250g
3. PLA - 1kg - Black  -> SKU: 3DG-FIL-PLA-1KG-BLK    -> Sale: ₹899 -> Stock: 30 -> Wt: 1250g
4. PETG - 1kg - Red   -> SKU: 3DG-FIL-PETG-1KG-RED   -> Sale: ₹999 -> Stock: 10 -> Wt: 1250g
5. PETG - 1kg - Blue  -> SKU: 3DG-FIL-PETG-1KG-BLU   -> Sale: ₹999 -> Stock: 12 -> Wt: 1250g
6. PETG - 1kg - Black -> SKU: 3DG-FIL-PETG-1KG-BLK   -> Sale: ₹999 -> Stock: 25 -> Wt: 1250g
\`\`\`

### Combination Matrix Table Columns
1. **Status (Active Toggle):** Temporarily disable a specific permutation without deleting it.
2. **Default (Radio Selector):** Sets the active permutation loaded on storefront entry.
3. **Variant Name:** The concatenated combination label.
4. **SKU:** Individual inventory picking code (Auto-generated; editable).
5. **Barcode:** Individual barcode for scanning.
6. **MRP (₹):** Permutation reference price.
7. **Sale Price (₹):** Permutation commercial selling price.
8. **Stock:** Individual permutation physical inventory.
9. **Weight (g):** Permutation shipping weight in grams.
10. **Variant Images:** Linked gallery thumbnails.
11. **Action (Delete):** Permanently remove obsolete combination.

---

## 17. DEFAULT VARIANT POLICY

The Default Variant governs the initial customer experience:
* **The Single-Default Rule:** Exactly **one** variant must be flagged as default (\`isDefault: true\`).
* **Auto-Assignment:** When combinations are first generated, the system automatically marks Permutation #1 as default.
* **Storefront Impact:**
  - The Default Variant's price is displayed in category listing cards.
  - When a customer clicks into the PDP, swatches matching the default variant are pre-selected.
  - The primary gallery photo automatically shows the default variant's linked image.

---

## 18. VARIANT SKU ARCHITECTURE

To maintain traceability across ERP, billing, and warehouse operations:
* **Standard Syntax:** \`{BASE_SKU}-{GROUP1_VAL}-{GROUP2_VAL}\`
* **Sanitization:** Special characters removed; spaces converted to hyphens; uppercase forced.
* **Fulfillment Scanning:** During packing, warehouse officers scan the variant barcode on the physical item. The scanner validates the barcode against the order item's variant SKU, guaranteeing 100% packing accuracy.

---

## 19. VARIANT PRICING MODELS

3D Galaxy supports two distinct pricing paradigms:
1. **Per-Variant Matrix Pricing:** Each permutation has independent MRP, Sale, and Dealer rates. Ideal for materials where pigments or manufacturing costs vary (e.g. Standard PLA ₹899 vs Carbon Fiber PETG ₹1,699).
2. **Fixed Tier Bundle Pricing:** A fixed package rate applied regardless of chosen slot values.
   - Example: 3-Spool Bundle for a flat **₹2,299**, allowing the customer to choose any 3 colors freely.

---

## 20. VARIANT INVENTORY & STOCKOUTS

Variant stock counters operate independently:
* If \`Red\` has stock = 10 and \`Blue\` has stock = 0:
  - Customer can select and purchase \`Red\`.
  - Selecting \`Blue\` disables the Add-to-Cart button, changes the button label to "Out of Stock", and displays an estimated restock notification.
* Cart validation prevents adding more units than currently recorded in the permutation's stock counter.

---

## 21. VARIANT WEIGHT CALIBRATION

Weight can vary significantly between variants:
* **Sample Packs:** 250g spool = 350g gross weight.
* **Standard Spools:** 1000g spool = 1250g gross weight.
* **Bulk Master Spools:** 5000g spool = 5800g gross weight.
When a customer selects a variant, the variant's calibrated weight dynamically overrides the base product weight in the live shipping engine.

---

## 22. VARIANT IMAGE LINKING & GALLERY BINDING

Every product image uploaded in the **Images Tab** can be associated with one or more variant combinations:

\`\`\`
1. Upload Images: [Red_Spool.jpg] [Blue_Spool.jpg] [Black_Spool.jpg]
2. In Combination Matrix:
   • Map [Red_Spool.jpg]   -> To variant "PLA - 1kg - Red"
   • Map [Blue_Spool.jpg]  -> To variant "PLA - 1kg - Blue"
   • Map [Black_Spool.jpg] -> To variant "PLA - 1kg - Black"
3. Storefront Result:
   • Customer clicks "Blue" color swatch -> Gallery instantly slides to [Blue_Spool.jpg].
   • Customer clicks [Red_Spool.jpg] thumbnail -> Color swatch automatically switches to "Red".
\`\`\`

---

## 23. BUNDLE BUILDER & TIER ARCHITECTURE

The Bundle Builder (\`displayType: 'bundle-builder'\`) enables high-velocity tiered volume promotions:

| Tier ID | Tier Name | Quantity (Slots) | Pricing Type | Price Value | Savings Text | Badge Text |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| \`tier-1\` | Buy 1 (Standard) | 1 | \`fixed\` | ₹756 | — | — |
| \`tier-3\` | Buy 3 (Save 15%) | 3 | \`per_variant\` | ₹642 / item | Save 15% | **Most Popular** |
| \`tier-5\` | Buy 5 (Mega Pack) | 5 | \`fixed\` | ₹3,024 (Flat) | Save 20% | **Best Value** |

* **Interactive Slot Customization:** Selecting "Buy 3" opens 3 interactive dropdown slots below. The customer picks specific items (e.g. Slot 1: Red, Slot 2: Black, Slot 3: White).
* **Duplicate Allowance:** If \`allowDuplicates: true\`, the customer can select "Black" for all 3 slots.

---

## 24. ALL 10 PRE-ENGINEERED VARIANT TEMPLATES

The system provides **10 one-click pre-engineered templates** (\`variant-template.service.ts\`):

### 1. Filament Color (\`filament-color\`)
* **Category:** FILAMENT
* **Groups:** 1 Group (\`color\`).
* **Display Type:** \`chip\`
* **Values:** \`['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Black', 'White', 'Grey']\`
* **Selection Mode:** \`single\`

### 2. Filament Weight (\`filament-weight\`)
* **Category:** FILAMENT
* **Groups:** 1 Group (\`weight\`).
* **Display Type:** \`weight-selector\`
* **Values:** \`['250g', '500g', '1kg', '2kg', '5kg']\`
* **Predefined Tiers:** 250g Sample (₹350), 500g (₹550), 1kg Standard (₹899), 2kg (₹1699), 5kg Bulk (₹3999).

### 3. Material + Color (\`material-color\`)
* **Category:** FILAMENT
* **Groups:** 2 Groups: \`material\` (Chip Selector) × \`color\` (Color Chips).
* **Values:** Material: \`['PLA', 'PETG', 'ABS', 'TPU', 'Resin']\` • Color: 6 colors.
* **Combinations:** Generates 30 permutations automatically.

### 4. Material + Weight + Color (\`material-weight-color\`)
* **Category:** FILAMENT
* **Groups:** 3 Groups: \`material\` × \`weight\` × \`color\`.
* **Combinations:** Generates full 3-dimensional Cartesian matrix for catalog power-users.

### 5. Product Size (\`product-size\`)
* **Category:** GENERAL
* **Groups:** 1 Group (\`size\`).
* **Display Type:** \`chip\`
* **Values:** \`['XS', 'S', 'M', 'L', 'XL', 'XXL']\`

### 6. Storage / Capacity (\`storage-capacity\`)
* **Category:** ACCESSORIES
* **Groups:** 1 Group (\`capacity\`).
* **Display Type:** \`chip\`
* **Values:** \`['32GB', '64GB', '128GB', '256GB', '512GB', '1TB']\`

### 7. Size + Color (\`size-color\`)
* **Category:** ACCESSORIES
* **Groups:** 2 Groups: \`size\` (Chip) × \`color\` (Color Chips).
* **Combinations:** Wearables, branded apparel, protective printer enclosures.

### 8. Bundle Pack (\`bundle-pack\`)
* **Category:** BUNDLES
* **Groups:** 1 Group (\`bundle_pack\`).
* **Display Type:** \`bundle-builder\`
* **Values:** \`['Single Pack', '3-Pack Bundle', '5-Pack Mega Bundle']\`
* **Predefined Tiers:** Buy 1, Buy 3 (Save 15%), Buy 5 (Save 20%).

### 9. 3D Printer Configuration (\`printer-configuration\`)
* **Category:** 3D_PRINTER
* **Groups:** 2 Groups: \`printer_model\` (Card Selector) × \`package_configuration\` (Chip Selector).
* **Values:** Models: \`['Bambu Lab A1', 'Bambu Lab P1S', 'Creality K1']\` • Packages: \`['Printer Only', 'Combo with AMS', 'With Accessories Kit']\`.

### 10. Custom Variant (\`custom-variant\`)
* **Category:** GENERAL
* **Groups:** 1 Blank template ready for manual parameter input.

---

## 25. TEMPLATE SAFETY & COLLISION GOVERNANCE

Applying a template triggers strict collision and overwrite protections (\`admin-variant-templates.component.ts\`):
1. **Append Mode (Default):** Preserves existing variant groups and appends the template's groups to the end of the option list.
2. **Replace Mode:** Completely replaces existing groups with the template. Requires explicit modal confirmation ("Warning: This will overwrite existing variant groups!").
3. **Collision Detection:** If the incoming template contains a group name that already exists (e.g. \`color\`), the system alerts the admin with an orange warning indicator.
4. **Manual Stock Required:** Applying a template does not guess physical stock; inventory counters default to safe baseline values (10) requiring manual admin confirmation.

---

## 26. LIVE STOREFRONT PREVIEW SIMULATOR

The Live Preview Simulator in the Admin Portal gives administrators a 100% faithful replica of the customer storefront before saving changes:
* **Interactive Swatches:** Click any variant swatch or bundle card in the simulator to test responsiveness.
* **Dynamic Price Update:** Verifies that selecting premium materials (e.g. PETG) accurately updates the displayed price.
* **Stock Badge Validation:** Verifies that setting stock to 0 shows the "Out of Stock" badge in real-time.
* **COD Eligibility Check:** Verifies that Cash on Delivery eligibility toggles appropriately based on price and weight.

---

## 27. IMAGES TAB — GALLERY & ASSET MANAGEMENT

The Images tab manages high-resolution photography and visual assets:
* **Primary Image (Hero):** The first image (marked with a gold star badge) serves as the primary catalog thumbnail across category listings, search cards, and social media links.
* **Image Ordering:** Use the **Move Up** and **Move Down** arrows to arrange the gallery sequence.
* **Direct File Upload & URL Support:** Supports direct image uploads via Firebase Storage as well as external CDN image URLs.
* **Recommended Specs:** 1:1 Square aspect ratio (1200 × 1200px or 800 × 800px), WebP or compressed JPG (< 300 KB).

---

## 28. SPECIFICATIONS TAB — TECHNICAL ATTRIBUTES

Technical specifications render as a structured table on the storefront PDP:
* **Key-Value Data:** Enter specification name (e.g. \`Build Volume\`, \`Max Nozzle Temperature\`, \`Print Speed\`) and technical value (e.g. \`256 × 256 × 256 mm\`, \`300 °C\`, \`500 mm/s\`).
* **Engineering Credibility:** Essential for 3D printing enthusiasts and commercial buyers who evaluate hardware strictly on technical tolerances.

---

## 29. DOWNLOADS TAB — TECHNICAL DATASHEETS & STL PROFILES

The Downloads tab provides self-service technical documentation:
* **Supported Categories:** \`Datasheet\`, \`User Manual\`, \`Slicing Profile (Orca/Cura)\`, \`Test STL File\`, \`Firmware Update\`.
* **Fields:** Document Title, File Download URL, File Size (MB), File Format Badge.
* **Customer Self-Service:** Renders as a dedicated "Downloads" tab on the PDP, reducing support requests for user manuals and printer slicing profiles.

---

## 30. FEATURES TAB — VISUAL PRODUCT HIGHLIGHTS

Features render as marketing highlight cards with icons:
* **Feature Title:** Concise headline (e.g. \`CoreXY 600mm/s High Speed\`).
* **Feature Description:** 1-2 sentence explanation of the technical advantage.
* **Material Icon:** Select from Google Material Icons (e.g. \`speed\`, \`precision_manufacturing\`, \`layers\`, \`security\`).

---

## 31. FAQS TAB — FREQUENTLY ASKED QUESTIONS

Product-specific FAQs appear in an interactive accordion below the specifications:
* **Question:** The specific customer query (e.g. \`Is this printer compatible with ABS and Nylon?\`).
* **Answer:** Markdown-supported answer detailing enclosure requirements, bed temperatures, and ventilation.
* **SEO Benefit:** Renders structured FAQ schema into Google Search results, increasing search result snippet height.

---

## 32. WARRANTY & SUPPORT TAB

Establishes commercial warranty terms and client support pathways:
* **Warranty Period:** Number of months or years (e.g. \`1 Year Manufacturer Warranty\`).
* **Warranty Terms & Conditions:** Specific coverage details (e.g. covers stepper motors and motherboard; excludes consumable brass nozzles and PEI build plates).
* **Support Channel:** Support email (\`support@3dgalaxy.com\`) and dedicated customer service phone number.

---

## 33. SHIPPING & DELIVERY TAB — ADVANCED LOGISTICS

Logistics configuration governs shipping charges, courier assignment, and delivery dates:

### Shipping Configuration Modes
1. **Priority 1: Product Specific (\`product_specific\`)**
   - Explicit shipping fee assigned directly to this item (e.g. ₹250 flat shipping for heavy 3D printers).
   - Can be marked as **Free Shipping Eligible** regardless of order cart value.
2. **Priority 2: Category Based (\`category_based\`)**
   - Inherits weight-bracket and flat shipping rules configured on the product's primary category.
3. **Priority 3: Default Shipping (\`default\`)**
   - Falls back to global platform shipping rules and order-level free shipping thresholds.

### Dynamic Delivery Date Engine (\`delivery-estimate.service.ts\`)
* **Input Format:** Accepts range strings such as \`"5-6"\`, \`"3-5"\`, or single digits \`"3"\`.
* **Encoding Formula:** \`parseEstimateDays("5-6")\` encodes to integer \`506\` (\`min * 100 + max\`).
* **Timezone Precision:** Calculated relative to current date adjusted to **Asia/Kolkata (IST, UTC+5:30)**.
* **Customer Display:**
  - Desktop: \`"10 Aug 2026 – 11 Aug 2026"\`
  - Mobile: \`"10–11 Aug"\`

---

## 34. RELATED PRODUCTS TAB — MERCHANDISING

Enables manual cross-selling on the PDP:
* Select up to 8 complementary products from the active catalog.
* Displayed below the product description under "You May Also Like".
* Increases multi-item basket conversion rates.

---

## 35. SEO TAB — SEARCH ENGINE OPTIMIZATION

Configures search indexation and social sharing cards:
* **Meta Title:** Max 60 characters; formatted as \`{Product Name} | 3D Galaxy India\`.
* **Meta Description:** Max 160 characters; includes primary keywords, features, and price hook.
* **Keywords:** Comma-separated search terms for internal search and crawler tags.
* **Social Preview:** Previews how the link will appear when shared on WhatsApp, LinkedIn, or Twitter.

---

## 36. COMPLETE PLATFORM DATA FLOW

\`\`\`
[1. ADMIN PORTAL EDITOR]
Admin configures fields across 11 tabs -> Clicks "Save Asset"
                     ↓
[2. FIRESTORE DATABASE]
Payload stored in 'products/{id}' collection with options, variants, shipping & SEO
                     ↓
[3. DATA STORE SERVICE (ds.ts)]
Reactive signals broadcast new/updated product to storefront subscribers
                     ↓
[4. STOREFRONT CATALOG & SEARCH]
Product listed in category grids, Omni-Search indexes title/SKU/tags
                     ↓
[5. PRODUCT DETAIL PAGE (PDP)]
Default variant selected; swatches, specs, downloads, gallery & delivery estimate render
                     ↓
[6. CART ENGINE]
Customer selects variant -> Cart stores variant SKU, price, weight & bundle slots
                     ↓
[7. CHECKOUT GATEWAY]
Shipping calculated via hierarchy mode; COD gated; GST computed; delivery date locked
                     ↓
[8. ORDERS & FULFILLMENT CONSOLE]
Order captured with frozen product snapshot; warehouse picks SKU and prints packing slip
\`\`\`

---

## 37. MASTER VALIDATION MATRIX

| Configuration Dimension | Admin Portal Validation | Storefront Validation | Checkout Validation | Order & Fulfillment Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Product Title** | Mandatory non-empty string. | Renders in page header & title tag. | Displayed on review step. | Printed on tax invoice & packing slip. |
| **Product SKU** | Formatted uppercase; unique. | Hidden from non-technical views. | Validated in line item data. | Warehouse picking barcode scanner verification. |
| **Categories** | At least 1 category selected. | Determines menu & filter listing. | Gated for category-level coupons. | Categorizes sales in financial reports. |
| **MRP & Sale Price** | Sale <= MRP; both > 0. | Shows strike-through & savings badge. | Locks unit price against manipulation. | Enforces revenue recognition & GST audit. |
| **Stock Counter** | Integer >= 0. | Disables Add-to-Cart when 0. | Prevents checkout if cart qty > stock. | Decrements warehouse inventory on payment. |
| **Variant Matrix** | Exactly 1 default variant. | Pre-selects default permutation. | Line item stores exact variant SKU. | Warehouse picks exact color/size permutation. |
| **Unit Weight** | Stored in grams (g). | Displays in kg if >= 1000g. | Sums total order freight weight. | Selects courier weight tariff bracket. |
| **Delivery Days** | Hyphenated range (\`5-6\`). | Computes IST calendar dates. | Displays promised delivery window. | Generates courier SLA tracking milestone. |

---

## 38. 32-POINT PRODUCTION CONFIGURATION CHECKLIST

Prior to publishing any product to live commercial status, administrators must complete this pre-flight verification:

### Product Identity & Commercials
- [ ] 1. Product Title is accurate, capitalized, and free of typos (25–80 chars).
- [ ] 2. URL Slug is clean, lower-case, and contains no special characters.
- [ ] 3. Base SKU conforms to internal naming standard (\`3DG-CAT-BRD-MODEL\`).
- [ ] 4. At least one Category is selected, and one Primary Category is designated.
- [ ] 5. Brand Manufacturer Alliance is correctly selected.
- [ ] 6. MRP is greater than or equal to Retail Sale Price.
- [ ] 7. Retail Sale Price is accurate and delivers the intended gross margin.
- [ ] 8. Authorized Dealer Price is populated for B2B wholesale access.
- [ ] 9. Physical Stock reflects verified warehouse shelf counts.
- [ ] 10. Status Policy is set to \`active\` (or \`inactive\` for staged drafts).

### Content & Visual Assets
- [ ] 11. Primary Image is designated (gold star) and has a clean white/dark background.
- [ ] 12. Gallery contains at least 3 high-resolution images (1:1 square aspect ratio).
- [ ] 13. Short Description provides a clear 2-sentence elevator summary.
- [ ] 14. Long Description contains complete feature overviews and technical details.
- [ ] 15. At least 4 technical specifications are configured in key-value format.
- [ ] 16. Technical datasheets or user manuals are attached in the Downloads tab.
- [ ] 17. At least 3 key feature highlight cards are configured with icons.
- [ ] 18. At least 2 product-specific FAQs are written.
- [ ] 19. Warranty Period and coverage terms are clearly defined.

### Variants & Matrix Architecture
- [ ] 20. Variant Group names and display names are cleanly formatted.
- [ ] 21. Appropriate Display Type is selected (Color Chips for colors, Weight Selector for spools).
- [ ] 22. Combination Matrix is generated with no missing combinations.
- [ ] 23. Every combination in the matrix has an individual, unique SKU.
- [ ] 24. Every combination has a verified sale price and physical stock count.
- [ ] 25. Exactly ONE combination is flagged as Default (\`isDefault: true\`).
- [ ] 26. Gallery images are mapped to their respective variant swatches.

### Logistics & Pre-Publish Simulation
- [ ] 27. Product Weight is calibrated accurately in grams (including packaging tare).
- [ ] 28. Shipping Mode is selected (Product Specific, Category Based, or Default).
- [ ] 29. Delivery Days format conforms strictly to hyphenated range (e.g. \`5-6\`).
- [ ] 30. Cash on Delivery (COD) availability checkbox is correctly toggled.
- [ ] 31. Live Storefront Simulator was tested: all swatches click and update price/stock.
- [ ] 32. SEO Meta Title and Meta Description are filled within character limits.

---

## 39. COMMON CONFIGURATION ERRORS & TROUBLESHOOTING

| Error Scenario | Root Cause | Immediate Diagnostic Step | Operational Resolution |
| :--- | :--- | :--- | :--- |
| **Product missing from category page.** | No primary category selected or category ID mismatch. | Inspect General Tab -> Categories section. | Select category; ensure primary radio button is active; save product. |
| **PDP shows blank price or "₹0".** | Matrix generated with 0 prices; no fallback. | Check Combination Matrix Sale Price column. | Populate sale price for all combinations or set base Retail Sale Price. |
| **Customer cannot select color swatch.** | Variant stock = 0 and backorders disabled. | Check Matrix Stock column for that variant. | Adjust stock counter to reflect actual physical warehouse inventory. |
| **Swatch click does not change photo.** | Image not mapped to variant combination. | Check Images column in Combination Matrix. | Click image link icon on permutation row; select matching gallery photo. |
| **Delivery date shows static fallback.** | Delivery days input contains invalid characters. | Check Shipping Tab -> Estimated Delivery Days. | Format strictly as single digit (\`3\`) or range (\`5-6\`); eliminate text. |
| **Courier charges customer zero freight.** | Product weight configured as 0g; mode is default. | Check Shipping Tab -> Product Weight (g). | Enter accurate weight in grams (e.g. \`1250\` for 1kg spool with packaging). |
| **Bundle slots show duplicate errors.** | \`allowDuplicates\` disabled on bundle group. | Inspect Variant Group settings in modal. | Check "Allow Duplicate Selection in Slots" toggle; re-save group. |

---

## 40. ADMIN OPERATIONAL BEST PRACTICES

1. **Never Publish Without SKU Verification:** Every sellable permutation must have a traceable SKU prior to setting status to \`active\`.
2. **Audit Weights with Real Spool Packaging:** Always include spool plastic tare weight (~250g) in filament weights to prevent undercharged courier freight.
3. **Lock Default Variants Intentionally:** Do not leave default selection to chance; ensure the flagship, high-stock variant is selected.
4. **Use Pre-Engineered Templates:** Utilize the 10 built-in templates to avoid repetitive manual configuration and syntax errors.
5. **Always Test the Live Simulator:** Click through swatches and verify pricing in the in-portal preview before committing changes to the live database.
6. **Maintain Multi-Category Breadcrumb Logic:** Ensure the primary category reflects the most specific logical parent (e.g. \`Resin 3D Printers\` rather than generic \`Products\`).

---

## 41. 12 END-TO-END OPERATIONAL TEST SCENARIOS

### Test Scenario 1: Standard Hardware SKU Without Variants
* **Setup:** Anycubic Wash & Cure Plus (No variants).
* **Action:** Enter Title, SKU (\`3DG-ACC-WCP\`), Category (\`Accessories\`), MRP (\`15999\`), Sale Price (\`12999\`), Stock (\`15\`), Weight (\`6500g\`). Save asset.
* **Expected Result:** Single product page with clear price, active Add-to-Cart button, and no variant swatch selector.
* **Customer Impact:** Instant 1-click purchase without variant choice friction.

### Test Scenario 2: Consumable with Weight Selector & Tiers
* **Setup:** PLA+ Engineering Filament Spool.
* **Action:** Apply "Filament Weight" template. Verify 250g, 500g, 1kg, 2kg, 5kg tiers. Set 1kg as default.
* **Expected Result:** PDP displays weight pills. Selecting 5kg shows ₹3,999 and updates shipping weight to 5800g.
* **Customer Impact:** Clear tier choices with automatic freight updates.

### Test Scenario 3: Two-Group Cartesian Consumable Matrix
* **Setup:** Premium PETG Filament (Material × Color).
* **Action:** Group 1: Material (PETG, PETG-CF). Group 2: Color (Black, White, Orange). Generate combinations (6 permutations).
* **Expected Result:** 6 distinct matrix rows with unique SKUs and individual stock counters.
* **Customer Impact:** Dynamic swatch switching with exact per-color stock indicators.

### Test Scenario 4: Out-of-Stock Permutation Gating
* **Setup:** Set stock of \`PETG - Orange\` to \`0\`.
* **Action:** Open storefront PDP; click "Orange" swatch.
* **Expected Result:** Orange swatch displays strikethrough; Add-to-Cart button changes to "Out of Stock" (disabled).
* **Customer Impact:** Prevents customer from paying for an unfulfillable item.

### Test Scenario 5: Dynamic Variant Image Switching
* **Setup:** Map \`red_spool.jpg\` to \`Red\` permutation.
* **Action:** Customer clicks "Red" color swatch on PDP.
* **Expected Result:** Main gallery hero photo immediately animates to \`red_spool.jpg\`.
* **Customer Impact:** Full visual confirmation of color choice prior to ordering.

### Test Scenario 6: Buy 3 Slot-Based Bundle Pack
* **Setup:** Configure Bundle Builder with "Buy 3 (Save 15%)".
* **Action:** Customer selects "Buy 3" tier, then selects Slot 1: Red, Slot 2: Black, Slot 3: Red.
* **Expected Result:** System accepts duplicate Red selection; calculates discounted rate (₹642 × 3 = ₹1,926).
* **Customer Impact:** Custom starter kit creation with clear bulk savings.

### Test Scenario 7: Product-Specific Shipping Override
* **Setup:** Large Format 3D Printer (Weight 25 kg).
* **Action:** Set Shipping Mode to \`product_specific\`, charge = ₹750, free shipping = false.
* **Expected Result:** Checkout applies exactly ₹750 freight charge, bypassing category/global free shipping thresholds.
* **Customer Impact:** Transparent heavy-freight fee stated prior to payment.

### Test Scenario 8: Dynamic IST Delivery Date Calculation
* **Setup:** Estimated Delivery Days entered as \`"4-5"\`. Current IST Date: Sep 21, 2026.
* **Action:** Load PDP on desktop and mobile.
* **Expected Result:** Desktop shows "25 Sep 2026 – 26 Sep 2026". Mobile shows "25–26 Sep".
* **Customer Impact:** Trustworthy arrival promise driving conversion confidence.

### Test Scenario 9: Cash on Delivery (COD) Gating
* **Setup:** Toggle \`codAvailable: false\` on high-value industrial machine (₹1,50,000).
* **Action:** Proceed to checkout payment step with this item in cart.
* **Expected Result:** Cash on Delivery payment option is disabled with notice: "Prepaid Only for Industrial Equipment".
* **Customer Impact:** Eliminates high-risk COD returns on expensive hardware.

### Test Scenario 10: Technical Downloads Attachment
* **Setup:** Attach Creality K1 User Manual PDF and OrcaSlicer Profile 3MF.
* **Action:** Open PDP "Downloads" tab as customer.
* **Expected Result:** Clean download cards with file size badges; clicking initiates instant download.
* **Customer Impact:** Rapid self-service unboxing and slicing setup.

### Test Scenario 11: Complementary Consumables 1-Click Upsell
* **Setup:** In General tab, link Anycubic Standard Grey Resin to Photon Mono 2.
* **Action:** Customer views Photon Mono 2 PDP.
* **Expected Result:** "Frequently Bought Together" widget shows printer + resin with bundle Add-Both button.
* **Customer Impact:** Convenient single-transaction purchase of essential startup consumables.

### Test Scenario 12: B2B Authorized Dealer Rate Verification
* **Setup:** Set Retail Sale Price = ₹20,000, Authorized Dealer Price = ₹16,000.
* **Action:** Log in with verified B2B dealer account.
* **Expected Result:** Product displays Dealer Price (₹16,000) with "Authorized B2B Rate" badge.
* **Customer Impact:** Seamless wholesale order booking without manual invoice quotes.

---

## 42. VISUAL SCREENSHOT REGISTRY

| Figure # | Capture Caption | System Module & Screen Reference |
| :---: | :--- | :--- |
| **Figure 1.1** | Master Product Catalog Console | \`UI-CAT-01\` — Active catalog grid with status toggles, stock, and quick edit. |
| **Figure 2.1** | Product Configuration General Setup | \`UI-GEN-01\` — Identity, slug, SKU, multi-category tagging, and brand alliance. |
| **Figure 2.2** | Pricing & Inventory Configuration | \`UI-PRC-01\` — MRP, Retail Sale, Dealer rate, physical stock, and policy switch. |
| **Figure 3.1** | Categories Multi-Select Architecture | \`UI-CAT-SEL\` — Searchable category tree, Select All, and Primary radio tag. |
| **Figure 4.1** | Product Variant Group Architecture | \`UI-VAR-GRP\` — Group configuration, 11 display types, and 6 selection modes. |
| **Figure 4.2** | Dynamic Variant Templates Library | \`UI-TPL-LIB\` — 10 pre-engineered templates with collision prevention modals. |
| **Figure 4.3** | Cartesian Combination Matrix Console | \`UI-CMB-MTX\` — Generated permutations, unique SKUs, stock, weights, and defaults. |
| **Figure 5.1** | Product Image Gallery & Variant Mapping | \`UI-IMG-MAP\` — Primary hero asset selection, ordering, and swatch binding. |
| **Figure 6.1** | Product Logistics & Shipping Calibration | \`UI-SHP-CFG\` — Unit weight, 3 shipping priority modes, and live engine preview. |
| **Figure 7.1** | Live Storefront Customer Simulator | \`UI-SIM-PRE\` — In-admin interactive PDP replica for pre-publish validation. |
| **Figure 8.1** | Custom Slicing Order Inspection | \`UI-ORD-STL\` — STL model volume, layer height, and custom manufacturing specs. |

---

## 43. DOCUMENT HANDOVER & OPERATIONAL ACCEPTANCE

This Master Guide confirms that all product configuration capabilities within the 3D Galaxy Admin Portal have been audited, documented, and officially delivered for commercial operations:

\`\`\`
+---------------------------------------------------------------------------------------+
|                                    DELIVERED BY:                                      |
|                               AJR DIGITAL HUB TEAM                                    |
|                        Enterprise Digital Solutions Team                              |
|                                                                                       |
| Signature: ___________________________            Date: September 21, 2026            |
+---------------------------------------------------------------------------------------+
                                           │
                                           │  [Official Handover]
                                           ▼
+---------------------------------------------------------------------------------------+
|                                    ACCEPTED BY:                                       |
|                                  3D GALAXY TEAM                                       |
|                  E-Commerce Operations & Store Administration                         |
|                                                                                       |
| Signature: ___________________________            Date: September 21, 2026            |
+---------------------------------------------------------------------------------------+
\`\`\`

---
*AJR DIGITAL HUB — WHERE IDEAS MEET INNOVATION • CREATIVE • TECHNOLOGY • SOLUTIONS*  
*Delivered for 3D Galaxy Enterprise E-Commerce & Additive Manufacturing Platform • All Rights Reserved 2026*
`;

fs.writeFileSync(MD_OUTPUT, mdContent, 'utf8');
console.log('Successfully written Markdown to:', MD_OUTPUT);
console.log('File size:', (fs.statSync(MD_OUTPUT).size / 1024).toFixed(2), 'KB');
