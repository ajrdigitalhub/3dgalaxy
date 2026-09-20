const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC_DIR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration');
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration-tour');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Color tokens
const ORANGE = '#ea580c';
const BLUE = '#0284c7';
const WHITE = '#ffffff';

console.log('Script initialized. Chrome path:', CHROME_PATH);
