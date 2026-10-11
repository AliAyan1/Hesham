import type { Session } from "next-auth";
import { dashboardPathForRole } from "@/lib/subscription";

type SessionUpdate = (data?: Record<string, unknown>) => Promise<Session | null>;

/** Marks onboarding done in DB and refreshes the JWT (required before dashboard). */
export async function markOnboardingComplete(update: SessionUpdate): Promise<void> {
  const res = await fetch("/api/profile/onboarding", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("onboarding_failed");
  await update({ onboardingComplete: true });
}

export type SignupPlanChoice = "free" | "professional" | "premium";

function postGoogleSignupPath(role: string, plan?: SignupPlanChoice | null): string {
  if (plan === "professional") return "/upgrade?plan=professional";
  if (plan === "premium") return "/upgrade?plan=premium";
  return dashboardPathForRole(String(role).toUpperCase());
}

/** Google OAuth signup: role saved → skip welcome screen → dashboard or paid upgrade. */
export async function finishGoogleSignup(
  role: string,
  update: SessionUpdate,
  locale: string,
  plan?: SignupPlanChoice | null,
): Promise<void> {
  await markOnboardingComplete(update);
  await update({ role });
  hardNavigate(postGoogleSignupPath(role, plan), locale);
}

/** Wait until session reflects DB state (e.g. after onboardingComplete update). */
export async function waitForSessionFlag(
  flag: "onboardingComplete",
  maxAttempts = 12,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
      const json = (await res.json()) as { user?: { onboardingComplete?: boolean } };
      if (flag === "onboardingComplete" && json.user?.onboardingComplete === true) {
        return true;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function canonicalSiteOrigin(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const { protocol, hostname, port } = window.location;
  if (hostname === "basalim-consulting.com") {
    return `${protocol}//www.basalim-consulting.com${port ? `:${port}` : ""}`;
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
}

/** Full navigation so middleware reads a fresh JWT cookie after sign-in / onboarding. */
export function hardNavigate(path: string, locale: string): void {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const prefix = `/${locale}`;
  const relative = normalized.startsWith(prefix)
    ? normalized
    : `${prefix}${normalized === "/" ? "" : normalized}`;
  const origin = canonicalSiteOrigin();
  const target =
    typeof window !== "undefined" && origin
      ? new URL(relative, origin).href
      : relative;
  window.location.replace(target);
}

export function dashboardHrefForRole(role: string, locale: string): string {
  const dash = dashboardPathForRole(String(role).toUpperCase());
  return `/${locale}${dash}`;
}

const AUTH_HEAL_STORAGE_KEY = "Qudrahtech-auth-heal-v1";

function documentHasAuthSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)(?:__Secure-)?(?:authjs|next-auth)\.session-token=/.test(
    document.cookie,
  );
}

/**
 * Removes orphan session cookies (wrong secret, apex/www mismatch, old deploy).
 * Runs once per tab on login/register — users should not need "Clear session" manually.
 */
export async function healStaleAuthCookie(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(AUTH_HEAL_STORAGE_KEY)) return false;
    sessionStorage.setItem(AUTH_HEAL_STORAGE_KEY, "1");
  } catch {
    return false;
  }

  try {
    const res = await fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
    });
    const json = (await res.json()) as { user?: { id?: string } };
    if (json.user?.id) return false;
    if (!documentHasAuthSessionCookie()) return false;

    const { signOut } = await import("next-auth/react");
    try {
      await signOut({ redirect: false });
    } catch {
      /* ignore */
    }
    try {
      await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * One-click reset: sign out, clear NextAuth cookies, reload home as a guest.
 * Use after DB wipes or when the navbar still shows “Log out” incorrectly.
 */
export async function clearStuckSession(locale: string): Promise<void> {
  const { signOut } = await import("next-auth/react");
  try {
    await signOut({ redirect: false });
  } catch {
    /* ignore */
  }
  try {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem("Qudrahtech-locale");
    } catch {
      /* ignore */
    }
    document.cookie = "Qudrahtech-locale=; path=/; max-age=0; SameSite=Lax";
    hardNavigate("/auth/login", locale);
  }
}

/** Clears the session cookie, then navigates after NextAuth finishes (avoids stale cookie race). */
export async function signOutThenNavigate(path: string, locale: string): Promise<void> {
  const { signOut } = await import("next-auth/react");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const prefix = `/${locale}`;
  const target = normalized.startsWith(prefix)
    ? normalized
    : `${prefix}${normalized === "/" ? "" : normalized}`;

  try {
    const result = await signOut({ callbackUrl: target, redirect: false });
    if (typeof window !== "undefined") {
      window.location.href = result?.url ?? target;
    }
    return;
  } catch {
    // Fall back to plain navigation when Auth.js returns a non-JSON server error.
  }

  if (typeof window !== "undefined") {
    window.location.href = target;
  }
}

/** Sign out and return to the public landing page (not login — middleware would bounce back to dashboard). */
export async function signOutToLanding(locale: string): Promise<void> {
  await signOutThenNavigate("/", locale);
}

/** Where to send a user after successful login/register. */
export function resolvePostAuthPath(
  role: string,
  onboardingComplete: boolean,
): string {
  const r = String(role).toUpperCase();
  if (r === "ADMIN") return dashboardPathForRole(r);
  if (!onboardingComplete) return "/onboarding";
  return dashboardPathForRole(r);
}

/** Fetch fresh session and resolve post-auth destination. */
export async function fetchPostAuthPath(): Promise<string> {
  const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
  const json = (await res.json()) as {
    user?: { role?: string; onboardingComplete?: boolean };
  };
  const role = String(json.user?.role ?? "JOBSEEKER");
  const onboardingComplete = json.user?.onboardingComplete === true;
  return resolvePostAuthPath(role, onboardingComplete);
}

/** After `signIn({ redirect: false })`, wait until the session cookie is readable. */
export async function waitForAuthenticatedSession(
  maxAttempts = 25,
): Promise<{ ok: boolean; userId?: string }> {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        user?: { id?: string; role?: string };
      };
      const userId = json.user?.id;
      if (userId) {
        return { ok: true, userId };
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return { ok: false };
}
