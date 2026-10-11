#!/usr/bin/env node
/**
 * Run before production deploy: npm run qa:auth
 * Uses DATABASE_URL from .env.local when present.
 */
import { config } from "dotenv";
import { execSync } from "node:child_process";

config({ path: ".env.local" });

const checks = [];

function pass(msg) {
  checks.push({ ok: true, msg });
  console.log("✓", msg);
}

function warn(msg) {
  checks.push({ ok: false, msg });
  console.warn("!", msg);
}

const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
if (authUrl.includes("www.basalim-consulting.com")) {
  pass("AUTH_URL / NEXTAUTH_URL uses www (recommended for Hostinger/Vercel)");
} else if (authUrl.includes("basalim-consulting.com")) {
  warn("AUTH_URL should be https://www.basalim-consulting.com on production");
} else if (authUrl.includes("localhost")) {
  pass("Local auth URL (ok for dev)");
} else {
  warn("Set AUTH_URL and NEXTAUTH_URL for production");
}

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
if (secret && secret.length >= 32) {
  pass("AUTH_SECRET / NEXTAUTH_SECRET is set");
} else {
  warn("AUTH_SECRET missing or too short — set in Vercel and never rotate without reason");
}

const db = process.env.DATABASE_URL ?? "";
if (db.includes("hopper.proxy.rlwy.net") || db.includes("railway")) {
  pass("DATABASE_URL looks like Railway public Postgres");
} else if (!db) {
  warn("DATABASE_URL not loaded — add to .env.local or Vercel");
} else {
  pass("DATABASE_URL is set");
}

if (process.env.DATABASE_URL) {
  try {
    execSync("npx tsx scripts/check-admin.ts", { stdio: "inherit" });
    pass("Admin account reachable in DATABASE_URL");
  } catch {
    warn("Admin check failed — run npm run admin:reset against production DB");
  }
}

console.log("\nManual QA before onboarding users:");
console.log("  1. https://www.basalim-consulting.com/api/health → database connected");
console.log("  2. Login (credentials) on desktop + phone (www URL)");
console.log("  3. Register job seeker → onboarding; employer → dashboard");
console.log("  4. Google sign-in if enabled in Google Console for www + apex");

const failed = checks.filter((c) => !c.ok).length;
process.exit(failed > 0 ? 1 : 0);
