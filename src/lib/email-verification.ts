/** Six-digit OTP for email verification (10-minute TTL). */
export function generateVerificationCode(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

export function verificationCodeExpiresAt(): Date {
  return new Date(Date.now() + 10 * 60 * 1000);
}

export function isVerificationCodeValid(
  storedCode: string | null | undefined,
  expiresAt: Date | null | undefined,
  submittedCode: string,
): boolean {
  if (!storedCode || !expiresAt) return false;
  if (Date.now() > expiresAt.getTime()) return false;
  const normalized = submittedCode.replace(/\D/g, "").trim();
  if (normalized.length !== 6) return false;
  return storedCode === normalized;
}

export function isEmailVerified(emailVerified: Date | null | undefined): boolean {
  return emailVerified != null;
}
