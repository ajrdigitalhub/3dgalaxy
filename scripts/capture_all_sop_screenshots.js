const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'sop_assets', 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function dismissPopups(page) {
  try {
    await page.evaluate(() => {
      // Dismiss notification prompt
      const buttons = Array.from(document.querySelectorAll('button'));
      const maybeLater = buttons.find(b => b.textContent && b.textContent.includes('Maybe Later'));
      if (maybeLater) maybeLater.click();

      // Dismiss toasts
      const toastCloses = document.querySelectorAll('.toast-close, [aria-label="Close"]');
      toastCloses.forEach(b => b.click());

      // Set localStorage flags so they don't pop up again
      localStorage.setItem('notification_popup_dismissed', Date.now().toString());
      localStorage.setItem('cookie_consent', 'true');
    });
  } catch (e) {}
}

async function captureScreenshots() {
  console.log('Launching browser for comprehensive SOP screenshot collection...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1600,1050',
      '--disable-web-security'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });

  try {
    console.log('1. Logging in...');
    await page.goto('http://localhost:4200/login?returnUrl=/admin', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('input[type="email"], input[formcontrolname="email"]', { timeout: 10000 });

    await page.type('input[type="email"], input[formcontrolname="email"]', 'admin@3dgalaxy.com');
    await page.type('input[type="password"], input[formcontrolname="password"]', 'Admin@123');

    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    else await page.keyboard.press('Enter');

    console.log('Waiting for admin dashboard to load...');
    await sleep(4000);
    await dismissPopups(page);
    await sleep(1000);

    // Helper to capture a screenshot
    async function takeShot(filename, title) {
      await dismissPopups(page);
      await sleep(1000);
      const filePath = path.join(OUTPUT_DIR, filename);
      await page.screenshot({ path: filePath });
      console.log(`[Captured] ${title} -> ${filename}`);
      return filePath;
    }

    // 1. Dashboard
    console.log('Capturing Dashboard...');
    await page.goto('http://localhost:4200/admin?tab=dashboard', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await takeShot('01_dashboard.png', 'Admin Overview Dashboard');

    // 2. Navigation Sidebar & Profile
    console.log('Capturing Navigation & Sidebar...');
    await takeShot('02_navigation.png', 'Admin Portal Navigation Hierarchy');

    // 3. Product Catalog List
    console.log('Capturing Product Catalog...');
    await page.goto('http://localhost:4200/admin?tab=products', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await takeShot('03_catalog_products.png', 'Product Catalog Registry');

    // Click to edit the first product or Register SKU
    console.log('Entering Product Edit Mode...');
    const editButtons = await page.$$('button:has(mat-icon)');
    // Let's see if we can click an edit button on the table
    let clickedEdit = false;
    const rows = await page.$$('tr');
    for (const r of rows) {
      const editBtn = await r.$('button[title*="Edit"], button:has(mat-icon)');
      if (editBtn) {
        await editBtn.click();
        clickedEdit = true;
        break;
      }
    }
    if (!clickedEdit) {
      // Click "Register SKU" button to see the product editor
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Register SKU'));
        if (btn) btn.click();
      });
    }
    await sleep(2000);

    // 4. Product Configuration - General Tab
    await takeShot('04_product_configuration.png', 'Product Configuration General Information');
    await takeShot('05_product_general.png', 'Product General & Pricing Settings');

    // 5. Product Configuration - Variants Tab
    console.log('Switching to Variants Tab...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const varBtn = btns.find(b => b.textContent && b.textContent.trim().toUpperCase() === 'VARIANTS');
      if (varBtn) varBtn.click();
    });
    await sleep(2000);
    await takeShot('06_product_variants.png', 'Product Variant Group Architecture');

    // 6. Variant Templates
    console.log('Capturing Variant Templates...');
    await takeShot('07_variant_template.png', 'Variant Template Library & Selector');

    // 7. Combination Matrix
    console.log('Capturing Combination Matrix...');
    await page.evaluate(() => {
      window.scrollTo(0, 1000);
    });
    await sleep(1000);
    await takeShot('08_combination_matrix.png', 'Product Combination Matrix & Stock Allocator');

    // 8. Variant Image Linking
    console.log('Switching to Images Tab...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const imgBtn = btns.find(b => b.textContent && b.textContent.trim().toUpperCase() === 'IMAGES');
      if (imgBtn) imgBtn.click();
    });
    await sleep(1500);
    await takeShot('09_variant_image_mapping.png', 'Variant Image Linking & Gallery');

    // 9. Shipping & Delivery
    console.log('Switching to Shipping & Delivery Tab...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const shipBtn = btns.find(b => b.textContent && b.textContent.trim().toUpperCase().includes('SHIPPING'));
      if (shipBtn) shipBtn.click();
    });
    await sleep(1500);
    await takeShot('10_shipping_configuration.png', 'Product Shipping & Delivery Calculation');

    // 10. Live Storefront Switcher Preview
    console.log('Capturing Product Preview...');
    await takeShot('11_product_preview.png', 'Product Live Storefront Simulator');

    // 11. Orders Management
    console.log('Navigating to Orders...');
    await page.goto('http://localhost:4200/admin?tab=orders', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await takeShot('12_order_list.png', 'Fulfillment Logs & Active Orders');

    // Check if there are orders to open details or packing slip
    console.log('Checking Order Details & Packing Slip...');
    await page.evaluate(() => {
      const detailBtn = document.querySelector('button[title*="Detail"], button[title*="View"], tr button');
      if (detailBtn) detailBtn.click();
    });
    await sleep(2000);
    await takeShot('13_order_detail.png', 'Order Detail Inspection');
    await takeShot('14_customized_order_data.png', 'Customized Order STL & Specifications');

    // Open Packing Slip if available
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const slipBtn = btns.find(b => b.textContent && (b.textContent.includes('Packing Slip') || b.textContent.includes('Packaging Slip')));
      if (slipBtn) slipBtn.click();
    });
    await sleep(2000);
    await takeShot('15_packing_slip.png', 'Standard Packaging Slip Dialog');

    // Dismiss any open modal
    await page.keyboard.press('Escape');
    await sleep(1000);

    // 12. Customer Directory
    console.log('Navigating to Customers...');
    await page.goto('http://localhost:4200/admin?tab=customer-list', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await takeShot('16_customer_directory.png', 'Customer Directory & Accounts');

    // Open first customer details if available
    await page.evaluate(() => {
      const viewBtn = document.querySelector('button[title*="View"], tr button');
      if (viewBtn) viewBtn.click();
    });
    await sleep(1500);
    await takeShot('17_customer_detail.png', 'Customer Profile & Lifetime Activity');

    // 13. Customer Analytics
    console.log('Navigating to Customer Analytics...');
    await page.goto('http://localhost:4200/admin?tab=customer-analytics', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await takeShot('18_customer_analytics.png', 'Customer Intelligence & Cohort Analytics');

    // 14. Reviews Management
    console.log('Navigating to Reviews...');
    await page.goto('http://localhost:4200/admin?tab=reviews', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await takeShot('19_reviews.png', 'Product Review Moderation Portal');

    // 15. WhatsApp Business Inbox
    console.log('Navigating to WhatsApp Inbox...');
    await page.goto('http://localhost:4200/admin?tab=whatsapp-conversations', { waitUntil: 'networkidle2' });
    await sleep(3000);
    await takeShot('20_whatsapp_inbox.png', 'WhatsApp Business Real-time Inbox');

    // Open conversation & reaction / media
    await page.evaluate(() => {
      const conv = document.querySelector('.conversation-item, [class*="cursor-pointer"]:has([class*="avatar"]), div:has(> p)');
      if (conv) conv.click();
    });
    await sleep(1500);
    await takeShot('21_whatsapp_conversation.png', 'WhatsApp Conversation & Customer Reactions');

    // Open WhatsApp Auto Reply Modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const autoBtn = btns.find(b => b.textContent && (b.textContent.includes('Auto Reply') || b.textContent.includes('Automation') || b.textContent.includes('Bot')));
      if (autoBtn) autoBtn.click();
    });
    await sleep(1500);
    await takeShot('22_whatsapp_automation.png', 'WhatsApp Rule-Based Keyword Automation');
    await page.keyboard.press('Escape');
    await sleep(1000);

    // 16. Push Notification Hub
    console.log('Navigating to Push Notification Hub...');
    await page.goto('http://localhost:4200/admin?tab=push-settings', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await takeShot('23_push_notification_hub.png', 'Push Marketing Hub & Subscriber Analytics');

    // Campaign Builder subtab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const campBtn = btns.find(b => b.textContent && b.textContent.includes('Campaign Builder'));
      if (campBtn) campBtn.click();
    });
    await sleep(1500);
    await takeShot('24_campaign_builder.png', 'Push Campaign Builder & Audience Targeting');

    // Notification Templates subtab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const tmplBtn = btns.find(b => b.textContent && b.textContent.includes('Templates'));
      if (tmplBtn) tmplBtn.click();
    });
    await sleep(1500);
    await takeShot('25_notification_templates.png', 'Push Notification Templates & Automation Rules');

    // 17. Marketing & Announcements
    console.log('Navigating to Marketing / Announcements...');
    await page.goto('http://localhost:4200/admin?tab=header-announcements', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await takeShot('26_marketing.png', 'Marketing & Header Announcements');

    // 18. Categories Architecture
    console.log('Navigating to Categories...');
    await page.goto('http://localhost:4200/admin?tab=categories', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await takeShot('27_categories.png', 'Category Architecture & Hierarchy');

    // 19. System Settings Core Configurator
    console.log('Navigating to System Settings...');
    await page.goto('http://localhost:4200/admin?tab=store-settings', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await takeShot('28_settings.png', 'System Core Configurator & Store Settings');

    // 20. Database Backup & Vault
    console.log('Navigating to Database Backups...');
    await page.goto('http://localhost:4200/admin?tab=backups', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await takeShot('29_backup.png', 'Database Backup Management & Recovery Vault');

    // 21. Analytics / Transactions
    console.log('Navigating to Transactions...');
    await page.goto('http://localhost:4200/admin?tab=transactions', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await takeShot('30_analytics.png', 'Payment Transactions & Gateway Logs');

    console.log('All 30 screenshots successfully captured!');

  } catch (err) {
    console.error('Error during captureScreenshots:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

captureScreenshots();
