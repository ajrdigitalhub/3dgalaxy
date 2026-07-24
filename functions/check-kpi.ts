import prisma from './src/config/database';

async function checkKpis() {
  try {
    const productsCount = await prisma.product.count();
    const ordersCount = await prisma.order.count();
    const customersCount = await prisma.customer.count();
    const sumAgg = await prisma.order.aggregate({
      _sum: { totalAmount: true }
    });
    const cartsCount = await prisma.cart.count({
      where: {
        status: 'ACTIVE'
      }
    });
    const pendingOrdersCount = await prisma.order.count({
      where: {
        status: { in: ['pending', 'PENDING'] }
      }
    });

    console.log("DB ACTUAL COUNTS:");
    console.log(`- Products: ${productsCount}`);
    console.log(`- Orders: ${ordersCount}`);
    console.log(`- Customers: ${customersCount}`);
    console.log(`- Total Amount Sum: ${sumAgg._sum.totalAmount}`);
    console.log(`- Active Carts: ${cartsCount}`);
    console.log(`- Pending Orders: ${pendingOrdersCount}`);
  } catch (error) {
    console.error("Error checking KPIs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkKpis();
