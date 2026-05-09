/**
 * When billing is wired (e.g. Stripe), set PAYMENTS_LIVE=true. Until then,
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

/** When payments are not live, app-selected tiers persist. When live, tier changes come from billing (future). */
export function upgradeWritesSubscriptionTier(): boolean {
  if (process.env.SUPPRESS_UPGRADE_WITHOUT_PAYMENT === "true") return false;
  return !paymentsAreLive();
}
