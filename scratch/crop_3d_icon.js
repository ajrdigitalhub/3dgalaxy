const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  const b64 = fs.readFileSync(path.resolve(__dirname, '../public/3d-logo.png')).toString('base64');

  await page.setContent(`
    <!DOCTYPE html>
    <html><body>
    <canvas id="c"></canvas>
    <script>
      const img = new Image();
      img.src = 'data:image/png;base64,${b64}';
      img.onload = () => {
        const c = document.getElementById('c');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const d = imgData.data;

        // Check top boundary of GALAXY text:
        let galaxyTopY = 1280;
        for (let y = 800; y < c.height; y++) {
          for (let x = 0; x < c.width; x++) {
            const idx = (y * c.width + x) * 4;
            if (d[idx+3] > 50 && d[idx] < 60 && d[idx+1] < 60 && d[idx+2] < 60) {
              if (y < galaxyTopY) galaxyTopY = y;
            }
          }
        }

        // Bounding box of the 3D mark (strictly above galaxyTopY):
        let minX = c.width, maxX = 0, minY = c.height, maxY = 0;
        for (let y = 0; y < galaxyTopY - 10; y++) {
          for (let x = 0; x < c.width; x++) {
            const idx = (y * c.width + x) * 4;
            if (d[idx+3] > 20) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        window.info = {
          galaxyTopY,
          mark: { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX)/2, cy: (minY + maxY)/2 }
        };
      };
    </script>
    </body></html>
  `);

  await page.waitForFunction('window.info !== undefined');
  const info = await page.evaluate(() => window.info);
  console.log('Result:', JSON.stringify(info, null, 2));

  await browser.close();
}

run().catch(console.error);
