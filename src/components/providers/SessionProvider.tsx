"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";

interface SessionProviderProps {
  children: ReactNode;
  session: Session | null;
}

export function SessionProvider({ children, session }: SessionProviderProps) {
  const isProd = process.env.NODE_ENV === "production";

  return (
    <NextAuthSessionProvider
      session={session}
      basePath="/api/auth"
      refetchOnWindowFocus={isProd}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
