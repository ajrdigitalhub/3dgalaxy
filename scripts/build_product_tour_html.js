const fs = require('fs');
const path = require('path');

const MD_PATH = path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Visual_Tour_Guide.md');
const HTML_PATH = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration-tour', 'product_tour_print.html');
const ASSETS_DIR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration-tour');

function markdownToPrintHtml(md) {
  const lines = md.split(/\r?\n/);
  let html = '';
  let inTable = false;
  let tableHeaderParsed = false;
  let inCodeBlock = false;
  let codeBlockContent = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html += '</ul>\n';
      inList = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      html += '</tbody></table></div>\n';
      inTable = false;
      tableHeaderParsed = false;
    }
  };

  // Convert local asset path to absolute file:/// URI for Chromium
  const resolveImgUri = (src) => {
    const filename = path.basename(src);
    const localFile = path.join(ASSETS_DIR, filename);
    if (fs.existsSync(localFile)) {
      return 'file:///' + localFile.replace(/\\/g, '/');
    }
    return src;
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip Markdown Cover Title Block (we build a dedicated HTML cover page below)
    if (i < 30 && (line.startsWith('# 3D GALAXY') || line.startsWith('## PRODUCT') || line.startsWith('### Visual') || line.includes('<p align') || line.includes('<img src=') || line.includes('</p>'))) {
      continue;
    }

    // Code Blocks
    if (line.trim().startsWith('```')) {
      closeList();
      closeTable();
      if (inCodeBlock) {
        html += `<pre class="diagram"><code>${codeBlockContent.join('\n')}</code></pre>\n`;
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      continue;
    }

    // Tables
    if (line.trim().startsWith('|')) {
      closeList();
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (line.includes('---')) {
        continue;
      }
      if (!inTable) {
        inTable = true;
        tableHeaderParsed = false;
        html += '<div class="table-container"><table>\n';
      }
      if (!tableHeaderParsed) {
        html += '<thead><tr>\n';
        cells.forEach(c => {
          html += `  <th>${c.replace(/\*\*/g, '')}</th>\n`;
        });
        html += '</tr></thead><tbody>\n';
        tableHeaderParsed = true;
      } else {
        html += '<tr>\n';
        cells.forEach(c => {
          let cellText = c
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
          html += `  <td>${cellText}</td>\n`;
        });
        html += '</tr>\n';
      }
      continue;
    } else {
      closeTable();
    }

    // Callout Alerts
    if (line.startsWith('> [!')) {
      closeList();
      const isWarn = line.includes('WARNING') || line.includes('CAUTION');
      const isTip = line.includes('TIP');
      const type = isWarn ? 'warning' : (isTip ? 'success' : 'info');
      const title = isWarn ? 'OPERATIONAL RISK NOTICE' : (isTip ? 'ADMIN BEST PRACTICE' : 'CONFIGURATION GUIDANCE');
      html += `<div class="callout callout-${type}">\n<div class="callout-title">${title}</div>\n`;
      continue;
    }
    if (line.startsWith('> ')) {
      html += `<p>${line.replace('> ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>\n`;
      if (i + 1 >= lines.length || !lines[i + 1].startsWith('>')) {
        html += '</div>\n';
      }
      continue;
    }

    // Headings
    if (line.startsWith('## STEP ') || line.startsWith('## 1.') || line.startsWith('## 2.') || line.startsWith('## 29.') || line.startsWith('## 30.')) {
      closeList();
      html += `<div class="page-break"></div>\n`;
      html += `<h1>${line.replace(/##\s*/, '')}</h1>\n`;
      continue;
    }
    if (line.startsWith('## ')) {
      closeList();
      html += `<h2>${line.replace(/##\s*/, '')}</h2>\n`;
      continue;
    }
    if (line.startsWith('### ')) {
      closeList();
      html += `<h3>${line.replace(/###\s*/, '')}</h3>\n`;
      continue;
    }

    // Screenshots / Images
    const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      closeList();
      const caption = imgMatch[1];
      const src = resolveImgUri(imgMatch[2]);
      const isTourCard = src.includes('tour_29_quick_tour_card');
      const tag = isTourCard ? 'SUMMARY-CARD' : caption.split('—')[0].replace('Figure ', 'FIG-').trim();
      
      html += `
        <div class="figure-container">
          <div class="figure-header">
            <span class="figure-number">${caption}</span>
            <span class="figure-tag">${tag}</span>
          </div>
          <img class="figure-img" src="${src}" alt="${caption}" />
        </div>
      `;
      continue;
    }

    // Italic caption lines directly below images
    if (line.trim().startsWith('*Figure ') && line.trim().endsWith('*')) {
      const captionText = line.trim().slice(1, -1);
      html += `<div class="figure-caption">${captionText}</div>\n`;
      continue;
    }

    // Operational Custom Boxes (WHAT SHOULD I ENTER / WHAT HAPPENS IF I CHANGE THIS)
    if (line.includes('<div class="tour-box">') || line.includes('<div class="tour-box"')) {
      closeList();
      html += line + '\n';
      continue;
    }
    if (line.includes('</div>') && (lines[i - 1]?.includes('tour-box') || lines[i - 2]?.includes('tour-box') || lines[i - 3]?.includes('tour-box'))) {
      html += '</div>\n';
      continue;
    }

    // Lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      let item = line.trim().replace(/^[-*]\s+/, '')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
      html += `  <li>${item}</li>\n`;
      continue;
    } else {
      closeList();
    }

    // Empty lines
    if (!line.trim()) continue;

    // Normal Paragraphs
    let pText = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    html += `<p>${pText}</p>\n`;
  }

  closeList();
  closeTable();
  return html;
}

function buildFullHtml() {
  console.log('Reading Markdown source at:', MD_PATH);
  const md = fs.readFileSync(MD_PATH, 'utf8');
  const bodyContent = markdownToPrintHtml(md);

  const ajrLogoUri = 'file:///' + path.join(ASSETS_DIR, 'ajr_digital_hub_logo.png').replace(/\\/g, '/');
  const galaxyLogoUri = 'file:///' + path.join(ASSETS_DIR, '3d_galaxy_logo.png').replace(/\\/g, '/');

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>3D Galaxy — Product Configuration Visual Tour Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');

    @page {
      size: A4;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-variant-ligatures: none !important;
      font-feature-settings: "liga" 0, "clig" 0, "calt" 0 !important;
      text-rendering: geometricPrecision;
      -webkit-font-smoothing: antialiased;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.45;
      font-size: 9pt;
    }

    .page-break {
      page-break-before: always;
      display: block;
      height: 0;
      margin: 0;
      padding: 0;
    }
    .avoid-break {
      page-break-inside: avoid;
    }

    /* Typography */
    h1 {
      font-size: 13.5pt;
      font-weight: 800;
      color: #0b1120;
      text-transform: uppercase;
      letter-spacing: -0.2px;
      margin: 0 0 9px 0;
      padding-top: 1mm;
      padding-bottom: 4px;
      border-bottom: 2px solid #0284c7;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h1::before {
      content: "";
      display: inline-block;
      width: 5px;
      height: 14pt;
      background: #ea580c;
      border-radius: 2px;
    }
    h2 {
      font-size: 11pt;
      font-weight: 700;
      color: #0b1120;
      margin: 12px 0 6px 0;
      padding-bottom: 3px;
      border-bottom: 1px solid #e2e8f0;
    }
    h3 {
      font-size: 9.6pt;
      font-weight: 700;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 9px 0 4px 0;
    }
    p {
      margin: 0 0 7px 0;
      color: #334155;
      text-align: justify;
    }
    ul, ol {
      margin: 0 0 8px 18px;
      color: #334155;
    }
    li {
      margin-bottom: 3px;
    }
    strong {
      color: #0f172a;
      font-weight: 700;
    }

    /* Tables */
    .table-container {
      margin: 8px 0 11px 0;
      width: 100% !important;
      page-break-inside: avoid;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
      line-height: 1.35;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    thead {
      display: table-header-group;
    }
    th {
      background: #0b1120;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 5px 8px;
      text-transform: uppercase;
      font-size: 7pt;
      letter-spacing: 0.5px;
      border: 1px solid #0b1120;
    }
    td {
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
      color: #1e293b;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Callouts */
    .callout {
      border-radius: 6px;
      padding: 8px 12px;
      margin: 8px 0;
      font-size: 8.2pt;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      width: 100% !important;
      box-sizing: border-box;
    }
    .callout-info {
      background: #f0f9ff;
      border-left: 4px solid #0284c7;
      color: #0369a1;
    }
    .callout-warning {
      background: #fff7ed;
      border-left: 4px solid #ea580c;
      color: #9a3412;
    }
    .callout-success {
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      color: #15803d;
    }
    .callout-title {
      font-weight: 800;
      text-transform: uppercase;
      font-size: 7.2pt;
      letter-spacing: 0.8px;
      margin-bottom: 3px;
    }

    /* Custom Tour Boxes (What should I enter / What happens) */
    .tour-box {
      border-radius: 6px;
      padding: 8px 12px;
      margin: 8px 0;
      background: #fff7ed;
      border-left: 4px solid #ea580c;
      font-size: 8pt;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-sizing: border-box;
    }
    .tour-box-title {
      font-weight: 800;
      text-transform: uppercase;
      font-size: 7.2pt;
      letter-spacing: 0.8px;
      color: #c2410c;
      margin-bottom: 3px;
    }

    /* Screenshots & Figures */
    .figure-container {
      margin: 8px 0 3px 0;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      background: #ffffff;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
      width: 100% !important;
      box-sizing: border-box;
    }
    .figure-header {
      background: #f1f5f9;
      padding: 4px 9px;
      border-bottom: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .figure-number {
      font-weight: 700;
      font-size: 7.6pt;
      color: #0b1120;
    }
    .figure-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.6pt;
      font-weight: 600;
      color: #0284c7;
      background: #e0f2fe;
      padding: 1px 5px;
      border-radius: 3px;
    }
    .figure-img {
      width: 100%;
      height: auto;
      max-height: 95mm;
      object-fit: contain;
      display: block;
      background: #090d16;
    }
    .figure-caption {
      padding: 3px 9px;
      font-size: 7.2pt;
      color: #475569;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      line-height: 1.3;
      font-style: italic;
      margin-bottom: 8px;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.6pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }

    pre.diagram {
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.6pt;
      line-height: 1.3;
      background: #0b1120;
      color: #38bdf8;
      padding: 8px;
      border-radius: 5px;
      margin: 6px 0;
      overflow-x: auto;
      page-break-inside: avoid;
      border-left: 4px solid #ea580c;
    }

    /* COVER PAGE STYLING */
    .cover-page {
      box-sizing: border-box;
      height: 297mm;
      max-height: 297mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 20mm 18mm 18mm 18mm;
      background: linear-gradient(150deg, #070b14 0%, #0b1120 45%, #0f172a 100%);
      color: #ffffff;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }
    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      padding-bottom: 14px;
    }
    .cover-brand-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .cover-brand-card.client-side {
      align-items: flex-end;
    }
    .cover-brand-label {
      font-size: 6.8pt;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #94a3b8;
      font-weight: 700;
    }
    .cover-brand-logo-wrap {
      background: #ffffff;
      padding: 6px 14px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.15);
      height: 48px;
      box-sizing: border-box;
    }
    .cover-logo-img {
      max-height: 36px;
      max-width: 130px;
      object-fit: contain;
      display: block;
    }
    .cover-transfer-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .cover-badge-top {
      background: rgba(234, 88, 12, 0.15);
      border: 1px solid #ea580c;
      color: #fb923c;
      font-size: 7.2pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      padding: 3px 9px;
      border-radius: 4px;
    }
    .cover-transfer-arrow {
      font-size: 7.5pt;
      color: #94a3b8;
      letter-spacing: 0.8px;
    }
    .cover-middle {
      margin: 18mm 0;
    }
    .cover-kicker {
      font-size: 8.8pt;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .cover-title {
      font-size: 26pt;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.1;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .cover-title span {
      color: #ea580c;
    }
    .cover-subtitle {
      font-size: 13pt;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .cover-divider {
      width: 70px;
      height: 3.5px;
      background: linear-gradient(90deg, #ea580c 0%, #0284c7 100%);
      border-radius: 2px;
      margin-bottom: 14px;
    }
    .cover-desc {
      font-size: 8.8pt;
      color: #94a3b8;
      line-height: 1.5;
      max-width: 580px;
    }
    .cover-bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .meta-group-title {
      font-size: 7pt;
      text-transform: uppercase;
      color: #38bdf8;
      font-weight: 800;
      letter-spacing: 1px;
      margin-bottom: 3px;
    }
    .meta-value-primary {
      font-size: 8.8pt;
      font-weight: 700;
      color: #ffffff;
    }
    .meta-value-secondary {
      font-size: 7.6pt;
      color: #94a3b8;
      margin-top: 2px;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE (PAGE 1) -->
  <div class="cover-page">
    <div class="cover-top">
      <div class="cover-brand-card">
        <span class="cover-brand-label">Delivered By</span>
        <div class="cover-brand-logo-wrap">
          <img class="cover-logo-img" src="${ajrLogoUri}" alt="AJR Digital Hub" />
        </div>
      </div>
      <div class="cover-transfer-indicator">
        <span class="cover-badge-top">PRODUCT CONFIGURATION TOUR</span>
        <span class="cover-transfer-arrow">ENTERPRISE SOLUTIONS ➔ STORE ADMINISTRATION</span>
      </div>
      <div class="cover-brand-card client-side">
        <span class="cover-brand-label">Delivered To / Accepted By</span>
        <div class="cover-brand-logo-wrap">
          <img class="cover-logo-img" src="${galaxyLogoUri}" alt="3D Galaxy" />
        </div>
      </div>
    </div>

    <div class="cover-middle">
      <div class="cover-kicker">3D Galaxy E-Commerce & Custom Manufacturing Platform</div>
      <h1 class="cover-title">VISUAL PRODUCT <span>CONFIGURATION</span></h1>
      <div class="cover-subtitle">MASTER TOUR GUIDE & STEP-BY-STEP FIELD REFERENCE</div>
      <div class="cover-divider"></div>
      <p class="cover-desc">
        Comprehensive Visual Step-by-Step Training Manual featuring Numbered UI Screen Highlights, 
        Opened Dropdown Tours, Variant Permutation Logic, Dynamic Delivery Date Calculations, 
        and Live Storefront Pre-Publish Checklists.
      </p>
    </div>

    <div class="cover-bottom">
      <div class="meta-item">
        <div class="meta-group-title">Delivered By</div>
        <div class="meta-value-primary">AJR Digital Hub Team</div>
        <div class="meta-value-secondary">Enterprise Digital Solutions Team</div>
      </div>
      <div class="meta-item">
        <div class="meta-group-title">Delivered To / Accepted By</div>
        <div class="meta-value-primary">3D Galaxy Team</div>
        <div class="meta-value-secondary">Catalog Management & Fulfillment Operations</div>
      </div>
      <div class="meta-item" style="margin-top: 6px;">
        <div class="meta-group-title">Document Identifier & Release</div>
        <div class="meta-value-primary">DOC-3DG-PRD-TOUR-2026-V1.0 • Version 1.0</div>
        <div class="meta-value-secondary">Published: September 2026</div>
      </div>
      <div class="meta-item" style="margin-top: 6px;">
        <div class="meta-group-title">Classification</div>
        <div class="meta-value-primary">Commercial in Confidence</div>
        <div class="meta-value-secondary">Operational Training & Visual Tour Manual</div>
      </div>
    </div>
  </div>

  <!-- CONTENT PAGES (PAGE 2+) -->
  <div class="content-body">
    ${bodyContent}
  </div>

</body>
</html>
`;

  fs.writeFileSync(HTML_PATH, fullHtml, 'utf8');
  console.log('Successfully written Print HTML to:', HTML_PATH);
  const stats = fs.statSync(HTML_PATH);
  console.log('HTML File size:', (stats.size / 1024).toFixed(2), 'KB');
}

buildFullHtml();
