export const MENTOR_PLATFORM_FEE_RATE = 0.25;

export const MENTOR_INDUSTRIES = [
  "Technology",
  "Hospitality",
  "Finance",
  "HR",
  "Marketing",
  "Operations",
  "Healthcare",
  "Education",
  "Legal",
  "Consulting",
] as const;

export const MENTOR_SESSION_DURATIONS = [30, 60, 90] as const;

export type MentorIndustry = (typeof MENTOR_INDUSTRIES)[number];
