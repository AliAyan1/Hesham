import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local before seeding.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("Admin@QudrahTech2026!", 12);

  await prisma.user.upsert({
    where: { email: "admin@basalim-consulting.com" },
    update: {
      password: hashedPassword,
      role: "ADMIN",
      onboardingComplete: true,
    },
    create: {
      name: "QudrahTech Admin",
      email: "admin@basalim-consulting.com",
      password: hashedPassword,
      role: "ADMIN",
      subscriptionTier: "PREMIUM",
      emailVerified: new Date(),
      onboardingComplete: true,
    },
  });
  console.log("✅ Admin account created");
  console.log("Email: admin@basalim-consulting.com");
  console.log("Password: Admin@QudrahTech2026!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
