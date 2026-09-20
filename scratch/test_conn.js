const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testConnection() {
  console.log('Testing connection to localhost:4200 via Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  try {
    const res = await page.goto('http://localhost:4200', { waitUntil: 'domcontentloaded', timeout: 5000 });
    console.log('Status code:', res ? res.status() : 'none');
    console.log('Title:', await page.title());
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await browser.close();
  }
}

testConnection();
