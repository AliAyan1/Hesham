import { SubscriptionTier } from "@/types";

export const FREE_FEATURES = [
  "cv_builder_basic",
  "browse_jobs",
  "apply_jobs",
  "cv_download",
  "notifications",
] as const;

export const PROFESSIONAL_FEATURES = [
  ...FREE_FEATURES,
  "cv_upload",
  "cv_ai_parse",
  "ats_score",
  "ai_assessment",
  "job_matching_ai",
  /** Employer: AI-generated bilingual job description in Post Job wizard. */
  "ai_job_description",
  "training_recommendations",
  "ai_improve_summary",
  "ai_enhance_bullets",
  "ai_skill_suggestions",
  "cv_templates_all",
  /** Full CV rewrite for ATS when scan is under threshold (Professional + Premium). */
  "ai_cv_ats_rebuild",
] as const;

export const PREMIUM_FEATURES = [
  ...PROFESSIONAL_FEATURES,
  "hr_consultations",
  "mentor_sessions",
  "priority_matching",
  "career_coaching",
  "dedicated_support",
] as const;

export type Feature = (typeof PREMIUM_FEATURES)[number];

export function hasAccess(tier: SubscriptionTier, feature: Feature): boolean {
  if (tier === SubscriptionTier.PREMIUM) return true;
  if (tier === SubscriptionTier.PROFESSIONAL) {
    return (PROFESSIONAL_FEATURES as readonly string[]).includes(feature);
  }
  return (FREE_FEATURES as readonly string[]).includes(feature);
}

export type PlanParam = "professional" | "premium";

export function tierFromPlan(plan: string | null | undefined): SubscriptionTier {
  if (plan === "professional") return SubscriptionTier.PROFESSIONAL;
  if (plan === "premium") return SubscriptionTier.PREMIUM;
  return SubscriptionTier.FREE;
}

