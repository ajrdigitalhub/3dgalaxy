const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'docs', 'sop_assets', 'screenshots');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('Launching browser to capture targeted Combination Matrix & Order views...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  // Login
  await page.goto('http://localhost:4200/login?returnUrl=/admin', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    if (inputs[0]) inputs[0].value = 'admin@3dgalaxy.com';
    if (inputs[1]) inputs[1].value = 'Admin@123';
    if (inputs[0]) inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    if (inputs[1]) inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    const btn = document.querySelector('button[type="submit"]');
    if (btn) btn.click();
  });
  await sleep(3500);

  // 1. Combination Matrix
  console.log('Navigating to Products and editing first product...');
  await page.goto('http://localhost:4200/admin?tab=products', { waitUntil: 'networkidle2' });
  await sleep(2500);

  // Click edit on first product
  await page.evaluate(() => {
    const editBtn = document.querySelector('button[title*="Edit"], tr button:has(svg), td button');
    if (editBtn) editBtn.click();
  });
  await sleep(2000);

  // Switch to Variants Tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const varBtn = btns.find(b => b.textContent && b.textContent.includes('Variants'));
    if (varBtn) varBtn.click();
  });
  await sleep(1500);

  // Scroll to combination matrix
  await page.evaluate(() => {
    const matrixHeader = Array.from(document.querySelectorAll('h3, h4, th')).find(el => el.textContent && el.textContent.includes('Combinations Matrix'));
    if (matrixHeader) {
      matrixHeader.scrollIntoView({ behavior: 'instant', block: 'start' });
    } else {
      window.scrollTo(0, 1100);
    }
  });
  await sleep(1000);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_combination_matrix.png'), fullPage: false });
  console.log('Captured 08_combination_matrix.png');

  // 2. Orders & Order Detail
  console.log('Navigating to Orders...');
  await page.goto('http://localhost:4200/admin?tab=orders', { waitUntil: 'networkidle2' });
  await sleep(2500);

  // Click first order row to open inspect dialog
  await page.evaluate(() => {
    const firstRow = document.querySelector('tbody tr');
    if (firstRow) firstRow.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_order_detail.png'), fullPage: false });
  console.log('Captured 13_order_detail.png (Inspect Dialog Modal)');

  // Close modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button:has(mat-icon)');
    if (closeBtn) closeBtn.click();
  });
  await sleep(1000);

  // 3. Customized STL Slicer Quotes
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const quoteBtn = btns.find(b => b.textContent && b.textContent.includes('STL Slicer Quotes'));
    if (quoteBtn) quoteBtn.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_customized_order_data.png'), fullPage: false });
  console.log('Captured 14_customized_order_data.png (STL Slicer Quotes)');

  // 4. Offline Booking / Packing & Dispatch Slip
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const draftBtn = btns.find(b => b.textContent && b.textContent.includes('Offline Booking'));
    if (draftBtn) draftBtn.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15_packing_slip.png'), fullPage: false });
  console.log('Captured 15_packing_slip.png (Offline Booking / Manual Dispatch Slip)');

  await browser.close();
  console.log('Targeted captures complete!');
}

run().catch(console.error);
