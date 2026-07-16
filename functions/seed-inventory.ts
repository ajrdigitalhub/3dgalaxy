import './src/config/env';
import prisma from './src/config/database';

async function seedInventory() {
  try {
    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
      console.error("No warehouse found!");
      return;
    }

    const products = await prisma.product.findMany();
    console.log(`Creating/updating inventory records for ${products.length} products...`);

    for (const p of products) {
      // Check if inventory already exists
      const existing = await prisma.inventory.findFirst({
        where: { productId: p.id, warehouseId: warehouse.id }
      });

      if (!existing) {
        await prisma.inventory.create({
          data: {
            productId: p.id,
            warehouseId: warehouse.id,
            quantity: 50,
            reservedQty: 0
          }
        });
        console.log(`Created inventory for: ${p.name}`);
      } else {
        // Set quantity to 50
        await prisma.inventory.update({
          where: { id: existing.id },
          data: { quantity: 50 }
        });
        console.log(`Updated inventory for: ${p.name} to 50`);
      }

      // Also reset product stock to 50
      await prisma.product.update({
        where: { id: p.id },
        data: { stock: 50 }
      });
    }

    console.log("Inventory seeding completed!");
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

seedInventory();
