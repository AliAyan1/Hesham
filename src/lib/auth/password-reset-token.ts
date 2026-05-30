import { createHash, randomBytes } from "crypto";
import { getPrisma } from "@/lib/db";

const TOKEN_BYTES = 32;
const EXPIRY_MS = 60 * 60 * 1000;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const prisma = getPrisma();
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + EXPIRY_MS);

  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return token;
}

export async function consumePasswordResetToken(
  token: string,
): Promise<{ userId: string } | null> {
  const prisma = getPrisma();
  const tokenHash = hashResetToken(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true },
  });
  if (!row || row.expiresAt < new Date()) {
    if (row) {
      await prisma.passwordResetToken.delete({ where: { id: row.id } }).catch(() => undefined);
    }
    return null;
  }
  await prisma.passwordResetToken.delete({ where: { id: row.id } });
  return { userId: row.userId };
}
