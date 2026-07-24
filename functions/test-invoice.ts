import prisma from './src/config/database';
import { InvoiceService } from './src/services/invoice.service';

async function testInvoice() {
  const orderId = '4ed23ac2-1b8d-462c-bb07-966f0085390b';
  try {
    console.log("Fetching order:", orderId);
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderNumber: orderId }
        ]
      },
      include: {
        customer: { include: { user: true } },
        shippingAddress: true,
        billingAddress: true,
        items: { include: { product: true, variant: true } }
      }
    });

    console.log("Order found:", !!order, order?.orderNumber);
    if (!order) return;

    console.log("Testing InvoiceService.getOrCreateInvoice...");
    const invoice = await InvoiceService.getOrCreateInvoice(order.id, null);
    console.log("Invoice created/fetched successfully:", invoice.invoiceNumber);

    console.log("Testing PDF Buffer generation...");
    const buf = await InvoiceService.buildInvoicePDFBuffer(order, invoice.invoiceNumber, invoice.invoiceStatus);
    console.log("PDF Buffer generated successfully, size:", buf.length);
  } catch (err: any) {
    console.error("INVOICE TEST FAILED WITH ERROR:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testInvoice();
