import prisma from './src/config/database';

async function main() {
  const cats = await prisma.category.findMany({
    where: { parentId: null },
    select: {
      id: true,
      name: true,
      slug: true
    }
  });
  console.log(JSON.stringify(cats, null, 2));
}

main().catch(console.error);
