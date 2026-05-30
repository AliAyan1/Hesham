import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { SubscriptionTier as PrismaSubscriptionTier } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations";
import { UserRole } from "@/types";
import type { NextAuthConfig } from "next-auth";
import { getAuthSecret } from "@/lib/auth-secret";

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
    const prisma = getPrisma();
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        role: true,
        onboardingComplete: true,
        image: true,
        email: true,
      },
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
          const prisma = getPrisma();
          const normalizedEmail = email.trim().toLowerCase();
          const user = await prisma.user.findFirst({
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
            },
          });
          if (!user || !user.password) return null;

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role as UserRole,
            subscriptionTier: user.subscriptionTier,
            onboardingComplete: user.onboardingComplete,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session: sessionPatch }) {
      if (user) {
        token.id = user.id;
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
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
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
        if (synced === null) return null;
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
          if (synced === null) return null;
          return synced;
        }

        /** Ghost session after DB wipe — invalidate cookie even between sync windows. */
        try {
          const prisma = getPrisma();
          const exists = await prisma.user.findUnique({
            where: { id: uid },
            select: { id: true },
          });
          if (!exists) return null;
        } catch {
          /* keep token on transient DB errors */
        }
      }

      return token;
    },

    async session({ session, token }) {
      const uid = typeof token?.id === "string" ? token.id : null;
      if (!uid) {
        return { ...session, user: undefined };
      }

      const { row, reachable } = await hydrateTokenFromDb(uid);
      if (!reachable) {
        if (session.user) {
          session.user.id = uid;
          if (typeof token.email === "string" && token.email.trim().length > 0) {
            session.user.email = token.email.trim();
          }
          session.user.role = (token.role as UserRole) ?? UserRole.JOBSEEKER;
          session.user.subscriptionTier =
            (token.subscriptionTier as PrismaSubscriptionTier) ?? "FREE";
          session.user.onboardingComplete =
            token.onboardingComplete == null ? true : Boolean(token.onboardingComplete);
          const pic = token.picture;
          session.user.image = pic != null && pic !== "" ? String(pic) : null;
        }
        return session;
      }

      if (!row) {
        return { ...session, user: undefined };
      }

      if (session.user) {
        session.user.id = uid;
        session.user.email = row.email.trim();
        session.user.role = row.role;
        session.user.subscriptionTier = row.subscriptionTier;
        session.user.onboardingComplete = row.onboardingComplete;
        session.user.image = row.image;
      }
      return session;
    },

    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const prisma = getPrisma();
          const existing = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (!existing) {
            await prisma.user.create({
              data: {
                email: user.email,
                name: user.name,
                image: user.image,
                role: UserRole.JOBSEEKER,
                onboardingComplete: false,
                profile: { create: { language: "ar" } },
              },
            });
          }
        } catch {
          return false;
        }
      }
      return true;
    },

    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {
        /* ignore */
      }
      return baseUrl;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
    newUser: "/onboarding",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: getAuthSecret(),
  /** Helps `/api/auth/*` when host is localhost, 127.0.0.1, LAN IP, or tunnels (avoids flaky session fetches). */
  trustHost: true,
});
