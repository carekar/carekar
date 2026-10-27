-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('viewer', 'editor');

-- CreateTable
CREATE TABLE "team_members" (
    "email" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'viewer',
    "name" TEXT,
    "added_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("email")
);


-- Only the API reads this table (see 0001_init)
ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;
