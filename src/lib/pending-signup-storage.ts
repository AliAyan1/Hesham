/** Short-lived credentials between register → verify → sign-in (same browser tab). */
export const PENDING_SIGNUP_STORAGE_KEY = "Qudrahtech-pending-signup";

export type PendingSignupPayload = {
  email: string;
  password: string;
  role: string;
  plan?: string;
};

export function savePendingSignup(payload: PendingSignupPayload): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_SIGNUP_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readPendingSignup(): PendingSignupPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingSignupPayload;
  } catch {
    return null;
  }
}

export function clearPendingSignup(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
