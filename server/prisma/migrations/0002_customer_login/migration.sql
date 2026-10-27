-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "customer_email" TEXT,
ADD COLUMN     "customer_name" TEXT,
ADD COLUMN     "customer_uid" TEXT;

-- CreateIndex
CREATE INDEX "leads_customer_idx" ON "leads"("customer_uid");

