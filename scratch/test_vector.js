const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  // Read logo.svg and isolate the 3D emblem with square viewBox
  const svgContent = fs.readFileSync(path.resolve(__dirname, '../public/logo.svg'), 'utf8');
  
  // Create a favicon.svg from logo.svg:
  // In logo.svg:
  // Left: ~50, Right: ~455 -> width ~405
  // Top: ~95, Bottom: ~345 -> height ~250
  // Center is X: 252.5, Y: 220
  // Square viewBox: size 420 -> minX = 252.5 - 210 = 42.5, minY = 220 - 210 = 10
  // viewBox="42 10 420 420"
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@900&display=swap" rel="stylesheet">
      <style>
        body { margin: 0; padding: 40px; background: #181c19; color: white; font-family: sans-serif; }
        .row { display: flex; gap: 40px; align-items: center; margin-bottom: 30px; }
        .box { display: flex; flex-direction: column; align-items: center; gap: 10px; }
      </style>
    </head>
    <body>
      <h2>Comparing Vector SVG vs Raster PNG Crop</h2>
      
      <div class="row">
        <div class="box">
          <h3>Isolated Vector SVG (viewBox="42 60 420 320")</h3>
          <svg viewBox="42 60 420 320" width="120" height="120" style="background:#222; border-radius:8px;">
            <defs>
              <linearGradient id="grad3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#4c0071" />
                <stop offset="40%" stop-color="#ab007b" />
                <stop offset="100%" stop-color="#ff007f" />
              </linearGradient>
              <linearGradient id="gradBar1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#00f2fe" />
                <stop offset="60%" stop-color="#4facfe" />
                <stop offset="100%" stop-color="#6f00ff" />
              </linearGradient>
              <linearGradient id="gradBar2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#6f00ff" />
                <stop offset="60%" stop-color="#b600ff" />
                <stop offset="100%" stop-color="#ff007f" />
              </linearGradient>
              <linearGradient id="gradBar3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#ff007f" />
                <stop offset="60%" stop-color="#ab007b" />
                <stop offset="100%" stop-color="#00f2fe" />
              </linearGradient>
            </defs>
            <g>
              <text x="60" y="295" font-size="285" font-weight="900" font-family="'Space Grotesk', sans-serif" fill="url(#grad3)">3</text>
              <path d="M 245,100 L 452,220 L 417,240 L 285,163 L 285,316 L 245,293 Z" fill="url(#gradBar1)" />
              <path d="M 245,293 L 285,316 L 285,214 L 417,291 L 452,220 L 245,340 Z" fill="url(#gradBar2)" />
              <path d="M 245,340 L 245,100 L 285,123 L 285,214 L 417,291 L 382,311 Z" fill="url(#gradBar3)" />
            </g>
          </svg>
        </div>
      </div>
    </body>
    </html>
  `);

  await page.evaluateHandle('document.fonts.ready');
  const previewPath = path.resolve(__dirname, 'vector_preview.png');
  await page.screenshot({ path: previewPath, fullPage: true });
  console.log('Saved vector preview screenshot:', previewPath);
  await browser.close();
}

main().catch(console.error);
