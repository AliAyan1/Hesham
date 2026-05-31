import { z } from "zod";
import { jobCategorySchema, jobTypeSchema, hiringMetaSchema } from "@/lib/jobs/constants";

export const createJobSchema = z.object({
  title: z.string().min(3).max(200),
  titleAr: z.string().max(200).optional(),
  description: z.string().max(12000),
  descriptionAr: z.string().max(12000).optional(),
  category: jobCategorySchema,
  type: jobTypeSchema,
  location: z.string().max(200).optional(),
  locationAr: z.string().max(200).optional(),
  isRemote: z.boolean().optional(),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  currency: z.string().max(8).optional(),
  requirements: z.array(z.string().max(800)).max(80).optional(),
  benefits: z.array(z.string().max(800)).max(80).optional(),
  skills: z.array(z.string().max(120)).max(60).optional(),
  hiringMeta: hiringMetaSchema,
  expiresAt: z.string().datetime().optional(),
  isFeatured: z.boolean().optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

export function createJobValidationMessage(
  issues: z.ZodIssue[],
  labels: {
    titleMin: string;
    locationRequired: string;
    generic: string;
  },
): string {
  for (const issue of issues) {
    const field = issue.path[0];
    if (field === "title") return labels.titleMin;
    if (field === "location") return labels.locationRequired;
  }
  return labels.generic;
}
