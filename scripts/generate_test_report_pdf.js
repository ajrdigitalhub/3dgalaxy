const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const OUTPUT_HTML = path.resolve(__dirname, '..', 'docs', 'non_destructive_test_report.html');
const TARGET_PDFS = [
  path.resolve(__dirname, '..', 'docs', 'NON_DESTRUCTIVE_APPLICATION_TEST_REPORT.pdf'),
  path.resolve(__dirname, '..', 'NON_DESTRUCTIVE_APPLICATION_TEST_REPORT.pdf')
];

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>3D Galaxy — Non-Destructive Application Test Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.5;
      font-size: 8.5pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      padding: 14mm 16mm 16mm 16mm;
      width: 210mm;
      min-height: 297mm;
      box-sizing: border-box;
      position: relative;
    }
    .page-break { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }

    .header-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #064e3b 100%);
      color: #ffffff;
      padding: 16px 20px;
      border-radius: 10px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-banner h1 {
      font-size: 16pt;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 3px;
    }
    .header-banner p {
      font-size: 8.5pt;
      color: #94a3b8;
    }
    .badge {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 9999px;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: #10b981;
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      background: #f8fafc;
      text-align: center;
    }
    .kpi-val {
      font-size: 17pt;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 2px;
    }
    .kpi-lbl {
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .kpi-green { color: #059669; }
    .kpi-blue { color: #2563eb; }
    .kpi-purple { color: #7c3aed; }

    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #059669;
      padding-bottom: 4px;
      margin-top: 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-bottom: 12px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border-bottom: 2px solid #cbd5e1;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:nth-child(even) td { background: #fafafa; }
    .status-pill {
      font-size: 7pt;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #d1fae5;
      color: #065f46;
      display: inline-block;
    }
    .mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
    }
    .footer {
      position: absolute;
      bottom: 10mm;
      left: 16mm;
      right: 16mm;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      font-size: 7pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header-banner">
      <div>
        <h1>3D Galaxy — Non-Destructive Test Suite Report</h1>
        <p>Comprehensive End-to-End Application & Logic Verification | 100% Non-Mutating</p>
      </div>
      <div style="text-align: right;">
        <span class="badge">27 / 27 PASSED (100%)</span>
        <div style="font-size: 7pt; color: #cbd5e1; margin-top: 4px;">Zero DB Mutations</div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-val kpi-green">27</div>
        <div class="kpi-lbl">Total Tests Executed</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val kpi-green">0</div>
        <div class="kpi-lbl">Failures / Errors</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val kpi-purple">0 Writes</div>
        <div class="kpi-lbl">Database Mutations</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val kpi-blue">100%</div>
        <div class="kpi-lbl">Logic & API Health</div>
      </div>
    </div>

    <div class="section-title">1. Executive Overview & Zero-Mutation Guarantee</div>
    <p style="margin-bottom: 10px; font-size: 8pt; color: #475569;">
      This test suite verified the end-to-end functionality, calculations, API integrity, and database schema compatibility of 3D Galaxy following database pruning and indexing. Strict non-destructive testing was enforced: zero <span class="mono">INSERT</span>, <span class="mono">UPDATE</span>, or <span class="mono">DELETE</span> statements were executed. All tests executed via in-memory algorithms, read-only HTTP GET requests, rejection guards, and read-only schema queries.
    </p>

    <div class="section-title">2. In-Memory Business Logic & Algorithms</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Test Name</th>
          <th>Verification Target</th>
          <th>Status</th>
          <th>Latency</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Pricing & 18% GST</td>
          <td>Indian GST 18% rounding to 2 decimals (1499.50 * 18% = 269.91)</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">3ms</td>
        </tr>
        <tr>
          <td>2</td>
          <td>COD Eligibility</td>
          <td>Max ₹2,500 threshold enforcement & ₹100 fee calculation</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">0ms</td>
        </tr>
        <tr>
          <td>3</td>
          <td>Weight-Tier Shipping</td>
          <td>Tier 1 (≤500g ₹60), Tier 2 (≤1kg ₹100), Overweight (+₹40/500g), Free > ₹2000</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">0ms</td>
        </tr>
        <tr>
          <td>4</td>
          <td>Coupon Discount Logic</td>
          <td>Percentage vs Flat discount, Max Discount ceiling cap, Min order check</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">2ms</td>
        </tr>
        <tr>
          <td>5</td>
          <td>Variant Matrix Engine</td>
          <td>Multi-attribute Cartesian product variant matrix generation</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">0ms</td>
        </tr>
        <tr>
          <td>6</td>
          <td>Weighted Review Distribution</td>
          <td>Weighted 1-to-5 star distribution & accurate 1-decimal average rating</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">0ms</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">3. Live Read-Only Public API Endpoints (Port 4000)</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Endpoint</th>
          <th>Contract / Payload Verification</th>
          <th>Status</th>
          <th>Latency</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>7</td>
          <td class="mono">GET /api/service-config</td>
          <td>Service features, operational toggles, active configuration</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">89ms</td>
        </tr>
        <tr>
          <td>8</td>
          <td class="mono">GET /api/home</td>
          <td>Dynamic homepage sections, banners, items array</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">214ms</td>
        </tr>
        <tr>
          <td>9</td>
          <td class="mono">GET /api/categories</td>
          <td>Active hierarchical category tree</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">9ms</td>
        </tr>
        <tr>
          <td>10</td>
          <td class="mono">GET /api/brands</td>
          <td>Registered brand manufacturer profiles</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">6ms</td>
        </tr>
        <tr>
          <td>11</td>
          <td class="mono">GET /api/banners</td>
          <td>Storefront hero slider and promotional banners</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">1982ms</td>
        </tr>
        <tr>
          <td>12</td>
          <td class="mono">GET /api/products?page=1&limit=5</td>
          <td>Paginated catalog retrieval with active stock & pricing</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">19ms</td>
        </tr>
        <tr>
          <td>13</td>
          <td class="mono">GET /api/products/:identifier</td>
          <td>Single product detail, mapped options, inventory</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">166ms</td>
        </tr>
        <tr>
          <td>14</td>
          <td class="mono">GET /api/search?q=3D</td>
          <td>Full-text product search (legacy review references decoupled)</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">2330ms</td>
        </tr>
        <tr>
          <td>15</td>
          <td class="mono">GET /api/search/suggestions?q=fila</td>
          <td>Search autocomplete with products and categories categorization</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">863ms</td>
        </tr>
        <tr>
          <td>16</td>
          <td class="mono">GET /api/public/instagram-feed</td>
          <td>Social media media feed response</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">5ms</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <span>3D Galaxy Project — Confidential Engineering Report</span>
      <span>Page 1 of 2</span>
    </div>
  </div>

  <div class="page page-break">
    <div class="header-banner" style="margin-bottom: 12px; padding: 12px 18px;">
      <div>
        <h2 style="font-size: 13pt; font-weight: 800; color: #ffffff;">Security Guards, Database Integrity & Frontend Health</h2>
        <p style="font-size: 8pt; color: #94a3b8;">Non-Destructive Validation Layer Analysis</p>
      </div>
      <div>
        <span class="badge" style="background: #2563eb;">VERIFIED HEALTHY</span>
      </div>
    </div>

    <div class="section-title">4. Security & Rejection Guards (Strict Zero-Write Test)</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Target Route</th>
          <th>Test Payload & Behavior</th>
          <th>Status</th>
          <th>Latency</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>17</td>
          <td class="mono">POST /api/auth/login</td>
          <td>Empty payload <span class="mono">{}</span> rejected with HTTP 400/401 without DB query</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">7ms</td>
        </tr>
        <tr>
          <td>18</td>
          <td class="mono">POST /api/orders</td>
          <td>Empty payload <span class="mono">{}</span> rejected with HTTP 400 Bad Request before DB insert</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">7ms</td>
        </tr>
        <tr>
          <td>19</td>
          <td class="mono">GET /api/integration/v1/admin/inventory</td>
          <td>Unauthenticated request rejected with HTTP 401 Unauthorized</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">6ms</td>
        </tr>
        <tr>
          <td>20</td>
          <td class="mono">GET /api/integration/v1/admin/inventory</td>
          <td>Forged bearer token (<span class="mono">Bearer forged_token_12345</span>) rejected with 401/403</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">706ms</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">5. Database Schema Integrity (SELECT-Only Diagnostics)</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Integrity Check</th>
          <th>PostgreSQL Catalog Query Target</th>
          <th>Status</th>
          <th>Latency</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>21</td>
          <td>Active Public Tables</td>
          <td>Confirmed exactly 62 tables in <span class="mono">information_schema.tables</span></td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">113ms</td>
        </tr>
        <tr>
          <td>22</td>
          <td>Dead Table Absence</td>
          <td>Confirmed all 14 pruned tables return 0 rows in catalog</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">114ms</td>
        </tr>
        <tr>
          <td>23</td>
          <td>Homepage Sections</td>
          <td>Confirmed <span class="mono">homepage_sections</span> & section items preserved and readable</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">113ms</td>
        </tr>
        <tr>
          <td>24</td>
          <td>Unified User Role</td>
          <td>Confirmed <span class="mono">public.users.role</span> column exists with 100% non-null role data</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">108ms</td>
        </tr>
        <tr>
          <td>25</td>
          <td>Product Stock Health</td>
          <td>Confirmed active catalog stock is valid and queryable</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">109ms</td>
        </tr>
        <tr>
          <td>26</td>
          <td>Index Optimization</td>
          <td>Confirmed all 24 B-tree & composite indexes exist in <span class="mono">pg_indexes</span></td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">116ms</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">6. Frontend Storefront Shell Health (Port 4200)</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Target</th>
          <th>Verification Details</th>
          <th>Status</th>
          <th>Latency</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>27</td>
          <td class="mono">http://localhost:4200/</td>
          <td>Angular SSR/CSR HTML shell, <span class="mono">&lt;app-root&gt;</span> element, <span class="mono">main.js</span> bundle (HTTP 200)</td>
          <td><span class="status-pill">PASSED</span></td>
          <td class="mono">59ms</td>
        </tr>
      </tbody>
    </table>

    <div class="avoid-break" style="margin-top: 14px; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
      <div style="font-weight: 700; color: #166534; font-size: 8.5pt; margin-bottom: 4px;">Sign-Off & Safety Confirmation</div>
      <p style="font-size: 8pt; color: #15803d; line-height: 1.45;">
        The application is fully operational. All business logic, algorithms, catalog retrieval endpoints, search routines, and authentication guards function seamlessly without reliance on the pruned tables. No records were created, modified, or removed from the database during testing.
      </p>
    </div>

    <div class="footer">
      <span>3D Galaxy Project — Confidential Engineering Report</span>
      <span>Page 2 of 2</span>
    </div>
  </div>
</body>
</html>`;

async function main() {
  fs.writeFileSync(OUTPUT_HTML, htmlContent, 'utf-8');
  console.log(`HTML report written to: ${OUTPUT_HTML}`);

  console.log(`Launching Chrome from: ${CHROME_PATH}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  for (const pdfPath of TARGET_PDFS) {
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });
    console.log(`PDF successfully generated: ${pdfPath}`);
  }

  await browser.close();
  console.log('PDF generation complete!');
}

main().catch(err => {
  console.error('Failed to generate PDF:', err);
  process.exit(1);
});
