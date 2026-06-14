-- Add isManual field to orders table
ALTER TABLE "orders" ADD COLUMN "is_manual" BOOLEAN NOT NULL DEFAULT false;
