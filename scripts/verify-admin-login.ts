import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const ADMIN_EMAIL = "admin@basalim-consulting.com";
const ADMIN_PASSWORD = "Admin@Qudrahtech2026!";

async function main() {
  const count = await prisma.user.count();
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, password: true },
  });
  console.log("Total users in this DATABASE_URL:", count);
  console.log("ADMIN accounts:", admins.length);
  for (const a of admins) {
    const ok = a.password ? await bcrypt.compare(ADMIN_PASSWORD, a.password) : false;
    console.log({
      email: a.email,
      hasPassword: Boolean(a.password),
      matchesSeedPassword: ok,
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
