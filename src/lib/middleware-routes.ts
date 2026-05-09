/**
 * Dashboard roots keyed by JWT `role` (same strings as Prisma `UserRole`).
 * Edge-safe: no `@prisma/client` import — used only from middleware.
 */

export const MIDDLEWARE_DASHBOARD_ROUTES = {
  JOBSEEKER: "/dashboard/job-seeker",
  EMPLOYER: "/dashboard/employer",
  ADMIN: "/dashboard/admin",
} as const;

export type MiddlewareUserRole = keyof typeof MIDDLEWARE_DASHBOARD_ROUTES;
