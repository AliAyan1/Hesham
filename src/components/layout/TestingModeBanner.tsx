import { isTestingMode } from "@/lib/testing-mode";

/** TESTING MODE - REVERT BEFORE LAUNCH */
export function TestingModeBanner() {
  if (!isTestingMode()) return null;

  return (
    <div
      className="sticky top-0 z-50 w-full px-4 py-1.5 text-center"
      style={{ backgroundColor: "#FEF9C3", fontSize: "12px" }}
      role="status"
    >
      ⚠️ Testing Mode — Payments disabled
    </div>
  );
}
