// Creates (or updates) an admin login.
// Usage: npm run admin:create -- <email> <password> [owner|staff] ["Full Name"]
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../src/db/client";

const [email, password, role = "staff", name = ""] = process.argv.slice(2);
if (!email || !password || (role !== "owner" && role !== "staff")) {
  console.error('Usage: npm run admin:create -- <email> <password> [owner|staff] ["Full Name"]');
  process.exit(1);
}
if (password.length < 8) throw new Error("Use a password of at least 8 characters");

// Creating Supabase Auth users needs the secret service-role key (only this script uses it).
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !serviceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed in server/.env");
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

let userId: string;
const created = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
if (created.error) {
  // Already exists: find the user and reset the password
  const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw created.error;
  userId = user.id;
  const upd = await sb.auth.admin.updateUserById(userId, { password });
  if (upd.error) throw upd.error;
  console.log("• user existed, password updated");
} else {
  userId = created.data.user.id;
}

const db = prisma();
await db.adminUser.upsert({
  where: { userId },
  create: { userId, email, name: name || null, role },
  update: { email, name: name || null, role },
});
console.log(`✓ ${email} can now log in to /admin as ${role}`);
await db.$disconnect();
