const fs = require('fs');
const path = require('path');

function getFiles(dir, exts = ['.ts', '.js']) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist') && !file.includes('.angular')) {
          results = results.concat(getFiles(fullPath, exts));
        }
      } else if (exts.some(ext => file.endsWith(ext))) {
        results.push(fullPath);
      }
    });
  } catch (e) {}
  return results;
}

const tables = fs.readFileSync('sql_tables.txt', 'utf-8').split(/\r?\n/).map(t => t.trim()).filter(Boolean);
const prismaContent = fs.readFileSync('functions/prisma/schema.prisma', 'utf-8');
const backendFiles = getFiles('functions/src');
const frontendFiles = getFiles('src');

const backendContents = backendFiles.map(f => ({ file: f, content: fs.readFileSync(f, 'utf-8') }));
const frontendContents = frontendFiles.map(f => ({ file: f, content: fs.readFileSync(f, 'utf-8') }));

const report = [];

tables.forEach(table => {
  const camel = table.replace(/(^|_)([a-z])/g, (_, p, c) => c.toUpperCase());
  const inPrisma = prismaContent.includes('@@map("' + table + '")') || new RegExp('model\\s+' + camel + '\\b').test(prismaContent);
  
  let backendMatches = 0;
  let backendSamples = [];
  const modelVar = camel.charAt(0).toLowerCase() + camel.slice(1);
  const regex = new RegExp('\\b(' + table + '|' + modelVar + ')\\b', 'g');

  backendContents.forEach(({ file, content }) => {
    const matches = content.match(regex);
    if (matches) {
      backendMatches += matches.length;
      backendSamples.push(path.basename(file));
    }
  });

  let frontendMatches = 0;
  frontendContents.forEach(({ content }) => {
    const matches = content.match(regex);
    if (matches) frontendMatches += matches.length;
  });

  report.push({
    table,
    inPrisma,
    backendMatches,
    frontendMatches,
    backendSamples: [...new Set(backendSamples)].slice(0, 3).join(', ')
  });
});

fs.writeFileSync('scratch/table_analysis_report.json', JSON.stringify(report, null, 2));

console.log('--- TABLES NOT IN PRISMA OR UNUSED (0 matches in backend) ---');
report.filter(r => !r.inPrisma || r.backendMatches === 0).forEach(r => {
  console.log(r.table.padEnd(30), 'InPrisma:', String(r.inPrisma).padEnd(6), 'BackendMatches:', String(r.backendMatches).padEnd(4), 'Frontend:', r.frontendMatches);
});

console.log('\n--- ALL TABLES SUMMARY ---');
report.forEach(r => {
  console.log(r.table.padEnd(30), 'InPrisma:', String(r.inPrisma).padEnd(6), 'BackendMatches:', String(r.backendMatches).padEnd(4), 'Samples:', r.backendSamples);
});
