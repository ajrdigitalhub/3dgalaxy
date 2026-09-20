const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC_DIR = path.resolve(__dirname, '..', 'docs', 'sop_assets', 'screenshots');
const SCRATCH_DIR = path.resolve(__dirname);

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  const f = '08_combination_matrix.png';
  const p = path.join(SRC_DIR, f);
  const b64 = fs.readFileSync(p).toString('base64');
  const html = `<html><body style="margin:0;background:#000;"><img src="data:image/png;base64,${b64}" style="width:1440px;display:block;"></body></html>`;
  await page.setViewport({ width: 1440, height: 900 });
  await page.setContent(html);
  await page.screenshot({ path: path.join(SCRATCH_DIR, `preview_sop_08_combination_matrix.png`) });
  await browser.close();
  console.log('Saved preview_sop_08_combination_matrix.png');
}

run().catch(console.error);
