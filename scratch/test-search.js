const fs = require('fs');
const code = fs.readFileSync('d:\\Web Dev\\3DGalaxy-Hub\\3dgalaxy\\src\\app\\services\\datastore.ts', 'utf8');
const lines = code.split('\n');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('settings') || line.toLowerCase().includes('updatesettings')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
