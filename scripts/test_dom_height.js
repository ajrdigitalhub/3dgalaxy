const puppeteer = require('puppeteer-core');
const path = require('path');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const HTML_FILE = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration', 'product_config_admin_print.html');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new'
  });
  const page = await browser.newPage();
  await page.goto('file:///' + HTML_FILE.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  
  const contentBodyInfo = await page.evaluate(() => {
    const cb = document.querySelector('.content-body');
    if (!cb) return { error: 'No .content-body' };
    const children = Array.from(cb.children);
    return {
      cbHeight: cb.scrollHeight,
      cbClientHeight: cb.clientHeight,
      childrenCount: children.length,
      lastChildTag: children[children.length - 1]?.tagName,
      lastChildText: children[children.length - 1]?.innerText?.slice(0, 100)
    };
  });
  console.log('contentBodyInfo:', contentBodyInfo);

  // Check the cover page height
  const coverInfo = await page.evaluate(() => {
    const cover = document.querySelector('.cover-page');
    return {
      coverHeight: cover?.scrollHeight,
      coverComputedHeight: window.getComputedStyle(cover).height
    };
  });
  console.log('coverInfo:', coverInfo);

  await browser.close();
}

test().catch(console.error);
