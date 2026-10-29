import '../functions/src/config/env';
import prisma from '../functions/src/config/database';

async function run() {
  const cats = await prisma.category.findMany({ take: 5 });
  console.log('CATEGORIES:', cats.map(c => ({ name: c.name, slug: c.slug, image: c.image })));
  await prisma.$disconnect();
}
run();

