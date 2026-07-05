import type { Session } from "next-auth";
import { dashboardPathForRole } from "@/lib/subscription";
import { isTestingMode } from "@/lib/testing-mode";

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
  // TESTING MODE - REVERT BEFORE LAUNCH: skip upgrade checkout after Google signup.
  if (!isTestingMode()) {
    if (plan === "professional") return "/upgrade?plan=professional";
    if (plan === "premium") return "/upgrade?plan=premium";
  }
  return dashboardPathForRole(String(role).toUpperCase());
}

/** Google OAuth signup: role saved → skip welcome screen → dashboard or paid upgrade. */
export async function finishGoogleSignup(
  role: string,
  update: SessionUpdate,
  locale: string,
  plan?: SignupPlanChoice | null,
): Promise<void> {
  // TESTING MODE - REVERT BEFORE LAUNCH: grant plan tier without Moyasar checkout.
  if (isTestingMode() && (plan === "professional" || plan === "premium")) {
    await fetch("/api/upgrade", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
  }
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

/** Full navigation so middleware reads a fresh JWT cookie after sign-in / onboarding. */
export function hardNavigate(path: string, locale: string): void {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const prefix = `/${locale}`;
  const relative = normalized.startsWith(prefix)
    ? normalized
    : `${prefix}${normalized === "/" ? "" : normalized}`;
  const target =
    typeof window !== "undefined"
      ? new URL(relative, window.location.origin).href
      : relative;
  window.location.replace(target);
}

export function dashboardHrefForRole(role: string, locale: string): string {
  const dash = dashboardPathForRole(String(role).toUpperCase());
  return `/${locale}${dash}`;
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
    window.location.href = `/${locale}`;
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
