const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const HTML_FILE = path.resolve(__dirname, '..', 'docs', 'sop_assets', 'sop_print.html');
const DOCS_PDF = path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Admin_Portal_SOP.pdf');
const ROOT_PDF = path.resolve(__dirname, '..', '3D_Galaxy_Admin_Portal_SOP.pdf');

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
  console.log('Generating Content Pages (Pages 2+)...');
  const headerHtml = `
    <style>
      * { box-sizing: border-box; }
      #header { padding: 0 !important; margin: 0 !important; width: 100% !important; }
    </style>
    <div style="font-size: 7.2pt; color: #475569; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 14mm 4px 14mm; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 700; border-bottom: 1.5px solid #cbd5e1; box-sizing: border-box;">
      <span><span style="color: #ea580c; font-weight: 800;">AJR DIGITAL HUB</span> <span style="color: #94a3b8; font-weight: 400;">|</span> <span style="color: #0f172a; font-weight: 800;">3D GALAXY ADMIN PORTAL SOP</span></span>
      <span style="color: #0284c7; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 800;">Client Handover Manual</span>
    </div>
  `;

  const footerHtml = `
    <style>
      * { box-sizing: border-box; }
      #footer { padding: 0 !important; margin: 0 !important; width: 100% !important; }
    </style>
    <div style="font-size: 7pt; color: #64748b; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 4px 14mm 0 14mm; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; border-top: 1px solid #cbd5e1; box-sizing: border-box;">
      <span>SOP-3DG-ADM-2026-V1.0 • Delivered by AJR Digital Hub Team ➔ Accepted by 3D Galaxy Team</span>
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
      top: '24mm',
      bottom: '20mm',
      left: '14mm',
      right: '14mm'
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
  console.log('SUCCESS! PDF generated successfully:');
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
