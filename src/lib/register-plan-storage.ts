export type RegisterPlanChoice = "free" | "professional" | "premium";

const STORAGE_KEY = "qt-register-plan";

export function planFromStorage(): RegisterPlanChoice | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY)?.toLowerCase();
  if (raw === "free" || raw === "professional" || raw === "premium") return raw;
  return null;
}

export function saveRegisterPlan(plan: RegisterPlanChoice): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, plan);
}

export function clearRegisterPlan(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/** URL deep-link wins over stale sessionStorage from a prior visit. */
export function resolveRegisterPlan({
  pickedPlan,
  urlPlan,
}: {
  pickedPlan: RegisterPlanChoice | null;
  urlPlan: RegisterPlanChoice | null;
}): RegisterPlanChoice {
  return pickedPlan ?? urlPlan ?? planFromStorage() ?? "free";
}
