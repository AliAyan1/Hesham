"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

/**
 * After a DB wipe the browser cookie can outlive deleted users.
 * If the server session has no user but the client still thinks we're signed in, sign out once.
 */
export function StaleSessionCleaner() {
  const { status } = useSession();
  const ran = useRef(false);

  useEffect(() => {
    if (status === "loading") return;

    void (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
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
  }, [status]);

  return null;
}
