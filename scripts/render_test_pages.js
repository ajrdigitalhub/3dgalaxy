const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PDF_PATH = path.resolve(__dirname, 'test_output.pdf');

async function render() {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const pdfData = fs.readFileSync(PDF_PATH);
  const base64Pdf = pdfData.toString('base64');
  await page.setContent(`
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <canvas id="pdf-canvas"></canvas>
    <script>
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      let pdf = null;
      window.init = async () => {
        const raw = atob("${base64Pdf}");
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
        pdf = await pdfjsLib.getDocument({ data: arr.buffer }).promise;
      };
      window.render = async (n) => {
        const p = await pdf.getPage(n);
        const v = p.getViewport({ scale: 1.5 });
        const c = document.getElementById('pdf-canvas');
        c.width = v.width; c.height = v.height;
        await p.render({ canvasContext: c.getContext('2d'), viewport: v }).promise;
      };
    </script>
  `);
  await page.evaluate(async () => { await window.init(); });
  await page.evaluate(async () => { await window.render(1); });
  let c = await page.$('#pdf-canvas');
  await c.screenshot({ path: path.resolve(__dirname, 'test_p1.png') });
  await page.evaluate(async () => { await window.render(2); });
  c = await page.$('#pdf-canvas');
  await c.screenshot({ path: path.resolve(__dirname, 'test_p2.png') });
  await browser.close();
  console.log('Saved test_p1.png and test_p2.png');
}
render().catch(console.error);
