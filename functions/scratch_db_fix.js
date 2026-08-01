const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Applying direct schema updates for Weight Management System...');
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight_in_grams" DECIMAL(10,2) DEFAULT 0;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight_unit" VARCHAR(20) DEFAULT 'g';
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "total_weight_in_grams" DECIMAL(10,2) DEFAULT 0;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "display_weight" VARCHAR(50);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "total_quantity" INTEGER DEFAULT 0;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "weight_in_grams" DECIMAL(10,2) DEFAULT 0;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE IF EXISTS "admin_fcm_tokens" DROP CONSTRAINT IF EXISTS "admin_fcm_tokens_admin_id_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    DROP TABLE IF EXISTS "admin_fcm_tokens" CASCADE;
  `);

  console.log('✅ All weight columns successfully added to PostgreSQL database!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
