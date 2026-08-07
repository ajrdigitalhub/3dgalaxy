import prisma from '../config/database';

/**
 * Generates the next sequential order number in the format 3DX0001, 3DX0002, etc.
 * Querying the max existing sequence number starting with '3DX' and incrementing by 1.
 */
export async function generateNextOrderNumber(txPrisma?: any): Promise<string> {
  const p = txPrisma || prisma;

  try {
    const existingOrders = await p.order.findMany({
      where: {
        orderNumber: {
          startsWith: '3DX',
        },
      },
      select: {
        orderNumber: true,
      },
    });

    let maxSeq = 0;
    for (const ord of existingOrders) {
      if (ord.orderNumber) {
        const match = ord.orderNumber.match(/^3DX(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }

    const nextSeq = maxSeq + 1;
    const padded = nextSeq.toString().padStart(4, '0');
    return `3DX${padded}`;
  } catch (err) {
    console.error('[generateNextOrderNumber Error]:', err);
    const fallbackSeq = Math.floor(1000 + Math.random() * 9000);
    return `3DX${fallbackSeq}`;
  }
}
