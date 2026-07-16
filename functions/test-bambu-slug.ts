import './src/config/env';
import prisma from './src/config/database';

async function checkBambuSlug() {
  try {
    const products = await prisma.product.findMany({
      where: {
        name: {
          contains: 'Bambu'
        }
      }
    });
    console.log("Bambu products:");
    for (const p of products) {
      console.log(`- Name: ${p.name}, Slug: ${p.slug}, Stock: ${p.stock}`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBambuSlug();
