const fs = require('fs');
const path = require('path');

const MD_OUTPUT_GUIDE = path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Guide.md');
const MD_OUTPUT_MASTER = path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Master_Guide.md');
const MD_OUTPUT_TOUR = path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Visual_Tour_Guide.md');

console.log('Generating Clean 3D Galaxy Product Configuration Administration Guide...');

const content = `# 3D GALAXY — PRODUCT CONFIGURATION ADMINISTRATION GUIDE
## Complete Operational Reference, Architecture & Field Specification Manual
### Professional Client-Facing Guide with Clean Application Screenshots, Exhaustive Field References, Option Tables, and Validation Protocols

<p align="center">
  <img src="assets/product-configuration-tour/ajr_digital_hub_logo.png" alt="AJR Digital Hub Logo" width="170"/>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="assets/product-configuration-tour/3d_galaxy_logo.png" alt="3D Galaxy Logo" width="113"/>
</p>

---

### DOCUMENT CONTROL & GOVERNANCE

| Document Attribute | Specification Details |
| :--- | :--- |
| **Document Title** | 3D Galaxy — Product Configuration Administration Guide |
| **Application Platform** | 3D Galaxy Enterprise E-Commerce & Custom 3D Manufacturing Admin Portal |
| **Document Identifier** | \`DOC-3DG-PRD-ADMIN-2026-V2.0\` |
| **Release Version** | 2.0 (Production Clean Master) |
| **Publication Date** | September 2026 |
| **Delivered By** | **AJR Digital Hub Team** (Enterprise Digital Solutions & Architecture) |
| **Delivered To / Accepted By** | **3D Galaxy Team** (E-Commerce Operations & Catalog Administration) |
| **Classification** | Commercial in Confidence — Operational Administration Reference Manual |
| **Document Scope** | Clean Application Screenshots, 11 Configuration Tabs, 11 Display Types, 6 Selection Modes, Cartesian Combination Matrix, Pricing, Inventory, Weight, Shipping Tariffs, Dynamic Delivery Dates, Validation Gates |

---

### Document Revision History

| Version | Release Date | Author / Entity | Summary of Operational Scope |
| :--- | :--- | :--- | :--- |
| **1.0** | Sep 18, 2026 | AJR Digital Hub Engineering | Initial extraction of data models, Angular signals, reactive form controls, and validation rules. |
| **1.5** | Sep 20, 2026 | AJR Digital Hub Solutions | Dropdown documentation, Cartesian matrix permutations, and dynamic delivery date formulas. |
| **2.0** | Sep 21, 2026 | AJR Digital Hub Delivery Team | **Complete Clean Screenshot Edition**: Removed all tour callouts, numbered circles, arrows, and overlay boxes. Replaced with pristine, native application screenshots and comprehensive field reference tables, option matrices, and outside operational callout boxes. |

---

## 1. DOCUMENT PURPOSE & EXECUTIVE SUMMARY

The **3D Galaxy Product Configuration Administration Guide** is an exhaustive, professional operational manual created specifically for the 3D Galaxy catalog administration and fulfillment team. 

Unlike a temporary interactive tour or walkthrough, this document serves as a permanent reference manual. Every visual element inside this guide represents the **authentic, clean application user interface** exactly as experienced inside the 3D Galaxy Admin Portal—with zero overlay graphics, zero tour markers, and zero obscuring callout boxes.

### Core Documentation Paradigm
1. **Clean Application Visuals:** Every screenshot provides an unadulterated, high-resolution view of the application UI.
2. **Exhaustive Field References:** Every control, input box, toggle, and dropdown is tabulated and explained directly below the corresponding figure.
3. **Verified Option Catalogs:** All dropdown menus, display types, and selection modes reflect the exact code specifications within the platform.
4. **Storefront Impact Analysis:** Clear explanations of how administrative inputs alter customer product detail pages (PDP), cart subtotals, weight-based freight charges, and invoice generation.
5. **Quality Gates & Operational Safeguards:** Actionable validation checklists and callout boxes placed safely outside screenshots to prevent administrative misconfiguration.

\`\`\`
+---------------------------------------------------------------------------------------------------+
|                                  ADMIN CONFIGURATION INPUT                                        |
|        (Title, Slug, Categories, Pricing, Cartesian Variants, Weight, Shipping, SEO)             |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                 CORE CATALOG DATA ENGINE                                          |
|        (SKU Registry, Permutations, Inventory Allocations, Price Rules, Image Mapping)            |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                  CUSTOMER STOREFRONT (PDP)                                        |
|        (Live Swatches, Dynamic Pricing, Stock Badges, Gallery Zoom, Delivery Date Engine)         |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                     CHECKOUT & FULFILLMENT                                        |
|        (Cart Subtotal, Weight Aggregate, Courier Shipping Tariffs, GST Invoicing, Shipping Label) |
+---------------------------------------------------------------------------------------------------+
\`\`\`

---

## 2. CATALOG ARCHITECTURE & REGISTRY CONSOLE

The Catalog Registry console is the operational headquarters where all products, SKUs, inventory counts, dealer rates, and catalog lifecycle actions are monitored, filtered, and initiated.

### FIGURE 1.1 — CATALOG REGISTRY CONSOLE

![Figure 1.1 — Catalog Registry Console](assets/product-configuration-tour/tour_01_catalog_registry.png)

*Figure description: Catalog Registry Console showing active product listings, SKU codes, category assignments, stock status badges, pricing columns, and top-level action controls.*

#### CONTROL REFERENCE

| Control / Column | Purpose | Admin Action |
| :--- | :--- | :--- |
| **+ Add Product** | Initiates new product creation workflow | Click to launch blank product configuration editor |
| **Search Input** | Real-time filtering across titles and SKUs | Type keywords, part numbers, or unique SKUs to isolate records |
| **Category Filter** | Multi-taxonomy drill-down | Filter list by specific product category or department |
| **Stock Status Badge** | Real-time stock state indicator | Evaluates physical inventory (\`In Stock\`, \`Low Stock\`, \`Out of Stock\`) |
| **Base Price / MRP** | Retail and discounted price display | Quickly audit consumer selling prices across the catalog |
| **Action Menu (•••)** | Row-level operational commands | Edit product, view live preview, duplicate SKU, or deactivate item |

> [!TIP]
> ### ADMIN TIP
> Use the Catalog Search filter to audit existing SKUs before creating new products. Maintaining a strict, standardized SKU syntax (e.g., \`FIL-PLA-BLK-1KG\`) ensures clean inventory tracking and prevents accidental duplicates across the catalog.

---

## 3. GENERAL PRODUCT IDENTITY & CLASSIFICATION

The General tab establishes the core data attributes, search identifiers, and public marketing copy for the product.

### FIGURE 2.1 — GENERAL PRODUCT IDENTITY

![Figure 2.1 — General Product Identity](assets/product-configuration-tour/tour_02_general_identity.png)

*Figure description: General product configuration screen used to configure the core product title, URL slug, SKU, category associations, and descriptive marketing copy.*

#### FIELD REFERENCE

| Field | Description | Configuration |
| :--- | :--- | :--- |
| **Product Title** | Primary customer-facing product name | Enter clear, keyword-rich title (max 255 chars) |
| **URL Slug** | Clean, SEO-friendly URI path identifier | Auto-generated from title or custom kebab-case slug |
| **SKU / Barcode** | Unique master product stock keeping unit & EAN | Enter alphanumeric internal SKU and scannable barcode |
| **Categories** | Hierarchical taxonomy classification | Select one or more relevant category nodes |
| **Short Description** | Concise summary displayed on product cards & top PDP | Enter 1–2 high-impact sentences summarizing key benefits |
| **Full Description** | Comprehensive technical and marketing overview | Rich text formatting with specifications, benefits, and usage |

### Detailed Field Explanations

1. **Product Title:** The customer-facing identity of the item. It is automatically propagated to the HTML \`<title>\` tag, OpenGraph social cards, breadcrumbs, search index tokens, and order line items.
2. **URL Slug:** The clean URI path appended to \`https://3dgalaxy.in/product/\`. Must contain only lowercase alphanumeric characters and hyphens (e.g., \`creality-ender-3-v3-ke\`). Changing the slug on published products breaks legacy search links unless a 301 redirect is provisioned.
3. **SKU / Barcode:** Internal warehouse inventory identifier and scannable GS1/EAN barcode. If the product has Cartesian variants, this serves as the parent base SKU.
4. **Short Description:** Rendered immediately below the product title and star rating on the storefront PDP. It also forms the default fallback for search engine meta descriptions.
5. **Full Description:** Fully featured rich text HTML editor supporting headings, bullet points, technical comparison tables, and embedded diagrams.

> [!IMPORTANT]
> ### IMPORTANT
> The URL slug must be strictly unique across the entire database. If a duplicate slug is submitted, the system will reject the update to prevent URL collision and 404 routing conflicts.

---

## 4. CATEGORY CONFIGURATION & ARCHITECTURE

Categorization governs how products are discovered through main navigation menus, category pages, breadcrumbs, and multi-faceted search filters.

### FIGURE 3.1 — CATEGORY SELECTOR & ARCHITECTURE

![Figure 3.1 — Category Architecture](assets/product-configuration-tour/tour_03_category_selector.png)

*Figure description: Category selector showing category search bar, category tree checkboxes, bulk selection controls, and selected category tag chips.*

### Category Architecture

The 3D Galaxy taxonomy engine utilizes a multi-category hierarchical structure allowing a product to belong to multiple catalog categories simultaneously while maintaining a single **Primary Category** for canonical URL routing and breadcrumb navigation.

- **Category Search:** Instantly narrows large category trees by filtering matching parent and child nodes in real time.
- **Category Selection:** Administrators click individual checkboxes to assign products to specific catalog nodes.
- **Multi-Category Selection:** Allows cross-listing items across diverse catalog branches (e.g., listing a 3D printing filament under both *Filaments > PLA* and *Materials > Engineering Consumables*).
- **Select All:** Bulk selects all categories currently visible within the filtered search view.
- **Clear All:** Instantly deselects all active categories, returning the selector to a clean slate.
- **Primary Category:** The definitive parent category used to construct canonical breadcrumb trails (\`Home > 3D Printers > FDM Printers > [Product]\`) and Google Structured Data.
- **Selected Category Tags:** Visual chip badges rendering selected categories with instant removal (x) capability.
- **Category Synchronization:** Real-time synchronization ensuring products instantly appear or disappear from storefront category listings upon saving.
- **Category Hierarchy:** Parent-child relationships ensuring that filtering by a parent node automatically surfaces items assigned to its sub-categories.

#### CONTROL REFERENCE

| Control | Purpose | Admin Action |
| :--- | :--- | :--- |
| **Search** | Find categories quickly in dense taxonomy trees | Search by category name or keyword |
| **Checkbox** | Select or deselect individual category node | Enable checkbox to associate product |
| **Select All** | Select all currently filtered categories in bulk | Click to bulk assign visible categories |
| **Clear All** | Remove all selected category assignments | Click to wipe category associations |
| **Primary** | Define primary category for canonical routing | Click star or radio icon to designate primary node |
| **Selected Tags** | Review and manage active selections | Click 'x' on any chip to remove that category |

> [!CAUTION]
> ### CUSTOMER IMPACT
> Failing to assign at least one category will cause the product to become an "orphan item." It will be completely invisible on storefront category browsing pages, mega-menus, and faceted navigation filters, discoverable only by direct URL.

---

## 5. BRAND ALLIANCE & TAXONOMY TAGS

### FIGURE 4.1 — BRAND ALLIANCE & TAXONOMY

![Figure 4.1 — Brand Alliance & Taxonomy](assets/product-configuration-tour/tour_04_brand_alliance.png)

*Figure description: Brand alliance dropdown and searchable taxonomy tag interface for manufacturer association and storefront filtering.*

#### FIELD REFERENCE

| Field | Description | Configuration |
| :--- | :--- | :--- |
| **Brand Alliance** | Manufacturer or partner brand association | Select registered brand from dropdown |
| **Taxonomy Tags** | Free-form semantic search keywords | Add comma-separated search terms and tags |
| **Model / Series** | Hardware revision or filament series | Enter specific manufacturer hardware generation |
| **Compatibility Flags** | Associated printer hardware ecosystems | Select supported 3D printer platforms |

---

## 6. CORE PRICING ARCHITECTURE

Pricing directly controls storefront retail presentation, strike-through promotional displays, dealer rate cards, and cart tax computations.

### FIGURE 5.1 — CORE PRODUCT PRICING

![Figure 5.1 — Core Product Pricing](assets/product-configuration-tour/tour_05_pricing.png)

*Figure description: Core product pricing configuration interface displaying MRP, Retail Sale Price, Authorized Dealer Price, and GST tax settings.*

#### FIELD REFERENCE

| Field | Description | Configuration |
| :--- | :--- | :--- |
| **MRP (Maximum Retail Price)** | Manufacturer reference price (strike-through) | Enter statutory maximum retail price |
| **Retail Sale Price** | Actual selling price charged to standard B2C customers | Enter active selling price (must be $\le$ MRP) |
| **Dealer Price (B2B)** | Discounted rate for verified B2B/wholesale accounts | Enter wholesale rate unlocked upon B2B login |
| **Tax Rate (GST)** | Applicable Goods and Services Tax percentage | Select statutory GST slab (e.g., 18%) |
| **Tax Inclusive Toggle** | Determines if entered prices include GST | Toggle ON if price includes tax; OFF for net + tax |

> [!IMPORTANT]
> ### VALIDATION RULE
> The **Retail Sale Price** must always be less than or equal to the **MRP**. If the Sale Price exceeds MRP, the platform blocks saving with a validation error to comply with consumer protection regulations.

---

## 7. BASE INVENTORY MANAGEMENT & STOCK

### FIGURE 6.1 — BASE INVENTORY & STOCK

![Figure 6.1 — Base Inventory & Stock](assets/product-configuration-tour/tour_06_inventory.png)

*Figure description: Base inventory management showing master stock counters, low stock warning thresholds, backorder toggles, and inventory tracking flags.*

#### FIELD REFERENCE

| Field | Description | Configuration |
| :--- | :--- | :--- |
| **Track Inventory** | Enables automated real-time stock deduction | Toggle ON to track quantities against sales |
| **Current Stock Quantity** | Physical units available in fulfillment warehouse | Enter verified on-hand inventory count |
| **Low Stock Threshold** | Threshold triggering automated restock alerts | Enter warning number (e.g., 5 units) |
| **Allow Backorders** | Enables customer purchases when stock reaches zero | Select \`Do not allow\`, \`Allow\`, or \`Notify customer\` |
| **Stock Status Override** | Manual state override for catalog display | Select \`In Stock\`, \`Out of Stock\`, or \`On Backorder\` |

---

## 8. VARIANT CONFIGURATION ENGINE

The 3D Galaxy Variant Engine transforms complex, multi-option items (such as filaments with multiple colors, spool weights, and bundle packs) into streamlined customer selection interfaces.

### FIGURE 7.1 — VARIANT GROUP CONFIGURATION

![Figure 7.1 — Variant Group Configuration](assets/product-configuration-tour/tour_07_variant_group_header.png)

*Figure description: Variant group header configuration showing group naming, display name, display type selector, selection mode, and operational toggles.*

### Variant Group

Every variant dimension (e.g., "Color", "Weight", "Nozzle Size") is governed by a dedicated **Variant Group**:

- **Variant Name:** Internal technical identifier used in database keys and Cartesian matrix generation (e.g., \`filament_color\`).
- **Display Name:** Customer-facing label rendered on the storefront PDP (e.g., *"Select Filament Color"*).
- **Variant Type:** Classification of variant attributes (Attribute, Material, Dimension, Pack Size).
- **Display Mode:** Visual styling employed to render option selectors on the storefront (Chips, Dropdown, Swatches).
- **Selection Mode:** Logical rules governing how customers make selections (Single, Bundle, Weight-based, Multiple).
- **Required Field:** When enabled, customers must select an option from this group before clicking "Add to Cart".
- **Active:** Master toggle enabling or disabling this variant group without deleting configured data.
- **Duplicate Selection:** In multi-selection modes, governs whether a customer can select the same variant item multiple times.

#### FIELD REFERENCE

| Field | Description | Configuration |
| :--- | :--- | :--- |
| **Variant Group Name** | Internal technical reference identifier | Enter concise identifier (e.g., \`spool_weight\`) |
| **Display Name** | Storefront customer-facing label | Enter clear user prompt (e.g., \`Choose Spool Weight\`) |
| **Display Type** | Visual presentation UI component | Select one of 11 verified display components |
| **Selection Mode** | Cart selection and pricing logic | Select one of 6 verified operational modes |
| **Required** | Mandates selection before cart addition | Toggle ON to enforce required choice |
| **Active** | Enables or suspends group in live storefront | Toggle ON to publish; OFF to draft/hide |

---

## 9. VARIANT DISPLAY TYPES

The 3D Galaxy platform supports **11 verified display types** implemented directly within the storefront presentation engine.

### FIGURE 8.1 — VARIANT DISPLAY TYPES

![Figure 8.1 — Variant Display Types](assets/product-configuration-tour/tour_08_display_types_dropdown.png)

*Figure description: Clean application screenshot showing the Variant Display Types dropdown menu displaying all 11 supported storefront presentation modes.*

### Available Options Reference Table

| Display Type | Description | Storefront UI Behavior | Recommended Use Case |
| :--- | :--- | :--- | :--- |
| **Bundle Builder** | Interactive tier cards with customizable variant slots | Renders multi-item slot selector with bundle discounts | "Buy 2 Save 10%", "Build 4-Spool Pack" |
| **Weight Selector** | Presets and custom weight inputs | Displays weight chips with numeric kg/g custom entry | Bulk materials, resin bottles, filament spools |
| **Chip Selector** | Clean horizontal pill buttons | Compact clickable pills highlighting selected state | Clothing sizes, technical specs, nozzle diameters |
| **Dropdown Menu** | Standard HTML select box | Compact menu expanding on click | Dense option catalogs (50+ printer models) |
| **Image Selector** | Visual photo thumbnail chips | Renders mini preview images with active borders | Filament spool swatches, patterned PEI sheets |
| **Card Selector** | Rich detailed cards with descriptions | Cards displaying badges, pricing, and specs | Extended warranty tiers, complete printer bundles |
| **Radio Chips** | Circular radio buttons with text | Classic radio selector with visible circular target | Exclusive single-choice binary configurations |
| **Color Chips** | Circular/square color hex swatches | Vibrant color discs with tooltips and checkmarks | Filament colors, resin dyes, hardware finishes |
| **Button Group** | Segmented inline toggle buttons | Connected button bar with instant tab switching | Fast switching between 2–4 primary modes |
| **Quantity Selector** | Stepper counter with tiered bulk discounts | [-] [Qty] [+] controls with volume discount alerts | Consumable spare parts, nozzles, screws |
| **Grid Cards** | Multi-column visual grid cards | 2-column or 3-column photo cards with subtext | Starter kit builders, modular accessory upgrades |

---

## 10. VARIANT SELECTION MODES

The selection mode defines the mathematical and cart rules used to evaluate customer selections.

### FIGURE 9.1 — SELECTION MODE CONFIGURATION

![Figure 9.1 — Selection Modes](assets/product-configuration-tour/tour_09_selection_modes_dropdown.png)

*Figure description: Clean application screenshot showing the Selection Mode dropdown menu displaying all 6 operational selection modes.*

### Available Selection Modes Reference Table

| Selection Mode | Purpose | Customer Behavior | Recommended Use |
| :--- | :--- | :--- | :--- |
| **Single Selection** | Standard e-commerce choice | Customer selects exactly 1 variant option before cart addition | Single filament color, specific machine model |
| **Bundle Selection** | Multi-item tiered pack builder | Customer fills N predetermined slots with individual variant choices | 4-spool filament variety bundles |
| **Weight Based** | Continuous or stepped mass pricing | Customer selects weight preset or types custom weight in kg/g | Industrial resin, bulk plastic pellets |
| **Multiple Selection** | Optional add-on accessory check | Customer checks 0, 1, or multiple optional items | Adding extra nozzles, build plates, or tools |
| **Quantity Based** | Tiered volume pack discounts | Selecting a pack size automatically updates pricing rules | "Pack of 5", "Pack of 10", "Box of 50" |
| **Package / Starter Kit** | Fixed-slot multi-category kit | Customer configures required components across distinct groups | "Complete 3D Printing Starter Kit" |

---

## 11. VARIANT VALUE REGISTRY & OPTION MODIFIERS

### FIGURE 10.1 — VARIANT VALUES REGISTRY

![Figure 10.1 — Variant Values](assets/product-configuration-tour/tour_10_variant_values.png)

*Figure description: Variant value registry showing configured options, color hex swatches, price adjustments, and weight overrides.*

#### FIELD REFERENCE

| Field | Description | Configuration |
| :--- | :--- | :--- |
| **Option Value Name** | Public name of variant option | Enter descriptive name (e.g., \`Matte Black\`, \`1.75mm\`) |
| **Hex Color Code** | Visual swatch color (for color chips) | Enter 6-digit hex code (e.g., \`#1A1A1A\`) or use color picker |
| **Price Adjustment** | Differential price added to base price | Enter positive or negative delta (e.g., \`+250.00\`) |
| **Weight Override** | Specific physical mass for this option | Enter tare/gross weight in grams (e.g., \`1000\`) |
| **Display Order** | Sequence of option display on PDP | Enter sort index (1, 2, 3...) |

---

## 12. VARIANT-SPECIFIC PRICING ARCHITECTURE

When variants have distinct manufacturing costs, the administrator overrides baseline prices directly at the permutation level.

### FIGURE 11.1 — VARIANT SPECIFIC PRICING

![Figure 11.1 — Variant Pricing](assets/product-configuration-tour/tour_11_variant_pricing.png)

*Figure description: Combination matrix pricing columns displaying MRP, Sale Price, and Dealer Price configurations for each distinct variant permutation.*

#### FIELD REFERENCE

| Field | Description | Configuration |
| :--- | :--- | :--- |
| **Permutation MRP** | Maximum Retail Price for this specific variant | Enter statutory MRP for variant (e.g., \`₹1,499.00\`) |
| **Permutation Sale Price** | Actual retail price charged for this variant | Enter active selling price (e.g., \`₹999.00\`) |
| **Permutation Dealer Price** | Wholesale rate for verified B2B accounts | Enter special wholesale rate (e.g., \`₹799.00\`) |
| **Margin / Discount Badge** | Auto-calculated percentage discount | System computes: \`((MRP - Sale) / MRP) * 100\` |

---

## 13. INVENTORY & STOCK GOVERNANCE

Stock can be managed either globally at the parent product level or granularly at the variant permutation level.

### FIGURE 12.1 — VARIANT-LEVEL STOCK INVENTORY

![Figure 12.1 — Variant Stock](assets/product-configuration-tour/tour_12_variant_stock.png)

*Figure description: Combination matrix stock inventory interface showing individual warehouse SKU counts, status indicators, and stock management controls.*

### Operational Stock Governance

- **Product-Level Stock:** Applied when a product has no variants. A single inventory counter governs the entire product availability.
- **Variant-Level Stock:** In products with variant groups, each permutation possesses its own isolated physical stock counter. Selling a "Matte Black / 1kg" spool deducts stock only from that specific variant, leaving "Silk White / 1kg" unaffected.
- **Stock Availability Statuses:**
  - \`In Stock\`: Available quantity is greater than zero. Customer can add to cart immediately.
  - \`Low Stock\`: Available quantity is at or below the low stock threshold. Storefront displays an urgent "Only X left!" badge.
  - \`Out of Stock\`: Quantity is zero. Storefront disables the Add to Cart button and presents an out-of-stock badge.
- **Out-of-Stock Behavior:** When a customer selects an out-of-stock swatch, the Add to Cart button transitions to *"Out of Stock"*, blocking purchase while keeping other available variants selectable.
- **Cart Validation:** The shopping cart continuously polls the real-time stock API. If a customer attempts to increase cart quantity beyond available stock, the system caps the increment and alerts the customer.
- **Checkout Validation:** During final payment submission, the backend locks inventory. If another user checked out the last unit seconds earlier, the transaction cleanly aborts with an inventory reallocation notice.
- **Customer-Facing Stock State:** Visual indication on swatches (e.g., strike-through line or reduced opacity on out-of-stock color chips).

> [!IMPORTANT]
> ### IMPORTANT: INVENTORY ACCURACY
> Variant stock must strictly mirror physical warehouse counts. Never inflate variant inventory numbers to artificially induce sales, as backorders on multi-variant items lead to severe fulfillment delays and customer disputes.

---

## 14. WEIGHT CONFIGURATION & LOGISTICS TARIFFS

Accurate weight configuration is critical for dynamic shipping freight calculations, carrier manifest generation, and multi-unit checkout calculations.

### FIGURE 13.1 — VARIANT WEIGHT CONFIGURATION

![Figure 13.1 — Variant Weight](assets/product-configuration-tour/tour_13_variant_weight.png)

*Figure description: Combination matrix weight column showing physical gross mass in grams, weight unit toggles, and tare source indicators.*

### Weight Calculation Architecture

- **Product Weight:** Master baseline weight assigned to the parent product, utilized when no variant-specific weight is defined.
- **Variant-Specific Weight:** Individual gross weight assigned to a specific variant permutation (e.g., 250g spool vs. 1000g spool vs. 5000g industrial drum).
- **Weight Unit:** Standard unit of measurement. While the admin portal displays weight in grams (\`g\`) or kilograms (\`kg\`), the underlying database stores all values normalized in **grams**.
- **Quantity $\times$ Weight Formula:** When a customer purchases multiple units, the cart aggregate weight multiplies dynamically:

$$\text{Total Shipment Mass} = \sum (\text{Variant Weight in Grams} \times \text{Quantity})$$

- **Gram to Kilogram Conversion:** Automated conversion used for courier freight brackets:

$$\text{Weight in Kilograms} = \frac{\text{Weight in Grams}}{1000}$$

#### Concrete Operational Example:
$$\text{250g Spool} \times 4 \text{ Units} = 1000\text{g} = 1.0\text{kg}$$
$$\text{Result: Shifts shipment into the 1kg courier freight bracket ($₹120$ instead of $₹60$).}$$

- **Checkout Weight Summary:** The checkout shipping calculation engine evaluates total cart weight against registered courier rate cards (e.g., Delhivery, Shiprocket, BlueDart).
- **Shipping Calculation Relationship:** If variant weight is omitted (set to 0), the system defaults to baseline shipping, causing the merchant to absorb undercharged courier charges on heavy consignments.

---

## 15. VARIANT IMAGE LINKING & GALLERY SYNCHRONIZATION

Variant image mapping creates a seamless connection between selection swatches and the primary product gallery.

### FIGURE 14.1 — VARIANT IMAGE LINKING

![Figure 14.1 — Variant Image Linking](assets/product-configuration-tour/tour_14_variant_image_mapping.png)

*Figure description: Variant image mapping interface linking gallery photos to specific variant options with primary badge indicators.*

### Image Linking Architecture

- **Product Images:** The master photo gallery uploaded in Tab 3 (Images), containing general lifestyle shots, dimension diagrams, and packaging visuals.
- **Variant-Specific Images:** Photos specifically depicting a particular color, material, or hardware finish.
- **Image-to-Variant Mapping:** Administrators assign uploaded gallery images directly to corresponding variant values (e.g., assigning \`pla_red_front.jpg\` to \`Red\`).
- **Primary Image:** The designated lead thumbnail for each variant. When a customer clicks the "Red" swatch on the PDP, the main hero gallery image instantly swaps to this primary image.
- **Customer Image Behavior:**
  1. Customer views product page: Default variant image is displayed in hero view.
  2. Customer clicks "Neon Green" swatch: Gallery smoothly animates to show the Neon Green spool.
  3. Customer clicks thumbnail image in gallery: The variant dropdown/chips automatically synchronize to select "Neon Green".
- **Fallback Behavior (No Linked Variant):** If an image has no linked variant, clicking it displays the photo normally in the gallery zoom viewer without altering active variant selections. Conversely, if a selected variant has no linked image, the gallery maintains the parent product's primary hero image.

> [!TIP]
> ### ADMIN TIP: OPTIMAL IMAGE RESOLUTION
> Upload crisp, square product photos at **1600 × 1600 pixels** (WebP or JPG format under 350 KB). Square imagery guarantees perfect alignment across product cards, mobile swatches, and zoom lenses.

---

## 16. DEFAULT VARIANT DESIGNATION

The default variant establishes the initial presentation of a configurable product when a customer first visits the product detail page.

### FIGURE 15.1 — DEFAULT VARIANT DESIGNATION

![Figure 15.1 — Default Variant](assets/product-configuration-tour/tour_15_default_variant.png)

*Figure description: Combination matrix showing default variant radio selection column, active status toggles, and base pre-selection state.*

### Default Variant Architecture

- **What is the Default Variant?** The specific permutation pre-selected automatically when a customer loads the storefront PDP.
- **How is it Configured?** In the Combination Matrix (Tab 2), the administrator clicks the **Radio Button** or **Star Icon** in the "Default" column corresponding to the desired permutation.
- **Initial Customer Experience:** Prevents empty selection states and avoids confusing "Select options to view price" placeholders.
- **Storefront Impacts:**
  - **Initial Image:** The hero gallery immediately showcases the photo linked to the default variant.
  - **Initial Price:** The PDP price tag displays the exact Sale Price and MRP of the default variant.
  - **Initial Stock:** The stock counter displays the inventory count of the default variant.
  - **Initial Weight:** Shipping estimates and weight badges populate based on the default variant's mass.
  - **Initial Variant Selection:** The corresponding chips, color swatches, or dropdown options appear highlighted in their active selected state.

> [!CAUTION]
> ### CRITICAL RULE: ALWAYS ASSIGN AN IN-STOCK DEFAULT VARIANT
> Never designate an out-of-stock permutation as the default variant. If a customer lands on a PDP defaulting to an out-of-stock item, they may immediately assume the entire product line is unavailable and bounce.

---

## 17. CARTESIAN COMBINATION MATRIX

The Combination Matrix represents the mathematical Cartesian product of all active variant groups ($G_1 \times G_2 \times \dots \times G_n$).

### FIGURE 16.1 — CARTESIAN COMBINATION MATRIX

![Figure 16.1 — Combination Matrix](assets/product-configuration-tour/tour_16_combination_matrix.png)

*Figure description: Full Cartesian combination matrix table displaying generated permutations, individual SKUs, pricing, stock levels, tare weights, and management actions.*

#### FIELD REFERENCE

| Column / Control | Purpose | Configuration / Admin Action |
| :--- | :--- | :--- |
| **Default (Radio)** | Designates primary pre-selected SKU | Select 1 radio button to establish default variant |
| **Status (Toggle)** | Enables or disables individual permutation | Toggle ON to activate; OFF to temporarily suppress SKU |
| **Variant Name** | Composite human-readable permutation name | Auto-generated (e.g., \`1.75mm / Matte Black / 1kg\`) |
| **SKU** | Unique warehouse stock code for permutation | Configure unique identifier (e.g., \`3DG-PLA-BLK-1KG\`) |
| **MRP** | Statutory reference price for permutation | Enter variant-level MRP in INR |
| **Sale Price** | Active retail selling price for permutation | Enter active retail price in INR |
| **Stock** | Dedicated physical stock counter | Enter verified warehouse stock quantity |
| **Weight** | Gross mass in grams for shipping calculations | Enter weight in grams (e.g., \`1250\` with spool) |
| **Weight Source** | Indicates source of weight value | Displays \`Variant\`, \`Group Preset\`, or \`Product Default\` |
| **Manage (Button)** | Opens advanced modal for dimensions/EAN | Configure custom barcode, packaging dims, or B2B rates |
| **Delete (Trash)** | Removes impossible or discontinued permutation | Click to delete specific permutation from catalog |

### Storefront & Checkout Lifecycle Impacts
- **Product Detail Page (PDP):** When a user switches options, the matrix supplies the reactive parameters to instantly update URL query params, hero images, and stock badges.
- **Pricing:** Dynamic price calculations ensure discounts and volume tiers reflect the active matrix row.
- **Inventory:** Prevents overselling by binding checkout locks to the specific permutation SKU.
- **Cart & Checkout:** Line items in the cart display full variant attributes, ensuring warehouse packing slips specify the exact color, size, and weight requested.

---

## 18. BUNDLE BUILDER & QUANTITY TIER ENGINE

The Bundle Builder drives higher Average Order Value (AOV) by empowering customers to build custom packs with volume-based savings.

### FIGURE 17.1 — BUNDLE BUILDER CONFIGURATION

![Figure 17.1 — Bundle Builder](assets/product-configuration-tour/tour_17_bundle_builder.png)

*Figure description: Bundle builder tier configuration interface displaying tier counts, pricing modes, bundle prices, savings badges, and slot labels.*

#### FIELD REFERENCE

| Field / Control | Description | Configuration |
| :--- | :--- | :--- |
| **Tier Name** | Marketing headline for the bundle tier | Enter compelling label (e.g., \`Duo Pack\`, \`Maker Bundle\`) |
| **Quantity (Count)** | Number of items customer must select | Specify exact integer count (e.g., \`2\`, \`4\`, \`10\`) |
| **Pricing Mode** | Mathematical formula applied to calculate price | Select \`Fixed Bundle Price\`, \`Per Variant Price\`, \`Percentage Discount\`, or \`Custom\` |
| **Fixed Bundle Price** | Total package price for the complete bundle | Enter flat bundle price in INR (e.g., \`₹3,499.00\`) |
| **Per Variant Price** | Effective unit price charged per selected item | Enter unit rate applied to each slot (e.g., \`₹874.75\`) |
| **Savings Label** | Customer-facing savings message | Enter badge text (e.g., \`Save 15%\`, \`Save ₹500\`) |
| **Badge Text** | Promotional ribbon highlighting the tier | Enter visual tag (e.g., \`Most Popular\`, \`Best Value\`) |
| **Popular (Flag)** | Marks tier with highlighted border on PDP | Toggle ON to default highlight this tier |
| **Weight Override** | Combined shipping weight for the entire bundle | Enter total bundle mass in grams or kilograms |
| **Add Tier (+)** | Appends a new volume discount level | Click to add another bundle discount tier |
| **Remove Tier (x)** | Deletes an obsolete bundle tier | Click to remove tier configuration |

### Complete Operational Flow: Bundle to Checkout

$$\text{Bundle Configuration} \longrightarrow \text{Customer Variant Slot Selection} \longrightarrow \text{Effective Price Calculation} \longrightarrow \text{Cart Line Item} \longrightarrow \text{Checkout Manifest}$$

1. **Bundle Setup:** Admin creates a "Buy 4 Filaments Pack" with a fixed price of ₹3,200 (saving ₹800 off ₹4,000 retail).
2. **Variant Selection:** On the PDP, customer is presented with 4 distinct selector slots. Customer selects Slot 1: *Black*, Slot 2: *White*, Slot 3: *Red*, Slot 4: *Silk Silver*.
3. **Price Calculation:** The frontend validates that all 4 slots are filled. Subtotal calculates as ₹3,200 with an explicit savings badge *"You saved ₹800!"*.
4. **Cart & Checkout:** Cart contains a single parent bundle line item with 4 child variant allocations. Warehouse packing slips print all 4 individual SKUs, deducting 1 unit from each variant's inventory counter.

---

## 19. ALL 11 CONFIGURATION TABS REFERENCE MANUAL

This section details all 11 configuration tabs in the 3D Galaxy Admin Portal. For every tab, administrators must follow the standardized 8-point operational framework:
1. **Purpose:** Strategic catalog objective of the tab.
2. **Fields:** Complete inventory of inputs and toggles.
3. **Available Options:** Permitted choices and data formats.
4. **Admin Usage:** Exact procedure for entering data.
5. **Customer Impact:** Storefront visual and functional change.
6. **Validation:** Automated checks and format rules.
7. **Dependencies:** Downstream modules affected.
8. **Common Mistakes:** Misconfigurations to avoid.

---

### TAB 1: GENERAL CONFIGURATION

*(Refer to Figure 2.1 through Figure 6.1)*

1. **Purpose:** Establishes master catalog identity, search slugs, category taxonomy, manufacturer brand, retail/dealer pricing, and baseline stock policies.
2. **Fields:** Product Title, URL Slug, SKU, Barcode, Categories Tree, Short Description, Full Description (WYSIWYG), Brand Alliance, Tags, MRP, Sale Price, Dealer Price, GST Tax Rate, Tax Inclusive Toggle, Physical Stock, Low Stock Threshold, Allow Backorders.
3. **Available Options:**
   - Tax Slabs: 0%, 5%, 12%, 18%, 28%.
   - Backorder Modes: Do not allow, Allow but notify, Allow freely.
   - Stock Status: In Stock, Out of Stock, On Backorder.
4. **Admin Usage:** Input title, verify auto-slug, assign primary and secondary categories, set MRP and Sale Price, input physical warehouse stock.
5. **Customer Impact:** Dictates how the item appears on Google search, category listings, search bars, and the header section of the PDP.
6. **Validation:** Title and SKU required; Sale Price $\le$ MRP; URL slug must be globally unique alphanumeric kebab-case; stock must be integer $\ge 0$.
7. **Dependencies:** Feeds product search engine, category browsing, cart subtotal calculations, and B2B dealer login pricing.
8. **Common Mistakes:** Forgetting to assign categories (orphan product); entering Sale Price higher than MRP; typing uppercase or special characters in URL slug.

---

### TAB 2: VARIANTS & COMBINATION MATRIX

*(Refer to Figure 7.1 through Figure 17.1)*

1. **Purpose:** Generates multi-dimensional product variations (Color, Size, Material, Weight, Packs), configures individual prices, stocks, weights, and bundle builder tiers.
2. **Fields:** Variant Group Name, Display Name, Display Type, Selection Mode, Required Flag, Variant Values, Option Modifiers, Combination Matrix Table (SKU, MRP, Sale Price, Stock, Weight, Default Variant Radio, Manage, Delete), Bundle Tiers.
3. **Available Options:**
   - 11 Display Types: Bundle Builder, Weight Selector, Chip Selector, Dropdown Menu, Image Selector, Card Selector, Radio Chips, Color Chips, Button Group, Quantity Selector, Grid Cards.
   - 6 Selection Modes: Single, Bundle, Weight, Multiple, Quantity, Pack.
   - 4 Bundle Pricing Types: Fixed, Percentage, Per Variant, Custom.
4. **Admin Usage:** Create variant groups, add option values, verify Cartesian matrix rows, set distinct SKUs, prices, stock levels, and designate 1 default variant.
5. **Customer Impact:** Renders reactive selector swatches on PDP; updates gallery images and prices dynamically upon swatch clicks.
6. **Validation:** At least one default variant must be selected; variant SKUs must be unique; stock and prices must be valid numbers.
7. **Dependencies:** Cart line items, inventory deduction services, courier weight aggregators, and warehouse picking slips.
8. **Common Mistakes:** Generating Cartesian matrices with hundreds of combinations without setting stock; selecting an out-of-stock variant as default; forgetting to assign tare weights.

---

### TAB 3: MEDIA & PRODUCT GALLERY

### FIGURE 18.1 — IMAGES TAB

![Figure 18.1 — Images Tab](assets/product-configuration-tour/tour_18_images_tab.png)

*Figure description: Images configuration tab displaying uploaded gallery media, drag-and-drop reordering, primary hero badge, and variant mapping tags.*

1. **Purpose:** Manages the visual presentation of the product through hero images, multi-angle gallery photos, technical diagrams, and variant-linked swatches.
2. **Fields:** Drag-and-drop upload zone, Image Card, Primary Hero Badge, Variant Mapping Dropdown, Alt Text Input, Display Order Handle, Delete Button.
3. **Available Options:** Supported file types: WebP (recommended), JPG, PNG. Maximum file size: 2 MB per image. Recommended resolution: $1600 \times 1600$ px (1:1 aspect ratio).
4. **Admin Usage:** Drag images into upload zone; click star icon to designate master hero photo; enter SEO alt text; link specific photos to corresponding variant values.
5. **Customer Impact:** Determines customer first impressions; enables interactive gallery zoom, thumbnail navigation, and reactive swatch-to-photo updates.
6. **Validation:** Minimum 1 photo required to publish; files over 5 MB or invalid MIME types are automatically rejected.
7. **Dependencies:** Feeds storefront PDP carousel, category grid cards, cart thumbnails, and social sharing OpenGraph previews.
8. **Common Mistakes:** Uploading heavy uncompressed images (>3 MB) slowing page load; failing to provide descriptive alt text for SEO; uploading non-square images causing layout shifts.

---

### TAB 4: TECHNICAL SPECIFICATIONS

### FIGURE 19.1 — SPECIFICATIONS TAB

![Figure 19.1 — Specifications Tab](assets/product-configuration-tour/tour_19_specifications.png)

*Figure description: Technical specifications tab showing structured key-value specification groups, engineering parameters, and reordering handles.*

1. **Purpose:** Provides structured, machine-readable technical parameters displayed in an organized tabular format on the storefront.
2. **Fields:** Specification Group (e.g., *Print Properties*, *Mechanical Specifications*), Attribute Name (e.g., *Nozzle Temperature*, *Tensile Strength*), Attribute Value (e.g., *210°C - 230°C*, *50 MPa*), Display Order.
3. **Available Options:** Custom groups, standard industry presets, multi-row specification entries.
4. **Admin Usage:** Select or type specification group; add individual rows specifying technical parameter name and value; reorder rows using drag handles.
5. **Customer Impact:** Empowers technical buyers and engineers to compare filament properties, printer dimensions, and operating tolerances.
6. **Validation:** Key and Value fields cannot be blank; duplicate attributes within the same group are highlighted.
7. **Dependencies:** Storefront Specifications tab, Google Structured Data (\`TechnicalArticle\` / \`Product\` schema).
8. **Common Mistakes:** Entering unstructured text paragraphs instead of clean key-value rows; mixing units of measurement (e.g., mixing Celsius and Fahrenheit).

---

### TAB 5: DATASHEETS & DOWNLOADS

### FIGURE 20.1 — DOWNLOADS TAB

![Figure 20.1 — Downloads Tab](assets/product-configuration-tour/tour_20_downloads.png)

*Figure description: Downloads tab showing downloadable PDF technical datasheets, SDS safety sheets, Cura/PrusaSlicer print profiles, and firmware binaries.*

1. **Purpose:** Distributes essential customer documents including Material Safety Data Sheets (MSDS/SDS), Technical Data Sheets (TDS), 3D print slicer profiles (\`.curaprofile\`), and firmware updates.
2. **Fields:** Document Title, File Type Tag, Document Category, File Upload / URL, Version String, File Size Badge, Access Restriction (Public / Registered Customers).
3. **Available Options:** PDF, ZIP, GCODE, CURAPROFILE, INI, BIN. File size cap: 25 MB per document.
4. **Admin Usage:** Upload document; specify customer-facing label (e.g., *"PLA Technical Data Sheet v2.1"*); assign category; set access permissions.
5. **Customer Impact:** Customers can review safety certifications, verify mechanical properties before buying, and download tested slicer profiles immediately.
6. **Validation:** Files are virus-scanned on upload; URL paths must return valid HTTP 200 responses.
7. **Dependencies:** Storefront Downloads section, customer account order library.
8. **Common Mistakes:** Uploading outdated firmware revisions without version labels; broken external links.

---

### TAB 6: KEY HIGHLIGHTS & BULLET FEATURES

### FIGURE 21.1 — FEATURES TAB

![Figure 21.1 — Features Tab](assets/product-configuration-tour/tour_21_features.png)

*Figure description: Features tab showing bullet feature entries, icon pickers, headline text, and detailed benefit descriptions.*

1. **Purpose:** Communicates the top value propositions and unique selling points (USPs) of the product in scannable bullet points with visual icons.
2. **Fields:** Feature Headline, Feature Description, Icon Selector (Material, Speed, Precision, Temperature, Quality), Display Order.
3. **Available Options:** 50+ vector iconography presets; custom SVG upload; highlight card formatting.
4. **Admin Usage:** Add 4–6 high-impact features summarizing why a customer should buy this item; select matching vector icons.
5. **Customer Impact:** Renders prominent visual cards right beside or below the product hero image, driving immediate engagement.
6. **Validation:** Maximum 10 features permitted; headline limited to 80 characters.
7. **Dependencies:** Storefront Feature Grid component.
8. **Common Mistakes:** Writing massive essays inside feature headlines; omitting visual icons.

---

### TAB 7: FREQUENTLY ASKED QUESTIONS (FAQS)

### FIGURE 22.1 — FAQS TAB

![Figure 22.1 — FAQs Tab](assets/product-configuration-tour/tour_22_faqs.png)

*Figure description: FAQs tab showing accordion Q&A pairs, category tagging, and customer support deflection fields.*

1. **Purpose:** Addresses common pre-purchase questions, troubleshooting tips, and maintenance guidance, dramatically reducing support tickets.
2. **Fields:** Question Text, Answer Rich Text, FAQ Category Tag, Sort Order, Active Toggle.
3. **Available Options:** Rich text answers supporting hyperlinks, bullet points, and maintenance steps.
4. **Admin Usage:** Enter common questions received by support; provide authoritative, clear answers; organize logically.
5. **Customer Impact:** Rendered in an interactive accordion format on the PDP; indexed by search engines as \`FAQPage\` Schema.
6. **Validation:** Question and Answer fields cannot be blank.
7. **Dependencies:** Storefront FAQ accordion, Google Rich Snippets search results.
8. **Common Mistakes:** Neglecting to answer common compatibility questions (e.g., *"Is this filament compatible with Bambu Lab AMS?"*).

---

### TAB 8: WARRANTY, CARE & SUPPORT

### FIGURE 23.1 — WARRANTY & SUPPORT TAB

![Figure 23.1 — Warranty & Support](assets/product-configuration-tour/tour_23_warranty_support.png)

*Figure description: Warranty and support tab showing warranty duration, terms, storage conditions, and support contact channels.*

1. **Purpose:** Outlines statutory warranty coverage, replacement policies, manufacturer support contacts, and material storage recommendations.
2. **Fields:** Warranty Duration (e.g., *1 Year Manufacturer Warranty*), Warranty Scope (e.g., *Covers manufacturing defects; excludes consumable nozzle wear*), Storage Conditions (e.g., *Store in vacuum-sealed bag with desiccant below 50°C*), Support Email / Phone.
3. **Available Options:** Standard warranty presets (No Warranty, 30-Day Replacement, 6-Month Limited, 1-Year On-Site, 2-Year Enterprise).
4. **Admin Usage:** Select warranty duration preset; specify exclusions and claims procedure; provide official care instructions.
5. **Customer Impact:** Instills buyer confidence and educates customers on preventing filament moisture degradation or printer jam damage.
6. **Validation:** Claims email must follow valid email regex format.
7. **Dependencies:** Storefront Warranty badge, automated invoice terms, customer support claim portal.
8. **Common Mistakes:** Omitting clear moisture-protection instructions on hygroscopic consumables like Nylon/PVA.

---

### TAB 9: SHIPPING & LOGISTICS ENGINE

### FIGURE 24.1 — SHIPPING CONFIGURATION

![Figure 24.1 — Shipping Configuration](assets/product-configuration-tour/tour_24_shipping_configuration.png)

*Figure description: Shipping configuration tab displaying shipping rate mode hierarchy, delivery days string, free shipping overrides, and freight charges.*

### FIGURE 25.1 — DYNAMIC DELIVERY ESTIMATE ENGINE

![Figure 25.1 — Delivery Estimate Engine](assets/product-configuration-tour/tour_25_delivery_estimate.png)

*Figure description: Delivery date preview engine calculating dynamic arrival windows adjusted to Asia/Kolkata (IST) timezone.*

1. **Purpose:** Governs courier shipping fees, rate-calculation hierarchy, freight thresholds, and dynamic customer-facing delivery date estimation.
2. **Fields:** Shipping Mode, Fixed Shipping Fee, Free Shipping Override Flag, Delivery Days Configuration String (\`deliveryDays\`), Fragile Packaging Fee.
3. **Available Options:**
   - Shipping Hierarchy Modes: \`PRODUCT_SPECIFIC\` (Priority 1), \`CATEGORY_BASED\` (Priority 2), \`DEFAULT_GLOBAL\` (Priority 3).
   - Delivery Days Formats: Single integer (e.g., \`5\`), hyphenated range (e.g., \`5-6\` or \`3-5\`).
4. **Admin Usage:**
   - Configure product-specific flat fee or allow category/global rate inheritance.
   - Enter standard transit days string (e.g., enter \`5-6\` for 5 to 6 business days).
5. **Customer Impact:** Storefront renders dynamic delivery dates relative to the customer's current calendar date (e.g., *"Order now for delivery by 26 Sep – 27 Sep"*).
6. **Validation:** Delivery days string must match \`/^\d+$/\` or \`/^\d+\s*-\s*\d+$/\` where $\text{min} < \text{max}$.
7. **Dependencies:** Cart shipping service, checkout payment total, courier manifest booking API.
8. **Common Mistakes:** Entering arbitrary text like *"Fast Delivery"* into the delivery days field, which breaks the dynamic IST date arithmetic engine.

#### Dynamic Delivery Date Arithmetic (IST Timezone)
The 3D Galaxy \`DeliveryEstimateService\` processes delivery strings using exact calendar arithmetic synchronized to Asia/Kolkata:

- **Single Delivery Estimate Configuration:**
  - Input Value: \`5\` (or \`"5 days"\`)
  - Calculated Date: $\text{Current Date} + 5 \text{ Calendar Days}$
  - Example: If ordered on *21 September*, storefront displays: **Delivery by 26 Sep**

- **Range Delivery Estimate Configuration:**
  - Input Value: \`5-6\` (or \`"5 to 6 days"\`)
  - Calculated Range: $\text{Current Date} + 5 \text{ Days}$ to $\text{Current Date} + 6 \text{ Days}$
  - Example: If ordered on *21 September*, storefront displays: **Delivery between 26 Sep – 27 Sep**

#### Shipping Rate Calculation Priority Hierarchy
When calculating checkout shipping fees, the system evaluates rules in strict order of precedence:

$$\text{1. Free Shipping Threshold Check} \longrightarrow \text{2. Product-Specific Rule} \longrightarrow \text{3. Category-Based Rule} \longrightarrow \text{4. Global Default Rate}$$

- **Priority 1: Free Shipping Threshold:** If total cart order value exceeds the global free shipping threshold (e.g., $\ge ₹1,999$), shipping is automatically set to **₹0.00 (Free Shipping)** regardless of lower rules.
- **Priority 2: Product-Specific Shipping:** If the product has a dedicated fixed shipping charge or free shipping flag enabled, that charge applies directly.
- **Priority 3: Category-Based Shipping:** If product shipping is set to default, the system applies the parent category's flat or weight-bracket tariff.
- **Priority 4: Global Default Shipping:** If neither product nor category defines a rate, the store-wide default shipping charge (e.g., ₹99.00 flat) is charged.

---

### TAB 10: RELATED & CROSS-SELL PRODUCTS

### FIGURE 26.1 — RELATED PRODUCTS TAB

![Figure 26.1 — Related Products](assets/product-configuration-tour/tour_26_related_products.png)

*Figure description: Related products configuration tab showing cross-sell item selection, upsell bundles, and compatible hardware attachments.*

1. **Purpose:** Drives cross-selling and up-selling by recommending compatible accessories, replacement parts, or alternative items directly on the PDP.
2. **Fields:** Relationship Type (Cross-sell, Up-sell, Compatible Spare, Alternative), Search & Add Products Selector, Selected Items Table, Reorder Handles.
3. **Available Options:** Manual curation, category-based auto-fill, bidirectional relation toggle.
4. **Admin Usage:** Search for compatible items (e.g., associating hardened steel nozzles and textured PEI sheets with a high-temperature 3D printer); select relation type.
5. **Customer Impact:** Renders *"Frequently Bought Together"* and *"You May Also Like"* carousels on the storefront, prompting multi-item cart additions.
6. **Validation:** Products cannot relate to themselves; maximum 12 related items per product.
7. **Dependencies:** Storefront cross-sell recommendation carousel.
8. **Common Mistakes:** Linking incompatible accessories (e.g., linking a 2.85mm filament to a 1.75mm direct-drive printer).

---

### TAB 11: SEO & DISCOVERABILITY

### FIGURE 27.1 — SEO TAB

![Figure 27.1 — SEO Tab](assets/product-configuration-tour/tour_27_seo.png)

*Figure description: SEO tab showing custom meta title, meta description, canonical URL override, OpenGraph image preview, and Google SERP simulator.*

1. **Purpose:** Maximizes organic search engine rankings, controls how links appear on social media platforms, and prevents duplicate content penalties.
2. **Fields:** Meta Title, Meta Description, Meta Keywords, Canonical URL, OpenGraph Social Image, Robots Meta Indexing Directives (index/noindex, follow/nofollow).
3. **Available Options:** Custom titles, SERP preview toggle, auto-fill from general tab.
4. **Admin Usage:** Enter compelling meta title (under 60 characters); write persuasive meta description (150–160 characters); verify Google search snippet preview.
5. **Customer Impact:** Determines whether searchers click the link on Google; governs appearance when links are shared on WhatsApp, Facebook, or LinkedIn.
6. **Validation:** Meta title capped at 70 chars; meta description capped at 165 chars; canonical URL must be valid URI.
7. **Dependencies:** Server-side rendering (SSR) meta tags, Googlebot crawler index.
8. **Common Mistakes:** Leaving meta descriptions blank; keyword stuffing; allowing staging URLs to remain indexed.

---

## 20. INTERACTIVE LIVE STOREFRONT SIMULATOR

Before saving or publishing changes to a live product, administrators validate their configuration in real time using the built-in simulator.

### FIGURE 28.1 — LIVE STOREFRONT SIMULATOR

![Figure 28.1 — Live Storefront Preview](assets/product-configuration-tour/tour_28_live_preview.png)

*Figure description: Live storefront simulation previewing the customer experience, variant selector swatches, dynamic subtotal calculations, and Add to Cart readiness.*

### Admin Validation Workflow

The **Live Storefront Preview** renders a faithful, real-time replica of the customer-facing Product Detail Page:
- **Variant Selection Preview:** Test clicking every color chip, dropdown item, or weight button to confirm responsive UI updates.
- **Product Image:** Verify that selecting a swatch instantly swaps the hero image to the correct color photo.
- **Product Title & Breadcrumbs:** Confirm title formatting and verify canonical category breadcrumb paths.
- **Price & Discount Verification:** Confirm that the MRP strike-through, selling price, and volume tier discounts compute correctly.
- **Stock Confirmation:** Verify that out-of-stock variants correctly show unavailable badges and block the Add to Cart button.
- **Bundle Selection:** Test multi-slot selection in bundle builder configurations.
- **Quantity Stepper:** Test quantity increments and verify subtotal calculations.
- **Subtotal & Add to Cart Readiness:** Confirm that the simulated Add to Cart action succeeds with no validation errors.

> [!IMPORTANT]
> ### PRE-PUBLISHING MANDATE
> Always conduct a full functional dry run on the Live Preview tab before setting a product to "Active" status. Catching pricing typos or unmapped swatches here prevents embarrassing live customer errors.

---

## 21. RAPID CONFIGURATION QUALITY GATE & CHECKLIST

### FIGURE 29.1 — RAPID CONFIGURATION CHECKLIST

![Figure 29.1 — Quick Tour Card](assets/product-configuration-tour/tour_29_quick_tour_card.png)

*Figure description: Rapid configuration checklist summarizing all 10 mandatory pre-flight verification steps before publishing.*

### 10-Point Pre-Flight Verification Gate

Before setting any product to **Active (Published)** status in the Catalog Registry, administrators must complete this verification checklist:

| Step # | Verification Item | Inspection Criteria | Passed? |
| :---: | :--- | :--- | :---: |
| **01** | **Product Identity** | Title is descriptive; URL slug is unique lowercase kebab-case. | [ ] |
| **02** | **Category Mapping** | At least one category assigned; 1 Primary Category designated. | [ ] |
| **03** | **Pricing Audit** | Sale Price $\le$ MRP; Dealer Price configured if wholesale item. | [ ] |
| **04** | **Inventory Counter** | Warehouse physical stock accurately entered; track inventory enabled. | [ ] |
| **05** | **Variant Integrity** | Display Type matches option count; 1 in-stock variant set as Default. | [ ] |
| **06** | **Matrix SKUs** | Every combination matrix row has a unique SKU and gross weight. | [ ] |
| **07** | **Image Mapping** | Every variant swatch is mapped to a high-resolution square photo. | [ ] |
| **08** | **Weight & Shipping** | Gross mass entered in grams; delivery days string formatted correctly. | [ ] |
| **09** | **SEO & Metadata** | Meta title (<60 chars) and meta description (<160 chars) complete. | [ ] |
| **10** | **Live Preview Dry Run** | Simulated swatch clicks, price updates, and Add-to-Cart all pass. | [ ] |

---

## 22. MASTER TROUBLESHOOTING & RECOVERY DIRECTORY

| Symptom / Error | Root Cause | Immediate Admin Remediation |
| :--- | :--- | :--- |
| **Product missing from category pages** | No category assigned or category inactive | Open Tab 1; search and check relevant category; designate primary node; save. |
| **PDP displays blank price or "NaN"** | Combination matrix has empty sale price | Open Tab 2; audit Combination Matrix; populate missing price cells. |
| **Clicking swatch does not update photo** | Gallery image not mapped to variant value | Open Tab 3; select photo; assign matching variant value from dropdown. |
| **Delivery date shows fallback or error** | Invalid text in \`deliveryDays\` field | Open Tab 9; replace text with clean format like \`5\` or \`5-6\`. |
| **Shipping undercharged on multi-item orders** | Variant weight left blank (0 grams) | Open Tab 2; enter verified gross weight in grams on every matrix row. |
| **PDP loads with "Out of Stock" button** | Default variant has 0 stock | Open Tab 2; change the Default radio button to an in-stock variant. |
| **"Duplicate URL Slug" error on save** | Another product already uses this slug | Open Tab 1; modify URL slug by appending model number or series code. |

---

## 23. DOCUMENT ACCEPTANCE & SIGN-OFF

This **3D Galaxy Product Configuration Administration Guide** has been authored, verified against production code models, and delivered by the **AJR Digital Hub Engineering Team** for the operational management of the **3D Galaxy E-Commerce Platform**.

| Authority | Representative Name | Title / Organization | Signature & Date |
| :--- | :--- | :--- | :--- |
| **Delivered By** | AJR Digital Hub Team | Lead Enterprise Solutions Architect, AJR Digital Hub | ____________________ |
| **Accepted By** | 3D Galaxy Team | Operations & Catalog Administration Lead, 3D Galaxy | ____________________ |

*Document Reference: \`DOC-3DG-PRD-ADMIN-2026-V2.0\` • 3D Galaxy Enterprise Admin Portal • September 2026*
`;

fs.writeFileSync(MD_OUTPUT_GUIDE, content, 'utf8');
fs.writeFileSync(MD_OUTPUT_MASTER, content, 'utf8');
fs.writeFileSync(MD_OUTPUT_TOUR, content, 'utf8');

console.log('Successfully written clean markdown guides to:');
console.log(' - ' + MD_OUTPUT_GUIDE);
console.log(' - ' + MD_OUTPUT_MASTER);
console.log(' - ' + MD_OUTPUT_TOUR);
