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
    <body style="margin:0; background: #111;">
      <canvas id="srcCanvas"></canvas>
      <canvas id="outCanvas"></canvas>
      <script>
        const img = new Image();
        img.src = "data:image/png;base64,${b64}";
        img.onload = () => {
          const sc = document.getElementById('srcCanvas');
          sc.width = img.naturalWidth;
          sc.height = img.naturalHeight;
          const sctx = sc.getContext('2d');
          sctx.drawImage(img, 0, 0);

          // Bounding box of 3D mark:
          // minX: 129, maxX: 1151, minY: 214, maxY: 822
          // width: 1022, height: 608
          // Center: (640, 518)
          // To make a square with balanced padding:
          // Size = width * 1.08 = ~1100
          window.renderSquareIcon = function(outSize) {
            const oc = document.getElementById('outCanvas');
            oc.width = outSize;
            oc.height = outSize;
            const octx = oc.getContext('2d');
            octx.clearRect(0, 0, outSize, outSize);

            // Source rectangle
            const srcSize = 1100;
            const sx = 640 - (srcSize / 2); // 90
            const sy = 518 - (srcSize / 2); // -32 -> clamp to 0 with offset
            
            // Draw cropped to outSize
            // If sy < 0, handle clipping smoothly
            octx.drawImage(sc, sx, Math.max(0, sy), srcSize, srcSize, 0, 0, outSize, outSize);
            return oc.toDataURL('image/png');
          };

          window.imgReady = true;
        };
      </script>
    </body>
    </html>
  `);

  await page.waitForFunction('window.imgReady === true');

  // Let's generate 512, 192, 64, 48, 32, 16 sizes
  const sizes = [512, 192, 180, 64, 48, 32, 16];
  const outDir = path.resolve(__dirname, '../public');

  for (const sz of sizes) {
    const dataUrl = await page.evaluate((s) => window.renderSquareIcon(s), sz);
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const outPath = path.join(outDir, `favicon-${sz}x${sz}.png`);
    fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
    console.log(`Wrote: ${outPath} (${sz}x${sz})`);
  }

  // Also write standard apple-touch-icon.png (180x180)
  fs.copyFileSync(path.join(outDir, 'favicon-180x180.png'), path.join(outDir, 'apple-touch-icon.png'));
  console.log('Wrote: apple-touch-icon.png');

  // Also write standard favicon-32x32.png and favicon-16x16.png
  // And let's generate a test preview image to view it
  const previewPath = path.resolve(__dirname, '../scratch/test_tab_preview.png');
  await page.evaluate(() => window.renderSquareIcon(64));
  const outCanvas = await page.$('#outCanvas');
  await outCanvas.screenshot({ path: previewPath });
  console.log('Wrote test preview:', previewPath);

  await browser.close();
}

main().catch(console.error);
