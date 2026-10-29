import https from 'node:https';
import '../functions/src/config/env';
import prisma from '../functions/src/config/database';

async function checkImage(urlStr: string) {
  return new Promise((resolve) => {
    https.get(urlStr, { method: 'HEAD' }, (res) => {
      resolve({
        statusCode: res.statusCode,
        contentType: res.headers['content-type'],
        contentLength: res.headers['content-length']
      });
    }).on('error', (e) => {
      resolve({ error: e.message });
    });
  });
}

async function run() {
  const p = await prisma.product.findUnique({
    where: { slug: 'bambu-lab-a1-mini-3d-printer' },
    include: { variants: true, category: true, brand: true }
  });
  if (!p) {
    console.log('Product not found!');
    return;
  }
  console.log('NAME:', p.name);
  const images = Array.isArray(p.images) ? p.images : [];
  const primary = images[0]?.url;
  console.log('PRIMARY IMG URL:', primary);
  if (primary) {
    const res = await checkImage(primary);
    console.log('IMG CHECK RESULT:', JSON.stringify(res));
  }
  await prisma.$disconnect();
}
run();
