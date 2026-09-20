const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testLogin() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1600,1050']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1050, deviceScaleFactor: 2 });

  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:4200/login?returnUrl=/admin', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check if already logged in or needs login
    const emailInput = await page.$('input[type="email"], input[formcontrolname="email"]');
    if (emailInput) {
      await page.type('input[type="email"], input[formcontrolname="email"]', 'admin@3dgalaxy.com');
      await page.type('input[type="password"], input[formcontrolname="password"]', 'Admin@123');
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) await submitBtn.click();
      await new Promise(r => setTimeout(r, 4000));
    }

    console.log('Navigating to admin products...');
    await page.goto('http://localhost:4200/admin?tab=products', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Remove any popups or notification dialogs
    await page.evaluate(() => {
      const popups = document.querySelectorAll('app-notification-popup, .cdk-overlay-container, .fixed.inset-0');
      popups.forEach(p => {
        if (p.textContent.includes('Welcome') || p.textContent.includes('Notification')) {
          p.remove();
        }
      });
      localStorage.setItem('notification_popup_dismissed', Date.now().toString());
    });

    const title = await page.title();
    console.log('Page title:', title);

    // Look for edit buttons
    const editButtonsCount = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const editBtns = allButtons.filter(b => b.querySelector('mat-icon') && b.querySelector('mat-icon').textContent.trim() === 'edit');
      return editBtns.length;
    });
    console.log('Found edit buttons:', editButtonsCount);

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
}

testLogin();
