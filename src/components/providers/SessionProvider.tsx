"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";
import { StaleSessionCleaner } from "@/components/providers/StaleSessionCleaner";

interface SessionProviderProps {
  children: ReactNode;
  session: Session | null;
}

export function SessionProvider({ children, session }: SessionProviderProps) {
  const hydrated =
    session?.user?.id && session?.user?.email ? session : null;

  return (
    <NextAuthSessionProvider
      session={hydrated}
      basePath="/api/auth"
      refetchOnWindowFocus={false}
      refetchInterval={5 * 60}
      refetchWhenOffline={false}
    >
      <StaleSessionCleaner />
      {children}
    </NextAuthSessionProvider>
  );
}
