const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC_DIR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration');
const SCRATCH_DIR = path.resolve(__dirname);

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  // Let's take smaller downscaled views or slices of 02_product_general_top.png and 04_categories_multi_select.png
  for (const f of ['02_product_general_top.png', '04_categories_multi_select.png', '07_combination_matrix.png']) {
    const p = path.join(SRC_DIR, f);
    const b64 = fs.readFileSync(p).toString('base64');
    const html = `
      <html><body style="margin:0;padding:0;background:#000;">
        <img src="data:image/png;base64,${b64}" style="width:1600px;display:block;">
      </body></html>
    `;
    await page.setViewport({ width: 1600, height: 1000 });
    await page.setContent(html);
    await page.screenshot({ path: path.join(SCRATCH_DIR, `preview_${f}`) });
    console.log(`Saved preview_${f}`);
  }

  await browser.close();
}

run().catch(console.error);
