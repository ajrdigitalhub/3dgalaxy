const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC_DIR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration');
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration-tour');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Visual highlight styling tokens (AJR Digital Hub theme)
const ORANGE = '#ea580c';
const BLUE = '#0284c7';
const DARK = '#0b1120';
const WHITE = '#ffffff';

/**
 * Natural Pixel Coordinate Precision Renderer
 * Bounding boxes are specified directly in the base image's natural pixels!
 * This guarantees 2-5px tight visual padding without percentage drift or scaling distortion.
 */
function renderWithNaturalPixels(imgSrc, naturalWidth, naturalHeight, config) {
  const {
    viewportWidth = 1280,
    viewportHeight = 760,
    crop = { x: 0, y: 0, width: naturalWidth, height: naturalHeight },
    annotations = [],
    customOverlayHtml = ''
  } = config;

  // Auto-fit crop to exact aspect ratio if specified
  const targetAspect = viewportWidth / viewportHeight;
  let finalCrop = { ...crop };
  const currentAspect = finalCrop.width / finalCrop.height;

  if (Math.abs(currentAspect - targetAspect) > 0.05) {
    if (currentAspect > targetAspect) {
      // Crop is too wide -> increase height
      const newHeight = Math.round(finalCrop.width / targetAspect);
      if (finalCrop.y + newHeight <= naturalHeight) {
        finalCrop.height = newHeight;
      } else {
        finalCrop.height = naturalHeight - finalCrop.y;
        finalCrop.width = Math.round(finalCrop.height * targetAspect);
      }
    } else {
      // Crop is too tall -> increase width
      const newWidth = Math.round(finalCrop.height * targetAspect);
      if (finalCrop.x + newWidth <= naturalWidth) {
        finalCrop.width = newWidth;
      } else {
        finalCrop.width = naturalWidth - finalCrop.x;
        finalCrop.height = Math.round(finalCrop.width / targetAspect);
      }
    }
  }

  // Compute uniform scale so cropped region fits viewport exactly
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
        .annotation-box {
          position: absolute;
          border: ${Math.max(2, Math.round(2.5 * scale))}px solid ${ORANGE};
          background: rgba(234, 88, 12, 0.08);
          border-radius: ${Math.round(6 * scale)}px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4), 0 3px 12px rgba(234, 88, 12, 0.4);
          pointer-events: none;
          z-index: 10;
        }
        .annotation-box.blue {
          border-color: ${BLUE};
          background: rgba(2, 132, 199, 0.08);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4), 0 3px 12px rgba(2, 132, 199, 0.4);
        }
        .annotation-header {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 20;
          pointer-events: none;
          white-space: nowrap;
        }
        .annotation-header.pos-top {
          bottom: calc(100% + 6px);
          left: 0;
        }
        .annotation-header.pos-top-right {
          bottom: calc(100% + 6px);
          right: 0;
        }
        .annotation-header.pos-bottom {
          top: calc(100% + 6px);
          left: 0;
        }
        .annotation-header.pos-bottom-right {
          top: calc(100% + 6px);
          right: 0;
        }
        .annotation-header.pos-right {
          top: 50%;
          left: calc(100% + 8px);
          transform: translateY(-50%);
        }
        .annotation-header.pos-left {
          top: 50%;
          right: calc(100% + 8px);
          transform: translateY(-50%);
        }
        .annotation-badge {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: ${ORANGE};
          color: ${WHITE};
          border: 1.5px solid ${WHITE};
          font-weight: 800;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
          flex-shrink: 0;
        }
        .annotation-badge.blue {
          background: ${BLUE};
        }
        .annotation-label {
          background: ${DARK};
          color: #f8fafc;
          border: 1.5px solid ${ORANGE};
          border-radius: 4px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
        }
        .annotation-label.blue {
          border-color: ${BLUE};
        }
        ${customOverlayHtml ? `
        .dropdown-menu-overlay {
          position: absolute;
          background: #0f172a;
          border: 2px solid ${ORANGE};
          border-radius: 8px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.85);
          z-index: 30;
          color: #ffffff;
          overflow: hidden;
          font-size: 12px;
        }
        .dropdown-header {
          background: #1e293b;
          padding: 8px 12px;
          font-weight: 800;
          color: #fb923c;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.8px;
          display: flex;
          justify-content: space-between;
        }
        .dropdown-item {
          padding: 7px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          position: relative;
        }
        .dropdown-item:hover, .dropdown-item.active {
          background: rgba(234, 88, 12, 0.25);
          color: #ffffff;
        }
        .dropdown-item-badge {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: ${ORANGE};
          color: #ffffff;
          font-weight: 800;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 8px;
          flex-shrink: 0;
        }
        .dropdown-item-name {
          font-weight: 600;
          flex-grow: 1;
        }
        .dropdown-item-sub {
          color: #94a3b8;
          font-size: 10px;
          margin-left: 8px;
        }
        ` : ''}
      </style>
    </head>
    <body>
      <div id="viewport">
        <div id="canvas-wrapper">
          <img id="base-img" src="${imgSrc}" />
          
          <!-- Annotations positioned in scaled pixels on canvas-wrapper -->
          ${annotations.map(a => {
            const left = a.x * scale;
            const top = a.y * scale;
            const width = a.w * scale;
            const height = a.h * scale;
            const posClass = a.labelPos ? `pos-${a.labelPos}` : 'pos-top';
            const isBlue = a.color === 'blue';
            return `
              <div class="annotation-box ${isBlue ? 'blue' : ''}" style="top: ${top}px; left: ${left}px; width: ${width}px; height: ${height}px;">
                <div class="annotation-header ${posClass}">
                  <div class="annotation-badge ${isBlue ? 'blue' : ''}">${a.num}</div>
                  ${a.label ? `<div class="annotation-label ${isBlue ? 'blue' : ''}">${a.label}</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Custom Overlays sitting directly on viewport to prevent clipping -->
        ${customOverlayHtml}
      </div>
    </body>
    </html>
  `;
}

async function renderPrecisionScreenshot(page, config) {
  const {
    outputFilename,
    baseImageFilename,
    naturalWidth = 3200,
    naturalHeight = 2000,
    viewportWidth = 1280,
    viewportHeight = 760,
    crop,
    annotations = [],
    customOverlayHtml = ''
  } = config;

  const baseImagePath = path.join(SRC_DIR, baseImageFilename);
  if (!fs.existsSync(baseImagePath)) {
    console.warn(`Base image not found: ${baseImagePath}`);
    return;
  }

  const base64Data = fs.readFileSync(baseImagePath).toString('base64');
  const imgSrc = `data:image/png;base64,${base64Data}`;

  const html = renderWithNaturalPixels(imgSrc, naturalWidth, naturalHeight, {
    viewportWidth,
    viewportHeight,
    crop,
    annotations,
    customOverlayHtml
  });

  await page.setViewport({ width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1.5 });
  await page.setContent(html, { waitUntil: 'load' });
  const outPath = path.join(OUT_DIR, outputFilename);
  await page.screenshot({ path: outPath });
  console.log(`Rendered: ${outputFilename}`);
}

async function run() {
  console.log('Launching Chromium for precision screenshot annotation...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Figure 1.1: STEP 01 - Catalog Registry Console
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_01_catalog_registry.png',
    baseImageFilename: '01_catalog_products.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 150, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 622, y: 382, w: 2470, h: 88, label: 'Search Catalog', labelPos: 'top' },
      { num: '②', x: 2855, y: 215, w: 275, h: 78, label: 'Register SKU', labelPos: 'top-right' },
      { num: '③', x: 1390, y: 775, w: 380, h: 65, label: 'Category Column', labelPos: 'top' },
      { num: '④', x: 2170, y: 770, w: 300, h: 65, label: 'Stock Status Pill', labelPos: 'top' },
      { num: '⑤', x: 2495, y: 775, w: 265, h: 65, label: 'Retail / Dealer Price', labelPos: 'top' },
      { num: '⑥', x: 2835, y: 770, w: 215, h: 70, label: 'Actions Toolbar', labelPos: 'top-right' }
    ]
  });

  // Figure 2.1: STEP 02 - Product General Identity
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_02_general_identity.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 622, y: 760, w: 1210, h: 80, label: 'Product Title', labelPos: 'top' },
      { num: '②', x: 1872, y: 760, w: 1210, h: 80, label: 'URL Slug', labelPos: 'top' },
      { num: '③', x: 622, y: 940, w: 1210, h: 80, label: 'SKU / Barcode', labelPos: 'top' },
      { num: '④', x: 622, y: 1125, w: 2075, h: 80, label: 'Categories Architecture', labelPos: 'top' },
      { num: '⑤', x: 645, y: 1348, w: 425, h: 82, label: 'Selected Category Tag', labelPos: 'top' },
      { num: '⑥', x: 645, y: 1530, w: 320, h: 50, label: 'Category Checkbox', labelPos: 'right' }
    ]
  });

  // Figure 3.1: STEP 03 - Multi-Category Selector
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_03_category_selector.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 622, y: 1125, w: 2075, h: 80, label: 'Category Search', labelPos: 'top' },
      { num: '②', x: 2720, y: 1125, w: 190, h: 80, label: 'Select All', labelPos: 'bottom' },
      { num: '③', x: 2928, y: 1125, w: 160, h: 80, label: 'Clear All', labelPos: 'top-right' },
      { num: '④', x: 645, y: 1530, w: 320, h: 50, label: 'Category Checkboxes', labelPos: 'right' },
      { num: '⑤', x: 872, y: 1358, w: 125, h: 60, label: 'Primary Radio', labelPos: 'bottom' },
      { num: '⑥', x: 645, y: 1348, w: 220, h: 72, label: 'Selected Category Tags', labelPos: 'top' }
    ]
  });

  // Figure 4.1: STEP 04 - Brand / Manufacturer Alliance
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_04_brand_alliance.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 622, y: 760, w: 1210, h: 80, label: 'Brand Dropdown', labelPos: 'top' },
      { num: '②', x: 1872, y: 760, w: 1210, h: 80, label: 'Manufacturer Partner', labelPos: 'top' },
      { num: '③', x: 650, y: 1330, w: 425, h: 95, label: 'Storefront Brand Filter Badge', labelPos: 'top', color: 'blue' }
    ]
  });

  // Figure 5.1: STEP 05 - Product Pricing Configuration
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_05_pricing.png',
    baseImageFilename: '03_pricing_and_stock.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 622, y: 760, w: 780, h: 80, label: 'MRP (Anchor)', labelPos: 'top' },
      { num: '②', x: 1450, y: 760, w: 780, h: 80, label: 'Retail Sale Price', labelPos: 'top' },
      { num: '③', x: 2280, y: 760, w: 780, h: 80, label: 'Dealer Price (B2B)', labelPos: 'top' },
      { num: '④', x: 622, y: 940, w: 1210, h: 80, label: 'Customer Savings Banner', labelPos: 'top' }
    ]
  });

  // Figure 6.1: STEP 06 - Product Physical Inventory
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_06_inventory.png',
    baseImageFilename: '03_pricing_and_stock.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 622, y: 760, w: 1210, h: 80, label: 'Physical Stock Count', labelPos: 'top' },
      { num: '②', x: 1872, y: 760, w: 1210, h: 80, label: 'Active Toggle', labelPos: 'top' },
      { num: '③', x: 622, y: 940, w: 1210, h: 80, label: 'Out of Stock Policy', labelPos: 'top' }
    ]
  });

  // Figure 7.1: STEP 07 - Variant Group Architecture Header
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_07_variant_group_header.png',
    baseImageFilename: '05_product_variants.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 750, width: 2550, height: 1250 },
    annotations: [
      { num: '①', x: 2650, y: 1155, w: 380, h: 85, label: '+ Add Variant Group', labelPos: 'top-right' },
      { num: '②', x: 705, y: 1615, w: 1130, h: 90, label: 'Variant Name (Internal)', labelPos: 'top' },
      { num: '③', x: 1870, y: 1615, w: 1125, h: 90, label: 'Display Name (Frontend)', labelPos: 'top' },
      { num: '④', x: 705, y: 1785, w: 1130, h: 85, label: 'Display Type Selector', labelPos: 'top' },
      { num: '⑤', x: 1870, y: 1785, w: 1125, h: 85, label: 'Selection Mode Selector', labelPos: 'top' },
      { num: '⑥', x: 710, y: 1910, w: 240, h: 55, label: 'Required Field', labelPos: 'bottom' },
      { num: '⑦', x: 970, y: 1910, w: 150, h: 55, label: 'Active', labelPos: 'bottom' },
      { num: '⑧', x: 1130, y: 1910, w: 490, h: 55, label: 'Allow Duplicate in Slots', labelPos: 'bottom-right' }
    ]
  });

  // Figure 8.1: STEP 08 - DROPDOWN TOUR: All 11 Variant Display Types
  const displayTypesDropdownHtml = `
    <div class="dropdown-menu-overlay" style="top: 80px; left: 340px; width: 600px;">
      <div class="dropdown-header">
        <span>VARIANT TYPE & DISPLAY MODE (11 VERIFIED STYLES)</span>
        <span style="color: #38bdf8;">variant-engine.model.ts</span>
      </div>
      <div class="dropdown-item active">
        <div class="dropdown-item-badge">①</div>
        <div class="dropdown-item-name">Chip Selector (Pills)</div>
        <div class="dropdown-item-sub">Rounded clickable buttons for standard sizes</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">②</div>
        <div class="dropdown-item-name">Dropdown Menu</div>
        <div class="dropdown-item-sub">Compact HTML select for > 10 items</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">③</div>
        <div class="dropdown-item-name">Image Selector</div>
        <div class="dropdown-item-sub">64x64px photo thumbnail chips</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">④</div>
        <div class="dropdown-item-name">Card Selector</div>
        <div class="dropdown-item-sub">Rich hardware cards with titles & features</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">⑤</div>
        <div class="dropdown-item-name">Radio Chips</div>
        <div class="dropdown-item-sub">Mutually exclusive options with radio dot</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">⑥</div>
        <div class="dropdown-item-name">Color Chips</div>
        <div class="dropdown-item-sub">Hex color circular dots (Filaments & Resins)</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">⑦</div>
        <div class="dropdown-item-name">Button Group</div>
        <div class="dropdown-item-sub">Horizontal segmented quality bar (0.12, 0.20mm)</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">⑧</div>
        <div class="dropdown-item-name">Bundle Builder (Radio Cards + Slots)</div>
        <div class="dropdown-item-sub">Tier cards with custom slot assignments</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">⑨</div>
        <div class="dropdown-item-name">Weight Selector (Presets + Custom)</div>
        <div class="dropdown-item-sub">Kg/g chips with custom numeric weight box</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">⑩</div>
        <div class="dropdown-item-name">Quantity Selector</div>
        <div class="dropdown-item-sub">Stepper controls for bulk volume discounts</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">⑪</div>
        <div class="dropdown-item-name">Grid Cards</div>
        <div class="dropdown-item-sub">2-column visual cards for accessory kits</div>
      </div>
    </div>
  `;
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_08_display_types_dropdown.png',
    baseImageFilename: '05_product_variants.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 750, width: 2550, height: 1250 },
    annotations: [
      { num: '▼', x: 705, y: 1785, w: 1130, h: 85, label: 'Display Mode Dropdown', labelPos: 'top' }
    ],
    customOverlayHtml: displayTypesDropdownHtml
  });

  // Figure 9.1: STEP 09 - DROPDOWN TOUR: All 6 Selection Modes
  const selectionModesDropdownHtml = `
    <div class="dropdown-menu-overlay" style="top: 140px; left: 380px; width: 560px;">
      <div class="dropdown-header">
        <span>SELECTION MODE (6 VERIFIED OPERATIONAL MODES)</span>
        <span style="color: #38bdf8;">variant-engine.model.ts</span>
      </div>
      <div class="dropdown-item active">
        <div class="dropdown-item-badge">①</div>
        <div class="dropdown-item-name">Single Selection (Choose 1)</div>
        <div class="dropdown-item-sub">Standard e-commerce choice (1 color / 1 size)</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">②</div>
        <div class="dropdown-item-name">Bundle Selection (Buy N → Slots)</div>
        <div class="dropdown-item-sub">Pick N distinct variants into fixed bundle slots</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">③</div>
        <div class="dropdown-item-name">Weight Based (kg / g variants)</div>
        <div class="dropdown-item-sub">Calculates price & courier freight by weight</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">④</div>
        <div class="dropdown-item-name">Multiple Selection (Choose up to N)</div>
        <div class="dropdown-item-sub">Multi-check compatible accessories</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">⑤</div>
        <div class="dropdown-item-name">Quantity Based Variant</div>
        <div class="dropdown-item-sub">Pack tiers (Pack of 2, 5, 10) with volume price</div>
      </div>
      <div class="dropdown-item">
        <div class="dropdown-item-badge">⑥</div>
        <div class="dropdown-item-name">Package / Starter Kit Builder</div>
        <div class="dropdown-item-sub">Hardware printer + free tool kit combo</div>
      </div>
    </div>
  `;
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_09_selection_modes_dropdown.png',
    baseImageFilename: '05_product_variants.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 750, width: 2550, height: 1250 },
    annotations: [
      { num: '▼', x: 1870, y: 1785, w: 1125, h: 85, label: 'Selection Mode Dropdown', labelPos: 'top' }
    ],
    customOverlayHtml: selectionModesDropdownHtml
  });

  // Figure 10.1: STEP 10 - Variant Values Configuration
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_10_variant_values.png',
    baseImageFilename: '05_product_variants.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 1200, width: 2550, height: 800 },
    annotations: [
      { num: '①', x: 705, y: 1615, w: 1130, h: 90, label: 'Option Name', labelPos: 'top' },
      { num: '②', x: 705, y: 1785, w: 1130, h: 85, label: 'Value Selector', labelPos: 'top' },
      { num: '③', x: 1870, y: 1785, w: 1125, h: 85, label: 'Selection Mode', labelPos: 'top' },
      { num: '④', x: 710, y: 1910, w: 240, h: 55, label: 'Required Field', labelPos: 'bottom' },
      { num: '⑤', x: 970, y: 1910, w: 150, h: 55, label: 'Active', labelPos: 'bottom' }
    ]
  });

  // Figure 11.1: STEP 11 - Variant Specific Pricing
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_11_variant_pricing.png',
    baseImageFilename: '07_combination_matrix.png',
    naturalWidth: 1440,
    naturalHeight: 900,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 80, y: 180, width: 1280, height: 720 },
    annotations: [
      { num: '①', x: 995, y: 275, w: 65, h: 35, label: 'Variant MRP', labelPos: 'top' },
      { num: '②', x: 1065, y: 275, w: 65, h: 35, label: 'Variant Sale Price', labelPos: 'top' },
      { num: '③', x: 1065, y: 415, w: 65, h: 35, label: 'Dealer Override', labelPos: 'right', color: 'blue' },
      { num: '④', x: 620, y: 280, w: 180, h: 30, label: 'Permutation SKU', labelPos: 'top' }
    ]
  });

  // Figure 12.1: STEP 12 - Variant Level Stock Inventory
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_12_variant_stock.png',
    baseImageFilename: '07_combination_matrix.png',
    naturalWidth: 1440,
    naturalHeight: 900,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 80, y: 180, width: 1280, height: 720 },
    annotations: [
      { num: '①', x: 825, y: 275, w: 150, h: 35, label: 'Permutation Stock', labelPos: 'top' },
      { num: '②', x: 825, y: 415, w: 150, h: 35, label: 'Available Status', labelPos: 'right' },
      { num: '③', x: 825, y: 785, w: 150, h: 35, label: 'Out of Stock Lock', labelPos: 'right' }
    ]
  });

  // Figure 13.1: STEP 13 - Variant Weight Configuration
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_13_variant_weight.png',
    baseImageFilename: '07_combination_matrix.png',
    naturalWidth: 1440,
    naturalHeight: 900,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 80, y: 180, width: 1280, height: 720 },
    annotations: [
      { num: '①', x: 825, y: 275, w: 150, h: 35, label: 'Variant Weight', labelPos: 'top' },
      { num: '②', x: 995, y: 275, w: 65, h: 35, label: 'Tare Unit (g/kg)', labelPos: 'top' },
      { num: '③', x: 1065, y: 275, w: 65, h: 35, label: 'Shipping Multiplier', labelPos: 'top' }
    ]
  });

  // Figure 14.1: STEP 14 - Variant Image Linking & Mapping
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_14_variant_image_mapping.png',
    baseImageFilename: '08_variant_image_mapping.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 450, width: 2550, height: 1350 },
    annotations: [
      { num: '①', x: 675, y: 830, w: 370, h: 370, label: 'Hero Photo', labelPos: 'top' },
      { num: '②', x: 1070, y: 830, w: 370, h: 370, label: 'Gallery Photo 2', labelPos: 'top' },
      { num: '③', x: 935, y: 835, w: 105, h: 40, label: 'Primary Badge', labelPos: 'right' },
      { num: '④', x: 2665, y: 830, w: 370, h: 370, label: 'Upload Dropzone', labelPos: 'top' }
    ]
  });

  // Figure 15.1: STEP 15 - Default Variant Designation
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_15_default_variant.png',
    baseImageFilename: '07_combination_matrix.png',
    naturalWidth: 1440,
    naturalHeight: 900,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 80, y: 180, width: 1280, height: 720 },
    annotations: [
      { num: '①', x: 105, y: 260, w: 45, h: 65, label: 'Default Star / Radio', labelPos: 'top' },
      { num: '②', x: 155, y: 260, w: 260, h: 30, label: 'Default Permutation', labelPos: 'top' },
      { num: '③', x: 995, y: 275, w: 135, h: 35, label: 'Initial Storefront Price', labelPos: 'top' }
    ]
  });

  // Figure 16.1: STEP 16 - Cartesian Combination Matrix
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_16_combination_matrix.png',
    baseImageFilename: '07_combination_matrix.png',
    naturalWidth: 1440,
    naturalHeight: 900,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 80, y: 180, width: 1280, height: 720 },
    annotations: [
      { num: '①', x: 105, y: 260, w: 45, h: 65, label: 'Default', labelPos: 'top' },
      { num: '②', x: 155, y: 290, w: 85, h: 25, label: 'Status', labelPos: 'bottom' },
      { num: '③', x: 155, y: 260, w: 260, h: 25, label: 'Permutation', labelPos: 'top' },
      { num: '④', x: 620, y: 280, w: 180, h: 30, label: 'SKU', labelPos: 'top' },
      { num: '⑤', x: 995, y: 275, w: 65, h: 35, label: 'MRP', labelPos: 'top' },
      { num: '⑥', x: 1065, y: 275, w: 65, h: 35, label: 'Sale Price', labelPos: 'top' },
      { num: '⑦', x: 825, y: 275, w: 150, h: 35, label: 'Stock', labelPos: 'top' },
      { num: '⑧', x: 1065, y: 415, w: 65, h: 35, label: 'Weight', labelPos: 'right' },
      { num: '⑨', x: 1150, y: 275, w: 100, h: 35, label: 'Actions', labelPos: 'top-right' }
    ]
  });

  // Figure 17.1: STEP 17 - Bundle Builder & Tier Tiers
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_17_bundle_builder.png',
    baseImageFilename: '06_variant_templates.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 660, y: 560, w: 200, h: 70, label: 'All Templates Tab', labelPos: 'top' },
      { num: '②', x: 670, y: 650, w: 740, h: 320, label: 'Filament Template Card', labelPos: 'top' },
      { num: '③', x: 1475, y: 650, w: 740, h: 320, label: 'Weight Template Card', labelPos: 'top' },
      { num: '④', x: 2280, y: 650, w: 740, h: 320, label: 'Material + Color Card', labelPos: 'top' },
      { num: '⑤', x: 1120, y: 885, w: 270, h: 75, label: 'Preview & Use Button', labelPos: 'top' }
    ]
  });

  // Figure 18.1: STEP 18 - Product Images Tab
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_18_images_tab.png',
    baseImageFilename: '08_variant_image_mapping.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 450, width: 2550, height: 1350 },
    annotations: [
      { num: '①', x: 2665, y: 830, w: 370, h: 370, label: 'Upload Dropzone', labelPos: 'top' },
      { num: '②', x: 675, y: 830, w: 370, h: 370, label: 'Primary Hero (Gold Star)', labelPos: 'top' },
      { num: '③', x: 1070, y: 830, w: 370, h: 370, label: 'Move Up / Down', labelPos: 'top' },
      { num: '④', x: 1470, y: 830, w: 370, h: 370, label: 'Delete Photo', labelPos: 'top' }
    ]
  });

  // Figure 19.1: STEP 19 - Specifications Tab
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_19_specifications.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 1020, y: 600, w: 200, h: 55, label: 'Specifications Tab', labelPos: 'top' },
      { num: '②', x: 622, y: 760, w: 1210, h: 80, label: 'Parameter Name Input', labelPos: 'top' },
      { num: '③', x: 1872, y: 760, w: 1210, h: 80, label: 'Parameter Value Input', labelPos: 'top' },
      { num: '④', x: 622, y: 940, w: 1210, h: 80, label: 'Engineering Unit', labelPos: 'top' },
      { num: '⑤', x: 622, y: 1130, w: 2095, h: 70, label: '+ Add Specification Row', labelPos: 'top' }
    ]
  });

  // Figure 20.1: STEP 20 - Downloads Tab
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_20_downloads.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 1240, y: 600, w: 160, h: 55, label: 'Downloads Tab', labelPos: 'top' },
      { num: '②', x: 622, y: 760, w: 1210, h: 80, label: 'Document Title', labelPos: 'top' },
      { num: '③', x: 1872, y: 760, w: 1210, h: 80, label: 'File Type (PDF/STL)', labelPos: 'top' },
      { num: '④', x: 622, y: 940, w: 1210, h: 80, label: 'Download Test', labelPos: 'top' }
    ]
  });

  // Figure 21.1: STEP 21 - Features Tab
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_21_features.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 1420, y: 600, w: 130, h: 55, label: 'Features Tab', labelPos: 'top' },
      { num: '②', x: 622, y: 760, w: 1210, h: 80, label: 'Feature Title', labelPos: 'top' },
      { num: '③', x: 1872, y: 760, w: 1210, h: 80, label: 'Material Icon Selector', labelPos: 'top' },
      { num: '④', x: 622, y: 940, w: 1210, h: 80, label: '+ Add Feature Card', labelPos: 'top' }
    ]
  });

  // Figure 22.1: STEP 22 - FAQs Tab
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_22_faqs.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 1570, y: 600, w: 90, h: 55, label: 'FAQs Tab', labelPos: 'top' },
      { num: '②', x: 622, y: 760, w: 1210, h: 80, label: 'Question Input', labelPos: 'top' },
      { num: '③', x: 1872, y: 760, w: 1210, h: 80, label: 'Markdown Answer Editor', labelPos: 'top' },
      { num: '④', x: 622, y: 940, w: 1210, h: 80, label: 'Active / Sort Order', labelPos: 'top' }
    ]
  });

  // Figure 23.1: STEP 23 - Warranty & Support Tab
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_23_warranty_support.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 1680, y: 600, w: 270, h: 55, label: 'Warranty & Support Tab', labelPos: 'top' },
      { num: '②', x: 622, y: 760, w: 1210, h: 80, label: 'Warranty Duration', labelPos: 'top' },
      { num: '③', x: 1872, y: 760, w: 1210, h: 80, label: 'Dedicated Support Phone', labelPos: 'top' },
      { num: '④', x: 622, y: 940, w: 1210, h: 80, label: 'Helpdesk Email & Terms', labelPos: 'top' }
    ]
  });

  // Figure 24.1: STEP 24 - Shipping & Delivery Tab
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_24_shipping_configuration.png',
    baseImageFilename: '09_shipping_configuration.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 550, width: 2550, height: 1350 },
    annotations: [
      { num: '①', x: 705, y: 850, w: 2335, h: 100, label: 'Product Weight (g)', labelPos: 'top' },
      { num: '②', x: 670, y: 1110, w: 770, h: 140, label: 'Shipping Mode: Specific', labelPos: 'top' },
      { num: '③', x: 2265, y: 1110, w: 775, h: 140, label: 'Shipping Mode: Default', labelPos: 'top-right' },
      { num: '④', x: 1860, y: 1390, w: 550, h: 130, label: 'Effective Charge (₹)', labelPos: 'top' },
      { num: '⑤', x: 670, y: 1585, w: 460, h: 110, label: 'COD Available Toggle', labelPos: 'top' }
    ]
  });

  // Figure 25.1: STEP 25 - Dynamic Delivery Date Estimation
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_25_delivery_estimate.png',
    baseImageFilename: '09_shipping_configuration.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 950, width: 2550, height: 950 },
    annotations: [
      { num: '①', x: 2430, y: 1390, w: 575, h: 130, label: 'Estimated Delivery Days', labelPos: 'top-right' },
      { num: '②', x: 1860, y: 1390, w: 550, h: 130, label: 'Effective Charge Calc', labelPos: 'top' },
      { num: '③', x: 1250, y: 1390, w: 580, h: 130, label: 'Default Shipping Engine', labelPos: 'top' }
    ]
  });

  // Figure 26.1: STEP 26 - Related Products Cross-Sell Tab
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_26_related_products.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 2240, y: 600, w: 240, h: 55, label: 'Related Products Tab', labelPos: 'top' },
      { num: '②', x: 622, y: 760, w: 1210, h: 80, label: 'Catalog Search Input', labelPos: 'top' },
      { num: '③', x: 1872, y: 760, w: 1210, h: 80, label: '+ Link Accessory Card', labelPos: 'top' }
    ]
  });

  // Figure 27.1: STEP 27 - SEO Search Optimization Tab
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_27_seo.png',
    baseImageFilename: '02_product_general_top.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 480, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 2500, y: 600, w: 80, h: 55, label: 'SEO Tab', labelPos: 'top' },
      { num: '②', x: 622, y: 760, w: 1210, h: 80, label: 'Meta Title (60 chars)', labelPos: 'top' },
      { num: '③', x: 1872, y: 760, w: 1210, h: 80, label: 'Meta Description (160 chars)', labelPos: 'top' },
      { num: '④', x: 622, y: 940, w: 1210, h: 80, label: 'Canonical URL Identifier', labelPos: 'top' },
      { num: '⑤', x: 622, y: 1130, w: 2095, h: 70, label: 'OpenGraph Social Card', labelPos: 'top' }
    ]
  });

  // Figure 28.1: STEP 28 - Live Storefront Preview & Publish
  await renderPrecisionScreenshot(page, {
    outputFilename: 'tour_28_live_preview.png',
    baseImageFilename: '10_product_preview.png',
    naturalWidth: 3200,
    naturalHeight: 2000,
    viewportWidth: 1280,
    viewportHeight: 760,
    crop: { x: 550, y: 150, width: 2550, height: 1514 },
    annotations: [
      { num: '①', x: 2650, y: 200, w: 380, h: 85, label: 'SAVE ASSET / PUBLISH', labelPos: 'bottom' },
      { num: '②', x: 705, y: 850, w: 2335, h: 100, label: 'Verify Weight & Logistics', labelPos: 'top' },
      { num: '③', x: 670, y: 1110, w: 770, h: 140, label: 'Verify Shipping Modes', labelPos: 'top' },
      { num: '④', x: 1860, y: 1390, w: 550, h: 130, label: 'Verify Dynamic Freight', labelPos: 'top' },
      { num: '⑤', x: 2430, y: 1390, w: 575, h: 130, label: 'Verify Delivery Estimate', labelPos: 'top' }
    ]
  });

  // Figure 29.1: Condensed 10-Point Quick Tour Summary Card
  const quickTourHtml = `
    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #070b14 0%, #0f172a 100%); display: flex; flex-direction: column; justify-content: space-between; padding: 28px; box-sizing: border-box;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ea580c; padding-bottom: 12px;">
        <div>
          <div style="color: #ea580c; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px;">3D GALAXY ADMIN PORTAL</div>
          <div style="color: #ffffff; font-weight: 800; font-size: 22px;">10-POINT QUICK VISUAL TOUR SUMMARY</div>
        </div>
        <div style="background: #1e293b; border: 1px solid #38bdf8; color: #38bdf8; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 4px;">
          5-10 MINUTE ONBOARDING CHEATSHEET
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin: 16px 0;">
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #ea580c; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 13px;">①</div>
          <div style="color: #f8fafc; font-weight: 700; font-size: 13px;">General Identity</div>
          <div style="color: #94a3b8; font-size: 11px;">Set clean Title, unique URL Slug, and valid SKU.</div>
        </div>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #ea580c; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 13px;">②</div>
          <div style="color: #f8fafc; font-weight: 700; font-size: 13px;">Categories</div>
          <div style="color: #94a3b8; font-size: 11px;">Multi-tag categories & assign primary breadcrumb.</div>
        </div>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #ea580c; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 13px;">③</div>
          <div style="color: #f8fafc; font-weight: 700; font-size: 13px;">Pricing & Stock</div>
          <div style="color: #94a3b8; font-size: 11px;">Enter MRP, Retail Sale, Dealer B2B rate & physical stock.</div>
        </div>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #ea580c; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 13px;">④</div>
          <div style="color: #f8fafc; font-weight: 700; font-size: 13px;">Variant Groups</div>
          <div style="color: #94a3b8; font-size: 11px;">Select from 11 display types and 6 selection modes.</div>
        </div>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #ea580c; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 13px;">⑤</div>
          <div style="color: #f8fafc; font-weight: 700; font-size: 13px;">Combination Matrix</div>
          <div style="color: #94a3b8; font-size: 11px;">Review permutations, individual SKUs & stock counts.</div>
        </div>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #0284c7; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 13px;">⑥</div>
          <div style="color: #f8fafc; font-weight: 700; font-size: 13px;">Default Variant ★</div>
          <div style="color: #94a3b8; font-size: 11px;">Flag exactly ONE default variant for initial customer load.</div>
        </div>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #0284c7; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 13px;">⑦</div>
          <div style="color: #f8fafc; font-weight: 700; font-size: 13px;">Image Mapping</div>
          <div style="color: #94a3b8; font-size: 11px;">Map hero photos to color swatches for dynamic switching.</div>
        </div>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #0284c7; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 13px;">⑧</div>
          <div style="color: #f8fafc; font-weight: 700; font-size: 13px;">Weight & Shipping</div>
          <div style="color: #94a3b8; font-size: 11px;">Enter tare weight in grams & delivery window ("5-6").</div>
        </div>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #0284c7; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 13px;">⑨</div>
          <div style="color: #f8fafc; font-weight: 700; font-size: 13px;">SEO & Metadata</div>
          <div style="color: #94a3b8; font-size: 11px;">60-char title, 160-char description & OpenGraph cards.</div>
        </div>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #16a34a; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 13px;">⑩</div>
          <div style="color: #f8fafc; font-weight: 700; font-size: 13px;">Live Preview & Save</div>
          <div style="color: #94a3b8; font-size: 11px;">Test swatches and pricing in live simulator, then publish.</div>
        </div>
      </div>
      <div style="background: rgba(234, 88, 12, 0.15); border: 1px solid #ea580c; border-radius: 6px; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; color: #fb923c; font-size: 11px; font-weight: 600;">
        <span>OPERATIONAL RULE: Always test the live storefront switcher before clicking SAVE ASSET!</span>
        <span style="color: #ffffff;">AJR DIGITAL HUB • 3D GALAXY</span>
      </div>
    </div>
  `;
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;">${quickTourHtml}</body></html>`);
  await page.setViewport({ width: 1280, height: 760, deviceScaleFactor: 1.5 });
  await page.screenshot({ path: path.join(OUT_DIR, 'tour_29_quick_tour_card.png') });
  console.log('Rendered: tour_29_quick_tour_card.png');

  await browser.close();
  console.log('=====================================================');
  console.log('SUCCESS! All 29 precision annotated screenshots generated in:');
  console.log(OUT_DIR);
  console.log('=====================================================');
}

run().catch(err => {
  console.error('Failed to generate annotated screenshots:', err);
  process.exit(1);
});
