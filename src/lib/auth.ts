import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { SubscriptionTier as PrismaSubscriptionTier } from "@prisma/client";
import { getPrisma, isPrismaConnectionError } from "@/lib/db";
import { AuthDatabaseUnavailableError, AuthEmailNotVerifiedError } from "@/lib/auth-errors";
import { isEmailVerified } from "@/lib/email-verification";
import { withDbRetry } from "@/lib/db-retry";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations";
import { DEFAULT_LOCALE } from "@/lib/constants";
import { UserRole } from "@/types";
import type { NextAuthConfig } from "next-auth";
import { getAuthSecret } from "@/lib/auth-secret";
import { getAuthCookieDomain } from "@/lib/auth-cookie-domain";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      subscriptionTier: PrismaSubscriptionTier;
      onboardingComplete: boolean;
    };
  }
  interface User {
    role?: UserRole;
    subscriptionTier?: PrismaSubscriptionTier;
    onboardingComplete?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string | null;
    role?: UserRole;
    id?: string;
    subscriptionTier?: PrismaSubscriptionTier;
    onboardingComplete?: boolean | null;
    picture?: string | null;
    /** Throttle DB hydration — avoids Railway latency invalidating sessions on every tab focus. */
    lastDbSync?: number;
  }
}

function sessionUserFromToken(
  uid: string,
  token: import("next-auth/jwt").JWT,
): NonNullable<import("next-auth").Session["user"]> {
  return {
    id: uid,
    name: typeof token.name === "string" ? token.name : null,
    email:
      typeof token.email === "string" && token.email.trim().length > 0
        ? token.email.trim()
        : null,
    image:
      token.picture != null && token.picture !== "" ? String(token.picture) : null,
    role: (token.role as UserRole) ?? UserRole.JOBSEEKER,
    subscriptionTier:
      (token.subscriptionTier as PrismaSubscriptionTier) ?? "FREE",
    onboardingComplete:
      token.onboardingComplete == null ? true : Boolean(token.onboardingComplete),
  };
}

async function hydrateTokenFromDb(
  userId: string,
): Promise<{
  row: {
    subscriptionTier: PrismaSubscriptionTier;
    role: UserRole;
    onboardingComplete: boolean;
    image: string | null;
    email: string;
  } | null;
  /** false when the DB could not be reached — do not treat as “user deleted”. */
  reachable: boolean;
}> {
  try {
    const row = await withDbRetry(async () => {
      const prisma = getPrisma();
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscriptionTier: true,
          role: true,
          onboardingComplete: true,
          image: true,
          email: true,
        },
      });
    });
    return { row: row ?? null, reachable: true };
  } catch {
    return { row: null, reachable: false };
  }
}

function applyDbRowToToken(
  token: import("next-auth/jwt").JWT,
  row: {
    subscriptionTier: PrismaSubscriptionTier;
    role: UserRole;
    onboardingComplete: boolean;
    image: string | null;
    email: string;
  },
): void {
  token.role = row.role;
  token.subscriptionTier = row.subscriptionTier;
  token.onboardingComplete = row.onboardingComplete;
  token.picture = row.image ?? undefined;
  if (typeof row.email === "string" && row.email.includes("@")) {
    token.email = row.email.trim();
  }
  token.lastDbSync = Date.now();
}

/** Re-sync tier/role from DB at most every 5 minutes (not on every session poll). */
const JWT_DB_SYNC_MS = 5 * 60 * 1000;

async function forceSyncTokenFromDb(
  token: import("next-auth/jwt").JWT,
  userId: string,
): Promise<import("next-auth/jwt").JWT | null> {
  const { row, reachable } = await hydrateTokenFromDb(userId);
  if (!reachable) return token;
  if (!row) return null;
  applyDbRowToToken(token, row);
  return token;
}

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        try {
          const normalizedEmail = email.trim().toLowerCase();
          const user = await withDbRetry(async () => {
            const prisma = getPrisma();
            return prisma.user.findFirst({
              where: {
                email: { equals: normalizedEmail, mode: "insensitive" },
              },
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                password: true,
                subscriptionTier: true,
                onboardingComplete: true,
                emailVerified: true,
              },
            });
          });
          if (!user || !user.password) return null;

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return null;

          if (!isEmailVerified(user.emailVerified)) {
            throw new AuthEmailNotVerifiedError();
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role as UserRole,
            subscriptionTier: user.subscriptionTier,
            onboardingComplete: user.onboardingComplete,
          };
        } catch (err) {
          if (isPrismaConnectionError(err)) {
            console.error("[auth] credentials authorize — database unreachable:", err);
            throw new AuthDatabaseUnavailableError();
          }
          console.error("[auth] credentials authorize failed:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session: sessionPatch }) {
      if (user) {
        token.id = user.id;
        token.sub = user.id;
        if ("name" in user && typeof user.name === "string") {
          token.name = user.name;
        }
        if ("email" in user && typeof user.email === "string") {
          token.email = user.email;
        }
        token.role = (user.role as UserRole) ?? UserRole.JOBSEEKER;
        if (user.subscriptionTier != null) {
          token.subscriptionTier = user.subscriptionTier;
        }
        if (user.onboardingComplete != null) {
          token.onboardingComplete = user.onboardingComplete;
        }
        if (user.image !== undefined) {
          token.picture = user.image ?? undefined;
        }
        token.lastDbSync = Date.now();
      }
      if (account?.provider === "google" && token.email) {
        try {
          const prisma = getPrisma();
          const email = token.email.trim().toLowerCase();
          const dbUser = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
          });
          if (dbUser) {
            token.id = dbUser.id;
            applyDbRowToToken(token, {
              role: dbUser.role as UserRole,
              subscriptionTier: dbUser.subscriptionTier,
              onboardingComplete: dbUser.onboardingComplete,
              image: dbUser.image,
              email: dbUser.email,
            });
          }
        } catch {
          // token may hydrate on next JWT pass
        }
      }

      const uid =
        typeof token.id === "string" ? token.id : typeof token.sub === "string" ? token.sub : null;

      /** Client called `session.update()` — always pull fresh role / onboarding from DB. */
      if (trigger === "update" && typeof uid === "string") {
        const synced = await forceSyncTokenFromDb(token, uid);
        if (synced === null) {
          if (token.role && token.id) return token;
          return null;
        }
        const patch = sessionPatch as Record<string, unknown> | undefined;
        if (patch?.onboardingComplete === true) {
          synced.onboardingComplete = true;
        }
        if (typeof patch?.role === "string") {
          synced.role = patch.role as UserRole;
        }
        return synced;
      }

      if (typeof uid === "string") {
        const now = Date.now();
        const lastSync = typeof token.lastDbSync === "number" ? token.lastDbSync : 0;
        const needsSync = now - lastSync >= JWT_DB_SYNC_MS;

        if (needsSync) {
          const synced = await forceSyncTokenFromDb(token, uid);
          if (synced === null) {
            /** DB confirmed user deleted — otherwise forceSync keeps token on unreachable DB. */
            return null;
          }
          return synced;
        }
      }

      return token;
    },

    async session({ session, token }) {
      const uid =
        typeof token?.id === "string"
          ? token.id
          : typeof token?.sub === "string"
            ? token.sub
            : null;
      if (!uid) {
        return { ...session, user: undefined };
      }

      /** JWT is source of truth for session reads — avoids a DB round-trip on every `/api/auth/session` poll. */
      if (!session.user) {
        session.user = { id: uid } as NonNullable<typeof session.user>;
      }
      Object.assign(session.user, sessionUserFromToken(uid, token));
      return session;
    },

    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const email = user.email.trim().toLowerCase();
          await withDbRetry(async () => {
            const prisma = getPrisma();
            const existing = await prisma.user.findFirst({
              where: { email: { equals: email, mode: "insensitive" } },
            });
            if (!existing) {
              await prisma.user.create({
                data: {
                  email,
                  name: user.name,
                  image: user.image,
                  role: UserRole.JOBSEEKER,
                  onboardingComplete: false,
                  emailVerified: new Date(),
                  profile: { create: { language: "ar" } },
                },
              });
            }
          });
        } catch (err) {
          console.error("[auth] Google signIn database error:", err);
          return false;
        }
      }
      return true;
    },

    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const dest = new URL(url);
        const base = new URL(baseUrl);
        if (dest.origin === base.origin) return url;
        if (dest.pathname.startsWith("/")) return `${base.origin}${dest.pathname}${dest.search}`;
      } catch {
        /* ignore */
      }
      try {
        const base = new URL(baseUrl);
        const dest = new URL(url, baseUrl);
        const seg = dest.pathname.split("/")[1];
        if (seg && seg.length === 2) {
          return `${base.origin}/${seg}/auth/login`;
        }
        return `${base.origin}/${DEFAULT_LOCALE}/auth/login`;
      } catch {
        return `${baseUrl}/${DEFAULT_LOCALE}/auth/login`;
      }
    },
  },

  pages: {
    signIn: `/${DEFAULT_LOCALE}/auth/login`,
    error: `/${DEFAULT_LOCALE}/auth/login`,
    newUser: `/${DEFAULT_LOCALE}/onboarding`,
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  cookies: (() => {
    const domain = getAuthCookieDomain();
    if (!domain) return undefined;
    // Only session/callback cookies may set Domain. CSRF uses __Host- prefix and
    // must stay host-only — setting domain on it breaks credentials login on Vercel.
    return {
      sessionToken: {
        options: { domain },
      },
      callbackUrl: {
        options: { domain },
      },
    };
  })(),
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: getAuthSecret(),
  /** Helps `/api/auth/*` when host is localhost, 127.0.0.1, LAN IP, or tunnels (avoids flaky session fetches). */
  trustHost: true,
});
