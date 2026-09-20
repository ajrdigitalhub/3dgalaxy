const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC_DIR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration');
const SCRATCH_DIR = path.resolve(__dirname);

async function findCoordinates() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  const imgPath = path.join(SRC_DIR, '02_product_general_top.png');
  const b64 = fs.readFileSync(imgPath).toString('base64');

  // Let's create an HTML page with the full 3200x2000 image and a canvas to inspect pixel colors or visual markers
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin:0; padding:0; background:#fff; }
        #canvas { display:block; }
      </style>
    </head>
    <body>
      <img id="img" src="data:image/png;base64,${b64}" />
      <canvas id="canvas" width="3200" height="2000"></canvas>
      <script>
        const img = document.getElementById('img');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          console.log('Image drawn');
        };
      </script>
    </body>
    </html>
  `;

  await page.setViewport({ width: 3200, height: 2000 });
  await page.setContent(html);
  await page.waitForFunction(() => document.getElementById('img').complete);

  // Let's sample pixel rows and columns or take crops of specific bounding boxes
  // to verify exact coordinates
  const crops = [
    // Test Figure 2.1 bounding boxes (in 3200x2000 image pixels):
    { name: 'title_input', x: 620, y: 760, w: 1210, h: 80 },
    { name: 'slug_input', x: 1870, y: 760, w: 1210, h: 80 },
    { name: 'sku_input', x: 620, y: 940, w: 1210, h: 80 },
    // Category area
    { name: 'cat_search', x: 620, y: 1130, w: 2100, h: 70 },
    { name: 'cat_select_all', x: 2740, y: 1130, w: 165, h: 70 },
    { name: 'cat_clear_all', x: 2925, y: 1130, w: 160, h: 70 },
    { name: 'cat_tag_chip', x: 650, y: 1330, w: 425, h: 95 },
    { name: 'cat_checkbox_cartoon', x: 650, y: 1520, w: 300, h: 60 }
  ];

  for (const c of crops) {
    const clip = { x: c.x, y: c.y, width: c.w, height: c.h };
    await page.screenshot({
      path: path.join(SCRATCH_DIR, `crop_${c.name}.png`),
      clip
    });
    console.log(`Saved crop_${c.name}.png`);
  }

  await browser.close();
}

findCoordinates().catch(console.error);
