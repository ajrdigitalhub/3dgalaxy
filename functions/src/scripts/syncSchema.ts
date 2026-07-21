import prisma from "../config/database";

async function main() {
  console.log("Syncing database schema missing columns and tables...");

  const ddlStatements = [
    // Orders missing columns
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(100);`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(50);`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_gateway" VARCHAR(100);`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_id" VARCHAR(255);`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "transaction_id" VARCHAR(255);`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gateway_response" TEXT;`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cod_charge" DECIMAL(10,2) DEFAULT 0;`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paid_amount" DECIMAL(10,2) DEFAULT 0;`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_url" TEXT;`,
    `ALTER TABLE "orders" ALTER COLUMN "invoice_url" TYPE TEXT;`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gst_number" VARCHAR(15);`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "company_name" VARCHAR(255);`,

    // Invoices table columns
    `CREATE TABLE IF NOT EXISTS "invoices" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "order_id" UUID UNIQUE NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
      "invoice_number" VARCHAR(100) UNIQUE NOT NULL,
      "invoice_status" VARCHAR(50) NOT NULL DEFAULT 'ORIGINAL',
      "pdf_storage_path" VARCHAR(255),
      "pdf_download_url" TEXT,
      "version" INT NOT NULL DEFAULT 1,
      "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "generated_by" VARCHAR(255)
    );`,
    `ALTER TABLE "invoices" ALTER COLUMN "generated_by" TYPE VARCHAR(255) USING "generated_by"::text;`,
    `ALTER TABLE "invoices" ALTER COLUMN "pdf_url" DROP NOT NULL;`,
    `ALTER TABLE "invoices" ALTER COLUMN "pdf_storage_path" DROP NOT NULL;`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "pdf_download_url" TEXT;`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "pdf_storage_path" VARCHAR(255);`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoice_status" VARCHAR(50) DEFAULT 'ORIGINAL';`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "generated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "generated_by" VARCHAR(255);`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "version" INT DEFAULT 1;`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;`,

    // Admin Notification Devices table
    `CREATE TABLE IF NOT EXISTS "admin_notification_devices" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "admin_id" UUID,
      "device_name" VARCHAR(255),
      "fcm_token" TEXT UNIQUE NOT NULL,
      "browser" VARCHAR(100),
      "os" VARCHAR(100),
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "last_seen" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    // Admin Notifications table
    `CREATE TABLE IF NOT EXISTS "admin_notifications" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "event_key" VARCHAR(100) NOT NULL,
      "category" VARCHAR(100) NOT NULL,
      "title" VARCHAR(255) NOT NULL,
      "body" TEXT NOT NULL,
      "deep_link" VARCHAR(500),
      "metadata" JSONB,
      "is_read" BOOLEAN NOT NULL DEFAULT false,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    // Notification Channel Settings table
    `CREATE TABLE IF NOT EXISTS "notification_channel_settings" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "event_key" VARCHAR(100) UNIQUE NOT NULL,
      "event_label" VARCHAR(255) NOT NULL,
      "category" VARCHAR(100) NOT NULL,
      "push_enabled" BOOLEAN NOT NULL DEFAULT true,
      "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
      "email_enabled" BOOLEAN NOT NULL DEFAULT false,
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  for (const sql of ddlStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("✅ Executed:", sql.substring(0, 50) + "...");
    } catch (err: any) {
      console.error("❌ Failed sql:", sql, err.message);
    }
  }

  console.log("🎉 Database schema synchronization completed successfully!");
}

main()
  .catch((e) => {
    console.error("Schema sync failed:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
