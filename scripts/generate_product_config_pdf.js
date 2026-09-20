const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const HTML_FILE = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration', 'product_config_print.html');
const DOCS_PDF = path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Master_Guide.pdf');
const ROOT_PDF = path.resolve(__dirname, '..', '3D_Galaxy_Product_Configuration_Master_Guide.pdf');

async function run() {
  console.log('Validating HTML source at:', HTML_FILE);
  if (!fs.existsSync(HTML_FILE)) {
    throw new Error('HTML file not found: ' + HTML_FILE);
  }

  console.log('Launching Puppeteer Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--allow-file-access-from-files',
      '--enable-local-file-accesses'
    ]
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');
  console.log('Navigating to:', fileUrl);

  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  console.log('Page loaded in Chromium.');

  // 1. Render Cover Page (Page 1) without header/footer and with zero margin bleed
  console.log('Generating Cover Page (Page 1)...');
  const coverPdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: false,
    pageRanges: '1',
    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
  });

  // 2. Render Content Pages (Pages 2+) with crisp running header and running footer
  console.log('Preparing DOM for Content Pages...');
  await page.evaluate(() => {
    const cover = document.querySelector('.cover-page');
    if (cover) {
      cover.style.height = 'auto';
      cover.style.maxHeight = '180mm';
      cover.style.padding = '8mm 18mm';
      const middle = cover.querySelector('.cover-middle');
      if (middle) middle.style.margin = '8mm 0';
    }
  });

  console.log('Generating Content Pages (Pages 2+)...');
  const headerHtml = `
    <style>
      #header { padding: 0 !important; margin: 0 !important; width: 100% !important; }
    </style>
    <div style="width: 100%; font-size: 7.2pt; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 700; display: flex; justify-content: space-between; align-items: center; padding: 7mm 18mm 4px 18mm; border-bottom: 1.5px solid #cbd5e1; box-sizing: border-box;">
      <span><span style="color: #ea580c; font-weight: 800;">AJR DIGITAL HUB</span> <span style="color: #94a3b8; font-weight: 400;">|</span> <span style="color: #0f172a; font-weight: 800;">3D GALAXY</span></span>
      <span style="color: #0284c7; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 800;">PRODUCT CONFIGURATION MASTER GUIDE</span>
    </div>
  `;

  const footerHtml = `
    <style>
      #footer { padding: 0 !important; margin: 0 !important; width: 100% !important; }
    </style>
    <div style="width: 100%; font-size: 7pt; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; display: flex; justify-content: space-between; align-items: center; padding: 4px 18mm 7mm 18mm; border-top: 1px solid #cbd5e1; box-sizing: border-box; color: #64748b;">
      <span>DOC-3DG-PRD-2026-V1.0 • 3D Galaxy Product Configuration Guide • AJR Digital Hub</span>
      <span style="font-weight: 700; color: #0f172a;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>
  `;

  const bodyPdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    pageRanges: '2-',
    headerTemplate: headerHtml,
    footerTemplate: footerHtml,
    margin: {
      top: '25mm',
      bottom: '22mm',
      left: '18mm',
      right: '18mm'
    }
  });

  console.log('Closing browser...');
  await browser.close();

  // 3. Merge Cover Page with Content Pages using pdf-lib
  console.log('Merging Cover Page and Content Pages into unified PDF...');
  const mergedDoc = await PDFDocument.create();
  const coverDoc = await PDFDocument.load(coverPdfBuffer);
  const bodyDoc = await PDFDocument.load(bodyPdfBuffer);

  const [coverPage] = await mergedDoc.copyPages(coverDoc, [0]);
  mergedDoc.addPage(coverPage);

  const bodyPages = await mergedDoc.copyPages(bodyDoc, bodyDoc.getPageIndices());
  bodyPages.forEach(p => mergedDoc.addPage(p));

  const finalPdfBytes = await mergedDoc.save();

  console.log('Writing PDF outputs...');
  fs.writeFileSync(DOCS_PDF, finalPdfBytes);
  fs.writeFileSync(ROOT_PDF, finalPdfBytes);

  const stats = fs.statSync(DOCS_PDF);
  console.log('=====================================================');
  console.log('SUCCESS! Master Guide PDF generated successfully:');
  console.log('  1. ' + DOCS_PDF);
  console.log('  2. ' + ROOT_PDF);
  console.log('  Total Pages:', mergedDoc.getPageCount());
  console.log('  File Size:  ' + (stats.size / 1024 / 1024).toFixed(2) + ' MB');
  console.log('=====================================================');
}

run().catch(err => {
  console.error('PDF Generation Failed:', err);
  process.exit(1);
});
