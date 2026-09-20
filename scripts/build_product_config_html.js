const fs = require('fs');
const path = require('path');

const HTML_OUTPUT = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration', 'product_config_print.html');

console.log('Generating Product Configuration Print HTML...');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>3D Galaxy — Product Configuration Master Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');

    @page {
      size: A4;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-variant-ligatures: none !important;
      font-feature-settings: "liga" 0, "clig" 0, "calt" 0 !important;
      text-rendering: geometricPrecision;
      -webkit-font-smoothing: antialiased;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.5;
      font-size: 9.2pt;
    }

    .page-break {
      page-break-before: always;
      display: block;
      height: 0;
      margin: 0;
      padding: 0;
    }
    .avoid-break {
      page-break-inside: avoid;
    }

    /* Typography */
    h1 {
      font-size: 14.5pt;
      font-weight: 800;
      color: #0b1120;
      text-transform: uppercase;
      letter-spacing: -0.2px;
      margin: 0 0 10px 0;
      padding-top: 1mm;
      padding-bottom: 5px;
      border-bottom: 2px solid #0284c7;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h1::before {
      content: "";
      display: inline-block;
      width: 6px;
      height: 14pt;
      background: #ea580c;
      border-radius: 2px;
    }

    h2 {
      font-size: 11.2pt;
      font-weight: 800;
      color: #0f172a;
      margin: 12px 0 5px 0;
      letter-spacing: -0.2px;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    h3 {
      font-size: 9.6pt;
      font-weight: 700;
      color: #1e293b;
      margin: 9px 0 4px 0;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    h4 {
      font-size: 8.6pt;
      font-weight: 700;
      color: #334155;
      margin: 7px 0 3px 0;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    p {
      margin-bottom: 7px;
      color: #334155;
      text-align: left;
      line-height: 1.45;
    }
    ul, ol {
      margin-left: 20px;
      margin-top: 4px;
      margin-bottom: 7px;
      padding-left: 0;
    }
    li {
      margin-bottom: 3px;
      color: #334155;
      line-height: 1.4;
      padding-left: 2px;
    }

    /* Tables */
    table {
      width: 100% !important;
      max-width: 100% !important;
      border-collapse: collapse;
      margin: 7px 0 11px 0;
      font-size: 8.1pt;
      page-break-inside: auto;
      box-sizing: border-box;
      table-layout: auto;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    thead {
      display: table-header-group;
    }
    th {
      background: #0b1120;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 5px 8px;
      text-transform: uppercase;
      font-size: 7.2pt;
      letter-spacing: 0.5px;
      border: 1px solid #0b1120;
    }
    td {
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
      color: #1e293b;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Callouts */
    .callout {
      border-radius: 6px;
      padding: 9px 13px;
      margin: 9px 0;
      font-size: 8.2pt;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      width: 100% !important;
      box-sizing: border-box;
    }
    .callout-info {
      background: #f0f9ff;
      border-left: 4px solid #0284c7;
      color: #0369a1;
    }
    .callout-warning {
      background: #fff7ed;
      border-left: 4px solid #ea580c;
      color: #9a3412;
    }
    .callout-success {
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      color: #15803d;
    }
    .callout-title {
      font-weight: 800;
      text-transform: uppercase;
      font-size: 7.4pt;
      letter-spacing: 0.8px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    /* Screenshots & Figures */
    .figure-container {
      margin: 9px 0 13px 0;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      background: #ffffff;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
      width: 100% !important;
      box-sizing: border-box;
    }
    .figure-header {
      background: #f1f5f9;
      padding: 5px 10px;
      border-bottom: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .figure-number {
      font-weight: 700;
      font-size: 7.8pt;
      color: #0b1120;
    }
    .figure-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.8pt;
      font-weight: 600;
      color: #0284c7;
      background: #e0f2fe;
      padding: 1px 5px;
      border-radius: 3px;
    }
    .figure-img {
      width: 100%;
      height: auto;
      max-height: 100mm;
      object-fit: contain;
      display: block;
      background: #090d16;
    }
    .figure-caption {
      padding: 5px 10px;
      font-size: 7.5pt;
      color: #475569;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      line-height: 1.35;
      font-style: italic;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.8pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }
    .badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 6.8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-blue { background: #e0f2fe; color: #0369a1; }
    .badge-orange { background: #ffedd5; color: #c2410c; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-dark { background: #0f172a; color: #f8fafc; }

    pre.diagram {
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.8pt;
      line-height: 1.3;
      background: #0b1120;
      color: #38bdf8;
      padding: 9px;
      border-radius: 5px;
      margin: 7px 0;
      overflow-x: auto;
      page-break-inside: avoid;
      border-left: 4px solid #ea580c;
    }

    /* COVER PAGE STYLING */
    .cover-page {
      box-sizing: border-box;
      height: 297mm;
      max-height: 297mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 20mm 18mm 18mm 18mm;
      background: linear-gradient(150deg, #070b14 0%, #0b1120 45%, #0f172a 100%);
      color: #ffffff;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }
    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      padding-bottom: 14px;
    }
    .cover-brand-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .cover-brand-card.client-side {
      align-items: flex-end;
    }
    .cover-brand-label {
      font-size: 6.8pt;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #94a3b8;
      font-weight: 700;
    }
    .cover-brand-logo-wrap {
      background: #ffffff;
      padding: 6px 14px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.15);
      height: 48px;
      box-sizing: border-box;
    }
    .cover-logo-img {
      max-height: 36px;
      max-width: 130px;
      object-fit: contain;
      display: block;
    }
    .cover-transfer-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .cover-badge-top {
      background: rgba(234, 88, 12, 0.15);
      border: 1px solid #ea580c;
      color: #fb923c;
      font-size: 7.2pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      padding: 3px 9px;
      border-radius: 4px;
    }
    .cover-transfer-arrow {
      font-size: 6.8pt;
      color: #94a3b8;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .cover-middle {
      margin: 20mm 0 18mm 0;
    }
    .cover-app-title {
      font-size: 12pt;
      font-weight: 800;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      margin-bottom: 6px;
    }
    .cover-main-heading {
      font-size: 28pt;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin-bottom: 8px;
    }
    .cover-main-heading span {
      color: #ea580c;
    }
    .cover-sub-heading {
      font-size: 14pt;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.5px;
      margin-bottom: 14px;
    }
    .cover-rule {
      width: 80px;
      height: 4px;
      background: linear-gradient(90deg, #0284c7, #ea580c);
      margin-bottom: 14px;
      border-radius: 2px;
    }
    .cover-desc {
      font-size: 10pt;
      line-height: 1.5;
      color: #cbd5e1;
      max-width: 92%;
    }
    .cover-bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 14px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .cover-meta-box h5 {
      font-size: 7.2pt;
      text-transform: uppercase;
      color: #38bdf8;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }
    .cover-meta-box p {
      font-size: 9.6pt;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }
    .cover-meta-box span {
      font-size: 7.8pt;
      color: #94a3b8;
      font-weight: 400;
      display: block;
    }
  </style>
</head>
<body>

  <!-- ==================== COVER PAGE ==================== -->
  <div class="cover-page">
    <div class="cover-top">
      <div class="cover-brand-card">
        <span class="cover-brand-label">Delivered By</span>
        <div class="cover-brand-logo-wrap">
          <img src="ajr_digital_hub_logo.png" class="cover-logo-img" alt="AJR Digital Hub">
        </div>
      </div>

      <div class="cover-transfer-indicator">
        <div class="cover-badge-top">PRODUCT CONFIGURATION MASTER GUIDE</div>
        <div class="cover-transfer-arrow">Enterprise Solutions ➔ Store Administration</div>
      </div>

      <div class="cover-brand-card client-side">
        <span class="cover-brand-label">Delivered To / Accepted By</span>
        <div class="cover-brand-logo-wrap">
          <img src="3d_galaxy_logo.png" class="cover-logo-img" alt="3D Galaxy">
        </div>
      </div>
    </div>

    <div class="cover-middle">
      <div class="cover-app-title">3D Galaxy E-Commerce &amp; Custom Manufacturing Platform</div>
      <div class="cover-main-heading">PRODUCT <span>CONFIGURATION</span></div>
      <div class="cover-sub-heading">MASTER REFERENCE MANUAL &amp; OPERATIONAL GUIDE</div>
      <div class="cover-rule"></div>
      <p class="cover-desc">
        Comprehensive Administration Manual for Catalog Classification, Multi-Group Variant Cartesian Matrices, Dynamic Tier Bundles, Courier Freight Recovery, Dynamic Delivery Estimation, and Storefront Simulation.
      </p>
    </div>

    <div class="cover-bottom">
      <div class="cover-meta-box">
        <h5>Delivered By</h5>
        <p>AJR Digital Hub Team</p>
        <span>Enterprise Digital Solutions Team</span>
      </div>
      <div class="cover-meta-box">
        <h5>Delivered To / Accepted By</h5>
        <p>3D Galaxy Team</p>
        <span>Catalog Management &amp; Fulfillment Operations</span>
      </div>
      <div class="cover-meta-box" style="margin-top: 6px;">
        <h5>Document Identifier &amp; Release</h5>
        <p>DOC-3DG-PRD-2026-V1.0 • Version 1.0</p>
        <span>Published: September 2026</span>
      </div>
      <div class="cover-meta-box" style="margin-top: 6px;">
        <h5>Classification</h5>
        <p>Commercial in Confidence</p>
        <span>Operational Training &amp; Reference Manual</span>
      </div>
    </div>
  </div>

  <!-- ==================== DOCUMENT CONTROL ==================== -->
  <div class="page-break"></div>
  <h1>DOCUMENT CONTROL &amp; GOVERNANCE</h1>

  <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 16px; margin: 10px 0 14px 0;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="background: #ffffff; padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0; height: 34px; display: flex; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <img src="ajr_digital_hub_logo.png" style="height: 24px; object-fit: contain;" alt="AJR Digital Hub">
      </div>
      <div>
        <div style="font-size: 6.8pt; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 0.8px;">Delivering Partner</div>
        <div style="font-size: 8.2pt; font-weight: 800; color: #0b1120;">AJR Digital Hub Team</div>
      </div>
    </div>

    <div style="font-size: 13pt; color: #94a3b8; font-weight: 300;">➔</div>

    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="text-align: right;">
        <div style="font-size: 6.8pt; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.8px;">Receiving Client</div>
        <div style="font-size: 8.2pt; font-weight: 800; color: #0b1120;">3D Galaxy Team</div>
      </div>
      <div style="background: #ffffff; padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0; height: 34px; display: flex; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <img src="3d_galaxy_logo.png" style="height: 24px; object-fit: contain;" alt="3D Galaxy">
      </div>
    </div>
  </div>

  <table>
    <tr><th style="width: 25%;">Document Attribute</th><th>Specification Details</th></tr>
    <tr><td><strong>Document Title</strong></td><td>3D Galaxy — Product Configuration Master Guide</td></tr>
    <tr><td><strong>Application Platform</strong></td><td>3D Galaxy Enterprise E-Commerce &amp; Custom Manufacturing Portal</td></tr>
    <tr><td><strong>Document Identifier</strong></td><td>DOC-3DG-PRD-2026-V1.0</td></tr>
    <tr><td><strong>Release Version</strong></td><td>1.0 (Production Master)</td></tr>
    <tr><td><strong>Publication Date</strong></td><td>September 2026</td></tr>
    <tr><td><strong>Document Scope</strong></td><td>Complete Field, Variant, Template, Matrix, Pricing, Inventory &amp; Shipping Reference</td></tr>
    <tr><td><strong>Delivered By</strong></td><td><strong>AJR Digital Hub Team</strong> (Enterprise Solutions Team)</td></tr>
    <tr><td><strong>Delivered To / Accepted By</strong></td><td><strong>3D Galaxy Team</strong> (Catalog Management &amp; Store Administration)</td></tr>
    <tr><td><strong>Target Audience</strong></td><td>Store Administrators, Catalog Managers, Fulfillment Leads, Customer Support</td></tr>
  </table>

  <h2>Document Revision History</h2>
  <table>
    <tr><th style="width: 12%;">Version</th><th style="width: 18%;">Release Date</th><th style="width: 28%;">Author / Entity</th><th>Summary of Operational Scope</th></tr>
    <tr><td><strong>0.1</strong></td><td>Sep 18, 2026</td><td>AJR Digital Hub Engineering</td><td>Extraction of data models, Angular components, signals, and validation rules.</td></tr>
    <tr><td><strong>0.5</strong></td><td>Sep 19, 2026</td><td>AJR Digital Hub Solutions</td><td>Variant Cartesian logic, dynamic delivery engine, and shipping mode hierarchy audit.</td></tr>
    <tr><td><strong>1.0</strong></td><td>Sep 21, 2026</td><td>AJR Digital Hub Delivery Team</td><td>Comprehensive Production Master Guide: 11 tabs, 11 display types, 6 selection modes, 10 templates, 12 test cases, and validation matrix.</td></tr>
  </table>

  <!-- ==================== EXECUTIVE SUMMARY ==================== -->
  <div class="page-break"></div>
  <h1>1. EXECUTIVE SUMMARY</h1>

  <p>The <strong>Product Configuration Module</strong> in the 3D Galaxy Admin Portal is the operational core of the entire commercial enterprise. It governs the entire lifecycle of sellable items—from initial SKU registration, multi-category taxonomy classification, and Cartesian variant permutation generation, to real-time inventory management, shipping tariff assignments, and dynamic delivery date estimation.</p>

  <p>In a dual-track e-commerce and additive manufacturing enterprise such as 3D Galaxy, products are not static catalog rows. They represent multi-dimensional engineering assets requiring rigorous operational governance:</p>
  <ul>
    <li><strong>Physical Retail Catalog:</strong> 3D printers, replacement extruders, and workshop accessories requiring precise SKU/barcode tagging, MRP anchors, authorized dealer rates, and physical stock tracking.</li>
    <li><strong>Multi-Group Variant Engine:</strong> Consumables (Filaments: Material × Spool Weight × Color) requiring Cartesian product matrices, individual SKU tagging, individual stock counters, color hex swatches, and automatic image mapping.</li>
    <li><strong>Custom Additive Manufacturing (STL) Integrations:</strong> Print materials and base rates that integrate with custom 3D model slicing volume calculations, infill percentages, and automated courier weight recovery.</li>
  </ul>

  <div class="callout callout-warning">
    <div class="callout-title">⚠️ Operational Risk Notice: The Cost of Misconfiguration</div>
    An unassigned category causes products to vanish from storefront navigation. An uncalibrated variant weight results in undercharged courier freight on multi-spool shipments. An ambiguous default variant causes blank swatch renders. Every field documented in this guide has a direct commercial impact.
  </div>

  <h2>Master Product Catalog Console</h2>
  <p>The master entry point for all product configuration is the Catalog Registry Console:</p>

  <div class="figure-container">
    <div class="figure-header">
      <span class="figure-number">Figure 1.1 — Master Product Catalog Console</span>
      <span class="figure-tag">UI-CAT-01</span>
    </div>
    <img src="01_catalog_products.png" class="figure-img" alt="Master Product Catalog Console">
    <div class="figure-caption">Active catalog inventory table displaying SKU barcodes, stock counters, retail vs dealer pricing, and instant edit actions.</div>
  </div>

  <!-- ==================== ARCHITECTURE ==================== -->
  <div class="page-break"></div>
  <h1>2. PRODUCT CONFIGURATION ARCHITECTURE</h1>

  <p>The product pipeline translates administrative inputs into reactive customer storefront experiences through a structured, 9-stage architectural pipeline:</p>

  <pre class="diagram">
+---------------------------------------------------------------------------------------+
| 1. GENERAL IDENTITY &amp; TAXONOMY                                                       |
|    Title • URL Slug • SKU • Barcode • Multi-Categories (Primary/Secondary) • Brand   |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| 2. PRICING &amp; INVENTORY ENGINE                                                         |
|    MRP Price • Retail Sale Price • Authorized Dealer Price • Physical Stock Counter   |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| 3. MULTI-GROUP VARIANT MATRIX                                                         |
|    Variant Groups • 11 Display Types • 6 Selection Modes • Combination Permutations   |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| 4. MEDIA &amp; GALLERY ASSET BINDING                                                      |
|    Primary Image Designation • Gallery Ordering • Swatch-to-Image Dynamic Mapping     |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| 5. TECHNICAL SPECIFICATIONS &amp; DOWNLOADS                                               |
|    Structured Key-Value Specs • Datasheets • User Manuals • STL Profiles • Firmware   |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| 6. VALUE-ADD CUSTOMER CONTENT                                                         |
|    Key Product Features • FAQ Accordions • Warranty Terms &amp; Support Hotline           |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| 7. LOGISTICS &amp; DYNAMIC SHIPPING CALIBRATION                                           |
|    Unit Weight (g) • Shipping Hierarchy Mode • Delivery Date Range • COD Policy       |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| 8. MERCHANDISING &amp; SEO METADATA                                                       |
|    Related Products • Complementary Consumables • Meta Titles • OpenGraph Preview     |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| 9. LIVE STOREFRONT SIMULATOR &amp; VALIDATION                                             |
|    In-Admin Variant Switcher • Price &amp; Stock Check • COD Gating • Pre-Publish Save    |
+---------------------------------------------------------------------------------------+
  </pre>

  <!-- ==================== 11 TABS MAP ==================== -->
  <div class="page-break"></div>
  <h1>3. COMPLETE PRODUCT CONFIGURATION TAB MAP</h1>

  <p>The Product Editor inside <code>src/app/pages/admin/components/catalog-tab.ts</code> contains exactly <strong>11 verified operational tabs</strong>:</p>

  <table>
    <tr><th style="width: 8%;">Tab #</th><th style="width: 20%;">Tab Identifier</th><th style="width: 25%;">Tab Label</th><th>Operational Scope</th></tr>
    <tr><td><strong>1</strong></td><td><code>general</code></td><td><strong>General</strong></td><td>Product title, slug, SKU, multi-category tagging, brand alliance, pricing, inventory, and bundled SKUs.</td></tr>
    <tr><td><strong>2</strong></td><td><code>variants</code></td><td><strong>Variants</strong></td><td>Multi-group variant configuration, 11 display types, 6 selection modes, Cartesian matrix, and bundle tiers.</td></tr>
    <tr><td><strong>3</strong></td><td><code>images</code></td><td><strong>Images</strong></td><td>Hero primary image designation, gallery ordering up/down, and swatch-to-photo binding.</td></tr>
    <tr><td><strong>4</strong></td><td><code>specifications</code></td><td><strong>Specifications</strong></td><td>Engineering key-value parameters (build volume, nozzle temp, extruder type) for technical credibility.</td></tr>
    <tr><td><strong>5</strong></td><td><code>downloads</code></td><td><strong>Downloads</strong></td><td>Customer self-service manuals, slicing profiles (Orca/Cura), datasheets, and test STL files.</td></tr>
    <tr><td><strong>6</strong></td><td><code>features</code></td><td><strong>Features</strong></td><td>Visual marketing highlight cards with Google Material Icons and benefit bullet points.</td></tr>
    <tr><td><strong>7</strong></td><td><code>faqs</code></td><td><strong>FAQs</strong></td><td>Product-specific questions and markdown answers formatted as interactive accordion cards.</td></tr>
    <tr><td><strong>8</strong></td><td><code>warranty</code></td><td><strong>Warranty &amp; Support</strong></td><td>Warranty duration (months/years), coverage exclusions, support phone, and helpdesk email.</td></tr>
    <tr><td><strong>9</strong></td><td><code>shipping</code></td><td><strong>Shipping &amp; Delivery</strong></td><td>Physical weight in grams, 3-tier shipping mode hierarchy, dynamic IST delivery date range, and COD toggle.</td></tr>
    <tr><td><strong>10</strong></td><td><code>related_products</code></td><td><strong>Related Products</strong></td><td>Cross-sell and complementary accessories (nozzles, resins, spare build plates) on the PDP.</td></tr>
    <tr><td><strong>11</strong></td><td><code>seo</code></td><td><strong>SEO</strong></td><td>Meta titles, meta descriptions, search crawler tags, canonical URLs, and OpenGraph social previews.</td></tr>
  </table>

  <!-- ==================== GENERAL TAB ==================== -->
  <div class="page-break"></div>
  <h1>4. GENERAL TAB — COMPLETE FIELD REFERENCE</h1>

  <p>The General tab establishes baseline identity, commercial pricing, and physical inventory:</p>

  <div class="figure-container">
    <div class="figure-header">
      <span class="figure-number">Figure 2.1 — Product Configuration General Setup</span>
      <span class="figure-tag">UI-GEN-01</span>
    </div>
    <img src="02_product_general_top.png" class="figure-img" alt="Product Configuration General Setup">
    <div class="figure-caption">General identity fields: Product Title, URL Slug, SKU Barcode, Multi-Category Tagging, and Brand Alliance dropdown.</div>
  </div>

  <h2>Detailed 9-Point Field Specifications</h2>

  <h3>1. Product Title (Mandatory)</h3>
  <ul>
    <li><strong>Purpose:</strong> Commercial product name displayed across catalog grids, PDP header, invoices, and Google Search.</li>
    <li><strong>Input Type:</strong> Single-line Text Input.</li>
    <li><strong>Required:</strong> Yes. The system blocks saving if empty.</li>
    <li><strong>Example:</strong> <code>Anycubic Photon Mono 2 - High Resolution Resin 3D Printer</code></li>
    <li><strong>Validation:</strong> Non-empty string; trimmed of whitespace. Recommended length: 25–80 characters.</li>
    <li><strong>Used By:</strong> Storefront Header, Product Grid, Omni-Search Index, Cart Line Items, Tax Invoice.</li>
    <li><strong>Customer Impact:</strong> Primary headline seen by shoppers; dictates product comprehension.</li>
    <li><strong>Admin Impact:</strong> Primary search label in catalog list and order fulfillment screens.</li>
    <li><strong>Business Impact:</strong> Core organic search keyword driver and brand equity anchor.</li>
  </ul>

  <h3>2. URL Slug Customization</h3>
  <ul>
    <li><strong>Purpose:</strong> Canonical URI path for storefront product routing (<code>/product/{slug}</code>).</li>
    <li><strong>Input Type:</strong> Single-line Lower-case Alphanumeric Input.</li>
    <li><strong>Required:</strong> Optional (Auto-generated from Product Title if omitted).</li>
    <li><strong>Example:</strong> <code>anycubic-photon-mono-2</code></li>
    <li><strong>Validation:</strong> Lower-case letters, numbers, and hyphens only (<code>/[^a-z0-9]+/g</code>). Unique across products.</li>
    <li><strong>Used By:</strong> Angular Router, Sitemap XML, Canonical Meta Tags, Social Sharing.</li>
    <li><strong>Customer Impact:</strong> Clean, professional browser URL; shareable in chat and email.</li>
    <li><strong>Admin Impact:</strong> Manual lock prevents URL changes during title revisions, protecting backlinks.</li>
    <li><strong>Business Impact:</strong> Critical for search engine indexation and preventing 404 broken links.</li>
  </ul>

  <h3>3. SKU Barcode / Part Number</h3>
  <ul>
    <li><strong>Purpose:</strong> Central Stock Keeping Unit for warehouse tracking and thermal barcode labeling.</li>
    <li><strong>Input Type:</strong> Alphanumeric Single-line Text Input.</li>
    <li><strong>Required:</strong> Optional (Auto-generates <code>GLX-SKU-{RANDOM}</code> if left blank).</li>
    <li><strong>Example:</strong> <code>3DG-PRN-AC-PM2</code></li>
    <li><strong>Validation:</strong> Uppercase alphanumeric; spaces converted to hyphens.</li>
    <li><strong>Used By:</strong> Base SKU prefix for variant permutations, packing slips, barcode scanner verification.</li>
    <li><strong>Customer Impact:</strong> Printed on invoice and delivery packing slips for warranty lookup.</li>
    <li><strong>Admin Impact:</strong> Warehouse bin identification and ERP/accounting synchronization.</li>
    <li><strong>Business Impact:</strong> Eliminates mispicks and ensures inventory audit accuracy.</li>
  </ul>

  <!-- ==================== PRICING & INVENTORY ==================== -->
  <div class="page-break"></div>
  <h1>5. PRICING &amp; INVENTORY POLICIES</h1>

  <div class="figure-container">
    <div class="figure-header">
      <span class="figure-number">Figure 2.2 — Pricing &amp; Inventory Configuration</span>
      <span class="figure-tag">UI-PRC-01</span>
    </div>
    <img src="03_pricing_and_stock.png" class="figure-img" alt="Pricing and Stock Configuration">
    <div class="figure-caption">Commercial pricing fields: MRP anchor, Retail Sale Price, Authorized Dealer Price, Physical Stock counter, and Status switch.</div>
  </div>

  <h2>Commercial Pricing Rules</h2>
  <table>
    <tr><th style="width: 25%;">Price Field</th><th style="width: 20%;">Target Audience</th><th style="width: 25%;">Storefront Display</th><th>Operational Purpose</th></tr>
    <tr>
      <td><strong>MRP Price (₹)</strong></td>
      <td>All Shoppers</td>
      <td>Strike-Through (~₹24,999~)</td>
      <td>Maximum Retail Price anchor establishing customer discount savings.</td>
    </tr>
    <tr>
      <td><strong>Retail Sale (₹)</strong></td>
      <td>Retail Consumers</td>
      <td>Highlighted (<strong>₹19,999</strong>)</td>
      <td>Commercial selling rate charged at checkout and used for GST invoices.</td>
    </tr>
    <tr>
      <td><strong>Authorized Dealer (₹)</strong></td>
      <td>Verified B2B Dealers</td>
      <td>Hidden from Public (₹16,500)</td>
      <td>Wholesale rate accessible only to verified institutional dealer logins.</td>
    </tr>
  </table>

  <div class="callout callout-info">
    <div class="callout-title">💡 Automated Savings Formula</div>
    <code>Discount Percentage = Math.round(((MRP - SalePrice) / MRP) * 100)</code><br>
    The storefront automatically computes and renders a green discount pill: <strong>Save ₹5,000 (20% OFF)</strong>.
  </div>

  <h2>Physical Inventory States</h2>
  <ul>
    <li><strong>Physical Stock &gt; 5:</strong> Green "In Stock" indicator.</li>
    <li><strong>1 &le; Physical Stock &le; 5:</strong> Orange "Hurry, Only X Left in Stock!" urgency badge.</li>
    <li><strong>Physical Stock = 0:</strong> Add-to-Cart disabled; button displays "Out of Stock" with backorder email notification prompt.</li>
  </ul>

  <!-- ==================== CATEGORY ARCHITECTURE ==================== -->
  <div class="page-break"></div>
  <h1>6. CATEGORY ARCHITECTURE &amp; AUTO-SELECTION</h1>

  <div class="figure-container">
    <div class="figure-header">
      <span class="figure-number">Figure 3.1 — Categories Multi-Select Architecture</span>
      <span class="figure-tag">UI-CAT-SEL</span>
    </div>
    <img src="04_categories_multi_select.png" class="figure-img" alt="Categories Multi-Select Architecture">
    <div class="figure-caption">Multi-category tagging interface featuring instant text search, Select All / Clear All actions, and primary breadcrumb designation.</div>
  </div>

  <h2>Category Synchronization Pipeline</h2>
  <p>The category selection component (<code>category-multi-select.component.ts</code>) enforces deterministic, race-condition safe categorization:</p>

  <pre class="diagram">
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
5. Admin UI Checkbox &amp; Radio States Render
   ↓
6. Save Product Trigger
   • Constructs array: categories = [{ id, isPrimary }]
   • category_id = primaryId
   • categoryIds = [id1, id2, id3]
  </pre>

  <!-- ==================== VARIANTS ==================== -->
  <div class="page-break"></div>
  <h1>7. PRODUCT VARIANT CONFIGURATION MASTER GUIDE</h1>

  <p>The Variant Engine in <code>src/app/pages/admin/components/catalog-tab.ts</code> orchestrates multi-dimensional variant architectures, dynamic UI components, and automated Cartesian permutations.</p>

  <div class="figure-container">
    <div class="figure-header">
      <span class="figure-number">Figure 4.1 — Product Variant Group Architecture</span>
      <span class="figure-tag">UI-VAR-GRP</span>
    </div>
    <img src="05_product_variants.png" class="figure-img" alt="Product Variant Group Architecture">
    <div class="figure-caption">Variant Group manager showing Internal Name, Display Name, Display Type dropdown, Selection Mode, and active values list.</div>
  </div>

  <h2>The 11 Verified Variant Display Types</h2>
  <table>
    <tr><th style="width: 22%;">Display Type</th><th style="width: 25%;">Storefront UI Element</th><th>Recommended Use Cases &amp; Storefront Experience</th></tr>
    <tr><td><code>chip</code></td><td>Pill buttons (Rounded chips)</td><td>Standard sizing (XS, S, M, L), Nozzle sizes (0.4mm, 0.6mm), Material types (PLA, PETG).</td></tr>
    <tr><td><code>dropdown</code></td><td>HTML <code>&lt;select&gt;</code> Dropdown</td><td>Extensive compatibility lists (> 10 items), printer hardware models, machine spare parts.</td></tr>
    <tr><td><code>image</code></td><td>Photo thumbnail chips (64×64px)</td><td>Multi-color printed model variants, textured surfaces, special edition chassis colors.</td></tr>
    <tr><td><code>card</code></td><td>Rich cards with titles &amp; bullets</td><td>Hardware combo packages (Printer Only, Combo with AMS, Complete Workshop Kit).</td></tr>
    <tr><td><code>radio-chips</code></td><td>Pills with circular radio dots</td><td>Mutually exclusive hardware parameters (110V vs 220V, single vs dual extruder).</td></tr>
    <tr><td><code>color-chips</code></td><td>Circular color dots (32px)</td><td>Filament colors, resin dyes, colored replacement housings with exact hex code swatches.</td></tr>
    <tr><td><code>button-group</code></td><td>Horizontal segmented bar</td><td>Print quality presets (Draft, Standard, Fine), infill percentage steps (20%, 50%, 100%).</td></tr>
    <tr><td><code>bundle-builder</code></td><td>Radio cards + modular slots</td><td>Tiered volume bundles ("Buy 3", "Buy 5") where customer picks specific custom colors per slot.</td></tr>
    <tr><td><code>quantity-selector</code></td><td>Numeric stepper (+ / -)</td><td>Bulk pack hardware, silicone nozzle socks, PTFE tubing packs with volume discounts.</td></tr>
    <tr><td><code>weight-selector</code></td><td>Pills with weight tags</td><td>Consumable spools (250g, 500g, 1kg, 2kg, 5kg) connected directly to courier freight tariffs.</td></tr>
    <tr><td><code>grid-cards</code></td><td>Multi-column comparison grid</td><td>High-impact machine models (Build volume 220×220 vs 300×300 vs 400×400).</td></tr>
  </table>

  <!-- ==================== TEMPLATES & COMBINATIONS ==================== -->
  <div class="page-break"></div>
  <h1>8. DYNAMIC VARIANT TEMPLATES &amp; SAFETY RULES</h1>

  <p>The portal includes <strong>10 pre-engineered templates</strong> to eliminate repetitive manual configuration:</p>

  <div class="figure-container">
    <div class="figure-header">
      <span class="figure-number">Figure 4.2 — Dynamic Variant Templates Library</span>
      <span class="figure-tag">UI-TPL-LIB</span>
    </div>
    <img src="06_variant_templates.png" class="figure-img" alt="Dynamic Variant Templates Library">
    <div class="figure-caption">Template library showing pre-engineered schemas: Filament Color, Spool Weight, Material + Color, and Bundle Starter Packs.</div>
  </div>

  <h2>All 10 Verified Pre-Engineered Templates</h2>
  <table>
    <tr><th style="width: 25%;">Template Name</th><th style="width: 20%;">Category</th><th style="width: 25%;">Predefined Display Type</th><th>Predefined Values &amp; Combinations</th></tr>
    <tr><td><strong>Filament Color</strong></td><td>FILAMENT</td><td><code>chip</code></td><td>8 colors: Red, Blue, Green, Yellow, Orange, Black, White, Grey.</td></tr>
    <tr><td><strong>Filament Weight</strong></td><td>FILAMENT</td><td><code>weight-selector</code></td><td>5 spool tiers: 250g (₹350), 500g (₹550), 1kg (₹899), 2kg (₹1699), 5kg (₹3999).</td></tr>
    <tr><td><strong>Material + Color</strong></td><td>FILAMENT</td><td><code>chip</code> &times; <code>color-chips</code></td><td>5 Materials &times; 6 Colors = 30 Cartesian permutations.</td></tr>
    <tr><td><strong>Material + Weight + Color</strong></td><td>FILAMENT</td><td><code>chip</code> &times; <code>chip</code> &times; <code>color-chips</code></td><td>3 Materials &times; 2 Weights &times; 5 Colors = 30 multi-attribute permutations.</td></tr>
    <tr><td><strong>Product Size</strong></td><td>GENERAL</td><td><code>chip</code></td><td>6 Apparel/Enclosure sizes: XS, S, M, L, XL, XXL.</td></tr>
    <tr><td><strong>Storage / Capacity</strong></td><td>ACCESSORIES</td><td><code>chip</code></td><td>6 Storage tiers: 32GB, 64GB, 128GB, 256GB, 512GB, 1TB.</td></tr>
    <tr><td><strong>Size + Color</strong></td><td>ACCESSORIES</td><td><code>chip</code> &times; <code>color-chips</code></td><td>4 Sizes &times; 4 Colors = 16 permutations for wearables &amp; enclosures.</td></tr>
    <tr><td><strong>Bundle Pack</strong></td><td>BUNDLES</td><td><code>bundle-builder</code></td><td>Tier 1: Buy 1 (₹756), Tier 2: Buy 3 (Save 15%), Tier 3: Buy 5 (Save 20%).</td></tr>
    <tr><td><strong>3D Printer Config</strong></td><td>3D_PRINTER</td><td><code>card</code> &times; <code>chip</code></td><td>Hardware models (A1, P1S, K1) &times; Combos (Printer Only, With AMS).</td></tr>
    <tr><td><strong>Custom Variant</strong></td><td>GENERAL</td><td><code>chip</code></td><td>Blank starting template ready for manual parameter input.</td></tr>
  </table>

  <!-- ==================== COMBINATION MATRIX ==================== -->
  <div class="page-break"></div>
  <h1>9. COMBINATION MATRIX, PRICING &amp; WEIGHT ENGINE</h1>

  <p>Clicking <strong>Generate Combination Matrix</strong> constructs a complete Cartesian permutation table:</p>

  <div class="figure-container">
    <div class="figure-header">
      <span class="figure-number">Figure 4.3 — Cartesian Combination Matrix Console</span>
      <span class="figure-tag">UI-CMB-MTX</span>
    </div>
    <img src="07_combination_matrix.png" class="figure-img" alt="Combination Matrix Console">
    <div class="figure-caption">Cartesian matrix generating unique SKUs, MRPs, Sale Prices, independent stock counters, and calibrated shipping weights.</div>
  </div>

  <h2>Combination Matrix Table Columns</h2>
  <table>
    <tr><th style="width: 15%;">Column</th><th style="width: 15%;">Field</th><th>Operational Function &amp; Downstream Impact</th></tr>
    <tr><td><strong>Status</strong></td><td><code>isActive</code></td><td>Active toggle switch to temporarily disable a permutation without deleting history.</td></tr>
    <tr><td><strong>Default</strong></td><td><code>isDefault</code></td><td>Radio button designating the single permutation loaded on storefront entry.</td></tr>
    <tr><td><strong>SKU</strong></td><td><code>sku</code></td><td>Unique permutation warehouse code (e.g. <code>3DG-FIL-PLA-1KG-RED</code>).</td></tr>
    <tr><td><strong>Barcode</strong></td><td><code>barcode</code></td><td>Scannable barcode string for physical picking and packing slip verification.</td></tr>
    <tr><td><strong>Sale Price</strong></td><td><code>salePrice</code></td><td>Permutation commercial rate overriding base product price at checkout.</td></tr>
    <tr><td><strong>Stock</strong></td><td><code>stock</code></td><td>Permutation inventory counter; disables swatch on storefront when 0.</td></tr>
    <tr><td><strong>Weight (g)</strong></td><td><code>weight</code></td><td>Permutation shipping weight in grams overriding default product weight.</td></tr>
    <tr><td><strong>Image</strong></td><td><code>variantImages</code></td><td>Thumbnail mapped to this permutation, triggered on swatch click.</td></tr>
  </table>

  <!-- ==================== IMAGES TAB ==================== -->
  <div class="page-break"></div>
  <h1>10. IMAGES TAB — GALLERY &amp; VARIANT BINDING</h1>

  <div class="figure-container">
    <div class="figure-header">
      <span class="figure-number">Figure 5.1 — Product Image Gallery &amp; Variant Mapping</span>
      <span class="figure-tag">UI-IMG-MAP</span>
    </div>
    <img src="08_variant_image_mapping.png" class="figure-img" alt="Product Image Gallery & Variant Mapping">
    <div class="figure-caption">Product image gallery with Primary hero asset selection, Move Up/Down reordering, and swatch-to-photo dynamic mapping.</div>
  </div>

  <h2>Image Operational Guidelines</h2>
  <ul>
    <li><strong>Primary Asset:</strong> The first image (marked with gold star) renders as the catalog card thumbnail, Google Shopping image, and WhatsApp share card.</li>
    <li><strong>Ordering:</strong> Use Move Up / Move Down buttons to control the storefront gallery slide sequence.</li>
    <li><strong>Variant Binding:</strong> Map specific gallery photos to variant swatches. When a customer selects "Orange", the storefront gallery immediately animates to the orange spool photo.</li>
    <li><strong>Recommended Specs:</strong> 1:1 Square (1200 &times; 1200px or 800 &times; 800px), WebP format, under 300 KB.</li>
  </ul>

  <!-- ==================== SHIPPING TAB ==================== -->
  <div class="page-break"></div>
  <h1>11. SHIPPING &amp; DELIVERY TAB — LOGISTICS ENGINE</h1>

  <div class="figure-container">
    <div class="figure-header">
      <span class="figure-number">Figure 6.1 — Product Logistics &amp; Shipping Calibration</span>
      <span class="figure-tag">UI-SHP-CFG</span>
    </div>
    <img src="09_shipping_configuration.png" class="figure-img" alt="Product Logistics and Shipping Configuration">
    <div class="figure-caption">Logistics calibration: Unit Weight (g), Shipping Mode Hierarchy, Delivery Days Range, COD toggle, and Live Engine Preview.</div>
  </div>

  <h2>Shipping Mode Precedence Hierarchy</h2>
  <table>
    <tr><th style="width: 25%;">Mode</th><th style="width: 15%;">Precedence</th><th>Logistics Calculation &amp; Tariff Rule</th></tr>
    <tr>
      <td><code>product_specific</code></td>
      <td><strong>Priority 1</strong></td>
      <td>Explicit shipping charge assigned to this product (or Free Shipping Eligible), bypassing all other category or global rules.</td>
    </tr>
    <tr>
      <td><code>category_based</code></td>
      <td><strong>Priority 2</strong></td>
      <td>Inherits weight-bracket and flat rules configured on the primary category.</td>
    </tr>
    <tr>
      <td><code>default</code></td>
      <td><strong>Priority 3</strong></td>
      <td>Falls back to global store shipping rules and order-level free shipping threshold (₹999).</td>
    </tr>
  </table>

  <h2>Dynamic Delivery Date Calculation (IST Asia/Kolkata)</h2>
  <p>The delivery engine (<code>delivery-estimate.service.ts</code>) converts range inputs into calendar dates:</p>
  <ul>
    <li><strong>Input Format:</strong> Hyphenated string (e.g. <code>"5-6"</code>).</li>
    <li><strong>Internal Encoding:</strong> <code>parseEstimateDays("5-6")</code> &rarr; integer <code>506</code> (<code>min * 100 + max</code>).</li>
    <li><strong>Timezone Lock:</strong> Calculated relative to current date in <strong>Asia/Kolkata (IST, UTC+5:30)</strong>.</li>
    <li><strong>Storefront Formatting:</strong>
      <ul>
        <li>Desktop: <code>"10 Aug 2026 – 11 Aug 2026"</code></li>
        <li>Mobile: <code>"10–11 Aug"</code></li>
      </ul>
    </li>
  </ul>

  <!-- ==================== LIVE PREVIEW ==================== -->
  <div class="page-break"></div>
  <h1>12. LIVE STOREFRONT PREVIEW SIMULATOR</h1>

  <p>The in-portal Live Simulator gives administrators a 100% faithful replica of the customer storefront:</p>

  <div class="figure-container">
    <div class="figure-header">
      <span class="figure-number">Figure 7.1 — Live Storefront Customer Simulator</span>
      <span class="figure-tag">UI-SIM-PRE</span>
    </div>
    <img src="10_product_preview.png" class="figure-img" alt="Live Storefront Simulator">
    <div class="figure-caption">In-admin interactive storefront simulator testing live variant selection, price recalculation, stock badges, and COD gating.</div>
  </div>

  <h2>Pre-Publish Simulation Checklist</h2>
  <ul>
    <li>Click every color swatch to confirm active border and image switching.</li>
    <li>Verify that price tags reflect promotional discounts accurately.</li>
    <li>Verify that out-of-stock items show disabled buttons.</li>
    <li>Verify that COD eligibility badge corresponds to product value and weight policies.</li>
  </ul>

  <!-- ==================== CUSTOM MANUFACTURING ==================== -->
  <div class="page-break"></div>
  <h1>13. CUSTOMIZED 3D PRINTING &amp; STL SLICING DATA</h1>

  <div class="figure-container">
    <div class="figure-header">
      <span class="figure-number">Figure 8.1 — Custom Slicing Order Inspection Modal</span>
      <span class="figure-tag">UI-ORD-STL</span>
    </div>
    <img src="11_customized_order_data.png" class="figure-img" alt="Custom Slicing Order Inspection">
    <div class="figure-caption">Admin inspection modal displaying customer STL model geometry, volume (cm³), mass (g), layer height, and estimated print duration.</div>
  </div>

  <h2>Additive Manufacturing Operational Workflow</h2>
  <table>
    <tr><th style="width: 25%;">Parameter</th><th style="width: 25%;">Customer Selection</th><th>Fulfillment Production Impact</th></tr>
    <tr><td><strong>Material Type</strong></td><td>PLA, Tough Resin, Nylon-CF</td><td>Directs workshop operator to appropriate machine bay (FDM or SLA).</td></tr>
    <tr><td><strong>Model Volume / Mass</strong></td><td>Extracted from STL upload (e.g. 42.5 cm³)</td><td>Calculates exact consumable resin/filament consumption for production.</td></tr>
    <tr><td><strong>Infill &amp; Layer Height</strong></td><td>20% Infill • 0.12mm Fine Layer</td><td>Loaded directly into slicing software (Bambu Studio / PrusaSlicer).</td></tr>
    <tr><td><strong>Customer Notes</strong></td><td>Special orientation or thread tapping</td><td>Printed on workshop manufacturing docket.</td></tr>
  </table>

  <!-- ==================== VALIDATION MATRIX ==================== -->
  <div class="page-break"></div>
  <h1>14. MASTER VALIDATION MATRIX</h1>

  <table>
    <tr><th style="width: 18%;">Configuration</th><th style="width: 25%;">Admin Validation</th><th style="width: 25%;">Storefront Validation</th><th>Checkout &amp; Order Impact</th></tr>
    <tr>
      <td><strong>Product Title</strong></td>
      <td>Non-empty string; trimmed.</td>
      <td>PDP header &amp; browser title.</td>
      <td>Printed on tax invoice and courier label.</td>
    </tr>
    <tr>
      <td><strong>Product SKU</strong></td>
      <td>Uppercase alphanumeric; unique.</td>
      <td>Preserved in order payload.</td>
      <td>Barcode scanner verification during packing.</td>
    </tr>
    <tr>
      <td><strong>Categories</strong></td>
      <td>At least 1 selected; 1 primary.</td>
      <td>Mega-menu &amp; category grid.</td>
      <td>Gated for category-specific coupon vouchers.</td>
    </tr>
    <tr>
      <td><strong>Pricing (MRP/Sale)</strong></td>
      <td>Sale &le; MRP; both &gt; 0.</td>
      <td>Shows strike-through and savings pill.</td>
      <td>Locks purchase price against cart tampering.</td>
    </tr>
    <tr>
      <td><strong>Stock Counter</strong></td>
      <td>Integer &ge; 0.</td>
      <td>Disables button when stock = 0.</td>
      <td>Decrements warehouse stock upon payment authorization.</td>
    </tr>
    <tr>
      <td><strong>Variant Matrix</strong></td>
      <td>Exactly 1 default permutation.</td>
      <td>Pre-selects default swatch.</td>
      <td>Line item records exact permutation SKU and specs.</td>
    </tr>
    <tr>
      <td><strong>Unit Weight</strong></td>
      <td>Stored in grams (g).</td>
      <td>Displayed in kg if &ge; 1000g.</td>
      <td>Selects courier freight rate bracket.</td>
    </tr>
    <tr>
      <td><strong>Delivery Days</strong></td>
      <td>Hyphenated range (e.g. <code>5-6</code>).</td>
      <td>Computes dynamic IST dates.</td>
      <td>Sets promised delivery milestone in customer tracking.</td>
    </tr>
  </table>

  <!-- ==================== CHECKLIST & BEST PRACTICES ==================== -->
  <div class="page-break"></div>
  <h1>15. PRODUCTION CHECKLIST &amp; OPERATIONAL BEST PRACTICES</h1>

  <h2>32-Point Pre-Publish Audit Checklist</h2>
  <table>
    <tr><th style="width: 8%;">#</th><th style="width: 32%;">Operational Audit Item</th><th>Verification Standard &amp; Criteria</th></tr>
    <tr><td>1</td><td><strong>Product Title</strong></td><td>Cleanly formatted, capitalized, free of typos (25–80 characters).</td></tr>
    <tr><td>2</td><td><strong>URL Slug</strong></td><td>Lower-case alphanumeric with hyphens; globally unique.</td></tr>
    <tr><td>3</td><td><strong>Base SKU</strong></td><td>Conforms to standard syntax (<code>3DG-CAT-BRD-MODEL</code>).</td></tr>
    <tr><td>4</td><td><strong>Multi-Categories</strong></td><td>At least 1 category checked; canonical primary radio button active.</td></tr>
    <tr><td>5</td><td><strong>Brand Alliance</strong></td><td>Manufacturer assigned from brand master.</td></tr>
    <tr><td>6</td><td><strong>MRP Price</strong></td><td>Anchor price greater than or equal to Retail Sale Price.</td></tr>
    <tr><td>7</td><td><strong>Retail Sale Price</strong></td><td>Commercial selling rate verified for target profit margin.</td></tr>
    <tr><td>8</td><td><strong>Authorized Dealer Rate</strong></td><td>B2B rate populated for wholesale accounts.</td></tr>
    <tr><td>9</td><td><strong>Physical Stock</strong></td><td>Verified against physical shelf count.</td></tr>
    <tr><td>10</td><td><strong>Primary Image</strong></td><td>High-res 1:1 square photo marked with gold star.</td></tr>
    <tr><td>11</td><td><strong>Gallery Sequence</strong></td><td>At least 3 images arranged in logical viewing order.</td></tr>
    <tr><td>12</td><td><strong>Short Description</strong></td><td>2-sentence summary answering core value proposition.</td></tr>
    <tr><td>13</td><td><strong>Technical Specs</strong></td><td>At least 4 structured key-value parameters populated.</td></tr>
    <tr><td>14</td><td><strong>Downloads</strong></td><td>User manual or slicing profile attached.</td></tr>
    <tr><td>15</td><td><strong>Key Features</strong></td><td>At least 3 feature cards configured with icons.</td></tr>
    <tr><td>16</td><td><strong>FAQs</strong></td><td>At least 2 FAQs written with markdown formatting.</td></tr>
    <tr><td>17</td><td><strong>Warranty Terms</strong></td><td>Duration and coverage exclusions documented.</td></tr>
    <tr><td>18</td><td><strong>Variant Groups</strong></td><td>Internal names and customer display labels formatted cleanly.</td></tr>
    <tr><td>19</td><td><strong>Display Type</strong></td><td>Appropriate UI component selected (Chips, Color Chips, Weight).</td></tr>
    <tr><td>20</td><td><strong>Combination Matrix</strong></td><td>Cartesian permutations generated; no missing combinations.</td></tr>
    <tr><td>21</td><td><strong>Permutation SKUs</strong></td><td>Every matrix row has a unique, traceable SKU.</td></tr>
    <tr><td>22</td><td><strong>Permutation Prices</strong></td><td>Individual sale prices verified across all permutations.</td></tr>
    <tr><td>23</td><td><strong>Permutation Stock</strong></td><td>Individual stock numbers assigned per permutation.</td></tr>
    <tr><td>24</td><td><strong>Default Variant</strong></td><td>Exactly ONE permutation flagged as default (<code>isDefault: true</code>).</td></tr>
    <tr><td>25</td><td><strong>Image Mapping</strong></td><td>Gallery photos mapped to color swatches.</td></tr>
    <tr><td>26</td><td><strong>Product Weight (g)</strong></td><td>Unit weight entered in grams including spool packaging tare.</td></tr>
    <tr><td>27</td><td><strong>Shipping Mode</strong></td><td>Correct mode chosen (Product Specific, Category, or Default).</td></tr>
    <tr><td>28</td><td><strong>Delivery Days</strong></td><td>Range formatted strictly as hyphenated string (e.g. <code>5-6</code>).</td></tr>
    <tr><td>29</td><td><strong>COD Availability</strong></td><td>Toggled appropriately based on product value.</td></tr>
    <tr><td>30</td><td><strong>Related Products</strong></td><td>Complementary accessories linked for up-selling.</td></tr>
    <tr><td>31</td><td><strong>SEO Metadata</strong></td><td>Meta Title (&le; 60 chars) and Meta Description (&le; 160 chars) populated.</td></tr>
    <tr><td>32</td><td><strong>Live Simulator Tested</strong></td><td>All swatches clicked and verified in the in-portal preview.</td></tr>
  </table>

  <!-- ==================== TROUBLESHOOTING ==================== -->
  <div class="page-break"></div>
  <h1>16. COMMON CONFIGURATION ERRORS &amp; TROUBLESHOOTING</h1>

  <table>
    <tr><th style="width: 22%;">Failure Symptom</th><th style="width: 25%;">Root Cause</th><th>Operational Resolution</th></tr>
    <tr>
      <td><strong>Product missing from category page.</strong></td>
      <td>No primary category selected or category ID mismatch.</td>
      <td>Open General Tab &rarr; Categories. Select category; ensure primary radio button is selected; save asset.</td>
    </tr>
    <tr>
      <td><strong>PDP displays "₹0" or blank price.</strong></td>
      <td>Matrix generated with 0 prices; no fallback.</td>
      <td>Check Combination Matrix Sale Price column. Enter valid sale price for all combinations or set base Retail Sale Price.</td>
    </tr>
    <tr>
      <td><strong>Customer cannot select swatch.</strong></td>
      <td>Variant stock = 0 and backorders disabled.</td>
      <td>Check Matrix Stock column for that permutation. Adjust counter to reflect verified warehouse stock.</td>
    </tr>
    <tr>
      <td><strong>Swatch click does not change photo.</strong></td>
      <td>Image not mapped to variant combination.</td>
      <td>In Combination Matrix, click image icon on permutation row; link to matching gallery image.</td>
    </tr>
    <tr>
      <td><strong>Delivery date shows static fallback.</strong></td>
      <td>Estimated delivery days input contains invalid characters.</td>
      <td>Format strictly as single digit (<code>3</code>) or range (<code>5-6</code>); eliminate extra words.</td>
    </tr>
    <tr>
      <td><strong>Courier charges customer zero freight.</strong></td>
      <td>Product weight entered as 0g; shipping mode is default.</td>
      <td>In Shipping Tab, enter calibrated weight in grams (e.g. <code>1250</code> for 1kg spool with packaging tare).</td>
    </tr>
    <tr>
      <td><strong>Bundle slots show duplicate error.</strong></td>
      <td><code>allowDuplicates</code> disabled on bundle group.</td>
      <td>In Variant Group modal, check "Allow Duplicate Selection in Slots"; re-save group.</td>
    </tr>
  </table>

  <!-- ==================== SIGN-OFF ==================== -->
  <div class="page-break"></div>
  <h1>17. DOCUMENT HANDOVER &amp; OPERATIONAL ACCEPTANCE</h1>

  <p>This Master Guide confirms that all product configuration capabilities within the 3D Galaxy Admin Portal have been audited, documented, and officially delivered for commercial operations.</p>

  <div style="margin-top: 15px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; background: #f8fafc;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <div style="font-size: 7.2pt; font-weight: 700; color: #ea580c; text-transform: uppercase;">Delivered By</div>
        <div style="font-size: 9.5pt; font-weight: 800; color: #0b1120; margin: 2px 0;">AJR Digital Hub Team</div>
        <div style="font-size: 7.8pt; color: #64748b;">Enterprise Digital Solutions Team</div>
        <div style="margin-top: 25px; border-bottom: 1px solid #94a3b8; width: 85%;"></div>
        <div style="font-size: 7.2pt; color: #94a3b8; margin-top: 4px;">Authorized Signature &amp; Date</div>
      </div>

      <div>
        <div style="font-size: 7.2pt; font-weight: 700; color: #0284c7; text-transform: uppercase;">Accepted By</div>
        <div style="font-size: 9.5pt; font-weight: 800; color: #0b1120; margin: 2px 0;">3D Galaxy Team</div>
        <div style="font-size: 7.8pt; color: #64748b;">E-Commerce Operations &amp; Store Administration</div>
        <div style="margin-top: 25px; border-bottom: 1px solid #94a3b8; width: 85%;"></div>
        <div style="font-size: 7.2pt; color: #94a3b8; margin-top: 4px;">Client Sign-Off &amp; Date</div>
      </div>
    </div>
  </div>

  <div style="margin-top: 30px; text-align: center; font-size: 7.2pt; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
    <strong>AJR DIGITAL HUB</strong> — WHERE IDEAS MEET INNOVATION &bull; CREATIVE &bull; TECHNOLOGY &bull; SOLUTIONS<br>
    Delivered for 3D Galaxy Enterprise E-Commerce &amp; Additive Manufacturing Platform &bull; All Rights Reserved 2026
  </div>

</body>
</html>
`;

fs.writeFileSync(HTML_OUTPUT, htmlContent, 'utf8');
console.log('Successfully written Print HTML to:', HTML_OUTPUT);
console.log('HTML File size:', (fs.statSync(HTML_OUTPUT).size / 1024).toFixed(2), 'KB');
