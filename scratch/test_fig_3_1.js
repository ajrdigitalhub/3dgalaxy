const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC_DIR = path.resolve(__dirname, '../docs/assets/product-configuration');
const OUT_PATH = path.resolve(__dirname, '../scratch/test_fig_3_1.png');

const ORANGE = '#ea580c';
const BLUE = '#0284c7';
const DARK = '#0b1120';
const WHITE = '#ffffff';

function renderWithNaturalPixels(imgSrc, naturalWidth, naturalHeight, config) {
  const {
    viewportWidth = 1280,
    viewportHeight = 760,
    crop = { x: 0, y: 0, width: naturalWidth, height: naturalHeight },
    annotations = []
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
      </style>
    </head>
    <body>
      <div id="viewport">
        <div id="canvas-wrapper">
          <img id="base-img" src="${imgSrc}" />
          ${annotations.map(a => {
            const left = a.x * scale;
            const top = a.y * scale;
            const width = a.w * scale;
            const height = a.h * scale;
            const posClass = a.labelPos ? `pos-${a.labelPos}` : 'pos-top';
            return `
              <div class="annotation-box" style="top: ${top}px; left: ${left}px; width: ${width}px; height: ${height}px;">
                <div class="annotation-header ${posClass}">
                  <div class="annotation-badge">${a.num}</div>
                  ${a.label ? `<div class="annotation-label">${a.label}</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </body>
    </html>
  `;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  const baseImagePath = path.join(SRC_DIR, '02_product_general_top.png');
  const base64Data = fs.readFileSync(baseImagePath).toString('base64');
  const imgSrc = `data:image/png;base64,${base64Data}`;

  const config = {
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
  };

  const html = renderWithNaturalPixels(imgSrc, 3200, 2000, config);
  await page.setViewport({ width: 1280, height: 760, deviceScaleFactor: 1.5 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: OUT_PATH });
  console.log('Generated test image:', OUT_PATH);
  await browser.close();
}

main().catch(console.error);
