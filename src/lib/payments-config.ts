/** When billing is wired (e.g. Stripe), set PAYMENTS_LIVE=true. Until then,

 * choosing Professional/Premium (register flow, `/api/upgrade`, test pages) updates

 * `User.subscriptionTier` in the database — no Stripe required.

 *

 * Set `SUPPRESS_UPGRADE_WITHOUT_PAYMENT=true` to block tier writes from `/api/upgrade`

 * while still keeping register-time plan selection behavior (needs separate guard if desired).

 *

 * Feature gates always use `User.subscriptionTier` from the database.

 */

export function paymentsAreLive(): boolean {
  return process.env.PAYMENTS_LIVE === "true";
}



/** Moyasar test/live keys present — paid signup must complete checkout before tier upgrade. */

export function moyasarPaymentsEnabled(): boolean {
  return Boolean(

    process.env.MOYASAR_SECRET_KEY?.trim() &&

      process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY?.trim(),

  );

}



export function isPaidPlanChoice(plan: string | null | undefined): boolean {

  const p = plan?.toLowerCase();

  return p === "professional" || p === "premium";

}



/** When payments are not live, app-selected tiers persist. When live, tier changes come from billing (future). */

export function upgradeWritesSubscriptionTier(): boolean {
  if (process.env.SUPPRESS_UPGRADE_WITHOUT_PAYMENT === "true") return false;

  if (moyasarPaymentsEnabled()) return false;

  return !paymentsAreLive();

}

