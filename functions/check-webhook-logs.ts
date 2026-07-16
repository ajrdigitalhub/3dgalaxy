import './src/config/env';
import prisma from './src/config/database';

async function checkLogs() {
  try {
    console.log("=== Recent Webhook Logs ===");
    const webhookLogs = await prisma.paymentWebhookLog.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 10
    });
    for (const log of webhookLogs) {
      console.log(`- Gateway: ${log.gateway}, Status: ${log.status}, Created: ${log.receivedAt}`);
      console.log(`  Payload:`, JSON.stringify(log.payload));
    }

    console.log("\n=== Recent Transaction History Logs ===");
    const txs = await prisma.transactionHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    for (const tx of txs) {
      console.log(`- Order ID: ${tx.orderId}, Status: ${tx.status}, Payment Status: ${tx.paymentStatus}, Gateway Order ID: ${tx.gatewayOrderId}, Gateway Payment ID: ${tx.gatewayPaymentId}`);
      if (tx.errorMessage) {
        console.log(`  Error: ${tx.errorMessage}`);
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogs();
