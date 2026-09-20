const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  const b64 = fs.readFileSync(path.resolve(__dirname, '../public/3d-logo.png')).toString('base64');

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0; background: #1a1a1a; font-family: sans-serif;">
      <canvas id="srcCanvas"></canvas>
      <canvas id="outCanvas"></canvas>
      <div id="tabSimulation" style="padding: 20px; display: flex; flex-direction: column; gap: 15px;"></div>

      <script>
        const img = new Image();
        img.src = "data:image/png;base64,${b64}";
        img.onload = () => {
          const sc = document.getElementById('srcCanvas');
          sc.width = img.naturalWidth;
          sc.height = img.naturalHeight;
          const sctx = sc.getContext('2d');
          sctx.drawImage(img, 0, 0);

          // Exact 3D emblem bounding box without GALAXY text
          const sx = 129;
          const sy = 214;
          const sw = 1026;
          const sh = 609;

          window.renderFavicon = function(size) {
            const oc = document.getElementById('outCanvas');
            oc.width = size;
            oc.height = size;
            const ctx = oc.getContext('2d');
            ctx.clearRect(0, 0, size, size);

            // Fill 94% of the width, vertically centered
            const paddingRatio = 0.04;
            const targetW = size * (1 - paddingRatio * 2);
            const targetH = targetW * (sh / sw);
            const dx = (size - targetW) / 2;
            const dy = (size - targetH) / 2;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(sc, sx, sy, sw, sh, dx, dy, targetW, targetH);

            return oc.toDataURL('image/png');
          };

          window.ready = true;
        };
      </script>
    </body>
    </html>
  `);

  await page.waitForFunction('window.ready === true');

  // Let's generate a browser tab simulation to preview
  const icon32 = await page.evaluate(() => window.renderFavicon(32));
  const icon64 = await page.evaluate(() => window.renderFavicon(64));
  const icon180 = await page.evaluate(() => window.renderFavicon(180));

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 30px;
          background: #121513;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .comparison-container {
          display: flex;
          flex-direction: column;
          gap: 25px;
          max-width: 800px;
        }
        .title {
          font-size: 18px;
          font-weight: 600;
          color: #a1a1aa;
        }
        /* Chrome / Edge Tab mockup (Dark theme matching user screenshot) */
        .tab-bar-mockup {
          background: #1b221d;
          padding: 8px 12px 0 12px;
          border-radius: 8px 8px 0 0;
          display: flex;
          align-items: flex-end;
          gap: 6px;
        }
        .active-tab {
          background: #232c25;
          color: #f4f4f5;
          padding: 8px 14px;
          border-radius: 8px 8px 0 0;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 12px;
          font-weight: 500;
          width: 180px;
          box-shadow: 0 -1px 3px rgba(0,0,0,0.2);
        }
        .tab-icon {
          width: 16px;
          height: 16px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .tab-title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tab-close {
          margin-left: auto;
          color: #71717a;
          font-size: 14px;
        }
        .inactive-tab {
          color: #71717a;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          width: 140px;
        }
        /* Light theme tab mockup */
        .light-tab-bar {
          background: #dee1e6;
        }
        .light-active-tab {
          background: #ffffff;
          color: #1f1f1f;
        }
        .icon-grid {
          display: flex;
          gap: 20px;
          align-items: center;
          background: #1f2421;
          padding: 20px;
          border-radius: 8px;
        }
        .icon-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #a1a1aa;
        }
      </style>
    </head>
    <body>
      <div class="comparison-container">
        <h2 style="margin: 0 0 10px 0;">3D Galaxy Favicon Optimization Verification</h2>
        
        <div class="title">Dark Browser Tab (User's Environment):</div>
        <div class="tab-bar-mockup">
          <div class="active-tab">
            <img class="tab-icon" src="${icon32}" />
            <span class="tab-title">3D Galaxy | Buy 3D Printers...</span>
            <span class="tab-close">×</span>
          </div>
          <div class="inactive-tab">
            <span class="tab-title">AJR Digital Hub</span>
          </div>
        </div>

        <div class="title">Light Browser Tab:</div>
        <div class="tab-bar-mockup light-tab-bar">
          <div class="active-tab light-active-tab">
            <img class="tab-icon" src="${icon32}" />
            <span class="tab-title">3D Galaxy | Buy 3D Printers...</span>
            <span class="tab-close">×</span>
          </div>
          <div class="inactive-tab">
            <span class="tab-title">Google</span>
          </div>
        </div>

        <div class="title">Icons at Standard Sizes:</div>
        <div class="icon-grid">
          <div class="icon-box">
            <img src="${icon32}" style="width: 16px; height: 16px;" />
            <span>16×16 (Tab)</span>
          </div>
          <div class="icon-box">
            <img src="${icon32}" style="width: 24px; height: 24px;" />
            <span>24×24</span>
          </div>
          <div class="icon-box">
            <img src="${icon32}" style="width: 32px; height: 32px;" />
            <span>32×32 (Retina)</span>
          </div>
          <div class="icon-box">
            <img src="${icon64}" style="width: 48px; height: 48px;" />
            <span>48×48 (Taskbar)</span>
          </div>
          <div class="icon-box">
            <img src="${icon64}" style="width: 64px; height: 64px;" />
            <span>64×64</span>
          </div>
          <div class="icon-box">
            <img src="${icon180}" style="width: 90px; height: 90px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.1);" />
            <span>Apple Touch (180)</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);

  const previewPath = path.resolve(__dirname, 'mockup_verification.png');
  await page.screenshot({ path: previewPath, fullPage: true });
  console.log('Saved verification screenshot:', previewPath);

  await browser.close();
}

main().catch(console.error);
