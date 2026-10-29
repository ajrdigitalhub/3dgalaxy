import fs from 'node:fs';
import path from 'node:path';

function syncTemplate() {
  const sourcePath = path.resolve(process.cwd(), 'dist/applet/browser/index.html');
  const targetDir1 = path.resolve(process.cwd(), 'functions/src/templates');
  const targetDir2 = path.resolve(process.cwd(), 'functions/dist');

  if (!fs.existsSync(sourcePath)) {
    console.warn(`[sync-html-template] Source index.html not found at: ${sourcePath}`);
    return;
  }

  const content = fs.readFileSync(sourcePath, 'utf8');

  if (!fs.existsSync(targetDir1)) {
    fs.mkdirSync(targetDir1, { recursive: true });
  }
  fs.writeFileSync(path.join(targetDir1, 'index.html'), content, 'utf8');

  if (!fs.existsSync(targetDir2)) {
    fs.mkdirSync(targetDir2, { recursive: true });
  }
  fs.writeFileSync(path.join(targetDir2, 'index.html'), content, 'utf8');

  console.log(`[sync-html-template] Synchronized index.html to functions/src/templates and functions/dist successfully.`);
}

syncTemplate();

