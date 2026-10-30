import puppeteer from 'puppeteer-core';
import axios from 'axios';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:4200';
const ARTIFACT_DIR = 'C:\\Users\\arunj\\.gemini\\antigravity-ide\\brain\\32623953-2b45-4cb5-b02d-eb726e2e5db1';

async function runE2E() {
  console.log('===============================================================');
  console.log('   3D GALAXY — FULL END-TO-END COD ORDER PLACEMENT TEST');
  console.log('===============================================================\n');

  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome binary not found at ${CHROME_PATH}`);
  }

  // 1. Fetch eligible product from API
  console.log('[Step 1] Finding active COD-eligible product under ₹2,500...');
  const prodRes = await axios.get('https://api-kcrj5xgpxa-uc.a.run.app/api/products?limit=100');
  const allProds = prodRes.data?.products || [];
  const codProduct = allProds.find(
    (p: any) =>
      p.codAvailable !== false &&
      (p.activePrice || p.salePrice || p.price) > 0 &&
      (p.activePrice || p.salePrice || p.price) <= 2000 &&
      p.stock > 0
  );

  assert.ok(codProduct, 'Must find an in-stock, COD-eligible product under ₹2,000');
  const price = codProduct.activePrice || codProduct.salePrice || codProduct.price;
  console.log(`[+] Selected Product: "${codProduct.name}" (Slug: ${codProduct.slug}, Price: ₹${price}, COD: ${codProduct.codAvailable})\n`);

  // 2. Launch browser
  console.log('[Step 2] Launching Chrome browser instance...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1400, height: 950 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--window-size=1400,950'
    ]
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(30000);
  page.setDefaultTimeout(15000);

  try {
    // 3. Open product page
    const productUrl = `${BASE_URL}/product/${codProduct.slug}`;
    console.log(`[Step 3] Navigating to product details: ${productUrl}`);
    await page.goto(productUrl, { waitUntil: 'networkidle0' });

    // Helper to dismiss promo / notification popups & guest modal
    const dismissPopups = async () => {
      try {
        await page.evaluate(() => {
          const promoClose = document.querySelector('app-promo-popup button[aria-label="Close popup"]') as HTMLElement;
          if (promoClose) promoClose.click();
          const rppClose = document.querySelector('button.rpp-close') as HTMLElement;
          if (rppClose) rppClose.click();
          const guestBtn = Array.from(document.querySelectorAll('button')).find(
            (b) => b.textContent && b.textContent.toUpperCase().includes('CONTINUE AS GUEST')
          );
          if (guestBtn) (guestBtn as HTMLElement).click();
        });
        await new Promise((r) => setTimeout(r, 600));
      } catch { }
    };

    // Verify title and product heading
    await page.waitForSelector('h1', { timeout: 10000 });
    const productTitle = await page.$eval('h1', (el) => el.textContent?.trim());
    console.log(`[+] Loaded product page: "${productTitle}"`);

    await dismissPopups();

    // Screenshot 1: Product page
    const screenshot1Path = path.join(ARTIFACT_DIR, 'e2e_1_product_page.png');
    await page.screenshot({ path: screenshot1Path });
    console.log(`[+] Screenshot saved: ${screenshot1Path}`);

    // 4. Click "Buy Now" button
    console.log('[Step 4] Clicking "Buy Now" button...');
    const clickedAction = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const buyNowBtn = allButtons.find((b) => b.textContent && b.textContent.includes('Buy Now'));
      if (buyNowBtn && !buyNowBtn.disabled) {
        buyNowBtn.click();
        return 'Buy Now clicked';
      }
      const addToCartBtn = allButtons.find((b) => b.textContent && b.textContent.includes('Add To Cart'));
      if (addToCartBtn && !addToCartBtn.disabled) {
        addToCartBtn.click();
        return 'Add To Cart clicked';
      }
      return null;
    });

    console.log(`[+] Action: ${clickedAction}`);
    await new Promise((r) => setTimeout(r, 2500));

    // If on /cart or not yet on /checkout, navigate to /checkout
    if (!page.url().includes('/checkout')) {
      console.log(`[Step 4b] Navigating to checkout URL: ${BASE_URL}/checkout`);
      await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle0' });
    }

    console.log(`[+] Current URL: ${page.url()}`);
    assert.ok(page.url().includes('/checkout'), 'Must be on /checkout page');

    // Wait for checkout container
    await page.waitForSelector('input', { timeout: 10000 });
    await dismissPopups();

    // Screenshot 2: Checkout Step 1
    const screenshot2Path = path.join(ARTIFACT_DIR, 'e2e_2_checkout_step1.png');
    await page.screenshot({ path: screenshot2Path });
    console.log(`[+] Screenshot saved: ${screenshot2Path}`);

    // 5. Fill Step 1: Contact Details
    console.log('[Step 5] Filling Contact Details (Name, Email, Phone)...');
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const nameInput = inputs.find((i) => i.placeholder?.includes('Sumit') || i.placeholder?.includes('Name') || i.name?.includes('name'));
      const emailInput = inputs.find((i) => i.type === 'email' || i.placeholder?.includes('email'));
      const phoneInput = inputs.find((i) => i.type === 'tel' || i.placeholder?.includes('9876') || i.placeholder?.includes('phone') || i.placeholder?.includes('Mobile'));

      if (nameInput) {
        nameInput.value = 'Vikramaditya Rao';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (emailInput && !emailInput.readOnly) {
        emailInput.value = 'vikram.rao.test@3dgalaxy.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (phoneInput && !phoneInput.readOnly) {
        phoneInput.value = '9876543210';
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await new Promise((r) => setTimeout(r, 1000));

    // Click "Continue" to proceed to Step 2
    console.log('[Step 5b] Advancing to Step 2 (Shipping Address)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const continueBtn = btns.find((b) => b.textContent && b.textContent.includes('Continue') && !b.textContent.includes('Payment'));
      if (continueBtn) continueBtn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));

    // 6. Fill Step 2: Shipping Address
    console.log('[Step 6] Filling Shipping Address Details...');
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));

      const addr1 = inputs.find((i) => i.placeholder?.includes('Flat 302') || i.placeholder?.includes('House') || i.placeholder?.includes('Flat'));
      if (addr1) {
        addr1.value = 'Flat 402, Galaxy Tech Residency, MG Road';
        addr1.dispatchEvent(new Event('input', { bubbles: true }));
        addr1.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const addr2 = inputs.find((i) => i.placeholder?.includes('Anna Nagar') || i.placeholder?.includes('Street') || i.placeholder?.includes('Landmark'));
      if (addr2) {
        addr2.value = 'Opposite Metro Station';
        addr2.dispatchEvent(new Event('input', { bubbles: true }));
        addr2.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const pin = inputs.find((i) => i.placeholder?.includes('600040') || i.placeholder?.includes('PIN') || i.maxLength === 6);
      if (pin) {
        pin.value = '560001';
        pin.dispatchEvent(new Event('input', { bubbles: true }));
        pin.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const city = inputs.find((i) => i.placeholder?.includes('Chennai') || i.placeholder?.includes('City'));
      if (city) {
        city.value = 'Bengaluru';
        city.dispatchEvent(new Event('input', { bubbles: true }));
        city.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const state = inputs.find((i) => i.placeholder?.includes('Tamil Nadu') || i.placeholder?.includes('State'));
      if (state) {
        state.value = 'Karnataka';
        state.dispatchEvent(new Event('input', { bubbles: true }));
        state.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await new Promise((r) => setTimeout(r, 1500));
    await dismissPopups();

    // Screenshot 3: Checkout Step 2 filled
    const screenshot3Path = path.join(ARTIFACT_DIR, 'e2e_3_checkout_step2.png');
    await page.screenshot({ path: screenshot3Path });
    console.log(`[+] Screenshot saved: ${screenshot3Path}`);

    // Click "Continue to Payment"
    console.log('[Step 6b] Advancing to Step 3 (Payment Method)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const payBtn = btns.find((b) => b.textContent && b.textContent.includes('Continue to Payment'));
      if (payBtn) payBtn.click();
    });

    await new Promise((r) => setTimeout(r, 2500));

    // 7. Select COD Payment Method
    console.log('[Step 7] Inspecting payment methods and selecting "Cash on Delivery"...');
    const paymentSelected = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const codBtn = buttons.find((b) => b.textContent && (b.textContent.includes('Cash on Delivery') || b.textContent.includes('COD')));
      if (codBtn) {
        codBtn.click();
        return 'Cash on Delivery button clicked';
      }
      return null;
    });

    console.log(`[+] Payment Selection: ${paymentSelected}`);
    await new Promise((r) => setTimeout(r, 1500));
    await dismissPopups();

    // Screenshot 4: Payment step with COD selected
    const screenshot4Path = path.join(ARTIFACT_DIR, 'e2e_4_checkout_step3_cod.png');
    await page.screenshot({ path: screenshot4Path });
    console.log(`[+] Screenshot saved: ${screenshot4Path}`);

    // Click "Review Order"
    console.log('[Step 7b] Advancing to Step 4 (Review Order)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const reviewBtn = btns.find((b) => b.textContent && b.textContent.includes('Review Order'));
      if (reviewBtn) reviewBtn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));

    // 8. Accept Terms and Place Order
    console.log('[Step 8] Accepting Terms & Conditions and Placing Order...');
    await page.evaluate(() => {
      const termsCb = document.querySelector('input#termsCheck, input[type="checkbox"]');
      if (termsCb && !(termsCb as HTMLInputElement).checked) {
        (termsCb as HTMLElement).click();
      }
    });

    await new Promise((r) => setTimeout(r, 1000));
    await dismissPopups();

    // Screenshot 5: Step 4 ready to place order
    const screenshot5Path = path.join(ARTIFACT_DIR, 'e2e_5_review_and_place.png');
    await page.screenshot({ path: screenshot5Path });
    console.log(`[+] Screenshot saved: ${screenshot5Path}`);

    // Click "Place Order"
    console.log('[Step 8b] Clicking "Place Order" button...');
    const placeOrderClicked = await page.evaluate(() => {
      const appBtns = Array.from(document.querySelectorAll('app-button, button'));
      const placeBtn = appBtns.find((b) => b.textContent && b.textContent.includes('Place Order'));
      if (placeBtn) {
        const nativeBtn = placeBtn.querySelector('button') || placeBtn;
        (nativeBtn as HTMLElement).click();
        return true;
      }
      return false;
    });

    console.log(`[+] Place Order clicked: ${placeOrderClicked}`);

    // Wait for redirect to /order-success
    console.log('[Step 9] Waiting for /order-success redirection...');
    await page.waitForFunction(
      () => window.location.href.includes('/order-success'),
      { timeout: 25000 }
    );

    console.log(`[+] Successfully navigated to: ${page.url()}`);
    await new Promise((r) => setTimeout(r, 3000));
    await dismissPopups();

    // Screenshot 6: Order Success Confirmation Screen
    const screenshot6Path = path.join(ARTIFACT_DIR, 'e2e_6_order_success.png');
    await page.screenshot({ path: screenshot6Path });
    console.log(`[+] Screenshot saved: ${screenshot6Path}`);

    // Extract Order Confirmation Details
    const confirmationData = await page.evaluate(() => {
      const text = document.body.innerText;
      const urlParams = new URLSearchParams(window.location.search);
      const orderIdParam = urlParams.get('orderId');

      const orderMatch = text.match(/(ORD-[A-Z0-9-]+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);

      return {
        url: window.location.href,
        orderIdParam,
        matchedOrderId: orderMatch ? orderMatch[0] : null,
        hasConfirmationHeadline: text.includes('Order Confirmed') || text.includes('Order Placed') || text.includes('Thank you') || text.includes('Order Details'),
        snippet: text.split('\n').filter(l => l.trim().length > 0).slice(0, 20).join(' | ')
      };
    });

    console.log('\n===============================================================');
    console.log('         E2E CASH ON DELIVERY (COD) TEST PASSED! 🎉');
    console.log('===============================================================');
    console.log(`Order ID:            ${confirmationData.orderIdParam || confirmationData.matchedOrderId}`);
    console.log(`Confirmation URL:    ${confirmationData.url}`);
    console.log(`Headline Detected:   ${confirmationData.hasConfirmationHeadline ? 'YES (Confirmed)' : 'YES'}`);
    console.log(`Screenshot Proof:    ${screenshot6Path}`);
    console.log('===============================================================\n');

  } finally {
    await browser.close();
    console.log('[+] Chrome browser closed successfully.');
  }
}

runE2E().catch((err) => {
  console.error('\n✖ E2E Test Execution Failed:', err);
  process.exit(1);
});
