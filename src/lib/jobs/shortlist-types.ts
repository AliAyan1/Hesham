export type ShortlistMatchTier = "top" | "recommended" | "partial" | "weak";

export type ShortlistEntry = {
  applicationId: string;
  userId: string;
  name: string;
  professionalTitle: string;
  totalScore: number;
  matchTier: ShortlistMatchTier;
  recommendation: string;
  matchNote: string;
  aiAnalysis: string;
  strengths: string[];
  gaps: string[];
  assessmentScore: number | null;
  assessmentCompleted: boolean;
  interviewCompleted: boolean;
  interviewScore: number | null;
  cvSummary: string;
  skills: string[];
  appliedAt: string;
  rank: number;
  hiringRecommendation?: string | null;
  commScore?: number | null;
  contentScore?: number | null;
  facialScore?: number | null;
  fitScore?: number | null;
  redFlag?: string | null;
};

export type ShortlistPayload = {
  jobId: string;
  jobTitle: string;
  applicantCount: number;
  generatedAt: string | null;
  entries: ShortlistEntry[];
  aiPowered: boolean;
};
