const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function createIco(images) {
  const headerLen = 6;
  const dirEntryLen = 16;
  const totalHeaderLen = headerLen + images.length * dirEntryLen;
  
  let currentOffset = totalHeaderLen;
  const dirEntries = [];
  
  for (const img of images) {
    const entry = Buffer.alloc(dirEntryLen);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(img.buffer.length, 8);
    entry.writeUInt32LE(currentOffset, 12);
    
    dirEntries.push(entry);
    currentOffset += img.buffer.length;
  }
  
  const header = Buffer.alloc(headerLen);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  
  return Buffer.concat([header, ...dirEntries, ...images.map(img => img.buffer)]);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  const b64 = fs.readFileSync(path.resolve(__dirname, '../public/3d-logo.png')).toString('base64');

  await page.setContent(`
    <!DOCTYPE html>
    <html><body>
    <canvas id="srcCanvas"></canvas>
    <canvas id="outCanvas"></canvas>
    <script>
      const img = new Image();
      img.src = "data:image/png;base64,${b64}";
      img.onload = () => {
        const sc = document.getElementById('srcCanvas');
        sc.width = img.naturalWidth;
        sc.height = img.naturalHeight;
        const sctx = sc.getContext('2d');
        sctx.drawImage(img, 0, 0);

        // Exact 3D emblem bounding box without GALAXY text
        const sx = 129;
        const sy = 214;
        const sw = 1026;
        const sh = 609;

        window.renderIcon = function(size, paddingPercent = 2) {
          const oc = document.getElementById('outCanvas');
          oc.width = size;
          oc.height = size;
          const ctx = oc.getContext('2d');
          ctx.clearRect(0, 0, size, size);

          const pad = (paddingPercent / 100) * size;
          const targetW = size - (pad * 2);
          const targetH = targetW * (sh / sw);
          const dx = (size - targetW) / 2;
          const dy = (size - targetH) / 2;

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(sc, sx, sy, sw, sh, dx, dy, targetW, targetH);

          return oc.toDataURL('image/png');
        };

        window.ready = true;
      };
    </script>
    </body></html>
  `);

  await page.waitForFunction('window.ready === true');

  const outDir = path.resolve(__dirname, '../public');
  const sizes = [512, 192, 180, 64, 48, 32, 16];
  const pngBuffers = {};

  for (const sz of sizes) {
    const dataUrl = await page.evaluate((s) => window.renderIcon(s, s <= 32 ? 1 : 3), sz);
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const buf = Buffer.from(base64Data, 'base64');
    pngBuffers[sz] = buf;
    
    fs.writeFileSync(path.join(outDir, `favicon-${sz}x${sz}.png`), buf);
    console.log(`Saved public/favicon-${sz}x${sz}.png (${sz}x${sz})`);
  }

  // apple-touch-icon.png (180x180)
  fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), pngBuffers[180]);
  console.log('Saved public/apple-touch-icon.png');

  // favicon.ico with 16, 32, 48
  const icoBuf = createIco([
    { width: 16, height: 16, buffer: pngBuffers[16] },
    { width: 32, height: 32, buffer: pngBuffers[32] },
    { width: 48, height: 48, buffer: pngBuffers[48] }
  ]);
  fs.writeFileSync(path.join(outDir, 'favicon.ico'), icoBuf);
  console.log('Saved public/favicon.ico (Multi-res 16, 32, 48 PNG-compressed)');

  // Also create favicon.svg with embedded high-res 512x512 base64
  const svg512Base64 = pngBuffers[512].toString('base64');
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="data:image/png;base64,${svg512Base64}" width="512" height="512" preserveAspectRatio="xMidYMid meet" />
</svg>
`;
  fs.writeFileSync(path.join(outDir, 'favicon.svg'), faviconSvg);
  console.log('Saved public/favicon.svg');

  await browser.close();
}

main().catch(console.error);
