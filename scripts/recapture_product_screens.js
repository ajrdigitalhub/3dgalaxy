const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'sop_assets', 'screenshots');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function recapture() {
  console.log('Recapturing product configuration screens with full edit state...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1050']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });

  try {
    await page.goto('http://localhost:4200/login?returnUrl=/admin', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="email"], input[formcontrolname="email"]');
    await page.type('input[type="email"], input[formcontrolname="email"]', 'admin@3dgalaxy.com');
    await page.type('input[type="password"], input[formcontrolname="password"]', 'Admin@123');
    
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await sleep(4000);

    // Dismiss popups
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const maybeLater = buttons.find(b => b.textContent && b.textContent.includes('Maybe Later'));
      if (maybeLater) maybeLater.click();
      localStorage.setItem('notification_popup_dismissed', Date.now().toString());
    });

    console.log('Navigating to Products Catalog...');
    await page.goto('http://localhost:4200/admin?tab=products', { waitUntil: 'networkidle2' });
    await sleep(3000);

    // Click the Edit icon of the first product
    console.log('Clicking the Edit button of the first product...');
    const clicked = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const editBtn = allButtons.find(b => {
        const mat = b.querySelector('mat-icon');
        return mat && mat.textContent && mat.textContent.trim() === 'edit';
      });
      if (editBtn) {
        editBtn.click();
        return true;
      }
      return false;
    });

    console.log('Edit button clicked:', clicked);
    await sleep(2500);

    // Helper
    async function take(filename, label) {
      await sleep(1000);
      const p = path.join(OUTPUT_DIR, filename);
      await page.screenshot({ path: p });
      console.log(`[Recaptured] ${label} -> ${filename}`);
    }

    // 04: Product Configuration - General Tab top
    await take('04_product_configuration.png', 'Product Configuration General Setup');

    // 05: Product General - Pricing & Stock section
    await page.evaluate(() => window.scrollTo(0, 500));
    await take('05_product_general.png', 'Product Pricing, Stock & Overrides');

    // Switch to Variants tab
    console.log('Switching to Variants tab...');
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const btns = Array.from(document.querySelectorAll('button'));
      const varBtn = btns.find(b => b.textContent && b.textContent.trim().toUpperCase() === 'VARIANTS');
      if (varBtn) varBtn.click();
    });
    await sleep(2500);

    // 06: Product Variants setup guide & group architecture
    await take('06_product_variants.png', 'Product Variant Group Architecture & Engine');

    // 07: Variant Templates Library
    console.log('Scrolling to Variant Templates...');
    await take('07_variant_template.png', 'Dynamic Variant Templates System');

    // 08: Combination Matrix
    console.log('Scrolling to Combination Matrix...');
    await page.evaluate(() => window.scrollTo(0, 1200));
    await sleep(1500);
    await take('08_combination_matrix.png', 'Generated Combination Matrix & Inventory Pricing');

    // 09: Image Mapping
    console.log('Switching to Images Tab...');
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const btns = Array.from(document.querySelectorAll('button'));
      const imgBtn = btns.find(b => b.textContent && b.textContent.trim().toUpperCase() === 'IMAGES');
      if (imgBtn) imgBtn.click();
    });
    await sleep(2000);
    await take('09_variant_image_mapping.png', 'Product Image Gallery & Variant Mapping');

    // 10: Shipping & Delivery
    console.log('Switching to Shipping & Delivery Tab...');
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const btns = Array.from(document.querySelectorAll('button'));
      const shipBtn = btns.find(b => b.textContent && b.textContent.trim().toUpperCase().includes('SHIPPING'));
      if (shipBtn) shipBtn.click();
    });
    await sleep(2000);
    await take('10_shipping_configuration.png', 'Product Shipping & Delivery Time Calculation');

    // 11: Preview
    await page.evaluate(() => window.scrollTo(0, 300));
    await take('11_product_preview.png', 'Product Live Storefront Simulator');

    console.log('Recapture completed successfully!');

  } catch (e) {
    console.error('Error in recapture:', e);
  } finally {
    await browser.close();
  }
}

recapture();
