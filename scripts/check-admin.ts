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

async function main() {
  const email = "admin@basalim-consulting.com";
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      role: true,
      password: true,
      onboardingComplete: true,
    },
  });

  if (!user) {
    console.log("ADMIN NOT FOUND — run: npm run db:seed");
    return;
  }

  console.log({
    id: user.id,
    email: user.email,
    role: user.role,
    onboardingComplete: user.onboardingComplete,
    hasPassword: Boolean(user.password),
  });

  if (user.password) {
    const ok = await bcrypt.compare("Admin@QudrahTech2026!", user.password);
    console.log("password matches Admin@QudrahTech2026!:", ok);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
