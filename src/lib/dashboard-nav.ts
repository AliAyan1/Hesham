import type { UserRole } from "@/types";

/** Role-specific “profile / account” path for the header user menu. */
export function dashboardProfilePath(role: UserRole): string {
  switch (role) {
    case "JOBSEEKER":
      return "/dashboard/job-seeker/profile";
    case "EMPLOYER":
      return "/dashboard/employer";
    case "ADMIN":
      return "/dashboard/admin";
    default:
      return "/dashboard/job-seeker/profile";
  }
}

/** Settings / account area (falls back to profile for roles without a separate route yet). */
export function dashboardSettingsPath(role: UserRole): string {
  switch (role) {
    case "JOBSEEKER":
      return "/dashboard/job-seeker/profile";
    case "EMPLOYER":
      return "/dashboard/employer/settings";
    case "ADMIN":
      return "/dashboard/admin/settings";
    default:
      return "/dashboard/job-seeker/profile";
  }
}
