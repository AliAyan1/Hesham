import { auth } from "./auth";
import type { Session } from "next-auth";

/** Server-side session for API routes & RSC — wraps NextAuth `auth()` (v5 App Router equivalent of getServerSession). */
export async function getServerSession(): Promise<Session | null> {
  return auth();
}
