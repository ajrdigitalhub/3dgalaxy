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
    <body style="margin:0;">
      <canvas id="c"></canvas>
      <script>
        const img = new Image();
        img.src = "data:image/png;base64,${b64}";
        img.onload = () => {
          const c = document.getElementById('c');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          window.imgReady = true;
          window.dims = { w: img.naturalWidth, h: img.naturalHeight };
        };
      </script>
    </body>
    </html>
  `);

  await page.waitForFunction('window.imgReady === true');
  const dims = await page.evaluate(() => window.dims);
  console.log('3d-logo.png dimensions:', dims);

  // Scan bounding box of the colorful 3D mark (excluding the black "GALAXY" text at the bottom)
  const markBbox = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    const { w, h } = window.dims;
    
    // Scan all pixels that are colorful (i.e. saturation > 0.2 and not black)
    // The "3" and triangle are magenta (#ff007f), purple (#6f00ff), cyan (#00f2fe).
    // The "GALAXY" text is almost pure black (#050505, #000000).
    let minX = w, maxX = 0, minY = h, maxY = 0;
    
    // We only scan down to 70% of height to avoid any black text
    for (let y = 0; y < Math.floor(h * 0.75); y++) {
      for (let x = 0; x < w; x++) {
        const p = ctx.getImageData(x, y, 1, 1).data;
        const alpha = p[3];
        if (alpha > 30) {
          const r = p[0], g = p[1], b = p[2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          // If it is colorful or bright non-black
          if (sat > 0.2 && max > 50) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    }
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  });

  console.log('3D mark bounding box:', markBbox);
  await browser.close();
}

main().catch(console.error);
