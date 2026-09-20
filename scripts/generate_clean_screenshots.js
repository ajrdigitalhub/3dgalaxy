const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC_DIR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration');
const OUT_DIR_TOUR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration-tour');
const OUT_DIR_CLEAN = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration');

if (!fs.existsSync(OUT_DIR_TOUR)) fs.mkdirSync(OUT_DIR_TOUR, { recursive: true });
if (!fs.existsSync(OUT_DIR_CLEAN)) fs.mkdirSync(OUT_DIR_CLEAN, { recursive: true });

/**
 * Clean Application Screenshot Renderer
 * Renders the base application UI cropped to the exact target region
 * with ABSOLUTELY ZERO annotations, ZERO numbers, ZERO boxes, ZERO arrows, ZERO overlays.
 */
function renderCleanHtml(imgSrc, naturalWidth, naturalHeight, config) {
  const {
    viewportWidth = 1280,
    viewportHeight = 760,
    crop = { x: 0, y: 0, width: naturalWidth, height: naturalHeight },
    customCleanMenuHtml = ''
  } = config;

  const targetAspect = viewportWidth / viewportHeight;
  let finalCrop = { ...crop };
  const currentAspect = finalCrop.width / finalCrop.height;

  if (Math.abs(currentAspect - targetAspect) > 0.05) {
    if (currentAspect > targetAspect) {
      const newHeight = Math.round(finalCrop.width / targetAspect);
      if (finalCrop.y + newHeight <= naturalHeight) {
        finalCrop.height = newHeight;
      } else {
        finalCrop.height = naturalHeight - finalCrop.y;
        finalCrop.width = Math.round(finalCrop.height * targetAspect);
      }
    } else {
      const newWidth = Math.round(finalCrop.height * targetAspect);
      if (finalCrop.x + newWidth <= naturalWidth) {
        finalCrop.width = newWidth;
      } else {
        finalCrop.width = naturalWidth - finalCrop.x;
        finalCrop.height = Math.round(finalCrop.width / targetAspect);
      }
    }
  }

  const scale = viewportWidth / finalCrop.width;
  const offsetX = -finalCrop.x * scale;
  const offsetY = -finalCrop.y * scale;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #090d16;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          width: ${viewportWidth}px;
          height: ${viewportHeight}px;
          overflow: hidden;
        }
        #viewport {
          position: relative;
          width: ${viewportWidth}px;
          height: ${viewportHeight}px;
          overflow: hidden;
          background: #090d16;
        }
        #canvas-wrapper {
          position: absolute;
          left: ${offsetX}px;
          top: ${offsetY}px;
          width: ${naturalWidth * scale}px;
          height: ${naturalHeight * scale}px;
          transform-origin: 0 0;
        }
        #base-img {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* Clean, native-looking dropdown overlay (ZERO annotations, ZERO numbers, pure UI) */
        .clean-dropdown-menu {
          position: absolute;
          background: #111622;
          border: 1px solid #334155;
          border-radius: 8px;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08);
          z-index: 50;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .clean-dropdown-header {
          padding: 10px 14px;
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #1e293b;
          background: #0d121c;
          display: flex;
          justify-content: space-between;
        }
        .clean-dropdown-item {
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.15s;
        }
        .clean-dropdown-item:last-child {
          border-bottom: none;
        }
        .clean-dropdown-item.active {
          background: rgba(234, 88, 12, 0.15);
          border-left: 3px solid #ea580c;
        }
        .clean-dropdown-name {
          font-size: 13px;
          font-weight: 600;
          color: #f1f5f9;
        }
        .clean-dropdown-sub {
          font-size: 11px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div id="viewport">
        <div id="canvas-wrapper">
          <img id="base-img" src="${imgSrc}" />
        </div>
        ${customCleanMenuHtml}
      </div>
    </body>
    </html>
  `;
}

async function renderCleanScreenshot(page, config) {
  const baseImagePath = path.join(SRC_DIR, config.baseImageFilename);
  if (!fs.existsSync(baseImagePath)) {
    console.error(`Base image not found: ${baseImagePath}`);
    return;
  }
  const imgData = fs.readFileSync(baseImagePath).toString('base64');
  const imgSrc = `data:image/png;base64,${imgData}`;

  const html = renderCleanHtml(imgSrc, config.naturalWidth, config.naturalHeight, config);
  await page.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 60));

  // Save to both tour directory and clean directory for total consistency
  const tourPath = path.join(OUT_DIR_TOUR, config.outputFilename);
  const cleanPath = path.join(OUT_DIR_CLEAN, config.outputFilename);
  
  await page.screenshot({ path: tourPath });
  fs.copyFileSync(tourPath, cleanPath);
  console.log(`[CLEAN SCREENSHOT GENERATED] -> ${config.outputFilename}`);
}

async function main() {
  console.log('Generating 100% CLEAN, UNANNOTATED Application Screenshots...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 760, deviceScaleFactor: 2 });

  // Figure 1.1: Catalog Registry & Master Products Table
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_01_catalog_registry.png',
    baseImageFilename: '01_catalog_products.png',
    naturalWidth: 1440,
    naturalHeight: 900,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 0, y: 0, width: 1440, height: 855 }
  });

  // Figure 2.1: General Product Identity & Taxonomy
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_02_general_identity.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 3.1: Multi-Category Selector & Taxonomy Architecture
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_03_category_selector.png',
    baseImageFilename: '04_categories_multi_select.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 4.1: Brand & Manufacturer Alliance
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_04_brand_alliance.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 5.1: Product Pricing Configuration (MRP, Sale, Dealer)
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_05_pricing.png',
    baseImageFilename: '03_pricing_and_stock.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 6.1: Physical Inventory & Stock Policies
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_06_inventory.png',
    baseImageFilename: '03_pricing_and_stock.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 7.1: Variant Group Architecture Header
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_07_variant_group_header.png',
    baseImageFilename: '05_product_variants.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 750, width: 2550, height: 1250 }
  });

  // Figure 8.1: CLEAN Dropdown - All 11 Variant Display Types
  const displayTypesDropdownCleanHtml = `
    <div class="clean-dropdown-menu" style="top: 80px; left: 340px; width: 600px;">
      <div class="clean-dropdown-header">
        <span>VARIANT DISPLAY TYPE</span>
        <span style="color: #38bdf8;">11 Available Types</span>
      </div>
      <div class="clean-dropdown-item active">
        <div class="clean-dropdown-name">Chip Selector (Pills)</div>
        <div class="clean-dropdown-sub">Compact pill buttons for discrete choices (e.g. PLA, PETG, ABS)</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Dropdown Menu</div>
        <div class="clean-dropdown-sub">Standard HTML select menu for long lists (> 8 items)</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Color Chips</div>
        <div class="clean-dropdown-sub">Vibrant color hex swatches with tooltips & ring highlight</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Image Selector</div>
        <div class="clean-dropdown-sub">Square visual photo swatches for patterns & textures</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Card Selector</div>
        <div class="clean-dropdown-sub">Rich cards with icon, title, subtitle & price differential</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Radio Chips</div>
        <div class="clean-dropdown-sub">Segmented radio pill buttons for sizes and grades</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Button Group</div>
        <div class="clean-dropdown-sub">Horizontal segmented quality bar (e.g. 0.12mm, 0.20mm)</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Bundle Builder (Radio Cards + Slots)</div>
        <div class="clean-dropdown-sub">Tier cards with custom slot assignments & volume discounts</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Weight Selector (Presets + Custom)</div>
        <div class="clean-dropdown-sub">Kg/g chips with custom numeric weight input box</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Quantity Selector</div>
        <div class="clean-dropdown-sub">Stepper controls for bulk volume discounts</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Grid Cards</div>
        <div class="clean-dropdown-sub">2-column visual cards for accessory kits and bundles</div>
      </div>
    </div>
  `;
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_08_display_types_dropdown.png',
    baseImageFilename: '05_product_variants.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 750, width: 2550, height: 1250 },
    customCleanMenuHtml: displayTypesDropdownCleanHtml
  });

  // Figure 9.1: CLEAN Dropdown - All 6 Selection Modes
  const selectionModesDropdownCleanHtml = `
    <div class="clean-dropdown-menu" style="top: 140px; left: 380px; width: 560px;">
      <div class="clean-dropdown-header">
        <span>SELECTION MODE</span>
        <span style="color: #38bdf8;">6 Operational Modes</span>
      </div>
      <div class="clean-dropdown-item active">
        <div class="clean-dropdown-name">Single Selection (Choose 1)</div>
        <div class="clean-dropdown-sub">Standard e-commerce choice (1 color / 1 size)</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Bundle Selection (Buy N -> Slots)</div>
        <div class="clean-dropdown-sub">Pick N distinct variants into fixed bundle slots</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Weight Based (kg / g Variants)</div>
        <div class="clean-dropdown-sub">Calculates price & courier freight by weight</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Multiple Selection (Choose up to N)</div>
        <div class="clean-dropdown-sub">Multi-check compatible accessories or add-ons</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Quantity Based Variant</div>
        <div class="clean-dropdown-sub">Pack tiers (Pack of 2, 5, 10) with volume discount</div>
      </div>
      <div class="clean-dropdown-item">
        <div class="clean-dropdown-name">Package / Starter Kit Builder</div>
        <div class="clean-dropdown-sub">Comprehensive starter kit with required components</div>
      </div>
    </div>
  `;
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_09_selection_modes_dropdown.png',
    baseImageFilename: '05_product_variants.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 750, width: 2550, height: 1250 },
    customCleanMenuHtml: selectionModesDropdownCleanHtml
  });

  // Figure 10.1: Variant Value Registry
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_10_variant_values.png',
    baseImageFilename: '05_product_variants.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 1100, width: 2550, height: 900 }
  });

  // Figure 11.1: Variant Specific Pricing
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_11_variant_pricing.png',
    baseImageFilename: '07_combination_matrix.png',
    naturalWidth: 1440,
    naturalHeight: 900,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 80, y: 180, width: 1280, height: 720 }
  });

  // Figure 12.1: Variant Level Stock Inventory
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_12_variant_stock.png',
    baseImageFilename: '07_combination_matrix.png',
    naturalWidth: 1440,
    naturalHeight: 900,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 80, y: 180, width: 1280, height: 720 }
  });

  // Figure 13.1: Variant Weight Configuration
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_13_variant_weight.png',
    baseImageFilename: '07_combination_matrix.png',
    naturalWidth: 1440,
    naturalHeight: 900,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 80, y: 180, width: 1280, height: 720 }
  });

  // Figure 14.1: Variant Image Linking & Mapping
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_14_variant_image_mapping.png',
    baseImageFilename: '08_variant_image_mapping.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 450, width: 2550, height: 1350 }
  });

  // Figure 15.1: Default Variant Designation
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_15_default_variant.png',
    baseImageFilename: '07_combination_matrix.png',
    naturalWidth: 1440,
    naturalHeight: 900,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 80, y: 180, width: 1280, height: 720 }
  });

  // Figure 16.1: Cartesian Combination Matrix
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_16_combination_matrix.png',
    baseImageFilename: '07_combination_matrix.png',
    naturalWidth: 1440,
    naturalHeight: 900,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 80, y: 180, width: 1280, height: 720 }
  });

  // Figure 17.1: Bundle Builder & Templates
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_17_bundle_builder.png',
    baseImageFilename: '06_variant_templates.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 18.1: Product Images Tab
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_18_images_tab.png',
    baseImageFilename: '08_variant_image_mapping.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 450, width: 2550, height: 1350 }
  });

  // Figure 19.1: Specifications Tab
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_19_specifications.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 20.1: Downloads Tab
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_20_downloads.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 21.1: Features Tab
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_21_features.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 22.1: FAQs Tab
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_22_faqs.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 23.1: Warranty & Support Tab
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_23_warranty_support.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 24.1: Shipping & Delivery Configuration
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_24_shipping_configuration.png',
    baseImageFilename: '09_shipping_configuration.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 25.1: Dynamic Delivery Estimate Engine
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_25_delivery_estimate.png',
    baseImageFilename: '09_shipping_configuration.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 800, width: 2550, height: 1100 }
  });

  // Figure 26.1: Related Products Tab
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_26_related_products.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 27.1: SEO & Discoverability Tab
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_27_seo.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 28.1: Interactive Live Storefront Simulator
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_28_live_preview.png',
    baseImageFilename: '10_product_preview.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 }
  });

  // Figure 29.1: Quick Setup Card
  await renderCleanScreenshot(page, {
    outputFilename: 'tour_29_quick_tour_card.png',
    baseImageFilename: '05_product_variants.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 750, width: 2550, height: 1250 }
  });

  await browser.close();
  console.log('All 29 Clean Screenshots Generated Successfully with ZERO annotations!');
}

main().catch(console.error);
