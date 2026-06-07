"use client";

import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * After a DB wipe the browser cookie can outlive deleted users.
 * If the server session has no user but the client still thinks we're signed in, sign out once.
 * Grace period avoids signing out during the post-login cookie race.
 */
export function StaleSessionCleaner() {
  const { status } = useSession();
  const pathname = usePathname();
  const ran = useRef(false);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (status === "loading") return;

    const onAuthPage =
      pathname.includes("/auth/login") ||
      pathname.includes("/auth/register") ||
      pathname.includes("/onboarding");

    if (onAuthPage) return;

    const graceMs = 8000;
    if (Date.now() - mountedAt.current < graceMs) return;

    void (async () => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json()) as { user?: { id?: string } };
        const hasServerUser = Boolean(json.user?.id);

        if (status === "authenticated" && !hasServerUser) {
          if (ran.current) return;
          ran.current = true;
          await signOut({ redirect: false });
          window.location.href = window.location.pathname;
        }
      } catch {
        /* ignore */
      }
    })();
  }, [status, pathname]);

  return null;
}
