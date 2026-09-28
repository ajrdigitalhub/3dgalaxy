const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const mdPath = path.join(__dirname, '../docs/3D_Galaxy_Firebase_Cost_Performance_Audit.md');
const imgPath = path.join(__dirname, '../docs/assets/billing_screenshot.png');
const htmlPath = path.join(__dirname, '../scratch/audit_report.html');
const pdfPath = path.join(__dirname, '../docs/3D_Galaxy_Firebase_Cost_Performance_Audit.pdf');

// Read Markdown file content
const mdContent = fs.readFileSync(mdPath, 'utf8');

// Read image and encode as Base64
let base64Image = '';
if (fs.existsSync(imgPath)) {
  const imgBuffer = fs.readFileSync(imgPath);
  base64Image = `data:image/png;base64,${imgBuffer.toString('base64')}`;
}

// Convert Markdown to styled HTML
function markdownToHtml(md) {
  let lines = md.split('\n');
  let html = '';
  let inTable = false;
  let inCode = false;
  let codeBuffer = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCode) {
        inCode = false;
        html += `<pre><code>${escapeHtml(codeBuffer)}</code></pre>\n`;
        codeBuffer = '';
      } else {
        inCode = true;
        codeBuffer = '';
      }
      continue;
    }
    if (inCode) {
      codeBuffer += line + '\n';
      continue;
    }

    // Images
    if (line.includes('![Figure 1')) {
      html += `
        <div class="figure-container">
          <img src="${base64Image}" alt="Firebase Billing Overview" class="billing-img" />
          <p class="caption">Figure 1 — Firebase / Google Cloud Project Cost Overview (₹368.84 total cost, ₹365.32 Cloud Functions)</p>
        </div>\n`;
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      html += `<h1 class="doc-main-title">${escapeHtml(line.slice(2))}</h1>\n`;
      continue;
    }
    if (line.startsWith('## ')) {
      const headingText = line.slice(3).trim();
      const isNewSection = /^\d+\./.test(headingText);
      const breakClass = (isNewSection && !headingText.startsWith('1.') && !headingText.startsWith('2.')) ? 'page-break' : '';
      html += `<h2 class="section-title ${breakClass}">${escapeHtml(headingText)}</h2>\n`;
      continue;
    }
    if (line.startsWith('### ')) {
      html += `<h3 class="subsection-title">${escapeHtml(line.slice(4))}</h3>\n`;
      continue;
    }

    // Tables
    if (line.startsWith('|')) {
      if (!inTable) {
        inTable = true;
        html += '<div class="table-wrapper"><table class="audit-table">\n';
      }
      if (line.includes('---')) continue; // Skip delimiter row

      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      const isHeader = !html.includes('</thead>');

      if (isHeader) {
        html += '<thead><tr>' + cells.map(c => `<th>${parseInline(c)}</th>`).join('') + '</tr></thead><tbody>\n';
      } else {
        html += '<tr>' + cells.map(c => `<td>${parseInline(c)}</td>`).join('') + '</tr>\n';
      }
      continue;
    } else if (inTable) {
      inTable = false;
      html += '</tbody></table></div>\n';
    }

    // Unordered lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      html += `<li class="list-item">${parseInline(line.slice(2))}</li>\n`;
      continue;
    }

    // Ordered lists
    if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, '');
      html += `<li class="list-item-num">${parseInline(text)}</li>\n`;
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---') {
      html += '<hr class="section-divider" />\n';
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      html += `<blockquote class="callout">${parseInline(line.slice(2))}</blockquote>\n`;
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      html += '<div class="spacer"></div>\n';
      continue;
    }

    // Paragraphs
    html += `<p class="para">${parseInline(line)}</p>\n`;
  }

  if (inTable) {
    html += '</tbody></table></div>\n';
  }

  return html;
}

function parseInline(str) {
  let s = escapeHtml(str);
  // Bold
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Code inline
  s = s.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Badges
  s = s.replace(/CRITICAL/g, '<span class="badge badge-critical">CRITICAL</span>');
  s = s.replace(/HIGH/g, '<span class="badge badge-high">HIGH</span>');
  s = s.replace(/MEDIUM/g, '<span class="badge badge-medium">MEDIUM</span>');
  s = s.replace(/LOW/g, '<span class="badge badge-low">LOW</span>');
  return s;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const parsedHtml = markdownToHtml(mdContent);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>3D Galaxy — Firebase Cost & Performance Audit</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      line-height: 1.6;
      font-size: 13.5px;
      margin: 0;
      padding: 0;
    }

    .header-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);
      color: #ffffff;
      padding: 28px 32px;
      border-radius: 12px;
      margin-bottom: 28px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.2);
    }

    .header-logo-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      padding-bottom: 12px;
    }

    .brand-tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #818cf8;
    }

    .org-tag {
      font-size: 11px;
      font-weight: 600;
      color: #cbd5e1;
    }

    .doc-main-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin: 0 0 10px 0;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 16px;
      font-size: 11.5px;
      color: #cbd5e1;
    }

    .meta-item strong {
      color: #ffffff;
      display: block;
      margin-bottom: 2px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 28px;
      margin-bottom: 14px;
      letter-spacing: -0.3px;
    }

    .page-break {
      page-break-before: always;
    }

    .subsection-title {
      font-size: 14.5px;
      font-weight: 600;
      color: #1e293b;
      margin-top: 18px;
      margin-bottom: 8px;
    }

    .para {
      margin-bottom: 10px;
      color: #334155;
    }

    .list-item, .list-item-num {
      margin-bottom: 5px;
      color: #334155;
      padding-left: 4px;
    }

    .inline-code {
      font-family: 'JetBrains Mono', monospace;
      background-color: #f1f5f9;
      color: #0284c7;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }

    pre {
      background-color: #0f172a;
      color: #e2e8f0;
      padding: 14px 18px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      overflow-x: auto;
      margin: 14px 0;
      border: 1px solid #1e293b;
    }

    .table-wrapper {
      margin: 18px 0;
      overflow-x: auto;
    }

    .audit-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      text-align: left;
    }

    .audit-table th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 600;
      padding: 10px 12px;
      border: 1px solid #1e293b;
    }

    .audit-table td {
      padding: 9px 12px;
      border: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: top;
    }

    .audit-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    .figure-container {
      background-color: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 16px;
      text-align: center;
      margin: 20px 0;
    }

    .billing-img {
      max-width: 90%;
      height: auto;
      border-radius: 6px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.4);
    }

    .caption {
      color: #94a3b8;
      font-size: 11.5px;
      margin-top: 10px;
      font-style: italic;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .badge-critical { background-color: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
    .badge-high { background-color: #ffedd5; color: #ea580c; border: 1px solid #fdba74; }
    .badge-medium { background-color: #fef9c3; color: #ca8a04; border: 1px solid #fde047; }
    .badge-low { background-color: #dcfce7; color: #16a34a; border: 1px solid #86efac; }

    .callout {
      background-color: #f0f9ff;
      border-left: 4px solid #0284c7;
      padding: 12px 16px;
      margin: 14px 0;
      border-radius: 0 8px 8px 0;
      color: #0369a1;
      font-size: 12.5px;
    }

    .section-divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 24px 0;
    }

    .spacer {
      height: 8px;
    }

    .footer-note {
      text-align: center;
      font-size: 10.5px;
      color: #94a3b8;
      margin-top: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
    }
  </style>
</head>
<body>

  <div class="header-banner">
    <div class="header-logo-row">
      <span class="brand-tag">3D GALAXY HUB</span>
      <span class="org-tag">AJR DIGITAL HUB</span>
    </div>
    <div class="doc-main-title">FIREBASE COST & PERFORMANCE OPTIMIZATION AUDIT</div>
    <div class="meta-grid">
      <div class="meta-item"><strong>AUDIT DATE</strong>Sep 27, 2026</div>
      <div class="meta-item"><strong>PROJECT COST</strong>₹368.84</div>
      <div class="meta-item"><strong>CLOUD FUNCTIONS</strong>₹365.32 (99.04%)</div>
      <div class="meta-item"><strong>AUDIT STATUS</strong>Read-Only Verified</div>
    </div>
  </div>

  ${parsedHtml}

  <div class="footer-note">
    3D Galaxy E-Commerce & Admin Hub Technical Audit Report • Generated Confidential for AJR Digital Hub • Page 1 of PDF Report
  </div>

</body>
</html>
`;

fs.writeFileSync(htmlPath, fullHtml, 'utf8');
console.log('✅ HTML report created at:', htmlPath);

// Execute Edge print-to-pdf
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const cmd = `& "${edgePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "file:///${htmlPath.replace(/\\/g, '/')}"`;

console.log('⏳ Rendering PDF with Microsoft Edge...');
try {
  execSync(cmd, { shell: 'powershell.exe' });
  console.log('🎉 PDF report successfully created at:', pdfPath);
} catch (err) {
  console.error('❌ Failed to generate PDF:', err);
}
