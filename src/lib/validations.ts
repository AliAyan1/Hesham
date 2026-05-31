import { z } from "zod";
import { UserRole } from "@/types";

export const planParamSchema = z.enum(["free", "professional", "premium"]);

const registerObjectSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters"),
  email: z
    .string()
    .email("Invalid email address")
    .transform((s) => s.trim().toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  role: z.nativeEnum(UserRole).default(UserRole.JOBSEEKER),
});

/** Extend the object before `.refine` — Zod 3 does not expose `.extend` on `ZodEffects`. */
export const registerSchema = registerObjectSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  },
);

export const registerWithPlanSchema = registerObjectSchema
  .extend({
    plan: planParamSchema.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const profileSchema = z.object({
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  location: z.string().max(100).optional(),
  language: z.enum(["ar", "en", "fr", "es", "ur", "tr"]).default("ar"),
});

export const jobSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be under 200 characters"),
  titleAr: z.string().max(200).optional(),
  description: z
    .string()
    .max(5000, "Description must be under 5000 characters"),
  descriptionAr: z.string().max(5000).optional(),
  category: z.string().min(1, "Category is required"),
  location: z.string().max(100).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterWithPlanInput = z.infer<typeof registerWithPlanSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type JobInput = z.infer<typeof jobSchema>;
