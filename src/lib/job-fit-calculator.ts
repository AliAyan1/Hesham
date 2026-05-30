import { rankedInterests } from "@/lib/assessment-scoring";
import type { InterestScoresMap, JobFitScores, TraitScoresMap } from "@/lib/assessment/profilext-types";
import type { InterestId } from "@/lib/assessment/profilext-types";

type TraitRange = [number, number];

type JobModel = {
  thinkingStyle?: Partial<Record<string, TraitRange>>;
  behavioral?: Partial<Record<string, TraitRange>>;
  interests?: InterestId[];
};

export const jobPerformanceModels: Record<string, JobModel> = {
  Technology: {
    thinkingStyle: {
      learningIndicator: [6, 10],
      verbalSkill: [5, 10],
      verbalReasoning: [5, 10],
      numericalAbility: [6, 10],
      numericalReasoning: [6, 10],
    },
    behavioral: {
      energyLevel: [5, 10],
      assertiveness: [4, 9],
      sociability: [3, 8],
      compliance: [4, 8],
      decisiveness: [5, 10],
    },
    interests: ["technical", "creativity"],
  },
  Hospitality: {
    thinkingStyle: {
      learningIndicator: [4, 9],
      verbalSkill: [6, 10],
      verbalReasoning: [5, 9],
    },
    behavioral: {
      sociability: [6, 10],
      energyLevel: [6, 10],
      accommodation: [6, 10],
      attitude: [6, 10],
    },
    interests: ["peopleService", "leadership"],
  },
  Finance: {
    thinkingStyle: {
      numericalAbility: [7, 10],
      numericalReasoning: [7, 10],
      learningIndicator: [6, 10],
    },
    behavioral: {
      objectiveJudgment: [6, 10],
      decisiveness: [6, 10],
      compliance: [5, 9],
    },
    interests: ["financial", "technical"],
  },
  HR: {
    thinkingStyle: {
      verbalSkill: [6, 10],
      verbalReasoning: [5, 10],
    },
    behavioral: {
      sociability: [6, 10],
      accommodation: [6, 10],
      attitude: [6, 10],
    },
    interests: ["peopleService", "leadership"],
  },
  Marketing: {
    thinkingStyle: {
      verbalSkill: [6, 10],
      verbalReasoning: [6, 10],
    },
    behavioral: {
      sociability: [6, 10],
      assertiveness: [5, 10],
      energyLevel: [5, 10],
    },
    interests: ["leadership", "creativity"],
  },
  Operations: {
    thinkingStyle: {
      learningIndicator: [5, 9],
      numericalAbility: [5, 9],
    },
    behavioral: {
      energyLevel: [6, 10],
      decisiveness: [5, 10],
      compliance: [4, 8],
    },
    interests: ["financial", "technical"],
  },
  Healthcare: {
    thinkingStyle: {
      learningIndicator: [6, 10],
      verbalSkill: [5, 10],
    },
    behavioral: {
      accommodation: [6, 10],
      attitude: [6, 10],
      sociability: [5, 10],
    },
    interests: ["peopleService", "technical"],
  },
};

function scoreTraitFit(score: number, range: TraitRange): number {
  const [min, max] = range;
  if (score >= min && score <= max) return 1;
  if (score >= min - 1 && score <= max + 1) return 0.5;
  return 0;
}

export function calculateJobFit(
  traitScores: TraitScoresMap,
  interestScores: InterestScoresMap,
  model: JobModel,
): number {
  let fitPoints = 0;
  let totalPoints = 0;

  if (model.thinkingStyle) {
    for (const [trait, range] of Object.entries(model.thinkingStyle)) {
      if (!range) continue;
      const score = traitScores[trait as keyof TraitScoresMap] ?? 5;
      fitPoints += scoreTraitFit(score, range);
      totalPoints += 1;
    }
  }

  if (model.behavioral) {
    for (const [trait, range] of Object.entries(model.behavioral)) {
      if (!range) continue;
      const score = traitScores[trait as keyof TraitScoresMap] ?? 5;
      fitPoints += scoreTraitFit(score, range);
      totalPoints += 1;
    }
  }

  if (model.interests?.length) {
    const top = rankedInterests(interestScores);
    for (const interest of model.interests) {
      const rank = top.indexOf(interest);
      if (rank === 0) fitPoints += 1;
      else if (rank === 1) fitPoints += 0.75;
      else if (rank <= 3) fitPoints += 0.5;
      totalPoints += 1;
    }
  }

  if (totalPoints === 0) return 0;
  return Math.round((fitPoints / totalPoints) * 100);
}

export function calculateAllJobFits(
  traitScores: TraitScoresMap,
  interestScores: InterestScoresMap,
): JobFitScores {
  const result: JobFitScores = {};
  for (const [category, model] of Object.entries(jobPerformanceModels)) {
    result[category] = calculateJobFit(traitScores, interestScores, model);
  }
  return result;
}

export function topRecommendedRoles(
  jobFitScores: JobFitScores,
  traitScores: TraitScoresMap,
): Array<{ role: string; roleAr: string; fitPercentage: number; reason: string; reasonAr: string; category: string }> {
  const roleMap: Record<string, { role: string; roleAr: string }> = {
    Technology: { role: "Software Developer", roleAr: "مطور برمجيات" },
    Hospitality: { role: "Guest Relations Manager", roleAr: "مدير علاقات الضيوف" },
    Finance: { role: "Financial Analyst", roleAr: "محلل مالي" },
    HR: { role: "HR Specialist", roleAr: "أخصائي موارد بشرية" },
    Marketing: { role: "Marketing Coordinator", roleAr: "منسق تسويق" },
    Operations: { role: "Operations Manager", roleAr: "مدير عمليات" },
    Healthcare: { role: "Healthcare Coordinator", roleAr: "منسق رعاية صحية" },
  };

  return Object.entries(jobFitScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, fit]) => {
      const role = roleMap[category] ?? { role: category, roleAr: category };
      const topTrait = Object.entries(traitScores)
        .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0]?.[0] ?? "profile";
      return {
        category,
        role: role.role,
        roleAr: role.roleAr,
        fitPercentage: fit,
        reason: `Strong alignment with ${category} requirements based on your ${topTrait} profile.`,
        reasonAr: `توافق قوي مع متطلبات ${category} بناءً على ملفك.`,
      };
    });
}
