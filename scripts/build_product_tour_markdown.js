const fs = require('fs');
const path = require('path');

const MD_PATH = path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Visual_Tour_Guide.md');

const content = `# 3D GALAXY
## PRODUCT CONFIGURATION VISUAL TOUR GUIDE
### Visual Step-by-Step Training & Field Reference Manual with Numbered Screen Highlights, Dropdown Tours, Storefront Impact, and Operational Checklists

<p align="center">
  <img src="assets/product-configuration-tour/ajr_digital_hub_logo.png" alt="AJR Digital Hub Logo" width="170"/>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="assets/product-configuration-tour/3d_galaxy_logo.png" alt="3D Galaxy Logo" width="113"/>
</p>

---

### DOCUMENT CONTROL & GOVERNANCE

| Document Attribute | Specification Details |
| :--- | :--- |
| **Document Title** | 3D Galaxy – Product Configuration Visual Tour Guide |
| **Document Subtitle** | Visual Step-by-Step Training & Field Reference Manual with Numbered Screen Highlights |
| **Document Identifier** | \`DOC-3DG-PRD-TOUR-2026-V1.0\` |
| **Release Version** | 1.0 (Production Master) |
| **Publication Date** | September 2026 |
| **Document Scope** | 28-Step Visual Workflow, 11 Display Types, 6 Selection Modes, Numbered UI Highlights, Input Rules |
| **Delivered By** | **AJR Digital Hub Team** (Enterprise Solutions & Full-Stack Architecture) |
| **Delivered To / Accepted By** | **3D Galaxy Team** (E-Commerce Operations & Catalog Administration) |
| **Target Audience** | Store Administrators, Catalog Managers, Fulfillment Supervisors, Support Personnel |

---

### Document Revision History

| Version | Release Date | Author / Entity | Summary of Operational Scope |
| :--- | :--- | :--- | :--- |
| **0.1** | Sep 18, 2026 | AJR Digital Hub Engineering | UI wireframe audit, Angular reactive signal extraction, and numbered coordinate mapping. |
| **0.5** | Sep 19, 2026 | AJR Digital Hub Solutions | Dropdown opened state views, Cartesian matrix walkthrough, and delivery date formulas. |
| **1.0** | Sep 21, 2026 | AJR Digital Hub Delivery Team | Comprehensive Visual Tour Guide: 28 sequential steps, 29 annotated figures, dropdown guides, field tables, and quick visual summary. |

---

## 1. EXECUTIVE SUMMARY & VISUAL TOUR CONCEPT

The **Product Configuration Visual Tour Guide** is designed to transform complex multi-dimensional e-commerce setup into an intuitive, visual learning experience. Unlike traditional text-heavy reference documentation, this manual allows any administrator—from a newly onboarded team member to a veteran catalog manager—to:

$$\text{LOOK AT ANNOTATED SCREENSHOT} \longrightarrow \text{IDENTIFY NUMBERED HIGHLIGHT ①} \longrightarrow \text{READ FIELD GUIDE} \longrightarrow \text{VERIFY STOREFRONT IMPACT}$$

### Core Operational Responsibilities of Product Configuration
Product configuration is the single nerve center of the 3D Galaxy e-commerce platform. A single entry affects the entire operational flow:

\`\`\`
[ADMIN CONFIGURATION] 
       │
       ▼
[CATALOG TAXONOMY] ──► Search, Filtering, Category Pages, Breadcrumbs
       │
       ▼
[PRICING & STOCK] ──► B2C Retail Price, B2B Dealer Overrides, Cart Subtotal
       │
       ▼
[CARTESIAN VARIANTS] ─► Swatch Switchers, Permutation SKUs, In-Stock Locks
       │
       ▼
[LOGISTICS & TARE] ──► Weight Calculations, Shipping Modes, Dynamic IST Delivery Windows
       │
       ▼
[CHECKOUT & FULFILLMENT] ──► Razorpay/COD Gateway, Invoice Generation, Courier Manifests
\`\`\`

> [!WARNING]
> **OPERATIONAL RISK WARNING: MISCONFIGURATION IMPACT**
> - **Omitted Category:** The product vanishes from storefront navigation and category filters.
> - **Ambiguous Default Variant:** The storefront renders blank swatches or defaults to an out-of-stock SKU.
> - **Uncalibrated Variant Weight:** Multi-spool orders are undercharged for shipping, causing courier freight losses.
> - **Inaccurate Delivery Days String:** Customers receive invalid delivery estimates, increasing support tickets.

---

## 2. VISUAL FIELD TYPE LEGEND

Every screenshot in this manual utilizes standardized visual markers. Before starting the tour, familiarize yourself with these indicators:

| Visual Marker | Symbol / Appearance | Operational Meaning & Usage |
| :--- | :--- | :--- |
| **Orange Bounding Box** | 🟠 \`#ea580c\` Solid Outline | Highlights the primary active field or section being configured in the current step. |
| **Blue Bounding Box** | 🔵 \`#0284c7\` Solid Outline | Highlights related configurations, dependent inputs, or secondary settings. |
| **Numbered Circular Badge** | ①, ②, ③, ④... | Points directly to a specific control. Matches the exact number in the Field Guide table below. |
| **Dropdown Indicator** | ▼ Dropdown Menu | Signifies a configurable select control. Consult the opened dropdown visual and options table. |
| **Checkbox Toggle** | ☑ / ☐ Checkbox | Boolean flag (True/False). Enables or disables specific functional behaviors. |
| **Default Selection Star** | ★ Star / Radio Badge | Identifies the default variant loaded automatically when a customer views the PDP. |

---

## STEP 01 — CREATE PRODUCT / CATALOG REGISTRY CONSOLE

The Catalog Registry console is the operational headquarters where all products, SKUs, inventory counts, dealer rates, and catalog actions are monitored.

![Figure 1.1 — Catalog Registry Console](assets/product-configuration-tour/tour_01_catalog_registry.png)
*Figure 1.1 — Catalog Registry Console displaying search filters, register SKU button, stock pills, and quick action icons.*

### Field Guide — Catalog Registry Console

| Marker | Control Name | Control Type | Recommended Usage | Customer Impact | Admin Verification |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **①** | **Search Catalog** | Search Input | Enter product title, SKU barcode, or keyword to filter the active catalog in real time. | None (Admin only). | Verify instant reactive filtering without page reload. |
| **②** | **Register SKU** | Action Button | Click to open a blank Product Configuration form and register a brand-new catalog item. | Creates new sellable item on the live storefront. | Ensure previous drafts are saved before registering a new SKU. |
| **③** | **Category Column** | Display Label | Shows the primary assigned category classification (e.g. \`3D PRINTERS\`, \`FILAMENTS\`). | Dictates category menu placement and search faceting. | Check that item is not uncategorized. |
| **④** | **Stock Status Pill** | Status Badge | Green (\`IN STOCK\`), Yellow (\`LOW STOCK (<5)\`), or Red (\`OUT OF STOCK (0)\`). | Determines customer "Add to Cart" availability. | Audit physical shelf counts against displayed numbers. |
| **⑤** | **Retail / Dealer Price** | Currency Value | Compares standard retail selling price against authorized dealer rate (green text). | Retail price is charged at checkout; dealer rate is visible to approved B2B accounts. | Ensure retail price exceeds dealer price for positive B2B margin. |
| **⑥** | **Actions Toolbar** | Icon Actions | Lightning (Quick Toggle), Pencil (Edit Product), Trash (Soft Delete item). | Edit updates storefront; delete archives item from live view. | Always edit via Pencil for comprehensive multi-tab changes. |

> [!TIP]
> **WHAT SHOULD I ENTER?**
> - **When creating a product:** Click **REGISTER SKU** (Marker ②) to initiate registration.
> - **When searching:** Enter the base model name (e.g. \`Kobra\`, \`Photon\`, \`PLA\`) to quickly audit existing SKUs and avoid duplicate creation.

---

## STEP 02 — CONFIGURE GENERAL PRODUCT IDENTITY

The General tab establishes the core brand identity, indexing URLs, barcodes, and editorial summaries of the product.

![Figure 2.1 — General Product Identity](assets/product-configuration-tour/tour_02_general_identity.png)
*Figure 2.1 — Product General tab with Title, URL Slug, SKU / Barcode, Short Summary, and Rich Text Description.*

### Field Guide — Product Identity

| Marker | Field Name | Input Type | Required | Recommended Entry | Customer Impact | Admin Check |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| **①** | **Product Title** | Text Input | **YES** | \`Anycubic Kobra Neo 3D Printer (Auto-Leveling)\` | Main H1 heading on PDP, listing cards, search results, and order emails. | Capitalize properly; avoid internal warehouse jargon. |
| **②** | **URL Slug** | Text Input | **YES** | \`anycubic-kobra-neo-3d-printer\` | Browser URL bar (\`/products/anycubic-kobra-neo\`) and Google organic SEO. | Lowercase alphanumeric only with hyphens. Must be globally unique. |
| **③** | **SKU / Barcode** | Text Input | **YES** | \`3DG-PRN-ANY-KOBRA-NEO\` | Printed on warehouse packing slips, invoices, and shipping labels. | Follow naming standard: \`3DG-[CAT]-[BRD]-[MODEL]\`. |
| **④** | **Short Description** | Textarea | **YES** | 2-sentence summary answering key customer benefits and core specs. | Displayed immediately below the price on PDP and in Google snippet. | Keep between 120 and 180 characters. |
| **⑤** | **Full Description Editor** | Rich Text | No | Comprehensive technical specifications, unboxing guides, and operating tips. | Rendered in the main "Overview" tab on the storefront PDP. | Use headings, clean bullet points, and high-res imagery. |

<div class="tour-box">
  <div class="tour-box-title">WHAT SHOULD I ENTER? — PRODUCT TITLE & SLUG</div>
  <p><strong>Recommended:</strong> <code>Creality Ender-3 V3 SE High-Speed 3D Printer</code></p>
  <p><strong>Avoid:</strong> <code>ender3</code> or <code>Product 123</code></p>
  <p><strong>Operational Rationale:</strong> Descriptive titles with brand and model drastically increase Google click-through rates and prevent customer ordering errors.</p>
</div>

<div class="tour-box" style="border-left-color: #0284c7;">
  <div class="tour-box-title" style="color: #0284c7;">WHAT HAPPENS IF I CHANGE THE URL SLUG?</div>
  <p>Changing the URL slug of an existing product changes its public web address. Any external links, Google indexed pages, or bookmarked URLs will produce a <strong>404 Not Found</strong> error unless an HTTP 301 redirect is configured in the routing layer.</p>
</div>

---

## STEP 03 — MULTI-CATEGORY CLASSIFICATION & AUTO-SELECTION

The Category selector controls storefront taxonomy, navigation menus, breadcrumb trails, and category-level discount rules.

![Figure 3.1 — Multi-Category Selector](assets/product-configuration-tour/tour_03_category_selector.png)
*Figure 3.1 — Category selector showing search input, bulk actions, checkboxes, primary radio button, and active tag pills.*

### Field Guide — Category Architecture

| Marker | Control Name | Type | Recommended Entry | Customer Impact | Operational Rationale |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **①** | **Category Search** | Search Input | Enter keyword (e.g. \`Filament\`, \`Resin\`, \`Nozzle\`). | None (Admin only). | Quickly locates specific taxonomy nodes in large catalogs (>50 categories). |
| **②** | **Select All** | Button | Click when an item belongs across an entire group (e.g. \`All Accessories\`). | Displays item across all matching category listing pages. | Use with caution to avoid catalog clutter. |
| **③** | **Clear All** | Button | Resets all selected category checkboxes to zero. | Removes item from all category listings. | Use when re-classifying a misplaced product. |
| **④** | **Category Checkboxes** | Checkboxes | Check all applicable categories (e.g. \`3D Printers\` + \`FDM Printers\` + \`Featured\`). | Item appears in multi-category filter results on the storefront. | Always check at least one parent category. |
| **⑤** | **Primary Radio** | Radio Button | Select the single canonical category for breadcrumb navigation. | Dictates breadcrumb trail: \`Home > 3D Printers > FDM Printers > Item\`. | Exactly ONE primary category must be designated. |
| **⑥** | **Selected Badges** | Tag Pills | Shows active selections with removable \`×\` chips. | Visual feedback of all tagged categories. | Verify primary category has highlighted border. |

---

## STEP 04 — CONFIGURE BRAND ALLIANCE

Assigning a verified brand links the product to manufacturer partner pages, warranties, and storefront brand filtering.

![Figure 4.1 — Brand Alliance Selector](assets/product-configuration-tour/tour_04_brand_alliance.png)
*Figure 4.1 — Brand selector dropdown showing manufacturer alliance, authorized dealer status, and storefront badge preview.*

### Field Guide — Brand Alliance

| Marker | Field Name | Type | Required | Recommended Entry | Customer Impact |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **①** | **Brand Dropdown** | Dropdown | **YES** | Select authorized brand (e.g. \`Anycubic\`, \`Creality\`, \`eSUN\`, \`Sunlu\`). | Displays official manufacturer logo and badge on PDP. |
| **②** | **Manufacturer Partner** | Read-Only | Auto | Displays registered partner legal entity and distributor region. | Boosts customer credibility and trust in genuine parts. |
| **③** | **Storefront Brand Badge** | Preview | Auto | Live preview of brand filter tag on collection pages. | Customers filtering by brand will discover this product. |

---

## STEP 05 — CONFIGURE PRICING (MRP, RETAIL & DEALER RATES)

Pricing configuration governs B2C commercial retail prices, anchor strikethroughs, and wholesale authorized dealer margins.

![Figure 5.1 — Pricing Configuration](assets/product-configuration-tour/tour_05_pricing.png)
*Figure 5.1 — Pricing inputs showing MRP anchor, Retail Sale Price, Authorized Dealer Price, and calculated customer savings.*

### Field Guide — Pricing Architecture

| Marker | Field Name | Type | Required | Example | Customer Impact | Admin Verification |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| **①** | **MRP (Maximum Retail)** | Currency | **YES** | \`₹24,999\` | Displayed as strikethrough anchor price (\`~₹24,999~\`). | Must be strictly $\ge$ Retail Sale Price. |
| **②** | **Retail Sale Price** | Currency | **YES** | \`₹18,499\` | The actual amount charged to standard retail customers. | This value is passed to Cart, Checkout, and Razorpay. |
| **③** | **Authorized Dealer Rate** | Currency | No | \`₹15,200\` | Charged only to verified B2B dealer logins. | Must provide a healthy wholesale distribution margin. |
| **④** | **Savings Banner** | Auto Pill | Auto | \`Save ₹6,500 (26% OFF)\` | Rendered prominently in green next to the price on PDP. | Automatically computed: \`MRP - Retail Sale Price\`. |

<div class="tour-box">
  <div class="tour-box-title">WHAT HAPPENS IF I CHANGE THIS? — RETAIL SALE PRICE</div>
  <p>Updating the Retail Sale Price immediately updates the storefront catalog card, PDP price, and any active cart sessions where the item has not yet been paid. If a customer is in checkout, the server re-validates the price before accepting payment to prevent stale price checkouts.</p>
</div>

---

## STEP 06 — CONFIGURE PHYSICAL INVENTORY & STOCK POLICIES

Inventory configuration prevents overselling while ensuring high availability for additive manufacturing consumables.

![Figure 6.1 — Inventory Configuration](assets/product-configuration-tour/tour_06_inventory.png)
*Figure 6.1 — Physical stock count, active status switch, and out-of-stock storefront policy settings.*

### Field Guide — Inventory Management

| Marker | Field Name | Type | Required | Recommended Entry | Operational Behavior |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **①** | **Physical Stock Count** | Integer | **YES** | Current shelf count (e.g. \`45\`). | Decrements automatically upon successful checkout order confirmation. |
| **②** | **Active Toggle** | Switch | **YES** | \`Active: True\` | When toggled OFF, item is instantly hidden from search and catalog. |
| **③** | **Out of Stock Policy** | Radio | **YES** | \`Disable Selection & Show Sold Out\` | Prevents orders when stock reaches \`0\`. Optional: Allow Backorders. |

---

## STEP 07 — VARIANT GROUP ARCHITECTURE HEADER

The Variant Engine allows complex engineering assets (e.g. Filaments with Material $\times$ Spool Weight $\times$ Color) to be configured cleanly.

![Figure 7.1 — Variant Group Architecture Header](assets/product-configuration-tour/tour_07_variant_group_header.png)
*Figure 7.1 — Variant group manager showing group name, display label, display mode, selection mode, and active rules.*

### Field Guide — Variant Group Header

| Marker | Field Name | Type | Required | Recommended Entry | Operational Scope |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **①** | **+ Add Variant Group** | Button | — | Click to add an additional dimension (e.g. Material, Spool Size). | Creates a new group for multi-dimensional Cartesian permutations. |
| **②** | **Variant Name (Internal)** | Text | **YES** | \`Filament Color\` | Internal administration label used in warehouse matrices. |
| **③** | **Display Name (Frontend)** | Text | **YES** | \`Choose Spool Color:\` | Visible customer label rendered above the swatches on the PDP. |
| **④** | **Variant Type & Mode** | Dropdown | **YES** | Select UI style (e.g. \`Color Chips\`, \`Chip Selector\`). | Dictates visual presentation component on the storefront. |
| **⑤** | **Selection Mode** | Dropdown | **YES** | Select logic (e.g. \`Single Selection\`, \`Bundle Selection\`). | Dictates selection rules and quantity slot constraints. |
| **⑥** | **Required Field** | Checkbox | **YES** | Checked (\`true\`) | Customer must make a selection before "Add to Cart" is enabled. |
| **⑦** | **Active Status** | Checkbox | **YES** | Checked (\`true\`) | Enables or disables this entire variant dimension on the PDP. |
| **⑧** | **Allow Duplicates** | Checkbox | No | Checked for Bundles | Allows customer to select the same color multiple times in bundle slots. |

---

## STEP 08 — DROPDOWN TOUR: ALL 11 VARIANT DISPLAY TYPES

The 3D Galaxy Variant Engine includes **11 verified display types** implemented in \`src/app/core/models/variant-engine.model.ts\`.

![Figure 8.1 — Variant Display Type Dropdown Open](assets/product-configuration-tour/tour_08_display_types_dropdown.png)
*Figure 8.1 — Opened Variant Type & Display Mode dropdown highlighting all 11 verified operational display styles.*

### Option Reference Table — The 11 Verified Display Types

| # | Display Type Identifier | Frontend UI Component | Recommended Use Cases | Customer Experience | Cart & Checkout Impact |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **①** | \`chip\` | Rounded pill buttons | Standard sizes (XS, S, M, L), Nozzle diameters (0.4mm, 0.6mm), Material types (PLA, PETG). | Customer clicks crisp pill buttons with active orange border. | Appends selected attribute text to line item title. |
| **②** | \`dropdown\` | HTML \`<select>\` menu | Extensive compatibility lists (> 10 items), printer spare parts, machine models. | Compact dropdown menu saves vertical space on PDP. | Passes selected option value as line item attribute. |
| **③** | \`image\` | Photo thumbnail chips ($64\times 64\text{px}$) | Multi-color printed model variants, textured build plates, special edition chassis colors. | Customer sees miniature photo preview inside each selector button. | Line item thumbnail switches to match selected variant image. |
| **④** | \`card\` | Rich hardware cards with subtitles & bullets | Hardware combo packages (Printer Only, Combo with AMS, Complete Workshop Kit). | Large interactive cards showing package contents and bullet points. | Updates base price and shipping dimensions to match package. |
| **⑤** | \`radio-chips\` | Pill button with circular radio dot | Mutually exclusive hardware parameters (110V vs 220V power supply, single vs dual extruder). | Clear radio button dot indicates single-choice mutual exclusivity. | Locks configuration to exactly one selection. |
| **⑥** | \`color-chips\` | Circular color dots ($32\text{px}$) with hex swatches | Filament colors (PLA, ABS, PETG), resin dyes, colored replacement housings. | Customer clicks circular swatches rendered in exact manufacturer hex codes. | Swatch selection triggers dynamic photo gallery image switch. |
| **⑦** | \`button-group\` | Horizontal segmented bar | Print quality presets (Draft 0.28mm, Standard 0.20mm, Fine 0.12mm), infill steps (20%, 50%, 100%). | Segmented tabs connected horizontally as a single unified bar. | Ideal for sequential technical parameters. |
| **⑧** | \`bundle-builder\` | Radio cards + modular slots | Tiered volume bundles ("Buy 3 Spools", "Buy 5 Spools") with customizable color slots. | Customer picks a bundle tier, unlocking modular slots to select individual colors. | Bundle item price overrides per-unit price; creates nested order payload. |
| **⑨** | \`weight-selector\` | Preset weight chips + custom numeric box | Spool weights (250g, 500g, 1kg, 2.5kg, 5kg) plus custom bulk spool orders. | Customer clicks preset weight or types custom weight in grams/kilograms. | Unit weight is dynamically multiplied against courier freight rate. |
| **⑩** | \`quantity-selector\` | Numeric stepper with volume discount tiers | Bulk wholesale consumables, replacement nozzle packs (Pack of 5, 10, 20). | Stepper controls (\`-\` / \`+\`) with instant tiered discount callouts. | Automatically calculates volume discount percentage. |
| **⑪** | \`grid-cards\` | 2-column responsive visual cards | Modular 3D printer accessories, upgrade kits (Hotend kit, PEI sheet, Wi-Fi camera). | Visual grid layout with title, image, and price add-on badge. | Each card acts as an optional or required bundled component. |

---

## STEP 09 — DROPDOWN TOUR: ALL 6 SELECTION MODES

Selection Modes define how many items a customer can choose and how bundle pricing or weight rules are applied.

![Figure 9.1 — Selection Mode Dropdown Open](assets/product-configuration-tour/tour_09_selection_modes_dropdown.png)
*Figure 9.1 — Opened Selection Mode dropdown highlighting all 6 verified operational selection modes.*

### Option Reference Table — The 6 Verified Selection Modes

| # | Selection Mode Identifier | Operational Definition | Customer Experience | Pricing & Stock Logic |
| :-: | :--- | :--- | :--- | :--- |
| **①** | \`single\` | **Single Selection (Choose 1):** Customer selects exactly one option from the group. | Standard radio/chip behavior. Clicking an option de-selects previous. | Standard line item price. Stock checks selected permutation. |
| **②** | \`bundle\` | **Bundle Selection (Buy $N \to$ Slots):** Unlocks $N$ modular slot pickers based on tier. | Customer selects tier (e.g. 3 Spools), then fills Slot 1, Slot 2, Slot 3. | Tier bundle price overrides unit price. Decrements stock across all chosen slots. |
| **③** | \`weight\` | **Weight Based (kg / g variants):** Price and shipping scale dynamically by weight. | Customer selects weight unit; price adjusts proportionally. | Courier freight calculates: $\text{Weight (kg)} \times \text{Courier Rate}$. |
| **④** | \`multiple\` | **Multiple Selection (Choose up to $N$):** Multi-check compatible accessories. | Checkbox-style chips allowing multiple simultaneous selections. | Sums prices of all selected add-ons into line item total. |
| **⑤** | \`quantity\` | **Quantity Based Variant:** Price adjusts based on quantity thresholds. | Quantity selector highlights volume savings (e.g. "Buy 5+ for 15% off"). | Stepped volume discount formula applied at checkout. |
| **⑥** | \`package\` | **Starter Kit Builder:** Hardware unit bundled with mandatory accessories. | Customer chooses base printer and configures mandatory starter filament. | Combines hardware SKU with consumable SKUs in packing slip. |

---

## STEP 10 — CONFIGURE VARIANT VALUES & HEX SWATCHES

Variant values represent individual options (e.g. Red, Blue, Green, 0.4mm, 1kg) within a variant group.

![Figure 10.1 — Variant Values Builder](assets/product-configuration-tour/tour_10_variant_values.png)
*Figure 10.1 — Variant values manager showing option names, value pills, hex color pickers, and reorder controls.*

### Field Guide — Variant Values

| Marker | Control Name | Type | Recommended Entry | Customer Experience |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Option Name** | Text Input | \`Color\` or \`Nozzle Size\` | Rendered as group label on PDP. |
| **②** | **Value Pills** | Tag Chips | \`Fire Red\`, \`Galaxy Blue\`, \`Matte Black\` | Rendered as selectable options on the storefront. |
| **③** | **+ Add Value** | Action Button | Type value name and click \`+\` or press Enter. | Appends new option to the permutation matrix. |
| **④** | **Remove Value** | Icon Button | Click \`×\` on pill to delete. | Deletes option and associated matrix permutations. |
| **⑤** | **Hex Swatch Picker** | Color Picker | Select exact hex (e.g. \`#DC2626\` for Fire Red). | Renders rich color dot on storefront Color Chips. |

---

## STEP 11 — CONFIGURE VARIANT-SPECIFIC PRICING

When specific variants have higher manufacturing costs (e.g. Carbon Fiber Filament vs Standard PLA), variant-specific pricing overrides the base price.

![Figure 11.1 — Variant Specific Pricing Overrides](assets/product-configuration-tour/tour_11_variant_pricing.png)
*Figure 11.1 — Combination matrix columns for Variant MRP, Variant Sale Price, and Authorized Dealer overrides.*

### Field Guide — Pricing Overrides

| Marker | Column Name | Type | Recommended Entry | Customer & Financial Impact |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Variant MRP** | Currency | \`₹1,499\` | Anchor strikethrough updates when customer selects this variant. |
| **②** | **Variant Sale Price** | Currency | \`₹1,199\` | Customer is charged this specific price instead of base product price. |
| **③** | **Dealer Override** | Currency | \`₹950\` | Authorized wholesale accounts receive this tailored B2B rate. |
| **④** | **Permutation SKU** | Text | \`3DG-FIL-PLA-RED-1KG\` | Dedicated inventory SKU sent to warehouse picking slips. |

---

## STEP 12 — CONFIGURE VARIANT-LEVEL STOCK INVENTORY

Tracking stock at the individual permutation level prevents out-of-stock orders for popular colors while keeping available colors sellable.

![Figure 12.1 — Variant Level Stock Inventory](assets/product-configuration-tour/tour_12_variant_stock.png)
*Figure 12.1 — Combination matrix stock inputs showing available counts, low-stock warnings, and out-of-stock locks.*

### Field Guide — Variant Stock Management

| Marker | Control Name | Type | Recommended Entry | Storefront Behavior |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Permutation Stock** | Integer | Physical shelf count (e.g. \`18\`). | Deducts automatically upon successful order payment. |
| **②** | **Available Status** | Pill | Green \`IN STOCK\` (count $> 5$). | Normal instant "Add to Cart" button. |
| **③** | **Out of Stock Lock** | Pill | Red \`OUT OF STOCK\` (count $= 0$). | Swatch is crossed out; "Add to Cart" disabled; displays "Sold Out". |

---

## STEP 13 — CONFIGURE VARIANT WEIGHT & TARE MULTIPLIERS

Variant weight overrides the base product weight, ensuring accurate courier shipping charges for variable-sized items (e.g. 250g vs 1kg spools).

![Figure 13.1 — Variant Weight Configuration](assets/product-configuration-tour/tour_13_variant_weight.png)
*Figure 13.1 — Variant weight inputs showing net weight in grams, packaging tare factor, and courier freight calculation.*

### Field Guide — Weight Calculation

| Marker | Field Name | Type | Recommended Entry | Courier & Shipping Impact |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Variant Weight** | Number | \`1000\` (for 1kg spool). | Overrides base weight when this variant is selected. |
| **②** | **Tare Unit** | Select | \`Grams (g)\` or \`Kilograms (kg)\`. | Automatically converted to kg ($1000\text{g} = 1\text{kg}$) for courier APIs. |
| **③** | **Shipping Multiplier** | Formula | $\text{Unit Weight} \times \text{Quantity}$. | Multi-item orders sum total weight: $1.2\text{kg} \times 4 = 4.8\text{kg}$. |

---

## STEP 14 — VARIANT IMAGE LINKING & DYNAMIC GALLERY SWITCHING

Mapping specific product photos to color variants provides instant visual confirmation on the storefront when a customer clicks a swatch.

![Figure 14.1 — Variant Image Mapping](assets/product-configuration-tour/tour_14_variant_image_mapping.png)
*Figure 14.1 — Image-to-variant linking console showing gallery thumbnails, linked variant tags, and active swatch indicators.*

### Field Guide — Image-to-Variant Mapping

| Marker | Control Name | Type | Action Required | Customer PDP Behavior |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Hero Photo** | Image | Designate as primary product photo. | Initial image displayed on collection page cards. |
| **②** | **Gallery Photo 2** | Image | Upload high-res photo of specific variant (e.g. Red spool). | Rendered in PDP gallery carousel. |
| **③** | **Link Variant Dropdown** | Dropdown | Select matching variant (e.g. \`Fire Red\`). | Creates two-way binding between image and swatch. |
| **④** | **Active Linked Swatch** | Tag Badge | Confirms mapping: \`Linked to: Fire Red\`. | **When customer clicks "Red" swatch $\to$ gallery flips to this photo!** |

---

## STEP 15 — CONFIGURE DEFAULT VARIANT FOR INITIAL STOREFRONT LOAD

Exactly ONE variant must be designated as the default variant. This variant controls the initial price, stock status, weight, and image loaded when a customer arrives on the PDP.

![Figure 15.1 — Default Variant Designation](assets/product-configuration-tour/tour_15_default_variant.png)
*Figure 15.1 — Combination matrix showing default radio star selector and active initial storefront state.*

### Field Guide — Default Variant Selection

| Marker | Control Name | Type | Operational Rule | Storefront Impact |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Default Star / Radio** | Radio Button | **Select exactly ONE row as default.** | Prevents blank swatches or unselected states on page load. |
| **②** | **Default Permutation** | Title Label | Select your best-selling in-stock variant. | Initial variant highlighted with active orange border. |
| **③** | **Initial Price & Stock** | Display | Must reflect verified in-stock inventory. | Initial price displayed on listing card matches this default row. |

> [!CAUTION]
> **CRITICAL RULE: NEVER FLAG AN OUT-OF-STOCK VARIANT AS DEFAULT!**
> If an out-of-stock variant is marked as default, customers arriving on the product page will immediately see a **"SOLD OUT"** button, leading to abandoned sessions even if other variants have abundant stock.

---

## STEP 16 — CARTESIAN COMBINATION MATRIX MANAGEMENT

The Combination Matrix automatically computes the Cartesian product of all active variant groups ($G_1 \times G_2 \times \dots \times G_n$).

![Figure 16.1 — Cartesian Combination Matrix](assets/product-configuration-tour/tour_16_combination_matrix.png)
*Figure 16.1 — Full Cartesian Combination Matrix table showing permutation rows, individual SKUs, barcodes, prices, and stock.*

### Field Guide — Combination Matrix Columns

| Marker | Column Name | Field Type | Purpose & Verification Standard |
| :---: | :--- | :--- | :--- |
| **①** | **Default** | Radio Button | Exactly one row marked \`isDefault: true\`. |
| **②** | **Status** | Toggle Switch | Deactivate un-manufactured or discontinued permutations without deleting historical records. |
| **③** | **Permutation** | Text Label | Auto-generated title (e.g. \`PLA + 1kg + Galaxy Blue\`). |
| **④** | **SKU** | Text Input | Unique warehouse barcode tracking code (\`3DG-PLA-1KG-BLU\`). |
| **⑤** | **MRP** | Currency Input | Anchor maximum retail price for this specific combination. |
| **⑥** | **Sale Price** | Currency Input | Commercial selling rate charged at checkout. |
| **⑦** | **Stock** | Number Input | Available physical stock count on warehouse shelves. |
| **⑧** | **Weight** | Number Input | Tare-inclusive shipping weight in grams. |
| **⑨** | **Actions** | Action Icons | Quick edit row or delete unused permutation. |

---

## STEP 17 — CONFIGURE BUNDLE BUILDER & TIER TIERS

The Bundle Builder allows customers to buy predefined quantities (e.g. "Buy 3 Get 10% Off", "Buy 5 Get 20% Off") while choosing their preferred colors into modular slots.

![Figure 17.1 — Bundle Builder Tier Manager](assets/product-configuration-tour/tour_17_bundle_builder.png)
*Figure 17.1 — Bundle builder tier configuration showing tier names, slot quantities, pricing modes, and savings tags.*

### Field Guide — Bundle Tier Configuration

| Marker | Field Name | Type | Recommended Entry | Commercial Impact |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Tier Name** | Text Input | \`Buy 3 Spools (Starter Pack)\` | Displayed as clickable tier card on PDP. |
| **②** | **Quantity** | Integer | \`3\` | Unlocks exactly 3 color selection slots for the customer. |
| **③** | **Pricing Mode** | Dropdown | \`Fixed Bundle Price\` | Charges fixed flat rate regardless of individual variant prices. |
| **④** | **Bundle Price** | Currency | \`₹2,999\` (saves ₹598 vs unit rate). | Effective bundle rate charged to customer. |
| **⑤** | **Savings Badge** | Text Input | \`SAVE 15%\` | Green highlight badge on tier card. |
| **⑥** | **Tag / Banner** | Text Input | \`BEST VALUE\` or \`POPULAR\` | Top-right ribbon callout driving sales conversion. |
| **⑦** | **Weight Override** | Number | \`3600\` (grams). | Total bundle shipment weight for freight calculations. |
| **⑧** | **Popular Flag** | Checkbox | Checked (\`true\`) | Pre-selects this tier as the recommended customer choice. |

---

## STEP 18 — CONFIGURE PRODUCT IMAGES & GALLERY ORDER

The Images tab manages high-resolution photography, primary catalog card thumbnails, and gallery slide sequence.

![Figure 18.1 — Product Images Tab](assets/product-configuration-tour/tour_18_images_tab.png)
*Figure 18.1 — Product image gallery showing drag-and-drop upload zone, primary hero badge, and reorder controls.*

### Field Guide — Images Management

| Marker | Control Name | Type | Recommended Standard | Operational Rationale |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Upload Dropzone** | File Upload | Drag & drop WebP, JPG, or PNG under 2MB. Square 1:1 ratio ($1200\times 1200\text{px}$). | Optimized for fast mobile loading and crisp desktop zoom. |
| **②** | **Primary Hero** | Gold Star | Designate the main studio photo as primary. | Used for catalog cards, WhatsApp previews, and Google Shopping. |
| **③** | **Move Up / Down** | Arrow Buttons | Arrange images: Studio Shot $\to$ Dimensional Diagram $\to$ In-Use $\to$ Packaging. | Controls gallery slide sequence on the storefront PDP. |
| **④** | **Delete Photo** | Trash Icon | Removes obsolete or outdated asset. | Unlinks any associated variant mappings automatically. |

---

## STEP 19 — CONFIGURE TECHNICAL SPECIFICATIONS

Specifications provide structured engineering parameters (build volume, nozzle temperature, layer resolution) essential for additive manufacturing clients.

![Figure 19.1 — Specifications Tab](assets/product-configuration-tour/tour_19_specifications.png)
*Figure 19.1 — Technical specifications manager showing parameter names, values, engineering units, and display order.*

### Field Guide — Technical Specifications

| Marker | Field Name | Type | Recommended Entry | Customer PDP Display |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Parameter Name** | Text Input | \`Build Volume\`, \`Nozzle Temp\`, \`Printing Speed\` | Rendered as bold parameter label in specs table. |
| **②** | **Parameter Value** | Text Input | \`220 x 220 x 250\`, \`260°C\`, \`250 mm/s\` | Engineering metric value. |
| **③** | **Engineering Unit** | Text Input | \`mm\`, \`°C\`, \`mm/s\`, \`kg\` | Displayed cleanly alongside the value. |
| **④** | **Specs Rows** | Table Grid | Structured list of all populated technical attributes. | Rendered in dedicated "Technical Specifications" tab. |
| **⑤** | **+ Add Row** | Action Button | Click to insert an additional parameter row. | Populates empty inputs for rapid data entry. |

---

## STEP 20 — CONFIGURE CUSTOMER DOWNLOADS (MANUALS & STL FILES)

The Downloads tab provides customer self-service access to user manuals, slicing profiles (OrcaSlicer, PrusaSlicer, Cura), firmware updates, and test 3D STL files.

![Figure 20.1 — Downloads Tab](assets/product-configuration-tour/tour_20_downloads.png)
*Figure 20.1 — Customer downloads console showing document upload, title, file format badges, and test download links.*

### Field Guide — Downloads Management

| Marker | Field Name | Type | Recommended Entry | Customer Access |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Upload Document** | File Upload | Attach PDF manuals, ZIP slicing profiles, or binary STL files. | Downloadable directly from the PDP "Downloads" tab. |
| **②** | **Document Title** | Text Input | \`OrcaSlicer Optimized Filament Profile (V2.1)\` | Customer sees clean, descriptive link name. |
| **③** | **File Type Badge** | Badge | Auto-detected (\`PDF\`, \`STL\`, \`ZIP\`). | Displays appropriate file format icon. |
| **④** | **Download Test** | Action Link | Click to verify file integrity and download speed. | Ensures customers receive uncorrupted assets. |

---

## STEP 21 — CONFIGURE VISUAL FEATURES & HIGHLIGHT CARDS

Features highlight key selling propositions (e.g. "Auto-Bed Leveling", "Direct Drive Extruder", "Silent TMC Drivers") using Google Material Icons.

![Figure 21.1 — Features Tab](assets/product-configuration-tour/tour_21_features.png)
*Figure 21.1 — Visual feature card manager showing title, description, Material Icon selector, and priority rank.*

### Field Guide — Feature Cards

| Marker | Field Name | Type | Recommended Entry | Storefront Presentation |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Feature Title** | Text Input | \`LeviQ 2.0 Automatic Bed Leveling\` | Bold heading on visual feature card. |
| **②** | **Description** | Textarea | 2-sentence explanation of how this feature benefits the user. | Subtext rendered inside card container. |
| **③** | **Material Icon** | Icon Picker | \`auto_fix_high\`, \`speed\`, \`precision_manufacturing\` | Rendered as crisp vector icon inside card circle. |
| **④** | **+ Add Feature** | Action Button | Insert additional feature highlight (recommend 4 to 6). | Renders responsive 2-column or 3-column card grid. |

---

## STEP 22 — CONFIGURE PRODUCT FAQS & ACCORDION CARDS

FAQs address frequent customer pre-purchase inquiries (e.g. filament compatibility, power supply requirements, warranty terms).

![Figure 22.1 — FAQs Tab](assets/product-configuration-tour/tour_22_faqs.png)
*Figure 22.1 — Product FAQ manager showing question input, markdown answer editor, sort order, and active switch.*

### Field Guide — FAQ Management

| Marker | Field Name | Type | Recommended Entry | Storefront PDP Presentation |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Question** | Text Input | \`Is this printer compatible with ABS and PETG filaments?\` | Rendered as interactive accordion header. |
| **②** | **Markdown Answer** | Textarea | Detailed response supporting bold text, links, and lists. | Expands smoothly when customer clicks accordion. |
| **③** | **Sort Order** | Number | \`1\`, \`2\`, \`3\` | Dictates display hierarchy on PDP. |
| **④** | **Active Toggle** | Switch | \`Active: True\` | Temporarily hide seasonal or outdated questions. |

---

## STEP 23 — CONFIGURE WARRANTY & OFFICIAL SUPPORT

Documenting warranty duration, customer helpline numbers, and coverage exclusions protects the business against invalid claims.

![Figure 23.1 — Warranty & Support Tab](assets/product-configuration-tour/tour_23_warranty_support.png)
*Figure 23.1 — Warranty and support console showing duration, dedicated helpline, support email, and coverage terms.*

### Field Guide — Warranty & Support

| Marker | Field Name | Type | Recommended Entry | Operational Benefit |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Warranty Duration** | Text Input | \`12 Months Manufacturer Warranty\` | Reassures customers and builds brand credibility. |
| **②** | **Support Phone** | Phone Input | \`+91 98765 43210\` | Verified helpline displayed on order invoices. |
| **③** | **Helpdesk Email** | Email Input | \`support@3dgalaxy.in\` | Routed directly to customer service ticketing system. |
| **④** | **Coverage Terms** | Textarea | Details covered components (Motherboard, Steppers) vs consumables (Nozzles, PEI sheets). | Prevents disputes regarding wearable parts. |

---

## STEP 24 — CONFIGURE SHIPPING MODES & FREIGHT HIERARCHY

Shipping configuration dictates courier tariff calculation, cash-on-delivery (COD) availability, and free shipping thresholds.

![Figure 24.1 — Shipping & Delivery Tab](assets/product-configuration-tour/tour_24_shipping_configuration.png)
*Figure 24.1 — Shipping configuration tab showing shipping mode hierarchy, fixed charges, delivery days, and COD toggle.*

### Field Guide — Shipping Configuration

| Marker | Field Name | Type | Recommended Entry | Shipping Engine Impact |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Shipping Mode** | Dropdown | \`Product Specific\` or \`Category Based\` | Governs tariff hierarchy (Priority 1 overrides Priority 2). |
| **②** | **Shipping Charge** | Currency | \`₹150\` (or \`0\` if free). | Flat shipping fee applied to cart if below threshold. |
| **③** | **Delivery Days** | Text Input | \`5-6\` (strictly hyphenated format). | Parsed by delivery engine into dynamic calendar window. |
| **④** | **Free Shipping** | Checkbox | Checked (\`true\`) | Overrides all fees and displays "FREE DELIVERY" banner. |
| **⑤** | **COD Allowed** | Checkbox | Checked (\`true\`) | Enables Cash-on-Delivery payment option at checkout. |

---

## STEP 25 — DYNAMIC DELIVERY DATE ESTIMATION ENGINE

The 3D Galaxy delivery engine dynamically calculates and formats customer delivery windows based on real-time Asia/Kolkata (IST) calendar dates.

![Figure 25.1 — Dynamic Delivery Date Estimation](assets/product-configuration-tour/tour_25_delivery_estimate.png)
*Figure 25.1 — Delivery date estimation calculation showing range input, encoded integer parsing, and storefront formatted result.*

### Operational Mechanics of the Delivery Engine

The system uses \`DeliveryEstimateService\` (\`src/app/core/services/delivery-estimate.service.ts\`):
1. **Admin Input:** Enters \`"5-6"\` into Delivery Days (Marker ①).
2. **Encoded Parsing:** The service runs \`parseEstimateDays("5-6")\`, producing encoded integer \`506\` ($\text{min} \times 100 + \text{max}$).
3. **IST Calendar Projection:** Using \`Asia/Kolkata\` timezone:
   $$\text{Earliest Date} = \text{Current Date} + 5 \text{ Days}$$
   $$\text{Latest Date} = \text{Current Date} + 6 \text{ Days}$$
4. **Customer Storefront Display:**
   $$\text{Desktop View: } \textbf{"10 Aug 2026 – 11 Aug 2026"}$$
   $$\text{Mobile View: } \textbf{"10–11 Aug"}$$

---

## STEP 26 — CONFIGURE RELATED PRODUCTS & ACCESSORY UP-SELLS

Cross-selling compatible accessories (nozzles, build plates, drying boxes) on the PDP significantly increases Average Order Value (AOV).

![Figure 26.1 — Related Products Cross-Sell Tab](assets/product-configuration-tour/tour_26_related_products.png)
*Figure 26.1 — Related products selector showing catalog search, linked accessory cards, and storefront cross-sell layout.*

### Field Guide — Related Products

| Marker | Control Name | Type | Recommended Standard | Storefront PDP Impact |
| :---: | :--- | :--- | :--- | :--- |
| **①** | **Catalog Search** | Search Input | Type accessory name (e.g. \`Hardened Steel Nozzle\`). | Filters active catalog to find compatible add-ons. |
| **②** | **+ Link Accessory** | Action Button | Click to associate accessory with current product. | Adds item to cross-sell array. |
| **③** | **Linked Cards** | Display List | Displays linked accessories with quick-remove icon. | Rendered in "Frequently Bought Together" carousel on PDP. |

---

## STEP 27 — CONFIGURE SEARCH ENGINE OPTIMIZATION (SEO)

Precise SEO titles, meta descriptions, and OpenGraph tags ensure maximum organic Google rankings and attractive social media shares.

![Figure 27.1 — SEO Configuration Tab](assets/product-configuration-tour/tour_27_seo.png)
*Figure 27.1 — SEO tab showing Meta Title character counter, Meta Description, Keywords input, and OpenGraph preview.*

### Field Guide — SEO Management

| Marker | Field Name | Type | Character Target | Recommended Standard |
| :---: | :--- | :--- | :---: | :--- |
| **①** | **Meta Title** | Text Input | $50 - 60$ Chars | \`Anycubic Kobra Neo 3D Printer \| Buy Online at 3D Galaxy India\` |
| **②** | **Meta Description** | Textarea | $140 - 160$ Chars | \`Buy genuine Anycubic Kobra Neo with LeviQ auto-leveling at 3D Galaxy India. High speed, direct drive extruder, free shipping across India.\` |
| **③** | **Keywords** | Tag Input | $5 - 10$ Tags | \`3d printer, anycubic, kobra neo, fdm printer, auto leveling\` |
| **④** | **Canonical URL** | Text Input | Full URL | \`https://3dgalaxy.in/products/anycubic-kobra-neo\` |
| **⑤** | **OpenGraph Preview** | Visual Card | Auto | Real-time preview of WhatsApp, Twitter, and LinkedIn share cards. |

---

## STEP 28 — LIVE PREVIEW VALIDATION & SAVE / PUBLISH

Before publishing any catalog item to live commercial traffic, administrators must validate all swatch interactions, price calculations, and stock locks in the **Live Storefront Customer Variant Switcher Preview**.

![Figure 28.1 — Live Storefront Customer Preview](assets/product-configuration-tour/tour_28_live_preview.png)
*Figure 28.1 — Live storefront customer preview simulator showing swatch switcher, dynamic total, and Save Asset button.*

### Operational Pre-Publish Validation Checklist

| Marker | Validation Step | Admin Action in Preview | Expected Behavior |
| :---: | :--- | :--- | :--- |
| **①** | **Test Swatches** | Click through each variant chip / color dot. | Active orange border moves smoothly; hero photo flips to corresponding color. |
| **②** | **Verify Pricing** | Observe dynamic price calculation. | Price updates accurately based on variant pricing overrides or bundle tier rate. |
| **③** | **Verify Stock** | Test an out-of-stock variant permutation. | Button changes to "SOLD OUT" and "Add to Cart" is completely disabled. |
| **④** | **Simulate Cart** | Click "Add to Cart" inside simulator. | Toast alert confirms item added with correct SKU, price, weight, and attributes. |
| **⑤** | **SAVE ASSET / PUBLISH** | Click the orange **SAVE ASSET** button. | Submits validated payload to database and publishes changes to live storefront. |

---

## 29. CONDENSED 10-POINT QUICK VISUAL TOUR SUMMARY

For newly onboarded administrators, this 10-point condensed visual cheatsheet provides an executive overview of the entire Product Configuration lifecycle in **5 to 10 minutes**:

![Figure 29.1 — 10-Point Quick Visual Tour Summary](assets/product-configuration-tour/tour_29_quick_tour_card.png)
*Figure 29.1 — Condensed 10-Point Quick Visual Tour Summary Card for rapid 5–10 minute administrator onboarding.*

### The 10 Essential Milestones

1. **① General Identity:** Establish clean Title, unique URL Slug, standard warehouse SKU barcode, and 2-sentence summary.
2. **② Category Tagging:** Tag all applicable categories; assign exactly ONE primary canonical category for breadcrumbs.
3. **③ Pricing & Inventory:** Set anchor MRP, Retail Sale Price, Authorized Dealer wholesale rate, and physical shelf stock count.
4. **④ Variant Architecture:** Select from 11 verified display types (e.g. Color Chips, Bundle Builder) and 6 selection modes.
5. **⑤ Cartesian Matrix:** Review generated permutations; verify unique SKUs and individual stock counts across every row.
6. **⑥ Default Variant Designation:** Flag exactly ONE in-stock variant as default to prevent blank initial swatch states on the PDP.
7. **⑦ Image-to-Swatch Mapping:** Map gallery photos to specific variant swatches for dynamic photo switching on customer clicks.
8. **⑧ Shipping & Tare Weight:** Input accurate net weight in grams and formatted delivery days string (\`"5-6"\`).
9. **⑨ SEO & OpenGraph:** Configure 60-character meta title, 160-character meta description, and social share cards.
10. **⑩ Live Simulator Test & Publish:** Thoroughly test swatches and prices in the Live Preview Simulator before clicking **SAVE ASSET**.

---

## 30. DOCUMENT HANDOVER & OPERATIONAL ACCEPTANCE

This **Product Configuration Visual Tour Guide** confirms that all product configuration screens, tabs, fields, dropdown options, and live preview simulators within the 3D Galaxy Admin Portal have been audited, visually annotated, and officially delivered for commercial operations.

<br/>

| DELIVERED BY | ACCEPTED BY |
| :--- | :--- |
| **AJR Digital Hub Team**<br/>Enterprise Digital Solutions & Full-Stack Architecture<br/><br/>____________________________________________<br/>*Authorized Signature & Date* | **3D Galaxy Team**<br/>E-Commerce Operations & Catalog Administration<br/><br/>____________________________________________<br/>*Client Sign-Off & Date* |

<br/>

<p align="center">
  <small style="color: #64748b;">
    AJR DIGITAL HUB — WHERE IDEAS MEET INNOVATION • CREATIVE • TECHNOLOGY • SOLUTIONS<br/>
    Delivered for 3D Galaxy Enterprise E-Commerce & Custom Manufacturing Platform • All Rights Reserved 2026
  </small>
</p>
`;

fs.writeFileSync(MD_PATH, content, 'utf8');
console.log('Successfully written Visual Tour Guide markdown to:', MD_PATH);
const stats = fs.statSync(MD_PATH);
console.log('File size:', (stats.size / 1024).toFixed(2), 'KB');
