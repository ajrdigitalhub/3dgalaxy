const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_PDF = process.argv[2] 
  ? path.resolve(process.argv[2]) 
  : path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Admin_Portal_SOP.pdf');

const ARTIFACT_DIR = 'C:\\Users\\arunj\\.gemini\\antigravity-ide\\brain\\f7e0694d-b631-435e-b14a-1ab3bcc7745a\\.tempmediaStorage';

async function renderPdfPages(pageNumbers = [1, 2, 3, 4]) {
  if (!fs.existsSync(TARGET_PDF)) {
    console.error('Target PDF not found:', TARGET_PDF);
    return;
  }
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1800 });

  const pdfData = fs.readFileSync(TARGET_PDF);
  const base64Pdf = pdfData.toString('base64');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    </head>
    <body style="margin: 0; background: #222; display: flex; justify-content: center;">
      <canvas id="pdf-canvas"></canvas>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        let pdfDoc = null;

        window.loadPdf = async function(base64) {
          const rawData = atob(base64);
          const uint8Array = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; i++) {
            uint8Array[i] = rawData.charCodeAt(i);
          }
          const loadingTask = pdfjsLib.getDocument({ data: uint8Array.buffer });
          pdfDoc = await loadingTask.promise;
          return pdfDoc.numPages;
        };

        window.renderPage = async function(pageNo) {
          const pdfPage = await pdfDoc.getPage(pageNo);
          const viewport = pdfPage.getViewport({ scale: 1.5 });
          const canvas = document.getElementById('pdf-canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await pdfPage.render({ canvasContext: ctx, viewport: viewport }).promise;
          return { width: viewport.width, height: viewport.height };
        };
      </script>
    </body>
    </html>
  `;

  await page.setContent(html);

  const numPages = await page.evaluate(async (b64) => {
    return await window.loadPdf(b64);
  }, base64Pdf);
  console.log('PDF loaded successfully. Total pages:', numPages);

  const renderedFiles = [];
  for (const pNum of pageNumbers) {
    if (pNum > numPages) continue;
    try {
      await page.evaluate(async (n) => {
        await window.renderPage(n);
      }, pNum);

      const canvas = await page.$('#pdf-canvas');
      const outPath = path.join(ARTIFACT_DIR, `verify_page_${pNum}.png`);
      await canvas.screenshot({ path: outPath });
      console.log(`Rendered page ${pNum} to: ${outPath}`);
      renderedFiles.push(outPath);
    } catch (e) {
      console.error(`Error rendering page ${pNum}:`, e.message);
    }
  }

  await browser.close();
  return renderedFiles;
}

const pagesToRender = process.argv.slice(3).map(Number);
renderPdfPages(pagesToRender.length ? pagesToRender : [1, 2, 3, 4]).catch(console.error);
