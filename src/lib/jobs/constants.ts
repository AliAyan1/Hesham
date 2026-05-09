import { JobType } from "@prisma/client";
import { z } from "zod";

export const JOB_CATEGORIES = [
  "Technology",
  "Hospitality",
  "Finance",
  "HR",
  "Marketing",
  "Operations",
  "Healthcare",
] as const;

export const jobCategorySchema = z.enum(JOB_CATEGORIES);

export const jobTypeSchema = z.nativeEnum(JobType);

export const experienceLevelSchema = z.enum(["ENTRY", "MID", "SENIOR", "LEAD"]);

export const hiringMetaSchema = z
  .object({
    requiredSkills: z.array(z.string().max(80)).max(40).optional(),
    niceToHaveSkills: z.array(z.string().max(80)).max(40).optional(),
    educationRequirement: z.string().max(500).optional(),
    experienceLevel: experienceLevelSchema.optional(),
    yearsExperience: z.number().int().min(0).max(60).optional(),
  })
  .optional();
