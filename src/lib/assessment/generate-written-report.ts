import { fetchClaudeJsonText } from "@/lib/ai/claude-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import { TRAIT_LABELS } from "@/lib/assessment/profilext-traits";
import type {
  InterestScoresMap,
  TopJobMatch,
  TraitScoresMap,
  WrittenReport,
} from "@/lib/assessment/profilext-types";
import { rankedInterests } from "@/lib/assessment-scoring";

type GenerateReportParams = {
  candidateName: string;
  traitScores: TraitScoresMap;
  interestScores: InterestScoresMap;
  jobFitScores: Record<string, number>;
  topJobMatches: TopJobMatch[];
};

export async function generateWrittenReport(
  params: GenerateReportParams,
): Promise<{ ok: true; report: WrittenReport } | { ok: false; error: string }> {
  const topInterests = rankedInterests(params.interestScores).slice(0, 3);
  const topInterestLabels = topInterests.map((id) => TRAIT_LABELS[id].en);

  const traitLines = Object.entries(params.traitScores)
    .map(([id, score]) => {
      const label = TRAIT_LABELS[id as keyof typeof TRAIT_LABELS];
      return label ? `- ${label.en}: ${score}/10` : `- ${id}: ${score}/10`;
    })
    .join("\n");

  const jobFitLines = Object.entries(params.jobFitScores)
    .map(([cat, pct]) => `- ${cat}: ${pct}%`)
    .join("\n");

  const system = `You are an expert behavioral psychologist and HR assessment specialist trained in ProfileXT psychometric methodology.
Generate a detailed individual assessment report. Return ONLY valid JSON matching the required structure.
Write in professional, constructive tone. Base descriptions on behavioral psychology.
Each bullet point must be specific to the scores given — NO generic statements.`;

  const user = `Generate a detailed individual assessment report for this candidate.

Candidate: ${params.candidateName}
Assessment Date: ${new Date().toISOString().slice(0, 10)}

TRAIT SCORES (scale 1-10):
${traitLines}

Top Interests: ${topInterestLabels.join(", ")}

Job Fit Scores:
${jobFitLines}

Generate JSON with this EXACT structure:
{
  "thinkingStyle": {
    "overallDescription": "2-3 sentence summary",
    "overallDescriptionAr": "ملخص بالعربية",
    "traits": {
      "learningIndicator": { "score": number, "title": "Learning Indicator", "titleAr": "مؤشر التعلم", "definition": "...", "definitionAr": "...", "bulletPoints": ["4 items"], "bulletPointsAr": ["4 items"], "developmentTips": ["2 items"], "developmentTipsAr": ["2 items"] }
    }
  },
  "behavioralTraits": {
    "overallDescription": "...",
    "overallDescriptionAr": "...",
    "traits": { "energyLevel": { same structure } }
  },
  "interests": {
    "primaryInterests": ["top 3"],
    "primaryInterestsAr": ["top 3 AR"],
    "description": "paragraph",
    "descriptionAr": "paragraph AR",
    "careerSuggestions": ["3 items"],
    "careerSuggestionsAr": ["3 items AR"]
  },
  "overallProfile": {
    "personalitySummary": "3-4 paragraphs",
    "personalitySummaryAr": "ملخص AR",
    "keyStrengths": ["5 items"],
    "keyStrengthsAr": ["5 items AR"],
    "developmentAreas": ["3 items"],
    "developmentAreasAr": ["3 items AR"],
    "workStyle": "...",
    "workStyleAr": "...",
    "managementStyle": "...",
    "managementStyleAr": "..."
  },
  "jobFitScores": { "Technology": number, "Hospitality": number, "Finance": number, "HR": number, "Marketing": number, "Operations": number, "Healthcare": number },
  "topRecommendedRoles": [{ "role": "", "roleAr": "", "fitPercentage": number, "reason": "", "reasonAr": "" }]
}

Include ALL 5 thinking traits and ALL 9 behavioral traits.
Use jobFitScores from data above. Include top 5 recommended roles.
RETURN ONLY VALID JSON.`;

  const claude = await fetchClaudeJsonText({ system, user, maxTokens: 16000 });
  if (!claude.ok) {
    return { ok: false, error: claude.error };
  }

  try {
    const json = parseJsonFromModel(claude.text) as WrittenReport;
    json.jobFitScores = params.jobFitScores;
    if (!json.topRecommendedRoles?.length) {
      json.topRecommendedRoles = params.topJobMatches.map((m) => ({
        role: m.role,
        roleAr: m.roleAr,
        fitPercentage: m.fitPercentage,
        reason: m.reason,
        reasonAr: m.reasonAr,
      }));
    }
    return { ok: true, report: json };
  } catch {
    return { ok: false, error: "parse_failed" };
  }
}
