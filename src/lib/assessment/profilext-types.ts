/** ProfileXT psychometric assessment types */

export type ThinkingTraitId =
  | "learningIndicator"
  | "verbalSkill"
  | "verbalReasoning"
  | "numericalAbility"
  | "numericalReasoning";

export type BehavioralTraitId =
  | "energyLevel"
  | "assertiveness"
  | "sociability"
  | "compliance"
  | "attitude"
  | "decisiveness"
  | "accommodation"
  | "independence"
  | "objectiveJudgment";

export type InterestId =
  | "leadership"
  | "financial"
  | "peopleService"
  | "technical"
  | "mechanical"
  | "creativity";

export type TraitId = ThinkingTraitId | BehavioralTraitId | InterestId;

export type QuestionCategory = "thinking" | "behavioral" | "interests" | "situational";

export type QuestionType = "mcq" | "likert" | "forced_choice" | "rating";

export type ProfileXtQuestion = {
  id: string;
  trait: TraitId;
  category: QuestionCategory;
  type: QuestionType;
  question: string;
  questionAr: string;
  options: string[] | null;
  optionsAr: string[] | null;
  correctAnswer: string | null;
  statementA?: string;
  statementB?: string;
  statementAAr?: string;
  statementBAr?: string;
  timeLimit: number;
};

export type ProfileXtAnswer = {
  questionId: string;
  value: string | number;
};

export type TraitScoresMap = Partial<Record<TraitId, number>>;

export type InterestScoresMap = Partial<Record<InterestId, number>>;

export type WrittenReportTrait = {
  score: number;
  title: string;
  titleAr: string;
  definition: string;
  definitionAr: string;
  bulletPoints: string[];
  bulletPointsAr: string[];
  developmentTips: string[];
  developmentTipsAr: string[];
};

export type WrittenReport = {
  thinkingStyle: {
    overallDescription: string;
    overallDescriptionAr: string;
    traits: Partial<Record<ThinkingTraitId, WrittenReportTrait>>;
  };
  behavioralTraits: {
    overallDescription: string;
    overallDescriptionAr: string;
    traits: Partial<Record<BehavioralTraitId, WrittenReportTrait>>;
  };
  interests: {
    primaryInterests: string[];
    primaryInterestsAr: string[];
    description: string;
    descriptionAr: string;
    careerSuggestions: string[];
    careerSuggestionsAr: string[];
  };
  overallProfile: {
    personalitySummary: string;
    personalitySummaryAr: string;
    keyStrengths: string[];
    keyStrengthsAr: string[];
    developmentAreas: string[];
    developmentAreasAr: string[];
    workStyle: string;
    workStyleAr: string;
    managementStyle: string;
    managementStyleAr: string;
  };
  jobFitScores: Record<string, number>;
  topRecommendedRoles: Array<{
    role: string;
    roleAr: string;
    fitPercentage: number;
    reason: string;
    reasonAr: string;
  }>;
};

export type JobFitScores = Record<string, number>;

export type TopJobMatch = {
  role: string;
  roleAr: string;
  fitPercentage: number;
  reason: string;
  reasonAr: string;
  category: string;
};
