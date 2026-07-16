import prisma from './src/config/database';

async function listLatestOrders() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        customer: {
          include: { user: true }
        },
        payments: true
      }
    });

    console.log("Latest 5 Orders in DB:");
    for (const o of orders) {
      console.log(`- Order Number: ${o.orderNumber}, ID: ${o.id}, Status: ${o.status}, Amount: ${o.totalAmount}, Created: ${o.createdAt}`);
      console.log(`  Customer Type: ${o.customer?.customerType}, Email: ${o.customer?.user?.email}, Phone: ${o.customer?.phone}`);
      console.log(`  Payments count: ${o.payments.length}`);
      for (const p of o.payments) {
        console.log(`    Payment Method: ${p.paymentMethod}, Status: ${p.status}, Transaction ID: ${p.transactionId}`);
      }
    }

    const txs = await prisma.transactionHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log("\nLatest 5 Transactions in DB:");
    for (const tx of txs) {
      console.log(`- TX ID: ${tx.id}, Order ID: ${tx.orderId}, Status: ${tx.status}, Method: ${tx.paymentMethod}, Gateway Order ID: ${tx.gatewayOrderId}, Gateway Payment ID: ${tx.gatewayPaymentId}, Amount: ${tx.amount}`);
    }
  } catch (error) {
    console.error("Failed to query latest orders/transactions:", error);
  } finally {
    await prisma.$disconnect();
  }
}

listLatestOrders();
