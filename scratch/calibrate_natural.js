const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC_DIR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration');
const SCRATCH_DIR = path.resolve(__dirname);

// Styling tokens
const ORANGE = '#ea580c';
const BLUE = '#0284c7';
const DARK = '#0b1120';
const WHITE = '#ffffff';

/**
 * Natural Pixel Coordinate Renderer
 * Bounding boxes are specified directly in the base image's natural pixels!
 */
function renderWithNaturalPixels(imgSrc, naturalWidth, naturalHeight, config) {
  const {
    viewportWidth = 1280,
    viewportHeight = 760,
    crop = { x: 0, y: 0, width: naturalWidth, height: naturalHeight },
    annotations = [],
    customOverlayHtml = ''
  } = config;

  // Compute scale so cropped region fits viewport
  const scaleX = viewportWidth / crop.width;
  const scaleY = viewportHeight / crop.height;
  const scale = Math.min(scaleX, scaleY);

  // Center the cropped area if aspect ratio doesn't match perfectly
  const offsetX = -crop.x * scale + (viewportWidth - crop.width * scale) / 2;
  const offsetY = -crop.y * scale + (viewportHeight - crop.height * scale) / 2;

  // Scale factor for font & badge sizing inside scaled canvas
  const invScale = 1 / scale;

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
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35), 0 3px 12px rgba(234, 88, 12, 0.4);
          pointer-events: none;
          z-index: 10;
        }
        .annotation-box.blue {
          border-color: ${BLUE};
          background: rgba(2, 132, 199, 0.08);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35), 0 3px 12px rgba(2, 132, 199, 0.4);
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
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: ${ORANGE};
          color: ${WHITE};
          border: 2px solid ${WHITE};
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

          ${customOverlayHtml}
        </div>
      </div>
    </body>
    </html>
  `;
}

async function testNaturalCoords() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  // Test 1: Figure 2.1 (General Product Identity)
  {
    const baseImagePath = path.join(SRC_DIR, '02_product_general_top.png');
    const base64Data = fs.readFileSync(baseImagePath).toString('base64');
    const imgSrc = `data:image/png;base64,${base64Data}`;

    // Crop to the top form area: x: 550 to 3150 (width 2600), y: 640 to 1800 (height 1160)
    const config = {
      viewportWidth: 1280,
      viewportHeight: 760,
      crop: { x: 550, y: 640, width: 2600, height: 1200 },
      annotations: [
        { num: '①', x: 622, y: 760, w: 1210, h: 80, label: 'Product Title', labelPos: 'top' },
        { num: '②', x: 1872, y: 760, w: 1210, h: 80, label: 'URL Slug', labelPos: 'top' },
        { num: '③', x: 622, y: 940, w: 1210, h: 80, label: 'SKU / Barcode', labelPos: 'top' },
        { num: '④', x: 622, y: 1130, w: 2095, h: 70, label: 'Category Search', labelPos: 'top' },
        { num: '⑤', x: 650, y: 1330, w: 425, h: 95, label: 'Selected Category Tag', labelPos: 'top' },
        { num: '⑥', x: 650, y: 1520, w: 320, h: 55, label: 'Category Checkbox', labelPos: 'right' }
      ]
    };

    const html = renderWithNaturalPixels(imgSrc, 3200, 2000, config);
    await page.setViewport({ width: 1280, height: 760, deviceScaleFactor: 1.5 });
    await page.setContent(html);
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'natural_tour_02.png') });
    console.log('Saved natural_tour_02.png');
  }

  // Test 2: Figure 3.1 (Multi-Category Selector)
  {
    const baseImagePath = path.join(SRC_DIR, '02_product_general_top.png');
    const base64Data = fs.readFileSync(baseImagePath).toString('base64');
    const imgSrc = `data:image/png;base64,${base64Data}`;

    // Crop focused tightly on the Category Multi-Select component:
    // x: 550 to 3150, y: 1040 to 1980 (height 940)
    const config = {
      viewportWidth: 1280,
      viewportHeight: 760,
      crop: { x: 550, y: 1040, width: 2600, height: 950 },
      annotations: [
        { num: '①', x: 622, y: 1130, w: 2095, h: 70, label: 'Category Search', labelPos: 'bottom' },
        { num: '②', x: 2740, y: 1130, w: 165, h: 70, label: 'Select All', labelPos: 'bottom' },
        { num: '③', x: 2925, y: 1130, w: 160, h: 70, label: 'Clear All', labelPos: 'bottom' },
        { num: '④', x: 650, y: 1520, w: 330, h: 55, label: 'Category Checkbox', labelPos: 'right' },
        { num: '⑤', x: 815, y: 1350, w: 175, h: 55, label: 'Primary Radio', labelPos: 'right' },
        { num: '⑥', x: 650, y: 1330, w: 425, h: 95, label: 'Selected Category Tags', labelPos: 'top' }
      ]
    };

    const html = renderWithNaturalPixels(imgSrc, 3200, 2000, config);
    await page.setViewport({ width: 1280, height: 760, deviceScaleFactor: 1.5 });
    await page.setContent(html);
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'natural_tour_03.png') });
    console.log('Saved natural_tour_03.png');
  }

  await browser.close();
}

testNaturalCoords().catch(console.error);
