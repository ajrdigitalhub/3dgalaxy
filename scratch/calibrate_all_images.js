const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC_DIR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration');
const SCRATCH_DIR = path.resolve(__dirname);

async function inspectImages() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  // Let's test coordinates for:
  // 1. 01_catalog_products.png (3200x2000)
  // Search bar, Register SKU, table columns
  {
    const b64 = fs.readFileSync(path.join(SRC_DIR, '01_catalog_products.png')).toString('base64');
    await page.setViewport({ width: 3200, height: 2000 });
    await page.setContent(`<img src="data:image/png;base64,${b64}">`);

    // Let's take sample crops of 01_catalog_products.png
    const crops = [
      { name: '01_search', x: 630, y: 380, w: 1800, h: 90 },
      { name: '01_register_btn', x: 2850, y: 215, w: 280, h: 80 },
      { name: '01_row1_title', x: 800, y: 700, w: 600, h: 100 },
      { name: '01_row1_cat', x: 1400, y: 740, w: 400, h: 80 },
      { name: '01_row1_stock', x: 2170, y: 750, w: 320, h: 65 },
      { name: '01_row1_price', x: 2500, y: 750, w: 260, h: 65 },
      { name: '01_row1_actions', x: 2830, y: 745, w: 220, h: 75 }
    ];
    for (const c of crops) {
      await page.screenshot({
        path: path.join(SCRATCH_DIR, `crop_${c.name}.png`),
        clip: { x: c.x, y: c.y, width: c.w, height: c.h }
      });
    }
    console.log('01_catalog_products crops saved');
  }

  // 2. 05_product_variants.png (3200x2000)
  {
    const b64 = fs.readFileSync(path.join(SRC_DIR, '05_product_variants.png')).toString('base64');
    await page.setViewport({ width: 3200, height: 2000 });
    await page.setContent(`<img src="data:image/png;base64,${b64}">`);

    const crops = [
      { name: '05_add_group_btn', x: 2650, y: 1155, w: 380, h: 85 },
      { name: '05_var_name', x: 705, y: 1615, w: 1130, h: 90 },
      { name: '05_display_name', x: 1870, y: 1615, w: 1125, h: 90 },
      { name: '05_display_type', x: 705, y: 1785, w: 1130, h: 85 },
      { name: '05_selection_mode', x: 1870, y: 1785, w: 1125, h: 85 },
      { name: '05_checkbox_req', x: 710, y: 1910, w: 240, h: 55 },
      { name: '05_checkbox_act', x: 970, y: 1910, w: 150, h: 55 },
      { name: '05_checkbox_dup', x: 1130, y: 1910, w: 490, h: 55 }
    ];
    for (const c of crops) {
      await page.screenshot({
        path: path.join(SCRATCH_DIR, `crop_${c.name}.png`),
        clip: { x: c.x, y: c.y, width: c.w, height: c.h }
      });
    }
    console.log('05_product_variants crops saved');
  }

  // 3. 09_shipping_configuration.png (3200x2000)
  {
    const b64 = fs.readFileSync(path.join(SRC_DIR, '09_shipping_configuration.png')).toString('base64');
    await page.setViewport({ width: 3200, height: 2000 });
    await page.setContent(`<img src="data:image/png;base64,${b64}">`);

    const crops = [
      { name: '09_weight_input', x: 705, y: 850, w: 2335, h: 100 },
      { name: '09_mode_specific', x: 670, y: 1110, w: 770, h: 140 },
      { name: '09_mode_default', x: 2265, y: 1110, w: 775, h: 140 },
      { name: '09_effective_charge', x: 1860, y: 1390, w: 550, h: 130 },
      { name: '09_estimated_delivery', x: 2430, y: 1390, w: 575, h: 130 },
      { name: '09_cod_checkbox', x: 670, y: 1585, w: 460, h: 110 }
    ];
    for (const c of crops) {
      await page.screenshot({
        path: path.join(SCRATCH_DIR, `crop_${c.name}.png`),
        clip: { x: c.x, y: c.y, width: c.w, height: c.h }
      });
    }
    console.log('09_shipping crops saved');
  }

  // 4. 07_combination_matrix.png (1440x900)
  {
    const b64 = fs.readFileSync(path.join(SRC_DIR, '07_combination_matrix.png')).toString('base64');
    await page.setViewport({ width: 1440, height: 900 });
    await page.setContent(`<img src="data:image/png;base64,${b64}">`);

    const crops = [
      { name: '07_row1_item', x: 310, y: 360, w: 320, h: 90 },
      { name: '07_row1_cat', x: 630, y: 390, w: 130, h: 40 },
      { name: '07_row1_sku', x: 760, y: 390, w: 180, h: 40 },
      { name: '07_row1_stock', x: 975, y: 390, w: 140, h: 40 },
      { name: '07_row1_retail', x: 1125, y: 390, w: 70, h: 40 },
      { name: '07_row1_dealer', x: 1190, y: 390, w: 70, h: 40 },
      { name: '07_row1_actions', x: 1280, y: 390, w: 100, h: 40 }
    ];
    for (const c of crops) {
      await page.screenshot({
        path: path.join(SCRATCH_DIR, `crop_${c.name}.png`),
        clip: { x: c.x, y: c.y, width: c.w, height: c.h }
      });
    }
    console.log('07_combination_matrix crops saved');
  }

  // 5. 08_variant_image_mapping.png (3200x2000)
  {
    const b64 = fs.readFileSync(path.join(SRC_DIR, '08_variant_image_mapping.png')).toString('base64');
    await page.setViewport({ width: 3200, height: 2000 });
    await page.setContent(`<img src="data:image/png;base64,${b64}">`);

    const crops = [
      { name: '08_thumb1', x: 675, y: 830, w: 370, h: 370 },
      { name: '08_thumb2', x: 1070, y: 830, w: 370, h: 370 },
      { name: '08_dropzone', x: 2665, y: 830, w: 370, h: 370 }
    ];
    for (const c of crops) {
      await page.screenshot({
        path: path.join(SCRATCH_DIR, `crop_${c.name}.png`),
        clip: { x: c.x, y: c.y, width: c.w, height: c.h }
      });
    }
    console.log('08_variant_image_mapping crops saved');
  }

  await browser.close();
}

inspectImages().catch(console.error);
