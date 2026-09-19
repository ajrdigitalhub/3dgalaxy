const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'sop_assets', 'screenshots');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function removeOverlays(page) {
  await page.evaluate(() => {
    // Remove notification popup
    const popup = document.querySelector('app-notification-popup');
    if (popup) popup.remove();
    
    // Remove any modal backdrops that aren't part of the target screen
    const overlays = Array.from(document.querySelectorAll('div')).filter(d => {
      const cls = d.className || '';
      return typeof cls === 'string' && (cls.includes('backdrop-blur') || cls.includes('bg-neutral-950/70') || cls.includes('bg-neutral-950/60'));
    });
    // Only remove if it's the welcome popup backdrop
    const welcome = Array.from(document.querySelectorAll('*')).find(el => el.textContent && el.textContent.includes('Welcome to 3D Galaxy'));
    if (welcome) {
      const parent = welcome.closest('.fixed');
      if (parent) parent.remove();
    }
    overlays.forEach(o => {
      if (o.querySelector('app-notification-popup') || o.textContent?.includes('Welcome to 3D Galaxy')) {
        o.remove();
      }
    });

    localStorage.setItem('notification_popup_dismissed', Date.now().toString());
  }).catch(() => {});
}

async function cleanRecapture() {
  console.log('Recapturing product & variant screenshots without popup overlay...');
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

    console.log('Navigating to Products Catalog...');
    await page.goto('http://localhost:4200/admin?tab=products', { waitUntil: 'networkidle2' });
    await sleep(3000);
    await removeOverlays(page);

    // Click edit on first product
    console.log('Opening product editor...');
    await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const editBtn = allButtons.find(b => {
        const mat = b.querySelector('mat-icon');
        return mat && mat.textContent && mat.textContent.trim() === 'edit';
      });
      if (editBtn) editBtn.click();
    });
    await sleep(2500);
    await removeOverlays(page);

    async function take(filename, label) {
      await removeOverlays(page);
      await sleep(1000);
      const p = path.join(OUTPUT_DIR, filename);
      await page.screenshot({ path: p });
      console.log(`[Captured Clean] ${label} -> ${filename}`);
    }

    // 04 General setup top
    await take('04_product_configuration.png', 'Product Configuration General Setup');

    // 05 General pricing & stock
    await page.evaluate(() => window.scrollTo(0, 500));
    await take('05_product_general.png', 'Product Pricing, Stock & Overrides');

    // 06 Variants tab top
    console.log('Switching to Variants tab...');
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const btns = Array.from(document.querySelectorAll('button'));
      const varBtn = btns.find(b => b.textContent && b.textContent.trim().toUpperCase() === 'VARIANTS');
      if (varBtn) varBtn.click();
    });
    await sleep(2000);
    await removeOverlays(page);
    await take('06_product_variants.png', 'Product Variant Group Architecture & Engine');

    // 07 Variant Templates
    console.log('Focusing on Variant Templates...');
    await page.evaluate(() => {
      // Click Choose Template button if available to open the template dropdown/modal
      const btns = Array.from(document.querySelectorAll('button'));
      const tmplBtn = btns.find(b => b.textContent && b.textContent.includes('Choose Template'));
      if (tmplBtn) tmplBtn.click();
    });
    await sleep(1500);
    await take('07_variant_template.png', 'Dynamic Variant Templates System');

    // 08 Combination Matrix
    console.log('Scrolling to Combination Matrix...');
    await page.evaluate(() => window.scrollTo(0, 950));
    await sleep(1500);
    await take('08_combination_matrix.png', 'Generated Combination Matrix & Inventory Pricing');

    // 09 Images tab
    console.log('Switching to Images Tab...');
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const btns = Array.from(document.querySelectorAll('button'));
      const imgBtn = btns.find(b => b.textContent && b.textContent.trim().toUpperCase() === 'IMAGES');
      if (imgBtn) imgBtn.click();
    });
    await sleep(2000);
    await take('09_variant_image_mapping.png', 'Product Image Gallery & Variant Mapping');

    // 10 Shipping & Delivery
    console.log('Switching to Shipping & Delivery Tab...');
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const btns = Array.from(document.querySelectorAll('button'));
      const shipBtn = btns.find(b => b.textContent && b.textContent.trim().toUpperCase().includes('SHIPPING'));
      if (shipBtn) shipBtn.click();
    });
    await sleep(2000);
    await take('10_shipping_configuration.png', 'Product Shipping & Delivery Time Calculation');

    // 11 Preview
    console.log('Switching to Live Preview...');
    await page.evaluate(() => window.scrollTo(0, 350));
    await take('11_product_preview.png', 'Product Live Storefront Simulator');

    console.log('Clean recapture completed!');
  } catch (e) {
    console.error('Error during cleanRecapture:', e);
  } finally {
    await browser.close();
  }
}

cleanRecapture();
