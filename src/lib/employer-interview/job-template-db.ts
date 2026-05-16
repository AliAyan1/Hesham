import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { defaultInterviewTemplate, parseInterviewTemplate, type JobInterviewTemplate } from "./template";

export async function getInterviewTemplateForJob(jobId: string): Promise<JobInterviewTemplate> {
  const prisma = getPrisma();
  const row = await prisma.interviewTemplate.findUnique({
    where: { jobId },
    select: { template: true },
  });
  return parseInterviewTemplate(row?.template) ?? defaultInterviewTemplate();
}

export async function upsertInterviewTemplateForJob(jobId: string, template: JobInterviewTemplate): Promise<void> {
  const prisma = getPrisma();
  await prisma.interviewTemplate.upsert({
    where: { jobId },
    create: { jobId, template: template as unknown as Prisma.InputJsonValue },
    update: { template: template as unknown as Prisma.InputJsonValue },
  });
}
