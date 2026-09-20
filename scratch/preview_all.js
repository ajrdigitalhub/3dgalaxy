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

  const files = [
    '01_catalog_products.png',
    '03_pricing_and_stock.png',
    '05_product_variants.png',
    '06_variant_templates.png',
    '08_variant_image_mapping.png',
    '09_shipping_configuration.png',
    '10_product_preview.png'
  ];

  for (const f of files) {
    const p = path.join(SRC_DIR, f);
    if (!fs.existsSync(p)) continue;
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
