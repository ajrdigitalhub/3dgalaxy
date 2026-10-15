const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync('functions/database/prune_unwanted_tables.sql', 'utf8');
const dropMatches = [...sql.matchAll(/DROP TABLE IF EXISTS\s+(\w+)/gi)].map(m => m[1]);

const prisma = fs.readFileSync('functions/prisma/schema.prisma', 'utf8');

function getAllFiles(dir, exts = ['.ts', '.js']) {
  let res = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(f => {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (!full.includes('node_modules') && !full.includes('.git') && !full.includes('dist') && !full.includes('.angular')) {
          res = res.concat(getAllFiles(full, exts));
        }
      } else if (exts.some(ext => f.endsWith(ext))) {
        res.push(full);
      }
    });
  } catch (e) {}
  return res;
}

const backendFiles = getAllFiles('functions/src');
const frontendFiles = getAllFiles('src/app');

const results = [];

dropMatches.forEach(tbl => {
  // Find Prisma model name
  let modelName = null;
  // Look for @@map("tbl")
  const lines = prisma.split('\n');
  let currentModel = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const modelMatch = line.match(/^model\s+(\w+)\s+\{/);
    if (modelMatch) {
      currentModel = modelMatch[1];
    }
    if (currentModel && line.includes(`@@map("${tbl}")`)) {
      modelName = currentModel;
      break;
    }
    if (line === '}') {
      currentModel = null;
    }
  }

  if (!modelName) {
    const pascal = tbl.replace(/(^|_)([a-z])/g, (_, p, c) => c.toUpperCase());
    if (new RegExp(`model\\s+${pascal}\\b`).test(prisma)) {
      modelName = pascal;
    }
  }

  const prismaCalls = [];
  const backendRawSql = [];
  const backendReferences = [];

  backendFiles.forEach(file => {
    const code = fs.readFileSync(file, 'utf8');
    const rel = path.relative('.', file);

    if (modelName) {
      const camel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      const pRegex = new RegExp(`\\bprisma\\.${camel}\\b`, 'g');
      if (pRegex.test(code)) {
        prismaCalls.push(rel);
      }
    }

    const sqlRegex = new RegExp(`(FROM|JOIN|INTO|UPDATE|TABLE)\\s+[\`"']?${tbl}[\`"']?\\b`, 'i');
    if (sqlRegex.test(code)) {
      backendRawSql.push(rel);
    }

    // Direct table name string
    const tblRegex = new RegExp(`['"\`]${tbl}['"\`]`, 'g');
    if (tblRegex.test(code)) {
      backendReferences.push(rel);
    }
  });

  const frontendReferences = [];
  frontendFiles.forEach(file => {
    const code = fs.readFileSync(file, 'utf8');
    const rel = path.relative('.', file);
    const tblRegex = new RegExp(`['"\`]${tbl}['"\`]`, 'g');
    if (tblRegex.test(code)) {
      frontendReferences.push(rel);
    }
  });

  results.push({
    table: tbl,
    inPrisma: !!modelName,
    modelName,
    prismaCalls: [...new Set(prismaCalls)],
    backendRawSql: [...new Set(backendRawSql)],
    backendReferences: [...new Set(backendReferences)],
    frontendReferences: [...new Set(frontendReferences)]
  });
});

console.log('Total tables inspected:', results.length);
fs.writeFileSync('scratch/verify_prune_results.json', JSON.stringify(results, null, 2));

const critical = results.filter(r => r.prismaCalls.length > 0 || r.backendRawSql.length > 0);
console.log('\nCRITICAL - Tables with ACTIVE Prisma/SQL calls in backend:');
critical.forEach(c => {
  console.log(`- ${c.table} (Model: ${c.modelName})`);
  if (c.prismaCalls.length) console.log(`  Prisma calls: ${c.prismaCalls.join(', ')}`);
  if (c.backendRawSql.length) console.log(`  Raw SQL: ${c.backendRawSql.join(', ')}`);
});

const inPrismaNoCalls = results.filter(r => r.inPrisma && r.prismaCalls.length === 0 && r.backendRawSql.length === 0);
console.log('\nIn Prisma schema BUT no direct prisma.<model> calls:');
inPrismaNoCalls.forEach(c => console.log(`- ${c.table} (Model: ${c.modelName})`));

const notInPrisma = results.filter(r => !r.inPrisma);
console.log('\nCompletely absent from Prisma schema (pure dead/satellite tables):');
notInPrisma.forEach(c => console.log(`- ${c.table}`));
