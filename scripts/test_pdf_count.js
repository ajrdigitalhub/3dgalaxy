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
  
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log('Document body.scrollHeight:', bodyHeight);

  // Generate full PDF without pageRanges
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true
  });
  const { PDFDocument } = require('pdf-lib');
  const doc = await PDFDocument.load(pdfBuffer);
  console.log('Full PDF page count without pageRanges:', doc.getPageCount());

  await browser.close();
}

test().catch(console.error);
