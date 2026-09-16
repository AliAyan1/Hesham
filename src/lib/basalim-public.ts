import { APP_NAME, APP_NAME_AR } from "@/lib/constants";
import { QUDRAHTECH_MARKETING_PATH } from "@/lib/qudrahtech-marketing";

/** Public marketing site helpers (Basalim Consulting). */

/** Official platform brand (app / “Powered by”). */
export { APP_NAME as QUDRAH_PLATFORM_NAME, APP_NAME_AR as QUDRAH_PLATFORM_NAME_AR };

/** Qudratak initiative — marketing label on Basalim site (not the platform product name). */
export const QUDRATAK_NAME = "Qudratak";
export const QUDRATAK_NAME_AR = "قدرتك";

/** Founder LinkedIn — only public social link on marketing site. */
export const HESHAM_LINKEDIN_URL =
  "https://www.linkedin.com/in/hesham-basalim-mba?utm_source=share_via&utm_content=profile&utm_medium=member_ios";

/** Basalim consultation booking (Calendly). */
export const BASALIM_CALENDLY_URL = "https://calendly.com/basalimhesham/30min";

export const BASALIM_COLORS = {
  dark: "#0D1F2D",
  teal: "#1A6B5A",
  tealHover: "#155A4A",
  gold: "#C9A84C",
  light: "#F5F3EE",
  gray: "#6B7280",
} as const;

export function siteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "https://basalim-consulting.com";
}

/** Qudrahtech platform landing on basalim-consulting.com (nav may still say “Qudratak”). */
export function qudratakMarketingHref(): string {
  return QUDRAHTECH_MARKETING_PATH;
}

/** @deprecated Use qudrahtechMarketingUrl */
export function qudratakExternalUrl(locale: string): string {
  return qudrahtechMarketingUrl(locale);
}

export function qudrahtechMarketingUrl(locale: string): string {
  return `${siteOrigin()}/${locale}${QUDRAHTECH_MARKETING_PATH}`;
}

/** Qudrahtech app entry (register) — open in new tab from marketing CTAs. */
export function QudrahtechJoinUrl(locale: string): string {
  return `${siteOrigin()}/${locale}/auth/register`;
}

export function QudrahtechLoginUrl(locale: string): string {
  return `${siteOrigin()}/${locale}/auth/login`;
}

export type QudratakRegisterOptions = {
  plan?: "free" | "professional" | "premium";
  role?: "mentor" | "jobseeker" | "employer";
};

export function QudrahtechRegisterUrl(locale: string, options?: QudratakRegisterOptions): string {
  const base = `${siteOrigin()}/${locale}/auth/register`;
  const params = new URLSearchParams();
  if (options?.plan) params.set("plan", options.plan);
  if (options?.role) params.set("role", options.role);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function QudrahtechJobsUrl(locale: string): string {
  return `${siteOrigin()}/${locale}/jobs`;
}

export const BASALIM_SERVICE_PAGES: Record<
  string,
  { titleEn: string; titleAr: string; descEn: string; descAr: string }
> = {
  "organizational-development": {
    titleEn: "Organizational Development",
    titleAr: "التطوير التنظيمي",
    descEn: "Structure, roles, performance and people systems that scale with your business.",
    descAr: "بناء الهياكل وأنظمة الأداء التي تدعم نمو أعمالك.",
  },
  "talent-acquisition": {
    titleEn: "Talent Acquisition & Recruitment",
    titleAr: "التوظيف والاستقطاب",
    descEn: "End-to-end search, assessment and hiring for the roles that matter most.",
    descAr: "من البحث حتى التعيين الناجح للمواهب المناسبة.",
  },
  "learning-development": {
    titleEn: "Learning & Development",
    titleAr: "التعلم والتطوير",
    descEn: "Training journeys that build real capability across your teams.",
    descAr: "برامج تطوير تبني قدرات حقيقية لفرق العمل.",
  },
  "leadership-development": {
    titleEn: "Leadership Development",
    titleAr: "تطوير القيادات",
    descEn: "Develop the leaders your organization needs to thrive.",
    descAr: "صناعة القادة الذين تحتاجهم منظمتك.",
  },
  "hospitality-tourism": {
    titleEn: "Hospitality & Tourism Solutions",
    titleAr: "حلول الضيافة والسياحة",
    descEn: "Specialized people expertise for hospitality and tourism operators.",
    descAr: "خبرة متخصصة في قطاع الضيافة والسياحة.",
  },
  "people-function": {
    titleEn: "Build Your People Function",
    titleAr: "بناء وظيفة الموارد البشرية",
    descEn: "Set up your HR foundation from strategy to systems and excellence.",
    descAr: "نبني وظيفة الموارد البشرية من الأساس إلى التميز.",
  },
};

export const BASALIM_INSIGHT_PAGES: Record<
  string,
  { titleEn: string; titleAr: string; catEn: string; catAr: string; date: string }
> = {
  "hospitality-talent": {
    catEn: "Saudi Talent",
    catAr: "المواهب السعودية",
    titleEn: "The Future of Hospitality Talent in Saudi Arabia",
    titleAr: "مستقبل مواهب الضيافة في المملكة",
    date: "June 2026",
  },
  "people-first-culture": {
    catEn: "People & Culture",
    catAr: "الناس والثقافة",
    titleEn: "Building a People-First Culture",
    titleAr: "بناء ثقافة تضع الإنسان أولاً",
    date: "May 2026",
  },
  "saudi-leadership": {
    catEn: "Leadership",
    catAr: "القيادة",
    titleEn: "What Makes Leaders in Saudi Arabia Different",
    titleAr: "ما الذي يميّز القادة في المملكة",
    date: "April 2026",
  },
};
