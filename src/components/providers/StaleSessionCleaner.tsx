"use client";

import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { healStaleAuthCookie } from "@/lib/auth-redirect";

function isAuthEntryPath(pathname: string): boolean {
  return (
    pathname.includes("/auth/login") ||
    pathname.includes("/auth/register") ||
    pathname.includes("/auth/forgot-password") ||
    pathname.includes("/auth/reset-password") ||
    pathname.includes("/auth/verify-email")
  );
}

/**
 * Production session hygiene (invisible to users):
 * - Drops orphan JWT cookies before sign-in/sign-up.
 * - Signs out when the client thinks we're logged in but `/api/auth/session` has no user.
 */
export function StaleSessionCleaner() {
  const { status } = useSession();
  const pathname = usePathname();
  const ranMismatchCleanup = useRef(false);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    void healStaleAuthCookie({ eachVisit: isAuthEntryPath(pathname) });
  }, [pathname]);

  useEffect(() => {
    if (status === "loading") return;

    const onAuthEntry = isAuthEntryPath(pathname);
    if (onAuthEntry) return;

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
          if (ranMismatchCleanup.current) return;
          ranMismatchCleanup.current = true;
          await signOut({ redirect: false });
          try {
            await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
          } catch {
            /* ignore */
          }
          window.location.href = window.location.pathname;
        }
      } catch {
        /* ignore */
      }
    })();
  }, [status, pathname]);

  return null;
}
