import './src/config/env';
import prisma from './src/config/database';

async function checkWarehouses() {
  try {
    const warehouses = await prisma.warehouse.findMany();
    console.log("Warehouses in DB:", warehouses);

    const inventories = await prisma.inventory.findMany({
      include: {
        product: true,
        warehouse: true
      }
    });
    console.log(`Inventories in DB (count: ${inventories.length}):`);
    for (const inv of inventories) {
      console.log(`- Inv ID: ${inv.id}, Product: ${inv.product?.name}, Warehouse: ${inv.warehouse?.name}, Qty: ${inv.quantity}`);
    }
  } catch (error) {
    console.error("Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWarehouses();
