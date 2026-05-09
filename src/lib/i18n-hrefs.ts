/**
 * Object-shaped `href` values so next-intl `Link` keeps query params when prefixing the locale
 * (plain strings like `/path?x=1` have been unreliable with localized routing).
 */
export const hrefRegisterFree = {
  pathname: "/auth/register",
  query: { plan: "free" },
} as const;

export const hrefRegisterProfessional = {
  pathname: "/auth/register",
  query: { plan: "professional" },
} as const;

export const hrefRegisterPremium = {
  pathname: "/auth/register",
  query: { plan: "premium" },
} as const;

export const hrefUpgradeProfessional = {
  pathname: "/upgrade",
  query: { plan: "professional" },
} as const;

export const hrefUpgradePremium = {
  pathname: "/upgrade",
  query: { plan: "premium" },
} as const;
