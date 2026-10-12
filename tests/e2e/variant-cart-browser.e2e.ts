import puppeteer from 'puppeteer-core';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:4200';
const ARTIFACT_DIR = 'C:\\Users\\arunj\\.gemini\\antigravity-ide\\brain\\32623953-2b45-4cb5-b02d-eb726e2e5db1';

async function runVariantE2E() {
  console.log('===============================================================');
  console.log('   3D GALAXY — LIVE BROWSER VARIANT ADD-TO-CART TEST');
  console.log('===============================================================\n');

  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome binary not found at ${CHROME_PATH}`);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1400, height: 950 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1400,950']
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(30000);
  page.setDefaultTimeout(15000);

  const dismissPopups = async () => {
    try {
      await page.evaluate(() => {
        const promoClose = document.querySelector('app-promo-popup button[aria-label="Close popup"]') as HTMLElement;
        if (promoClose) promoClose.click();
        const rppClose = document.querySelector('button.rpp-close') as HTMLElement;
        if (rppClose) rppClose.click();
        const guestBtn = Array.from(document.querySelectorAll('button')).find(
          b => b.textContent && b.textContent.toUpperCase().includes('CONTINUE AS GUEST')
        );
        if (guestBtn) (guestBtn as HTMLElement).click();
        const maybeLaterBtn = Array.from(document.querySelectorAll('button')).find(
          b => b.textContent && b.textContent.toUpperCase().includes('MAYBE LATER')
        );
        if (maybeLaterBtn) (maybeLaterBtn as HTMLElement).click();
        const anyCloseBtn = Array.from(document.querySelectorAll('button[aria-label="Close"], button.close, .modal-close-btn, button:has(svg)'));
        anyCloseBtn.forEach(b => {
          if (b.closest('.modal, [class*="modal"], [class*="popup"], [class*="dialog"]')) {
            (b as HTMLElement).click();
          }
        });
      });
      await new Promise(r => setTimeout(r, 600));
    } catch {}
  };

  try {
    // 1. Navigate to product detail with variants
    const productUrl = `${BASE_URL}/product/elegoo-water-washable-resin-v2-0`;
    console.log(`[Step 1] Navigating to product page: ${productUrl}`);
    await page.goto(productUrl, { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1', { timeout: 10000 });
    await dismissPopups();

    // Clear cart via localStorage for pristine test state
    await page.evaluate(() => {
      localStorage.removeItem('3d_cart');
      localStorage.removeItem('cart');
    });

    // 2. Select Variant 1: "yellow"
    console.log('[Step 2] Selecting Variant 1: "yellow"...');
    const selectedYellow = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const yellowBtn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes('yellow'));
      if (yellowBtn) {
        yellowBtn.click();
        return true;
      }
      return false;
    });
    console.log(`[+] Variant 1 (Yellow) clicked: ${selectedYellow}`);
    await new Promise(r => setTimeout(r, 1200));
    await dismissPopups();

    // Click "Add to Cart"
    console.log('[Step 3] Clicking "Add to Cart" for Variant 1...');
    const addYellowClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(b => b.textContent && b.textContent.toUpperCase().includes('ADD TO CART'));
      if (addBtn && !addBtn.disabled) {
        addBtn.click();
        return true;
      }
      return false;
    });
    console.log(`[+] Add to Cart clicked for Yellow: ${addYellowClicked}`);
    await new Promise(r => setTimeout(r, 2000));
    await dismissPopups();

    const screenshot1Path = path.join(ARTIFACT_DIR, 'variant_1_selected_added.png');
    await page.screenshot({ path: screenshot1Path });
    console.log(`[+] Screenshot saved: ${screenshot1Path}`);

    // 3. Select Variant 2: "ceramic-grey"
    console.log('[Step 4] Selecting Variant 2: "ceramic-grey"...');
    const selectedGrey = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const greyBtn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes('ceramic-grey'));
      if (greyBtn) {
        greyBtn.click();
        return true;
      }
      return false;
    });
    console.log(`[+] Variant 2 (Ceramic Grey) clicked: ${selectedGrey}`);
    await new Promise(r => setTimeout(r, 1200));
    await dismissPopups();

    // Click "Add to Cart"
    console.log('[Step 5] Clicking "Add to Cart" for Variant 2...');
    const addGreyClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(b => b.textContent && b.textContent.toUpperCase().includes('ADD TO CART'));
      if (addBtn && !addBtn.disabled) {
        addBtn.click();
        return true;
      }
      return false;
    });
    console.log(`[+] Add to Cart clicked for Ceramic Grey: ${addGreyClicked}`);
    await new Promise(r => setTimeout(r, 2000));
    await dismissPopups();

    const screenshot2Path = path.join(ARTIFACT_DIR, 'variant_2_selected_added.png');
    await page.screenshot({ path: screenshot2Path });
    console.log(`[+] Screenshot saved: ${screenshot2Path}`);

    // 4. Navigate to Cart page
    console.log('[Step 6] Navigating to Cart page: http://localhost:4200/cart ...');
    await page.goto(`${BASE_URL}/cart`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await dismissPopups();

    // Inspect Cart Items
    const cartAnalysis = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const lines = Array.from(document.querySelectorAll('.cart-item, [data-test="cart-item"], tr, .flex.items-center'));
      return {
        url: window.location.href,
        hasYellow: bodyText.toLowerCase().includes('yellow'),
        hasGrey: bodyText.toLowerCase().includes('ceramic') || bodyText.toLowerCase().includes('grey'),
        bodySnippet: bodyText.split('\n').filter(l => l.trim().length > 0).slice(0, 30).join(' | ')
      };
    });

    console.log(`[+] Cart page URL: ${cartAnalysis.url}`);
    console.log(`[+] Contains Variant Yellow: ${cartAnalysis.hasYellow}`);
    console.log(`[+] Contains Variant Grey: ${cartAnalysis.hasGrey}`);

    const screenshot3Path = path.join(ARTIFACT_DIR, 'variant_cart_summary.png');
    await page.screenshot({ path: screenshot3Path });
    console.log(`[+] Screenshot saved: ${screenshot3Path}`);

    console.log('\n===============================================================');
    console.log('     LIVE BROWSER VARIANT ADD-TO-CART TEST COMPLETED! 🎉');
    console.log('===============================================================\n');

  } finally {
    await browser.close();
    console.log('[+] Chrome browser closed successfully.');
  }
}

runVariantE2E().catch((err) => {
  console.error('\n✖ Live Browser Variant Test Failed:', err);
  process.exit(1);
});
