/**
 * DEV / LOCAL ONLY — deletes every user, job, application, session, etc.
 * Run from repo root: `npm run db:wipe`
 * If Prisma fails to connect or times out, stop `npm run dev` first so the DB pool is free.
 * After running: sign out in the browser (sessions are invalid) and register again.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Single TRUNCATE is fast and avoids interactive-transaction timeouts (P2028) when dev holds pool slots.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "SavedJob",
      "Application",
      "Job",
      "Notification",
      "Session",
      "Account",
      "Profile",
      "CV",
      "EmployerProfile",
      "Contact",
      "User"
    RESTART IDENTITY CASCADE;
  `);
  console.log("Wiped: users, profiles, CV, employer profiles, jobs, applications, sessions, accounts, notifications, contact rows.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
