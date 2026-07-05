/**
 * TESTING MODE - REVERT BEFORE LAUNCH
 * Set to `false` before production launch to re-enable Moyasar payments.
 */
const TESTING_MODE_ENABLED = true;

/** Temporary demo flag — bypasses payment gates while keeping payment code intact. */
export function isTestingMode(): boolean {
  return TESTING_MODE_ENABLED;
}
