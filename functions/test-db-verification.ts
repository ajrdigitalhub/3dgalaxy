import './src/config/env';
import prisma from './src/config/database';

async function verifyOrderState() {
  try {
    const orderNumber = 'ORD-2026-809233';
    console.log(`=== Verifying Order Database State for ${orderNumber} ===`);

    const order = await prisma.order.findFirst({
      where: { orderNumber },
      include: {
        customer: { include: { user: true } },
        shippingAddress: true,
        items: {
          include: {
            product: true,
            variant: true
          }
        },
        payments: true
      }
    });

    if (!order) {
      console.error(`Order ${orderNumber} not found in DB!`);
      return;
    }

    console.log(`Order ID: ${order.id}`);
    console.log(`Status: ${order.status}`);
    console.log(`Total Amount: ${order.totalAmount}`);
    console.log(`Customer Type: ${order.customer?.customerType}`);
    console.log(`Email: ${order.customer?.user?.email}`);
    
    console.log(`\nPayments:`);
    console.log(`Count: ${order.payments.length}`);
    for (const p of order.payments) {
      console.log(`- Payment ID: ${p.id}, Method: ${p.paymentMethod}, Status: ${p.status}, Transaction ID: ${p.transactionId}, Amount: ${p.amount}`);
    }

    console.log(`\nOrder Items & Stock Levels:`);
    for (const item of order.items) {
      console.log(`- Product: ${item.product?.name}`);
      console.log(`  Ordered Quantity: ${item.quantity}`);
      console.log(`  Current Product Stock: ${item.product?.stock}`);
      if (item.variant) {
        console.log(`  Variant: ${item.variant.name}`);
        console.log(`  Current Variant Stock: ${item.variant.stock}`);
      }

      // Check warehouse inventory
      const warehouseInv = await prisma.inventory.findFirst({
        where: { 
          productId: item.productId || undefined, 
          variantId: item.variantId || undefined 
        }
      });
      console.log(`  Current Warehouse Inventory Quantity: ${warehouseInv?.quantity}`);
    }

    // Check transaction history
    const txHistory = await prisma.transactionHistory.findFirst({
      where: { orderId: order.id }
    });
    console.log(`\nTransaction History:`);
    if (txHistory) {
      console.log(`- Status: ${txHistory.status}, Payment Status: ${txHistory.paymentStatus}, Gateway Order ID: ${txHistory.gatewayOrderId}, Gateway Payment ID: ${txHistory.gatewayPaymentId}, Amount: ${txHistory.amount}`);
    } else {
      console.log("- None found");
    }

    // Check inventory transaction logs
    const invTxs = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order.id }
    });
    console.log(`\nInventory Transactions count: ${invTxs.length}`);
    for (const invTx of invTxs) {
      console.log(`- Inventory ID: ${invTx.inventoryId}, Type: ${invTx.transactionType}, Qty: ${invTx.quantity}, Notes: ${invTx.notes}`);
    }

  } catch (error) {
    console.error("Verification failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyOrderState();
