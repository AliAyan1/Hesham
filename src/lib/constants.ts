import { DEFAULT_LOCALE, LOCALES, RTL_LOCALES } from "./locale-settings";
import { UserRole } from "@/types";

export type { Locale } from "./locale-settings";
export { DEFAULT_LOCALE, LOCALES, RTL_LOCALES };

export const APP_NAME = "QudrahTech";
export const APP_NAME_AR = "قدرتك";
export const SLOGAN = "Know Your Potential. Shape Your Future.";
export const SLOGAN_AR = "اعرف إمكاناتك. شكّل مستقبلك.";

export const USER_ROLES: Record<UserRole, { label: string; labelAr: string }> =
  {
    [UserRole.JOBSEEKER]: { label: "Job Seeker", labelAr: "باحث عن عمل" },
    [UserRole.EMPLOYER]: { label: "Employer", labelAr: "صاحب عمل" },
    [UserRole.ADMIN]: { label: "Admin", labelAr: "مسؤول" },
    [UserRole.MENTOR]: { label: "Mentor", labelAr: "مرشد" },
  };

export const JOB_CATEGORIES: { value: string; label: string; labelAr: string }[] =
  [
    { value: "technology", label: "Technology", labelAr: "تقنية المعلومات" },
    { value: "engineering", label: "Engineering", labelAr: "الهندسة" },
    { value: "healthcare", label: "Healthcare", labelAr: "الرعاية الصحية" },
    { value: "finance", label: "Finance", labelAr: "المالية" },
    { value: "education", label: "Education", labelAr: "التعليم" },
    { value: "marketing", label: "Marketing", labelAr: "التسويق" },
    { value: "sales", label: "Sales", labelAr: "المبيعات" },
    { value: "hr", label: "Human Resources", labelAr: "الموارد البشرية" },
    { value: "legal", label: "Legal", labelAr: "القانون" },
    { value: "operations", label: "Operations", labelAr: "العمليات" },
    { value: "construction", label: "Construction", labelAr: "البناء والتشييد" },
    { value: "hospitality", label: "Hospitality", labelAr: "الضيافة والسياحة" },
    { value: "logistics", label: "Logistics", labelAr: "اللوجستيات" },
    { value: "other", label: "Other", labelAr: "أخرى" },
  ];

export const BRAND_COLORS = {
  primary: "#0F4C75",
  accent: "#1D9E75",
} as const;

export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  [UserRole.JOBSEEKER]: "/dashboard/job-seeker",
  [UserRole.EMPLOYER]: "/dashboard/employer",
  [UserRole.ADMIN]: "/dashboard/admin",
  [UserRole.MENTOR]: "/dashboard/mentor",
};
