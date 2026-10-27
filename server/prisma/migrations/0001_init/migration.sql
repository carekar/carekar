-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Booking refs CK-1001, CK-1002… (default of leads.ref)
CREATE SEQUENCE IF NOT EXISTS "lead_ref_seq" START 1001;

-- CreateEnum
CREATE TYPE "Vehicle" AS ENUM ('hatchback', 'sedan', 'suv', 'luxury', 'bike');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'availability_confirmed', 'payment_link_sent', 'active', 'not_serviceable', 'paused', 'cancelled', 'lost');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('captured', 'failed');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('owner', 'staff');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "ref" TEXT NOT NULL DEFAULT ('CK-'::text || nextval('lead_ref_seq'::regclass)),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicle" "Vehicle" NOT NULL,
    "vehicle_model" TEXT,
    "vehicle_count" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "same_whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "whatsapp" TEXT,
    "society" TEXT NOT NULL,
    "tower_flat" TEXT,
    "locality" TEXT,
    "parking_type" TEXT,
    "parking_slot" TEXT,
    "start_date" DATE,
    "preferred_time" TEXT,
    "vehicle_colour" TEXT,
    "registration_no" TEXT,
    "heard_from" TEXT,
    "notes" TEXT,
    "callback_requested" BOOLEAN NOT NULL DEFAULT false,
    "plan_price" INTEGER NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "lost_reason" TEXT,
    "history" JSONB NOT NULL DEFAULT '[]',
    "team_notes" JSONB NOT NULL DEFAULT '[]',
    "visitor_id" TEXT,
    "first_touch" JSONB,
    "last_touch" JSONB,
    "device" TEXT,
    "in_app" TEXT,
    "demo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL DEFAULT 'Direct',
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "content" TEXT,
    "landing" TEXT,
    "referrer" TEXT,
    "device" TEXT NOT NULL DEFAULT 'mobile',
    "os" TEXT,
    "browser" TEXT,
    "in_app" TEXT,
    "returning" BOOLEAN NOT NULL DEFAULT false,
    "demo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" BIGSERIAL NOT NULL,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitor_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "props" JSONB,
    "path" TEXT,
    "lead_id" TEXT,
    "demo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "lead_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "razorpay_payment_id" TEXT,
    "razorpay_subscription_id" TEXT,
    "demo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "AdminRole" NOT NULL DEFAULT 'staff',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_ref_key" ON "leads"("ref");

-- CreateIndex
CREATE INDEX "leads_created_idx" ON "leads"("created_at" DESC);

-- CreateIndex
CREATE INDEX "leads_dedupe_idx" ON "leads"("mobile", "vehicle", "created_at" DESC);

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "sessions_started_idx" ON "sessions"("started_at" DESC);

-- CreateIndex
CREATE INDEX "sessions_visitor_idx" ON "sessions"("visitor_id");

-- CreateIndex
CREATE INDEX "events_at_idx" ON "events"("at" DESC);

-- CreateIndex
CREATE INDEX "events_visitor_idx" ON "events"("visitor_id");

-- CreateIndex
CREATE INDEX "events_lead_idx" ON "events"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "payments_lead_idx" ON "payments"("lead_id");

-- CreateIndex
CREATE INDEX "payments_at_idx" ON "payments"("at" DESC);

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Only the API (Prisma, as the database owner) reads or writes these tables. RLS with no
-- policies means Supabase's public anon key / REST API can read nothing.
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
