const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC_DIR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration');
const SCRATCH_DIR = path.resolve(__dirname);

// Visual highlight styling tokens
const ORANGE = '#ea580c';
const BLUE = '#0284c7';
const DARK = '#0b1120';
const WHITE = '#ffffff';

/**
 * Enhanced Precision Screenshot Generator
 * - Exact pixel or percentage coordinates with 2-5px visual padding
 * - Outside labels: positioned above the bounding box by default
 * - Never obscures input text or controls
 */
function createAnnotatedHtml(imgSrc, config) {
  const {
    width = 1280,
    height = 760,
    crop, // { top, left, scaleWidth }
    annotations = [],
    customOverlayHtml = ''
  } = config;

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
          width: ${width}px;
          height: ${height}px;
          overflow: hidden;
        }
        #container {
          position: relative;
          width: ${width}px;
          height: ${height}px;
          overflow: hidden;
          background: #090d16;
        }
        #base-img {
          position: absolute;
          ${crop ? `
            top: -${crop.top}%;
            left: -${crop.left}%;
            width: ${crop.scaleWidth || '100'}%;
            height: auto;
          ` : `
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
          `}
          display: block;
        }
        .annotation-box {
          position: absolute;
          border: 2px solid ${ORANGE};
          background: rgba(234, 88, 12, 0.08);
          border-radius: 5px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3), 0 3px 12px rgba(234, 88, 12, 0.35);
          pointer-events: none;
          z-index: 10;
        }
        .annotation-box.blue {
          border-color: ${BLUE};
          background: rgba(2, 132, 199, 0.08);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3), 0 3px 12px rgba(2, 132, 199, 0.35);
        }
        .annotation-header {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 5px;
          z-index: 20;
          pointer-events: none;
          white-space: nowrap;
        }
        .annotation-header.pos-top {
          bottom: calc(100% + 5px);
          left: 0;
        }
        .annotation-header.pos-top-right {
          bottom: calc(100% + 5px);
          right: 0;
        }
        .annotation-header.pos-bottom {
          top: calc(100% + 5px);
          left: 0;
        }
        .annotation-header.pos-right {
          top: 50%;
          left: calc(100% + 6px);
          transform: translateY(-50%);
        }
        .annotation-header.pos-left {
          top: 50%;
          right: calc(100% + 6px);
          transform: translateY(-50%);
        }
        .annotation-badge {
          width: 24px;
          height: 24px;
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
          border: 1px solid ${ORANGE};
          border-radius: 4px;
          padding: 2px 7px;
          font-size: 10px;
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
      <div id="container">
        <img id="base-img" src="${imgSrc}" />
        
        <!-- Annotations -->
        ${annotations.map(a => {
          const posClass = a.labelPos ? `pos-${a.labelPos}` : 'pos-top';
          const isBlue = a.color === 'blue';
          return `
            <div class="annotation-box ${isBlue ? 'blue' : ''}" style="top: ${a.top}%; left: ${a.left}%; width: ${a.width}%; height: ${a.height}%;">
              <div class="annotation-header ${posClass}">
                <div class="annotation-badge ${isBlue ? 'blue' : ''}">${a.num}</div>
                ${a.label ? `<div class="annotation-label ${isBlue ? 'blue' : ''}">${a.label}</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}

        <!-- Custom Overlay -->
        ${customOverlayHtml}
      </div>
    </body>
    </html>
  `;
}

async function testFigures() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  // Test Figure 2.1: tour_02_general_identity.png
  // Base: 02_product_general_top.png (3200x2000)
  // Let's determine exact crop and annotation coordinates
  {
    const baseImagePath = path.join(SRC_DIR, '02_product_general_top.png');
    const base64Data = fs.readFileSync(baseImagePath).toString('base64');
    const imgSrc = `data:image/png;base64,${base64Data}`;

    // Crop focused on form fields:
    // In 3200x2000 image:
    // Form starts around x=580, y=550 (tab bar is y=600-660, fields start y=700)
    // Container: 1280x760
    // If crop = { top: 32, left: 18, scaleWidth: 122 }
    // Let's measure exact bounds on container:
    // Input Product Title: x: 20%, y: 38.2%, w: 37.8%, h: 4.5%
    // Input URL Slug: x: 59.2%, y: 38.2%, w: 37.8%, h: 4.5%
    // Input SKU Barcode: x: 20%, y: 47.3%, w: 37.8%, h: 4.5%
    // Categories Search: x: 20%, y: 56.8%, w: 65.2%, h: 3.8%
    const config = {
      width: 1280,
      height: 760,
      crop: { top: 30, left: 17, scaleWidth: '120' },
      annotations: [
        { num: '①', top: 38.2, left: 20.3, width: 37.8, height: 4.4, label: 'Product Title', labelPos: 'top' },
        { num: '②', top: 38.2, left: 59.3, width: 37.8, height: 4.4, label: 'URL Slug', labelPos: 'top' },
        { num: '③', top: 47.4, left: 20.3, width: 37.8, height: 4.4, label: 'SKU / Barcode', labelPos: 'top' },
        { num: '④', top: 57.0, left: 20.3, width: 65.5, height: 3.8, label: 'Category Search', labelPos: 'top' },
        { num: '⑤', top: 67.2, left: 21.2, width: 13.2, height: 5.2, label: 'Selected Tag', labelPos: 'top' },
        { num: '⑥', top: 76.5, left: 21.5, width: 10.5, height: 3.4, label: 'Category Checkbox', labelPos: 'right' }
      ]
    };

    const html = createAnnotatedHtml(imgSrc, config);
    await page.setViewport({ width: 1280, height: 760, deviceScaleFactor: 1.5 });
    await page.setContent(html);
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'test_tour_02.png') });
    console.log('Saved test_tour_02.png');
  }

  // Test Figure 3.1: tour_03_category_selector.png
  // Base: 02_product_general_top.png focused specifically on Category Multi-Select!
  {
    const baseImagePath = path.join(SRC_DIR, '02_product_general_top.png');
    const base64Data = fs.readFileSync(baseImagePath).toString('base64');
    const imgSrc = `data:image/png;base64,${base64Data}`;

    // Let's zoom tightly into the Categories component:
    // In 3200x2000 image, categories starts at y=1050 to y=1950, x=580 to 3100
    // Container: 1280x760
    const config = {
      width: 1280,
      height: 760,
      crop: { top: 51, left: 17, scaleWidth: '120' },
      annotations: [
        { num: '①', top: 7.2, left: 20.3, width: 65.5, height: 4.8, label: 'Category Search', labelPos: 'bottom' },
        { num: '②', top: 7.2, left: 86.6, width: 5.2, height: 4.8, label: 'Select All', labelPos: 'bottom' },
        { num: '③', top: 7.2, left: 92.4, width: 5.0, height: 4.8, label: 'Clear All', labelPos: 'bottom' },
        { num: '④', top: 31.8, left: 21.5, width: 11.2, height: 4.2, label: 'Category Checkbox', labelPos: 'top' },
        { num: '⑤', top: 20.8, left: 28.5, width: 4.8, height: 4.2, label: 'Primary Radio', labelPos: 'right' },
        { num: '⑥', top: 19.8, left: 21.2, width: 13.5, height: 6.4, label: 'Selected Category Tags', labelPos: 'top' }
      ]
    };

    const html = createAnnotatedHtml(imgSrc, config);
    await page.setViewport({ width: 1280, height: 760, deviceScaleFactor: 1.5 });
    await page.setContent(html);
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'test_tour_03.png') });
    console.log('Saved test_tour_03.png');
  }

  await browser.close();
}

testFigures().catch(console.error);
