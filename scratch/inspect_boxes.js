const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  const imgPath = path.resolve(__dirname, '../docs/assets/product-configuration/02_product_general_top.png');
  const base64 = fs.readFileSync(imgPath).toString('base64');
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0;">
      <canvas id="c"></canvas>
      <script>
        const img = new Image();
        img.src = "data:image/png;base64,${base64}";
        img.onload = () => {
          const c = document.getElementById('c');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          window.imgReady = true;
        };
      </script>
    </body>
    </html>
  `);

  await page.waitForFunction('window.imgReady === true');

  const bboxes = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    
    // Scan Clear All button boundary: background is light pink/red #fef2f2 or similar
    let minX = 9999, maxX = 0, minY = 9999, maxY = 0;
    for (let y = 1120; y < 1220; y++) {
      for (let x = 2920; x < 3120; x++) {
        const p = ctx.getImageData(x, y, 1, 1).data;
        // background of CLEAR ALL is reddish (#fee2e2, #fef2f2) or text is red
        if (p[0] > 240 && (p[1] < 245 || p[2] < 245)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Scan Select All button boundary: background is greyish #f1f5f9
    let sMinX = 9999, sMaxX = 0, sMinY = 9999, sMaxY = 0;
    for (let y = 1120; y < 1220; y++) {
      for (let x = 2720; x < 2930; x++) {
        const p = ctx.getImageData(x, y, 1, 1).data;
        if (p[0] > 235 && p[0] < 250 && p[1] > 235 && p[1] < 250 && p[2] > 240 && p[2] < 255) {
          if (x < sMinX) sMinX = x;
          if (x > sMaxX) sMaxX = x;
          if (y < sMinY) sMinY = y;
          if (y > sMaxY) sMaxY = y;
        }
      }
    }

    // Scan Category Search input boundary: starts around x: 620, ends around x: 2720
    let inpMinX = 9999, inpMaxX = 0, inpMinY = 9999, inpMaxY = 0;
    for (let y = 1120; y < 1220; y++) {
      for (let x = 600; x < 2740; x += 2) {
        const p = ctx.getImageData(x, y, 1, 1).data;
        // search input has light border or white bg #ffffff vs page bg #f8fafc
        if (p[0] > 250 && p[1] > 250 && p[2] > 250) {
          if (x < inpMinX) inpMinX = x;
          if (x > inpMaxX) inpMaxX = x;
          if (y < inpMinY) inpMinY = y;
          if (y > inpMaxY) inpMaxY = y;
        }
      }
    }

    // Scan Selected Category Tag ("★ 3D Printers PRIMARY x")
    // Border is orange/gold or white tag
    let tagMinX = 9999, tagMaxX = 0, tagMinY = 9999, tagMaxY = 0;
    for (let y = 1310; y < 1440; y++) {
      for (let x = 640; x < 1100; x += 2) {
        const p = ctx.getImageData(x, y, 1, 1).data;
        // orange border / star has high red, medium green, low blue
        if (p[0] > 200 && p[1] > 120 && p[1] < 200 && p[2] < 100) {
          if (x < tagMinX) tagMinX = x;
          if (x > tagMaxX) tagMaxX = x;
          if (y < tagMinY) tagMinY = y;
          if (y > tagMaxY) tagMaxY = y;
        }
      }
    }

    return {
      clearAll: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
      selectAll: { x: sMinX, y: sMinY, w: sMaxX - sMinX, h: sMaxY - sMinY },
      searchInput: { x: inpMinX, y: inpMinY, w: inpMaxX - inpMinX, h: inpMaxY - inpMinY },
      selectedTag: { x: tagMinX, y: tagMinY, w: tagMaxX - tagMinX, h: tagMaxY - tagMinY }
    };
  });

  console.log('Detected bboxes:', JSON.stringify(bboxes, null, 2));
  await browser.close();
}

main().catch(console.error);
