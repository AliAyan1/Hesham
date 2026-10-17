-- Email verification OTP (credentials signup)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationCodeExpiry" TIMESTAMP(3);

-- Existing password users stay able to log in (run once on production)
UPDATE "User"
SET "emailVerified" = COALESCE("emailVerified", NOW())
WHERE "password" IS NOT NULL;
