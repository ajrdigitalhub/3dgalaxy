const fs = require('fs');
const path = require('path');

const MD_PATH = path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Guide.md');
const HTML_OUTPUT_ADMIN = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration', 'product_config_admin_print.html');
const HTML_OUTPUT_TOUR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration-tour', 'product_tour_print.html');
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
    if (i < 30 && (line.startsWith('# 3D GALAXY') || line.startsWith('## PRODUCT') || line.startsWith('### Professional') || line.includes('<p align') || line.includes('<img src=') || line.includes('</p>'))) {
      continue;
    }

    // Math formulas
    if (line.trim().startsWith('$$') && line.trim().endsWith('$$') && line.trim().length > 4) {
      closeList();
      closeTable();
      const mathContent = line.trim().slice(2, -2).trim()
        .replace(/\\text\{(.*?)\}/g, '$1')
        .replace(/\\longrightarrow/g, '➔')
        .replace(/\\rightarrow/g, '➔')
        .replace(/\\sum/g, 'Σ')
        .replace(/\\times/g, '×')
        .replace(/\\le/g, '≤')
        .replace(/\\ge/g, '≥')
        .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, '($1 / $2)');
      html += `<div class="math-block">${mathContent}</div>\n`;
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
          html += `  <th>${c.replace(/\*\*/g, '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</th>\n`;
        });
        html += '</tr></thead><tbody>\n';
        tableHeaderParsed = true;
      } else {
        html += '<tr>\n';
        cells.forEach(c => {
          let cellText = c
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\$(.*?)\$/g, '<em>$1</em>');
          html += `  <td>${cellText}</td>\n`;
        });
        html += '</tr>\n';
      }
      continue;
    } else {
      closeTable();
    }

    // Callout Alerts (Admin Tip, Important, Customer Impact, Validation)
    if (line.startsWith('> [!')) {
      closeList();
      const isWarn = line.includes('WARNING') || line.includes('CAUTION');
      const isTip = line.includes('TIP');
      const type = isWarn ? 'warning' : (isTip ? 'success' : 'info');
      const title = isWarn ? 'OPERATIONAL SAFEGUARD' : (isTip ? 'ADMINISTRATOR TIP' : 'CRITICAL SPECIFICATION');
      html += `<div class="callout callout-${type}">\n<div class="callout-title">${title}</div>\n`;
      continue;
    }
    if (line.startsWith('> ')) {
      let rawLine = line.replace('> ', '')
        .replace(/^###\s*/, '')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
      html += `<p>${rawLine}</p>\n`;
      if (i + 1 >= lines.length || !lines[i + 1].startsWith('>')) {
        html += '</div>\n';
      }
      continue;
    }

    // Headings
    if (line.startsWith('## 1.') || line.startsWith('## 2.') || line.startsWith('## 3.') || line.startsWith('## 4.') ||
        line.startsWith('## 5.') || line.startsWith('## 6.') || line.startsWith('## 7.') || line.startsWith('## 8.') ||
        line.startsWith('## 9.') || line.startsWith('## 10.') || line.startsWith('## 11.') || line.startsWith('## 12.') ||
        line.startsWith('## 13.') || line.startsWith('## 14.') || line.startsWith('## 15.') || line.startsWith('## 16.') ||
        line.startsWith('## 17.') || line.startsWith('## 18.') || line.startsWith('## 19.') || line.startsWith('## 20.') ||
        line.startsWith('## 21.') || line.startsWith('## 22.') || line.startsWith('## 23.')) {
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
    if (line.startsWith('### TAB ')) {
      closeList();
      html += `<div class="page-break"></div>\n`;
      html += `<h2 class="tab-header">${line.replace(/###\s*/, '')}</h2>\n`;
      continue;
    }
    if (line.startsWith('### FIGURE ')) {
      closeList();
      html += `<div class="figure-title-badge">${line.replace(/###\s*/, '')}</div>\n`;
      continue;
    }
    if (line.startsWith('### ')) {
      closeList();
      html += `<h3>${line.replace(/###\s*/, '')}</h3>\n`;
      continue;
    }
    if (line.startsWith('#### ')) {
      closeList();
      html += `<h4>${line.replace(/####\s*/, '')}</h4>\n`;
      continue;
    }

    // Screenshots / Images (Clean Application Screenshots)
    const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      closeList();
      const caption = imgMatch[1];
      const src = resolveImgUri(imgMatch[2]);
      const tag = caption.split('—')[0].replace('Figure ', 'FIG-').trim();
      
      html += `
        <div class="figure-container">
          <div class="figure-header">
            <span class="figure-number">${caption}</span>
            <span class="figure-tag">CLEAN APPLICATION SCREENSHOT • ${tag}</span>
          </div>
          <img class="figure-img" src="${src}" alt="${caption}" />
        </div>
      `;
      continue;
    }

    // Italic caption lines directly below images
    if (line.trim().startsWith('*Figure ') && line.trim().endsWith('*')) {
      const captionText = line.trim().slice(1, -1);
      html += `<div class="figure-caption"><strong>Figure Description:</strong> ${captionText.replace(/^Figure description:\s*/i, '')}</div>\n`;
      continue;
    }

    // Lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      let item = line.trim().replace(/^[-*]\s+/, '')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\$(.*?)\$/g, '<em>$1</em>');
      html += `  <li>${item}</li>\n`;
      continue;
    } else {
      closeList();
    }

    // Empty lines
    if (!line.trim()) continue;

    // Normal Paragraphs
    let pText = line
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\$(.*?)\$/g, '<em>$1</em>');
    html += `<p>${pText}</p>\n`;
  }

  closeList();
  closeTable();
  return html;
}

function buildFullHtml() {
  console.log('Reading Clean Guide Markdown at:', MD_PATH);
  const md = fs.readFileSync(MD_PATH, 'utf8');
  const bodyContent = markdownToPrintHtml(md);

  const ajrLogoUri = 'file:///' + path.join(ASSETS_DIR, 'ajr_digital_hub_logo.png').replace(/\\/g, '/');
  const galaxyLogoUri = 'file:///' + path.join(ASSETS_DIR, '3d_galaxy_logo.png').replace(/\\/g, '/');

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>3D Galaxy — Product Configuration Administration Guide</title>
  <style>
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
      font-size: 8.8pt;
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

    /* Headings */
    h1 {
      font-size: 13pt;
      font-weight: 800;
      color: #0b1120;
      text-transform: uppercase;
      letter-spacing: -0.2px;
      margin: 0 0 8px 0;
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
      height: 13pt;
      background: #ea580c;
      border-radius: 2px;
    }
    h2 {
      font-size: 10.8pt;
      font-weight: 700;
      color: #0b1120;
      margin: 11px 0 5px 0;
      padding-bottom: 3px;
      border-bottom: 1px solid #e2e8f0;
    }
    .tab-header {
      font-size: 12pt;
      font-weight: 800;
      color: #0284c7;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    h3 {
      font-size: 9.4pt;
      font-weight: 700;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin: 9px 0 4px 0;
    }
    h4 {
      font-size: 8.8pt;
      font-weight: 700;
      color: #334155;
      margin: 7px 0 3px 0;
      text-transform: uppercase;
    }
    .figure-title-badge {
      font-size: 9pt;
      font-weight: 800;
      color: #0f172a;
      background: #f1f5f9;
      padding: 4px 8px;
      border-left: 3px solid #ea580c;
      border-radius: 0 4px 4px 0;
      margin: 10px 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    p {
      margin: 0 0 6px 0;
      color: #334155;
      text-align: justify;
    }
    ul, ol {
      margin: 0 0 7px 18px;
      color: #334155;
    }
    li {
      margin-bottom: 3px;
    }
    strong {
      color: #0f172a;
      font-weight: 700;
    }
    em {
      font-style: italic;
      color: #1e293b;
    }

    /* Math & Diagrams */
    .math-block {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 3px solid #0284c7;
      padding: 7px 12px;
      margin: 7px 0 9px 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8.2pt;
      font-weight: 600;
      color: #0f172a;
      border-radius: 0 4px 4px 0;
      text-align: center;
    }
    pre.diagram {
      background: #0b1120;
      color: #38bdf8;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 7.2pt;
      line-height: 1.35;
      padding: 9px 12px;
      border-radius: 5px;
      border: 1px solid #1e293b;
      margin: 7px 0 10px 0;
      overflow: hidden;
      white-space: pre;
    }

    /* Tables */
    .table-container {
      margin: 7px 0 10px 0;
      width: 100% !important;
      page-break-inside: avoid;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.6pt;
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
      padding: 5px 7px;
      text-transform: uppercase;
      font-size: 6.8pt;
      letter-spacing: 0.4px;
      border: 1px solid #0b1120;
    }
    td {
      padding: 4.5px 7px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    tbody tr:hover {
      background: #f1f5f9;
    }

    /* Clean Application Screenshot Figure Styling */
    .figure-container {
      margin: 8px 0 6px 0;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #090d16;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .figure-header {
      background: #0b1120;
      color: #ffffff;
      padding: 5px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #0284c7;
    }
    .figure-number {
      font-size: 7.4pt;
      font-weight: 800;
      letter-spacing: 0.4px;
      color: #f8fafc;
      text-transform: uppercase;
    }
    .figure-tag {
      font-size: 6.5pt;
      font-weight: 700;
      background: rgba(2, 132, 199, 0.25);
      color: #38bdf8;
      padding: 2px 7px;
      border-radius: 3px;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }
    .figure-img {
      width: 100%;
      max-height: 250px;
      object-fit: contain;
      background: #090d16;
      display: block;
    }
    .figure-caption {
      font-size: 7.5pt;
      font-style: italic;
      color: #475569;
      background: #f8fafc;
      border-left: 3px solid #0284c7;
      padding: 4px 9px;
      margin: 0 0 8px 0;
      border-radius: 0 3px 3px 0;
    }

    /* Callout Boxes (Outside Screenshots) */
    .callout {
      margin: 8px 0 10px 0;
      padding: 8px 12px;
      border-radius: 5px;
      border: 1px solid transparent;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .callout-title {
      font-size: 7.4pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 4px;
    }
    .callout-info {
      background: #f0f9ff;
      border-color: #bae6fd;
      border-left: 4px solid #0284c7;
      color: #0369a1;
    }
    .callout-info .callout-title { color: #0284c7; }
    .callout-warning {
      background: #fffbeb;
      border-color: #fde68a;
      border-left: 4px solid #d97706;
      color: #92400e;
    }
    .callout-warning .callout-title { color: #b45309; }
    .callout-success {
      background: #f0fdf4;
      border-color: #bbf7d0;
      border-left: 4px solid #16a34a;
      color: #166534;
    }
    .callout-success .callout-title { color: #15803d; }
    .callout p {
      margin: 0 0 3px 0;
      color: inherit;
      font-size: 7.8pt;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 7.6pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }

    /* COVER PAGE DESIGN (PAGE 1) */
    .cover-page {
      height: 297mm;
      width: 210mm;
      box-sizing: border-box;
      padding: 18mm 20mm;
      background: linear-gradient(145deg, #070a12 0%, #0c1527 50%, #08111e 100%);
      color: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      position: relative;
    }
    .cover-page::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #ea580c 0%, #0284c7 100%);
    }
    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }
    .cover-brand-card {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .cover-brand-label {
      font-size: 6.5pt;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 1.2px;
      font-weight: 700;
    }
    .cover-brand-logo-wrap {
      background: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
    }
    .cover-logo-img {
      height: 30px;
      width: auto;
      object-fit: contain;
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
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      padding: 3px 9px;
      border-radius: 4px;
    }
    .cover-transfer-arrow {
      font-size: 7.2pt;
      color: #94a3b8;
      letter-spacing: 0.8px;
    }
    .cover-middle {
      margin: 14mm 0;
    }
    .cover-kicker {
      font-size: 8.5pt;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .cover-title {
      font-size: 24pt;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.15;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
    }
    .cover-title span {
      color: #ea580c;
    }
    .cover-subtitle {
      font-size: 11.5pt;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 12px;
      letter-spacing: 0.4px;
    }
    .cover-divider {
      width: 70px;
      height: 3.5px;
      background: linear-gradient(90deg, #ea580c 0%, #0284c7 100%);
      border-radius: 2px;
      margin-bottom: 14px;
    }
    .cover-desc {
      font-size: 8.5pt;
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
      font-size: 6.8pt;
      text-transform: uppercase;
      color: #38bdf8;
      font-weight: 800;
      letter-spacing: 1px;
      margin-bottom: 3px;
    }
    .meta-value-primary {
      font-size: 8.5pt;
      font-weight: 700;
      color: #ffffff;
    }
    .meta-value-secondary {
      font-size: 7.4pt;
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
        <span class="cover-badge-top">PRODUCT CONFIGURATION ADMINISTRATION GUIDE</span>
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
      <h1 class="cover-title">PRODUCT <span>CONFIGURATION</span> GUIDE</h1>
      <div class="cover-subtitle">COMPLETE OPERATIONAL REFERENCE, ARCHITECTURE & FIELD SPECIFICATION MANUAL</div>
      <div class="cover-divider"></div>
      <p class="cover-desc">
        Professional Client-Facing Manual featuring Clean Native Application Screenshots, 
        Exhaustive Field References, Category Architecture, Cartesian Variant Combination Matrix, 
        Bundle Builder, Dynamic IST Delivery Date Engine, and Pre-Publish Validation Gates.
      </p>
    </div>

    <div class="cover-bottom">
      <div class="meta-item">
        <div class="meta-group-title">Delivered By</div>
        <div class="meta-value-primary">AJR Digital Hub Team</div>
        <div class="meta-value-secondary">Enterprise Digital Solutions & Architecture</div>
      </div>
      <div class="meta-item">
        <div class="meta-group-title">Delivered To / Accepted By</div>
        <div class="meta-value-primary">3D Galaxy Team</div>
        <div class="meta-value-secondary">Catalog Operations & Store Administration</div>
      </div>
      <div class="meta-item" style="margin-top: 6px;">
        <div class="meta-group-title">Document Identifier & Release</div>
        <div class="meta-value-primary">DOC-3DG-PRD-ADMIN-2026-V2.0 • Version 2.0</div>
        <div class="meta-value-secondary">Published: September 2026</div>
      </div>
      <div class="meta-item" style="margin-top: 6px;">
        <div class="meta-group-title">Classification & Quality Standard</div>
        <div class="meta-value-primary">Commercial in Confidence</div>
        <div class="meta-value-secondary">Clean Application Visuals (Zero Tour Annotations)</div>
      </div>
    </div>
  </div>

  <!-- CONTENT PAGES (PAGE 2+) -->
  <div class="content-body" style="padding: 0 1mm;">
    ${bodyContent}
  </div>

</body>
</html>
`;

  fs.writeFileSync(HTML_OUTPUT_ADMIN, fullHtml, 'utf8');
  fs.writeFileSync(HTML_OUTPUT_TOUR, fullHtml, 'utf8');
  console.log('Successfully written Print HTML to:');
  console.log(' - ' + HTML_OUTPUT_ADMIN);
  console.log(' - ' + HTML_OUTPUT_TOUR);
  const stats = fs.statSync(HTML_OUTPUT_ADMIN);
  console.log('HTML File size:', (stats.size / 1024).toFixed(2), 'KB');
}

buildFullHtml();
