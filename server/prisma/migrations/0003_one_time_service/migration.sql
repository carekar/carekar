-- CreateEnum
CREATE TYPE "Service" AS ENUM ('subscription', 'one_time');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "service" "Service" NOT NULL DEFAULT 'subscription';

