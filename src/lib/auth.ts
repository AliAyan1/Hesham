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
  }
}

async function hydrateTokenFromDb(
  userId: string,
): Promise<{
  subscriptionTier: PrismaSubscriptionTier;
  role: UserRole;
  onboardingComplete: boolean;
  image: string | null;
  email: string;
} | null> {
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
    return row ?? null;
  } catch {
    return null;
  }
}

/** After DB resets / re-register with same email, JWT can keep an old user id → repair `token.id` from email. */
async function reconcileJwtUserIdWithDb(token: {
  id?: string;
  email?: string | null;
  sub?: string | null;
}): Promise<void> {
  const rawId =
    typeof token.id === "string" ? token.id : typeof token.sub === "string" ? token.sub : null;
  const email =
    typeof token.email === "string" && token.email.trim().length > 0 ? token.email.trim() : null;
  if (!rawId && !email) return;

  try {
    const prisma = getPrisma();
    if (rawId) {
      const hit = await prisma.user.findUnique({ where: { id: rawId }, select: { id: true } });
      if (hit) return;
    }
    if (!email) return;
    const byEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (byEmail?.id) {
      token.id = byEmail.id;
    }
  } catch {
    // DB unreachable or schema not applied — keep existing JWT claims
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
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
    async jwt({ token, user, account }) {
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
      }
      if (account?.provider === "google" && token.email) {
        try {
          const prisma = getPrisma();
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role as UserRole;
            token.subscriptionTier = dbUser.subscriptionTier;
            token.onboardingComplete = dbUser.onboardingComplete;
            token.picture = dbUser.image ?? token.picture;
          }
        } catch {
          // token may hydrate on next JWT pass
        }
      }

      await reconcileJwtUserIdWithDb(token);

      const uid =
        typeof token.id === "string" ? token.id : typeof token.sub === "string" ? token.sub : null;
      /** Keep tier, role & photo in sync with the DB on every JWT refresh. */
      if (typeof uid === "string") {
        const row = await hydrateTokenFromDb(uid);
        if (row) {
          token.role = row.role;
          token.subscriptionTier = row.subscriptionTier;
          token.onboardingComplete = row.onboardingComplete;
          token.picture = row.image ?? undefined;
          if (typeof row.email === "string" && row.email.includes("@")) {
            token.email = row.email.trim();
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        if (typeof token.email === "string" && token.email.trim().length > 0) {
          session.user.email = token.email.trim();
        }
        session.user.role = (token.role as UserRole) ?? UserRole.JOBSEEKER;
        session.user.subscriptionTier = (token.subscriptionTier as PrismaSubscriptionTier) ?? "FREE";
        /** Absent JWT field ⇒ legacy accounts (treat as already onboarded). Explicit `false` ⇒ first-run onboarding. */
        session.user.onboardingComplete =
          token.onboardingComplete == null ? true : Boolean(token.onboardingComplete);
        {
          const pic = token.picture;
          session.user.image = pic != null && pic !== "" ? String(pic) : null;
        }
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
  },

  pages: {
    signIn: "/ar/auth/login",
    error: "/ar/auth/login",
  },

  session: { strategy: "jwt" },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: getAuthSecret(),
  /** Helps `/api/auth/*` when host is localhost, 127.0.0.1, LAN IP, or tunnels (avoids flaky session fetches). */
  trustHost: true,
});
